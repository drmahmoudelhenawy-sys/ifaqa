# Siraj overlay — native Android implementation guide

Status: **implemented** (2026-11-18). The native side landed:
`android/app/src/main/kotlin/com/ifaqa/ifaqa_flutter/SirajOverlayService.kt`
(foreground service + overlay window + second FlutterEngine),
`MainActivity.kt` (the `'siraj_overlay'` channel), the manifest entries
(§1), and the Dart entrypoint `lib/siraj/siraj_overlay_entry.dart`
(`sirajOverlayMain`). The Flutter side (`lib/siraj/siraj_overlay.dart`,
`SirajOverlayService`) now talks to the real native side. **Not verified
on a real device yet** — see "Still to verify on a real device" below.
`flutter analyze` is clean and the Siraj tests pass (see §6).

Later additions (2026-11-18, same wave as this doc update):
- **Free drag + persisted position + small default:** the overlay window
  is freely draggable by touch (no left/center/right preset), the
  position persists across restarts, the default position is
  top-anchored and centred, and the default size is small (see §3a).
  The in-app capsule shares the same pill sizing
  (`sirajCapsulePillSize`) and the same small default.
- **Sohag location:** prayer times are computed for the saved location,
  defaulting to Sohag (26.5569, 31.6948) — not Cairo. The Africa/Cairo
  *timezone* pin stays (Sohag shares it); only the coordinates changed.
  Verified against the user's old app (Fajr 4:47, Dhuhr 11:39 — the old
  app says 11:38, the Dart package rounds to the nearest minute).
- **Heads-up dodge:** a `NotificationListenerService`
  (`SirajNotificationListener.kt`, §3d) reports notification banners;
  while one shows, the island shifts down below it and moves back when
  it is gone. The countdown is never hidden. SystemUI draws banners
  above every app window — no window type can draw over them — so the
  fix is to move, not to fight the z-order.
- **Circle shape + gestures + animations:** the capsule can be a small
  round badge (pill stays the default), tap/double-tap/long-press/swipes
  map to actions (tap: prayer times, long-press: Siraj tab, by default),
  and the capsule/expanded view animate (fade + scale by default, or
  slide, or off). The expanded panel/cards are scrollable and capped to
  the screen, so the bottom buttons cannot be clipped. See §3e.
- **Athkar reader + Tasbih in the island (2026-11-18):** tapping an
  Athkar pill expands the overlay to a tall panel with the full Athkar
  text (morning/evening chooser, per-zekr counting) and a Tasbih tab
  sharing the app's counter — no need to open the app. Scheduled Athkar
  reminders offer "اقرأ الآن" (read now, in the island) and
  "اقرأ لاحقًا" (re-remind after 10/15/30/60 min). See §3f.

## What was implemented vs what still needs a real device

Implemented (code-complete, statically verified only):
- Foreground service of type `specialUse`, `startForeground` before the
  window is added, silent ongoing notification (id 1100) on the existing
  `siraj_live` channel, window removal in `onDestroy`/stop (try/catch).
- `TYPE_APPLICATION_OVERLAY` window (API 26 guard, no `TYPE_PHONE` /
  `TYPE_SYSTEM_ALERT`), flags `FLAG_NOT_FOCUSABLE | FLAG_NOT_TOUCH_MODAL`
  (no `FLAG_NOT_TOUCHABLE`).
- MethodChannel `siraj_overlay`: `hasPermission`, `requestPermission`,
  `startOverlay`, `stopOverlay`, `isShowing`, `notImplemented()` for
  unknown methods.
- Second FlutterEngine cached as `siraj_overlay_engine`, running the
  `sirajOverlayMain` entrypoint; the overlay UI always shows the next
  prayer + live countdown (Africa/Cairo timezone, saved location —
  Sohag by default), recomputed from SharedPreferences via `AppState` +
  the pure functions in `siraj_state.dart`, ticking with its own
  `Timer`.
- Tap the capsule opens the app (MethodChannel `openApp` → MainActivity
  with `FLAG_ACTIVITY_NEW_TASK`); the service notification has a
  "إيقاف" stop action and opens the app on tap.
- Free drag of the overlay window with persisted position (own
  SharedPreferences file `siraj_overlay`, keys `x_px`/`y_px`), default
  top-anchored centred position, small size by default.
