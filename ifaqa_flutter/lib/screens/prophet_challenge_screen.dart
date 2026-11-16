import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/app_state.dart';
import '../services/cloud_service.dart';
import '../services/prophet_challenge_service.dart';

class _ProphetTheme {
  final String id;
  final String name;
  final List<Color> background;
  final List<Color> button;
  final Color ring;
  final Color accent;
  const _ProphetTheme(this.id, this.name, this.background, this.button, this.ring, this.accent);
}

const _themes = [
  _ProphetTheme('gold', 'الذهبي الملكي', [Color(0xFF451A03), Color(0xFF78350F), Color(0xFF020617)], [Color(0xFFD97706), Color(0xFFFACC15)], Color(0xFFF59E0B), Color(0xFFFACC15)),
  _ProphetTheme('emerald', 'الزمردي النبوي', [Color(0xFF022C22), Color(0xFF134E4A), Color(0xFF020617)], [Color(0xFF059669), Color(0xFF34D399)], Color(0xFF10B981), Color(0xFF34D399)),
  _ProphetTheme('sapphire', 'الياقوتي الأزرق', [Color(0xFF172554), Color(0xFF1E3A8A), Color(0xFF020617)], [Color(0xFF2563EB), Color(0xFF22D3EE)], Color(0xFF3B82F6), Color(0xFF60A5FA)),
  _ProphetTheme('violet', 'البنفسجي الملكي', [Color(0xFF3B0764), Color(0xFF4C1D95), Color(0xFF020617)], [Color(0xFF9333EA), Color(0xFFE879F9)], Color(0xFFA855F7), Color(0xFFC084FC)),
];

/// Full-screen salawat counter (React `ProphetChallengeModal`).
class ProphetChallengeScreen extends StatefulWidget {
  const ProphetChallengeScreen({super.key});

  @override
  State<ProphetChallengeScreen> createState() => _ProphetChallengeScreenState();
}

