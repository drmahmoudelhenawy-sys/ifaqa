import React, { useState, useEffect } from 'react';
import { Download, WifiOff, CheckCircle, AlertTriangle, Loader2, Book, FileText, Library, CloudDownload, Palette } from 'lucide-react';
import { LOGO_COLORED } from '../constants';
import { 
    checkBundleStatus, 
    downloadQuran, 
    downloadTafsir, 
    downloadLinguisticsSurah,
    getLinguisticsStats 
} from '../src/services/offlineBundle';

interface OfflineSetupProps {
  onComplete: () => void;
}

type DownloadState = 'idle' | 'downloading' | 'completed' | 'error';

const OfflineSetup: React.FC<OfflineSetupProps> = ({ onComplete }) => {
  const [quranState, setQuranState] = useState<DownloadState>('idle');
  const [tafsirState, setTafsirState] = useState<DownloadState>('idle');
  const [lingState, setLingState] = useState<DownloadState>('idle');
  const [bitaqatState, setBitaqatState] = useState<DownloadState>('idle');
  const [lingProgress, setLingProgress] = useState({ downloaded: 0, total: 114 });
  const [isChecking, setIsChecking] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    const check = async () => {
      setIsChecking(true);
      try {
        const status = await checkBundleStatus();
        setQuranState(status.quran ? 'completed' : 'idle');
        setTafsirState(status.tafsir ? 'completed' : 'idle');
        setBitaqatState(status.albitaqat ? 'completed' : 'idle');
        
        const stats = await getLinguisticsStats();
        setLingProgress({ downloaded: stats.downloadedCount, total: stats.total });
        setLingState(stats.isComplete ? 'completed' : (stats.downloadedCount > 0 ? 'idle' : 'idle'));
        
        if (status.quran && status.tafsir && stats.isComplete) {
           localStorage.setItem('ifaqa_assets_downloaded', 'true');
        }
      } catch (error) {
        console.error("Failed to check status", error);
      } finally {
        setIsChecking(false);
      }
    };
    check();
  }, []);

  const handleDownloadQuran = async () => {
    if (!isOnline) return;
    setQuranState('downloading');
    try {
      await downloadQuran();
      setQuranState('completed');
    } catch {
      setQuranState('error');
    }
  };

  const handleDownloadTafsir = async () => {
    if (!isOnline) return;
    setTafsirState('downloading');
    try {
      await downloadTafsir();
      setTafsirState('completed');
    } catch {
      setTafsirState('error');
    }
  };

  const handleDownloadLing = async () => {
    if (!isOnline) return;
    setLingState('downloading');
    
    let downloaded = 0;
    try {
      for (let i = 1; i <= 114; i++) {
        try {
            await downloadLinguisticsSurah(i);
            downloaded++;
            setLingProgress(prev => ({ ...prev, downloaded }));
            // Add small delay to prevent rate-limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
            console.warn(`Error downloading surah ${i}`, e);
        }
      }
      setLingState('completed');
    } catch (error) {
      setLingState('error');
    }
  };

  const handleDownloadBitaqat = async () => {
    if (!isOnline) return;
    setBitaqatState('downloading');
    try {
      await import('../src/services/offlineBundle').then(m => m.downloadAlbitaqat());
      setBitaqatState('completed');
    } catch {
      setBitaqatState('error');
    }
  };

  const downloadAll = async () => {
    if (quranState === 'idle' || quranState === 'error') handleDownloadQuran();
    if (tafsirState === 'idle' || tafsirState === 'error') handleDownloadTafsir();
    if (lingState === 'idle' || lingState === 'error') handleDownloadLing();
    if (bitaqatState === 'idle' || bitaqatState === 'error') handleDownloadBitaqat();
  };

  const isAllEssentialComplete = quranState === 'completed' && tafsirState === 'completed';

  const finishSetup = () => {
    localStorage.setItem('ifaqa_assets_downloaded', 'true');
    onComplete();
  };

  if (!isOnline && !isAllEssentialComplete && !localStorage.getItem('ifaqa_assets_downloaded')) {
      return (
        <div className="fixed inset-0 z-[300] bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-8 text-center" dir="rtl">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-red-500 rounded-full blur-[40px] opacity-20 animate-pulse"></div>
                <div className="relative w-24 h-24 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl flex items-center justify-center border border-red-100 dark:border-red-900/30">
                    <WifiOff size={40} className="text-red-500"/>
                </div>
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4">عذراً، لا يوجد اتصال</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-10 text-sm">
                نحتاج للاتصال بالإنترنت لتحميل الحزم الأساسية لمرة واحدة.
            </p>
            <button onClick={() => window.location.reload()} className="w-full max-w-xs bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all">
                إعادة المحاولة
            </button>
        </div>
      );
  }

  const renderItem = (title: string, state: DownloadState, onDownload: () => void, Icon: any, description: string, progress?: {current: number, total: number}) => {
    return (
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm mb-3 group transition-all hover:shadow-md">
        <div className="flex items-center gap-4 flex-1">
          <div className="p-3 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl">
            <Icon size={24} />
          </div>
          <div className="text-right flex-1">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm md:text-base">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
            {progress && state === 'downloading' && (
                <div className="mt-2 w-full max-w-[150px]">
                    <div className="flex justify-between text-[10px] mb-1 font-bold">
                        <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                        <span>{progress.current}/{progress.total}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-violet-500 transition-all duration-300" 
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        ></div>
                    </div>
                </div>
            )}
          </div>
        </div>
        <div className="mr-4">
          {state === 'idle' && (
            <button onClick={onDownload} className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300">
              <Download size={20} />
            </button>
          )}
          {state === 'downloading' && (
            <div className="p-2.5 rounded-full text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 animate-spin">
              <Loader2 size={20} />
            </div>
          )}
          {state === 'completed' && (
            <div className="p-2.5 rounded-full text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20">
              <CheckCircle size={20} />
            </div>
          )}
          {state === 'error' && (
            <button onClick={onDownload} className="p-2.5 rounded-full bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 transition-colors" title="فشل التحميل، أعد المحاولة">
              <AlertTriangle size={20} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-50 dark:bg-slate-900 flex flex-col font-arabic" dir="rtl">
        <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center justify-center relative">
            <div className="w-full max-w-lg relative z-10">
                <div className="text-center mb-8">
                    <div className="mb-6 inline-block">
                        <img src={LOGO_COLORED} className="w-20 h-20 mx-auto object-contain drop-shadow-lg" alt="Logo" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3">مدير التحميلات</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                        قم بإدارة حزم البيانات للاستمتاع بتجربة إفاقة المتكاملة بدون إنترنت.
                    </p>
                </div>

                {isChecking ? (
                   <div className="flex justify-center p-10"><Loader2 className="animate-spin text-violet-500" size={32}/></div>
                ) : (
                  <div className="space-y-2 mb-8">
                      {renderItem("نص المصحف الشريف", quranState, handleDownloadQuran, Book, "النص القرآني بالرسم العثماني")}
                      {renderItem("التفسير الميسر", tafsirState, handleDownloadTafsir, FileText, "التفسير الشامل للآيات")}
                      {renderItem(
                          "الموسوعة اللغوية", 
                          lingState, 
                          handleDownloadLing, 
                          Library, 
                          "الإعراب، البلاغة، الصرف والمعاني (سورة بسورة)",
                          { current: lingProgress.downloaded, total: lingProgress.total }
                      )}
                      {renderItem("موسوعة السور", bitaqatState, handleDownloadBitaqat, FileText, "أسباب النزول، المقاصد، والمناسبات")}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={downloadAll}
                    disabled={isChecking || (quranState === 'completed' && tafsirState === 'completed' && lingState === 'completed' && bitaqatState === 'completed')}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-violet-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <CloudDownload size={20} />
                    تحميل الكل
                  </button>

                  <button 
                    onClick={finishSetup}
                    disabled={!isAllEssentialComplete}
                    className={`w-full py-4 rounded-2xl font-bold transition-all ${
                      isAllEssentialComplete 
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02] active:scale-95 shadow-xl' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    متابعة للتطبيق
                  </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default OfflineSetup;
