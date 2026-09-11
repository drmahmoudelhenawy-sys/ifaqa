import { useEffect, useState } from 'react';

type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
type PrayerTimestamp = number | Date;
type PrayerTimings = Partial<Record<PrayerName, PrayerTimestamp>>;

type PrayerTimerItem = {
  name: PrayerName;
  timestamp: number;
};

type PrayerTimerState = {
  nextPrayer: PrayerTimerItem | null;
  currentPrayer: PrayerTimerItem | null;
  timeLeft: string;
  timePassed: string;
  mode?: 'remaining' | 'passed';
};

const PRAYER_ORDER: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const EMPTY_TIMER_STATE: PrayerTimerState = {
  nextPrayer: null,
  currentPrayer: null,
  timeLeft: '00:00:00',
  timePassed: '00:00:00',
};

const toTimestamp = (value: PrayerTimestamp | undefined): number | null => {
  if (value instanceof Date) {
    return value.getTime();
  }

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};

const buildPrayerList = (timings: PrayerTimings): PrayerTimerItem[] => {
  return PRAYER_ORDER.map((name) => {
    const timestamp = toTimestamp(timings[name]);
    return timestamp ? { name, timestamp } : null;
  }).filter((item): item is PrayerTimerItem => Boolean(item));
};

const getPrayerTimerState = (timings: PrayerTimings): PrayerTimerState => {
  const prayers = buildPrayerList(timings);

  if (prayers.length === 0) {
    return EMPTY_TIMER_STATE;
  }

  const now = Date.now();
  const TWENTY_MINUTES = 20 * 60 * 1000;
  
  // Find current prayer (the one that just started or is ongoing)
  const currentPrayer = [...prayers].reverse().find((prayer) => prayer.timestamp <= now) || prayers[prayers.length - 1];
  const currentPrayerTimestamp = currentPrayer.timestamp <= now
    ? currentPrayer.timestamp
    : currentPrayer.timestamp - 24 * 60 * 60 * 1000;

  const msSinceAzan = now - currentPrayerTimestamp;
  const isWithin20Mins = msSinceAzan <= TWENTY_MINUTES;

  // Determine which prayer to show as "Next"
  let displayNext: PrayerTimerItem;
  let labelMode: 'remaining' | 'passed';
  let diffMs: number;

  if (isWithin20Mins) {
    displayNext = currentPrayer;
    labelMode = 'passed';
    diffMs = msSinceAzan;
  } else {
    const nextIdx = (prayers.indexOf(currentPrayer) + 1) % prayers.length;
    displayNext = prayers[nextIdx];
    labelMode = 'remaining';
    
    const nextTimestamp = displayNext.timestamp > now
      ? displayNext.timestamp
      : displayNext.timestamp + 24 * 60 * 60 * 1000;
    diffMs = nextTimestamp - now;
  }

  return {
    nextPrayer: displayNext,
    currentPrayer,
    timeLeft: formatDuration(diffMs),
    timePassed: formatDuration(msSinceAzan),
    // @ts-ignore - Adding custom property for UI feedback
    mode: labelMode
  };
};

export const usePrayerTimer = (timings: PrayerTimings): PrayerTimerState => {
  const [timerState, setTimerState] = useState<PrayerTimerState>(() => getPrayerTimerState(timings));

  useEffect(() => {
    setTimerState(getPrayerTimerState(timings));

    const intervalId = window.setInterval(() => {
      setTimerState(getPrayerTimerState(timings));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timings]);

  return timerState;
};
