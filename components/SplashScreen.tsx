import React, { useEffect, useRef } from 'react';
import { LOGO_WHITE } from '../constants';
import { ChevronLeft } from 'lucide-react';

interface SplashScreenProps {
  quickMode?: boolean;
  onDismiss?: () => void;
}

const INTRO_AUDIO_URL = 'https://od.lk/s/ODZfNzMwMTA4NTJf/1-a%20introduction%20to%20anatomy.mp3';

const SplashScreen: React.FC<SplashScreenProps> = ({ quickMode, onDismiss }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (quickMode) {
      return;
    }

    try {
      const audio = new Audio(INTRO_AUDIO_URL);
      audioRef.current = audio;
      audio.volume = 0.65;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log('Audio autoplay prevented:', error);
        });
      }
    } catch (error) {
      console.error('Audio playback error:', error);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, [quickMode]);

  return (
    <div 
      onClick={onDismiss}
      className="fixed inset-0 cursor-pointer select-none bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.28),_transparent_38%),linear-gradient(180deg,_#1e1b4b_0%,_#0f172a_52%,_#020617_100%)] flex flex-col items-center justify-center text-white z-[100] overflow-hidden"
    >
      <div className="absolute inset-0 bg-[url('/assets/patterns/cubes.png')] opacity-[0.06]" />
      <div className={`absolute w-72 h-72 rounded-full bg-violet-500/20 blur-[90px] ${quickMode ? 'animate-pulse' : 'animate-pulse-slow'}`} />

      {/* Skip Button */}
      {onDismiss && !quickMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="absolute top-[max(env(safe-area-inset-top,0px),1.25rem)] left-5 z-20 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-violet-200 backdrop-blur-md border border-white/15 transition flex items-center gap-1 shadow-lg"
          aria-label="تخطي المقدمة"
        >
          <span>تخطي</span>
          <ChevronLeft size={14} className="rtl:rotate-180" />
        </button>
      )}

      <div className={`relative flex flex-col items-center justify-center transition-all duration-500 ${quickMode ? 'scale-95' : 'scale-100'}`}>
        <div className="relative mb-5">
          <div className={`absolute inset-0 rounded-full bg-white/10 blur-[60px] ${quickMode ? '' : 'animate-pulse-slow'}`} />
          <img
            src={LOGO_WHITE}
            className={`relative object-contain drop-shadow-2xl ${quickMode ? 'w-36 h-36' : 'w-44 h-44 animate-float'}`}
            alt="Ifaqa Logo"
          />
        </div>

        <h1 className={`font-black tracking-tight drop-shadow-2xl ${quickMode ? 'text-4xl' : 'text-5xl'}`}>إفاقة</h1>
        <p className={`mt-3 text-violet-100/90 font-bold ${quickMode ? 'text-sm tracking-[0.2em]' : 'text-base tracking-[0.3em]'}`}>
          أيقظ قلبك
        </p>

        {!quickMode && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold text-violet-100/80 backdrop-blur-sm">
              أهلاً بك في إفاقة
            </div>
            <p className="text-[10px] text-violet-300/60 font-bold tracking-wide">انقر في أي مكان للمتابعة فوراً</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplashScreen;
