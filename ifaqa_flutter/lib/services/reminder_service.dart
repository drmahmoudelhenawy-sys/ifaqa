import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;
import '../models/zekr.dart';
import '../screens/athkar_screen.dart';
import '../siraj/siraj_island_views.dart';
import '../siraj/siraj_overlay.dart';
import '../siraj/siraj_state.dart';
import 'app_state.dart';
import 'reminder_plan.dart';

/// Schedules the planned reminders as local notifications (Android only for
/// now). Call [reschedule] whenever a related setting or the location changes.
class ReminderService {
  ReminderService._();
  static final ReminderService instance = ReminderService._();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _ready = false;

  /// The shared plugin instance (Siraj posts its own notifications through it).
  FlutterLocalNotificationsPlugin get plugin => _plugin;
  bool get ready => _ready;

  static bool get supported => !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  /// Navigator used to open screens from notification taps, which arrive
  /// without a BuildContext (and, on a cold start, before the first frame).
  /// Wired in main.dart with one line:
  /// `MaterialApp(navigatorKey: ReminderService.navigatorKey)`.
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  /// Athkar type waiting for the Navigator to exist (cold start: the tap
  /// is delivered during plugin init, before runApp's first frame).
  static String? _pendingAthkar;

  /// Opens the Athkar screen for [which] ('morning' | 'evening'; anything
  /// else falls back to morning), from a notification action / tap or a
  /// home-widget tap. Safe to call before the first frame or from the
  /// background isolate: the open is deferred until a Navigator exists,
  /// and silently dropped if none ever appears (background isolate).
  static Future<void> openSirajAthkar(String which) async {
    final type = which == 'evening' ? AthkarType.evening : AthkarType.morning;
    try {
      final nav = navigatorKey.currentState;
      if (nav != null) {
        // Do not await the push: its future only completes when the
        // Athkar screen is popped again.
        unawaited(
          nav.push(
            MaterialPageRoute(builder: (_) => AthkarScreen(type: type)),
          ),
        );
        return;
      }
      _pendingAthkar = which;
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _drainPendingAthkar(),
      );
    } catch (_) {
      // Background isolate (no WidgetsBinding / Navigator): nothing to open.
    }
  }

  static void _drainPendingAthkar() {
    final which = _pendingAthkar;
    if (which == null) return;
    _pendingAthkar = null;
    unawaited(openSirajAthkar(which));
  }

  Future<void> init() async {
    if (!supported || _ready) return;
    try {
      tzdata.initializeTimeZones();
      final zone = await FlutterTimezone.getLocalTimezone();
      tz.setLocalLocation(tz.getLocation(zone.identifier));
      await _plugin.initialize(
        settings: const InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher')),
        onDidReceiveNotificationResponse: handleReminderResponse,
        onDidReceiveBackgroundNotificationResponse: reminderBackgroundHandler,
      );
      _ready = true;
      _lastSignature = _signature();
      AppState.instance.addListener(_onStateChanged);
      await reschedule();
    } catch (e) {
      debugPrint('reminders unavailable: $e');
    }
  }

  /// Asks for notification and exact-alarm permission. Returns false if refused.
  Future<bool> requestPermissions() async {
    if (!supported) return false;
    await init();
    final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    final notifications = await android?.requestNotificationsPermission() ?? false;
    final exact = await android?.canScheduleExactNotifications() ?? false;
    if (!exact) await android?.requestExactAlarmsPermission();
    return notifications;
  }

  String? _lastSignature;

  /// Only the inputs of [planReminders]; XP changes must not trigger work.
  /// Includes the Siraj inputs, because planReminders now appends the
  /// Siraj reminders (ids 1100-1199) from them.
  String _signature() {
    final s = AppState.instance;
    final loc = s.location;
    return [
      for (final f in ['fajr_alarm', 'notif_morning_athkar', 'notif_evening_athkar', 'notif_kahf_friday', 'notif_fasting_mon_thu', 'notif_fasting_lunar'])
        s.flag(f),
      s.flag('notif_wird', fallback: true),
      s.strings('wird_tasks').isNotEmpty,
      s.number('wird_minutes', fallback: 8 * 60),
      s.number('fajr_alarm_offset'),
      s.text('fajr_alarm_sound'),
      s.text(fajrModeKey),
      s.number(fajrFixedKey, fallback: fajrFixedDefault),
      s.text(fajrThemeKey),
      s.number('hijri_offset'),
      s.text('khatma_goal'),
      s.flag('notif_khatma', fallback: true),
      s.flag('siraj_enabled', fallback: true),
      s.flag('siraj_k_prayer', fallback: true),
      s.flag('siraj_k_athkar', fallback: true),
      s.text('siraj_adhan_sound'),
      s.number('siraj_remind_before_mins', fallback: 10),
      s.number('siraj_remind_after_mins', fallback: 10),
      s.text('siraj_morning_athkar_minutes'),
      s.text('siraj_evening_athkar_minutes'),
      s.text('siraj_wirds_json'),
      loc.latitude.toStringAsFixed(2),
      loc.longitude.toStringAsFixed(2),
    ].join('|');
  }

  void _onStateChanged() {
    final signature = _signature();
    if (signature == _lastSignature) return;
    _lastSignature = signature;
    reschedule();
  }

  Future<void> reschedule() async {
    if (!_ready) return;
    try {
      // Pending snoozes (ids 900-908) are left alone; only the planned
      // ranges are rebuilt: 100-800 and the Siraj reminders 1100-1199.
      // The live capsule (1000-1099) is owned by SirajLiveService and is
      // never cancelled here.
      for (final pending in await _plugin.pendingNotificationRequests()) {
        if (pending.id < snoozeIdBase ||
            (pending.id >= sirajReminderFirstId &&
                pending.id <= sirajReminderLastId)) {
          await _plugin.cancel(id: pending.id);
        }
      }
      final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      final exact = await android?.canScheduleExactNotifications() ?? false;
      for (final plan in planReminders(AppState.instance, DateTime.now())) {
        await _plugin.zonedSchedule(
          id: plan.id,
          title: plan.title,
          body: plan.body,
          scheduledDate: tz.TZDateTime.from(plan.time, tz.local),
          notificationDetails: NotificationDetails(android: _details(plan)),
          payload: _payload(plan),
          androidScheduleMode: exact ? AndroidScheduleMode.exactAllowWhileIdle : AndroidScheduleMode.inexactAllowWhileIdle,
        );
      }
      // Snooze requests written by the overlay isolate (it cannot schedule
      // notifications itself): turn them into real notifications here, so
      // they still fire when the island is off. The request is removed
      // first, so the overlay tick cannot fire the same one again — and
      // the overlay tick removes it first when it fires it itself, so
      // this sees nothing in that case. (A tiny race remains if both run
      // in the same second: the user gets the island expansion and, later,
      // the notification — harmless, the actions are the same.)
      try {
        final prefs = await SharedPreferences.getInstance();
        final raw = prefs.getString('text_$sirajAthkarSnoozeRequestKey');
        final req = sirajParseAthkarSnoozeRequest(raw);
        if (req != null) {
          await prefs.remove('text_$sirajAthkarSnoozeRequestKey');
          final delay = req.fireAt.difference(DateTime.now());
          await snoozeAthkarAt(
            req.type.name,
            delay.isNegative ? Duration.zero : delay,
          );
        }
      } catch (e) {
        debugPrint('athkar snooze request failed: $e');
      }
    } catch (e) {
      debugPrint('reschedule failed: $e');
    }
  }

  AndroidNotificationDetails _details(PlannedReminder plan) {
    final fajr = plan.kind == ReminderKind.fajrAlarm;
    // Siraj prayer reminders sound the configured adhan (see
    // buildReminderDetails); every other Siraj entry uses the default
    // reminders channel.
    final sirajAdhan =
        plan.kind == ReminderKind.sirajPrayerBefore ||
        plan.kind == ReminderKind.sirajPrayerAfter;
    // Athkar reminders carry "اقرأ الآن" / "اقرأ لاحقًا" instead of the
    // generic snooze action (see buildReminderDetails).
    final sirajAthkar =
        plan.kind == ReminderKind.morningAthkar ||
        plan.kind == ReminderKind.eveningAthkar;
    return buildReminderDetails(
      fajr: fajr,
      soundId: sirajAdhan
          ? (AppState.instance.text('siraj_adhan_sound') ?? 'cairo')
          : (AppState.instance.text('fajr_alarm_sound') ?? 'cairo'),
      accent: fajr ? fajrThemeById(AppState.instance.text(fajrThemeKey)).accent : null,
      sirajAdhan: sirajAdhan,
      sirajAthkar: sirajAthkar,
    );
  }

  /// Schedules a one-off Athkar re-reminder ("اقرأ لاحقًا" from the
  /// island or from a notification) [minutes] from now, with the same
  /// two actions as the original reminder. Uses the dedicated snooze
  /// slots 909/910. The overlay isolate cannot call this (its engine has
  /// no notifications plugin) — it writes a mailbox request instead, and
  /// [reschedule] turns it into a real notification (see below).
  static Future<void> snoozeAthkar(String which, int minutes) =>
      snoozeAthkarAt(which, Duration(minutes: minutes));

  /// Same as [snoozeAthkar], with an explicit delay (used by
  /// [reschedule] for mailbox requests, whose fire time is already set).
  static Future<void> snoozeAthkarAt(String which, Duration delay) async {
    final type = which == 'evening' ? 'evening' : 'morning';
    final id = sirajAthkarSnoozeId(type);
    final when = tz.TZDateTime.now(tz.UTC).add(delay);
    final title = type == 'evening' ? 'أذكار المساء' : 'أذكار الصباح';
    final body = type == 'evening'
        ? 'اختم يومك بأذكار المساء.'
        : 'ابدأ يومك بذكر الله، أذكار الصباح في انتظارك.';
    final plugin = FlutterLocalNotificationsPlugin();
    final payload = jsonEncode({
      'id': id,
      'title': title,
      'body': body,
      'fajr': false,
      'sound': 'cairo',
      'sirajAthkar': type,
    });
    final details = NotificationDetails(
      android: buildReminderDetails(
        fajr: false,
        soundId: 'cairo',
        sirajAthkar: true,
      ),
    );
    Future<void> schedule(AndroidScheduleMode mode) => plugin.zonedSchedule(
      id: id,
      title: title,
      body: body,
      scheduledDate: when,
      notificationDetails: details,
      androidScheduleMode: mode,
      payload: payload,
    );
    try {
      await schedule(AndroidScheduleMode.exactAllowWhileIdle);
    } catch (_) {
      await schedule(AndroidScheduleMode.inexactAllowWhileIdle);
    }
  }

  /// The "اقرأ لاحقًا" default from settings (raw key
  /// `num_siraj_athkar_snooze_minutes`); 15 when unset or unreadable
  /// (e.g. the background isolate has no prefs plugin).
  static Future<int> athkarSnoozeDefaultMinutes() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return sirajNormalizeAthkarSnoozeMinutes(
        prefs.getInt('num_siraj_athkar_snooze_minutes'),
      );
    } catch (_) {
      return sirajAthkarSnoozeDefault;
    }
  }

  /// "اقرأ الآن": read the Athkar in the island (overlay) instead of
  /// opening the app screen. When the overlay is showing, leave a pending
  /// view the overlay tick picks up; when it is off but enabled, try to
  /// start it first; otherwise — or when the channel is unavailable (the
  /// background isolate) — fall back to opening AthkarScreen in the app.
  static Future<void> openAthkarInIsland(String which) async {
    final type = which == 'evening' ? 'evening' : 'morning';
    try {
      final overlay = SirajOverlayService.instance;
      if (await overlay.isShowing) {
        AppState.instance.setText(
          sirajOverlayPendingViewKey,
          sirajOverlayPendingViewValue(
            view: 'athkar',
            type: type == 'evening'
                ? SirajAthkar.evening
                : SirajAthkar.morning,
          ),
        );
        return;
      }
      if (AppState.instance.flag('siraj_overlay_enabled') &&
          await overlay.startOverlay()) {
        AppState.instance.setText(
          sirajOverlayPendingViewKey,
          sirajOverlayPendingViewValue(
            view: 'athkar',
            type: type == 'evening'
                ? SirajAthkar.evening
                : SirajAthkar.morning,
          ),
        );
        return;
      }
    } catch (_) {
      // No channel / no AppState (background isolate): fall through to
      // the app screen.
    }
    await openSirajAthkar(type);
  }

  /// What a snooze needs to recreate the notification; read back by the action handler.
  /// Also carries the Siraj routing fields: `sirajPrayer` (keep the adhan
  /// sound on the snoozed copy) and `sirajAthkar` ('morning' | 'evening',
  /// so tapping an athkar reminder opens the Athkar screen).
  String _payload(PlannedReminder plan) {
    final fajr = plan.kind == ReminderKind.fajrAlarm;
    final sirajPrayer =
        plan.kind == ReminderKind.sirajPrayerBefore ||
        plan.kind == ReminderKind.sirajPrayerAfter;
    final sirajAthkar = switch (plan.kind) {
      ReminderKind.morningAthkar => 'morning',
      ReminderKind.eveningAthkar => 'evening',
      _ => null,
    };
    return jsonEncode({
      'id': plan.id,
      'title': plan.title,
      'body': plan.body,
      'fajr': fajr,
      'sound': sirajPrayer
          ? (AppState.instance.text('siraj_adhan_sound') ?? 'cairo')
          : (AppState.instance.text('fajr_alarm_sound') ?? 'cairo'),
      'accent': fajr ? fajrThemeById(AppState.instance.text(fajrThemeKey)).accent : null,
      if (sirajPrayer) 'sirajPrayer': true,
      if (sirajAthkar != null) 'sirajAthkar': sirajAthkar,
    });
  }
}

