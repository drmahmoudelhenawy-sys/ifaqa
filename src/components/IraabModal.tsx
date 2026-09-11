import React, { useState, useEffect } from 'react';
import { X, Type, Download, AlertCircle } from 'lucide-react';
import localforage from 'localforage';
import { isSurahLingDownloaded, downloadLinguisticsSurah, fetchIraabSurahOnline, getOfflineIraab } from '../services/offlineBundle';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  surahId: number;
  ayahId: number;
  onGoToDownloads: () => void;
}

export const IraabModal: React.FC<Props> = ({ isOpen, onClose, surahId, ayahId, onGoToDownloads }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, surahId, ayahId]);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      // 1. Check if surah is downloaded
      const downloaded = await isSurahLingDownloaded(surahId);
      setIsDownloaded(downloaded);

      if (downloaded) {
        const content = await getOfflineIraab(surahId, ayahId);
        if (content) setData(content);
        else setData("لا يوجد إعراب مسجل لهذه الآية.");
      } else {
        // Not downloaded, maybe try to fetch live if online?
        if (navigator.onLine) {
            const ayahs = await fetchIraabSurahOnline(surahId);
            const ayahData = ayahs.find((a: any) => Number(a.ayah) === ayahId || Number(a.number) === ayahId);
            setData(ayahData?.text || ayahData?.content || "لا يوجد إعراب مسجل لهذه الآية.");
        } else {
            setError(true);
        }
      }
    } catch (e) {
      console.error("Error loading Iraab:", e);
      setError(true);
    }
    setLoading(false);
  };

  const handleDownloadNow = async () => {
      setLoading(true);
      try {
          await downloadLinguisticsSurah(surahId);
          await loadData();
      } catch (e) {
          setError(true);
      } finally {
          setLoading(false);
      }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="quran-tool-sheet fixed inset-x-0 bottom-0 z-[410] rounded-t-[2.5rem] transform transition-transform duration-300 max-h-[85vh] flex flex-col font-arabic" dir="rtl">
        <div className="w-full flex justify-center pt-4 pb-2" onClick={onClose}>
          <div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full cursor-pointer"></div>
        </div>

        <div className="px-6 pb-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Type size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">إعراب الآية</h2>
                <p className="text-xs text-slate-500">الجدول في إعراب القرآن</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
            <X className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
             <div className="flex flex-col justify-center items-center h-40 gap-4">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-sm text-slate-500">جاري تحميل البيانات...</p>
             </div>
          ) : error && !isDownloaded ? (
             <div className="flex flex-col items-center justify-center h-60 text-center gap-6">
               <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-full text-amber-500">
                 <Download size={48} />
               </div>
               <div className="space-y-2">
                    <p className="text-slate-800 dark:text-slate-200 font-bold text-lg">تحتاج لتحميل بيانات السورة</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs leading-relaxed">
                        يمكنك تحميل إعراب سورة {surahId} للعمل بدون إنترنت، أو التحميل الكامل لكل السور من الإعدادات.
                    </p>
               </div>
               <div className="flex flex-col w-full gap-3">
                    <button onClick={handleDownloadNow} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition active:scale-95 shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
                        <Download size={20} /> تحميل هذه السورة الآن
                    </button>
                    <button onClick={() => { onClose(); onGoToDownloads(); }} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                        الذهاب لمدير التحميلات
                    </button>
               </div>
             </div>
          ) : (
            <div className="text-slate-700 dark:text-slate-300 text-lg md:text-xl leading-[2] space-y-6">
                {data ? (
                    <div className="whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                        {data}
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-10 text-slate-400 gap-3">
                        <AlertCircle size={40} />
                        <p>لا توجد بيانات متاحة حالياً</p>
                    </div>
                )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
