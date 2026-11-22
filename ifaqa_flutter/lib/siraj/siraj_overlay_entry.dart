import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../models/prayer_time_info.dart';
import '../services/app_state.dart';
import 'siraj_island_views.dart';
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
/// a device set to another timezone. (`cairo: true` is about the *timezone*,
/// not the city: the times are computed for the SAVED location — the
/// user's home city Sohag by default, see [AppLocation.sohag] — in the
/// Africa/Cairo timezone, which Sohag shares with Cairo.)
///
/// Tapping the capsule opens the app: the Dart side sends `openApp` on the
/// `siraj_overlay` channel and the Kotlin service starts MainActivity
/// (`FLAG_ACTIVITY_NEW_TASK`). The overlay window is a fixed 380x76 dp
/// bounding box (see `SirajOverlayService.kt`); the capsule is centred in
/// it, so the touchable area stays small and touches outside the capsule
/// reach the app below. The window itself is FREELY draggable: dragging
/// the capsule moves the `WindowManager` window live to the absolute
/// position the Dart side tracks (`moveOverlayTo`); on release the service
/// persists the position (`saveOverlayPosition`) and the capsule reopens
/// where it was left — no left/center/right preset. The default position
/// is top-anchored and centred (see `sirajOverlayDefaultPosition`), and
/// the default size is small (see `SirajConfig.capsuleSize`).
///
/// EXPANDED ISLAND: tapping an Athkar pill (or a notification "اقرأ الآن"
/// action, which leaves a pending view in SharedPreferences) expands the
/// window to a tall panel (380x~480 dp, via `setOverlaySize`) with the
/// full Athkar reader (morning/evening chooser, per-zekr counting,
/// "اقرأ لاحقًا" snooze) and a Tasbih tab sharing the app's counter.
/// Collapsing restores the 76 dp window and moves it back to where it was
/// before expanding. The panel header is draggable; the content scrolls.
/// While expanded, the heads-up dodge is off (the tall panel stays put)
/// and the prayer chip in the header keeps the countdown visible.
///
/// Heads-up notifications (e.g. WhatsApp) are drawn by SystemUI ABOVE
/// every app window and cannot be drawn over — so while one is showing,
/// the island shifts DOWN below the banner instead of being covered (see
/// [SirajOverlayShift] in `siraj_state.dart`): the native
/// `SirajNotificationListener` forwards `headsUpShown` / `headsUpHidden`
/// on this channel, the Dart side decides the move, and the island
/// returns to its saved position when the banner is gone (or after
/// [sirajHeadsUpRestoreDelay]). The countdown is never hidden.
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
  AppLocation _location = AppLocation.sohag;
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

  // ---- Overlay window position (dp) ----
  //
  // The window position is owned by the native service, but the Dart side
  // tracks it so drags and the heads-up dodge can compute absolute moves
  // (clamped with [sirajClampOverlayPosition]). Tracked values are seeded
  // from the service at startup and re-synced on drag start and on
  // heads-up events; the service still clamps defensively, so a stale
  // track (e.g. after rotation) can never push the window off-screen.
  double _winX = 0;
  double _winY = 0;
  double _screenW = 0;
  double _screenH = 0;
  bool _positionReady = false;

  // ---- Capsule position inside the window (dp) ----
  //
  // The old native app's CameraPlacement principle: clamp the VISIBLE
  // capsule to the screen, not the fixed 380x76 window. The window stays
  // clamped by the service; when its clamp saturates at a screen edge,
  // the capsule keeps tracking the finger by moving INSIDE the window —
  // [_capInsetX] / [_capInsetY] are its offset from the window's centre.
  // Without this, the capsule stops a half-window short of every edge
  // and upward drags hit a dead zone (the bug class the native v9 fixed
  // in CameraPlacement.kt). Persisted on drag end so a capsule left at
  // an edge reopens at the edge.
  double _capInsetX = 0;
  double _capInsetY = 0;

  // ---- Gestures ----
  //
  // Session-local countdown-format flip from the 'toggle_time' gesture
  // (the time press; mirrors the old native app's 'toggle'). The stored
  // setting is never rewritten.
  bool _timeFormatToggled = false;
  // Session-local dismissed reminder keys (counterpart of the in-app
  // capsule's _dismissed set); a dismissed state falls back to the idle
  // prayer countdown until its key changes.
  final Set<String> _dismissed = {};
  // Drag accumulation for swipe detection (same 700 px/s fling rule as
  // the in-app capsule) plus the drag-start position for swipe snap-back.
  double _dragDx = 0;
  double _dragDy = 0;
  double _dragStartWinX = 0;
  double _dragStartWinY = 0;
  double _dragStartInsetX = 0;
  double _dragStartInsetY = 0;
  double _preExpandInsetX = 0;
  double _preExpandInsetY = 0;

  // ---- Heads-up dodge ----
  final _shift = SirajOverlayShift();
  Timer? _shiftRestoreTimer;

  // ---- Expanded island (Athkar reader / Tasbih) ----
  //
  // null = collapsed pill; 'athkar' | 'tasbih' while expanded. Expanding
  // resizes the window (setOverlaySize) and remembers the collapsed
  // position, so collapsing puts the capsule back where it was.
  String? _expandedView;
  SirajAthkar _expandedAthkar = SirajAthkar.morning;
  bool _expandedSnooze = false;
  double _preExpandX = 0;
  double _preExpandY = 0;
  double _winH = 76;
  // Actual granted Flutter-view height. Collapsed, this tracks the pill
  // (never below 76): a capsule taller than 76 (medium/large sizes,
  // square shapes) would otherwise be clipped top/bottom by the window.
  double _viewH = 76;

  /// Collapsed window height that fits the current pill whole.
  double _collapsedViewH() {
    final h = _pillSize(_state).height;
    return h > 76 ? h : 76;
  }

  /// Resizes the collapsed window when the pill's height changes (size
  /// or shape setting, or a state kind with a different height), then
  /// re-syncs the position Kotlin may have clamped to fit the new size.
  void _syncCollapsedViewH() {
    if (_expandedView != null) return;
    final want = _collapsedViewH();
    if ((want - _viewH).abs() <= 0.5) return;
    _viewH = want;
    unawaited(() async {
      await _setOverlaySize(380, _viewH);
      await _syncPosition();
    }());
  }

  @override
  void initState() {
    super.initState();
    _ready = widget.prefsReady;
    if (_ready) {
      // Same singleton AppState uses; reload() below refreshes its cache.
      SharedPreferences.getInstance().then((p) {
        _prefs = p;
        try {
          _capInsetX = p.getDouble('siraj_cap_inset_x') ?? 0;
          _capInsetY = p.getDouble('siraj_cap_inset_y') ?? 0;
        } catch (_) {}
      }, onError: (_) {});
    }
    // Native → Dart calls: the notification listener forwards heads-up
    // shown/hidden through the service (see SirajOverlayService.kt).
    _channel.setMethodCallHandler(_onNativeCall);
    unawaited(_syncPosition());
    _recompute();
    _syncCollapsedViewH();
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
    _shiftRestoreTimer?.cancel();
    super.dispose();
  }

  // ---- Native channel ----

  Future<dynamic> _onNativeCall(MethodCall call) async {
    switch (call.method) {
      case 'headsUpShown':
        await _onHeadsUpShown();
      case 'headsUpHidden':
        _onHeadsUpHidden();
      default:
        debugPrint('siraj overlay: unknown native call ${call.method}');
    }
    return null;
  }

  /// Current window position + screen size (dp) from the service, or null
  /// when the native side is absent.
  Future<({double x, double y, double screenW, double screenH})?>
  _fetchOverlayPosition() async {
    try {
      final map = await _channel.invokeMapMethod<String, dynamic>(
        'getOverlayPosition',
      );
      if (map == null) return null;
      double d(String k) => (map[k] as num?)?.toDouble() ?? 0;
      return (x: d('x'), y: d('y'), screenW: d('screenW'), screenH: d('screenH'));
    } on MissingPluginException catch (e) {
      debugPrint('siraj overlay getOverlayPosition unavailable: $e');
      return null;
    } on PlatformException catch (e) {
      debugPrint('siraj overlay getOverlayPosition failed: $e');
      return null;
    }
  }

  /// Seeds / re-syncs the tracked window position from the service.
  Future<void> _syncPosition() async {
    final pos = await _fetchOverlayPosition();
    if (pos == null || !mounted) return;
    _winX = pos.x;
    _winY = pos.y;
    _screenW = pos.screenW;
    _screenH = pos.screenH;
    _positionReady = true;
  }

  /// Moves the window to an absolute position (dp). Fire-and-forget:
  /// awaiting would serialize the drag behind the channel round-trip and
  /// make the capsule lag the finger. The service clamps to the screen.
  void _moveOverlayTo(double x, double y) {
    unawaited(_invokeMoveOverlayTo(x, y));
  }

  Future<void> _invokeMoveOverlayTo(double x, double y) async {
    try {
      await _channel.invokeMethod('moveOverlayTo', {'x': x, 'y': y});
    } on MissingPluginException catch (e) {
      debugPrint('siraj overlay moveOverlayTo unavailable: $e');
    } on PlatformException catch (e) {
      debugPrint('siraj overlay moveOverlayTo failed: $e');
    }
  }

  /// Persists the dragged position on release, so the capsule reopens
  /// where the user left it.
  void _saveOverlayPosition() {
    unawaited(_invokeSaveOverlayPosition());
  }

  Future<void> _invokeSaveOverlayPosition() async {
    try {
      await _channel.invokeMethod('saveOverlayPosition');
    } on MissingPluginException catch (e) {
      debugPrint('siraj overlay saveOverlayPosition unavailable: $e');
    } on PlatformException catch (e) {
      debugPrint('siraj overlay saveOverlayPosition failed: $e');
    }
  }

  // ---- Drag ----

  /// Collapsed-window width (dp), fixed by the native service.
  static const double _windowWidthDp = 380;

  void _onDragStart(DragStartDetails _) {
    // Re-sync: the window may have moved since the last track (rotation,
    // a heads-up dodge) — drags must start from the true position.
    unawaited(_syncPosition());
    _dragDx = 0;
    _dragDy = 0;
    _dragStartWinX = _winX;
    _dragStartWinY = _winY;
    _dragStartInsetX = _capInsetX;
    _dragStartInsetY = _capInsetY;
  }

  void _onDragUpdate(DragUpdateDetails d) {
    if (!_positionReady) return;
    _dragDx += d.delta.dx;
    _dragDy += d.delta.dy;
    if (_expandedView != null) {
      // Expanded panel: the content fills the window, so the whole
      // window is what stays on screen (no in-window capsule offset).
      final next = sirajClampOverlayPosition(
        x: _winX + d.delta.dx,
        y: _winY + d.delta.dy,
        windowWidth: _windowWidthDp,
        windowHeight: _viewH,
        screenWidth: _screenW,
        screenHeight: _screenH,
      );
      _winX = next.x;
      _winY = next.y;
      _moveOverlayTo(_winX, _winY);
      return;
    }
    final size = _pillSize(_state);
    // CameraPlacement principle (see the field comment): the capsule's
    // desired top-left follows the finger and is clamped to the SCREEN;
    // the window is centred on the capsule and clamped as before; the
    // remainder becomes the capsule's in-window offset, so the capsule
    // reaches the screen edges instead of stopping a half-window short.
    final next = sirajDragOverlayPlacement(
      winX: _winX,
      winY: _winY,
      insetX: _capInsetX,
      insetY: _capInsetY,
      dx: d.delta.dx,
      dy: d.delta.dy,
      capsuleWidth: size.width,
      capsuleHeight: size.height,
      windowWidth: _windowWidthDp,
      windowHeight: _viewH,
      screenWidth: _screenW,
      screenHeight: _screenH,
    );
    _winX = next.winX;
    _winY = next.winY;
    _capInsetX = next.insetX;
    _capInsetY = next.insetY;
    setState(() {});
    _moveOverlayTo(_winX, _winY);
  }

  void _onDragEnd(DragEndDetails d) {
    // A fast fling is a swipe, not a drag: run the mapped action instead
    // of persisting the flung position (same rule as the in-app
    // capsule). Collapsed only — expanded-panel drags always persist.
    if (_expandedView == null && _handleSwipeEnd(d)) return;
    _saveOverlayPosition();
    _saveCapsuleInset();
  }

  /// A fast fling at the end of a drag is a swipe: runs the mapped swipe
  /// action (dominant axis, 700 px/s threshold, like the in-app capsule)
  /// and snaps the island back to where the drag started. Returns true
  /// when the gesture was consumed as a swipe. A swipe mapped to an
  /// action this isolate cannot run counts as a drag end.
  bool _handleSwipeEnd(DragEndDetails d) {
    final v = d.velocity.pixelsPerSecond;
    if (v.distance < 700) return false;
    final action = _dragDx.abs() > _dragDy.abs()
        ? (_dragDx > 0 ? _config.gestureSwipeRight : _config.gestureSwipeLeft)
        : (_dragDy > 0 ? _config.gestureSwipeDown : _config.gestureSwipeUp);
    if (action == 'none') return false;
    _winX = _dragStartWinX;
    _winY = _dragStartWinY;
    _capInsetX = _dragStartInsetX;
    _capInsetY = _dragStartInsetY;
    _moveOverlayTo(_winX, _winY);
    setState(() {});
    _runOverlayGesture(action);
    return true;
  }

  /// Runs a mapped gesture action from the overlay isolate. 'dismiss'
  /// hides the current reminder state until its key changes;
  /// 'toggle_time' flips the countdown format for this session (the time
  /// press); open actions ('prayer_times' / 'siraj_tab') leave the
  /// pending-tab flag and launch the app; app-only actions (e.g.
  /// 'play_pause', whose AudioService lives in the main isolate) open
  /// the app so the action can run there; 'none' does nothing.
  void _runOverlayGesture(String action) {
    switch (action) {
      case 'dismiss':
        _dismissed.add(_state.key);
        _recompute();
      case 'toggle_time':
        setState(() => _timeFormatToggled = !_timeFormatToggled);
      case 'none':
        break;
      default:
        unawaited(_openAppForGesture(action));
    }
  }

  /// Persists the capsule's in-window offset alongside the window
  /// position, so a capsule left at a screen edge reopens at the edge.
  void _saveCapsuleInset() {
    try {
      _prefs?.setDouble('siraj_cap_inset_x', _capInsetX);
      _prefs?.setDouble('siraj_cap_inset_y', _capInsetY);
    } catch (_) {}
  }

  /// The countdown format actually shown: the user's setting, flipped
  /// when the time-press toggle was used. Session-local.
  String get _effectiveCountdownFormat => _timeFormatToggled
      ? (_config.countdownFormat == 'min_sec' ? 'min_only' : 'min_sec')
      : _config.countdownFormat;

  // ---- Heads-up dodge ----

  /// A heads-up banner appeared: shift the island below it (if it would
  /// be covered) and arm the restore timer. Re-posts while shifted only
  /// restart the timer — the island does not move again. While the island
  /// is expanded, the tall panel stays put: the banner covers its top for
  /// a few seconds, but the Athkar text below stays readable.
  Future<void> _onHeadsUpShown() async {
    if (_expandedView != null) return;
    final pos = await _fetchOverlayPosition();
    final currentY = pos?.y ?? _winY;
    final currentX = pos?.x ?? _winX;
    if (pos != null) {
      _winX = pos.x;
      _winY = pos.y;
      _screenW = pos.screenW;
      _screenH = pos.screenH;
      _positionReady = true;
    }
    final target = _shift.onHeadsUpShown(currentY: currentY);
    _shiftRestoreTimer?.cancel();
    _shiftRestoreTimer = Timer(
      sirajHeadsUpRestoreDelay,
      _restoreAfterHeadsUp,
    );
    if (target == null) return;
    _winY = target;
    _moveOverlayTo(currentX, target);
  }

  /// The banner was dismissed: move the island back right away.
  void _onHeadsUpHidden() {
    _shiftRestoreTimer?.cancel();
    _restoreAfterHeadsUp();
  }

  void _restoreAfterHeadsUp() {
    final y = _shift.restore();
    if (y == null) return;
    _winY = y;
    _moveOverlayTo(_winX, y);
  }

  // ---- Expanded island ----

  /// Tall-panel height (dp): as tall as fits below the capsule, between
  /// 320 and 520 dp. The content scrolls, so the exact height only sets
  /// how much is visible at once. Kotlin also clamps the window's y so
  /// the panel stays on screen.
  double _expandedHeightDp() {
    if (!_positionReady || _screenH <= 0) return 480;
    return (_screenH - _winY - 8).clamp(320.0, 520.0);
  }

  Future<void> _setOverlaySize(double width, double height) async {
    try {
      await _channel.invokeMethod('setOverlaySize', {
        'width': width,
        'height': height,
      });
    } on MissingPluginException catch (e) {
      debugPrint('siraj overlay setOverlaySize unavailable: $e');
    } on PlatformException catch (e) {
      debugPrint('siraj overlay setOverlaySize failed: $e');
    }
  }

  /// Expands the island to [view] ('athkar' | 'tasbih'), resizing the
  /// window; switching tabs while already expanded only swaps content.
  /// [snooze] opens the Athkar reader with its snooze chooser visible
  /// (the notification "اقرأ لاحقًا" path).
  Future<void> _expandTo({
    required String view,
    SirajAthkar? athkar,
    bool snooze = false,
  }) async {
    final wasExpanded = _expandedView != null;
    if (!wasExpanded) {
      _preExpandX = _winX;
      _preExpandY = _winY;
      _preExpandInsetX = _capInsetX;
      _preExpandInsetY = _capInsetY;
    }
    _expandedView = view;
    if (athkar != null) _expandedAthkar = athkar;
    _expandedSnooze = snooze;
    if (mounted) setState(() {});
    if (!wasExpanded) {
      _winH = _expandedHeightDp();
      _viewH = _winH;
      await _setOverlaySize(380, _viewH);
      // Kotlin may have moved y up to fit the tall window; re-sync so
      // the next drag / collapse starts from the true position.
      await _syncPosition();
    }
  }

  /// Collapses back to the 76 dp pill and moves it back to where it was
  /// before expanding.
  Future<void> _collapseOverlay() async {
    if (_expandedView == null) return;
    _expandedView = null;
    _expandedSnooze = false;
    if (mounted) setState(() {});
    _winH = 76;
    _viewH = _collapsedViewH();
    await _setOverlaySize(380, _viewH);
    _winX = _preExpandX;
    _winY = _preExpandY;
    _capInsetX = _preExpandInsetX;
    _capInsetY = _preExpandInsetY;
    _moveOverlayTo(_winX, _winY);
  }

  /// Consumes the main isolate's mailbox (called on every 1s tick):
  /// a due Athkar snooze request re-opens the reader, and a pending view
  /// (notification "اقرأ الآن") expands to it. Each entry is removed
  /// before acting, so it fires once.
  void _consumePendingView() {
    final prefs = _prefs;
    if (prefs == null) return;
    final reqRaw = prefs.getString('text_$sirajAthkarSnoozeRequestKey');
    final req = sirajParseAthkarSnoozeRequest(reqRaw);
    if (req != null && !req.fireAt.isAfter(DateTime.now())) {
      unawaited(prefs.remove('text_$sirajAthkarSnoozeRequestKey'));
      unawaited(_expandTo(view: 'athkar', athkar: req.type));
      return;
    }
    final raw = prefs.getString('text_$sirajOverlayPendingViewKey');
    final pending = sirajParseOverlayPendingView(raw);
    if (pending == null) return;
    unawaited(prefs.remove('text_$sirajOverlayPendingViewKey'));
    if (pending.view == 'tasbih') {
      unawaited(_expandTo(view: 'tasbih'));
    } else if (pending.type != null) {
      unawaited(
        _expandTo(
          view: 'athkar',
          athkar: pending.type,
          snooze: pending.snooze,
        ),
      );
    }
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
    // A dismissed reminder stays hidden (idle countdown) until its
    // state key changes — the overlay's counterpart of the in-app
    // capsule's dismissal set.
    _state = _dismissed.contains(top.key)
        ? _idleState()
        : _effectivePillState(top);
    _syncCollapsedViewH();
    if (mounted) setState(() {});
    _consumePendingView();
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

  /// The idle prayer-countdown pill state, used when a kind is hidden
  /// by the content toggles or dismissed by the user.
  SirajState _idleState() {
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

  /// A pill state with hidden kinds replaced by the idle prayer countdown,
  /// so prayer time stays visible even when every other kind is off.
  SirajState _effectivePillState(SirajState s) {
    if (_contentVisible(s.kind)) return s;
    return _idleState();
  }

  /// Pill size, shared with the in-app capsule ([sirajCapsulePillSize]):
  /// the size preset scales it (default small, compact). The window is
  /// 380x76 dp, so the widest pill (360) fits with room for its shadow.
  /// `capsuleWidthFrac` is ignored: the window cannot resize. In circle
  /// mode the badge is a small round (see [sirajCapsuleCircleDiameter]).
  Size _pillSize(SirajState s) {
    if (_config.capsuleShape == 'circle') {
      final d = sirajCapsuleCircleDiameter(_config);
      return Size(d, d);
    }
    final pill = sirajCapsulePillSize(
      kind: s.kind,
      config: _config,
      titleLength: s.title.length,
      maxWidth: 360,
    );
    return Size(pill.width, pill.height);
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

  /// Opens the app for a mapped gesture action. The overlay isolate
  /// cannot navigate the app or play music, so tap and long-press only
  /// open the app — the mapped action picks which tab it opens on:
  /// 'siraj_tab' / 'prayer_times' leave a pending-tab flag the app shell
  /// picks up on resume (`siraj_pending_tab`); the other actions cannot
  /// run from this isolate.
  Future<void> _openAppForGesture(String action) async {
    if (action == 'siraj_tab' || action == 'prayer_times') {
      try {
        final prefs = _prefs;
        if (prefs != null) {
          // AppState stores text under the 'text_' prefix; the shell
          // reads it with AppState.text('siraj_pending_tab').
          await prefs.setString(
            'text_siraj_pending_tab',
            action == 'siraj_tab' ? 'siraj' : 'prayer_times',
          );
        }
      } catch (_) {}
    }
    await _openApp();
  }

  /// Tap: an Athkar pill reads the Athkar in the island itself (the
  /// expanded reader) instead of opening the app; every other kind runs
  /// the mapped gesture action (unless mapped to 'none').
  void _onCapsuleTap() {
    if (_config.gestureTap == 'none') return;
    if (_state.kind == SirajKind.athkarDue && _config.showAthkar) {
      unawaited(
        _expandTo(
          view: 'athkar',
          athkar: _state.athkar ?? SirajAthkar.morning,
        ),
      );
      return;
    }
    _runOverlayGesture(_config.gestureTap);
  }

  /// Long-press: runs the mapped gesture action (default: open the Siraj
  /// tab). App-only actions open the app so they can run there.
  void _onCapsuleLongPress() {
    if (_config.gestureLongPress == 'none') return;
    _runOverlayGesture(_config.gestureLongPress);
  }

  /// Entrance wrapper: fade + scale (or slide down) once on mount, by the
  /// animation style setting. The tween never restarts on rebuild, so the
  /// per-second ticks do not replay the entrance. No exit animation: the
  /// service removes the window outright when the overlay stops.
  Widget _entranceWrap(Widget child) {
    if (_config.capsuleAnimation == 'off') return child;
    final slide = _config.capsuleAnimation == 'slide';
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
      builder: (context, t, child) => Opacity(
        opacity: t,
        child: Transform.translate(
          offset: Offset(0, slide ? (1 - t) * -8 : 0),
          child: Transform.scale(
            scale: slide ? 1.0 : 0.94 + 0.06 * t,
            child: child,
          ),
        ),
      ),
      child: child,
    );
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
          '${p.label} ${sirajFormatCountdown(left, _effectiveCountdownFormat)}',
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
                          _effectiveCountdownFormat,
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

  /// Circle badge content: next prayer + countdown, centred. The ring
  /// is in-app only; the overlay badge keeps the same label + countdown
  /// without it.
  Widget _circleBadgeContent(_OverlayTheme theme) {
    final p = _nextPrayer;
    final left = p?.adhan.difference(DateTime.now());
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            p?.label ?? 'سِراج',
            style: _t(9.5, color: theme.accent, weight: FontWeight.w900),
          ),
          if (left != null)
            Text(
              sirajFormatCountdown(left, _effectiveCountdownFormat),
              style: _t(11.5, weight: FontWeight.w900),
            ),
        ],
      ),
    );
  }

  Widget _tab(_OverlayTheme theme, String label, bool selected, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 36,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected
                ? theme.accent.withValues(alpha: 0.22)
                : Colors.white.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected
                  ? theme.accent.withValues(alpha: 0.6)
                  : Colors.white12,
            ),
          ),
          child: Text(
            label,
            style: _t(
              13,
              color: selected ? theme.accent : Colors.white70,
              weight: FontWeight.w900,
            ),
          ),
        ),
      ),
    );
  }

  /// The expanded island: a tall panel with the prayer countdown in the
  /// header (always visible), an Athkar/Tasbih tab row, and the reader or
  /// the counter below (scrollable). The header is draggable; closing
  /// collapses back to the pill at its previous position.
  Widget _expandedPanel(_OverlayTheme theme) {
    final isAthkar = _expandedView == 'athkar';
    return Container(
      color: Colors.transparent,
      alignment: Alignment.topCenter,
      child: _entranceWrap(
        Opacity(
          opacity: _config.capsuleOpacity.clamp(0.5, 1.0),
          child: Container(
            width: 360,
            height: _winH,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
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
              borderRadius: BorderRadius.circular(24),
              child: Material(
                type: MaterialType.transparency,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    GestureDetector(
                      onPanStart: _config.capsuleDraggable
                          ? _onDragStart
                          : null,
                      onPanUpdate: _config.capsuleDraggable
                          ? _onDragUpdate
                          : null,
                      onPanEnd: _config.capsuleDraggable
                          ? _onDragEnd
                          : null,
                      child: Container(
                        color: Colors.transparent,
                        padding: const EdgeInsets.fromLTRB(14, 10, 6, 4),
                        child: Row(
                          children: [
                            Expanded(child: _prayerChip(theme)),
                            IconButton(
                              icon: const Icon(
                                Icons.close_rounded,
                                color: Colors.white70,
                                size: 20,
                              ),
                              onPressed: () =>
                                  unawaited(_collapseOverlay()),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: Row(
                        children: [
                          _tab(theme, 'الأذكار', isAthkar, () {
                            unawaited(
                              _expandTo(
                                view: 'athkar',
                                athkar: _expandedAthkar,
                              ),
                            );
                          }),
                          const SizedBox(width: 8),
                          _tab(theme, 'المسبحة', !isAthkar, () {
                            unawaited(_expandTo(view: 'tasbih'));
                          }),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                        child: isAthkar
                            ? SirajAthkarReaderView(
                                initialType: _expandedAthkar,
                                accent: theme.accent,
                                snoozed: _expandedSnooze,
                                onDone: (t) {
                                  try {
                                    SirajSettings.markAthkarDone(t);
                                  } catch (_) {}
                                  unawaited(_collapseOverlay());
                                },
                                onSnooze: (t, minutes) async {
                                  // The overlay isolate cannot schedule a
                                  // notification: leave a mailbox request
                                  // (this tick fires it when due, and the
                                  // main isolate's reschedule turns it
                                  // into a real notification).
                                  try {
                                    final prefs =
                                        _prefs ??
                                        await SharedPreferences.getInstance();
                                    await prefs.setString(
                                      'text_$sirajAthkarSnoozeRequestKey',
                                      sirajAthkarSnoozeRequestJson(
                                        type: t,
                                        minutes: minutes,
                                        fireAt: DateTime.now().add(
                                          Duration(minutes: minutes),
                                        ),
                                      ),
                                    );
                                  } catch (e) {
                                    debugPrint(
                                      'siraj overlay snooze failed: $e',
                                    );
                                  }
                                  unawaited(_collapseOverlay());
                                },
                              )
                            : SirajTasbihView(accent: theme.accent),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Siraj off: show nothing (the window stays until the service is
    // stopped from the settings toggle / notification action).
    if (!_config.enabled) return const SizedBox.shrink();
    final theme = _overlayTheme(_config);
    if (_expandedView != null) return _expandedPanel(theme);
    final size = _pillSize(_state);
    final radius = size.height / 2;
    // The window is free-positioned by drag (no left/center/right
    // preset); the pill sits inside its 380x76 box at its tracked
    // in-window offset (_capInsetX/_capInsetY) — centred by default,
    // shifted toward an edge when a drag pushed it there (see the field
    // comment). The offset is clamped to the CURRENT pill size: a stored
    // offset from a smaller pill must never clip a larger one. In circle
    // mode the radius is half the diameter, so the badge is a true
    // circle.
    final maxInsetX =
        ((_windowWidthDp - size.width) / 2).clamp(0.0, _windowWidthDp);
    final maxInsetY = ((_viewH - size.height) / 2).clamp(0.0, _viewH);
    return Container(
      color: Colors.transparent,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned(
            left: (_windowWidthDp - size.width) / 2 +
                _capInsetX.clamp(-maxInsetX, maxInsetX),
            top: (_viewH - size.height) / 2 +
                _capInsetY.clamp(-maxInsetY, maxInsetY),
            child: GestureDetector(
        // Configurable gestures: tap / double-tap / long-press run the
        // mapped actions (see _runOverlayGesture); a fast fling at the
        // end of a drag is a swipe (see _handleSwipeEnd). Adding
        // double-tap delays single-tap by the double-tap timeout — the
        // same tradeoff the old native app made with its singleTapRun.
        onTap: _onCapsuleTap,
        onDoubleTap: () => _runOverlayGesture(_config.gestureDoubleTap),
        onLongPress: _onCapsuleLongPress,
        // Free drag: the capsule follows the finger anywhere on the
        // screen. Only when dragging is enabled in settings; a tap
        // without movement still opens the app (tap wins the gesture
        // arena when the finger does not move).
        onPanStart: _config.capsuleDraggable ? _onDragStart : null,
        onPanUpdate: _config.capsuleDraggable ? _onDragUpdate : null,
        onPanEnd: _config.capsuleDraggable ? _onDragEnd : null,
        child: _entranceWrap(
          Opacity(
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
                  child: _config.capsuleShape == 'circle'
                      ? _circleBadgeContent(theme)
                      : _pillContent(theme),
                ),
              ),
            ),
          ),
        ),
            ),
          ),
        ],
      ),
    );
  }
}
