import localforage from 'localforage';
import type { AudioTrack } from './quranAudioHubService';

export interface OfflineAudioItem {
  id: string;
  track: AudioTrack;
  bytes: number;
  downloadedAt: number;
}

export interface BatchDownloadState {
  reciterId: number | string;
  moshafName: string;
  completedCount: number;
  totalCount: number;
  currentSurahName: string;
  currentSurahNumber: number;
  currentPercent: number;
  isCompleted: boolean;
  isCancelled: boolean;
  failedCount: number;
}

const INDEX_KEY = 'ifaqa_offline_audio_index_v1';
const AUDIO_PREFIX = 'quran_audio_';

const audioStore = localforage.createInstance({
  name: 'ifaqa',
  storeName: 'quran_audio',
  description: 'Downloaded Quran recitations for offline playback',
});

const objectUrls = new Map<string, string>();
const activeBatchAbortControllers = new Map<string, AbortController>();
const activeBatchStates = new Map<string, BatchDownloadState>();

const hash = (value: string) => {
  let result = 5381;
  for (let i = 0; i < value.length; i += 1) result = ((result << 5) + result) ^ value.charCodeAt(i);
  return (result >>> 0).toString(36);
};

const readIndex = (): OfflineAudioItem[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeIndex = (items: OfflineAudioItem[]) => localStorage.setItem(INDEX_KEY, JSON.stringify(items));

export class QuranAudioOfflineService {
  static getTrackId(track: AudioTrack) {
    return `${track.reciterId}_${track.surahNumber}_${hash(track.audioUrl)}`;
  }

  static list(): OfflineAudioItem[] {
    return readIndex().sort((a, b) => b.downloadedAt - a.downloadedAt);
  }

  static isDownloaded(track: AudioTrack) {
    const id = this.getTrackId(track);
    return readIndex().some(item => item.id === id);
  }

  static getMoshafDownloadStats(reciterId: number | string, moshafName: string, totalAvailableCount: number) {
    const all = readIndex();
    const moshafItems = all.filter(
      item => String(item.track.reciterId) === String(reciterId) && item.track.moshafName === moshafName
    );
    const downloadedCount = moshafItems.length;
    const totalBytes = moshafItems.reduce((acc, curr) => acc + curr.bytes, 0);
    const isFullyDownloaded = totalAvailableCount > 0 && downloadedCount >= totalAvailableCount;

    return {
      downloadedCount,
      totalCount: totalAvailableCount,
      isFullyDownloaded,
      totalBytes,
    };
  }

  static async download(track: AudioTrack, onProgress?: (percentage: number) => void, signal?: AbortSignal): Promise<OfflineAudioItem> {
    const id = this.getTrackId(track);
    const response = await fetch(track.audioUrl, { signal });
    if (!response.ok) throw new Error(`تعذر تحميل التلاوة (${response.status})`);

    const total = Number(response.headers.get('content-length')) || 0;
    let blob: Blob;

    if (response.body && total > 0) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        if (signal?.aborted) {
          await reader.cancel();
          throw new Error('Download aborted');
        }
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.byteLength;
          onProgress?.(Math.min(99, Math.round((received / total) * 100)));
        }
      }
      blob = new Blob(chunks as BlobPart[], { type: response.headers.get('content-type') || 'audio/mpeg' });
    } else {
      blob = await response.blob();
    }

    await audioStore.setItem(`${AUDIO_PREFIX}${id}`, blob);
    const item: OfflineAudioItem = { id, track, bytes: blob.size, downloadedAt: Date.now() };
    writeIndex([item, ...readIndex().filter(entry => entry.id !== id)]);
    onProgress?.(100);
    window.dispatchEvent(new CustomEvent('quran_offline_audio_changed'));
    return item;
  }

  static async downloadTrack(track: AudioTrack, onProgress?: (percentage: number) => void): Promise<OfflineAudioItem> {
    return this.download(track, onProgress);
  }

  static async remove(id: string) {
    await audioStore.removeItem(`${AUDIO_PREFIX}${id}`);
    const url = objectUrls.get(id);
    if (url) URL.revokeObjectURL(url);
    objectUrls.delete(id);
    writeIndex(readIndex().filter(item => item.id !== id));
    window.dispatchEvent(new CustomEvent('quran_offline_audio_changed'));
  }

  static async deleteTrack(track: AudioTrack) {
    const id = this.getTrackId(track);
    await this.remove(id);
  }

  static async deleteMoshafBatch(reciterId: number | string, moshafName: string) {
    const all = readIndex();
    const itemsToDelete = all.filter(
      item => String(item.track.reciterId) === String(reciterId) && item.track.moshafName === moshafName
    );

    for (const item of itemsToDelete) {
      await audioStore.removeItem(`${AUDIO_PREFIX}${item.id}`);
      const url = objectUrls.get(item.id);
      if (url) URL.revokeObjectURL(url);
      objectUrls.delete(item.id);
    }

    const remaining = all.filter(
      item => !(String(item.track.reciterId) === String(reciterId) && item.track.moshafName === moshafName)
    );
    writeIndex(remaining);
    window.dispatchEvent(new CustomEvent('quran_offline_audio_changed'));
  }

  static getBatchKey(reciterId: number | string, moshafName: string) {
    return `${reciterId}__${moshafName}`;
  }

  static getActiveBatch(reciterId: number | string, moshafName: string): BatchDownloadState | null {
    return activeBatchStates.get(this.getBatchKey(reciterId, moshafName)) || null;
  }

  static cancelBatch(reciterId: number | string, moshafName: string) {
    const key = this.getBatchKey(reciterId, moshafName);
    const controller = activeBatchAbortControllers.get(key);
    if (controller) {
      controller.abort();
      activeBatchAbortControllers.delete(key);
    }
    const state = activeBatchStates.get(key);
    if (state) {
      state.isCancelled = true;
      activeBatchStates.delete(key);
      window.dispatchEvent(new CustomEvent('quran_offline_batch_changed', { detail: { key, state } }));
    }
  }

  static async startBatchDownload(
    tracks: AudioTrack[],
    onProgress?: (state: BatchDownloadState) => void
  ): Promise<void> {
    if (!tracks.length) return;
    const { reciterId, moshafName } = tracks[0];
    const key = this.getBatchKey(reciterId, moshafName);

    // Cancel existing if any
    this.cancelBatch(reciterId, moshafName);

    const controller = new AbortController();
    activeBatchAbortControllers.set(key, controller);

    const tracksToDownload = tracks.filter(t => !this.isDownloaded(t));
    const alreadyDownloadedCount = tracks.length - tracksToDownload.length;

    const state: BatchDownloadState = {
      reciterId,
      moshafName,
      completedCount: alreadyDownloadedCount,
      totalCount: tracks.length,
      currentSurahName: tracksToDownload[0]?.surahName || '',
      currentSurahNumber: tracksToDownload[0]?.surahNumber || 1,
      currentPercent: 0,
      isCompleted: tracksToDownload.length === 0,
      isCancelled: false,
      failedCount: 0,
    };

    activeBatchStates.set(key, state);
    onProgress?.({ ...state });
    window.dispatchEvent(new CustomEvent('quran_offline_batch_changed', { detail: { key, state } }));

    if (tracksToDownload.length === 0) {
      activeBatchStates.delete(key);
      activeBatchAbortControllers.delete(key);
      return;
    }

    try {
      for (let i = 0; i < tracksToDownload.length; i++) {
        if (controller.signal.aborted) break;

        const currentTrack = tracksToDownload[i];
        state.currentSurahName = currentTrack.surahName;
        state.currentSurahNumber = currentTrack.surahNumber;
        state.currentPercent = 0;
        onProgress?.({ ...state });
        window.dispatchEvent(new CustomEvent('quran_offline_batch_changed', { detail: { key, state } }));

        try {
          await this.download(
            currentTrack,
            (percent) => {
              state.currentPercent = percent;
              onProgress?.({ ...state });
            },
            controller.signal
          );
          state.completedCount += 1;
        } catch (e: any) {
          if (controller.signal.aborted) break;
          console.warn(`Failed to download surah ${currentTrack.surahNumber}:`, e);
          state.failedCount += 1;
        }

        onProgress?.({ ...state });
        window.dispatchEvent(new CustomEvent('quran_offline_batch_changed', { detail: { key, state } }));
      }

      state.isCompleted = true;
      onProgress?.({ ...state });
      window.dispatchEvent(new CustomEvent('quran_offline_batch_changed', { detail: { key, state } }));
    } finally {
      activeBatchStates.delete(key);
      activeBatchAbortControllers.delete(key);
    }
  }

  static async getPlayableUrl(track: AudioTrack): Promise<string | null> {
    const id = this.getTrackId(track);
    if (!readIndex().some(item => item.id === id)) return null;
    const existing = objectUrls.get(id);
    if (existing) return existing;
    const blob = await audioStore.getItem<Blob>(`${AUDIO_PREFIX}${id}`);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    objectUrls.set(id, url);
    return url;
  }

  static formatBytes(bytes: number) {
    if (!bytes) return '0 م.ب';
    return `${(bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} م.ب`;
  }
}
