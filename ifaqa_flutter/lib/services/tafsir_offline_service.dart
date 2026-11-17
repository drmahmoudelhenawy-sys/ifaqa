import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'offline_store/offline_store.dart';

String tafsirOfflinePath(int edition, int surah) => 'tafsir/$edition/$surah.json';

/// Strips HTML tags from a tafsir fragment.
String stripTafsirHtml(String html) => html.replaceAll(RegExp(r'<[^>]*>'), '').trim();

/// Compact `{"ayah": "plain text"}` JSON from api.quran.com `tafsirs` records
/// (each has `verse_key` "s:a" and an HTML `text`). Empty texts are skipped.
String compactTafsirJson(List<dynamic> tafsirs) {
  final out = <String, String>{};
  for (final t in tafsirs) {
    final key = (t['verse_key'] as String).split(':');
    final text = stripTafsirHtml((t['text'] as String?) ?? '');
    if (text.isNotEmpty) out[key[1]] = text;
  }
  return jsonEncode(out);
}

/// Reads one ayah from a saved surah file's bytes, or null if absent.
String? tafsirFromSaved(Uint8List bytes, int ayah) {
  final map = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
  return map['$ayah'] as String?;
}

/// Number of surahs (0..114) saved for [edition].
Future<int> tafsirDownloaded(int edition) async {
  final files = await OfflineStore.instance.list('tafsir/$edition');
  return files.where((f) => f.endsWith('.json')).length;
}

Future<void> deleteTafsir(int edition) async {
  for (final f in await OfflineStore.instance.list('tafsir/$edition')) {
    await OfflineStore.instance.delete(f);
  }
}

/// Downloads every surah of [edition] (one request per surah via
/// `/tafsirs/{edition}/by_chapter/{surah}`), skipping surahs already saved.
/// [onProgress] gets 0..1 after each surah.
Future<void> downloadTafsir(int edition, {void Function(double)? onProgress}) async {
  final store = OfflineStore.instance;
  for (var s = 1; s <= 114; s++) {
    if (!await store.has(tafsirOfflinePath(edition, s))) {
      final records = <dynamic>[];
      var page = 1;
      while (true) {
        final uri = Uri.parse('https://api.quran.com/api/v4/tafsirs/$edition/by_chapter/$s?per_page=300&page=$page');
        final res = await http.get(uri).timeout(const Duration(seconds: 30));
        if (res.statusCode != 200) throw http.ClientException('HTTP ${res.statusCode}', uri);
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        records.addAll((body['tafsirs'] as List?) ?? const []);
        final next = (body['pagination'] as Map?)?['next_page'];
        if (next == null) break;
        page = next as int;
      }
      await store.write(tafsirOfflinePath(edition, s), Uint8List.fromList(utf8.encode(compactTafsirJson(records))));
    }
    onProgress?.call(s / 114);
  }
}
