import localforage from 'localforage';
import { quranSurahs } from '../../quranMetadata';

export interface VerseItem {
  numberInSurah: number;
  text: string;
  surahNumber: number;
}

export interface VerseTimestamp {
  verseNumber: number;
  timestampFromMs: number;
  timestampToMs: number;
  durationMs: number;
}

// In-memory caches for ultra-fast lookup
const versesCache = new Map<number, VerseItem[]>();
const timestampsCache = new Map<string, VerseTimestamp[]>();

export function getQuranComReciterId(reciterName?: string): number {
  if (!reciterName) return 7;
  const name = reciterName.toLowerCase();
  if (name.includes('عفاسي') || name.includes('alafasy') || name.includes('afasy')) return 7;
  if (name.includes('منشاوي') || name.includes('minshawi') || name.includes('minshawy')) return 6;
  if (name.includes('حصري') || name.includes('husary') || name.includes('hussary')) return 5;
  if (name.includes('عبد الباسط') || name.includes('abdulbasit') || name.includes('abdulsamad')) return 2;
  if (name.includes('معيقلي') || name.includes('muaiqly')) return 8;
  if (name.includes('شريم') || name.includes('shuraym') || name.includes('shuraim')) return 10;
  if (name.includes('عجمي') || name.includes('ajamy') || name.includes('ajmi')) return 12;
  if (name.includes('دوسري') || name.includes('dossari') || name.includes('dossary')) return 14;
  if (name.includes('قطامي') || name.includes('qatami')) return 13;
  if (name.includes('حذيفي') || name.includes('hudhaify') || name.includes('hudaifi')) return 3;
  if (name.includes('عباد') || name.includes('abbad')) return 15;
  if (name.includes('أبكر') || name.includes('abkar')) return 16;
  if (name.includes('سفي') || name.includes('sufi')) return 18;
  if (name.includes('أيوب') || name.includes('ayyoub')) return 19;
  if (name.includes('بصفر') || name.includes('basfar')) return 11;
  return 7; // Default to Alafasy timestamps
}

export function getMushafPageForAyah(surahNumber: number, ayahNumber: number): number {
  const current = quranSurahs.find(s => s.number === surahNumber);
  if (!current) return 1;
  const next = quranSurahs.find(s => s.number === surahNumber + 1);
  const totalPagesInSurah = (next ? next.startPage : 605) - current.startPage;
  if (totalPagesInSurah <= 1 || ayahNumber <= 1) return current.startPage;
  const fraction = Math.min(1, Math.max(0, (ayahNumber - 1) / Math.max(1, current.ayahCount)));
  const page = Math.floor(current.startPage + fraction * totalPagesInSurah);
  return Math.min(604, Math.max(1, page));
}

