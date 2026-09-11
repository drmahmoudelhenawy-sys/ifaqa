import { OutlineIcon, outlineContent } from '../OutlineIcon';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Compass,
  Users,
  ListMusic,
  BarChart3,
  Download,
  Headphones,
  Sparkles,
  Flame,
  Star,
  Play,
  Moon,
  Sun,
  Loader2,
  ArrowRight,
  Heart,
  Trash2
} from 'lucide-react';
import {
  HubReciter,
  QuranAudioHubService,
  AudioTrack,
  CURATED_PLAYLISTS,
  HubPlaylist,
  RECITER_PORTRAITS
} from '../../services/quranAudioHubService';
import { audioPlayerEngine, AudioPlayerState } from '../../services/audioPlayerEngine';
import { QuranAudioThemeService, AudioTheme, AUDIO_THEMES } from '../../services/quranAudioTheme';
import { quranSurahs } from '../../../quranMetadata';
import { hapticTap, hapticSelection } from '../../services/haptics';
import toast from 'react-hot-toast';

import { ReciterAvatar } from './ReciterAvatar';
import { ReciterProfileView } from './ReciterProfileView';
import { CustomPlaylistsView } from './CustomPlaylistsView';
import { QuranAudioStatsView } from './QuranAudioStatsView';
import { OfflineAudioLibrary } from './OfflineAudioLibrary';

interface QuranAudioHubPageProps {
  onOpenMushaf?: (surahNumber: number) => void;
  onBack?: () => void;
  darkMode?: boolean;
  onToggleTheme?: () => void;
}

