package com.ifaqa.ifaqa_flutter

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import io.flutter.embedding.android.FlutterSurfaceView
import io.flutter.embedding.android.FlutterView
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.engine.FlutterEngineCache
import io.flutter.embedding.engine.FlutterInjector
import io.flutter.embedding.engine.dart.DartExecutor
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugins.sharedpreferences.SharedPreferencesPlugin

/**
 * Foreground service that keeps the Siraj overlay capsule alive over other
 * apps. It owns a second FlutterEngine (cached as "siraj_overlay_engine")
 * running the `sirajOverlayMain` Dart entrypoint
 * (`lib/siraj/siraj_overlay_entry.dart`), rendered in a [FlutterView]
 * added to the [WindowManager] as a `TYPE_APPLICATION_OVERLAY` window.
 *
 * The service is the keep-alive: swiping the app from recents removes the
 * task, but the process survives while this foreground service runs, so
 * the overlay window stays and its countdown keeps ticking. See
 * `lib/siraj/OVERLAY_NATIVE.md` for the full spec, the Play-policy caveat
 * for `specialUse`, and the manual test checklist.
 *
 * Started/stopped from MainActivity via the `siraj_overlay` MethodChannel
 * (`startOverlay` / `stopOverlay`). The notification's "إيقاف" action also
 * stops it (see [ACTION_STOP]).
 */
class SirajOverlayService : Service() {

    companion object {
        private const val TAG = "SirajOverlay"

        /** Distinct from the live-capsule ids (1000-1099). */
        const val NOTIFICATION_ID = 1100

        /** Reuses the Siraj live channel created by flutter_local_notifications. */
        const val CHANNEL_ID = "siraj_live"

        const val ENGINE_CACHE_KEY = "siraj_overlay_engine"
        const val ACTION_STOP = "com.ifaqa.app.STOP_SIRAJ_OVERLAY"

        /** True while the overlay window is attached to the WindowManager. */
        @Volatile
        var isShowing = false
            private set

        /**
         * One-shot callback invoked when the window has been added (true)
         * or could not be added (false). Set by MainActivity before
         * starting the service so `startOverlay` can reply only after the
         * window is actually up. Cleared after it fires.
         */
        var onWindowShown: ((Boolean) -> Unit)? = null
    }

