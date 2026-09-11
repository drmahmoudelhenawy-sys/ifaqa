import { MORNING_ADHKAR, EVENING_ADHKAR, SITUATIONAL_CATEGORIES } from '../constants';

export type OfflinePackKey = 'quranMushaf' | 'tafseerMuyassar' | 'athkar';

export interface OfflinePackStatus {
  downloaded: boolean;
  updatedAt?: string;
  count?: number;
}

export type OfflineStatusMap = Record<OfflinePackKey, OfflinePackStatus>;

const OFFLINE_CACHE_NAME = 'ifaqa-offline-content-v1';
const OFFLINE_STATUS_KEY = 'ifaqaOfflineStatus';
const ATHKAR_OFFLINE_KEY = 'ifaqaOfflineAthkar';
export const MUYASSAR_QURAN_URL = 'https://api.alquran.cloud/v1/quran/ar.muyassar';

const emptyStatus: OfflineStatusMap = {
  quranMushaf: { downloaded: false },
  tafseerMuyassar: { downloaded: false },
  athkar: { downloaded: false }
};

const formatPageFile = (page: number) => String(page).padStart(3, '0');

function readJson<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeStatus(key: OfflinePackKey, status: OfflinePackStatus) {
  const current = getOfflineStatus();
  const next = { ...current, [key]: status };
  localStorage.setItem(OFFLINE_STATUS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('ifaqa-offline-status-updated', { detail: next }));
  return next;
}

export function getOfflineStatus(): OfflineStatusMap {
  return { ...emptyStatus, ...readJson<Partial<OfflineStatusMap>>(OFFLINE_STATUS_KEY, {}) } as OfflineStatusMap;
}

async function requireCacheStorage() {
  if (!('caches' in window)) {
    throw new Error('cache-storage-not-supported');
  }
  return caches.open(OFFLINE_CACHE_NAME);
}

async function cacheUrl(cache: Cache, url: string) {
  const response = await fetch(url, { cache: 'reload' });
  if (!response.ok) throw new Error(`offline-cache-failed:${url}`);
  await cache.put(url, response.clone());
}

async function cacheUrls(urls: string[], onProgress?: (done: number, total: number) => void) {
  const cache = await requireCacheStorage();
  let done = 0;

  for (const url of urls) {
    await cacheUrl(cache, url);
    done += 1;
    onProgress?.(done, urls.length);
  }
}

export async function downloadQuranMushafOffline(onProgress?: (done: number, total: number) => void) {
  const urls = Array.from({ length: 604 }, (_, index) => {
    const page = formatPageFile(index + 1);
    return [`/svg/${page}.svg`, `/json/${page}.json`];
  }).flat();

  await cacheUrls(urls, onProgress);
  return writeStatus('quranMushaf', { downloaded: true, updatedAt: new Date().toISOString(), count: urls.length });
}

export async function downloadTafseerOffline(onProgress?: (done: number, total: number) => void) {
  await cacheUrls([MUYASSAR_QURAN_URL], onProgress);
  return writeStatus('tafseerMuyassar', { downloaded: true, updatedAt: new Date().toISOString(), count: 1 });
}

export async function getCachedMuyassarAyah(surahNumber: number, ayahNumber: number) {
  if (!('caches' in window)) return '';
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const response = await cache.match(MUYASSAR_QURAN_URL);
  if (!response) return '';

  const payload = await response.json();
  const surah = payload?.data?.surahs?.find((item: any) => Number(item.number) === Number(surahNumber));
  return surah?.ayahs?.find((ayah: any) => Number(ayah.numberInSurah) === Number(ayahNumber))?.text || '';
}

export async function downloadAthkarOffline() {
  const payload = {
    morning: MORNING_ADHKAR,
    evening: EVENING_ADHKAR,
    situational: SITUATIONAL_CATEGORIES,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(ATHKAR_OFFLINE_KEY, JSON.stringify(payload));
  return writeStatus('athkar', {
    downloaded: true,
    updatedAt: payload.updatedAt,
    count: MORNING_ADHKAR.length + EVENING_ADHKAR.length + SITUATIONAL_CATEGORIES.reduce((sum, category) => sum + category.adhkar.length, 0)
  });
}
