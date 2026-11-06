const List<String> hijriMonths = [
  'المحرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

const List<String> gregorianMonths = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const List<String> weekDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

class HijriDate {
  final int day;
  final int month; // 1-12
  final int year;
  const HijriDate({required this.day, required this.month, required this.year});

  String get monthName => hijriMonths[month - 1];
  String get label => '$day $monthName $year هـ';
}

int _gregorianToJdn(int year, int month, int day) {
  final a = (14 - month) ~/ 12;
  final y = year + 4800 - a;
  final m = month + 12 * a - 3;
  return day + ((153 * m + 2) ~/ 5) + 365 * y + (y ~/ 4) - (y ~/ 100) + (y ~/ 400) - 32045;
}

HijriDate jdnToHijri(int jdn) {
  var l = jdn - 1948440 + 10632;
  final n = (l - 1) ~/ 10631;
  l = l - 10631 * n + 354;
  final j = (((10985 - l) ~/ 5316) * ((50 * l) ~/ 17719)) + ((l ~/ 5670) * ((43 * l) ~/ 15238));
  l = l - (((30 - j) ~/ 15) * ((17719 * j) ~/ 50)) - ((j ~/ 16) * ((15238 * j) ~/ 43)) + 29;
  final month = (24 * l) ~/ 709;
  final day = l - ((709 * month) ~/ 24);
  final year = 30 * n + j - 30;
  return HijriDate(day: day, month: month, year: year);
}

int _hijriToJdn(int year, int month, int day) {
  return ((11 * year + 3) ~/ 30) + 354 * year + 30 * month - ((month - 1) ~/ 2) + day + 1948440 - 385;
}

HijriDate gregorianToHijri(DateTime date, {int offsetDays = 0}) {
  final jdn = _gregorianToJdn(date.year, date.month, date.day) + offsetDays;
  return jdnToHijri(jdn);
}

DateTime hijriToGregorian(int hYear, int hMonth, int hDay) {
  final jdn = _hijriToJdn(hYear, hMonth, hDay);
  // JDN to Gregorian
  final a = jdn + 32044;
  final b = (4 * a + 3) ~/ 146097;
  final c = a - (146097 * b) ~/ 4;
  final d = (4 * c + 3) ~/ 1461;
  final e = c - (1461 * d) ~/ 4;
  final m = (5 * e + 2) ~/ 153;
  final day = e - ((153 * m + 2) ~/ 5) + 1;
  final month = m + 3 - 12 * (m ~/ 10);
  final year = 100 * b + d - 4800 + (m ~/ 10);
  return DateTime(year, month, day);
}

class IslamicOccasion {
  final String id;
  final String name;
  final int hijriMonth;
  final int hijriDay;
  final String note;
  final String type; // eid, fasting, holy_day, general
  const IslamicOccasion({required this.id, required this.name, required this.hijriMonth, required this.hijriDay, required this.note, required this.type});
}

const List<IslamicOccasion> recurringOccasions = [
  IslamicOccasion(id: 'hijri_new_year', name: 'رأس السنة الهجرية', hijriMonth: 1, hijriDay: 1, note: 'بداية العام الهجري الجديد', type: 'holy_day'),
  IslamicOccasion(id: 'tasua', name: 'يوم تاسوعاء', hijriMonth: 1, hijriDay: 9, note: 'يُستحب صيامه مع عاشوراء', type: 'fasting'),
  IslamicOccasion(id: 'ashura', name: 'يوم عاشوراء', hijriMonth: 1, hijriDay: 10, note: 'يوم نجى الله فيه موسى عليه السلام - صيام يكفّر سنة ماضية', type: 'fasting'),
  IslamicOccasion(id: 'mawlid', name: 'المولد النبوي الشريف', hijriMonth: 3, hijriDay: 12, note: 'ذكرى مولد خير الأنام محمد ﷺ', type: 'holy_day'),
  IslamicOccasion(id: 'isra_miraj', name: 'الإسراء والمعراج', hijriMonth: 7, hijriDay: 27, note: 'ذكرى معجزة الإسراء والمعراج وفرض الصلوات', type: 'holy_day'),
  IslamicOccasion(id: 'nisf_shaban', name: 'ليلة النصف من شعبان', hijriMonth: 8, hijriDay: 15, note: 'ليلة مباركة يرجى فيها مغفرة الذنوب', type: 'holy_day'),
  IslamicOccasion(id: 'ramadan_start', name: 'أول أيام رمضان المبارك', hijriMonth: 9, hijriDay: 1, note: 'شهر الصيام والقرآن والرحمة', type: 'fasting'),
  IslamicOccasion(id: 'laylat_al_qadr_27', name: 'ليلة القدر (أرجى الليالي)', hijriMonth: 9, hijriDay: 27, note: 'ليلة خير من ألف شهر، تنزل الملائكة والروح فيها', type: 'holy_day'),
  IslamicOccasion(id: 'eid_al_fitr', name: 'عيد الفطر المبارك', hijriMonth: 10, hijriDay: 1, note: 'يوم الجائزة والفرحة بإتمام صيام رمضان', type: 'eid'),
  IslamicOccasion(id: 'shawwal_fasting', name: 'الست من شوال', hijriMonth: 10, hijriDay: 2, note: 'من صام رمضان ثم أتبعه ستاً من شوال كان كصيام الدهر', type: 'fasting'),
  IslamicOccasion(id: 'dhul_hijjah_10', name: 'أيام العشر من ذي الحجة', hijriMonth: 12, hijriDay: 1, note: 'أفضل أيام الدنيا، العمل الصالح فيها أحب إلى الله', type: 'holy_day'),
  IslamicOccasion(id: 'arafah', name: 'يوم عرفة', hijriMonth: 12, hijriDay: 9, note: 'أعظم أيام العام، صيامه يكفر سنة ماضية وسنة باقية', type: 'fasting'),
  IslamicOccasion(id: 'eid_al_adha', name: 'عيد الأضحى المبارك', hijriMonth: 12, hijriDay: 10, note: 'يوم النحر وأعظم الأيام عند الله تعالى', type: 'eid'),
  IslamicOccasion(id: 'tashreeq_1', name: 'أيام التشريق (أول أيام)', hijriMonth: 12, hijriDay: 11, note: 'أيام أكل وشرب وذكر لله تعالى', type: 'holy_day'),
];

class UpcomingOccasion {
  final IslamicOccasion occasion;
  final DateTime gregorianDate;
  final int daysRemaining;
  const UpcomingOccasion({required this.occasion, required this.gregorianDate, required this.daysRemaining});
}

List<UpcomingOccasion> getUpcomingOccasions(DateTime now, int count, {int offsetDays = 0}) {
  final currentHijri = gregorianToHijri(now, offsetDays: offsetDays);
  final results = <UpcomingOccasion>[];
  for (final occ in recurringOccasions) {
    for (final yearOffset in [0, 1]) {
      final hYear = currentHijri.year + yearOffset;
      final gDate = hijriToGregorian(hYear, occ.hijriMonth, occ.hijriDay).subtract(Duration(days: offsetDays));
      final days = gDate.difference(DateTime(now.year, now.month, now.day)).inDays;
      if (days >= 0) {
        results.add(UpcomingOccasion(occasion: occ, gregorianDate: gDate, daysRemaining: days));
        break;
      }
    }
  }
  results.sort((a, b) => a.daysRemaining.compareTo(b.daysRemaining));
  return results.take(count).toList();
}
