import { OutlineIcon, outlineContent } from '../OutlineIcon';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  ChevronDown,
  Star,
  Moon,
  Sun,
  RotateCcw,
  RotateCw,
  Play,
  Pause,
  Repeat,
  Repeat1,
  ListMusic,
  Share2,
  Volume2,
  VolumeX,
  CloudRain,
  Waves,
  Trees,
  X,
  Loader2,
  Check,
  Sparkles,
  Search,
  BookOpen,
  Sliders,
  Compass,
  Flame,
  Volume1,
  Palette,
  Plus,
  Heart,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioPlayerEngine, AudioPlayerState, RepeatMode } from '../../services/audioPlayerEngine';
import { AMBIENT_SOUNDS, AmbientSound, QuranAudioHubService } from '../../services/quranAudioHubService';
import { QuranAudioThemeService, AudioTheme, PlayerBgPreset, PLAYER_BG_PRESETS, PlayerBgMode } from '../../services/quranAudioTheme';
import { ReciterAvatar } from './ReciterAvatar';
import { quranSurahs } from '../../../quranMetadata';
import { hapticTap, hapticSelection, hapticSuccess } from '../../services/haptics';
import toast from 'react-hot-toast';
import { backNavigationService } from '../../services/backNavigationService';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import '../../styles/AudioPlayerLuxury.css';

const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNumber(value: number | string) {
  return String(value).replace(/[0-9]/g, (digit) => arabicDigits[Number(digit)]);
}

interface FullAudioPlayerModalProps {
  onOpenMushaf?: (surahNumber: number, pageNumber?: number, ayahNumber?: number) => void;
}

