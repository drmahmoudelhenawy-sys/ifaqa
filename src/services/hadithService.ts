import { DownloadService } from './DownloadService';
import {
  buildHadithEditionUrl,
  getEditionIdForCollection,
  HADITH_EDITIONS,
  HADITH_SOURCE_CONFIG,
  type HadithCollectionId,
  type HadithProviderId,
  type HadithSourceConfig,
} from './hadithConfig';

export { HADITH_EDITIONS, HADITH_SOURCE_CONFIG, getEditionIdForCollection } from './hadithConfig';
export type { HadithCollectionId, HadithSourceConfig, HadithProviderId } from './hadithConfig';

export interface HadithGrade {
  name: string;
  grade: string;
}

export interface HadithBookReference {
  collection: HadithCollectionId;
  edition: string;
  provider: HadithProviderId;
}

export interface Hadith {
  hadithnumber: number;
  arabicnumber: number;
  text: string;
  grades: HadithGrade[];
  section: string;
  reference: HadithBookReference;
}

export interface HadithEdition {
  name: string;
  author: string;
  hadiths: Hadith[];
  metadata: HadithSourceConfig;
}

export type HadithLoadStatus = 'local' | 'remote' | 'download_required' | 'unavailable';

export interface HadithCollectionAccessState {
  collection: HadithCollectionId;
  edition: string;
  isDownloaded: boolean;
  canFetchOnline: boolean;
  shouldPromptDownload: boolean;
}

export interface HadithLoadOptions {
  allowNetwork?: boolean;
  requireDownloaded?: boolean;
}

export interface HadithLoadResult {
  status: HadithLoadStatus;
  collection: HadithCollectionId;
  edition: string;
  data: HadithEdition | null;
  isDownloaded: boolean;
  shouldPromptDownload: boolean;
}

import { getArabicChapterName } from './hadithChaptersArabic';

interface HadithApiGradeResponse {
  name?: string;
  grade?: string;
}

interface HadithApiItemResponse {
  hadithnumber?: number | string;
  arabicnumber?: number | string;
  text?: string;
  grades?: HadithApiGradeResponse[];
  section?: string;
  reference?: { book?: number | string; hadith?: number | string };
  book?: number | string;
}

interface HadithApiEditionResponse {
  name?: string;
  author?: string;
  hadiths?: HadithApiItemResponse[];
  metadata?: {
    sections?: Record<string, string>;
    section_details?: Record<string, any>;
  };
}

const HADITH_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getCacheKey(edition: string): string {
  return `hadith_v3_${edition}`;
}

async function fetchJsonWithFallback<T>(edition: string): Promise<T> {
  const primaryResponse = await fetch(buildHadithEditionUrl(edition));
  if (primaryResponse.ok) {
    return primaryResponse.json() as Promise<T>;
  }

  const fallbackResponse = await fetch(buildHadithEditionUrl(edition, true));
  if (!fallbackResponse.ok) {
    throw new Error(`Failed to fetch hadith edition "${edition}"`);
  }

  return fallbackResponse.json() as Promise<T>;
}

function normalizeGrade(rawGrade: HadithApiGradeResponse): HadithGrade | null {
  if (!rawGrade.name || !rawGrade.grade) {
    return null;
  }

  return {
    name: rawGrade.name,
    grade: rawGrade.grade,
  };
}

