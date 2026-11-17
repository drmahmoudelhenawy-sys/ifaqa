import 'dart:convert';
import '../models/prayer_time_info.dart';
import 'app_state.dart';
import 'islamic_calendar_service.dart';

enum ReminderKind { fajrAlarm, morningAthkar, eveningAthkar, wird, kahf, fastMonThu, fastWhiteDays, khatma }

class PlannedReminder {
  final int id;
  final ReminderKind kind;
  final DateTime time;
  final String title;
  final String body;
  const PlannedReminder({required this.id, required this.kind, required this.time, required this.title, required this.body});
}

/// Sounds bundled in android/app/src/main/res/raw and assets/audio/adhan.
/// The React app lists six adhans, but its files are three distinct clips.
class AlarmSound {
  final String id;
  final String label;
  const AlarmSound(this.id, this.label);
}

const List<AlarmSound> alarmSounds = [
  AlarmSound('system', 'نغمة الجهاز الافتراضية'),
  AlarmSound('cairo', 'أذان (القاهرة)'),
  AlarmSound('saudi', 'أذان (السعودية)'),
  AlarmSound('tarateel', 'ترتيل'),
];

/// Notification look for the Fajr alarm (React FAJR_ALARM_THEMES).
class FajrAlarmTheme {
  final String id;
  final String name;
  final String subtitle;
  final int background; // ARGB
  final int accent; // ARGB
  final int text; // ARGB
  final String title;
  final String target; // what the alarm announces, used in the body
  const FajrAlarmTheme(this.id, this.name, this.subtitle, this.background, this.accent, this.text, this.title, this.target);
}

const List<FajrAlarmTheme> fajrThemes = [
  FajrAlarmTheme('emerald', 'فجر السكينة (زمردي)', 'ظلال هادئة ونفحات الفجر الأولى', 0xFF0F261E, 0xFF10B981, 0xFFC3E1D0, 'حيّ على الصلاة، حيّ على الفلاح', 'أذان الفجر'),
  FajrAlarmTheme('midnight', 'قبس الفجر (كحلي نيلي)', 'هدوء جوف الليل ونور المآذن', 0xFF0C1226, 0xFF6366F1, 0xFFC7D2FE, 'قبس من نور الفجر', 'أذان الفجر'),
  FajrAlarmTheme('royal_purple', 'نور السحر (بنفسجي ملكي)', 'إشراقة إيمانية متألقة بروحانية', 0xFF1A0C26, 0xFFA855F7, 0xFFE9D5FF, 'نور السحر يناديك', 'أذان الفجر'),
  FajrAlarmTheme('warm_amber', 'عنبر الصباح (أسود ملكي وذهبي)', 'دفء تباشير الصبح وضياء الأفق', 0xFF23190A, 0xFFF59E0B, 0xFFFDE68A, 'أشرقت تباشير الصبح', 'أذان الفجر'),
];

FajrAlarmTheme fajrThemeById(String? id) => fajrThemes.firstWhere((t) => t.id == id, orElse: () => fajrThemes.first);

/// AppState keys: mode is 'relative' or 'fixed'; the fixed time is minutes after midnight.
const String fajrModeKey = 'fajr_alarm_mode';
const String fajrFixedKey = 'fajr_alarm_fixed_minutes';
const String fajrThemeKey = 'fajr_alarm_theme';
const int fajrFixedDefault = 4 * 60 + 30;

String fajrBody(FajrAlarmTheme theme, {required bool fixed, required int offset}) {
  if (fixed) return 'حان موعد منبّه الفجر';
  return offset == 0 ? 'حان الآن موعد ${theme.target}' : 'بقي $offset دقيقة على ${theme.target}';
}

const List<int> fajrOffsets = [0, 10, 15, 20, 30, 45, 60];

/// How far ahead one-off reminders are planned; the app re-plans on every launch.
const int planDays = 7;

