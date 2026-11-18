import 'dart:async';

import 'package:flutter/material.dart';

import '../models/prayer.dart';
import '../models/zekr.dart';
import '../services/app_state.dart';
import '../siraj/siraj_capsule.dart';
import '../siraj/siraj_player.dart';
import '../siraj/siraj_reminders.dart';
import '../siraj/siraj_settings.dart';
import '../siraj/siraj_state.dart';
import '../theme/app_colors.dart';
import 'athkar_screen.dart';
import '../siraj/siraj_settings_screen.dart';

/// Dedicated Siraj tab: prayer stays visible at the top at all times —
/// live capsule preview, next prayer + countdown, today's prayer list with
/// iqamah countdowns, Athkar status, and the user's Quran wirds.
class SirajTab extends StatefulWidget {
  const SirajTab({super.key});

  @override
  State<SirajTab> createState() => _SirajTabState();
}

class _SirajTabState extends State<SirajTab> {
  final AppState _state = AppState.instance;
  late DateTime _now;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _now = DateTime.now();
    _state.addListener(_changed);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _state.removeListener(_changed);
    super.dispose();
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  List<SirajDay> get _days => buildSirajDays(_state.location, _now);

  SirajDay? get _today {
    for (final d in _days) {
      if (sirajSameDay(d.date, _now)) return d;
    }
    return null;
  }

  SirajPrayer? get _nextPrayer {
    for (final d in _days) {
      for (final p in d.prayers) {
        if (p.adhan.isAfter(_now)) return p;
      }
    }
    return null;
  }

