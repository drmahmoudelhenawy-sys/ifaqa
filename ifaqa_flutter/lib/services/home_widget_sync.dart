import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:home_widget/home_widget.dart';
import '../data/athkar_data.dart';
import '../models/prayer.dart';
import '../models/prayer_time_info.dart';
import '../models/wird_task.dart';
import 'audio_service.dart';
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
  Timer? _radioDebounce;
  StreamSubscription<Uri?>? _clicks;
  String? _lastRadioKey;

  Future<void> init() async {
    if (!supported) return;
    WidgetsBinding.instance.addObserver(this);
    AppState.instance.addListener(_schedule);
    AudioService.instance.addListener(_scheduleRadio);
    _clicks = HomeWidget.widgetClicked.listen(_onClick);
    HomeWidget.initiallyLaunchedFromHomeWidget().then(_onClick);
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

  static String _arabicDigits(int n) => n
      .toString()
      .split('')
      .map((c) {
        final code = c.codeUnitAt(0);
        return code >= 48 && code <= 57
            ? String.fromCharCode(0x0660 + code - 48)
            : c;
      })
      .join();

  /// "بعد ١ س ٢٣ د" / "بعد ٤٥ د" — time remaining to the next prayer, for the
  /// home screen widget. Widgets only refresh every few minutes, so this is
  /// minutes, not a live per-second countdown.
  static String _countdownText(DateTime now, DateTime target) {
    final mins = target.difference(now).inMinutes;
    if (mins <= 0) return 'حان الآن';
    if (mins < 60) return 'بعد ${_arabicDigits(mins)} د';
    return 'بعد ${_arabicDigits(mins ~/ 60)} س ${_arabicDigits(mins % 60)} د';
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
      final nextToday = DateTime(
        now.year,
        now.month,
        now.day,
        next.time.hour,
        next.time.minute,
      );
      final nextDateTime = nextToday.isAfter(now)
          ? nextToday
          : nextToday.add(const Duration(days: 1));

      await Future.wait([
        HomeWidget.saveWidgetData<String>('next_prayer_name', next.label),
        HomeWidget.saveWidgetData<String>('next_prayer_time', _fmt(next.time)),
        HomeWidget.saveWidgetData<String>(
          'next_prayer_countdown',
          _countdownText(now, nextDateTime),
        ),
        HomeWidget.saveWidgetData<String>('prayer_times_line', prayers.map((p) => '${p.label} ${_fmt(p.time)}').join('  ·  ')),
        HomeWidget.saveWidgetData<int>('salawat_count', ProphetChallengeService.instance.localCount(period)),
        HomeWidget.saveWidgetData<String>('quran_today', '${q.pagesOn(now)} صفحة اليوم'),
        HomeWidget.saveWidgetData<String>('khatma_title', goal?.title ?? 'وردي من القرآن'),
        HomeWidget.saveWidgetData<String>('khatma_text', goal == null ? 'ابدأ ختمة من التطبيق' : '$read / 604 صفحة · ${goal.pagesPerDay} يوميًا'),
        HomeWidget.saveWidgetData<int>('khatma_percent', goal == null ? 0 : (read * 100 / 604).round()),
      ]);
      await _pushExtra(now, prayers);
      await Future.wait([
        HomeWidget.updateWidget(qualifiedAndroidName: '$_pkg.PrayerTimesWidget'),
        HomeWidget.updateWidget(qualifiedAndroidName: '$_pkg.SalawatWidget'),
        HomeWidget.updateWidget(qualifiedAndroidName: '$_pkg.QuranProgressWidget'),
        HomeWidget.updateWidget(qualifiedAndroidName: '$_pkg.AthkarWidget'),
        HomeWidget.updateWidget(qualifiedAndroidName: '$_pkg.WirdWidget'),
        HomeWidget.updateWidget(qualifiedAndroidName: '$_pkg.PrayersTrackerWidget'),
        HomeWidget.updateWidget(qualifiedAndroidName: '$_pkg.RadioWidget'),
      ]);
    } catch (e) {
      debugPrint('home widget update failed: $e');
    }
  }

  // ---- Athkar, wird, prayers tracker, radio ----

  /// Short adhkar (no Quran verses) that fit a small widget.
  static final List<String> _shortAthkar = () {
    final seen = <String>{};
    final out = <String>[];
    for (final z in [...morningAdhkar, ...eveningAdhkar]) {
      if (z.text.length <= 90 && !z.text.contains('﴿') && seen.add(z.text)) out.add(z.text);
    }
    return out;
  }();

  static int _minutes(TimeOfDay t) => t.hour * 60 + t.minute;

  Future<void> _pushExtra(DateTime now, List<PrayerTimeInfo> prayers) async {
    // Athkar: morning from Fajr until Asr, evening from Asr until the next Fajr.
    final nowMin = now.hour * 60 + now.minute;
    final fajr = _minutes(prayers.firstWhere((p) => p.key == 'Fajr').time);
    final asr = _minutes(prayers.firstWhere((p) => p.key == 'Asr').time);
    final String due;
    if (nowMin >= fajr && nowMin < asr) {
      due = 'أذكار الصباح الآن';
    } else if (nowMin >= asr) {
      due = 'أذكار المساء الآن';
    } else {
      due = 'ذكر الله';
    }
    final dayOfYear = now.difference(DateTime(now.year, 1, 1)).inDays;
    final slot = dayOfYear * 48 + nowMin ~/ 30;
    final zekr = _shortAthkar.isEmpty ? 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ' : _shortAthkar[slot % _shortAthkar.length];

    // Wird: yesterday's ticks count as cleared (the screen resets them on first open of a new day).
    final state = AppState.instance;
    final sameDay = state.text('wird_date') == AppState.dateKey(now);
    final tasks = <WirdTask>[];
    for (final s in state.strings('wird_tasks')) {
      try {
        tasks.add(WirdTask.fromJson(jsonDecode(s) as Map<String, dynamic>));
      } catch (_) {}
    }
    final doneCount = sameDay ? tasks.where((t) => t.done).length : 0;
    final nextTask = tasks.cast<WirdTask?>().firstWhere((t) => !sameDay || !t!.done, orElse: () => null);
    final wirdNext = tasks.isEmpty
        ? 'أضف وردك من التطبيق'
        : nextTask == null
            ? 'أتممت وردك اليوم، بارك الله فيك'
            : 'التالي: ${nextTask.title}';

    final saves = <Future<bool?>>[
      HomeWidget.saveWidgetData<String>('athkar_due', due),
      HomeWidget.saveWidgetData<String>('athkar_text', zekr),
      HomeWidget.saveWidgetData<String>('athkar_count', 'اضغط لفتح الأذكار'),
      HomeWidget.saveWidgetData<int>('wird_done', doneCount),
      HomeWidget.saveWidgetData<int>('wird_total', tasks.length),
      HomeWidget.saveWidgetData<String>('wird_next', wirdNext),
    ];
    for (final id in const ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      final done = state.prayerStatus(now, id) != PrayerStatus.none;
      saves.add(HomeWidget.saveWidgetData<int>('prayer_done_$id', done ? 1 : 0));
    }
    await Future.wait(saves);
    await _saveRadio();
  }

  /// Only overwrites the saved title while something is loaded, so the widget keeps the last station.
  Future<void> _saveRadio() async {
    final audio = AudioService.instance;
    final n = audio.now;
    final playing = audio.playing;
    final key = '${n?.title}|$playing';
    _lastRadioKey = key;
    await Future.wait([
      if (n != null) HomeWidget.saveWidgetData<String>('radio_title', n.title),
      if (n != null) HomeWidget.saveWidgetData<String>('radio_subtitle', n.subtitle),
      HomeWidget.saveWidgetData<bool>('radio_playing', playing),
    ]);
  }

  void _scheduleRadio() {
    if (!supported) return;
    final audio = AudioService.instance;
    if ('${audio.now?.title}|${audio.playing}' == _lastRadioKey) return;
    _radioDebounce?.cancel();
    _radioDebounce = Timer(const Duration(milliseconds: 600), () async {
      try {
        await _saveRadio();
        await HomeWidget.updateWidget(qualifiedAndroidName: '$_pkg.RadioWidget');
      } catch (e) {
        debugPrint('radio widget update failed: $e');
      }
    });
  }

  /// The radio widget's button opens the app with ifaqa://radio/toggle.
  void _onClick(Uri? uri) {
    if (uri == null || uri.host != 'radio') return;
    if (uri.path == '/toggle') AudioService.instance.toggle();
  }

  void dispose() {
    _debounce?.cancel();
    _minute?.cancel();
    _radioDebounce?.cancel();
    _clicks?.cancel();
  }
}
