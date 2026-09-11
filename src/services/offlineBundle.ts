import localforage from 'localforage';
import { quranSurahs } from '../../quranMetadata';

// ─────────────────────────────────────────────
// Keys
// ─────────────────────────────────────────────
const KEY_QURAN_TEXT    = 'quran_text';
const KEY_TAFSIR_MUYASSAR = 'quran_tafsir_muyassar'; // alquran.cloud full
const KEY_TAFSIR_SADDI  = 'quran_tafsir_saddi';   // quran.com id=91
const KEY_TAFSIR_QURTUBI = 'quran_tafsir_qurtubi'; // quran.com id=90
const KEY_TAFSIR_IBN_KATHIR = 'quran_tafsir_ibn_kathir'; // quran.com id=14
const KEY_TAFSIR_TABARI = 'quran_tafsir_tabari';   // quran.com id=15
const KEY_MORPHOLOGY_STATUS = 'quran_morphology_status';
const KEY_IRAAB_STATUS = 'quran_iraab_status';
const TAFSIR_CDN_BASE = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir';
const IRAAB_EDITION = 'al-i-rab-al-muyassar';

export const TAFSIR_SOURCES = {
  1: { name: 'التفسير الميسر', slug: 'ar-tafsir-muyassar', key: KEY_TAFSIR_MUYASSAR },
  2: { name: 'تفسير الجلالين', slug: 'ar-tafsir-al-jalalayn', key: 'quran_tafsir_jalalayn' },
  3: { name: 'تفسير السعدي', slug: 'ar-tafsir-as-saadi', key: KEY_TAFSIR_SADDI },
  4: { name: 'تفسير ابن كثير', slug: 'ar-tafsir-ibn-kathir', key: KEY_TAFSIR_IBN_KATHIR },
  5: { name: 'تفسير الطبري', slug: 'ar-tafsir-al-tabari', key: KEY_TAFSIR_TABARI },
  6: { name: 'تفسير القرطبي', slug: 'ar-tafseer-al-qurtubi', key: KEY_TAFSIR_QURTUBI },
  7: { name: 'تفسير البغوي', slug: 'ar-tafsir-al-baghawi', key: 'quran_tafsir_baghawi' },
} as const;

// ─────────────────────────────────────────────
// Status check
// ─────────────────────────────────────────────
export const checkBundleStatus = async () => {
  const [quran, tafsirMuyassar, tafsirSaddi, tafsirQurtubi, tafsirIbnKathir, tafsirTabari, morphology] = await Promise.all([
    localforage.getItem(KEY_QURAN_TEXT),
    localforage.getItem(KEY_TAFSIR_MUYASSAR),
    localforage.getItem(KEY_TAFSIR_SADDI),
    localforage.getItem(KEY_TAFSIR_QURTUBI),
    localforage.getItem(KEY_TAFSIR_IBN_KATHIR),
    localforage.getItem(KEY_TAFSIR_TABARI),
    localforage.getItem(KEY_MORPHOLOGY_STATUS),
  ]);

  return {
    quran: !!quran,
    tafsir: !!tafsirMuyassar,
    tafsirMuyassar: !!tafsirMuyassar,
    tafsirSaddi: !!tafsirSaddi,
    tafsirQurtubi: !!tafsirQurtubi,
    tafsirIbnKathir: !!tafsirIbnKathir,
    tafsirTabari: !!tafsirTabari,
    morphology: !!morphology,
    iraab: !!(await localforage.getItem(KEY_IRAAB_STATUS)),
    albitaqat: !!(await localforage.getItem('quran_albitaqat')),
    linguistics: false, // deprecated
    lingStats: { downloadedCount: 0, total: 0, isComplete: false }
  };
};

// ─────────────────────────────────────────────
// Legacy compat
// ─────────────────────────────────────────────
export const getLinguisticsStats = async () => {
  let downloadedCount = 0;
  for (let surah = 1; surah <= 114; surah++) {
    if (await localforage.getItem(`quran_ling_${surah}`)) downloadedCount++;
  }
  return { downloadedCount, total: 114, isComplete: downloadedCount === 114 };
};

export const isSurahLingDownloaded = async (surah: number) =>
  !!(await localforage.getItem(`quran_ling_${surah}`));

export const fetchIraabSurahOnline = async (surah: number) => {
  const res = await fetch(`${TAFSIR_CDN_BASE}/${IRAAB_EDITION}/${surah}.json`);
  if (!res.ok) throw new Error(`Failed to download Iraab for surah ${surah}`);
  const payload = await res.json();
  return Array.isArray(payload) ? payload : [];
};

