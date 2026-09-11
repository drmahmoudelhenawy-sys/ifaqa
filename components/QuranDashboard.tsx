import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';
import React, { useEffect, useMemo, useState } from 'react';
import {
  BookMarked,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Flame,
  GraduationCap,
  History,
  Layers3,
  Loader2,
  Search,
  Settings,
  Target,
  X,
  Sparkles,
  HardDrive
} from 'lucide-react';
import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { quranApi } from '../services/quranApi';
import { APP_ID } from '../constants';
import { KhatmaGoal, QuranMode, QuranState, WirdDay } from '../types';
import { quranSurahs } from '../quranMetadata';
import { DownloadsManager } from '../src/components/DownloadsManager';

interface QuranDashboardProps {
  user: User;
  onNavigate: (page: 'reader', params?: { mode: QuranMode; surah: number; ayah?: number; page?: number; planId?: string }) => void;
}

const todayKey = () => new Date().toISOString().slice(0, 10);
const TOTAL_MUSHAF_PAGES = 604;
const READING_TRACKER_KEY = 'quranDailyPagesRead';
const LAST_READ_PAGE_KEY = 'quranLastReadPage';
const TOTAL_KHATMA_PROGRESS_KEY = 'quranTotalKhatmaProgress';
const QURAN_DAILY_XP_KEY = 'quranDailyXp';
const QURAN_TOTAL_XP_KEY = 'quranTotalXp';
const QURAN_PLANS_KEY = 'quranMultiPlans';
const quranStateDoc = (uid: string) => doc(db, 'artifacts', APP_ID, 'users', uid, 'quran_state', 'main');

interface QuranPlan {
  id: string;
  title: string;
  type: 'khatma' | 'wird';
  days: number;
  pagesPerDay: number;
  startPage: number;
  currentPage: number;
  mode: QuranMode;
  createdAt: string;
  updatedAt?: string;
}

function readQuranPlans(): QuranPlan[] {
  try {
    return JSON.parse(localStorage.getItem(QURAN_PLANS_KEY) || '[]') as QuranPlan[];
  } catch {
    return [];
  }
}

function readLocalQuranStats() {
  try {
    const dailyPagesRead = JSON.parse(localStorage.getItem(READING_TRACKER_KEY) || '{}') as Record<string, number>;
    const dailyXp = JSON.parse(localStorage.getItem(QURAN_DAILY_XP_KEY) || '{}') as Record<string, number>;
    const lastReadPage = Number(localStorage.getItem(LAST_READ_PAGE_KEY) || 0);
    const totalKhatmaProgress = Number(localStorage.getItem(TOTAL_KHATMA_PROGRESS_KEY) || 0);
    const totalQuranXp = Number(localStorage.getItem(QURAN_TOTAL_XP_KEY) || 0);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - index);
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: index === 0 ? 'اليوم' : date.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' }),
        pages: dailyPagesRead[key] || 0,
        xp: dailyXp[key] || 0
      };
    });
    const weekPages = days.reduce((sum, day) => sum + day.pages, 0);
    return {
      todayPages: dailyPagesRead[todayKey()] || 0,
      todayQuranXp: dailyXp[todayKey()] || 0,
      totalQuranXp: Number.isFinite(totalQuranXp) ? totalQuranXp : 0,
      weekPages,
      weekAverage: Math.round((weekPages / 7) * 10) / 10,
      days,
      lastReadPage: Number.isFinite(lastReadPage) && lastReadPage > 0 ? lastReadPage : undefined,
      totalKhatmaProgress: Number.isFinite(totalKhatmaProgress) ? totalKhatmaProgress : 0
    };
  } catch {
    return { todayPages: 0, todayQuranXp: 0, totalQuranXp: 0, weekPages: 0, weekAverage: 0, days: [], lastReadPage: undefined, totalKhatmaProgress: 0 };
  }
}

