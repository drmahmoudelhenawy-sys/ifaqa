import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import {
  Coordinates,
  CalculationMethod,
  CalculationParameters,
  Madhab,
  PrayerTimes as AdhanPrayerTimes
} from 'adhan';
import { scheduleLocalNotification } from './localNotifications';
import { updatePersistentPrayerNotification } from './notificationService';
import { scheduleAthkarDailyReminders } from './athkarReminderService';
import { ARAB_CITIES_LOCATIONS, findCityById, findNearestCity, CityLocation } from './prayerCities';

export const FUNDAMENTAL_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type PrayerName = typeof FUNDAMENTAL_PRAYERS[number];

export const ARABIC_PRAYERS: Record<PrayerName, string> = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

export type AladhanTimings = Partial<Record<PrayerName, string>>;

export type PrayerOffsets = {
  preAzan: number;
  iqama: number;
  fajrOffset?: number; // fine-tuning in minutes
  dhuhrOffset?: number;
  asrOffset?: number;
  maghribOffset?: number;
  ishaOffset?: number;
};

export type PrayerSettings = {
  autoLocation: boolean;
  selectedCityId?: string;
  country: string;
  city: string;
  cityNameAr?: string;
  latitude?: number;
  longitude?: number;
  calcMethod: number; // 5 = Egyptian, 4 = UmmAlQura, 3 = MWL, etc.
  asrMethod: number;  // 0 = Shafi/Standard, 1 = Hanafi
  notifications: Partial<Record<PrayerName, boolean>>;
  offsets: Record<PrayerName, PrayerOffsets>;
};

export type LocationSnapshot = {
  latitude: number;
  longitude: number;
  label?: string;
};

type TimingsCachePayload = {
  date: string;
  timings: AladhanTimings;
  source: 'coordinates' | 'city' | 'adhan_local';
  location?: LocationSnapshot;
};

export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = {
  autoLocation: true,
  selectedCityId: 'cairo',
  country: 'Egypt',
  city: 'Cairo',
  cityNameAr: 'القاهرة والجيزة',
  latitude: 30.0444,
  longitude: 31.2357,
  calcMethod: 5,
  asrMethod: 0,
  notifications: {
    Fajr: true,
    Dhuhr: true,
    Asr: true,
    Maghrib: true,
    Isha: true,
  },
  offsets: {
    Fajr: { preAzan: 15, iqama: 25 },
    Dhuhr: { preAzan: 15, iqama: 20 },
    Asr: { preAzan: 15, iqama: 20 },
    Maghrib: { preAzan: 15, iqama: 10 },
    Isha: { preAzan: 15, iqama: 20 },
  },
};

const STORAGE_KEY = 'prayer_settings';
const TIMINGS_CACHE_KEY = 'prayer_timings_cache_v2';
const LEGACY_TIMINGS_CACHE_KEY = 'prayer_timings_cache';
const DATE_CACHE_KEY = 'prayer_timings_date';
const LOCATION_REUSE_DISTANCE_METERS = 1500;

function getTodayCacheDate() {
  return new Date().toDateString();
}

export function parsePrayerTimeForToday(time: string) {
  const cleanTime = time.split(' ')[0];
  const [hours, minutes] = cleanTime.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  const prayerDate = new Date();
  prayerDate.setHours(hours, minutes, 0, 0);
  return prayerDate.getTime();
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceMeters(a: LocationSnapshot, b: LocationSnapshot) {
  const earthRadius = 6371000;
  const latDelta = toRadians(b.latitude - a.latitude);
  const lonDelta = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDelta / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
}

function readCachePayload(): TimingsCachePayload | null {
  const raw = localStorage.getItem(TIMINGS_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TimingsCachePayload;
  } catch {
    return null;
  }
}

function isCacheValidForLocation(cache: TimingsCachePayload, location?: LocationSnapshot | null) {
  if (cache.date !== getTodayCacheDate()) return false;
  if (!cache.timings || !cache.timings.Fajr) return false;
  if (cache.source !== 'coordinates') return true;
  if (!cache.location || !location) return false;
  return getDistanceMeters(cache.location, location) <= LOCATION_REUSE_DISTANCE_METERS;
}

function saveTimingsCache(payload: TimingsCachePayload) {
  localStorage.setItem(TIMINGS_CACHE_KEY, JSON.stringify(payload));
  localStorage.setItem(DATE_CACHE_KEY, payload.date);
  localStorage.setItem(LEGACY_TIMINGS_CACHE_KEY, JSON.stringify(payload.timings));
}

export function getPrayerSettings(): PrayerSettings {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_PRAYER_SETTINGS;

  try {
    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_PRAYER_SETTINGS,
      ...parsed,
      notifications: {
        ...DEFAULT_PRAYER_SETTINGS.notifications,
        ...parsed.notifications,
      },
      offsets: {
        ...DEFAULT_PRAYER_SETTINGS.offsets,
        ...parsed.offsets,
      },
    };
  } catch {
    return DEFAULT_PRAYER_SETTINGS;
  }
}

