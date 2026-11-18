import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/models/prayer_time_info.dart';
import 'package:ifaqa_flutter/services/app_state.dart';
import 'package:ifaqa_flutter/siraj/siraj_settings.dart';
import 'package:ifaqa_flutter/siraj/siraj_state.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

/// Tests for the overlay's Cairo-pinned prayer times
/// (`lib/siraj/siraj_overlay_entry.dart` + `prayerTimesCairo`).
///
/// The overlay isolate must not depend on the device timezone, so prayer
/// times are computed in Africa/Cairo. The expected wall-clock times for
/// Cairo on 2026-11-18 are the Dart `adhan` package's values (Fajr 4:52,
/// Dhuhr 11:41, Asr 14:37, Maghrib 16:58, Isha 18:18). They differ by one
/// minute from the JS simulation recorded in MEMORY.md for three prayers
/// (11:40 / 14:38 / 18:19): the Dart package rounds seconds to the
/// nearest minute, the JS library truncates. The Dart values are the
/// right expectation here — the in-app capsule uses the same package, so
/// the overlay agrees with the app.
void main() {
  tzdata.initializeTimeZones();
  final cairo = tz.getLocation('Africa/Cairo');
  const location = AppLocation.cairo;

  test('prayerTimesCairo returns Cairo wall-clock times', () {
    final t = prayerTimesCairo(location, DateTime(2026, 11, 18));
    expect((t.fajr.hour, t.fajr.minute), (4, 52));
    expect((t.dhuhr.hour, t.dhuhr.minute), (11, 41));
    expect((t.asr.hour, t.asr.minute), (14, 37));
    expect((t.maghrib.hour, t.maghrib.minute), (16, 58));
    expect((t.isha.hour, t.isha.minute), (18, 18));
    // True instants in Africa/Cairo, not relabelled device-local times.
    expect(t.fajr, isA<tz.TZDateTime>());
    expect((t.fajr as tz.TZDateTime).location, cairo);
  });

  test('prayerTimesCairo wall clock differs from device-local by the Cairo offset', () {
    // The device running this test is UTC; Cairo is UTC+2 in November.
    // The adhan package computes the correct instant either way — the
    // device-timezone bug is in the wall-clock fields (display, and the
    // minute re-anchoring in buildSirajDays), which is what Cairo mode
    // fixes. So: same instant, wall clocks 2 hours apart.
    final date = DateTime(2026, 11, 18);
    final c = prayerTimesCairo(location, date);
    final local = prayerTimesOn(location, date);
    expect(c.fajr.millisecondsSinceEpoch, local.fajr.millisecondsSinceEpoch);
    expect(c.fajr.hour - local.fajr.hour, 2);
    expect(c.isha.hour - local.isha.hour, 2);
  });

  test('buildSirajDays(cairo: true) counts down to Fajr in Cairo time', () {
    final days = buildSirajDays(location, tz.TZDateTime(cairo, 2026, 11, 18, 4, 0), cairo: true);
    final now = tz.TZDateTime(cairo, 2026, 11, 18, 4, 0);
    final s = computeSirajState(
      now: now,
      days: days,
      config: const SirajConfig(alertQuotes: false),
    );
    expect(s.kind, SirajKind.idle);
    expect(s.prayerId, 'fajr');
    expect(s.target, tz.TZDateTime(cairo, 2026, 11, 18, 4, 52));
    expect(s.target!.difference(now), const Duration(minutes: 52));
    // The countdown is correct against device-local "now" too: the
    // target is a true instant, so the difference does not depend on the
    // device timezone.
    final deviceNow = DateTime.fromMillisecondsSinceEpoch(
      now.millisecondsSinceEpoch,
    );
    expect(s.target!.difference(deviceNow), const Duration(minutes: 52));
  });

  test('buildSirajDays default (cairo: false) is unchanged', () {
    final days = buildSirajDays(location, DateTime(2026, 11, 18, 4, 0));
    expect(days.length, 4); // from -1 to +2
    final fajr = days[1].prayer('fajr');
    expect(fajr.adhan is tz.TZDateTime, isFalse);
  });
}
