import 'dart:convert';
import 'package:http/http.dart' as http;
import 'offline_store/offline_store.dart';

class HadithCollection {
  final String id;
  final String name;
  final String edition;
  const HadithCollection({required this.id, required this.name, required this.edition});
}

const List<HadithCollection> hadithCollections = [
  HadithCollection(id: 'bukhari', name: 'صحيح البخاري', edition: 'ara-bukhari'),
  HadithCollection(id: 'muslim', name: 'صحيح مسلم', edition: 'ara-muslim'),
  HadithCollection(id: 'abudawud', name: 'سنن أبي داود', edition: 'ara-abudawud'),
  HadithCollection(id: 'tirmidhi', name: 'سنن الترمذي', edition: 'ara-tirmidhi'),
  HadithCollection(id: 'nasai', name: 'سنن النسائي', edition: 'ara-nasai'),
  HadithCollection(id: 'ibnmajah', name: 'سنن ابن ماجه', edition: 'ara-ibnmajah'),
];

class HadithItem {
  final int hadithNumber;
  final String text;
  final String? bookName;
  const HadithItem({required this.hadithNumber, required this.text, this.bookName});
}

String hadithUrl(String edition) => 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/$edition.min.json';
String hadithOfflinePath(String edition) => 'hadith/$edition.json';

/// Reads the downloaded copy first, so downloaded books work offline.
Future<List<HadithItem>> fetchHadithEdition(String edition) async {
  final local = await OfflineStore.instance.read(hadithOfflinePath(edition));
  final String body;
  if (local != null) {
    body = utf8.decode(local);
  } else {
    final response = await http.get(Uri.parse(hadithUrl(edition)));
    if (response.statusCode != 200) {
      throw Exception('تعذر تحميل الأحاديث');
    }
    body = utf8.decode(response.bodyBytes);
  }
  final data = jsonDecode(body) as Map<String, dynamic>;
  final hadiths = (data['hadiths'] as List?) ?? [];
  return hadiths.map((h) {
    return HadithItem(
      hadithNumber: h['hadithnumber'] is int ? h['hadithnumber'] : int.tryParse('${h['hadithnumber']}') ?? 0,
      text: (h['text'] ?? '').toString(),
      bookName: h['reference'] != null ? 'كتاب ${h['reference']['book'] ?? ''}' : null,
    );
  }).toList();
}
