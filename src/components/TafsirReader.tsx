import React, { useState, useEffect } from 'react';
import { X, BookOpen, Download, Settings } from 'lucide-react';
import { fetchTafsirAyahOnline, getOfflineTafsir, getTafsirStorageKey, TAFSIR_SOURCES } from '../services/offlineBundle';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  surahId: number;
  ayahId: number;
  tafsirId: number;
  onGoToDownloads: () => void;
  onTafsirChange?: (id: number) => void;
}

const AVAILABLE_TAFSIRS = Object.entries(TAFSIR_SOURCES).map(([id, source]) => ({ id: Number(id), name: source.name }));

export const TafsirReader: React.FC<Props> = ({ isOpen, onClose, surahId, ayahId, tafsirId, onGoToDownloads, onTafsirChange }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, surahId, ayahId, tafsirId]);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const storageKey = getTafsirStorageKey(tafsirId);
      const offline = await getOfflineTafsir(surahId, ayahId, storageKey);
      if (offline) {
        setData(offline);
      } else if (navigator.onLine) {
        const online = await fetchTafsirAyahOnline(tafsirId, surahId, ayahId);
        if (online) setData(online);
        else setError(true);
      } else setError(true);
    } catch (e) {
      setError(true);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="quran-tool-sheet fixed inset-x-0 bottom-0 z-[410] rounded-t-[2.5rem] transform transition-transform duration-300 max-h-[85vh] flex flex-col" dir="rtl">
        <div className="w-full flex justify-center pt-4 pb-2" onClick={onClose}>
          <div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full cursor-pointer"></div>
        </div>

        <div className="px-6 pb-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <BookOpen size={24} className="text-violet-500" />
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">التفسير</h2>
          </div>
          
          <div className="flex items-center gap-2">
              {onTafsirChange && (
                  <label className="flex h-9 items-center gap-2 rounded-full bg-black/5 dark:bg-white/10 px-3 text-xs font-black text-slate-600 dark:text-slate-300 cursor-pointer">
                    <Settings size={15} className="text-violet-500" />
                    <select
                      value={tafsirId}
                      onChange={(e) => onTafsirChange(Number(e.target.value))}
                      className="bg-transparent text-xs font-black outline-none cursor-pointer"
                    >
                      {AVAILABLE_TAFSIRS.map(t => (
                        <option key={t.id} value={t.id} className="text-slate-800">{t.name}</option>
                      ))}
                    </select>
                  </label>
              )}
              <button onClick={onClose} className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
                <X className="text-slate-500 dark:text-slate-400" />
              </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 font-arabic" dir="rtl">
          {loading ? (
             <div className="flex justify-center items-center h-40">
               <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : error ? (
             <div className="flex flex-col items-center justify-center h-40 opacity-90 text-center gap-4">
               <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full text-slate-400">
                 <BookOpen size={40} />
               </div>
               <p className="text-slate-600 dark:text-slate-400 font-bold leading-relaxed max-w-xs">
                 هذا التفسير غير متوفر حالياً. يرجى تحميله من مدير التحميلات للعمل بدون إنترنت.
               </p>
               <button onClick={() => { onClose(); onGoToDownloads(); }} className="flex items-center gap-2 mt-2 px-6 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition active:scale-95 shadow-lg shadow-violet-500/20">
                 <Download size={18} /> مدير التحميلات
               </button>
             </div>
          ) : (
            <div className="text-slate-700 dark:text-slate-300 text-xl leading-[2.5] space-y-4">
               <p className="whitespace-pre-wrap">{data}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
