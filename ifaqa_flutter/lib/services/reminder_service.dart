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
      s.number('hijri_offset'),
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
      await _plugin.cancelAll();
      final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      final exact = await android?.canScheduleExactNotifications() ?? false;
      for (final plan in planReminders(AppState.instance, DateTime.now())) {
        await _plugin.zonedSchedule(
          id: plan.id,
          title: plan.title,
          body: plan.body,
          scheduledDate: tz.TZDateTime.from(plan.time, tz.local),
          notificationDetails: NotificationDetails(android: _details(plan.kind)),
          androidScheduleMode: exact ? AndroidScheduleMode.exactAllowWhileIdle : AndroidScheduleMode.inexactAllowWhileIdle,
        );
      }
    } catch (e) {
      debugPrint('reschedule failed: $e');
    }
  }

  AndroidNotificationDetails _details(ReminderKind kind) {
    if (kind != ReminderKind.fajrAlarm) {
      return const AndroidNotificationDetails(
        'ifaqa_reminders',
        'التذكيرات',
        channelDescription: 'الأذكار والورد والصيام وسورة الكهف',
        importance: Importance.high,
        priority: Priority.high,
      );
    }
    // A channel's sound is fixed once created, so each sound gets its own channel.
    final soundId = AppState.instance.text('fajr_alarm_sound') ?? 'cairo';
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
      // FLAG_INSISTENT: keep sounding until the user opens or dismisses it.
      additionalFlags: Int32List.fromList([4]),
    );
  }
}
