import 'dart:async';
import 'package:flutter/material.dart';
import '../models/prayer.dart';
import '../models/app_mode.dart';
import '../models/nav_page.dart';
import '../models/zekr.dart';
import '../services/app_state.dart';
import '../services/prophet_challenge_service.dart';
import '../theme/app_colors.dart';
import '../widgets/dynamic_content_card.dart';
import '../widgets/prayer_card.dart';
import '../widgets/prayer_detail_sheet.dart';
import 'athkar_screen.dart';
import 'masbaha_screen.dart';
import 'prophet_challenge_screen.dart';

class HomeTab extends StatefulWidget {
  final AppMode appMode;
  final ValueChanged<NavPage>? onNavigate;
  const HomeTab({super.key, required this.appMode, this.onNavigate});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  late DateTime currentDate;
  late List<Prayer> prayers;
  final AppState _state = AppState.instance;
  bool get qiyamDone => _state.dayHas(currentDate, 'extras', 'qiyam');

  bool get isLite => widget.appMode == AppMode.lite;

  String _dateStr(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  bool get isToday => _dateStr(currentDate) == _dateStr(DateTime.now());

  int get completedCount => prayers.where((p) => p.isDone).length;
  double get progressPercent => completedCount / 5 * 100;

  ProphetSchedule _prophet = ProphetSchedule.at(DateTime.now());
  Timer? _prophetTicker;

  void _openProphet() => Navigator.of(context)
      .push(MaterialPageRoute(builder: (_) => const ProphetChallengeScreen()))
      .then((_) {
    if (mounted) setState(() {});
  });

  @override
  void initState() {
    super.initState();
    currentDate = DateTime.now();
    _loadDay();
    _prophetTicker = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() => _prophet = ProphetSchedule.at(DateTime.now()));
    });
  }

  @override
  void dispose() {
    _prophetTicker?.cancel();
    super.dispose();
  }

  void _loadDay() {
    prayers = buildDefaultPrayers(isFriday: currentDate.weekday == DateTime.friday);
    for (final p in prayers) {
      p.status = _state.prayerStatus(currentDate, p.id);
      p.sunanPreDone = _state.dayHas(currentDate, 'sunan_pre', p.id);
      p.sunanPostDone = _state.dayHas(currentDate, 'sunan_post', p.id);
    }
  }

  void _changeDay(int delta) {
    setState(() {
      currentDate = currentDate.add(Duration(days: delta));
      _loadDay();
    });
  }

  int _sunnahXp(Prayer prayer, int rakahs) => prayer.id == 'asr' ? 50 : rakahs * 20;

  void _openPrayerSheet(Prayer prayer) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PrayerDetailSheet(
        prayer: prayer,
        onStatusSelected: (status) {
          _state.setPrayerStatus(currentDate, prayer.id, status);
          setState(() => prayer.status = status);
          Navigator.of(context).pop();
        },
        onSunnahToggled: (type) {
          final config = prayer.sunanConfig;
          setState(() {
            if (type == 'pre') {
              _state.toggleDayItem(currentDate, 'sunan_pre', prayer.id, xpValue: _sunnahXp(prayer, config.preCount));
              prayer.sunanPreDone = !prayer.sunanPreDone;
            } else {
              _state.toggleDayItem(currentDate, 'sunan_post', prayer.id, xpValue: _sunnahXp(prayer, config.postCount));
              prayer.sunanPostDone = !prayer.sunanPostDone;
            }
          });
        },
      ),
    ).then((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        _buildAdhkarRow(),
        const SizedBox(height: 16),
        const DynamicContentCard(),
        _buildProphetChallengeBanner(),
        const SizedBox(height: 16),
        _buildDateNav(),
        const SizedBox(height: 16),
        isLite ? _buildLiteProgressCard() : _buildFullProgressCard(),
        const SizedBox(height: 20),
        _buildTimelineHeader(),
        const SizedBox(height: 12),
        ...prayers.map(
          (p) => Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: PrayerCard(prayer: p, onTap: () => _openPrayerSheet(p)),
          ),
        ),
        const SizedBox(height: 16),
        _buildExtraWorshipHeader(),
        const SizedBox(height: 12),
        _buildExtraWorshipGrid(),
      ],
    );
  }

  void _openAthkar(AthkarType type) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => AthkarScreen(type: type)),
    );
  }

  Widget _buildAdhkarRow() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: _adhkarButton('ابدأ يومك', 'أذكار الصباح', Icons.wb_sunny, [AppColors.amber400, AppColors.orange500], onTap: () => _openAthkar(AthkarType.morning))),
            const SizedBox(width: 10),
            Expanded(child: _adhkarButton('اختم يومك', 'أذكار المساء', Icons.dark_mode, [AppColors.indigo500, AppColors.purple600], onTap: () => _openAthkar(AthkarType.evening))),
          ],
        ),
        const SizedBox(height: 10),
        _adhkarButton('حصنك اليومي', 'أذكار النوم والمنزل والأحوال', Icons.star, [AppColors.emerald500, AppColors.teal600], wide: true, onTap: () => _openAthkar(AthkarType.situational)),
      ],
    );
  }

  Widget _adhkarButton(String subtitle, String title, IconData icon, List<Color> gradient, {bool wide = false, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(26),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: gradient.first.withValues(alpha: 0.25)),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: gradient),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(subtitle, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: gradient.first)),
                  Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: AppColors.slate800)),
                ],
              ),
            ),
            if (wide) const Icon(Icons.chevron_left, color: AppColors.emerald400),
          ],
        ),
      ),
    );
  }

  Widget _buildProphetChallengeBanner() {
    final s = _prophet;
    final count = ProphetChallengeService.instance.localCount(s.periodKey);
    return InkWell(
      onTap: _openProphet,
      borderRadius: BorderRadius.circular(28),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: s.isFriday
                ? const [AppColors.amber600, AppColors.orange600, Color(0xFF92400E)]
                : const [AppColors.emerald600, AppColors.teal600, Color(0xFF047857)],
          ),
          borderRadius: BorderRadius.circular(28),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(16)),
              child: const Icon(Icons.favorite, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(s.title, style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 14)),
                  Text(count > 0 ? '${s.subtitle} • صليت $count' : s.subtitle,
                      style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.25), borderRadius: BorderRadius.circular(10)),
              child: Column(
                children: [
                  Text(s.countdown, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900)),
                  Text(s.isFriday ? 'متبقي' : 'لتحدي الجمعة', style: const TextStyle(color: Colors.white70, fontSize: 9, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDateNav() {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _navButton(Icons.chevron_right, enabled: true, onTap: () {
            _changeDay(-1);
          }),
          Column(
            children: [
              Text(_dateStr(currentDate), style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate800, fontSize: 13)),
              const SizedBox(height: 2),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                decoration: BoxDecoration(
                  color: isToday ? AppColors.emerald100 : AppColors.amber100,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  isToday ? 'اليوم' : 'يوم سابق',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: isToday ? AppColors.emerald700 : AppColors.amber700),
                ),
              ),
            ],
          ),
          _navButton(Icons.chevron_left, enabled: !isToday, onTap: () {
            if (!isToday) _changeDay(1);
          }),
        ],
      ),
    );
  }

  Widget _navButton(IconData icon, {required bool enabled, required VoidCallback onTap}) {
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 40,
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(12)),
        child: Icon(icon, size: 20, color: enabled ? AppColors.slate700 : AppColors.slate300),
      ),
    );
  }

  Widget _buildLiteProgressCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.emerald50,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: const Color(0xFFA7F3D0)),
      ),
      child: Column(
        children: [
          const Icon(Icons.favorite, color: AppColors.emerald500, size: 36),
          const SizedBox(height: 8),
          Text(
            completedCount == 5 ? 'تقبل الله طاعتك وأتم عليك نعمته' : 'حي على الصلاة',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.slate800),
          ),
          const SizedBox(height: 6),
          const Text(
            '"إن الصلاة كانت على المؤمنين كتاباً موقوتاً"',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate500),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(color: AppColors.emerald100, borderRadius: BorderRadius.circular(999)),
            child: Text(
              'أنجزت $completedCount من 5 صلوات',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.emerald700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFullProgressCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: AppColors.slate100),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 20, offset: Offset(0, 8))],
      ),
      child: Row(
        children: [
          SizedBox(
            width: 88,
            height: 88,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 88,
                  height: 88,
                  child: CircularProgressIndicator(
                    value: progressPercent / 100,
                    strokeWidth: 8,
                    backgroundColor: AppColors.slate100,
                    valueColor: const AlwaysStoppedAnimation(AppColors.violet600),
                    strokeCap: StrokeCap.round,
                  ),
                ),
                Text('${progressPercent.round()}%', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.slate800)),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(color: const Color(0xFFEDE9FE), borderRadius: BorderRadius.circular(999)),
                  child: const Text('إنجاز اليوم', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.violet600)),
                ),
                const SizedBox(height: 8),
                Text(
                  completedCount == 5 ? 'يوم مبارك مكتمل' : 'خطواتك في الطاعة',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.slate800),
                ),
                const SizedBox(height: 4),
                Text(
                  completedCount == 5
                      ? 'ما شاء الله! أتممت صلواتك الخمس، تقبل الله منك.'
                      : 'أنجزت $completedCount من 5 صلوات مفروضة، استمر!',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate500),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineHeader() {
    return const Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text('انقر على أي صلاة لتسجيلها', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
        Row(
          children: [
            Text('الصلوات المفروضة', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.slate600)),
            SizedBox(width: 6),
            _SectionDot(color: AppColors.violet600),
          ],
        ),
      ],
    );
  }

  Widget _buildExtraWorshipHeader() {
    return const Row(
      children: [
        Text('نوافل وطاعات إضافية', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.slate600)),
        SizedBox(width: 6),
        _SectionDot(color: AppColors.amber500),
      ],
    );
  }

  Widget _buildExtraWorshipGrid() {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 2.1,
      children: [
        _extraTile('المسبحة', 'وردك اليومي', Icons.blur_circular, AppColors.violet600, const Color(0xFFF5F3FF),
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MasbahaScreen()))),
        if (!isLite) _extraTile('المتصدرون', 'لوحة الأبطال', Icons.emoji_events, AppColors.amber600, AppColors.amber100, onTap: () => widget.onNavigate?.call(NavPage.leaderboard)),
        _extraTile('الصلاة على النبي', 'العداد اليومي', Icons.favorite, AppColors.emerald600, AppColors.emerald50, onTap: _openProphet),
        _qiyamTile(),
      ],
    );
  }

  Widget _extraTile(String title, String subtitle, IconData icon, Color color, Color bg, {required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.slate100),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate800)),
                  Text(subtitle, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _qiyamTile() {
    return InkWell(
      onTap: () => setState(() => _state.toggleDayItem(currentDate, 'extras', 'qiyam', xpValue: 300)),
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: qiyamDone ? const Color(0xFFFFFBEB) : Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: qiyamDone ? AppColors.amber400 : AppColors.slate100),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            if (!isLite)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: qiyamDone ? const Color(0xFFFDE68A) : AppColors.slate100,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('+300 XP', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: qiyamDone ? AppColors.amber800 : AppColors.slate400)),
              ),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: qiyamDone ? AppColors.amber500 : AppColors.slate100,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(Icons.star, size: 18, color: qiyamDone ? Colors.white : AppColors.slate400),
                ),
                const SizedBox(width: 8),
                const Text('قيام الليل', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate800)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionDot extends StatelessWidget {
  final Color color;
  const _SectionDot({required this.color});
  @override
  Widget build(BuildContext context) {
    return Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle));
  }
}