export function savePrayerSettings(settings: PrayerSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getCachedTimings(): AladhanTimings | null {
  const payload = readCachePayload();
  if (payload && payload.date === getTodayCacheDate()) {
    return payload.timings;
  }

  const legacyDate = localStorage.getItem(DATE_CACHE_KEY);
  if (legacyDate === getTodayCacheDate()) {
    const legacyTimings = localStorage.getItem(LEGACY_TIMINGS_CACHE_KEY);
    if (legacyTimings) {
      try {
        return JSON.parse(legacyTimings) as AladhanTimings;
      } catch {}
    }
  }

  return null;
}

export function saveCachedTimings(timings: AladhanTimings) {
  saveTimingsCache({
    date: getTodayCacheDate(),
    timings,
    source: 'adhan_local',
  });

  Preferences.set({
    key: 'ifaqa_prayer_times',
    value: JSON.stringify(timings),
  });
}

/**
 * High-accuracy astronomical calculation using the official 'adhan' GitHub library.
 * Works 100% offline with zero network latency.
 */
export function calculateAstronomicalTimes(
  location: { latitude: number; longitude: number },
  settings: PrayerSettings,
  date = new Date()
): AladhanTimings {
  const coordinates = new Coordinates(location.latitude, location.longitude);
  let params: CalculationParameters;

  switch (settings.calcMethod) {
    case 5:
      params = CalculationMethod.Egyptian();
      break;
    case 4:
      params = CalculationMethod.UmmAlQura();
      break;
    case 3:
      params = CalculationMethod.MuslimWorldLeague();
      break;
    case 8:
      params = CalculationMethod.Dubai();
      break;
    case 9:
      params = CalculationMethod.Kuwait();
      break;
    case 10:
      params = CalculationMethod.Qatar();
      break;
    case 13:
      params = CalculationMethod.Turkey();
      break;
    case 2:
      params = CalculationMethod.NorthAmerica();
      break;
    default:
      params = CalculationMethod.Egyptian();
  }

  if (settings.asrMethod === 1) {
    params.madhab = Madhab.Hanafi;
  } else {
    params.madhab = Madhab.Shafi;
  }

  const pt = new AdhanPrayerTimes(coordinates, date, params);
  const fmt = (d: Date) => {
    if (!d || isNaN(d.getTime())) return '00:00';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return {
    Fajr: fmt(pt.fajr),
    Dhuhr: fmt(pt.dhuhr),
    Asr: fmt(pt.asr),
    Maghrib: fmt(pt.maghrib),
    Isha: fmt(pt.isha),
  };
}

export async function requestDeviceLocation(): Promise<LocationSnapshot> {
  let hasCapacitorGeo = false;
  try {
    const permission = await Geolocation.checkPermissions();
    if (permission.location !== 'granted') {
      const request = await Geolocation.requestPermissions();
      if (request.location === 'granted') {
        hasCapacitorGeo = true;
      }
    } else {
      hasCapacitorGeo = true;
    }
  } catch {
    hasCapacitorGeo = false;
  }

  if (hasCapacitorGeo) {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch {}
  }

  // Fallback to browser HTML5 Geolocation
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  throw new Error('Geolocation unavailable');
}

async function fetchTimingsByCoordinates(location: LocationSnapshot, settings: PrayerSettings) {
  try {
    const locationParams = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      method: settings.calcMethod.toString(),
      school: settings.asrMethod.toString(),
    });

    const response = await fetch(`https://api.aladhan.com/v1/timings?${locationParams.toString()}`);
    if (!response.ok) return null;
    const json = await response.json();
    return json?.data?.timings as AladhanTimings | null;
  } catch {
    return null;
  }
}

