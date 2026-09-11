import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { AudioTrack } from './quranAudioHubService';

export interface NativePlaybackState {
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  currentIndex: number;
  title?: string;
  artist?: string;
}

export interface NativeCompletionEvent {
  currentIndex: number;
  title?: string;
  artist?: string;
}

interface QuranAudioNativePlugin {
  playTrack(options: { playlistJson: string; index: number; speed: number; position?: number }): Promise<void>;
  playUrl(options: { url: string; title?: string; artist?: string; album?: string; speed?: number; position?: number }): Promise<void>;
  toggle(): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  seek(options: { position: number }): Promise<void>;
  setSpeed(options: { speed: number }): Promise<void>;
  addListener(eventName: 'playbackState', listener: (state: NativePlaybackState) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'playbackCompleted', listener: (event: NativeCompletionEvent) => void): Promise<PluginListenerHandle>;
}

const NativeQuranAudio = registerPlugin<QuranAudioNativePlugin>('QuranAudio');

export const shouldUseNativeQuranAudio = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

const serializeTrack = (track: AudioTrack) => ({
  audioUrl: track.audioUrl,
  title: `سورة ${track.surahName}`,
  artist: track.reciterName,
  album: track.moshafName || 'القرآن الكريم',
});

export const nativeQuranAudio = {
  listen(listener: (state: NativePlaybackState) => void) {
    return NativeQuranAudio.addListener('playbackState', listener);
  },
  onCompleted(listener: (event: NativeCompletionEvent) => void) {
    return NativeQuranAudio.addListener('playbackCompleted', listener);
  },
  playTrack(playlist: AudioTrack[], index: number, speed: number = 1, position: number = 0) {
    return NativeQuranAudio.playTrack({
      playlistJson: JSON.stringify(playlist.map(serializeTrack)),
      index,
      speed,
      position,
    });
  },
  playUrl(options: { url: string; title?: string; artist?: string; album?: string; speed?: number; position?: number }) {
    return NativeQuranAudio.playUrl({
      url: options.url,
      title: options.title || 'القرآن الكريم',
      artist: options.artist || 'إفاقة',
      album: options.album || 'المصحف الشريف',
      speed: options.speed ?? 1,
      position: options.position ?? 0,
    });
  },
  toggle: () => NativeQuranAudio.toggle(),
  play: () => NativeQuranAudio.play(),
  pause: () => NativeQuranAudio.pause(),
  stop: () => NativeQuranAudio.stop(),
  next: () => NativeQuranAudio.next(),
  previous: () => NativeQuranAudio.previous(),
  seek: (position: number) => NativeQuranAudio.seek({ position }),
  setSpeed: (speed: number) => NativeQuranAudio.setSpeed({ speed }),
};
