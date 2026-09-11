import localforage from 'localforage';

const store = localforage.createInstance({
  name: 'ifaqa',
  storeName: 'reciter_portraits',
  description: 'Locally cached reciter portraits',
});

const objectUrls = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

const keyFor = (name: string) => `portrait_${name.normalize('NFKC')}`;

export const reciterImageCache = {
  async get(name: string): Promise<string | null> {
    const key = keyFor(name);
    const existing = objectUrls.get(key);
    if (existing) return existing;
    const blob = await store.getItem<Blob>(key);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    objectUrls.set(key, url);
    return url;
  },

  async remember(name: string, remoteUrl: string): Promise<string | null> {
    const key = keyFor(name);
    const existing = objectUrls.get(key);
    if (existing) return existing;
    const active = pending.get(key);
    if (active) return active;

    const task = fetch(remoteUrl)
      .then(response => {
        if (!response.ok) throw new Error(`Portrait request failed: ${response.status}`);
        return response.blob();
      })
      .then(async blob => {
        if (!blob.type.startsWith('image/')) return null;
        await store.setItem(key, blob);
        const localUrl = URL.createObjectURL(blob);
        objectUrls.set(key, localUrl);
        return localUrl;
      })
      .catch(() => null)
      .finally(() => pending.delete(key));

    pending.set(key, task);
    return task;
  },
};
