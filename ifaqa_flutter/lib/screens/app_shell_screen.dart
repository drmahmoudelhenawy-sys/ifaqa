import 'package:flutter/material.dart';
import '../models/app_mode.dart';
import '../models/nav_page.dart';
import '../models/tier.dart';
import '../services/app_state.dart';
import '../services/content_service.dart';
import '../services/cloud_service.dart';
import '../theme/app_colors.dart';
import '../siraj/siraj_capsule.dart';
import '../siraj/siraj_settings.dart';
import '../widgets/iqamah_banner.dart';
import '../widgets/mini_player.dart';
import 'challenges_tab.dart';
import 'home_tab.dart';
import 'leaderboard_tab.dart';
import 'prayer_times_tab.dart';
import 'profile_tab.dart';
import 'quran_audio_hub_tab.dart';
import 'quran_tab.dart';
import 'siraj_tab.dart';
import 'tools_tab.dart';

class AppShellScreen extends StatefulWidget {
  final NavPage initialPage;
  const AppShellScreen({super.key, this.initialPage = NavPage.home});

  @override
  State<AppShellScreen> createState() => _AppShellScreenState();
}

class _AppShellScreenState extends State<AppShellScreen> {
  final AppState _state = AppState.instance;
  late NavPage currentPage = widget.initialPage;

  AppMode get appMode => _state.appMode;
  String get userName => _state.displayName;
  int get userXp => _state.xp;

  @override
  void initState() {
    super.initState();
    _state.addListener(_onStateChanged);
    CloudService.instance.addListener(_maybeShowAnnouncement);
    _maybeShowAnnouncement();
  }

  @override
  void dispose() {
    _state.removeListener(_onStateChanged);
    CloudService.instance.removeListener(_maybeShowAnnouncement);
    super.dispose();
  }

  bool _announcementChecked = false;

