import '../models/prayer_time_info.dart';
import '../services/app_state.dart';
import '../services/audio_service.dart';
import 'siraj_reminders.dart';
import 'siraj_state.dart';

/// Siraj preferences, stored in [AppState] (flags/text with the `siraj_` prefix).
///
/// Keys: siraj_enabled, siraj_in_app, siraj_live, siraj_theme, siraj_autohide,
/// siraj_dnd, siraj_k_prayer, siraj_k_iqamah, siraj_k_athkar, siraj_k_media,
/// siraj_k_quotes, siraj_quote_src; plus the per-day list `siraj_athkar`.
/// New keys (all `siraj_` prefixed): siraj_capsule_width_frac,
/// siraj_capsule_height, siraj_show_prayer, siraj_show_athkar,
/// siraj_show_quotes, siraj_show_media, siraj_show_player,
/// siraj_autohide_idle_secs, siraj_countdown_format, siraj_capsule_align,
/// siraj_capsule_top_offset, siraj_capsule_draggable, siraj_capsule_opacity,
/// siraj_capsule_accent_hex, siraj_adhan_sound, siraj_remind_before_mins,
/// siraj_remind_after_mins, siraj_morning_athkar_minutes,
/// siraj_evening_athkar_minutes, siraj_player_source,
/// siraj_device_music_enabled, siraj_overlay_enabled,
/// siraj_overlay_show_when_app_closed, siraj_wirds_json.
///
/// Doubles and nullable ints are stored as text (AppState has no double
/// getter): doubles via [AppState.text]/[AppState.setText] parsed with
/// `double.tryParse`, nullable minute values the same way with `int.tryParse`
/// (missing/invalid = null = follow the prayer-relative default).
///
/// STANDING RULE: prayer time is the most important thing and must ALWAYS
/// be visible. [config] therefore forces `showPrayer` to `true` regardless
/// of any stored value — the prayer chip is never hidden.
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

  // Capsule appearance / layout.
  static const capsuleWidthFracKey = 'siraj_capsule_width_frac';
  static const capsuleHeightKey = 'siraj_capsule_height';
  static const showPrayerKey = 'siraj_show_prayer';
  static const showAthkarKey = 'siraj_show_athkar';
  static const showQuotesKey = 'siraj_show_quotes';
  static const showMediaKey = 'siraj_show_media';
  static const showPlayerKey = 'siraj_show_player';
  static const autoHideIdleSecsKey = 'siraj_autohide_idle_secs';
  static const countdownFormatKey = 'siraj_countdown_format';
  static const capsuleAlignKey = 'siraj_capsule_align';
  static const capsuleTopOffsetKey = 'siraj_capsule_top_offset';
  static const capsuleDraggableKey = 'siraj_capsule_draggable';
  static const capsuleOpacityKey = 'siraj_capsule_opacity';
  static const capsuleAccentHexKey = 'siraj_capsule_accent_hex';

  // Reminders / sound.
  static const adhanSoundKey = 'siraj_adhan_sound';
  static const remindBeforeMinsKey = 'siraj_remind_before_mins';
  static const remindAfterMinsKey = 'siraj_remind_after_mins';
  static const morningAthkarMinutesKey = 'siraj_morning_athkar_minutes';
  static const eveningAthkarMinutesKey = 'siraj_evening_athkar_minutes';

  // Player / overlay.
  static const playerSourceKey = 'siraj_player_source';
  static const deviceMusicEnabledKey = 'siraj_device_music_enabled';
  static const overlayEnabledKey = 'siraj_overlay_enabled';
  static const overlayShowWhenAppClosedKey =
      'siraj_overlay_show_when_app_closed';

  // Wirds (JSON list, see siraj_reminders.dart for the format).
  static const wirdsJsonKey = 'siraj_wirds_json';

  static AppState get _s => AppState.instance;

  static double _double(String key, double fallback) {
    final raw = _s.text(key);
    if (raw == null) return fallback;
    return double.tryParse(raw) ?? fallback;
  }

  static int? _nullableMinutes(String key) {
    final raw = _s.text(key);
    if (raw == null || raw.isEmpty) return null;
    final value = int.tryParse(raw);
    if (value == null || value < 0 || value >= 24 * 60) return null;
    return value;
  }

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
    capsuleWidthFrac:
        _double(capsuleWidthFracKey, 0.92).clamp(0.0, 1.0),
    capsuleHeight: _double(capsuleHeightKey, 44.0),
    // STANDING RULE: the prayer chip is always on (see class doc).
    showPrayer: true,
    showAthkar: _s.flag(showAthkarKey, fallback: true),
    showQuotes: _s.flag(showQuotesKey, fallback: true),
    showMedia: _s.flag(showMediaKey, fallback: true),
    showPlayer: _s.flag(showPlayerKey, fallback: true),
    autoHideIdleSecs:
        _s.number(autoHideIdleSecsKey) < 0
            ? 0
            : _s.number(autoHideIdleSecsKey),
    countdownFormat: switch (_s.text(countdownFormatKey)) {
      'min_only' => 'min_only',
      _ => 'min_sec',
    },
    capsuleAlign: switch (_s.text(capsuleAlignKey)) {
      'left' || 'right' => _s.text(capsuleAlignKey)!,
      _ => 'center',
    },
    capsuleTopOffset: _double(capsuleTopOffsetKey, 0.0),
    capsuleDraggable: _s.flag(capsuleDraggableKey, fallback: true),
    capsuleOpacity: _double(capsuleOpacityKey, 1.0).clamp(0.5, 1.0),
    capsuleAccentHex: _s.text(capsuleAccentHexKey),
    adhanSound: _s.text(adhanSoundKey) ?? 'cairo',
    remindBeforeMins:
        _s.number(remindBeforeMinsKey, fallback: 10) < 0
            ? 0
            : _s.number(remindBeforeMinsKey, fallback: 10),
    remindAfterMins:
        _s.number(remindAfterMinsKey, fallback: 10) < 0
            ? 0
            : _s.number(remindAfterMinsKey, fallback: 10),
    morningAthkarMinutes: _nullableMinutes(morningAthkarMinutesKey),
    eveningAthkarMinutes: _nullableMinutes(eveningAthkarMinutesKey),
    playerSource: switch (_s.text(playerSourceKey)) {
      'device' => 'device',
      _ => 'app',
    },
    deviceMusicEnabled: _s.flag(deviceMusicEnabledKey),
    overlayEnabled: _s.flag(overlayEnabledKey),
    overlayShowWhenAppClosed: _s.flag(overlayShowWhenAppClosedKey),
    wirdsJson: _s.text(wirdsJsonKey) ?? '',
  );

  /// The user-defined wirds, decoded from [wirdsJsonKey].
  /// JSON format: a list of objects
  /// `{id, name, kind, enabled, afterPrayers, fixedMinutes}` — see
  /// [SirajWird] / [decodeSirajWirdsJson]. Invalid JSON yields `[]`.
  static List<SirajWird> wirds() =>
      decodeSirajWirdsJson(_s.text(wirdsJsonKey) ?? '');

  /// Persist [wirds] as JSON under [wirdsJsonKey].
  static void saveWirds(List<SirajWird> wirds) {
    _s.setText(wirdsJsonKey, encodeSirajWirdsJson(wirds));
  }

  /// Whether the in-app capsule (and so not the old iqamah banner) is active.
  static bool get visibleInApp {
    final c = config();
    return c.enabled && c.showInApp;
  }

  /// Only the inputs of the live notification plan; used to detect changes.
  /// Includes the reminder/athkar timing inputs, because they change when
  /// the live plan's Athkar entries fire (morning/evening Athkar times,
  /// before/after-prayer reminder offsets, and the alert flags that gate
  /// those entries), plus the adhan sound the live notification uses.
  static String liveSignature() {
    final c = config();
    final loc = _s.location;
    return [
      c.enabled,
      c.liveNotification,
      c.theme,
      c.dnd,
      c.alertPrayer,
      c.alertIqamah,
      c.alertAthkar,
      c.adhanSound,
      c.remindBeforeMins,
      c.remindAfterMins,
      c.morningAthkarMinutes,
      c.eveningAthkarMinutes,
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
