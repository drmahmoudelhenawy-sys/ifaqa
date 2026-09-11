import localforage from 'localforage';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { quranSurahs } from '../../quranMetadata';
import { quraniApi } from './quraniApi';

/**
 * Configurable API Base URL for QuranHub / Qurani.ai
 */
export const QURAN_API_BASE = "https://api.qurani.ai/gw/qh/v1";
export const MUFRADAT_API_BASE = "https://alfurqan.online/api/v1/tafseer/mufradat";
export const MUTASHABIHAT_REPO_URL = "https://raw.githubusercontent.com/Waqar144/Quran_Mutashabihat_Data/master/mutashabiha_data.json";
export const QUL_MUTASHABIHAT_RESOURCE_URL = "https://qul.tarteel.ai/resources/mutashabihat/73";

/**
 * Default Reciter ID (Mishary Rashid Alafasy)
 */
export const DEFAULT_RECITER_ID = "Alafasy_128kbps";

// --- Data Interfaces ---

export interface WordData {
  wordText: string; // The Arabic text of the word
  meaning: string;  // The meaning/translation of the word
  grammarRole: string; // The morphology/I'rab tag (e.g., Fael, Maf'oul)
  root?: string;
  weight?: string;
}

export interface Mutashabih {
  surahName: string;
  ayahNumber: number;
  text: string;
}

export interface AyahMetadata {
  surahId: number;
  ayahId: number;
  tafsir: string;
  mutashabihat: Mutashabih[];
  themeColor: string; // CSS hex color for the story/topic overlay
  themeTitle: string; // Name of the story/topic
  wordByWord: WordData[];
  tajweed: string[]; // Added tajweed rules
  audioUrl?: string; // URL for the audio file (remote)
}

export interface SurahOfflineData {
  surahId: number;
  reciterId: string;
  ayahs: Record<number, AyahMetadata>;
  downloadedFeatures?: string[]; // e.g., ['morphology', 'tajweed', 'themes', 'mutashabihat']
  downloadedAt: number;
}

export interface AyahUIBannerData {
  tafsir: string;
  audioLocalPath: string; // Local device URI
  mutashabihat: Mutashabih[];
  themeColor: string;
  themeTitle: string;
  wordByWord: WordData[];
  tajweed: string[];
}

export class QuranOfflineManager {
  private static STORAGE_KEY_PREFIX = 'quran_hub_s';
  private static THEME_SOURCE_VERSION = 2;
  private static mutashabihatIndexPromise: Promise<Map<number, number[]>> | null = null;
  private static surahTextCache = new Map<number, Record<number, string>>();
  private static mutashabihatStopWords = new Set([
    'Ø§Ù„Ù„Ù‡', 'Ø§Ù„Ø°ÙŠ', 'Ø§Ù„Ø°ÙŠÙ†', 'Ø§Ù„ØªÙŠ', 'Ù‡Ø°Ø§', 'Ù‡Ø°Ù‡', 'Ø°Ù„Ùƒ', 'ØªÙ„Ùƒ', 'Ø«Ù…', 'Ùˆ', 'Ù', 'Ø§Ùˆ', 'Ø£Ùˆ', 'Ù„Ø§', 'Ù…Ø§', 'Ù…Ù†',
    'Ø¹Ù†', 'Ø§Ù„ÙŠ', 'Ø¥Ù„Ù‰', 'Ø¹Ù„Ù‰', 'ÙÙŠ', 'Ø¨', 'Ù„', 'Ùƒ', 'Ù‡Ù…', 'Ù‡Ù†', 'Ù‡Ùˆ', 'Ù‡ÙŠ', 'ÙƒÙ…Ø§', 'Ø§Ù†', 'Ø¥Ù†', 'Ø£Ù†', 'ÙƒØ§Ù†',
    'Ù‚Ø¯', 'ÙŠØ§', 'Ø§ÙŠ', 'ÙƒÙ„', 'Ø¨Ø¹Ø¶', 'Ù„Ù‡', 'Ù„Ù‡Ø§', 'Ù„Ù‡Ù…', 'Ø¹Ù„ÙŠÙ‡', 'Ø¹Ù„ÙŠÙ‡Ø§', 'Ø¹Ù„ÙŠÙ‡Ù…', 'Ù…Ù†Ù‡', 'Ù…Ù†Ù‡Ø§', 'Ù…Ù†Ù‡Ù…'
  ]);

