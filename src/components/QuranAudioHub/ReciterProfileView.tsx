import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight,
  Star,
  Play,
  Pause,
  Search,
  Shuffle,
  Download,
  Check,
  Loader2,
  HardDrive,
  Trash2,
  X,
  CheckCircle2,
  CloudDownload,
  Plus,
  BookOpen,
  Heart
} from 'lucide-react';
import { HubReciter, QuranAudioHubService, AudioTrack } from '../../services/quranAudioHubService';
import { audioPlayerEngine, AudioPlayerState } from '../../services/audioPlayerEngine';
import { QuranAudioThemeService, AudioTheme } from '../../services/quranAudioTheme';
import { quranSurahs } from '../../../quranMetadata';
import { hapticTap, hapticSelection, hapticSuccess } from '../../services/haptics';
import toast from 'react-hot-toast';
import { QuranAudioOfflineService, BatchDownloadState } from '../../services/quranAudioOfflineService';
import { ReciterAvatar } from './ReciterAvatar';
import { AddToPlaylistModal } from './AddToPlaylistModal';

const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNumber(value: number | string) {
  return String(value).replace(/[0-9]/g, (digit) => arabicDigits[Number(digit)]);
}

interface ReciterProfileViewProps {
  reciter: HubReciter;
  onBack: () => void;
  onOpenMushaf?: (surahNumber: number) => void;
}

