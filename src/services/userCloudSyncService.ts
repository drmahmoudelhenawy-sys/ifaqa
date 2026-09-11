import { Preferences } from '@capacitor/preferences';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { APP_ID } from '../../constants';

export interface CloudLastReadPosition {
  pageNumber: number;
  surahNumber?: number;
  ayahNumber?: number;
  updatedAt: number;
}

export interface CloudQuranState {
  lastReadPosition?: CloudLastReadPosition;
  khatmas?: any[];
  awrad?: any[];
  wirdHifz?: any;
  wirdRevNear?: any;
  wirdRevFar?: any;
  pageBookmarks?: number[];
  userQuranData?: Record<string, any>;
  userData?: Record<string, any>;
  quranMultiPlans?: any[];
  totalKhatmaProgress?: number;
  updatedAt?: number;
}

const LOCAL_STORAGE_KEYS = {
  LAST_READ_PAGE: 'quranLastReadPage',
  LAST_READ_PAGE_ALT: 'lastReadQuranPage',
  KHATMAS: 'user_khatmas',
  AWRAD: 'quranAwrad',
  PAGE_BOOKMARKS: 'quranPageBookmarks',
  USER_QURAN_DATA: 'userQuranData',
  PAGE_USER_DATA: 'userData',
  QURAN_PLANS: 'quranMultiPlans',
  TOTAL_KHATMA_PROGRESS: 'quranTotalKhatmaProgress'
};

const PREFERENCES_KEYS = {
  WIRD_HIFZ: 'user_wird_hifz',
  WIRD_REV_NEAR: 'user_wird_rev_near_data',
  WIRD_REV_FAR: 'user_wird_rev_far_data'
};

let syncTimer: any = null;
let pendingCloudPayload: Partial<CloudQuranState> = {};

function getQuranStateDocRef(userId: string) {
  return doc(db, 'artifacts', APP_ID, 'users', userId, 'quran_state', 'main');
}

/**
 * Debounced background write to Firestore to minimize writes while swiping pages.
 */
function queueCloudWrite(userId: string, partial: Partial<CloudQuranState>, delayMs = 1500) {
  if (!userId) return;

  pendingCloudPayload = {
    ...pendingCloudPayload,
    ...partial,
    updatedAt: Date.now()
  };

  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(async () => {
    const payload = { ...pendingCloudPayload };
    pendingCloudPayload = {};
    syncTimer = null;

    try {
      if (navigator.onLine) {
        const ref = getQuranStateDocRef(userId);
        await setDoc(ref, payload, { merge: true });
        console.log('[CloudSync] Successfully saved state to Firestore:', Object.keys(payload));
      }
    } catch (err) {
      console.warn('[CloudSync] Background save queued for later (offline or network error):', err);
    }
  }, delayMs);
}

/**
 * Save user reading position both locally and to Cloud Firestore.
 */
export function saveLastReadPosition(userId: string, pageNumber: number, surahNumber?: number, ayahNumber?: number) {
  if (pageNumber > 0) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_READ_PAGE, String(pageNumber));
    localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_READ_PAGE_ALT, String(pageNumber));
  }

  if (!userId) return;

  const position: CloudLastReadPosition = {
    pageNumber,
    surahNumber,
    ayahNumber,
    updatedAt: Date.now()
  };

  queueCloudWrite(userId, { lastReadPosition: position }, 1200);
}

/**
 * Sync Khatmas to Cloud when added, deleted or progress updated.
 */
export function syncKhatmasToCloud(userId: string, khatmas: any[]) {
  if (!userId) return;
  queueCloudWrite(userId, { khatmas }, 800);
}

/**
 * Sync Quran Awrad to Cloud when modified in QuranReader.
 */
export function syncAwradToCloud(userId: string, awrad: any[]) {
  if (!userId) return;
  queueCloudWrite(userId, { awrad }, 800);
}

/**
 * Sync Wird item (hifz, near, far) to Cloud.
 */
export function syncWirdItemToCloud(userId: string, type: 'hifz' | 'near' | 'far', item: any) {
  if (!userId) return;
  const key = type === 'hifz' ? 'wirdHifz' : type === 'near' ? 'wirdRevNear' : 'wirdRevFar';
  queueCloudWrite(userId, { [key]: item }, 800);
}

/**
 * Sync Bookmarks and Ayah annotations.
 */
export function syncBookmarksToCloud(userId: string, pageBookmarks?: number[], userQuranData?: Record<string, any>, userData?: Record<string, any>) {
  if (!userId) return;
  const patch: Partial<CloudQuranState> = {};
  if (pageBookmarks) patch.pageBookmarks = pageBookmarks;
  if (userQuranData) patch.userQuranData = userQuranData;
  if (userData) patch.userData = userData;
  queueCloudWrite(userId, patch, 1500);
}

