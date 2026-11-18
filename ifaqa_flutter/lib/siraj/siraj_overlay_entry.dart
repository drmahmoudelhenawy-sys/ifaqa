import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../models/prayer_time_info.dart';
import '../services/app_state.dart';
import 'siraj_reminders.dart';
import 'siraj_settings.dart';
import 'siraj_state.dart';

/// Second Dart entrypoint for the Siraj overlay over other apps.
///
/// Runs in a separate isolate on a second FlutterEngine owned by
/// `SirajOverlayService` (Kotlin, `android/app/src/main/kotlin/.../`).
/// It cannot read the main isolate's in-memory state, so it recomputes
/// everything from SharedPreferences (via [AppState]) and the pure
/// functions in [siraj_state.dart] / [siraj_settings.dart]
/// ([buildSirajDays], [computeSirajState]), ticking with its own [Timer].
///
/// STANDING RULE — prayer time is the most important thing and must ALWAYS
/// be visible: the capsule always shows the next prayer + countdown, even
/// if every other content kind is off (same rule as
/// `SirajSettings.config()` forcing `showPrayer` to `true`).
///
/// Prayer times are ALWAYS Africa/Cairo, never the device timezone:
/// [buildSirajDays] is called with `cairo: true`, and "now" is
/// `tz.TZDateTime.now(Africa/Cairo)`, so the countdown is correct even on
/// a device set to another timezone.
///
/// Tapping the capsule opens the app: the Dart side sends `openApp` on the
/// `siraj_overlay` channel and the Kotlin service starts MainActivity
/// (`FLAG_ACTIVITY_NEW_TASK`). The overlay window is a fixed 380x76 dp
/// (see `SirajOverlayService.kt`); the capsule is centred in it, so the
/// touchable area stays small and touches outside the capsule reach the
/// app below.
///
/// The main isolate can change settings / location while the overlay is
/// up; the overlay isolate's SharedPreferences cache is refreshed with
/// `reload()` every 15 seconds, so those changes propagate.
///
/// If [AppState] cannot be initialised (e.g. the plugin was not
/// registered on the overlay engine), the overlay falls back to the
/// default config and the default (Cairo) location instead of crashing —
/// prayer times are still shown.
@pragma('vm:entry-point')
Future<void> sirajOverlayMain() async {
  WidgetsFlutterBinding.ensureInitialized();
  tzdata.initializeTimeZones();
  var prefsReady = false;
  try {
    await AppState.init();
    prefsReady = true;
  } catch (e) {
    debugPrint('siraj overlay: AppState.init failed: $e');
  }
  runApp(SirajOverlayApp(prefsReady: prefsReady));
}

class SirajOverlayApp extends StatelessWidget {
  final bool prefsReady;
  const SirajOverlayApp({super.key, required this.prefsReady});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      locale: const Locale('ar'),
      builder: (context, child) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: child!,
        );
      },
      home: _OverlayHome(prefsReady: prefsReady),
    );
  }
}

/// Capsule colours. Mirrors `sirajThemes` in `siraj_capsule.dart`
/// (night / emerald / gold) — duplicated here so the overlay isolate does
/// not have to import the full in-app capsule and its screens.
class _OverlayTheme {
  final Color bgTop;
  final Color bgBottom;
  final Color accent;
  const _OverlayTheme(this.bgTop, this.bgBottom, this.accent);
}

_OverlayTheme _overlayTheme(SirajConfig config) {
  final base = switch (config.theme) {
    'emerald' => const _OverlayTheme(
      Color(0xFF07382C),
      Color(0xFF031C16),
      Color(0xFF34D399),
    ),
    'gold' => const _OverlayTheme(
      Color(0xFF2E2108),
      Color(0xFF150E03),
      Color(0xFFFCD34D),
    ),
    _ => const _OverlayTheme(
      Color(0xFF0A0D12),
      Color(0xFF020304),
      Color(0xFFFBBF24),
    ),
  };
  final accent = _accentOverride(config);
  if (accent == null) return base;
  return _OverlayTheme(base.bgTop, base.bgBottom, accent);
}

/// Accent override from settings (hex like '#10B981'), or null for the
/// theme accent. Same parsing as the in-app capsule.
Color? _accentOverride(SirajConfig config) {
  final hex = config.capsuleAccentHex;
  if (hex == null || hex.isEmpty) return null;
  final clean = hex.replaceFirst('#', '');
  final value = int.tryParse(clean, radix: 16);
  if (value == null) return null;
  return Color(clean.length == 6 ? 0xFF000000 | value : value);
}

class _OverlayHome extends StatefulWidget {
  final bool prefsReady;
  const _OverlayHome({required this.prefsReady});

  @override
  State<_OverlayHome> createState() => _OverlayHomeState();
}

class _OverlayHomeState extends State<_OverlayHome> {
  static const MethodChannel _channel = MethodChannel('siraj_overlay');

