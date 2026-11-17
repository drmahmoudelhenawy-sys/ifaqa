import 'dart:convert';
import 'package:http/http.dart' as http;

/// Word-level study tools for one ayah, from the same sources as React's
/// `quraniApi`: morphology/i'rab and mutashabihat from api.qurani.ai, Arabic
/// word meanings (مفردات) from alfurqan.online.
class AyahWord {
  final String text;
  final String irab;
  final String root;
  final String meaning;
  const AyahWord({required this.text, this.irab = '', this.root = '', this.meaning = ''});
}

class SimilarAyah {
  final String surahName;
  final int surah;
  final int ayah;
  final String text;
  final String phrase;
  const SimilarAyah(this.surahName, this.surah, this.ayah, this.text, this.phrase);
}

class AyahToolsService {
  AyahToolsService._();
  static final AyahToolsService instance = AyahToolsService._();

  static const _qurani = 'https://api.qurani.ai/gw/qh/v1';
  static const _mufradat = 'https://alfurqan.online/api/v1/tafseer/mufradat';
  static const _timeout = Duration(seconds: 20);

  final Map<String, Future<List<AyahWord>>> _morph = {};
  final Map<int, Future<Map<String, dynamic>>> _mufradatSurah = {};

  Future<dynamic> _get(String url) async {
    final r = await http.get(Uri.parse(url)).timeout(_timeout);
    if (r.statusCode == 404) return null;
    if (r.statusCode != 200) throw http.ClientException('HTTP ${r.statusCode}', Uri.parse(url));
    return jsonDecode(utf8.decode(r.bodyBytes));
  }

  /// Every word with its i'rab and root.
  Future<List<AyahWord>> irab(int surah, int ayah) => _morph.putIfAbsent('$surah:$ayah', () async {
        final data = await _get('$_qurani/morphology/ayah/$surah:$ayah');
        final words = (data?['data'] as List?) ?? const [];
        return words.map((w) {
          final m = w as Map<String, dynamic>;
          final cats = ((m['morphology'] as Map?)?['tags_by_category'] as Map?) ?? const {};
          String pick(String cat, bool Function(String) keep) => ((cats[cat] as List?) ?? const [])
              .map((t) => ((t as Map)['user_meaning'] ?? t['meaning'] ?? '').toString())
              .where(keep)
              .toSet()
              .join('، ');
          final irab = pick('Irab', (s) => s.contains('الإعراب') || s.startsWith('العلامة:') || s == 'مبتدأ' || !s.contains('العلامة'));
          return AyahWord(
            text: ((m['word'] as Map?)?['text'] ?? '').toString(),
            irab: irab,
            root: pick('Root', (s) => s.length <= 5),
          );
        }).where((w) => w.text.isNotEmpty).toList();
      });

  /// Arabic meaning of each word (مفردات القرآن).
  Future<List<AyahWord>> meanings(int surah, int ayah) async {
    final surahData = await _mufradatSurah.putIfAbsent(surah, () async => (await _get('$_mufradat/surah/$surah') as Map<String, dynamic>?) ?? const {});
    final ayahs = ((surahData['surah'] as Map?)?['ayahs'] as List?) ?? const [];
    final entry = ayahs.cast<Map>().where((a) => (a['ayah_number'] as num?)?.toInt() == ayah).firstOrNull;
    final meanings = (entry?['words'] as List?) ?? const [];
    List<AyahWord> words = const [];
    try {
      words = await irab(surah, ayah);
    } catch (_) {}
    return meanings.cast<Map>().map((m) {
      final n = ((m['word_number'] as num?)?.toInt() ?? 1) - 1;
      return AyahWord(text: n >= 0 && n < words.length ? words[n].text : '', meaning: (m['meaning'] ?? '').toString().trim());
    }).where((w) => w.meaning.isNotEmpty).toList();
  }

  /// Ayat sharing a phrase with this one; empty when there are none.
  Future<List<SimilarAyah>> mutashabihat(int surah, int ayah) async {
    final data = await _get('$_qurani/mutashabihat/$surah/$ayah');
    final list = (data?['data'] as List?) ?? const [];
    return list.cast<Map>().map((a) {
      final s = (a['surah'] as Map?) ?? const {};
      return SimilarAyah(
        (s['name'] ?? '').toString(),
        (s['number'] as num?)?.toInt() ?? 0,
        (a['numberInSurah'] as num?)?.toInt() ?? 0,
        (a['text'] ?? '').toString(),
        (a['phraseText'] ?? '').toString(),
      );
    }).where((a) => a.surah != surah || a.ayah != ayah).toList();
  }
}
