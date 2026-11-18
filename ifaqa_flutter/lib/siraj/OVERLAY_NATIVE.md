# Siraj overlay — native Android implementation guide

Status: **not implemented**. The Flutter side exists
(`lib/siraj/siraj_overlay.dart`, `SirajOverlayService`, channel
`'siraj_overlay'`) and degrades gracefully — every call returns `false` /
no-ops until this native side lands. This document is the complete spec for
building it. Nothing here is done yet: no Kotlin file, no service, no
overlay window.

## 0. Verified facts about this app (checked 2026-11-18)

- Kotlin sources live in `android/app/src/main/kotlin/com/ifaqa/ifaqa_flutter/`
  (verified: contains `MainActivity.kt` and `HomeWidgets.kt`).
- `MainActivity.kt` is currently one line:
  `class MainActivity : AudioServiceActivity()` — no
  `configureFlutterEngine` override yet. The channel must be registered by
  adding that override (see §2).
- Manifest package/namespace: `com.ifaqa.ifaqa_flutter`, `applicationId`
  `com.ifaqa.app` (`android/app/build.gradle.kts`).
- Flutter 3.50.0: `compileSdk 36`, `minSdk 24`, `targetSdk 36`
  (`flutter.targetSdkVersion` / `flutter.minSdkVersion` in
  `android/app/build.gradle.kts`).
- Manifest already has `FOREGROUND_SERVICE`,
  `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `POST_NOTIFICATIONS`,
  `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM`, `WAKE_LOCK`. It does
  NOT have `SYSTEM_ALERT_WINDOW` yet — that line was added as part of the
  Flutter-side wave (see §1). No `flutter_overlay_window` or any overlay
  package is in `pubspec.yaml` / `pubspec.lock`; do not add one — this is a
  hand-rolled `MethodChannel` + `WindowManager` implementation.
- There is **no** `MethodChannel` anywhere else in `lib/` — this is the
  first one. The established patterns to copy are the singletons in
  `lib/services/reminder_service.dart` (`ReminderService.supported`,
  try/catch + `debugPrint`) and `lib/siraj/siraj_live_service.dart`.
- The existing live capsule (`SirajLiveService`) is **not** a foreground
  service and does **not** keep the process alive: it stays visible after
  the app is closed because its entries are pre-scheduled system
  notifications. Do not confuse it with the keep-alive the overlay needs
  (§4). The `just_audio_background` `AudioService` in the manifest is a
  foreground service of type `mediaPlayback` and cannot be reused for the
  overlay.

## 1. AndroidManifest entries

File: `android/app/src/main/AndroidManifest.xml`. Exact lines:

```xml
<!-- Siraj overlay over other apps (SYSTEM_ALERT_WINDOW, "Display over other apps"). -->
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
```

Already present, do not duplicate:

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

Needed **when the service in §3 is added** (not present yet — do not add
until then, it is a permission line for a service that does not exist):

```xml
<!-- Required on API 34+ to run a foreground service of type "specialUse". -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
```

And the service declaration itself (inside `<application>`, added with
§3, not before):

```xml
<!-- Siraj overlay keep-alive. specialUse is the only fitting type for a
     prayer-countdown overlay; see §3 for the Play-policy caveat. -->
<service
    android:name=".SirajOverlayService"
    android:exported="false"
    android:foregroundServiceType="specialUse">
    <!-- Required on API 34+ for foregroundServiceType="specialUse". -->
    <property
        android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
        android:value="prayer countdown overlay" />
