import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';
import React, { useState, useEffect, useRef } from 'react';
import { Preferences } from '@capacitor/preferences';
import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, increment, query, collection, orderBy, limit } from 'firebase/firestore';
import { X, Trophy, Heart, Star, Info, Zap, Crown, ChevronDown, ChevronUp, Users, Medal, WifiOff, Palette, Sparkles, Clock } from 'lucide-react';
import { db } from '../services/firebase';
import { APP_ID, XP_RULES } from '../constants';
import { UserData } from '../types';
import confetti from 'canvas-confetti';
import { hapticCounter } from '../src/services/haptics';
import { getProphetChallengeSchedule } from '../src/services/prophetChallengeSchedule';
import { clanService } from '../src/services/clanService';

interface ProphetChallengeModalProps {
  user: User;
  userData: UserData;
  onClose: () => void;
  updateStats: (amount: number, label?: string, category?: any) => void;
}

interface ChallengeTheme {
  id: string;
  name: string;
  gradient: string;
  buttonGradient: string;
  buttonBorder: string;
  ringColor: string;
  accentText: string;
  glowColor: string;
  previewBg: string;
}

const THEMES: Record<string, ChallengeTheme> = {
  gold: {
    id: 'gold',
    name: 'الذهبي الملكي',
    gradient: 'bg-gradient-to-b from-amber-950 via-amber-900 to-slate-950',
    buttonGradient: 'bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400',
    buttonBorder: 'border-yellow-300/40 shadow-yellow-500/30',
    ringColor: '#F59E0B',
    accentText: 'text-yellow-400',
    glowColor: 'bg-amber-500/15',
    previewBg: 'bg-gradient-to-r from-amber-500 to-yellow-400'
  },
  emerald: {
    id: 'emerald',
    name: 'الزمردي النبوي',
    gradient: 'bg-gradient-to-b from-emerald-950 via-teal-900 to-slate-950',
    buttonGradient: 'bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400',
    buttonBorder: 'border-emerald-300/40 shadow-emerald-500/30',
    ringColor: '#10B981',
    accentText: 'text-emerald-400',
    glowColor: 'bg-emerald-500/15',
    previewBg: 'bg-gradient-to-r from-emerald-500 to-teal-400'
  },
  black: {
    id: 'black',
    name: 'الأسود الفاحم',
    gradient: 'bg-black',
    buttonGradient: 'bg-gradient-to-t from-zinc-900 via-zinc-800 to-zinc-700',
    buttonBorder: 'border-zinc-500/50 shadow-zinc-500/20',
    ringColor: '#E4E4E7',
    accentText: 'text-zinc-100',
    glowColor: 'bg-zinc-800/30',
    previewBg: 'bg-gradient-to-r from-black via-zinc-900 to-zinc-700'
  },
  midnight: {
    id: 'midnight',
    name: 'الليلي الكحلي',
    gradient: 'bg-gradient-to-b from-slate-950 via-indigo-950 to-black',
    buttonGradient: 'bg-gradient-to-t from-indigo-600 via-blue-500 to-cyan-400',
    buttonBorder: 'border-cyan-300/40 shadow-indigo-500/30',
    ringColor: '#6366F1',
    accentText: 'text-cyan-400',
    glowColor: 'bg-indigo-500/15',
    previewBg: 'bg-gradient-to-r from-indigo-500 to-cyan-400'
  },
  crimson: {
    id: 'crimson',
    name: 'العنابي الروحاني',
    gradient: 'bg-gradient-to-b from-rose-950 via-pink-950 to-slate-950',
    buttonGradient: 'bg-gradient-to-t from-rose-600 via-pink-500 to-rose-400',
    buttonBorder: 'border-pink-300/40 shadow-rose-500/30',
    ringColor: '#F43F5E',
    accentText: 'text-pink-400',
    glowColor: 'bg-rose-500/15',
    previewBg: 'bg-gradient-to-r from-rose-500 to-pink-400'
  },
  violet: {
    id: 'violet',
    name: 'البنفسجي الملكي',
    gradient: 'bg-gradient-to-b from-purple-950 via-violet-900 to-slate-950',
    buttonGradient: 'bg-gradient-to-t from-purple-600 via-violet-500 to-fuchsia-400',
    buttonBorder: 'border-violet-300/40 shadow-violet-500/30',
    ringColor: '#A855F7',
    accentText: 'text-violet-400',
    glowColor: 'bg-violet-500/15',
    previewBg: 'bg-gradient-to-r from-purple-500 to-violet-400'
  }
};

