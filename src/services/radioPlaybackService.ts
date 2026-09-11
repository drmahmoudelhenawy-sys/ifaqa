import Hls from 'hls.js';
import { LOGO_COLORED } from '../../constants';
import type { RadioStation } from './radioService';
import { Preferences } from '@capacitor/preferences';
import { nativeQuranAudio, shouldUseNativeQuranAudio } from './nativeQuranAudio';

export interface RadioPlaybackState {
  currentStation: RadioStation | null;
  isPlaying: boolean;
  isBuffering: boolean;
  error: string | null;
  volume: number;
}

type RadioPlaybackListener = (state: RadioPlaybackState) => void;

const STORAGE_KEY = 'ifaqaa_radio_station';
const PLAYBACK_TIMEOUT_MS = 12000;

const audio = new Audio();
audio.preload = 'none';

let hls: Hls | null = null;
let loadedSourceUrl = '';
let stationQueue: RadioStation[] = [];
let currentCandidateUrls: string[] = [];
let currentSourceIndex = 0;
let playbackTimeoutId: number | null = null;
let shouldResumePlayback = false;
let failoverInProgress = false;

let playbackState: RadioPlaybackState = {
  currentStation: null,
  isPlaying: false,
  isBuffering: false,
  error: null,
  volume: 1,
};

const listeners = new Set<RadioPlaybackListener>();

function emitChange() {
  for (const listener of listeners) {
    listener(playbackState);
  }
}

function patchState(partial: Partial<RadioPlaybackState>) {
  playbackState = { ...playbackState, ...partial };
  emitChange();
  
  // Sync state to Widget
  Preferences.set({
    key: 'user_radio_state',
    value: JSON.stringify({
      stationName: playbackState.currentStation?.name || 'البث المباشر',
      isPlaying: playbackState.isPlaying,
    })
  }).catch(() => {});
}

function persistCurrentStation(station: RadioStation | null) {
  if (!station) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(station));
}

function normalizeStreamUrl(url: string) {
  return url.replace(/&amp;/g, '&').trim();
}

function buildCandidateUrls(station: RadioStation) {
  return [station.url, ...(station.fallbackUrls || [])]
    .map(normalizeStreamUrl)
    .filter(Boolean)
    .filter((url, index, all) => all.indexOf(url) === index);
}

function clearPlaybackTimeout() {
  if (playbackTimeoutId !== null) {
    window.clearTimeout(playbackTimeoutId);
    playbackTimeoutId = null;
  }
}

function startPlaybackTimeout() {
  clearPlaybackTimeout();
  playbackTimeoutId = window.setTimeout(() => {
    void failoverOrSetError('استغرق البث وقتًا أطول من المتوقع. جارٍ تجربة مصدر بديل...');
  }, PLAYBACK_TIMEOUT_MS);
}

function updateMediaSessionMetadata() {
  if (!('mediaSession' in navigator)) {
    return;
  }

  if (!playbackState.currentStation) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    return;
  }

  navigator.mediaSession.metadata = new MediaMetadata({
    title: playbackState.currentStation.name,
    artist: 'إذاعة القرآن الكريم',
    album: 'تطبيق إفاقة',
    artwork: [{ src: LOGO_COLORED, sizes: '512x512', type: 'image/png' }],
  });
  navigator.mediaSession.playbackState = playbackState.isPlaying ? 'playing' : 'paused';
}

function clearHlsInstance() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
}

function setAudioSource(url: string) {
  clearHlsInstance();
  clearPlaybackTimeout();
  loadedSourceUrl = url;

  const isHls = url.toLowerCase().includes('.m3u8');

  if (isHls) {
    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = url;
      return;
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });
      hls.loadSource(url);
      hls.attachMedia(audio);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              void failoverOrSetError('تعذر تشغيل البث المباشر من هذا المصدر. جارٍ تجربة مصدر بديل...');
              break;
          }
        }
      });
      return;
    }
  }

  audio.src = url;
}

async function useCurrentSource(autoplay: boolean) {
  const url = currentCandidateUrls[currentSourceIndex];
  if (!url) {
    throw new Error('No radio source available');
  }

  if (shouldUseNativeQuranAudio()) {
    clearPlaybackTimeout();
    loadedSourceUrl = url;
    if (autoplay) {
      startPlaybackTimeout();
      await nativeQuranAudio.playUrl({
        url,
        title: playbackState.currentStation?.name || 'إذاعة القرآن الكريم',
        artist: 'البث المباشر',
        album: 'إذاعات القرآن الكريم',
        speed: 1,
        position: 0,
      });
    }
    return;
  }

  setAudioSource(url);
  audio.load();

  if (autoplay) {
    startPlaybackTimeout();
    await audio.play();
  }
}

async function failoverOrSetError(intermediateMessage?: string) {
  if (!playbackState.currentStation || failoverInProgress) {
    return false;
  }

  if (currentSourceIndex < currentCandidateUrls.length - 1) {
    failoverInProgress = true;
    currentSourceIndex += 1;

    patchState({
      isPlaying: false,
      isBuffering: true,
      error: intermediateMessage || 'جارٍ تجربة مصدر بديل للبث...',
    });
    updateMediaSessionMetadata();

    try {
      await useCurrentSource(shouldResumePlayback);
      return true;
    } catch (error) {
      console.error('Radio fallback source failed:', error);
      return await failoverOrSetError(intermediateMessage);
    } finally {
      failoverInProgress = false;
    }
  }

  clearPlaybackTimeout();
  patchState({
    isPlaying: false,
    isBuffering: false,
    error: 'تعذر تشغيل البث الآن. جرّب مرة أخرى لاحقًا أو اختر محطة أخرى.',
  });
  updateMediaSessionMetadata();
  return false;
}

