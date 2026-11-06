class Zekr {
  final String id;
  final String text;
  final int count;
  final int xp;
  final String fadl;

  const Zekr({required this.id, required this.text, required this.count, required this.xp, this.fadl = ''});
}

class SituationalCategory {
  final String id;
  final String title;
  final List<Zekr> adhkar;

  const SituationalCategory({required this.id, required this.title, required this.adhkar});
}

enum AthkarType { morning, evening, situational }
