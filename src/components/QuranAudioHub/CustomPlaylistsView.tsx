import { OutlineIcon, outlineContent } from '../OutlineIcon';
import React, { useState, useEffect, useRef } from 'react';
import {
  ListMusic,
  Plus,
  Play,
  Pause,
  Trash2,
  UploadCloud,
  FileAudio,
  HardDrive,
  FolderPlus,
  ArrowRight,
  Shuffle,
  Music,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  Share2,
  BookOpen,
  Edit3,
  Search
} from 'lucide-react';
import {
  CustomAudioPlaylistsService,
  UserCustomPlaylist,
  PLAYLIST_GRADIENTS
} from '../../services/customAudioPlaylistsService';
import {
  LocalAudioStorageService,
  LocalImportedAudioMeta
} from '../../services/localAudioStorageService';
import {
  CURATED_PLAYLISTS,
  HubPlaylist,
  AudioTrack,
  QuranAudioHubService
} from '../../services/quranAudioHubService';
import { audioPlayerEngine, AudioPlayerState } from '../../services/audioPlayerEngine';
import { quranSurahs } from '../../../quranMetadata';
import { hapticTap, hapticSelection, hapticSuccess } from '../../services/haptics';
import toast from 'react-hot-toast';
import { AddToPlaylistModal } from './AddToPlaylistModal';

const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNumber(value: number | string) {
  return String(value).replace(/[0-9]/g, (digit) => arabicDigits[Number(digit)]);
}

interface CustomPlaylistsViewProps {
  isDark?: boolean;
}