  void _openAthkar(SirajAthkar type) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AthkarScreen(
          type: type == SirajAthkar.morning
              ? AthkarType.morning
              : AthkarType.evening,
        ),
      ),
    );
  }

  Widget _card(Widget child) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.slate100),
      ),
      child: child,
    );
  }

  Widget _cardTitle(IconData icon, String title, {Widget? trailing}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.violet500),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w900,
                color: AppColors.slate800,
              ),
            ),
          ),
          if (trailing != null) trailing,
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final config = SirajSettings.config();
    final next = _nextPrayer;
    final today = _today;
    final wirds = SirajSettings.wirds();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          // Live capsule preview (same as in settings).
          Container(
            height: 120,
            margin: const EdgeInsets.only(bottom: 14),
            decoration: BoxDecoration(
              color: AppColors.slate200.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(24),
            ),
            child: const Center(child: SirajCapsule(preview: true)),
          ),

          // Next prayer — always at the top of this tab.
          if (next != null)
            Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFF020617),
                    Color(0xFF1E1B4B),
                    Color(0xFF0F172A),
                  ],
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.12),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text(
                          'الصلاة القادمة',
                          style: TextStyle(
                            color: AppColors.amber300,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Icon(
                        Icons.mosque_rounded,
                        color: AppColors.amber300,
                        size: 20,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'صلاة ${next.label}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'موعد الأذان: ${sirajClock(next.adhan)}',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Text(
                        'متبقٍ على الأذان',
                        style: TextStyle(
                          color: AppColors.amber300,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        sirajFormatCountdown(
                          next.adhan.difference(_now),
                          config.countdownFormat,
                        ),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

          // Today's prayer list with iqamah countdowns.
          if (today != null)
            _card(
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _cardTitle(Icons.access_time_filled, 'مواقيت اليوم'),
                  ...today.prayers.map((p) {
                    final done =
                        _state.prayerStatus(_now, p.id) != PrayerStatus.none;
                    final isNext = next?.id == p.id;
                    final iqamahLeft = sirajIqamaRemaining(_now, p);
                    final passed = p.adhan.isBefore(_now);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: isNext
                              ? AppColors.violet600.withValues(alpha: 0.08)
                              : AppColors.slate50,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isNext
                                ? AppColors.violet600.withValues(alpha: 0.35)
                                : AppColors.slate100,
                          ),
                        ),
                        child: Row(
                          children: [
                            InkWell(
                              onTap: () => _state.setPrayerStatus(
                                _now,
                                p.id,
                                done ? PrayerStatus.none : PrayerStatus.ontime,
                              ),
                              borderRadius: BorderRadius.circular(999),
                              child: Icon(
                                done
                                    ? Icons.check_circle_rounded
                                    : Icons.circle_outlined,
                                size: 20,
                                color: done
                                    ? AppColors.emerald500
                                    : AppColors.slate400,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        p.label,
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w900,
                                          color: isNext
                                              ? AppColors.violet700
                                              : AppColors.slate800,
                                        ),
                                      ),
                                      if (isNext) ...[
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 6,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: AppColors.violet600,
                                            borderRadius:
                                                BorderRadius.circular(999),
                                          ),
                                          child: const Text(
                                            'القادمة',
                                            style: TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.w900,
                                              color: Colors.white,
                                            ),
                                          ),
                                        ),
                                      ],
                                      if (iqamahLeft != null) ...[
                                        const SizedBox(width: 6),
                                        Text(
                                          'إقامة ${sirajFormatCountdown(iqamahLeft, config.countdownFormat)}',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w900,
                                            color: AppColors.emerald600,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  if (!passed)
                                    Text(
                                      'الإقامة: ${sirajClock(p.iqamah)}',
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.slate500,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            Text(
                              sirajClock(p.adhan),
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                color: AppColors.slate800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),

          // Morning / evening Athkar status.
          if (today != null)
            _card(
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _cardTitle(Icons.wb_sunny, 'أذكار اليوم'),
                  _athkarRow(
                    label: 'أذكار الصباح',
                    icon: Icons.wb_sunny_rounded,
                    time: sirajMorningAthkarTime(today, config),
                    done: SirajSettings.athkarDoneToday(SirajAthkar.morning),
                    type: SirajAthkar.morning,
                  ),
                  _athkarRow(
                    label: 'أذكار المساء',
                    icon: Icons.nights_stay_rounded,
                    time: sirajEveningAthkarTime(today, config),
                    done: SirajSettings.athkarDoneToday(SirajAthkar.evening),
                    type: SirajAthkar.evening,
                  ),
                ],
              ),
            ),

          // Wirds checklist.
          _card(
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _cardTitle(Icons.menu_book, 'أوراد القرآن'),
                if (wirds.isEmpty)
                  const Text(
                    'لا توجد أوراد بعد — أضف وردك من إعدادات سِراج.',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.slate500,
                    ),
                  ),
                for (final w in wirds)
                  if (w.enabled)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: InkWell(
                        onTap: () => setState(
                          () => _state.toggleDayItem(
                            _now,
                            'siraj_wird_done',
                            w.id,
                          ),
                        ),
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.slate50,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                _state.dayHas(
                                      _now,
                                      'siraj_wird_done',
                                      w.id,
                                    )
                                    ? Icons.check_circle_rounded
                                    : Icons.circle_outlined,
                                size: 20,
                                color:
                                    _state.dayHas(
                                          _now,
                                          'siraj_wird_done',
                                          w.id,
                                        )
                                        ? AppColors.emerald500
                                        : AppColors.slate400,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      w.name,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w900,
                                        color: AppColors.slate800,
                                      ),
                                    ),
                                    Text(
                                      _wirdSummary(w),
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.slate500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.violet600.withValues(
                                    alpha: 0.1,
                                  ),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  _wirdKindLabel(w.kind),
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    color: AppColors.violet700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
              ],
            ),
          ),

          // Player.
          const SirajPlayerCard(),

          // Open settings.
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const SirajSettingsScreen(),
                ),
              ),
              icon: const Icon(Icons.settings, size: 18),
              label: const Text(
                'إعدادات سِراج',
                style: TextStyle(fontWeight: FontWeight.w900),
              ),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.violet600,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _wirdKindLabel(SirajWirdKind kind) => switch (kind) {
    SirajWirdKind.memorization => 'حفظ',
    SirajWirdKind.review => 'مراجعة',
    SirajWirdKind.reading => 'قراءة',
  };

  String _wirdSummary(SirajWird w) {
    final parts = <String>[];
    if (w.afterPrayers.isNotEmpty) {
      parts.add(
        'بعد ${w.afterPrayers.map(sirajPrayerLabel).join('، ')}',
      );
    }
    if (w.fixedMinutes.isNotEmpty) {
      parts.add(
        w.fixedMinutes
            .map(
              (m) => sirajClock(
                DateTime(2000, 1, 1, m ~/ 60, m % 60),
              ),
            )
            .join('، '),
      );
    }
    return parts.isEmpty ? 'ورد يومي' : parts.join(' • ');
  }

  Widget _athkarRow({
    required String label,
    required IconData icon,
    required DateTime time,
    required bool done,
    required SirajAthkar type,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.slate50,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.violet600),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: AppColors.slate700,
                  ),
                ),
                Text(
                  done ? 'تمّت اليوم ✓' : 'وقتها: ${sirajClock(time)}',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: done
                        ? AppColors.emerald600
                        : AppColors.slate500,
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () => _openAthkar(type),
            child: const Text(
              'افتح الأذكار',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                color: AppColors.violet700,
              ),
            ),
          ),
          InkWell(
            onTap: () => setState(
              () => _state.toggleDayItem(
                _now,
                SirajSettings.athkarDayList,
                type.name,
              ),
            ),
            borderRadius: BorderRadius.circular(999),
            child: Icon(
              done
                  ? Icons.check_circle_rounded
                  : Icons.circle_outlined,
              size: 20,
              color: done ? AppColors.emerald500 : AppColors.slate400,
            ),
          ),
        ],
      ),
    );
  }
}
