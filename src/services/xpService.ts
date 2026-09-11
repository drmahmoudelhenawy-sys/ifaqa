import { doc, increment, updateDoc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { APP_ID, TIERS } from '../../constants';
import { hapticSuccess } from './haptics';
import toast from 'react-hot-toast';

export interface PendingXPEntry {
  id: string;
  amount: number;
  label: string;
  category?: 'quran' | 'salat' | 'athkar' | 'challenge' | 'general';
  timestamp: number;
}

const LOCAL_CACHED_XP_KEY = 'ifaqa_cached_user_xp_';
const PENDING_XP_QUEUE_KEY = 'ifaqa_pending_xp_queue_v2';
const LEGACY_PENDING_KEY = 'ifaqa_pending_xp';

let isSyncing = false;
const listeners = new Set<(pendingAmount: number, entries: PendingXPEntry[]) => void>();

export const getCachedXP = (userId?: string): number => {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return 0;
  const val = localStorage.getItem(LOCAL_CACHED_XP_KEY + uid);
  const parsed = val ? Number(val) : 0;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const setCachedXP = (userId: string, xp: number): void => {
  if (!userId || !Number.isFinite(xp)) return;
  localStorage.setItem(LOCAL_CACHED_XP_KEY + userId, String(Math.max(0, Math.round(xp))));
};

const getStoredNumber = (key: string): number => {
  const value = localStorage.getItem(key);
  const parsedValue = value ? Number(value) : 0;
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

export const getPendingXPQueue = (): PendingXPEntry[] => {
  const value = localStorage.getItem(PENDING_XP_QUEUE_KEY);
  if (!value) return [];
  try {
    const parsedValue = JSON.parse(value);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

export const getPendingXPAmount = (): number => {
  const pendingXPQueue = getPendingXPQueue();
  // Purge legacy key so it never causes duplicate summation or ghost counts
  localStorage.removeItem(LEGACY_PENDING_KEY);
  if (pendingXPQueue.length > 0) {
    return pendingXPQueue.reduce((total, entry) => total + (entry.amount || 0), 0);
  }
  return 0;
};

const notifyListeners = () => {
  const amount = getPendingXPAmount();
  const entries = getPendingXPQueue();
  listeners.forEach((fn) => fn(amount, entries));
};

export const queueOfflineXP = (
  userId: string,
  amount: number,
  label = 'طاعة منجزة أثناء عدم الاتصال',
  category: PendingXPEntry['category'] = 'general'
): number => {
  if (!userId || amount <= 0) return getCachedXP(userId);

  // 1. Update local cached XP
  const currentCached = getCachedXP(userId);
  const newTotal = currentCached + amount;
  setCachedXP(userId, newTotal);

  // 2. Add rich entry to pending queue (authoritative single source of truth)
  const pendingXPQueue = getPendingXPQueue();
  const newEntry: PendingXPEntry = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    amount,
    label,
    category,
    timestamp: Date.now(),
  };

  pendingXPQueue.unshift(newEntry);
  localStorage.setItem(PENDING_XP_QUEUE_KEY, JSON.stringify(pendingXPQueue));
  // Clean up legacy key so it never interferes or causes duplicate summation
  localStorage.removeItem(LEGACY_PENDING_KEY);

  console.log(`[XP Offline] Queued +${amount} XP (${label}) for ${userId}. New local total: ${newTotal}`);
  notifyListeners();
  return newTotal;
};

export const addXP = (
  userIdOrAmount: string | number,
  maybeAmountOrLabel?: number | string,
  maybeLabel = 'طاعة منجزة',
  category: PendingXPEntry['category'] = 'general'
): void => {
  const userId = typeof userIdOrAmount === 'string' ? userIdOrAmount : auth.currentUser?.uid;
  const amount = typeof userIdOrAmount === 'number' ? userIdOrAmount : (typeof maybeAmountOrLabel === 'number' ? maybeAmountOrLabel : 0);
  const label = typeof maybeAmountOrLabel === 'string' ? maybeAmountOrLabel : maybeLabel;

  if (!userId || amount <= 0) return;

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    void updateBackendXP(userId, amount)
      .then(() => {
        // Also update local cache
        const currentCached = getCachedXP(userId);
        setCachedXP(userId, currentCached + amount);
      })
      .catch(() => {
        queueOfflineXP(userId, amount, label, category);
      });
  } else {
    queueOfflineXP(userId, amount, label, category);
  }
};

export const updateBackendXP = async (userId: string, amount: number): Promise<void> => {
  if (!userId || amount <= 0) return;

  const userRef = doc(db, 'artifacts', APP_ID, 'users', userId, 'stats', 'profile');
  const xpIncrement = increment(amount);

  try {
    // Try updating profile
    await updateDoc(userRef, {
      xp: xpIncrement,
      lastActive: serverTimestamp(),
    });
  } catch (err: any) {
    // If document doesn't exist yet, set it with merge
    if (err?.code === 'not-found') {
      await setDoc(
        userRef,
        {
          xp: xpIncrement,
          lastActive: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      throw err;
    }
  }

  // Also sync to public leaderboard
  try {
    const profileSnap = await getDoc(userRef);
    if (profileSnap.exists()) {
      const data = profileSnap.data();
      if (data.showOnLeaderboard !== false) {
        const safeXP = data.xp || 0;
        const currentTier = TIERS.find((t) => safeXP >= t.min && safeXP <= t.max) || TIERS[TIERS.length - 1];

        const leaderboardData: any = {
          xp: safeXP,
          name: data.name || auth.currentUser?.displayName || 'مستخدم',
          tier: data.tier || currentTier.name || 'مبتدئ',
        };
        if (data.photoURL) leaderboardData.photoURL = data.photoURL;
        if (data.characterId) leaderboardData.characterId = data.characterId;
        if (data.userTitle) leaderboardData.userTitle = data.userTitle;

        await setDoc(
          doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaderboard', userId),
          leaderboardData,
          { merge: true }
        );
      }
    }
  } catch (error) {
    console.warn('[Leaderboard Sync] Non-critical leaderboard sync error:', error);
  }
};

/**
 * Call this on app mount AND whenever network reconnects.
 * Reads any pending XP from localStorage and flushes it to Firebase.
 */
export const syncPendingXP = async (_userId?: string, showCelebrationToast = true): Promise<boolean> => {
  const userId = _userId || auth.currentUser?.uid;
  if (!userId) return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (isSyncing) return false;

  const totalPendingXP = getPendingXPAmount();
  if (totalPendingXP <= 0) return false;

  isSyncing = true;
  console.log(`[XP Sync] Attempting to sync ${totalPendingXP} pending XP for user ${userId}...`);

  try {
    await updateBackendXP(userId, totalPendingXP);

    // Clear pending stores ONLY on verified success
    localStorage.removeItem(PENDING_XP_QUEUE_KEY);
    localStorage.removeItem(LEGACY_PENDING_KEY);

    console.log(`[XP Sync] Successfully synced ${totalPendingXP} pending XP for user ${userId}`);
    notifyListeners();

    if (showCelebrationToast) {
      hapticSuccess();
      toast.success(
        ` تم الاتصال بالإنترنت! تمت مزامنة +${totalPendingXP.toLocaleString('ar-EG')} نقطة XP بنجاح لحسابك وقائمة المتصدرين.`,
        { duration: 5000 }
      );
    }

    // Notify components that XP was synced
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ifaqa_xp_synced', {
          detail: { userId, amount: totalPendingXP },
        })
      );
    }

    return true;
  } catch (error) {
    console.warn('[XP Sync] Failed to sync pending XP; leaving in queue for next reconnect:', error);
    return false;
  } finally {
    isSyncing = false;
  }
};

/**
 * Subscribe to changes in offline pending XP amount and queue
 */
export const subscribePendingXP = (fn: (pendingAmount: number, entries: PendingXPEntry[]) => void): (() => void) => {
  listeners.add(fn);
  fn(getPendingXPAmount(), getPendingXPQueue());
  return () => {
    listeners.delete(fn);
  };
};
