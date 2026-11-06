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

/// Al-Muyassar tafsir for one ayah, as plain text (api.quran.com).
Future<String> fetchTafsir(int surah, int ayah) async {
  final url = 'https://api.quran.com/api/v4/tafsirs/16/by_ayah/$surah:$ayah';
  final response = await http.get(Uri.parse(url)).timeout(_timeout);
  if (response.statusCode != 200) throw http.ClientException('HTTP ${response.statusCode}', Uri.parse(url));
  final text = (jsonDecode(response.body) as Map<String, dynamic>)['tafsir']['text'] as String;
  return text.replaceAll(RegExp(r'<[^>]*>'), '').trim();
}
