import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';
import { COMPANION_CHAT_EVENT, requestedCompanion } from '../src/components/CompanionCheckInPopup';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, arrayUnion } from 'firebase/firestore';
import { 
  Award, ChevronLeft, CheckCircle2, Zap, Target, ArrowRight, 
  Sparkles, Flame, Users, HeartHandshake, Compass, Trophy, Star, Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../services/firebase';
import { APP_ID, ALL_CHALLENGES, XP_RULES } from '../constants';
import { Challenge } from '../types';
import { dailyChallengesService } from '../src/services/dailyChallengesService';
import AmeenWall from './AmeenWall';
import MawanEventsPage from './MawanEventsPage';
import ClansView from './ClansView';

interface ChallengesPageProps {
  user: User;
  updateStats: (amount: number, label?: string, category?: any) => void;
  onOpenProphetChallenge: () => void;
  onOpenMawanEvents: () => void;
  onOpenQuran?: (surah?: number, page?: number) => void;
  onOpenRadio?: () => void;
  onOpenMasbaha?: () => void;
}

type TabType = 'daily' | 'events' | 'ameen' | 'rooms';

const calculateDailyPrayerXP = (data: Record<string, any>): number => {
  if (!data || typeof data !== 'object') return 0;
  let total = 0;
  const getPoints = (status?: string, isFajr = false) => {
    if (status === 'jamaah') return isFajr ? XP_RULES.FAJR_JAMAAH : XP_RULES.JAMA_AH;
    if (status === 'ontime') return isFajr ? XP_RULES.FAJR_ONTIME : XP_RULES.ON_TIME;
    if (status === 'late') return XP_RULES.LATE;
    if (status === 'qada') return XP_RULES.QADA;
    return 0;
  };

  total += getPoints(data.fajr, true);
  total += getPoints(data.dhuhr, false);
  total += getPoints(data.asr, false);
  total += getPoints(data.maghrib, false);
  total += getPoints(data.isha, false);

  if (data.fajr_sunan_pre) total += 2 * XP_RULES.SUNNAH_RAKAH;
  if (data.dhuhr_sunan_pre) total += 4 * XP_RULES.SUNNAH_RAKAH;
  if (data.dhuhr_sunan_post) total += 2 * XP_RULES.SUNNAH_RAKAH;
  if (data.asr_sunan_pre) total += XP_RULES.SUNNAH_ASR;
  if (data.maghrib_sunan_post) total += 2 * XP_RULES.SUNNAH_RAKAH;
  if (data.isha_sunan_post) total += 2 * XP_RULES.SUNNAH_RAKAH;
  if (data.qiyam) total += XP_RULES.QIYAM;

  return total;
};

const ChallengesPage: React.FC<ChallengesPageProps> = ({ 
  user, 
  updateStats, 
  onOpenProphetChallenge, 
  onOpenMawanEvents,
  onOpenQuran,
  onOpenRadio,
  onOpenMasbaha
}) => {
    const [view, setView] = useState<TabType>(() => requestedCompanion() ? 'rooms' : 'daily');
    useEffect(() => { const open = () => setView('rooms'); window.addEventListener(COMPANION_CHAT_EVENT, open); return () => window.removeEventListener(COMPANION_CHAT_EVENT, open); }, []);
    const [completed, setCompleted] = useState<string[]>([]);
    const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
    const [challenges, setChallenges] = useState<Challenge[]>(() => dailyChallengesService.getCachedChallenges());

    const dateStr = new Date().toISOString().split('T')[0];
    const localChallengesKey = `ifaqa_challenges_${user.uid}_${dateStr}`;

    const [dailyData, setDailyData] = useState<Record<string, any>>(() => {
        try {
            const stored = localStorage.getItem(`ifaqa_daily_${user.uid}_${dateStr}`);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });
    const [todayTotalXP, setTodayTotalXP] = useState<number>(() => {
        return Number(localStorage.getItem(`ifaqa_today_total_xp_${user.uid}_${dateStr}`)) || 0;
    });

    // Subscribe to dynamic daily challenges from Firestore / Cache
    useEffect(() => {
        const unsub = dailyChallengesService.subscribeToChallenges((items) => {
            if (Array.isArray(items) && items.length > 0) {
                setChallenges(items);
            }
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        // 1. Instant local restore
        try {
          const stored = localStorage.getItem(localChallengesKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) setCompleted(parsed);
          }
          const dailyStored = localStorage.getItem(`ifaqa_daily_${user.uid}_${dateStr}`);
          if (dailyStored) setDailyData(JSON.parse(dailyStored));
          const totalStored = Number(localStorage.getItem(`ifaqa_today_total_xp_${user.uid}_${dateStr}`)) || 0;
          setTodayTotalXP(totalStored);
        } catch {}

        // 2. Real-time Firestore sync & merge
        const unsub = onSnapshot(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'daily', dateStr), (docSnap) => {
            let localItems: string[] = [];
            try {
              const stored = localStorage.getItem(localChallengesKey);
              if (stored) localItems = JSON.parse(stored) || [];
            } catch {}

            const remoteData = docSnap.exists() ? docSnap.data() : {};
            const remoteItems = remoteData.completedChallenges || [];
            const merged = Array.from(new Set([...localItems, ...remoteItems]));
            setCompleted(merged);
            setDailyData(prev => ({ ...prev, ...remoteData }));
            try {
              localStorage.setItem(localChallengesKey, JSON.stringify(merged));
            } catch {}
        });

        const handleXpUpdate = () => {
          setTodayTotalXP(Number(localStorage.getItem(`ifaqa_today_total_xp_${user.uid}_${dateStr}`)) || 0);
          try {
            const stored = localStorage.getItem(`ifaqa_daily_${user.uid}_${dateStr}`);
            if (stored) setDailyData(JSON.parse(stored));
          } catch {}
        };
        window.addEventListener('ifaqa_daily_xp_updated', handleXpUpdate);
        window.addEventListener('storage', handleXpUpdate);

        return () => {
          unsub();
          window.removeEventListener('ifaqa_daily_xp_updated', handleXpUpdate);
          window.removeEventListener('storage', handleXpUpdate);
        };
    }, [user.uid, dateStr, localChallengesKey]);

    useEffect(() => {
        if (dailyData?.qiyam && !completed.includes('ch6') && challenges.some(c => c.id === 'ch6')) {
            setCompleted(prev => {
                const next = Array.from(new Set([...prev, 'ch6']));
                try {
                  localStorage.setItem(localChallengesKey, JSON.stringify(next));
                } catch {}
                return next;
            });
        }
    }, [dailyData?.qiyam, challenges, completed, localChallengesKey]);

    const handleComplete = async (ch: any) => {
        if (completed.includes(ch.id)) return;

        if (navigator.vibrate) navigator.vibrate([30, 50, 40]);

        // Trigger celebratory micro-confetti
        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#8b5cf6', '#10b981', '#f59e0b', '#38bdf8']
          });
        } catch {}

        setJustCompletedId(ch.id);
        setTimeout(() => setJustCompletedId(null), 1500);

        const newCompleted = Array.from(new Set([...completed, ch.id]));
        setCompleted(newCompleted);
        try {
          localStorage.setItem(localChallengesKey, JSON.stringify(newCompleted));
        } catch {}

        // Immediately update stats & XP
        updateStats(ch.xp, ch.title, 'challenge');

        // Save to Firestore daily in background
        void setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'daily', dateStr), { 
            completedChallenges: arrayUnion(ch.id) 
        }, { merge: true }).catch((e) => console.warn('Challenge sync queued:', e));
    };

    const totalChallenges = challenges.length;
    const completedCount = completed.filter(id => challenges.some(c => c.id === id)).length;
    const progress = totalChallenges > 0 ? Math.round((completedCount / totalChallenges) * 100) : 0;
    const challengeXP = challenges.filter(c => completed.includes(c.id)).reduce((sum, c) => sum + c.xp, 0);
    const prayerXP = calculateDailyPrayerXP(dailyData);
    const earnedXP = Math.max(todayTotalXP, prayerXP + challengeXP);

    if (view === 'rooms') {
        // Use createPortal to mount directly on document.body.
        // This escapes the .ifaqa-page-transition animation which uses
        // transform + filter, creating a new CSS containing block that
        // traps `position:fixed` children and collapses them to 0px.
        return createPortal(
            <div
                className="select-none bg-[#f5f8f6] dark:bg-[#0b1716] text-[#162a22] dark:text-[#f4f3e9]"
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    overflow: 'hidden',
                }}
                dir="rtl"
            >
                <ClansView
                    user={user}
                    updateStats={async (amt, label, cat) => updateStats(amt, label, cat)}
                    onOpenQuran={onOpenQuran}
                    onOpenRadio={onOpenRadio}
                    onOpenMasbaha={onOpenMasbaha}
                    onOpenProphetChallenge={onOpenProphetChallenge}
                    onBack={() => setView('daily')}
                />
            </div>,
            document.body
        );
    }

    return (
        <div className="space-y-5 pt-1 pb-24 animate-in fade-in duration-300 max-w-lg mx-auto px-1">
            {/* Top Hero Banner: Prophet Challenge & Events Hub */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-6 text-white shadow-2xl shadow-violet-950/30 border border-violet-500/20">
                <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
                <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
                <div className="absolute inset-0 bg-[url('/assets/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none" />

                <div className="relative z-10 space-y-4 text-right">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-[11px] font-black text-amber-300">
                            <Flame size={14} className="text-amber-400 animate-pulse fill-amber-400" />
                            <span>تحديات معوان المتجددة</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono font-black text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                            <span>+{earnedXP} XP اليوم</span>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-white mb-1 drop-shadow-sm">
                            
                            ساحة الهمة والمنافسة <OutlineIcon name="sparkles" />
                        </h2>
                        <p className="text-xs text-slate-300 font-bold leading-relaxed">
                            استبقوا الخيرات، وارتقِ بدرجتك عبر إتمام المهام اليومية وخوض فعاليات معوان الكبرى.
                        </p>
                    </div>

                    {/* Prophet Challenge Special Trigger */}
                    <div 
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(15);
                        onOpenProphetChallenge();
                      }} 
                      className="group cursor-pointer rounded-[2rem] bg-gradient-to-r from-emerald-600/90 via-teal-600/90 to-emerald-700/90 p-4 border border-emerald-400/30 shadow-lg shadow-emerald-900/30 hover:scale-[1.01] active:scale-[0.98] transition-all duration-300"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-inner group-hover:rotate-12 transition-transform duration-300 flex-shrink-0">
                                    <Award size={24} className="fill-amber-300" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-sm text-white truncate">تحدي الصلاة على النبي ﷺ</h3>
                                        <span className="text-[9px] font-black bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">مميز</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-emerald-100 truncate mt-0.5">سجّل أرقامك وشارك في المليونية المباركة</p>
                                </div>
                            </div>
                            <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center group-hover:-translate-x-1 transition-transform flex-shrink-0">
                                <ChevronLeft size={18} className="text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Ultra-Modern Navigation Tabs */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-1.5 rounded-[2rem] flex border border-slate-200/80 dark:border-slate-800 shadow-sm gap-1">
                <button 
                  onClick={() => {
                    setView('daily');
                    if (navigator.vibrate) navigator.vibrate(10);
                  }} 
                  className={`flex-1 py-2.5 px-2 rounded-2xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-1.5 ${view === 'daily' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/25 scale-[1.02]' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'}`}
                >
                  <Target size={15} />
                  <span>المهام اليومية</span>
                </button>

                <button 
                  onClick={() => {
                    setView('events');
                    if (navigator.vibrate) navigator.vibrate(10);
                  }} 
                  className={`flex-1 py-2.5 px-2 rounded-2xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-1.5 ${view === 'events' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/25 scale-[1.02]' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'}`}
                >
                  <Trophy size={15} />
                  <span>فعاليات معوان</span>
                </button>

                <button 
                  onClick={() => {
                    setView('ameen');
                    if (navigator.vibrate) navigator.vibrate(10);
                  }} 
                  className={`flex-1 py-2.5 px-2 rounded-2xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-1.5 ${view === 'ameen' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/25 scale-[1.02]' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'}`}
                >
                  <HeartHandshake size={15} />
                  <span>حائط الدعاء</span>
                </button>

                <button 
                  onClick={() => {
                    setView('rooms');
                    if (navigator.vibrate) navigator.vibrate(10);
                  }} 
                  className={`flex-1 py-2.5 px-2 rounded-2xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-1.5 ${view === 'rooms' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/25 scale-[1.02]' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'}`}
                >
                  <Users size={15} />
                  <span>قوافل الخير</span>
                </button>
            </div>
            
            {/* VIEW 1: DAILY CHALLENGES */}
            {view === 'daily' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Daily Progress Dashboard */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-[2.2rem] shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                        <div className="flex justify-between items-end mb-3.5 relative z-10 text-right">
                            <div>
                                <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                                  <Target className="text-violet-500" size={18} /> 
                                  <span>مؤشر حصاد اليوم</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5 font-bold">أتمم المهام لاكتساب النقاط ورفع رتبتك</p>
                            </div>
                            <div className="flex items-baseline gap-1 text-left">
                                <span className="text-3xl font-black text-violet-600 dark:text-violet-400 font-mono tracking-tight">{completedCount}</span>
                                <span className="text-xs font-bold text-slate-400">/{totalChallenges}</span>
                            </div>
                        </div>

                        <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 shadow-inner">
                            <div 
                              className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-500 rounded-full transition-all duration-700 ease-out relative ifaqa-shimmer" 
                              style={{ width: `${progress}%` }}
                            />
                        </div>

                        <div className="mt-3 flex justify-between items-center text-[11px] font-bold text-slate-400">
                          <span>نسبة الإنجاز: {progress}%</span>
                          <span>متبقي: {totalChallenges - completedCount} مهام</span>
                        </div>
                    </div>

                    {/* Challenges List */}
                    <div className="grid gap-3 pt-1">
                        {challenges.map((c, idx) => {
                            const isDone = completed.includes(c.id);
                            const isJustDone = justCompletedId === c.id;

                            return (
                                <div 
                                    key={c.id} 
                                    className={`relative p-4 rounded-[2rem] transition-all duration-300 group overflow-hidden border ${
                                        isDone 
                                        ? 'bg-gradient-to-br from-emerald-50/90 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/10 border-emerald-400/40 shadow-sm' 
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                                    } ${isJustDone ? 'scale-[1.02] ring-2 ring-emerald-400' : ''}`}
                                >
                                    <div className="flex justify-between items-center relative z-10 gap-3 text-right">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                                              isDone 
                                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' 
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 group-hover:text-violet-600'
                                            }`}>
                                                {isDone ? (
                                                  <CheckCircle2 size={22} className="animate-in zoom-in spin-in-12 duration-300" />
                                                ) : (
                                                  <Zap size={22} className="fill-slate-200 dark:fill-slate-700" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className={`font-black text-sm transition-colors truncate ${
                                                  isDone 
                                                    ? 'text-emerald-900 dark:text-emerald-200 line-through decoration-emerald-500/50' 
                                                    : 'text-slate-800 dark:text-white'
                                                }`}>
                                                    {c.title}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full inline-block font-mono ${
                                                    isDone 
                                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' 
                                                      : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                                                  }`}>
                                                      +{c.xp} XP
                                                  </span>
                                                  {isDone && (
                                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">مكتمل <OutlineIcon name="check" /></span>
                                                  )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {!isDone ? (
                                            <button 
                                                onClick={() => handleComplete(c)} 
                                                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-violet-600 hover:text-white dark:hover:bg-violet-600 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all duration-200 active:scale-90 shadow-sm flex items-center gap-1.5 flex-shrink-0"
                                                aria-label="إتمام التحدي"
                                            >
                                                <span>تم</span>
                                                <ArrowRight size={14} className="rtl:rotate-180" />
                                            </button>
                                        ) : (
                                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                                            <CheckCircle2 size={18} />
                                          </div>
                                        )}
                                    </div>
                                    
                                    {/* Success Glow Effect */}
                                    {isDone && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-2xl pointer-events-none" />}
                                </div>
                            );
                        })}
                        {challenges.length === 0 && (
                            <div className="text-center py-12 px-4 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                <Target size={36} className="mx-auto mb-2 opacity-40 text-violet-500" />
                                <p className="font-bold text-sm">لا توجد تحديات يومية حالياً</p>
                                <p className="text-xs mt-1 text-slate-500">انتظر التحديات الجديدة قريباً بإذن الله</p>
                            </div>
                        )}
                    </div>

                    {/* All Done Celebration Message */}
                    {completedCount === totalChallenges && totalChallenges > 0 && (
                        <div className="text-center p-8 border border-dashed border-emerald-300/80 dark:border-emerald-800/80 rounded-[2.5rem] animate-in zoom-in bg-gradient-to-br from-emerald-50/90 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 shadow-sm">
                            <Award className="mx-auto mb-2 text-amber-400 drop-shadow-md animate-bounce" size={48} />
                            <p className="font-black text-lg text-emerald-900 dark:text-emerald-100">هنيئاً لك! أتممت جميع تحديات اليوم</p>
                            <p className="text-xs font-bold text-emerald-700/80 dark:text-emerald-400/80 mt-1">تقبل الله طاعاتك وأثابك، عد غداً لمهام وهمة جديدة بإذن الله.</p>
                        </div>
                    )}
                </div>
            )}

            {/* VIEW 2: MAWAN EVENTS */}
            {view === 'events' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <MawanEventsPage user={user} userData={{ name: user.displayName || 'مستخدم' } as any} />
                </div>
            )}
            
            {/* VIEW 3: AMEEN WALL */}
            {view === 'ameen' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <AmeenWall user={user} updateStats={updateStats} />
                </div>
            )}
        </div>
    );
};

export default ChallengesPage;
