import localforage from 'localforage';

export const getOfflineQuran = async <T = unknown>(): Promise<T> => {
  const data = await localforage.getItem<T>('quran_data');
  return data || {} as T;
};

export const getOfflineTafsir = async <T = unknown>(): Promise<T> => {
  const data = await localforage.getItem<T>('tafsir_data');
  return data || {} as T;
};

export const getOfflineAthkar = async <T = unknown>(): Promise<T> => {
  const data = await localforage.getItem<T>('athkar_data');
  return data || {} as T;
};
