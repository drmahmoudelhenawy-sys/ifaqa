import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/models/prayer.dart';
import 'package:ifaqa_flutter/models/prayer_time_info.dart';
import 'package:ifaqa_flutter/services/app_state.dart';
import 'package:ifaqa_flutter/services/mushaf_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await AppState.init();
  });

  setUp(() => AppState.instance.resetXp());

  final day = DateTime(2026, 11, 5);

  test('changing a prayer status replaces its XP instead of stacking it', () {
    final state = AppState.instance;
    state.setPrayerStatus(day, 'fajr', PrayerStatus.jamaah);
    expect(state.xp, 100);
    state.setPrayerStatus(day, 'fajr', PrayerStatus.late);
    expect(state.xp, 10);
    state.setPrayerStatus(day, 'fajr', PrayerStatus.none);
    expect(state.xp, 0);
    expect(state.completedPrayers(day), 0);
  });

  test('toggling a daily item twice gives back its XP', () {
    final state = AppState.instance;
    state.toggleDayItem(day, 'challenges', 'ch1', xpValue: 300);
    expect(state.dayHas(day, 'challenges', 'ch1'), isTrue);
    expect(state.xp, 300);
    state.toggleDayItem(day, 'challenges', 'ch1', xpValue: 300);
    expect(state.dayHas(day, 'challenges', 'ch1'), isFalse);
    expect(state.xp, 0);
  });

  test('days are stored separately', () {
    final state = AppState.instance;
    state.setPrayerStatus(day, 'asr', PrayerStatus.ontime);
    expect(state.prayerStatus(day, 'asr'), PrayerStatus.ontime);
    expect(state.prayerStatus(day.add(const Duration(days: 1)), 'asr'), PrayerStatus.none);
  });

  test('prayer times come out in order for Cairo', () {
    final times = buildPrayerTimes(AppLocation.cairo).map((p) => p.time.hour * 60 + p.time.minute).toList();
    expect(times.length, 5);
    for (var i = 1; i < times.length; i++) {
      expect(times[i], greaterThan(times[i - 1]));
    }
  });

  test('juz boundaries match the Madinah Mushaf', () {
    expect(MushafService.juzOfPage(1), 1);
    expect(MushafService.juzOfPage(21), 1);
    expect(MushafService.juzOfPage(22), 2);
    expect(MushafService.juzOfPage(582), 30);
    expect(MushafService.juzOfPage(604), 30);
  });
}