const ProphetChallengeModal: React.FC<ProphetChallengeModalProps> = ({ user, userData, onClose, updateStats }) => {
    const [count, setCount] = useState(0);
    const [globalCount, setGlobalCount] = useState(0);
    const [leaders, setLeaders] = useState<any[]>([]);
    const [showRules, setShowRules] = useState(false);
    const [showThemePicker, setShowThemePicker] = useState(false);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [personalGoal, setPersonalGoal] = useState(100);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [clockNow, setClockNow] = useState(() => new Date());

    // Compute active challenge schedule (Thursday Fajr -> Friday Maghrib or 24/7 Daily)
    const schedule = getProphetChallengeSchedule(clockNow);
    const isFriday = schedule.isFridayChallenge;
    const periodKey = schedule.periodKey;

    const [selectedThemeId, setSelectedThemeId] = useState<string>(() => {
      const saved = localStorage.getItem('ifaqa_prophet_theme');
      if (saved && THEMES[saved]) return saved;
      return isFriday ? 'gold' : 'emerald';
    });

    const activeTheme = THEMES[selectedThemeId] || (isFriday ? THEMES.gold : THEMES.emerald);

    const changeTheme = (themeId: string) => {
      setSelectedThemeId(themeId);
      localStorage.setItem('ifaqa_prophet_theme', themeId);
      setShowThemePicker(false);
    };

    // Live 1-second ticker for clock and countdowns
    useEffect(() => {
      const timer = window.setInterval(() => setClockNow(new Date()), 1000);
      return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleStatus = () => setIsOffline(!navigator.onLine);
        window.addEventListener('online', handleStatus);
        window.addEventListener('offline', handleStatus);

        // Load local count scoped to current periodKey (resets properly when period changes!)
        Preferences.get({ key: 'ifaqa_salat_period' }).then((savedPeriod) => {
          if (savedPeriod.value === periodKey) {
            Preferences.get({ key: 'ifaqa_salat_count' }).then((savedCount) => {
              const parsed = Number(savedCount.value) || 0;
              setCount(parsed);
              try {
                const syncKey = `ifaqa_clan_synced_salawat_${periodKey}_${user.uid}`;
                const synced = Number(localStorage.getItem(syncKey)) || 0;
                if (parsed > synced) {
                  const diff = parsed - synced;
                  localStorage.setItem(syncKey, String(parsed));
                  void clanService.autoContributeClanQuest(user.uid, 'salawat', diff);
                }
              } catch {}
            });
          } else {
            // New day or new Friday challenge: reset immediately!
            setCount(0);
            Preferences.set({ key: 'ifaqa_salat_period', value: periodKey });
            Preferences.set({ key: 'ifaqa_salat_count', value: '0' });
          }
        });

        // Global Stats Listener for this periodKey
        const globalRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'prophet_v2', periodKey, 'global', 'totals');
        const unsubGlobal = onSnapshot(globalRef, (snap) => {
            if (snap.exists()) setGlobalCount(snap.data().total || 0);
            else setGlobalCount(0);
        }, () => {});

        // Personal Stats Listener for this periodKey
        const personalRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'prophet_v2', periodKey, 'users', user.uid);
        const unsubPersonal = onSnapshot(personalRef, (snap) => {
            if (snap.exists()) {
              const current = snap.data().count || 0;
              setCount(current);
              // Reconcile with clan quest if there are existing uncredited prayers
              try {
                const syncKey = `ifaqa_clan_synced_salawat_${periodKey}_${user.uid}`;
                const synced = Number(localStorage.getItem(syncKey)) || 0;
                if (current > synced) {
                  const diff = current - synced;
                  localStorage.setItem(syncKey, String(current));
                  void clanService.autoContributeClanQuest(user.uid, 'salawat', diff);
                }
              } catch {}
            }
        }, () => {});

        // Leaders Listener (Top 10) for this periodKey
        const leadersQuery = query(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'prophet_v2', periodKey, 'users'), 
            orderBy('count', 'desc'), 
            limit(10)
        );
        const unsubLeaders = onSnapshot(leadersQuery, (snap) => {
            setLeaders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, () => {});

        return () => {
            flushClanSalawat();
            unsubGlobal();
            unsubPersonal();
            unsubLeaders();
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
        };
    }, [user.uid, periodKey]);

    // Batch / Debounce clan salawat contributions & XP so no prayer is lost
    const pendingClanTaps = useRef(0);
    const pendingXpPoints = useRef(0);
    const clanDebounceTimer = useRef<any>(null);

    const flushClanSalawat = () => {
      if (clanDebounceTimer.current) {
        clearTimeout(clanDebounceTimer.current);
        clanDebounceTimer.current = null;
      }
      const amount = pendingClanTaps.current;
      if (amount > 0 && user?.uid) {
        pendingClanTaps.current = 0;
        try {
          const syncKey = `ifaqa_clan_synced_salawat_${periodKey}_${user.uid}`;
          const synced = Number(localStorage.getItem(syncKey)) || 0;
          localStorage.setItem(syncKey, String(synced + amount));
        } catch {}
        void clanService.autoContributeClanQuest(user.uid, 'salawat', amount);
      }
      const xpToFlush = pendingXpPoints.current;
      if (xpToFlush > 0) {
        pendingXpPoints.current = 0;
        updateStats(xpToFlush, 'الصلاة على النبي ﷺ', 'challenge');
      }
    };

    useEffect(() => {
      return () => {
        flushClanSalawat();
      };
    }, [user.uid, periodKey]);

    const handlePray = async () => {
        hapticCounter();
        if (navigator.vibrate) navigator.vibrate(35);
        
        const newCount = count + 1;
        setCount(newCount);
        setGlobalCount(prev => prev + 1);
        
        // Sync to Preferences with periodKey immediately for widgets and offline state
        Preferences.set({ key: 'ifaqa_salat_period', value: periodKey });
        Preferences.set({ key: 'ifaqa_salat_count', value: String(newCount) });

        const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'prophet_v2', periodKey, 'users', user.uid);
        const globalRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'prophet_v2', periodKey, 'global', 'totals');

        setDoc(userRef, { 
            count: increment(1), 
            name: userData.name || user.displayName || 'مستخدم',
            lastUpdate: new Date().getTime()
        }, { merge: true }).catch(() => {});

        setDoc(globalRef, { 
            total: increment(1) 
        }, { merge: true }).catch(() => {});

        // Buffer and debounce clan quest contribution so every single prayer counts
        pendingClanTaps.current += 1;
        pendingXpPoints.current += 1;
        if (clanDebounceTimer.current) clearTimeout(clanDebounceTimer.current);
        clanDebounceTimer.current = setTimeout(flushClanSalawat, 1200);

        if (newCount % 10 === 0 && pendingXpPoints.current >= 10) {
            const batch = pendingXpPoints.current;
            pendingXpPoints.current = 0;
            updateStats(batch, 'الصلاة على النبي ﷺ', 'challenge');
            
            if (newCount === personalGoal) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#F59E0B', '#10B981', '#A855F7']
                });
            }
        }
    };

    const effectiveGlobalCount = Math.max(
      globalCount,
      count,
      leaders.reduce((sum, l) => sum + (Number(l.count) || 0), 0)
    );

    useEffect(() => {
      if (effectiveGlobalCount > globalCount && navigator.onLine) {
        const globalRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'prophet_v2', periodKey, 'global', 'totals');
        setDoc(globalRef, { total: effectiveGlobalCount }, { merge: true }).catch(() => {});
      }
    }, [effectiveGlobalCount, globalCount, periodKey]);

    const progress = Math.min(100, (count / personalGoal) * 100);
    const globalGoal = isFriday ? 100000 : 50000;
    const globalProgress = Math.min(100, (effectiveGlobalCount / globalGoal) * 100);

    // Calculate user ranking
    const userRankIndex = leaders.findIndex(l => l.id === user.uid);
    const userRank = userRankIndex !== -1 ? userRankIndex + 1 : (count > 0 ? leaders.length + 1 : null);

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col transition-all duration-700 animate-in slide-in-from-bottom ${activeTheme.gradient}`}>
            <style>{`
              @keyframes heartBeatSmooth {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.15); }
              }
            `}</style>
            {/* Ambient Background Glow */}
            <div className={`absolute inset-x-0 top-0 h-80 ${activeTheme.glowColor} blur-3xl rounded-full -translate-y-1/3 pointer-events-none`} />
            
            {/* Header */}
            <div className="relative z-20 p-4 pt-6 flex justify-between items-center text-white">
                <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full backdrop-blur-md transition" aria-label="إغلاق">
                    <X size={22}/>
                </button>

                <div className="text-center">
                    <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center justify-center gap-1.5">
                      <span>{schedule.displayTitle}</span>
                      {isFriday && <Sparkles size={16} className="text-yellow-400 animate-pulse" />}
                    </h2>
                    <p className="text-[10px] font-bold opacity-70 tracking-wider mt-0.5">{schedule.periodKey.replace(/^(friday_|daily_)/, '')}</p>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Theme Picker Button */}
                    <button 
                      onClick={() => setShowThemePicker(!showThemePicker)} 
                      className={`p-2.5 rounded-full backdrop-blur-md transition active:scale-95 ${showThemePicker ? 'bg-white text-slate-900 shadow-md' : 'bg-white/10 hover:bg-white/20'}`}
                      title="تغيير الثيم"
                      aria-label="تغيير الثيم"
                    >
                        <Palette size={20}/>
                    </button>

                    {isOffline && (
                        <div className="p-2 bg-amber-500 rounded-full shadow-lg shadow-amber-500/20" title="أنت غير متصل">
                            <WifiOff size={20} className="text-white"/>
                        </div>
                    )}

                    <button 
                      onClick={() => setShowRules(!showRules)} 
                      className={`p-2.5 rounded-full backdrop-blur-md transition active:scale-95 ${showRules ? 'bg-white text-slate-900 shadow-md' : 'bg-white/10 hover:bg-white/20'}`}
                      title="قوانين التحدي"
                      aria-label="قوانين التحدي"
                    >
                        <Info size={20}/>
                    </button>
                </div>
            </div>

            {/* Theme Picker Dropdown Modal */}
            {showThemePicker && (
              <div className="relative z-30 mx-4 mb-2 p-3.5 bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/15 animate-in slide-in-from-top-2 duration-200">
                <div className="text-xs font-black text-white/80 mb-2.5 text-right px-1">اختر مظهر الصفحة:</div>
                <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                  {Object.values(THEMES).map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => changeTheme(theme.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition active:scale-95 ${selectedThemeId === theme.id ? 'border-white bg-white/20 shadow-md' : 'border-transparent hover:bg-white/5'}`}
                    >
                      <div className={`w-7 h-7 rounded-full ${theme.previewBg} shadow-inner border border-white/20`} />
                      <span className="text-[9px] font-bold text-white/90 truncate max-w-full">{theme.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto scrollbar-hide px-4 sm:px-6 py-2 flex flex-col items-center">
                
                {/* Live Countdown & Period Status Banner */}
                <div className="w-full max-w-sm mb-4 px-4 py-2.5 rounded-2xl bg-black/35 backdrop-blur-md border border-white/15 flex items-center justify-between text-xs font-bold text-white shadow-sm">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className={isFriday ? 'text-amber-300 animate-pulse' : 'text-emerald-300'} />
                    <span className="text-white/90">
                      {isFriday ? 'متبقي على نهاية تحدي الجمعة:' : schedule.status === 'upcoming_friday' ? 'يبدأ تحدي الجمعة بعد:' : 'تحدي الجمعة القادم بعد:'}
                    </span>
                  </div>
                  <span className="font-mono font-black text-amber-300 tracking-wider text-sm">
                    {schedule.formattedCountdown}
                  </span>
                </div>

                {/* Rules Section */}
                {showRules && (
                    <div className="w-full max-w-sm bg-white/10 backdrop-blur-2xl rounded-[2rem] p-5 mb-5 border border-white/20 animate-in zoom-in-95 duration-200 text-right">
                        <div className="flex items-center gap-2 mb-3">
                            <Star className="text-amber-400" size={18} fill="currentColor"/>
                            <h3 className="text-white font-black text-sm uppercase tracking-wider">قوانين الصلاة على النبي</h3>
                        </div>
                        <ul className="text-xs text-white/85 space-y-3 font-medium leading-relaxed">
                            <li className="flex gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                                <span>التحدي متاح <strong>24 ساعة يومياً</strong> بلا توقف لكسب الأجر والثواب.</span>
                            </li>
                            <li className="flex gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                                <span><strong>تحدي الجمعة المباركة:</strong> يبدأ من <strong>فجر يوم الخميس</strong> ويستمر حتى <strong>مغرب يوم الجمعة</strong> بعداد جديد ومستقل.</span>
                            </li>
                            <li className="flex gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                                <span>بعد مغرب الجمعة وباقي أيام الأسبوع، يستمر <strong>العداد اليومي</strong> تلقائياً على مدار 24 ساعة ويتجدد يومياً.</span>
                            </li>
                            <li className="flex gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black shrink-0">4</span>
                                <span>كل ضغطة تُحسب بصلاة واحدة تامة على النبي ﷺ.</span>
                            </li>
                        </ul>
                        <button onClick={() => setShowRules(false)} className="mt-4 w-full py-2 bg-white text-slate-900 rounded-xl font-bold text-xs shadow-md active:scale-95 transition">حسناً، فهمت</button>
                    </div>
                )}

                {/* Global Progress Bar */}
                <div className="w-full max-w-sm mb-6 space-y-2">
                    <div className="flex justify-between items-end px-1">
                        <span className="text-[11px] font-bold text-white/70">الهدف الجماعي اليوم</span>
                        <div className="flex items-center gap-1.5">
                            {isOffline && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">(محفوظ مؤقتاً)</span>}
                            <span className="text-xs font-black text-white font-mono">{effectiveGlobalCount.toLocaleString()} / {globalGoal.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
                        <div 
                            className={`h-full rounded-full transition-all duration-700 ease-out relative ${activeTheme.previewBg} shadow-sm`}
                            style={{ width: `${globalProgress}%` }}
                        >
                            <div className="absolute inset-0 bg-white/25 animate-pulse"></div>
                        </div>
                    </div>
                </div>

                {/* Main Counter & Button Area (Enlarged and Properly Centered) */}
                <div className="flex flex-col items-center justify-center my-auto py-3">
                    {/* Centered Circular Progress & Large Tap Button */}
                    <div className="relative flex items-center justify-center w-72 h-72 sm:w-80 sm:h-80 md:w-92 md:h-92">
                        {/* Perfect Circular Progress SVG Frame */}
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                            <circle 
                              cx="50" 
                              cy="50" 
                              r="45.5" 
                              stroke="rgba(255,255,255,0.12)" 
                              strokeWidth="3.5" 
                              fill="transparent" 
                            />
                            <circle 
                                cx="50" 
                                cy="50" 
                                r="45.5" 
                                stroke={activeTheme.ringColor} 
                                strokeWidth="4.5" 
                                fill="transparent" 
                                strokeDasharray="285.88" 
                                strokeDashoffset={285.88 - (285.88 * progress) / 100} 
                                strokeLinecap="round"
                                className="transition-all duration-300"
                            />
                        </svg>

                        {/* Interactive Large Tap Button (Always Active 24/7) */}
                        <button 
                            onClick={handlePray}
                            className={`relative z-10 w-56 h-56 sm:w-64 sm:h-64 md:w-74 md:h-74 rounded-full flex flex-col items-center justify-center transition-all duration-200 active:scale-95 shadow-2xl outline-none focus:outline-none focus:ring-0 ${activeTheme.buttonGradient} border-4 ${activeTheme.buttonBorder}`}
                            style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                            aria-label="تسبيح وصلاة على النبي"
                        >
                            <svg
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="rgba(255, 255, 255, 0.32)"
                                stroke="#ffffff"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="mb-1.5 pointer-events-none select-none"
                                style={{
                                    transformOrigin: 'center center',
                                    animation: 'heartBeatSmooth 1.6s ease-in-out infinite',
                                    overflow: 'visible'
                                }}
                            >
                                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                            </svg>
                            <span className="text-5xl sm:text-6xl font-black text-white tracking-tight drop-shadow-md select-none">صلِّ</span>
                        </button>
                    </div>

                    {/* Number and Label Cleanly Positioned Below */}
                    <div className="mt-4 mb-3 text-center">
                        <span className={`text-5xl sm:text-6xl font-black font-mono tracking-tight transition-colors duration-300 ${activeTheme.accentText} drop-shadow-sm`}>
                            {count.toLocaleString()}
                        </span>
                        <p className="text-xs font-bold text-white/50 uppercase tracking-widest mt-1">صلاة على النبي ﷺ</p>
                    </div>
                </div>

                {/* Collapsible Daily Leaderboard Section */}
                <div className="w-full max-w-md bg-black/35 rounded-[2rem] p-4 mb-6 border border-white/10 backdrop-blur-xl transition-all duration-300">
                    <button 
                      onClick={() => setIsLeaderboardOpen(!isLeaderboardOpen)}
                      className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-white/5 transition text-right"
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                              <Trophy size={16}/>
                            </div>
                            <div className="text-right min-w-0">
                                <h3 className="text-white font-black text-xs tracking-wide">متصدرو اليوم</h3>
                                <p className="text-[10px] text-white/50 font-bold">
                                  {userRank ? `ترتيبك: المركز #${userRank} (${count} صلاة)` : 'اضغط لعرض الترتيب'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {userRank === 1 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black flex items-center gap-1">
                              <Crown size={11} />
                              <span>البطل الحالي</span>
                            </span>
                          )}
                          <div className="p-1 rounded-lg bg-white/10 text-white/70">
                            {isLeaderboardOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                    </button>

                    {/* Expanded Leaderboard List */}
                    {isLeaderboardOpen && (
                      <div className="mt-3.5 pt-3 border-t border-white/10 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                          {leaders.length > 0 ? (
                              leaders.map((leader, i) => (
                                  <div 
                                    key={leader.id} 
                                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${leader.id === user.uid ? 'bg-white/15 border-white/30 shadow-md' : 'bg-white/5 border-transparent'}`}
                                  >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${i === 0 ? 'bg-amber-400 text-amber-950 shadow-md' : i === 1 ? 'bg-slate-300 text-slate-900' : i === 2 ? 'bg-amber-700 text-amber-100' : 'bg-white/10 text-white'}`}>
                                              {i === 0 ? <Crown size={13}/> : i + 1}
                                          </div>
                                          <span className={`text-xs font-bold truncate ${leader.id === user.uid ? 'text-white font-black' : 'text-white/80'}`}>
                                            {leader.name} {leader.id === user.uid && ' (أنت)'}
                                          </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="text-xs font-black text-white font-mono">{leader.count?.toLocaleString() || 0}</span>
                                          {i === 0 && <span className="text-[9px] text-amber-400 font-bold"><OutlineIcon name="crown" /></span>}
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <div className="text-center py-4 text-white/40 text-xs font-bold">
                                  كن أول المصلين اليوم واحتل الصدارة!
                              </div>
                          )}
                      </div>
                    )}
                </div>

                {/* Friday / Daily Active Badge */}
                <div className="w-full max-w-md mb-6 flex items-center justify-center">
                     <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs shadow-sm ${
                       isFriday 
                         ? 'bg-yellow-400/15 border-yellow-400/25 text-yellow-400' 
                         : 'bg-emerald-400/15 border-emerald-400/25 text-emerald-400'
                     }`}>
                         <Medal size={14}/>
                         <span className="text-[10px] font-black uppercase tracking-wider leading-none">
                           {isFriday ? 'تحدي الجمعة المباركة نشط (من فجر الخميس لمغرب الجمعة)' : 'العداد اليومي نشط على مدار 24 ساعة'}
                         </span>
                     </div>
                </div>

            </div>
        </div>
    );
};

export default ProphetChallengeModal;
