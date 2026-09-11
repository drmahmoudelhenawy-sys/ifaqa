import React, { useEffect, useState } from 'react';
import {
  X,
  BookOpen,
  Download,
  Trash2,
  Layers,
  MessageSquare,
  Library,
  CheckCircle2,
  Loader2,
  Mic2,
  BookMarked,
  Sparkles,
  HardDrive,
  Volume2,
  Radio
} from 'lucide-react';
import localforage from 'localforage';
import toast from 'react-hot-toast';
import {
  checkBundleStatus,
  downloadTafsir,
  downloadTafsirSaddi,
  downloadTafsirQurtubi,
  downloadTafsirIbnKathir,
  downloadTafsirTabari,
  downloadTafsirJalalayn,
  downloadTafsirBaghawi,
  downloadAllLinguistics,
  deleteAllLinguistics,
  TAFSIR_KEYS
} from '../services/offlineBundle';
import { QuranOfflineManager, DEFAULT_RECITER_ID } from '../services/quranOfflineManager';
import {
  HADITH_EDITIONS,
  getHadithCollectionAccessState,
  downloadHadithCollection,
  deleteHadithCollection,
  type HadithCollectionId
} from '../services/hadithService';

interface DownloadsManagerProps {
  onClose: () => void;
}

type TabType = 'tafsir' | 'reciters' | 'hadith';

interface ReciterOption {
  id: string;
  name: string;
  sub: string;
  surahIds: number[];
}

const FAMOUS_RECITERS: ReciterOption[] = [
  {
    id: 'Alafasy_128kbps',
    name: 'مشاري راشد العفاسي',
    sub: 'المصحف المرتل برواية حفص',
    surahIds: [1, 18, 36, 55, 56, 67, 112, 113, 114]
  },
  {
    id: 'Minshawy_Murattal_128kbps',
    name: 'محمد صديق المنشاوي',
    sub: 'المصحف المرتل',
    surahIds: [1, 18, 36, 67, 112, 113, 114]
  },
  {
    id: 'Abdul_Basit_Murattal_192kbps',
    name: 'عبد الباسط عبد الصمد',
    sub: 'المصحف المرتل جودة عالية',
    surahIds: [1, 18, 36, 67, 112, 113, 114]
  },
  {
    id: 'Husary_128kbps',
    name: 'محمود خليل الحصري',
    sub: 'المصحف المرتل برواية حفص',
    surahIds: [1, 18, 36, 67, 112, 113, 114]
  },
  {
    id: 'Ghamadi_40kbps',
    name: 'سعد الغامدي',
    sub: 'المصحف المرتل حجم خفيف',
    surahIds: [1, 18, 36, 67, 112, 113, 114]
  },
];

