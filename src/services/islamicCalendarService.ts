export interface IslamicOccasionItem {
  id: string;
  name: string;
  hijriLabel: string;
  date: string; // YYYY-MM-DD
  note?: string;
  type?: 'eid' | 'fasting' | 'holy_day' | 'general';
}

export interface UpcomingOccasion extends IslamicOccasionItem {
  daysRemaining: number;
  isToday: boolean;
}

export interface CalendarDayInfo {
  date: Date;
  dateStr: string;
  gregorianDay: number;
  gregorianMonth: number;
  gregorianYear: number;
  hijriDay: number;
  hijriMonth: number;
  hijriMonthName: string;
  hijriYear: number;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  dayName: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  isFriday: boolean;
  isWhiteDay: boolean; // 13, 14, 15 of Hijri month
  isSunnahFasting: boolean; // Monday or Thursday
  occasion?: IslamicOccasionItem;
}

export const HIJRI_MONTHS = [
  'المحرم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];

// Rich Occasions list covering standard Islamic calendar milestones
export const RECURRING_OCCASIONS: {
  id: string;
  name: string;
  hijriMonth: number; // 1-12
  hijriDay: number;
  note: string;
  type: 'eid' | 'fasting' | 'holy_day' | 'general';
}[] = [
  { id: 'hijri_new_year', name: 'رأس السنة الهجرية', hijriMonth: 1, hijriDay: 1, note: 'بداية العام الهجري الجديد', type: 'holy_day' },
  { id: 'tasua', name: 'يوم تاسوعاء', hijriMonth: 1, hijriDay: 9, note: 'يُستحب صيامه مع عاشوراء', type: 'fasting' },
  { id: 'ashura', name: 'يوم عاشوراء', hijriMonth: 1, hijriDay: 10, note: 'يوم نجى الله فيه موسى عليه السلام - صيام يكفّر سنة ماضية', type: 'fasting' },
  { id: 'mawlid', name: 'المولد النبوي الشريف', hijriMonth: 3, hijriDay: 12, note: 'ذكرى مولد خير الأنام محمد ﷺ', type: 'holy_day' },
  { id: 'isra_miraj', name: 'الإسراء والمعراج', hijriMonth: 7, hijriDay: 27, note: 'ذكرى معجزة الإسراء والمعراج وفرض الصلوات', type: 'holy_day' },
  { id: 'nisf_shaban', name: 'ليلة النصف من شعبان', hijriMonth: 8, hijriDay: 15, note: 'ليلة مباركة يرجى فيها مغفرة الذنوب', type: 'holy_day' },
  { id: 'ramadan_start', name: 'أول أيام رمضان المبارك', hijriMonth: 9, hijriDay: 1, note: 'شهر الصيام والقرآن والرحمة', type: 'fasting' },
  { id: 'laylat_al_qadr_27', name: 'ليلة القدر (أرجى الليالي)', hijriMonth: 9, hijriDay: 27, note: 'ليلة خير من ألف شهر، تنزل الملائكة والروح فيها', type: 'holy_day' },
  { id: 'eid_al_fitr', name: 'عيد الفطر المبارك', hijriMonth: 10, hijriDay: 1, note: 'يوم الجائزة والفرحة بإتمام صيام رمضان', type: 'eid' },
  { id: 'shawwal_fasting', name: 'الست من شوال', hijriMonth: 10, hijriDay: 2, note: 'من صام رمضان ثم أتبعه ستاً من شوال كان كصيام الدهر', type: 'fasting' },
  { id: 'dhul_hijjah_10', name: 'أيام العشر من ذي الحجة', hijriMonth: 12, hijriDay: 1, note: 'أفضل أيام الدنيا، العمل الصالح فيها أحب إلى الله', type: 'holy_day' },
  { id: 'arafah', name: 'يوم عرفة', hijriMonth: 12, hijriDay: 9, note: 'أعظم أيام العام، صيامه يكفر سنة ماضية وسنة باقية', type: 'fasting' },
  { id: 'eid_al_adha', name: 'عيد الأضحى المبارك', hijriMonth: 12, hijriDay: 10, note: 'يوم النحر وأعظم الأيام عند الله تعالى', type: 'eid' },
  { id: 'tashreeq_1', name: 'أيام التشريق (أول أيام)', hijriMonth: 12, hijriDay: 11, note: 'أيام أكل وشرب وذكر لله تعالى', type: 'holy_day' },
];

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatWithLocale(date: Date, options: Intl.DateTimeFormatOptions, locale = 'ar-EG') {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function getGregorianDateLabel(date = new Date()): string {
  return formatWithLocale(date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getHijriDateLabel(date = new Date(), offsetDays = 0): string {
  const d = new Date(date);
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function getCurrentTimeLabel(date = new Date()): string {
  return formatWithLocale(date, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Parses Hijri date components for any Gregorian date
 */
export function getHijriComponents(date: Date, offsetDays = 0): {
  day: number;
  month: number;
  monthName: string;
  year: number;
  label: string;
} {
  const d = new Date(date);
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(d);
    const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10);
    const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10);
    const year = parseInt(parts.find((p) => p.type === 'year')?.value || '1448', 10);
    const monthName = HIJRI_MONTHS[month - 1] || 'الهجري';

    const arFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return {
      day,
      month,
      monthName,
      year,
      label: arFormatter.format(d),
    };
  } catch {
    return {
      day: 1,
      month: 1,
      monthName: HIJRI_MONTHS[0],
      year: 1448,
      label: '1 المحرم 1448 هـ',
    };
  }
}

/**
 * Builds the full calendar days matrix for a given year & month (Gregorian)
 */
export function getMonthCalendarGrid(year: number, monthIndex: number, hijriOffset = 0): {
  days: CalendarDayInfo[];
  hijriSummary: string;
  gregorianSummary: string;
} {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

  // Day of week for first day (0=Sunday, 6=Saturday)
  // In Arabic calendar, Saturday is index 0 or Sunday is 0. Standard week: Saturday=0 ... Friday=6
  // JS Date.getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
  // Let's make Saturday the first column: (dayOfWeek + 1) % 7
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 6=Sat
  const leadingDays = (startDayOfWeek + 1) % 7; // days to pad on Saturday-start

  const days: CalendarDayInfo[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Padding days from previous month
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = leadingDays - 1; i >= 0; i--) {
    const d = new Date(year, monthIndex - 1, prevMonthLastDay - i);
    days.push(createDayInfo(d, false, todayStr, hijriOffset));
  }

  // 2. Days of current month
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const d = new Date(year, monthIndex, day);
    days.push(createDayInfo(d, true, todayStr, hijriOffset));
  }

  // 3. Padding days to fill 35 or 42 grid cells
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, monthIndex + 1, i);
    days.push(createDayInfo(d, false, todayStr, hijriOffset));
  }

  // Hijri summary for this month
  const startHijri = getHijriComponents(firstDayOfMonth, hijriOffset);
  const endHijri = getHijriComponents(lastDayOfMonth, hijriOffset);
  
  let hijriSummary = `${startHijri.monthName} ${startHijri.year} هـ`;
  if (startHijri.month !== endHijri.month) {
    hijriSummary = `${startHijri.monthName} / ${endHijri.monthName} ${startHijri.year} هـ`;
  }

  const gregorianSummary = formatWithLocale(firstDayOfMonth, { month: 'long', year: 'numeric' });

  return { days, hijriSummary, gregorianSummary };
}

function createDayInfo(date: Date, isCurrentMonth: boolean, todayStr: string, hijriOffset: number): CalendarDayInfo {
  const dateStr = date.toISOString().split('T')[0];
  const gregorianDay = date.getDate();
  const gregorianMonth = date.getMonth() + 1;
  const gregorianYear = date.getFullYear();

  const hijri = getHijriComponents(date, hijriOffset);
  const dayOfWeek = date.getDay(); // 0=Sunday, 5=Friday, etc.

  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const dayName = dayNames[dayOfWeek];

  const isToday = dateStr === todayStr;
  const isFriday = dayOfWeek === 5;
  const isWhiteDay = hijri.day >= 13 && hijri.day <= 15;
  const isSunnahFasting = dayOfWeek === 1 || dayOfWeek === 4; // Monday (1) or Thursday (4)

  // Find occasion
  const foundOccasion = RECURRING_OCCASIONS.find(
    (occ) => occ.hijriMonth === hijri.month && occ.hijriDay === hijri.day
  );

  let occasion: IslamicOccasionItem | undefined;
  if (foundOccasion) {
    occasion = {
      id: `${foundOccasion.id}-${hijri.year}`,
      name: foundOccasion.name,
      hijriLabel: `${foundOccasion.hijriDay} ${HIJRI_MONTHS[foundOccasion.hijriMonth - 1]} ${hijri.year} هـ`,
      date: dateStr,
      note: foundOccasion.note,
      type: foundOccasion.type,
    };
  }

  return {
    date,
    dateStr,
    gregorianDay,
    gregorianMonth,
    gregorianYear,
    hijriDay: hijri.day,
    hijriMonth: hijri.month,
    hijriMonthName: hijri.monthName,
    hijriYear: hijri.year,
    dayOfWeek,
    dayName,
    isToday,
    isCurrentMonth,
    isFriday,
    isWhiteDay,
    isSunnahFasting,
    occasion,
  };
}

/**
 * Returns upcoming occasions calculated dynamically from current date forward
 */
export function getUpcomingIslamicOccasions(now = new Date(), count = 6, hijriOffset = 0): UpcomingOccasion[] {
  const occasions: UpcomingOccasion[] = [];
  const start = startOfDay(now);
  const todayMs = start.getTime();

  // Scan upcoming 365 days
  for (let i = 0; i < 365; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);

    const hijri = getHijriComponents(d, hijriOffset);
    const match = RECURRING_OCCASIONS.find(
      (occ) => occ.hijriMonth === hijri.month && occ.hijriDay === hijri.day
    );

    if (match) {
      const dateStr = d.toISOString().split('T')[0];
      const daysRemaining = i;
      occasions.push({
        id: `${match.id}-${hijri.year}`,
        name: match.name,
        hijriLabel: `${match.hijriDay} ${HIJRI_MONTHS[match.hijriMonth - 1]} ${hijri.year} هـ`,
        date: dateStr,
        note: match.note,
        type: match.type,
        daysRemaining,
        isToday: daysRemaining === 0,
      });

      if (occasions.length >= count) break;
    }
  }

  return occasions;
}