- Heads-up dodge via `SirajNotificationListener` (§3d): the island
  shifts below a notification banner while it shows and returns after.
  Notification access is enabled from the Siraj settings screen.
- Circle badge shape, configurable gestures, show/hide animations,
  scrollable expanded panel/cards capped to the screen (§3e).
- Expanded island: Athkar reader + Tasbih in the overlay, "اقرأ الآن" /
  "اقرأ لاحقًا" reminder actions, snooze mailbox (§3f).

Deliberate deviations from the spec below (each found while implementing,
verified against the Flutter embedding / AOSP sources — see the notes in
§2, §3a, §3b):
- The window is an **explicit 380x76 dp**, not `WRAP_CONTENT`: a
  `FlutterView` is a `FrameLayout` whose render surface is added with
  `MATCH_PARENT` params, so under `WRAP_CONTENT` it measures to the full
  screen — the window would then swallow every touch on the device. A
  capsule-sized window keeps the touchable area to the capsule.
- Gravity is `TOP | CENTER_HORIZONTAL` (not `TOP | START`): the window is
  fixed-width, so centring it centres the capsule; the Dart side still
  honours `capsuleAlign` inside the window.
  **Superseded 2026-11-18 (drag wave):** gravity is now `TOP | START`
  and the window is freely draggable — the Dart side tracks the position
  and moves it with `moveOverlayTo` (absolute, dp); the service persists
  it in its own `siraj_overlay` prefs and restores it on start. The
  default is top-anchored, centred, 8 dp below the status bar.
  `capsuleAlign` no longer moves the overlay (the window position is
  free); it still aligns the in-app capsule.
- `startOverlay` replies **asynchronously**: the service adds the window
  in `onStartCommand`, so `MainActivity` holds the channel `result` until
  the service reports back (3s timeout backstop), instead of the spec's
  synchronous sketch.
- Only `SharedPreferencesPlugin` is registered on the overlay engine
  (the spec did not mention plugin registration): a hand-created engine
  has no plugins, so without it every `SharedPreferences` call in the
  overlay isolate would throw `MissingPluginException`.
- The overlay UI is a **compact capsule** built in
  `siraj_overlay_entry.dart`, not the full `SirajCapsule` widget: the
  full capsule is navigation/audio-heavy (panels, cards, Athkar screens,
  `AudioService`) and does not belong in a second isolate. Theme colours
  mirror `sirajThemes`.
- The service creates the `siraj_live` notification channel if it does
  not exist yet (the user may never have enabled the live notification).

Still to verify on a real device (not done — no device in this wave):
- Permission flow (§6 items 1–2): deny → `startOverlay()` false, no
  crash; grant → capsule appears over another app.
- Home / other app / swipe-from-recents: overlay stays, countdown keeps
  ticking (foreground service hold).
- Tap the capsule opens the app; the notification's "إيقاف" action stops
  the overlay; toggle off stops it with no lingering notification.
- Window sizing / touch behaviour: the 380x76 dp window must show the
  whole capsule (including its shadow) and must not block touches
  outside it.
- `specialUse` foreground-service behaviour on API < 34 (the manifest
  bit is unknown to those versions; expected to be ignored, unproven).
- The second engine's memory cost (~one extra Flutter engine).
- Drag: the capsule follows the finger, stays where dropped after the
  app restarts, and never leaves the screen (clamp).
- Sohag times: the overlay and the app show Sohag prayer times
  (Fajr 4:47 today), not Cairo.
- Heads-up dodge: a WhatsApp banner shifts the island below it and it
  returns when the banner is gone; the countdown never disappears.
- Circle badge, gesture mappings, entrance animation, expanded
  panel/cards scrolling to the bottom buttons on a small screen.

Known gaps / follow-ups (not implemented in this wave):
- **The settings toggle is wired (done 2026-11-18, coordinator wave).**
  `SirajSettingsScreen` calls `SirajOverlayService.startOverlay()` /
  `stopOverlay()` from the overlay toggle's `onChanged`, opens the
  system permission screen via `requestPermission()` when the permission
  is missing, and re-checks `hasPermission()` on resume to start the
  overlay once granted (or revert the toggle with a notice if denied).
  `main.dart` restores the overlay on app launch when `overlayEnabled`
  and `overlayShowWhenAppClosed` are both on and the permission is
  granted.
