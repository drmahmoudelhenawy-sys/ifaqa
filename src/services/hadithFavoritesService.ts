import type { Hadith, HadithGrade } from './hadithService';

export interface FavoriteHadith {
  id: string; // `${collection}_${hadithnumber}`
  collection: string;
  collectionName: string;
  hadithnumber: number;
  arabicnumber: number;
  text: string;
  section: string;
  grades: HadithGrade[];
  savedAt: number;
}

const FAVORITES_STORAGE_KEY = 'ifaqa_hadith_favorites_v1';

export class HadithFavoritesService {
  public static getFavorites(): FavoriteHadith[] {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static isFavorite(collection: string, hadithnumber: number): boolean {
    const id = `${collection}_${hadithnumber}`;
    const favs = this.getFavorites();
    return favs.some((f) => f.id === id);
  }

  public static toggleFavorite(hadith: Hadith, collectionName: string): boolean {
    const collection = hadith.reference.collection;
    const id = `${collection}_${hadith.hadithnumber}`;
    const favs = this.getFavorites();
    const existingIndex = favs.findIndex((f) => f.id === id);

    let isAdded = false;
    let nextFavs: FavoriteHadith[];

    if (existingIndex >= 0) {
      nextFavs = favs.filter((f) => f.id !== id);
      isAdded = false;
    } else {
      const newFav: FavoriteHadith = {
        id,
        collection,
        collectionName,
        hadithnumber: hadith.hadithnumber,
        arabicnumber: hadith.arabicnumber,
        text: hadith.text,
        section: hadith.section,
        grades: hadith.grades,
        savedAt: Date.now(),
      };
      nextFavs = [newFav, ...favs];
      isAdded = true;
    }

    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavs));
      window.dispatchEvent(new CustomEvent('hadith_favorites_changed', { detail: { id, isAdded } }));
    } catch (e) {
      console.error('Failed to save hadith favorite:', e);
    }

    return isAdded;
  }

  public static removeFavorite(id: string): void {
    const favs = this.getFavorites();
    const nextFavs = favs.filter((f) => f.id !== id);
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavs));
      window.dispatchEvent(new CustomEvent('hadith_favorites_changed', { detail: { id, isAdded: false } }));
    } catch {}
  }
}
