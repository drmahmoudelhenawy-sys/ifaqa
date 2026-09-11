const CACHE_NAME = 'ifaqa-quran-cache-v1';
const BASE_URL = 'https://api.alquran.cloud/v1';
const DEFAULT_AUDIO_EDITION = 'ar.alafasy';
const DEFAULT_TAFSIR_EDITION = 'ar.muyassar';

export const tafsirEditions = [
  { id: 'ar.muyassar', name: 'التفسير الميسر' },
  { id: 'ar.jalalayn', name: 'تفسير الجلالين' },
  { id: 'ar.qurtubi', name: 'تفسير القرطبي' },
  { id: 'ar.muyassar', name: 'الميسر المختصر' },
  { id: 'ar.jalalayn', name: 'الجلالين المختصر' }
];

export const reciterEditions = [
  { id: 'ar.alafasy', name: 'مشاري العفاسي' },
  { id: 'ar.abdulbasitmurattal', name: 'عبد الباسط مرتل' },
  { id: 'ar.husary', name: 'الحصري' },
  { id: 'ar.minshawi', name: 'المنشاوي' },
  { id: 'ar.mahermuaiqly', name: 'ماهر المعيقلي' },
  { id: 'ar.saoodshuraym', name: 'سعود الشريم' },
  { id: 'ar.abdurrahmaansudais', name: 'عبد الرحمن السديس' },
  { id: 'ar.ahmedajamy', name: 'أحمد العجمي' },
  { id: 'ar.hudhaify', name: 'علي الحذيفي' }
];

async function cachedJson(url: string) {
  const cache = await caches.open(CACHE_NAME);
  const req = new Request(url);
  const cached = await cache.match(req);
  if (cached) return (await cached.json()).data;

  const res = await fetch(req);
  if (!res.ok) return null;
  await cache.put(req, res.clone());
  return (await res.json()).data;
}

export const quranApi = {
  // Fetch Surahs list
  async getSurahs() {
    try {
      return (await cachedJson(`${BASE_URL}/surah`)) || [];
    } catch (err) {
      console.error('Error fetching surahs:', err);
    }
    return [];
  },

  // Fetch specific Surah with Uthmani script
  async getSurahUthmani(surahNumber: number) {
    try {
      return await cachedJson(`${BASE_URL}/surah/${surahNumber}/quran-uthmani`);
    } catch (err) {
      console.error(`Error fetching surah ${surahNumber}:`, err);
    }
    return null;
  },

  // Fetch Tafsir for a specific Surah
  async getSurahTafsir(surahNumber: number, edition = DEFAULT_TAFSIR_EDITION) {
    try {
      return await cachedJson(`${BASE_URL}/surah/${surahNumber}/${edition}`);
    } catch (err) {
      console.error(`Error fetching tafsir for surah ${surahNumber}:`, err);
    }
    return null;
  },

  async getAyahAudio(globalAyahNumber: number, edition = DEFAULT_AUDIO_EDITION) {
    try {
      const data = await cachedJson(`${BASE_URL}/ayah/${globalAyahNumber}/${edition}`);
      return data?.audio || null;
    } catch (err) {
      console.error(`Error fetching audio for ayah ${globalAyahNumber}:`, err);
      return null;
    }
  },

  async downloadSurahOffline(surahNumber: number, options?: { tafsirEdition?: string; reciterEdition?: string }) {
    const tafsirEdition = options?.tafsirEdition || DEFAULT_TAFSIR_EDITION;
    const reciterEdition = options?.reciterEdition || DEFAULT_AUDIO_EDITION;
    const surah = await this.getSurahUthmani(surahNumber);
    await this.getSurahTafsir(surahNumber, tafsirEdition);

    const ayahs = surah?.ayahs || [];
    await Promise.all(
      ayahs.slice(0, 12).map((ayah: any) => this.getAyahAudio(ayah.number, reciterEdition))
    );

    return { ayahs: ayahs.length, audioPreviewCount: Math.min(ayahs.length, 12) };
  },

  async downloadMushafTextOffline(onProgress?: (current: number, total: number) => void) {
    const total = 114;
    await this.getSurahs();
    for (let surah = 1; surah <= total; surah += 1) {
      await this.getSurahUthmani(surah);
      onProgress?.(surah, total);
    }
    return { surahs: total };
  }
};
