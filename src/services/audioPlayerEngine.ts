import { AudioTrack, AmbientSound, AMBIENT_SOUNDS, QuranAudioHubService } from './quranAudioHubService';
import { quranSurahs } from '../../quranMetadata';
import { QuranAudioOfflineService } from './quranAudioOfflineService';
import { LocalAudioStorageService } from './localAudioStorageService';
import { nativeQuranAudio, shouldUseNativeQuranAudio, type NativePlaybackState } from './nativeQuranAudio';
import { QuranAudioStatsService } from './quranAudioStatsService';

export type RepeatMode = 'off' | 'repeat_one' | 'repeat_all';

export interface AudioPlayerState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  repeatMode: RepeatMode;
  ambientSound: AmbientSound;
  ambientVolume: number;
  sleepTimerRemaining: number | null; // seconds left
  sleepTimerTotal: number | null; // total minutes selected
  playlist: AudioTrack[];
  currentIndex: number;
  isFullScreenOpen: boolean;
}

export function sanitizeTrackDuration(track: AudioTrack | null, rawDuration: number): number {
  if (!rawDuration || !Number.isFinite(rawDuration) || rawDuration <= 0) return 0;
  if (!track) return rawDuration;

  // Specific fix for Surah Al-Fatiha (e.g. Minshawi corrupted header reporting ~1769s / 29.5 mins)
  if (track.surahNumber === 1) {
    if (rawDuration > 180) {
      return 52.5; // True realistic duration of Surah Al-Fatiha recitation
    }
  }

  // General Quran Surah sanity check (ayahCount * 95s max threshold for short/medium surahs)
  if (track.surahNumber > 0 && track.ayahCount > 0) {
    const maxRealisticSeconds = Math.max(120, track.ayahCount * 95);
    if (track.ayahCount <= 20 && rawDuration > maxRealisticSeconds) {
      return track.ayahCount * 7.5;
    }
  }

  return rawDuration;
}

type Listener = (state: AudioPlayerState) => void;

class AudioPlayerEngine {
  private audio: HTMLAudioElement | null = null;
  private ambientAudio: HTMLAudioElement | null = null;
  private listeners: Set<Listener> = new Set();
  private sleepTimerInterval: number | null = null;
  private statsTicker: any = null;
  private stopAtEndOfSurah: boolean = false;
  private wakeLockSentinel: any = null;
  private readonly nativeMode = shouldUseNativeQuranAudio();

