import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/services/app_state.dart';
import 'package:ifaqa_flutter/siraj/siraj_settings.dart';
import 'package:ifaqa_flutter/siraj/siraj_state.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest.dart' as tzdata;

/// Tests for the Siraj capsule drag wave (2026-11-18):
/// - small size default + circle shape,
/// - free-drag / persisted-position geometry (the contract the native
///   `SirajOverlayService` mirrors in px),
/// - the heads-up dodge state machine ([SirajOverlayShift]),
/// - the Sohag location default,
/// - configurable gestures + animation style defaults.
///
/// The native Kotlin side cannot be compiled on this machine (no Android
/// SDK here); the geometry/shift helpers below are the contract it
/// mirrors, tested here in Dart.
void main() {
  tzdata.initializeTimeZones();

  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await AppState.init();
  });

  group('size preset: small is the default', () {
    test('SirajConfig defaults to small', () {
      const c = SirajConfig();
      expect(c.capsuleSize, 'small');
      expect(sirajCapsuleSizeScale(c.capsuleSize), 0.85);
    });

    test('scale mapping', () {
      expect(sirajCapsuleSizeScale('small'), 0.85);
      expect(sirajCapsuleSizeScale('normal'), 1.0);
      expect(sirajCapsuleSizeScale('large'), 1.12);
      // Unknown values fall back to small, like the default.
      expect(sirajCapsuleSizeScale('huge'), 0.85);
      expect(sirajCapsuleSizeScale(''), 0.85);
    });

    test('copyWith keeps / changes the size', () {
      const c = SirajConfig();
      expect(c.copyWith().capsuleSize, 'small');
      expect(c.copyWith(capsuleSize: 'large').capsuleSize, 'large');
    });

    test('SirajSettings.config() defaults to small with empty prefs', () {
      expect(SirajSettings.config().capsuleSize, 'small');
    });

    test('stored size is honoured', () {
      AppState.instance.setText(
        SirajSettings.capsuleSizeKey,
        'large',
      );
      expect(SirajSettings.config().capsuleSize, 'large');
      AppState.instance.setText(SirajSettings.capsuleSizeKey, 'small');
      expect(SirajSettings.config().capsuleSize, 'small');
    });
  });

  group('pill size (shared by the in-app capsule and the overlay)', () {
    test('small renders compact, normal reproduces the old sizes', () {
      final small = sirajCapsulePillSize(
        kind: SirajKind.idle,
        config: const SirajConfig(),
      );
      expect(small.width, 170.0); // 200 * 0.85
      expect(small.height, closeTo(37.4, 0.01)); // 44 * 0.85
      final normal = sirajCapsulePillSize(
        kind: SirajKind.idle,
        config: const SirajConfig(capsuleSize: 'normal'),
      );
      expect((normal.width, normal.height), (200.0, 44.0));
      final large = sirajCapsulePillSize(
        kind: SirajKind.idle,
        config: const SirajConfig(capsuleSize: 'large'),
      );
      expect(large.width, closeTo(224.0, 0.01)); // 200 * 1.12
      expect(large.height, closeTo(49.28, 0.01)); // 44 * 1.12
    });

    test('quote pill: long titles are taller, width is capped', () {
      final small = sirajCapsulePillSize(
        kind: SirajKind.quote,
        config: const SirajConfig(),
        titleLength: 40,
      );
      expect(small.width, closeTo(306.0, 0.01)); // 360 * 0.85
      expect(small.height, closeTo(49.3, 0.01)); // 58 * 0.85
      // The overlay window fits 360 dp: a large quote clamps to it.
      final large = sirajCapsulePillSize(
        kind: SirajKind.quote,
        config: const SirajConfig(capsuleSize: 'large'),
        maxWidth: 360,
      );
      expect(large.width, 360.0);
    });

    test('height stays in 36..64 dp', () {
      final low = sirajCapsulePillSize(
        kind: SirajKind.idle,
        config: const SirajConfig(capsuleHeight: 20),
      );
      expect(low.height, 36.0);
      final high = sirajCapsulePillSize(
        kind: SirajKind.idle,
        config: const SirajConfig(
          capsuleHeight: 100,
          capsuleSize: 'large',
        ),
      );
      expect(high.height, 64.0);
    });

    test('maxWidth caps the width (in-app width fraction)', () {
      final capped = sirajCapsulePillSize(
        kind: SirajKind.media,
        config: const SirajConfig(),
        maxWidth: 200,
      );
      expect(capped.width, 200.0);
    });
  });

  group('circle shape', () {
    test('pill is the default; circle is opt-in', () {
      expect(const SirajConfig().capsuleShape, 'pill');
      expect(sirajNormalizeCapsuleShape('circle'), 'circle');
      expect(sirajNormalizeCapsuleShape('pill'), 'pill');
      expect(sirajNormalizeCapsuleShape('banana'), 'pill');
      expect(sirajNormalizeCapsuleShape(null), 'pill');
      expect(SirajSettings.config().capsuleShape, 'pill');
    });

    test('circle diameter scales with the size preset', () {
      expect(
        sirajCapsuleCircleDiameter(const SirajConfig()),
        closeTo(54.4, 0.01),
      ); // 64 * 0.85
      expect(
        sirajCapsuleCircleDiameter(
          const SirajConfig(capsuleSize: 'normal'),
        ),
        64.0,
      );
      expect(
        sirajCapsuleCircleDiameter(
          const SirajConfig(capsuleSize: 'large'),
        ),
        closeTo(71.68, 0.01),
      ); // 64 * 1.12
    });
  });

  group('overlay position geometry (drag contract)', () {
    test('clamp keeps the window on screen', () {
      const screenW = 1080.0;
      const screenH = 2400.0;
      const winW = 380.0;
      const winH = 76.0;
      final inside = sirajClampOverlayPosition(
        x: 100,
        y: 100,
        windowWidth: winW,
        windowHeight: winH,
        screenWidth: screenW,
        screenHeight: screenH,
      );
      expect((inside.x, inside.y), (100.0, 100.0));
      final negative = sirajClampOverlayPosition(
        x: -50,
        y: -20,
        windowWidth: winW,
        windowHeight: winH,
        screenWidth: screenW,
        screenHeight: screenH,
      );
      expect((negative.x, negative.y), (0.0, 0.0));
      final beyond = sirajClampOverlayPosition(
        x: 1000,
        y: 2400,
        windowWidth: winW,
        windowHeight: winH,
        screenWidth: screenW,
        screenHeight: screenH,
      );
      expect((beyond.x, beyond.y), (700.0, 2324.0));
      // A window bigger than the screen pins to (0, 0).
      final huge = sirajClampOverlayPosition(
        x: 50,
        y: 50,
        windowWidth: 2000,
        windowHeight: 3000,
        screenWidth: screenW,
        screenHeight: screenH,
      );
      expect((huge.x, huge.y), (0.0, 0.0));
    });

    test('default position is top-anchored and centred', () {
      final pos = sirajOverlayDefaultPosition(
        windowWidth: 380,
        windowHeight: 76,
        screenWidth: 1080,
        screenHeight: 2400,
        statusBarHeight: 24,
      );
      expect((pos.x, pos.y), (350.0, 32.0));
      // A screen narrower than the window centres at x = 0.
      final narrow = sirajOverlayDefaultPosition(
        windowWidth: 380,
        windowHeight: 76,
        screenWidth: 300,
        screenHeight: 2400,
        statusBarHeight: 24,
      );
      expect(narrow.x, 0.0);
      expect(narrow.y, 32.0);
    });
  });

  group('heads-up dodge state machine', () {
    test('shifts down when covered, restores afterwards', () {
      final shift = SirajOverlayShift();
      expect(shift.isShifted, isFalse);
      expect(shift.restore(), isNull);
      final target = shift.onHeadsUpShown(currentY: 32);
      expect(target, sirajHeadsUpClearYDp);
      expect(shift.isShifted, isTrue);
      expect(shift.savedY, 32.0);
      // A second banner while shifted does not move the island again.
      expect(shift.onHeadsUpShown(currentY: 160), isNull);
      expect(shift.restore(), 32.0);
      expect(shift.isShifted, isFalse);
      expect(shift.restore(), isNull);
      // Shifting works again after a restore.
      expect(shift.onHeadsUpShown(currentY: 8), sirajHeadsUpClearYDp);
    });

    test('no shift when the island is already below the banner', () {
      final shift = SirajOverlayShift();
      expect(shift.onHeadsUpShown(currentY: 200), isNull);
      expect(shift.onHeadsUpShown(currentY: sirajHeadsUpClearYDp), isNull);
      expect(shift.isShifted, isFalse);
    });
  });

  group('Sohag location default', () {
    test('Sohag coordinates', () {
      expect(AppLocation.sohag.latitude, 26.5569);
      expect(AppLocation.sohag.longitude, 31.6948);
      expect(AppLocation.sohag.isDefault, isTrue);
    });

    test('AppState.location defaults to Sohag with no saved location', () {
      final loc = AppState.instance.location;
      expect(loc.latitude, 26.5569);
      expect(loc.longitude, 31.6948);
      expect(loc.isDefault, isTrue);
    });
  });

  group('configurable gestures', () {
    test('defaults keep the current behaviour', () {
      const c = SirajConfig();
      expect(c.gestureTap, 'prayer_times');
      expect(c.gestureDoubleTap, 'none');
      expect(c.gestureLongPress, 'siraj_tab');
      expect(c.gestureSwipeUp, 'prayer_times');
      expect(c.gestureSwipeDown, 'none');
      expect(c.gestureSwipeLeft, 'none');
      expect(c.gestureSwipeRight, 'none');
    });

    test('normalisation falls back for unknown actions', () {
      expect(sirajNormalizeGestureAction('play_pause', 'none'), 'play_pause');
      expect(sirajNormalizeGestureAction('dance', 'none'), 'none');
      expect(sirajNormalizeGestureAction(null, 'prayer_times'), 'prayer_times');
      expect(SirajSettings.config().gestureTap, 'prayer_times');
      expect(SirajSettings.config().gestureLongPress, 'siraj_tab');
    });
  });

  group('animation style', () {
    test('fade is the default', () {
      expect(const SirajConfig().capsuleAnimation, 'fade');
      expect(sirajNormalizeCapsuleAnimation('slide'), 'slide');
      expect(sirajNormalizeCapsuleAnimation('off'), 'off');
      expect(sirajNormalizeCapsuleAnimation('weird'), 'fade');
      expect(sirajNormalizeCapsuleAnimation(null), 'fade');
      expect(SirajSettings.config().capsuleAnimation, 'fade');
    });
  });

  group('expanded view fits the screen', () {
    test('preferred height when there is room', () {
      expect(
        sirajExpandedHeight(
          preferred: 340,
          screenHeight: 800,
          top: 30,
          bottomPadding: 0,
        ),
        340.0,
      );
    });

    test('capped on a short screen, floored so it stays usable', () {
      expect(
        sirajExpandedHeight(
          preferred: 340,
          screenHeight: 400,
          top: 30,
          bottomPadding: 24,
        ),
        330.0, // 400 - 30 - 24 - 16
      );
      expect(
        sirajExpandedHeight(
          preferred: 340,
          screenHeight: 100,
          top: 30,
          bottomPadding: 0,
        ),
        120.0,
      );
    });
  });

  group('prayer progress (circle ring)', () {
    SirajDay day(DateTime date) {
      DateTime at(int h, int m) =>
          DateTime(date.year, date.month, date.day, h, m);
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

    test('fraction of the interval to the next adhan', () {
      final days = [for (var i = -1; i <= 3; i++) day(DateTime(2026, 11, 17 + i))];
      // 12:00 is 10 of 170 minutes into Dhuhr → Asr.
      final p = sirajPrayerProgress(
        now: DateTime(2026, 11, 17, 12, 0),
        days: days,
      );
      expect(p, closeTo(10 / 170, 0.001));
      // 04:00 is 570 of 620 minutes into Isha → Fajr.
      final night = sirajPrayerProgress(
        now: DateTime(2026, 11, 17, 4, 0),
        days: days,
      );
      expect(night, closeTo(570 / 620, 0.001));
      expect(sirajPrayerProgress(now: DateTime(2026, 11, 17), days: []), 0.0);
    });
  });
}
