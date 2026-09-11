import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Check, ListMusic, Music, Heart } from 'lucide-react';
import { AudioTrack, QuranAudioHubService } from '../../services/quranAudioHubService';
import { CustomAudioPlaylistsService, UserCustomPlaylist, PLAYLIST_GRADIENTS } from '../../services/customAudioPlaylistsService';
import { hapticTap, hapticSuccess } from '../../services/haptics';
import toast from 'react-hot-toast';

interface AddToPlaylistModalProps {
  track: AudioTrack;
  onClose: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ track, onClose }) => {
  const [playlists, setPlaylists] = useState<UserCustomPlaylist[]>(() => CustomAudioPlaylistsService.getPlaylists());
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(PLAYLIST_GRADIENTS[0]);
  const [isFavorite, setIsFavorite] = useState(() => QuranAudioHubService.isFavoriteTrack(track));

  useEffect(() => {
    // Notify app to hide floating player so it NEVER covers modal buttons
    window.dispatchEvent(new CustomEvent('ifaqa_modal_state_changed', { detail: { open: true } }));
    document.body.classList.add('ifaqa-modal-active');

    const refresh = () => setPlaylists(CustomAudioPlaylistsService.getPlaylists());
    const handleFavChange = () => setIsFavorite(QuranAudioHubService.isFavoriteTrack(track));

    window.addEventListener('ifaqa_user_playlists_changed', refresh);
    window.addEventListener('ifaqa_favorite_tracks_changed', handleFavChange);

    return () => {
      window.dispatchEvent(new CustomEvent('ifaqa_modal_state_changed', { detail: { open: false } }));
      document.body.classList.remove('ifaqa-modal-active');
      window.removeEventListener('ifaqa_user_playlists_changed', refresh);
      window.removeEventListener('ifaqa_favorite_tracks_changed', handleFavChange);
    };
  }, [track]);

  const handleToggleFavoriteSurah = () => {
    hapticSuccess();
    const next = QuranAudioHubService.toggleFavoriteTrack(track);
    setIsFavorite(next);
    if (next) {
      toast.success(`تمت إضافة "${track.surahName || track.surahEnglishName}" إلى تلاواتك المفضلة ❤️`);
    } else {
      toast.success(`تمت إزالة التلاوة من المفضلة`);
    }
  };

  const handleAddToPlaylist = (playlist: UserCustomPlaylist) => {
    hapticTap();
    const success = CustomAudioPlaylistsService.addTrackToPlaylist(playlist.id, track);
    if (success) {
      hapticSuccess();
      toast.success(`تمت إضافة "${track.surahName || track.surahEnglishName}" إلى "${playlist.title}"`);
      onClose();
    } else {
      toast('التلاوة موجودة بالفعل في هذه القائمة');
    }
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('يرجى كتابة عنوان للقائمة');
      return;
    }

    hapticSuccess();
    const created = CustomAudioPlaylistsService.createPlaylist(newTitle, newDesc, selectedGradient);
    CustomAudioPlaylistsService.addTrackToPlaylist(created.id, track);
    toast.success(`تم إنشاء قائمة "${created.title}" وإضافة التلاوة إليها `);
    onClose();
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-slate-900 text-white rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/15 p-5 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300 max-h-[85vh] flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ListMusic size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black">إضافة إلى قائمة تشغيل</h3>
              <p className="text-[11px] font-bold text-slate-300 truncate max-w-[220px]">
                {track.surahName ? `سورة ${track.surahName}` : track.surahEnglishName} • {track.reciterName}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition active:scale-95"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto quran-no-scrollbar space-y-3 py-1 pb-16">
          
          {/* Quick Favorite Surah Button */}
          <div 
            onClick={handleToggleFavoriteSurah}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer active:scale-98 ${
              isFavorite
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isFavorite ? 'bg-rose-500 text-white shadow-md' : 'bg-white/10 text-rose-400'
              }`}>
                <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
              </div>
              <div className="text-right min-w-0">
                <h4 className="text-xs font-black">
                  {isFavorite ? 'مضافة إلى تلاواتك المفضلة ❤️' : 'إضافة سريعة إلى المفضلة'}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {isFavorite ? 'انقر للإزالة من التلاوات المفضلة' : `حفظ سورة ${track.surahName || ''} في المفضلة للوصول السريع`}
                </p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${
              isFavorite ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-white/10 text-white'
            }`}>
              {isFavorite ? 'مفضلة' : '+ مفضلة'}
            </span>
          </div>

          {showCreate ? (
            <form onSubmit={handleCreateAndAdd} className="space-y-3 p-3.5 bg-white/5 rounded-2xl border border-white/10">
              <h4 className="text-xs font-black text-emerald-400">إنشاء قائمة تشغيل جديدة</h4>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">اسم القائمة</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: أوراد الفجر، تلاوات خاشعة..."
                  className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 font-bold"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">وصف اختياري</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="وصف مختصر للقائمة..."
                  className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 font-bold"
                />
              </div>

              {/* Gradient Palette Picker */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5">لون القائمة</label>
                <div className="flex items-center gap-2">
                  {PLAYLIST_GRADIENTS.map((g, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedGradient(g)}
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr ${g} border-2 transition ${
                        selectedGradient === g ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-70'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition"
                >
                  إنشاء وإضافة التلاوة
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                hapticTap();
                setShowCreate(true);
              }}
              className="w-full p-3 rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 flex items-center justify-center gap-2 text-xs font-black transition active:scale-98"
            >
              <Plus size={16} />
              <span>إنشاء قائمة تشغيل جديدة</span>
            </button>
          )}

          {/* Existing Playlists */}
          <div className="space-y-2 pt-1">
            {playlists.length === 0 && !showCreate ? (
              <div className="text-center py-6 text-slate-400">
                <Music size={28} className="mx-auto mb-2 opacity-40 text-slate-500" />
                <p className="text-xs font-bold">لا توجد قوائم تشغيل مخصصة</p>
                <p className="text-[10px] text-slate-500 mt-1">اضغط على زر الإنشاء أعلاه لإنشاء قائمتك الخاصة</p>
              </div>
            ) : (
              playlists.map((pl) => {
                const alreadyContains = pl.tracks.some(
                  t => t.audioUrl === track.audioUrl || (t.storageKey && t.storageKey === track.storageKey)
                );

                return (
                  <div
                    key={pl.id}
                    onClick={() => handleAddToPlaylist(pl)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer active:scale-98 ${
                      alreadyContains
                        ? 'bg-white/5 border-white/10 opacity-70'
                        : 'bg-white/10 hover:bg-white/15 border-white/10 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${pl.gradient} flex items-center justify-center text-white shadow-sm shrink-0`}>
                        <ListMusic size={16} />
                      </div>
                      <div className="text-right min-w-0">
                        <h4 className="text-xs font-black text-white truncate">{pl.title}</h4>
                        <p className="text-[10px] font-bold text-slate-400 truncate">
                          {pl.tracks.length} مقطع صوتي
                        </p>
                      </div>
                    </div>

                    {alreadyContains ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                        <Check size={12} />
                        <span>مضافة</span>
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition">
                        <Plus size={15} />
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
