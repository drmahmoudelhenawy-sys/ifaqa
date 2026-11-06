import 'package:flutter/material.dart';

enum PrayerStatus { none, jamaah, ontime, late, qada }

class SunanConfig {
  final bool hasPre;
  final bool hasPost;
  final int preCount;
  final int postCount;

  const SunanConfig({
    this.hasPre = false,
    this.hasPost = false,
    this.preCount = 0,
    this.postCount = 0,
  });
}

class Prayer {
  final String id;
  final String name;
  final String fadl;
  final bool isFajr;
  final SunanConfig sunanConfig;
  final IconData icon;

  PrayerStatus status;
  bool sunanPreDone;
  bool sunanPostDone;

  Prayer({
    required this.id,
    required this.name,
    required this.fadl,
    required this.icon,
    this.isFajr = false,
    this.sunanConfig = const SunanConfig(),
    this.status = PrayerStatus.none,
    this.sunanPreDone = false,
    this.sunanPostDone = false,
  });

  bool get isDone => status != PrayerStatus.none;

  String get statusLabel {
    switch (status) {
      case PrayerStatus.jamaah:
        return 'جماعة المسجد';
      case PrayerStatus.ontime:
        return 'في الوقت';
      case PrayerStatus.late:
        return 'متأخرة';
      case PrayerStatus.qada:
        return 'قضاء';
      case PrayerStatus.none:
        return 'لم تسجل';
    }
  }
}

List<Prayer> buildDefaultPrayers({bool isFriday = false}) {
  return [
    Prayer(
      id: 'fajr',
      name: 'الفجر',
      fadl: 'في ذمة الله',
      icon: Icons.wb_twilight,
      isFajr: true,
      sunanConfig: const SunanConfig(hasPre: true, preCount: 2),
    ),
    isFriday
        ? Prayer(
            id: 'dhuhr',
            name: 'الجمعة',
            fadl: 'خير يوم طلعت فيه الشمس',
            icon: Icons.wb_sunny,
            sunanConfig: const SunanConfig(hasPost: true, postCount: 4),
          )
        : Prayer(
            id: 'dhuhr',
            name: 'الظهر',
            fadl: 'وقت تفتح فيه أبواب السماء',
            icon: Icons.wb_sunny,
            sunanConfig: const SunanConfig(
              hasPre: true,
              hasPost: true,
              preCount: 4,
              postCount: 2,
            ),
          ),
    Prayer(
      id: 'asr',
      name: 'العصر',
      fadl: 'من تركها حبط عمله',
      icon: Icons.cloud,
      sunanConfig: const SunanConfig(hasPre: true, preCount: 4),
    ),
    Prayer(
      id: 'maghrib',
      name: 'المغرب',
      fadl: 'وتر النهار',
      icon: Icons.nights_stay_outlined,
      sunanConfig: const SunanConfig(hasPost: true, postCount: 2),
    ),
    Prayer(
      id: 'isha',
      name: 'العشاء',
      fadl: 'أثقل الصلاة على المنافقين',
      icon: Icons.dark_mode,
      sunanConfig: const SunanConfig(hasPost: true, postCount: 2),
    ),
  ];
}
