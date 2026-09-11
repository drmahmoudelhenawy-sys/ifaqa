import { scheduleDailyReminder } from './localNotifications';
import { auth } from '../../services/firebase';
import { syncKhatmasToCloud } from './userCloudSyncService';

export interface Khatma {
  id: string;
  title: string;
  totalDays: number;
  dailyPagesTarget: number;
  pagesRead: number;
  createdAt: number;
  lastReadDate: number;
}

const KHATMAS_KEY = 'user_khatmas';

export const getKhatmas = (): Khatma[] => {
  try {
    const data = localStorage.getItem(KHATMAS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const addKhatma = async (title: string, totalDays: number, reminderTime?: string): Promise<void> => {
  const khatmas = getKhatmas();
  const dailyPagesTarget = Math.ceil(604 / totalDays);
  
  const idNum = Date.now();
  const newKhatma: Khatma = {
    id: `khatma_${idNum}`,
    title: title || 'ختمة جديدة',
    totalDays,
    dailyPagesTarget,
    pagesRead: 0,
    createdAt: idNum,
    lastReadDate: idNum
  };

  khatmas.push(newKhatma);
  localStorage.setItem(KHATMAS_KEY, JSON.stringify(khatmas));

  const currentUser = auth.currentUser;
  if (currentUser?.uid) {
    syncKhatmasToCloud(currentUser.uid, khatmas);
  }

  if (reminderTime) {
    const [hour, minute] = reminderTime.split(':').map(Number);
    if (!isNaN(hour) && !isNaN(minute)) {
      const body = `حان موعد وردك اليومي من ${newKhatma.title}. لا تنسَ قراءة ${dailyPagesTarget} صفحات اليوم.`;
      await scheduleDailyReminder(Math.floor(idNum / 1000), newKhatma.title, body, hour, minute);
    }
  }
};

export const updateKhatmaProgress = (id: string, pagesRead: number): void => {
  const khatmas = getKhatmas();
  const index = khatmas.findIndex(k => k.id === id);
  if (index !== -1) {
    khatmas[index].pagesRead = Math.min(604, Math.max(0, pagesRead));
    khatmas[index].lastReadDate = Date.now();
    localStorage.setItem(KHATMAS_KEY, JSON.stringify(khatmas));

    const currentUser = auth.currentUser;
    if (currentUser?.uid) {
      syncKhatmasToCloud(currentUser.uid, khatmas);
    }
  }
};

export const deleteKhatma = (id: string): void => {
  const khatmas = getKhatmas().filter(k => k.id !== id);
  localStorage.setItem(KHATMAS_KEY, JSON.stringify(khatmas));

  const currentUser = auth.currentUser;
  if (currentUser?.uid) {
    syncKhatmasToCloud(currentUser.uid, khatmas);
  }
};
