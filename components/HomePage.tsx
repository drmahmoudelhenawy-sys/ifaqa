import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';

import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, increment, updateDoc } from 'firebase/firestore';
import { ChevronRight, ChevronLeft, Sun, Moon, Star, TrendingUp, Bell, CircleDot, Heart, Utensils, Sunrise, Trophy, Sparkles, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../services/firebase';
import { APP_ID, XP_RULES } from '../constants';
import { Prayer, UserData } from '../types';
import PrayerCard from './PrayerCard';
import AthkarView from './AthkarView';
import AIToast from './AIToast';
import { getSpiritualMessage } from '../services/ai';
import DynamicContent from './DynamicContent';
import { fetchAndSchedulePrayers } from '../src/services/prayerTimes';
import { getProphetChallengeSchedule } from '../src/services/prophetChallengeSchedule';

interface HomePageProps {
  user: User;
  userData: UserData;
  updateStats: (amount: number, label?: string, category?: any) => void;
  onOpenProphetChallenge: () => void;
  onOpenMasbaha: () => void;
  onOpenLeaderboard: () => void;
  onOpenAthkar?: (type: 'morning' | 'evening' | 'situational') => void;
}

const HomePage: React.FC<HomePageProps> = ({ 
  user, 
  userData, 
  updateStats, 
  onOpenProphetChallenge, 
  onOpenMasbaha, 
  onOpenLeaderboard,
  onOpenAthkar 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [extras, setExtras] = useState<{qiyam?: boolean}>({});
  const [fastingReminder, setFastingReminder] = useState<{title: string, text: string} | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [nextFastingEvent, setNextFastingEvent] = useState<{ name: string; time: string; timeLeft: string } | null>(null);
  const [prophetSchedule, setProphetSchedule] = useState(() => getProphetChallengeSchedule());

  useEffect(() => {
    const timer = setInterval(() => {
      setProphetSchedule(getProphetChallengeSchedule());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Fasting Mode State
  const [timings, setTimings] = useState<any>(null);

  const getLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dateStr = getLocalDate(currentDate);
  const isToday = dateStr === getLocalDate(new Date());
  const isFriday = currentDate.getDay() === 5;
  const isLite = userData.appMode === 'lite';
  const isFastingMode = userData.fastingMode;
  
  const PRAYER_CONFIG: Omit<Prayer, 'status' | 'sunanPreDone' | 'sunanPostDone'>[] = useMemo(() => [
      { id: 'fajr', name: 'الفجر', isFajr: true, fadl: 'في ذمة الله', sunanConfig: { hasPre: true, hasPost: false, preCount: 2 } },
      isFriday ? {
        id: 'dhuhr',
        name: 'الجمعة',
        fadl: 'خير يوم طلعت فيه الشمس',
        sunanConfig: { hasPre: false, hasPost: true, postCount: 4 },
        hadith: 'إذا صلَّى أحدُكم الجُمُعةَ فلْيُصَلِّ بعدَها أربعًا'
      } : {
        id: 'dhuhr',
        name: 'الظهر',
        fadl: 'وقت تفتح فيه أبواب السماء',
        sunanConfig: { hasPre: true, hasPost: true, preCount: 4, postCount: 2 }
      },
      {
          id: 'asr', 
          name: 'العصر', 
          fadl: 'من تركها حبط عمله', 
          sunanConfig: { hasPre: true, hasPost: false, preCount: 4 }, 
          hadith: "رحم الله امرأً صلى قبل العصر أربعاً" 
      }, 
      { id: 'maghrib', name: 'المغرب', fadl: 'وتر النهار', sunanConfig: { hasPre: false, hasPost: true, postCount: 2 } },
      { id: 'isha', name: 'العشاء', fadl: 'أثقل الصلاة على المنافقين', sunanConfig: { hasPre: false, hasPost: true, postCount: 2 } }
  ], [isFriday]);

  const localDailyKey = `ifaqa_daily_${user.uid}_${dateStr}`;

  useEffect(() => {
    // 0. Load initial local daily cache
    try {
      const stored = localStorage.getItem(localDailyKey);
      if (stored) {
        const localData = JSON.parse(stored);
        if (localData && typeof localData === 'object') {
          setPrayers(PRAYER_CONFIG.map(p => ({
            ...p,
            status: localData[p.id] || 'none',
            sunanPreDone: localData[`${p.id}_sunan_pre`] || false,
            sunanPostDone: localData[`${p.id}_sunan_post`] || false
          })));
          setExtras({ qiyam: localData.qiyam || false });
        }
      }
    } catch {}

    // 1. Prayer Status Sync
    const unsub = onSnapshot(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'daily', dateStr), (docSnap) => {
      let localData: Record<string, any> = {};
      try {
        const stored = localStorage.getItem(localDailyKey);
        if (stored) localData = JSON.parse(stored) || {};
      } catch {}

      const remoteData = docSnap.exists() ? docSnap.data() : {};
      const mergedData = { ...localData, ...remoteData };
      
      try {
        localStorage.setItem(localDailyKey, JSON.stringify(mergedData));
      } catch {}

      setPrayers(PRAYER_CONFIG.map(p => ({ 
          ...p, 
          status: mergedData[p.id] || 'none',
          sunanPreDone: mergedData[`${p.id}_sunan_pre`] || false,
          sunanPostDone: mergedData[`${p.id}_sunan_post`] || false
      })));
      setExtras({ qiyam: mergedData.qiyam || false });
    });

    // 2. Fetch Timings if Fasting Mode is ON
    if (isFastingMode && isToday) {
        const fetchTimings = async () => {
            const cached = localStorage.getItem(`timings_${dateStr}`);
            if (cached) {
                setTimings(JSON.parse(cached));
            } else if (navigator.onLine) {
                try {
                    const nextTimings = await fetchAndSchedulePrayers();
                    if (nextTimings) {
                        setTimings(nextTimings);
                        localStorage.setItem(`timings_${dateStr}`, JSON.stringify(nextTimings));
                    }
                } catch (e) { 
                    console.error("Timings fetch error", e); 
                }
            }
        };
        fetchTimings();
    }

    // 3. Fasting Reminders (Voluntary)
    const tomorrow = new Date();
    tomorrow.setDate(new Date().getDate() + 1);
    const dayOfWeek = tomorrow.getDay();
    if (!isFastingMode) { // Only show voluntary reminders if fasting mode is off or distinct
        if (dayOfWeek === 1) setFastingReminder({ title: "صيام الإثنين غداً", text: "تُعرض الأعمال على الله." });
        else if (dayOfWeek === 4) setFastingReminder({ title: "صيام الخميس غداً", text: "سنة عن الحبيب ﷺ." });
        else {
            const today = new Date().getDay();
            if (today === 1 || today === 4) setFastingReminder({ title: "اليوم يوم صيام", text: "تقبل الله طاعتك." });
            else setFastingReminder(null);
        }
    } else {
        setFastingReminder(null); // Fasting mode widget takes precedence
    }

    return () => unsub();
  }, [dateStr, user.uid, isFastingMode]);

  useEffect(() => {
    const autoOpen = localStorage.getItem('ifaqa_auto_open_athkar');
    if (autoOpen) {
        if (autoOpen === 'morning' || autoOpen === 'evening' || autoOpen === 'situational') {
            if (onOpenAthkar) onOpenAthkar(autoOpen as any);
        }
        localStorage.removeItem('ifaqa_auto_open_athkar');
    }
  }, [onOpenAthkar]);

  // Fasting Countdown Timer
  useEffect(() => {
      if (!isFastingMode || !timings) return;
      
      const interval = setInterval(() => {
          const now = new Date();
          const fajrTime = new Date();
          const [fHours, fMinutes] = timings.Fajr.split(':');
          fajrTime.setHours(parseInt(fHours), parseInt(fMinutes), 0);

          const maghribTime = new Date();
          const [mHours, mMinutes] = timings.Maghrib.split(':');
          maghribTime.setHours(parseInt(mHours), parseInt(mMinutes), 0);

          let targetName = '';
          let targetTime = null;

          // Before Fajr -> Imsak
          if (now < fajrTime) {
              targetName = 'الإمساك (الفجر)';
              targetTime = fajrTime;
          } 
          // Between Fajr and Maghrib -> Iftar
          else if (now >= fajrTime && now < maghribTime) {
              targetName = 'الإفطار (المغرب)';
              targetTime = maghribTime;
          } 
          // After Maghrib -> Next Fajr (Simple handling for same day, real handling needs next day date)
          else {
              targetName = 'الإمساك (غداً)';
              targetTime = new Date(fajrTime);
              targetTime.setDate(targetTime.getDate() + 1);
          }

          if (targetTime) {
              const diff = targetTime.getTime() - now.getTime();
              const hours = Math.floor(diff / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((diff % (1000 * 60)) / 1000);
              setNextFastingEvent({
                  name: targetName,
                  time: targetTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                  timeLeft: `${hours}س ${minutes}د ${seconds}ث`
              });
          }
      }, 1000);

      return () => clearInterval(interval);
  }, [timings, isFastingMode]);

  const handlePrayer = async (prayer: Prayer, newStatus: Prayer['status']) => {
      if (prayer.status === newStatus) return;
      
      if (!isLite && newStatus === 'jamaah') {
         confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#8b5cf6', '#10b981', '#f59e0b'],
            disableForReducedMotion: true
         });
      } else if (newStatus === 'ontime') {
         if(navigator.vibrate) navigator.vibrate(50);
      }

      if ((newStatus === 'jamaah' || newStatus === 'ontime') && Math.random() > 0.3) {
          try {
             const msg = await getSpiritualMessage(`صلاة ${prayer.name}`, user.displayName || 'يا عبد الله');
             setAiMessage(msg);
          } catch(e) { console.error(e); }
      }

      const getPoints = (status: string, isFajr?: boolean) => {
          if (status === 'jamaah') return isFajr ? XP_RULES.FAJR_JAMAAH : XP_RULES.JAMA_AH;
          if (status === 'ontime') return isFajr ? XP_RULES.FAJR_ONTIME : XP_RULES.ON_TIME;
          if (status === 'late') return XP_RULES.LATE;
          if (status === 'qada') return XP_RULES.QADA;
          return 0;
      };
      
      const diff = getPoints(newStatus, prayer.isFajr) - getPoints(prayer.status, prayer.isFajr);
      
      // 1. Update local daily state cache immediately
      try {
        const stored = localStorage.getItem(localDailyKey);
        const currentData = stored ? JSON.parse(stored) : {};
        currentData[prayer.id] = newStatus;
        localStorage.setItem(localDailyKey, JSON.stringify(currentData));
      } catch {}

      // 2. CRITICAL: Immediately update stats & offline XP queue synchronously
      if (diff !== 0) {
        const statusLabel = newStatus === 'jamaah' ? 'جماعة المسجد' : newStatus === 'ontime' ? 'في وقتها' : newStatus === 'late' ? 'بعد وقتها' : 'قضاء';
        updateStats(diff, `صلاة ${prayer.name} (${statusLabel})`, 'salat');
      }

      // 3. Fire-and-forget background Firestore writes
      void setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'daily', dateStr), { [prayer.id]: newStatus }, { merge: true }).catch((e) => console.warn('Prayer daily sync queued:', e));
      
      const statsUpdate: any = { 'stats.totalPrayers': increment(1) };
      if (newStatus === 'jamaah') statsUpdate['stats.jamaahCount'] = increment(1);
      if (prayer.isFajr && newStatus === 'jamaah') statsUpdate['stats.fajrStreak'] = increment(1); 
      void updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile'), statsUpdate).catch((e) => console.warn('Prayer stats sync queued:', e));
  };

  const handleSunnah = async (prayerId: string, type: 'pre' | 'post', current: boolean) => {
     const field = `${prayerId}_sunan_${type}`;
     const newState = !current;
     const prayer = prayers.find(p => p.id === prayerId);
     const count = type === 'pre' ? (prayer?.sunanConfig.preCount || 0) : (prayer?.sunanConfig.postCount || 0);
     
     const xpPerUnit = (prayerId === 'asr' && type === 'pre') ? XP_RULES.SUNNAH_ASR : XP_RULES.SUNNAH_RAKAH;
     const xpAmount = count * xpPerUnit;
     
     const diff = newState ? xpAmount : -xpAmount;

     try {
       const stored = localStorage.getItem(localDailyKey);
       const currentData = stored ? JSON.parse(stored) : {};
       currentData[field] = newState;
       localStorage.setItem(localDailyKey, JSON.stringify(currentData));
     } catch {}

     // Immediately update stats & XP
     if (diff !== 0) {
       updateStats(diff, `سنة صلاة ${prayer?.name || ''} (${type === 'pre' ? 'قبلية' : 'بعدية'})`, 'salat');
     }
     if (newState && navigator.vibrate) navigator.vibrate(30);

     void setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'daily', dateStr), { [field]: newState }, { merge: true }).catch((e) => console.warn('Sunnah sync queued:', e));
  };

  const handleExtra = async (type: 'qiyam') => {
      const isDone = !extras[type];
      const points = XP_RULES.QIYAM;
      const diff = isDone ? points : -points;

      try {
        const stored = localStorage.getItem(localDailyKey);
        const currentData = stored ? JSON.parse(stored) : {};
        currentData[type] = isDone;
        localStorage.setItem(localDailyKey, JSON.stringify(currentData));
      } catch {}

      // Immediately update stats & XP
      if (diff !== 0) {
        updateStats(diff, 'صلاة قيام الليل', 'salat');
      }
      if (isDone && navigator.vibrate) navigator.vibrate(50);

      void setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'daily', dateStr), { [type]: isDone }, { merge: true }).catch((e) => console.warn('Qiyam sync queued:', e));
  };

  const completedPrayersCount = prayers.filter(p => p.status !== 'none').length;
  const progressPercent = (completedPrayersCount / 5) * 100;

  return (
    <div className="ifaqa-home-page pb-24 pt-1 space-y-5">
        {aiMessage && <AIToast message={aiMessage} onClose={() => setAiMessage(null)} />}
        
        {/* Dynamic Content Widget */}
        <DynamicContent />

        {/* --- Fasting Mode Widget --- */}
        {isFastingMode && (
            <div className={`p-5 rounded-[2.2rem] text-white shadow-2xl relative overflow-hidden transition-all duration-1000 border border-white/20 ${nextFastingEvent?.name.includes('الإفطار') ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 shadow-orange-500/25' : 'bg-gradient-to-br from-indigo-950 via-violet-900 to-slate-900 shadow-indigo-900/30'}`}>
                <div className="absolute inset-0 bg-[url('/assets/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div className="text-right">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                              {nextFastingEvent?.name.includes('الإفطار') ? <Utensils size={18} className="text-yellow-300"/> : <Moon size={18} className="text-blue-200"/>}
                            </span>
                            <h3 className="font-black text-lg">{nextFastingEvent?.name || 'وضع الصيام'}</h3>
                        </div>
                        {timings ? (
                            <div className="space-y-1">
                                <p className="text-3xl sm:text-4xl font-black font-mono tracking-tighter drop-shadow-md">{nextFastingEvent?.timeLeft || '--:--:--'}</p>
                                <p className="text-xs text-white/80 font-bold">موعد الأذان: <span className="font-mono">{nextFastingEvent?.time}</span></p>
                            </div>
                        ) : (
                            <p className="text-sm opacity-80 font-bold">جاري تحميل المواقيت...</p>
                        )}
                    </div>
                    {/* Visual Decor */}
                    <div className="opacity-25 transform rotate-12 scale-125 text-white">
                        {nextFastingEvent?.name.includes('الإفطار') ? <Sun size={75}/> : <Moon size={75}/>}
                    </div>
                </div>
            </div>
        )}

        {/* Adhkar Buttons Row (Under Banner) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <button 
                onClick={() => onOpenAthkar?.('morning')} 
                className="group relative flex items-center gap-2.5 sm:gap-3 overflow-hidden rounded-[1.6rem] border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-white p-3 sm:p-3.5 text-right text-amber-950 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95 dark:border-amber-500/20 dark:from-amber-950/30 dark:via-slate-900/60 dark:to-slate-900 dark:text-amber-100"
            >
                <span className="grid h-10 w-10 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform duration-300">
                  <Sun size={20} className="sm:w-[22px] sm:h-[22px] transition-transform duration-500 group-hover:rotate-45"/>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] sm:text-[10px] font-bold text-amber-800/70 dark:text-amber-300/70">ابدأ يومك</span>
                  <span className="block text-xs sm:text-sm font-black leading-snug break-words">أذكار الصباح</span>
                </span>
            </button>
            <button 
                onClick={() => onOpenAthkar?.('evening')} 
                className="group relative flex items-center gap-2.5 sm:gap-3 overflow-hidden rounded-[1.6rem] border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-violet-50/50 to-white p-3 sm:p-3.5 text-right text-indigo-950 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95 dark:border-indigo-500/20 dark:from-indigo-950/30 dark:via-slate-900/60 dark:to-slate-900 dark:text-indigo-100"
            >
                <span className="grid h-10 w-10 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
                  <Moon size={20} className="sm:w-[22px] sm:h-[22px] transition-transform duration-500 group-hover:-rotate-45"/>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] sm:text-[10px] font-bold text-indigo-800/70 dark:text-indigo-300/70">اختم يومك</span>
                  <span className="block text-xs sm:text-sm font-black leading-snug break-words">أذكار المساء</span>
                </span>
            </button>
            <button 
                onClick={() => onOpenAthkar?.('situational')} 
                className="group relative col-span-2 flex items-center gap-3 sm:gap-3.5 overflow-hidden rounded-[1.6rem] border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-white p-3 sm:p-3.5 text-right text-emerald-950 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95 dark:border-emerald-500/20 dark:from-emerald-950/30 dark:via-slate-900/60 dark:to-slate-900 dark:text-emerald-100"
            >
                <span className="grid h-10 w-10 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform duration-300">
                  <Star size={20} className="sm:w-[22px] sm:h-[22px] transition-transform duration-700 group-hover:rotate-180"/>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] sm:text-[10px] font-bold text-emerald-800/70 dark:text-emerald-300/70">حصنك اليومي</span>
                  <span className="block text-xs sm:text-sm font-black leading-snug break-words">أذكار النوم والمنزل والأحوال</span>
                </span>
                <ChevronLeft size={20} className="text-emerald-400 group-hover:-translate-x-1 transition-transform shrink-0" />
            </button>
        </div>

        {/* Fasting Reminder Banner (Voluntary) */}
        {fastingReminder && (
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 rounded-[2rem] flex items-center gap-4 text-white shadow-xl animate-in slide-in-from-top-4 border border-white/20">
                <div className="bg-white/20 p-2.5 rounded-2xl animate-pulse shadow-inner">
                    <Bell size={22} className="text-yellow-300"/>
                </div>
                <div className="text-right">
                    <h3 className="font-black text-sm">{fastingReminder.title}</h3>
                    <p className="text-xs text-blue-100 font-bold opacity-90">{fastingReminder.text}</p>
                </div>
            </div>
        )}

        {/* Friday / Prophet Challenge Interactive Banner */}
        <div 
          onClick={onOpenProphetChallenge}
          className={`relative p-4 rounded-[2rem] border flex items-center justify-between cursor-pointer transition-all duration-300 shadow-lg active:scale-95 overflow-hidden group ${
            prophetSchedule.isFridayChallenge 
              ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 border-amber-300/60 text-white shadow-amber-500/25 ifaqa-gold-shimmer' 
              : prophetSchedule.status === 'upcoming_friday'
                ? 'bg-gradient-to-r from-amber-900/80 via-amber-800 to-amber-950 border-amber-500/30 text-white shadow-md'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 border-emerald-400/40 text-white shadow-emerald-600/20'
          }`}
        >
          <div className="flex items-center gap-3 text-right min-w-0 flex-1">
            <div className={`p-2.5 sm:p-3 rounded-2xl shadow-inner shrink-0 ${
              prophetSchedule.isFridayChallenge ? 'bg-white/20 text-white' : 'bg-white/15 text-white'
            }`}>
              <Heart size={22} className={prophetSchedule.isFridayChallenge ? 'fill-white animate-pulse' : 'fill-white/80'} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-black text-sm sm:text-base leading-tight">
                  {prophetSchedule.displayTitle}
                </h3>
                {prophetSchedule.isFridayChallenge && <Sparkles size={14} className="text-yellow-200 animate-spin" style={{ animationDuration: '4s' }} />}
              </div>
              <p className="text-[11px] sm:text-xs text-white/90 font-bold mt-0.5 leading-snug">
                {prophetSchedule.bannerSubtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 pl-1">
            <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/20 shadow-sm">
              <Clock size={12} className="text-amber-200 shrink-0" />
              <span className="font-mono text-xs font-black tracking-wider text-white whitespace-nowrap">
                {prophetSchedule.formattedCountdown}
              </span>
            </div>
            <span className="text-[10px] text-white/80 font-bold mt-0.5 whitespace-nowrap">
              {prophetSchedule.isFridayChallenge ? 'متبقي للتحدي' : 'تحدي الجمعة'}
            </span>
          </div>
        </div>

        {/* Date Navigation Bar */}
        <div className="flex justify-between items-center bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <button 
                onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate()-1)))} 
                className="w-10 h-10 flex items-center justify-center bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition dark:text-slate-200 active:scale-90"
                aria-label="اليوم السابق"
            >
                <ChevronRight size={20} />
            </button>
            <div className="flex flex-col items-center">
                <span className="font-black text-slate-800 dark:text-white text-sm font-mono tracking-tight">{dateStr}</span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full mt-0.5 ${isToday ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                    {isToday ? 'اليوم' : 'يوم سابق'}
                </span>
            </div>
            <button 
                onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate()+1)))} 
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition active:scale-90 ${isToday ? 'bg-slate-100/50 text-slate-300 dark:bg-slate-800/40 dark:text-slate-600 cursor-not-allowed' : 'bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200'}`}
                disabled={isToday}
                aria-label="اليوم التالي"
            >
                <ChevronLeft size={20}/>
            </button>
        </div>

        {/* Dashboard: Daily Progress Ring Card */}
        {isLite ? (
            <div className="bg-emerald-50/80 dark:bg-emerald-950/20 rounded-[2.2rem] p-6 border border-emerald-200/60 dark:border-emerald-800/40 flex flex-col items-center text-center space-y-2 shadow-sm">
                <Heart size={36} className="text-emerald-500 mb-1 fill-emerald-500/20"/>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
                    {completedPrayersCount === 5 ? "تقبل الله طاعتك وأتم عليك نعمته" : "حي على الصلاة"}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold leading-relaxed max-w-xs">
                    "إن الصلاة كانت على المؤمنين كتاباً موقوتاً"
                </p>
                <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 mt-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                    أنجزت {completedPrayersCount} من 5 صلوات
                </div>
            </div>
        ) : (
            <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                 {/* Decorative Glow */}
                 <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-violet-500/15 to-transparent rounded-bl-full pointer-events-none"></div>
                 
                <div className="flex items-center justify-between relative z-10">
                    <div className="max-w-[62%] text-right">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-[10px] font-black mb-2">
                          <TrendingUp size={12} />
                          <span>إنجاز اليوم</span>
                        </div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-white mb-1.5">
                            {outlineContent(completedPrayersCount === 5 ? "يوم مبارك مكتمل " : "خطواتك في الطاعة")}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
                            {completedPrayersCount === 5 
                                ? "ما شاء الله! أتممت صلواتك الخمس، تقبل الله منك." 
                                : `أنجزت ${completedPrayersCount} من 5 صلوات مفروضة، استمر!`}
                        </p>
                    </div>
                    
                    <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90 drop-shadow-md" viewBox="-10 -10 120 120">
                            <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                            <circle 
                                cx="50" cy="50" r="44" 
                                stroke="currentColor" 
                                strokeWidth="8" 
                                fill="transparent" 
                                strokeDasharray={276} 
                                strokeDashoffset={276 - (276 * progressPercent) / 100} 
                                className="text-violet-600 dark:text-violet-400 transition-all duration-1000 ease-out" 
                                strokeLinecap="round" 
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center inset-0">
                            <span className="text-lg font-black font-mono text-slate-800 dark:text-white">{Math.round(progressPercent)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Section: Timeline */}
        <div className="pt-2">
             <div className="flex items-center justify-between px-2 mb-3.5">
                <h3 className="font-black text-slate-600 dark:text-slate-300 text-xs flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-violet-600"></span> 
                   الصلوات المفروضة
                </h3>
                <span className="text-[10px] font-bold text-slate-400">انقر على أي صلاة لتسجيلها</span>
             </div>
             
             <div className="relative pr-2">
                {/* Timeline Line */}
                <div className="absolute right-[27px] top-5 bottom-5 w-0.5 bg-gradient-to-b from-violet-500/30 via-slate-200 to-slate-200 dark:from-violet-500/30 dark:via-slate-800 dark:to-slate-800 rounded-full"></div>

                <div className="space-y-4">
                    {prayers.map((p, i) => (
                        <div key={p.id} className="relative animate-in slide-in-from-bottom-4 fade-in duration-500" style={{animationDelay: `${i * 90}ms`}}>
                            <PrayerCard prayer={p} userId={user.uid} onUpdate={(s) => handlePrayer(p, s)} onSunnahUpdate={handleSunnah} />
                            {/* Fasting Badges Overlay */}
                            {isFastingMode && p.id === 'fajr' && (
                                <div className="absolute -top-2.5 right-6 bg-blue-600 text-white text-[9px] px-2.5 py-0.5 rounded-full shadow-md z-20 font-black border border-white/20">
                                    وقت الإمساك
                                </div>
                            )}
                            {isFastingMode && p.id === 'maghrib' && (
                                <div className="absolute -top-2.5 right-6 bg-orange-500 text-white text-[9px] px-2.5 py-0.5 rounded-full shadow-md z-20 font-black border border-white/20">
                                    وقت الإفطار
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Section: Extra Worship */}
        <div className="pt-4">
             <h3 className="font-black text-slate-600 dark:text-slate-300 text-xs px-2 mb-3.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> نوافل وطاعات إضافية
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={onOpenMasbaha} 
                  className="p-4 rounded-[1.8rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center gap-3 cursor-pointer hover:shadow-lg transition-all duration-300 active:scale-95 group"
                >
                    <div className="bg-violet-100 dark:bg-violet-900/40 p-3 rounded-2xl text-violet-600 dark:text-violet-300 group-hover:scale-105 transition-transform"><CircleDot size={22}/></div>
                    <div className="text-right">
                        <h4 className="font-black text-sm text-slate-800 dark:text-slate-100">المسبحة</h4>
                        <p className="text-[11px] font-bold text-slate-400">وردك اليومي</p>
                    </div>
                </div>

                {!isLite && (
                    <div 
                      onClick={onOpenLeaderboard} 
                      className="p-4 rounded-[1.8rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center gap-3 cursor-pointer hover:shadow-lg transition-all duration-300 active:scale-95 group"
                    >
                        <div className="bg-amber-100 dark:bg-amber-900/40 p-3 rounded-2xl text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform"><Trophy size={22}/></div>
                        <div className="text-right">
                            <h4 className="font-black text-sm text-slate-800 dark:text-slate-100">المتصدرون</h4>
                            <p className="text-[11px] font-bold text-slate-400">لوحة الأبطال</p>
                        </div>
                    </div>
                )}

                <div 
                  onClick={onOpenProphetChallenge} 
                  className={`p-4 rounded-[1.8rem] border flex items-center gap-3 cursor-pointer hover:shadow-lg transition-all duration-300 active:scale-95 group ${
                    prophetSchedule.isFridayChallenge 
                      ? 'bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 border-amber-400 text-white shadow-amber-500/30 ifaqa-gold-shimmer' 
                      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-emerald-300'
                  }`}
                >
                    <div className={`p-3 rounded-2xl shadow-inner shrink-0 ${
                      prophetSchedule.isFridayChallenge 
                        ? 'bg-white/25 text-white' 
                        : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                    }`}>
                        <Heart size={22} className={prophetSchedule.isFridayChallenge ? 'fill-white' : ''}/>
                    </div>
                    <div className="text-right min-w-0 flex-1">
                        <h4 className={`font-black text-sm truncate ${prophetSchedule.isFridayChallenge ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                          {prophetSchedule.isFridayChallenge ? 'تحدي الجمعة' : 'الصلاة على النبي'}
                        </h4>
                        <p className={`text-[11px] font-bold truncate ${prophetSchedule.isFridayChallenge ? 'text-amber-100' : 'text-slate-400'}`}>
                          {prophetSchedule.isFridayChallenge ? 'نشط الآن' : 'العداد اليومي'}
                        </p>
                    </div>
                </div>

                <div 
                  onClick={() => handleExtra('qiyam')} 
                  className={`p-4 rounded-[1.8rem] border flex justify-between items-center cursor-pointer transition-all duration-300 shadow-sm active:scale-95 ${extras.qiyam ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300'}`}
                >
                    <div className="flex items-center gap-2.5 text-right">
                        <div className={`p-3 rounded-2xl transition-colors ${extras.qiyam ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                          <Star size={20} fill={extras.qiyam ? "currentColor" : "none"}/>
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-slate-800 dark:text-slate-100">قيام الليل</h4>
                        </div>
                    </div>
                    {!isLite && <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl ${extras.qiyam ? 'text-amber-800 bg-amber-200/80 dark:bg-amber-900/60 dark:text-amber-300' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>+300 XP</span>}
                </div>
            </div>
        </div>
    </div>
  );
}

export default HomePage;
