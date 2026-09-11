import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { buildHadithEditionUrl, getEditionIdForCollection, getHadithDownloadUrl, type HadithCollectionId } from './hadithConfig';

const TAFSIR_URL = (id: number) => `https://api.quran.com/api/v4/quran/tafsirs/${id}`; // Replace with actual API if different
const IRAAB_URL = 'https://raw.githubusercontent.com/ifahqa/data/main/iraab.json'; // Placeholder URL
const MAANI_URL = 'https://raw.githubusercontent.com/ifahqa/data/main/maani.json'; // Placeholder URL

// Base URL for audio. Reciters can be configured.
const getAudioUrl = (reciterId: string, surahId: number) => {
  const paddedSurah = String(surahId).padStart(3, '0');
  return `https://everyayah.com/data/${reciterId}/${paddedSurah}.zip`; // Example for a whole surah if available, or just construct it dynamically.
  // Actually, for simplicity of downloading a single file per surah, many APIs provide a single MP3 per surah.
  // E.g. https://server8.mp3quran.net/afs/${paddedSurah}.mp3
  return `https://server8.mp3quran.net/${reciterId}/${paddedSurah}.mp3`;
};

export class DownloadService {
  static getHadithCollectionFileName(edition: string): string {
    return `hadith_${edition}.json`;
  }

  static getHadithCollectionDownloadKey(edition: string): string {
    return `hadith_${edition}_downloaded`;
  }

  private static async writeJsonFile(fileName: string, data: unknown): Promise<boolean> {
    try {
      await Filesystem.writeFile({
        path: fileName,
        data: JSON.stringify(data),
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      return true;
    } catch (error) {
      console.error(`Error writing ${fileName}:`, error);
      return false;
    }
  }

  /**
   * Helper to download a JSON file from a URL and save it to the data directory.
   */
  private static async downloadJson(url: string, fileName: string): Promise<boolean> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();

      return this.writeJsonFile(fileName, data);
    } catch (error) {
      console.error(`Error downloading ${fileName}:`, error);
      return false;
    }
  }

  /**
   * Helper to download a Binary file (like MP3) and save it.
   */
  private static async downloadBinary(url: string, fileName: string): Promise<boolean> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch audio');
      const blob = await response.blob();
      const base64Data = await this.blobToBase64(blob);

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data as string,
        directory: Directory.Data,
      });
      return true;
    } catch (error) {
      console.error(`Error downloading ${fileName}:`, error);
      return false;
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

  // --- Public Methods ---

  static async downloadTafsir(id: number): Promise<boolean> {
    const success = await this.downloadJson(TAFSIR_URL(id), `tafsir_${id}.json`);
    if (success) {
      await Preferences.set({ key: `tafsir_${id}_downloaded`, value: 'true' });
    }
    return success;
  }

  static async downloadIraab(): Promise<boolean> {
    const success = await this.downloadJson(IRAAB_URL, 'iraab.json');
    if (success) {
      await Preferences.set({ key: 'iraab_downloaded', value: 'true' });
    }
    return success;
  }

  static async downloadMaani(): Promise<boolean> {
    const success = await this.downloadJson(MAANI_URL, 'maani.json');
    if (success) {
      await Preferences.set({ key: 'maani_downloaded', value: 'true' });
    }
    return success;
  }

  static async downloadAudio(surahId: number, reciterId: string): Promise<boolean> {
    const fileName = `audio_${reciterId}_${surahId}.mp3`;
    const success = await this.downloadBinary(getAudioUrl(reciterId, surahId), fileName);
    if (success) {
      await Preferences.set({ key: `audio_${reciterId}_${surahId}_downloaded`, value: 'true' });
    }
    return success;
  }

  static async downloadHadiths(edition: string): Promise<boolean> {
    const primaryUrl = getHadithDownloadUrl(edition);
    let success = await this.downloadJson(primaryUrl, this.getHadithCollectionFileName(edition));

    if (!success) {
      const fallbackUrl = buildHadithEditionUrl(edition, true);
      success = await this.downloadJson(fallbackUrl, this.getHadithCollectionFileName(edition));
    }

    if (success) {
      await Preferences.set({ key: this.getHadithCollectionDownloadKey(edition), value: 'true' });
    }
    return success;
  }

  static async deleteHadiths(edition: string): Promise<boolean> {
    try {
      await Filesystem.deleteFile({
        path: this.getHadithCollectionFileName(edition),
        directory: Directory.Data,
      });
      await Preferences.remove({ key: this.getHadithCollectionDownloadKey(edition) });
      return true;
    } catch {
      await Preferences.remove({ key: this.getHadithCollectionDownloadKey(edition) });
      return false;
    }
  }

  static async deleteHadithCollection(collection: HadithCollectionId): Promise<boolean> {
    return this.deleteHadiths(getEditionIdForCollection(collection));
  }

  static async downloadHadithCollection(collection: HadithCollectionId): Promise<boolean> {
    return this.downloadHadiths(getEditionIdForCollection(collection));
  }

  // --- Read Methods ---

  static async isDownloaded(key: string): Promise<boolean> {
    const { value } = await Preferences.get({ key });
    return value === 'true';
  }

  static async getLocalJson(fileName: string): Promise<any | null> {
    try {
      const contents = await Filesystem.readFile({
        path: fileName,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      return JSON.parse(contents.data as string);
    } catch (e) {
      return null;
    }
  }

  static async readJsonFile<T>(fileName: string): Promise<T | null> {
    return this.getLocalJson(fileName) as Promise<T | null>;
  }

  static async fileExists(fileName: string): Promise<boolean> {
    try {
      const result = await Filesystem.stat({
        path: fileName,
        directory: Directory.Data,
      });
      return result.type === 'file';
    } catch (error) {
      return false;
    }
  }

  static async hasLocalHadithCollection(edition: string): Promise<boolean> {
    const fileExists = await this.fileExists(this.getHadithCollectionFileName(edition));
    if (!fileExists) {
      return false;
    }

    const localContent = await this.readJsonFile<{ hadiths?: unknown[] }>(this.getHadithCollectionFileName(edition));
    if (!localContent || !Array.isArray(localContent.hadiths) || localContent.hadiths.length === 0) {
      return false;
    }

    const storedFlag = await this.isDownloaded(this.getHadithCollectionDownloadKey(edition));
    if (!storedFlag) {
      await Preferences.set({ key: this.getHadithCollectionDownloadKey(edition), value: 'true' });
    }

    return true;
  }

  static async readLocalHadithCollection<T>(edition: string): Promise<T | null> {
    const exists = await this.hasLocalHadithCollection(edition);
    if (!exists) {
      await Preferences.remove({ key: this.getHadithCollectionDownloadKey(edition) });
      return null;
    }

    return this.readJsonFile<T>(this.getHadithCollectionFileName(edition));
  }

  static async getLocalAudioUri(surahId: number, reciterId: string): Promise<string | null> {
    const fileName = `audio_${reciterId}_${surahId}.mp3`;
    const isDownloaded = await this.isDownloaded(`audio_${reciterId}_${surahId}_downloaded`);
    if (!isDownloaded) return null;

    try {
      const uri = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Data,
      });
      // Convert to a format usable in web audio (Capacitor converts it)
      return Capacitor.convertFileSrc(uri.uri);
    } catch (e) {
      return null;
    }
  }
}
