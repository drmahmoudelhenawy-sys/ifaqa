import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, Loader2, X, ChevronDown, Music2 } from 'lucide-react';
import { audioPlayerEngine, AudioPlayerState } from '../../services/audioPlayerEngine';
import { ReciterAvatar } from './ReciterAvatar';
import { hapticTap, hapticSelection } from '../../services/haptics';
import '../../styles/AudioPlayerLuxury.css';

interface FloatingMiniPlayerProps {
  hasBottomNav?: boolean;
  onOpenSurahInMushaf?: (surahNumber: number) => void;
}

export const FloatingMiniPlayer: React.FC<FloatingMiniPlayerProps> = ({ hasBottomNav = false }) => {
  const [playerState, setPlayerState] = useState<AudioPlayerState>(audioPlayerEngine.getState());
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isModalActive, setIsModalActive] = useState(false);

  useEffect(() => {
    const unsub = audioPlayerEngine.subscribe((state) => {
      setPlayerState(state);
      if (state.isPlaying) {
        setIsDismissed(false);
      }
    });

    const handleModal = (e: Event) => {
      const customEvent = e as CustomEvent<{ open?: boolean }>;
      setIsModalActive(Boolean(customEvent.detail?.open));
    };

    window.addEventListener('ifaqa_modal_state_changed', handleModal);

    return () => {
      unsub();
      window.removeEventListener('ifaqa_modal_state_changed', handleModal);
    };
  }, []);

  const { currentTrack, isPlaying, isBuffering, isFullScreenOpen } = playerState;

  // Do not render if no track, full screen is open, dismissed, or a modal is actively open
  if (!currentTrack || isFullScreenOpen || isDismissed || isModalActive) return null;

  const handleOpenFull = () => {
    hapticTap();
    audioPlayerEngine.setFullScreenOpen(true);
  };

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticTap();
    void audioPlayerEngine.togglePlay();
  };

  const handleNextTrack = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticSelection();
    audioPlayerEngine.nextTrack();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticTap();
    audioPlayerEngine.closePlayer();
    setIsDismissed(true);
  };

  const handleToggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticTap();
    setIsMinimized(prev => !prev);
  };

  const progressPercent = playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0;

  // Minimized Floating Disc Mode (leaves all screen buttons 100% visible and accessible)
  if (isMinimized) {
    return (
      <div 
        onClick={() => {
          hapticTap();
          setIsMinimized(false);
        }}
        className={`fixed ${hasBottomNav ? 'bottom-20' : 'bottom-6'} left-4 z-[45] flex items-center gap-2 p-1.5 pr-3 rounded-full bg-slate-900/95 dark:bg-slate-950/95 border border-emerald-400/40 text-white shadow-2xl backdrop-blur-xl cursor-pointer active:scale-95 transition-all animate-in zoom-in-75`}
        title="انقر لتوسيع مشغل القرآن"
      >
        <div className="relative">
          <ReciterAvatar name={currentTrack.reciterName} src={currentTrack.reciterPhoto} size={36} ring={false} />
          {isPlaying && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border border-slate-950" />
          )}
        </div>

        <div className="flex items-center gap-1.5 min-w-0 pr-1">
          <Music2 size={14} className="text-emerald-400 shrink-0" />
          <span className="text-[11px] font-black text-white truncate max-w-[90px]">
            {currentTrack.surahName ? `سورة ${currentTrack.surahName}` : 'تلاوة'}
          </span>
        </div>

        <button
          onClick={handleTogglePlay}
          className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition"
          title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
        >
          {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="translate-x-0.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed ${hasBottomNav ? 'bottom-20 md:bottom-5' : 'bottom-3 md:bottom-5'} left-1/2 -translate-x-1/2 z-[45] w-[95%] max-w-lg animate-in slide-in-from-bottom-5 duration-300 transition-all`}>
      <div 
        onClick={handleOpenFull}
        className="group relative flex items-center justify-between p-2 sm:p-2.5 rounded-[2.2rem] bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-3xl border border-white/20 text-white shadow-[0_15px_40px_rgba(0,0,0,0.6)] cursor-pointer active:scale-98 transition overflow-hidden"
      >
        {/* Animated Gradient Glow Border */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 pointer-events-none" />

        {/* Left: Minimize, Close & Playback Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 relative z-10" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-rose-400 active:scale-90 transition rounded-full hover:bg-white/10"
            title="إغلاق المشغل نهائياً"
            aria-label="إغلاق المشغل"
          >
            <X size={17} />
          </button>

          <button
            onClick={handleToggleMinimize}
            className="p-2 text-slate-400 hover:text-amber-300 active:scale-90 transition rounded-full hover:bg-white/10"
            title="تصغير المشغل لعدم تغطية الزراير"
            aria-label="تصغير المشغل"
          >
            <ChevronDown size={18} />
          </button>

          <button
            onClick={handleNextTrack}
            className="p-2 text-slate-300 hover:text-white active:scale-90 transition rounded-full hover:bg-white/10"
            title="السورة التالية"
            aria-label="السورة التالية"
          >
            <SkipBack size={18} />
          </button>

          <button
            onClick={handleTogglePlay}
            className={`w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-300 text-slate-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition ${
              isPlaying ? 'play-btn-glow is-active' : ''
            }`}
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {isBuffering ? (
              <Loader2 size={18} className="animate-spin text-slate-950" />
            ) : isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="translate-x-0.5" />
            )}
          </button>
        </div>

        {/* Center: Track & Reciter Info with Mini Equalizer */}
        <div className="flex-1 min-w-0 px-2 sm:px-3 text-right relative z-10">
          <div className="flex items-center justify-end gap-2">
            {/* Live Mini EQ Visualizer Bars */}
            {isPlaying && (
              <div className="flex items-end gap-0.5 h-3.5 shrink-0">
                <span className="mini-eq-bar playing" style={{ animationDelay: '0.1s' }} />
                <span className="mini-eq-bar playing" style={{ animationDelay: '0.4s' }} />
                <span className="mini-eq-bar playing" style={{ animationDelay: '0.2s' }} />
              </div>
            )}
            <span className="text-xs sm:text-sm font-black text-white truncate tracking-tight">
              {currentTrack.surahNumber && currentTrack.surahNumber > 0
                ? `سورة ${currentTrack.surahName}`
                : (currentTrack.surahName || currentTrack.surahEnglishName || 'ملف صوتي')}
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-300 dark:text-slate-300 truncate mt-0.5 flex items-center justify-end gap-1">
            <span>
              {currentTrack.surahNumber && currentTrack.surahNumber > 0
                ? (currentTrack.reciterName.startsWith('الشيخ') ? currentTrack.reciterName : `الشيخ ${currentTrack.reciterName}`)
                : currentTrack.reciterName}
            </span>
          </p>
        </div>

        {/* Right: Reciter Avatar with Soft Halo */}
        <div className="relative z-10 shrink-0">
          <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 shadow-md">
            <ReciterAvatar name={currentTrack.reciterName} src={currentTrack.reciterPhoto} size={42} ring={false} />
          </div>
        </div>

        {/* Glowing Progress Timeline Line at Bottom of Mini Player */}
        {playerState.duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
