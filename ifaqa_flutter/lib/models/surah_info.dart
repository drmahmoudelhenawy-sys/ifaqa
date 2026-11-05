class SurahInfo {
  final int number;
  final String name;
  final String englishName;
  final int ayahCount;
  final int startPage;
  final String type;

  const SurahInfo({
    required this.number,
    required this.name,
    required this.englishName,
    required this.ayahCount,
    required this.startPage,
    required this.type,
  });

  bool get isMeccan => type == 'meccan';
}
