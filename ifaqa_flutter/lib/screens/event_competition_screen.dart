import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/app_state.dart';
import '../services/cloud_service.dart';
import '../services/events_service.dart';
import '../theme/app_colors.dart';
import 'mawan_events_tab.dart';

/// React `EventCompetitionView`: join, tap adhkar for points, live podium.
class EventCompetitionScreen extends StatefulWidget {
  final MawanEvent event;
  const EventCompetitionScreen({super.key, required this.event});

  @override
  State<EventCompetitionScreen> createState() => _EventCompetitionScreenState();
}

class _EventCompetitionScreenState extends State<EventCompetitionScreen> {
  final _svc = EventsService.instance;
  EventParticipant? me;
  bool meLoaded = false;
  List<EventParticipant> board = const [];
  final Map<String, int> _optimistic = {};
  int _optimisticScore = 0;
  bool joining = false;
  StreamSubscription? _meSub;
  StreamSubscription? _boardSub;
  Timer? _ticker;

  MawanEvent get e => widget.event;

  @override
  void initState() {
    super.initState();
    _meSub = _svc.me(e.id).listen((p) => setState(() {
          me = p;
          meLoaded = true;
          _optimistic.clear();
          _optimisticScore = 0;
        }), onError: (_) => setState(() => meLoaded = true));
    _boardSub = _svc.leaderboard(e.id).listen((b) => setState(() => board = b), onError: (_) {});
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
    if (e.phaseAt(DateTime.now()) == EventPhase.ended) _svc.recordResult(e);
  }

  @override
  void dispose() {
    _meSub?.cancel();
    _boardSub?.cancel();
    _ticker?.cancel();
    super.dispose();
  }

  Future<void> _join() async {
    setState(() => joining = true);
    try {
      await _svc.join(e.id);
      HapticFeedback.mediumImpact();
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تعذر الانضمام، حاول مرة أخرى.')));
    }
    if (mounted) setState(() => joining = false);
  }

  void _tap(EventZekr z) {
    if (AppState.instance.flag('haptics', fallback: true)) HapticFeedback.selectionClick();
    setState(() {
      _optimistic[z.id] = (_optimistic[z.id] ?? 0) + 1;
      _optimisticScore += z.xp;
    });
    _svc.tap(e.id, z).catchError((Object _) {});
  }

