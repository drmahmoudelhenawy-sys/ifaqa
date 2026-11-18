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
import android.util.DisplayMetrics
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import io.flutter.embedding.android.FlutterSurfaceView
import io.flutter.embedding.android.FlutterView
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.engine.FlutterEngineCache
import io.flutter.FlutterInjector
import io.flutter.embedding.engine.dart.DartExecutor
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugins.sharedpreferences.SharedPreferencesPlugin
import kotlin.math.roundToInt

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

        /** Overlay window size in dp (fixed bounding box; see addOverlay). */
        private const val WINDOW_WIDTH_DP = 380
        private const val WINDOW_HEIGHT_DP = 76

        /**
         * Own prefs file for the dragged window position (px). Separate
         * from the Flutter SharedPreferences file: the Dart side never
         * needs the persisted position (it tracks the live one).
         */
        private const val PREFS_NAME = "siraj_overlay"
        private const val KEY_X_PX = "x_px"
        private const val KEY_Y_PX = "y_px"

        /** The running service, for [SirajNotificationListener] to forward
         * heads-up events to. Same process, set in onCreate / cleared in
         * onDestroy; null when the overlay is not running. */
        var instance: SirajOverlayService? = null
            private set

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

    /** The live window params (position owner) and the channel to the
     * overlay isolate (for forwarding heads-up events to Dart). */
    private var overlayParams: WindowManager.LayoutParams? = null
    private var overlayChannel: MethodChannel? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

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
        instance = null
        try {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } catch (e: Exception) {
            Log.d(TAG, "stopForeground in onDestroy", e)
        }
        super.onDestroy()
    }

    /**
     * A heads-up notification banner appeared (reported by
     * [SirajNotificationListener]). Forwarded to the Dart side, which owns
     * the shift/restore decision ([SirajOverlayShift]) and moves the
     * window down below the banner — the countdown stays visible instead
     * of being covered. No-op when the overlay is not showing.
     */
    fun onHeadsUpPosted() {
        if (!isShowing) return
        overlayChannel?.invokeMethod("headsUpShown", null)
    }

    /** The heads-up banner is gone: the Dart side moves the island back
     * to its saved position. No-op when the overlay is not showing. */
    fun onHeadsUpRemoved() {
        if (!isShowing) return
        overlayChannel?.invokeMethod("headsUpHidden", null)
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
        // main one). The Dart side also drives the window position
        // ("moveOverlayTo" / "getOverlayPosition" / "saveOverlayPosition"),
        // its size ("setOverlaySize": the expanded Athkar/Tasbih panel),
        // and receives heads-up events the service forwards ("headsUpShown"
        // / "headsUpHidden" — see onHeadsUpPosted/onHeadsUpRemoved).
        val channel = MethodChannel(
            engine.dartExecutor.binaryMessenger,
            "siraj_overlay",
        )
        overlayChannel = channel
        channel.setMethodCallHandler { call, result ->
            when (call.method) {
                "openApp" -> {
                    openApp()
                    result.success(null)
                }
                "moveOverlayTo" -> {
                    val x = call.argument<Number>("x")?.toDouble() ?: 0.0
                    val y = call.argument<Number>("y")?.toDouble() ?: 0.0
                    moveOverlayTo(x, y)
                    result.success(null)
                }
                "setOverlaySize" -> {
                    val w = call.argument<Number>("width")?.toDouble() ?: WINDOW_WIDTH_DP.toDouble()
                    val h = call.argument<Number>("height")?.toDouble() ?: WINDOW_HEIGHT_DP.toDouble()
                    setOverlaySize(w, h)
                    result.success(null)
                }
                "getOverlayPosition" -> {
                    val params = overlayParams
                    if (params == null) {
                        result.error(
                            "no_overlay",
                            "overlay window is not showing",
                            null,
                        )
                    } else {
                        val density = resources.displayMetrics.density
                        result.success(
                            mapOf(
                                "x" to (params.x / density).toDouble(),
                                "y" to (params.y / density).toDouble(),
                                "screenW" to (
                                    resources.displayMetrics.widthPixels /
                                        density
                                    ).toDouble(),
                                "screenH" to (
                                    resources.displayMetrics.heightPixels /
                                        density
                                    ).toDouble(),
                            ),
                        )
                    }
                }
                "saveOverlayPosition" -> {
                    saveOverlayPosition()
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

        val metrics = resources.displayMetrics
        val winW = dp(WINDOW_WIDTH_DP)
        val winH = dp(WINDOW_HEIGHT_DP)
        val params = WindowManager.LayoutParams(
            winW,
            winH,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT,
        ).apply {
            // Free position: TOP|START makes x/y absolute. The position
            // is the user's last drag (persisted), or the default:
            // top-anchored, centred horizontally, just below the status
            // bar (see defaultPosition()). The Dart side tracks the live
            // position and moves the window with "moveOverlayTo".
            gravity = Gravity.TOP or Gravity.START
            val saved = loadOverlayPosition()
            val pos = saved?.let { clampPosition(it.first, it.second, winW, winH, metrics) }
                ?: defaultPosition(winW, winH, metrics)
            x = pos.first
            y = pos.second
        }
        overlayParams = params
        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        windowManager = wm
        wm.addView(view, params)
    }

    /**
     * Clamps a window position (px) so the window stays fully on screen.
     * Mirrors `sirajClampOverlayPosition` in `lib/siraj/siraj_state.dart`
     * (same contract, tested in Dart — Kotlin cannot be compiled here).
     */
    private fun clampPosition(
        x: Int,
        y: Int,
        winW: Int,
        winH: Int,
        metrics: DisplayMetrics,
    ): Pair<Int, Int> {
        val maxX = maxOf(0, metrics.widthPixels - winW)
        val maxY = maxOf(0, metrics.heightPixels - winH)
        return x.coerceIn(0, maxX) to y.coerceIn(0, maxY)
    }

    /**
     * Default position (px): top-anchored, centred horizontally, 8 dp
     * below the status bar. Mirrors `sirajOverlayDefaultPosition` in
     * `lib/siraj/siraj_state.dart`.
     */
    private fun defaultPosition(
        winW: Int,
        winH: Int,
        metrics: DisplayMetrics,
    ): Pair<Int, Int> = clampPosition(
        (metrics.widthPixels - winW) / 2,
        statusBarHeightPx() + dp(8),
        winW,
        winH,
        metrics,
    )

    private fun statusBarHeightPx(): Int {
        val resId = resources.getIdentifier(
            "status_bar_height",
            "dimen",
            "android",
        )
        return if (resId > 0) resources.getDimensionPixelSize(resId) else 0
    }

    /** The persisted dragged position (px), or null when never dragged. */
    private fun loadOverlayPosition(): Pair<Int, Int>? {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (!prefs.contains(KEY_X_PX) || !prefs.contains(KEY_Y_PX)) return null
        return prefs.getInt(KEY_X_PX, 0) to prefs.getInt(KEY_Y_PX, 0)
    }

    /** Persists the current window position (px). No-op when no window. */
    private fun saveOverlayPosition() {
        val params = overlayParams ?: return
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putInt(KEY_X_PX, params.x)
            .putInt(KEY_Y_PX, params.y)
            .apply()
    }

    /**
     * Resizes the window (dp, from the Dart side) — the expanded island
     * grows to a tall panel for the Athkar reader / Tasbih and shrinks
     * back to 380x76 on collapse. Height is clamped to the screen, and
     * y is moved up when the taller window would run off the bottom, so
     * the panel always stays fully on screen. The Dart side re-syncs the
     * position afterwards (see _syncPosition in siraj_overlay_entry.dart)
     * and remembers the collapsed position itself for the collapse.
     */
    private fun setOverlaySize(widthDp: Double, heightDp: Double) {
        val view = flutterView ?: return
        val params = overlayParams ?: return
        val wm = windowManager ?: return
        val metrics = resources.displayMetrics
        val winW = dp(widthDp).coerceIn(1, metrics.widthPixels)
        val winH = dp(heightDp).coerceIn(1, metrics.heightPixels)
        params.width = winW
        params.height = winH
        val (_, ny) = clampPosition(params.x, params.y, winW, winH, metrics)
        params.y = ny
        try {
            wm.updateViewLayout(view, params)
        } catch (e: Exception) {
            Log.d(TAG, "updateViewLayout (resize) failed", e)
        }
    }

    /**
     * Moves the window to an absolute position (dp, from the Dart side).
     * Clamped to the screen; the Dart side also clamps, this is the
     * safety net (e.g. after rotation). Called on every drag update and
     * for the heads-up dodge.
     */
    private fun moveOverlayTo(xDp: Double, yDp: Double) {
        val view = flutterView ?: return
        val params = overlayParams ?: return
        val wm = windowManager ?: return
        val metrics = resources.displayMetrics
        val (nx, ny) = clampPosition(
            dp(xDp),
            dp(yDp),
            params.width,
            params.height,
            metrics,
        )
        params.x = nx
        params.y = ny
        try {
            wm.updateViewLayout(view, params)
        } catch (e: Exception) {
            Log.d(TAG, "updateViewLayout failed", e)
        }
    }

    /** Removes the window (if attached) and tears down the engine. Safe to
     * call twice or when nothing was added: removing an unattached view
     * throws IllegalArgumentException, hence the try/catch. The position
     * is saved first, so a kill mid-drag does not lose it. */
    private fun removeOverlay() {
        isShowing = false
        try {
            saveOverlayPosition()
        } catch (e: Exception) {
            Log.d(TAG, "saveOverlayPosition in removeOverlay", e)
        }
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
        overlayParams = null
        overlayChannel = null
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

    /** dp → px for fractional values (drag / shift deltas): rounded, not
     * truncated, so slow drags do not lose sub-pixel movement. */
    private fun dp(value: Double): Int =
        (value * resources.displayMetrics.density).roundToInt()
}
