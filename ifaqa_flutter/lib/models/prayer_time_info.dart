import 'package:adhan/adhan.dart';
import 'package:flutter/material.dart';
import '../services/app_state.dart';

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
