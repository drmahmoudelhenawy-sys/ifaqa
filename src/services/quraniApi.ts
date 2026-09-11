/**
 * Qurani.ai API Service
 * Handles all interactions with the Qurani.ai gateway.
 */

const BASE_URL = 'https://api.qurani.ai/gw/qh/v1';
const QURAN_COM_BASE_URL = 'https://api.quran.com/api/v4';
const QURANPEDIA_BASE_URL = 'https://api.quranpedia.net/v1';
const MUFRADAT_BASE_URL = 'https://alfurqan.online/api/v1/tafseer/mufradat';
const QURAN_SEGMENTS_URL = 'https://cdn.jsdelivr.net/gh/mohammed-2-5/islamic-library-data@master/quran/quran_segments.json';

export interface SurahMetadata {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface JuzMetadata {
  number: number;
  firstSurahNumber: number;
  firstAyahNumber: number;
  lastSurahNumber: number;
  lastAyahNumber: number;
}

export interface SajdaData {
  number: number;
  surah: number;
  ayah: number;
  type: 'obligatory' | 'recommended';
}

export interface WordMorphology {
  word: string | { text?: string; location?: string };
  location: string; // surah:ayah:word
  morphology: {
    root?: string;
    lemma?: string;
    grammar?: string;
    description?: string;
    translation?: string;
    pos?: string; // Part of speech (Verb, Noun, etc.)
  };
}

export interface AudioSegment {
  wordIndex: number;
  startTime: number; // milliseconds
  endTime: number; // milliseconds
}

export interface AyahTopicEntry {
  id: number;
  name: string;
  parent_id: number | null;
  ayahs: string;
}

let quranpediaTopicsCache: AyahTopicEntry[] | null = null;
let quranSegmentsCache: any | null = null;
const mufradatSurahCache = new Map<number, Promise<any>>();

async function getMufradatSurah(surah: number): Promise<any> {
  if (!mufradatSurahCache.has(surah)) {
    mufradatSurahCache.set(surah, fetch(`${MUFRADAT_BASE_URL}/surah/${surah}`).then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch Arabic word meanings for surah ${surah}`);
      return res.json();
    }).catch((error) => {
      mufradatSurahCache.delete(surah);
      throw error;
    }));
  }
  return mufradatSurahCache.get(surah)!;
}

function sanitizeTopicName(value?: string | null): string | null {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (/[ØÙÂ]/.test(text)) return null;
  return text;
}

function isGenericTopicName(name: string): boolean {
  return (
    name === 'موضوع عام' ||
    name === 'العليم' ||
    name === 'يعقوب' ||
    name.includes('الله [') ||
    name.startsWith('الله ')
  );
}

function topicSpecificityScore(topic: AyahTopicEntry): number {
  const cleanedName = sanitizeTopicName(topic.name) || '';
  const ayahCount = (topic.ayahs || '').split(',').map((item) => item.trim()).filter(Boolean).length || 999;
  const parentBoost = topic.parent_id ? 20 : 0;
  const singleAyahBoost = ayahCount === 1 ? 40 : ayahCount <= 3 ? 20 : 0;
  const genericPenalty = isGenericTopicName(cleanedName) ? 60 : 0;
  return parentBoost + singleAyahBoost + Math.min(cleanedName.length, 40) - ayahCount - genericPenalty;
}

export const quraniApi = {
  /**
   * Fetch all surahs metadata (Index)
   */
  async getSurahs(): Promise<SurahMetadata[]> {
    const res = await fetch(`${BASE_URL}/meta/`);
    if (!res.ok) throw new Error('Failed to fetch surahs meta');
    const data = await res.json();
    return data.surahs?.references || [];
  },

  /**
   * Fetch details for a single surah
   */
  async getSurah(number: number, edition: string = 'quran-simple-clean'): Promise<any> {
    const res = await fetch(`${BASE_URL}/surah/${number}/${edition}`);
    if (!res.ok) throw new Error(`Failed to fetch surah ${number}`);
    return res.json();
  },

  /**
   * Fetch all Juzs metadata
   */
  async getJuzs(): Promise<JuzMetadata[]> {
    try {
      const res = await fetch(`${BASE_URL}/juz/metadata?includeHizbs=true`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.juzs || [];
    } catch {
      return [];
    }
  },

  /**
   * Fetch all Sajda points
   */
  async getSajdas(): Promise<SajdaData[]> {
    try {
      const res = await fetch(`${BASE_URL}/sajda`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.sajdas || [];
    } catch {
      return [];
    }
  },

  /**
   * Fetch morphology for a specific word
   * @param location surah:ayah:word_pos
   */
  async getWordMorphology(location: string): Promise<WordMorphology> {
    const res = await fetch(`${BASE_URL}/morphology/word/${location}`);
    if (!res.ok) throw new Error(`Failed to fetch morphology for ${location}`);
    return res.json();
  },

  /**
   * Fetch morphology for all words in an Ayah
   */
  async getAyahMorphology(surah: number, ayah: number): Promise<WordMorphology[]> {
    const [morphRes, verseRes] = await Promise.all([
      fetch(`${BASE_URL}/morphology/ayah/${surah}:${ayah}`),
      fetch(`${QURAN_COM_BASE_URL}/verses/by_key/${surah}:${ayah}?words=true&word_fields=text_uthmani&language=en`),
    ]);
    if (!morphRes.ok) throw new Error(`Failed to fetch ayah morphology for ${surah}:${ayah}`);
    const data = await morphRes.json();
    const morphWords = data?.data || data?.words || (Array.isArray(data) ? data : []);
    const verseData = verseRes.ok ? await verseRes.json() : null;
    const translationWords = Array.isArray(verseData?.verse?.words)
      ? verseData.verse.words.filter((word: any) => word?.char_type_name === 'word')
      : [];

    return morphWords.map((word: any, index: number) => {
      const translationWord = translationWords[index];
      const resolvedText = word?.word?.text || word?.text || word?.word || translationWord?.text_uthmani || translationWord?.text || '';
      return {
        ...word,
        word: typeof word?.word === 'object'
          ? { ...word.word, text: resolvedText }
          : resolvedText,
        text: resolvedText,
        meaning: translationWord?.translation?.text || word?.meaning,
        morphology: {
          ...(word?.morphology || {}),
          translation: translationWord?.translation?.text || word?.morphology?.translation,
        },
      };
    });
  },

  /** Arabic Quran vocabulary meanings. Morphology supplies the authentic word
   * text and linguistic metadata only; the displayed meaning always comes from
   * the Arabic Mufradat source, never from the English WBW translation. */
  async getAyahArabicWordMeanings(surah: number, ayah: number): Promise<any[]> {
    const [morphWords, mufradatData] = await Promise.all([
      this.getAyahMorphology(surah, ayah),
      getMufradatSurah(surah),
    ]);
    const ayahEntry = Array.isArray(mufradatData?.surah?.ayahs)
      ? mufradatData.surah.ayahs.find((entry: any) => Number(entry?.ayah_number) === ayah)
      : null;
    const meanings = Array.isArray(ayahEntry?.words) ? ayahEntry.words : [];

    return meanings.map((item: any, index: number) => {
      const wordNumber = Math.max(1, Number(item?.word_number) || index + 1);
      const sourceWord = morphWords[wordNumber - 1] || morphWords[index];
      const meaning = String(item?.meaning || '').trim();
      return {
        ...(sourceWord || {}),
        word: sourceWord?.word,
        text: typeof sourceWord?.word === 'object' ? sourceWord.word.text : sourceWord?.text || sourceWord?.word || '',
        meaning,
        morphology: {
          ...(sourceWord?.morphology || {}),
          translation: meaning,
        },
      };
    }).filter((word: any) => word.text && /[\u0600-\u06FF]/.test(word.meaning));
  },

  async getAyahDetails(surah: number, ayah: number): Promise<{ words: any[] }> {
    return { words: await this.getAyahArabicWordMeanings(surah, ayah) };
  },

  /**
   * Fetch audio segments (timestamps) for an Ayah
   */
  async getAyahSegments(surah: number, ayah: number): Promise<AudioSegment[]> {
    const res = await fetch(`${BASE_URL}/ayah/${surah}:${ayah}/segments`);
    if (!res.ok) throw new Error(`Failed to fetch segments for ${surah}:${ayah}`);
    const data = await res.json();
    return data.segments || [];
  },

  /**
   * Fetch Tajweed rules for an Ayah
   */
  async getAyahTajweed(surah: number, ayah: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/ayah/${surah}:${ayah}/tajweed`);
    if (!res.ok) throw new Error(`Failed to fetch tajweed for ${surah}:${ayah}`);
    return res.json();
  },

  async getTajweedRules(surah: number, ayah: number): Promise<string[]> {
    const payload = await this.getAyahTajweed(surah, ayah);
    const words = Array.isArray(payload?.data?.words) ? payload.data.words : [];
    const arabicRuleNames: Record<string, string> = {
      madd_badal: 'مد البدل',
      madd_normal: 'مد طبيعي',
      madda_normal: 'مد طبيعي',
      madd_muttasil: 'مد واجب متصل',
      madd_munfasil: 'مد جائز منفصل',
      madd_lazim: 'مد لازم',
      madd_arid: 'مد عارض للسكون',
      izhar: 'إظهار حلقي',
      izhar_shafawi: 'إظهار شفوي',
      ikhfa: 'إخفاء حقيقي',
      ikhfa_shafawi: 'إخفاء شفوي',
      iqlab: 'إقلاب',
      idgham_ghunnah: 'إدغام بغنة',
      idgham_no_ghunnah: 'إدغام بغير غنة',
      idgham_shafawi: 'إدغام شفوي',
      ghunnah: 'غنة مشددة',
      qalqalah: 'قلقلة',
      tafkheem: 'تفخيم',
      tafkhim: 'تفخيم',
      tarqeeq: 'ترقيق',
      hamzat_wasl: 'همزة وصل',
      ham_wasl: 'همزة وصل',
      laam_shamsiyah: 'لام شمسية',
      lam_shamsiyyah: 'لام شمسية',
    };
    const results: string[] = [];

    for (const word of words) {
      const rules = Array.isArray(word?.tajweed?.rules) ? word.tajweed.rules : [];
      for (const rule of rules) {
        const ruleName = arabicRuleNames[rule?.cls] || 'حكم تجويد';
        const span = String(rule?.span || '').trim();
        const text = String(word?.text || word?.tajweed?.text || '').trim();
        if (ruleName && text) results.push(`${ruleName}${span ? ` (${span})` : ''} في كلمة ﴿${text}﴾`);
      }
    }

    return Array.from(new Set(results));
  },

  /**
   * Fetch Mutashabihat for an Ayah
   */
  async getAyahMutashabihat(surah: number, ayah: number): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/mutashabihat/${surah}/${ayah}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.mutashabihat || [];
  },

