import { Preferences } from '@capacitor/preferences';
import { auth } from '../../services/firebase';
import { syncWirdItemToCloud } from './userCloudSyncService';

export interface WirdItem {
  surahName: string;
  juzNumber: number;
  pageNumber: number;
}

export interface WirdHifz extends WirdItem {
  percent: number;
  surahIndex: number;
}

export const saveWirdHifz = async (data: WirdHifz) => {
  await Preferences.set({
    key: 'user_wird_hifz',
    value: JSON.stringify(data)
  });

  const currentUser = auth.currentUser;
  if (currentUser?.uid) {
    syncWirdItemToCloud(currentUser.uid, 'hifz', data);
  }
};

export const saveWirdRevisionData = async (type: 'near' | 'far', data: WirdItem) => {
  await Preferences.set({
    key: type === 'near' ? 'user_wird_rev_near_data' : 'user_wird_rev_far_data',
    value: JSON.stringify(data)
  });

  const currentUser = auth.currentUser;
  if (currentUser?.uid) {
    syncWirdItemToCloud(currentUser.uid, type, data);
  }
};

// Initial mock data if empty
export const initializeWirdData = async () => {
  const hifz = await Preferences.get({ key: 'user_wird_hifz' });
  if (!hifz.value) {
    await saveWirdHifz({
      surahName: 'الملك',
      juzNumber: 29,
      pageNumber: 562,
      percent: 61,
      surahIndex: 67
    });
    
    await saveWirdRevisionData('near', {
      surahName: 'النبأ',
      juzNumber: 30,
      pageNumber: 582
    });

    await saveWirdRevisionData('far', {
      surahName: 'يس',
      juzNumber: 23,
      pageNumber: 440
    });
  }
};