export const ReciterProfileView: React.FC<ReciterProfileViewProps> = ({
  reciter,
  onBack,
  onOpenMushaf,
}) => {
  const [selectedMoshafIdx, setSelectedMoshafIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<AudioTheme>(QuranAudioThemeService.getTheme());
  const [isFav, setIsFav] = useState(() => {
    const favs = QuranAudioHubService.getFavorites();
    return favs.includes(reciter.id);
  });

  useEffect(() => {
    const favs = QuranAudioHubService.getFavorites();
    setIsFav(favs.includes(reciter.id));
  }, [reciter.id]);

  const [playerState, setPlayerState] = useState<AudioPlayerState>(audioPlayerEngine.getState());
  const [offlineRevision, setOfflineRevision] = useState(0);
  const [favRevision, setFavRevision] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState<Record<number, number>>({});
  const [batchProgress, setBatchProgress] = useState<BatchDownloadState | null>(null);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<AudioTrack | null>(null);

  useEffect(() => {
    const unsubPlayer = audioPlayerEngine.subscribe((state) => {
      setPlayerState(state);
    });

    const unsubTheme = QuranAudioThemeService.subscribe((t) => {
      setTheme(t);
    });

    const handleFavChange = () => setFavRevision(r => r + 1);
    window.addEventListener('ifaqa_favorite_tracks_changed', handleFavChange);

    return () => {
      unsubPlayer();
      unsubTheme();
      window.removeEventListener('ifaqa_favorite_tracks_changed', handleFavChange);
    };
  }, []);

  const activeMoshaf = reciter.moshaf[selectedMoshafIdx] || reciter.moshaf[0];

  useEffect(() => {
    const refresh = () => {
      setOfflineRevision(value => value + 1);
      const active = QuranAudioOfflineService.getActiveBatch(reciter.id, activeMoshaf?.name || 'المصحف المرتل');
      setBatchProgress(active);
    };

    const handleBatchChange = () => {
      const active = QuranAudioOfflineService.getActiveBatch(reciter.id, activeMoshaf?.name || 'المصحف المرتل');
      setBatchProgress(active);
    };

    window.addEventListener('quran_offline_audio_changed', refresh);
    window.addEventListener('quran_offline_batch_changed', handleBatchChange);

    const active = QuranAudioOfflineService.getActiveBatch(reciter.id, activeMoshaf?.name || 'المصحف المرتل');
    setBatchProgress(active);

    return () => {
      window.removeEventListener('quran_offline_audio_changed', refresh);
      window.removeEventListener('quran_offline_batch_changed', handleBatchChange);
    };
  }, [reciter.id, activeMoshaf?.name]);

  const availableSurahNumbers: number[] = useMemo(() => {
    if (!activeMoshaf?.surah_list) {
      return Array.from({ length: 114 }, (_, i) => i + 1);
    }
    return activeMoshaf.surah_list
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => Number.isFinite(n) && n >= 1 && n <= 114);
  }, [activeMoshaf]);

  const surahsList = useMemo(() => {
    return quranSurahs.filter(s => availableSurahNumbers.includes(s.number));
  }, [availableSurahNumbers]);

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return surahsList;
    const query = searchQuery.trim().toLowerCase();
    return surahsList.filter(s => 
      s.name.includes(query) || 
      (s.englishName && s.englishName.toLowerCase().includes(query)) ||
      String(s.number).includes(query)
    );
  }, [surahsList, searchQuery]);

  const moshafStats = useMemo(() => {
    void offlineRevision;
    return QuranAudioOfflineService.getMoshafDownloadStats(
      reciter.id,
      activeMoshaf?.name || 'المصحف المرتل',
      surahsList.length
    );
  }, [reciter.id, activeMoshaf?.name, surahsList.length, offlineRevision]);

  const handleToggleFav = () => {
    hapticSuccess();
    const next = QuranAudioHubService.toggleFavorite(reciter.id);
    setIsFav(next);
    toast.success(next ? "تمت إضافة القارئ للمفضلة " : 'تمت الإزالة من المفضلة');
  };

  const getAudioTrackForSurah = (surahNumber: number): AudioTrack => {
    const surah = quranSurahs.find(s => s.number === surahNumber) || quranSurahs[0];
    const server = activeMoshaf?.server || 'https://server8.mp3quran.net/afs/';
    return {
      surahNumber: surah.number,
      surahName: surah.name,
      surahEnglishName: surah.englishName,
      ayahCount: surah.ayahCount,
      reciterId: reciter.id,
      reciterName: reciter.name,
      reciterPhoto: reciter.photoUrl,
      moshafName: activeMoshaf?.name || 'المصحف المرتل',
      audioUrl: QuranAudioHubService.buildAudioUrl(server, surah.number),
    };
  };

  const handleSelectMoshaf = (idx: number) => {
    hapticSelection();
    setSelectedMoshafIdx(idx);
    const newMoshaf = reciter.moshaf[idx];
    if (!newMoshaf) return;

    // If currently playing a track from this reciter, switch immediately to the newly selected Moshaf for the current surah!
    const isFromThisReciter = currentTrack && (
      currentTrack.reciterId === reciter.id ||
      String(currentTrack.reciterId) === String(reciter.id) ||
      currentTrack.reciterName === reciter.name
    );

    if (isFromThisReciter && isPlaying) {
      const targetSurahNum = currentTrack.surahNumber || 1;
      const availableInNewMoshaf = !newMoshaf.surah_list || newMoshaf.surah_list.split(',').map(s => Number(s.trim())).includes(targetSurahNum);

      if (availableInNewMoshaf) {
        const targetSurah = quranSurahs.find(s => s.number === targetSurahNum) || quranSurahs[0];
        const newTrack: AudioTrack = {
          surahNumber: targetSurah.number,
          surahName: targetSurah.name,
          surahEnglishName: targetSurah.englishName,
          ayahCount: targetSurah.ayahCount,
          reciterId: reciter.id,
          reciterName: reciter.name,
          reciterPhoto: reciter.photoUrl,
          moshafName: newMoshaf.name,
          audioUrl: QuranAudioHubService.buildAudioUrl(newMoshaf.server, targetSurah.number),
        };

        const newSurahNumbers = !newMoshaf.surah_list
          ? Array.from({ length: 114 }, (_, i) => i + 1)
          : newMoshaf.surah_list.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n >= 1 && n <= 114);

        const newFullTracks = newSurahNumbers.map(num => {
          const s = quranSurahs.find(item => item.number === num) || quranSurahs[0];
          return {
            surahNumber: s.number,
            surahName: s.name,
            surahEnglishName: s.englishName,
            ayahCount: s.ayahCount,
            reciterId: reciter.id,
            reciterName: reciter.name,
            reciterPhoto: reciter.photoUrl,
            moshafName: newMoshaf.name,
            audioUrl: QuranAudioHubService.buildAudioUrl(newMoshaf.server, s.number),
          };
        });

        const newIndex = newSurahNumbers.findIndex(n => n === targetSurahNum);
        audioPlayerEngine.playTrack(newTrack, newFullTracks, newIndex >= 0 ? newIndex : 0);
        toast.success(`تم التبديل إلى: ${newMoshaf.name} `);
      }
    }
  };

  const handlePlaySurah = (surahNumber: number) => {
    hapticTap();
    const track = getAudioTrackForSurah(surahNumber);
    const isCurrentExact = currentTrack?.audioUrl === track.audioUrl || (
      currentTrack?.surahNumber === surahNumber &&
      (currentTrack?.reciterId === reciter.id || String(currentTrack?.reciterId) === String(reciter.id)) &&
      currentTrack?.moshafName === activeMoshaf?.name
    );

    if (isCurrentExact) {
      void audioPlayerEngine.togglePlay();
      return;
    }

    const fullTracks = surahsList.map(s => getAudioTrackForSurah(s.number));
    const initialIndex = surahsList.findIndex(s => s.number === surahNumber);
    audioPlayerEngine.playTrack(track, fullTracks, initialIndex >= 0 ? initialIndex : 0);
  };

  const handlePlayAll = (shuffle: boolean = false) => {
    hapticTap();
    if (surahsList.length === 0) return;
    let fullTracks = surahsList.map(s => getAudioTrackForSurah(s.number));
    if (shuffle) {
      fullTracks = [...fullTracks].sort(() => Math.random() - 0.5);
    }
    audioPlayerEngine.playTrack(fullTracks[0], fullTracks, 0);
    audioPlayerEngine.setFullScreenOpen(true);
    toast.success(shuffle ? 'بدأ التشغيل العشوائي' : 'بدأ تشغيل المصحف');
  };

  const handleToggleDownload = async (e: React.MouseEvent, surahNumber: number) => {
    e.stopPropagation();
    hapticTap();
    const track = getAudioTrackForSurah(surahNumber);

    if (QuranAudioOfflineService.isDownloaded(track)) {
      await QuranAudioOfflineService.deleteTrack(track);
      toast.success(`تم حذف سورة ${track.surahName} من الذاكرة`);
      setOfflineRevision(v => v + 1);
    } else {
      setDownloadProgress(prev => ({ ...prev, [surahNumber]: 1 }));
      try {
        await QuranAudioOfflineService.downloadTrack(track, (p) => {
          setDownloadProgress(prev => ({ ...prev, [surahNumber]: p }));
        });
        toast.success(`تم تنزيل سورة ${track.surahName} للعمل بدون إنترنت! `);
      } catch {
        toast.error('فشل تنزيل التلاوة، تأكد من الاتصال');
      } finally {
        setDownloadProgress(prev => {
          const next = { ...prev };
          delete next[surahNumber];
          return next;
        });
        setOfflineRevision(v => v + 1);
      }
    }
  };

  const handleDownloadEntireMoshaf = async () => {
    hapticSuccess();
    const fullTracks = surahsList.map(s => getAudioTrackForSurah(s.number));
    toast.success(`بدأ تحميل تلاوات المصحف كاملًا (${toArabicNumber(fullTracks.length)} سورة)`);
    try {
      await QuranAudioOfflineService.startBatchDownload(fullTracks, (s) => {
        setBatchProgress(s);
      });
      toast.success("اكتمل تحميل جميع سور المصحف بنجاح! ");
      setOfflineRevision(v => v + 1);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleCancelBatch = () => {
    hapticTap();
    QuranAudioOfflineService.cancelBatch(reciter.id, activeMoshaf?.name || 'المصحف المرتل');
    setBatchProgress(null);
    toast('تم إيقاف التحميل المجمع');
  };

  const handleDeleteEntireMoshaf = async () => {
    hapticTap();
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف جميع تلاوات ${activeMoshaf?.name || 'المصحف'} من جهازك؟`)) {
      return;
    }
    await QuranAudioOfflineService.deleteMoshafBatch(reciter.id, activeMoshaf?.name || 'المصحف المرتل');
    toast.success('تم حذف تلاوات الرواية بالكامل من الذاكرة');
    setOfflineRevision(v => v + 1);
  };

  const { currentTrack, isPlaying } = playerState;
  const isDark = document.documentElement.classList.contains('dark') || theme.type === 'dark';
  const isBatchDownloading = Boolean(batchProgress && !batchProgress.isCompleted && !batchProgress.isCancelled);

  return (
    <div className={`min-h-screen pb-36 bg-slate-50 dark:bg-[#050b14] text-slate-900 dark:text-white select-none animate-in fade-in duration-300 transition-colors duration-500`} dir="rtl">
      
      {/* Top Header Card with Reciter Cover */}
      <div className={`relative pt-4 pb-8 px-4 ${isDark ? 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 text-white border-white/10' : 'bg-gradient-to-b from-slate-100 via-white to-slate-100 text-slate-900 border-slate-200'} rounded-b-[2.5rem] shadow-xl border-b overflow-hidden safe-top transition-colors`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between mb-4">
          <button
            onClick={() => {
              hapticTap();
              onBack();
            }}
            className={`p-2.5 rounded-2xl transition active:scale-95 ${
              isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200/80 hover:bg-slate-300 text-slate-800'
            }`}
            aria-label="الرجوع"
          >
            <ArrowRight size={20} />
          </button>

          <button
            onClick={handleToggleFav}
            className={`p-2.5 rounded-2xl border transition active:scale-95 ${
              isFav 
                ? 'bg-amber-400/20 border-amber-400/40 text-amber-400' 
                : isDark ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' : 'bg-slate-200/80 border-slate-300 text-slate-700'
            }`}
            aria-label="إضافة للمفضلة"
          >
            <Star size={20} fill={isFav ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Reciter Details */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <ReciterAvatar name={reciter.name} src={reciter.photoUrl} size={128} className="mb-3 border-4 border-white/20 shadow-2xl" />

          <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'} drop-shadow-sm`}>
            {reciter.name}
          </h1>
          <p className={`text-xs font-bold mt-1 ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
            {activeMoshaf?.name || 'المصحف المرتل'} • {toArabicNumber(availableSurahNumbers.length)} سورة متاحة
          </p>

          {/* Moshaf / Riwayah Switcher */}
          {reciter.moshaf.length > 1 && (
            <div className={`flex items-center gap-1.5 mt-3 p-1 rounded-2xl border max-w-xs overflow-x-auto ${
              isDark ? 'bg-white/10 border-white/10' : 'bg-slate-200/80 border-slate-300'
            }`}>
              {reciter.moshaf.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMoshaf(idx)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition whitespace-nowrap ${
                    selectedMoshafIdx === idx 
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-black' 
                      : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons: Play All / Shuffle */}
          <div className="flex items-center gap-3 mt-5 w-full max-w-xs">
            <button
              onClick={() => handlePlayAll(false)}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:scale-105 active:scale-95 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
            >
              <Play size={16} fill="currentColor" />
              <span>تشغيل الكل</span>
            </button>

            <button
              onClick={() => handlePlayAll(true)}
              className={`py-3 px-4 rounded-2xl active:scale-95 font-black text-xs flex items-center justify-center gap-1.5 border transition ${
                isDark ? 'bg-white/10 hover:bg-white/15 text-white border-white/10' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
              }`}
              title="تشغيل عشوائي"
            >
              <Shuffle size={16} />
              <span>عشوائي</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full Batch Download Section for Reciter & Narration */}
      <div className="px-4 mt-5 max-w-xl mx-auto">
        {isBatchDownloading && batchProgress ? (
          /* Live Batch Download Progress Card */
          <div className="p-4 rounded-[2rem] bg-gradient-to-r from-emerald-600/25 via-teal-600/20 to-slate-900/40 border border-emerald-500/40 shadow-xl backdrop-blur-xl animate-in slide-in-from-top-3 duration-300">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md shrink-0 animate-pulse">
                  <CloudDownload size={20} />
                </div>
                <div className="min-w-0 text-right">
                  <h4 className="text-xs sm:text-sm font-black text-white truncate">
                    جاري تحميل المصحف ({activeMoshaf?.name || 'المصحف المرتل'})
                  </h4>
                  <p className="text-[11px] font-bold text-emerald-300/90 truncate mt-0.5">
                    سورة {batchProgress.currentSurahName} • ({toArabicNumber(batchProgress.completedCount)} من {toArabicNumber(batchProgress.totalCount)})
                  </p>
                </div>
              </div>

              <button
                onClick={handleCancelBatch}
                className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition active:scale-95 shrink-0 text-xs font-black flex items-center gap-1"
                title="إيقاف التحميل"
              >
                <X size={16} />
                <span>إلغاء</span>
              </button>
            </div>

            {/* Overall & Surah Progress Bar */}
            <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
              <div
                className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 h-full rounded-full transition-all duration-300 shadow-lg shadow-emerald-400/50"
                style={{
                  width: `${Math.round(
                    ((batchProgress.completedCount + batchProgress.currentPercent / 100) / batchProgress.totalCount) * 100
                  )}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-white/60 mt-1.5">
              <span>{Math.round(((batchProgress.completedCount + batchProgress.currentPercent / 100) / batchProgress.totalCount) * 100)}% مكتمل</span>
              <span>{toArabicNumber(batchProgress.totalCount - batchProgress.completedCount)} سورة متبقية</span>
            </div>
          </div>
        ) : moshafStats.isFullyDownloaded ? (
          /* Fully Downloaded Card */
          <div className={`p-4 rounded-[2rem] border flex items-center justify-between gap-3 shadow-md ${
            isDark ? 'bg-emerald-950/30 border-emerald-500/30 text-white' : 'bg-emerald-50 border-emerald-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div className="min-w-0 text-right">
                <h4 className="text-xs sm:text-sm font-black text-emerald-400 truncate">
                  المصحف محمّل بالكامل دون إنترنت
                </h4>
                <p className={`text-[11px] font-bold mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {toArabicNumber(moshafStats.downloadedCount)} سورة • {QuranAudioOfflineService.formatBytes(moshafStats.totalBytes)} في الذاكرة
                </p>
              </div>
            </div>

            <button
              onClick={handleDeleteEntireMoshaf}
              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition active:scale-95 shrink-0"
              title="حذف جميع تلاوات هذه الرواية من الجهاز"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          /* Batch Download Trigger Card */
          <div className={`p-3.5 sm:p-4 rounded-[2rem] border flex items-center justify-between gap-3 shadow-md ${
            isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25' : 'bg-emerald-100 text-emerald-700'
              }`}>
                <CloudDownload size={22} />
              </div>
              <div className="min-w-0 text-right">
                <h4 className="text-xs sm:text-sm font-black truncate">
                  تحميل {activeMoshaf?.name || 'المصحف'} كاملًا
                </h4>
                <p className={`text-[11px] font-bold mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {toArabicNumber(surahsList.length)} سورة • {moshafStats.downloadedCount > 0 ? `محمّل منها ${toArabicNumber(moshafStats.downloadedCount)}` : 'للاستماع بدون إنترنت'}
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadEntireMoshaf}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:scale-105 active:scale-95 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/20 shrink-0 transition"
              title="تحميل جميع سور هذه الرواية دفعة واحدة"
            >
              <Download size={15} />
              <span>تحميل الكل</span>
            </button>
          </div>
        )}
      </div>

      {/* Surahs List & Search Section */}
      <div className="px-4 mt-6 max-w-xl mx-auto pb-36">
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن اسم أو رقم السورة..."
            className={`w-full h-12 pr-11 pl-4 rounded-2xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm ${
              isDark 
                ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-400' 
                : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'
            }`}
          />
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Surahs Cards List */}
        <div className="space-y-2.5">
          {filteredSurahs.map((surah) => {
            void offlineRevision;
            void favRevision;
            const track = getAudioTrackForSurah(surah.number);
            const isCurrent = currentTrack?.audioUrl === track.audioUrl || (
              currentTrack?.surahNumber === surah.number &&
              (currentTrack?.reciterId === reciter.id || String(currentTrack?.reciterId) === String(reciter.id)) &&
              currentTrack?.moshafName === activeMoshaf?.name
            );
            const isThisPlaying = isCurrent && isPlaying;
            const isDownloaded = QuranAudioOfflineService.isDownloaded(track);
            const isSurahFav = QuranAudioHubService.isFavoriteTrack(track);
            const isThisBatchActive = isBatchDownloading && batchProgress?.currentSurahNumber === surah.number;
            const progress = downloadProgress[surah.number] || (isThisBatchActive ? batchProgress?.currentPercent : undefined);

            return (
              <div
                key={surah.number}
                onClick={() => handlePlaySurah(surah.number)}
                className={`flex items-center justify-between p-3.5 rounded-2xl transition cursor-pointer border active:scale-98 ${
                  isCurrent
                    ? 'bg-emerald-500/25 border-emerald-500/50 shadow-md text-emerald-400'
                    : 'bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-white/10 hover:border-emerald-400 shadow-sm'
                }`}
              >
                {/* Right: Surah info */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-mono font-black ${
                    isCurrent 
                      ? 'bg-emerald-500 text-slate-950 shadow-md' 
                      : isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {toArabicNumber(surah.number)}
                  </span>

                  <div className="text-right">
                    <h3 className={`text-xs sm:text-sm font-black truncate ${isCurrent ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                      سورة {surah.name}
                    </h3>
                    <p className="text-[10px] font-bold mt-0.5 text-slate-500 dark:text-slate-400">
                      {surah.type === 'Meccan' ? 'مكية' : 'مدنية'} • {toArabicNumber(surah.ayahCount)} آية
                    </p>
                  </div>
                </div>

                {/* Left: Actions (Play/Pause, Favorite, Mushaf, Add to Playlist & Download) */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Favorite Surah Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      hapticTap();
                      const next = QuranAudioHubService.toggleFavoriteTrack(track);
                      setFavRevision(r => r + 1);
                      if (next) {
                        toast.success(`تمت إضافة سورة ${surah.name} لتلاواتك المفضلة ❤️`);
                      } else {
                        toast.success(`تمت إزالة سورة ${surah.name} من المفضلة`);
                      }
                    }}
                    className={`p-2 rounded-xl border transition active:scale-90 ${
                      isSurahFav
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                        : isDark ? 'bg-white/5 border-white/10 text-slate-400 hover:text-rose-400' : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-rose-500'
                    }`}
                    title={isSurahFav ? 'إزالة من السور المفضلة' : 'إضافة إلى السور المفضلة'}
                    aria-label="المفضلة"
                  >
                    <Heart size={16} fill={isSurahFav ? 'currentColor' : 'none'} className={isSurahFav ? 'text-rose-400' : ''} />
                  </button>

                  {onOpenMushaf && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        hapticTap();
                        onOpenMushaf(surah.number);
                      }}
                      className={`p-2 rounded-xl border transition active:scale-90 ${
                        isDark ? 'bg-white/5 border-white/10 text-slate-400 hover:text-emerald-400' : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-emerald-600'
                      }`}
                      title="قراءة السورة في المصحف"
                      aria-label="قراءة السورة في المصحف"
                    >
                      <BookOpen size={16} />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      hapticTap();
                      setSelectedTrackForPlaylist(track);
                    }}
                    className={`p-2 rounded-xl border transition active:scale-90 ${
                      isDark ? 'bg-white/5 border-white/10 text-slate-400 hover:text-emerald-400' : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-emerald-600'
                    }`}
                    title="إضافة إلى قائمة تشغيل"
                  >
                    <Plus size={16} />
                  </button>

                  <button
                    onClick={(e) => handleToggleDownload(e, surah.number)}
                    className={`p-2 rounded-xl border transition active:scale-90 ${
                      isDownloaded
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : progress
                        ? 'bg-white/10 text-slate-400 border-white/10'
                        : isDark ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                    title={isDownloaded ? 'محفوظة بدون إنترنت (انقر للحذف)' : 'تنزيل التلاوة'}
                  >
                    {progress ? (
                      <Loader2 size={16} className="animate-spin text-emerald-400" />
                    ) : isDownloaded ? (
                      <Check size={16} className="text-emerald-400" />
                    ) : (
                      <Download size={16} />
                    )}
                  </button>

                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition shadow-sm ${
                    isThisPlaying
                      ? 'bg-emerald-500 text-slate-950'
                      : isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}>
                    {isThisPlaying ? (
                      <Pause size={16} fill="currentColor" />
                    ) : (
                      <Play size={16} fill="currentColor" className="translate-x-0.5" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add To Playlist Modal */}
      {selectedTrackForPlaylist && (
        <AddToPlaylistModal
          track={selectedTrackForPlaylist}
          onClose={() => setSelectedTrackForPlaylist(null)}
        />
      )}
    </div>
  );
};

export default ReciterProfileView;