  /**
   * Fetch Theme (Topic) for an Ayah
   */
  async getAyahThemeDetails(surah: number, ayah: number): Promise<{ title: string | null; color: string | null }> {
    const res = await fetch(`${BASE_URL}/ayah-theme/${surah}/${ayah}`);
    if (!res.ok) return { title: null, color: null };
    const data = await res.json();
    return {
      title: data.theme?.text_ar || data.theme?.text || null,
      color: data.theme?.color || null,
    };
  },

  async getAyahTheme(surah: number, ayah: number): Promise<string | null> {
    const theme = await this.getAyahThemeDetails(surah, ayah);
    return theme.title;
  },

  async getAyahTopics(surah: number, ayah: number): Promise<AyahTopicEntry[]> {
    if (!quranpediaTopicsCache) {
      const res = await fetch(`${QURANPEDIA_BASE_URL}/topics`);
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      quranpediaTopicsCache = Array.isArray(data) ? data : [];
    }

    const ref = `${surah}:${ayah}`;
    const items = quranpediaTopicsCache || [];

    return items.filter((item: any) => {
      const ayahs = typeof item?.ayahs === 'string' ? item.ayahs : '';
      if (!ayahs) return false;
      return ayahs.split(',').map((part: string) => part.trim()).includes(ref);
    });
  },