/// Everything to schedule from [now], based on the user's saved settings.
/// Pure so it can be tested without the notification plugin.
List<PlannedReminder> planReminders(AppState state, DateTime now) {
  final plans = <PlannedReminder>[];
  final location = state.location;

  for (var d = 0; d < planDays; d++) {
    final day = DateTime(now.year, now.month, now.day + d);
    final times = prayerTimesOn(location, day);

    if (state.flag('fajr_alarm')) {
      final offset = state.number('fajr_alarm_offset');
      final fixed = state.text(fajrModeKey) == 'fixed';
      final fixedMinutes = state.number(fajrFixedKey, fallback: fajrFixedDefault);
      final theme = fajrThemeById(state.text(fajrThemeKey));
      plans.add(PlannedReminder(
        id: 100 + d,
        kind: ReminderKind.fajrAlarm,
        time: fixed
            ? DateTime(day.year, day.month, day.day, (fixedMinutes ~/ 60) % 24, fixedMinutes % 60)
            : times.fajr.subtract(Duration(minutes: offset)),
        title: theme.title,
        body: fajrBody(theme, fixed: fixed, offset: offset),
      ));
    }
    if (state.flag('notif_morning_athkar')) {
      plans.add(PlannedReminder(
        id: 200 + d,
        kind: ReminderKind.morningAthkar,
        time: times.fajr.add(const Duration(minutes: 20)),
        title: 'أذكار الصباح',
        body: 'ابدأ يومك بذكر الله، أذكار الصباح في انتظارك.',
      ));
    }
    if (state.flag('notif_evening_athkar')) {
      plans.add(PlannedReminder(
        id: 300 + d,
        kind: ReminderKind.eveningAthkar,
        time: times.asr.add(const Duration(minutes: 15)),
        title: 'أذكار المساء',
        body: 'اختم يومك بأذكار المساء.',
      ));
    }
    if (state.flag('notif_wird', fallback: true) && state.strings('wird_tasks').isNotEmpty) {
      final minutes = state.number('wird_minutes', fallback: 8 * 60);
      plans.add(PlannedReminder(
        id: 400 + d,
        kind: ReminderKind.wird,
        time: DateTime(day.year, day.month, day.day, minutes ~/ 60, minutes % 60),
        title: 'وردك اليومي',
        body: 'حان موعد وردك من القرآن.',
      ));
    }
    // Active khatma plan (React khatmaService daily reminder), an hour after the wird time.
    final khatmaRaw = state.text('khatma_goal');
    if (khatmaRaw != null && khatmaRaw.isNotEmpty && state.strings('khatma_pages').length < 604 && state.flag('notif_khatma', fallback: true)) {
      final minutes = state.number('wird_minutes', fallback: 8 * 60) + 60;
      final goal = jsonDecode(khatmaRaw) as Map<String, dynamic>;
      final perDay = (604 / ((goal['days'] as num?)?.toInt() ?? 30)).ceil();
      plans.add(PlannedReminder(
        id: 800 + d,
        kind: ReminderKind.khatma,
        time: DateTime(day.year, day.month, day.day, (minutes ~/ 60) % 24, minutes % 60),
        title: (goal['title'] as String?) ?? 'الختمة',
        body: 'حان موعد وردك اليومي من الختمة: $perDay صفحة اليوم.',
      ));
    }
    if (state.flag('notif_kahf_friday') && day.weekday == DateTime.friday) {
      plans.add(PlannedReminder(
        id: 500 + d,
        kind: ReminderKind.kahf,
        time: DateTime(day.year, day.month, day.day, 9),
        title: 'سورة الكهف',
        body: 'من قرأ سورة الكهف يوم الجمعة أضاء له من النور ما بين الجمعتين.',
      ));
    }
    // The evening before Monday and Thursday.
    if (state.flag('notif_fasting_mon_thu') && (day.weekday == DateTime.sunday || day.weekday == DateTime.wednesday)) {
      plans.add(PlannedReminder(
        id: 600 + d,
        kind: ReminderKind.fastMonThu,
        time: DateTime(day.year, day.month, day.day, 21),
        title: day.weekday == DateTime.sunday ? 'صيام الاثنين' : 'صيام الخميس',
        body: 'غدًا يوم تُعرض فيه الأعمال، انوِ الصيام.',
      ));
    }
    // The evening before the 13th, 14th and 15th of the Hijri month.
    if (state.flag('notif_fasting_lunar')) {
      final tomorrow = gregorianToHijri(day.add(const Duration(days: 1)), offsetDays: state.number('hijri_offset'));
      if (tomorrow.day >= 13 && tomorrow.day <= 15) {
        plans.add(PlannedReminder(
          id: 700 + d,
          kind: ReminderKind.fastWhiteDays,
          time: DateTime(day.year, day.month, day.day, 21),
          title: 'الأيام البيض',
          body: 'غدًا يوم ${tomorrow.day} من الشهر الهجري، من الأيام البيض.',
        ));
      }
    }
  }
  return plans.where((p) => p.time.isAfter(now)).toList();
}