  bool _ready = false;
  SharedPreferences? _prefs;
  SirajConfig _config = const SirajConfig();
  AppLocation _location = AppLocation.cairo;
  List<SirajDay> _days = const [];
  String _daysSignature = '';
  SirajPrayer? _nextPrayer;
  SirajState _state = const SirajState(
    kind: SirajKind.idle,
    title: 'سِراج',
    priority: SirajPriority.idle,
    key: 'idle',
  );
  Timer? _tick;
  Timer? _reloadTimer;

  @override
  void initState() {
    super.initState();
    _ready = widget.prefsReady;
    if (_ready) {
      // Same singleton AppState uses; reload() below refreshes its cache.
      SharedPreferences.getInstance().then(
        (p) => _prefs = p,
        onError: (_) {},
      );
    }
    _recompute();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) => _recompute());
    // Settings / location can change in the main isolate while the overlay
    // is up; refresh the prefs cache so the overlay follows them.
    _reloadTimer = Timer.periodic(const Duration(seconds: 15), (_) async {
      try {
        await _prefs?.reload();
      } catch (_) {}
      _recompute();
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    _reloadTimer?.cancel();
    super.dispose();
  }

  // ---- State ----

  void _recompute() {
    final now = tz.TZDateTime.now(cairoLocation);
    if (_ready) {
      try {
        _config = SirajSettings.config();
        _location = AppState.instance.location;
      } catch (e) {
        debugPrint('siraj overlay: config read failed: $e');
        _ready = false;
      }
    }
    final sig =
        '${sirajDateKey(now)}|${_location.latitude.toStringAsFixed(2)}|${_location.longitude.toStringAsFixed(2)}';
    if (sig != _daysSignature) {
      _daysSignature = sig;
      _days = buildSirajDays(_location, now, cairo: true);
    }
    // The next prayer, for the prayer chip: the capsule always shows the
    // prayer time, even while it is showing Athkar or a quote.
    SirajPrayer? next;
    for (final d in _days) {
      for (final p in d.prayers) {
        if (p.adhan.isAfter(now)) {
          next = p;
          break;
        }
      }
      if (next != null) break;
    }
    _nextPrayer = next;
    final top = computeSirajState(
      now: now,
      days: _days,
      config: _config,
      signals: _signals(now),
    );
    _state = _effectivePillState(top);
    if (mounted) setState(() {});
  }

  /// Signals for the state computation, read from SharedPreferences. No
  /// media signals: the overlay isolate cannot see the main isolate's
  /// audio state, so the media kind never wins here.
  SirajSignals _signals(DateTime now) {
    if (!_ready) return const SirajSignals();
    final done = <String>{};
    for (final id in prayerIds) {
      if (AppState.instance.prayerStatus(now, id).name != 'none') {
        done.add('${sirajDateKey(now)}/$id');
      }
    }
    return SirajSignals(
      athkarMorningDone:
          SirajSettings.athkarDoneToday(SirajAthkar.morning, now),
      athkarEveningDone:
          SirajSettings.athkarDoneToday(SirajAthkar.evening, now),
      fridayKahf: AppState.instance.flag('notif_kahf_friday'),
      donePrayers: done,
    );
  }

  /// Whether a pill kind is allowed to show (content toggles). The prayer
  /// chip is never hidden — see the STANDING RULE in siraj_state.dart.
  bool _contentVisible(SirajKind kind) {
    switch (kind) {
      case SirajKind.athkarDue:
        return _config.showAthkar;
      case SirajKind.quote:
        return _config.showQuotes;
      case SirajKind.media:
        return _config.showMedia;
      default:
        return true;
    }
  }

  /// A pill state with hidden kinds replaced by the idle prayer countdown,
  /// so prayer time stays visible even when every other kind is off.
  SirajState _effectivePillState(SirajState s) {
    if (_contentVisible(s.kind)) return s;
    final p = _nextPrayer;
    return SirajState(
      kind: SirajKind.idle,
      title: p?.label ?? 'سِراج',
      subtitle: 'بعد',
      target: p?.adhan,
      priority: SirajPriority.idle,
      key: 'idle',
      prayerId: p?.id,
    );
  }

  /// Pill size, mirroring the in-app capsule's collapsed sizes. The window
  /// is 380x76 dp, so the widest pill (360) fits with room for its shadow.
  /// `capsuleWidthFrac` is ignored: the window cannot resize.
  Size _pillSize(SirajState s) {
    double h = _config.capsuleHeight.clamp(36.0, 64.0);
    double w;
    switch (s.kind) {
      case SirajKind.idle:
        w = 200;
      case SirajKind.iqamah:
        w = 236;
      case SirajKind.adhanNow:
        w = 236;
      case SirajKind.athkarDue:
        w = 340;
      case SirajKind.quote:
        w = 360;
        if (s.title.length > 34) h = 58;
      case SirajKind.media:
        w = 360;
    }
    return Size(w, h);
  }

  Future<void> _openApp() async {
    try {
      await _channel.invokeMethod('openApp');
    } on MissingPluginException catch (e) {
      debugPrint('siraj overlay openApp unavailable: $e');
    } on PlatformException catch (e) {
      debugPrint('siraj overlay openApp failed: $e');
    }
  }

  // ---- Build ----

  TextStyle _t(
    double size, {
    Color color = Colors.white,
    FontWeight weight = FontWeight.w800,
    String? font,
  }) => TextStyle(
    fontSize: size,
    fontWeight: weight,
    color: color,
    fontFamily: font ?? 'Cairo',
    height: 1.25,
    fontFeatures: const [FontFeature.tabularFigures()],
  );

  /// "العصر ٠١:٢٣" — the next prayer and its countdown. Shown in every pill
  /// that is not itself about a prayer, so the prayer time is always visible.
  Widget _prayerChip(_OverlayTheme theme) {
    final p = _nextPrayer;
    if (p == null) return const SizedBox.shrink();
    final left = p.adhan.difference(DateTime.now());
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.mosque_rounded, size: 15, color: theme.accent),
        const SizedBox(width: 5),
        Text(
          '${p.label} ${sirajFormatCountdown(left, _config.countdownFormat)}',
          style: _t(12, color: theme.accent, weight: FontWeight.w900),
        ),
      ],
    );
  }

  Widget _pillDivider() => Container(
    width: 1,
    height: 18,
    margin: const EdgeInsets.symmetric(horizontal: 8),
    color: Colors.white24,
  );

  Widget _pillContent(_OverlayTheme theme) {
    final s = _state;
    final accent = theme.accent;
    Widget icon(IconData i, [Color? c]) =>
        Icon(i, size: 17, color: c ?? accent);
    Widget line;
    switch (s.kind) {
      case SirajKind.idle:
      case SirajKind.iqamah:
        final left = s.target?.difference(DateTime.now());
        final iq = s.kind == SirajKind.iqamah;
        line = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            icon(
              iq
                  ? Icons.notifications_active_rounded
                  : Icons.nightlight_round,
              iq ? const Color(0xFF34D399) : accent,
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '${s.title} ${s.target == null ? '' : 'بعد '}',
                    ),
                    if (left != null)
                      TextSpan(
                        text: sirajFormatCountdown(
                          left,
                          _config.countdownFormat,
                        ),
                        style: _t(
                          13,
                          color: iq ? const Color(0xFF34D399) : accent,
                          weight: FontWeight.w900,
                        ),
                      ),
                  ],
                ),
                style: _t(12.5),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      case SirajKind.adhanNow:
        line = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            icon(Icons.mosque_rounded),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                s.title,
                style: _t(12.5),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      case SirajKind.athkarDue:
        line = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _prayerChip(theme),
            _pillDivider(),
            icon(
              s.athkar == SirajAthkar.morning
                  ? Icons.wb_sunny_rounded
                  : Icons.nights_stay_rounded,
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                s.title,
                style: _t(12.5),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      case SirajKind.quote:
        line = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _prayerChip(theme),
            _pillDivider(),
            icon(Icons.auto_awesome),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                s.title,
                style: _t(14, font: 'Amiri', weight: FontWeight.w700),
                maxLines: s.title.length > 34 ? 2 : 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
            ),
          ],
        );
      case SirajKind.media:
        line = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _prayerChip(theme),
            _pillDivider(),
            icon(Icons.graphic_eq_rounded),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                s.title,
                style: _t(12.5),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
    }
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Center(child: line),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Siraj off: show nothing (the window stays until the service is
    // stopped from the settings toggle / notification action).
    if (!_config.enabled) return const SizedBox.shrink();
    final theme = _overlayTheme(_config);
    final size = _pillSize(_state);
    final radius = size.height / 2;
    final align = switch (_config.capsuleAlign) {
      'left' => Alignment.centerLeft,
      'right' => Alignment.centerRight,
      _ => Alignment.center,
    };
    return Container(
      color: Colors.transparent,
      alignment: align,
      child: GestureDetector(
        onTap: _openApp,
        child: Opacity(
          opacity: _config.capsuleOpacity.clamp(0.5, 1.0),
          child: Container(
            width: size.width,
            height: size.height,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(radius),
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [theme.bgTop, theme.bgBottom],
              ),
              border: Border.all(
                color: theme.accent.withValues(alpha: 0.2),
                width: 0.8,
              ),
              boxShadow: [
                BoxShadow(
                  color: theme.accent.withValues(alpha: 0.18),
                  blurRadius: 22,
                  spreadRadius: -2,
                ),
                const BoxShadow(
                  color: Color(0x66000000),
                  blurRadius: 14,
                  offset: Offset(0, 5),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(radius),
              child: Material(
                type: MaterialType.transparency,
                child: _pillContent(theme),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