- No boot auto-restart (§4), Play-policy caveat for `specialUse` /
  `SYSTEM_ALERT_WINDOW` (§3c), OEM battery restrictions (§4).
- The overlay has no exit animation: the service removes the window
  outright when the overlay stops, so the fade-out cannot play there
  (the entrance fade-in does play).
- The main app's in-app capsule and live notification still compute
  prayer times in the device timezone; only the overlay is Cairo-pinned
  (`buildSirajDays(cairo: true)`). The user is in Egypt, so they agree
  in practice. The *location* is Sohag everywhere now (default
  `AppLocation.sohag`).
- Reading Athkar in the island does not award XP (the full Athkar
  screen does), and the per-zekr remaining counts reset when the reader
  closes — only the day's "done" flag persists. Clan-quest taps are not
  counted from the island Tasbih (the full Masbaha screen owns those);
  the counter number itself is shared.

## 0. Verified facts about this app (checked 2026-11-18)

- Kotlin sources live in `android/app/src/main/kotlin/com/ifaqa/ifaqa_flutter/`
  (contains `MainActivity.kt`, `HomeWidgets.kt` and now
  `SirajOverlayService.kt`).
- `MainActivity.kt` now registers the `siraj_overlay` channel in a
  `configureFlutterEngine` override (added 2026-11-18).
- Manifest package/namespace: `com.ifaqa.ifaqa_flutter`, `applicationId`
  `com.ifaqa.app` (`android/app/build.gradle.kts`).
- Flutter 3.50.0: `compileSdk 36`, `minSdk 24`, `targetSdk 36`
  (`flutter.targetSdkVersion` / `flutter.minSdkVersion` in
  `android/app/build.gradle.kts`).