export const CustomPlaylistsView: React.FC<CustomPlaylistsViewProps> = ({ isDark = true }) => {
  const [userPlaylists, setUserPlaylists] = useState<UserCustomPlaylist[]>(() => CustomAudioPlaylistsService.getPlaylists());
  const [localAudios, setLocalAudios] = useState<LocalImportedAudioMeta[]>(() => LocalAudioStorageService.list());
  const [selectedPlaylist, setSelectedPlaylist] = useState<UserCustomPlaylist | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(PLAYLIST_GRADIENTS[0]);

  // Import audio states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTitle, setImportTitle] = useState('');
  const [importArtist, setImportArtist] = useState('');
  const [importIsQuran, setImportIsQuran] = useState(false);
  const [importSurahNumber, setImportSurahNumber] = useState<number>(1);
  const [importSurahSearch, setImportSurahSearch] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Edit audio metadata states
  const [editingItem, setEditingItem] = useState<LocalImportedAudioMeta | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editIsQuran, setEditIsQuran] = useState(false);
  const [editSurahNumber, setEditSurahNumber] = useState<number>(1);
  const [editSurahSearch, setEditSurahSearch] = useState('');

  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<AudioTrack | null>(null);
  const [playerState, setPlayerState] = useState<AudioPlayerState>(() => audioPlayerEngine.getState());

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsub = audioPlayerEngine.subscribe(setPlayerState);
    const refreshPlaylists = () => {
      setUserPlaylists(CustomAudioPlaylistsService.getPlaylists());
      if (selectedPlaylist) {
        setSelectedPlaylist(CustomAudioPlaylistsService.getPlaylistById(selectedPlaylist.id));
      }
    };
    const refreshLocals = () => setLocalAudios(LocalAudioStorageService.list());

    window.addEventListener('ifaqa_user_playlists_changed', refreshPlaylists);
    window.addEventListener('ifaqa_local_audio_changed', refreshLocals);

    return () => {
      unsub();
      window.removeEventListener('ifaqa_user_playlists_changed', refreshPlaylists);
      window.removeEventListener('ifaqa_local_audio_changed', refreshLocals);
    };
  }, [selectedPlaylist]);

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('يرجى كتابة عنوان للقائمة');
      return;
    }
    hapticSuccess();
    const created = CustomAudioPlaylistsService.createPlaylist(newTitle, newDesc, selectedGradient);
    setShowCreateModal(false);
    setNewTitle('');
    setNewDesc('');
    setSelectedPlaylist(created);
    toast.success(`تم إنشاء قائمة "${created.title}" بنجاح `);
  };

  const handleDeletePlaylist = (e: React.MouseEvent, pl: UserCustomPlaylist) => {
    e.stopPropagation();
    hapticTap();
    if (!window.confirm(`هل أنت متأكد من حذف قائمة "${pl.title}"؟`)) return;
    CustomAudioPlaylistsService.deletePlaylist(pl.id);
    if (selectedPlaylist?.id === pl.id) setSelectedPlaylist(null);
    toast.success('تم حذف قائمة التشغيل');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    const rawName = file.name.replace(/\.[^/.]+$/, '');
    setImportTitle(rawName);
    setImportArtist('تسجيل من الهاتف');
    setImportIsQuran(false);
    setImportSurahNumber(1);
    setImportSurahSearch('');
    setShowImportModal(true);
  };

  const handleImportAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setIsImporting(true);
    hapticSuccess();
    try {
      const track = await LocalAudioStorageService.importAudioFile(
        importFile,
        importTitle,
        importArtist,
        importIsQuran ? importSurahNumber : 0
      );
      setShowImportModal(false);
      setImportFile(null);
      setImportTitle('');
      setImportArtist('');
      setImportIsQuran(false);
      toast.success(
        importIsQuran
          ? `تم حفظ "سورة ${track.surahName}" بنجاح `
          : `تم استيراد "${track.surahName}" وحفظه في ذاكرة هاتفك بنجاح! `
      );
    } catch {
      toast.error('فشل استيراد الملف الصوتي');
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenEditModal = (e: React.MouseEvent, item: LocalImportedAudioMeta) => {
    e.stopPropagation();
    hapticTap();
    setEditingItem(item);
    setEditTitle(item.title);
    setEditArtist(item.artist || '');
    setEditIsQuran(Boolean(item.isQuranSurah && item.surahNumber && item.surahNumber > 0));
    setEditSurahNumber(item.surahNumber && item.surahNumber > 0 ? item.surahNumber : 1);
    setEditSurahSearch('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    hapticSuccess();
    const isQuran = editIsQuran && editSurahNumber > 0;
    const surahMeta = isQuran ? quranSurahs.find(s => s.number === editSurahNumber) : null;
    const resolvedTitle = editTitle.trim() || (isQuran && surahMeta ? surahMeta.name : editingItem.title);

    LocalAudioStorageService.updateAudioMeta(editingItem.storageKey, {
      title: resolvedTitle,
      artist: editArtist.trim() || (isQuran ? 'قارئ محلي' : 'تسجيل من الهاتف'),
      isQuranSurah: isQuran,
      surahNumber: isQuran ? editSurahNumber : 0,
      surahName: isQuran ? (surahMeta?.name || resolvedTitle) : resolvedTitle,
      startPage: isQuran ? (surahMeta?.startPage || 1) : undefined,
    });

    setEditingItem(null);
    toast.success("تم تحديث بيانات المقطع الصوتي بنجاح ");
  };

  const handleDeleteLocalAudio = async (e: React.MouseEvent, storageKey: string, title: string) => {
    e.stopPropagation();
    hapticTap();
    if (!window.confirm(`هل ترغب في حذف ملف "${title}" من ذاكرة الهاتف؟`)) return;
    await LocalAudioStorageService.deleteAudio(storageKey);
    toast.success('تم حذف الملف الصوتي');
  };

  const handlePlayUserPlaylist = (playlist: UserCustomPlaylist, startIndex: number = 0, shuffle: boolean = false) => {
    hapticTap();
    if (playlist.tracks.length === 0) {
      toast('القائمة فارغة، أضف إليها سوراً أو ملفات صوتية أولاً');
      return;
    }

    let tracks = [...playlist.tracks];
    if (shuffle) {
      tracks = tracks.sort(() => Math.random() - 0.5);
    }
    const track = tracks[startIndex] || tracks[0];
    audioPlayerEngine.playTrack(track, tracks, startIndex);
    audioPlayerEngine.setFullScreenOpen(true);
  };

  const handlePlayCuratedPlaylist = async (cp: HubPlaylist) => {
    hapticTap();
    const tracks: AudioTrack[] = cp.tracks.map((t) => {
      const surah = quranSurahs.find(s => s.number === t.surahNumber) || quranSurahs[0];
      const fallbackServer = t.serverFallback || 'https://server8.mp3quran.net/afs/';
      return {
        surahNumber: surah.number,
        surahName: surah.name,
        surahEnglishName: surah.englishName,
        ayahCount: surah.ayahCount,
        reciterId: 1000 + t.surahNumber,
        reciterName: t.reciterName,
        reciterPhoto: '',
        moshafName: cp.title,
        audioUrl: QuranAudioHubService.buildAudioUrl(fallbackServer, surah.number),
      };
    });

    if (tracks.length > 0) {
      audioPlayerEngine.playTrack(tracks[0], tracks, 0);
      audioPlayerEngine.setFullScreenOpen(true);
      toast.success(`بدأ تشغيل قائمة: ${cp.title}`);
    }
  };

  const { currentTrack, isPlaying } = playerState;

  const filteredImportSurahs = quranSurahs.filter(s =>
    s.name.includes(importSurahSearch.trim()) ||
    String(s.number).includes(importSurahSearch.trim()) ||
    s.englishName.toLowerCase().includes(importSurahSearch.trim().toLowerCase())
  );

  const filteredEditSurahs = quranSurahs.filter(s =>
    s.name.includes(editSurahSearch.trim()) ||
    String(s.number).includes(editSurahSearch.trim()) ||
    s.englishName.toLowerCase().includes(editSurahSearch.trim().toLowerCase())
  );

  // Render Single Custom Playlist Detail View
  if (selectedPlaylist) {
    return (
      <div className="px-4 py-4 max-w-xl mx-auto space-y-4 animate-in fade-in duration-300">
        {/* Playlist Header Card */}
        <div className={`relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br ${selectedPlaylist.gradient} p-5 text-white shadow-xl`}>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                hapticTap();
                setSelectedPlaylist(null);
              }}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition active:scale-95 text-white"
            >
              <ArrowRight size={20} />
            </button>

            <button
              onClick={(e) => handleDeletePlaylist(e, selectedPlaylist)}
              className="p-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition active:scale-95"
              title="حذف القائمة"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full backdrop-blur-sm">
              قائمة تشغيل مخصصة
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-2">{selectedPlaylist.title}</h2>
            {selectedPlaylist.description && (
              <p className="text-xs font-bold text-white/75 mt-1">{selectedPlaylist.description}</p>
            )}
            <p className="text-[11px] font-bold text-white/60 mt-2">
              {toArabicNumber(selectedPlaylist.tracks.length)} مقطع صوتي
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={() => handlePlayUserPlaylist(selectedPlaylist, 0, false)}
              className="flex-1 py-3 px-4 rounded-2xl bg-white text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition"
            >
              <Play size={16} fill="currentColor" />
              <span>تشغيل القائمة</span>
            </button>

            <button
              onClick={() => handlePlayUserPlaylist(selectedPlaylist, 0, true)}
              className="py-3 px-4 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-black text-xs flex items-center justify-center gap-2 transition active:scale-95"
              title="تشغيل عشوائي"
            >
              <Shuffle size={16} />
              <span>عشوائي</span>
            </button>
          </div>
        </div>

        {/* Tracks List */}
        <div className="space-y-2 pt-2">
          {selectedPlaylist.tracks.length === 0 ? (
            <div className={`p-8 text-center rounded-[2rem] border border-dashed ${isDark ? 'border-white/15 bg-white/5' : 'border-slate-300 bg-white/60'}`}>
              <Music size={32} className="mx-auto mb-2 opacity-40 text-emerald-400" />
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">القائمة فارغة</h4>
              <p className="text-[11px] font-bold text-slate-500 mt-1 max-w-xs mx-auto">
                يمكنك إضافة السور من صفحة أي قارئ أو رفع ملفاتك الصوتية من هاتفك وإضافتها هنا.
              </p>
            </div>
          ) : (
            selectedPlaylist.tracks.map((track, idx) => {
              const isThisCurrent = currentTrack?.audioUrl === track.audioUrl || (track.storageKey && currentTrack?.storageKey === track.storageKey);
              const isThisPlaying = isThisCurrent && isPlaying;
              const isQuran = Boolean(track.surahNumber && track.surahNumber > 0);

              return (
                <div
                  key={`${track.audioUrl || track.storageKey}_${idx}`}
                  onClick={() => handlePlayUserPlaylist(selectedPlaylist, idx)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer active:scale-98 ${
                    isThisCurrent
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : isDark ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center text-xs font-mono font-bold text-slate-400">
                      {toArabicNumber(idx + 1)}
                    </span>
                    <div className="text-right min-w-0">
                      <h4 className="text-xs sm:text-sm font-black truncate text-slate-900 dark:text-white">
                        {isQuran ? `سورة ${track.surahName}` : (track.surahName || track.surahEnglishName)}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">
                        {track.reciterName} • {track.moshafName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        hapticTap();
                        CustomAudioPlaylistsService.removeTrackFromPlaylist(selectedPlaylist.id, idx);
                        toast.success('تم حذف المقطع من القائمة');
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 active:scale-90 transition"
                      title="حذف من القائمة"
                    >
                      <Trash2 size={16} />
                    </button>

                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isThisPlaying ? 'bg-emerald-500 text-slate-950' : 'bg-black/15 text-white'
                    }`}>
                      {isThisPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Hidden File Input for Phone Audio Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.opus"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Top Action Bar (Create Playlist & Upload Audio) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            hapticTap();
            setShowCreateModal(true);
          }}
          className="p-4 rounded-[1.8rem] bg-gradient-to-tr from-emerald-600 to-teal-500 hover:scale-102 active:scale-98 text-slate-950 font-black text-xs flex flex-col items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
        >
          <FolderPlus size={24} />
          <span>إنشاء قائمة جديدة +</span>
        </button>

        <button
          onClick={() => {
            hapticTap();
            fileInputRef.current?.click();
          }}
          className={`p-4 rounded-[1.8rem] border flex flex-col items-center justify-center gap-2 text-xs font-black transition active:scale-98 ${
            isDark 
              ? 'bg-white/10 hover:bg-white/15 border-white/15 text-cyan-300' 
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm'
          }`}
        >
          <UploadCloud size={24} className="text-cyan-400 animate-bounce" />
          <span>رفع صوتيات من هاتفك <OutlineIcon name="folder" /></span>
        </button>
      </div>

      {/* Section 1: User's Custom Playlists */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 dark:text-white">
            <ListMusic className="text-emerald-500" size={18} />
            <span>قوائم التشغيل الخاصة بك</span>
          </h3>
          <span className="text-[11px] font-bold text-slate-400">
            {toArabicNumber(userPlaylists.length)} قائمة
          </span>
        </div>

        {userPlaylists.length === 0 ? (
          <div className={`p-6 text-center rounded-[2rem] border border-dashed ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white/70'}`}>
            <ListMusic size={28} className="mx-auto mb-2 text-slate-500 opacity-50" />
            <p className="text-xs font-black text-slate-900 dark:text-white">لم تقم بإنشاء قوائم تشغيل بعد</p>
            <p className="text-[10px] font-bold text-slate-500 mt-1">اضغط «إنشاء قائمة جديدة» لترتيب تلاواتك المفضلة وسور وردك اليومي.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {userPlaylists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => {
                  hapticTap();
                  setSelectedPlaylist(pl);
                }}
                className={`group relative p-4 rounded-[2rem] bg-gradient-to-br ${pl.gradient} text-white shadow-lg cursor-pointer overflow-hidden transition hover:scale-102 active:scale-98`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white backdrop-blur-md">
                    <ListMusic size={20} />
                  </div>
                  <button
                    onClick={(e) => handleDeletePlaylist(e, pl)}
                    className="p-1.5 rounded-xl bg-black/20 hover:bg-rose-500/40 text-white/80 hover:text-white transition"
                    title="حذف القائمة"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-4 text-right">
                  <h4 className="text-sm font-black truncate">{pl.title}</h4>
                  <p className="text-[10px] font-bold text-white/70 truncate mt-0.5">
                    {pl.description || `${toArabicNumber(pl.tracks.length)} مقطع صوتي`}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-white/60">
                  <span>{toArabicNumber(pl.tracks.length)} تلاوة</span>
                  <span className="p-1 rounded-full bg-white/20 text-white group-hover:scale-110 transition">
                    <Play size={12} fill="currentColor" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Uploaded Phone Audio Files */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 dark:text-white">
            <HardDrive className="text-cyan-400" size={18} />
            <span>ملفاتك الصوتية المرفوعة من الهاتف</span>
          </h3>
          <span className="text-[11px] font-bold text-slate-400">
            {toArabicNumber(localAudios.length)} ملف
          </span>
        </div>

        {localAudios.length === 0 ? (
          <div className={`p-6 text-center rounded-[2rem] border border-dashed ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white/70'}`}>
            <FileAudio size={28} className="mx-auto mb-2 text-slate-500 opacity-50" />
            <p className="text-xs font-black text-slate-900 dark:text-white">لم تقم برفع أي ملفات صوتية من الهاتف</p>
            <p className="text-[10px] font-bold text-slate-500 mt-1">اضغط «رفع صوتيات من هاتفك» لإضافة أي تلاوات أو أدعية أو تسجيلات شخصية مخزنة على جهازك.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {localAudios.map((item) => {
              const track = LocalAudioStorageService.metaToAudioTrack(item);
              const isThisCurrent = currentTrack?.storageKey === item.storageKey;
              const isThisPlaying = isThisCurrent && isPlaying;
              const isQuran = Boolean(item.isQuranSurah && item.surahNumber && item.surahNumber > 0);

              return (
                <div
                  key={item.storageKey}
                  onClick={() => {
                    hapticTap();
                    if (isThisCurrent) {
                      void audioPlayerEngine.togglePlay();
                      return;
                    }
                    const allTracks = localAudios.map(m => LocalAudioStorageService.metaToAudioTrack(m));
                    const idx = localAudios.findIndex(m => m.storageKey === item.storageKey);
                    audioPlayerEngine.playTrack(track, allTracks, idx);
                    audioPlayerEngine.setFullScreenOpen(true);
                  }}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer active:scale-98 ${
                    isThisCurrent
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      : isDark ? 'bg-white/5 border-white/10 hover:border-cyan-500/30' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                      {isQuran ? <BookOpen size={20} /> : <FileAudio size={20} />}
                    </div>
                    <div className="text-right min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-black truncate text-slate-900 dark:text-white">
                          {isQuran ? `سورة ${item.surahName || item.title}` : item.title}
                        </h4>
                        {isQuran && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ص {toArabicNumber(item.startPage || 1)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">
                        {item.artist} • {(item.sizeBytes / 1024 / 1024).toFixed(1)} م.ب
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleOpenEditModal(e, item)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 transition"
                      title="تعديل وتحديد السورة"
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        hapticTap();
                        setTrackToAddToPlaylist(track);
                      }}
                      className="p-2 rounded-xl bg-white/10 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 transition"
                      title="إضافة لقائمة تشغيل"
                    >
                      <Plus size={16} />
                    </button>

                    <button
                      onClick={(e) => handleDeleteLocalAudio(e, item.storageKey, item.title)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 active:scale-90 transition"
                      title="حذف من الهاتف"
                    >
                      <Trash2 size={16} />
                    </button>

                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isThisPlaying ? 'bg-cyan-400 text-slate-950' : 'bg-black/15 text-white'
                    }`}>
                      {isThisPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: Curated Islamic Playlists */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 dark:text-white">
            <Sparkles className="text-amber-400" size={18} />
            <span>قوائم مختارة ومقترحة</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CURATED_PLAYLISTS.map((cp) => (
            <div
              key={cp.id}
              onClick={() => handlePlayCuratedPlaylist(cp)}
              className={`group relative p-4 rounded-[2rem] bg-gradient-to-br ${cp.gradient} text-white shadow-lg cursor-pointer overflow-hidden transition hover:scale-102 active:scale-98`}
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white backdrop-blur-md">
                  <Sparkles size={20} className="text-amber-300" />
                </div>
                <span className="p-2 rounded-full bg-white/20 text-white group-hover:scale-110 transition">
                  <Play size={14} fill="currentColor" />
                </span>
              </div>

              <div className="mt-4 text-right">
                <h4 className="text-sm font-black">{cp.title}</h4>
                <p className="text-[10px] font-bold text-white/70 mt-1 line-clamp-1">{cp.subtitle}</p>
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-white/60">
                <span>{toArabicNumber(cp.tracks.length)} تلاوة</span>
                <span>تشغيل فوري</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Create Playlist */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 text-white rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/15 p-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-sm font-black flex items-center gap-2">
                <FolderPlus className="text-emerald-400" size={18} />
                <span>إنشاء قائمة تشغيل جديدة</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">عنوان القائمة</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: أورادي اليومية، تلاوات نادرة..."
                  className="w-full h-11 px-3.5 rounded-2xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 font-bold"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">وصف القائمة (اختياري)</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="وصف مختصر لمحتوى القائمة..."
                  className="w-full h-11 px-3.5 rounded-2xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">لون وتدرج القائمة</label>
                <div className="flex items-center gap-2.5">
                  {PLAYLIST_GRADIENTS.map((g, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedGradient(g)}
                      className={`w-8 h-8 rounded-full bg-gradient-to-tr ${g} border-2 transition ${
                        selectedGradient === g ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-65'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-emerald-500 text-slate-950 text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition"
                >
                  إنشاء القائمة
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-3 rounded-2xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Import Local Phone Audio File */}
      {showImportModal && importFile && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 text-white rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/15 p-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-sm font-black flex items-center gap-2">
                <UploadCloud className="text-cyan-400" size={18} />
                <span>حفظ التسجيل الصوتي في مكتبتك</span>
              </h3>
              <button onClick={() => setShowImportModal(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleImportAudio} className="space-y-4">
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-3">
                <FileAudio size={24} className="text-cyan-400 shrink-0" />
                <div className="min-w-0 text-right">
                  <p className="text-xs font-black text-white truncate">{importFile.name}</p>
                  <p className="text-[10px] text-cyan-200/80 font-bold">{(importFile.size / 1024 / 1024).toFixed(2)} ميجابايت</p>
                </div>
              </div>

              {/* Quran vs General Audio Selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">نوع المقطع الصوتي</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      setImportIsQuran(false);
                    }}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      !importIsQuran
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <FileAudio size={15} />
                    <span>تسجيل / مقطع عام</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      setImportIsQuran(true);
                      const s = quranSurahs.find(item => item.number === importSurahNumber) || quranSurahs[0];
                      setImportTitle(s.name);
                    }}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      importIsQuran
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <BookOpen size={15} />
                    <span>سورة قرآنية</span>
                  </button>
                </div>
              </div>

              {/* If Quran Surah is selected, show Surah Picker */}
              {importIsQuran && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2.5">
                  <label className="text-xs font-bold text-emerald-300 block">اختر السورة لربطها بصفحات المصحف:</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ابحث عن اسم السورة..."
                      value={importSurahSearch}
                      onChange={(e) => setImportSurahSearch(e.target.value)}
                      className="w-full h-9 pr-8 pl-3 rounded-xl bg-black/40 border border-emerald-500/30 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
                    />
                    <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 scrollbar-hide">
                    {filteredImportSurahs.map((s) => (
                      <button
                        key={s.number}
                        type="button"
                        onClick={() => {
                          hapticSelection();
                          setImportSurahNumber(s.number);
                          setImportTitle(s.name);
                        }}
                        className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                          importSurahNumber === s.number
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        <span>سورة {s.name} ({s.number})</span>
                        <span className="text-[10px] opacity-80">ص {toArabicNumber(s.startPage)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  {importIsQuran ? 'اسم السورة / العنوان' : 'عنوان المقطع الصوتي'}
                </label>
                <input
                  type="text"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  placeholder="مثال: دعاء ليلة القدر، تلاوة سورة يس..."
                  className="w-full h-11 px-3.5 rounded-2xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  {importIsQuran ? 'اسم القارئ (اختياري)' : 'اسم القارئ / المنشد (اختياري)'}
                </label>
                <input
                  type="text"
                  value={importArtist}
                  onChange={(e) => setImportArtist(e.target.value)}
                  placeholder="مثال: الشيخ أحمد، صوتي الخاص..."
                  className="w-full h-11 px-3.5 rounded-2xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isImporting}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition disabled:opacity-50"
                >
                  {outlineContent(isImporting ? 'جاري الحفظ...' : "حفظ في التطبيق ")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-5 py-3 rounded-2xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Local Phone Audio Metadata */}
      {editingItem && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 text-white rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/15 p-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Edit3 className="text-cyan-400" size={18} />
                <span>تعديل بيانات المقطع الصوتي</span>
              </h3>
              <button onClick={() => setEditingItem(null)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Quran vs General Audio Selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">نوع المقطع الصوتي</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      setEditIsQuran(false);
                    }}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      !editIsQuran
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <FileAudio size={15} />
                    <span>تسجيل / مقطع عام</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      setEditIsQuran(true);
                      const s = quranSurahs.find(item => item.number === editSurahNumber) || quranSurahs[0];
                      setEditTitle(s.name);
                    }}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      editIsQuran
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <BookOpen size={15} />
                    <span>سورة قرآنية</span>
                  </button>
                </div>
              </div>

              {/* If Quran Surah is selected, show Surah Picker */}
              {editIsQuran && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2.5">
                  <label className="text-xs font-bold text-emerald-300 block">اختر السورة المرتبطة:</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ابحث عن اسم السورة..."
                      value={editSurahSearch}
                      onChange={(e) => setEditSurahSearch(e.target.value)}
                      className="w-full h-9 pr-8 pl-3 rounded-xl bg-black/40 border border-emerald-500/30 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
                    />
                    <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 scrollbar-hide">
                    {filteredEditSurahs.map((s) => (
                      <button
                        key={s.number}
                        type="button"
                        onClick={() => {
                          hapticSelection();
                          setEditSurahNumber(s.number);
                          setEditTitle(s.name);
                        }}
                        className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                          editSurahNumber === s.number
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        <span>سورة {s.name} ({s.number})</span>
                        <span className="text-[10px] opacity-80">ص {toArabicNumber(s.startPage)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  {editIsQuran ? 'اسم السورة / العنوان' : 'عنوان المقطع الصوتي'}
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  {editIsQuran ? 'اسم القارئ' : 'اسم القارئ / المنشد'}
                </label>
                <input
                  type="text"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-emerald-500 text-slate-950 text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition"
                >
                  
                  حفظ التعديلات <OutlineIcon name="check" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-5 py-3 rounded-2xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add To Playlist Modal Trigger */}
      {trackToAddToPlaylist && (
        <AddToPlaylistModal
          track={trackToAddToPlaylist}
          onClose={() => setTrackToAddToPlaylist(null)}
        />
      )}
    </div>
  );
};