export const FullAudioPlayerModal: React.FC<FullAudioPlayerModalProps> = ({ onOpenMushaf }) => {
  const [playerState, setPlayerState] = useState<AudioPlayerState>(audioPlayerEngine.getState());
  const [theme, setTheme] = useState<AudioTheme>(QuranAudioThemeService.getTheme());
  const [bgPreset, setBgPreset] = useState<PlayerBgPreset>(QuranAudioThemeService.getPlayerBgPreset());
  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);
  const [showTracklistDrawer, setShowTracklistDrawer] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showBgModal, setShowBgModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [isFavSurah, setIsFavSurah] = useState(false);
  const [isFavReciter, setIsFavReciter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubPlayer = audioPlayerEngine.subscribe((state) => {
      setPlayerState(state);
      if (state.currentTrack) {
        setIsFavSurah(QuranAudioHubService.isFavoriteTrack(state.currentTrack));
        const favs = QuranAudioHubService.getFavorites();
        setIsFavReciter(favs.includes(state.currentTrack.reciterId));
      }
    });

    const handleFavChange = () => {
      const state = audioPlayerEngine.getState();
      if (state.currentTrack) {
        setIsFavSurah(QuranAudioHubService.isFavoriteTrack(state.currentTrack));
      }
    };
    window.addEventListener('ifaqa_favorite_tracks_changed', handleFavChange);

    const unsubTheme = QuranAudioThemeService.subscribe((t) => {
      setTheme(t);
    });

    const unsubBg = QuranAudioThemeService.subscribePlayerBg((p) => {
      setBgPreset(p);
    });

    return () => {
      unsubPlayer();
      unsubTheme();
      unsubBg();
      window.removeEventListener('ifaqa_favorite_tracks_changed', handleFavChange);
    };
  }, []);

  // Register Full Player and Sub-Modals with Back Navigation Service
  useEffect(() => {
    if (playerState.isFullScreenOpen) {
      return backNavigationService.register('full_audio_player_modal', 95, () => {
        audioPlayerEngine.setFullScreenOpen(false);
      });
    }
  }, [playerState.isFullScreenOpen]);

  useEffect(() => {
    if (showBgModal) {
      return backNavigationService.register('audio_player_bg_modal', 130, () => {
        setShowBgModal(false);
      });
    }
  }, [showBgModal]);

  useEffect(() => {
    if (showSleepTimerModal) {
      return backNavigationService.register('audio_player_sleep_timer', 130, () => {
        setShowSleepTimerModal(false);
      });
    }
  }, [showSleepTimerModal]);

  useEffect(() => {
    if (showTracklistDrawer) {
      return backNavigationService.register('audio_player_tracklist', 130, () => {
        setShowTracklistDrawer(false);
      });
    }
  }, [showTracklistDrawer]);

  useEffect(() => {
    if (showSpeedMenu) {
      return backNavigationService.register('audio_player_speed_menu', 130, () => {
        setShowSpeedMenu(false);
      });
    }
  }, [showSpeedMenu]);

  const {
    currentTrack,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    playbackSpeed,
    repeatMode,
    ambientSound,
    ambientVolume,
    sleepTimerRemaining,
    sleepTimerTotal,
    playlist,
    isFullScreenOpen,
  } = playerState;

  const surahMeta = useMemo(() => {
    if (!currentTrack) return null;
    return quranSurahs.find(s => s.number === currentTrack.surahNumber) || null;
  }, [currentTrack]);

  const cleanMoshafName = useMemo(() => {
    if (!currentTrack?.moshafName) return 'المصحف المرتل';
    const parts = currentTrack.moshafName.split('-').map(s => s.trim());
    const uniqueParts = Array.from(new Set(parts.filter(Boolean)));
    return uniqueParts.join(' - ') || 'المصحف المرتل';
  }, [currentTrack?.moshafName]);

  const fullTracksList = useMemo(() => {
    if (playlist.length > 1) {
      return playlist;
    }
    if (!currentTrack) return [];
    return quranSurahs.map(s => {
      const paddedSurah = String(s.number).padStart(3, '0');
      let url = currentTrack.audioUrl;
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
        reciterId: currentTrack.reciterId,
        reciterName: currentTrack.reciterName,
        reciterPhoto: currentTrack.reciterPhoto,
        moshafName: currentTrack.moshafName,
        audioUrl: url,
      };
    });
  }, [playlist, currentTrack]);

  const filteredTracks = useMemo(() => {
    return fullTracksList.filter(t => 
      t.surahName.includes(searchQuery.trim()) ||
      String(t.surahNumber).includes(searchQuery.trim()) ||
      (t.surahEnglishName && t.surahEnglishName.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    );
  }, [fullTracksList, searchQuery]);

  if (!isFullScreenOpen || !currentTrack) return null;

  const handleClose = () => {
    hapticTap();
    audioPlayerEngine.setFullScreenOpen(false);
  };

  const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = Number(e.target.value);
    audioPlayerEngine.seekTo(target);
  };

  const handleToggleFavSurah = (e: React.MouseEvent) => {
    if (!currentTrack) return;
    hapticSuccess();
    const next = QuranAudioHubService.toggleFavoriteTrack(currentTrack);
    setIsFavSurah(next);

    if (next) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 25,
        spread: 60,
        origin: { x, y },
        colors: ['#f43f5e', '#fb7185', '#10b981', '#ffffff'],
        disableForReducedMotion: true
      });
      toast.success(`تمت إضافة سورة ${currentTrack.surahName || currentTrack.surahEnglishName} للمفضلة ❤️`);
    } else {
      toast.success(`تمت إزالة السورة من المفضلة`);
    }
  };

  const handleToggleFavReciter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentTrack) return;
    hapticSuccess();
    const next = QuranAudioHubService.toggleFavorite(currentTrack.reciterId);
    setIsFavReciter(next);
    toast.success(next ? "تمت إضافة القارئ للمفضلة ⭐" : "تمت إزالة القارئ من المفضلة");
  };

  const handleSetSpeed = (speed: number) => {
    hapticSelection();
    audioPlayerEngine.setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    toast.success(`السرعة: ${speed}x`);
  };

  const handleTogglePlay = () => {
    hapticTap();
    void audioPlayerEngine.togglePlay();
  };

  const handleSkip = (delta: number) => {
    hapticTap();
    audioPlayerEngine.skipTime(delta);
  };

  const handleCycleRepeat = () => {
    hapticSelection();
    audioPlayerEngine.cycleRepeatMode();
  };

  const handleShare = () => {
    hapticTap();
    if (navigator.share && currentTrack) {
      navigator.share({
        title: `سورة ${currentTrack.surahName} بصوت ${currentTrack.reciterName}`,
        text: `استمع إلى سورة ${currentTrack.surahName} بصوت الشيخ ${currentTrack.reciterName} على تطبيق إفاقة`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(currentTrack.audioUrl);
      toast.success('تم نسخ رابط التلاوة للحافظة!');
    }
  };

  const isQuranSurah = Boolean(currentTrack?.surahNumber && currentTrack.surahNumber > 0);

  const handleGoToMushaf = () => {
    if (!isQuranSurah) return;
    hapticTap();
    if (onOpenMushaf && currentTrack) {
      const page = quranSurahs.find(s => s.number === currentTrack.surahNumber)?.startPage || 1;
      handleClose();
      onOpenMushaf(currentTrack.surahNumber, page, 1);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const eqDelays = [0.1, 0.4, 0.2, 0.6, 0.3, 0.5, 0.15, 0.45, 0.25, 0.55, 0.35, 0.1, 0.4, 0.2, 0.5, 0.25, 0.35, 0.15];
  const isDark = theme.type === 'dark';

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col ${isDark ? 'text-white' : 'text-slate-100'} animate-in slide-in-from-bottom duration-300 select-none overflow-hidden transition-colors duration-700`}
      style={{ backgroundColor: bgPreset.topColor }}
      dir="rtl"
    >
      
      {/* Background Renderer */}
      {bgPreset.id === 'solid_amoled' ? (
        <div 
          className="absolute inset-0 pointer-events-none transition-colors duration-700 bg-black"
        />
      ) : (
        <div 
          className={`player-live-aurora-bg ${isPlaying ? 'is-playing' : ''} transition-colors duration-700`}
          style={{ backgroundColor: bgPreset.topColor }}
        >
          <div className="player-top-night-ambient" />
          <div 
            className={`player-live-aurora-ocean ${isPlaying ? 'is-playing' : ''}`}
            style={{ background: bgPreset.oceanGradient }}
          />
          <div 
            className="ocean-glowing-blob ocean-blob-1" 
            style={{ background: bgPreset.blob1 }}
          />
          <div 
            className="ocean-glowing-blob ocean-blob-2" 
            style={{ background: bgPreset.blob2 }}
          />
          <div 
            className="ocean-glowing-blob ocean-blob-3" 
            style={{ background: bgPreset.blob3 }}
          />
          
          {/* Living Moving Waves */}
          <div className="live-wave-svg-container">
            <svg className="live-wave-svg live-wave-svg-1" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M0,30 C200,90 400,-10 600,50 C800,110 1000,10 1200,40 L1200,120 L0,120 Z" fill={bgPreset.waveColor1 || 'rgba(0,180,255,0.35)'} />
            </svg>
            <svg className="live-wave-svg live-wave-svg-2" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M0,50 C300,10 500,80 750,20 C1000,80 1100,20 1200,60 L1200,120 L0,120 Z" fill={bgPreset.waveColor2 || 'rgba(56,189,248,0.22)'} />
            </svg>
          </div>
        </div>
      )}

      {/* Top Handle Bar */}
      <div className="relative z-30 pt-2 flex justify-center">
        <div className="w-10 h-1.5 rounded-full bg-white/25 hover:bg-white/40 cursor-pointer transition" onClick={handleClose} />
      </div>

      {/* Top Navigation Bar */}
      <div className="relative z-30 flex items-center justify-between px-5 pt-2 pb-2 safe-top">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white transition active:scale-90 shadow-lg"
          aria-label="إغلاق المشغل"
        >
          <ChevronDown size={20} />
        </button>

        {/* Center: Open Mushaf at Current Position Button (only if Quran Surah) */}
        {isQuranSurah ? (
          <button
            onClick={handleGoToMushaf}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-black transition active:scale-95 shadow-xl backdrop-blur-md"
            title="فتح السورة في المصحف الشريف"
          >
            <BookOpen size={16} className="text-cyan-300" />
            <span>فتح المصحف (ص {toArabicNumber(quranSurahs.find(s => s.number === currentTrack.surahNumber)?.startPage || 1)})</span>
          </button>
        ) : (
          <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/90 text-xs font-black backdrop-blur-md">
            <span>{outlineContent(currentTrack.moshafName || "ملف صوتي محلي ")}</span>
          </div>
        )}

        {/* Right Action: Background Palette */}
        <button
          onClick={() => {
            hapticTap();
            setShowBgModal(true);
          }}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white transition active:scale-90 shadow-lg flex items-center justify-center"
          title="تغيير ألوان وخلفية المشغل"
          aria-label="تغيير ألوان وخلفية المشغل"
        >
          <Palette size={19} className="text-cyan-300" />
        </button>
      </div>

      {/* Spacious Middle Area */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-6" />

      {/* Track & Reciter Info Row */}
      <div className="relative z-20 px-6 max-w-md mx-auto w-full mb-3">
        <div className="flex items-center justify-between">
          {/* Right: Reciter Avatar + Surah Name & Reciter Name */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <ReciterAvatar 
                name={currentTrack.reciterName} 
                src={currentTrack.reciterPhoto} 
                size={54} 
                className="shadow-2xl border-2 border-white/40 ring-4 ring-cyan-500/20" 
              />
              {isPlaying && (
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                </span>
              )}
            </div>

            <div className="min-w-0 text-right">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate leading-tight drop-shadow-md">
                {isQuranSurah ? `سورة ${currentTrack.surahName}` : (currentTrack.surahName || currentTrack.surahEnglishName || 'ملف صوتي')}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs sm:text-sm font-bold text-cyan-200/90 truncate">
                  {isQuranSurah
                    ? (currentTrack.reciterName.startsWith('الشيخ') ? currentTrack.reciterName : `الشيخ ${currentTrack.reciterName}`)
                    : currentTrack.reciterName}
                </p>
                <button
                  type="button"
                  onClick={handleToggleFavReciter}
                  className={`p-1 rounded-full transition active:scale-90 ${isFavReciter ? 'text-amber-400' : 'text-white/40 hover:text-amber-300'}`}
                  title={isFavReciter ? "القارئ في المفضلة (انقر للإزالة)" : "إضافة القارئ للمفضلة"}
                >
                  <Star size={13} fill={isFavReciter ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          </div>

          {/* Left: Heart Favorite Surah Button */}
          <button
            onClick={handleToggleFavSurah}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition active:scale-90 shadow-xl ${
              isFavSurah 
                ? 'bg-rose-500/25 border-rose-400/60 text-rose-400 shadow-rose-500/20' 
                : 'bg-white/10 hover:bg-white/20 border-white/20 text-white hover:text-rose-300'
            }`}
            title={isFavSurah ? "إزالة السورة من المفضلة" : "إضافة السورة إلى المفضلة"}
            aria-label="إضافة السورة إلى المفضلة"
          >
            <Heart size={22} fill={isFavSurah ? 'currentColor' : 'none'} className={isFavSurah ? 'animate-in zoom-in-75 text-rose-400' : ''} />
          </button>
        </div>
      </div>

      {/* Main Playback Controls Section */}
      <div className="relative z-20 px-6 pb-4 pt-1 max-w-md mx-auto w-full safe-bottom">
        
        {/* Playback Controls Row */}
        <div className="flex items-center justify-between mb-4 px-2">
          {/* Sleep Timer */}
          <button
            onClick={() => {
              hapticTap();
              setShowSleepTimerModal(true);
            }}
            className={`p-2.5 rounded-full transition active:scale-90 ${
              sleepTimerRemaining !== null 
                ? 'text-amber-400 bg-amber-400/25 border border-amber-400/50 shadow-lg shadow-amber-400/20' 
                : 'text-white/80 hover:text-white'
            }`}
            title="مؤقت النوم"
          >
            <div className="relative flex items-center justify-center">
              <Moon size={22} />
              <span className="text-[9px] font-black absolute -top-1 -right-1">z</span>
            </div>
          </button>

          {/* Rewind -15s */}
          <button
            onClick={() => handleSkip(-15)}
            className="p-2.5 text-white/90 hover:text-white active:scale-90 transition relative"
            title="ترجيع 15 ثانية"
          >
            <RotateCcw size={26} />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black font-mono pt-1 text-cyan-200">15</span>
          </button>

          {/* Pure White Circular Play / Pause Button */}
          <button
            onClick={handleTogglePlay}
            className="w-16 h-16 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-[0_10px_35px_rgba(0,0,0,0.6)] hover:scale-105 active:scale-95 transition"
            aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {isBuffering ? (
              <Loader2 size={30} className="animate-spin text-slate-950" />
            ) : isPlaying ? (
              <Pause size={30} fill="currentColor" />
            ) : (
              <Play size={30} fill="currentColor" className="translate-x-0.5" />
            )}
          </button>

          {/* Fast Forward +15s */}
          <button
            onClick={() => handleSkip(15)}
            className="p-2.5 text-white/90 hover:text-white active:scale-90 transition relative"
            title="تقديم 15 ثانية"
          >
            <RotateCw size={26} />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black font-mono pt-1 text-cyan-200">15</span>
          </button>

          {/* Speed Control Indicator */}
          <div className="relative">
            <button
              onClick={() => {
                hapticTap();
                setShowSpeedMenu(!showSpeedMenu);
              }}
              className="px-2 py-1 rounded-full text-xs font-mono font-bold text-white/90 hover:text-white active:scale-90 transition"
              title="سرعة التشغيل"
            >
              ×{playbackSpeed}
            </button>

            {showSpeedMenu && (
              <div className="absolute bottom-12 left-0 z-50 w-36 p-2 rounded-2xl bg-slate-900/95 border border-white/20 text-white backdrop-blur-2xl shadow-2xl animate-in fade-in zoom-in-95">
                <span className="text-[10px] font-black text-slate-400 block px-2 pb-1 text-center">سرعة التلاوة</span>
                {[0.75, 1, 1.25, 1.5, 1.75, 2].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => handleSetSpeed(spd)}
                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-mono font-bold transition flex items-center justify-between ${
                      playbackSpeed === spd ? 'bg-emerald-500/25 text-emerald-300 font-black' : 'hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <span>{spd}x</span>
                    {playbackSpeed === spd && <Check size={14} className="text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="mb-4" dir="rtl">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="1"
            value={currentTime}
            onChange={handleSeek}
            className="luxury-scrubber"
            dir="rtl"
            style={{
              direction: 'rtl',
              background: `linear-gradient(to left, #ffffff 0%, #38bdf8 ${progressPercent}%, rgba(255,255,255,0.25) ${progressPercent}%, rgba(255,255,255,0.25) 100%)`
            }}
            aria-label="شريط تقدم التلاوة"
          />
          <div className="flex items-center justify-between text-[11px] font-mono mt-1.5 font-bold text-white/80" dir="rtl">
            <span dir="ltr">{formatTime(currentTime)}</span>
            <span dir="ltr">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Bottom Utility Dock */}
        <div className="flex items-center justify-around pt-2">
          {/* Surah Playlist */}
          <button
            onClick={() => {
              hapticTap();
              setShowTracklistDrawer(true);
            }}
            className="p-2.5 text-white/80 hover:text-white active:scale-95 transition"
            title="قائمة السور"
          >
            <ListMusic size={22} />
          </button>

          {/* Add to Playlist */}
          <button
            onClick={() => {
              hapticTap();
              setShowAddToPlaylistModal(true);
            }}
            className="p-2.5 text-white/80 hover:text-emerald-400 active:scale-95 transition"
            title="إضافة إلى قائمة تشغيل"
          >
            <Plus size={22} />
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="p-2.5 text-white/80 hover:text-white active:scale-95 transition"
            title="مشاركة التلاوة"
          >
            <Share2 size={22} />
          </button>

          {/* Open in Mushaf (only if Quran Surah) */}
          {isQuranSurah && (
            <button
              onClick={handleGoToMushaf}
              className="p-2.5 text-white/80 hover:text-white active:scale-95 transition"
              title="فتح السورة في المصحف الشريف"
            >
              <BookOpen size={22} />
            </button>
          )}

          {/* Repeat Mode */}
          <button
            onClick={handleCycleRepeat}
            className={`p-2.5 transition active:scale-95 ${repeatMode !== 'off' ? 'text-cyan-300' : 'text-white/80 hover:text-white'}`}
            title="وضع التكرار"
          >
            {repeatMode === 'repeat_one' ? (
              <div className="relative">
                <Repeat1 size={22} />
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-cyan-300" />
              </div>
            ) : repeatMode === 'repeat_all' ? (
              <div className="relative">
                <Repeat size={22} />
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-cyan-300" />
              </div>
            ) : (
              <Repeat size={22} />
            )}
          </button>
        </div>
      </div>

      {/* Sleep Timer Selection Modal */}
      {showSleepTimerModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in">
          <div className="w-full max-w-xs p-6 rounded-[2.5rem] bg-slate-900/95 border border-white/20 text-white shadow-2xl text-center backdrop-blur-3xl animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-3xl bg-amber-400/20 text-amber-300 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-400/10">
              <Moon size={28} />
            </div>
            <h3 className="font-black text-lg mb-1">مؤقت النوم</h3>
            <p className="text-xs text-slate-400 mb-5 font-bold">إيقاف التلاوة تلقائياً بعد فترة محددة</p>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {[
                { label: '15 دقيقة', val: 15 },
                { label: '30 دقيقة', val: 30 },
                { label: '45 دقيقة', val: 45 },
                { label: '60 دقيقة', val: 60 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => {
                    hapticSelection();
                    audioPlayerEngine.setSleepTimer(opt.val);
                    setShowSleepTimerModal(false);
                    toast.success(`تم ضبط مؤقت النوم بعد ${opt.label}`);
                  }}
                  className={`p-3.5 rounded-2xl border text-xs font-black transition ${
                    sleepTimerTotal === opt.val 
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-400/25' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                hapticSelection();
                audioPlayerEngine.setSleepTimer('end_of_surah');
                setShowSleepTimerModal(false);
                toast.success('سيتم إيقاف التشغيل عند نهاية السورة الحالية');
              }}
              className="w-full py-3.5 mb-2 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs font-black text-emerald-300 transition"
            >
              عند نهاية السورة الحالية
            </button>

            {sleepTimerRemaining !== null && (
              <button
                onClick={() => {
                  hapticTap();
                  audioPlayerEngine.setSleepTimer(null);
                  setShowSleepTimerModal(false);
                  toast.success('تم إلغاء مؤقت النوم');
                }}
                className="w-full py-2.5 rounded-2xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition"
              >
                إلغاء المؤقت
              </button>
            )}

            <button
              onClick={() => setShowSleepTimerModal(false)}
              className="mt-3 text-xs font-bold text-slate-400 hover:text-white"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Surah Tracklist Drawer with Live Search */}
      {showTracklistDrawer && (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg mx-auto bg-slate-900/95 border-t border-white/20 rounded-t-[2.5rem] p-6 max-h-[82vh] flex flex-col animate-in slide-in-from-bottom duration-300 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div>
                <h3 className="font-black text-base text-white">قائمة السور</h3>
                <p className="text-xs text-slate-400 font-bold">{fullTracksList.length} سورة بصوت الشيخ {currentTrack.reciterName}</p>
              </div>
              <button onClick={() => setShowTracklistDrawer(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
                <X size={18} />
              </button>
            </div>

            <div className="relative mb-3">
              <input
                type="text"
                placeholder="ابحث عن اسم أو رقم السورة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2.5 pr-10 pl-4 rounded-2xl bg-white/10 border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
              />
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
              {filteredTracks.map((t, idx) => {
                const isCurrent = t.surahNumber === currentTrack.surahNumber;
                return (
                  <button
                    key={`${t.surahNumber}_${idx}`}
                    onClick={() => {
                      hapticSelection();
                      if (isCurrent) {
                        void audioPlayerEngine.togglePlay();
                      } else {
                        audioPlayerEngine.playTrack(t, fullTracksList, fullTracksList.findIndex(item => item.surahNumber === t.surahNumber));
                      }
                      setShowTracklistDrawer(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition ${
                      isCurrent 
                        ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/20 border border-emerald-500/40 text-emerald-300 shadow-md' 
                        : 'bg-white/5 hover:bg-white/10 text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-black ${
                        isCurrent ? 'bg-emerald-400 text-slate-950 font-black' : 'bg-white/10 text-slate-300'
                      }`}>
                        {t.surahNumber}
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-black block">{t.surahName}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{t.ayahCount || 0} آية</span>
                      </div>
                    </div>
                    {isCurrent && isPlaying && (
                      <div className="flex items-center gap-1 text-emerald-400">
                        <span className="w-1.5 h-3 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="w-1.5 h-5 bg-emerald-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Background & Theme Customizer Modal */}
      {showBgModal && (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg mx-auto bg-slate-900/95 border-t border-white/20 rounded-t-[2.5rem] p-6 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
                  <Palette size={18} />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">خلفية ومظهر المشغل</h3>
                  <p className="text-[11px] text-slate-400 font-bold">اختر بين التدرجات الشفقية الحية أو لون نقي موحد</p>
                </div>
              </div>
              <button onClick={() => setShowBgModal(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-hide">
              {/* Category 1: Live Multi-Color Gradients */}
              <div>
                <h4 className="text-xs font-black text-cyan-300 mb-2.5 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>تدرجات شفقية حية متعددة الألوان (Multi-Color Aurora)</span>
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {PLAYER_BG_PRESETS.filter(p => p.category === 'gradient').map((preset) => {
                    const isSelected = bgPreset.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          hapticSelection();
                          QuranAudioThemeService.setPlayerBgMode(preset.id);
                        }}
                        className={`p-3 rounded-2xl border flex items-center justify-between transition active:scale-95 ${
                          isSelected 
                            ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div 
                            className="w-7 h-7 rounded-full shadow-md border-2 border-white/50 shrink-0"
                            style={{
                              background: preset.previewSecondary 
                                ? `linear-gradient(135deg, ${preset.previewColor}, ${preset.previewSecondary})`
                                : preset.previewColor
                            }}
                          />
                          <span className="text-xs font-black truncate">{preset.name}</span>
                        </div>
                        {isSelected && <Check size={16} className="text-cyan-300 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category 2: Single-Color Aurora Waves */}
              <div>
                <h4 className="text-xs font-black text-amber-300 mb-2.5 flex items-center gap-1.5">
                  <Sliders size={14} />
                  <span>أمواج شفقية بلون أحادي نقي (Single-Hue Waves)</span>
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {PLAYER_BG_PRESETS.filter(p => p.category === 'solid').map((preset) => {
                    const isSelected = bgPreset.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          hapticSelection();
                          QuranAudioThemeService.setPlayerBgMode(preset.id);
                        }}
                        className={`p-3 rounded-2xl border flex items-center justify-between transition active:scale-95 ${
                          isSelected 
                            ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div 
                            className="w-7 h-7 rounded-full shadow-md border-2 border-white/60 shrink-0"
                            style={{ backgroundColor: preset.previewColor }}
                          />
                          <span className="text-xs font-black truncate">{preset.name}</span>
                        </div>
                        {isSelected && <Check size={16} className="text-amber-300 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 mt-3 flex justify-end">
              <button
                onClick={() => setShowBgModal(false)}
                className="w-full py-3 rounded-2xl bg-white text-slate-950 font-black text-xs hover:bg-slate-100 transition active:scale-95"
              >
                تم وتطبيق المظهر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add To Playlist Modal */}
      {showAddToPlaylistModal && currentTrack && (
        <AddToPlaylistModal
          track={currentTrack}
          onClose={() => setShowAddToPlaylistModal(false)}
        />
      )}
    </div>
  );
};
