class ChallengeItem {
  final String id;
  final String title;
  final int xp;
  const ChallengeItem({required this.id, required this.title, required this.xp});
}

const List<ChallengeItem> allChallenges = [
  ChallengeItem(id: 'ch1', title: 'صيام الاثنين', xp: 300),
  ChallengeItem(id: 'ch2', title: 'تصدق بمبلغ بسيط', xp: 150),
  ChallengeItem(id: 'ch3', title: 'زيارة مريض', xp: 400),
  ChallengeItem(id: 'ch4', title: 'قراءة سورة الكهف', xp: 250),
  ChallengeItem(id: 'ch5', title: 'إطعام مسكين', xp: 350),
  ChallengeItem(id: 'ch6', title: 'قيام الليل (ركعتين)', xp: 300),
  ChallengeItem(id: 'ch7', title: 'صلة رحم (اتصال)', xp: 200),
  ChallengeItem(id: 'ch8', title: 'صلاة الضحى', xp: 150),
  ChallengeItem(id: 'ch9', title: 'التبسم في وجه أخيك', xp: 100),
  ChallengeItem(id: 'ch10', title: 'المساعدة في أعمال المنزل', xp: 250),
];
