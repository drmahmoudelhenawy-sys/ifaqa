import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, arrayUnion } from 'firebase/firestore';
import {
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  List,
  Copy,
  Check,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Volume2,
  Heart,
  MoonStar,
  Home,
  Droplets,
  UtensilsCrossed,
  HeartHandshake,
  MessageSquareQuote,
  Bell
} from 'lucide-react';
import { db } from '../services/firebase';
import { APP_ID, MORNING_ADHKAR, EVENING_ADHKAR, SITUATIONAL_CATEGORIES } from '../constants';
import { Zekr, SituationalCategory } from '../types';
import AIToast from './AIToast';
import { getSpiritualMessage } from '../services/ai';
import { hapticCompletion, hapticCounter, hapticSelection, hapticSuccess, hapticTap } from '../src/services/haptics';
import { backNavigationService } from '../src/services/backNavigationService';

interface AthkarViewProps {
  type: 'morning' | 'evening' | 'situational';
  user: User;
  dateStr: string;
  onBack: () => void;
  updateStats: (amount: number, label?: string, category?: any) => void;
}

interface ZekrCardProps {
  zekr: Zekr;
  count: number;
  isCompleted: boolean;
  cardIndex: number;
  totalCards: number;
  fontSizeClass: string;
  onTap: () => void;
  onCopy: () => void;
  isCopied: boolean;
}

const MosqueOutlineIcon: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Main Dome */}
    <path d="M12 3c-2.4 2-3.8 4.2-3.8 6.5h7.6c0-2.3-1.4-4.5-3.8-6.5z" />
    <path d="M12 2v1" />
    {/* Base Building */}
    <path d="M5.5 9.5h13v11.5h-13z" />
    {/* Arch Door */}
    <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
    {/* Left Minaret */}
    <path d="M3.5 12v9" />
    <path d="M2.5 12h2" />
    <path d="M3.5 9l.75-2 .75 2" />
    {/* Right Minaret */}
    <path d="M20.5 12v9" />
    <path d="M19.5 12h2" />
    <path d="M20.5 9l.75-2 .75 2" />
  </svg>
);

// Modern Outline Category Icon Mapper
const CategoryOutlineIcon: React.FC<{ categoryId: string }> = ({ categoryId }) => {
  const iconConfig: Record<string, { icon: React.ReactNode; tone: string; ring: string }> = {
    sleep: {
      icon: <MoonStar size={30} strokeWidth={1.8} />,
      tone: 'border-indigo-200/90 bg-indigo-50/80 text-indigo-600 dark:border-indigo-700/60 dark:bg-indigo-950/40 dark:text-indigo-400',
      ring: 'shadow-indigo-500/10'
    },
    home: {
      icon: <Home size={30} strokeWidth={1.8} />,
      tone: 'border-amber-200/90 bg-amber-50/80 text-amber-600 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-400',
      ring: 'shadow-amber-500/10'
    },
    mosque: {
      icon: <MosqueOutlineIcon size={30} />,
      tone: 'border-emerald-200/90 bg-emerald-50/80 text-emerald-600 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-400',
      ring: 'shadow-emerald-500/10'
    },
    wudu_restroom: {
      icon: <Droplets size={30} strokeWidth={1.8} />,
      tone: 'border-cyan-200/90 bg-cyan-50/80 text-cyan-600 dark:border-cyan-700/60 dark:bg-cyan-950/40 dark:text-cyan-400',
      ring: 'shadow-cyan-500/10'
    },
    food: {
      icon: <UtensilsCrossed size={30} strokeWidth={1.8} />,
      tone: 'border-orange-200/90 bg-orange-50/80 text-orange-600 dark:border-orange-700/60 dark:bg-orange-950/40 dark:text-orange-400',
      ring: 'shadow-orange-500/10'
    },
    distress: {
      icon: <HeartHandshake size={30} strokeWidth={1.8} />,
      tone: 'border-rose-200/90 bg-rose-50/80 text-rose-600 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-400',
      ring: 'shadow-rose-500/10'
    },
    misc: {
      icon: <MessageSquareQuote size={30} strokeWidth={1.8} />,
      tone: 'border-purple-200/90 bg-purple-50/80 text-purple-600 dark:border-purple-700/60 dark:bg-purple-950/40 dark:text-purple-400',
      ring: 'shadow-purple-500/10'
    }
  };

  const item = iconConfig[categoryId] || {
    icon: <Sparkles size={30} strokeWidth={1.8} />,
    tone: 'border-violet-200/90 bg-violet-50/80 text-violet-600 dark:border-violet-700/60 dark:bg-violet-950/40 dark:text-violet-400',
    ring: 'shadow-violet-500/10'
  };

  return (
    <div className={`w-16 h-16 rounded-[1.6rem] border-2 flex items-center justify-center transition-all duration-300 shadow-md group-hover:scale-110 group-hover:shadow-lg ${item.tone} ${item.ring}`}>
      {outlineContent(item.icon)}
    </div>
  );
};

