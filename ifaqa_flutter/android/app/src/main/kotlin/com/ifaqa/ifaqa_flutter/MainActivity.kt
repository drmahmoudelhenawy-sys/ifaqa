package com.ifaqa.ifaqa_flutter

import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.ryanheise.audioservice.AudioServiceActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Registers the `siraj_overlay` MethodChannel for the Siraj overlay over
 * other apps (see `lib/siraj/OVERLAY_NATIVE.md` and
 * `SirajOverlayService.kt`).
 *
 * Method contract (names must match `lib/siraj/siraj_overlay.dart`):
 * - `hasPermission` → `Settings.canDrawOverlays()`.
 * - `requestPermission` → true if already granted; else opens the system
 *   "Display over other apps" screen and returns false (the grant happens
 *   outside the app; Dart re-checks `hasPermission()` on resume).
 * - `startOverlay` → false if the permission is missing or API < 26;
 *   else starts the foreground service and replies true only after the
 *   service reports the window added. The reply is asynchronous: the
 *   service adds the window in `onStartCommand`, so the handler holds the
 *   `result` until `SirajOverlayService.onWindowShown` fires (or a 3s
 *   timeout, so the Dart future never hangs).
 * - `stopOverlay` → removes the window and stops the service.
 * - `isShowing` → whether the window is currently attached.
 * - `hasNotificationAccess` → whether the user enabled notification
 *   access for the app (needed for the heads-up dodge).
 * - `openNotificationAccessSettings` → true if already granted; else
 *   opens the system notification-access screen and returns false (the
 *   grant happens outside the app; Dart re-checks on resume).
 * Unknown methods → `result.notImplemented()`, so a Dart-side typo
 * surfaces as `MissingPluginException` instead of a hang.
 */
class MainActivity : AudioServiceActivity() {

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "siraj_overlay")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "hasPermission" ->
                        result.success(Settings.canDrawOverlays(this))
                    "requestPermission" -> {
                        if (Settings.canDrawOverlays(this)) {
                            result.success(true)
                        } else {
                            val intent = Intent(
                                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                                Uri.parse("package:$packageName"),
                            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            startActivity(intent)
                            // The grant happens outside the app; it cannot be
                            // awaited. Dart re-checks hasPermission() on resume.
                            result.success(false)
                        }
                    }
                    "startOverlay" -> startOverlay(result)
                    "stopOverlay" -> {
                        stopOverlay()
                        result.success(null)
                    }
                    "isShowing" -> result.success(SirajOverlayService.isShowing)
                    "hasNotificationAccess" ->
                        result.success(hasNotificationAccess())
                    "openNotificationAccessSettings" -> {
                        if (hasNotificationAccess()) {
                            result.success(true)
                        } else {
                            val intent = Intent(
                                Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS,
                            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            startActivity(intent)
                            // The grant happens outside the app; it cannot
                            // be awaited. Dart re-checks on resume.
                            result.success(false)
                        }
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun startOverlay(result: MethodChannel.Result) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
            !Settings.canDrawOverlays(this)
        ) {
            result.success(false)
            return
        }
        // The service adds the window asynchronously; reply only once it
        // reports back (or after a short timeout).
        val replied = AtomicBoolean(false)
        fun reply(value: Boolean) {
            if (replied.compareAndSet(false, true)) result.success(value)
        }
        SirajOverlayService.onWindowShown = { shown -> reply(shown) }
        Handler(Looper.getMainLooper()).postDelayed({ reply(false) }, 3000)
        try {
            // API < 26 returned above; startForegroundService is required
            // on 26+ for a service that will call startForeground.
            startForegroundService(Intent(this, SirajOverlayService::class.java))
        } catch (e: Exception) {
            // E.g. ForegroundServiceStartNotAllowedException if called
            // from the background on Android 12+.
            reply(false)
        }
    }

    private fun stopOverlay() {
        SirajOverlayService.onWindowShown = null
        stopService(Intent(this, SirajOverlayService::class.java))
    }

    /**
     * Whether the user enabled notification access for the app (the
     * `SirajNotificationListener` in the system's enabled-listener list).
     * Read from `Settings.Secure` directly — no extra dependency.
     */
    private fun hasNotificationAccess(): Boolean {
        val enabled = Settings.Secure.getString(
            contentResolver,
            "enabled_notification_listeners",
        ) ?: ""
        val component = ComponentName(
            this,
            SirajNotificationListener::class.java,
        ).flattenToString()
        return enabled.contains(component)
    }
}
