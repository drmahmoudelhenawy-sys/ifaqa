import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Flutter side of the Siraj "overlay over other apps" feature.
///
/// STATUS — the native Android side IS implemented (2026-11-18):
/// `android/app/src/main/kotlin/com/ifaqa/ifaqa_flutter/SirajOverlayService.kt`
/// (foreground service of type `specialUse` + `WindowManager` overlay
/// window with a second FlutterEngine running `sirajOverlayMain`) and the
/// `'siraj_overlay'` channel registered in `MainActivity.kt`; the manifest
/// declares `FOREGROUND_SERVICE_SPECIAL_USE` and the service (see
/// `OVERLAY_NATIVE.md` for the spec, the known deviations, and what still
/// needs a real device). Every method below still degrades gracefully
/// (returns `false` / no-op) when the native side is absent — e.g. on
/// web / iOS / desktop, or on an install built before the Kotlin side
/// landed.
///
/// What this service is for: a small floating Siraj capsule (next prayer +
/// countdown — prayer time is the most important thing and must ALWAYS be
/// visible, including in the overlay) drawn over other apps with
/// `WindowManager.TYPE_APPLICATION_OVERLAY`, for users who enable it in
/// Siraj settings (`SirajSettings.config().overlayEnabled` and
/// `overlayShowWhenAppClosed`). Until the native side lands, those settings
/// are stored but have no effect.
///
/// How this relates to the existing live notification (`SirajLiveService`):
/// the live capsule is NOT a foreground service and does NOT keep the Dart
/// isolate alive. It stays visible after the app is closed because its
/// entries are pre-scheduled system notifications (see
/// `siraj_live_service.dart`: the chain for the next two days is posted with
/// `zonedSchedule`, each with its own countdown target). The overlay is
/// different: a `WindowManager` view is owned by the app process, so it
/// dies with the process. When the app is swiped from recents, Android
/// kills the Dart isolate; the overlay survives only while a foreground
/// service holds the process alive. That foreground service is
/// `SirajOverlayService` (Kotlin) — see `OVERLAY_NATIVE.md`. The
/// `just_audio_background` audio service already in the manifest is a
/// foreground service of type `mediaPlayback` and cannot be reused as the
/// overlay's keep-alive.
class SirajOverlayService {
  SirajOverlayService._();
  static final SirajOverlayService instance = SirajOverlayService._();

  /// Channel name the native side must register (see `OVERLAY_NATIVE.md`).
  static const String channelName = 'siraj_overlay';

  static const MethodChannel _channel = MethodChannel(channelName);

  /// True on Android only. The overlay is an Android
  /// `SYSTEM_ALERT_WINDOW` feature; on web / iOS / desktop every method
  /// below returns `false` / no-ops.
  static bool get supported =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  /// Invokes [method] on the native side, returning `null` when the native
  /// side is absent ([MissingPluginException]) or reports a failure
  /// ([PlatformException]). This is the whole reason the overlay can ship
  /// in the Flutter tree before the Kotlin side exists: nothing here throws.
  Future<T?> _invoke<T>(String method) async {
    if (!supported) return null;
    try {
      return await _channel.invokeMethod<T>(method);
    } on MissingPluginException catch (e) {
      debugPrint('siraj overlay unavailable ($method): $e');
      return null;
    } on PlatformException catch (e) {
      debugPrint('siraj overlay failed ($method): $e');
      return null;
    }
  }

  /// True only if the native side responds at all. Probes with `isShowing`:
  /// a real native handler answers `true`/`false`, an absent one throws
  /// [MissingPluginException] and this returns `false`. Use this to decide
  /// whether to offer overlay UI (e.g. hide the "enable overlay" toggle's
  /// effect, or show "coming soon") instead of assuming it works.
  Future<bool> get isAvailable async =>
      await _invoke<bool>('isShowing') != null;

  /// Whether the user granted "Display over other apps"
  /// (`Settings.canDrawOverlays()`). `false` when the native side is
  /// absent or the permission was not granted.
  Future<bool> hasPermission() async =>
      await _invoke<bool>('hasPermission') ?? false;

  /// Opens the system overlay-permission screen
  /// (`Settings.ACTION_MANAGE_OVERLAY_PERMISSION`) via the native side.
  /// Returns `true` only if the permission is already granted (nothing to
  /// open); otherwise it opens Settings and returns `false` — the caller
  /// must re-check [hasPermission] when the app resumes, because the grant
  /// happens outside the app. Returns `false` when the native side is
  /// absent.
  Future<bool> requestPermission() async =>
      await _invoke<bool>('requestPermission') ?? false;

  /// Shows the overlay window. Returns `false` (and does nothing) when the
  /// native side is absent, the platform is not Android, or the overlay
  /// permission has not been granted. The native side is responsible for
  /// starting its foreground service first, so the overlay is not killed
  /// the moment the app leaves the foreground (see OVERLAY_NATIVE.md).
  Future<bool> startOverlay() async {
    if (!await hasPermission()) return false;
    return await _invoke<bool>('startOverlay') ?? false;
  }

  /// Hides the overlay window and stops its foreground service. No-op when
  /// the native side is absent; never throws.
  Future<void> stopOverlay() async {
    await _invoke<void>('stopOverlay');
  }

  /// Whether the overlay window is currently shown. `false` when the native
  /// side is absent or the overlay is not showing.
  Future<bool> get isShowing async =>
      await _invoke<bool>('isShowing') ?? false;
}
