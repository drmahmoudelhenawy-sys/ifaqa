import { Preferences } from '@capacitor/preferences';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { quranSurahs } from '../../quranMetadata';
import { db, auth } from '../../services/firebase';
import { APP_ID } from '../../constants';
import { getProphetChallengeSchedule } from './prophetChallengeSchedule';

const PRAYER_MAP_WIDGET_TO_APP: Record<number, string> = {
  0: 'none',
  1: 'jamaah',
  2: 'ontime',
  3: 'late'
};

const PRAYER_MAP_APP_TO_WIDGET: Record<string, number> = {
  'none': 0,
  'jamaah': 1,
  'ontime': 2,
  'late': 3,
  'qada': 3 // Map qada to late in widget
};

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const startTrackerSync = (userId: string) => {
  const today = getLocalDateString();
  const dailyRef = doc(db, 'artifacts', APP_ID, 'users', userId, 'daily', today);

  // 1. Listen to Firestore and sync to Preferences
  const unsubFirestore = onSnapshot(dailyRef, async (docSnap) => {
    if (docSnap.exists()) {
      const fbData = docSnap.data();
      const widgetData: Record<string, any> = {};
      
      const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      prayers.forEach(p => {
        widgetData[p] = {
          state: PRAYER_MAP_APP_TO_WIDGET[fbData[p]] || 0,
          sunnahDone: fbData[`${p}_sunan_pre`] || fbData[`${p}_sunan_post`] || false
        };
      });

      await Preferences.set({
        key: `ifaqa_tracker_${today}`,
        value: JSON.stringify(widgetData)
      });
    }
  });

  return () => {
    unsubFirestore();
  };
};

export const startProphetSync = (userId: string) => {
  const schedule = getProphetChallengeSchedule();
  const period = schedule.periodKey;
  const prophetRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'prophet_v2', period, 'users', userId);

  const unsub = onSnapshot(prophetRef, async (snap) => {
    if (snap.exists()) {
      const count = snap.data().count || 0;
      await Preferences.set({ key: 'ifaqa_salat_period', value: period });
      await Preferences.set({ key: 'ifaqa_salat_count', value: String(count) });
    }
  });

  return unsub;
};

export const startGeneralCounterSync = (userId: string) => {
  const counterRef = doc(db, 'artifacts', APP_ID, 'users', userId, 'stats', 'counters');

  const unsub = onSnapshot(counterRef, async (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      await Preferences.set({ key: 'ifaqa_general_counters', value: JSON.stringify(data) });
    }
  });

  return unsub;
};

export const syncWidgetToFirestore = async (userId: string) => {
  const today = getLocalDateString();
  const saved = await Preferences.get({ key: `ifaqa_tracker_${today}` });
  
  if (saved.value) {
    const widgetData = JSON.parse(saved.value);
    const fbUpdate: Record<string, any> = {};
    
    Object.keys(widgetData).forEach(p => {
      const state = widgetData[p].state;
      fbUpdate[p] = PRAYER_MAP_WIDGET_TO_APP[state] || 'none';
      if (widgetData[p].sunnahDone) {
        // Simple mapping: if sunnahDone is true, we mark the first available sunnah as done
        fbUpdate[`${p}_sunan_pre`] = true;
      }
    });

    const dailyRef = doc(db, 'artifacts', APP_ID, 'users', userId, 'daily', today);
    await setDoc(dailyRef, fbUpdate, { merge: true });
  }
};

export const syncProphetToFirestore = async (userId: string) => {
  const schedule = getProphetChallengeSchedule();
  const period = schedule.periodKey;
  
  const savedPeriod = await Preferences.get({ key: 'ifaqa_salat_period' });
  // If the stored count was for an old day or expired period, reset it and DO NOT upload old counts!
  if (savedPeriod.value !== period) {
    await Preferences.set({ key: 'ifaqa_salat_period', value: period });
    await Preferences.set({ key: 'ifaqa_salat_count', value: '0' });
    return;
  }

  const saved = await Preferences.get({ key: 'ifaqa_salat_count' });
  if (saved.value) {
    const count = parseInt(saved.value, 10);
    if (!isNaN(count) && count > 0) {
      const prophetRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'prophet_v2', period, 'users', userId);
      await setDoc(prophetRef, { count, lastUpdate: new Date().getTime() }, { merge: true });
    }
  }
};

export const startQuranSync = (userId: string) => {
  const quranRef = doc(db, 'artifacts', APP_ID, 'users', userId, 'quran_state', 'main');

  const unsub = onSnapshot(quranRef, async (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const bookmarks = data.bookmarks || {};
      
      const getWirdItem = (bm: any) => {
        const s = quranSurahs.find(surah => surah.number === bm.surah);
        return {
          surahName: s ? s.name : 'البقرة',
          juzNumber: s ? Math.floor((s.startPage - 2) / 20) + 1 : 1, // Rough juz calc
          pageNumber: s ? s.startPage : 1
        };
      };

      if (bookmarks.new_hifz) {
          const item = getWirdItem(bookmarks.new_hifz);
          await Preferences.set({ key: 'user_wird_hifz', value: JSON.stringify({ ...item, percent: 0, surahIndex: bookmarks.new_hifz.surah }) });
      }
      if (bookmarks.near_review) {
          const item = getWirdItem(bookmarks.near_review);
          await Preferences.set({ key: 'user_wird_rev_near_data', value: JSON.stringify(item) });
      }
      if (bookmarks.far_review) {
          const item = getWirdItem(bookmarks.far_review);
          await Preferences.set({ key: 'user_wird_rev_far_data', value: JSON.stringify(item) });
      }

      if (data.lastReadPosition?.pageNumber) {
        const local = Number(localStorage.getItem('quranLastReadPage') || 0);
        if (local <= 1) {
          localStorage.setItem('quranLastReadPage', String(data.lastReadPosition.pageNumber));
          localStorage.setItem('lastReadQuranPage', String(data.lastReadPosition.pageNumber));
          window.dispatchEvent(new CustomEvent('quran-progress-updated'));
        }
      }

      if (Array.isArray(data.khatmas) && data.khatmas.length > 0) {
        const localK = localStorage.getItem('user_khatmas');
        if (!localK || JSON.parse(localK).length === 0) {
          localStorage.setItem('user_khatmas', JSON.stringify(data.khatmas));
          window.dispatchEvent(new CustomEvent('quran-progress-updated'));
        }
      }
    }
  });

  return unsub;
};
