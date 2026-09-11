import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Sparkles, Volume2, X, Check, Clock, Moon, SunMedium } from 'lucide-react';
import {
  FAJR_ALARM_THEMES,
  SOUND_PRESETS,
  FajrAlarmThemeId,
  FajrAlarmSoundOption
} from '../services/fajrAlarmCustomization';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  themeId: FajrAlarmThemeId;
  soundType: FajrAlarmSoundOption;
  customSoundUrl?: string;
  defaultAdminSound?: string;
}

export default function FajrAlarmPreviewModal({
  isOpen,
  onClose,
  themeId,
  soundType,
  customSoundUrl,
  defaultAdminSound
}: Props) {
  const [timeStr, setTimeStr] = useState('04:30');
  const [secondsStr, setSecondsStr] = useState('00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const theme = FAJR_ALARM_THEMES[themeId] || FAJR_ALARM_THEMES.emerald;

  // Resolve target audio URL
  const soundPreset = SOUND_PRESETS.find(p => p.id === soundType);
  let audioUrl = (soundPreset as any)?.url || '/audio/adhan/makkah.mp3';
  const fallbackUrl = (soundPreset as any)?.fallbackUrl;
  if (soundType === 'default') {
    audioUrl = defaultAdminSound || '/audio/adhan/makkah.mp3';
  } else if (soundType === 'custom' && customSoundUrl) {
    audioUrl = customSoundUrl;
  }

  // Update real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${h}:${m}`);
      setSecondsStr(s);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Play audio on open
  useEffect(() => {
    if (!isOpen) {
      stopAudio();
      setActionDone(null);
      return;
    }

    setActionDone(null);
    if (audioUrl) {
      try {
        const audio = new Audio();
        audio.src = audioUrl;
        audio.loop = true;
        audio.preload = 'auto';
        audioRef.current = audio;

        audio.onerror = () => {
          if (fallbackUrl && audio.src !== fallbackUrl) {
            audio.src = fallbackUrl;
            audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          } else {
            setIsPlaying(false);
          }
        };

        audio.play()
          .then(() => setIsPlaying(true))
          .catch((e) => {
            console.warn('Audio play failed, trying fallback:', e);
            if (fallbackUrl) {
              audio.src = fallbackUrl;
              audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            } else {
              setIsPlaying(false);
            }
          });
      } catch {
        setIsPlaying(false);
      }
    }

    return () => {
      stopAudio();
    };
  }, [isOpen, audioUrl]);

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }

  function handleAwake() {
    stopAudio();
    setActionDone('awake');
    setTimeout(() => {
      onClose();
    }, 1200);
  }

  function handleSnooze() {
    stopAudio();
    setActionDone('snooze');
    setTimeout(() => {
      onClose();
    }, 1200);
  }

  function handleExit() {
    stopAudio();
    onClose();
  }

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-between p-6 sm:p-10 select-none animate-in fade-in duration-300 overflow-hidden"
      style={{
        background: `radial-gradient(circle at top, rgba(255,255,255,0.06) 0%, transparent 60%), linear-gradient(145deg, rgb(${theme.bgColorRgb[0]}, ${theme.bgColorRgb[1]}, ${theme.bgColorRgb[2]}), #050811)`
      }}
      dir="rtl"
    >
      {/* Background celestial pulse rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
        <div
          className="w-96 h-96 rounded-full animate-ping"
          style={{ backgroundColor: theme.accentColor, animationDuration: '3s' }}
        />
        <div
          className="w-[500px] h-[500px] rounded-full border-2 animate-pulse"
          style={{ borderColor: theme.accentColor, animationDuration: '4s' }}
        />
      </div>

      {/* Top Bar: Preview Tag & Close */}
      <div className="relative z-10 w-full max-w-md flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-[11px] font-black text-amber-300 shadow">
          <Sparkles size={13} className="animate-spin" />
          <span>معاينة حية للمنبّه</span>
        </div>

        <button
          type="button"
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-black text-slate-200 transition backdrop-blur-md active:scale-95"
        >
          <X size={15} />
          <span>إنهاء المعاينة</span>
        </button>
      </div>

      {/* Main Alarm Content */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center my-auto py-6">
        {/* Animated Bell Icon */}
        <div className="relative mb-6">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-white shadow-2xl transition-transform"
            style={{
              backgroundColor: theme.accentColor,
              boxShadow: `0 0 45px ${theme.accentColor}88`
            }}
          >
            <Bell size={44} className="animate-bounce" />
          </div>
          {isPlaying && (
            <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-slate-950 border border-white/20 text-[10px] font-black text-amber-300 flex items-center gap-1 shadow">
              <Volume2 size={11} className="animate-pulse" />
              <span>الصوت يعمل</span>
            </div>
          )}
        </div>

        {/* Real-time Clock */}
        <div className="flex items-baseline gap-2 text-white font-mono font-black drop-shadow-2xl">
          <span className="text-6xl sm:text-7xl tracking-tighter tabular-nums">{timeStr}</span>
          <span className="text-xl sm:text-2xl opacity-60 tabular-nums">:{secondsStr}</span>
        </div>

        {/* Alarm Title & Message */}
        <h1
          className="mt-4 text-2xl sm:text-3xl font-black tracking-tight drop-shadow-lg"
          style={{ color: theme.textColor }}
        >
          حان وقت صلاة الفجر
        </h1>
        <p className="mt-2 text-sm sm:text-base font-bold text-slate-300 max-w-xs leading-relaxed">
          «الصلاة خيرٌ من النوم» · انفض عنك غبار الكسل واستجب لنداء الرحمن.
        </p>

        {/* Theme and Sound Info badge */}
        <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-bold text-slate-300">
          <Moon size={13} className="text-amber-300" />
          <span>الثيم: {theme.name}</span>
          <span>·</span>
          <span>{soundPreset?.name || 'صوت مخصص'}</span>
        </div>

        {/* Action Status Toast */}
        {actionDone === 'awake' && (
          <div className="mt-6 px-5 py-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm flex items-center gap-2 shadow-2xl animate-in zoom-in">
            <Check size={18} strokeWidth={3} />
            <span>تقبّل الله طاعتكم! تم الاستيقاظ وإيقاف المنبّه.</span>
          </div>
        )}
        {actionDone === 'snooze' && (
          <div className="mt-6 px-5 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm flex items-center gap-2 shadow-2xl animate-in zoom-in">
            <Clock size={18} strokeWidth={3} />
            <span>تم تفعيل الغفوة لـ ٥ دقائق.</span>
          </div>
        )}
      </div>

      {/* Bottom Alarm Action Buttons */}
      <div className="relative z-10 w-full max-w-md flex flex-col gap-3">
        <button
          type="button"
          onClick={handleAwake}
          className="w-full py-4 px-6 rounded-2xl text-slate-950 font-black text-base sm:text-lg shadow-2xl flex items-center justify-center gap-2.5 transition active:scale-95 hover:brightness-110"
          style={{
            backgroundColor: theme.accentColor,
            boxShadow: `0 10px 30px ${theme.accentColor}55`
          }}
        >
          <Check size={22} strokeWidth={3} />
          <span>أنا صحيت · إيقاف المنبّه</span>
        </button>

        <button
          type="button"
          onClick={handleSnooze}
          className="w-full py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 font-black text-sm transition active:scale-95 backdrop-blur-xl flex items-center justify-center gap-2"
        >
          <Clock size={16} />
          <span>غفوة ٥ دقائق</span>
        </button>

        <p className="text-center text-[11px] font-bold text-slate-400 mt-1">
          هذه محاكاة تفاعلية مطابقة تماماً لشاشة المنبّه الحقيقية على جهازك.
        </p>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