function parseNumericField(value: number | string | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeHadithItem(
  rawHadith: HadithApiItemResponse,
  reference: HadithBookReference,
  sectionsMap: Record<string, string> = {}
): Hadith {
  const rawBookNum = rawHadith.reference?.book ?? rawHadith.book;
  const bookNum = typeof rawBookNum !== 'undefined' ? parseNumericField(rawBookNum) : 0;
  const englishFallback = rawHadith.section || sectionsMap[String(bookNum)] || '';
  const arabicSection = getArabicChapterName(reference.collection, bookNum, englishFallback);

  return {
    hadithnumber: parseNumericField(rawHadith.hadithnumber),
    arabicnumber: parseNumericField(rawHadith.arabicnumber),
    text: rawHadith.text || '',
    grades: (rawHadith.grades || [])
      .map(normalizeGrade)
      .filter((grade): grade is HadithGrade => grade !== null),
    section: arabicSection || englishFallback || '',
    reference,
  };
}

function normalizeEditionResponse(
  rawEdition: HadithApiEditionResponse,
  collection: HadithCollectionId,
  edition: string
): HadithEdition {
  const reference: HadithBookReference = {
    collection,
    edition,
    provider: HADITH_SOURCE_CONFIG.id,
  };

  const sectionsMap = rawEdition.metadata?.sections || {};

  const rawHadiths = (rawEdition.hadiths || [])
    .map((hadith) => normalizeHadithItem(hadith, reference, sectionsMap))
    .filter((hadith) => Boolean(hadith.text && hadith.text.trim().length > 0));

  return {
    name: rawEdition.name || edition,
    author: rawEdition.author || '',
    hadiths: rawHadiths,
    metadata: HADITH_SOURCE_CONFIG,
  };
}

function resolveCollectionFromEdition(edition: string): HadithCollectionId | null {
  const entry = Object.entries(HADITH_SOURCE_CONFIG.editions).find(([, value]) => value === edition);
  return (entry?.[0] as HadithCollectionId | undefined) || null;
}

function readCachedEdition(edition: string): HadithEdition | null {
  const cached = localStorage.getItem(getCacheKey(edition));
  if (!cached) {
    return null;
  }

  try {
    const data = JSON.parse(cached) as { timestamp?: number; content?: HadithEdition };
    if (!data.timestamp || !data.content) {
      return null;
    }

    if (Date.now() - data.timestamp > HADITH_CACHE_TTL_MS) {
      return null;
    }

    return data.content;
  } catch (error) {
    console.error('Error parsing cached hadiths:', error);
    return null;
  }
}

function writeCachedEdition(edition: string, content: HadithEdition) {
  localStorage.setItem(
    getCacheKey(edition),
    JSON.stringify({
      timestamp: Date.now(),
      content,
    })
  );
}

async function readDownloadedEdition(edition: string): Promise<HadithEdition | null> {
  const localContent = await DownloadService.readLocalHadithCollection<HadithApiEditionResponse>(edition);
  const collection = resolveCollectionFromEdition(edition);

  if (!localContent || !collection) {
    return null;
  }

  return normalizeEditionResponse(localContent as HadithApiEditionResponse, collection, edition);
}

export async function getHadithCollectionAccessState(
  collection: HadithCollectionId
): Promise<HadithCollectionAccessState> {
  const edition = getEditionIdForCollection(collection);
  const isDownloaded = await DownloadService.hasLocalHadithCollection(edition);
  const canFetchOnline = navigator.onLine;

  return {
    collection,
    edition,
    isDownloaded,
    canFetchOnline,
    shouldPromptDownload: !isDownloaded,
  };
}

export async function downloadHadithCollection(collection: HadithCollectionId): Promise<boolean> {
  return DownloadService.downloadHadithCollection(collection);
}

export async function deleteHadithCollection(collection: HadithCollectionId): Promise<boolean> {
  return DownloadService.deleteHadithCollection(collection);
}

export async function loadHadithCollection(
  collection: HadithCollectionId,
  options: HadithLoadOptions = {}
): Promise<HadithLoadResult> {
  const edition = getEditionIdForCollection(collection);
  const allowNetwork = options.allowNetwork ?? true;
  const requireDownloaded = options.requireDownloaded ?? false;

  const localData = await readDownloadedEdition(edition);
  if (localData) {
    return {
      status: 'local',
      collection,
      edition,
      data: localData,
      isDownloaded: true,
      shouldPromptDownload: false,
    };
  }

  if (requireDownloaded) {
    return {
      status: 'download_required',
      collection,
      edition,
      data: null,
      isDownloaded: false,
      shouldPromptDownload: true,
    };
  }

  const cached = readCachedEdition(edition);
  if (cached) {
    return {
      status: 'remote',
      collection,
      edition,
      data: cached,
      isDownloaded: false,
      shouldPromptDownload: true,
    };
  }

  if (!allowNetwork || !navigator.onLine) {
    return {
      status: 'download_required',
      collection,
      edition,
      data: null,
      isDownloaded: false,
      shouldPromptDownload: true,
    };
  }

  try {
    const rawContent = await fetchJsonWithFallback<HadithApiEditionResponse>(edition);
    const normalized = normalizeEditionResponse(rawContent, collection, edition);
    writeCachedEdition(edition, normalized);

    return {
      status: 'remote',
      collection,
      edition,
      data: normalized,
      isDownloaded: false,
      shouldPromptDownload: true,
    };
  } catch (error) {
    console.error('Error fetching hadiths:', error);
    return {
      status: 'unavailable',
      collection,
      edition,
      data: null,
      isDownloaded: false,
      shouldPromptDownload: true,
    };
  }
}

export async function fetchHadithCollection(collection: HadithCollectionId): Promise<HadithEdition | null> {
  const result = await loadHadithCollection(collection);
  return result.data;
}

export async function fetchHadiths(edition = HADITH_SOURCE_CONFIG.editions.bukhari): Promise<HadithEdition | null> {
  const collection = resolveCollectionFromEdition(edition);
  if (!collection) {
    console.error(`Unsupported hadith edition requested: ${edition}`);
    return null;
  }

  const result = await loadHadithCollection(collection);
  return result.data;
}

export async function fetchHadithByNumber(
  collection: HadithCollectionId,
  hadithNumber: number
): Promise<Hadith | null> {
  const edition = await fetchHadithCollection(collection);
  if (!edition) {
    return null;
  }

  return edition.hadiths.find((hadith) => hadith.hadithnumber === hadithNumber) || null;
}

export function getRandomHadith(edition: HadithEdition): Hadith {
  const randomIndex = Math.floor(Math.random() * edition.hadiths.length);
  return edition.hadiths[randomIndex];
}
