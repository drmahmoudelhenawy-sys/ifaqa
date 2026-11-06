import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/models/prayer_time_info.dart';
import 'package:ifaqa_flutter/services/app_state.dart';
import 'package:ifaqa_flutter/services/islamic_calendar_service.dart';
import 'package:ifaqa_flutter/services/reminder_plan.dart';
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
    for (final f in ['fajr_alarm', 'notif_morning_athkar', 'notif_evening_athkar', 'notif_kahf_friday', 'notif_fasting_mon_thu', 'notif_fasting_lunar']) {
      state.setFlag(f, false);
    }
    state.setFlag('notif_wird', false);
    state.setNumber('fajr_alarm_offset', 0);
  });

  test('nothing is planned when every reminder is off', () {
    expect(planReminders(state, now), isEmpty);
  });

  test('Fajr alarm fires offset minutes before Fajr, once per day for a week', () {
    state.setFlag('fajr_alarm', true);
    state.setNumber('fajr_alarm_offset', 15);
    final plans = planReminders(state, now);
    expect(plans.length, planDays);
    final fajr = prayerTimesOn(state.location, now).fajr;
    expect(plans.first.time, fajr.subtract(const Duration(minutes: 15)));
    expect(plans.map((p) => p.id).toSet().length, planDays);
  });

  test('past times are dropped', () {
    state.setFlag('fajr_alarm', true);
    final afterFajr = DateTime(2026, 11, 5, 12);
    final plans = planReminders(state, afterFajr);
    expect(plans.length, planDays - 1);
    expect(plans.every((p) => p.time.isAfter(afterFajr)), isTrue);
  });

  test('Kahf only on Fridays, fasting reminders on Sunday and Wednesday evenings', () {
    state.setFlag('notif_kahf_friday', true);
    state.setFlag('notif_fasting_mon_thu', true);
    final plans = planReminders(state, now);
    final kahf = plans.where((p) => p.kind == ReminderKind.kahf);
    final fasting = plans.where((p) => p.kind == ReminderKind.fastMonThu);
    expect(kahf.map((p) => p.time.weekday).toSet(), {DateTime.friday});
    expect(fasting.map((p) => p.time.weekday).toSet(), {DateTime.sunday, DateTime.wednesday});
    expect(fasting.every((p) => p.time.hour == 21), isTrue);
  });

  test('white-day reminders fall on the evening before Hijri 13, 14 and 15', () {
    state.setFlag('notif_fasting_lunar', true);
    // Plan from a date a few days before the 13th so all three fall in the window.
    final h = gregorianToHijri(now);
    final start = hijriToGregorian(h.year, h.month, 9);
    final plans = planReminders(state, start);
    final days = plans
        .where((p) => p.kind == ReminderKind.fastWhiteDays)
        .map((p) => gregorianToHijri(p.time.add(const Duration(days: 1))).day)
        .toList();
    expect(days, [13, 14, 15]);
  });
}
