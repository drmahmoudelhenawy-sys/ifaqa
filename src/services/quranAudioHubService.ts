import { quranSurahs } from '../../quranMetadata';

export interface MoshafInfo {
  id: number;
  name: string;
  server: string;
  surah_total: number;
  moshaf_type: number;
  surah_list: string;
}

export interface HubReciter {
  id: number;
  name: string;
  letter: string;
  photoUrl: string;
  moshaf: MoshafInfo[];
  badge?: string;
  country?: string;
  isFavorite?: boolean;
}

export interface AudioTrack {
  surahNumber: number;
  surahName: string;
  surahEnglishName?: string;
  ayahCount: number;
  reciterId: number;
  reciterName: string;
  reciterPhoto: string;
  moshafName: string;
  audioUrl: string;
  duration?: number;
  storageKey?: string;
}

export interface HubPlaylist {
  id: string;
  title: string;
  subtitle: string;
  coverImage: string;
  gradient: string;
  tracks: { surahNumber: number; reciterName: string; serverFallback?: string }[];
}

export interface AmbientSound {
  id: string;
  name: string;
  icon: string;
  audioUrl: string;
}

// Verified portraits only. Unknown reciters use a neutral generated monogram below,
// so the app never presents an unrelated person's photo as a Quran reciter.
export const RECITER_PORTRAITS: Record<string, string> = {
  'محمد صديق المنشاوي': 'https://commons.wikimedia.org/wiki/Special:FilePath/Minshawy.jpg?width=480',
  'مشاري راشد العفاسي': 'https://commons.wikimedia.org/wiki/Special:FilePath/%D0%9C%D0%B8%D1%88%D0%B0%D1%80%D0%B8_%D0%A0%D0%B0%D1%88%D0%B8%D0%B4.jpg?width=480',
  'محمود خليل الحصري': 'https://commons.wikimedia.org/wiki/Special:FilePath/Hussary.jpg?width=480',
  'سلمان المطيري': 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=400&q=80',
  'سلمان عبيد المطيري': 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=400&q=80',
};

export const getReciterPortrait = (name: string) => RECITER_PORTRAITS[name] || '';

