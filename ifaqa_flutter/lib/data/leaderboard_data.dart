class LeaderboardEntry {
  final String id;
  final String name;
  final int xp;
  const LeaderboardEntry({required this.id, required this.name, required this.xp});
}

const List<LeaderboardEntry> mockLeaderboard = [
  LeaderboardEntry(id: 'u1', name: 'محمد الشريف', xp: 812000),
  LeaderboardEntry(id: 'u2', name: 'سارة عبدالرحمن', xp: 640500),
  LeaderboardEntry(id: 'u3', name: 'يوسف العتيبي', xp: 498200),
  LeaderboardEntry(id: 'me', name: 'عبدالله', xp: 12500),
  LeaderboardEntry(id: 'u5', name: 'خالد منصور', xp: 9800),
  LeaderboardEntry(id: 'u6', name: 'فاطمة الزهراء', xp: 7600),
  LeaderboardEntry(id: 'u7', name: 'عمر حسن', xp: 5400),
];
