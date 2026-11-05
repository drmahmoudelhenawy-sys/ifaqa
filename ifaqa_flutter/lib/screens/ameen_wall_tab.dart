import 'package:flutter/material.dart';
import '../models/dua.dart';
import '../theme/app_colors.dart';

const String _kMe = 'me';

class AmeenWallTab extends StatefulWidget {
  const AmeenWallTab({super.key});

  @override
  State<AmeenWallTab> createState() => _AmeenWallTabState();
}

class _AmeenWallTabState extends State<AmeenWallTab> {
  final TextEditingController controller = TextEditingController();
  bool isAnonymous = false;
  bool posting = false;

  final List<Dua> duas = [
    Dua(id: '1', userId: 'u1', userName: 'محمد الشريف', text: 'اللهم اشفِ مرضى المسلمين وفرّج هم كل مهموم.', ameenCount: 14, timestamp: DateTime.now().subtract(const Duration(minutes: 20))),
    Dua(id: '2', userId: 'u2', userName: 'فاعل خير', text: 'اللهم يسّر لي أمر زواجي وارزقني الذرية الصالحة.', ameenCount: 6, timestamp: DateTime.now().subtract(const Duration(hours: 3))),
  ];

  String _timeAgo(DateTime date) {
    final seconds = DateTime.now().difference(date).inSeconds;
    if (seconds < 60) return 'منذ قليل';
    if (seconds < 3600) return 'منذ ${seconds ~/ 60} دقيقة';
    if (seconds < 86400) return 'منذ ${seconds ~/ 3600} ساعة';
    return 'منذ ${seconds ~/ 86400} يوم';
  }

  void _post() {
    final text = controller.text.trim();
    if (text.isEmpty) return;
    setState(() {
      duas.insert(0, Dua(id: DateTime.now().millisecondsSinceEpoch.toString(), userId: _kMe, userName: isAnonymous ? 'فاعل خير' : 'عبدالله', text: text));
      controller.clear();
    });
  }

  void _ameen(Dua dua) {
    if (dua.ameenedBy.contains(_kMe)) return;
    setState(() {
      dua.ameenCount++;
      dua.ameenedBy.add(_kMe);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppColors.violet600, AppColors.indigo600]),
              borderRadius: BorderRadius.circular(28),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.auto_awesome, color: Color(0xFFFDE047), size: 18),
                    SizedBox(width: 6),
                    Text('حائط الدعاء', style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w900)),
                  ],
                ),
                SizedBox(height: 6),
                Text('ادعُ لنفسك ولإخوانك بظهر الغيب، ولك بالمثل إن شاء الله.', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(28), border: Border.all(color: AppColors.slate100)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: controller,
                  maxLength: 300,
                  minLines: 3,
                  maxLines: 5,
                  textAlign: TextAlign.right,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    hintText: 'اكتب دعاءً يلامس قلبك...',
                    border: InputBorder.none,
                    counterText: '',
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    InkWell(
                      onTap: () => setState(() => isAnonymous = !isAnonymous),
                      borderRadius: BorderRadius.circular(999),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(
                          color: isAnonymous ? AppColors.slate800 : Colors.white,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: AppColors.slate200),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.person, size: 13, color: isAnonymous ? Colors.white : AppColors.slate500),
                            const SizedBox(width: 6),
                            Text(isAnonymous ? 'مجهول' : 'باسمك', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isAnonymous ? Colors.white : AppColors.slate500)),
                          ],
                        ),
                      ),
                    ),
                    FilledButton.icon(
                      onPressed: controller.text.trim().isEmpty ? null : _post,
                      style: FilledButton.styleFrom(backgroundColor: AppColors.violet600, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                      icon: const Icon(Icons.send, size: 15),
                      label: const Text('انشر', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                      onLongPress: null,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          if (duas.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(child: Text('لا يوجد دعوات بعد، كن أول المبادرين!', style: TextStyle(color: AppColors.slate400, fontWeight: FontWeight.bold))),
            )
          else
            ...duas.map((dua) {
              final isMe = dua.userId == _kMe;
              final hasAmeened = dua.ameenedBy.contains(_kMe);
              return Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(28), border: Border.all(color: AppColors.slate100)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: isMe ? const Color(0xFFF5F3FF) : AppColors.slate100,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Icon(isMe ? Icons.person : Icons.volunteer_activism, color: isMe ? AppColors.violet600 : AppColors.slate500, size: 20),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(dua.userName, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate800)),
                                    if (isMe) ...[
                                      const SizedBox(width: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                        decoration: BoxDecoration(color: const Color(0xFFF5F3FF), borderRadius: BorderRadius.circular(999)),
                                        child: const Text('أنت', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.violet600)),
                                      ),
                                    ],
                                  ],
                                ),
                                Row(
                                  children: [
                                    const Icon(Icons.access_time, size: 10, color: AppColors.slate400),
                                    const SizedBox(width: 4),
                                    Text(_timeAgo(dua.timestamp), style: const TextStyle(fontSize: 10, color: AppColors.slate400)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(18)),
                        child: Text(dua.text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.slate700, height: 1.6)),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            dua.ameenCount > 0 ? '${dua.ameenCount} شخص أمّنوا على دعائك' : 'كن أول من يؤمّن',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.slate400),
                          ),
                          InkWell(
                            onTap: () => _ameen(dua),
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              decoration: BoxDecoration(
                                color: hasAmeened ? AppColors.emerald500 : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: hasAmeened ? Colors.transparent : AppColors.slate200),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.favorite, size: 16, color: hasAmeened ? Colors.white : AppColors.slate400),
                                  const SizedBox(width: 6),
                                  Text(hasAmeened ? 'تم التأمين' : 'أمين', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: hasAmeened ? Colors.white : AppColors.slate500)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}
