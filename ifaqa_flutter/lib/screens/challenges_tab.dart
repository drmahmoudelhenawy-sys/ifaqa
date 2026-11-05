import 'package:flutter/material.dart';
import '../data/challenges_data.dart';
import '../services/app_state.dart';
import '../theme/app_colors.dart';
import '../widgets/coming_soon_tab.dart';
import 'ameen_wall_tab.dart';

enum _ChTab { daily, events, ameen, rooms }

class ChallengesTab extends StatefulWidget {
  const ChallengesTab({super.key});

  @override
  State<ChallengesTab> createState() => _ChallengesTabState();
}

class _ChallengesTabState extends State<ChallengesTab> {
  _ChTab activeTab = _ChTab.daily;
  final AppState _state = AppState.instance;

  int get completedCount => allChallenges.where((c) => _state.dayHas(DateTime.now(), 'challenges', c.id)).length;
  int get totalChallenges => allChallenges.length;
  int get progress => totalChallenges == 0 ? 0 : (completedCount / totalChallenges * 100).round();

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
        children: [
          _buildSegmentedTabs(),
          const SizedBox(height: 16),
          _buildTabContent(),
        ],
      ),
    );
  }

  Widget _buildSegmentedTabs() {
    final items = [
      (_ChTab.daily, 'يومية', Icons.bolt),
      (_ChTab.events, 'الفعاليات', Icons.celebration),
      (_ChTab.ameen, 'حائط آمين', Icons.favorite),
      (_ChTab.rooms, 'الغرف', Icons.groups),
    ];
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(18)),
      child: Row(
        children: items.map((item) {
          final active = activeTab == item.$1;
          return Expanded(
            child: InkWell(
              onTap: () => setState(() => activeTab = item.$1),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  gradient: active ? const LinearGradient(colors: [AppColors.violet600, AppColors.indigo600]) : null,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(item.$3, size: 15, color: active ? Colors.white : AppColors.slate500),
                    const SizedBox(height: 2),
                    Text(item.$2, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: active ? Colors.white : AppColors.slate500)),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTabContent() {
    switch (activeTab) {
      case _ChTab.daily:
        return _buildDailyTab();
      case _ChTab.events:
        return const ComingSoonTab(icon: Icons.celebration, title: 'فعاليات موعان');
      case _ChTab.ameen:
        return const AmeenWallTab();
      case _ChTab.rooms:
        return const ComingSoonTab(icon: Icons.groups, title: 'غرف الأقران');
    }
  }

  Widget _buildDailyTab() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(28), border: Border.all(color: AppColors.slate100)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.track_changes, color: AppColors.violet500, size: 16),
                          SizedBox(width: 6),
                          Text('مؤشر حصاد اليوم', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate800)),
                        ],
                      ),
                      SizedBox(height: 4),
                      Text('أتمم المهام لاكتساب النقاط ورفع رتبتك', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                    ],
                  ),
                  Text.rich(TextSpan(children: [
                    TextSpan(text: '$completedCount', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.violet600)),
                    TextSpan(text: '/$totalChallenges', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                  ])),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(value: progress / 100, minHeight: 10, backgroundColor: AppColors.slate100, valueColor: const AlwaysStoppedAnimation(AppColors.violet500)),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('نسبة الإنجاز: $progress%', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                  Text('متبقي: ${totalChallenges - completedCount} مهام', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        ...allChallenges.map((c) {
          final isDone = _state.dayHas(DateTime.now(), 'challenges', c.id);
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDone ? const Color(0xFFECFDF5) : Colors.white,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: isDone ? AppColors.emerald400.withValues(alpha: 0.5) : AppColors.slate100),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: isDone ? AppColors.emerald500 : AppColors.slate100,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(isDone ? Icons.check_circle : Icons.bolt, color: isDone ? Colors.white : AppColors.slate400, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          c.title,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            color: isDone ? const Color(0xFF065F46) : AppColors.slate800,
                            decoration: isDone ? TextDecoration.lineThrough : null,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: isDone ? AppColors.emerald100 : const Color(0xFFF5F3FF),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text('+${c.xp} XP', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: isDone ? AppColors.emerald700 : AppColors.violet700)),
                        ),
                      ],
                    ),
                  ),
                  if (!isDone)
                    FilledButton(
                      onPressed: () => setState(() => _state.toggleDayItem(DateTime.now(), 'challenges', c.id, xpValue: c.xp)),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.slate100,
                        foregroundColor: AppColors.slate700,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: const Text('تم', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                    )
                  else
                    Container(
                      width: 32,
                      height: 32,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: AppColors.emerald100, shape: BoxShape.circle),
                      child: const Icon(Icons.check_circle, color: AppColors.emerald600, size: 16),
                    ),
                ],
              ),
            ),
          );
        }),
        if (completedCount == totalChallenges && totalChallenges > 0)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(32),
              border: Border.all(color: AppColors.emerald400.withValues(alpha: 0.5), style: BorderStyle.solid),
            ),
            child: const Column(
              children: [
                Icon(Icons.emoji_events, color: AppColors.amber400, size: 40),
                SizedBox(height: 8),
                Text('هنيئًا لك! أتممت جميع تحديات اليوم', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: Color(0xFF064E3B))),
                SizedBox(height: 4),
                Text('تقبل الله طاعاتك وأثابك، عد غدًا لمهام جديدة بإذن الله.', textAlign: TextAlign.center, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF047857))),
              ],
            ),
          ),
      ],
    );
  }
}
