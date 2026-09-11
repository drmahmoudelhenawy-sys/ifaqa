import localforage from 'localforage';
import { quranSurahs } from '../../quranMetadata';
import type { Mutashabih } from './quranOfflineManager';

const FULL_QURAN_URL = 'https://api.alquran.cloud/v1/quran/quran-uthmani';

export interface DiffToken {
  text: string;
  kind: 'matching' | 'different';
}

export interface AdvancedMutashabih extends Mutashabih {
  surahId: number;
  pageNumber: number;
  score: number;
  source: 'curated' | 'algorithmic';
  sourceDiff: DiffToken[];
  targetDiff: DiffToken[];
}

interface IndexedAyah {
  surahId: number;
  ayahId: number;
  pageNumber: number;
  surahName: string;
  text: string;
  tokens: string[];
}

interface QuranIndex {
  ayahs: IndexedAyah[];
  byKey: Map<string, IndexedAyah>;
  tokenIndex: Map<string, number[]>;
}

let indexPromise: Promise<QuranIndex> | null = null;

function normalizeToken(value: string): string {
  return value
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0621-\u064A]/g, '')
    .trim();
}

function tokenize(text: string): string[] {
  return text.split(/\s+/).map(normalizeToken).filter(Boolean);
}

function lcsMatrix(a: string[], b: string[]): number[][] {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      matrix[i][j] = a[i - 1] === b[j - 1]
        ? matrix[i - 1][j - 1] + 1
        : Math.max(matrix[i - 1][j], matrix[i][j - 1]);
    }
  }
  return matrix;
}

