import 'dart:math' as math;

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

  // ---- Capsule appearance / layout ----
  /// Capsule size preset: 'small' | 'normal' | 'large'. The default is
  /// 'small': the user's old prayer-island app was a small capsule, and
  /// the pill renders compact at this size (see [sirajCapsuleSizeScale]).
  /// The width/height values below keep working as fine-tuning on top of
  /// the preset.
  final String capsuleSize;

  /// Capsule shape: 'pill' (the default) | 'circle'. Circle is a small
  /// round badge — next prayer + countdown — for placing at the top, e.g.
  /// around the phone's front-camera punch-hole. In circle mode the badge
  /// always shows the prayer countdown (the most important thing); the
  /// other kinds are still reachable by tapping to expand.
  final String capsuleShape;

  /// Capsule show/hide + expand animation style: 'fade' (fade + scale,
  /// the default) | 'slide' (slide down + fade) | 'off' (no animation).
  final String capsuleAnimation;

  /// Gesture → action mappings (see [sirajGestureActions]). Defaults keep
  /// the current behaviour: tap opens today's prayer times, long-press
  /// opens the Siraj tab. Swipe gestures only apply while the capsule is
  /// collapsed; while expanded, swiping up still collapses it.
  final String gestureTap;
  final String gestureDoubleTap;
  final String gestureLongPress;
  final String gestureSwipeUp;
  final String gestureSwipeDown;
  final String gestureSwipeLeft;
  final String gestureSwipeRight;

  /// Fraction of the screen width the capsule occupies.
  final double capsuleWidthFrac;
  /// Capsule height in dp.
  final double capsuleHeight;

  /// STANDING RULE — prayer time is the most important thing and must
  /// ALWAYS be visible (in-app capsule, home widget, lock-screen
  /// notification). The capsule always shows the next prayer + countdown,
  /// even if every other content kind is off. This flag is therefore
  /// effectively always true: [SirajSettings.config] forces it to `true`
  /// regardless of any stored value, and UI code must never hide the
  /// prayer chip on the basis of this flag.
  final bool showPrayer;
  final bool showAthkar;
  final bool showQuotes;
  final bool showMedia;
  final bool showPlayer;

  /// Seconds of no interaction before auto-hide; 0 = off. Only applies
  /// when [autoHide] is true.
  final int autoHideIdleSecs;

  /// Countdown format: 'min_sec' (HH:MM:SS / MM:SS, Arabic digits) or
  /// 'min_only' (whole minutes + ' د').
  final String countdownFormat;

  /// Capsule horizontal alignment: 'left' | 'center' | 'right'.
  final String capsuleAlign;
  /// Vertical offset in dp from the capsule's default position.
  final double capsuleTopOffset;
  final bool capsuleDraggable;

  /// Capsule opacity, clamped to 0.5..1.0.
  final double capsuleOpacity;

  /// Accent colour as a hex string (e.g. '#10B981'); null = theme colour.
  final String? capsuleAccentHex;

  // ---- Reminders / sound ----
  /// Adhan sound id (see [alarmSounds] in reminder_plan.dart).
  final String adhanSound;
  /// Minutes before each adhan to remind.
  final int remindBeforeMins;
  /// Minutes after each adhan to remind.
  final int remindAfterMins;

  /// Minutes after midnight for the morning Athkar reminder when set;
  /// null = follow Fajr+20min (see [athkarMorningAfterFajr]).
  final int? morningAthkarMinutes;
  /// Minutes after midnight for the evening Athkar reminder when set;
  /// null = follow Asr+15min (see [athkarEveningAfterAsr]).
  final int? eveningAthkarMinutes;

  /// Default snooze for "اقرأ لاحقًا" from a notification (minutes, one
  /// of [sirajAthkarSnoozeOptions], default 15). A notification action
  /// cannot show a chooser, so it re-reminds after this long; inside the
  /// island the user picks 10/15/30/60 every time.
  final int athkarSnoozeMinutes;

  // ---- Player / overlay ----
  /// Audio source for the capsule player: 'app' | 'device'.
  final String playerSource;
  final bool deviceMusicEnabled;
  final bool overlayEnabled;
  final bool overlayShowWhenAppClosed;

  /// JSON list of [SirajWird]s (see siraj_reminders.dart for the format).
  /// Empty string = no custom wirds.
  final String wirdsJson;

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
    this.capsuleSize = 'small',
    this.capsuleShape = 'pill',
    this.capsuleAnimation = 'fade',
    this.gestureTap = 'prayer_times',
    this.gestureDoubleTap = 'none',
    this.gestureLongPress = 'siraj_tab',
    this.gestureSwipeUp = 'prayer_times',
    this.gestureSwipeDown = 'none',
    this.gestureSwipeLeft = 'none',
    this.gestureSwipeRight = 'none',
    this.capsuleWidthFrac = 0.92,
    this.capsuleHeight = 44.0,
    this.showPrayer = true,
    this.showAthkar = true,
    this.showQuotes = true,
    this.showMedia = true,
    this.showPlayer = true,
    this.autoHideIdleSecs = 0,
    this.countdownFormat = 'min_sec',
    this.capsuleAlign = 'center',
    this.capsuleTopOffset = 0.0,
    this.capsuleDraggable = true,
    this.capsuleOpacity = 1.0,
    this.capsuleAccentHex,
    this.adhanSound = 'cairo',
    this.remindBeforeMins = 10,
    this.remindAfterMins = 10,
    this.morningAthkarMinutes,
    this.eveningAthkarMinutes,
    this.athkarSnoozeMinutes = 15,
    this.playerSource = 'app',
    this.deviceMusicEnabled = false,
    this.overlayEnabled = false,
    this.overlayShowWhenAppClosed = false,
    this.wirdsJson = '',
  });

  SirajConfig copyWith({
    bool? enabled,
    bool? showInApp,
    bool? liveNotification,
    String? theme,
    bool? autoHide,
    bool? dnd,
    bool? alertPrayer,
    bool? alertIqamah,
    bool? alertAthkar,
    bool? alertMedia,
    bool? alertQuotes,
    SirajQuoteChoice? quoteSource,
    int? quoteEveryMins,
    int? quoteShowSecs,
    String? capsuleSize,
    String? capsuleShape,
    String? capsuleAnimation,
    String? gestureTap,
    String? gestureDoubleTap,
    String? gestureLongPress,
    String? gestureSwipeUp,
    String? gestureSwipeDown,
    String? gestureSwipeLeft,
    String? gestureSwipeRight,
    double? capsuleWidthFrac,
    double? capsuleHeight,
    bool? showPrayer,
    bool? showAthkar,
    bool? showQuotes,
    bool? showMedia,
    bool? showPlayer,
    int? autoHideIdleSecs,
    String? countdownFormat,
    String? capsuleAlign,
    double? capsuleTopOffset,
    bool? capsuleDraggable,
    double? capsuleOpacity,
    String? capsuleAccentHex,
    String? adhanSound,
    int? remindBeforeMins,
    int? remindAfterMins,
    int? morningAthkarMinutes,
    int? eveningAthkarMinutes,
    int? athkarSnoozeMinutes,
    String? playerSource,
    bool? deviceMusicEnabled,
    bool? overlayEnabled,
    bool? overlayShowWhenAppClosed,
    String? wirdsJson,
  }) => SirajConfig(
    enabled: enabled ?? this.enabled,
    showInApp: showInApp ?? this.showInApp,
    liveNotification: liveNotification ?? this.liveNotification,
    theme: theme ?? this.theme,
    autoHide: autoHide ?? this.autoHide,
    dnd: dnd ?? this.dnd,
    alertPrayer: alertPrayer ?? this.alertPrayer,
    alertIqamah: alertIqamah ?? this.alertIqamah,
    alertAthkar: alertAthkar ?? this.alertAthkar,
    alertMedia: alertMedia ?? this.alertMedia,
    alertQuotes: alertQuotes ?? this.alertQuotes,
    quoteSource: quoteSource ?? this.quoteSource,
    quoteEveryMins: quoteEveryMins ?? this.quoteEveryMins,
    quoteShowSecs: quoteShowSecs ?? this.quoteShowSecs,
    capsuleSize: capsuleSize ?? this.capsuleSize,
    capsuleShape: capsuleShape ?? this.capsuleShape,
    capsuleAnimation: capsuleAnimation ?? this.capsuleAnimation,
    gestureTap: gestureTap ?? this.gestureTap,
    gestureDoubleTap: gestureDoubleTap ?? this.gestureDoubleTap,
    gestureLongPress: gestureLongPress ?? this.gestureLongPress,
    gestureSwipeUp: gestureSwipeUp ?? this.gestureSwipeUp,
    gestureSwipeDown: gestureSwipeDown ?? this.gestureSwipeDown,
    gestureSwipeLeft: gestureSwipeLeft ?? this.gestureSwipeLeft,
    gestureSwipeRight: gestureSwipeRight ?? this.gestureSwipeRight,
    capsuleWidthFrac:
        (capsuleWidthFrac ?? this.capsuleWidthFrac).clamp(0.0, 1.0),
    capsuleHeight: capsuleHeight ?? this.capsuleHeight,
    // See the STANDING RULE above: the prayer chip is never turned off.
    showPrayer: showPrayer ?? this.showPrayer,
    showAthkar: showAthkar ?? this.showAthkar,
    showQuotes: showQuotes ?? this.showQuotes,
    showMedia: showMedia ?? this.showMedia,
    showPlayer: showPlayer ?? this.showPlayer,
    autoHideIdleSecs: autoHideIdleSecs ?? this.autoHideIdleSecs,
    countdownFormat: countdownFormat ?? this.countdownFormat,
    capsuleAlign: capsuleAlign ?? this.capsuleAlign,
    capsuleTopOffset: capsuleTopOffset ?? this.capsuleTopOffset,
    capsuleDraggable: capsuleDraggable ?? this.capsuleDraggable,
    capsuleOpacity:
        (capsuleOpacity ?? this.capsuleOpacity).clamp(0.5, 1.0),
    capsuleAccentHex: capsuleAccentHex ?? this.capsuleAccentHex,
    adhanSound: adhanSound ?? this.adhanSound,
    remindBeforeMins: remindBeforeMins ?? this.remindBeforeMins,
    remindAfterMins: remindAfterMins ?? this.remindAfterMins,
    morningAthkarMinutes:
        morningAthkarMinutes ?? this.morningAthkarMinutes,
    eveningAthkarMinutes:
        eveningAthkarMinutes ?? this.eveningAthkarMinutes,
    athkarSnoozeMinutes:
        athkarSnoozeMinutes ?? this.athkarSnoozeMinutes,
    playerSource: playerSource ?? this.playerSource,
    deviceMusicEnabled: deviceMusicEnabled ?? this.deviceMusicEnabled,
    overlayEnabled: overlayEnabled ?? this.overlayEnabled,
    overlayShowWhenAppClosed:
        overlayShowWhenAppClosed ?? this.overlayShowWhenAppClosed,
    wirdsJson: wirdsJson ?? this.wirdsJson,
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

// ---- Capsule size preset + overlay drag geometry ----
//
// Pure helpers, shared by the in-app capsule (`siraj_capsule.dart`) and
// the overlay entrypoint (`siraj_overlay_entry.dart`), so both render the
// same pill at the same size. The overlay-window geometry helpers are
// also the contract for the native side: `SirajOverlayService.kt` mirrors
// [sirajClampOverlayPosition] and [sirajOverlayDefaultPosition] in px
// (Kotlin cannot be compiled on this machine, so the contract is tested
// here in Dart).

/// Width/height scale for a capsule size preset ('small' | 'normal' |
/// 'large'). Small is the default — the user's old prayer-island app was
/// a small capsule — and renders the pill compact. Unknown values fall
/// back to small, like the default.
double sirajCapsuleSizeScale(String size) => switch (size) {
  'large' => 1.12,
  'normal' => 1.0,
  _ => 0.85,
};

/// Collapsed-pill size for a [SirajState] kind, with the size preset
/// applied. Base widths per kind (idle 200, iqamah/adhan 236, athkar 340,
/// quote/media 360) and the configured height (36–64, default 44; a long
/// quote title uses 58) are the values the in-app capsule and the overlay
/// used before the preset existed, so 'normal' reproduces the old sizes
/// exactly. [maxWidth] caps the width: the in-app capsule passes its
/// width-fraction cap, the overlay passes the window's usable width
/// (360 dp inside the 380 dp window).
({double width, double height}) sirajCapsulePillSize({
  required SirajKind kind,
  required SirajConfig config,
  int titleLength = 0,
  double maxWidth = double.infinity,
}) {
  final scale = sirajCapsuleSizeScale(config.capsuleSize);
  final baseHeight = kind == SirajKind.quote && titleLength > 34
      ? 58.0
      : config.capsuleHeight.clamp(36.0, 64.0);
  final baseWidth = switch (kind) {
    SirajKind.idle => 200.0,
    SirajKind.iqamah => 236.0,
    SirajKind.adhanNow => 236.0,
    SirajKind.athkarDue => 340.0,
    SirajKind.quote => 360.0,
    SirajKind.media => 360.0,
  };
  return (
    width: math.min(baseWidth * scale, maxWidth),
    height: math.min(math.max(baseHeight * scale, 36.0), 64.0),
  );
}

/// Actions a capsule gesture can map to:
/// - 'prayer_times': open today's prayer times (expand the panel/card).
/// - 'siraj_tab': open the Siraj tab.
/// - 'play_pause': toggle music playback.
/// - 'dismiss': hide the current reminder (dismiss the card/panel).
/// - 'none': do nothing.
const List<String> sirajGestureActions = [
  'prayer_times',
  'siraj_tab',
  'play_pause',
  'dismiss',
  'none',
];

/// Normalises a stored gesture action; unknown values fall back to
/// [fallback] (the default for that gesture).
String sirajNormalizeGestureAction(String? value, String fallback) =>
    sirajGestureActions.contains(value) ? value! : fallback;

/// Normalises a stored capsule shape; anything but 'circle' is the pill.
String sirajNormalizeCapsuleShape(String? value) =>
    value == 'circle' ? 'circle' : 'pill';

/// Normalises a stored animation style; unknown values fall back to
/// 'fade'.
String sirajNormalizeCapsuleAnimation(String? value) => switch (value) {
  'slide' || 'off' => value!,
  _ => 'fade',
};

/// Diameter (dp) of the circle badge: 64 dp at 'normal', scaled by the
/// size preset, clamped to 48–80 dp.
double sirajCapsuleCircleDiameter(SirajConfig config) =>
    (64 * sirajCapsuleSizeScale(config.capsuleSize)).clamp(48.0, 80.0);

/// Height (dp) for an expanded panel/card that fits the screen: the
/// preferred height, capped so the box ends 16 dp above the screen bottom
/// (after the safe area). Never below 120 dp, so a short screen still
/// shows a usable, scrollable box instead of a sliver.
double sirajExpandedHeight({
  required double preferred,
  required double screenHeight,
  required double top,
  required double bottomPadding,
}) {
  final maxH = math.max(120.0, screenHeight - top - bottomPadding - 16);
  return math.min(preferred, maxH);
}

/// Fraction of the interval between the previous and the next adhan that
/// has elapsed (0..1) — the progress ring of the circle badge. 0 when no
/// previous prayer is known (e.g. before the first adhan of the range).
double sirajPrayerProgress({
  required DateTime now,
  required List<SirajDay> days,
}) {
  DateTime? prev;
  DateTime? next;
  for (final d in days) {
    for (final p in d.prayers) {
      if (!p.adhan.isAfter(now)) prev = p.adhan;
      if (p.adhan.isAfter(now) && next == null) next = p.adhan;
    }
  }
  if (prev == null || next == null) return 0;
  final total = next.difference(prev).inSeconds;
  if (total <= 0) return 0;
  return (now.difference(prev).inSeconds / total).clamp(0.0, 1.0);
}

/// Clamps an overlay window position (dp) so the window stays fully on
/// screen. A window wider/taller than the screen pins to (0, 0).
({double x, double y}) sirajClampOverlayPosition({
  required double x,
  required double y,
  required double windowWidth,
  required double windowHeight,
  required double screenWidth,
  required double screenHeight,
}) {
  final maxX = math.max(0.0, screenWidth - windowWidth);
  final maxY = math.max(0.0, screenHeight - windowHeight);
  return (x: x.clamp(0.0, maxX), y: y.clamp(0.0, maxY));
}

/// Default overlay position (dp): top-anchored, centred horizontally,
/// 8 dp below the status bar — the small island at the top of the screen,
/// like the user's old app. The user then drags it anywhere; the dragged
/// position is persisted and wins over this default on the next start.
({double x, double y}) sirajOverlayDefaultPosition({
  required double windowWidth,
  required double windowHeight,
  required double screenWidth,
  required double screenHeight,
  required double statusBarHeight,
}) => sirajClampOverlayPosition(
  x: (screenWidth - windowWidth) / 2,
  y: statusBarHeight + 8,
  windowWidth: windowWidth,
  windowHeight: windowHeight,
  screenWidth: screenWidth,
  screenHeight: screenHeight,
);

// ---- Heads-up notifications vs the overlay ----
//
// PLATFORM LIMIT (honest, by design): a heads-up notification banner is
// drawn by SystemUI *above* every app window, including a
// `TYPE_APPLICATION_OVERLAY` window — no window type available to a
// third-party app can draw over it. So when a banner (e.g. WhatsApp)
// appears, the island underneath it is covered for a few seconds, and
// the prayer countdown disappears from view.
//
// The fix is not to fight the z-order but to move: a
// `NotificationListenerService` (`SirajNotificationListener.kt`) reports
// posted/removed notifications to the overlay, and while a heads-up is
// showing the island shifts DOWN below the banner area, so the countdown
// stays visible (the capsule is NEVER hidden). When the banner is gone
// the island moves back to the user's saved position. The decision logic
// lives here, in pure Dart, so it is testable; the native side only
// forwards the events and moves the window.

/// The island's top edge (dp from the top of the screen) while a heads-up
/// banner is showing. A typical banner occupies roughly the status bar +
/// ~120 dp; 160 dp clears it with margin on most phones and ROMs. The
/// island only moves when its top is above this line (i.e. it would
/// actually be covered); an island already dragged lower stays put.
const double sirajHeadsUpClearYDp = 160.0;

/// How long after a heads-up posts the island moves back on its own.
/// Heads-up banners auto-dismiss after ~5 s; the extra margin covers
/// longer OEM banners. Dismissing the notification restores immediately,
/// without waiting for this timer.
const Duration sirajHeadsUpRestoreDelay = Duration(seconds: 8);

/// Shift/restore state machine for the heads-up dodge. Pure logic: given
/// the island's current top edge, [onHeadsUpShown] returns the y to move
/// to (or null when no move is needed), and [restore] returns the saved y
/// to move back to (or null when not shifted). The overlay entrypoint
/// owns one instance and drives the window moves + the restore timer.
class SirajOverlayShift {
  double? _savedY;

  /// True while the island is shifted down for a heads-up.
  bool get isShifted => _savedY != null;

  /// The pre-shift top edge, while shifted; null otherwise.
  double? get savedY => _savedY;

  /// A heads-up banner appeared. Returns the y to move the island to, or
  /// null when it should stay: already shifted (the caller restarts the
  /// restore timer instead), or already below the banner area.
  double? onHeadsUpShown({
    required double currentY,
    double clearY = sirajHeadsUpClearYDp,
  }) {
    if (_savedY != null) return null;
    if (currentY >= clearY) return null;
    _savedY = currentY;
    return clearY;
  }

  /// The banner is gone. Returns the y to move back to, or null when the
  /// island was not shifted.
  double? restore() {
    final y = _savedY;
    _savedY = null;
    return y;
  }
}

// ---- Android live capsule plan ----

class SirajLiveEntry {
  /// When this notification should be posted.
  final DateTime time;
  final String title;
  final String body;

  /// Where the native chronometer counts down to.
  /// For Athkar entries this is still the next prayer: prayer time stays
  /// the most important thing, even while an Athkar reminder is showing.
  final DateTime countdownTarget;
  final bool iqamahPhase;
  final String? prayerId;

  /// True for an Athkar reminder entry.
  final bool isAthkar;
  final SirajAthkar? athkar;

  const SirajLiveEntry({
    required this.time,
    required this.title,
    required this.body,
    required this.countdownTarget,
    required this.iqamahPhase,
    this.prayerId,
    this.isAthkar = false,
    this.athkar,
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

/// One Athkar reminder window: morning is Fajr+20min until Sunrise+3h,
/// evening is Asr+15min until Maghrib (same windows as the in-app capsule).
List<({DateTime start, DateTime end, SirajAthkar type})> _athkarWindows(
  List<SirajDay> days,
) {
  final out = <({DateTime start, DateTime end, SirajAthkar type})>[];
  for (final d in days) {
    out.add((
      start: d.prayer('fajr').adhan.add(athkarMorningAfterFajr),
      end: d.sunrise.add(athkarMorningAfterSunrise),
      type: SirajAthkar.morning,
    ));
    out.add((
      start: d.prayer('asr').adhan.add(athkarEveningAfterAsr),
      end: d.prayer('maghrib').adhan,
      type: SirajAthkar.evening,
    ));
  }
  out.sort((a, b) => a.start.compareTo(b.start));
  return out;
}

SirajLiveEntry _athkarEntry(
  DateTime at,
  SirajAthkar type,
  SirajPrayer next,
) {
  final label = type == SirajAthkar.morning ? 'أذكار الصباح' : 'أذكار المساء';
  return SirajLiveEntry(
    time: at,
    title: 'سِراج · $label',
    body: 'حان وقت $label · متبقٍ على أذان ${next.label} (${sirajClock(next.adhan)})',
    // The chronometer keeps counting down to the next prayer.
    countdownTarget: next.adhan,
    iqamahPhase: false,
    prayerId: next.id,
    isAthkar: true,
    athkar: type,
  );
}

/// The chain of notifications for the next [horizon]: the first entry is "now"
/// (post immediately), then one at every adhan (iqamah countdown) and every
/// iqamah end (next-prayer countdown). Athkar windows add one reminder entry
/// at the window start (counting down to the next prayer, never hiding it)
/// plus a prayer entry 30 minutes later so the capsule goes back to the
/// prayer countdown. If "now" is already inside an Athkar window, the first
/// (prayer) entry mentions the Athkar in its body instead of being replaced.
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

  // Athkar reminders on the lock screen too (see doc comment above).
  const athkarShow = Duration(minutes: 30);
  final windows = _athkarWindows(days);
  for (final w in windows) {
    if (w.start.isAfter(end) || !w.end.isAfter(now)) continue;
    // Next prayer after the window starts (the chronometer target).
    SirajPrayer? nextAfterStart;
    for (final p in prayers) {
      if (p.adhan.isAfter(w.start)) {
        nextAfterStart = p;
        break;
      }
    }
    if (nextAfterStart == null) continue;
    if (w.start.isAfter(now)) {
      entries.add(_athkarEntry(w.start, w.type, nextAfterStart));
      final resumeAt = w.start.add(athkarShow);
      if (resumeAt.isBefore(end) &&
          resumeAt.isBefore(nextAfterStart.adhan)) {
        entries.add(_nextEntry(resumeAt, nextAfterStart));
      }
    }
  }

  entries.sort((a, b) => a.time.compareTo(b.time));
  // Dedupe by time: an Athkar entry wins a slot shared with a prayer entry
  // (e.g. a morning window starting exactly at an iqamah end).
  final deduped = <SirajLiveEntry>[];
  for (final e in entries) {
    if (deduped.isNotEmpty && deduped.last.time == e.time) {
      if (e.isAthkar) deduped[deduped.length - 1] = e;
      continue;
    }
    deduped.add(e);
  }

  // "Now" inside an Athkar window: mention it in the first entry's body,
  // keeping its prayer title and countdown.
  if (deduped.isNotEmpty) {
    for (final w in windows) {
      if (!now.isBefore(w.start) && now.isBefore(w.end)) {
        final first = deduped.first;
        if (!first.isAthkar) {
          final label = w.type == SirajAthkar.morning
              ? 'أذكار الصباح'
              : 'أذكار المساء';
          deduped[0] = SirajLiveEntry(
            time: first.time,
            title: first.title,
            body: '$label الآن · ${first.body}',
            countdownTarget: first.countdownTarget,
            iqamahPhase: first.iqamahPhase,
            prayerId: first.prayerId,
          );
        }
        break;
      }
    }
  }
  return deduped;
}
