import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Crown, Trophy, Users, Award, Sparkles, Medal } from 'lucide-react';
import { db } from '../services/firebase';
import { APP_ID } from '../constants';
import { MawanEvent, UserData } from '../types';

interface Participant {
  id: string;
  name: string;
  score: number;
  photoURL?: string;
  gender?: 'male' | 'female';
}

interface EventLeaderboardPageProps {
  user: User;
  userData: UserData;
}

const LeaderboardPodium: React.FC<{ topThree: Participant[] }> = ({ topThree }) => (
    <div className="flex items-end justify-center gap-2 mb-6 h-48 pt-6">
        {/* 2nd Place */}
        {topThree[1] ? (
             <div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-6 duration-500 delay-100">
                <div className="w-18 h-18 rounded-full border-3 border-slate-300 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 shadow-lg flex items-center justify-center text-3xl mb-2 relative overflow-hidden">
                    {topThree[1].photoURL ? (
                      <img src={topThree[1].photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <span>{outlineContent(topThree[1].gender === 'female' ? "icon:user" : "icon:user")}</span>
                    )}
                    <span className="absolute bottom-0 right-0 bg-slate-400 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">2</span>
                </div>
                <div className="bg-white dark:bg-slate-800 w-full h-24 pt-2.5 pb-2 rounded-t-2xl shadow-sm text-center border-t-2 border-slate-300 border-x border-slate-100 dark:border-slate-700">
                    <h4 className="font-black text-xs text-slate-800 dark:text-white truncate px-1">{topThree[1].name}</h4>
                    <p className="text-sm font-mono font-black text-slate-500 dark:text-slate-300 mt-1">{topThree[1].score.toLocaleString()}</p>
                </div>
            </div>
        ) : <div className="w-1/3" />}

        {/* 1st Place */}
        {topThree[0] ? (
            <div className="flex flex-col items-center w-1/3 z-10 animate-in slide-in-from-bottom-8 duration-500">
                <div className="relative">
                    <Crown className="absolute -top-7 left-1/2 -translate-x-1/2 text-amber-400 fill-amber-400 animate-bounce" size={30} />
                    <div className="w-22 h-22 rounded-full border-4 border-amber-400 bg-amber-50 dark:bg-amber-900/30 shadow-xl shadow-amber-400/25 flex items-center justify-center text-4xl mb-2 relative overflow-hidden">
                         {topThree[0].photoURL ? (
                           <img src={topThree[0].photoURL} alt="User" className="w-full h-full object-cover" />
                         ) : (
                           <span>{outlineContent(topThree[0].gender === 'female' ? "icon:user" : "icon:user")}</span>
                         )}
                         <span className="absolute bottom-0 right-0 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">1</span>
                    </div>
                </div>
                <div className="bg-gradient-to-b from-amber-100 to-amber-50 dark:from-amber-950/40 dark:to-slate-800 w-full h-32 flex flex-col justify-start pt-3.5 rounded-t-2xl shadow-md text-center border-t-3 border-amber-400 border-x border-amber-200/50">
                    <h4 className="font-black text-xs sm:text-sm text-amber-950 dark:text-amber-200 truncate px-1">{topThree[0].name}</h4>
                    <p className="text-base sm:text-lg font-mono font-black text-amber-700 dark:text-amber-300 mt-1">{topThree[0].score.toLocaleString()}</p>
                </div>
            </div>
        ) : <div className="w-1/3" />}

        {/* 3rd Place */}
        {topThree[2] ? (
             <div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-4 duration-500 delay-200">
                <div className="w-18 h-18 rounded-full border-3 border-orange-400 bg-orange-50 dark:bg-orange-900/30 shadow-lg flex items-center justify-center text-3xl mb-2 relative overflow-hidden">
                    {topThree[2].photoURL ? (
                      <img src={topThree[2].photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <span>{outlineContent(topThree[2].gender === 'female' ? "icon:user" : "icon:user")}</span>
                    )}
                    <span className="absolute bottom-0 right-0 bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">3</span>
                </div>
                <div className="bg-white dark:bg-slate-800 w-full h-20 pt-2.5 pb-2 rounded-t-2xl shadow-sm text-center border-t-2 border-orange-400 border-x border-slate-100 dark:border-slate-700">
                    <h4 className="font-black text-xs text-slate-800 dark:text-white truncate px-1">{topThree[2].name}</h4>
                    <p className="text-sm font-mono font-black text-slate-500 dark:text-slate-300 mt-1">{topThree[2].score.toLocaleString()}</p>
                </div>
            </div>
        ) : <div className="w-1/3" />}
    </div>
);

const EventLeaderboardPage: React.FC<EventLeaderboardPageProps> = ({ user }) => {
    const [lastEndedEvent, setLastEndedEvent] = useState<MawanEvent | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'mawan_events'), orderBy('endTime', 'desc'));
        
        const unsub = onSnapshot(q, (snap) => {
            const allEvents = snap.docs.map(d => ({ id: d.id, ...d.data() } as MawanEvent));
            const now = new Date();
            const endedEvents = allEvents.filter(e => e.endTime.toDate() < now);

            if (endedEvents.length > 0) {
                setLastEndedEvent(endedEvents[0]);
            } else {
                setLastEndedEvent(null);
                setLoading(false);
            }
        });

        return () => unsub();
    }, []);

    useEffect(() => {
        if (!lastEndedEvent) {
            setParticipants([]);
            return;
        }
        
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'mawan_events', lastEndedEvent.id, 'participants'), orderBy('score', 'desc'), limit(50));
        const unsub = onSnapshot(q, (snap) => {
            setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Participant)));
            setLoading(false);
        });
        
        return () => unsub();
    }, [lastEndedEvent]);

    const topThree = participants.slice(0, 3);
    const rest = participants.slice(3);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Title */}
            <div className="text-center space-y-2 py-4">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-[2rem] text-white shadow-xl shadow-amber-500/20 inline-flex mx-auto mb-1">
                    <Trophy size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white drop-shadow-sm">قاعة الأبطال والمتصدرين</h2>
                {lastEndedEvent ? (
                     <p className="text-slate-500 dark:text-slate-400 text-xs font-bold max-w-xs mx-auto">
                        المتصدرون في آخر مسابقة مكتملة: <span className="text-violet-600 dark:text-violet-400">"{lastEndedEvent.title}"</span>
                     </p>
                ) : (
                     <p className="text-slate-400 text-xs font-bold">
                        لوحة الشرف وتتويج الفائزين في مسابقات معوان
                     </p>
                )}
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-400 text-xs font-bold">جاري تحميل لوحة الأبطال...</div>
            ) : lastEndedEvent && participants.length > 0 ? (
                <div className="space-y-4">
                    <LeaderboardPodium topThree={topThree} />

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
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
                <div className="text-center py-16 px-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                    <Award size={40} className="mx-auto text-amber-500" />
                    <h4 className="font-black text-base text-slate-800 dark:text-slate-200">لم تنتهِ أي مسابقة بعد</h4>
                    <p className="text-xs font-bold text-slate-400 max-w-xs mx-auto leading-relaxed">سيتم إعلان وتتويج أبطال المنافسات هنا فور اختتام الفعاليات الجارية!</p>
                </div>
            )}
        </div>
    );
};

export default EventLeaderboardPage;
