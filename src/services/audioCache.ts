const AUDIO_CACHE_NAME = 'quran-audio-cache';

const getCacheRequest = (surahId: string): Request => {
  return new Request(`/offline-audio/${encodeURIComponent(surahId)}`);
};

export const downloadAudioForOffline = async (
  surahId: string,
  audioUrl: string,
): Promise<void> => {
  const response = await fetch(audioUrl);

  if (!response.ok) {
    throw new Error(`Failed to download audio for surah ${surahId}`);
  }

  const cache = await caches.open(AUDIO_CACHE_NAME);
  await cache.put(getCacheRequest(surahId), response);
};

export const getAudioUrl = async (
  surahId: string,
  onlineAudioUrl: string,
): Promise<string> => {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const cachedResponse = await cache.match(getCacheRequest(surahId));

  if (!cachedResponse) {
    return onlineAudioUrl;
  }

  const audioBlob = await cachedResponse.blob();
  return URL.createObjectURL(audioBlob);
};
