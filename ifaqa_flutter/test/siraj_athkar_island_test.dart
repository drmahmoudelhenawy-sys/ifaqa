import 'dart:convert';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/services/reminder_service.dart';
import 'package:ifaqa_flutter/siraj/siraj_island_views.dart';
import 'package:ifaqa_flutter/siraj/siraj_state.dart';

/// Tests for the Athkar + Tasbih island flow (2026-11-18):
/// - the Athkar reader (full list, per-zekr counting) and its
///   morning/evening chooser,
/// - the "اقرأ الآن" / "اقرأ لاحقًا" notification actions and the
///   snooze mailbox between the isolates,
/// - the Tasbih counter shared with the Masbaha screen.
///
/// Widget behaviour (the reader/tasbih views themselves, the overlay
/// resize, the notification tap → island expansion) is verified by
/// `flutter analyze` + the manual checklist in OVERLAY_NATIVE.md — the
/// overlay window and the notification actions need a real device.
void main() {
  group('Athkar reader', () {
    test('morning has 24 zekr, evening 23', () {
      expect(sirajAthkarList(SirajAthkar.morning).length, 24);
      expect(sirajAthkarList(SirajAthkar.evening).length, 23);
    });

    test('tap counts one repetition down, long-press completes the zekr', () {
      final reader = SirajAthkarReader(SirajAthkar.morning);
      expect(reader.totalCount, 24);
      expect(reader.doneCount, 0);
      expect(reader.isDone, isFalse);
      // m15 "رضيت بالله" repeats 3 times.
      expect(reader.remainingFor('m15'), 3);
      expect(reader.tap('m15'), 2);
      expect(reader.tap('m15'), 1);
      expect(reader.tap('m15'), 0);
      expect(reader.tap('m15'), 0); // never below 0
      expect(reader.doneCount, 1);
      // m18 repeats 100 times; long-press completes it at once.
      expect(reader.remainingFor('m18'), 100);
      reader.complete('m18');
      expect(reader.remainingFor('m18'), 0);
      expect(reader.tap('unknown-id'), -1);
    });

    test('reset switches type and restores the counts', () {
      final reader = SirajAthkarReader(SirajAthkar.morning);
      reader.tap('m15');
      reader.reset(SirajAthkar.evening);
      expect(reader.type, SirajAthkar.evening);
      expect(reader.totalCount, 23);
      expect(reader.remainingFor('e15'), 3);
      expect(reader.doneCount, 0);
      expect(reader.isDone, isFalse);
    });

    test('morning before Asr, evening after', () {
      final asr = DateTime(2026, 11, 18, 14, 41);
      expect(
        sirajAthkarTypeForTime(DateTime(2026, 11, 18, 6, 0), asr),
        SirajAthkar.morning,
      );
      expect(
        sirajAthkarTypeForTime(DateTime(2026, 11, 18, 18, 0), asr),
        SirajAthkar.evening,
      );
    });
  });

  group('snooze options', () {
    test('options are 10/15/30/60, default 15', () {
      expect(sirajAthkarSnoozeOptions, [10, 15, 30, 60]);
      expect(sirajAthkarSnoozeDefault, 15);
    });

    test('unknown stored values fall back to 15', () {
      expect(sirajNormalizeAthkarSnoozeMinutes(30), 30);
      expect(sirajNormalizeAthkarSnoozeMinutes(7), 15);
      expect(sirajNormalizeAthkarSnoozeMinutes(null), 15);
    });

    test('Athkar snooze slots do not collide', () {
      expect(sirajAthkarSnoozeId('morning'), 909);
      expect(sirajAthkarSnoozeId('evening'), 910);
      expect(sirajAthkarSnoozeMorningId, isNot(sirajAthkarSnoozeEveningId));
    });
  });

  group('notification actions', () {
    test('Athkar reminders carry "اقرأ الآن" / "اقرأ لاحقًا"', () {
      final details = buildReminderDetails(
        fajr: false,
        soundId: 'cairo',
        sirajAthkar: true,
      );
      final actions = details.actions!;
      expect(actions.map((a) => a.id).toList(), [
        sirajReadNowActionId,
        sirajReadLaterActionId,
      ]);
      expect(actions.map((a) => a.title).toList(), ['اقرأ الآن', 'اقرأ لاحقًا']);
    });

    test('other reminders keep the single snooze action', () {
      final details = buildReminderDetails(fajr: false, soundId: 'cairo');
      expect(details.actions!.length, 1);
      expect(details.actions!.first.id, snoozeActionId);
    });

    test('read-now / read-later responses resolve the Athkar type', () {
      const payload =
          '{"id":1101,"title":"t","body":"b","fajr":false,"sound":"cairo","sirajAthkar":"evening"}';
      const readNow = NotificationResponse(
        notificationResponseType:
            NotificationResponseType.selectedNotificationAction,
        actionId: sirajReadNowActionId,
        payload: payload,
      );
      const readLater = NotificationResponse(
        notificationResponseType:
            NotificationResponseType.selectedNotificationAction,
        actionId: sirajReadLaterActionId,
        payload: payload,
      );
      expect(sirajAthkarFromResponse(readNow), 'evening');
      expect(sirajAthkarFromResponse(readLater), 'evening');
    });
  });

  group('overlay pending view mailbox', () {
    test('round-trips athkar / athkar+snooze / tasbih', () {
      expect(
        sirajParseOverlayPendingView(
          sirajOverlayPendingViewValue(
            view: 'athkar',
            type: SirajAthkar.morning,
          ),
        ),
        (view: 'athkar', type: SirajAthkar.morning, snooze: false),
      );
      expect(
        sirajParseOverlayPendingView(
          sirajOverlayPendingViewValue(
            view: 'athkar',
            type: SirajAthkar.evening,
            snooze: true,
          ),
        ),
        (view: 'athkar', type: SirajAthkar.evening, snooze: true),
      );
      expect(
        sirajParseOverlayPendingView(
          sirajOverlayPendingViewValue(view: 'tasbih'),
        ),
        (view: 'tasbih', type: null, snooze: false),
      );
    });

    test('malformed values parse to null', () {
      expect(sirajParseOverlayPendingView(null), isNull);
      expect(sirajParseOverlayPendingView(''), isNull);
      expect(sirajParseOverlayPendingView('athkar'), isNull);
      expect(sirajParseOverlayPendingView('athkar:noon'), isNull);
      expect(sirajParseOverlayPendingView('athkar:morning:later'), isNull);
      expect(sirajParseOverlayPendingView('tasbih:extra'), isNull);
    });
  });

  group('athkar snooze request mailbox', () {
    test('round-trips type, minutes and fire time', () {
      final fireAt = DateTime(2026, 11, 18, 12, 30);
      final json = sirajAthkarSnoozeRequestJson(
        type: SirajAthkar.evening,
        minutes: 30,
        fireAt: fireAt,
      );
      final req = sirajParseAthkarSnoozeRequest(json);
      expect(req?.type, SirajAthkar.evening);
      expect(req?.minutes, 30);
      expect(req?.fireAt, fireAt);
    });

    test('malformed or out-of-range values are rejected or clamped', () {
      expect(sirajParseAthkarSnoozeRequest(null), isNull);
      expect(sirajParseAthkarSnoozeRequest('not json'), isNull);
      expect(
        sirajParseAthkarSnoozeRequest(
          jsonEncode({'type': 'morning', 'minutes': 15}),
        ),
        isNull,
      );
      final huge = sirajParseAthkarSnoozeRequest(
        jsonEncode({
          'type': 'morning',
          'minutes': 9999,
          'fireAt': DateTime(2026, 11, 18).millisecondsSinceEpoch,
        }),
      );
      expect(huge?.minutes, 180);
    });
  });

  group('Tasbih', () {
    test('progress towards the goal', () {
      expect(sirajTasbihProgress(0, 100), 0);
      expect(sirajTasbihProgress(50, 100), 0.5);
      expect(sirajTasbihProgress(100, 100), 1);
      expect(sirajTasbihProgress(150, 100), 1);
      expect(sirajTasbihProgress(10, 0), 0);
    });

    test('default phrases and goal options', () {
      expect(sirajTasbihDefaultPhrases.length, 7);
      expect(sirajTasbihDefaultPhrases.first, 'سبحان الله');
      expect(sirajTasbihGoalOptions, [33, 100, 500, 1000]);
      expect(sirajTasbihGoalDefault, 100);
      expect(
        sirajTasbihPhrases(['ذكر مخصص']),
        [...sirajTasbihDefaultPhrases, 'ذكر مخصص'],
      );
    });
  });
}
