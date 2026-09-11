import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { APP_ID, ALL_CHALLENGES } from '../../constants';
import { Challenge } from '../../types';

const CACHE_KEY = 'ifaqa_cached_daily_challenges';

export const dailyChallengesService = {
  /**
   * Get cached challenges or fallback to default constants
   */
  getCachedChallenges(): Challenge[] {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read cached challenges:', e);
    }
    return [...ALL_CHALLENGES];
  },

  /**
   * Cache challenges to localStorage
   */
  cacheChallenges(challenges: Challenge[]) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(challenges));
    } catch (e) {
      console.warn('Failed to cache challenges:', e);
    }
  },

  /**
   * Firestore doc reference
   */
  getDocRef() {
    return doc(db, 'artifacts', APP_ID, 'public', 'data', 'app_config', 'daily_challenges');
  },

  /**
   * Subscribe to real-time daily challenges updates
   */
  subscribeToChallenges(callback: (challenges: Challenge[]) => void): () => void {
    // Notify immediately with cached/default
    callback(this.getCachedChallenges());

    const docRef = this.getDocRef();
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.challenges) && data.challenges.length > 0) {
          this.cacheChallenges(data.challenges);
          callback(data.challenges);
          return;
        }
      }
      // If doc does not exist yet, fallback to default
      const defaults = [...ALL_CHALLENGES];
      this.cacheChallenges(defaults);
      callback(defaults);
    }, (error) => {
      console.warn('Daily challenges snapshot error:', error);
      callback(this.getCachedChallenges());
    });

    return unsubscribe;
  },

  /**
   * Save the full challenges list to Firestore & cache
   */
  async saveChallenges(challenges: Challenge[]): Promise<void> {
    const docRef = this.getDocRef();
    await setDoc(docRef, {
      challenges,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    this.cacheChallenges(challenges);
  },

  /**
   * Add a new challenge
   */
  async addChallenge(title: string, xp: number): Promise<Challenge[]> {
    const current = this.getCachedChallenges();
    const newChallenge: Challenge = {
      id: `ch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      xp: Math.max(10, Math.round(Number(xp) || 100))
    };

    const updated = [newChallenge, ...current];
    await this.saveChallenges(updated);
    return updated;
  },

  /**
   * Update an existing challenge (title or xp)
   */
  async updateChallenge(id: string, updates: Partial<Omit<Challenge, 'id'>>): Promise<Challenge[]> {
    const current = this.getCachedChallenges();
    const updated = current.map(ch => {
      if (ch.id === id) {
        return {
          ...ch,
          ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
          ...(updates.xp !== undefined ? { xp: Math.max(10, Math.round(Number(updates.xp) || 100)) } : {})
        };
      }
      return ch;
    });

    await this.saveChallenges(updated);
    return updated;
  },

  /**
   * Delete a challenge by id
   */
  async deleteChallenge(id: string): Promise<Challenge[]> {
    const current = this.getCachedChallenges();
    const updated = current.filter(ch => ch.id !== id);
    await this.saveChallenges(updated);
    return updated;
  },

  /**
   * Reset to default ALL_CHALLENGES
   */
  async resetToDefaults(): Promise<Challenge[]> {
    const defaults = [...ALL_CHALLENGES];
    await this.saveChallenges(defaults);
    return defaults;
  }
};