const String snoozeActionId = 'snooze';
const int snoozeIdBase = 900;
const int snoozeMinutes = 10;
const int fajrSnoozeMinutes = 5;

/// "اقرأ الآن" / "اقرأ لاحقًا" actions on scheduled Athkar reminders
/// (and their snoozed copies). "اقرأ الآن" reads the Athkar in the island
/// (overlay) when it is running, else opens AthkarScreen;
/// "اقرأ لاحقًا" re-reminds after the default snooze minutes from
/// settings ([SirajConfig.athkarSnoozeMinutes]) — a notification action
/// cannot show the 10/15/30/60 chooser; the island's own "اقرأ لاحقًا"
/// button shows it (see `SirajAthkarReaderView`).
const String sirajReadNowActionId = 'siraj_read_now';
const String sirajReadLaterActionId = 'siraj_read_later';

/// Dedicated snooze slots for the Athkar re-reminders: morning 909,
/// evening 910 — so a morning and an evening snooze never overwrite
/// each other. (The legacy scheme maps any reminder to 900 + id~/100,
/// which would lump all Siraj reminders into 911.)
const int sirajAthkarSnoozeMorningId = 909;
const int sirajAthkarSnoozeEveningId = 910;

int sirajAthkarSnoozeId(String which) =>
    which == 'evening'
        ? sirajAthkarSnoozeEveningId
        : sirajAthkarSnoozeMorningId;