function configureMediaSessionHandlers() {
  if (!('mediaSession' in navigator)) {
    return;
  }

  navigator.mediaSession.setActionHandler('play', () => {
    void radioPlaybackService.play();
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    radioPlaybackService.pause();
  });
  navigator.mediaSession.setActionHandler('stop', () => {
    radioPlaybackService.pause();
  });
  navigator.mediaSession.setActionHandler('nexttrack', () => {
    radioPlaybackService.playAdjacentStation(1);
  });
  navigator.mediaSession.setActionHandler('previoustrack', () => {
    radioPlaybackService.playAdjacentStation(-1);
  });
}

audio.addEventListener('loadstart', () => {
  patchState({ isBuffering: true, error: null });
  updateMediaSessionMetadata();
  if (shouldResumePlayback) {
    startPlaybackTimeout();
  }
});

audio.addEventListener('waiting', () => {
  patchState({ isBuffering: true });
  updateMediaSessionMetadata();
  if (shouldResumePlayback) {
    startPlaybackTimeout();
  }
});

audio.addEventListener('playing', () => {
  clearPlaybackTimeout();
  patchState({ isPlaying: true, isBuffering: false, error: null });
  updateMediaSessionMetadata();
});

audio.addEventListener('pause', () => {
  clearPlaybackTimeout();
  patchState({ isPlaying: false, isBuffering: false });
  updateMediaSessionMetadata();
});

audio.addEventListener('error', () => {
  void failoverOrSetError('فشل المصدر الحالي. جارٍ تجربة مصدر بديل...');
});

configureMediaSessionHandlers();

if (typeof window !== 'undefined' && shouldUseNativeQuranAudio()) {
  nativeQuranAudio.listen((state) => {
    clearPlaybackTimeout();
    patchState({
      isPlaying: state.isPlaying,
      isBuffering: state.isBuffering,
      error: null,
    });
    updateMediaSessionMetadata();
  }).catch(() => {});
}

export const radioPlaybackService = {
  subscribe(listener: RadioPlaybackListener) {
    listeners.add(listener);
    listener(playbackState);

    return () => {
      listeners.delete(listener);
    };
  },

  getState(): RadioPlaybackState {
    return playbackState;
  },

  setStations(stations: RadioStation[]) {
    stationQueue = stations;

    if (!playbackState.currentStation) {
      const savedStation = localStorage.getItem(STORAGE_KEY);
      if (!savedStation) {
        return;
      }

      try {
        const parsedStation = JSON.parse(savedStation) as RadioStation;
        const matchedStation = stations.find((station) => station.id === parsedStation.id) || parsedStation;
        patchState({ currentStation: matchedStation });
        currentCandidateUrls = buildCandidateUrls(matchedStation);
        currentSourceIndex = 0;
        updateMediaSessionMetadata();
      } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  },

  async selectStation(station: RadioStation, autoplay = false) {
    currentCandidateUrls = buildCandidateUrls(station);
    currentSourceIndex = 0;
    shouldResumePlayback = autoplay;

    persistCurrentStation(station);
    patchState({
      currentStation: station,
      error: null,
      isPlaying: false,
      isBuffering: autoplay,
    });
    updateMediaSessionMetadata();

    try {
      await useCurrentSource(autoplay);
    } catch (error) {
      console.error('Station selection error:', error);
      await failoverOrSetError('تعذر تشغيل المصدر الأساسي. جارٍ تجربة مصدر بديل...');
    }
  },

  async play() {
    if (!playbackState.currentStation) {
      return;
    }

    shouldResumePlayback = true;
    patchState({ isBuffering: true, error: null });
    updateMediaSessionMetadata();

    try {
      if (!currentCandidateUrls.length) {
        currentCandidateUrls = buildCandidateUrls(playbackState.currentStation);
      }

      if (shouldUseNativeQuranAudio()) {
        const url = currentCandidateUrls[currentSourceIndex];
        if (url) {
          await nativeQuranAudio.playUrl({
            url,
            title: playbackState.currentStation.name,
            artist: 'البث المباشر',
            album: 'إذاعات القرآن الكريم',
            speed: 1,
            position: 0,
          });
          return;
        }
      }

      if (!loadedSourceUrl || loadedSourceUrl !== currentCandidateUrls[currentSourceIndex]) {
        await useCurrentSource(false);
      }

      startPlaybackTimeout();
      await audio.play();
    } catch (error) {
      console.error('Radio playback error:', error);
      const recovered = await failoverOrSetError('فشل تشغيل البث من هذا المصدر. جارٍ تجربة البديل...');
      if (!recovered) {
        throw error;
      }
    }
  },

  pause() {
    shouldResumePlayback = false;
    clearPlaybackTimeout();
    if (shouldUseNativeQuranAudio()) {
      void nativeQuranAudio.pause();
    }
    audio.pause();
    patchState({ isPlaying: false, isBuffering: false });
  },

  async togglePlay() {
    if (playbackState.isPlaying) {
      this.pause();
      return;
    }

    await this.play();
  },

  setVolume(volume: number) {
    const safeVolume = Math.min(1, Math.max(0, volume));
    audio.volume = safeVolume;
    patchState({ volume: safeVolume });
  },

  playAdjacentStation(direction: 1 | -1) {
    if (!playbackState.currentStation || stationQueue.length === 0) {
      return;
    }

    const currentIndex = stationQueue.findIndex((station) => station.id === playbackState.currentStation?.id);
    if (currentIndex === -1) {
      return;
    }

    const nextIndex = (currentIndex + direction + stationQueue.length) % stationQueue.length;
    void this.selectStation(stationQueue[nextIndex], true);
  },
};