export function buildWordDiff(sourceText: string, targetText: string): { source: DiffToken[]; target: DiffToken[] } {
  const sourceOriginal = sourceText.split(/\s+/).filter(Boolean);
  const targetOriginal = targetText.split(/\s+/).filter(Boolean);
  const source = sourceOriginal.map(normalizeToken);
  const target = targetOriginal.map(normalizeToken);
  const matrix = lcsMatrix(source, target);
  const sourceMatching = new Set<number>();
  const targetMatching = new Set<number>();
  let i = source.length;
  let j = target.length;

  while (i > 0 && j > 0) {
    if (source[i - 1] === target[j - 1]) {
      sourceMatching.add(i - 1);
      targetMatching.add(j - 1);
      i -= 1;
      j -= 1;
    } else if (matrix[i - 1][j] >= matrix[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  return {
    source: sourceOriginal.map((text, index) => ({ text, kind: sourceMatching.has(index) ? 'matching' : 'different' })),
    target: targetOriginal.map((text, index) => ({ text, kind: targetMatching.has(index) ? 'matching' : 'different' })),
  };
}

function diceBigrams(a: string[], b: string[]): number {
  if (a.length < 2 || b.length < 2) return 0;
  const counts = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i += 1) {
    const key = `${a[i]} ${a[i + 1]}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let overlap = 0;
  for (let i = 0; i < b.length - 1; i += 1) {
    const key = `${b[i]} ${b[i + 1]}`;
    const count = counts.get(key) || 0;
    if (count > 0) {
      overlap += 1;
      counts.set(key, count - 1);
    }
  }
  return (2 * overlap) / ((a.length - 1) + (b.length - 1));
}

function similarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = Array.from(setA).filter((token) => setB.has(token)).length;
  const union = new Set([...a, ...b]).size;
  const jaccard = union ? intersection / union : 0;
  const lcs = lcsMatrix(a, b)[a.length][b.length] / Math.max(a.length, b.length);
  return (lcs * 0.5) + (jaccard * 0.3) + (diceBigrams(a, b) * 0.2);
}

async function loadIndex(): Promise<QuranIndex> {
  if (!indexPromise) {
    indexPromise = (async () => {
      let payload = await localforage.getItem<any>('quran_text');
      if (!payload?.data?.surahs && !payload?.surahs) {
        payload = await localforage.getItem<any>('quran_similarity_text');
      }
      if (!payload?.data?.surahs && !payload?.surahs) {
        const response = await fetch(FULL_QURAN_URL);
        if (!response.ok) throw new Error('تعذر تحميل نص القرآن لمحرك المتشابهات');
        payload = await response.json();
        await localforage.setItem('quran_similarity_text', payload);
      }
      const surahs = payload?.data?.surahs || payload?.surahs || [];
      const ayahs: IndexedAyah[] = [];
      const byKey = new Map<string, IndexedAyah>();
      const tokenIndex = new Map<string, number[]>();

      for (const surah of surahs) {
        const surahId = Number(surah?.number);
        const surahName = quranSurahs.find((item) => item.number === surahId)?.name || surah?.name || `سورة ${surahId}`;
        for (const ayah of surah?.ayahs || []) {
          const entry: IndexedAyah = {
            surahId,
            ayahId: Number(ayah?.numberInSurah || ayah?.ayah || ayah?.number),
            pageNumber: Number(ayah?.page || quranSurahs.find((item) => item.number === surahId)?.startPage || 1),
            surahName,
            text: String(ayah?.text || ayah?.text_uthmani || ''),
            tokens: tokenize(String(ayah?.text || ayah?.text_uthmani || '')),
          };
          if (!entry.ayahId || !entry.text) continue;
          const index = ayahs.push(entry) - 1;
          byKey.set(`${surahId}:${entry.ayahId}`, entry);
          for (const token of new Set(entry.tokens)) {
            const list = tokenIndex.get(token) || [];
            list.push(index);
            tokenIndex.set(token, list);
          }
        }
      }
      return { ayahs, byKey, tokenIndex };
    })().catch((error) => {
      indexPromise = null;
      throw error;
    });
  }
  return indexPromise;
}

export async function findAdvancedMutashabihat(
  surahId: number,
  ayahId: number,
  curated: Mutashabih[] = [],
  limit = 8,
): Promise<AdvancedMutashabih[]> {
  const index = await loadIndex();
  const source = index.byKey.get(`${surahId}:${ayahId}`);
  if (!source) return [];
  const results = new Map<string, AdvancedMutashabih>();

  for (const item of curated) {
    const matchedSurah = quranSurahs.find((surah) => surah.name === item.surahName || `سورة ${surah.name}` === item.surahName);
    const target = matchedSurah ? index.byKey.get(`${matchedSurah.number}:${item.ayahNumber}`) : undefined;
    if (!target || (target.surahId === surahId && target.ayahId === ayahId)) continue;
    const diff = buildWordDiff(source.text, target.text);
    results.set(`${target.surahId}:${target.ayahId}`, {
      ...item,
      surahId: target.surahId,
      surahName: target.surahName,
      pageNumber: target.pageNumber,
      text: target.text,
      score: similarity(source.tokens, target.tokens),
      source: 'curated',
      sourceDiff: diff.source,
      targetDiff: diff.target,
    });
  }

  const candidateCounts = new Map<number, number>();
  for (const token of new Set(source.tokens)) {
    for (const candidateIndex of index.tokenIndex.get(token) || []) {
      candidateCounts.set(candidateIndex, (candidateCounts.get(candidateIndex) || 0) + 1);
    }
  }
  const minimumOverlap = source.tokens.length <= 4 ? 2 : Math.max(2, Math.floor(source.tokens.length * 0.35));

  const algorithmic = Array.from(candidateCounts.entries())
    .filter(([, overlap]) => overlap >= minimumOverlap)
    .map(([candidateIndex]) => index.ayahs[candidateIndex])
    .filter((target) => !(target.surahId === surahId && target.ayahId === ayahId))
    .map((target) => ({ target, score: similarity(source.tokens, target.tokens) }))
    .filter(({ score }) => score >= 0.65 && score <= 0.98)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit * 2);

  for (const { target, score } of algorithmic) {
    const key = `${target.surahId}:${target.ayahId}`;
    if (results.has(key)) continue;
    const diff = buildWordDiff(source.text, target.text);
    results.set(key, {
      surahId: target.surahId,
      surahName: target.surahName,
      ayahNumber: target.ayahId,
      pageNumber: target.pageNumber,
      text: target.text,
      score,
      source: 'algorithmic',
      sourceDiff: diff.source,
      targetDiff: diff.target,
    });
  }

  return Array.from(results.values())
    .sort((a, b) => (a.source === b.source ? b.score - a.score : a.source === 'curated' ? -1 : 1))
    .slice(0, limit);
}
