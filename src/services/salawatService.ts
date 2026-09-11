import { Preferences } from '@capacitor/preferences';

const SALAWAT_KEY = 'salawat_count';

export const salawatService = {
  async getCount(): Promise<number> {
    const { value } = await Preferences.get({ key: SALAWAT_KEY });
    return parseInt(value || '0');
  },

  async increment(): Promise<number> {
    const current = await this.getCount();
    const next = current + 1;
    await Preferences.set({ key: SALAWAT_KEY, value: next.toString() });
    return next;
  },

  async setCount(count: number): Promise<void> {
    await Preferences.set({ key: SALAWAT_KEY, value: count.toString() });
  }
};
