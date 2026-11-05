import 'dart:convert';
import 'package:http/http.dart' as http;

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

Future<List<HadithItem>> fetchHadithEdition(String edition) async {
  final url = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/$edition.min.json';
  final response = await http.get(Uri.parse(url));
  if (response.statusCode != 200) {
    throw Exception('تعذر تحميل الأحاديث');
  }
  final data = jsonDecode(response.body) as Map<String, dynamic>;
  final hadiths = (data['hadiths'] as List?) ?? [];
  return hadiths.map((h) {
    return HadithItem(
      hadithNumber: h['hadithnumber'] is int ? h['hadithnumber'] : int.tryParse('${h['hadithnumber']}') ?? 0,
      text: (h['text'] ?? '').toString(),
      bookName: h['reference'] != null ? 'كتاب ${h['reference']['book'] ?? ''}' : null,
    );
  }).toList();
}
