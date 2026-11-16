import 'dart:async';
import 'package:flutter/material.dart';
import '../models/prayer_time_info.dart';
import '../models/prayer.dart';
import '../services/app_state.dart';
import '../theme/app_colors.dart';
import '../widgets/fajr_alarm_panel.dart';
import 'fajr_wake_team_tab.dart';
import 'qibla_compass_tab.dart';

enum _PtTab { times, alarm, customize, wake, qibla }

class PrayerTimesTab extends StatefulWidget {
  const PrayerTimesTab({super.key});

  @override
  State<PrayerTimesTab> createState() => _PrayerTimesTabState();
}

class _PrayerTimesTabState extends State<PrayerTimesTab> {
  _PtTab activeTab = _PtTab.times;
  final AppState _state = AppState.instance;
  late List<PrayerTimeInfo> prayers = buildPrayerTimes(_state.location);
  bool locating = false;
  late DateTime now;
  Timer? timer;

  @override
  void initState() {
    super.initState();
    now = DateTime.now();
    timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      final previous = now;
      setState(() {
        now = DateTime.now();
        if (now.day != previous.day) prayers = buildPrayerTimes(_state.location);
      });
    });
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  /// Today's occurrence of [t], or tomorrow's if it has already passed.
  DateTime _nextOccurrence(TimeOfDay t) {
    final today = DateTime(now.year, now.month, now.day, t.hour, t.minute);
    return today.isAfter(now) ? today : DateTime(now.year, now.month, now.day + 1, t.hour, t.minute);
  }

  PrayerTimeInfo get nextPrayer => prayers.reduce(
        (a, b) => _nextOccurrence(b.time).isBefore(_nextOccurrence(a.time)) ? b : a,
      );

  String get countdown {
    final diff = _nextOccurrence(nextPrayer.time).difference(now);
    final h = diff.inHours.toString().padLeft(2, '0');
    final m = (diff.inMinutes % 60).toString().padLeft(2, '0');
    final s = (diff.inSeconds % 60).toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  String _formatTime(TimeOfDay t) {
    final period = t.hour >= 12 ? 'م' : 'ص';
    final displayHour = t.hourOfPeriod == 0 ? 12 : t.hourOfPeriod;
    return '$displayHour:${t.minute.toString().padLeft(2, '0')} $period';
  }

  TimeOfDay _addMinutes(TimeOfDay t, int mins) {
    final total = t.hour * 60 + t.minute + mins;
    return TimeOfDay(hour: (total ~/ 60) % 24, minute: total % 60);
  }

  int get doneCount => _state.completedPrayers(now);

  Future<void> _refreshLocation() async {
    setState(() => locating = true);
    final error = await _state.refreshLocation();
    if (!mounted) return;
    setState(() {
      locating = false;
      prayers = buildPrayerTimes(_state.location);
    });
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          _buildLocationBar(),
          const SizedBox(height: 12),
          _buildSegmentedTabs(),
          const SizedBox(height: 16),
          _buildTabContent(),
        ],
      ),
    );
  }

  Widget _buildLocationBar() {
    return Row(
      children: [
        Flexible(
          child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(color: AppColors.slate900, borderRadius: BorderRadius.circular(999)),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.location_on, size: 13, color: AppColors.amber400),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  _state.location.isDefault ? 'القاهرة (موقع افتراضي)' : 'حسب موقعك الحالي',
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900),
                ),
              ),
            ],
          ),
          ),
        ),
        const SizedBox(width: 8),
        const Spacer(),
        InkWell(
          onTap: locating ? null : _refreshLocation,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: AppColors.slate900, borderRadius: BorderRadius.circular(12)),
            child: locating
                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white70))
                : const Icon(Icons.my_location, size: 16, color: Colors.white70),
          ),
        ),
      ],
    );
  }

  Widget _buildSegmentedTabs() {
    final items = [
      (_PtTab.times, 'المواقيت', Icons.wb_sunny),
      (_PtTab.alarm, 'منبّه الفجر', Icons.alarm),
      (_PtTab.customize, 'تخصيص المنبّه', Icons.tune),
      (_PtTab.wake, 'أيقظني', Icons.groups),
      (_PtTab.qibla, 'القبلة والسنن', Icons.explore),
    ];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(color: AppColors.slate900, borderRadius: BorderRadius.circular(18)),
        child: Row(
          children: items.map((item) {
            final active = activeTab == item.$1;
            return InkWell(
              onTap: () => setState(() => activeTab = item.$1),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: active ? AppColors.amber500 : Colors.transparent,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(item.$3, size: 14, color: active ? AppColors.slate900 : AppColors.amber300),
                    const SizedBox(width: 6),
                    Text(item.$2, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: active ? AppColors.slate900 : Colors.white)),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildTabContent() {
    switch (activeTab) {
      case _PtTab.times:
        return _buildTimesTab();
      case _PtTab.qibla:
        return _buildQiblaTab();
      case _PtTab.alarm:
        return const FajrAlarmPanel(section: FajrAlarmSection.alarm);
      case _PtTab.customize:
        return const FajrAlarmPanel(section: FajrAlarmSection.sound);
      case _PtTab.wake:
        return const FajrWakeTeamTab();
    }
  }

  Widget _buildTimesTab() {
    final next = nextPrayer;
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF020617), Color(0xFF1E1B4B), Color(0xFF0F172A)], begin: Alignment.topRight, end: Alignment.bottomLeft),
            borderRadius: BorderRadius.circular(36),
            border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(999)),
                          child: const Text('الصلاة القادمة', style: TextStyle(color: AppColors.amber300, fontSize: 10, fontWeight: FontWeight.w900)),
                        ),
                        const SizedBox(height: 10),
                        Text('صلاة ${next.label}', style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
                        const SizedBox(height: 4),
                        Text('موعد الأذان: ${_formatTime(next.time)}', style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('متبقي للأذان', style: TextStyle(color: AppColors.amber300, fontSize: 9, fontWeight: FontWeight.w900)),
                        const SizedBox(height: 4),
                        Text(countdown, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Container(padding: const EdgeInsets.only(top: 14), decoration: const BoxDecoration(border: Border(top: BorderSide(color: Colors.white12))), child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('الصلوات المؤداة اليوم: $doneCount من 5', style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                  SizedBox(
                    width: 100,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(value: doneCount / 5, minHeight: 6, backgroundColor: Colors.white24, valueColor: const AlwaysStoppedAnimation(AppColors.emerald400)),
                    ),
                  ),
                ],
              )),
            ],
          ),
        ),
        const SizedBox(height: 16),
        ...prayers.map((p) {
          final isNext = next.key == p.key;
          final prayerId = p.key.toLowerCase();
          final isDone = _state.prayerStatus(now, prayerId) != PrayerStatus.none;
          final iqama = _addMinutes(p.time, p.iqamaMins);
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isNext ? AppColors.slate900 : (isDone ? AppColors.slate900.withValues(alpha: 0.6) : AppColors.slate900.withValues(alpha: 0.85)),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: isNext ? AppColors.amber400.withValues(alpha: 0.8) : Colors.white10),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(gradient: LinearGradient(colors: p.tone), borderRadius: BorderRadius.circular(16)),
                    child: Icon(p.icon, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(p.label, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900)),
                            if (isNext) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(color: AppColors.amber500, borderRadius: BorderRadius.circular(999)),
                                child: const Text('القادمة', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: AppColors.slate900)),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text('الإقامة: ${_formatTime(iqama)}  •  ${p.sunnahText}', style: const TextStyle(color: Colors.white38, fontSize: 10, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                  Text(_formatTime(p.time), style: TextStyle(color: isNext ? AppColors.amber400 : Colors.white, fontSize: 16, fontWeight: FontWeight.w900)),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: () => setState(() {
                      _state.setPrayerStatus(now, prayerId, isDone ? PrayerStatus.none : PrayerStatus.ontime);
                    }),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      width: 34,
                      height: 34,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: isDone ? AppColors.emerald500 : Colors.white10,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: isDone ? AppColors.emerald400 : Colors.white24),
                      ),
                      child: Icon(Icons.check, size: 16, color: isDone ? AppColors.slate900 : Colors.white38),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildQiblaTab() {
    const sunan = [
      ('fajr_pre', 'سنة الفجر (ركعتان قبلية)', '٢ ركعة'),
      ('dhuhr_pre', 'سنة الظهر القبلية (٤ ركعات)', '٤ ركعات'),
      ('dhuhr_post', 'سنة الظهر البعدية (ركعتان)', '٢ ركعة'),
      ('maghrib_post', 'سنة المغرب البعدية (ركعتان)', '٢ ركعة'),
      ('isha_post', 'سنة العشاء البعدية (ركعتان)', '٢ ركعة'),
      ('witr', 'صلاة الوتر وقيام الليل', 'مستحبة'),
    ];
    return Column(
      children: [
        const QiblaCompassTab(),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(color: AppColors.slate900, borderRadius: BorderRadius.circular(28), border: Border.all(color: Colors.white10)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: AppColors.amber500.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(16)),
                    child: const Icon(Icons.auto_awesome, color: AppColors.amber300, size: 18),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text('السنن الرواتب (12 ركعة)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14)),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 2.2,
                children: sunan.map((s) {
                  final checked = _state.dayHas(now, 'sunnah', s.$1);
                  return InkWell(
                    onTap: () => setState(() => _state.toggleDayItem(now, 'sunnah', s.$1)),
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: checked ? const Color(0xFF022C22) : Colors.white.withValues(alpha: 0.04),
                        border: Border.all(color: checked ? AppColors.emerald500.withValues(alpha: 0.5) : Colors.white10),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(s.$2, style: TextStyle(color: checked ? const Color(0xFF6EE7B7) : Colors.white70, fontSize: 11, fontWeight: FontWeight.w900)),
                                Text(s.$3, style: const TextStyle(color: Colors.white38, fontSize: 9, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                          Container(
                            width: 24,
                            height: 24,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: checked ? AppColors.emerald500 : Colors.transparent,
                              border: Border.all(color: checked ? AppColors.emerald400 : Colors.white24),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: checked ? const Icon(Icons.check, size: 14, color: AppColors.slate900) : null,
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: AppColors.slate900.withValues(alpha: 0.7), borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.white10)),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: AppColors.indigo500.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(16)),
                child: const Icon(Icons.menu_book, color: Color(0xFFA5B4FC), size: 18),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('أذكار ما بعد الصلاة المكتوبة', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900)),
                    Text('الاستغفار 3 مرات، وآية الكرسي، والتسبيح 33، والحمد 33، والتكبير 33.', style: TextStyle(color: Colors.white38, fontSize: 10, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
