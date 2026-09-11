import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, X, Gauge, User, Download, RotateCcw, Sparkles } from 'lucide-react';
import { DownloadService } from '../services/DownloadService';
import { quranSurahs } from '../../quranMetadata';
import { quraniApi, AudioSegment } from '../services/quraniApi';
import { nativeQuranAudio, shouldUseNativeQuranAudio } from '../services/nativeQuranAudio';
import { hapticTap, hapticSelection } from '../services/haptics';
import '../styles/AudioPlayerLuxury.css';

interface AudioPlayerProps {
  onClose: () => void;
}

const RECITERS = [
  { id: 'Alafasy_128kbps', name: 'مشاري العفاسي' },
  { id: 'Husary_128kbps', name: 'محمود خليل الحصري' },
  { id: 'Minshawy_Murattal_128kbps', name: 'محمد صديق المنشاوي' },
  { id: 'AbdulSamad_64kbps', name: 'عبد الباسط عبد الصمد' },
  { id: 'Ghamadi_40kbps', name: 'سعد الغامدي' },
  { id: 'Saood_ash-Shuraym_128kbps', name: 'سعود الشريم' },
];

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAyah, setCurrentAyah] = useState<any>(null);
  const [reciter, setReciter] = useState(RECITERS[0]);
  const [mode, setMode] = useState<'single' | 'surah'>('single');
  const [speed, setSpeed] = useState(1);
  const [showReciters, setShowReciters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setSegments] = useState<AudioSegment[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAyahRef = useRef<any>(null);
  const modeRef = useRef<'single' | 'surah'>('single');
  const reciterRef = useRef(RECITERS[0]);

  useEffect(() => { currentAyahRef.current = currentAyah; }, [currentAyah]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { reciterRef.current = reciter; }, [reciter]);

  useEffect(() => {
    if (!shouldUseNativeQuranAudio()) return;

    let stateHandle: any = null;
    let compHandle: any = null;

    nativeQuranAudio.listen((state) => {
      setIsPlaying(state.isPlaying);
      setLoading(state.isBuffering);
      if (currentAyahRef.current) {
        window.dispatchEvent(new CustomEvent('quran_audio_timeupdate', {
          detail: {
            currentTime: state.currentTime * 1000,
            surah: currentAyahRef.current.surah,
            ayah: currentAyahRef.current.ayah,
          }
        }));
      }
    }).then(h => { stateHandle = h; }).catch(() => {});

    nativeQuranAudio.onCompleted(() => {
      if (modeRef.current === 'surah' && currentAyahRef.current) {
        playNextAyah(currentAyahRef.current);
      } else {
        setIsPlaying(false);
      }
    }).then(h => { compHandle = h; }).catch(() => {});

    return () => {
      if (stateHandle?.remove) stateHandle.remove();
      if (compHandle?.remove) compHandle.remove();
    };
  }, []);

  useEffect(() => {
    const handlePlayRequest = (e: any) => {
      const data = e.detail;
      setCurrentAyah(data);
      playAudio(data, reciter.id);
    };

    window.addEventListener('play_ayah_request', handlePlayRequest);
    return () => window.removeEventListener('play_ayah_request', handlePlayRequest);
  }, [reciter, mode, speed]);

  const playAudio = async (ayah: any, reciterId: string) => {
    setLoading(true);
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const paddedSurah = String(ayah.surah).padStart(3, '0');
    const paddedAyah = String(ayah.ayah).padStart(3, '0');
    
    // Check local storage first
    let url = await DownloadService.getLocalAudioUri(ayah.surah, reciterId);
    
    // If not local, use remote
    if (!url) {
      url = `https://everyayah.com/data/${reciterId}/${paddedSurah}${paddedAyah}.mp3`;
    }

    const surahMeta = quranSurahs.find(s => s.number === ayah.surah);
    const title = `سورة ${surahMeta?.name || ayah.surah} - آية ${ayah.ayah}`;
    const artist = reciter.name;

    if (shouldUseNativeQuranAudio()) {
      try {
        await nativeQuranAudio.playUrl({
          url,
          title,
          artist,
          album: 'المصحف الشريف',
          speed,
          position: 0
        });
        setIsPlaying(true);
        setLoading(false);
      } catch (err) {
        console.error("Native playAudio error", err);
        setLoading(false);
        setIsPlaying(false);
      }
      quraniApi.getAyahSegments(ayah.surah, ayah.ayah).then(setSegments).catch(() => setSegments([]));
      return;
    }

    const audio = new Audio(url);
    audio.playbackRate = speed;
    audioRef.current = audio;

    audio.oncanplay = () => {
      audio.play();
      setIsPlaying(true);
      setLoading(false);
    };

    audio.ontimeupdate = () => {
      window.dispatchEvent(new CustomEvent('quran_audio_timeupdate', { 
        detail: { 
          currentTime: audio.currentTime * 1000, 
          surah: ayah.surah,
          ayah: ayah.ayah
        } 
      }));
    };

    quraniApi.getAyahSegments(ayah.surah, ayah.ayah).then(setSegments).catch(() => setSegments([]));

    audio.onended = () => {
      if (mode === 'surah') {
        playNextAyah(ayah);
      } else {
        setIsPlaying(false);
      }
    };

    audio.onerror = () => {
      console.error("Audio Load Error");
      setLoading(false);
      setIsPlaying(false);
    };
  };

  const playNextAyah = (current: any) => {
    const nextAyah = { ...current, ayah: current.ayah + 1 };
    setCurrentAyah(nextAyah);
    playAudio(nextAyah, reciter.id);
  };

  const togglePlay = () => {
    hapticTap();
    if (shouldUseNativeQuranAudio()) {
      void nativeQuranAudio.toggle();
      return;
    }
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const changeSpeed = () => {
    hapticSelection();
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setSpeed(newSpeed);
    if (shouldUseNativeQuranAudio()) {
      void nativeQuranAudio.setSpeed(newSpeed);
    }
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
  };

  const handleClose = () => {
    hapticTap();
    if (shouldUseNativeQuranAudio()) {
      void nativeQuranAudio.stop();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    onClose();
  };

  if (!currentAyah) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[700] bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl border-t border-white/15 p-4 pb-safe animate-in slide-in-from-bottom duration-500 shadow-[0_-15px_50px_rgba(0,0,0,0.6)] text-white">
      <div className="max-w-md mx-auto relative">
        
        {/* Subtle glow header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/25 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 ${isPlaying ? 'animate-pulse shadow-lg shadow-emerald-500/20' : ''}`}>
                <Headphones size={24} />
             </div>
             <div dir="rtl">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-white text-sm">
                      سورة {quranSurahs.find(s => s.number === currentAyah.surah)?.name || '...'}
                  </h4>
                  {isPlaying && (
                    <div className="flex items-end gap-0.5 h-3">
                      <span className="mini-eq-bar playing" style={{ animationDelay: '0.1s' }} />
                      <span className="mini-eq-bar playing" style={{ animationDelay: '0.3s' }} />
                      <span className="mini-eq-bar playing" style={{ animationDelay: '0.2s' }} />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-emerald-400/90 font-bold mt-0.5">آية {currentAyah.ayah} • القارئ {reciter.name}</p>
             </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition active:scale-90">
            <X size={20} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
           {/* Speed & Reciter */}
           <div className="flex items-center gap-1.5">
              <button onClick={changeSpeed} className="w-10 h-10 flex flex-col items-center justify-center bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-slate-300 active:scale-90 transition">
                <Gauge size={16} />
                <span className="text-[8px] font-mono font-bold text-emerald-400">{speed}x</span>
              </button>
              <button onClick={() => { hapticTap(); setShowReciters(!showReciters); }} className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-slate-300 active:scale-90 transition">
                <User size={18} />
              </button>
           </div>

           {/* Main Play Group */}
           <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  hapticSelection();
                  setMode(mode === 'single' ? 'surah' : 'single');
                }}
                className={`p-2.5 rounded-2xl transition border active:scale-90 ${
                  mode === 'surah' 
                    ? 'bg-emerald-500/25 border-emerald-500/40 text-emerald-300 shadow-md' 
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
                title={mode === 'surah' ? 'الاستماع حتى نهاية السورة' : 'الاستماع للآية فقط'}
              >
                <RotateCcw size={20} className={mode === 'surah' ? 'rotate-180' : ''} />
              </button>

              <button 
                onClick={togglePlay} 
                disabled={loading}
                className={`w-14 h-14 bg-gradient-to-tr from-emerald-400 to-cyan-300 text-slate-950 rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition disabled:opacity-50 ${
                  isPlaying ? 'play-btn-glow is-active' : ''
                }`}
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause size={28} fill="currentColor" />
                ) : (
                  <Play size={28} fill="currentColor" className="translate-x-0.5" />
                )}
              </button>

              <button 
                onClick={() => { hapticTap(); playNextAyah(currentAyah); }} 
                className="p-2.5 text-slate-300 hover:text-white bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition"
                title="الآية التالية"
              >
                <SkipForward size={20} />
              </button>
           </div>

           {/* Download placeholder */}
           <button className="w-10 h-10 flex items-center justify-center bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-2xl active:scale-90 transition">
             <Download size={18} />
           </button>
        </div>

        {/* Reciters List Overlay */}
        {showReciters && (
            <div className="absolute bottom-full left-0 right-0 mb-3 bg-slate-900/98 border border-white/20 rounded-3xl shadow-2xl p-3 animate-in fade-in slide-in-from-bottom-4 duration-300 backdrop-blur-2xl">
               <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs font-black text-slate-300" dir="rtl">
                 <span>اختر القارئ</span>
                 <X size={16} className="cursor-pointer text-slate-400 hover:text-white" onClick={() => setShowReciters(false)} />
               </div>
               <div className="grid grid-cols-2 gap-1.5" dir="rtl">
                  {RECITERS.map(r => (
                    <button 
                        key={r.id}
                        onClick={() => { 
                          hapticSelection();
                          setReciter(r); 
                          setShowReciters(false); 
                          if(currentAyah) playAudio(currentAyah, r.id); 
                        }}
                        className={`p-2.5 rounded-2xl text-xs font-bold transition ${
                          reciter.id === r.id 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md' 
                            : 'hover:bg-white/10 bg-white/5 text-slate-200'
                        }`}
                    >
                        {r.name}
                    </button>
                  ))}
               </div>
            </div>
        )}
      </div>
    </div>
  );
};

const Headphones = ({ size, className }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
    </svg>
);
