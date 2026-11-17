import 'dart:convert';
import 'package:http/http.dart' as http;

class AyahMatch {
  final int surahNumber;
  final String surahName;
  final int ayahNumber;
  final String text;
  const AyahMatch({required this.surahNumber, required this.surahName, required this.ayahNumber, required this.text});
}

const Duration _timeout = Duration(seconds: 20);

/// Full-text search over the Quran text (api.alquran.cloud). The undiacritized
/// edition is searched so plain typing matches; `all/ar` would also return
/// tafsir editions, which is not what a Quran search should show.
Future<List<AyahMatch>> searchQuran(String query) async {
  final url = 'https://api.alquran.cloud/v1/search/${Uri.encodeComponent(query)}/all/quran-simple-clean';
  final response = await http.get(Uri.parse(url)).timeout(_timeout);
  // The API answers 404 when nothing matches.
  if (response.statusCode == 404) return const [];
  if (response.statusCode != 200) throw http.ClientException('HTTP ${response.statusCode}', Uri.parse(url));
  final data = (jsonDecode(response.body) as Map<String, dynamic>)['data'];
  if (data is! Map<String, dynamic>) return const [];
  final matches = (data['matches'] as List?) ?? const [];
  return matches.map((m) {
    final surah = m['surah'] as Map<String, dynamic>;
    return AyahMatch(
      surahNumber: surah['number'] as int,
      surahName: surah['name'] as String,
      ayahNumber: m['numberInSurah'] as int,
      text: m['text'] as String,
    );
  }).toList();
}

/// The Mushaf page an ayah is printed on.
Future<int> fetchAyahPage(int surah, int ayah) async {
  final url = 'https://api.alquran.cloud/v1/ayah/$surah:$ayah/quran-uthmani';
  final response = await http.get(Uri.parse(url)).timeout(_timeout);
  if (response.statusCode != 200) throw http.ClientException('HTTP ${response.statusCode}', Uri.parse(url));
  return (jsonDecode(response.body) as Map<String, dynamic>)['data']['page'] as int;
}

/// Arabic tafsir editions on api.quran.com.
const tafsirEditions = <int, String>{16: 'الميسر', 91: 'السعدي', 14: 'ابن كثير', 15: 'الطبري', 90: 'القرطبي', 94: 'البغوي'};

class PageAyah {
  final int surah;
  final int ayah;
  final String text;
  const PageAyah(this.surah, this.ayah, this.text);
}

/// Every ayah printed on a Mushaf page, in order.
Future<List<PageAyah>> fetchPageAyat(int page) async {
  final url = 'https://api.quran.com/api/v4/verses/by_page/$page?fields=text_uthmani&per_page=50';
  final response = await http.get(Uri.parse(url)).timeout(_timeout);
  if (response.statusCode != 200) throw http.ClientException('HTTP ${response.statusCode}', Uri.parse(url));
  final verses = ((jsonDecode(response.body) as Map<String, dynamic>)['verses'] as List?) ?? const [];
  return verses.map((v) {
    final key = (v['verse_key'] as String).split(':');
    return PageAyah(int.parse(key[0]), int.parse(key[1]), (v['text_uthmani'] as String?) ?? '');
  }).toList();
}

/// Tafsir for one ayah as plain text (api.quran.com); Al-Muyassar by default.
Future<String> fetchTafsir(int surah, int ayah, {int edition = 16}) async {
  final url = 'https://api.quran.com/api/v4/tafsirs/$edition/by_ayah/$surah:$ayah';
  final response = await http.get(Uri.parse(url)).timeout(_timeout);
  if (response.statusCode != 200) throw http.ClientException('HTTP ${response.statusCode}', Uri.parse(url));
  final text = (jsonDecode(response.body) as Map<String, dynamic>)['tafsir']['text'] as String;
  return text.replaceAll(RegExp(r'<[^>]*>'), '').trim();
}