/**
 * Sync entire current local state of Quran to Firestore.
 * Useful on initial login or when closing reader.
 */
export async function syncAllLocalStateToCloud(userId: string): Promise<void> {
  if (!userId || !navigator.onLine) return;

  try {
    const lastPageNum = Number(localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_READ_PAGE) || 1);
    const khatmasStr = localStorage.getItem(LOCAL_STORAGE_KEYS.KHATMAS);
    const awradStr = localStorage.getItem(LOCAL_STORAGE_KEYS.AWRAD);
    const pageBookmarksStr = localStorage.getItem(LOCAL_STORAGE_KEYS.PAGE_BOOKMARKS);
    const userQuranDataStr = localStorage.getItem(LOCAL_STORAGE_KEYS.USER_QURAN_DATA);
    const pageUserDataStr = localStorage.getItem(LOCAL_STORAGE_KEYS.PAGE_USER_DATA);
    const quranPlansStr = localStorage.getItem(LOCAL_STORAGE_KEYS.QURAN_PLANS);
    const totalKhatmaProg = Number(localStorage.getItem(LOCAL_STORAGE_KEYS.TOTAL_KHATMA_PROGRESS) || 0);

    const hifzPref = await Preferences.get({ key: PREFERENCES_KEYS.WIRD_HIFZ });
    const revNearPref = await Preferences.get({ key: PREFERENCES_KEYS.WIRD_REV_NEAR });
    const revFarPref = await Preferences.get({ key: PREFERENCES_KEYS.WIRD_REV_FAR });

    const payload: CloudQuranState = {
      lastReadPosition: {
        pageNumber: lastPageNum,
        updatedAt: Date.now()
      },
      khatmas: khatmasStr ? JSON.parse(khatmasStr) : [],
      awrad: awradStr ? JSON.parse(awradStr) : [],
      pageBookmarks: pageBookmarksStr ? JSON.parse(pageBookmarksStr) : [],
      userQuranData: userQuranDataStr ? JSON.parse(userQuranDataStr) : {},
      userData: pageUserDataStr ? JSON.parse(pageUserDataStr) : {},
      quranMultiPlans: quranPlansStr ? JSON.parse(quranPlansStr) : [],
      totalKhatmaProgress: totalKhatmaProg,
      wirdHifz: hifzPref.value ? JSON.parse(hifzPref.value) : null,
      wirdRevNear: revNearPref.value ? JSON.parse(revNearPref.value) : null,
      wirdRevFar: revFarPref.value ? JSON.parse(revFarPref.value) : null,
      updatedAt: Date.now()
    };

    const ref = getQuranStateDocRef(userId);
    await setDoc(ref, payload, { merge: true });
    console.log('[CloudSync] Full snapshot synced to Firestore for user:', userId);
  } catch (err) {
    console.warn('[CloudSync] Failed to sync full state:', err);
  }
}

/**
 * Restores user data from Firebase Firestore into localStorage and Capacitor Preferences.
 * Invoked on login and on app startup.
 * If user reinstalled the app, this restores all progress (Khatmas, Awrad, last read page).
 */