export const liveAyahSyncService = {
  /**
   * Fetch all Uthmani verses for a given Surah (with caching)
   */
  async getSurahVerses(surahNumber: number): Promise<VerseItem[]> {
    if (versesCache.has(surahNumber)) {
      return versesCache.get(surahNumber)!;
    }

    // Try local storage cache
    const cacheKey = `quran_surah_verses_${surahNumber}`;
    try {
      const stored = await localforage.getItem<VerseItem[]>(cacheKey);
      if (stored && Array.isArray(stored) && stored.length > 0) {
        versesCache.set(surahNumber, stored);
        return stored;
      }
    } catch {
      // ignore
    }

    try {
      // Fetch from API
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`);
      if (res.ok) {
        const payload = await res.json();
        const ayahs: VerseItem[] = (payload?.data?.ayahs || []).map((a: any) => {
          let text = a.text || '';
          // Clean up repeated Basmalah from beginning of verse 1 for surahs > 1
          if (surahNumber !== 1 && surahNumber !== 9 && a.numberInSurah === 1) {
            text = text.replace(/^بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ\s*/, '').trim();
          }
          return {
            numberInSurah: a.numberInSurah,
            text: text || a.text,
            surahNumber,
          };
        });

        if (ayahs.length > 0) {
          versesCache.set(surahNumber, ayahs);
          localforage.setItem(cacheKey, ayahs).catch(() => {});
          return ayahs;
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch verses for surah ${surahNumber}`, e);
    }

    // Fallback: try quran.com api
    try {
      const res = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahNumber}`);
      if (res.ok) {
        const payload = await res.json();
        const ayahs: VerseItem[] = (payload?.verses || []).map((v: any, idx: number) => ({
          numberInSurah: idx + 1,
          text: v.text_uthmani,
          surahNumber,
        }));
        if (ayahs.length > 0) {
          versesCache.set(surahNumber, ayahs);
          localforage.setItem(cacheKey, ayahs).catch(() => {});
          return ayahs;
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch fallback verses for surah ${surahNumber}`, e);
    }

    return [];
  },

  /**
   * Fetch chapter timestamps if available from Quran.com
   */
  async getSurahTimestamps(surahNumber: number, reciterName?: string): Promise<VerseTimestamp[]> {
    const quranComId = getQuranComReciterId(reciterName);
    const key = `${quranComId}:${surahNumber}`;
    if (timestampsCache.has(key)) {
      return timestampsCache.get(key)!;
    }

    try {
      const res = await fetch(`https://api.quran.com/api/v4/chapter_recitations/${quranComId}/${surahNumber}?segments=true`);
      if (res.ok) {
        const payload = await res.json();
        const rawTimestamps = payload?.audio_file?.timestamps;
        if (Array.isArray(rawTimestamps) && rawTimestamps.length > 0) {
          const list: VerseTimestamp[] = rawTimestamps.map((t: any) => {
            const verseNum = Number(t.verse_key?.split(':')[1]) || 1;
            return {
              verseNumber: verseNum,
              timestampFromMs: t.timestamp_from,
              timestampToMs: t.timestamp_to,
              durationMs: t.duration || (t.timestamp_to - t.timestamp_from),
            };
          });
          timestampsCache.set(key, list);
          return list;
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch timestamps for surah ${surahNumber} (reciter ${quranComId})`, e);
    }

    // Fallback: If custom reciter failed, try Alafasy (id: 7) as reference tempo
    if (quranComId !== 7) {
      return this.getSurahTimestamps(surahNumber, 'alafasy');
    }

    return [];
  },

  /**
   * Resolve currently active verse based on currentTime and total duration with auto-scaling
   */
  resolveCurrentVerse(
    currentTimeSec: number,
    durationSec: number,
    verses: VerseItem[],
    timestamps: VerseTimestamp[]
  ): { verseNumber: number; verseText: string; totalVerses: number } | null {
    if (!verses.length) return null;
    const totalVerses = verses.length;

    // 1. If exact timestamps available, use auto-scaled timestamp lookup
    if (timestamps.length > 0) {
      const lastTs = timestamps[timestamps.length - 1];
      const totalTsMs = lastTs ? lastTs.timestampToMs : 0;
      
      // Calculate scale factor between actual audio track duration and Quran.com audio duration
      let currentMs = currentTimeSec * 1000;
      if (durationSec > 0 && totalTsMs > 0) {
        const scale = totalTsMs / (durationSec * 1000);
        currentMs = currentMs * scale;
      }

      const found = timestamps.find(t => currentMs >= t.timestampFromMs && currentMs < t.timestampToMs);
      if (found) {
        const verse = verses.find(v => v.numberInSurah === found.verseNumber) || verses[found.verseNumber - 1];
        if (verse) {
          return {
            verseNumber: verse.numberInSurah,
            verseText: verse.text,
            totalVerses,
          };
        }
      }

      // If at or past the last timestamp
      if (lastTs && currentMs >= lastTs.timestampToMs) {
        const lastVerse = verses[verses.length - 1];
        return {
          verseNumber: lastVerse.numberInSurah,
          verseText: lastVerse.text,
          totalVerses,
        };
      }
    }

    // 2. Proportional estimate based on verse character lengths
    if (durationSec > 0 && currentTimeSec > 0) {
      const totalChars = verses.reduce((sum, v) => sum + v.text.length, 0);
      const progressFraction = Math.min(1, Math.max(0, currentTimeSec / durationSec));
      const targetCharPosition = progressFraction * totalChars;

      let accumulated = 0;
      for (const v of verses) {
        accumulated += v.text.length;
        if (accumulated >= targetCharPosition) {
          return {
            verseNumber: v.numberInSurah,
            verseText: v.text,
            totalVerses,
          };
        }
      }
    }

    // Default to first verse
    const first = verses[0];
    return {
      verseNumber: first.numberInSurah,
      verseText: first.text,
      totalVerses,
    };
  }
};