  private state: AudioPlayerState = {
    currentTrack: null,
    isPlaying: false,
    isBuffering: false,
    currentTime: 0,
    duration: 0,
    playbackSpeed: 1,
    repeatMode: 'off',
    ambientSound: AMBIENT_SOUNDS[0],
    ambientVolume: 0.35,
    sleepTimerRemaining: null,
    sleepTimerTotal: null,
    playlist: [],
    currentIndex: 0,
    isFullScreenOpen: false,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      if (this.nativeMode) void this.initNativePlayback();
      else this.initAudioElements();
      const last = QuranAudioHubService.getLastPlayed();
      if (last) {
        this.state.currentTrack = last;
      }
      this.startStatsTicker();
    }
  }

  private async requestWebWakeLock() {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (!this.wakeLockSentinel) {
          this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
          this.wakeLockSentinel.addEventListener('release', () => {
            this.wakeLockSentinel = null;
          });
        }
      } catch {}
    }
  }

  private releaseWebWakeLock() {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release().catch(() => {});
      } catch {}
      this.wakeLockSentinel = null;
    }
  }

  private startStatsTicker() {
    if (this.statsTicker) return;
    this.statsTicker = setInterval(() => {
      if (this.state.isPlaying && this.state.currentTrack) {
        QuranAudioStatsService.recordListeningSeconds(this.state.currentTrack, 1);
      }
    }, 1000);
  }

  private async initNativePlayback() {
    try {
      await nativeQuranAudio.listen((nativeState: NativePlaybackState) => {
        this.state.isPlaying = nativeState.isPlaying;
        this.state.isBuffering = nativeState.isBuffering;
        this.state.currentTime = nativeState.currentTime;
        this.state.duration = sanitizeTrackDuration(this.state.currentTrack, nativeState.duration);
        if (nativeState.currentIndex >= 0 && nativeState.currentIndex < this.state.playlist.length) {
          this.state.currentIndex = nativeState.currentIndex;
          const nextTrack = this.state.playlist[nativeState.currentIndex];
          if (nextTrack && nextTrack.audioUrl !== this.state.currentTrack?.audioUrl) {
            this.state.currentTrack = nextTrack;
            QuranAudioHubService.saveLastPlayed(nextTrack);
          }
        }
        this.notify();
      });

      await nativeQuranAudio.onCompleted(() => {
        if (this.state.currentTrack) {
          QuranAudioStatsService.recordSurahCompletion(this.state.currentTrack);
        }
        if (this.stopAtEndOfSurah) {
          this.clearSleepTimer();
          void nativeQuranAudio.pause().catch(() => {});
        }
      });
    } catch (error) {
      console.warn('Native Quran audio bridge is unavailable', error);
    }
  }

  private initAudioElements() {
    this.audio = new Audio();
    this.audio.preload = 'auto';

    this.ambientAudio = new Audio();
    this.ambientAudio.loop = true;
    this.ambientAudio.volume = this.state.ambientVolume;

    // Audio event listeners
    this.audio.addEventListener('play', () => {
      this.state.isPlaying = true;
      this.state.isBuffering = false;
      this.requestWebWakeLock();
      if (this.state.ambientSound.audioUrl && this.ambientAudio) {
        this.ambientAudio.play().catch(() => {});
      }
      this.updateMediaSession();
      this.notify();
    });

    this.audio.addEventListener('pause', () => {
      this.state.isPlaying = false;
      this.releaseWebWakeLock();
      if (this.ambientAudio) {
        this.ambientAudio.pause();
      }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      this.notify();
    });

    this.audio.addEventListener('waiting', () => {
      this.state.isBuffering = true;
      this.notify();
    });

    this.audio.addEventListener('playing', () => {
      this.state.isBuffering = false;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      this.notify();
    });

    this.audio.addEventListener('timeupdate', () => {
      if (this.audio) {
        this.state.currentTime = this.audio.currentTime;
        if (!isNaN(this.audio.duration)) {
          this.state.duration = sanitizeTrackDuration(this.state.currentTrack, this.audio.duration);
        }
        this.updateMediaSessionPositionState();
        this.notify();
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      if (this.audio && !isNaN(this.audio.duration)) {
        this.state.duration = sanitizeTrackDuration(this.state.currentTrack, this.audio.duration);
        this.updateMediaSessionPositionState();
        this.notify();
      }
    });

    this.audio.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio stream playback error:', e);
      this.state.isBuffering = false;
      this.state.isPlaying = false;
      this.releaseWebWakeLock();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
      this.notify();
    });
  }

  private handleTrackEnded() {
    if (this.state.currentTrack) {
      QuranAudioStatsService.recordSurahCompletion(this.state.currentTrack);
    }

    if (this.stopAtEndOfSurah) {
      this.clearSleepTimer();
      this.pause();
      return;
    }

    if (this.state.repeatMode === 'repeat_one') {
      if (this.audio) {
        this.audio.currentTime = 0;
        this.audio.play().catch(() => {});
      }
      return;
    }

    if (this.state.playlist.length > 0) {
      if (this.state.currentIndex < this.state.playlist.length - 1) {
        this.nextTrack();
      } else if (this.state.repeatMode === 'repeat_all') {
        this.playTrack(this.state.playlist[0], this.state.playlist, 0);
      } else {
        this.pause();
      }
    }
  }

  // --- Public Control Methods ---

  async playTrack(track: AudioTrack, playlist: AudioTrack[] = [], index = -1) {
    let resolvedPlaylist = playlist.length > 0 ? playlist : [];
    
    // If no playlist provided or single track, auto-populate the full moshaf surahs list for this reciter
    if (resolvedPlaylist.length <= 1 && track.audioUrl && (/\d{3}\.mp3$/.test(track.audioUrl) || /\/\d+\.mp3$/.test(track.audioUrl))) {
      resolvedPlaylist = quranSurahs.map(s => {
        const paddedSurah = String(s.number).padStart(3, '0');
        let url = track.audioUrl;
        if (/\d{3}\.mp3$/.test(url)) {
          url = url.replace(/\d{3}\.mp3$/, `${paddedSurah}.mp3`);
        } else if (/\/\d+\.mp3$/.test(url)) {
          url = url.replace(/\/\d+\.mp3$/, `/${s.number}.mp3`);
        }
        return {
          surahNumber: s.number,
          surahName: s.name,
          surahEnglishName: s.englishName,
          ayahCount: s.ayahCount,
          reciterId: track.reciterId,
          reciterName: track.reciterName,
          reciterPhoto: track.reciterPhoto,
          moshafName: track.moshafName,
          audioUrl: url,
        };
      });
    } else if (resolvedPlaylist.length === 0) {
      resolvedPlaylist = [track];
    }

    const resolvedIndex = index >= 0 ? index : resolvedPlaylist.findIndex(t => t.surahNumber === track.surahNumber && (t.reciterId === track.reciterId || String(t.reciterId) === String(track.reciterId)));
    this.state.currentTrack = track;
    this.state.playlist = resolvedPlaylist;
    this.state.currentIndex = Math.max(0, resolvedIndex);
    this.state.currentTime = 0;
    this.state.duration = sanitizeTrackDuration(track, track.duration || 0);
    this.state.isBuffering = true;
    this.notify();
    QuranAudioHubService.saveLastPlayed(track);

    const isLocalTrack = track.audioUrl.startsWith('local://') || Boolean(track.storageKey);

    // 1. Native Android Background Playback (Foreground Service)
    if (this.nativeMode) {
      if (this.audio) {
        this.audio.pause();
      }

      try {
        if (isLocalTrack && track.storageKey) {
          const localPlayableUrl = await LocalAudioStorageService.getPlayableUrl(track.storageKey);
          if (localPlayableUrl && !localPlayableUrl.startsWith('blob:')) {
            await nativeQuranAudio.playUrl({
              url: localPlayableUrl,
              title: `سورة ${track.surahName}`,
              artist: track.reciterName,
              album: track.moshafName || 'القرآن الكريم',
              speed: this.state.playbackSpeed,
              position: 0,
            });
            this.requestWebWakeLock();
            return;
          }
        }

        if (!isLocalTrack) {
          await nativeQuranAudio.playTrack(resolvedPlaylist, this.state.currentIndex, this.state.playbackSpeed);
          this.requestWebWakeLock();
          return;
        }
      } catch (error) {
        console.warn('Native playback failed, attempting web fallback:', error);
      }
    }

    // 2. Web fallback / Local imported track
    if (isLocalTrack) {
      if (this.nativeMode) {
        void nativeQuranAudio.pause().catch(() => {});
      }
      if (!this.audio) this.initAudioElements();
      if (!this.audio) return;

      try {
        const playableUrl = track.storageKey ? await LocalAudioStorageService.getPlayableUrl(track.storageKey) : null;
        if (!playableUrl) throw new Error('Could not create playable URL for local audio');

        this.audio.src = playableUrl;
        this.audio.playbackRate = this.state.playbackSpeed;
        await this.audio.play();
        this.updateMediaSession();
        this.requestWebWakeLock();
      } catch (e) {
        console.warn('Error playing local audio track:', e);
        this.state.isBuffering = false;
        this.state.isPlaying = false;
        this.notify();
      }
      return;
    }

    // 3. Web offline downloaded Quran recitation (IndexedDB blob)
    const offlineUrl = await QuranAudioOfflineService.getPlayableUrl(track);
    if (offlineUrl) {
      if (this.nativeMode) {
        void nativeQuranAudio.pause().catch(() => {});
      }
      if (!this.audio) this.initAudioElements();
      if (!this.audio) return;

      try {
        this.audio.src = offlineUrl;
        this.audio.playbackRate = this.state.playbackSpeed;
        await this.audio.play();
        this.updateMediaSession();
        this.requestWebWakeLock();
      } catch (e) {
        console.warn('Error playing offline audio track:', e);
        this.state.isBuffering = false;
        this.state.isPlaying = false;
        this.notify();
      }
      return;
    }

    // 4. Standard Web HTML5 Audio
    if (!this.audio) this.initAudioElements();
    if (!this.audio) return;

    try {
      this.audio.src = track.audioUrl;
      this.audio.playbackRate = this.state.playbackSpeed;
      await this.audio.play();
      this.updateMediaSession();
      this.requestWebWakeLock();
    } catch (e) {
      console.warn('Error starting playback:', e);
      this.state.isBuffering = false;
      this.state.isPlaying = false;
      this.notify();
    }
  }

  async togglePlay() {
    const track = this.state.currentTrack;
    if (!track) return;

    const isLocalTrack = track.audioUrl.startsWith('local://') || Boolean(track.storageKey);

    // If currently playing, pause immediately
    const isCurrentlyPlaying = this.state.isPlaying || (this.audio && !this.audio.paused && !this.audio.ended && this.audio.currentTime > 0);
    if (isCurrentlyPlaying) {
      this.pause();
      return;
    }

    // If currently paused, RESUME from currentTime without restarting from 0!
    if (this.nativeMode && !isLocalTrack) {
      if (this.state.currentTime > 0) {
        try {
          await nativeQuranAudio.play();
          this.state.isPlaying = true;
          this.notify();
          return;
        } catch (e) {
          console.warn('Native resume failed, will replay track', e);
        }
      }
      // If first start or after end of track:
      await this.playTrack(
        track,
        this.state.playlist.length ? this.state.playlist : [track],
        Math.max(0, this.state.currentIndex)
      );
      return;
    }

    // HTML5 Audio / Local track / Web:
    if (!this.audio) this.initAudioElements();
    if (!this.audio) return;

    // If audio already has track loaded, resume without restarting from beginning:
    const isSameTrack = this.audio.src && (this.audio.src === track.audioUrl || this.audio.src.endsWith(track.audioUrl));
    if (isSameTrack && this.audio.currentTime > 0 && !this.audio.ended) {
      try {
        this.audio.playbackRate = this.state.playbackSpeed;
        await this.audio.play();
        this.state.isPlaying = true;
        this.notify();
        return;
      } catch (err) {
        console.warn('Resume HTML5 play error:', err);
      }
    }

    // Otherwise, playTrack fresh:
    if (!this.audio.src || this.audio.src === '' || this.audio.src === window.location.href) {
      await this.playTrack(
        track,
        this.state.playlist.length ? this.state.playlist : [track],
        Math.max(0, this.state.currentIndex)
      );
    } else {
      try {
        await this.audio.play();
        this.state.isPlaying = true;
        this.notify();
      } catch (err) {
        await this.playTrack(
          track,
          this.state.playlist.length ? this.state.playlist : [track],
          Math.max(0, this.state.currentIndex)
        );
      }
    }
  }

  pause() {
    const isLocalTrack = this.state.currentTrack?.audioUrl.startsWith('local://') || Boolean(this.state.currentTrack?.storageKey);
    if (this.nativeMode && !isLocalTrack) {
      void nativeQuranAudio.pause().catch(() => {});
    }
    if (this.audio) {
      this.audio.pause();
    }
    this.state.isPlaying = false;
    this.notify();
  }

  closePlayer() {
    this.pause();
    this.state.isPlaying = false;
    this.state.currentTrack = null;
    this.notify();
  }

  seekTo(seconds: number) {
    const isLocalTrack = this.state.currentTrack?.audioUrl.startsWith('local://') || Boolean(this.state.currentTrack?.storageKey);
    if (this.nativeMode && !isLocalTrack) {
      void nativeQuranAudio.seek(seconds).catch(() => {});
      this.state.currentTime = seconds;
      this.notify();
      return;
    }
    if (!this.audio) return;
    const target = Math.max(0, Math.min(seconds, this.state.duration || 999999));
    this.audio.currentTime = target;
    this.state.currentTime = target;
    this.notify();
  }

  skipTime(deltaSeconds: number) {
    const current = this.state.currentTime;
    this.seekTo(current + deltaSeconds);
  }

  setPlaybackSpeed(speed: number) {
    this.state.playbackSpeed = speed;
    if (this.audio) {
      this.audio.playbackRate = speed;
    }
    const isLocalTrack = this.state.currentTrack?.audioUrl.startsWith('local://') || Boolean(this.state.currentTrack?.storageKey);
    if (this.nativeMode && !isLocalTrack) {
      void nativeQuranAudio.setSpeed(speed).catch(() => {});
    }
    this.notify();
  }

  setRepeatMode(mode: RepeatMode) {
    this.state.repeatMode = mode;
    this.notify();
  }

  cycleRepeatMode() {
    const modes: RepeatMode[] = ['repeat_all', 'repeat_one', 'off'];
    const nextIdx = (modes.indexOf(this.state.repeatMode) + 1) % modes.length;
    this.setRepeatMode(modes[nextIdx]);
  }

  setAmbientSound(soundId: string) {
    const sound = AMBIENT_SOUNDS.find(s => s.id === soundId) || AMBIENT_SOUNDS[0];
    this.state.ambientSound = sound;

    if (!this.ambientAudio) return;

    if (!sound.audioUrl) {
      this.ambientAudio.pause();
      this.ambientAudio.src = '';
    } else {
      this.ambientAudio.src = sound.audioUrl;
      this.ambientAudio.volume = this.state.ambientVolume;
      if (this.state.isPlaying) {
        this.ambientAudio.play().catch(() => {});
      }
    }
    this.notify();
  }

  setAmbientVolume(volume: number) {
    const safeVol = Math.max(0, Math.min(1, volume));
    this.state.ambientVolume = safeVol;
    if (this.ambientAudio) {
      this.ambientAudio.volume = safeVol;
    }
    this.notify();
  }

  setSleepTimer(minutes: number | 'end_of_surah' | null) {
    this.clearSleepTimer();

    if (minutes === null) {
      this.notify();
      return;
    }

    if (minutes === 'end_of_surah') {
      this.stopAtEndOfSurah = true;
      this.state.sleepTimerTotal = 0;
      this.state.sleepTimerRemaining = -1; // Flag for end of surah
      this.notify();
      return;
    }

    this.stopAtEndOfSurah = false;
    this.state.sleepTimerTotal = minutes;
    this.state.sleepTimerRemaining = minutes * 60;
    this.notify();

    this.sleepTimerInterval = window.setInterval(() => {
      if (this.state.sleepTimerRemaining !== null && this.state.sleepTimerRemaining > 0) {
        this.state.sleepTimerRemaining -= 1;
        if (this.state.sleepTimerRemaining <= 0) {
          this.clearSleepTimer();
          this.pause();
        }
        this.notify();
      }
    }, 1000);
  }

  private clearSleepTimer() {
    if (this.sleepTimerInterval) {
      clearInterval(this.sleepTimerInterval);
      this.sleepTimerInterval = null;
    }
    this.stopAtEndOfSurah = false;
    this.state.sleepTimerRemaining = null;
    this.state.sleepTimerTotal = null;
  }

  nextTrack() {
    if (this.state.playlist.length === 0) return;
    if (this.nativeMode) {
      void nativeQuranAudio.next().catch(() => {});
      return;
    }
    const nextIdx = this.state.currentIndex + 1;
    if (nextIdx < this.state.playlist.length) {
      this.playTrack(this.state.playlist[nextIdx], this.state.playlist, nextIdx);
    } else if (this.state.repeatMode === 'repeat_all') {
      this.playTrack(this.state.playlist[0], this.state.playlist, 0);
    }
  }

  prevTrack() {
    if (this.state.playlist.length === 0) return;
    if (this.nativeMode) {
      void nativeQuranAudio.previous().catch(() => {});
      return;
    }
    if (this.audio && this.audio.currentTime > 5) {
      this.seekTo(0);
      return;
    }
    const prevIdx = this.state.currentIndex - 1;
    if (prevIdx >= 0) {
      this.playTrack(this.state.playlist[prevIdx], this.state.playlist, prevIdx);
    } else {
      this.seekTo(0);
    }
  }

  setFullScreenOpen(open: boolean) {
    this.state.isFullScreenOpen = open;
    this.notify();
  }

  getState(): AudioPlayerState {
    return { ...this.state };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach(fn => fn(currentState));
  }

  private updateMediaSession() {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    const track = this.state.currentTrack;
    if (!track) {
      navigator.mediaSession.playbackState = 'none';
      return;
    }

    try {
      const artwork = [
        ...(track.reciterPhoto ? [{ src: track.reciterPhoto, sizes: '512x512', type: 'image/jpeg' }] : []),
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      ];

      const isQuran = Boolean(track.surahNumber && track.surahNumber > 0);
      const title = isQuran ? `سورة ${track.surahName}` : (track.surahName || track.surahEnglishName || 'ملف صوتي');
      const artist = isQuran 
        ? (track.reciterName.startsWith('الشيخ') ? track.reciterName : `الشيخ ${track.reciterName}`)
        : (track.reciterName || 'إفاقة');

      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album: track.moshafName || (isQuran ? 'القرآن الكريم' : 'مكتبة الصوتيات'),
        artwork
      });

      navigator.mediaSession.playbackState = this.state.isPlaying ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => void this.togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => void this.togglePlay());
      navigator.mediaSession.setActionHandler('stop', () => this.closePlayer());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());
      navigator.mediaSession.setActionHandler('seekbackward', (details) => this.skipTime(-(details.seekOffset || 15)));
      navigator.mediaSession.setActionHandler('seekforward', (details) => this.skipTime(details.seekOffset || 15));
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          this.seekTo(details.seekTime);
        }
      });

      this.updateMediaSessionPositionState();
    } catch (err) {
      console.warn('MediaSession update error:', err);
    }
  }

  private updateMediaSessionPositionState() {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    if (!('setPositionState' in navigator.mediaSession)) return;

    try {
      if (this.state.duration > 0 && !isNaN(this.state.duration)) {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, this.state.duration),
          playbackRate: this.state.playbackSpeed || 1,
          position: Math.min(Math.max(0, this.state.currentTime), this.state.duration),
        });
      }
    } catch {}
  }
}

export const audioPlayerEngine = new AudioPlayerEngine();
