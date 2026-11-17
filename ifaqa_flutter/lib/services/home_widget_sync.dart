import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:home_widget/home_widget.dart';
import '../models/prayer_time_info.dart';
import 'app_state.dart';
import 'prophet_challenge_service.dart';
import 'quran_progress_service.dart';

/// Keeps the Android home screen widgets (android/.../HomeWidgets.kt) in step
/// with the app, and collects salawat counted on the widget.
class HomeWidgetSync with WidgetsBindingObserver {
  HomeWidgetSync._();
  static final HomeWidgetSync instance = HomeWidgetSync._();

  static bool get supported => !kIsWeb && defaultTargetPlatform == TargetPlatform.android;
  static const _pkg = 'com.ifaqa.ifaqa_flutter';

  Timer? _debounce;
  Timer? _minute;

  Future<void> init() async {
    if (!supported) return;
    WidgetsBinding.instance.addObserver(this);
    AppState.instance.addListener(_schedule);
    _minute = Timer.periodic(const Duration(minutes: 5), (_) => push());
    await collectSalawat();
    await push();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      collectSalawat().then((_) => push());
    }
  }

  void _schedule() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(seconds: 2), push);
  }

  /// Taps made on the widget while the app was closed.
  Future<void> collectSalawat() async {
    try {
      final pending = await HomeWidget.getWidgetData<int>('salawat_pending', defaultValue: 0) ?? 0;
      if (pending <= 0) return;
      await HomeWidget.saveWidgetData<int>('salawat_pending', 0);
      final period = ProphetSchedule.at(DateTime.now()).periodKey;
      ProphetChallengeService.instance.prayMany(period, pending);
    } catch (e) {
      debugPrint('widget salawat sync failed: $e');
    }
  }

  static String _fmt(TimeOfDay t) {
    final h = t.hourOfPeriod == 0 ? 12 : t.hourOfPeriod;
    return '$h:${t.minute.toString().padLeft(2, '0')} ${t.period == DayPeriod.am ? 'ص' : 'م'}';
  }

  Future<void> push() async {
    if (!supported) return;
    try {
      final now = DateTime.now();
      final prayers = buildPrayerTimes(AppState.instance.location);
      final next = prayers.firstWhere(
        (p) => DateTime(now.year, now.month, now.day, p.time.hour, p.time.minute).isAfter(now),
        orElse: () => prayers.first,
      );
      final q = QuranProgressService.instance;
      final goal = q.khatma;
      final read = q.khatmaPagesRead;
      final period = ProphetSchedule.at(now).periodKey;

      await Future.wait([
        HomeWidget.saveWidgetData<String>('next_prayer_name', next.label),
        HomeWidget.saveWidgetData<String>('next_prayer_time', _fmt(next.time)),
        HomeWidget.saveWidgetData<String>('prayer_times_line', prayers.map((p) => '${p.label} ${_fmt(p.time)}').join('  ·  ')),
        HomeWidget.saveWidgetData<int>('salawat_count', ProphetChallengeService.instance.localCount(period)),
        HomeWidget.saveWidgetData<String>('quran_today', '${q.pagesOn(now)} صفحة اليوم'),
        HomeWidget.saveWidgetData<String>('khatma_title', goal?.title ?? 'وردي من القرآن'),
        HomeWidget.saveWidgetData<String>('khatma_text', goal == null ? 'ابدأ ختمة من التطبيق' : '$read / 604 صفحة · ${goal.pagesPerDay} يوميًا'),
        HomeWidget.saveWidgetData<int>('khatma_percent', goal == null ? 0 : (read * 100 / 604).round()),
      ]);
      await Future.wait([
        HomeWidget.updateWidget(qualifiedAndroidName: '$_pkg.PrayerTimesWidget'),
        HomeWidget.updateWidget(qualifiedAndroidName: '$_pkg.SalawatWidget'),
        HomeWidget.updateWidget(qualifiedAndroidName: '$_pkg.QuranProgressWidget'),
      ]);
    } catch (e) {
      debugPrint('home widget update failed: $e');
    }
  }

  void dispose() {
    _debounce?.cancel();
    _minute?.cancel();
  }
}
