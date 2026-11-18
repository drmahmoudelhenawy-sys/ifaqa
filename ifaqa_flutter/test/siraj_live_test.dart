import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/services/app_state.dart';
import 'package:ifaqa_flutter/services/reminder_plan.dart';
import 'package:ifaqa_flutter/services/reminder_service.dart';
import 'package:ifaqa_flutter/siraj/siraj_live_service.dart';
import 'package:ifaqa_flutter/siraj/siraj_state.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  late AppState state;
  // A Thursday, before dawn, so today's Fajr is still ahead.
  final now = DateTime(2026, 11, 5, 1, 0);

  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await AppState.init();
    state = AppState.instance;
  });

  setUp(() {
    for (final f in [
      'fajr_alarm',
      'notif_morning_athkar',
      'notif_evening_athkar',
      'notif_kahf_friday',
      'notif_fasting_mon_thu',
      'notif_fasting_lunar',
    ]) {
      state.setFlag(f, false);
    }
    state.setFlag('notif_wird', false);
    state.setFlag('siraj_enabled', true);
    state.setFlag('siraj_k_prayer', true);
    state.setFlag('siraj_k_athkar', true);
    state.setText('siraj_wirds_json', '');
  });

  SirajLiveEntry entry({
    String? prayerId,
    bool isAthkar = false,
    SirajAthkar? athkar,
  }) => SirajLiveEntry(
    time: now,
    title: 't',
    body: 'b',
    countdownTarget: now.add(const Duration(minutes: 30)),
    iqamahPhase: false,
    prayerId: prayerId,
    isAthkar: isAthkar,
    athkar: athkar,
  );

  group('id ranges', () {
    test('Siraj reminder ids 1100-1199 collide with nothing', () {
      expect(sirajReminderFirstId, 1100);
      expect(sirajReminderLastId, 1199);
      final legacy = {for (var i = 100; i <= 800; i++) i};
      final snooze = {for (var i = 900; i <= 908; i++) i};
      final live = {
        for (var i = sirajLiveFirstId; i <= sirajLiveLastId; i++) i,
      };
      final siraj = {
        for (var i = sirajReminderFirstId; i <= sirajReminderLastId; i++) i,
      };
      expect(siraj.intersection(legacy), isEmpty);
      expect(siraj.intersection(snooze), isEmpty);
      expect(siraj.intersection(live), isEmpty);
      // The reschedule cancel rule covers 100-800 and 1100-1199 but
      // leaves 900-908 (snoozes) and 1000-1099 (live capsule) alone.
      expect(sirajLiveFirstId, 1000);
      expect(sirajLiveLastId, 1099);
    });
  });

  group('planReminders Siraj entries', () {
    test('appends prayer/athkar entries in 1100-1199, unique ids', () {
      final plans = planReminders(state, now);
      expect(plans, isNotEmpty);
      expect(plans.every((p) => p.id >= sirajReminderFirstId), isTrue);
      expect(plans.every((p) => p.id <= sirajReminderLastId), isTrue);
      expect(plans.map((p) => p.id).toSet().length, plans.length);
      // 10 prayers x before/after + 2 days x morning/evening athkar.
      expect(
        plans.where((p) => p.kind == ReminderKind.sirajPrayerBefore).length,
        10,
      );
      expect(
        plans.where((p) => p.kind == ReminderKind.sirajPrayerAfter).length,
        10,
      );
      expect(
        plans.where((p) => p.kind == ReminderKind.morningAthkar).length,
        2,
      );
      expect(
        plans.where((p) => p.kind == ReminderKind.eveningAthkar).length,
        2,
      );
    });

    test('athkar bodies name the next prayer (prayer time stays visible)', () {
      final plans = planReminders(state, now);
      final athkar = plans.where(
        (p) =>
            p.kind == ReminderKind.morningAthkar ||
            p.kind == ReminderKind.eveningAthkar,
      );
      expect(athkar, isNotEmpty);
      expect(athkar.every((p) => p.body.contains('أذان')), isTrue);
    });

    test('nothing scheduled when Siraj is off', () {
      state.setFlag('siraj_enabled', false);
      expect(planReminders(state, now), isEmpty);
    });

    test('enabled wird triggers are scheduled as wird entries', () {
      state.setText(
        'siraj_wirds_json',
        '[{"id":"w1","name":"حفظ","kind":"memorization","enabled":true,'
        '"afterPrayers":["fajr"],"fixedMinutes":[]}]',
      );
      final plans = planReminders(state, now);
      final wird = plans.where((p) => p.kind == ReminderKind.wird);
      expect(wird, isNotEmpty);
      expect(wird.every((p) => p.title.contains('حفظ')), isTrue);
      expect(
        wird.every(
          (p) => p.id >= sirajReminderFirstId && p.id <= sirajReminderLastId,
        ),
        isTrue,
      );
    });
  });

  group('live capsule athkar action', () {
    test('sirajAthkarForLiveEntry follows the entry, then the window', () {
      expect(
        sirajAthkarForLiveEntry(entry(isAthkar: true, athkar: SirajAthkar.evening)),
        SirajAthkar.evening,
      );
      expect(
        sirajAthkarForLiveEntry(entry(isAthkar: true, athkar: SirajAthkar.morning)),
        SirajAthkar.morning,
      );
      expect(sirajAthkarForLiveEntry(entry(prayerId: 'fajr')), SirajAthkar.morning);
      expect(sirajAthkarForLiveEntry(entry(prayerId: 'dhuhr')), SirajAthkar.morning);
      expect(sirajAthkarForLiveEntry(entry(prayerId: 'asr')), SirajAthkar.evening);
      expect(sirajAthkarForLiveEntry(entry(prayerId: 'maghrib')), SirajAthkar.evening);
      expect(sirajAthkarForLiveEntry(entry(prayerId: 'isha')), SirajAthkar.evening);
      expect(sirajAthkarForLiveEntry(entry()), SirajAthkar.morning);
    });

    test('liveDetails carries one athkar action that keeps the capsule', () {
      final details = liveDetails(
        entry(prayerId: 'dhuhr'),
        color: 0xFF000000,
        until: now.add(const Duration(minutes: 30)),
      );
      expect(details.actions, hasLength(1));
      final action = details.actions!.first;
      expect(action.id, sirajAthkarActionId);
      expect(action.title, 'أذكار');
      expect(action.showsUserInterface, isTrue);
      expect(action.cancelNotification, isFalse);
    });

    test('payload format is siraj_athkar:morning|evening', () {
      expect(sirajAthkarPayload('morning'), 'siraj_athkar:morning');
      expect(sirajAthkarPayload('evening'), 'siraj_athkar:evening');
    });
  });

  group('sirajAthkarFromResponse', () {
    test('plain live-capsule payload wins', () {
      const response = NotificationResponse(
        notificationResponseType: NotificationResponseType.selectedNotificationAction,
        actionId: sirajAthkarActionId,
        payload: 'siraj_athkar:evening',
      );
      expect(sirajAthkarFromResponse(response), 'evening');
    });

    test('scheduled reminder JSON payload opens the right athkar', () {
      const response = NotificationResponse(
        notificationResponseType: NotificationResponseType.selectedNotification,
        payload:
            '{"id":1101,"title":"t","body":"b","fajr":false,"sound":"cairo","sirajAthkar":"morning"}',
      );
      expect(sirajAthkarFromResponse(response), 'morning');
    });

    test('unrelated payloads open nothing', () {
      const response = NotificationResponse(
        notificationResponseType: NotificationResponseType.selectedNotification,
        payload: '{"id":100,"title":"t","body":"b","fajr":true,"sound":"cairo"}',
      );
      expect(sirajAthkarFromResponse(response), isNull);
      const noPayload = NotificationResponse(
        notificationResponseType: NotificationResponseType.selectedNotification,
      );
      expect(sirajAthkarFromResponse(noPayload), isNull);
    });

    test('bare athkar action id falls back to morning', () {
      const response = NotificationResponse(
        notificationResponseType: NotificationResponseType.selectedNotificationAction,
        actionId: sirajAthkarActionId,
      );
      expect(sirajAthkarFromResponse(response), 'morning');
    });
  });

  group('openSirajAthkar navigation', () {
    testWidgets('opens the evening Athkar screen when the app is running', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          navigatorKey: ReminderService.navigatorKey,
          home: const Scaffold(body: Text('home')),
        ),
      );
      await ReminderService.openSirajAthkar('evening');
      await tester.pumpAndSettle();
      expect(find.text('أذكار المساء'), findsOneWidget);
    });

    testWidgets('cold start: tap before the first frame still opens Athkar', (
      tester,
    ) async {
      // Delivered during plugin init, before runApp's first frame.
      await ReminderService.openSirajAthkar('morning');
      await tester.pumpWidget(
        MaterialApp(
          navigatorKey: ReminderService.navigatorKey,
          home: const Scaffold(body: Text('home')),
        ),
      );
      await tester.pump();
      await tester.pump();
      expect(find.text('أذكار الصباح'), findsOneWidget);
    });
  });
}