const ZekrCard: React.FC<ZekrCardProps> = ({
  zekr,
  count,
  isCompleted,
  cardIndex,
  totalCards,
  fontSizeClass,
  onTap,
  onCopy,
  isCopied
}) => {
  const currentCount = Math.min(count, zekr.count);
  const progressPercent = Math.min(100, Math.round((currentCount / zekr.count) * 100));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div
      onClick={onTap}
      className={`group relative w-full select-none cursor-pointer overflow-hidden rounded-[2.5rem] border text-right transition-all duration-300 active:scale-[0.985] shadow-xl ${
        isCompleted
          ? 'bg-gradient-to-br from-emerald-50/90 via-teal-50/70 to-emerald-100/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-emerald-900/20 border-emerald-400/50 shadow-emerald-500/10'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-slate-200/60 dark:shadow-none hover:border-violet-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top linear progress indicator */}
      {!isCompleted && (
        <div className="absolute inset-x-0 top-0 h-1.5 bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Decorative background glow */}
      <div className={`absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-opacity ${
        isCompleted ? 'bg-emerald-500/15 opacity-100' : 'bg-violet-500/5 opacity-50 group-hover:opacity-100'
      }`} />

      <div className="p-5 sm:p-7 relative z-10 flex flex-col justify-between min-h-[380px] overflow-hidden">
        {/* Card Header Info */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700">
              <span>الذكر</span>
              <strong className="font-mono text-violet-600 dark:text-violet-400">{cardIndex + 1}</strong>
              <span className="opacity-50">/</span>
              <span className="font-mono">{totalCards}</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black bg-amber-100/80 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/40">
              <Sparkles size={11} className="text-amber-500" />
              <span>+{zekr.xp} XP</span>
            </span>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onCopy}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition active:scale-90"
              title="نسخ الذكر"
              aria-label="نسخ الذكر"
            >
              {isCopied ? <Check size={16} className="text-emerald-500 stroke-[3]" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Dhikr Body Text */}
        <div className="my-auto py-2 px-1">
          <p
            className={`font-bold transition-all duration-200 select-text ${fontSizeClass} ${
              isCompleted
                ? 'text-emerald-950 dark:text-emerald-100 font-semibold'
                : 'text-slate-800 dark:text-white'
            }`}
            style={{
              textAlign: 'center',
              lineHeight: 2.25,
              fontFamily: '"Amiri", "Cairo", system-ui, sans-serif',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            {zekr.text}
          </p>

          {/* Dhikr Fadl / Virtue Box */}
          {zekr.fadl && (
            <div
              className="mt-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 px-4 py-3 text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed select-text"
              style={{
                textAlign: 'justify',
                textJustify: 'inter-word',
                textAlignLast: 'right',
                lineHeight: 1.8,
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              <span className="text-violet-600 dark:text-violet-400 font-black ml-1">الفضل:</span>
              {zekr.fadl}
            </div>
          )}
        </div>

        {/* Card Footer Counter & Instruction */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <div className="text-right min-w-0 flex-1">
            <span className="text-xs font-black text-slate-400 block mb-0.5 truncate">
              {isCompleted ? 'تم بحمد الله' : 'اضغط على البطاقة للتسبيح'}
            </span>
            <span className="text-[10px] font-bold text-slate-400/80 block truncate">
              {isCompleted ? 'انتقل إلى الذكر التالي' : `المتبقي: ${Math.max(0, zekr.count - currentCount)} مرة`}
            </span>
          </div>

          {/* Circular SVG Counter Badge */}
          <div className="relative flex items-center justify-center flex-shrink-0">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r={radius}
                className="text-slate-100 dark:text-slate-800"
                strokeWidth="5"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                className={`transition-all duration-300 ${
                  isCompleted ? 'text-emerald-500' : 'text-violet-600'
                }`}
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {isCompleted ? (
                <CheckCircle2 size={24} className="text-emerald-500 animate-in zoom-in spin-in-12" />
              ) : (
                <>
                  <span className="text-base font-black font-mono leading-none text-slate-800 dark:text-white">
                    {currentCount}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 font-mono">
                    /{zekr.count}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AthkarView: React.FC<AthkarViewProps> = ({ type, user, dateStr, onBack, updateStats }) => {
  const [completed, setCompleted] = useState<string[]>([]);
  const [tapCounts, setTapCounts] = useState<Record<string, number>>({});
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<SituationalCategory | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [fontSizeIndex, setFontSizeIndex] = useState<number>(1); // 0: sm, 1: md, 2: lg, 3: xl
  const [copiedZekrId, setCopiedZekrId] = useState<string | null>(null);

  // Touch Swipe Refs and State
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);

  const fontSizes = [
    'text-base sm:text-lg',
    'text-lg sm:text-xl',
    'text-xl sm:text-2xl',
    'text-2xl sm:text-3xl'
  ];

  const list = useMemo(() => {
    if (type === 'morning') return MORNING_ADHKAR || [];
    if (type === 'evening') return EVENING_ADHKAR || [];
    return activeCategory ? (activeCategory.adhkar || []) : [];
  }, [activeCategory, type]);

  const storageKey = type === 'situational' ? (activeCategory ? `situational_${activeCategory.id}` : null) : type;

  const localCompletedKey = storageKey && user?.uid ? `ifaqa_athkar_${user.uid}_${dateStr}_${storageKey}` : null;

  // Synchronous guard against rapid taps and duplicate XP awarding
  const completedSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    completedSetRef.current = new Set(completed);
  }, [completed]);

  useEffect(() => {
    if (!storageKey || !localCompletedKey || !user?.uid) return;

    // 1. Immediately load from local storage
    try {
      const stored = localStorage.getItem(localCompletedKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          completedSetRef.current = new Set(parsed);
          setCompleted(parsed);
        }
      }
    } catch {}

    // 2. Listen to Firestore and merge
    const unsub = onSnapshot(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'daily', dateStr), (snapshot) => {
      let localItems: string[] = [];
      try {
        const stored = localStorage.getItem(localCompletedKey);
        if (stored) localItems = JSON.parse(stored) || [];
      } catch {}

      const remoteItems: string[] = snapshot.exists() ? (snapshot.data()[storageKey] || []) : [];
      const merged = Array.from(new Set([...localItems, ...remoteItems]));
      completedSetRef.current = new Set(merged);
      setCompleted(merged);
      try {
        localStorage.setItem(localCompletedKey, JSON.stringify(merged));
      } catch {}
    });

    return () => unsub();
  }, [dateStr, storageKey, user?.uid, localCompletedKey]);

  useEffect(() => {
    setCurrentIndex(0);
    setTapCounts({});
  }, [storageKey]);

  useEffect(() => {
    if (activeCategory) {
      return backNavigationService.register('athkar_situational_active_category', 85, () => {
        setActiveCategory(null);
      });
    } else {
      return backNavigationService.register('athkar_main_view', 80, () => {
        onBack();
      });
    }
  }, [activeCategory, onBack]);

  const handleCopy = (zekr: Zekr) => {
    const textToCopy = `${zekr.text}\n\n${zekr.fadl ? 'الفضل: ' + zekr.fadl + '\n\n' : ''}- من تطبيق إفاقة`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedZekrId(zekr.id);
    hapticTap();
    setTimeout(() => setCopiedZekrId(null), 2000);
  };

  const handleComplete = async (zekr: Zekr) => {
    if (!storageKey) return;
    if (completed.includes(zekr.id) && !completedSetRef.current.has(zekr.id)) return;
    
    // Lock immediately
    completedSetRef.current.add(zekr.id);

    hapticCompletion();

    // Immediately update local state & local storage
    const newCompleted = Array.from(new Set([...completed, zekr.id]));
    setCompleted(newCompleted);
    if (localCompletedKey) {
      try {
        localStorage.setItem(localCompletedKey, JSON.stringify(newCompleted));
      } catch {}
    }

    // Update stats / XP (Single call)
    const athkarLabel = type === 'morning' ? 'أذكار الصباح' : type === 'evening' ? 'أذكار المساء' : 'أذكار وأدعية';
    updateStats(zekr.xp, `${athkarLabel} (${zekr.text ? zekr.text.slice(0, 20) + '...' : 'ذكر'})`, 'athkar');

    // Save to Firestore (works offline & syncs when online)
    if (user?.uid) {
      try {
        await setDoc(
          doc(db, 'artifacts', APP_ID, 'users', user.uid, 'daily', dateStr),
          { [storageKey]: arrayUnion(zekr.id) },
          { merge: true }
        );
      } catch (e) {
        console.warn('Daily athkar sync queued:', e);
      }
    }

    if (completed.length + 1 === list.length || (completed.length + 1) % 5 === 0) {
      try {
        const actionName =
          type === 'morning'
            ? 'أذكار الصباح'
            : type === 'evening'
            ? 'أذكار المساء'
            : activeCategory?.title || 'أدعية وأذكار الأحوال';
        const msg = await getSpiritualMessage(actionName, user.displayName || 'يا عبد الله');
        setAiMessage(msg);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleTap = (zekr: Zekr) => {
    if (completedSetRef.current.has(zekr.id) || completed.includes(zekr.id)) return;

    const currentCount = tapCounts[zekr.id] || 0;
    const newCount = currentCount + 1;

    setTapCounts((prev) => ({ ...prev, [zekr.id]: newCount }));

    if (newCount >= zekr.count) {
      // Completed target count: trigger strong & extended haptic vibration
      hapticCompletion();
      completedSetRef.current.add(zekr.id);
      void handleComplete(zekr);

      // Auto-advance to next card with a smooth delay
      if (viewMode === 'card' && currentIndex < list.length - 1) {
        setTimeout(() => {
          setCurrentIndex((prev) => Math.min(prev + 1, list.length - 1));
        }, 320);
      }
    } else {
      // Normal intermediate tap
      hapticCounter();
    }
  };

  // Touch Swipe Handlers (Swipe Left = Next, Swipe Right = Prev in Arabic UX)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartXRef.current;
    const deltaY = currentY - touchStartYRef.current;

    // Only apply horizontal swipe if horizontal movement exceeds vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && Math.abs(swipeOffset) > 60) {
      if (swipeOffset < -60) {
        // Swiped Left -> Next Card
        if (currentIndex < list.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          hapticSelection();
        }
      } else if (swipeOffset > 60) {
        // Swiped Right -> Previous Card
        if (currentIndex > 0) {
          setCurrentIndex((prev) => prev - 1);
          hapticSelection();
        }
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  const handleBack = () => {
    if (type === 'situational' && activeCategory) {
      setActiveCategory(null);
      setCompleted([]);
      setTapCounts({});
      setCurrentIndex(0);
      return;
    }
    onBack();
  };

  const completedCount = completed.length;
  const progressPercent = list.length > 0 ? Math.round((completedCount / list.length) * 100) : 0;
  const currentZekr = list[currentIndex];
  const currentCount = currentZekr ? tapCounts[currentZekr.id] || 0 : 0;

  const title =
    type === 'morning'
      ? 'أذكار الصباح'
      : type === 'evening'
      ? 'أذكار المساء'
      : activeCategory?.title || 'أدعية وأذكار الأحوال';

  // Situational Categories Grid
  if (type === 'situational' && !activeCategory) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300 overflow-hidden animate-in fade-in duration-300">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-4 pb-3 pt-[max(env(safe-area-inset-top,0px),12px)] flex items-center justify-between z-30 shadow-sm">
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 text-slate-700 dark:text-slate-300"
            aria-label="رجوع"
          >
            <ChevronRight size={22} />
          </button>

          <div className="text-center">
            <h2 className="font-black text-lg text-slate-800 dark:text-white">الأدعية والأذكار</h2>
            <p className="text-[10px] text-slate-400 font-bold">مقسمة حسب المواقف والأحوال اليومية</p>
          </div>

          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-4 pb-12">
          <div className="rounded-[2.2rem] bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 shadow-xl shadow-emerald-600/20 border border-white/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/assets/patterns/cubes.png')] opacity-15 mix-blend-overlay" />
            <h3 className="text-xl font-black mb-1.5 drop-shadow-md">أدعية المسلم اليومية</h3>
            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed font-bold">
              اختر القسم المناسب لك، وتصفح الأذكار والأدعية بكروت تفاعلية ذكية أو كقائمة مستمرة.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3.5 pt-2">
            {SITUATIONAL_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  hapticSelection();
                  setActiveCategory(category);
                }}
                className="bg-white dark:bg-slate-900 p-5 rounded-[2.2rem] border border-slate-200/80 dark:border-slate-800 flex flex-col items-center gap-3.5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 group text-center"
              >
                <CategoryOutlineIcon categoryId={category.id} />
                <span className="font-black text-slate-800 dark:text-slate-100 text-sm leading-snug">
                  {category.title}
                </span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400 px-3 py-1 rounded-full font-black font-mono border border-slate-200/50 dark:border-slate-700/50">
                  {category.adhkar.length} أذكار
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300 overflow-hidden animate-in fade-in duration-300">
      {aiMessage && <AIToast message={aiMessage} onClose={() => setAiMessage(null)} />}

      {/* Sticky App Header with Controls & Safe Area Top */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-4 pb-3 pt-[max(env(safe-area-inset-top,0px),12px)] flex items-center justify-between gap-2 z-30 shadow-sm">
        <button
          onClick={handleBack}
          className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 text-slate-700 dark:text-slate-300 flex-shrink-0"
          aria-label="رجوع"
        >
          <ChevronRight size={22} />
        </button>

        <div className="text-center min-w-0 flex-1">
          <h2 className="font-black text-base sm:text-lg text-slate-800 dark:text-white truncate">{title}</h2>
          <p className="text-[10px] text-slate-400 font-bold">
            {viewMode === 'card' ? 'اسحب يميناً ويساراً للتقليب' : 'قراءة متواصلة للقائمة'}
          </p>
        </div>

        {/* View Mode & Font Size Switchers */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Font scale buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/60 dark:border-slate-700">
            <button
              onClick={() => setFontSizeIndex((prev) => Math.max(0, prev - 1))}
              disabled={fontSizeIndex === 0}
              className="px-2 py-1 text-xs font-black text-slate-600 dark:text-slate-300 disabled:opacity-30 active:scale-90"
              title="تصغير الخط"
            >
              A-
            </button>
            <button
              onClick={() => setFontSizeIndex((prev) => Math.min(fontSizes.length - 1, prev + 1))}
              disabled={fontSizeIndex === fontSizes.length - 1}
              className="px-2 py-1 text-xs font-black text-slate-600 dark:text-slate-300 disabled:opacity-30 active:scale-90"
              title="تكبير الخط"
            >
              A+
            </button>
          </div>

          {/* Mode Switcher Button */}
          <button
            onClick={() => {
              hapticSelection();
              setViewMode((prev) => (prev === 'card' ? 'list' : 'card'));
            }}
            className={`p-2 rounded-xl transition-all active:scale-90 ${
              viewMode === 'card'
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
            title={viewMode === 'card' ? 'التحويل لنمط القائمة' : 'التحويل لنمط الكروت'}
            aria-label="تبديل نمط العرض"
          >
            {viewMode === 'card' ? <Layers size={18} /> : <List size={18} />}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto w-full flex-1 flex flex-col overflow-y-auto overflow-x-hidden pb-16">
        {/* Progress Dashboard */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-3 text-right gap-3">
            <div className="text-right">
              <div className="text-base font-black text-slate-800 dark:text-slate-100 font-mono">
                {completedCount} <span className="text-xs text-slate-400 font-sans">من</span> {list.length}
              </div>
              <div className="text-[11px] font-bold text-slate-400">أذكار مكتملة</div>
            </div>
            <div className="text-left">
              <div className="text-base font-black text-violet-600 dark:text-violet-400 font-mono">
                {progressPercent}%
              </div>
              <div className="text-[11px] font-bold text-slate-400 font-sans">نسبة الإنجاز</div>
            </div>
          </div>

          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5 shadow-inner mt-1">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 rounded-full transition-all duration-500 ifaqa-shimmer"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Lock Screen & Daily Reminder Interactive Banner */}
        {(type === 'morning' || type === 'evening') && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900/40 to-purple-500/10 border border-amber-500/20 text-slate-800 dark:text-white shadow-sm gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-500 dark:text-amber-400 shrink-0">
                <Bell size={16} />
              </span>
              <div className="text-right min-w-0 flex-1">
                <div className="text-xs font-black truncate">تذكير شاشة القفل واليوم</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate">
                  {type === 'morning' ? 'منبه تلقائي بعد الفجر مع خيارات التأجيل' : 'منبه تلقائي بعد العصر مع خيارات التأجيل'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('ifaqa_open_athkar_reminder', { detail: { type } }));
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 active:scale-95 transition shadow-sm shrink-0"
              title="تجربة شاشة التذكير كاملة"
            >
              <Sparkles size={13} />
              <span>تجربة التذكير</span>
            </button>
          </div>
        )}

        {/* ===================== VIEW MODE 1: SINGLE CARD SWIPE ===================== */}
        {viewMode === 'card' && currentZekr && (
          <div className="flex-1 flex flex-col justify-between space-y-4">
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                transform: isSwiping ? `translateX(${swipeOffset}px)` : 'none',
                transition: isSwiping ? 'none' : 'transform 0.25s ease-out'
              }}
              className="w-full flex-1 flex items-center"
            >
              <ZekrCard
                zekr={currentZekr}
                count={currentCount}
                isCompleted={completed.includes(currentZekr.id)}
                cardIndex={currentIndex}
                totalCards={list.length}
                fontSizeClass={fontSizes[fontSizeIndex]}
                onTap={() => handleTap(currentZekr)}
                onCopy={() => handleCopy(currentZekr)}
                isCopied={copiedZekrId === currentZekr.id}
              />
            </div>

            {/* Bottom Quick Navigation & Thumb Controls */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setCurrentIndex((prev) => Math.max(prev - 1, 0));
                    hapticSelection();
                  }}
                  disabled={currentIndex === 0}
                  className={`flex-1 rounded-[1.4rem] py-3.5 px-4 font-black text-xs border transition-all flex items-center justify-center gap-2 ${
                    currentIndex === 0
                      ? 'opacity-35 bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                      : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800 shadow-sm active:scale-95 hover:bg-slate-50'
                  }`}
                >
                  <ChevronRight size={18} />
                  <span>السابق</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentIndex((prev) => Math.min(prev + 1, list.length - 1));
                    hapticSelection();
                  }}
                  disabled={currentIndex === list.length - 1}
                  className={`flex-1 rounded-[1.4rem] py-3.5 px-4 font-black text-xs border transition-all flex items-center justify-center gap-2 ${
                    currentIndex === list.length - 1
                      ? 'opacity-35 bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                      : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-lg shadow-violet-600/25 active:scale-95'
                  }`}
                >
                  <span>التالي</span>
                  <ChevronLeft size={18} />
                </button>
              </div>

              {/* Dot Indicators for fast jumping */}
              <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-2 px-1 max-w-full">
                {list.map((z, idx) => {
                  const isDone = completed.includes(z.id);
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={z.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        hapticSelection();
                      }}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isCurrent
                          ? 'w-6 bg-violet-600'
                          : isDone
                          ? 'w-2 bg-emerald-500'
                          : 'w-2 bg-slate-200 dark:bg-slate-800'
                      }`}
                      aria-label={`انتقال للذكر ${idx + 1}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================== VIEW MODE 2: CONTINUOUS LIST ===================== */}
        {viewMode === 'list' && (
          <div className="space-y-4 pt-1">
            {list.map((zekr, idx) => {
              const count = tapCounts[zekr.id] || 0;
              const isDone = completed.includes(zekr.id);
              return (
                <ZekrCard
                  key={zekr.id}
                  zekr={zekr}
                  count={count}
                  isCompleted={isDone}
                  cardIndex={idx}
                  totalCards={list.length}
                  fontSizeClass={fontSizes[fontSizeIndex]}
                  onTap={() => handleTap(zekr)}
                  onCopy={() => handleCopy(zekr)}
                  isCopied={copiedZekrId === zekr.id}
                />
              );
            })}
          </div>
        )}

        {list.length === 0 && (
          <div className="rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 text-center text-slate-500 font-bold">
            لا توجد أذكار متاحة في هذا القسم حالياً.
          </div>
        )}
      </div>
    </div>
  );
};

export default AthkarView;