/// Siraj "أذكار" action + payload format for the live capsule.
///
/// SirajLiveService posts the ongoing capsule with payload
/// `siraj_athkar:morning` or `siraj_athkar:evening` and this action id.
/// Tapping the action (or the notification body) opens [AthkarScreen] for
/// that type, without going through the home screen. Scheduled athkar
/// reminders carry the same information in their JSON payload under
/// `sirajAthkar` (see [ReminderService._payload]).
const String sirajAthkarActionId = 'siraj_athkar';
const String sirajAthkarPayloadPrefix = 'siraj_athkar:';

/// Payload for the live capsule's athkar action: `siraj_athkar:morning` /
/// `siraj_athkar:evening`.
String sirajAthkarPayload(String which) => '$sirajAthkarPayloadPrefix$which';

/// Notification details shared by scheduled reminders and snoozed copies.
/// Self-contained (no AppState) so the background isolate can use it.
/// Athkar reminders ([sirajAthkar]) carry "اقرأ الآن" / "اقرأ لاحقًا"
/// instead of the generic snooze action; everything else keeps the single
/// "أجّلني … دقائق" action.
AndroidNotificationDetails buildReminderDetails({required bool fajr, required String soundId, int? accent, bool sirajAdhan = false, bool sirajAthkar = false}) {
  final minutes = fajr ? fajrSnoozeMinutes : snoozeMinutes;
  final actions = sirajAthkar
      ? <AndroidNotificationAction>[
          AndroidNotificationAction(sirajReadNowActionId, 'اقرأ الآن', cancelNotification: true),
          AndroidNotificationAction(sirajReadLaterActionId, 'اقرأ لاحقًا', cancelNotification: true),
        ]
      : <AndroidNotificationAction>[
          AndroidNotificationAction(snoozeActionId, 'أجّلني ${_arabicDigits(minutes)} دقائق', cancelNotification: true),
        ];
  if (!fajr && sirajAdhan) {
    // Siraj prayer reminders (before/after adhan) sound the configured
    // adhan: a channel's sound is fixed once created, so each adhan sound
    // gets its own channel — the same pattern as the Fajr alarm, but a
    // gentle reminder: high importance, no alarm category, no
    // FLAG_INSISTENT. Bundled clips: res/raw/adhan_cairo|saudi|tarateel.
    final custom = soundId != 'system';
    return AndroidNotificationDetails(
      'siraj_adhan_$soundId',
      'تذكير سِراج بالأذان',
      channelDescription: 'تذكيرات سِراج قبل الأذان وبعده بصوت الأذان المختار',
      importance: Importance.high,
      priority: Priority.high,
      sound: custom ? RawResourceAndroidNotificationSound('adhan_$soundId') : null,
      actions: actions,
    );
  }
  if (!fajr) {
    return AndroidNotificationDetails(
      'ifaqa_reminders',
      'التذكيرات',
      channelDescription: 'الأذكار والورد والصيام وسورة الكهف',
      importance: Importance.high,
      priority: Priority.high,
      actions: actions,
    );
  }
  // A channel's sound is fixed once created, so each sound gets its own channel.
  final custom = soundId != 'system';
  return AndroidNotificationDetails(
    'fajr_alarm_$soundId',
    'منبّه الفجر',
    channelDescription: 'يوقظك لصلاة الفجر',
    importance: Importance.max,
    priority: Priority.max,
    category: AndroidNotificationCategory.alarm,
    audioAttributesUsage: AudioAttributesUsage.alarm,
    sound: custom ? RawResourceAndroidNotificationSound('adhan_$soundId') : null,
    color: accent == null ? null : Color(accent),
    actions: actions,
    // FLAG_INSISTENT: keep sounding until the user opens or dismisses it.
    additionalFlags: Int32List.fromList([4]),
  );
}

