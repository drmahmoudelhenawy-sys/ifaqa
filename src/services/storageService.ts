import localforage from 'localforage';

export const storageService = {
  async saveLastPage(pageNumber: number) {
    try {
      await localforage.setItem('last_quran_page', pageNumber);
    } catch (e) {
      console.error('Error saving last page', e);
    }
  },

  async getLastPage(): Promise<number | null> {
    try {
      return await localforage.getItem('last_quran_page');
    } catch (e) {
      console.error('Error getting last page', e);
      return null;
    }
  },

  async saveTheme(theme: string) {
    try {
      await localforage.setItem('user_theme', theme);
    } catch (e) {
      console.error('Error saving theme', e);
    }
  },

  async getTheme(): Promise<string | null> {
    try {
      return await localforage.getItem('user_theme');
    } catch (e) {
      console.error('Error getting theme', e);
      return null;
    }
  }
};
