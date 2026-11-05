class Reciter {
  final int id;
  final String name;
  final String server;
  final List<int> surahList;

  const Reciter({required this.id, required this.name, required this.server, required this.surahList});

  String surahUrl(int surahNumber) {
    final padded = surahNumber.toString().padLeft(3, '0');
    return '$server$padded.mp3';
  }
}
