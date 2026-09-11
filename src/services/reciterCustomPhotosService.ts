import { doc, setDoc, updateDoc, deleteField, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { APP_ID } from '../../constants';

export interface CustomReciterPhoto {
  name: string;
  photoUrl: string;
  updatedAt?: string;
  updatedBy?: string;
  notes?: string;
}

const CACHE_KEY = 'ifaqa_custom_reciter_photos_v1';

/**
 * Normalizes Arabic text for flexible matching:
 * Removes tashkeel/diacritics, unifies alef, yaa, and taa marbuta.
 */
export function normalizeReciterKey(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ');
}

class ReciterCustomPhotosService {
  private memoryCache: Record<string, CustomReciterPhoto> = {};
  private isInitialized = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        this.memoryCache = JSON.parse(raw);
        this.isInitialized = true;
      }
    } catch (e) {
      console.warn('Failed to parse cached custom reciter photos:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.memoryCache));
    } catch (e) {
      console.warn('Failed to cache custom reciter photos in storage:', e);
    }
  }

  getDocRef() {
    return doc(db, 'artifacts', APP_ID, 'public', 'data', 'app_config', 'reciter_custom_photos');
  }

  /**
   * Real-time subscription to cloud custom photos
   */
  subscribeToPhotos(callback: (photos: Record<string, CustomReciterPhoto>) => void): () => void {
    // Notify immediately with existing cache
    callback({ ...this.memoryCache });

    const docRef = this.getDocRef();
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const photos = (data?.photos || {}) as Record<string, CustomReciterPhoto>;
        this.memoryCache = photos;
        this.saveToStorage();
        callback({ ...photos });
        window.dispatchEvent(new CustomEvent('ifaqa_reciter_photos_updated', { detail: { photos } }));
      }
    }, (err) => {
      console.warn('Error subscribing to custom reciter photos:', err);
    });

    return unsubscribe;
  }

  /**
   * Resolves a custom photo by reciter name (checking exact, normalized, and substring)
   */
  getCustomPhoto(name: string): string | null {
    if (!name) return null;
    const clean = name.trim();
    const normalized = normalizeReciterKey(clean);

    // 1. Direct match by exact key or normalized key
    if (this.memoryCache[clean]?.photoUrl) return this.memoryCache[clean].photoUrl;
    if (this.memoryCache[normalized]?.photoUrl) return this.memoryCache[normalized].photoUrl;

    // 2. Search all items for substring / fuzzy match
    for (const [key, item] of Object.entries(this.memoryCache)) {
      if (!item?.photoUrl) continue;
      const keyNorm = normalizeReciterKey(key);
      const itemNorm = normalizeReciterKey(item.name || key);

      if (keyNorm === normalized || itemNorm === normalized) {
        return item.photoUrl;
      }
      if (normalized.length >= 4 && (keyNorm.includes(normalized) || normalized.includes(keyNorm) || itemNorm.includes(normalized) || normalized.includes(itemNorm))) {
        return item.photoUrl;
      }
    }

    return null;
  }

  getAllCustomPhotos(): Record<string, CustomReciterPhoto> {
    return { ...this.memoryCache };
  }

  /**
   * Saves or updates a reciter photo to Firestore for all users
   */
  async savePhoto(name: string, photoUrl: string, adminEmail?: string, notes?: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed || !photoUrl.trim()) {
      throw new Error('Name and photo URL are required');
    }
    const normalizedKey = normalizeReciterKey(trimmed);
    const item: CustomReciterPhoto = {
      name: trimmed,
      photoUrl: photoUrl.trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmail || 'Admin',
      notes: notes?.trim() || ''
    };

    // Update in memory & storage immediately
    this.memoryCache[normalizedKey] = item;
    this.saveToStorage();
    window.dispatchEvent(new CustomEvent('ifaqa_reciter_photos_updated', { detail: { photos: this.memoryCache } }));

    // Save to Firestore
    const docRef = this.getDocRef();
    await setDoc(docRef, {
      photos: {
        [normalizedKey]: item
      },
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  }

  /**
   * Deletes a custom photo (reverting to app default)
   */
  async deletePhoto(name: string): Promise<void> {
    const normalizedKey = normalizeReciterKey(name);
    delete this.memoryCache[normalizedKey];
    this.saveToStorage();
    window.dispatchEvent(new CustomEvent('ifaqa_reciter_photos_updated', { detail: { photos: this.memoryCache } }));

    const docRef = this.getDocRef();
    await updateDoc(docRef, {
      [`photos.${normalizedKey}`]: deleteField(),
      lastUpdated: new Date().toISOString()
    });
  }
}

export const reciterCustomPhotosService = new ReciterCustomPhotosService();