class _ProphetChallengeScreenState extends State<ProphetChallengeScreen> with SingleTickerProviderStateMixin {
  final _svc = ProphetChallengeService.instance;
  final _state = AppState.instance;
  late ProphetSchedule schedule = ProphetSchedule.at(DateTime.now());
  late int count = _svc.localCount(schedule.periodKey);
  int globalTotal = 0;
  int _globalBase = 0;
  int _tapsSinceTotal = 0;
  List<ProphetLeader> leaders = const [];
  bool leadersOpen = false;
  Timer? _ticker;
  StreamSubscription<int>? _countSub;
  StreamSubscription<List<ProphetLeader>>? _leadersSub;
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 160), lowerBound: 0.92, upperBound: 1)..value = 1;

  _ProphetTheme get theme {
    final saved = _state.text('prophet_theme');
    return _themes.firstWhere((t) => t.id == saved, orElse: () => schedule.isFriday ? _themes[0] : _themes[1]);
  }

  @override
  void initState() {
    super.initState();
    _subscribe();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      final next = ProphetSchedule.at(DateTime.now());
      final changed = next.periodKey != schedule.periodKey;
      setState(() => schedule = next);
      if (changed) {
        count = _svc.localCount(next.periodKey);
        _subscribe();
      }
    });
  }

  void _subscribe() {
    _countSub?.cancel();
    _leadersSub?.cancel();
    final key = schedule.periodKey;
    _countSub = _svc.serverCount(key).listen((server) {
      if (server > count && mounted) setState(() => count = server);
    }, onError: (_) {});
    _leadersSub = _svc.leaders(key).listen((l) {
      if (mounted) setState(() => leaders = l);
    }, onError: (_) {});
    _svc.globalTotal(key).then((t) {
      if (!mounted) return;
      setState(() {
        _globalBase = t;
        _tapsSinceTotal = 0;
        globalTotal = t;
      });
    });
  }

  @override
  void dispose() {
    _svc.flush();
    _ticker?.cancel();
    _countSub?.cancel();
    _leadersSub?.cancel();
    _pulse.dispose();
    super.dispose();
  }

  void _pray() {
    if (_state.flag('haptics', fallback: true)) HapticFeedback.lightImpact();
    _pulse.reverse(from: 1).then((_) => _pulse.forward());
    final next = _svc.pray(schedule.periodKey);
    setState(() {
      count = next;
      _tapsSinceTotal += 1;
      globalTotal = _globalBase + _tapsSinceTotal;
    });
    if (next == _svc.personalGoal) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('ما شاء الله! بلغت هدفك: ${_svc.personalGoal} صلاة ﷺ', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w900)),
        backgroundColor: theme.ring,
      ));
    }
  }

  int get effectiveGlobal {
    final leaderSum = leaders.fold<int>(0, (s, l) => s + l.count);
    return [globalTotal, count, leaderSum].reduce((a, b) => a > b ? a : b);
  }

  @override
  Widget build(BuildContext context) {
    final t = theme;
    final goal = _svc.personalGoal;
    final progress = (count / goal).clamp(0.0, 1.0);
    final globalProgress = (effectiveGlobal / schedule.globalGoal).clamp(0.0, 1.0);
    final signedIn = CloudService.instance.signedIn;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: Container(
          decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: t.background)),
          child: SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                Row(
                  children: [
                    _circleButton(Icons.close, () => Navigator.of(context).pop()),
                    const Spacer(),
                    Column(
                      children: [
                        Text(schedule.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 17)),
                        const SizedBox(height: 2),
                        Text(schedule.subtitle, style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontWeight: FontWeight.bold, fontSize: 11)),
                      ],
                    ),
                    const Spacer(),
                    _circleButton(Icons.palette_outlined, _pickTheme),
                    const SizedBox(width: 6),
                    _circleButton(Icons.info_outline, _showRules),
                  ],
                ),
                const SizedBox(height: 14),
                Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(999)),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.schedule, size: 14, color: t.accent),
                        const SizedBox(width: 6),
                        Text(schedule.isFriday ? 'ينتهي بعد ${schedule.countdown}' : 'تحدي الجمعة بعد ${schedule.countdown}',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 11)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 26),
                Center(
                  child: SizedBox(
                    width: 250,
                    height: 250,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox.expand(
                          child: CircularProgressIndicator(
                            value: progress,
                            strokeWidth: 10,
                            strokeCap: StrokeCap.round,
                            backgroundColor: Colors.white.withValues(alpha: 0.08),
                            valueColor: AlwaysStoppedAnimation(t.ring),
                          ),
                        ),
                        ScaleTransition(
                          scale: _pulse,
                          child: GestureDetector(
                            onTap: _pray,
                            child: Container(
                              width: 200,
                              height: 200,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: t.button),
                                boxShadow: [BoxShadow(color: t.ring.withValues(alpha: 0.45), blurRadius: 40, spreadRadius: 2)],
                                border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 2),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.favorite, color: Colors.white, size: 34),
                                  const SizedBox(height: 4),
                                  Text('$count', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 46, height: 1.1)),
                                  const Text('اللهم صلِّ على محمد ﷺ', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12)),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Center(
                  child: InkWell(
                    onTap: _pickGoal,
                    borderRadius: BorderRadius.circular(999),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('هدفك: $goal  •  ${(progress * 100).round()}%', style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontWeight: FontWeight.w900, fontSize: 12)),
                          const SizedBox(width: 6),
                          Icon(Icons.edit, size: 13, color: t.accent),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                _glassCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.groups, color: t.accent, size: 18),
                          const SizedBox(width: 6),
                          Text(schedule.isFriday ? 'الهدف الجماعي للجمعة' : 'الهدف الجماعي اليوم', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13)),
                          const Spacer(),
                          Text('${_fmt(effectiveGlobal)} / ${_fmt(schedule.globalGoal)}', style: TextStyle(color: t.accent, fontWeight: FontWeight.w900, fontSize: 12)),
                        ],
                      ),
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(value: globalProgress, minHeight: 8, backgroundColor: Colors.white.withValues(alpha: 0.1), valueColor: AlwaysStoppedAnimation(t.ring)),
                      ),
                      if (!signedIn) ...[
                        const SizedBox(height: 10),
                        Text('سجّل الدخول من الملف الشخصي لتُحسب صلواتك في الهدف الجماعي وقائمة المتصدرين.',
                            style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontWeight: FontWeight.bold, fontSize: 11, height: 1.5)),
                      ],
                    ],
                  ),
                ),
                if (signedIn) ...[
                  const SizedBox(height: 12),
                  _glassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        InkWell(
                          onTap: () => setState(() => leadersOpen = !leadersOpen),
                          child: Row(
                            children: [
                              Icon(Icons.emoji_events, color: t.accent, size: 18),
                              const SizedBox(width: 6),
                              const Text('فرسان الصلاة على النبي', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13)),
                              const Spacer(),
                              if (_myRank != null) Text('ترتيبك #$_myRank', style: TextStyle(color: t.accent, fontWeight: FontWeight.w900, fontSize: 11)),
                              Icon(leadersOpen ? Icons.expand_less : Icons.expand_more, color: Colors.white70),
                            ],
                          ),
                        ),
                        if (leadersOpen) ...[
                          const SizedBox(height: 8),
                          if (leaders.isEmpty)
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: Text('كن أول المشاركين في هذا التحدي!', textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontWeight: FontWeight.bold, fontSize: 12)),
                            ),
                          ...leaders.asMap().entries.map((e) => _leaderRow(e.key + 1, e.value, t)),
                        ],
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  int? get _myRank {
    final uid = CloudService.instance.user?.uid;
    final i = leaders.indexWhere((l) => l.id == uid);
    if (i >= 0) return i + 1;
    return count > 0 ? leaders.length + 1 : null;
  }

  Widget _leaderRow(int rank, ProphetLeader l, _ProphetTheme t) {
    final me = l.id == CloudService.instance.user?.uid;
    return Container(
      margin: const EdgeInsets.only(top: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(color: me ? t.ring.withValues(alpha: 0.2) : Colors.white.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(14)),
      child: Row(
        children: [
          SizedBox(
            width: 26,
            child: rank <= 3
                ? Icon(Icons.workspace_premium, size: 18, color: [const Color(0xFFFACC15), const Color(0xFFCBD5E1), const Color(0xFFD97706)][rank - 1])
                : Text('$rank', style: const TextStyle(color: Colors.white60, fontWeight: FontWeight.w900)),
          ),
          Expanded(child: Text(me ? '${l.name} (أنت)' : l.name, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12))),
          Text(_fmt(l.count), style: TextStyle(color: t.accent, fontWeight: FontWeight.w900, fontSize: 12)),
        ],
      ),
    );
  }

  static String _fmt(int n) {
    final s = n.toString();
    final b = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
      b.write(s[i]);
    }
    return b.toString();
  }

  Widget _glassCard({required Widget child}) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.07),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        ),
        child: child,
      );

  Widget _circleButton(IconData icon, VoidCallback onTap) => InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), shape: BoxShape.circle),
          child: Icon(icon, color: Colors.white, size: 20),
        ),
      );

  void _pickTheme() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (_) => Directionality(
        textDirection: TextDirection.rtl,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('اختر ثيم العداد', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
              const SizedBox(height: 14),
              ..._themes.map((th) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: InkWell(
                      onTap: () {
                        _state.setText('prophet_theme', th.id);
                        Navigator.pop(context);
                        setState(() {});
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: th.id == theme.id ? th.ring : Colors.white12, width: 2),
                        ),
                        child: Row(
                          children: [
                            Container(width: 28, height: 28, decoration: BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: th.button))),
                            const SizedBox(width: 12),
                            Text(th.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
                            const Spacer(),
                            if (th.id == theme.id) Icon(Icons.check_circle, color: th.ring),
                          ],
                        ),
                      ),
                    ),
                  )),
            ],
          ),
        ),
      ),
    );
  }

  void _pickGoal() {
    const goals = [33, 100, 300, 500, 1000, 3000];
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (_) => Directionality(
        textDirection: TextDirection.rtl,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('هدفك الشخصي', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: goals
                    .map((g) => ChoiceChip(
                          label: Text('$g', style: const TextStyle(fontWeight: FontWeight.w900)),
                          selected: g == _svc.personalGoal,
                          onSelected: (_) {
                            _svc.personalGoal = g;
                            Navigator.pop(context);
                            setState(() {});
                          },
                        ))
                    .toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showRules() {
    showDialog(
      context: context,
      builder: (_) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          title: const Text('قوانين الصلاة على النبي ﷺ', style: TextStyle(fontWeight: FontWeight.w900)),
          content: const Text(
            '• التحدي متاح 24 ساعة يوميًا بلا توقف.\n'
            '• تحدي الجمعة المباركة: يبدأ من فجر الخميس ويستمر حتى مغرب الجمعة بعداد جديد ومستقل.\n'
            '• بعد مغرب الجمعة وباقي الأسبوع يستمر العداد اليومي ويتجدد يوميًا.\n'
            '• كل ضغطة تُحسب بصلاة واحدة تامة على النبي ﷺ، وكل صلاة = 1 XP.',
            style: TextStyle(height: 1.8, fontWeight: FontWeight.bold),
          ),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('حسنًا، فهمت'))],
        ),
      ),
    );
  }
}
