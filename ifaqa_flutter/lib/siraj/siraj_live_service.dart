import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;

import '../services/app_state.dart';
import '../services/reminder_service.dart';
import 'siraj_capsule.dart' show sirajThemeById;
import 'siraj_settings.dart';
import 'siraj_state.dart';

/// Id range reserved for Siraj: 1000-1099. [ReminderService.reschedule] only
/// cancels ids below 900, so the two never touch each other.
const int sirajLiveFirstId = 1000;
const int sirajLiveLastId = 1099;
const String sirajChannelId = 'siraj_live';

/// The Android "live capsule": one ongoing, silent notification with a native
/// count-down chronometer to the next prayer / iqamah, visible on the status
/// bar and the lock screen. Athkar windows add a reminder entry (still
/// counting down to the next prayer) that hands back to the prayer countdown
/// after 30 minutes.
///
/// How it keeps going while the app is closed: the entry for "now" is shown
/// immediately with id 1000. Every later adhan / iqamah end of the next two
/// days is pre-scheduled with zonedSchedule (ids 1001...), each carrying its
/// own countdown target. Each notification expires (timeoutAfter) exactly when
/// the next one is due, so only one capsule is visible at a time. The chain is
/// rebuilt on start, on resume and whenever the settings or location change.
class SirajLiveService with WidgetsBindingObserver {
  SirajLiveService._();
  static final SirajLiveService instance = SirajLiveService._();

  bool _started = false;
  String? _signature;
  Timer? _debounce;

  bool get supported => ReminderService.supported;

  Future<void> init() async {
    if (!supported || _started) return;
    if (!ReminderService.instance.ready) return;
    _started = true;
    _signature = SirajSettings.liveSignature();
    AppState.instance.addListener(_onStateChanged);
    WidgetsBinding.instance.addObserver(this);
    await replan();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) replan();
  }

  void _onStateChanged() {
    final s = SirajSettings.liveSignature();
    if (s == _signature) return;
    _signature = s;
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 600), replan);
  }

  Future<void> _cancelAll({bool includeCurrent = true}) async {
    final plugin = ReminderService.instance.plugin;
    for (
      var id = includeCurrent ? sirajLiveFirstId : sirajLiveFirstId + 1;
      id <= sirajLiveLastId;
      id++
    ) {
      await plugin.cancel(id: id);
    }
  }

  /// Rebuilds the chain from scratch (or removes it when disabled).
  Future<void> replan() async {
    if (!supported || !ReminderService.instance.ready) return;
    try {
      final config = SirajSettings.config();
      if (!config.enabled || !config.liveNotification) {
        await _cancelAll();
        return;
      }
      final plugin = ReminderService.instance.plugin;
      final android = plugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      if (await android?.areNotificationsEnabled() == false) return;
      final exact = await android?.canScheduleExactNotifications() ?? false;

      final now = DateTime.now();
      final plan = planSirajLive(
        now: now,
        days: buildSirajDays(AppState.instance.location, now, from: -1, to: 3),
      );
      final color = sirajThemeById(config.theme).liveColor;

      await _cancelAll(includeCurrent: false);
      for (
        var i = 0;
        i < plan.length && i <= sirajLiveLastId - sirajLiveFirstId;
        i++
      ) {
        final e = plan[i];
        final end = i + 1 < plan.length ? plan[i + 1].time : e.countdownTarget;
        final details = NotificationDetails(
          android: liveDetails(e, color: color, until: end),
        );
        // Payload for the "أذكار" action / body tap: which Athkar window
        // applies to this entry (see [sirajAthkarForLiveEntry]).
        final payload = sirajAthkarPayload(sirajAthkarForLiveEntry(e).name);
        final id = sirajLiveFirstId + i;
        if (i == 0) {
          await plugin.show(
            id: id,
            title: e.title,
            body: e.body,
            notificationDetails: details,
            payload: payload,
          );
        } else {
          await plugin.zonedSchedule(
            id: id,
            title: e.title,
            body: e.body,
            scheduledDate: tz.TZDateTime.from(e.time, tz.local),
            notificationDetails: details,
            payload: payload,
            androidScheduleMode: exact
                ? AndroidScheduleMode.exactAllowWhileIdle
                : AndroidScheduleMode.inexactAllowWhileIdle,
          );
        }
      }
    } catch (e) {
      debugPrint('siraj live failed: $e');
    }
  }

  /// Asks for notification permission (used when the user turns the capsule on).
  Future<void> ensurePermission() async {
    if (!supported) return;
    await ReminderService.instance.requestPermissions();
  }
}

/// Notification details for one live entry: silent, ongoing, with a native
/// chronometer counting down to [SirajLiveEntry.countdownTarget].
@visibleForTesting
AndroidNotificationDetails liveDetails(
  SirajLiveEntry e, {
  required int color,
  required DateTime until,
}) {
  final lifetime = until.difference(e.time).inMilliseconds;
  return AndroidNotificationDetails(
    sirajChannelId,
    'سِراج',
    channelDescription:
        'كبسولة سِراج الحيّة: العدّ التنازلي للصلاة القادمة والإقامة',
    importance: Importance.low,
    priority: Priority.low,
    ongoing: true,
    autoCancel: false,
    onlyAlertOnce: true,
    silent: true,
    playSound: false,
    enableVibration: false,
    channelShowBadge: false,
    showWhen: true,
    when: e.countdownTarget.millisecondsSinceEpoch,
    usesChronometer: true,
    chronometerCountDown: true,
    category: AndroidNotificationCategory.status,
    visibility: NotificationVisibility.public,
    color: Color(color),
    colorized: true,
    // "أذكار" opens the Athkar screen for the window that applies
    // (see [sirajAthkarForLiveEntry]) without going through the home
    // screen. The capsule itself stays: cancelNotification is false,
    // and the chronometer keeps counting down to the next prayer/iqamah.
    actions: <AndroidNotificationAction>[
      AndroidNotificationAction(
        sirajAthkarActionId,
        'أذكار',
        showsUserInterface: true,
        cancelNotification: false,
      ),
    ],
    // Expires when the next link of the chain takes over.
    timeoutAfter: lifetime > 1000 ? lifetime : null,
  );
}

/// Which Athkar the live capsule's "أذكار" action opens for [e]: the
/// entry's own type for Athkar reminder entries; otherwise the window
/// that applies — morning while the next prayer is Fajr or Dhuhr,
/// evening from Asr onwards — falling back to morning.
@visibleForTesting
SirajAthkar sirajAthkarForLiveEntry(SirajLiveEntry e) {
  if (e.isAthkar && e.athkar != null) return e.athkar!;
  return switch (e.prayerId) {
    'asr' || 'maghrib' || 'isha' => SirajAthkar.evening,
    _ => SirajAthkar.morning,
  };
}
