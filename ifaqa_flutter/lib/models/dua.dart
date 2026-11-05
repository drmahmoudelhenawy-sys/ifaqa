class Dua {
  final String id;
  final String userId;
  final String userName;
  final String text;
  int ameenCount;
  final Set<String> ameenedBy;
  final DateTime timestamp;

  Dua({
    required this.id,
    required this.userId,
    required this.userName,
    required this.text,
    this.ameenCount = 0,
    Set<String>? ameenedBy,
    DateTime? timestamp,
  })  : ameenedBy = ameenedBy ?? {},
        timestamp = timestamp ?? DateTime.now();
}