// Ambient Background Sounds (Soundscapes for soothing recitation)
export const AMBIENT_SOUNDS: AmbientSound[] = [
  { id: 'none', name: 'بدون صوت خلفي', icon: 'VolumeX', audioUrl: '' },
  { id: 'rain', name: 'صوت المطر الهادئ', icon: 'CloudRain', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_db6591201e.mp3' },
  { id: 'ocean', name: 'أمواج البحر والسكينة', icon: 'Waves', audioUrl: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_6512906db7.mp3' },
  { id: 'birds', name: 'تغريد عصافير الصباح', icon: 'Trees', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c3c3a9d944.mp3' },
  { id: 'night', name: 'هدوء الليل والنسيم', icon: 'Moon', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3' },
];

// Curated Playlists
export const CURATED_PLAYLISTS: HubPlaylist[] = [
  {
    id: 'salman_mutairi_masterpieces',
    title: 'روائع الشيخ سلمان المطيري',
    subtitle: 'تلاوات خاشعة ومؤثرة من المصحف المرتل الكامل',
    coverImage: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=500&q=80',
    gradient: 'from-amber-950 via-teal-950 to-slate-900',
    tracks: [
      { surahNumber: 1, reciterName: 'سلمان عبيد المطيري', serverFallback: 'https://archive.org/download/salman-obaid-al-mutairi/' },
      { surahNumber: 18, reciterName: 'سلمان عبيد المطيري', serverFallback: 'https://archive.org/download/salman-obaid-al-mutairi/' },
      { surahNumber: 36, reciterName: 'سلمان عبيد المطيري', serverFallback: 'https://archive.org/download/salman-obaid-al-mutairi/' },
      { surahNumber: 55, reciterName: 'سلمان عبيد المطيري', serverFallback: 'https://archive.org/download/salman-obaid-al-mutairi/' },
      { surahNumber: 56, reciterName: 'سلمان عبيد المطيري', serverFallback: 'https://archive.org/download/salman-obaid-al-mutairi/' },
      { surahNumber: 67, reciterName: 'سلمان عبيد المطيري', serverFallback: 'https://archive.org/download/salman-obaid-al-mutairi/' },
    ]
  },
  {
    id: 'sleep_quran',
    title: 'تلاوات النوم والراحة النفسية',
    subtitle: 'آيات السكينة وسور النوم بأصوات خاشعة هادئة',
    coverImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=500&q=80',
    gradient: 'from-indigo-900 via-slate-900 to-purple-950',
    tracks: [
      { surahNumber: 67, reciterName: 'مشاري راشد العفاسي' },
      { surahNumber: 36, reciterName: 'محمد صديق المنشاوي' },
      { surahNumber: 55, reciterName: 'عبد الرحمن مسعد' },
      { surahNumber: 56, reciterName: 'إدريس أبكر' },
      { surahNumber: 112, reciterName: 'هزاع البلوشي' },
    ]
  },
  {
    id: 'friday_kahf',
    title: 'سنن يوم الجمعة (سورة الكهف)',
    subtitle: 'نور ما بين الجمعتين بأعذب التلاوات النجدية والمصرية',
    coverImage: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=500&q=80',
    gradient: 'from-emerald-900 via-teal-950 to-slate-900',
    tracks: [
      { surahNumber: 18, reciterName: 'ياسر الدوسري' },
      { surahNumber: 18, reciterName: 'ناصر القطامي' },
      { surahNumber: 18, reciterName: 'ماهر المعيقلي' },
      { surahNumber: 18, reciterName: 'محمد صديق المنشاوي' },
    ]
  },
  {
    id: 'ruqyah',
    title: 'الرقية الشرعية والتحصين',
    subtitle: 'آيات الحفظ والسكينة والشفاء بإذن الله',
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80',
    gradient: 'from-amber-950 via-slate-900 to-stone-900',
    tracks: [
      { surahNumber: 1, reciterName: 'مشاري راشد العفاسي' },
      { surahNumber: 2, reciterName: 'عبد الباسط عبد الصمد' },
      { surahNumber: 112, reciterName: 'محمود خليل الحصري' },
      { surahNumber: 113, reciterName: 'محمود خليل الحصري' },
      { surahNumber: 114, reciterName: 'محمود خليل الحصري' },
    ]
  },
  {
    id: 'juz_amma',
    title: 'جزء عم كامل للتكرار والحفظ',
    subtitle: 'قصار السور بنبرة ترتيل واضحة ومتقنة',
    coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=500&q=80',
    gradient: 'from-blue-950 via-slate-900 to-sky-950',
    tracks: [
      { surahNumber: 78, reciterName: 'محمود خليل الحصري' },
      { surahNumber: 79, reciterName: 'محمود خليل الحصري' },
      { surahNumber: 80, reciterName: 'محمود خليل الحصري' },
      { surahNumber: 81, reciterName: 'محمود خليل الحصري' },
      { surahNumber: 82, reciterName: 'محمود خليل الحصري' },
    ]
  }
];

export const SALMAN_AL_MUTAIRI_RECITER: HubReciter = {
  id: 9901,
  name: 'سلمان عبيد المطيري',
  letter: 'س',
  photoUrl: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=400&q=80',
  badge: 'تلاوات خاشعة',
  country: 'الكويت',
  isFavorite: false,
  moshaf: [
    {
      id: 9901,
      name: 'المصحف المرتل برواية حفص عن عاصم (114 سورة كاملة)',
      server: 'https://archive.org/download/salman-obaid-al-mutairi/',
      surah_total: 114,
      moshaf_type: 1,
      surah_list: Array.from({ length: 114 }, (_, i) => String(i + 1)).join(',')
    }
  ]
};

export const CURATED_ADDITIONAL_RECITERS: HubReciter[] = [
  SALMAN_AL_MUTAIRI_RECITER
];

export function mergeCuratedReciters(list: HubReciter[], favorites: number[]): HubReciter[] {
  const result = [...list];
  for (const curated of CURATED_ADDITIONAL_RECITERS) {
    const existingIdx = result.findIndex(r => r.id === curated.id || r.name.includes('سلمان عبيد المطيري') || r.name.includes('سلمان المطيري'));
    const item: HubReciter = {
      ...curated,
      isFavorite: favorites.includes(curated.id)
    };
    if (existingIdx >= 0) {
      result[existingIdx] = { ...result[existingIdx], ...item };
    } else {
      result.unshift(item);
    }
  }
  return result;
}

const RECITERS_API_URL = 'https://www.mp3quran.net/api/v3/reciters?language=ar';
const CACHED_RECITERS_KEY = 'ifaqa_cached_hub_reciters_v3';
const FAVORITE_RECITERS_KEY = 'ifaqa_user_favorite_reciters_v1';
const FAVORITE_TRACKS_KEY = 'ifaqa_user_favorite_audio_tracks_v1';
const LEGACY_FAVORITE_RECITERS_KEY = 'ifaqa_favorite_reciters';
const LAST_PLAYED_TRACK_KEY = 'ifaqa_last_played_audio_track';

export class QuranAudioHubService {
  private static recitersCache: HubReciter[] | null = null;

  static async fetchReciters(): Promise<HubReciter[]> {
    if (this.recitersCache && this.recitersCache.length > 0) {
      return this.recitersCache;
    }

    // Check local storage cache first for instant boot
    try {
      const stored = localStorage.getItem(CACHED_RECITERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = mergeCuratedReciters(parsed, this.getFavorites());
          this.recitersCache = merged;
          // Background fetch to refresh
          void this.refreshRecitersInBackground();
          return merged;
        }
      }
    } catch {}

    return this.fetchFromNetwork();
  }

  static async getReciters(): Promise<HubReciter[]> {
    return this.fetchReciters();
  }

  private static async fetchFromNetwork(): Promise<HubReciter[]> {
    try {
      const response = await fetch(RECITERS_API_URL);
      if (!response.ok) throw new Error('Network error fetching reciters');
      const data = await response.json();
      const rawReciters = data.reciters || [];

      const favorites = this.getFavorites();

      const formatted: HubReciter[] = rawReciters.map((r: any) => {
        const photo = getReciterPortrait(r.name);

        const badge = this.getBadgeForReciter(r.name);
        const country = this.getCountryForReciter(r.name);

        return {
          id: r.id,
          name: r.name,
          letter: r.letter || r.name[0] || 'ق',
          photoUrl: photo,
          moshaf: r.moshaf || [],
          badge,
          country,
          isFavorite: favorites.includes(r.id),
        };
      });

      const merged = mergeCuratedReciters(formatted, favorites);
      this.recitersCache = merged;
      try {
        localStorage.setItem(CACHED_RECITERS_KEY, JSON.stringify(merged));
      } catch {}

      return merged;
    } catch (e) {
      console.warn('Failed to fetch online reciters; using fallback list', e);
      return this.getFallbackReciters();
    }
  }

  private static async refreshRecitersInBackground() {
    try {
      const fresh = await this.fetchFromNetwork();
      if (fresh.length > 0) {
        this.recitersCache = fresh;
      }
    } catch {}
  }

  private static getBadgeForReciter(name: string): string | undefined {
    if (['عكاشة كميني', 'عبد الله البعيجان', 'عبد الباسط قوبيلوف', 'يوسف الصقير'].includes(name)) return 'جديد';
    if (['مشاري راشد العفاسي', 'محمد صديق المنشاوي', 'عبد الباسط عبد الصمد', 'محمود خليل الحصري', 'ماهر المعيقلي', 'ياسر الدوسري'].includes(name)) return 'أفضل القراء';
    return undefined;
  }

  private static getCountryForReciter(name: string): string | undefined {
    if (['محمد صديق المنشاوي', 'عبد الباسط عبد الصمد', 'محمود خليل الحصري', 'محمود علي البنا'].includes(name)) return 'مصر';
    if (['ماهر المعيقلي', 'عبد الرحمن السديس', 'سعود الشريم', 'ياسر الدوسري', 'عبد الله البعيجان'].includes(name)) return 'السعودية';
    if (['هزاع البلوشي'].includes(name)) return 'عمان';
    if (['مشاري راشد العفاسي'].includes(name)) return 'الكويت';
    if (['عبد الباسط قوبيلوف'].includes(name)) return 'كازاخستان';
    if (['عكاشة كميني'].includes(name)) return 'غانا';
    return undefined;
  }

  static getFavorites(): number[] {
    try {
      const stored = localStorage.getItem(FAVORITE_RECITERS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  }

  static toggleFavorite(reciterId: number): boolean {
    const favs = this.getFavorites();
    let updated: number[];
    let isFav = false;
    if (favs.includes(reciterId)) {
      updated = favs.filter(id => id !== reciterId);
      isFav = false;
    } else {
      updated = [reciterId, ...favs];
      isFav = true;
    }
    localStorage.setItem(FAVORITE_RECITERS_KEY, JSON.stringify(updated));

    if (this.recitersCache) {
      this.recitersCache = this.recitersCache.map(r => r.id === reciterId ? { ...r, isFavorite: isFav } : r);
    }
    return isFav;
  }

  static getFavoriteTracks(): AudioTrack[] {
    try {
      const stored = localStorage.getItem(FAVORITE_TRACKS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  }

  static isFavoriteTrack(track: AudioTrack | null | undefined): boolean {
    if (!track) return false;
    const tracks = this.getFavoriteTracks();
    return tracks.some(t => 
      (t.audioUrl && t.audioUrl === track.audioUrl) ||
      (t.surahNumber === track.surahNumber && String(t.reciterId) === String(track.reciterId) && t.moshafName === track.moshafName)
    );
  }

  static toggleFavoriteTrack(track: AudioTrack): boolean {
    const tracks = this.getFavoriteTracks();
    const index = tracks.findIndex(t => 
      (t.audioUrl && t.audioUrl === track.audioUrl) ||
      (t.surahNumber === track.surahNumber && String(t.reciterId) === String(track.reciterId) && t.moshafName === track.moshafName)
    );

    let isFav = false;
    let updated: AudioTrack[];
    if (index !== -1) {
      updated = tracks.filter((_, i) => i !== index);
      isFav = false;
    } else {
      updated = [track, ...tracks];
      isFav = true;
    }

    try {
      localStorage.setItem(FAVORITE_TRACKS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('ifaqa_favorite_tracks_changed', { detail: { track, isFav, tracks: updated } }));
    } catch {}

    return isFav;
  }

  static removeFavoriteTrack(track: AudioTrack): void {
    const tracks = this.getFavoriteTracks();
    const updated = tracks.filter(t => 
      !((t.audioUrl && t.audioUrl === track.audioUrl) ||
      (t.surahNumber === track.surahNumber && String(t.reciterId) === String(track.reciterId) && t.moshafName === track.moshafName))
    );
    try {
      localStorage.setItem(FAVORITE_TRACKS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('ifaqa_favorite_tracks_changed', { detail: { track, isFav: false, tracks: updated } }));
    } catch {}
  }

  static buildAudioUrl(server: string, surahNumber: number): string {
    const cleanServer = server.endsWith('/') ? server : `${server}/`;
    const padded = String(surahNumber).padStart(3, '0');
    return `${cleanServer}${padded}.mp3`;
  }

  static saveLastPlayed(track: AudioTrack) {
    try {
      localStorage.setItem(LAST_PLAYED_TRACK_KEY, JSON.stringify(track));
    } catch {}
  }

  static getLastPlayed(): AudioTrack | null {
    try {
      const stored = localStorage.getItem(LAST_PLAYED_TRACK_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    // Default starting track (سورة البقرة - محمد صديق المنشاوي)
    return {
      surahNumber: 2,
      surahName: 'البقرة',
      surahEnglishName: 'Al-Baqarah',
      ayahCount: 286,
      reciterId: 112,
      reciterName: 'محمد صديق المنشاوي',
      reciterPhoto: getReciterPortrait('محمد صديق المنشاوي'),
      moshafName: 'المصحف المرتل',
      audioUrl: 'https://server10.mp3quran.net/minsh/002.mp3',
    };
  }

  static getLastPlayedTrack(): AudioTrack | null {
    return this.getLastPlayed();
  }

  private static getFallbackReciters(): HubReciter[] {
    const favorites = this.getFavorites();
    const list: HubReciter[] = [
      SALMAN_AL_MUTAIRI_RECITER,
      {
        id: 112,
        name: 'محمد صديق المنشاوي',
        letter: 'م',
        photoUrl: getReciterPortrait('محمد صديق المنشاوي'),
        badge: 'أفضل القراء',
        country: 'مصر',
        isFavorite: favorites.includes(112),
        moshaf: [{ id: 1, name: 'المصحف المرتل', server: 'https://server10.mp3quran.net/minsh/', surah_total: 114, moshaf_type: 1, surah_list: Array.from({ length: 114 }, (_, i) => String(i + 1)).join(',') }]
      },
      {
        id: 118,
        name: 'مشاري راشد العفاسي',
        letter: 'م',
        photoUrl: getReciterPortrait('مشاري راشد العفاسي'),
        badge: 'أفضل القراء',
        country: 'الكويت',
        isFavorite: favorites.includes(118),
        moshaf: [{ id: 2, name: 'المصحف المرتل برواية حفص', server: 'https://server8.mp3quran.net/afs/', surah_total: 114, moshaf_type: 1, surah_list: Array.from({ length: 114 }, (_, i) => String(i + 1)).join(',') }]
      },
      {
        id: 123,
        name: 'عبد الرحمن مسعد',
        letter: 'ع',
        photoUrl: getReciterPortrait('عبد الرحمن مسعد'),
        badge: 'جديد',
        isFavorite: favorites.includes(123),
        moshaf: [{ id: 3, name: 'المصحف المرتل', server: 'https://server16.mp3quran.net/massad/', surah_total: 114, moshaf_type: 1, surah_list: Array.from({ length: 114 }, (_, i) => String(i + 1)).join(',') }]
      },
      {
        id: 98,
        name: 'هزاع البلوشي',
        letter: 'هـ',
        photoUrl: getReciterPortrait('هزاع البلوشي'),
        badge: 'جديد',
        country: 'عمان',
        isFavorite: favorites.includes(98),
        moshaf: [{ id: 4, name: 'المصحف المرتل', server: 'https://server11.mp3quran.net/hazza/', surah_total: 114, moshaf_type: 1, surah_list: Array.from({ length: 114 }, (_, i) => String(i + 1)).join(',') }]
      },
      {
        id: 105,
        name: 'يوسف الصقير',
        letter: 'ي',
        photoUrl: getReciterPortrait('يوسف الصقير'),
        badge: 'جديد',
        isFavorite: favorites.includes(105),
        moshaf: [{ id: 5, name: 'المصحف المرتل', server: 'https://server16.mp3quran.net/soqair/', surah_total: 114, moshaf_type: 1, surah_list: Array.from({ length: 114 }, (_, i) => String(i + 1)).join(',') }]
      }
    ];
    return mergeCuratedReciters(list, favorites);
  }
}
