import 'dart:convert';
import 'dart:ui' show Color;
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;
import 'app_state.dart';
import 'reminder_plan.dart';

/// Schedules the planned reminders as local notifications (Android only for
/// now). Call [reschedule] whenever a related setting or the location changes.
class ReminderService {
  ReminderService._();
  static final ReminderService instance = ReminderService._();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _ready = false;

  static bool get supported => !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

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
      // Pending snoozes (ids 900+) are left alone; only the planned range is rebuilt.
      for (final pending in await _plugin.pendingNotificationRequests()) {
        if (pending.id < snoozeIdBase) await _plugin.cancel(id: pending.id);
      }
      final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      final exact = await android?.canScheduleExactNotifications() ?? false;
      for (final plan in planReminders(AppState.instance, DateTime.now())) {
        await _plugin.zonedSchedule(
          id: plan.id,
          title: plan.title,
          body: plan.body,
          scheduledDate: tz.TZDateTime.from(plan.time, tz.local),
          notificationDetails: NotificationDetails(android: _details(plan.kind)),
          payload: _payload(plan),
          androidScheduleMode: exact ? AndroidScheduleMode.exactAllowWhileIdle : AndroidScheduleMode.inexactAllowWhileIdle,
        );
      }
    } catch (e) {
      debugPrint('reschedule failed: $e');
    }
  }

  AndroidNotificationDetails _details(ReminderKind kind) {
    final fajr = kind == ReminderKind.fajrAlarm;
    return buildReminderDetails(
      fajr: fajr,
      soundId: AppState.instance.text('fajr_alarm_sound') ?? 'cairo',
      accent: fajr ? fajrThemeById(AppState.instance.text(fajrThemeKey)).accent : null,
    );
  }

  /// What a snooze needs to recreate the notification; read back by the action handler.
  String _payload(PlannedReminder plan) {
    final fajr = plan.kind == ReminderKind.fajrAlarm;
    return jsonEncode({
      'id': plan.id,
      'title': plan.title,
      'body': plan.body,
      'fajr': fajr,
      'sound': AppState.instance.text('fajr_alarm_sound') ?? 'cairo',
      'accent': fajr ? fajrThemeById(AppState.instance.text(fajrThemeKey)).accent : null,
    });
  }
}

const String snoozeActionId = 'snooze';
const int snoozeIdBase = 900;
const int snoozeMinutes = 10;
const int fajrSnoozeMinutes = 5;

/// Notification details shared by scheduled reminders and snoozed copies.
/// Self-contained (no AppState) so the background isolate can use it.
AndroidNotificationDetails buildReminderDetails({required bool fajr, required String soundId, int? accent}) {
  final minutes = fajr ? fajrSnoozeMinutes : snoozeMinutes;
  final actions = <AndroidNotificationAction>[
    AndroidNotificationAction(snoozeActionId, 'أجّلني ${_arabicDigits(minutes)} دقائق', cancelNotification: true),
  ];
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

/// Handles the snooze action (foreground and background). Reschedules a one-off
/// copy of the notification after the delay, using only the plugin.
Future<void> handleReminderResponse(NotificationResponse response) async {
  if (response.actionId != snoozeActionId || response.payload == null) return;
  try {
    final data = jsonDecode(response.payload!) as Map<String, dynamic>;
    final fajr = data['fajr'] == true;
    final id = (data['id'] as num?)?.toInt() ?? 0;
    final plugin = FlutterLocalNotificationsPlugin();
    // Snooze ids live in 900-908, derived from the original reminder's range.
    final snoozeId = id >= snoozeIdBase ? id : snoozeIdBase + id ~/ 100;
    final when = tz.TZDateTime.now(tz.UTC).add(Duration(minutes: fajr ? fajrSnoozeMinutes : snoozeMinutes));
    final details = NotificationDetails(
      android: buildReminderDetails(fajr: fajr, soundId: data['sound'] as String? ?? 'cairo', accent: (data['accent'] as num?)?.toInt()),
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

@pragma('vm:entry-point')
Future<void> reminderBackgroundHandler(NotificationResponse response) => handleReminderResponse(response);