String _arabicDigits(int n) => n.toString().split('').map((c) => String.fromCharCode(0x0660 + int.parse(c))).join();

/// Handles notification responses (foreground and background).
///
/// Athkar first: "اقرأ لاحقًا" re-reminds after the default snooze
/// minutes; "اقرأ الآن" — and any other Athkar open (the live capsule's
/// "أذكار" action, a body tap on a scheduled Athkar reminder) — reads the
/// Athkar in the island when it is running, else opens AthkarScreen as
/// before. Everything else keeps the previous behaviour (only the snooze
/// action does anything).
Future<void> handleReminderResponse(NotificationResponse response) async {
  if (response.actionId == sirajReadLaterActionId) {
    final type = sirajAthkarFromResponse(response) ?? 'morning';
    final minutes = await ReminderService.athkarSnoozeDefaultMinutes();
    await ReminderService.snoozeAthkar(type, minutes);
    return;
  }
  if (response.actionId == sirajReadNowActionId) {
    await ReminderService.openAthkarInIsland(
      sirajAthkarFromResponse(response) ?? 'morning',
    );
    return;
  }
  final athkar = sirajAthkarFromResponse(response);
  if (athkar != null) {
    await ReminderService.openAthkarInIsland(athkar);
    return;
  }
  if (response.actionId != snoozeActionId || response.payload == null) return;
  try {
    final data = jsonDecode(response.payload!) as Map<String, dynamic>;
    final fajr = data['fajr'] == true;
    final id = (data['id'] as num?)?.toInt() ?? 0;
    final plugin = FlutterLocalNotificationsPlugin();
    // Snooze ids live in 900-908, derived from the original reminder's range.
    // Siraj reminders (1100-1199) share slot 911 (1100 ~/ 100 == 11).
    final snoozeId = id >= snoozeIdBase ? id : snoozeIdBase + id ~/ 100;
    final when = tz.TZDateTime.now(tz.UTC).add(Duration(minutes: fajr ? fajrSnoozeMinutes : snoozeMinutes));
    final details = NotificationDetails(
      android: buildReminderDetails(fajr: fajr, soundId: data['sound'] as String? ?? 'cairo', accent: (data['accent'] as num?)?.toInt(), sirajAdhan: data['sirajPrayer'] == true, sirajAthkar: data['sirajAthkar'] != null),
    );
    final payload = jsonEncode({...data, 'id': snoozeId});
    Future<void> schedule(AndroidScheduleMode mode) => plugin.zonedSchedule(
          id: snoozeId,
          title: data['title'] as String?,
          body: data['body'] as String?,
          scheduledDate: when,
          notificationDetails: details,
          androidScheduleMode: mode,
          payload: payload,
        );
    try {
      await schedule(AndroidScheduleMode.exactAllowWhileIdle);
    } catch (_) {
      await schedule(AndroidScheduleMode.inexactAllowWhileIdle);
    }
  } catch (e) {
    debugPrint('snooze failed: $e');
  }
}

/// Which Athkar type a notification response asks to open ('morning' |
/// 'evening'), or null when it asks for nothing of the sort.
///
/// Payloads: the live capsule posts the plain string
/// `siraj_athkar:morning` / `siraj_athkar:evening` (see
/// [sirajAthkarPayload]); scheduled reminders carry the JSON field
/// `sirajAthkar`. An explicit `siraj_athkar` action id without a usable
/// payload falls back to morning.
@visibleForTesting
String? sirajAthkarFromResponse(NotificationResponse response) {
  final payload = response.payload;
  if (payload != null) {
    if (payload.startsWith(sirajAthkarPayloadPrefix)) {
      final which = payload.substring(sirajAthkarPayloadPrefix.length);
      return which == 'evening' ? 'evening' : 'morning';
    }
    try {
      final data = jsonDecode(payload) as Map<String, dynamic>;
      final which = data['sirajAthkar'] as String?;
      if (which == 'morning' || which == 'evening') return which;
    } catch (_) {}
  }
  if (response.actionId == sirajAthkarActionId) return 'morning';
  return null;
}

@pragma('vm:entry-point')
Future<void> reminderBackgroundHandler(NotificationResponse response) => handleReminderResponse(response);