export const downloadLinguisticsSurah = async (surah: number) => {
  const ayahs = await fetchIraabSurahOnline(surah);
  if (!ayahs.length) throw new Error(`Empty Iraab data for surah ${surah}`);
  await localforage.setItem(`quran_ling_${surah}`, { surah, ayahs, downloadedAt: Date.now() });
  return true;
};

export const downloadAllLinguistics = async (onProgress?: (n: number) => void) => {
  for (let surah = 1; surah <= 114; surah++) {
    await downloadLinguisticsSurah(surah);
    onProgress?.(surah);
  }
  await localforage.setItem(KEY_IRAAB_STATUS, true);
  return true;
};

export const deleteAllLinguistics = async () => {
  for (let surah = 1; surah <= 114; surah++) await localforage.removeItem(`quran_ling_${surah}`);
  await localforage.removeItem(KEY_IRAAB_STATUS);
};

export const getOfflineIraab = async (surah: number, ayah: number): Promise<string | null> => {
  const data = await localforage.getItem<any>(`quran_ling_${surah}`);
  const entry = data?.ayahs?.find((item: any) => Number(item.ayah) === ayah || Number(item.number) === ayah);
  return entry?.text || entry?.content || entry?.iraab || null;
};

// ─────────────────────────────────────────────
// Quran Text (alquran.cloud)
// ─────────────────────────────────────────────
export const downloadQuran = async () => {
  const res = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
  if (!res.ok) throw new Error('Failed to download Quran text');
  const data = await res.json();
  await localforage.setItem(KEY_QURAN_TEXT, data);
  return true;
};

// ─────────────────────────────────────────────
// Tafsir Muyassar - Full Quran from alquran.cloud
// ─────────────────────────────────────────────
export const downloadTafsir = async (onProgress?: (pct: number) => void) => {
  onProgress?.(5);
  const res = await fetch('https://api.alquran.cloud/v1/quran/ar.muyassar');
  if (!res.ok) throw new Error('Failed to download Tafsir Muyassar');
  onProgress?.(60);
  const data = await res.json();
  // Store as a flat map: key = "surah:ayah"
  const map: Record<string, string> = {};
  for (const s of data?.data?.surahs || []) {
    for (const a of s.ayahs || []) {
      map[`${s.number}:${a.numberInSurah}`] = a.text || '';
    }
  }
  await localforage.setItem(KEY_TAFSIR_MUYASSAR, map);
  onProgress?.(100);
  return true;
};

// ─────────────────────────────────────────────
// Generic quran.com tafsir downloader (per-surah)
// ─────────────────────────────────────────────
const downloadTafsirEdition = async (slug: string, storageKey: string, onProgress?: (pct: number) => void) => {
  const map: Record<string, string> = {};
  for (let surah = 1; surah <= 114; surah++) {
    const res = await fetch(`${TAFSIR_CDN_BASE}/${slug}/${surah}.json`);
    if (!res.ok) throw new Error(`Failed to download ${slug}, surah ${surah}`);
    const entries = await res.json();
    if (!Array.isArray(entries) || !entries.length) throw new Error(`Empty ${slug}, surah ${surah}`);
    const sorted = entries.slice().sort((a: any, b: any) => Number(a.ayah) - Number(b.ayah));
    const ayahCount = quranSurahs.find((item) => item.number === surah)?.ayahCount || Number(sorted.at(-1)?.ayah || 0);
    for (let index = 0; index < sorted.length; index++) {
      const start = Number(sorted[index]?.ayah || 0);
      const end = index + 1 < sorted.length ? Number(sorted[index + 1]?.ayah || start + 1) - 1 : ayahCount;
      const text = String(sorted[index]?.text || '').replace(/<[^>]*>?/gm, '').trim();
      for (let ayah = start; ayah <= end; ayah++) if (text) map[`${surah}:${ayah}`] = text;
    }
    onProgress?.(Math.round((surah / 114) * 100));
  }
  await localforage.setItem(storageKey, map);
  return true;
};

export const downloadTafsirSaddi = (onProgress?: (pct: number) => void) =>
  downloadTafsirEdition(TAFSIR_SOURCES[3].slug, KEY_TAFSIR_SADDI, onProgress);

export const downloadTafsirQurtubi = (onProgress?: (pct: number) => void) =>
  downloadTafsirEdition(TAFSIR_SOURCES[6].slug, KEY_TAFSIR_QURTUBI, onProgress);

export const downloadTafsirIbnKathir = (onProgress?: (pct: number) => void) =>
  downloadTafsirEdition(TAFSIR_SOURCES[4].slug, KEY_TAFSIR_IBN_KATHIR, onProgress);

