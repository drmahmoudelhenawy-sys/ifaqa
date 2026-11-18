import 'dart:convert';

import 'siraj_state.dart';

/// Pure Siraj reminder logic: no Flutter, no AppState. Everything is a
/// function of `now`, the prayer days, the config and the wird list, so it
/// is testable.
///
/// STANDING RULE — prayer time is the most important thing and must ALWAYS
/// be visible. Reminder entries never replace the prayer countdown: the
/// live capsule / widget / notification always keeps counting down to the
/// next prayer (see `planSirajLive` in siraj_state.dart).

// ---------------------------------------------------------------------------
// Wirds
// ---------------------------------------------------------------------------

/// What kind of wird (daily portion) this is.
enum SirajWirdKind { memorization, review, reading }

/// One user-defined wird (daily portion, e.g. memorisation or reading).
///
/// JSON format (a JSON array of objects, stored in
/// `SirajConfig.wirdsJson` / AppState key `siraj_wirds_json`):
/// ```json
/// [
///   {
///     "id": "wird-1",
///     "name": "حفظ سورة البقرة",
///     "kind": "memorization",
///     "enabled": true,
///     "afterPrayers": ["fajr", "maghrib"],
///     "fixedMinutes": [480]
///   }
/// ]
/// ```
/// `kind` is one of `memorization` | `review` | `reading` (unknown values
/// fall back to `reading`). `afterPrayers` holds prayer ids
/// (`fajr`/`dhuhr`/`asr`/`maghrib`/`isha`). `fixedMinutes` holds minutes
/// after midnight. Missing fields fall back to their defaults.
class SirajWird {
  final String id;
  final String name;
  final SirajWirdKind kind;
  final bool enabled;

  /// Prayer ids this wird follows (one entry 15 minutes after each).
  final List<String> afterPrayers;

  /// Fixed times of day (minutes after midnight) for this wird.
  final List<int> fixedMinutes;

  const SirajWird({
    required this.id,
    required this.name,
    this.kind = SirajWirdKind.reading,
    this.enabled = true,
    this.afterPrayers = const [],
    this.fixedMinutes = const [],
  });

  /// A sensible starter wird: daily reading after Fajr.
  factory SirajWird.defaultWird({
    String id = 'daily-wird',
    String name = 'الورد اليومي',
  }) => SirajWird(
    id: id,
    name: name,
    kind: SirajWirdKind.reading,
    afterPrayers: const ['fajr'],
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'kind': kind.name,
    'enabled': enabled,
    'afterPrayers': afterPrayers,
    'fixedMinutes': fixedMinutes,
  };

  factory SirajWird.fromJson(Map<String, dynamic> json) {
    final kindName = json['kind'] as String?;
    final kind = SirajWirdKind.values.firstWhere(
      (k) => k.name == kindName,
      orElse: () => SirajWirdKind.reading,
    );
    return SirajWird(
      id: (json['id'] as String?) ?? '',
      name: (json['name'] as String?) ?? '',
      kind: kind,
      enabled: json['enabled'] as bool? ?? true,
      afterPrayers:
          ((json['afterPrayers'] as List?) ?? const [])
              .whereType<String>()
              .toList(),
      fixedMinutes:
          ((json['fixedMinutes'] as List?) ?? const [])
              .whereType<num>()
              .map((n) => n.toInt())
              .toList(),
    );
  }
}

/// Decode a wirds JSON string (see [SirajWird] for the format).
/// Invalid JSON returns an empty list; invalid entries are skipped.
List<SirajWird> decodeSirajWirdsJson(String raw) {
  if (raw.trim().isEmpty) return const [];
  try {
    final decoded = jsonDecode(raw);
    if (decoded is! List) return const [];
    final out = <SirajWird>[];
    for (final item in decoded) {
      if (item is Map<String, dynamic>) {
        final wird = SirajWird.fromJson(item);
        if (wird.id.isNotEmpty) out.add(wird);
      } else if (item is Map) {
        final wird = SirajWird.fromJson(
          item.map((k, v) => MapEntry(k.toString(), v)),
        );
        if (wird.id.isNotEmpty) out.add(wird);
      }
    }
    return out;
  } catch (_) {
    return const [];
  }
}

