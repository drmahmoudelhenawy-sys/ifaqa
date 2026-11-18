import '../models/prayer_time_info.dart';
import '../services/app_state.dart';
import '../services/audio_service.dart';
import 'siraj_state.dart';

/// Siraj preferences, stored in [AppState] (flags/text with the `siraj_` prefix).
///
/// Keys: siraj_enabled, siraj_in_app, siraj_live, siraj_theme, siraj_autohide,
/// siraj_dnd, siraj_k_prayer, siraj_k_iqamah, siraj_k_athkar, siraj_k_media,
/// siraj_k_quotes, siraj_quote_src; plus the per-day list `siraj_athkar`.
class SirajSettings {
  SirajSettings._();

  static const enabledKey = 'siraj_enabled';
  static const inAppKey = 'siraj_in_app';
  static const liveKey = 'siraj_live';
  static const themeKey = 'siraj_theme';
  static const autoHideKey = 'siraj_autohide';
  static const dndKey = 'siraj_dnd';
  static const kPrayerKey = 'siraj_k_prayer';
  static const kIqamahKey = 'siraj_k_iqamah';
  static const kAthkarKey = 'siraj_k_athkar';
  static const kMediaKey = 'siraj_k_media';
  static const kQuotesKey = 'siraj_k_quotes';
  static const quoteSrcKey = 'siraj_quote_src';
  static const athkarDayList = 'siraj_athkar';

  static AppState get _s => AppState.instance;

  static SirajConfig config() => SirajConfig(
    enabled: _s.flag(enabledKey, fallback: true),
    showInApp: _s.flag(inAppKey, fallback: true),
    liveNotification: _s.flag(liveKey, fallback: true),
    theme: _s.text(themeKey) ?? 'night',
    autoHide: _s.flag(autoHideKey),
    dnd: _s.flag(dndKey),
    alertPrayer: _s.flag(kPrayerKey, fallback: true),
    alertIqamah: _s.flag(kIqamahKey, fallback: true),
    alertAthkar: _s.flag(kAthkarKey, fallback: true),
    alertMedia: _s.flag(kMediaKey, fallback: true),
    alertQuotes: _s.flag(kQuotesKey, fallback: true),
    quoteSource: switch (_s.text(quoteSrcKey)) {
      'quran' => SirajQuoteChoice.quran,
      'hadith' => SirajQuoteChoice.hadith,
      _ => SirajQuoteChoice.both,
    },
  );

  /// Whether the in-app capsule (and so not the old iqamah banner) is active.
  static bool get visibleInApp {
    final c = config();
    return c.enabled && c.showInApp;
  }

  /// Only the inputs of the live notification plan; used to detect changes.
  static String liveSignature() {
    final c = config();
    final loc = _s.location;
    return [
      c.enabled,
      c.liveNotification,
      c.theme,
      c.dnd,
      loc.latitude.toStringAsFixed(2),
      loc.longitude.toStringAsFixed(2),
    ].join('|');
  }

  static bool athkarDoneToday(SirajAthkar type, [DateTime? at]) =>
      _s.dayHas(at ?? DateTime.now(), athkarDayList, type.name);

  static void markAthkarDone(SirajAthkar type, [DateTime? at]) {
    final day = at ?? DateTime.now();
    if (!_s.dayHas(day, athkarDayList, type.name)) {
      _s.toggleDayItem(day, athkarDayList, type.name);
    }
  }

  static SirajSignals signals([DateTime? at]) {
    final now = at ?? DateTime.now();
    final audio = AudioService.instance;
    final done = <String>{};
    for (final id in prayerIds) {
      if (_s.prayerStatus(now, id).name != 'none') {
        done.add('${sirajDateKey(now)}/$id');
      }
    }
    return SirajSignals(
      athkarMorningDone: athkarDoneToday(SirajAthkar.morning, now),
      athkarEveningDone: athkarDoneToday(SirajAthkar.evening, now),
      mediaTitle: audio.now?.title,
      mediaSubtitle: audio.now?.subtitle,
      mediaPlaying: audio.now != null && audio.playing,
      fridayKahf: _s.flag('notif_kahf_friday'),
      donePrayers: done,
    );
  }
}

/// Prayer days from [from] days before today to [to] days after, for [location].
List<SirajDay> buildSirajDays(
  AppLocation location,
  DateTime now, {
  int from = -1,
  int to = 2,
}) {
  final iqama = {
    for (final p in buildPrayerTimes(location))
      p.key.toLowerCase(): p.iqamaMins,
  };
  final today = DateTime(now.year, now.month, now.day);
  final days = <SirajDay>[];
  for (var offset = from; offset <= to; offset++) {
    final date = DateTime(today.year, today.month, today.day + offset);
    final t = prayerTimesOn(location, date);
    // Whole minutes, like every other prayer time shown in the app.
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