  /// The latest active announcement, once per distinct text (React App.tsx).
  Future<void> _maybeShowAnnouncement() async {
    if (_announcementChecked || !CloudService.instance.signedIn) return;
    _announcementChecked = true;
    try {
      final a = await ContentService.instance.latestAnnouncement();
      if (a == null || !mounted) return;
      final key = '${a.title}_${a.body}';
      if (_state.text('announcement_seen') == key) return;
      _state.setText('announcement_seen', key);
      await showDialog(
        context: context,
        builder: (_) => Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            icon: const Icon(Icons.campaign, color: AppColors.violet600, size: 36),
            title: Text(a.title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w900)),
            content: Text(a.body, textAlign: TextAlign.center, style: const TextStyle(height: 1.7, fontWeight: FontWeight.w600)),
            actions: [FilledButton(onPressed: () => Navigator.pop(context), child: const Text('حسنًا'))],
          ),
        ),
      );
    } catch (_) {
      // Rules not deployed yet, or offline: skip quietly.
    }
  }

  void _onStateChanged() {
    if (mounted) setState(() {});
  }

  bool get isLite => appMode == AppMode.lite;

  bool get sirajActive => SirajSettings.visibleInApp;

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour >= 3 && hour < 11) return 'صباح النور والبركة';
    if (hour >= 11 && hour < 16) return 'طاب يومك بذكر الله';
    if (hour >= 16 && hour < 20) return 'طاب مساؤك بالخير';
    return 'ليلة مباركة وذكر طيب';
  }

  Widget _buildBody() {
    switch (currentPage) {
      case NavPage.home:
        return HomeTab(appMode: appMode, onNavigate: (page) => setState(() => currentPage = page));
      case NavPage.quran:
        return const QuranTab();
      case NavPage.audio:
        return const QuranAudioHubTab();
      case NavPage.prayerTimes:
        return const PrayerTimesTab();
      case NavPage.siraj:
        return const SirajTab();
      case NavPage.challenges:
        return const ChallengesTab();
      case NavPage.tools:
        return const ToolsTab();
      case NavPage.leaderboard:
        return LeaderboardTab(userXp: userXp);
      case NavPage.profile:
        return ProfileTab(appMode: appMode, onAppModeChanged: (mode) => _state.appMode = mode);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tier = getTierForXp(userXp);
    final nextTier = getNextTier(tier);
    final progressPercent = nextTier.min == tier.min
        ? 100.0
        : (((userXp - tier.min) / (nextTier.min - tier.min)) * 100).clamp(0, 100).toDouble();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        body: Stack(
          children: [
            SafeArea(
              bottom: false,
              child: Column(
                children: [
                  // Rest slot of the collapsed capsule (6 gap + 38 pill + 4), so it never covers the top bar.
                  if (sirajActive) SizedBox(height: SirajSettings.config().autoHide ? 14 : 46),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: Column(
                      children: [
                        _buildTopBar(),
                        if (currentPage == NavPage.home && !isLite) ...[
                          const SizedBox(height: 14),
                          _buildXpRibbon(tier, nextTier, progressPercent),
                        ],
                      ],
                    ),
                  ),
                  // Siraj supersedes the iqamah banner while it is on.
                  if (!sirajActive) const IqamahBanner(),
                  Expanded(child: _buildBody()),
                ],
              ),
            ),
            // Floats over the content (never pushes it down), under the status bar.
            // Long-press the capsule to open the Siraj tab.
            if (sirajActive)
              Positioned.fill(
                child: SirajCapsule(
                  onOpenSirajTab: () =>
                      setState(() => currentPage = NavPage.siraj),
                ),
              ),
          ],
        ),
        bottomNavigationBar: SafeArea(
          top: false,
          minimum: const EdgeInsets.fromLTRB(10, 0, 10, 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const MiniPlayer(),
              _buildBottomNav(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return Row(
      children: [
        InkWell(
          onTap: () => setState(() => currentPage = NavPage.profile),
          borderRadius: BorderRadius.circular(999),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 50,
                height: 50,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: AppColors.violet600,
                  shape: BoxShape.circle,
                ),
                child: Image.asset('assets/images/logo-white.png', width: 28, height: 28),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  width: 14,
                  height: 14,
                  decoration: BoxDecoration(
                    color: AppColors.emerald500,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_greeting, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate500)),
              Text(
                'أهلًا بك، $userName',
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: AppColors.slate900),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        if (!isLite)
          _iconButton(
            icon: Icons.emoji_events,
            active: currentPage == NavPage.leaderboard,
            activeColor: AppColors.amber500,
            iconColor: AppColors.amber500,
            onTap: () => setState(() => currentPage = NavPage.leaderboard),
          ),
        const SizedBox(width: 6),
        _iconButton(
          icon: Icons.settings,
          active: currentPage == NavPage.profile,
          activeColor: AppColors.violet600,
          iconColor: AppColors.slate700,
          onTap: () => setState(() => currentPage = NavPage.profile),
        ),
      ],
    );
  }

  Widget _iconButton({
    required IconData icon,
    required bool active,
    required Color activeColor,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 40,
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: active ? activeColor : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: active ? activeColor : AppColors.slate200),
        ),
        child: Icon(icon, size: 18, color: active ? Colors.white : iconColor),
      ),
    );
  }

  Widget _buildXpRibbon(Tier tier, Tier nextTier, double progressPercent) {
    return InkWell(
      onTap: () => setState(() => currentPage = NavPage.leaderboard),
      borderRadius: BorderRadius.circular(28),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [AppColors.violet600, AppColors.indigo600, Color(0xFF6B21A8)]),
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
        ),
        child: Row(
          children: [
            Image.asset(tier.img, width: 56, height: 56),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${userXp.toString()} XP',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Text('رتبتك الحالية', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.white)),
                          ),
                          Text(tier.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: progressPercent / 100,
                      minHeight: 8,
                      backgroundColor: Colors.black.withValues(alpha: 0.35),
                      valueColor: const AlwaysStoppedAnimation(AppColors.amber300),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('${progressPercent.round()}%', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.amber300)),
                      Text('${nextTier.min} نقطة للمستوى التالي', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white70)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 24, offset: Offset(0, 8))],
      ),
      child: Row(
        children: [
          _navBtn(Icons.check_circle, 'يومي', NavPage.home),
          _navBtn(Icons.menu_book, 'المصحف', NavPage.quran),
          _navBtn(Icons.headphones, 'استماع', NavPage.audio),
          _navBtn(Icons.access_time_filled, 'الصلاة', NavPage.prayerTimes),
          _navBtn(Icons.nightlight_round, 'سِراج', NavPage.siraj),
          if (!isLite) _navBtn(Icons.bolt, 'التحديات', NavPage.challenges),
          _navBtn(Icons.grid_view, 'الأدوات', NavPage.tools),
        ],
      ),
    );
  }

  Widget _navBtn(IconData icon, String label, NavPage page) {
    final active = currentPage == page;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => currentPage = page),
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            gradient: active
                ? const LinearGradient(colors: [AppColors.violet600, Color(0xFF4338CA)])
                : null,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 19, color: active ? Colors.white : AppColors.slate700),
              const SizedBox(height: 3),
              Text(
                label,
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: active ? Colors.white : AppColors.slate800),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
