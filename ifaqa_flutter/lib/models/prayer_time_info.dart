import 'package:adhan/adhan.dart';
import 'package:flutter/material.dart';
import 'package:timezone/timezone.dart' as tz;

import '../services/app_state.dart';

/// The location whose wall clock the prayer times follow, regardless of
/// the device timezone. The app is built for Egypt; any surface that must
/// not depend on the device timezone (the overlay isolate) uses Cairo.
tz.Location get cairoLocation => tz.getLocation('Africa/Cairo');

/// Prayer times for [location] on [date] as true instants in Africa/Cairo,
/// regardless of the device timezone.
///
/// [PrayerTimes] on its own returns device-local times (`.toLocal()`), so
/// this uses [PrayerTimes.utc] — pure UTC instants computed from the Cairo
/// calendar [date] — and re-expresses each instant in Africa/Cairo. The
/// returned times' wall-clock fields are the Cairo prayer times and their
/// instants are the true moments of the prayers, so comparing them with
/// `DateTime.now()` (any device timezone) gives the correct countdown.
///
/// Requires `tzdata.initializeTimeZones()` to have run first (the main
/// isolate does it in `ReminderService.init`; the overlay isolate does it
/// in `sirajOverlayMain`).
({
  DateTime fajr,
  DateTime sunrise,
  DateTime dhuhr,
  DateTime asr,
  DateTime maghrib,
  DateTime isha,
})
prayerTimesCairo(AppLocation location, DateTime date) {
  final cairo = cairoLocation;
  final t = PrayerTimes.utc(
    Coordinates(location.latitude, location.longitude),
    DateComponents.from(date),
    CalculationMethod.egyptian.getParameters(),
  );
  DateTime inCairo(DateTime utc) => tz.TZDateTime.from(utc, cairo);
  return (
    fajr: inCairo(t.fajr),
    sunrise: inCairo(t.sunrise),
    dhuhr: inCairo(t.dhuhr),
    asr: inCairo(t.asr),
    maghrib: inCairo(t.maghrib),
    isha: inCairo(t.isha),
  );
}

class PrayerTimeInfo {
  final String key;
  final String label;
  final IconData icon;
  final List<Color> tone;
  final int iqamaMins;
  final String sunnahText;
  final TimeOfDay time;

  const PrayerTimeInfo({
    required this.key,
    required this.label,
    required this.icon,
    required this.tone,
    required this.iqamaMins,
    required this.sunnahText,
    required this.time,
  });
}

/// Prayer times for [location] on [date] (default today), Egyptian General Authority method.
PrayerTimes prayerTimesOn(AppLocation location, [DateTime? date]) => PrayerTimes(
      Coordinates(location.latitude, location.longitude),
      DateComponents.from(date ?? DateTime.now()),
      CalculationMethod.egyptian.getParameters(),
    );

List<PrayerTimeInfo> buildPrayerTimes(AppLocation location) {
  final t = prayerTimesOn(location);
  return [
    PrayerTimeInfo(key: 'Fajr', label: 'الفجر', icon: Icons.wb_twilight, tone: [Color(0xFF0EA5E9), Color(0xFF22D3EE)], iqamaMins: 20, sunnahText: 'ركعتان قبل الفجر', time: TimeOfDay.fromDateTime(t.fajr)),
    PrayerTimeInfo(key: 'Dhuhr', label: 'الظهر', icon: Icons.wb_sunny, tone: [Color(0xFFF59E0B), Color(0xFFFB923C)], iqamaMins: 10, sunnahText: '٤ قبلها و ٢ بعدها', time: TimeOfDay.fromDateTime(t.dhuhr)),
    PrayerTimeInfo(key: 'Asr', label: 'العصر', icon: Icons.cloud, tone: [Color(0xFFF97316), Color(0xFFF59E0B)], iqamaMins: 10, sunnahText: '٤ ركعات قبلها مستحبة', time: TimeOfDay.fromDateTime(t.asr)),
    PrayerTimeInfo(key: 'Maghrib', label: 'المغرب', icon: Icons.nights_stay_outlined, tone: [Color(0xFFF43F5E), Color(0xFFD946EF)], iqamaMins: 5, sunnahText: 'ركعتان بعد المغرب', time: TimeOfDay.fromDateTime(t.maghrib)),
    PrayerTimeInfo(key: 'Isha', label: 'العشاء', icon: Icons.dark_mode, tone: [Color(0xFF6366F1), Color(0xFF8B5CF6)], iqamaMins: 15, sunnahText: 'ركعتان بعدها + الوتر', time: TimeOfDay.fromDateTime(t.isha)),
  ];
}