</service>
```

## 2. MethodChannel handler — registration and method contract

New file (does not exist yet):
`android/app/src/main/kotlin/com/ifaqa/ifaqa_flutter/SirajOverlayService.kt`
holds the service; the channel is registered in the existing
`android/app/src/main/kotlin/com/ifaqa/ifaqa_flutter/MainActivity.kt` by
adding a `configureFlutterEngine` override (the file has none today):

```kotlin
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
                "startOverlay" -> result.success(startOverlay())
                "stopOverlay" -> { stopOverlay(); result.success(null) }
                "isShowing" -> result.success(isOverlayShowing())
                else -> result.notImplemented()
            }
        }
}
```

Method contract — names must match the Dart side exactly:

| Method | Dart return when native absent | Native behaviour |
|---|---|---|
| `hasPermission` | `false` | `Settings.canDrawOverlays(context)` |
| `requestPermission` | `false` | If already granted return `true`; else launch `Settings.ACTION_MANAGE_OVERLAY_PERMISSION` with `Uri("package:$packageName")` and return `false` |
| `startOverlay` | `false` | Return `false` if `!canDrawOverlays()`; else start the foreground service (§3) which adds the window; return `true` only after the window is added |
| `stopOverlay` | no-op | Remove the window, stop the foreground service |
| `isShowing` | `false` | Whether the window is currently attached to `WindowManager` |

Notes:

- `SYSTEM_ALERT_WINDOW` is a *special* permission, not a runtime
  permission: there is no `requestPermissions()` flow for it. The only
  route is the Settings screen above. On Android 6–13 the toggle is under
  Settings → Apps → Special app access → Display over other apps.
- `startOverlay` must be called while the app is in the foreground (from
  the Siraj settings UI). Starting a foreground service from the
  background is blocked on Android 12+ (API 31):
  `ForegroundServiceStartNotAllowedException`. Once the service is
  running, it keeps the overlay alive when the app goes to background.
- `isAvailable` on the Dart side probes with `isShowing`: any non-null
  reply proves the handler is registered. `result.notImplemented()` for
  unknown methods is required so a typo on the Dart side surfaces as
  `MissingPluginException` instead of a hang.

## 3. The overlay window and its keep-alive service

### 3a. Window — `WindowManager`, `TYPE_APPLICATION_OVERLAY`

`TYPE_APPLICATION_OVERLAY` requires API 26; the app's `minSdk` is 24, so
guard at runtime and return `false` from `startOverlay` below API 26
(`if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false`).
Do not use the pre-26 `TYPE_PHONE` / `TYPE_SYSTEM_ALERT` types.

```kotlin
val params = WindowManager.LayoutParams(
    WindowManager.LayoutParams.WRAP_CONTENT,
    WindowManager.LayoutParams.WRAP_CONTENT,
    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
    PixelFormat.TRANSLUCENT,
).apply {
    gravity = Gravity.TOP or Gravity.START
    x = 0
    y = 200 // below the status bar; make draggable later, persist in SirajSettings
}
windowManager.addView(overlayView, params)
```

Flags, and why: `FLAG_NOT_FOCUSABLE` — the overlay never steals
keyboard/input focus from the app underneath; `FLAG_NOT_TOUCH_MODAL` —
touches outside the capsule reach the app below. Do **not** add
`FLAG_NOT_TOUCHABLE` (the capsule must be tappable to open the app and
draggable). Remove the view in `onDestroy()` and in `stopOverlay()` with
`windowManager.removeView(...)` wrapped in try/catch (removing an
unattached view throws `IllegalArgumentException`).

### 3b. What renders inside the window — cached FlutterEngine (recommended)

Use a second Flutter engine rendering a dedicated Dart entrypoint, not a
native Android view. A native view (`TextView` + `Chronometer`) would
duplicate the prayer-time logic and the capsule theming in Kotlin; the
pure prayer logic already lives in `lib/siraj/siraj_state.dart` and the
capsule widget in `lib/siraj/siraj_capsule.dart`.

- New Dart file (does not exist yet):
  `lib/siraj/siraj_overlay_entry.dart`, with:
  ```dart
  @pragma('vm:entry-point')
  void sirajOverlayMain() {
    runApp(const SirajOverlayApp()); // compact capsule: next prayer + countdown
  }
  ```
  This entrypoint must be kept by tree-shaking (`@pragma('vm:entry-point')`
  is mandatory — without it the Dart compiler strips it).
- The service creates the engine once and caches it:
  ```kotlin
  val engine = FlutterEngine(applicationContext)
  engine.dartExecutor.executeDartEntrypoint(
      DartExecutor.DartEntrypoint(
          FlutterInjector.instance().flutterLoader().findAppBundlePath(),
          "sirajOverlayMain",
      ),
  )
  FlutterEngineCache.getInstance().put("siraj_overlay_engine", engine)
  val flutterView = FlutterView(applicationContext)
  flutterView.attachToFlutterEngine(engine)
  windowManager.addView(flutterView, params)
  ```
  (Exact `FlutterView` / `FlutterEngineGroup` API depends on the embedding
  version in Flutter 3.50 — `FlutterEngine` + `FlutterEngineCache` +
  `FlutterView.attachToFlutterEngine` is the stable shape; verify against
  the embedding at implementation time.)
- **STANDING RULE:** the overlay UI must always show the next prayer and
  its countdown, even if every other content kind is off — the same rule
  as the in-app capsule (`SirajSettings.config()` forces `showPrayer` to
  `true`). The overlay entrypoint is a separate isolate: it cannot read
  the main isolate's in-memory state. It must recompute from
  `SharedPreferences` (via the existing `AppState` persistence) and the
  pure functions in `siraj_state.dart` (`buildSirajDays`,
  `planSirajLive` / `computeSirajState`), ticking with its own `Timer`.
  Prayer times are computed in `Africa/Cairo` (see the timezone fix in
  `MEMORY.md` — never use the device timezone for prayer times).
- Cost: a second engine costs roughly one extra Flutter engine of memory
  (~tens of MB). That is the price of a live Flutter overlay; if it proves
  too heavy, the fallback is a native view fed by `MethodChannel` updates
  from the main isolate — but that fallback needs the main isolate alive,
  which defeats the app-closed case, so it is not recommended.
- Tapping the capsule should open the app: attach an `OnClickListener`
  that fires a `PendingIntent` for `MainActivity` (or a
  `MethodChannel` message to the overlay engine that launches the app via
  `startActivity` with `FLAG_ACTIVITY_NEW_TASK`).

### 3c. Keep-alive — foreground service of type `specialUse`

The service (`SirajOverlayService.kt`) does two things: in
`onStartCommand` it calls `startForeground(id, notification)` **before**
adding the window, and in `onDestroy` it removes the window and calls
`stopForeground(STOP_FOREGROUND_REMOVE)`. The notification must be
posted on an existing channel — reuse the Siraj live channel
(`siraj_live`, created by `flutter_local_notifications`; id `1000+` is
the live capsule, so use a distinct id, e.g. `1100`) with a silent,
ongoing notification ("سِراج يعرض فوق التطبيقات"). `specialUse` is the
only fitting foreground-service type for a prayer overlay; note the
Play-policy caveat: Google Play restricts `specialUse` and
`SYSTEM_ALERT_WINDOW` — the Play listing needs a declaration / review
justification, and the overlay must be genuinely user-initiated (it is:
it only starts from the Siraj settings toggle). Do not use
`mediaPlayback` (that type belongs to the audio service) or `dataSync`
to dodge the review.

## 4. What happens when the app is swiped from recents

- **With the foreground service running (this spec):** swiping the app
  from recents removes the task, but the process survives because a
  foreground service is running. The overlay window stays, the overlay
  engine keeps ticking, the countdown keeps updating. This is the whole
  point of §3c.
- **Without the foreground service (today, and if the service is
  skipped):** swiping kills the process and the Dart isolate; the
  `WindowManager` view dies with it and the overlay vanishes. The
  pre-scheduled Siraj live *notification* chain still fires (it is owned
  by the system, not the process) — so the user still sees the prayer
  countdown on the lock screen, but not the floating overlay. That is the
  current behaviour and the correct fallback.
- **On reboot:** the overlay does not come back by itself. The existing
  `RECEIVE_BOOT_COMPLETED` receivers belong to
  `flutter_local_notifications` and only rebuild scheduled notifications.
  Auto-restarting the overlay on boot needs a new `BroadcastReceiver`
  that, if `overlayEnabled` was persisted, restarts the foreground
  service — explicitly out of scope for this wave; file it as follow-up
  work, and note that on Android 12+ a boot receiver cannot start a
  foreground service from the background without an exemption, so boot
  auto-restart may need to wait for the next app launch instead.
- **OEM background restrictions (Xiaomi / Samsung / Huawei / Oppo):**
  these can kill even a foreground service. If users report the overlay
  disappearing, the fix is user-facing guidance (battery → Unrestricted
  for إفاقة), not more code.

## 5. Battery optimisation and exact alarms

- **Battery optimisation:** Doze / App Standby can defer the overlay
  isolate's `Timer` ticks while the device is idle, so the countdown can
  freeze until the next maintenance window. Whitelisting the app from
  battery optimisation (`Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`)
  avoids that — but `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` is a
  Play-policy-sensitive permission: do **not** add it to the manifest
  speculatively. First ship with the foreground service only; only if
  frozen-countdown reports arrive, guide the user to Settings → Battery →
  Unrestricted manually. The overlay's countdown is local (no network),
  so Doze's network restrictions do not affect it — only timer deferral
  does.
- **Exact alarms:** `SCHEDULE_EXACT_ALARM` is already in the manifest
  and is used by the reminder / live-notification chains
  (`ReminderService.requestPermissions()`), not by the overlay itself.
  The overlay does not need exact alarms: its countdown is a
  `Timer.periodic` in the overlay isolate, and the prayer-time *plan* is
  recomputed from `siraj_state.dart`, not from alarms. On Android 12+
  the user must still grant exact-alarm access in Settings for the live
  notification chain to stay exact — that is existing behaviour, not
  overlay work.

## 6. Definition of done / manual test checklist

1. Fresh install → Siraj settings overlay toggle on → system permission
   screen opens → deny → `startOverlay()` returns `false`, no crash, no
   window.
2. Grant "Display over other apps" → toggle on → capsule appears over
   another app (e.g. Chrome), showing the next prayer + live countdown.
3. Press Home → overlay stays. Open another app → overlay stays on top.
4. Swipe إفاقة from recents → overlay stays (foreground service holds
   the process), countdown keeps ticking.
5. Toggle off (or stop from the notification) → window disappears,
   foreground service stops, no lingering notification.
6. Reboot → overlay is gone (expected, §4); live notification chain
   rebuilds as today.
7. `flutter analyze` clean; existing Siraj tests still pass — the overlay
   changes no existing behaviour.