export const DownloadsManager: React.FC<DownloadsManagerProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('tafsir');
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [hadithStatus, setHadithStatus] = useState<Record<string, boolean>>({});
  const [reciterStatus, setReciterStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    void loadAllStatuses();
  }, []);

  const loadAllStatuses = async () => {
    // 1. Tafsirs & Linguistics Status
    const bundleStatus = await checkBundleStatus();
    const morphologyDownloaded = await QuranOfflineManager.hasAnyFeatureDownloaded('morphology');
    const mutashabihatDownloaded = await QuranOfflineManager.hasAnyFeatureDownloaded('mutashabihat');

    setStatus({
      muyassar: bundleStatus.tafsirMuyassar,
      saddi: bundleStatus.tafsirSaddi,
      qurtubi: bundleStatus.tafsirQurtubi,
      ibnKathir: bundleStatus.tafsirIbnKathir,
      tabari: bundleStatus.tafsirTabari,
      jalalayn: !!(await localforage.getItem(TAFSIR_KEYS.jalalayn)),
      baghawi: !!(await localforage.getItem(TAFSIR_KEYS.baghawi)),
      iraab: bundleStatus.iraab,
      morphology: morphologyDownloaded,
      mutashabihat: mutashabihatDownloaded,
    });

    // 2. Hadith Collections Status
    const hadithMap: Record<string, boolean> = {};
    for (const ed of HADITH_EDITIONS) {
      const state = await getHadithCollectionAccessState(ed.collection);
      hadithMap[ed.id] = state.isDownloaded;
    }
    setHadithStatus(hadithMap);

    // 3. Reciters Status
    const reciterMap: Record<string, boolean> = {};
    for (const reciter of FAMOUS_RECITERS) {
      const hasFatiha = await QuranOfflineManager.checkIfSurahDownloaded(1, reciter.id);
      reciterMap[reciter.id] = hasFatiha;
    }
    setReciterStatus(reciterMap);
  };

  // --- Handlers: Tafsir & Quran Sciences ---
  const handleTafsirDownload = async (key: string, downloader: (onProgress: (p: number) => void) => Promise<boolean | void>) => {
    setLoading(key);
    setProgress(0);
    try {
      await downloader(setProgress);
      setStatus((prev) => ({ ...prev, [key]: true }));
      toast.success('تم التنزيل بنجاح وأصبح متاحاً أوفلاين!');
    } catch {
      toast.error('فشل التنزيل، يرجى التأكد من اتصال الإنترنت.');
    } finally {
      setLoading(null);
    }
  };

  const handleTafsirDelete = async (key: string, storageKey?: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه البيانات من جهازك؟')) return;

    if (key === 'morphology') {
      await QuranOfflineManager.deleteFeatureForAllSurahs('morphology');
    } else if (key === 'mutashabihat') {
      await QuranOfflineManager.deleteFeatureForAllSurahs('mutashabihat');
    } else if (key === 'iraab') {
      await deleteAllLinguistics();
    } else if (storageKey) {
      await localforage.removeItem(storageKey);
    }

    setStatus((prev) => ({ ...prev, [key]: false }));
    toast.success('تم حذف البيانات بنجاح.');
  };

  // --- Handlers: Hadith Books ---
  const handleHadithDownload = async (editionId: string, collection: HadithCollectionId, name: string) => {
    setLoading(`hadith_${editionId}`);
    setProgress(15);
    try {
      setProgress(50);
      const success = await downloadHadithCollection(collection);
      if (success) {
        setHadithStatus((prev) => ({ ...prev, [editionId]: true }));
        toast.success(`تم تنزيل ${name} بنجاح للعمل بدون إنترنت!`);
      } else {
        toast.error(`تعذر تنزيل ${name}`);
      }
    } catch {
      toast.error(`حدث خطأ أثناء تنزيل ${name}`);
    } finally {
      setLoading(null);
      setProgress(0);
    }
  };

  const handleHadithDelete = async (editionId: string, collection: HadithCollectionId, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف ${name} من الذاكرة المحلية؟`)) return;
    await deleteHadithCollection(collection);
    setHadithStatus((prev) => ({ ...prev, [editionId]: false }));
    toast.success(`تم حذف ${name}`);
  };

  // --- Handlers: Reciter Audio ---
  const handleReciterDownload = async (reciter: ReciterOption) => {
    setLoading(`reciter_${reciter.id}`);
    setProgress(0);
    try {
      let completed = 0;
      for (const surahId of reciter.surahIds) {
        await QuranOfflineManager.downloadSurahData(surahId, reciter.id, (p) => {
          const overall = Math.round(((completed + p) / reciter.surahIds.length) * 100);
          setProgress(overall);
        });
        completed++;
      }
      setReciterStatus((prev) => ({ ...prev, [reciter.id]: true }));
      toast.success(`تم تنزيل السور المختارة للقارئ ${reciter.name} بنجاح!`);
    } catch {
      toast.error('حدث خطأ أثناء تنزيل التلاوات الصوتية.');
    } finally {
      setLoading(null);
      setProgress(0);
    }
  };

  const handleReciterDelete = async (reciter: ReciterOption) => {
    if (!window.confirm(`هل أنت متأكد من حذف التلاوات المحملة للقارئ ${reciter.name}؟`)) return;
    for (const surahId of reciter.surahIds) {
      await QuranOfflineManager.deleteSurahData(surahId, reciter.id);
    }
    setReciterStatus((prev) => ({ ...prev, [reciter.id]: false }));
    toast.success(`تم حذف تلاوات ${reciter.name}`);
  };

  const TAFSIRS = [
    { id: 'muyassar', key: TAFSIR_KEYS.muyassar, name: 'التفسير الميسر', desc: 'تفسير شامل وسهل لجميع آيات القرآن الكريم (كامل)', icon: BookOpen, downloader: downloadTafsir },
    { id: 'saddi', key: TAFSIR_KEYS.saddi, name: 'تفسير السعدي (تيسير الكريم الرحمن)', desc: 'تفسير عقدي وتربوي رفيع المعاني', icon: BookOpen, downloader: downloadTafsirSaddi },
    { id: 'jalalayn', key: TAFSIR_KEYS.jalalayn, name: 'تفسير الجلالين', desc: 'تفسير مختصر مركز لألفاظ القرآن', icon: BookOpen, downloader: downloadTafsirJalalayn },
    { id: 'ibnKathir', key: TAFSIR_KEYS.ibnKathir, name: 'تفسير ابن كثير (مختصر)', desc: 'عمدة التفسير بالمأثور والحديث', icon: BookMarked, downloader: downloadTafsirIbnKathir },
    { id: 'tabari', key: TAFSIR_KEYS.tabari, name: 'تفسير الطبري (جامع البيان)', desc: 'أعظم مراجع التفسير اللغوي والمأثور', icon: Library, downloader: downloadTafsirTabari },
    { id: 'qurtubi', key: TAFSIR_KEYS.qurtubi, name: 'تفسير القرطبي (الجامع لأحكام القرآن)', desc: 'تفسير فقهي ولغوي وإعرابي موسع', icon: Layers, downloader: downloadTafsirQurtubi },
    { id: 'baghawi', key: TAFSIR_KEYS.baghawi, name: 'تفسير البغوي (معالم التنزيل)', desc: 'مرجع تفسيري سنّي موثوق', icon: BookOpen, downloader: downloadTafsirBaghawi },
  ];

  const LINGUISTICS = [
    { id: 'iraab', name: 'إعراب القرآن الكريم كاملًا', desc: 'إعراب الكلمات والآيات كلمة بكلمة لـ 114 سورة بدون إنترنت', icon: MessageSquare, downloader: (onProgress: (p: number) => void) => downloadAllLinguistics((surah) => onProgress(Math.round((surah / 114) * 100))) },
    { id: 'morphology', name: 'معاني الكلمات وغريب القرآن', desc: 'قاموس معاني ألفاظ القرآن لجميع السور أوفلاين', icon: Library, downloader: (onProgress: (p: number) => void) => QuranOfflineManager.downloadFeatureForAllSurahs('morphology', (p) => onProgress(Math.round(p * 100))) },
    { id: 'mutashabihat', name: 'المتشابهات اللفظية', desc: 'تحديد وضبط مواضع المتشابهات بين الآيات أوفلاين', icon: Sparkles, downloader: (onProgress: (p: number) => void) => QuranOfflineManager.downloadFeatureForAllSurahs('mutashabihat', (p) => onProgress(Math.round(p * 100))) },
  ];

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-slate-50 dark:bg-slate-900 animate-in fade-in duration-300" dir="rtl">
      
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/95 safe-top">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <HardDrive size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">مركز إدارة التنزيلات (أوفلاين)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">تحميل البيانات للاستخدام الكامل بدون اتصال بالإنترنت</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800/70 p-1 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('tafsir')}
            className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'tafsir'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <BookOpen size={16} />
            التفاسير والعلوم
          </button>

          <button
            onClick={() => setActiveTab('reciters')}
            className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'reciters'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <Mic2 size={16} />
            تلاوات المشايخ
          </button>

          <button
            onClick={() => setActiveTab('hadith')}
            className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'hadith'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <BookMarked size={16} />
            كتب الحديث
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4 pb-24">
        
        {/* TAB 1: TAFSIRS & QURAN SCIENCES */}
        {activeTab === 'tafsir' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                تفاسير القرآن الكريم
              </h3>
              <div className="space-y-3">
                {TAFSIRS.map((item) => {
                  const isDownloaded = status[item.id];
                  const isLoading = loading === item.id;

                  return (
                    <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
                      <div className="mb-3 flex items-start gap-3">
                        <div className={`rounded-xl p-2.5 ${isDownloaded ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-900'}`}>
                          <item.icon size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-sm text-slate-900 dark:text-slate-100">{item.name}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end border-t border-slate-100 pt-3 dark:border-slate-700/50">
                        {isDownloaded ? (
                          <div className="flex w-full items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={16} /> متوفر أوفلاين
                            </span>
                            <button
                              onClick={() => handleTafsirDelete(item.id, item.key)}
                              className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400"
                            >
                              <Trash2 size={14} /> حذف
                            </button>
                          </div>
                        ) : isLoading ? (
                          <div className="w-full">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="animate-pulse text-xs font-bold text-emerald-600 dark:text-emerald-400">جاري التنزيل...</span>
                              <span className="text-xs font-bold text-slate-500">{progress}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                              <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleTafsirDownload(item.id, item.downloader)}
                            disabled={loading !== null}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Download size={16} /> تنزيل للعمل بدون إنترنت
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-200">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                علوم القرآن والإعراب
              </h3>
              <div className="space-y-3">
                {LINGUISTICS.map((item) => {
                  const isDownloaded = status[item.id];
                  const isLoading = loading === item.id;

                  return (
                    <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
                      <div className="mb-3 flex items-start gap-3">
                        <div className={`rounded-xl p-2.5 ${isDownloaded ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-900'}`}>
                          <item.icon size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-sm text-slate-900 dark:text-slate-100">{item.name}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end border-t border-slate-100 pt-3 dark:border-slate-700/50">
                        {isDownloaded ? (
                          <div className="flex w-full items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                              <CheckCircle2 size={16} /> متوفر أوفلاين
                            </span>
                            <button
                              onClick={() => handleTafsirDelete(item.id)}
                              className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400"
                            >
                              <Trash2 size={14} /> حذف
                            </button>
                          </div>
                        ) : isLoading ? (
                          <div className="w-full">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="animate-pulse text-xs font-bold text-blue-600 dark:text-blue-400">جاري التنزيل...</span>
                              <span className="text-xs font-bold text-slate-500">{progress}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                              <div className="h-full rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleTafsirDownload(item.id, item.downloader)}
                            disabled={loading !== null}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Download size={16} /> تنزيل للعمل بدون إنترنت
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: RECITERS AUDIO */}
        {activeTab === 'reciters' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/10 flex items-start gap-3">
              <Volume2 className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" size={20} />
              <p className="text-xs font-bold leading-relaxed text-amber-800 dark:text-amber-200">
                يمكنك هنا تنزيل حزم السور الأساسية (الفاتحة، الكهف، يس، الملك، المعوذات) لكل قارئ لتعمل بدون إنترنت فوراً مع إمكانية حذفها في أي وقت لتوفير مساحة الهاتف.
              </p>
            </div>

            <div className="space-y-3">
              {FAMOUS_RECITERS.map((reciter) => {
                const isDownloaded = reciterStatus[reciter.id];
                const isLoading = loading === `reciter_${reciter.id}`;

                return (
                  <div key={reciter.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
                    <div className="mb-3 flex items-start gap-3">
                      <div className={`rounded-xl p-2.5 ${isDownloaded ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-900'}`}>
                        <Mic2 size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-sm text-slate-900 dark:text-slate-100">{reciter.name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{reciter.sub} ({reciter.surahIds.length} سور رئيسية)</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end border-t border-slate-100 pt-3 dark:border-slate-700/50">
                      {isDownloaded ? (
                        <div className="flex w-full items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={16} /> تلاوات القارئ محملة أوفلاين
                          </span>
                          <button
                            onClick={() => handleReciterDelete(reciter)}
                            className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400"
                          >
                            <Trash2 size={14} /> تفريغ المساحة
                          </button>
                        </div>
                      ) : isLoading ? (
                        <div className="w-full">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="animate-pulse text-xs font-bold text-emerald-600 dark:text-emerald-400">جاري تنزيل ملفات الصوت...</span>
                            <span className="text-xs font-bold text-slate-500">{progress}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleReciterDownload(reciter)}
                          disabled={loading !== null}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Download size={16} /> تنزيل تلاوات القارئ أوفلاين
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: HADITH COLLECTIONS */}
        {activeTab === 'hadith' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/30 dark:bg-violet-900/10 flex items-start gap-3">
              <BookMarked className="text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" size={20} />
              <p className="text-xs font-bold leading-relaxed text-violet-800 dark:text-violet-200">
                تتيح لك هذه الميزة تنزيل كتب الحديث الشريف كاملة بالسند والشرح والتخريج لتعمل بدون أدنى حاجة للإنترنت.
              </p>
            </div>

            <div className="space-y-3">
              {HADITH_EDITIONS.map((ed) => {
                const isDownloaded = hadithStatus[ed.id];
                const isLoading = loading === `hadith_${ed.id}`;

                return (
                  <div key={ed.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
                    <div className="mb-3 flex items-start gap-3">
                      <div className={`rounded-xl p-2.5 ${isDownloaded ? 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-900'}`}>
                        <BookMarked size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-sm text-slate-900 dark:text-slate-100">{ed.name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">كتاب حديث معتمد مع التخريج والترقيم الكامل</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end border-t border-slate-100 pt-3 dark:border-slate-700/50">
                      {isDownloaded ? (
                        <div className="flex w-full items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                            <CheckCircle2 size={16} /> الكتاب محمل أوفلاين
                          </span>
                          <button
                            onClick={() => handleHadithDelete(ed.id, ed.collection, ed.name)}
                            className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400"
                          >
                            <Trash2 size={14} /> حذف الكتاب
                          </button>
                        </div>
                      ) : isLoading ? (
                        <div className="w-full">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="animate-pulse text-xs font-bold text-violet-600 dark:text-violet-400">جاري تنزيل الكتاب بالكامل...</span>
                            <span className="text-xs font-bold text-slate-500">{progress}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div className="h-full rounded-full bg-violet-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleHadithDownload(ed.id, ed.collection, ed.name)}
                          disabled={loading !== null}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                        >
                          <Download size={16} /> تنزيل الكتاب أوفلاين
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
