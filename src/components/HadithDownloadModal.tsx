import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileJson, RefreshCw, Settings2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  downloadHadithCollection,
  getHadithCollectionAccessState,
  HADITH_EDITIONS,
} from '../services/hadithService';

interface HadithDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HadithDownloadModal: React.FC<HadithDownloadModalProps> = ({ isOpen, onClose }) => {
  const [downloadedEditions, setDownloadedEditions] = useState<Record<string, boolean>>({});
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [downloadingEditionId, setDownloadingEditionId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void checkDownloads();
    }
  }, [isOpen]);

  const checkDownloads = async () => {
    setCheckingStatus(true);
    try {
      const entries = await Promise.all(
        HADITH_EDITIONS.map(async (edition) => {
          const access = await getHadithCollectionAccessState(edition.collection);
          return [edition.id, access.isDownloaded] as const;
        })
      );

      setDownloadedEditions(Object.fromEntries(entries));
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleDownload = async (editionId: string) => {
    const edition = HADITH_EDITIONS.find((entry) => entry.id === editionId);
    if (!edition) {
      toast.error('تعذر تحديد الكتاب المطلوب');
      return;
    }

    setDownloadingEditionId(editionId);
    try {
      const success = await downloadHadithCollection(edition.collection);
      if (success) {
        setDownloadedEditions((current) => ({ ...current, [editionId]: true }));
        toast.success(`تم تحميل ${edition.name} بنجاح`);
      } else {
        toast.error(`فشل تحميل ${edition.name}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('حدث خطأ أثناء تحميل الكتاب');
    } finally {
      setDownloadingEditionId(null);
      void checkDownloads();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
          <div className="text-right">
            <h3 className="text-xl font-black text-slate-800 dark:text-white">مدير التنزيلات</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              تحميل كتب الحديث للاستخدام بدون إنترنت
            </p>
          </div>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3 custom-scrollbar">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Settings2 size={16} />
              <span className="text-xs font-bold">الكتب المتاحة</span>
            </div>
            <button
              onClick={() => void checkDownloads()}
              disabled={checkingStatus}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-600 dark:text-slate-300 disabled:opacity-60"
            >
              <RefreshCw size={14} className={checkingStatus ? 'animate-spin' : ''} />
              تحديث
            </button>
          </div>

          {checkingStatus && Object.keys(downloadedEditions).length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3">
              <RefreshCw size={28} className="animate-spin text-violet-600" />
              <p className="text-sm font-bold text-slate-500">جارٍ فحص الكتب المحمّلة...</p>
            </div>
          ) : (
            HADITH_EDITIONS.map((edition) => {
              const isDownloaded = downloadedEditions[edition.id];
              const isDownloading = downloadingEditionId === edition.id;

              return (
                <div
                  key={edition.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl ${
                        isDownloaded
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                      }`}
                    >
                      <FileJson size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-slate-800 dark:text-white truncate">{edition.name}</h4>
                      <span className="text-[10px] font-bold text-slate-400">
                        {isDownloading ? 'جارٍ التحميل...' : isDownloaded ? 'تم التحميل محليًا' : 'متاح للتنزيل'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => void handleDownload(edition.id)}
                    disabled={isDownloading || isDownloaded}
                    className={`min-w-[108px] px-3 py-2 rounded-xl transition-all active:scale-95 inline-flex items-center justify-center gap-2 text-sm font-black ${
                      isDownloaded
                        ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : isDownloading
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          : 'bg-violet-600 text-white shadow-lg shadow-violet-500/20 hover:bg-violet-700'
                    }`}
                  >
                    {isDownloading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        تحميل
                      </>
                    ) : isDownloaded ? (
                      <>
                        <CheckCircle2 size={16} />
                        مكتمل
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        Download
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 active:scale-95 transition shadow-sm"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default HadithDownloadModal;