const DEFAULT_STATE: QuranState = {
  bookmarks: {
    reading: { surah: 1, ayah: 1, updatedAt: new Date().toISOString() },
    new_hifz: { surah: 78, ayah: 1, updatedAt: new Date().toISOString() },
    near_review: { surah: 67, ayah: 1, updatedAt: new Date().toISOString() },
    far_review: { surah: 18, ayah: 1, updatedAt: new Date().toISOString() },
    casual: { surah: 18, ayah: 1, updatedAt: new Date().toISOString() }
  },
  ayahBookmarks: {},
  pageBookmarks: {},
  highlights: {},
  dailyPagesRead: {},
  readPageKeys: {}
};

const fallbackSurahs = [
  { number: 1, name: 'الفاتحة', englishName: 'Al-Faatiha', numberOfAyahs: 7 },
  { number: 2, name: 'البقرة', englishName: 'Al-Baqara', numberOfAyahs: 286 },
  { number: 3, name: 'آل عمران', englishName: 'Aal-i-Imraan', numberOfAyahs: 200 },
  { number: 18, name: 'الكهف', englishName: 'Al-Kahf', numberOfAyahs: 110 },
  { number: 36, name: 'يس', englishName: 'Yaseen', numberOfAyahs: 83 },
  { number: 55, name: 'الرحمن', englishName: 'Ar-Rahmaan', numberOfAyahs: 78 },
  { number: 56, name: 'الواقعة', englishName: 'Al-Waaqia', numberOfAyahs: 96 },
  { number: 67, name: 'الملك', englishName: 'Al-Mulk', numberOfAyahs: 30 },
  { number: 78, name: 'النبأ', englishName: 'An-Naba', numberOfAyahs: 40 },
  { number: 112, name: 'الإخلاص', englishName: 'Al-Ikhlaas', numberOfAyahs: 4 }
];

const formatAyahCountLabel = (count: number) => {
  if (count === 1) return 'آية';
  if (count === 2) return 'آيتان';
  if (count >= 3 && count <= 10) return 'آيات';
  return 'آية';
};

const MODES: Array<{
  id: QuranMode;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  className: string;
}> = [
  {
    id: 'reading',
    title: 'قراءة',
    subtitle: 'آخر موضع وختمة',
    icon: <BookOpen size={31} />,
    className: 'bg-emerald-500 text-white'
  },
  {
    id: 'new_hifz',
    title: 'حفظ',
    subtitle: 'تسميع متدرج',
    icon: <GraduationCap size={31} />,
    className: 'bg-violet-500 text-white'
  },
  {
    id: 'near_review',
    title: 'مراجعة قريبة',
    subtitle: 'تثبيت الحديث',
    icon: <History size={31} />,
    className: 'bg-amber-400 text-slate-950'
  },
  {
    id: 'far_review',
    title: 'مراجعة بعيدة',
    subtitle: 'محفوظات قديمة',
    icon: <BookMarked size={31} />,
    className: 'bg-sky-500 text-white'
  }
];