  private static extractMorphologyWords(payload: any): any[] {
    return payload?.data || payload?.words || (Array.isArray(payload) ? payload : []);
  }

  private static extractWordText(word: any): string {
    return word?.word?.text || word?.text || word?.word || '';
  }

  private static extractWordMeaning(word: any): string {
    return (
      word?.meaning ||
      word?.translation ||
      word?.morphology?.translation ||
      word?.morphology?.gloss ||
      word?.morphology?.meaning ||
      word?.morphology?.tags_by_category?.Meaning?.[0]?.user_meaning ||
      "Ù„Ø§ ÙŠØªÙˆÙØ± Ù…Ø¹Ù†Ù‰ Ù…ØØªØµØ± Ù…Ù† Ù‡Ø°Ø§ Ø§Ù„Ù…ØµØ¯Ø±"
    );
  }

  private static extractGrammarRole(word: any): string {
    return (
      word?.grammar_role ||
      word?.morphology?.grammar ||
      word?.morphology?.description ||
      word?.morphology?.tags_by_category?.Irab?.map((item: any) => item?.user_meaning).filter(Boolean).join(' - ') ||
      word?.morphology?.tags_by_category?.PartOfSpeech?.map((item: any) => item?.user_meaning).filter(Boolean).join(' - ') ||
      'ØºÙŠØ± Ù…ØªÙˆÙØ±'
    );
  }

  private static extractRoot(word: any): string | undefined {
    return word?.morphology?.root || word?.morphology?.root_ar || word?.morphology?.tags_by_category?.Root?.[0]?.value;
  }

  private static extractLemma(word: any): string | undefined {
    return word?.morphology?.lemma || word?.morphology?.lemma_ar || word?.morphology?.tags_by_category?.Lemma?.[0]?.value;
  }

