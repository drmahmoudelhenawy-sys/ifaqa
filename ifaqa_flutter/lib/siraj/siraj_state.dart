import 'siraj_quotes.dart';

/// Pure Siraj logic: no Flutter, no AppState. Everything is a function of
/// `now`, the prayer days, the config and the app signals, so it is testable.

enum SirajKind { idle, iqamah, adhanNow, athkarDue, quote, media }

enum SirajAthkar { morning, evening }

/// Which nafahat Siraj may show.
enum SirajQuoteChoice { quran, hadith, both }

const prayerIds = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const _prayerLabels = {
  'fajr': 'الفجر',
  'dhuhr': 'الظهر',
  'asr': 'العصر',
  'maghrib': 'المغرب',
  'isha': 'العشاء',
};

String sirajPrayerLabel(String id) => _prayerLabels[id] ?? id;

/// Priorities: the highest wins the capsule.
class SirajPriority {
  static const adhanNow = 100;
  static const iqamah = 90;
  static const athkar = 70;
  static const media = 50;
  static const fridayKahf = 45;
  static const quote = 30;
  static const idle = 10;
}

class SirajPrayer {
  final String id; // fajr/dhuhr/asr/maghrib/isha
  final DateTime adhan;
  final int iqamaMins;
  const SirajPrayer(this.id, this.adhan, this.iqamaMins);

  String get label => sirajPrayerLabel(id);
  DateTime get iqamah => adhan.add(Duration(minutes: iqamaMins));
}

/// One calendar day of prayer times.
class SirajDay {
  final DateTime date; // midnight
  final DateTime sunrise;
  final List<SirajPrayer> prayers; // fajr..isha

  const SirajDay({
    required this.date,
    required this.sunrise,
    required this.prayers,
  });

  SirajPrayer prayer(String id) => prayers.firstWhere((p) => p.id == id);
  String get key => sirajDateKey(date);
}