export const downloadTafsirTabari = (onProgress?: (pct: number) => void) =>
  downloadTafsirEdition(TAFSIR_SOURCES[5].slug, KEY_TAFSIR_TABARI, onProgress);

export const downloadTafsirJalalayn = (onProgress?: (pct: number) => void) =>
  downloadTafsirEdition(TAFSIR_SOURCES[2].slug, TAFSIR_SOURCES[2].key, onProgress);

export const downloadTafsirBaghawi = (onProgress?: (pct: number) => void) =>
  downloadTafsirEdition(TAFSIR_SOURCES[7].slug, TAFSIR_SOURCES[7].key, onProgress);

export const fetchTafsirAyahOnline = async (tafsirId: number, surah: number, ayah: number): Promise<string | null> => {
  const source = TAFSIR_SOURCES[tafsirId as keyof typeof TAFSIR_SOURCES] || TAFSIR_SOURCES[1];
  const res = await fetch(`${TAFSIR_CDN_BASE}/${source.slug}/${surah}/${ayah}.json`);
  if (!res.ok) return null;
  const payload = await res.json();
  return payload?.text || (Array.isArray(payload) ? payload[0]?.text : null) || null;
};

export const getTafsirStorageKey = (tafsirId: number) =>
  (TAFSIR_SOURCES[tafsirId as keyof typeof TAFSIR_SOURCES] || TAFSIR_SOURCES[1]).key;

// ─────────────────────────────────────────────
// Lookup helpers (used by AyahToolbar)
// ─────────────────────────────────────────────
export const getOfflineTafsir = async (surah: number, ayah: number, key: string): Promise<string | null> => {
  const map = await localforage.getItem<Record<string, string>>(key);
  if (!map) return null;
  return map[`${surah}:${ayah}`] || null;
};

export const TAFSIR_KEYS = {
  muyassar: KEY_TAFSIR_MUYASSAR,
  saddi: KEY_TAFSIR_SADDI,
  qurtubi: KEY_TAFSIR_QURTUBI,
  ibnKathir: KEY_TAFSIR_IBN_KATHIR,
  tabari: KEY_TAFSIR_TABARI,
  jalalayn: TAFSIR_SOURCES[2].key,
  baghawi: TAFSIR_SOURCES[7].key,
};

// ─────────────────────────────────────────────
// Morphology (unchanged)
// ─────────────────────────────────────────────
export const downloadMorphology = async (onProgress?: (p: number) => void) => {
  const url = 'https://raw.githubusercontent.com/fabhiansan/Waw-Quran-Companion/master/data/linguistic/morphology_full.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch morphology');
  const data = await res.json();
  const surahs: Record<number, any[]> = {};
  data.forEach((entry: any) => {
    const sId = entry.location.chapter;
    if (!surahs[sId]) surahs[sId] = [];
    surahs[sId].push(entry);
  });
  for (const sId in surahs) {
    await localforage.setItem(`quran_morph_s${sId}`, surahs[sId]);
    if (onProgress) onProgress(Number(sId));
  }
  await localforage.setItem(KEY_MORPHOLOGY_STATUS, 'completed');
  return true;
};

export const getWordMorphology = async (surah: number, ayah: number, word: number) => {
  const data: any[] | null = await localforage.getItem(`quran_morph_s${surah}`);
  if (!data) return null;
  return data.find(m => m.location.verse === ayah && m.location.word === word);
};

// ─────────────────────────────────────────────
// Audio cache (unchanged)
// ─────────────────────────────────────────────
export const downloadAlbitaqat = async () => {
  const url = 'https://raw.githubusercontent.com/rn0x/albitaqat_quran/main/albitaqat.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch albitaqat');
  const data = await res.json();
  await localforage.setItem('quran_albitaqat', data);
  return true;
};

// ─────────────────────────────────────────────
// Audio (per surah/reciter)
// ─────────────────────────────────────────────
export const getAudioCacheKey = (reciterId: string, surahNumber: number) => `audio_${reciterId}_${surahNumber}`;

export const isAudioDownloaded = async (reciterId: string, surahNumber: number) => {
    const item = await localforage.getItem(getAudioCacheKey(reciterId, surahNumber));
    return !!item;
};

export const downloadAudioSurah = async (reciterId: string, surahNumber: number, url: string) => {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch audio');
        const blob = await res.blob();
        await localforage.setItem(getAudioCacheKey(reciterId, surahNumber), blob);
        return true;
    } catch (error) {
        console.error('Audio Download Error:', error);
        throw error;
    }
};

export const deleteAudioSurah = async (reciterId: string, surahNumber: number) => {
    await localforage.removeItem(getAudioCacheKey(reciterId, surahNumber));
};