export async function restoreUserDataFromCloud(userId: string): Promise<boolean> {
  if (!userId || !navigator.onLine) return false;

  try {
    const ref = getQuranStateDocRef(userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // First time user or no remote state yet; push whatever local state exists
      void syncAllLocalStateToCloud(userId);
      return false;
    }

    const data = snap.data() as CloudQuranState;
    console.log('[CloudSync] Found remote state for user:', userId, data);

    let hasRestoredAny = false;

    // 1. Restore Last Read Position
    if (data.lastReadPosition?.pageNumber && data.lastReadPosition.pageNumber > 0) {
      const localPage = Number(localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_READ_PAGE) || 0);
      // If local is empty (fresh install) or remote is newer, restore remote page
      if (localPage <= 1 || (data.lastReadPosition.updatedAt && data.lastReadPosition.updatedAt > (Number(localStorage.getItem('quranLastReadTime') || 0)))) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_READ_PAGE, String(data.lastReadPosition.pageNumber));
        localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_READ_PAGE_ALT, String(data.lastReadPosition.pageNumber));
        if (data.lastReadPosition.updatedAt) {
          localStorage.setItem('quranLastReadTime', String(data.lastReadPosition.updatedAt));
        }
        hasRestoredAny = true;
      }
    }

    // 2. Restore Khatmas
    if (Array.isArray(data.khatmas) && data.khatmas.length > 0) {
      const localKhatmasStr = localStorage.getItem(LOCAL_STORAGE_KEYS.KHATMAS);
      const localKhatmas = localKhatmasStr ? JSON.parse(localKhatmasStr) : [];
      
      // Merge remote khatmas if local is empty or remote has more/newer
      if (localKhatmas.length === 0) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.KHATMAS, JSON.stringify(data.khatmas));
        hasRestoredAny = true;
      } else {
        // Merge by id
        const mergedMap = new Map<string, any>();
        localKhatmas.forEach((k: any) => mergedMap.set(k.id, k));
        data.khatmas.forEach((rk: any) => {
          const local = mergedMap.get(rk.id);
          if (!local || (rk.lastReadDate && rk.lastReadDate > (local.lastReadDate || 0))) {
            mergedMap.set(rk.id, rk);
          }
        });
        localStorage.setItem(LOCAL_STORAGE_KEYS.KHATMAS, JSON.stringify(Array.from(mergedMap.values())));
      }
    }

    // 3. Restore Awrad (QuranReader Awrad)
    if (Array.isArray(data.awrad) && data.awrad.length > 0) {
      const localAwradStr = localStorage.getItem(LOCAL_STORAGE_KEYS.AWRAD);
      if (!localAwradStr) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.AWRAD, JSON.stringify(data.awrad));
        hasRestoredAny = true;
      }
    }

    // 4. Restore Wird Preferences (hifz, near, far)
    if (data.wirdHifz) {
      const localHifz = await Preferences.get({ key: PREFERENCES_KEYS.WIRD_HIFZ });
      if (!localHifz.value) {
        await Preferences.set({ key: PREFERENCES_KEYS.WIRD_HIFZ, value: JSON.stringify(data.wirdHifz) });
        hasRestoredAny = true;
      }
    }
    if (data.wirdRevNear) {
      const localNear = await Preferences.get({ key: PREFERENCES_KEYS.WIRD_REV_NEAR });
      if (!localNear.value) {
        await Preferences.set({ key: PREFERENCES_KEYS.WIRD_REV_NEAR, value: JSON.stringify(data.wirdRevNear) });
        hasRestoredAny = true;
      }
    }
    if (data.wirdRevFar) {
      const localFar = await Preferences.get({ key: PREFERENCES_KEYS.WIRD_REV_FAR });
      if (!localFar.value) {
        await Preferences.set({ key: PREFERENCES_KEYS.WIRD_REV_FAR, value: JSON.stringify(data.wirdRevFar) });
        hasRestoredAny = true;
      }
    }

    // 5. Restore Bookmarks & Annotations
    if (Array.isArray(data.pageBookmarks) && data.pageBookmarks.length > 0) {
      const localBmStr = localStorage.getItem(LOCAL_STORAGE_KEYS.PAGE_BOOKMARKS);
      if (!localBmStr || JSON.parse(localBmStr).length === 0) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.PAGE_BOOKMARKS, JSON.stringify(data.pageBookmarks));
        hasRestoredAny = true;
      }
    }

    if (data.userQuranData && Object.keys(data.userQuranData).length > 0) {
      const localUqd = localStorage.getItem(LOCAL_STORAGE_KEYS.USER_QURAN_DATA);
      if (!localUqd) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.USER_QURAN_DATA, JSON.stringify(data.userQuranData));
        hasRestoredAny = true;
      }
    }

    if (data.userData && Object.keys(data.userData).length > 0) {
      const localUd = localStorage.getItem(LOCAL_STORAGE_KEYS.PAGE_USER_DATA);
      if (!localUd) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.PAGE_USER_DATA, JSON.stringify(data.userData));
        hasRestoredAny = true;
      }
    }

    // 6. Restore Plans
    if (Array.isArray(data.quranMultiPlans) && data.quranMultiPlans.length > 0) {
      const localPlans = localStorage.getItem(LOCAL_STORAGE_KEYS.QURAN_PLANS);
      if (!localPlans || JSON.parse(localPlans).length === 0) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.QURAN_PLANS, JSON.stringify(data.quranMultiPlans));
        hasRestoredAny = true;
      }
    }

    // 7. Restore Total Khatma Progress
    if (typeof data.totalKhatmaProgress === 'number') {
      const localProg = Number(localStorage.getItem(LOCAL_STORAGE_KEYS.TOTAL_KHATMA_PROGRESS) || 0);
      if (localProg === 0 && data.totalKhatmaProgress > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.TOTAL_KHATMA_PROGRESS, String(data.totalKhatmaProgress));
        hasRestoredAny = true;
      }
    }

    // Dispatch notification events for components listening
    if (hasRestoredAny) {
      window.dispatchEvent(new CustomEvent('quran-progress-updated'));
      window.dispatchEvent(new CustomEvent('quran-cloud-synced', { detail: data }));
      console.log('[CloudSync] State restored into local storage successfully!');
    }

    return hasRestoredAny;
  } catch (err) {
    console.error('[CloudSync] Error restoring user data from cloud:', err);
    return false;
  }
}
