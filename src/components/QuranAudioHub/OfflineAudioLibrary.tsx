import React, { useEffect, useMemo, useState } from 'react';
import { Download, HardDrive, Pause, Play, Search, Trash2, WifiOff } from 'lucide-react';
import { QuranAudioOfflineService, type OfflineAudioItem } from '../../services/quranAudioOfflineService';
import { audioPlayerEngine, type AudioPlayerState } from '../../services/audioPlayerEngine';
import toast from 'react-hot-toast';

export const OfflineAudioLibrary: React.FC = () => {
  const [items, setItems] = useState<OfflineAudioItem[]>(() => QuranAudioOfflineService.list());
  const [query, setQuery] = useState('');
  const [player, setPlayer] = useState<AudioPlayerState>(() => audioPlayerEngine.getState());

  useEffect(() => {
    const refresh = () => setItems(QuranAudioOfflineService.list());
    window.addEventListener('quran_offline_audio_changed', refresh);
    const unsubscribe = audioPlayerEngine.subscribe(setPlayer);
    return () => {
      window.removeEventListener('quran_offline_audio_changed', refresh);
      unsubscribe();
    };
  }, []);

  const visible = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return items;
    return items.filter(({ track }) =>
      track.surahName.toLowerCase().includes(value) || track.reciterName.toLowerCase().includes(value)
    );
  }, [items, query]);

  const totalBytes = items.reduce((sum, item) => sum + item.bytes, 0);

  return (
    <div className="px-4 pt-4 space-y-4 animate-in fade-in duration-300">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-950 p-5 text-white shadow-xl">
        <div className="absolute -left-10 -bottom-16 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-emerald-200">
              <WifiOff size={18} />
              <span className="text-xs font-black">مكتبتك دون إنترنت</span>
            </div>
            <h2 className="text-xl font-black">التلاوات المحمّلة</h2>
            <p className="mt-1 text-xs font-bold text-white/65">استمع في أي وقت بدون استهلاك البيانات</p>
          </div>
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
            <HardDrive size={29} />
          </div>
        </div>
        <div className="relative mt-5 flex gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black">{items.length} تلاوة</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black">{QuranAudioOfflineService.formatBytes(totalBytes)}</span>
        </div>
      </div>

      {items.length > 0 && (
        <div className="relative">
          <Search size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="ابحث في التنزيلات..."
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pr-11 pl-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/60">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Download size={28} />
          </div>
          <h3 className="font-black text-slate-900 dark:text-white">لا توجد تلاوات محمّلة</h3>
          <p className="mx-auto mt-2 max-w-xs text-xs font-bold leading-6 text-slate-500">افتح صفحة أي قارئ واضغط زر التحميل بجوار السورة، وستظهر هنا للاستماع دون إنترنت.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map(item => {
            const isCurrent = player.currentTrack?.audioUrl === item.track.audioUrl;
            return (
              <div key={item.id} className={`flex items-center gap-3 rounded-2xl border p-3 shadow-sm transition ${isCurrent ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                <button
                  onClick={() => isCurrent ? void audioPlayerEngine.togglePlay() : void audioPlayerEngine.playTrack(item.track, visible.map(entry => entry.track), visible.indexOf(item))}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500 text-slate-950"
                  aria-label={`تشغيل سورة ${item.track.surahName}`}
                >
                  {isCurrent && player.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-black text-slate-900 dark:text-white">سورة {item.track.surahName}</h4>
                  <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">{item.track.reciterName} · {QuranAudioOfflineService.formatBytes(item.bytes)}</p>
                </div>
                <button
                  onClick={async () => {
                    await QuranAudioOfflineService.remove(item.id);
                    toast.success('تم حذف التلاوة من الجهاز');
                  }}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 text-rose-500 active:scale-95"
                  aria-label="حذف التنزيل"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
