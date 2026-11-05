import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/radio_station.dart';

const String _recitersApiUrl = 'https://www.mp3quran.net/api/v3/radios?language=ar';

Future<List<RadioStation>> fetchReciterStations() async {
  try {
    final response = await http.get(Uri.parse(_recitersApiUrl));
    if (response.statusCode != 200) return [];
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final radios = (data['radios'] as List?) ?? [];
    return radios.map((r) {
      return RadioStation(
        id: r['id'] is int ? r['id'] : int.tryParse('${r['id']}') ?? 0,
        name: r['name']?.toString() ?? 'إذاعة قارئ',
        url: r['url']?.toString() ?? '',
        subtitle: 'إذاعة قارئ',
        category: RadioCategory.reciters,
      );
    }).where((s) => s.url.isNotEmpty).toList();
  } catch (_) {
    return [];
  }
}