    private var windowManager: WindowManager? = null
    private var flutterView: FlutterView? = null
    private var flutterEngine: FlutterEngine? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            removeOverlay()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }
        if (isShowing) {
            // Already up (e.g. startOverlay called twice): report success.
            reportShown(true)
            return START_STICKY
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
            !Settings.canDrawOverlays(this)
        ) {
            reportShown(false)
            stopSelf()
            return START_NOT_STICKY
        }
        // Foreground FIRST: the process must hold foreground priority
        // before the window is added, or the system can kill it at once.
        startForegroundWithType(buildNotification())
        try {
            addOverlay()
            isShowing = true
            reportShown(true)
        } catch (e: Exception) {
            Log.e(TAG, "failed to add overlay window", e)
            removeOverlay()
            reportShown(false)
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }
        // If the system kills the process, restart the service so the
        // overlay comes back (onStartCommand runs again with a null intent).
        return START_STICKY
    }

    override fun onDestroy() {
        removeOverlay()
        try {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } catch (e: Exception) {
            Log.d(TAG, "stopForeground in onDestroy", e)
        }
        super.onDestroy()
    }

    private fun reportShown(shown: Boolean) {
        onWindowShown?.invoke(shown)
        onWindowShown = null
    }

    private fun startForegroundWithType(notification: Notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    /**
     * Silent, ongoing notification on the existing `siraj_live` channel.
     * The channel is created here if it does not exist yet (the user may
     * never have enabled the live notification); if flutter_local_
     * notifications already created it, this is a no-op and its settings
     * are left alone.
     */
    private fun buildNotification(): Notification {
        ensureChannel()
        val openIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        val openPending = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val stopIntent = Intent(this, SirajOverlayService::class.java)
            .setAction(ACTION_STOP)
        val stopPending = PendingIntent.getService(
            this,
            0,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("سِراج")
            .setContentText("سِراج يعرض فوق التطبيقات")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(openPending)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .addAction(
                Notification.Action.Builder(null, "إيقاف", stopPending).build(),
            )
            .build()
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "سِراج",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "كبسولة سِراج الحيّة: العدّ التنازلي للصلاة القادمة والإقامة"
            setSound(null, null)
            enableVibration(false)
            setShowBadge(false)
        }
        manager.createNotificationChannel(channel)
    }

    /**
     * Creates the overlay engine, attaches the FlutterView and adds the
     * window. Throws if anything fails; the caller removes the partial
     * state and stops the service.
     *
     * Window size is explicit (380x76 dp), NOT WRAP_CONTENT: a FlutterView
     * is a FrameLayout whose render surface is added with MATCH_PARENT
     * params, so under WRAP_CONTENT it measures to the full screen — the
     * window would then swallow every touch on the device. A capsule-sized
     * window keeps the touchable area to the capsule, so touches outside
     * it reach the app below (FLAG_NOT_TOUCH_MODAL). The Dart UI centres
     * the capsule in this box; see `siraj_overlay_entry.dart`.
     *
     * The surface is transparent (`FlutterSurfaceView(context, true)`) so
     * only the capsule is visible, not a black rectangle.
     */
    private fun addOverlay() {
        val loader = FlutterInjector.instance().flutterLoader()
        // No-op when the main engine already ran; required when the
        // service restarts in a fresh process (START_STICKY).
        loader.ensureInitializationComplete(applicationContext, null)

        val engine = FlutterEngine(applicationContext)
        // The overlay isolate reads settings/location from
        // SharedPreferences (AppState). A hand-created engine has no
        // plugins registered, so without this every SharedPreferences
        // call would throw MissingPluginException. Only this plugin is
        // registered: the overlay needs nothing else.
        engine.plugins.add(SharedPreferencesPlugin())
        engine.dartExecutor.executeDartEntrypoint(
            DartExecutor.DartEntrypoint(
                loader.findAppBundlePath(),
                "sirajOverlayMain",
            ),
        )
        FlutterEngineCache.getInstance().put(ENGINE_CACHE_KEY, engine)
        flutterEngine = engine

        // Tap the capsule to open the app: the Dart side sends "openApp"
        // on this channel (registered on the overlay engine, not the
        // main one).
        MethodChannel(engine.dartExecutor.binaryMessenger, "siraj_overlay")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "openApp" -> {
                        openApp()
                        result.success(null)
                    }
                    else -> result.notImplemented()
                }
            }

        val view = FlutterView(
            applicationContext,
            FlutterSurfaceView(applicationContext, true),
        )
        view.setBackgroundColor(Color.TRANSPARENT)
        view.attachToFlutterEngine(engine)
        flutterView = view

        val params = WindowManager.LayoutParams(
            dp(380),
            dp(76),
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            x = 0
            // Below the status bar; draggable / persisted position is a
            // follow-up (see OVERLAY_NATIVE.md).
            y = dp(200)
        }
        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        windowManager = wm
        wm.addView(view, params)
    }

    /** Removes the window (if attached) and tears down the engine. Safe to
     * call twice or when nothing was added: removing an unattached view
     * throws IllegalArgumentException, hence the try/catch. */
    private fun removeOverlay() {
        isShowing = false
        try {
            flutterView?.let { windowManager?.removeView(it) }
        } catch (e: Exception) {
            Log.d(TAG, "overlay view already removed", e)
        }
        try {
            flutterView?.detachFromFlutterEngine()
        } catch (e: Exception) {
            Log.d(TAG, "detachFromFlutterEngine failed", e)
        }
        flutterView = null
        windowManager = null
        try {
            flutterEngine?.destroy()
        } catch (e: Exception) {
            Log.d(TAG, "engine destroy failed", e)
        }
        FlutterEngineCache.getInstance().remove(ENGINE_CACHE_KEY)
        flutterEngine = null
    }

    private fun openApp() {
        val intent = Intent(applicationContext, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        applicationContext.startActivity(intent)
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density + 0.5f).toInt()
}
