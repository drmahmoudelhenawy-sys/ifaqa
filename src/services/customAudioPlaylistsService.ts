import { AudioTrack } from './quranAudioHubService';
import { quranSurahs } from '../../quranMetadata';

export interface UserCustomPlaylist {
  id: string;
  title: string;
  description?: string;
  gradient: string;
  tracks: AudioTrack[];
  createdAt: number;
  updatedAt: number;
}

const PLAYLISTS_STORAGE_KEY = 'ifaqa_custom_user_playlists_v1';

export const PLAYLIST_GRADIENTS = [
  'from-emerald-900 via-teal-950 to-slate-900',
  'from-indigo-900 via-purple-950 to-slate-950',
  'from-amber-900 via-stone-900 to-slate-950',
  'from-cyan-900 via-blue-950 to-slate-950',
  'from-rose-900 via-slate-900 to-zinc-950',
  'from-violet-900 via-fuchsia-950 to-slate-950',
];

export function getSalmanAlMutairiCompletePlaylist(): UserCustomPlaylist {
  const tracks: AudioTrack[] = quranSurahs.map((surah) => {
    const padded = String(surah.number).padStart(3, '0');
    return {
      surahNumber: surah.number,
      surahName: surah.name,
      surahEnglishName: surah.englishName,
      ayahCount: surah.ayahCount,
      reciterId: 9901,
      reciterName: 'سلمان عبيد المطيري',
      reciterPhoto: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=400&q=80',
      moshafName: 'المصحف المرتل برواية حفص',
      audioUrl: `https://archive.org/download/salman-obaid-al-mutairi/${padded}.mp3`,
    };
  });

  return {
    id: 'playlist_salman_al_mutairi_complete',
    title: 'مصحف الشيخ سلمان المطيري (١١٤ سورة كاملة)',
    description: 'المصحف المرتل برواية حفص عن عاصم بصوت القارئ سلمان عبيد المطيري بجودة عالية وبكامل السور',
    gradient: 'from-amber-900 via-emerald-950 to-slate-950',
    tracks,
    createdAt: 1725600000000,
    updatedAt: 1725600000000,
  };
}

const readPlaylists = (): UserCustomPlaylist[] => {
  try {
    const raw = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
    const parsed: UserCustomPlaylist[] = raw ? JSON.parse(raw) : [];
    const salmanPlaylist = getSalmanAlMutairiCompletePlaylist();
    const existingIndex = parsed.findIndex(p => p.id === salmanPlaylist.id);
    if (existingIndex === -1) {
      parsed.unshift(salmanPlaylist);
      try {
        localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(parsed));
      } catch {}
    } else if (parsed[existingIndex].tracks.length < 114) {
      parsed[existingIndex] = salmanPlaylist;
      try {
        localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(parsed));
      } catch {}
    }
    return parsed;
  } catch {
    return [getSalmanAlMutairiCompletePlaylist()];
  }
};

const writePlaylists = (playlists: UserCustomPlaylist[]) => {
  try {
    localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
    window.dispatchEvent(new CustomEvent('ifaqa_user_playlists_changed'));
  } catch {}
};

export class CustomAudioPlaylistsService {
  static getPlaylists(): UserCustomPlaylist[] {
    return readPlaylists().sort((a, b) => b.updatedAt - a.updatedAt);
  }

  static getPlaylistById(id: string): UserCustomPlaylist | null {
    return readPlaylists().find(p => p.id === id) || null;
  }

  static createPlaylist(title: string, description?: string, gradient?: string): UserCustomPlaylist {
    const newPlaylist: UserCustomPlaylist = {
      id: `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim() || 'قائمة تشغيل جديدة',
      description: description?.trim() || '',
      gradient: gradient || PLAYLIST_GRADIENTS[Math.floor(Math.random() * PLAYLIST_GRADIENTS.length)],
      tracks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const current = readPlaylists();
    writePlaylists([newPlaylist, ...current]);
    return newPlaylist;
  }

  static updatePlaylist(id: string, updates: Partial<Pick<UserCustomPlaylist, 'title' | 'description' | 'gradient'>>): void {
    const current = readPlaylists();
    const index = current.findIndex(p => p.id === id);
    if (index === -1) return;

    current[index] = {
      ...current[index],
      ...updates,
      updatedAt: Date.now(),
    };
    writePlaylists(current);
  }

  static deletePlaylist(id: string): void {
    const current = readPlaylists();
    writePlaylists(current.filter(p => p.id !== id));
  }

  static addTrackToPlaylist(playlistId: string, track: AudioTrack): boolean {
    const current = readPlaylists();
    const playlist = current.find(p => p.id === playlistId);
    if (!playlist) return false;

    // Check if already in playlist
    const exists = playlist.tracks.some(
      t => t.audioUrl === track.audioUrl || (t.storageKey && t.storageKey === track.storageKey)
    );

    if (exists) return false;

    playlist.tracks.push(track);
    playlist.updatedAt = Date.now();
    writePlaylists(current);
    return true;
  }

  static removeTrackFromPlaylist(playlistId: string, trackIndex: number): void {
    const current = readPlaylists();
    const playlist = current.find(p => p.id === playlistId);
    if (!playlist) return;

    playlist.tracks.splice(trackIndex, 1);
    playlist.updatedAt = Date.now();
    writePlaylists(current);
  }

  static reorderTracks(playlistId: string, fromIndex: number, toIndex: number): void {
    const current = readPlaylists();
    const playlist = current.find(p => p.id === playlistId);
    if (!playlist) return;

    const [moved] = playlist.tracks.splice(fromIndex, 1);
    playlist.tracks.splice(toIndex, 0, moved);
    playlist.updatedAt = Date.now();
    writePlaylists(current);
  }
}