export default function QuranDashboard({ user, onNavigate }: QuranDashboardProps) {
  const [state, setState] = useState<QuranState>(DEFAULT_STATE);
  const [surahs, setSurahs] = useState<any[]>(() => quranSurahs.map((surah) => ({
    number: surah.number,
    name: surah.name,
    englishName: surah.englishName,
    numberOfAyahs: surah.ayahCount,
    firstPage: surah.startPage
  })));
  const [wirdData, setWirdData] = useState<WirdDay>({ progress: 0, tasks: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'index' | 'marks'>('home');
  const [showKhatmaPlanner, setShowKhatmaPlanner] = useState(false);
  const [planType, setPlanType] = useState<'khatma' | 'wird'>('khatma');
  const [khatmaTitle, setKhatmaTitle] = useState('ختمة جديدة');
  const [khatmaDays, setKhatmaDays] = useState(30);
  const [wirdTitle, setWirdTitle] = useState('ورد جديد');
  const [wirdDays, setWirdDays] = useState(7);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [quranPlans, setQuranPlans] = useState<QuranPlan[]>(readQuranPlans);
  const [localStats, setLocalStats] = useState(readLocalQuranStats);
  const [showStatsDetails, setShowStatsDetails] = useState(false);
  const [showDownloadsManager, setShowDownloadsManager] = useState(false);

  useEffect(() => {
    quranApi.getSurahs().then((items) => {
      if (items?.length) setSurahs(items);
    });
  }, []);

  useEffect(() => {
    const docRef = quranStateDoc(user.uid);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setState({ ...DEFAULT_STATE, ...snap.data() } as QuranState);
      } else {
        setDoc(docRef, DEFAULT_STATE, { merge: true });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user.uid]);

  useEffect(() => {
    const docRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'wird', todayKey());
    const unsub = onSnapshot(docRef, (snap) => {
      setWirdData(snap.exists() ? snap.data() as WirdDay : { progress: 0, tasks: [] });
    });
    return () => unsub();
  }, [user.uid]);

  useEffect(() => {
    const refreshLocalStats = () => {
      setLocalStats(readLocalQuranStats());
      setQuranPlans(readQuranPlans());
    };
    window.addEventListener('storage', refreshLocalStats);
    window.addEventListener('focus', refreshLocalStats);
    window.addEventListener('quran-progress-updated', refreshLocalStats);
    window.addEventListener('quran-cloud-synced', refreshLocalStats);
    window.addEventListener('quran-xp-updated', refreshLocalStats);
    refreshLocalStats();

    return () => {
      window.removeEventListener('storage', refreshLocalStats);
      window.removeEventListener('focus', refreshLocalStats);
      window.removeEventListener('quran-progress-updated', refreshLocalStats);
      window.removeEventListener('quran-cloud-synced', refreshLocalStats);
      window.removeEventListener('quran-xp-updated', refreshLocalStats);
    };
  }, []);

  const todayPages = Math.max(state.dailyPagesRead?.[todayKey()] || 0, localStats.todayPages);
  const totalPagesRead = Object.values(state.dailyPagesRead || {}).reduce<number>((sum, count) => sum + (Number(count) || 0), 0);
  const khatmaGoal = state.khatmaGoal;
  const khatmaProgress = Math.max(
    localStats.totalKhatmaProgress,
    khatmaGoal ? Math.min(100, Math.round((totalPagesRead / TOTAL_MUSHAF_PAGES) * 100)) : 0
  );
  const readingBookmark = state.bookmarks?.reading || DEFAULT_STATE.bookmarks.reading;

  const filteredSurahs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return surahs;
    return surahs.filter((surah) => `${surah.number} ${surah.name} ${surah.englishName}`.toLowerCase().includes(needle));
  }, [query, surahs]);

  const marks = useMemo(() => {
    const bookmarks = Object.entries(state.ayahBookmarks || {}).map(([key, mark]) => ({ key, type: 'علامة آية', ...(mark as Record<string, any>) }));
    const pageBookmarks = Object.entries(state.pageBookmarks || {}).map(([key, mark]) => ({ key, type: 'علامة صفحة', ...(mark as Record<string, any>) }));
    const highlights = Object.entries(state.highlights || {}).map(([key, mark]) => ({ key, type: 'تلوين', ...(mark as Record<string, any>) }));
    return [...bookmarks, ...pageBookmarks, ...highlights].sort((a: any, b: any) => a.surah - b.surah || (a.ayah || 0) - (b.ayah || 0) || (a.page || 0) - (b.page || 0));
  }, [state.ayahBookmarks, state.pageBookmarks, state.highlights]);

  const getSurahName = (surahNumber: number) => {
    return surahs.find((surah) => surah.number === surahNumber)?.name || `سورة ${surahNumber}`;
  };

  const openMode = (mode: QuranMode) => {
    const bookmark = state.bookmarks?.[mode] || DEFAULT_STATE.bookmarks[mode];
    onNavigate('reader', {
      mode,
      surah: bookmark.surah,
      ayah: bookmark.ayah,
      page: mode === 'reading' ? localStats.lastReadPage : undefined
    });
  };

  const resetPlanForm = () => {
    setEditingPlanId(null);
    setKhatmaTitle('ختمة جديدة');
    setKhatmaDays(30);
    setWirdTitle('ورد جديد');
    setWirdDays(7);
  };

  const openPlanEditor = (plan?: QuranPlan, type: 'khatma' | 'wird' = planType) => {
    setPlanType(plan?.type || type);
    if (plan) {
      setEditingPlanId(plan.id);
      if (plan.type === 'khatma') {
        setKhatmaTitle(plan.title);
        setKhatmaDays(plan.days);
      } else {
        setWirdTitle(plan.title);
        setWirdDays(plan.days);
      }
    } else {
      setEditingPlanId(null);
    }
    setShowKhatmaPlanner(true);
  };

  const saveQuranPlan = async () => {
    const isKhatma = planType === 'khatma';
    const title = isKhatma ? khatmaTitle : wirdTitle;
    const targetDays = isKhatma ? khatmaDays : wirdDays;
    const days = Math.max(1, Math.round(Number(targetDays) || 1));
    const pagesPerDay = Math.ceil(TOTAL_MUSHAF_PAGES / days);
    const existingPlan = quranPlans.find((plan) => plan.id === editingPlanId);
    const nextPlan: QuranPlan = {
      id: editingPlanId || `${Date.now()}`,
      title: title.trim() || (planType === 'khatma' ? 'ختمة جديدة' : 'ورد جديد'),
      type: planType,
      days,
      pagesPerDay,
      startPage: existingPlan?.startPage || 1,
      currentPage: existingPlan?.currentPage || 1,
      mode: planType === 'khatma' ? 'reading' : 'new_hifz',
      createdAt: existingPlan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const nextPlans = editingPlanId
      ? quranPlans.map((plan) => plan.id === editingPlanId ? nextPlan : plan)
      : [nextPlan, ...quranPlans].slice(0, 12);
    localStorage.setItem(QURAN_PLANS_KEY, JSON.stringify(nextPlans));
    setQuranPlans(nextPlans);

    if (planType === 'khatma') {
      const goal: KhatmaGoal = {
        targetDays: days,
        startDate: todayKey(),
        pagesPerDay,
        completedPages: totalPagesRead,
        updatedAt: new Date().toISOString()
      };
      await setDoc(quranStateDoc(user.uid), { khatmaGoal: goal }, { merge: true });
    }
    setShowKhatmaPlanner(false);
    resetPlanForm();
  };

  const deleteQuranPlan = (planId: string) => {
    const next = quranPlans.filter((item) => item.id !== planId);
    localStorage.setItem(QURAN_PLANS_KEY, JSON.stringify(next));
    setQuranPlans(next);
    if (editingPlanId === planId) resetPlanForm();
  };

  const openQuranPlan = (plan: QuranPlan) => {
    onNavigate('reader', {
      mode: plan.mode,
      surah: 1,
      ayah: 1,
      page: plan.currentPage || plan.startPage || 1,
      planId: plan.id
    });
  };

  const activePlanTitle = planType === 'khatma' ? khatmaTitle : wirdTitle;
  const activePlanDays = planType === 'khatma' ? khatmaDays : wirdDays;
  const dailyPagesPreview = Math.ceil(TOTAL_MUSHAF_PAGES / Math.max(1, Number(activePlanDays) || 1));
  const updateActivePlanTitle = (value: string) => {
    if (planType === 'khatma') {
      setKhatmaTitle(value);
    } else {
      setWirdTitle(value);
    }
  };
  const updateActivePlanDays = (value: number) => {
    const days = Math.max(1, Number(value) || 1);
    if (planType === 'khatma') {
      setKhatmaDays(days);
    } else {
      setWirdDays(days);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-emerald-600">
        <Loader2 className="animate-spin" size={34} />
      </div>
    );
  }

  return (
    <div className="relative -mx-4 min-h-full bg-slate-50 px-4 pb-28 pt-2 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white animate-in fade-in duration-500">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Top Luminous Hero Header */}
        <section className="relative overflow-hidden rounded-[2.3rem] bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white shadow-2xl shadow-emerald-950/20 border border-emerald-500/20">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
          
          <div className="relative p-6 z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-md">
                    <Sparkles size={12} className="text-yellow-300" />
                    <span>مصحف إفاقة الميسر</span>
                  </span>
                  <button
                    onClick={() => setShowDownloadsManager(true)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/30 backdrop-blur-md transition active:scale-95"
                    title="مركز إدارة التنزيلات أوفلاين"
                  >
                    <Download size={12} />
                    <span>التنزيلات</span>
                  </button>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                  القرآن الكريم
                </h1>
                <p className="text-xs sm:text-sm font-bold text-emerald-100/75 leading-relaxed max-w-sm">
                  قراءة، تلاوة، حفظ، تفسير ميسر، معاني، وتتبع دقيق لختماتك اليومية.
                </p>
              </div>

              <button
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(20);
                  onNavigate('reader', { mode: 'reading', surah: readingBookmark.surah, ayah: readingBookmark.ayah, page: localStats.lastReadPage });
                }}
                className="group relative flex flex-col items-center justify-center h-18 w-18 shrink-0 rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 shadow-xl shadow-emerald-500/30 transition-all duration-300 hover:scale-105 active:scale-95 border border-white/40"
                aria-label="متابعة القراءة"
              >
                <BookOpen size={28} className="transition-transform group-hover:scale-110 drop-shadow-sm" />
                <span className="text-[10px] font-black mt-1">متابعة</span>
              </button>
            </div>

            {/* Metrics Row */}
            <div className="relative mt-5 grid grid-cols-3 gap-2.5">
              <MetricCard label="اليوم" value={`${todayPages}`} hint="صفحة" icon={<Flame size={18} className="text-amber-400" />} />
              <MetricCard label="الختمة" value={`${khatmaProgress}%`} hint={khatmaGoal ? `${khatmaGoal.pagesPerDay} يوميا` : 'بدون هدف'} icon={<Target size={18} className="text-emerald-400" />} />
              <MetricCard label="العلامات" value={`${marks.length}`} hint="موضع" icon={<Layers3 size={18} className="text-cyan-400" />} />
            </div>
          </div>
        </section>

        {/* Tab Navigation Switcher */}
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-white/80 p-1.5 shadow-sm border border-slate-200/80 backdrop-blur-md dark:bg-slate-900/80 dark:border-slate-800">
          {[
            { id: 'home', label: 'المصحف' },
            { id: 'index', label: 'الفهرس والسور' },
            { id: 'marks', label: 'علاماتي وتلويني' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                setActiveTab(tab.id as typeof activeTab);
              }}
              className={`rounded-xl py-2.5 text-xs sm:text-sm font-black transition-all duration-200 active:scale-95 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ======================= TAB 1: HOME ======================= */}
        {activeTab === 'home' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Quick Resume Card & 3 Quick Buttons */}
            <section className="grid grid-cols-3 gap-3">
              <button
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(20);
                  onNavigate('reader', { mode: 'reading', surah: readingBookmark.surah, ayah: readingBookmark.ayah, page: localStats.lastReadPage });
                }}
                className="col-span-3 overflow-hidden rounded-[2rem] border border-emerald-500/25 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 p-5 text-right shadow-lg shadow-emerald-500/5 backdrop-blur-xl transition-all duration-300 hover:border-emerald-400/60 hover:shadow-xl active:scale-[0.985] dark:border-emerald-800/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>متابعة القراءة والورد</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      صفحة {localStats.lastReadPage || readingBookmark.surah}
                    </h2>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      سورة {getSurahName(readingBookmark.surah)} · آية {readingBookmark.ayah}
                    </p>
                  </div>
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30 flex-shrink-0">
                    <BookOpen size={30} className="drop-shadow-sm" />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800 p-0.5 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 ifaqa-shimmer transition-all duration-500"
                    style={{ width: `${khatmaProgress}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-black text-slate-500 dark:text-slate-400">
                  <span>نسبة إنجاز الختمة</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">{khatmaProgress}%</span>
                </div>
              </button>

              {/* 4 Quick Navigation Tiles */}
              {[
                { title: 'الفهرس والسور', icon: <Layers3 size={20} />, action: () => setActiveTab('index'), tone: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200/60 dark:border-violet-800/40' },
                { title: 'علاماتي ومواضعي', icon: <BookMarked size={20} />, action: () => setActiveTab('marks'), tone: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40' },
                { title: 'إعدادات الختمة', icon: <Settings size={20} />, action: () => openPlanEditor(undefined, 'khatma'), tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40' },
                { title: 'التنزيلات أوفلاين', icon: <HardDrive size={20} />, action: () => setShowDownloadsManager(true), tone: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/60 dark:border-cyan-800/40' }
              ].map((card) => (
                <button
                  key={card.title}
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(10);
                    card.action();
                  }}
                  className="flex flex-col items-center justify-center rounded-[1.6rem] border border-slate-200/80 bg-white p-3 text-center shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 dark:border-slate-800 dark:bg-slate-900 group"
                >
                  <span className={`mb-2 grid h-10 w-10 place-items-center rounded-2xl border transition-transform group-hover:scale-110 shadow-sm ${card.tone}`}>
                    {outlineContent(card.icon)}
                  </span>
                  <h2 className="text-[11px] font-black text-slate-800 dark:text-slate-200 leading-tight">{card.title}</h2>
                </button>
              ))}
            </section>

            {/* Quran Statistics Section */}
            <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">إحصائيات القراءة والأوراد</h2>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">تتبع ذكي للصفحات اليومية مع احتساب نقاط الـ XP.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStatsDetails((value) => !value)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-1.5 text-xs font-black text-slate-700 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                >
                  {showStatsDetails ? 'إخفاء' : 'التفاصيل'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800/60 dark:bg-slate-950/40">
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{localStats.todayPages}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">صفحات اليوم</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800/60 dark:bg-slate-950/40">
                  <p className="text-xl font-black text-violet-600 dark:text-violet-400 font-mono">+{localStats.todayQuranXp}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">نقاط اليوم</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800/60 dark:bg-slate-950/40">
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">{localStats.totalQuranXp}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">مجموع القرآن</p>
                </div>
              </div>

              {showStatsDetails && (
                <div className="mt-4 space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-black text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <span>معدل الأسبوع</span>
                    <span className="font-mono">{localStats.weekAverage} صفحة يومياً</span>
                  </div>
                  {localStats.days.map((day) => (
                    <div key={day.key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold dark:bg-slate-950/40">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{day.label}</span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono">{day.pages} صفحة · {day.xp} XP</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Plans & Wirds Section */}
            <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">خططي وأورادي المخصصة</h2>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">أنشئ خططاً متعددة لكل مناسبة أو شهر.</p>
                </div>
                <button
                  onClick={() => openPlanEditor(undefined, 'khatma')}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-emerald-600/20 active:scale-95 transition"
                >
                  + إضافة خطة
                </button>
              </div>

              {quranPlans.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-xs font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                  لا توجد خطط مضافة بعد. اضغط على "+ إضافة خطة" لتحديد هدفك.
                </p>
              ) : (
                <div className="grid gap-2.5">
                  {quranPlans.map((plan) => (
                    <div key={plan.id} className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                      <button
                        onClick={() => openQuranPlan(plan)}
                        className="flex w-full items-center justify-between text-right active:scale-[0.99] group"
                      >
                        <div className="space-y-0.5">
                          <span className="block font-black text-sm text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{plan.title}</span>
                          <span className="text-xs font-bold text-slate-400">
                            {plan.type === 'khatma' ? 'ختمة' : 'ورد'} · صفحة {plan.currentPage || plan.startPage || 1} · {plan.pagesPerDay} صفحة يومياً
                          </span>
                        </div>
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-sm flex-shrink-0">
                          <BookOpen size={18} />
                        </span>
                      </button>
                      <div className="mt-3 flex gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                        <button onClick={() => openPlanEditor(plan)} className="flex-1 rounded-xl bg-white border border-slate-200/70 py-1.5 text-xs font-black text-slate-700 active:scale-95 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition">
                          تعديل
                        </button>
                        <button onClick={() => deleteQuranPlan(plan.id)} className="flex-1 rounded-xl bg-rose-50 border border-rose-200/60 py-1.5 text-xs font-black text-rose-600 active:scale-95 dark:bg-rose-950/30 dark:border-rose-900/40 transition">
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 4 Quran Modes Grid */}
            <section className="grid grid-cols-2 gap-3">
              {MODES.map((mode) => {
                const bookmark = state.bookmarks?.[mode.id] || DEFAULT_STATE.bookmarks[mode.id];
                const modeTones: Record<string, string> = {
                  reading: 'from-emerald-600 to-teal-700 shadow-emerald-600/20 text-white',
                  new_hifz: 'from-violet-600 to-purple-700 shadow-violet-600/20 text-white',
                  near_review: 'from-amber-500 to-orange-600 shadow-amber-500/20 text-white',
                  far_review: 'from-sky-600 to-blue-700 shadow-sky-600/20 text-white'
                };
                const bgGradient = modeTones[mode.id] || 'from-emerald-600 to-teal-700 text-white';

                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(15);
                      openMode(mode.id);
                    }}
                    className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${bgGradient} p-4.5 text-right shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 border border-white/20 group`}
                  >
                    <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
                    
                    <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 shadow-inner">
                      {outlineContent(mode.icon)}
                    </div>
                    <h2 className="text-base font-black text-white">{mode.title}</h2>
                    <p className="mt-0.5 text-xs font-bold text-white/80">{mode.subtitle}</p>
                    <div className="mt-3 rounded-xl bg-black/20 backdrop-blur-sm px-2.5 py-1.5 text-[10px] font-black text-white/90 border border-white/10 flex items-center justify-between">
                      <span className="truncate">{getSurahName(bookmark.surah)}</span>
                      <span className="font-mono">آية {bookmark.ayah}</span>
                    </div>
                  </button>
                );
              })}
            </section>
          </div>
        )}

        {/* ======================= TAB 2: INDEX & SURAHS ======================= */}
        {activeTab === 'index' && (
          <section className="rounded-[2.2rem] border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-in fade-in duration-300">
            {/* Search Input */}
            <div className="relative mb-3.5">
              <Search className="absolute right-4 top-3.5 text-slate-400" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                placeholder="ابحث باسم السورة، رقمها، أو الحزب..."
                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50 py-3 pr-11 pl-4 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400 transition"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Surahs List */}
            <div className="grid gap-1.5">
              {filteredSurahs.map((surah) => {
                const meta = quranSurahs.find((item) => item.number === surah.number);
                const isMakiya = meta?.type === 'meccan';
                const pageNum = surah.firstPage || meta?.startPage || 1;

                return (
                  <button
                    key={surah.number}
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(10);
                      onNavigate('reader', { mode: 'casual', surah: surah.number, ayah: 1, page: pageNum });
                    }}
                    className="flex items-center justify-between rounded-2xl p-3 text-right transition-all duration-200 hover:bg-emerald-50/60 dark:hover:bg-slate-800/60 active:scale-[0.99] border border-transparent hover:border-emerald-200/60 dark:hover:border-emerald-800/40 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Ornate Surah Number Badge */}
                      <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-xs font-black font-mono text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 border border-slate-200/60 dark:border-slate-700 flex-shrink-0 group-hover:scale-105 transition-transform">
                        {surah.number}
                      </div>

                      <div className="min-w-0">
                        <span className="block font-black text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          سورة {surah.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-slate-400">
                            {surah.numberOfAyahs} {formatAyahCountLabel(surah.numberOfAyahs)}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            صفحة {pageNum}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/40">
                        {isMakiya ? 'مكية' : 'مدنية'}
                      </span>
                    </div>
                  </button>
                );
              })}

              {filteredSurahs.length === 0 && (
                <div className="py-12 text-center text-slate-400 font-bold text-xs">
                  لا توجد سور مطابقة لبحثك "{query}".
                </div>
              )}
            </div>
          </section>
        )}

        {/* ======================= TAB 3: BOOKMARKS & HIGHLIGHTS ======================= */}
        {activeTab === 'marks' && (
          <section className="rounded-[2.2rem] border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-in fade-in duration-300">
            {marks.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-14 h-14 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 grid place-items-center mx-auto shadow-inner">
                  <BookMarked size={28} />
                </div>
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">لا توجد علامات محفوظة بعد</h3>
                <p className="text-xs font-bold text-slate-400 max-w-xs mx-auto leading-relaxed">
                  أثناء قراءة أي صفحة في المصحف، اضغط على الآية أو رمز العلامة المرجعية لتثبيت موضع قراءتك هنا.
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {marks.map((mark) => (
                  <button
                    key={`${mark.type}-${mark.key}`}
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(10);
                      onNavigate('reader', { mode: 'casual', surah: mark.surah, ayah: mark.ayah, page: mark.page });
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/90 p-3.5 text-right transition-all hover:bg-emerald-50/60 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:bg-slate-800/60 group active:scale-[0.99]"
                  >
                    <div className="space-y-0.5">
                      <span className="block font-black text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {getSurahName(mark.surah)} {mark.ayah ? `· آية ${mark.ayah}` : `· صفحة ${mark.page}`}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {mark.type} · {mark.category || 'موضع قراءة'}
                      </span>
                    </div>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-sm flex-shrink-0">
                      <BookMarked size={16} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Khatma & Plan Editor Modal */}
      {showKhatmaPlanner && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in">
          <div className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-[2.3rem] bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">خطط الختمة والأوراد</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">حدد عدد الأيام واحسب وردك اليومي بدقة.</p>
              </div>
              <button
                onClick={() => { setShowKhatmaPlanner(false); resetPlanForm(); }}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-950">
              <button onClick={() => setPlanType('khatma')} className={`rounded-xl py-2.5 text-xs font-black transition ${planType === 'khatma' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'text-slate-500'}`}>ختمة كاملة</button>
              <button onClick={() => setPlanType('wird')} className={`rounded-xl py-2.5 text-xs font-black transition ${planType === 'wird' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'text-slate-500'}`}>ورد مخصص</button>
            </div>

            <label className="mb-1.5 block text-xs font-black text-slate-500">عنوان الخطة</label>
            <input
              value={activePlanTitle}
              onChange={(event) => updateActivePlanTitle(event.target.value)}
              className="mb-3.5 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs sm:text-sm font-bold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white transition"
              placeholder="مثال: ختمة رمضان المبارك / ورد الإتقان"
            />

            <label className="mb-1.5 block text-xs font-black text-slate-500">المدة المستهدفة (بالأيام)</label>
            <input
              type="number"
              min="1"
              value={activePlanDays}
              onChange={(event) => updateActivePlanDays(Number(event.target.value))}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black font-mono outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white transition"
            />

            <div className="my-5 rounded-2xl bg-emerald-50/90 border border-emerald-200/60 p-4 dark:bg-emerald-950/40 dark:border-emerald-800/40">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500 text-white shadow-md flex-shrink-0">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <p className="text-sm font-black text-emerald-900 dark:text-emerald-200 font-mono">{dailyPagesPreview} صفحة يومياً</p>
                  <p className="text-[11px] font-bold text-emerald-700/80 dark:text-emerald-300/70">بناءً على مصحف المدينة (604 صفحة).</p>
                </div>
              </div>
            </div>

            <button
              onClick={saveQuranPlan}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 font-black text-white shadow-lg shadow-emerald-600/30 hover:brightness-110 active:scale-95 transition"
            >
              {editingPlanId ? 'حفظ التعديلات' : 'بدء الخطة الآن'}
            </button>
          </div>
        </div>
      )}

      {showDownloadsManager && (
        <DownloadsManager onClose={() => setShowDownloadsManager(false)} />
      )}
    </div>
  );
}

function MetricCard({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.4rem] bg-white/10 p-3.5 backdrop-blur-md border border-white/15 shadow-inner">
      <div className="mb-1.5 flex items-center justify-between">
        {outlineContent(icon)}
        <Clock3 size={12} className="opacity-40 text-emerald-200" />
      </div>
      <p className="text-xl sm:text-2xl font-black font-mono leading-none tracking-tight text-white">{value}</p>
      <p className="text-[10px] font-bold text-emerald-100/70 mt-1">{label} · {hint}</p>
    </div>
  );
}