export const QuranAudioHubPage: React.FC<QuranAudioHubPageProps> = ({ 
  onOpenMushaf, 
  onBack,
  darkMode,
  onToggleTheme
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'reciters' | 'playlists' | 'stats' | 'downloads' | 'search'>('home');
  const [reciters, setReciters] = useState<HubReciter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReciter, setSelectedReciter] = useState<HubReciter | null>(null);
  const [playerState, setPlayerState] = useState<AudioPlayerState>(audioPlayerEngine.getState());
  const [theme, setTheme] = useState<AudioTheme>(() => QuranAudioThemeService.getTheme());
  const [favoriteTracks, setFavoriteTracks] = useState<AudioTrack[]>(() => QuranAudioHubService.getFavoriteTracks());
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(36);

  useEffect(() => {
    const unsubAudio = audioPlayerEngine.subscribe((state) => setPlayerState(state));
    const unsubTheme = QuranAudioThemeService.subscribe((t) => setTheme(t));

    const handleFavTracksChange = () => setFavoriteTracks(QuranAudioHubService.getFavoriteTracks());
    window.addEventListener('ifaqa_favorite_tracks_changed', handleFavTracksChange);

    QuranAudioHubService.getReciters()
      .then((data) => {
        setReciters(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        toast.error('تعذر جلب قائمة القراء، تأكد من الاتصال.');
      });

    return () => {
      unsubAudio();
      unsubTheme();
      window.removeEventListener('ifaqa_favorite_tracks_changed', handleFavTracksChange);
    };
  }, []);

  const isDark = darkMode !== undefined ? darkMode : theme.type === 'dark';
  
  const effectiveTheme = useMemo(() => {
    if (isDark) {
      return theme.type === 'dark' ? theme : AUDIO_THEMES.midnight;
    } else {
      return theme.type === 'light' ? theme : AUDIO_THEMES.light_dawn;
    }
  }, [isDark, theme]);

  const topReciters = useMemo(() => {
    return reciters.filter((r) => r.isTopReciter || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].includes(r.id));
  }, [reciters]);

  const newReciters = useMemo(() => {
    return reciters.filter((r) => r.isNew);
  }, [reciters]);

  const favoriteReciters = useMemo(() => {
    return reciters.filter((r) => r.isFavorite);
  }, [reciters]);

  const filteredReciters = useMemo(() => {
    const normalizeArabic = (s: string) =>
      s.replace(/[\u064B-\u065F\u0670]/g, '')
       .replace(/[أإآ]/g, 'ا')
       .replace(/ة/g, 'ه')
       .replace(/ى/g, 'ي')
       .toLowerCase();

    const qTokens = normalizeArabic(searchQuery).trim().split(/\s+/).filter(Boolean);

    return reciters.filter((r) => {
      const matchSearch =
        qTokens.length === 0 ||
        qTokens.every((token) => {
          const reciterText = normalizeArabic(`${r.name} ${r.moshaf.map((m) => m.name).join(' ')}`);
          return reciterText.includes(token);
        });

      if (!matchSearch) return false;
      if (countryFilter === 'all') return true;
      if (countryFilter === 'favorites') return r.isFavorite;
      if (countryFilter === 'complete') return r.moshaf.some((m) => m.surah_total === 114);
      if (countryFilter === 'multiple') return r.moshaf.length > 1;
      return true;
    });
  }, [reciters, searchQuery, countryFilter]);

  const lastPlayed = useMemo(() => {
    return QuranAudioHubService.getLastPlayedTrack();
  }, [playerState.currentTrack]);

  const handlePlayLastTrack = () => {
    if (!lastPlayed) return;
    hapticTap();
    const reciter = reciters.find((r) => r.name === lastPlayed.reciterName);
    if (reciter) {
      setSelectedReciter(reciter);
    }
  };

  const handlePlayPlaylist = (playlist: HubPlaylist) => {
    hapticTap();
    if (!playlist.tracks.length) return;

    const fullTracks: AudioTrack[] = playlist.tracks.map((t) => {
      const surah = quranSurahs.find((s) => s.number === t.surahNumber) || quranSurahs[0];
      const rec = reciters.find((r) => r.name.includes(t.reciterName) || t.reciterName.includes(r.name)) || reciters[0];
      const server = t.serverFallback || rec?.moshaf?.[0]?.server || 'https://server8.mp3quran.net/afs/';
      return {
        surahNumber: surah.number,
        surahName: surah.name,
        surahEnglishName: surah.englishName,
        ayahCount: surah.ayahCount,
        reciterId: rec?.id || 1,
        reciterName: t.reciterName,
        reciterPhoto: rec?.photoUrl || RECITER_PORTRAITS[t.reciterName] || '',
        moshafName: 'المصحف المرتل',
        audioUrl: QuranAudioHubService.buildAudioUrl(server, surah.number),
      };
    });

    audioPlayerEngine.playTrack(fullTracks[0], fullTracks, 0);
    toast.success(`بدأ تشغيل: ${playlist.title}`);
  };

  if (selectedReciter) {
    return (
      <ReciterProfileView
        reciter={selectedReciter}
        onBack={() => setSelectedReciter(null)}
        onOpenMushaf={onOpenMushaf}
      />
    );
  }

  return (
    <div 
      className={`quran-audio-stage ${playerState.isPlaying ? 'is-playing' : ''} w-full min-h-full pb-36 select-none transition-all duration-500 bg-slate-50 dark:bg-[#050b14] text-slate-900 dark:text-white`}
      dir="rtl"
    >
      {/* Background Ambient Aura */}
      {isDark && (
        <div className="quran-audio-ambient" aria-hidden="true">
          <span className="quran-audio-orb quran-audio-orb-one" />
          <span className="quran-audio-orb quran-audio-orb-two" />
          <div className="quran-audio-waves">
            {[0, 1, 2, 3].map((index) => (
              <span key={index} className="quran-audio-wave" style={{ '--wave-index': index } as React.CSSProperties} />
            ))}
          </div>
        </div>
      )}
      
      {/* Top Header Bar */}
      <div className={`sticky top-0 z-40 border-b ${isDark ? 'border-white/10 bg-slate-950/80' : 'border-slate-200/80 bg-white/90'} px-4 pt-4 pb-3 shadow-sm backdrop-blur-2xl safe-top transition-colors duration-500`}>
        <div className="flex items-center justify-between mb-3.5">
          {onBack ? (
            <button
              onClick={() => {
                hapticTap();
                onBack();
              }}
              className={`p-2.5 rounded-2xl border transition active:scale-95 ${
                isDark ? 'border-white/10 bg-white/10 text-white hover:bg-white/15' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              aria-label="الرجوع"
            >
              <ArrowRight size={20} />
            </button>
          ) : (
            <div className="w-10" />
          )}

          <div className="text-center">
            <h1 className="text-lg font-black flex items-center justify-center gap-2 text-slate-900 dark:text-white">
              <Headphones className="text-emerald-500" size={20} />
              <span>مكتبة التلاوات</span>
            </h1>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {loading ? 'جاري تحديث الفهرس...' : `${reciters.length} قارئًا · كل الروايات والسور المتاحة`}
            </p>
          </div>

          {/* Single Direct Dark / Light Toggle Button */}
          <button
            onClick={() => {
              hapticTap();
              if (onToggleTheme) {
                onToggleTheme();
              } else {
                QuranAudioThemeService.toggleTheme();
              }
            }}
            className={`p-2.5 rounded-2xl border transition active:scale-95 flex items-center justify-center ${
              isDark 
                ? 'border-white/15 bg-white/10 text-amber-300 hover:bg-white/20' 
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-sm'
            }`}
            title={isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
            aria-label="تبديل المظهر"
          >
            {isDark ? (
              <Sun size={19} className="text-amber-300 animate-in spin-in-45 duration-300" />
            ) : (
              <Moon size={19} className="text-slate-700 animate-in zoom-in-75 duration-300" />
            )}
          </button>
        </div>

        {/* Sub-Navigation Pills */}
        <div className={`grid grid-cols-6 gap-1 rounded-[1.4rem] border p-1.5 transition-colors ${
          isDark ? 'border-white/10 bg-black/25' : 'border-slate-200 bg-slate-100/90'
        }`}>
          {[
            { id: 'home' as const, label: 'الرئيسية', icon: Compass },
            { id: 'reciters' as const, label: 'القراء', icon: Users },
            { id: 'playlists' as const, label: 'قوائم', icon: ListMusic },
            { id: 'stats' as const, label: 'إحصائيات', icon: BarChart3 },
            { id: 'downloads' as const, label: 'المكتبة', icon: Download },
            { id: 'search' as const, label: 'بحث', icon: Search },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  hapticTap();
                  setActiveTab(tab.id);
                }}
                className={`min-w-0 rounded-2xl px-1 py-2 text-[9px] font-black flex flex-col items-center justify-center gap-1 transition-all ${
                  isActive
                    ? effectiveTheme.activeTabBackground
                    : isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className="w-full truncate text-center">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB 1: HOME (الرئيسية) */}
      {activeTab === 'home' && (
        <div className="space-y-6 pt-4 animate-in fade-in duration-300">
          
          {/* Quick Hub Navigation Cards */}
          <div className="grid grid-cols-4 gap-2 px-4">
            {[
              { label: 'كل القرّاء', hint: `${reciters.length} قارئًا`, icon: Users, tab: 'reciters' as const },
              { label: 'قوائم مختارة', hint: `${CURATED_PLAYLISTS.length} قوائم`, icon: ListMusic, tab: 'playlists' as const },
              { label: 'إحصائياتك', hint: 'والختمة', icon: BarChart3, tab: 'stats' as const },
              { label: 'دون إنترنت', hint: 'تنزيلاتك', icon: Download, tab: 'downloads' as const },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button 
                  key={item.tab} 
                  onClick={() => {
                    hapticTap();
                    setActiveTab(item.tab);
                  }} 
                  className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/90 p-2.5 text-right shadow-sm transition active:scale-95 hover:border-emerald-400"
                >
                  <Icon size={20} className="mb-2 text-emerald-500" />
                  <strong className="block truncate text-[11px] font-black text-slate-800 dark:text-white">{item.label}</strong>
                  <span className="mt-0.5 block truncate text-[9px] font-bold text-slate-500 dark:text-slate-400">{item.hint}</span>
                </button>
              );
            })}
          </div>

          {/* 1. Hero Card: "من مفضلتك / تابع الاستماع" */}
          {lastPlayed && (
            <div className="px-4">
              <div className="relative min-h-[180px] p-5 rounded-[2.2rem] bg-gradient-to-br from-[#07111f] via-[#0b1830] to-[#062b2b] border border-white/15 text-white shadow-xl overflow-hidden group">
                <div className="absolute -top-14 right-10 w-56 h-56 bg-blue-500/25 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 left-10 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex-1 text-right pl-3">
                    <span className="mb-2 inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black text-emerald-200">تابع من حيث توقفت</span>
                    <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      {lastPlayed.reciterName}
                    </h3>
                    <p className="text-sm font-bold text-slate-300 mt-1">
                      سورة {lastPlayed.surahName}
                    </p>

                    <button
                      onClick={handlePlayLastTrack}
                      className="mt-4 px-5 py-2.5 rounded-full bg-white text-slate-950 hover:bg-emerald-50 active:scale-95 font-black text-xs flex items-center gap-2 shadow-xl transition"
                    >
                      <span>تابع الاستماع</span>
                      <Play size={14} fill="currentColor" className="rotate-180" />
                    </button>
                  </div>

                  <div className="shrink-0">
                    <ReciterAvatar name={lastPlayed.reciterName} src={lastPlayed.reciterPhoto || RECITER_PORTRAITS[lastPlayed.reciterName]} size={110} className="border-4 border-white/20 shadow-2xl" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. "❤️ السور والتلاوات المفضلة" Carousel */}
          {favoriteTracks.length > 0 && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between px-5">
                <h2 className="text-base sm:text-lg font-black flex items-center gap-1.5 text-slate-900 dark:text-white">
                  <Heart size={18} className="text-rose-500 fill-rose-500" />
                  <span>السور والتلاوات المفضلة</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-mono font-black">
                    {favoriteTracks.length}
                  </span>
                </h2>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
                {favoriteTracks.map((favTrack, idx) => (
                  <div
                    key={`${favTrack.surahNumber}_${favTrack.reciterId}_${idx}`}
                    onClick={() => {
                      hapticTap();
                      audioPlayerEngine.playTrack(favTrack, favoriteTracks);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl shrink-0 w-64 border shadow-sm cursor-pointer active:scale-95 transition ${
                      isDark ? 'bg-slate-900/90 border-white/10 hover:border-rose-400' : 'bg-white border-slate-200 hover:border-rose-400'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0 shadow-md">
                      {favTrack.surahNumber || '١'}
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <h4 className={`text-xs font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {favTrack.surahName ? `سورة ${favTrack.surahName}` : favTrack.surahEnglishName}
                      </h4>
                      <p className={`text-[10px] font-bold truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {favTrack.reciterName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        hapticTap();
                        QuranAudioHubService.removeFavoriteTrack(favTrack);
                        toast.success(`تمت إزالة السورة من المفضلة`);
                      }}
                      className="p-1.5 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition"
                      title="إزالة من المفضلة"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. "⭐ القراء المفضلون" Carousel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-5">
              <h2 className="text-base sm:text-lg font-black flex items-center gap-1.5 text-slate-900 dark:text-white">
                <Star size={18} className="text-amber-400 fill-amber-400" />
                <span>القراء المفضلون</span>
              </h2>
              <button
                onClick={() => {
                  hapticTap();
                  setActiveTab('reciters');
                }}
                className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                عرض الكل
              </button>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
              {(favoriteReciters.length > 0 ? favoriteReciters : topReciters.slice(0, 6)).map((reciter) => (
                <div
                  key={reciter.id}
                  onClick={() => {
                    hapticTap();
                    setSelectedReciter(reciter);
                  }}
                  className="flex flex-col items-center shrink-0 w-24 sm:w-28 cursor-pointer group active:scale-95 transition"
                >
                  <ReciterAvatar name={reciter.name} src={reciter.photoUrl} size={80} className="group-hover:ring-emerald-400" />
                  <span className={`w-full line-clamp-2 text-[11px] font-black text-center mt-2 leading-snug break-words ${isDark ? 'text-slate-100' : 'text-slate-900'} group-hover:text-emerald-500 transition-colors`}>
                    {reciter.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. "قوائم التشغيل" Cards Carousel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-5">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">قوائم تناسب وقتك</h2>
              <button
                onClick={() => {
                  hapticTap();
                  setActiveTab('playlists');
                }}
                className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                عرض الكل
              </button>
            </div>

            <div className="flex items-center gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide">
              {CURATED_PLAYLISTS.map((playlist) => (
                <div
                  key={playlist.id}
                  onClick={() => handlePlayPlaylist(playlist)}
                  className={`shrink-0 w-44 sm:w-52 h-44 rounded-[2rem] bg-gradient-to-br ${playlist.gradient} p-4 text-white shadow-xl flex flex-col justify-between cursor-pointer group active:scale-98 transition relative overflow-hidden border border-white/10`}
                >
                  <img src={playlist.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35 transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent" />
                  <div className="absolute top-2 left-2 p-2 rounded-full bg-white/15 backdrop-blur-md opacity-0 group-hover:opacity-100 transition">
                    <Play size={14} fill="currentColor" />
                  </div>

                  <div className="relative z-10 w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                    <Sparkles size={20} className="text-amber-300" />
                  </div>

                  <div className="relative z-10">
                    <h3 className="font-black text-sm text-white line-clamp-1">{playlist.title}</h3>
                    <p className="text-[10px] text-slate-300 font-bold line-clamp-1 mt-0.5">{playlist.subtitle}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-mono font-bold">
                      {playlist.tracks.length} تلاوة
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. "قراء جدد" with Badges */}
          {newReciters.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-5">
                <h2 className="text-base sm:text-lg font-black flex items-center gap-1.5 text-slate-900 dark:text-white">
                  <Flame size={18} className="text-rose-500" />
                  <span>قراء جدد</span>
                </h2>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
                {newReciters.map((reciter) => (
                  <div
                    key={reciter.id}
                    onClick={() => {
                      hapticTap();
                      setSelectedReciter(reciter);
                    }}
                    className="flex flex-col items-center shrink-0 w-24 sm:w-28 cursor-pointer group active:scale-95 transition"
                  >
                    <div className="relative">
                      <span className="absolute top-0 right-0 z-10 px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[8px] font-black shadow-sm">
                        جديد
                      </span>
                      <ReciterAvatar name={reciter.name} src={reciter.photoUrl} size={80} className="group-hover:ring-emerald-400" />
                    </div>
                    <span className={`w-full line-clamp-2 text-[11px] font-black text-center mt-2 leading-snug break-words ${isDark ? 'text-slate-100' : 'text-slate-900'} group-hover:text-emerald-500 transition-colors`}>
                      {reciter.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. "كبار القراء" Directory Grid */}
          <div className="px-4 space-y-3">
            <h2 className="text-base font-black text-slate-900 dark:text-white">كبار القراء</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
              {topReciters.map((reciter) => (
                <div
                  key={reciter.id}
                  onClick={() => {
                    hapticTap();
                    setSelectedReciter(reciter);
                  }}
                  className={`flex items-center gap-3.5 p-3 rounded-2xl ${isDark ? 'bg-slate-900/90 border-white/10 text-white' : 'bg-white border-slate-200/80 text-slate-900'} border shadow-sm hover:border-emerald-400 cursor-pointer active:scale-98 transition`}
                >
                  <ReciterAvatar name={reciter.name} src={reciter.photoUrl} size={52} className="shrink-0" />
                  <div className="min-w-0 flex-1 text-right">
                    <h4 className={`text-xs sm:text-sm font-black line-clamp-2 leading-snug break-words ${isDark ? 'text-white' : 'text-slate-900'}`}>{reciter.name}</h4>
                    <p className={`text-[10px] sm:text-[11px] font-bold mt-0.5 line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{reciter.country || 'المصحف المرتل'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: RECITERS DIRECTORY (القراء) */}
      {activeTab === 'reciters' && (
        <div className="px-4 pt-4 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">دليل القرّاء</h2>
              <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{filteredReciters.length} قارئًا مطابقًا · اختر القارئ ثم الرواية والسورة</p>
            </div>
            <div className="rounded-2xl bg-emerald-500/10 px-3 py-2 text-center text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
              <strong className="block text-base font-black">{reciters.reduce((sum, item) => sum + item.moshaf.length, 0)}</strong>
              <span className="text-[9px] font-black">مصحف ورواية</span>
            </div>
          </div>

          {/* Library filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'complete', label: 'مصحف كامل' },
              { id: 'multiple', label: 'متعدد الروايات' },
              { id: 'favorites', label: 'المفضلة' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  hapticSelection();
                  setCountryFilter(c.id);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black transition whitespace-nowrap ${
                  countryFilter === c.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isDark ? 'bg-white/10 text-slate-300 border border-white/10' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Search within reciters */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم القارئ أو الرواية..."
              className={`w-full h-11 pr-10 pl-4 rounded-2xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm ${
                isDark 
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-400' 
                  : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'
              }`}
            />
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Reciters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
            {filteredReciters.slice(0, visibleCount).map((reciter) => (
              <div
                key={reciter.id}
                onClick={() => {
                  hapticTap();
                  setSelectedReciter(reciter);
                }}
                className={`flex items-center gap-3.5 p-3 rounded-2xl ${isDark ? 'bg-slate-900/90 border-white/10 text-white' : 'bg-white border-slate-200/80 text-slate-900'} border shadow-sm hover:border-emerald-400 cursor-pointer active:scale-98 transition`}
              >
                <div className="relative shrink-0">
                  <ReciterAvatar name={reciter.name} src={reciter.photoUrl} size={54} />
                  {reciter.badge && (
                    <span className="absolute -bottom-1 right-1/2 z-10 translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-1.5 py-0.5 text-[7px] font-black text-slate-950">{outlineContent(reciter.badge)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <h4 className={`text-xs sm:text-sm font-black line-clamp-2 leading-snug break-words ${isDark ? 'text-white' : 'text-slate-900'}`}>{reciter.name}</h4>
                  <p className={`text-[10px] sm:text-[11px] font-bold mt-0.5 line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {reciter.moshaf?.[0]?.name || 'المصحف المرتل'}
                  </p>
                  <p className={`mt-1 text-[9px] font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{reciter.moshaf.length} رواية · {Math.max(...reciter.moshaf.map((m) => m.surah_total), 0)} سورة</p>
                </div>
              </div>
            ))}
          </div>

          {visibleCount < filteredReciters.length && (
            <button
              onClick={() => setVisibleCount((count) => count + 36)}
              className="mx-auto block rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-7 py-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-500/15 active:scale-95 dark:text-emerald-300"
            >
              عرض المزيد ({filteredReciters.length - visibleCount})
            </button>
          )}

          {loading && (
            <div className="text-center py-16 text-slate-400">
              <Loader2 size={28} className="animate-spin mx-auto mb-2 text-emerald-500" />
              <p className="text-xs font-bold">جاري تحميل دليل القراء...</p>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: PLAYLISTS (قوائم التشغيل) */}
      {activeTab === 'playlists' && (
        <CustomPlaylistsView isDark={isDark} />
      )}

      {activeTab === 'stats' && (
        <QuranAudioStatsView
          theme={effectiveTheme}
          onOpenMushaf={onOpenMushaf}
          onOpenReciter={(reciterId) => {
            const found = reciters.find((r) => r.id === reciterId);
            if (found) setSelectedReciter(found);
          }}
        />
      )}

      {activeTab === 'downloads' && <OfflineAudioLibrary />}

      {/* SUB-TAB 4: SEARCH (بحث شامل) */}
      {activeTab === 'search' && (
        <div className="px-4 pt-4 space-y-4 animate-in fade-in duration-300">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن أي قارئ أو سورة..."
              className={`w-full h-12 pr-11 pl-4 rounded-2xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm ${
                isDark 
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-400' 
                  : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'
              }`}
              autoFocus
            />
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-black px-1 text-slate-500 dark:text-slate-400">نتائج البحث في القراء</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredReciters.slice(0, 18).map((reciter) => (
                <div
                  key={reciter.id}
                  onClick={() => {
                    hapticTap();
                    setSelectedReciter(reciter);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-2xl ${isDark ? 'bg-slate-900/90 border-white/10 text-white' : 'bg-white border-slate-200/80 text-slate-900'} border shadow-sm hover:border-emerald-400 cursor-pointer active:scale-98 transition`}
                >
                  <ReciterAvatar name={reciter.name} src={reciter.photoUrl} size={50} />
                  <div className="min-w-0 flex-1 text-right">
                    <h4 className={`text-xs font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{reciter.name}</h4>
                    <p className={`text-[10px] font-bold mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{reciter.country || 'المصحف المرتل'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuranAudioHubPage;