/// Encode a wird list to the JSON string stored in [SirajConfig.wirdsJson].
String encodeSirajWirdsJson(List<SirajWird> wirds) =>
    jsonEncode([for (final w in wirds) w.toJson()]);

// ---------------------------------------------------------------------------
// Reminder entries
// ---------------------------------------------------------------------------

/// One upcoming Siraj reminder.
class SirajReminderEntry {
  /// When the reminder fires.
  final DateTime time;

  /// 'prayer_before' | 'prayer_after' | 'athkar_morning' |
  /// 'athkar_evening' | 'wird'.
  final String kind;
  final String title;
  final String body;

  /// Set for kind == 'wird'.
  final String? wirdId;

  /// Set for prayer / athkar entries (the prayer the entry relates to).
  final String? prayerId;

  const SirajReminderEntry({
    required this.time,
    required this.kind,
    required this.title,
    required this.body,
    this.wirdId,
    this.prayerId,
  });

  @override
  String toString() => '($time, $kind, $title)';
}

/// Minutes after midnight for the morning Athkar reminder on [day]:
/// [SirajConfig.morningAthkarMinutes] when set, else Fajr+20min.
DateTime sirajMorningAthkarTime(SirajDay day, SirajConfig config) {
  final fixed = config.morningAthkarMinutes;
  if (fixed != null && fixed >= 0 && fixed < 24 * 60) {
    return DateTime(
      day.date.year,
      day.date.month,
      day.date.day,
      fixed ~/ 60,
      fixed % 60,
    );
  }
  return day.prayer('fajr').adhan.add(athkarMorningAfterFajr);
}

/// Minutes after midnight for the evening Athkar reminder on [day]:
/// [SirajConfig.eveningAthkarMinutes] when set, else Asr+15min.
DateTime sirajEveningAthkarTime(SirajDay day, SirajConfig config) {
  final fixed = config.eveningAthkarMinutes;
  if (fixed != null && fixed >= 0 && fixed < 24 * 60) {
    return DateTime(
      day.date.year,
      day.date.month,
      day.date.day,
      fixed ~/ 60,
      fixed % 60,
    );
  }
  return day.prayer('asr').adhan.add(athkarEveningAfterAsr);
}

DateTime _atMinutes(SirajDay day, int minutes) => DateTime(
  day.date.year,
  day.date.month,
  day.date.day,
  (minutes ~/ 60) % 24,
  minutes % 60,
);