  private static normalizeArabicWord(word: string): string {
    return word
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[Ù±Ø£Ø¥Ø¢]/g, 'Ø§')
      .replace(/Ù‰/g, 'ÙŠ')
      .replace(/Ø©/g, 'Ù‡')
      .replace(/[^\u0621-\u064A]/g, '')
      .trim();
  }

  private static tokenizeForSimilarity(text: string): string[] {
    return text
      .split(/\s+/)
      .map((word) => this.normalizeArabicWord(word))
      .filter((word) => word.length > 1 && !this.mutashabihatStopWords.has(word));
  }

  private static normalizeArabicTextForSearch(text: string): string {
    return text
      .split(/\s+/)
      .map((word) => this.normalizeArabicWord(word))
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  private static hasStrongMutashabihSimilarity(sourceText: string, candidateText: string): boolean {
    const sourceTokens = new Set(this.tokenizeForSimilarity(sourceText));
    const candidateTokens = new Set(this.tokenizeForSimilarity(candidateText));
    let overlap = 0;

    sourceTokens.forEach((token) => {
      if (candidateTokens.has(token)) {
        overlap += 1;
      }
    });

    return overlap >= 2;
  }

  private static decodeHtmlEntities(value: string): string {
    return value
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ');
  }

  private static stripHtml(html: string): string {
    return this.decodeHtmlEntities(html.replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static async getQulMutashabihatForAyah(surahId: number, ayahId: number): Promise<Mutashabih[]> {
    const response = await fetch(`${QURAN_API_BASE}/mutashabihat/${surahId}/${ayahId}/quran-uthmani`);
    if (response.status === 404) {
      return [];
    }
    if (!response.ok) {
      throw new Error(`Mutashabihat endpoint failed: ${response.status}`);
    }

    const payload = await response.json();
    const phraseTexts: string[] = Array.from(
      new Set<string>(
        (Array.isArray(payload?.data) ? payload.data : [])
          .map((entry: any) => (typeof entry?.phraseText === 'string' ? this.stripHtml(entry.phraseText) : ''))
          .filter((text: string): text is string => Boolean(text))
      )
    );

    if (phraseTexts.length === 0) {
      return [];
    }

    const normalizedPhrases: string[] = phraseTexts
      .map((phrase: string) => this.normalizeArabicTextForSearch(phrase))
      .filter(Boolean);

    if (normalizedPhrases.length === 0) {
      return [];
    }

    const results = new Map<string, Mutashabih>();

    for (const surah of quranSurahs) {
      const surahTextMap = await this.getSurahTextMap(surah.number);
      for (const [ayahKey, ayahText] of Object.entries(surahTextMap)) {
        const targetAyahNumber = Number(ayahKey);
        if (!targetAyahNumber || !ayahText) continue;
        if (surah.number === surahId && targetAyahNumber === ayahId) continue;

        const normalizedAyah = this.normalizeArabicTextForSearch(ayahText);
        if (!normalizedAyah) continue;

        const matched = normalizedPhrases.some((phrase) => normalizedAyah.includes(phrase));
        if (!matched) continue;

        const key = `${surah.number}:${targetAyahNumber}`;
        if (results.has(key)) continue;

        results.set(key, {
          surahName: surah.name || `سورة ${surah.number}`,
          ayahNumber: targetAyahNumber,
          text: ayahText,
        });
      }
    }

    return Array.from(results.values());
  }

  private static getGlobalAyahNumber(surahId: number, ayahId: number): number {
    let total = 0;
    for (const surah of quranSurahs) {
      if (surah.number === surahId) {
        return total + ayahId;
      }
      total += surah.ayahCount;
    }
    return ayahId;
  }

  private static getSurahAyahFromGlobal(globalAyah: number): { surahId: number; ayahId: number } | null {
    let total = 0;
    for (const surah of quranSurahs) {
      if (globalAyah <= total + surah.ayahCount) {
        return {
          surahId: surah.number,
          ayahId: globalAyah - total,
        };
      }
      total += surah.ayahCount;
    }
    return null;
  }

  private static async getMutashabihatIndex(): Promise<Map<number, number[]>> {
    if (!this.mutashabihatIndexPromise) {
      this.mutashabihatIndexPromise = (async () => {
        const res = await fetch(MUTASHABIHAT_REPO_URL);
        if (!res.ok) {
          throw new Error(`Failed to fetch mutashabihat dataset: ${res.status}`);
        }
        const data = await res.json();
        const index = new Map<number, number[]>();

        Object.values(data || {}).forEach((bucket: any) => {
          if (!Array.isArray(bucket)) return;
          bucket.forEach((entry: any) => {
            const sourceGlobalAyah = Number(entry?.src?.ayah);
            const matches = Array.isArray(entry?.muts)
              ? entry.muts.map((item: any) => Number(item?.ayah)).filter(Number.isFinite)
              : [];
            if (sourceGlobalAyah && matches.length > 0) {
              index.set(sourceGlobalAyah, matches);
            }
          });
        });

        return index;
      })();
    }

    return this.mutashabihatIndexPromise;
  }

  private static async getSurahTextMap(surahId: number): Promise<Record<number, string>> {
    const cached = this.surahTextCache.get(surahId);
    if (cached) return cached;

    const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}/quran-uthmani`);
    if (!res.ok) {
      throw new Error(`Failed to fetch surah text ${surahId}`);
    }

    const data = await res.json();
    const ayahs = Array.isArray(data?.data?.ayahs) ? data.data.ayahs : [];
    const textMap = ayahs.reduce((acc: Record<number, string>, ayah: any) => {
      if (Number.isFinite(ayah?.numberInSurah)) {
        acc[ayah.numberInSurah] = ayah?.text || '';
      }
      return acc;
    }, {});

    this.surahTextCache.set(surahId, textMap);
    return textMap;
  }

  /**
   * Fetches data for a whole surah from the API and stores it offline.
   * @param surahId The ID of the surah (1-114)
   * @param reciterId The ID of the reciter (defaults to DEFAULT_RECITER_ID)
   * @param onProgress Callback for download progress (0 to 1)
   */
  static async downloadSurahData(
    surahId: number,
    reciterId: string = DEFAULT_RECITER_ID,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      onProgress?.(0.05);

      const surahData: SurahOfflineData = {
        surahId,
        reciterId,
        ayahs: {},
        downloadedAt: Date.now(),
      };

      const totalAyahs = this.getSurahAyahCount(surahId);
      if (totalAyahs === 0) throw new Error(`Invalid Surah ID: ${surahId}`);

      // 1. Fetch Metadata (Tafsir, Morphology, Mutashabihat, Themes)
      // We iterate through ayahs. Note: In a real API, a surah-level batch call is preferred.
      for (let ayahId = 1; ayahId <= totalAyahs; ayahId++) {
        const metadata = await this.fetchAyahMetadataFromApi(surahId, ayahId, reciterId);
        surahData.ayahs[ayahId] = metadata;
        
        // Metadata progress: 40% of total
        const progress = (ayahId / totalAyahs) * 0.4;
        onProgress?.(0.05 + progress);
      }

      // 2. Store Metadata in IndexedDB
      await localforage.setItem(this.getStorageKey(surahId, reciterId), surahData);

      // 3. Download Audio Files to Filesystem
      const audioDir = `audio/${reciterId}/s${surahId}`;
      await this.ensureDirectory(audioDir);

      for (let ayahId = 1; ayahId <= totalAyahs; ayahId++) {
        const ayah = surahData.ayahs[ayahId];
        if (ayah.audioUrl) {
          const fileName = `${audioDir}/a${ayahId}.mp3`;
          await this.downloadAndSaveAudio(ayah.audioUrl, fileName);
        }
        
        // Audio progress: 55% of total
        const progress = (ayahId / totalAyahs) * 0.55;
        onProgress?.(0.45 + progress);
      }

      onProgress?.(1.0);
    } catch (error) {
      console.error(`[QuranOfflineManager] Failed to download surah ${surahId}:`, error);
      throw error;
    }
  }

  /**
   * Checks if a surah is fully downloaded offline for a specific reciter.
   */
  static async checkIfSurahDownloaded(
    surahId: number, 
    reciterId: string = DEFAULT_RECITER_ID
  ): Promise<boolean> {
    const data = await localforage.getItem(this.getStorageKey(surahId, reciterId));
    return !!data;
  }

  /**
   * Deletes all offline data for a specific surah and reciter.
   */
  static async deleteSurahData(
    surahId: number, 
    reciterId: string = DEFAULT_RECITER_ID
  ): Promise<void> {
    // 1. Remove metadata from IndexedDB
    await localforage.removeItem(this.getStorageKey(surahId, reciterId));

    // 2. Remove audio files from Filesystem
    try {
      const audioDir = `audio/${reciterId}/s${surahId}`;
      await Filesystem.rmdir({
        path: audioDir,
        directory: Directory.Data,
        recursive: true,
      });
    } catch (e) {
      console.warn(`[QuranOfflineManager] No audio directory found for surah ${surahId} / ${reciterId}`);
    }
  }

  /**
   * Retrieves structured data for the UI Action Banner from offline storage.
   */
  static async getAyahDataOffline(
    surahId: number,
    ayahId: number,
    reciterId: string = DEFAULT_RECITER_ID
  ): Promise<AyahUIBannerData | null> {
    try {
      const surahData = await localforage.getItem<SurahOfflineData>(
        this.getStorageKey(surahId, reciterId)
      );

      if (!surahData || !surahData.ayahs[ayahId]) {
        return null;
      }

      const ayah = surahData.ayahs[ayahId];
      const audioLocalPath = await this.getLocalAudioUri(surahId, ayahId, reciterId);

      return {
        tafsir: ayah.tafsir,
        audioLocalPath: audioLocalPath || '',
        mutashabihat: ayah.mutashabihat,
        themeColor: ayah.themeColor,
        themeTitle: ayah.themeTitle,
        wordByWord: ayah.wordByWord,
        tajweed: ayah.tajweed || [],
      };
    } catch (error) {
      console.error(`[QuranOfflineManager] Error retrieving ayah data:`, error);
      return null;
    }
  }

  // --- Internal Implementation Helpers ---

  private static getStorageKey(surahId: number, reciterId: string): string {
    return `${this.STORAGE_KEY_PREFIX}${surahId}_${reciterId}`;
  }

  /**
   * Internal helper to fetch specific features for a whole surah
   */
  static async downloadFeatureData(
    surahId: number,
    feature: 'morphology' | 'tajweed' | 'themes' | 'mutashabihat' | 'tafsir',
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const totalAyahs = this.getSurahAyahCount(surahId);
    if (totalAyahs === 0) return;

    const storageKey = this.getStorageKey(surahId, DEFAULT_RECITER_ID);
    const featureVersionKey = `${storageKey}:themes:version`;
    const existingData = await localforage.getItem<SurahOfflineData>(storageKey) || {
      surahId,
      reciterId: DEFAULT_RECITER_ID,
      ayahs: {},
      downloadedFeatures: [],
      downloadedAt: Date.now()
    };

    if (feature === 'themes') {
      Object.values(existingData.ayahs || {}).forEach((ayah) => {
        ayah.themeColor = "#00000000";
        ayah.themeTitle = "";
      });
      existingData.downloadedFeatures = (existingData.downloadedFeatures || []).filter((item) => item !== 'themes');
    }

    for (let ayahId = 1; ayahId <= totalAyahs; ayahId++) {
        if (!existingData.ayahs[ayahId]) {
            existingData.ayahs[ayahId] = { surahId, ayahId, tafsir: '', mutashabihat: [], themeColor: '', themeTitle: '', wordByWord: [], tajweed: [] };
        }
        
        const ayahRef = `${surahId}:${ayahId}`;
        try {
            if (feature === 'morphology') {
                if (ayahId === 1) {
                    const res = await fetch(`${MUFRADAT_API_BASE}/surah/${surahId}`);
                    const data = await res.json();
                    const ayahs = Array.isArray(data?.surah?.ayahs) ? data.surah.ayahs : [];

                    for (const ayahEntry of ayahs) {
                        const targetAyahId = Number(ayahEntry?.ayah_number);
                        if (!targetAyahId) continue;
                        if (!existingData.ayahs[targetAyahId]) {
                            existingData.ayahs[targetAyahId] = { surahId, ayahId: targetAyahId, tafsir: '', mutashabihat: [], themeColor: '', themeTitle: '', wordByWord: [], tajweed: [] };
                        }
                        const ayahWords = await quraniApi.getAyahMorphology(surahId, targetAyahId);
                        const liveWords = ayahEntry?.words || [];
                        existingData.ayahs[targetAyahId].wordByWord = liveWords.map((w: any, index: number) => ({
                            wordText: this.extractWordText(ayahWords[index]),
                            meaning: w?.meaning || 'لا يتوفر شرح لهذه الكلمة',
                            grammarRole: '',
                            root: undefined,
                            weight: undefined
                        }));
                    }
                }
            } else if (feature === 'tajweed') {
                const res = await fetch(`${QURAN_API_BASE}/ayah/${ayahRef}/tajweed`);
                const data = await res.json();
                const rules = Array.isArray(data?.rules) ? data.rules : (Array.isArray(data) ? data : []);
                existingData.ayahs[ayahId].tajweed = rules.map((r: any) => `${r.rule}: ${r.text}`) || [];
            } else if (feature === 'mutashabihat') {
                const index = await this.getMutashabihatIndex();
                const sourceGlobalAyah = this.getGlobalAyahNumber(surahId, ayahId);
                const matchedGlobalAyahs = index.get(sourceGlobalAyah) || [];
                const formattedMatches: Mutashabih[] = [];

                for (const matchedGlobalAyah of matchedGlobalAyahs) {
                    const resolved = this.getSurahAyahFromGlobal(matchedGlobalAyah);
                    if (!resolved) continue;
                    const matchedSurah = quranSurahs.find((item) => item.number === resolved.surahId);
                    const surahTextMap = await this.getSurahTextMap(resolved.surahId);
                    formattedMatches.push({
                        surahName: matchedSurah?.name || `Ø³ÙˆØ±Ø ${resolved.surahId}`,
                        ayahNumber: resolved.ayahId,
                        text: surahTextMap[resolved.ayahId] || ''
                    });
                }

                existingData.ayahs[ayahId].mutashabihat = formattedMatches;
            } else if (feature === 'themes') {
                const bestTopic = await quraniApi.getBestAyahTopic(surahId, ayahId);
                if (bestTopic.title) {
                    existingData.ayahs[ayahId].themeColor = "#FFFFFF11";
                    existingData.ayahs[ayahId].themeTitle = bestTopic.title;
                } else {
                    const fallbackTheme = await quraniApi.getAyahThemeDetails(surahId, ayahId);
                    existingData.ayahs[ayahId].themeColor = fallbackTheme.color || "#FFFFFF11";
                    existingData.ayahs[ayahId].themeTitle = fallbackTheme.title || "";
                }
            } else if (feature === 'tafsir') {
                const res = await fetch(`https://api.quran.com/api/v4/tafsirs/165/by_ayah/${ayahRef}`);
                const data = await res.json();
                existingData.ayahs[ayahId].tafsir = data?.tafsir?.text || "Ø§Ù„ØªÙØ³ÙŠØ± ØºÙŠØ± Ù…ØªÙˆÙØ±.";
            }
        } catch (e) {
            console.error(`Error downloading ${feature} for ${ayahRef}:`, e);
        }

        onProgress?.(ayahId / totalAyahs);
    }

    if (!existingData.downloadedFeatures.includes(feature)) {
        existingData.downloadedFeatures.push(feature);
    }
    await localforage.setItem(storageKey, existingData);
    if (feature === 'themes') {
        await localforage.setItem(featureVersionKey, this.THEME_SOURCE_VERSION);
    }
  }

  static async isFeatureDownloaded(
    surahId: number,
    feature: 'morphology' | 'tajweed' | 'themes' | 'mutashabihat' | 'tafsir',
    reciterId: string = DEFAULT_RECITER_ID
  ): Promise<boolean> {
    const surahData = await localforage.getItem<SurahOfflineData>(
      this.getStorageKey(surahId, reciterId)
    );
    const isDownloaded = !!surahData?.downloadedFeatures?.includes(feature);
    if (!isDownloaded) return false;

    if (feature === 'themes') {
      const versionKey = `${this.getStorageKey(surahId, reciterId)}:themes:version`;
      const storedVersion = await localforage.getItem<number>(versionKey);
      if (storedVersion !== this.THEME_SOURCE_VERSION) {
        if (surahData) {
          Object.values(surahData.ayahs || {}).forEach((ayah) => {
            ayah.themeColor = "#00000000";
            ayah.themeTitle = "";
          });
          surahData.downloadedFeatures = (surahData.downloadedFeatures || []).filter((item) => item !== 'themes');
          await localforage.setItem(this.getStorageKey(surahId, reciterId), surahData);
        }
        await localforage.removeItem(versionKey);
        return false;
      }
    }

    return true;
  }

  static async hasAnyFeatureDownloaded(
    feature: 'morphology' | 'tajweed' | 'themes' | 'mutashabihat' | 'tafsir',
    reciterId: string = DEFAULT_RECITER_ID
  ): Promise<boolean> {
    for (let surahId = 1; surahId <= 114; surahId++) {
      if (await this.isFeatureDownloaded(surahId, feature, reciterId)) {
        return true;
      }
    }
    return false;
  }

  static async downloadFeatureForAllSurahs(
    feature: 'morphology' | 'tajweed' | 'themes' | 'mutashabihat' | 'tafsir',
    onProgress?: (progress: number) => void
  ): Promise<void> {
    for (let index = 0; index < 114; index++) {
      const surahId = index + 1;
      await this.downloadFeatureData(surahId, feature, (ayahProgress) => {
        const totalProgress = (index / 114) + (ayahProgress / 114);
        onProgress?.(totalProgress);
      });
    }
    onProgress?.(1);
  }

  static async deleteFeatureForAllSurahs(
    feature: 'morphology' | 'tajweed' | 'themes' | 'mutashabihat' | 'tafsir',
    reciterId: string = DEFAULT_RECITER_ID
  ): Promise<void> {
    for (let surahId = 1; surahId <= 114; surahId++) {
      const storageKey = this.getStorageKey(surahId, reciterId);
      const surahData = await localforage.getItem<SurahOfflineData>(storageKey);
      if (!surahData) continue;

      Object.values(surahData.ayahs).forEach((ayah) => {
        if (feature === 'morphology') {
          ayah.wordByWord = [];
        } else if (feature === 'tajweed') {
          ayah.tajweed = [];
        } else if (feature === 'mutashabihat') {
          ayah.mutashabihat = [];
        } else if (feature === 'themes') {
          ayah.themeColor = "#00000000";
          ayah.themeTitle = "";
        } else if (feature === 'tafsir') {
          ayah.tafsir = "";
        }
      });

      surahData.downloadedFeatures = (surahData.downloadedFeatures || []).filter((item) => item !== feature);

      const hasAnyData = Object.values(surahData.ayahs).some((ayah) =>
        ayah.tafsir ||
        ayah.wordByWord.length > 0 ||
        ayah.tajweed.length > 0 ||
        ayah.mutashabihat.length > 0 ||
        ayah.themeTitle
      );

      if (!hasAnyData && (!surahData.downloadedFeatures || surahData.downloadedFeatures.length === 0)) {
        await localforage.removeItem(storageKey);
      } else {
        await localforage.setItem(storageKey, surahData);
      }

      if (feature === 'themes') {
        await localforage.removeItem(`${storageKey}:themes:version`);
      }
    }
  }

  static async getMutashabihatFromRepoForAyah(surahId: number, ayahId: number): Promise<Mutashabih[]> {
    const index = await this.getMutashabihatIndex();
    const sourceGlobalAyah = this.getGlobalAyahNumber(surahId, ayahId);
    const matchedGlobalAyahs = index.get(sourceGlobalAyah) || [];
    const results: Mutashabih[] = [];

    for (const matchedGlobalAyah of matchedGlobalAyahs) {
      const resolved = this.getSurahAyahFromGlobal(matchedGlobalAyah);
      if (!resolved) continue;
      const matchedSurah = quranSurahs.find((item) => item.number === resolved.surahId);
      const surahTextMap = await this.getSurahTextMap(resolved.surahId);
      results.push({
        surahName: matchedSurah?.name || `Ø³ÙˆØ±Ø ${resolved.surahId}`,
        ayahNumber: resolved.ayahId,
        text: surahTextMap[resolved.ayahId] || '',
      });
    }

    return results;
  }

  static async getFilteredMutashabihatForAyah(surahId: number, ayahId: number): Promise<Mutashabih[]> {
    try {
      return await this.getQulMutashabihatForAyah(surahId, ayahId);
    } catch (error) {
      console.warn('[QuranOfflineManager] QUL mutashabihat fetch failed, falling back to repo:', error);
    }

    const sourceTextMap = await this.getSurahTextMap(surahId);
    const sourceText = sourceTextMap[ayahId] || '';
    const rawMatches = await this.getMutashabihatFromRepoForAyah(surahId, ayahId);

    if (!sourceText) {
      return rawMatches;
    }

    return rawMatches.filter((item) => this.hasStrongMutashabihSimilarity(sourceText, item.text || ''));
  }

  private static async fetchAyahMetadataFromApi(
    surahId: number,
    ayahId: number,
    reciterId: string
  ): Promise<AyahMetadata> {
    const ayahRef = `${surahId}:${ayahId}`;
    
    try {
      const [words, mutashList, bestTopic, themeDetails, tafsirRes, tajweedRes] = await Promise.all([
        quraniApi.getAyahMorphology(surahId, ayahId),
        this.getFilteredMutashabihatForAyah(surahId, ayahId),
        quraniApi.getBestAyahTopic(surahId, ayahId),
        quraniApi.getAyahThemeDetails(surahId, ayahId),
        fetch(`https://api.quran.com/api/v4/tafsirs/165/by_ayah/${surahId}:${ayahId}`), // Default to some tafsir if needed
        fetch(`${QURAN_API_BASE}/ayah/${surahId}:${ayahId}/tajweed`)
      ]);

      const tafsirData = tafsirRes.ok ? await tafsirRes.json() : null;
      const tajweedData = tajweedRes.ok ? await tajweedRes.json() : null;
      const tajweedRules = Array.isArray(tajweedData?.rules) ? tajweedData.rules : (Array.isArray(tajweedData) ? tajweedData : []);

      return {
        surahId,
        ayahId,
        tafsir: tafsirData?.tafsir?.text || "Ø§Ù„ØªÙØ³ÙŠØ± ØºÙŠØ± Ù…ØªÙˆÙØ± Ù„Ù‡Ø°Ø§ Ø§Ù„Ù…ÙˆØ¶Ø¹.",
        mutashabihat: mutashList,
        themeColor: themeDetails?.color || "#FFFFFF11",
        themeTitle: bestTopic?.title || themeDetails?.title || "",
        wordByWord: words.map((w: any) => ({
          wordText: this.extractWordText(w),
          meaning: w.meaning || w.morphology?.translation || "Ø¨Ø¯ÙˆÙ† ØªØ±Ø¬Ù…Ø",
          grammarRole: w.grammar_role || w.morphology?.grammar || "N/A"
        })),
        tajweed: tajweedRules.map((r: any) => `${r.rule}: ${r.text}`) || [],
        audioUrl: `https://everyayah.com/data/${reciterId}/${String(surahId).padStart(3, '0')}${String(ayahId).padStart(3, '0')}.mp3`
      };
    } catch (error) {
      console.error(`[QuranOfflineManager] API Fetch error for ${ayahRef}:`, error);
      // Return partial data to allow UI to at least render gracefully
      return {
        surahId, ayahId,
        tafsir: "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØªÙØ³ÙŠØ± (ØªØ£ÙƒØ¯ Ù…Ù† Ø§Ù„Ø§ØªØµØ§Ù„)",
        mutashabihat: [],
        themeColor: "#00000000",
        themeTitle: "",
        wordByWord: [],
        tajweed: []
      };
    }
  }

  private static async downloadAndSaveAudio(url: string, path: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const base64Data = await this.blobToBase64(blob);

      await Filesystem.writeFile({
        path,
        data: base64Data as string,
        directory: Directory.Data,
      });
    } catch (error) {
      console.warn(`[QuranOfflineManager] Audio download failed: ${url}`, error);
    }
  }

  private static async getLocalAudioUri(
    surahId: number, 
    ayahId: number, 
    reciterId: string
  ): Promise<string | null> {
    try {
      const path = `audio/${reciterId}/s${surahId}/a${ayahId}.mp3`;
      const uri = await Filesystem.getUri({
        path,
        directory: Directory.Data,
      });
      return Capacitor.convertFileSrc(uri.uri);
    } catch (e) {
      return null;
    }
  }

  private static async ensureDirectory(path: string): Promise<void> {
    try {
      await Filesystem.mkdir({
        path,
        directory: Directory.Data,
        recursive: true,
      });
    } catch (e) {
      // Likely already exists
    }
  }

  private static blobToBase64(blob: Blob): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  private static getSurahAyahCount(surahId: number): number {
    const surah = quranSurahs.find(s => s.number === surahId);
    return surah ? surah.ayahCount : 0;
  }
}