String sirajDateKey(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

bool sirajSameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

class SirajConfig {
  final bool enabled;
  final bool showInApp;
  final bool liveNotification;
  final String theme; // night | emerald | gold
  final bool autoHide;
  final bool dnd;
  final bool alertPrayer;
  final bool alertIqamah;
  final bool alertAthkar;
  final bool alertMedia;
  final bool alertQuotes;
  final SirajQuoteChoice quoteSource;
  final int quoteEveryMins;
  final int quoteShowSecs;

  const SirajConfig({
    this.enabled = true,
    this.showInApp = true,
    this.liveNotification = false,
    this.theme = 'night',
    this.autoHide = false,
    this.dnd = false,
    this.alertPrayer = true,
    this.alertIqamah = true,
    this.alertAthkar = true,
    this.alertMedia = true,
    this.alertQuotes = true,
    this.quoteSource = SirajQuoteChoice.both,
    this.quoteEveryMins = 30,
    this.quoteShowSecs = 12,
  });

  SirajConfig copyWith({
    bool? dnd,
    bool? alertPrayer,
    bool? alertIqamah,
    bool? alertAthkar,
    bool? alertMedia,
    bool? alertQuotes,
    SirajQuoteChoice? quoteSource,
  }) => SirajConfig(
    enabled: enabled,
    showInApp: showInApp,
    liveNotification: liveNotification,
    theme: theme,
    autoHide: autoHide,
    dnd: dnd ?? this.dnd,
    alertPrayer: alertPrayer ?? this.alertPrayer,
    alertIqamah: alertIqamah ?? this.alertIqamah,
    alertAthkar: alertAthkar ?? this.alertAthkar,
    alertMedia: alertMedia ?? this.alertMedia,
    alertQuotes: alertQuotes ?? this.alertQuotes,
    quoteSource: quoteSource ?? this.quoteSource,
    quoteEveryMins: quoteEveryMins,
    quoteShowSecs: quoteShowSecs,
  );
}

/// What the rest of the app tells Siraj.
class SirajSignals {
  final bool athkarMorningDone;
  final bool athkarEveningDone;
  final String? mediaTitle;
  final String? mediaSubtitle;
  final bool mediaPlaying;
  final bool fridayKahf;

  /// "yyyy-mm-dd/prayerId" of prayers already logged, so the adhan card is skipped.
  final Set<String> donePrayers;

  const SirajSignals({
    this.athkarMorningDone = false,
    this.athkarEveningDone = false,
    this.mediaTitle,
    this.mediaSubtitle,
    this.mediaPlaying = false,
    this.fridayKahf = false,
    this.donePrayers = const {},
  });
}

class SirajState {
  final SirajKind kind;
  final String title;
  final String subtitle;

  /// What the countdown runs to (null: no countdown).
  final DateTime? target;
  final int priority;

  /// Stable identity of this occurrence (used to remember "dismissed").
  final String key;
  final String? prayerId;
  final DateTime? prayerDate;
  final SirajAthkar? athkar;
  final SirajQuote? quote;

  const SirajState({
    required this.kind,
    required this.title,
    this.subtitle = '',
    this.target,
    required this.priority,
    required this.key,
    this.prayerId,
    this.prayerDate,
    this.athkar,
    this.quote,
  });
}

const adhanNowWindow = Duration(minutes: 2);
const athkarMorningAfterFajr = Duration(minutes: 20);
const athkarMorningAfterSunrise = Duration(hours: 3);
const athkarEveningAfterAsr = Duration(minutes: 15);

List<SirajPrayer> _flat(List<SirajDay> days) {
  final all = [for (final d in days) ...d.prayers]
    ..sort((a, b) => a.adhan.compareTo(b.adhan));
  return all;
}

SirajDay? _dayOf(List<SirajDay> days, DateTime now) {
  for (final d in days) {
    if (sirajSameDay(d.date, now)) return d;
  }
  return null;
}

/// All states that currently apply, highest priority first. Never empty:
/// the idle state is always present.
List<SirajState> computeSirajCandidates({
  required DateTime now,
  required List<SirajDay> days,
  SirajConfig config = const SirajConfig(),
  SirajSignals signals = const SirajSignals(),
  List<SirajQuote>? quotes,
}) {
  final out = <SirajState>[];
  final prayers = _flat(days);

  // Idle: the next adhan.
  SirajPrayer? next;
  for (final p in prayers) {
    if (p.adhan.isAfter(now)) {
      next = p;
      break;
    }
  }
  out.add(
    SirajState(
      kind: SirajKind.idle,
      title: next == null ? 'سِراج' : next.label,
      subtitle: 'بعد',
      target: next?.adhan,
      priority: SirajPriority.idle,
      key: 'idle',
      prayerId: next?.id,
    ),
  );

  if (!config.dnd) {
    for (final p in prayers) {
      final day = sirajDateKey(
        DateTime(p.adhan.year, p.adhan.month, p.adhan.day),
      );
      final done = signals.donePrayers.contains('$day/${p.id}');
      // Adhan: ~2 minutes of expanded card.
      if (config.alertPrayer &&
          !done &&
          !now.isBefore(p.adhan) &&
          now.isBefore(p.adhan.add(adhanNowWindow))) {
        out.add(
          SirajState(
            kind: SirajKind.adhanNow,
            title: 'حان الآن موعد أذان ${p.label}',
            subtitle: 'حيّ على الصلاة',
            priority: SirajPriority.adhanNow,
            key: 'adhan:$day:${p.id}',
            prayerId: p.id,
            prayerDate: p.adhan,
          ),
        );
      }
      // Between adhan and iqamah.
      if (config.alertIqamah &&
          p.iqamaMins > 0 &&
          !now.isBefore(p.adhan) &&
          now.isBefore(p.iqamah)) {
        out.add(
          SirajState(
            kind: SirajKind.iqamah,
            title: 'إقامة ${p.label}',
            subtitle: 'بعد',
            target: p.iqamah,
            priority: SirajPriority.iqamah,
            key: 'iqamah:$day:${p.id}',
            prayerId: p.id,
            prayerDate: p.adhan,
          ),
        );
      }
    }

    final today = _dayOf(days, now);
    if (config.alertAthkar && today != null) {
      final mStart = today.prayer('fajr').adhan.add(athkarMorningAfterFajr);
      final mEnd = today.sunrise.add(athkarMorningAfterSunrise);
      if (!signals.athkarMorningDone &&
          !now.isBefore(mStart) &&
          now.isBefore(mEnd)) {
        out.add(
          SirajState(
            kind: SirajKind.athkarDue,
            title: 'أذكار الصباح',
            subtitle: 'ابدأ يومك بذكر الله',
            target: mEnd,
            priority: SirajPriority.athkar,
            key: 'athkar:morning:${today.key}',
            athkar: SirajAthkar.morning,
          ),
        );
      }
      final eStart = today.prayer('asr').adhan.add(athkarEveningAfterAsr);
      final eEnd = today.prayer('maghrib').adhan;
      if (!signals.athkarEveningDone &&
          !now.isBefore(eStart) &&
          now.isBefore(eEnd)) {
        out.add(
          SirajState(
            kind: SirajKind.athkarDue,
            title: 'أذكار المساء',
            subtitle: 'اختم نهارك بذكر الله',
            target: eEnd,
            priority: SirajPriority.athkar,
            key: 'athkar:evening:${today.key}',
            athkar: SirajAthkar.evening,
          ),
        );
      }
    }

    if (config.alertMedia &&
        signals.mediaPlaying &&
        (signals.mediaTitle ?? '').isNotEmpty) {
      out.add(
        SirajState(
          kind: SirajKind.media,
          title: signals.mediaTitle!,
          subtitle: signals.mediaSubtitle ?? '',
          priority: SirajPriority.media,
          key: 'media',
        ),
      );
    }

    if (config.alertQuotes) {
      final slotMs = config.quoteEveryMins * 60000;
      final ms = now.millisecondsSinceEpoch;
      if (slotMs > 0 && ms % slotMs < config.quoteShowSecs * 1000) {
        final slot = ms ~/ slotMs;
        final friday =
            now.weekday == DateTime.friday && signals.fridayKahf && slot.isEven;
        if (friday) {
          out.add(
            SirajState(
              kind: SirajKind.quote,
              title: 'يوم الجمعة',
              subtitle: 'لا تنسَ قراءة سورة الكهف',
              priority: SirajPriority.fridayKahf,
              key: 'kahf:${sirajDateKey(now)}:$slot',
            ),
          );
        } else {
          final pool = _quotePool(
            quotes ?? sirajBundledQuotes,
            config.quoteSource,
          );
          if (pool.isNotEmpty) {
            final q = pool[slot % pool.length];
            out.add(
              SirajState(
                kind: SirajKind.quote,
                title: q.text,
                subtitle: q.reference,
                priority: SirajPriority.quote,
                key: 'quote:$slot',
                quote: q,
              ),
            );
          }
        }
      }
    }
  }

  out.sort((a, b) => b.priority.compareTo(a.priority));
  return out;
}

List<SirajQuote> _quotePool(List<SirajQuote> all, SirajQuoteChoice choice) {
  switch (choice) {
    case SirajQuoteChoice.quran:
      return all.where((q) => q.source == SirajQuoteSource.quran).toList();
    case SirajQuoteChoice.hadith:
      return all.where((q) => q.source == SirajQuoteSource.hadith).toList();
    case SirajQuoteChoice.both:
      return all;
  }
}

SirajState computeSirajState({
  required DateTime now,
  required List<SirajDay> days,
  SirajConfig config = const SirajConfig(),
  SirajSignals signals = const SirajSignals(),
  List<SirajQuote>? quotes,
}) => computeSirajCandidates(
  now: now,
  days: days,
  config: config,
  signals: signals,
  quotes: quotes,
).first;

// ---- Formatting ----

String sirajArabicDigits(Object value) => value.toString().split('').map((c) {
  final code = c.codeUnitAt(0);
  return code >= 48 && code <= 57 ? String.fromCharCode(0x0660 + code - 48) : c;
}).join();

/// "٠١:٢٣:٤٥" above an hour, "٠٤:١٢" below.
String sirajCountdown(Duration d) {
  final total = d.inSeconds < 0 ? 0 : d.inSeconds;
  final h = total ~/ 3600;
  final m = (total % 3600) ~/ 60;
  final s = total % 60;
  String two(int n) => n.toString().padLeft(2, '0');
  final text = h > 0 ? '${two(h)}:${two(m)}:${two(s)}' : '${two(m)}:${two(s)}';
  return sirajArabicDigits(text);
}

/// "١٢:٤٥ م"
String sirajClock(DateTime t) {
  final h12 = t.hour % 12 == 0 ? 12 : t.hour % 12;
  return sirajArabicDigits('$h12:${t.minute.toString().padLeft(2, '0')}') +
      (t.hour < 12 ? ' ص' : ' م');
}

// ---- Android live capsule plan ----

class SirajLiveEntry {
  /// When this notification should be posted.
  final DateTime time;
  final String title;
  final String body;

  /// Where the native chronometer counts down to.
  final DateTime countdownTarget;
  final bool iqamahPhase;
  final String? prayerId;

  const SirajLiveEntry({
    required this.time,
    required this.title,
    required this.body,
    required this.countdownTarget,
    required this.iqamahPhase,
    this.prayerId,
  });

  @override
  String toString() => '($time, $title, $countdownTarget)';
}

SirajLiveEntry _nextEntry(DateTime at, SirajPrayer next) => SirajLiveEntry(
  time: at,
  title: 'سِراج · ${next.label}',
  body: 'متبقٍ على أذان ${next.label} (${sirajClock(next.adhan)})',
  countdownTarget: next.adhan,
  iqamahPhase: false,
  prayerId: next.id,
);

SirajLiveEntry _iqamahEntry(DateTime at, SirajPrayer p) => SirajLiveEntry(
  time: at,
  title: 'سِراج · إقامة ${p.label}',
  body: 'متبقٍ على إقامة ${p.label} (${sirajClock(p.iqamah)})',
  countdownTarget: p.iqamah,
  iqamahPhase: true,
  prayerId: p.id,
);

/// The chain of notifications for the next [horizon]: the first entry is "now"
/// (post immediately), then one at every adhan (iqamah countdown) and every
/// iqamah end (next-prayer countdown).
List<SirajLiveEntry> planSirajLive({
  required DateTime now,
  required List<SirajDay> days,
  Duration horizon = const Duration(days: 2),
}) {
  final prayers = _flat(days);
  final end = now.add(horizon);
  final entries = <SirajLiveEntry>[];

  SirajPrayer? active;
  for (final p in prayers) {
    if (p.iqamaMins > 0 && !now.isBefore(p.adhan) && now.isBefore(p.iqamah)) {
      active = p;
    }
  }
  SirajPrayer? upcoming;
  for (final p in prayers) {
    if (p.adhan.isAfter(now)) {
      upcoming = p;
      break;
    }
  }
  if (active != null) {
    entries.add(_iqamahEntry(now, active));
  } else if (upcoming != null) {
    entries.add(_nextEntry(now, upcoming));
  }

  for (var i = 0; i < prayers.length; i++) {
    final p = prayers[i];
    final hasNext = i + 1 < prayers.length;
    if (p.adhan.isAfter(now) && !p.adhan.isAfter(end)) {
      if (p.iqamaMins > 0) {
        entries.add(_iqamahEntry(p.adhan, p));
      } else if (hasNext) {
        entries.add(_nextEntry(p.adhan, prayers[i + 1]));
      }
    }
    if (p.iqamaMins > 0 &&
        p.iqamah.isAfter(now) &&
        !p.iqamah.isAfter(end) &&
        hasNext) {
      entries.add(_nextEntry(p.iqamah, prayers[i + 1]));
    }
  }
  entries.sort((a, b) => a.time.compareTo(b.time));
  return entries;
}