  async getBestAyahTopic(surah: number, ayah: number): Promise<{ title: string | null; related: string[] }> {
    if (!quranSegmentsCache) {
      const segmentResponse = await fetch(QURAN_SEGMENTS_URL);
      if (segmentResponse.ok) quranSegmentsCache = await segmentResponse.json();
    }
    const surahSegments = Array.isArray(quranSegmentsCache?.surahs)
      ? quranSegmentsCache.surahs.find((item: any) => Number(item?.surah_number) === surah)?.segments
      : [];
    const segment = Array.isArray(surahSegments)
      ? surahSegments.find((item: any) => ayah >= Number(item?.start) && ayah <= Number(item?.end))
      : null;
    if (segment?.theme) {
      const related = [segment?.description, segment?.category]
        .filter((value): value is string => Boolean(value && /[\u0600-\u06FF]/.test(value)));
      return { title: segment.theme, related };
    }

    const topics = await this.getAyahTopics(surah, ayah);
    const ranked = topics
      .map((topic) => ({ topic, cleanName: sanitizeTopicName(topic.name) }))
      .filter((entry): entry is { topic: AyahTopicEntry; cleanName: string } => Boolean(entry.cleanName))
      .sort((a, b) => topicSpecificityScore(b.topic) - topicSpecificityScore(a.topic));

    if (ranked.length === 0) {
      return { title: null, related: [] };
    }

    const titles: string[] = Array.from(new Set<string>(ranked.map((entry) => entry.cleanName)));
    const primary: string | null = titles.find((name: string) => !isGenericTopicName(name)) || titles[0] || null;
    const related: string[] = titles.filter((name: string) => name !== primary && !isGenericTopicName(name)).slice(0, 4);

    return { title: primary, related };
  },

  /**
   * Advanced Keyword Search
   */
  async searchKeyword(query: string): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/search/keyword?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Keyword search failed');
    const data = await res.json();
    return data.results || [];
  },

  /**
   * Advanced Root Search
   */
  async searchRoot(root: string): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/morphology/root/${encodeURIComponent(root)}`);
    if (!res.ok) throw new Error('Root search failed');
    const data = await res.json();
    return data.results || [];
  }
};
