import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/siraj/siraj_reminders.dart';
import 'package:ifaqa_flutter/siraj/siraj_state.dart';

SirajDay day(DateTime date) {
  DateTime at(int h, int m) => DateTime(date.year, date.month, date.day, h, m);
  return SirajDay(
    date: DateTime(date.year, date.month, date.day),
    sunrise: at(6, 20),
    prayers: [
      SirajPrayer('fajr', at(4, 50), 20),
      SirajPrayer('dhuhr', at(11, 50), 10),
      SirajPrayer('asr', at(14, 40), 10),
      SirajPrayer('maghrib', at(17, 5), 5),
      SirajPrayer('isha', at(18, 30), 15),
    ],
  );
}

// Tuesday 2026-11-17.
final days = [for (var i = -1; i <= 3; i++) day(DateTime(2026, 11, 17 + i))];

DateTime t(int h, int m, [int s = 0]) => DateTime(2026, 11, 17, h, m, s);

void main() {
  group('SirajConfig defaults', () {
    test('defaults preserve current behaviour and keep the prayer chip on', () {
      const c = SirajConfig();
      // Prayer chip: always on — the most important thing.
      expect(c.showPrayer, isTrue);
      expect(c.capsuleWidthFrac, 0.92);
      expect(c.capsuleHeight, 44.0);
      // Small capsule, pill shape, fade animation, and the current
      // gesture behaviour (tap: prayer times, long-press: Siraj tab).
      expect(c.capsuleSize, 'small');
      expect(c.capsuleShape, 'pill');
      expect(c.capsuleAnimation, 'fade');
      expect(c.gestureTap, 'prayer_times');
      expect(c.gestureDoubleTap, 'none');
      expect(c.gestureLongPress, 'siraj_tab');
      expect(c.gestureSwipeUp, 'prayer_times');
      expect(c.gestureSwipeDown, 'none');
      expect(c.gestureSwipeLeft, 'none');
      expect(c.gestureSwipeRight, 'none');
      // "اقرأ لاحقًا" from a notification re-reminds after 15 minutes.
      expect(c.athkarSnoozeMinutes, 15);
      expect(c.showAthkar, isTrue);
      expect(c.showQuotes, isTrue);
      expect(c.showMedia, isTrue);
      expect(c.showPlayer, isTrue);
      expect(c.autoHideIdleSecs, 0);
      expect(c.countdownFormat, 'min_sec');
      expect(c.capsuleAlign, 'center');
      expect(c.capsuleTopOffset, 0.0);
      expect(c.capsuleDraggable, isTrue);
      expect(c.capsuleOpacity, 1.0);
      expect(c.capsuleAccentHex, isNull);
      expect(c.adhanSound, 'cairo');
      expect(c.remindBeforeMins, 10);
      expect(c.remindAfterMins, 10);
      expect(c.morningAthkarMinutes, isNull);
      expect(c.eveningAthkarMinutes, isNull);
      expect(c.playerSource, 'app');
      expect(c.deviceMusicEnabled, isFalse);
      expect(c.overlayEnabled, isFalse);
      expect(c.overlayShowWhenAppClosed, isFalse);
      expect(c.wirdsJson, '');
      // Pre-existing behaviour is unchanged.
      expect(c.enabled, isTrue);
      expect(c.showInApp, isTrue);
      expect(c.alertPrayer, isTrue);
      expect(c.alertAthkar, isTrue);
    });

    test('copyWith changes new fields, preserves the rest, clamps opacity', () {
      const c = SirajConfig();
      final changed = c.copyWith(
        capsuleWidthFrac: 0.8,
        capsuleHeight: 56.0,
        showAthkar: false,
        autoHideIdleSecs: 30,
        countdownFormat: 'min_only',
        capsuleAlign: 'left',
        capsuleTopOffset: 12.0,
        capsuleDraggable: false,
        capsuleAccentHex: '#10B981',
        adhanSound: 'saudi',
        remindBeforeMins: 15,
        remindAfterMins: 5,
        morningAthkarMinutes: 360,
        eveningAthkarMinutes: 1050,
        playerSource: 'device',
        deviceMusicEnabled: true,
        overlayEnabled: true,
        overlayShowWhenAppClosed: true,
        wirdsJson: '[]',
      );
      expect(changed.capsuleWidthFrac, 0.8);
      expect(changed.capsuleHeight, 56.0);
      expect(changed.showAthkar, isFalse);
      expect(changed.autoHideIdleSecs, 30);
      expect(changed.countdownFormat, 'min_only');
      expect(changed.capsuleAlign, 'left');
      expect(changed.capsuleTopOffset, 12.0);
      expect(changed.capsuleDraggable, isFalse);
      expect(changed.capsuleAccentHex, '#10B981');
      expect(changed.adhanSound, 'saudi');
      expect(changed.remindBeforeMins, 15);
      expect(changed.remindAfterMins, 5);
      expect(changed.morningAthkarMinutes, 360);
      expect(changed.eveningAthkarMinutes, 1050);
      expect(changed.playerSource, 'device');
      expect(changed.deviceMusicEnabled, isTrue);
      expect(changed.overlayEnabled, isTrue);
      expect(changed.overlayShowWhenAppClosed, isTrue);
      expect(changed.wirdsJson, '[]');
      // Untouched fields keep their (default) values, prayer chip stays on.
      expect(changed.showPrayer, isTrue);
      expect(changed.showQuotes, isTrue);
      expect(changed.theme, 'night');
      expect(changed.capsuleOpacity, 1.0);
      // Opacity is clamped to 0.5..1.0.
      expect(c.copyWith(capsuleOpacity: 0.2).capsuleOpacity, 0.5);
      expect(c.copyWith(capsuleOpacity: 2.0).capsuleOpacity, 1.0);
      expect(c.copyWith(capsuleOpacity: 0.75).capsuleOpacity, 0.75);
    });
  });

  group('wird JSON round-trip', () {
    test('encode/decode preserves every field', () {
      const wirds = [
        SirajWird(
          id: 'w1',
          name: 'حفظ',
          kind: SirajWirdKind.memorization,
          afterPrayers: ['fajr', 'maghrib'],
          fixedMinutes: [480],
        ),
        SirajWird(
          id: 'w2',
          name: 'مراجعة',
          kind: SirajWirdKind.review,
          enabled: false,
          fixedMinutes: [1260, 300],
        ),
      ];
      final json = encodeSirajWirdsJson(wirds);
      final decoded = decodeSirajWirdsJson(json);
      expect(decoded.length, 2);
      expect(decoded[0].id, 'w1');
      expect(decoded[0].name, 'حفظ');
      expect(decoded[0].kind, SirajWirdKind.memorization);
      expect(decoded[0].enabled, isTrue);
      expect(decoded[0].afterPrayers, ['fajr', 'maghrib']);
      expect(decoded[0].fixedMinutes, [480]);
      expect(decoded[1].kind, SirajWirdKind.review);
      expect(decoded[1].enabled, isFalse);
      expect(decoded[1].fixedMinutes, [1260, 300]);
      // Re-encoding the decoded list is stable.
      expect(encodeSirajWirdsJson(decoded), json);
    });

    test('defaults, default factory, and tolerant decoding', () {
      const w = SirajWird(id: 'x', name: 'ورد');
      expect(w.kind, SirajWirdKind.reading);
      expect(w.enabled, isTrue);
      expect(w.afterPrayers, isEmpty);
      expect(w.fixedMinutes, isEmpty);

      final d = SirajWird.defaultWird();
      expect(d.id, 'daily-wird');
      expect(d.name, 'الورد اليومي');
      expect(d.kind, SirajWirdKind.reading);
      expect(d.enabled, isTrue);
      expect(d.afterPrayers, contains('fajr'));

      expect(decodeSirajWirdsJson(''), isEmpty);
      expect(decodeSirajWirdsJson('not json'), isEmpty);
      expect(decodeSirajWirdsJson('{}'), isEmpty);
      // Unknown kind falls back to reading; entries without an id are skipped.
      final tolerant = decodeSirajWirdsJson(
        '[{"id":"a","name":"A","kind":"nope"},{"name":"NoId"}]',
      );
      expect(tolerant.length, 1);
      expect(tolerant.single.kind, SirajWirdKind.reading);
      // Missing fields fall back to defaults.
      final minimal = decodeSirajWirdsJson('[{"id":"m","name":"M"}]');
      expect(minimal.single.enabled, isTrue);
      expect(minimal.single.afterPrayers, isEmpty);
    });
  });

  group('planSirajReminders', () {
    test('before/after prayer entries for upcoming prayers', () {
      final plan = planSirajReminders(
        now: t(9, 0),
        days: days,
        config: const SirajConfig(),
      );
      final beforeDhuhr = plan.firstWhere(
        (e) => e.kind == 'prayer_before' && e.prayerId == 'dhuhr',
      );
      expect(beforeDhuhr.time, t(11, 40));
      expect(beforeDhuhr.title, contains('الظهر'));
      final afterDhuhr = plan.firstWhere(
        (e) => e.kind == 'prayer_after' && e.prayerId == 'dhuhr',
      );
      expect(afterDhuhr.time, t(12, 0));
      // Every prayer in the horizon gets both entries.
      for (final kind in ['prayer_before', 'prayer_after']) {
        expect(
          plan.where((e) => e.kind == kind).length,
          greaterThanOrEqualTo(10),
        );
      }
    });

    test('morning vs evening athkar times are distinct (defaults)', () {
      final plan = planSirajReminders(
        now: t(9, 0),
        days: days,
        config: const SirajConfig(),
      );
      final morning = plan.where((e) => e.kind == 'athkar_morning').toList();
      final evening = plan.where((e) => e.kind == 'athkar_evening').toList();
      // Morning defaults to Fajr+20min (05:10 next days), evening to Asr+15min.
      expect(morning.first.time, DateTime(2026, 11, 18, 5, 10));
      expect(evening.first.time, t(14, 55));
      expect(morning.first.time, isNot(evening.first.time));
      expect(morning.first.prayerId, 'fajr');
      expect(evening.first.prayerId, 'asr');
    });

    test('fixed athkar minutes override the prayer-relative defaults', () {
      const config = SirajConfig(
        morningAthkarMinutes: 360, // 06:00
        eveningAthkarMinutes: 1050, // 17:30
      );
      final plan = planSirajReminders(now: t(9, 0), days: days, config: config);
      final morning = plan.where((e) => e.kind == 'athkar_morning').toList();
      final evening = plan.where((e) => e.kind == 'athkar_evening').toList();
      expect(morning.first.time, DateTime(2026, 11, 18, 6, 0));
      expect(evening.first.time, DateTime(2026, 11, 17, 17, 30));
      expect(sirajMorningAthkarTime(day(DateTime(2026, 11, 17)), config),
          DateTime(2026, 11, 17, 6, 0));
      expect(sirajEveningAthkarTime(day(DateTime(2026, 11, 17)), config),
          DateTime(2026, 11, 17, 17, 30));
    });

    test('multiple wirds each get their own triggers incl. after-prayer', () {
      const wirds = [
        SirajWird(
          id: 'w1',
          name: 'حفظ',
          kind: SirajWirdKind.memorization,
          afterPrayers: ['fajr', 'maghrib'],
          fixedMinutes: [480], // 08:00
        ),
        SirajWird(
          id: 'w2',
          name: 'قراءة',
          kind: SirajWirdKind.reading,
          afterPrayers: ['isha'],
          fixedMinutes: [1260], // 21:00
        ),
        SirajWird(
          id: 'w-off',
          name: 'متوقف',
          afterPrayers: ['fajr'],
          fixedMinutes: [480],
          enabled: false,
        ),
      ];
      final plan = planSirajReminders(
        now: t(9, 0),
        days: days,
        config: const SirajConfig(),
        wirds: wirds,
      );
      final w1 = plan.where((e) => e.wirdId == 'w1').toList();
      final w2 = plan.where((e) => e.wirdId == 'w2').toList();
      // w1: 15 minutes after Fajr (Wed 05:05) and after Maghrib (Tue 17:20),
      // plus its fixed 08:00 (Wed, Thu).
      expect(w1.map((e) => e.time), contains(DateTime(2026, 11, 18, 5, 5)));
      expect(w1.map((e) => e.time), contains(t(17, 20)));
      expect(w1.map((e) => e.time), contains(DateTime(2026, 11, 18, 8, 0)));
      expect(w1.every((e) => e.kind == 'wird'), isTrue);
      // w2: 15 minutes after Isha (Tue 18:45) plus its fixed 21:00.
      expect(w2.map((e) => e.time), contains(t(18, 45)));
      expect(w2.map((e) => e.time), contains(t(21, 0)));
      // The disabled wird contributes nothing.
      expect(plan.where((e) => e.wirdId == 'w-off'), isEmpty);
      // The two wirds never share an entry.
      expect(
        w1.map((e) => e.time).toSet().intersection(w2.map((e) => e.time).toSet()),
        isEmpty,
      );
    });

    test('no past entries, sorted, within the 2-day horizon', () {
      final now = t(9, 0);
      final plan = planSirajReminders(
        now: now,
        days: days,
        config: const SirajConfig(),
        wirds: const [
          SirajWird(id: 'w1', name: 'ورد', afterPrayers: ['fajr', 'isha']),
        ],
      );
      expect(plan, isNotEmpty);
      for (final e in plan) {
        expect(e.time.isAfter(now), isTrue, reason: '$e');
        expect(e.time.isAfter(now.add(const Duration(days: 2))), isFalse);
      }
      for (var i = 1; i < plan.length; i++) {
        expect(
          plan[i].time.isAfter(plan[i - 1].time) ||
              plan[i].time == plan[i - 1].time,
          isTrue,
        );
      }
      // Nothing from before `now` leaks in (e.g. today's Fajr reminders).
      expect(
        plan.where((e) => e.prayerId == 'fajr' && e.time.day == 17),
        isEmpty,
      );
    });
  });

  group('sirajIqamaRemaining', () {
    test('inside the adhan → iqamah window', () {
      final dhuhr = SirajPrayer('dhuhr', t(11, 50), 10);
      expect(
        sirajIqamaRemaining(t(11, 55), dhuhr),
        const Duration(minutes: 5),
      );
      expect(
        sirajIqamaRemaining(t(11, 50), dhuhr),
        const Duration(minutes: 10),
      );
    });

    test('outside the window returns null', () {
      final dhuhr = SirajPrayer('dhuhr', t(11, 50), 10);
      expect(sirajIqamaRemaining(t(11, 49), dhuhr), isNull); // before adhan
      expect(sirajIqamaRemaining(t(12, 0), dhuhr), isNull); // at iqamah
      expect(sirajIqamaRemaining(t(12, 30), dhuhr), isNull); // after iqamah
      // No iqamah configured at all.
      expect(
        sirajIqamaRemaining(t(11, 55), SirajPrayer('dhuhr', t(11, 50), 0)),
        isNull,
      );
    });
  });

  group('sirajFormatCountdown', () {
    test('min_sec reuses the existing countdown', () {
      expect(
        sirajFormatCountdown(const Duration(hours: 1, minutes: 23, seconds: 45), 'min_sec'),
        '٠١:٢٣:٤٥',
      );
      expect(
        sirajFormatCountdown(const Duration(minutes: 4, seconds: 12), 'min_sec'),
        '٠٤:١٢',
      );
    });

    test('min_only returns whole Arabic minutes with a د suffix', () {
      expect(
        sirajFormatCountdown(const Duration(minutes: 45), 'min_only'),
        '٤٥ د',
      );
      // Seconds are dropped (whole minutes only).
      expect(
        sirajFormatCountdown(const Duration(minutes: 1, seconds: 50), 'min_only'),
        '١ د',
      );
      expect(
        sirajFormatCountdown(const Duration(hours: 2, minutes: 5), 'min_only'),
        '١٢٥ د',
      );
    });

    test('never negative, unknown format falls back to min_sec', () {
      expect(
        sirajFormatCountdown(const Duration(minutes: -5), 'min_only'),
        '٠ د',
      );
      expect(
        sirajFormatCountdown(const Duration(seconds: -1), 'min_sec'),
        '٠٠:٠٠',
      );
      expect(
        sirajFormatCountdown(const Duration(minutes: 4, seconds: 12), 'bogus'),
        '٠٤:١٢',
      );
    });
  });
}