  int countFor(EventZekr z) => (me?.tasks[z.id] ?? 0) + (_optimistic[z.id] ?? 0);
  int get myScore => (me?.score ?? 0) + _optimisticScore;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final phase = e.phaseAt(now);
    final ended = phase == EventPhase.ended;
    final uid = CloudService.instance.user?.uid;
    final rankIndex = board.indexWhere((p) => p.id == uid);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        body: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              expandedHeight: 230,
              backgroundColor: e.colors.last,
              foregroundColor: Colors.white,
              actions: [
                if (e.rules.isNotEmpty)
                  IconButton(icon: const Icon(Icons.info_outline), onPressed: _showRules),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topRight, end: Alignment.bottomLeft, colors: e.colors)),
                  padding: const EdgeInsets.fromLTRB(20, 90, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(e.iconData, color: Colors.white, size: 26),
                          const SizedBox(width: 8),
                          Expanded(child: Text(e.title, maxLines: 2, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 21))),
                        ],
                      ),
                      const SizedBox(height: 14),
                      _countdown(phase, now),
                    ],
                  ),
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              sliver: SliverList.list(
                children: [
                  if (e.description.isNotEmpty) ...[
                    Text(e.description, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.slate600, fontSize: 13, height: 1.7)),
                    const SizedBox(height: 14),
                  ],
                  if (me != null) _myScoreCard(rankIndex),
                  if (meLoaded && me == null && !ended) _joinCard(),
                  if (me != null) ...[
                    const SizedBox(height: 14),
                    if (e.adhkar.isEmpty)
                      const Text('لم تُضف أذكار لهذه الفعالية بعد.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate400, fontWeight: FontWeight.bold)),
                    ...e.adhkar.map((z) => Padding(padding: const EdgeInsets.only(bottom: 12), child: _zekrCard(z, ended))),
                  ],
                  const SizedBox(height: 10),
                  const Text('لوحة المتصدرين', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: AppColors.slate800)),
                  const SizedBox(height: 10),
                  if (board.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(20),
                      child: Text('لا يوجد مشاركون بعد، كن أول المتسابقين!', textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate400, fontWeight: FontWeight.bold)),
                    )
                  else ...[
                    _podium(board.take(3).toList()),
                    ...board.skip(3).toList().asMap().entries.map((en) => _row(en.key + 4, en.value, en.value.id == uid)),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _countdown(EventPhase phase, DateTime now) {
    final (label, target) = switch (phase) {
      EventPhase.upcoming => ('تبدأ بعد', e.start),
      EventPhase.active => ('تنتهي بعد', e.end),
      EventPhase.ended => ('انتهت المسابقة', e.end),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(18)),
      child: Row(
        children: [
          const Icon(Icons.timer_outlined, color: Colors.white, size: 18),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
          const Spacer(),
          if (phase != EventPhase.ended)
            Text(formatCountdown(target.difference(now)), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16, fontFeatures: [FontFeature.tabularFigures()])),
        ],
      ),
    );
  }

  Widget _joinCard() => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(28), border: Border.all(color: AppColors.slate100)),
        child: Column(
          children: [
            const Icon(Icons.emoji_events, color: AppColors.amber500, size: 40),
            const SizedBox(height: 8),
            const Text('انضم للمسابقة وابدأ جمع النقاط', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.slate800)),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: joining ? null : _join,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.violet600,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                ),
                child: Text(joining ? 'جارٍ الانضمام...' : 'انضم الآن', style: const TextStyle(fontWeight: FontWeight.w900)),
              ),
            ),
          ],
        ),
      );

  Widget _myScoreCard(int rankIndex) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [AppColors.violet600, AppColors.indigo600]),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Row(
          children: [
            const Icon(Icons.stars, color: Colors.white, size: 30),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('نقاطك في المسابقة', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 11)),
                  Text('$myScore', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 26)),
                ],
              ),
            ),
            if (rankIndex >= 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(14)),
                child: Text('ترتيبك #${rankIndex + 1}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
              ),
          ],
        ),
      );

  Widget _zekrCard(EventZekr z, bool ended) {
    final count = countFor(z);
    return Opacity(
      opacity: ended ? 0.7 : 1,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(28), border: Border.all(color: AppColors.slate100)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFFEDE9FE), borderRadius: BorderRadius.circular(999)),
                  child: Text('+${z.xp} نقطة لكل تسبيحة', style: const TextStyle(color: AppColors.violet700, fontWeight: FontWeight.w900, fontSize: 11)),
                ),
                const Spacer(),
                if (count > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: AppColors.emerald100, borderRadius: BorderRadius.circular(999)),
                    child: Text('سبّحت: $count', style: const TextStyle(color: AppColors.emerald700, fontWeight: FontWeight.w900, fontSize: 11)),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(z.text, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.slate800, height: 2)),
            if (z.fadl.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(z.fadl, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.slate400, height: 1.7)),
            ],
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: ended ? null : () => _tap(z),
              icon: Icon(Icons.check_circle, color: count > 0 ? AppColors.emerald200 : Colors.white),
              label: Text(ended ? 'انتهت المسابقة' : 'اضغط للتسبيح واكتساب النقاط', style: const TextStyle(fontWeight: FontWeight.w900)),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.violet600,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _podium(List<EventParticipant> top) {
    Widget place(int i, double height, Color color) {
      if (i >= top.length) return const Expanded(child: SizedBox());
      final p = top[i];
      return Expanded(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            if (i == 0) const Icon(Icons.workspace_premium, color: AppColors.amber400, size: 28),
            CircleAvatar(
              radius: i == 0 ? 30 : 24,
              backgroundColor: color.withValues(alpha: 0.2),
              child: Text('${i + 1}', style: TextStyle(fontWeight: FontWeight.w900, color: color, fontSize: 18)),
            ),
            const SizedBox(height: 6),
            Container(
              height: height,
              width: double.infinity,
              margin: const EdgeInsets.symmetric(horizontal: 3),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                border: Border(top: BorderSide(color: color, width: 3)),
              ),
              child: Column(
                children: [
                  Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: AppColors.slate800)),
                  const SizedBox(height: 4),
                  Text('${p.score}', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: color)),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return SizedBox(
      height: 200,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          place(1, 90, AppColors.slate400),
          place(0, 120, AppColors.amber500),
          place(2, 75, AppColors.orange500),
        ],
      ),
    );
  }

  Widget _row(int rank, EventParticipant p, bool isMe) => Container(
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isMe ? const Color(0xFFF5F3FF) : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: isMe ? AppColors.violet300 : AppColors.slate100),
        ),
        child: Row(
          children: [
            SizedBox(width: 30, child: Text('$rank', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate400))),
            Expanded(child: Text(isMe ? '${p.name} (أنت)' : p.name, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate800))),
            Text('${p.score}', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.violet600)),
          ],
        ),
      );

  void _showRules() => showDialog(
        context: context,
        builder: (_) => Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            title: const Text('قوانين المسابقة', style: TextStyle(fontWeight: FontWeight.w900)),
            content: SingleChildScrollView(child: Text(e.rules, style: const TextStyle(height: 1.8, fontWeight: FontWeight.bold))),
            actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('حسنًا'))],
          ),
        ),
      );
}
