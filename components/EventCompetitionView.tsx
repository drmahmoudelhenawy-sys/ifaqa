import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  doc, onSnapshot, setDoc, collection, query, orderBy, limit, increment, 
  serverTimestamp, updateDoc, getDocs, arrayUnion, getDoc 
} from 'firebase/firestore';
import { 
  ArrowLeft, Book, ChevronRight, X, Trophy, Crown, Users, Zap, 
  CheckCircle2, Sparkles, Flame, Clock, Award, Shield, Star
} from 'lucide-react';
import * as Icons from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../services/firebase';
import { APP_ID } from '../constants';
import { MawanEvent, Zekr, UserData } from '../types';

interface Participant {
  id: string;
  name: string;
  score: number;
  photoURL?: string;
  gender?: 'male' | 'female';
}

const Countdown: React.FC<{ targetDate: Date; isEnded: boolean }> = ({ targetDate, isEnded }) => {
    const calculateTimeLeft = () => {
        const difference = targetDate.getTime() - new Date().getTime();
        if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        return {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60),
        };
    };
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        if (isEnded) return;
        const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
        return () => clearInterval(timer);
    }, [isEnded, targetDate]);

    if (isEnded) {
        return (
          <div className="inline-flex items-center gap-2 text-sm font-black text-rose-600 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-950/40 px-5 py-2 rounded-2xl border border-rose-300/40">
            <Clock size={16} />
            <span>انتهت الفعالية وتم تثبيت النتائج</span>
          </div>
        );
    }

    return (
        <div className="flex justify-center gap-2 text-slate-800 dark:text-white">
            {[
              { label: 'يوم', val: timeLeft.days },
              { label: 'ساعة', val: timeLeft.hours },
              { label: 'دقيقة', val: timeLeft.minutes },
              { label: 'ثانية', val: timeLeft.seconds }
            ].map((item, idx) => (
                <div key={idx} className="w-14 h-16 bg-white/10 backdrop-blur-md dark:bg-slate-800/80 rounded-2xl flex flex-col items-center justify-center border border-white/10 shadow-inner">
                    <span className="text-xl font-black font-mono tracking-tight">{item.val.toString().padStart(2, '0')}</span>
                    <span className="text-[9px] font-bold opacity-60 mt-0.5">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

const EventAdhkarCounter: React.FC<{
  zekr: Zekr;
  onTap: (xp: number, zekrId: string) => void;
  isEnded: boolean;
  myCount: number;
}> = ({ zekr, onTap, isEnded, myCount }) => {
  const [scale, setScale] = useState(1);
  const [ripples, setRipples] = useState<number[]>([]);

  const handleClick = () => {
    if (isEnded) return;
    setScale(0.96);
    setTimeout(() => setScale(1), 100);
    
    setRipples(prev => [...prev.slice(-3), Date.now()]);
    onTap(zekr.xp, zekr.id);

    if (navigator.vibrate) navigator.vibrate(20);

    // Combo milestones
    if ((myCount + 1) % 50 === 0) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#8b5cf6', '#10b981', '#f59e0b']
        });
      } catch {}
    }
  };

  return (
    <div 
        className={`relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-[2.2rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-all duration-200 select-none ${
          isEnded ? 'opacity-70' : 'cursor-pointer hover:shadow-md active:scale-[0.98]'
        }`}
        style={{ transform: `scale(${scale})` }}
        onClick={handleClick}
    >
        <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-black text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30 px-3 py-1 rounded-full font-mono">
              +{zekr.xp} نقطة لكل تسبيحة
            </span>
            
            {myCount > 0 && (
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full font-mono flex items-center gap-1">
                <Sparkles size={13} />
                <span>سبّحت: {myCount.toLocaleString()}</span>
              </span>
            )}
        </div>

        <p 
          className="font-black text-slate-800 dark:text-slate-100 text-lg sm:text-xl leading-loose mb-4 min-h-[3rem] font-serif select-text"
          style={{
            textAlign: 'justify',
            textJustify: 'inter-word',
            textAlignLast: 'center',
            lineHeight: 2.2,
          }}
        >
          {zekr.text}
        </p>

        {zekr.fadl && (
          <p 
            className="text-xs text-slate-400 dark:text-slate-500 font-bold mb-4 select-text"
            style={{
              textAlign: 'justify',
              textJustify: 'inter-word',
              textAlignLast: 'right',
              lineHeight: 1.8,
            }}
          >
            {zekr.fadl}
          </p>
        )}
        
        <button
            disabled={isEnded}
            className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
              isEnded 
                ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500' 
                : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-violet-600/20 active:scale-95'
            }`}
        >
            <CheckCircle2 size={20} className={myCount > 0 ? "text-emerald-300" : "text-white"} />
            <span>{isEnded ? 'انتهت المسابقة' : 'اضغط للتسبيح واكتساب النقاط'}</span>
        </button>
    </div>
  );
};

const LeaderboardPodium: React.FC<{ topThree: Participant[] }> = ({ topThree }) => (
    <div className="flex items-end justify-center gap-2 mb-4 h-48 pt-6">
        {/* 2nd Place */}
        {topThree[1] ? (
             <div className="flex flex-col items-center w-1/3">
                <div className="w-16 h-16 rounded-full border-3 border-slate-300 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 shadow-md flex items-center justify-center text-3xl mb-2 relative overflow-hidden">
                    {topThree[1].photoURL ? (
                      <img src={topThree[1].photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <span>{outlineContent(topThree[1].gender === 'female' ? "icon:user" : "icon:user")}</span>
                    )}
                    <span className="absolute bottom-0 right-0 bg-slate-400 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">2</span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 w-full h-24 pt-2.5 pb-2 rounded-t-2xl shadow-inner text-center border-t-2 border-slate-300">
                    <h4 className="font-black text-xs text-slate-800 dark:text-white truncate px-1">{topThree[1].name}</h4>
                    <p className="text-sm font-mono font-black text-slate-600 dark:text-slate-300 mt-1">{topThree[1].score.toLocaleString()}</p>
                </div>
            </div>
        ) : <div className="w-1/3" />}

        {/* 1st Place */}
        {topThree[0] ? (
            <div className="flex flex-col items-center w-1/3 z-10">
                <div className="relative">
                    <Crown className="absolute -top-7 left-1/2 -translate-x-1/2 text-amber-400 fill-amber-400 animate-bounce" size={28} />
                    <div className="w-20 h-20 rounded-full border-4 border-amber-400 bg-amber-50 dark:bg-amber-900/30 shadow-xl shadow-amber-400/20 flex items-center justify-center text-4xl mb-2 relative overflow-hidden">
                         {topThree[0].photoURL ? (
                           <img src={topThree[0].photoURL} alt="User" className="w-full h-full object-cover" />
                         ) : (
                           <span>{outlineContent(topThree[0].gender === 'female' ? "icon:user" : "icon:user")}</span>
                         )}
                         <span className="absolute bottom-0 right-0 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">1</span>
                    </div>
                </div>
                <div className="bg-gradient-to-b from-amber-100 to-amber-50 dark:from-amber-950/40 dark:to-slate-800 w-full h-32 flex flex-col justify-start pt-3.5 rounded-t-2xl shadow-lg text-center border-t-3 border-amber-400">
                    <h4 className="font-black text-xs sm:text-sm text-amber-950 dark:text-amber-200 truncate px-1">{topThree[0].name}</h4>
                    <p className="text-base sm:text-lg font-mono font-black text-amber-700 dark:text-amber-300 mt-1">{topThree[0].score.toLocaleString()}</p>
                </div>
            </div>
        ) : <div className="w-1/3" />}

        {/* 3rd Place */}
        {topThree[2] ? (
             <div className="flex flex-col items-center w-1/3">
                <div className="w-16 h-16 rounded-full border-3 border-orange-400 bg-orange-50 dark:bg-orange-900/30 shadow-md flex items-center justify-center text-3xl mb-2 relative overflow-hidden">
                    {topThree[2].photoURL ? (
                      <img src={topThree[2].photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <span>{outlineContent(topThree[2].gender === 'female' ? "icon:user" : "icon:user")}</span>
                    )}
                    <span className="absolute bottom-0 right-0 bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">3</span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 w-full h-20 pt-2.5 pb-2 rounded-t-2xl shadow-inner text-center border-t-2 border-orange-400">
                    <h4 className="font-black text-xs text-slate-800 dark:text-white truncate px-1">{topThree[2].name}</h4>
                    <p className="text-sm font-mono font-black text-slate-600 dark:text-slate-300 mt-1">{topThree[2].score.toLocaleString()}</p>
                </div>
            </div>
        ) : <div className="w-1/3" />}
    </div>
);

interface EventCompetitionViewProps {
  event: MawanEvent;
  user: User;
  userData: UserData;
  onBack: () => void;
}

const EventCompetitionView: React.FC<EventCompetitionViewProps> = ({ event, user, userData, onBack }) => {
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [myProgress, setMyProgress] = useState<{ score: number, tasks: {[key: string]: number} }>({ score: 0, tasks: {} });
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  const eventRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'mawan_events', event.id);
  const participantRef = doc(eventRef, 'participants', user.uid);
  const userProfileRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile');

  const isEnded = new Date() > event.endTime.toDate();

  useEffect(() => {
    const unsubProgress = onSnapshot(participantRef, (docSnap) => {
        if (docSnap.exists()) setIsParticipant(true); else setIsParticipant(false);
        setMyProgress(docSnap.data() as any || { score: 0, tasks: {} });
    });
    
    const q = query(collection(eventRef, 'participants'), orderBy('score', 'desc'), limit(50));
    const unsubLeaderboard = onSnapshot(q, (snap) => {
        setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Participant)));
    });

    const processEventResults = async () => {
        if (!isEnded) return;

        const userProfileSnap = await getDoc(userProfileRef);
        if (!userProfileSnap.exists()) return;

        const profileData = userProfileSnap.data() as UserData;
        const isUserParticipant = (await getDoc(participantRef)).exists();
        const processedEvents = profileData.eventStats?.processedEvents || [];

        if (isUserParticipant && !processedEvents.includes(event.id)) {
            const qAll = query(collection(eventRef, 'participants'), orderBy('score', 'desc'));
            const allParticipantsSnap = await getDocs(qAll);
            const myRank = allParticipantsSnap.docs.findIndex(d => d.id === user.uid) + 1;

            if (myRank > 0) {
                const currentBestRank = profileData.eventStats?.bestRank;
                const newBestRank = currentBestRank ? Math.min(currentBestRank, myRank) : myRank;
                const updates: any = {
                    'eventStats.bestRank': newBestRank,
                    'eventStats.processedEvents': arrayUnion(event.id)
                };
                if (myRank === 1) {
                    updates['eventStats.firstPlaceWins'] = increment(1);
                }
                await updateDoc(userProfileRef, updates);
            } else {
                await updateDoc(userProfileRef, { 'eventStats.processedEvents': arrayUnion(event.id) });
            }
        }
    };

    processEventResults();

    return () => { unsubProgress(); unsubLeaderboard(); };
  }, [event.id, user.uid, isEnded]);

  const handleJoin = async () => {
      await setDoc(participantRef, {
          name: userData.name || user.displayName || 'مشارك', 
          photoURL: userData.photoURL || null, 
          gender: userData.gender || 'male',
          score: 0, 
          tasks: {}, 
          joinedAt: serverTimestamp()
      });
      await updateDoc(userProfileRef, { 'eventStats.participatedCount': increment(1) });
      if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
  };

  const handleTap = async (xp: number, zekrId: string) => {
      if (isEnded) return;
      
      // Update local optimistic state first
      setMyProgress(prev => ({
        score: (prev.score || 0) + xp,
        tasks: {
          ...(prev.tasks || {}),
          [zekrId]: ((prev.tasks || {})[zekrId] || 0) + 1
        }
      }));

      try {
        await updateDoc(participantRef, { score: increment(xp), [`tasks.${zekrId}`]: increment(1) });
        await updateDoc(userProfileRef, { 'eventStats.totalScore': increment(xp) });
      } catch (e) {
        console.warn('Competition tap sync queued:', e);
      }
  };

  const Icon = (Icons as any)[event.icon] || Icons.Star;
  const topThree = participants.slice(0, 3);
  const rest = participants.slice(3);

  const myRankIndex = participants.findIndex(p => p.id === user.uid);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col font-sans overflow-hidden animate-in fade-in duration-300">
        {/* Top Safe Area Bar */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-4 pb-3 pt-[max(env(safe-area-inset-top,0px),12px)] flex items-center justify-between z-30 shadow-sm">
          <button 
            onClick={onBack} 
            className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 text-slate-700 dark:text-slate-300 flex-shrink-0"
            aria-label="رجوع"
          >
            <ChevronRight size={22} />
          </button>

          <div className="text-center min-w-0 flex-1 px-2">
            <h2 className="font-black text-base sm:text-lg text-slate-800 dark:text-white truncate">{event.title}</h2>
            <p className="text-[10px] text-slate-400 font-bold">ساحة المنافسة المباشرة والتسبيح</p>
          </div>

          <button 
            onClick={() => setShowRulesModal(true)} 
            className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition active:scale-95 flex-shrink-0"
            aria-label="القواعد"
          >
            <Book size={18} />
          </button>
        </div>

        {/* Scrollable Arena Body */}
        <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-5 pb-24">
            {/* Event Hero Header Card */}
            <div className={`relative rounded-[2.5rem] p-6 text-white overflow-hidden shadow-xl border border-white/20 ${event.gradient ? `bg-gradient-to-br ${event.gradient}` : 'bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-950'}`}>
                <div className="absolute inset-0 bg-[url('/assets/patterns/cubes.png')] opacity-15 mix-blend-overlay pointer-events-none" />
                
                <div className="relative z-10 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto shadow-inner">
                      <Icon size={28} className="text-white drop-shadow-md" />
                    </div>

                    <div>
                      <h1 className="text-2xl font-black tracking-tight">{event.title}</h1>
                      {event.description && (
                        <p className="text-xs text-white/80 font-bold max-w-sm mx-auto mt-1 leading-relaxed">{event.description}</p>
                      )}
                    </div>

                    <Countdown targetDate={event.endTime.toDate()} isEnded={isEnded} />

                    <div className="flex justify-center items-center gap-2 pt-1">
                        <div className="flex items-center gap-1.5 text-xs bg-black/25 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                            <Users size={14} className="text-amber-300" />
                            <span className="font-mono font-black">{participants.length}</span>
                            <span className="font-bold">مشارك</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Participation Banner / Controls */}
            {!isParticipant ? (
                <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-sm border border-slate-100 dark:border-slate-800 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto text-violet-600 dark:text-violet-300">
                      <Zap size={28} />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-slate-800 dark:text-white">انضم الآن للمنافسة!</h3>
                      <p className="text-xs font-bold text-slate-400 mt-1">اضغط زر الانضمام لبدء تسجيل النقاط والتسبيح في هذه الفعالية.</p>
                    </div>
                    <button 
                      onClick={handleJoin} 
                      className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-violet-600/25 active:scale-95 transition-all"
                    >
                      
                      انضمام للمسابقة الآن <OutlineIcon name="rocket" />
                    </button>
                </div>
            ) : (
                <>
                  {/* User Live Rank Floating Box */}
                  <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 text-white p-4.5 rounded-[2rem] shadow-lg shadow-violet-600/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-mono font-black text-lg">
                            {myRank ? `#${myRank}` : '--'}
                          </div>
                          <div>
                            <p className="text-[11px] text-violet-200 font-bold">ترتيبك في الفعالية</p>
                            <p className="text-sm font-black text-white">{userData.name || user.displayName || 'أنت'}</p>
                          </div>
                      </div>
                      <div className="text-left">
                          <p className="text-lg font-black font-mono">{(myProgress.score || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-violet-200 font-bold">نقطة مسجلة</p>
                      </div>
                  </div>

                  {/* Adhkar Tasks List */}
                  <div className="space-y-3 pt-1">
                      <h3 className="font-black text-base text-slate-800 dark:text-white flex items-center gap-2">
                        <Sparkles size={18} className="text-violet-500" />
                        <span>قائمة أذكار وتحديات الفعالية</span>
                      </h3>

                      <div className="grid gap-3">
                          {event.adhkar && event.adhkar.length > 0 ? (
                            event.adhkar.map((zekr) => (
                              <EventAdhkarCounter 
                                key={zekr.id} 
                                zekr={zekr} 
                                onTap={handleTap} 
                                isEnded={isEnded} 
                                myCount={(myProgress.tasks || {})[zekr.id] || 0} 
                              />
                            ))
                          ) : (
                            <p className="text-center py-6 text-xs text-slate-400 font-bold">لا توجد أذكار مخصصة لهذه الفعالية بعد.</p>
                          )}
                      </div>
                  </div>
                </>
            )}

            {/* Live Leaderboard Section */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-black text-base text-slate-800 dark:text-white flex items-center gap-2">
                      <Trophy size={18} className="text-amber-500" />
                      <span>لوحة الصدارة والمتصدرون</span>
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400">تحديث مباشر</span>
                </div>

                {participants.length > 0 ? (
                    <div>
                        <LeaderboardPodium topThree={topThree} />
                        
                        <div className="space-y-2 pt-2">
                            {rest.map((p, i) => (
                                <div 
                                    key={p.id} 
                                    className={`flex items-center gap-3.5 p-3 rounded-2xl transition-all ${
                                      p.id === user.uid 
                                        ? 'bg-violet-50 dark:bg-violet-950/40 border border-violet-300/40 dark:border-violet-700/40' 
                                        : 'bg-slate-50 dark:bg-slate-800/50'
                                    }`}
                                >
                                    <span className="w-7 text-center font-mono font-black text-xs text-slate-400">{i + 4}</span>
                                    
                                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                      {p.photoURL ? (
                                        <img src={p.photoURL} className="w-full h-full object-cover" alt={p.name} />
                                      ) : (
                                        <span className="text-base">{outlineContent(p.gender === 'female' ? "icon:user" : "icon:user")}</span>
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-xs text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                                        {p.id === user.uid && <p className="text-[10px] text-violet-600 dark:text-violet-400 font-bold">أنت</p>}
                                    </div>

                                    <div className="text-left">
                                        <p className="font-mono font-black text-sm text-slate-800 dark:text-slate-100">{p.score.toLocaleString()}</p>
                                        <p className="text-[9px] text-slate-400 font-bold">نقطة</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs font-bold">
                    كن أول من يسبّح وينضم للوحة الشرف في هذه الفعالية!
                  </div>
                )}
            </div>
        </div>

        {/* Rules Modal */}
        {showRulesModal && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800 text-right">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                  <Book size={20} className="text-violet-500" />
                  <span>قواعد الفعالية</span>
                </h3>
                <button 
                  onClick={() => setShowRulesModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 font-bold space-y-2.5 leading-relaxed">
                <p>• الفعالية مستمرة حتى انتهاء وقت العد التنازلي.</p>
                <p>• كل ضغطة تسبيح تحتسب لك نقاطاً فورية وتُرفع في لوحة الصدارة المباشرة.</p>
                <p>• الفائزون بالمراكز الثلاثة الأولى يحصلون على أوسمة تميز في ملفاتهم الشخصية.</p>
                <p>• التنافس هدفه الأول هو التقرب إلى الله وكسب الأجر المضاعف.</p>
              </div>

              <button 
                onClick={() => setShowRulesModal(false)}
                className="w-full py-3.5 bg-violet-600 text-white rounded-2xl font-black text-sm shadow-md"
              >
                
                فهمت القواعد <OutlineIcon name="hand" />
              </button>
            </div>
          </div>
        )}
    </div>
  );
};

export default EventCompetitionView;