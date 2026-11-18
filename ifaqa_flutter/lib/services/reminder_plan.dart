import 'dart:convert';
import '../models/prayer_time_info.dart';
import '../siraj/siraj_reminders.dart';
import '../siraj/siraj_state.dart';
import 'app_state.dart';
import 'islamic_calendar_service.dart';

enum ReminderKind { fajrAlarm, morningAthkar, eveningAthkar, wird, kahf, fastMonThu, fastWhiteDays, khatma, sirajPrayerBefore, sirajPrayerAfter }

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

/// Id range reserved for Siraj reminders scheduled by [planReminders]:
/// 1100-1199. Existing ranges: 100-800 planned reminders, 900-908 snoozes,
/// 1000-1099 the Siraj live capsule (owned by SirajLiveService, never
/// cancelled by [ReminderService.reschedule]). At most 100 Siraj entries
/// are scheduled (the 2-day horizon yields ~24 plus one per wird trigger).
const int sirajReminderFirstId = 1100;
const int sirajReminderLastId = 1199;

/// Everything to schedule from [now], based on the user's saved settings.
/// Pure so it can be tested without the notification plugin.
List<PlannedReminder> planReminders(AppState state, DateTime now) {
  final plans = <PlannedReminder>[];
  final location = state.location;

  // Siraj's Athkar reminders (same default times) replace the legacy ones
  // when Siraj Athkar alerts are on, so the user is not notified twice.
  final sirajAthkarOn =
      state.flag('siraj_enabled', fallback: true) &&
      state.flag('siraj_k_athkar', fallback: true);

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
    if (state.flag('notif_morning_athkar') && !sirajAthkarOn) {
      plans.add(PlannedReminder(
        id: 200 + d,
        kind: ReminderKind.morningAthkar,
        time: times.fajr.add(const Duration(minutes: 20)),
        title: 'أذكار الصباح',
        body: 'ابدأ يومك بذكر الله، أذكار الصباح في انتظارك.',
      ));
    }
    if (state.flag('notif_evening_athkar') && !sirajAthkarOn) {
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
  // Siraj reminders (ids 1100-1199): appended, never replacing the above.
  plans.addAll(_sirajReminders(state, now));
  return plans.where((p) => p.time.isAfter(now)).toList();
}

// ---- Siraj reminders (ids 1100-1199) ----
//
// The Siraj keys below mirror SirajSettings.*Key (siraj_settings.dart);
// they are read here directly so this file stays free of the
// AudioService import chain that siraj_settings.dart carries.

/// Siraj prayer days for the 2-day reminder horizon, from the same
/// prayer-time source as [planReminders] (iqamah minutes are per-prayer
/// constants, so today's table applies to every day).
List<SirajDay> _sirajDays(AppLocation location, DateTime now) {
  final iqama = {
    for (final p in buildPrayerTimes(location)) p.key.toLowerCase(): p.iqamaMins,
  };
  final days = <SirajDay>[];
  for (var offset = 0; offset <= 2; offset++) {
    final date = DateTime(now.year, now.month, now.day + offset);
    final t = prayerTimesOn(location, date);
    DateTime m(DateTime d) =>
        DateTime(date.year, date.month, date.day, d.hour, d.minute);
    final times = {
      'fajr': t.fajr,
      'dhuhr': t.dhuhr,
      'asr': t.asr,
      'maghrib': t.maghrib,
      'isha': t.isha,
    };
    days.add(
      SirajDay(
        date: date,
        sunrise: m(t.sunrise),
        prayers: [
          for (final id in prayerIds)
            SirajPrayer(id, m(times[id]!), iqama[id] ?? 10),
        ],
      ),
    );
  }
  return days;
}

SirajConfig _sirajConfig(AppState state) {
  int? nullableMinutes(String key) {
    final raw = state.text(key);
    if (raw == null || raw.isEmpty) return null;
    final value = int.tryParse(raw);
    if (value == null || value < 0 || value >= 24 * 60) return null;
    return value;
  }

  int nonNegative(String key, int fallback) {
    final value = state.number(key, fallback: fallback);
    return value < 0 ? 0 : value;
  }

  return SirajConfig(
    enabled: state.flag('siraj_enabled', fallback: true),
    alertPrayer: state.flag('siraj_k_prayer', fallback: true),
    alertIqamah: state.flag('siraj_k_iqamah', fallback: true),
    alertAthkar: state.flag('siraj_k_athkar', fallback: true),
    remindBeforeMins: nonNegative('siraj_remind_before_mins', 10),
    remindAfterMins: nonNegative('siraj_remind_after_mins', 10),
    morningAthkarMinutes: nullableMinutes('siraj_morning_athkar_minutes'),
    eveningAthkarMinutes: nullableMinutes('siraj_evening_athkar_minutes'),
  );
}

SirajPrayer? _nextPrayerAfter(List<SirajPrayer> prayers, DateTime time) {
  for (final p in prayers) {
    if (p.adhan.isAfter(time)) return p;
  }
  return null;
}

/// Siraj reminders appended to [planReminders]: prayer-before /
/// prayer-after, morning/evening Athkar at the configured times, and each
/// enabled wird's triggers — all from [planSirajReminders]. Existing
/// entries and ids are untouched; these only append in 1100-1199.
///
/// STANDING RULE: a reminder body never hides prayer time. Prayer entries
/// already name their prayer; Athkar and fixed-time wird bodies name the
/// next prayer too, the way the live capsule keeps counting down to it.
List<PlannedReminder> _sirajReminders(AppState state, DateTime now) {
  final config = _sirajConfig(state);
  if (!config.enabled) return const [];
  final days = _sirajDays(state.location, now);
  final entries = planSirajReminders(
    now: now,
    days: days,
    config: config,
    wirds: decodeSirajWirdsJson(state.text('siraj_wirds_json') ?? ''),
  );
  final prayers = [for (final d in days) ...d.prayers]
    ..sort((a, b) => a.adhan.compareTo(b.adhan));
  final out = <PlannedReminder>[];
  for (final e in entries) {
    // Per-kind alert flags gate the Siraj entries, like the capsule does.
    switch (e.kind) {
      case 'prayer_before':
      case 'prayer_after':
        if (!config.alertPrayer) continue;
      case 'athkar_morning':
      case 'athkar_evening':
        if (!config.alertAthkar) continue;
      case 'wird':
        break; // Wirds carry their own `enabled` flag.
      default:
        continue;
    }
    final kind = switch (e.kind) {
      'prayer_before' => ReminderKind.sirajPrayerBefore,
      'prayer_after' => ReminderKind.sirajPrayerAfter,
      'athkar_morning' => ReminderKind.morningAthkar,
      'athkar_evening' => ReminderKind.eveningAthkar,
      _ => ReminderKind.wird,
    };
    var body = e.body;
    if (e.kind == 'athkar_morning' ||
        e.kind == 'athkar_evening' ||
        (e.kind == 'wird' && !body.contains('صلاة'))) {
      final next = _nextPrayerAfter(prayers, e.time);
      if (next != null) {
        body =
            '$body · متبقٍ على أذان ${next.label} (${sirajClock(next.adhan)})';
      }
    }
    out.add(
      PlannedReminder(
        id: sirajReminderFirstId + out.length,
        kind: kind,
        time: e.time,
        title: e.title,
        body: body,
      ),
    );
    if (out.length >= sirajReminderLastId - sirajReminderFirstId + 1) break;
  }
  return out;
}
