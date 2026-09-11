import localforage from 'localforage';
import type { AudioTrack } from './quranAudioHubService';
import { quranSurahs } from '../../quranMetadata';

const LOCAL_AUDIO_INDEX_KEY = 'ifaqa_user_imported_audio_files_v1';
const LOCAL_AUDIO_PREFIX = 'user_audio_';

const localAudioStore = localforage.createInstance({
  name: 'ifaqa',
  storeName: 'user_imported_audio',
  description: 'User uploaded audio files from phone',
});

const objectUrlCache = new Map<string, string>();

export interface LocalImportedAudioMeta {
  storageKey: string;
  fileName: string;
  title: string;
  artist: string;
  sizeBytes: number;
  type: string;
  importedAt: number;
  duration?: number;
  isQuranSurah?: boolean;
  surahNumber?: number;
  surahName?: string;
  startPage?: number;
}

const readLocalIndex = (): LocalImportedAudioMeta[] => {
  try {
    const raw = localStorage.getItem(LOCAL_AUDIO_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeLocalIndex = (items: LocalImportedAudioMeta[]) => {
  try {
    localStorage.setItem(LOCAL_AUDIO_INDEX_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('ifaqa_local_audio_changed'));
  } catch {}
};

export class LocalAudioStorageService {
  static list(): LocalImportedAudioMeta[] {
    return readLocalIndex().sort((a, b) => b.importedAt - a.importedAt);
  }

  static async importAudioFile(
    file: File,
    customTitle?: string,
    customArtist?: string,
    surahNumber?: number
  ): Promise<AudioTrack> {
    const storageKey = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const isQuran = Boolean(surahNumber && surahNumber > 0);
    const surahMeta = isQuran ? quranSurahs.find(s => s.number === surahNumber) : null;

    const title = customTitle?.trim() || (surahMeta ? surahMeta.name : file.name.replace(/\.[^/.]+$/, ''));
    const artist = customArtist?.trim() || (isQuran ? 'قارئ محلي' : 'تسجيل من الهاتف');

    // Store as Blob safely in localforage IndexedDB
    const blob = new Blob([file], { type: file.type || 'audio/mpeg' });
    await localAudioStore.setItem(`${LOCAL_AUDIO_PREFIX}${storageKey}`, blob);

    const meta: LocalImportedAudioMeta = {
      storageKey,
      fileName: file.name,
      title,
      artist,
      sizeBytes: file.size,
      type: file.type || 'audio/mpeg',
      importedAt: Date.now(),
      isQuranSurah: isQuran,
      surahNumber: isQuran ? (surahMeta?.number || surahNumber) : 0,
      surahName: isQuran ? (surahMeta?.name || title) : title,
      startPage: isQuran ? (surahMeta?.startPage || 1) : undefined,
    };

    const current = readLocalIndex();
    writeLocalIndex([meta, ...current]);

    return this.metaToAudioTrack(meta);
  }

  static updateAudioMeta(storageKey: string, updates: Partial<LocalImportedAudioMeta>): boolean {
    const list = readLocalIndex();
    const idx = list.findIndex(item => item.storageKey === storageKey);
    if (idx === -1) return false;

    const existing = list[idx];
    const isQuran = updates.isQuranSurah !== undefined ? updates.isQuranSurah : existing.isQuranSurah;
    const surahNum = updates.surahNumber !== undefined ? updates.surahNumber : existing.surahNumber;
    const surahMeta = (isQuran && surahNum && surahNum > 0) ? quranSurahs.find(s => s.number === surahNum) : null;

    const updated: LocalImportedAudioMeta = {
      ...existing,
      ...updates,
      isQuranSurah: Boolean(isQuran && surahNum && surahNum > 0),
      surahNumber: isQuran ? (surahMeta?.number || surahNum || 0) : 0,
      surahName: isQuran ? (surahMeta?.name || updates.surahName || existing.surahName || existing.title) : (updates.title || existing.title),
      startPage: isQuran ? (surahMeta?.startPage || 1) : undefined,
    };

    list[idx] = updated;
    writeLocalIndex(list);
    return true;
  }

  static async getPlayableUrl(storageKey: string): Promise<string | null> {
    if (objectUrlCache.has(storageKey)) {
      return objectUrlCache.get(storageKey)!;
    }

    try {
      const blob = await localAudioStore.getItem<Blob>(`${LOCAL_AUDIO_PREFIX}${storageKey}`);
      if (!blob) return null;

      const url = URL.createObjectURL(blob);
      objectUrlCache.set(storageKey, url);
      return url;
    } catch (e) {
      console.warn('Error reading local audio blob:', e);
      return null;
    }
  }

  static async deleteAudio(storageKey: string): Promise<void> {
    await localAudioStore.removeItem(`${LOCAL_AUDIO_PREFIX}${storageKey}`);
    if (objectUrlCache.has(storageKey)) {
      URL.revokeObjectURL(objectUrlCache.get(storageKey)!);
      objectUrlCache.delete(storageKey);
    }
    const current = readLocalIndex();
    writeLocalIndex(current.filter(i => i.storageKey !== storageKey));
  }

  static metaToAudioTrack(meta: LocalImportedAudioMeta): AudioTrack {
    const isQuran = Boolean(meta.isQuranSurah && meta.surahNumber && meta.surahNumber > 0);
    const surahMeta = isQuran ? quranSurahs.find(s => s.number === meta.surahNumber) : null;

    return {
      surahNumber: isQuran ? (meta.surahNumber || 0) : 0,
      surahName: isQuran ? (meta.surahName || surahMeta?.name || meta.title) : meta.title,
      surahEnglishName: meta.fileName,
      ayahCount: isQuran ? (surahMeta?.ayahCount || 0) : 0,
      reciterId: isQuran ? -1 : 0,
      reciterName: meta.artist || (isQuran ? 'قارئ محلي' : 'تسجيل من الهاتف'),
      reciterPhoto: '',
      moshafName: isQuran ? "تلاوة محلية " : "ملف صوتي محلي ",
      audioUrl: `local://${meta.storageKey}`,
      storageKey: meta.storageKey,
      duration: meta.duration,
    };
  }

  static getLocalAudioTracks(): AudioTrack[] {
    return this.list().map(m => this.metaToAudioTrack(m));
  }
}