/// Sorted upcoming Siraj reminders for a 2-day horizon from [now].
///
/// (a) one `prayer_before` entry [SirajConfig.remindBeforeMins] before
/// each upcoming prayer adhan, and one `prayer_after` entry
/// [SirajConfig.remindAfterMins] after each adhan;
/// (b) morning Athkar at [SirajConfig.morningAthkarMinutes] (or Fajr+20min)
/// and evening Athkar at [SirajConfig.eveningAthkarMinutes] (or Asr+15min);
/// (c) for each enabled wird: one `wird` entry 15 minutes after each of
/// its [SirajWird.afterPrayers] (15 minutes gives the user time to finish
/// the prayer before the wird reminder fires) and one at each of its
/// [SirajWird.fixedMinutes].
///
/// Only future entries (`time.isAfter(now)`) within two days are returned,
/// sorted by time. This plans *reminders*; it never hides prayer time —
/// the capsule / widget / notification countdown to the next prayer is
/// unaffected by these entries.
List<SirajReminderEntry> planSirajReminders({
  required DateTime now,
  required List<SirajDay> days,
  required SirajConfig config,
  List<SirajWird> wirds = const [],
}) {
  final end = now.add(const Duration(days: 2));
  final out = <SirajReminderEntry>[];
  final before = config.remindBeforeMins < 0 ? 0 : config.remindBeforeMins;
  final after = config.remindAfterMins < 0 ? 0 : config.remindAfterMins;

  void add(SirajReminderEntry e) {
    if (e.time.isAfter(now) && !e.time.isAfter(end)) out.add(e);
  }

  final prayers = <SirajPrayer>[];
  for (final d in days) {
    prayers.addAll(d.prayers);
  }
  prayers.sort((a, b) => a.adhan.compareTo(b.adhan));

  for (final p in prayers) {
    add(
      SirajReminderEntry(
        time: p.adhan.subtract(Duration(minutes: before)),
        kind: 'prayer_before',
        title: 'اقترب أذان ${p.label}',
        body: 'بقي $before دقيقة على أذان ${p.label} (${sirajClock(p.adhan)})',
        prayerId: p.id,
      ),
    );
    add(
      SirajReminderEntry(
        time: p.adhan.add(Duration(minutes: after)),
        kind: 'prayer_after',
        title: 'أذان ${p.label}',
        body: 'حان أذان ${p.label} منذ $after دقيقة',
        prayerId: p.id,
      ),
    );
  }

  for (final d in days) {
    add(
      SirajReminderEntry(
        time: sirajMorningAthkarTime(d, config),
        kind: 'athkar_morning',
        title: 'أذكار الصباح',
        body: 'حان وقت أذكار الصباح',
        prayerId: 'fajr',
      ),
    );
    add(
      SirajReminderEntry(
        time: sirajEveningAthkarTime(d, config),
        kind: 'athkar_evening',
        title: 'أذكار المساء',
        body: 'حان وقت أذكار المساء',
        prayerId: 'asr',
      ),
    );
  }

  for (final wird in wirds) {
    if (!wird.enabled) continue;
    for (final prayerId in wird.afterPrayers) {
      for (final p in prayers) {
        if (p.id != prayerId) continue;
        add(
          SirajReminderEntry(
            time: p.adhan.add(const Duration(minutes: 15)),
            kind: 'wird',
            title: 'وردك: ${wird.name}',
            body: 'حان وقت وردك بعد صلاة ${p.label}',
            wirdId: wird.id,
            prayerId: p.id,
          ),
        );
      }
    }
    for (final minutes in wird.fixedMinutes) {
      if (minutes < 0 || minutes >= 24 * 60) continue;
      for (final d in days) {
        add(
          SirajReminderEntry(
            time: _atMinutes(d, minutes),
            kind: 'wird',
            title: 'وردك: ${wird.name}',
            body: 'حان وقت وردك',
            wirdId: wird.id,
          ),
        );
      }
    }
  }

  out.sort((a, b) {
    final byTime = a.time.compareTo(b.time);
    if (byTime != 0) return byTime;
    final byKind = a.kind.compareTo(b.kind);
    if (byKind != 0) return byKind;
    return a.title.compareTo(b.title);
  });
  return out;
}

// ---------------------------------------------------------------------------
// Iqamah countdown + countdown formatting
// ---------------------------------------------------------------------------

/// Time left until the iqamah of [prayer], or null when [now] is outside
/// the adhan → iqamah window.
Duration? sirajIqamaRemaining(DateTime now, SirajPrayer prayer) {
  if (prayer.iqamaMins <= 0) return null;
  if (now.isBefore(prayer.adhan) || !now.isBefore(prayer.iqamah)) {
    return null;
  }
  return prayer.iqamah.difference(now);
}

/// Format a countdown [d] in [format]:
/// - 'min_sec': the existing [sirajCountdown] ("٠١:٢٣:٤٥" / "٠٤:١٢").
/// - 'min_only': whole minutes left as Arabic digits with a ' د' suffix
///   (e.g. '٤٥ د').
/// Unknown formats fall back to 'min_sec'. Never negative (clamped to 0).
String sirajFormatCountdown(Duration d, String format) {
  final clamped = d.isNegative ? Duration.zero : d;
  if (format == 'min_only') {
    return '${sirajArabicDigits(clamped.inMinutes)} د';
  }
  return sirajCountdown(clamped);
}