async function fetchTimingsByCity(settings: PrayerSettings) {
  try {
    const cityParams = new URLSearchParams({
      city: settings.city,
      country: settings.country,
      method: settings.calcMethod.toString(),
      school: settings.asrMethod.toString(),
    });

    const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?${cityParams.toString()}`);
    if (!response.ok) return null;
    const json = await response.json();
    return json?.data?.timings as AladhanTimings | null;
  } catch {
    return null;
  }
}

function syncTimingsToNative(timings: AladhanTimings) {
  Preferences.set({
    key: 'ifaqa_prayer_times',
    value: JSON.stringify(timings),
  }).then(() => {
    updatePersistentPrayerNotification();
  }).catch(() => {});
}

function schedulePrayerNotifications(timings: AladhanTimings, settings: PrayerSettings) {
  FUNDAMENTAL_PRAYERS.forEach((prayerName) => {
    if (!settings.notifications[prayerName]) return;

    const prayerTimeStr = timings[prayerName];
    if (!prayerTimeStr) return;

    const azanTime = parsePrayerTimeForToday(prayerTimeStr);
    if (!azanTime || azanTime <= Date.now()) return;

    const offsets = settings.offsets[prayerName] || DEFAULT_PRAYER_SETTINGS.offsets[prayerName];

    if (offsets.preAzan > 0) {
      const preAzanTime = azanTime - offsets.preAzan * 60 * 1000;
      if (preAzanTime > Date.now()) {
        scheduleLocalNotification(
          `${prayerName}_pre`,
          `استعد، اقترب موعد صلاة ${ARABIC_PRAYERS[prayerName]}`,
          preAzanTime,
        );
      }
    }

    scheduleLocalNotification(
      `${prayerName}_azan`,
      `حان الآن موعد أذان ${ARABIC_PRAYERS[prayerName]}`,
      azanTime,
    );

    if (offsets.iqama > 0) {
      scheduleLocalNotification(
        `${prayerName}_iqama`,
        `حان الآن موعد إقامة صلاة ${ARABIC_PRAYERS[prayerName]}`,
        azanTime + offsets.iqama * 60 * 1000,
      );
    }
  });
}

async function updatePrayerWidgetState(timings: AladhanTimings) {
  const now = Date.now();
  let currentPrayer: PrayerName = 'Isha';
  let nextPrayer: PrayerName = 'Fajr';
  let nextTime = 0;

  for (let index = 0; index < FUNDAMENTAL_PRAYERS.length; index += 1) {
    const prayerName = FUNDAMENTAL_PRAYERS[index];
    const prayerTime = parsePrayerTimeForToday(timings[prayerName] || '');
    if (prayerTime && prayerTime > now) {
      nextPrayer = prayerName;
      nextTime = prayerTime;
      currentPrayer = index === 0 ? 'Isha' : FUNDAMENTAL_PRAYERS[index - 1];
      break;
    }
  }

  if (nextTime === 0) {
    const fajrTime = parsePrayerTimeForToday(timings.Fajr || '');
    nextPrayer = 'Fajr';
    currentPrayer = 'Isha';
    if (fajrTime) {
      nextTime = fajrTime + 24 * 60 * 60 * 1000;
    }
  }

  await Preferences.set({ key: 'current_prayer_name', value: `صلاة ${ARABIC_PRAYERS[currentPrayer]}` });
  await Preferences.set({ key: 'next_prayer_name', value: ARABIC_PRAYERS[nextPrayer] });
  await Preferences.set({ key: 'next_prayer_time_ms', value: nextTime.toString() });
}

export async function fetchAndSchedulePrayers(forceRefresh = false): Promise<AladhanTimings | null> {
  try {
    const settings = getPrayerSettings();
    let effectiveLocation: LocationSnapshot | null = null;

    if (settings.autoLocation) {
      try {
        effectiveLocation = await requestDeviceLocation();
        // Update detected nearest city name in settings
        const nearest = findNearestCity(effectiveLocation.latitude, effectiveLocation.longitude);
        effectiveLocation.label = nearest.nameAr;
      } catch (error) {
        console.warn('Precise geolocation unavailable, using saved coordinates/city.', error);
      }
    }

    if (!effectiveLocation) {
      if (settings.latitude && settings.longitude) {
        effectiveLocation = {
          latitude: settings.latitude,
          longitude: settings.longitude,
          label: settings.cityNameAr || settings.city
        };
      } else if (settings.selectedCityId) {
        const found = findCityById(settings.selectedCityId);
        if (found) {
          effectiveLocation = {
            latitude: found.latitude,
            longitude: found.longitude,
            label: found.nameAr
          };
        }
      }
    }

    // Default fallback: Cairo
    if (!effectiveLocation) {
      effectiveLocation = {
        latitude: 30.0444,
        longitude: 31.2357,
        label: 'القاهرة والجيزة'
      };
    }

    // First: Calculate instantly using high-precision astronomical library (adhan)
    const localTimings = calculateAstronomicalTimes(effectiveLocation, settings);

    // If cache matches today and not forced, return
    const cachedPayload = !forceRefresh ? readCachePayload() : null;
    if (cachedPayload && isCacheValidForLocation(cachedPayload, effectiveLocation)) {
      syncTimingsToNative(cachedPayload.timings);
      schedulePrayerNotifications(cachedPayload.timings, settings);
      scheduleAthkarDailyReminders(cachedPayload.timings).catch(() => {});
      await updatePrayerWidgetState(cachedPayload.timings);
      return cachedPayload.timings;
    }

    let finalTimings = localTimings;

    // Background verify with Aladhan API if online (non-blocking)
    try {
      const apiTimings = await fetchTimingsByCoordinates(effectiveLocation, settings);
      if (apiTimings && apiTimings.Fajr) {
        finalTimings = apiTimings;
      }
    } catch {}

    saveTimingsCache({
      date: getTodayCacheDate(),
      timings: finalTimings,
      source: 'coordinates',
      location: effectiveLocation,
    });

    syncTimingsToNative(finalTimings);
    schedulePrayerNotifications(finalTimings, settings);
    scheduleAthkarDailyReminders(finalTimings).catch(() => {});
    await updatePrayerWidgetState(finalTimings);
    return finalTimings;
  } catch (error) {
    console.error('Prayer fetching error:', error);
    return null;
  }
}