- Manifest has `FOREGROUND_SERVICE`,
  `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `POST_NOTIFICATIONS`,
  `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM`, `WAKE_LOCK`,
  `SYSTEM_ALERT_WINDOW` (added as part of the Flutter-side wave) and now
  `FOREGROUND_SERVICE_SPECIAL_USE` plus the `SirajOverlayService`
  declaration (§1). No `flutter_overlay_window` or any overlay
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

## 1. AndroidManifest entries — done 2026-11-18

File: `android/app/src/main/AndroidManifest.xml`. Exact lines:

```xml
<!-- Siraj overlay over other apps (SYSTEM_ALERT_WINDOW, "Display over other apps"). -->
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
```

Already present, do not duplicate:

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

Added 2026-11-18 with the service in §3 (not present before):

```xml
<!-- Required on API 34+ to run a foreground service of type "specialUse". -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
```

And the service declaration itself (inside `<application>`, added
2026-11-18 with §3):

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

## 2. MethodChannel handler — registration and method contract — done 2026-11-18

Implemented in `MainActivity.kt` (the file previously had no
`configureFlutterEngine` override) and `SirajOverlayService.kt` (the
service). One deviation from the sketch below: `startOverlay` replies
**asynchronously** — the service adds the window in `onStartCommand`,
so `MainActivity` holds the channel `result` until
`SirajOverlayService.onWindowShown` fires (3s timeout backstop, so the
Dart future never hangs). The contract is unchanged: it replies `true`
only after the window is actually added.

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
| `moveOverlayTo` | no-op | (Overlay engine only.) Move the window to an absolute position `{x, y}` in dp; clamped to the screen. Sent by the Dart side on drags and the heads-up dodge. |
| `setOverlaySize` | no-op | (Overlay engine only.) Resize the window to `{width, height}` in dp. The expanded island grows to a tall panel (380x~480) and shrinks back to 380x76 on collapse; height is clamped to the screen and y is moved up when the taller window would run off the bottom. |
| `getOverlayPosition` | error | (Overlay engine only.) Returns `{x, y, screenW, screenH}` in dp — the window position the Dart side tracks, and the screen size it clamps against. |
| `saveOverlayPosition` | no-op | (Overlay engine only.) Persist the window position (px) so the capsule reopens where it was dragged. |
| `hasNotificationAccess` | `false` | Whether the user enabled notification access (the heads-up dodge needs it). |
| `openNotificationAccessSettings` | `false` | If access is already granted return `true`; else open `Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS` and return `false` (Dart re-checks on resume). |

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
    y = 200 // below the status bar; the drag wave (2026-11-18) made this
    // freely draggable and persisted (see SirajOverlayService.kt)
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

**Deviation (2026-11-18): the window is an explicit 380x76 dp, not
`WRAP_CONTENT`.** Verified against the Flutter embedding sources
(`FlutterView.java`, `FlutterSurfaceView.java`) and AOSP
(`SurfaceView.java`): a `FlutterView` is a `FrameLayout` whose render
surface is added with `MATCH_PARENT` params, and a `SurfaceView` under
an `AT_MOST` measure spec reports the full spec size — so a
`WRAP_CONTENT` window measures to the full screen. The window would
then swallow every touch on the device (there is no "outside" for
`FLAG_NOT_TOUCH_MODAL` to pass through), defeating the flags above. A
capsule-sized window keeps the touchable area to the capsule; the Dart
UI centres the capsule in the 380x76 box. This needs confirming on a
real device (§6). **Gravity is `TOP | START` since the drag wave
(2026-11-18):** the window is freely positioned by x/y (dragged,
persisted, or shifted below a heads-up banner); the Dart side no
longer uses `capsuleAlign` for the overlay.

### 3b. What renders inside the window — cached FlutterEngine (recommended)

Use a second Flutter engine rendering a dedicated Dart entrypoint, not a
native Android view. A native view (`TextView` + `Chronometer`) would
duplicate the prayer-time logic and the capsule theming in Kotlin; the
pure prayer logic already lives in `lib/siraj/siraj_state.dart` and the
capsule widget in `lib/siraj/siraj_capsule.dart`.

- New Dart file (added 2026-11-18):
  `lib/siraj/siraj_overlay_entry.dart`, with:
  ```dart
  @pragma('vm:entry-point')
  void sirajOverlayMain() {
    runApp(const SirajOverlayApp()); // compact capsule: next prayer + countdown
  }
  ```
  This entrypoint must be kept by tree-shaking (`@pragma('vm:entry-point')`
  is mandatory — without it the Dart compiler strips it).
  **Implemented as a compact capsule, not the full `SirajCapsule`
  widget:** the full capsule is navigation/audio-heavy (panels, cards,
  Athkar screens, `AudioService`) and does not belong in a second
  isolate. The overlay entry builds its own small pill with the same
  theme colours (mirrored from `sirajThemes`), the same pill sizes, and
  the same "prayer chip always visible" rule. It shows no media state
  (the overlay isolate cannot see the main isolate's audio) and ignores
  `autoHide` and `capsuleWidthFrac` (the window cannot resize).
  Cairo-pinned times are provided by `prayerTimesCairo` in
  `lib/models/prayer_time_info.dart` and `buildSirajDays(..., cairo:
  true)` in `siraj_settings.dart` (the main app still uses
  device-local times); covered by `test/siraj_overlay_test.dart`.
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
  **As implemented:** the view is
  `FlutterView(applicationContext, FlutterSurfaceView(applicationContext,
  true))` — the transparent surface, so only the capsule shows (verified
  against `FlutterView.java` / `FlutterSurfaceView.java`). **Only
  `SharedPreferencesPlugin` is registered on the overlay engine**
  (`engine.plugins.add(SharedPreferencesPlugin())`): a hand-created
  engine has no plugins, so without it every `SharedPreferences` call in
  the overlay isolate would throw `MissingPluginException`. Nothing else
  is registered — the overlay needs no Firebase, audio or notifications.
  The engine is destroyed and removed from the cache in `onDestroy` /
  `stopOverlay`.
- **STANDING RULE:** the overlay UI must always show the next prayer and
  its countdown, even if every other content kind is off — the same rule
  as the in-app capsule (`SirajSettings.config()` forces `showPrayer` to
  `true`). The overlay entrypoint is a separate isolate: it cannot read
  the main isolate's in-memory state. It must recompute from
  `SharedPreferences` (via the existing `AppState` persistence) and the
  pure functions (`buildSirajDays` in `siraj_settings.dart`,
  `planSirajLive` / `computeSirajState` in `siraj_state.dart`), ticking
  with its own `Timer`.
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
  **As implemented (the MethodChannel route):** the Dart side sends
  `openApp` on the `siraj_overlay` channel registered on the overlay
  engine, and the service starts `MainActivity` with
  `FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_SINGLE_TOP`. (An
  `OnClickListener` on the `FlutterView` was not used: the view forwards
  touches to the Flutter gesture system, so a native click listener is
  unreliable.)

### 3c. Keep-alive — foreground service of type `specialUse`

The service (`SirajOverlayService.kt`) does two things: in
`onStartCommand` it calls `startForeground(id, notification)` **before**
adding the window, and in `onDestroy` it removes the window and calls
`stopForeground(STOP_FOREGROUND_REMOVE)`. The notification must be
posted on an existing channel — reuse the Siraj live channel
(`siraj_live`, created by `flutter_local_notifications`; id `1000+` is
the live capsule, so use a distinct id, e.g. `1100`) with a silent,
ongoing notification ("سِراج يعرض فوق التطبيقات"). **As implemented:**
the service creates the `siraj_live` channel itself (IMPORTANCE_LOW, no
sound/vibration) if it does not exist yet, so the foreground service
works even when the user never enabled the live notification; if the
channel already exists the call is a no-op. The notification also has
an "إيقاف" action that stops the service, and tapping it opens the app.
`specialUse` is the only fitting foreground-service type for a prayer overlay; note the
Play-policy caveat: Google Play restricts `specialUse` and
`SYSTEM_ALERT_WINDOW` — the Play listing needs a declaration / review
justification, and the overlay must be genuinely user-initiated (it is:
it only starts from the Siraj settings toggle). Do not use
`mediaPlayback` (that type belongs to the audio service) or `dataSync`
to dodge the review. **Note:** the foreground-service type is passed
explicitly (`FOREGROUND_SERVICE_TYPE_SPECIAL_USE`) on API 34+ and the
two-argument `startForeground` is used below that; behaviour of the
`specialUse` manifest bit on API < 34 is unproven on a real device.

### 3d. Heads-up dodge — `SirajNotificationListener`

**Platform limit (honest, by design):** a heads-up notification banner
is drawn by SystemUI *above* every app window, including a
`TYPE_APPLICATION_OVERLAY` window. No window type available to a
third-party app can draw over it — so when a WhatsApp banner appears,
the island underneath it is covered for a few seconds and the prayer
countdown disappears from view. The fix is to move, not to fight the
z-order.

Flow (all implemented 2026-11-18):
1. `SirajNotificationListener.kt` (a `NotificationListenerService`,
   manifest-declared with `BIND_NOTIFICATION_LISTENER_SERVICE`) watches
   posted/removed notifications. Only heads-up *candidates* are
   forwarded: high-importance (or full-screen-intent) notifications
   from other apps, not ongoing ones, while the screen is on. The app's
   own notifications never shift the island, and low-importance ones
   (shade-only) never move it.
2. The listener calls `SirajOverlayService.instance?.onHeadsUpPosted()`
   / `onHeadsUpRemoved()` (same process; no-op when the overlay is not
   showing). The service forwards `headsUpShown` / `headsUpHidden` on
   the overlay engine's channel.
3. The Dart side (`siraj_overlay_entry.dart`) owns the decision
   (`SirajOverlayShift` in `siraj_state.dart`, pure + tested): if the
   island's top is above 160 dp, it moves to 160 dp (below a typical
   banner); if it is already lower, it stays. The island is never
   hidden. On dismiss it moves back immediately; otherwise a timer
   moves it back after 8 s (banners auto-dismiss after ~5 s).
4. Notification access is enabled from the Siraj settings screen
   ("فتح إعدادات الوصول للإشعارات" → system notification-access
   settings; `hasNotificationAccess` / `openNotificationAccessSettings`
   on the `siraj_overlay` channel, `MainActivity.kt`). Without it the
   dodge is off and banners cover the island as before — the settings
   note says so plainly.

### 3e. Circle shape, gestures, animations, scrollable expanded view

- **Shape** (`SirajConfig.capsuleShape`, settings "الشكل"): `pill`
  (default) or `circle`. Circle is a small round badge — next prayer
  label + countdown, with a progress ring to the next adhan in-app —
  for parking at the top, e.g. around the camera punch-hole. The badge
  always shows the prayer countdown; the other kinds are reachable by
  tapping to expand. The overlay renders the same badge (without the
  ring) in its 380x76 window.
- **Gestures** (`SirajConfig.gesture*`, settings "إيماءات الكبسولة"):
  tap, double-tap, long-press, swipe up/down/left/right, each mapped to
  `prayer_times` (open today's prayer times), `siraj_tab`, `play_pause`,
  `dismiss` (hide the current reminder), or `none`. Defaults keep the
  current behaviour (tap: prayer times, long-press: Siraj tab). Swipes
  are detected as fast flings at drag end (>700 px/s); a slow drag
  still moves the capsule. While expanded, swipe-up collapses as
  before. Over the overlay only tap/long-press work (they open the app,
  and the mapped action picks the tab via the `siraj_pending_tab` flag
  the app shell picks up on resume); the pan there is the drag, and
  music/dismiss cannot run from the overlay isolate.
- **Animations** (`SirajConfig.capsuleAnimation`, settings "الحركة"):
  `fade` (fade + scale, default), `slide` (slide down + fade), `off`.
  The in-app capsule plays an entrance animation once on mount and the
  collapsed ↔ expanded switch animates by style; the overlay plays the
  entrance on mount. There is no exit animation for the overlay: the
  service removes the window outright when it stops.
- **Expanded view clipping:** the panel and the adhan/athkar cards are
  now scrollable (`SingleChildScrollView` with a `ConstrainedBox` that
  keeps the buttons bottom-pinned when the content is short) and their
  height is capped to the screen (`sirajExpandedHeight`: preferred
  height, but ending 16 dp above the screen bottom after the safe
  area). The bottom action buttons can no longer be clipped by short
  screens or large fonts. The media card is short enough to need no
  scroll.

### 3f. Athkar reader + Tasbih in the island, reminder actions

- **Reading in the island:** tapping an Athkar pill expands the overlay
  to a tall panel (window resized via `setOverlaySize` to 380x~480 dp)
  with the full Athkar text — a morning/evening chooser, every zekr with
  its remaining count (tap counts one down, long-press completes the
  zekr), and "تم" to mark the day's Athkar done. The in-app capsule
  shows the same reader (`SirajAthkarReaderView` in
  `lib/siraj/siraj_island_views.dart`, shared by both surfaces); its
  panel buttons open the reader / Tasbih card instead of navigating
  away. The header keeps the prayer chip, so the countdown stays
  visible while reading. The panel header is draggable; closing
  collapses back to the 76 dp pill at its previous position. While
  expanded, the heads-up dodge is off (the tall panel stays put).
- **Reminder actions:** scheduled Athkar reminders (and their snoozed
  copies) carry two actions instead of the generic snooze: "اقرأ الآن"
  and "اقرأ لاحقًا" (`buildReminderDetails(sirajAthkar: true)`).
  "اقرأ الآن" leaves a pending view (`text_siraj_overlay_pending_view`
  = `athkar:morning|evening`) the overlay tick picks up within a
  second — starting the overlay first when it is enabled — and falls
  back to opening AthkarScreen when the island cannot start (e.g. the
  background isolate, no overlay permission). The live capsule's
  "أذكار" action and body taps on Athkar reminders route the same way.
- **"اقرأ لاحقًا":** a notification action cannot show a chooser, so it
  re-reminds after the default from settings
  (`SirajConfig.athkarSnoozeMinutes`, default 15, set in the Siraj
  settings Athkar card). Inside the island, the button opens the
  chooser (10/15/30/60) every time. Snoozed copies use dedicated ids
  (morning 909, evening 910) so the two never overwrite each other.
- **Snooze mailbox:** the overlay isolate cannot schedule notifications
  (only SharedPreferences is registered on its engine), so an island
  snooze writes a request (`text_siraj_athkar_snooze_request`,
  `{type, minutes, fireAt}`). The overlay's 1s tick fires it when due
  (re-expanding to the reader), and the main isolate's
  `ReminderService.reschedule` turns it into a real notification if it
  sees it first. A tiny race remains if both run in the same second
  (island expansion + the notification) — harmless, the actions are
  the same.
- **Tasbih:** the island's Tasbih tab and the app's Masbaha screen
  share one counter (`masbaha_count` / `masbaha_zekr` / `masbaha_goal`
  in AppState, goal default 100, choices 33/100/500/1000). The count is
  read on open and written on every tap; reopen to see the other
  surface's latest number (last write wins while both are open).
  Clan-quest taps are NOT counted from the island — the full screen
  owns those.

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

Implemented 2026-11-18; items 1–6 still need a real device (none was
available in this wave). Item 7 is done.

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
   changes no existing behaviour. **Done 2026-11-18:** `flutter analyze
   --no-pub` clean, `flutter test --no-pub` passes (including the new
   `test/siraj_overlay_test.dart` for the Cairo-pinned times). The Kotlin
   side could not be compiled on this machine (no Android SDK here);
   the coordinator's APK attempt is the first Kotlin compile check.
8. Drag the capsule anywhere on the screen → it follows the finger;
   close and reopen the app → it reopens where it was left; it never
   leaves the screen.
9. The overlay and the app show Sohag prayer times (Fajr 4:47 today),
   and the expanded panel uses the same saved location.
10. Send yourself a WhatsApp message while the island is at the top →
    the island shifts below the banner, the countdown stays visible,
    and it returns when the banner is dismissed (needs notification
    access enabled in Siraj settings).
11. Shape "دائرة" → small round badge with the prayer countdown and a
    progress ring; tap expands to the full panel.
12. Gestures: remap tap to "تشغيل/إيقاف" → tapping toggles music;
    long-press → Siraj tab. On the overlay, tap/long-press open the app
    on the mapped tab.
13. Expanded panel on a small screen / large fonts → scrolls to the
    bottom buttons (أذكار الصباح / تابع المصحف / المسبحة); nothing is
    clipped. Entrance animation plays (fade + scale) when the capsule
    appears.
14. Athkar in the island: tap an Athkar pill (or the reminder's
    "اقرأ الآن") → the island expands to the full Athkar text with a
    morning/evening chooser; tap a zekr to count it down, "تم" marks it
    done. "اقرأ لاحقًا" from the notification re-reminds after the
    default minutes; from the island it asks 10/15/30/60 and re-reminds
    at that time.
15. Tasbih in the island: the Tasbih tab counts, switches phrase, sets
    a goal and resets; the number matches the Masbaha screen (count in
    one, see it in the other after reopening).
16. Expanded panel: drag by the header, close returns the pill to its
    previous position; a WhatsApp banner while expanded leaves the
    panel in place.

The settings toggle is wired (see "Known gaps" at the top): the toggle
starts/stops the overlay and the resume handler covers the permission
grant flow.

## 2026-11-22 — edge drag, gestures, time press (source-level, pending build)

Fixed three gaps found by comparing this port against the native v9 app:

- **Edge-reach drag:** the capsule was centred in the fixed 380x76 window
  and the WHOLE window was clamped to the screen, so the capsule stopped
  a half-window short of every edge and upward drags hit a dead zone —
  the same bug class the native v9 fixed in `CameraPlacement.kt`. The
  drag now uses [sirajDragOverlayPlacement] in `siraj_state.dart`: the
  VISIBLE capsule is clamped to the screen, the window is centred on it
  and clamped as before, and the remainder is the capsule's in-window
  offset (`_capInsetX/_capInsetY`, persisted in prefs on drag end). The
  collapsed pill renders with a Stack/Positioned at that offset instead
  of `Alignment.center`. Tested in `test/siraj_overlay_drag_test.dart`
  (top-edge, both side edges, mixed drags, drag-back recentering).
- **Gestures:** the overlay isolate only honoured tap and long-press.
  It now runs the configured double-tap and swipe actions too — a fast
  fling at drag end (700 px/s, dominant axis, same rule as the in-app
  capsule) is a swipe and snaps the island back. 'dismiss' hides the
  current reminder state (session-local set, like the in-app capsule);
  'prayer_times'/'siraj_tab' open the app with the pending-tab flag;
  app-only actions (e.g. 'play_pause', whose AudioService lives in the
  main isolate) open the app so the action can run there. Adding
  double-tap delays single-tap by the double-tap timeout (same tradeoff
  as the native app's singleTapRun).
- **Time press:** new gesture action 'toggle_time' (in the settings
  pickers too) flips the countdown format for the session in both the
  in-app capsule and the overlay — the old native app's 'toggle'
  gesture. Never rewrites the stored setting.

Not done: Kotlin unchanged (window stays fully clamped there — the Dart
side now positions the capsule inside it instead). No stopWithTask /
onTaskRemoved changes: the defaults already match the native app, no
demonstrated defect. Still needs a real build + device pass: drag feel,
arena timing (tap delay), swipe fling feel, heads-up interplay with a
capsule parked at the top edge.
