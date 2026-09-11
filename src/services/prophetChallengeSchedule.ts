import { getCachedTimings } from './prayerTimes';

export interface ChallengeScheduleInfo {
  isFridayChallenge: boolean;
  periodKey: string;
  displayTitle: string;
  fridayDateStr: string;
  nextFajrOrMaghribTime: Date;
  status: 'active_friday' | 'upcoming_friday' | 'active_daily';
  timeRemainingMs: number;
  formattedCountdown: string;
  bannerSubtitle: string;
}

function parseTimeToDate(timeStr: string | undefined, baseDate: Date, fallbackHour: number, fallbackMinute: number): Date {
  const d = new Date(baseDate);
  if (!timeStr) {
    d.setHours(fallbackHour, fallbackMinute, 0, 0);
    return d;
  }
  const clean = timeStr.split(' ')[0];
  const [h, m] = clean.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    d.setHours(fallbackHour, fallbackMinute, 0, 0);
    return d;
  }
  d.setHours(h, m, 0, 0);
  return d;
}

export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getProphetChallengeSchedule(now = new Date()): ChallengeScheduleInfo {
  const timings = getCachedTimings();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 4 = Thu, 5 = Fri, 6 = Sat

  // Find this week's (or next) Friday
  // Days until upcoming/current Friday:
  // Thu (4) -> +1
  // Fri (5) -> 0
  // Sat (6) -> +6
  // Sun (0) -> +5
  // Mon (1) -> +4
  // Tue (2) -> +3
  // Wed (3) -> +2
  let daysToFriday = (5 - dayOfWeek + 7) % 7;
  // If today is Friday after Maghrib, next Friday is in 7 days
  const fridayDate = new Date(now);
  fridayDate.setDate(now.getDate() + daysToFriday);

  const thursdayDate = new Date(fridayDate);
  thursdayDate.setDate(fridayDate.getDate() - 1);

  const thursdayFajr = parseTimeToDate(timings?.Fajr, thursdayDate, 4, 30);
  const fridayMaghrib = parseTimeToDate(timings?.Maghrib, fridayDate, 18, 20);

  // If today is Friday and now >= fridayMaghrib, this week's Friday challenge has concluded
  const isPastFridayMaghrib = dayOfWeek === 5 && now >= fridayMaghrib;

  // Friday Challenge window: Thursday Fajr -> Friday Maghrib
  const isFridayChallenge = now >= thursdayFajr && now < fridayMaghrib;

  const fridayDateStr = formatDateKey(fridayDate);
  const todayDateStr = formatDateKey(now);

  if (isFridayChallenge) {
    const diff = Math.max(0, fridayMaghrib.getTime() - now.getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      isFridayChallenge: true,
      periodKey: `friday_${fridayDateStr}`,
      displayTitle: 'تحدي الجمعة المباركة',
      fridayDateStr,
      nextFajrOrMaghribTime: fridayMaghrib,
      status: 'active_friday',
      timeRemainingMs: diff,
      formattedCountdown: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
      bannerSubtitle: 'صلِّ على النبي ﷺ وشارك بالهدف'
    };
  }

  // Check if upcoming Thursday Fajr is soon (e.g. today is Thursday before Fajr)
  const isThursdayBeforeFajr = dayOfWeek === 4 && now < thursdayFajr;
  if (isThursdayBeforeFajr) {
    const diff = Math.max(0, thursdayFajr.getTime() - now.getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      isFridayChallenge: false,
      periodKey: `daily_${todayDateStr}`,
      displayTitle: 'ذكر المصطفى ﷺ',
      fridayDateStr,
      nextFajrOrMaghribTime: thursdayFajr,
      status: 'upcoming_friday',
      timeRemainingMs: diff,
      formattedCountdown: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
      bannerSubtitle: 'تحدي الجمعة يبدأ عند الفجر'
    };
  }

  // Normal Daily Challenge (Runs 24/7)
  // Compute time until next Thursday Fajr:
  let nextThuDate = new Date(now);
  let daysToNextThu = (4 - dayOfWeek + 7) % 7;
  if (daysToNextThu === 0 && now >= thursdayFajr) {
    daysToNextThu = 7;
  }
  nextThuDate.setDate(now.getDate() + daysToNextThu);
  const nextThuFajr = parseTimeToDate(timings?.Fajr, nextThuDate, 4, 30);
  const diffToNextThu = Math.max(0, nextThuFajr.getTime() - now.getTime());
  const daysLeft = Math.floor(diffToNextThu / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((diffToNextThu % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  let countdownText = '';
  if (daysLeft > 1) {
    countdownText = `${daysLeft} أيام و ${hoursLeft} س`;
  } else if (daysLeft === 1) {
    countdownText = `يوم و ${hoursLeft} س`;
  } else {
    countdownText = `${hoursLeft} ساعة`;
  }

  return {
    isFridayChallenge: false,
    periodKey: `daily_${todayDateStr}`,
    displayTitle: 'ذكر المصطفى ﷺ',
    fridayDateStr,
    nextFajrOrMaghribTime: nextThuFajr,
    status: 'active_daily',
    timeRemainingMs: diffToNextThu,
    formattedCountdown: countdownText,
    bannerSubtitle: 'العداد اليومي متاح 24 ساعة'
  };
}
