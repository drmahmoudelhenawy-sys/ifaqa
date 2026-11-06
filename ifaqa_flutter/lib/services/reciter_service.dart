import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/reciter.dart';

Future<List<Reciter>> fetchReciters() async {
  final response = await http.get(Uri.parse('https://www.mp3quran.net/api/v3/reciters?language=ar'));
  if (response.statusCode != 200) throw Exception('تعذر تحميل القراء');
  final data = jsonDecode(response.body) as Map<String, dynamic>;
  final reciters = (data['reciters'] as List?) ?? [];
  final result = <Reciter>[];
  for (final r in reciters) {
    final moshafList = (r['moshaf'] as List?) ?? [];
    if (moshafList.isEmpty) continue;
    final moshaf = moshafList.first as Map<String, dynamic>;
    final surahListStr = (moshaf['surah_list'] ?? '').toString();
    final surahList = surahListStr.isEmpty ? <int>[] : surahListStr.split(',').map((s) => int.tryParse(s.trim()) ?? 0).where((n) => n > 0).toList();
    result.add(Reciter(
      id: r['id'] is int ? r['id'] : int.tryParse('${r['id']}') ?? 0,
      name: r['name']?.toString() ?? 'قارئ',
      server: moshaf['server']?.toString() ?? '',
      surahList: surahList,
    ));
  }
  return result.where((r) => r.server.isNotEmpty).toList();
}
