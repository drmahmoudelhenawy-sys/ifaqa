import 'package:flutter/material.dart';
import '../data/leaderboard_data.dart';
import '../models/tier.dart';
import '../theme/app_colors.dart';

enum _LbTab { leaderboard, badges, tiers }

class LeaderboardTab extends StatefulWidget {
  final int userXp;
  const LeaderboardTab({super.key, required this.userXp});

  @override
  State<LeaderboardTab> createState() => _LeaderboardTabState();
}

class _LeaderboardTabState extends State<LeaderboardTab> {
  _LbTab activeTab = _LbTab.leaderboard;

  static const Map<String, String> tierDescriptions = {
    'bronze': 'بداية الانطلاقة في رحلة الالتزام والإقبال على الطاعات.',
    'silver': 'المواظبة على أداء الصلوات والأوراد اليومية بثبات واستمرار.',
    'gold': 'المسارعة إلى الخيرات واستباق الطاعات وقيام الليل.',
    'diamond': 'خشوع القلب وتدبر القرآن وبلوغ مراتب الإحسان.',
    'legendary': 'ثبات راسخ وهمة عالية في الصيام والذكر والقرآن.',
    'elite': 'قمة سباق الخيرات، ونخبة المتسابقين في درجات الجنان.',
  };

  static const List<(String, IconData, bool)> _badges = [
    ('صلاة الفجر جماعة (7 أيام)', Icons.wb_twilight, true),
    ('ختمة كاملة للقرآن', Icons.menu_book, false),
    ('أذكار الصباح (30 يومًا)', Icons.wb_sunny, true),
    ('صيام الإثنين والخميس', Icons.restaurant, false),
    ('قيام الليل (10 مرات)', Icons.nightlight_round, false),
    ('الصلاة على النبي (1000 مرة)', Icons.favorite, true),
    ('حفظ جزء عمّ', Icons.auto_stories, false),
    ('صدقة يومية (أسبوع)', Icons.volunteer_activism, false),
  ];

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
        children: [
          _buildSegmentedTabs(),
          const SizedBox(height: 18),
          _buildTabContent(),
        ],
      ),
    );
  }

  Widget _buildSegmentedTabs() {
    final items = [
      (_LbTab.leaderboard, 'المتصدرين', Icons.emoji_events, AppColors.amber500),
      (_LbTab.badges, 'الأوسمة', Icons.military_tech, AppColors.violet600),
      (_LbTab.tiers, 'الدروع والرتب', Icons.shield, AppColors.emerald600),
    ];
    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(24)),
      child: Row(
        children: items.map((item) {
          final active = activeTab == item.$1;
          return Expanded(
            child: InkWell(
              onTap: () => setState(() => activeTab = item.$1),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(color: active ? item.$4 : Colors.transparent, borderRadius: BorderRadius.circular(20)),
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
      case _LbTab.leaderboard:
        return _buildLeaderboard();
      case _LbTab.badges:
        return _buildBadges();
      case _LbTab.tiers:
        return _buildTiers();
    }
  }

  Widget _buildLeaderboard() {
    final list = [...mockLeaderboard]..sort((a, b) => b.xp.compareTo(a.xp));
    final top3 = list.take(3).toList();
    final rest = list.skip(3).toList();

    return Column(
      children: [
        const Column(
          children: [
            Text('لوحة المتصدرين', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppColors.slate800)),
            SizedBox(height: 4),
            Text('وفي ذلك فليتنافس المتنافسون', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate400)),
          ],
        ),
        const SizedBox(height: 20),
        SizedBox(
          height: 270,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (top3.length > 1) Expanded(child: _podiumTile(top3[1], 2, 130, [AppColors.slate300, AppColors.slate400])),
              if (top3.isNotEmpty) Expanded(child: _podiumTile(top3[0], 1, 165, [AppColors.amber400, AppColors.amber600], crown: true)),
              if (top3.length > 2) Expanded(child: _podiumTile(top3[2], 3, 110, [Color(0xFFB45309), Color(0xFF78350F)])),
            ],
          ),
        ),
        const SizedBox(height: 20),
        ...rest.asMap().entries.map((entry) {
          final rank = entry.key + 4;
          final u = entry.value;
          final isMe = u.id == 'me';
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: isMe ? const LinearGradient(colors: [AppColors.violet600, AppColors.indigo600]) : null,
                color: isMe ? null : Colors.white,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: isMe ? Colors.transparent : AppColors.slate100, width: isMe ? 2 : 1),
              ),
              child: Row(
                children: [
                  SizedBox(width: 30, child: Text('#$rank', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: isMe ? Colors.white : AppColors.slate400))),
                  const SizedBox(width: 10),
                  CircleAvatar(radius: 20, backgroundColor: isMe ? Colors.white24 : AppColors.slate100, child: Icon(Icons.person, color: isMe ? Colors.white : AppColors.slate400)),
                  const SizedBox(width: 12),
                  Expanded(child: Text(u.name, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: isMe ? Colors.white : AppColors.slate800))),
                  Text(u.xp.toString(), style: TextStyle(fontWeight: FontWeight.w900, fontFamily: 'monospace', color: isMe ? Colors.white : AppColors.slate500)),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _podiumTile(LeaderboardEntry u, int rank, double height, List<Color> gradient, {bool crown = false}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (crown) const Icon(Icons.emoji_events, color: AppColors.amber400, size: 28),
        CircleAvatar(radius: rank == 1 ? 34 : 28, backgroundColor: Colors.white, child: CircleAvatar(radius: rank == 1 ? 31 : 25, backgroundColor: AppColors.slate100, child: Icon(Icons.person, color: AppColors.slate400, size: rank == 1 ? 30 : 24))),
        Transform.translate(
          offset: const Offset(0, -14),
          child: Container(
            width: double.infinity,
            height: height,
            padding: const EdgeInsets.only(top: 16),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: gradient, begin: Alignment.topCenter, end: Alignment.bottomCenter),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              children: [
                Text(u.name, textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.25), borderRadius: BorderRadius.circular(999)),
                  child: Text(u.xp.toString(), style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900)),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBadges() {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 0.95,
      children: _badges.map((b) {
        final unlocked = b.$3;
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: unlocked ? const Color(0xFFF5F3FF) : AppColors.slate50,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: unlocked ? AppColors.violet300 : AppColors.slate100),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 56,
                height: 56,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: unlocked ? AppColors.violet600 : AppColors.slate200,
                  shape: BoxShape.circle,
                ),
                child: Icon(unlocked ? b.$2 : Icons.lock, color: Colors.white, size: 24),
              ),
              const SizedBox(height: 10),
              Text(b.$1, textAlign: TextAlign.center, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: unlocked ? AppColors.violet700 : AppColors.slate400)),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildTiers() {
    final currentTier = getTierForXp(widget.userXp);
    return Column(
      children: kTiers.map((t) {
        final isCurrent = t.id == currentTier.id;
        final achieved = widget.userXp >= t.min;
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isCurrent ? const Color(0xFFECFDF5) : Colors.white,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: isCurrent ? AppColors.emerald400 : AppColors.slate100, width: isCurrent ? 2 : 1),
            ),
            child: Row(
              children: [
                Opacity(
                  opacity: achieved ? 1 : 0.35,
                  child: Image.asset(t.img, width: 56, height: 56),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(t.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.slate800)),
                          if (isCurrent) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(color: AppColors.emerald500, borderRadius: BorderRadius.circular(999)),
                              child: const Text('رتبتك', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900)),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(tierDescriptions[t.id] ?? '', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                      const SizedBox(height: 4),
                      Text('من ${t.min} نقطة', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.slate500, fontFamily: 'monospace')),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}
