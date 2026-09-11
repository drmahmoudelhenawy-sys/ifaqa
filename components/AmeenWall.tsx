import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { Send, Heart, User as UserIcon, Sparkles, Clock, Cloud, Quote, ShieldAlert, UserX } from 'lucide-react';
import { db } from '../services/firebase';
import { APP_ID, XP_RULES } from '../constants';
import { Dua, UserData } from '../types';

interface AmeenWallProps {
  user: User;
  updateStats: (amount: number) => void;
  isAdmin?: boolean;
}

const AmeenWall: React.FC<AmeenWallProps> = ({ user, updateStats }) => {
  const [duas, setDuas] = useState<Dua[]>([]);
  const [newDua, setNewDua] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
      // Check admin status locally (quick check)
      // A more robust check is done in parent, but this suffices for UI toggle
      const checkAdmin = async () => {
         // Logic relies on UserData passed down usually, assuming isAdmin prop or fetching
         // For now, we'll fetch from snapshot listener in parent usually
      };
      // Temporary: check local storage or assume passed prop (updated component signature)
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'ameen_wall'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      setDuas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Dua)));
    });

    // Check if current user is admin
    const adminUnsub = onSnapshot(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile'), (snap) => {
        if(snap.exists() && snap.data().isAdmin) setIsAdmin(true);
    });

    return () => { unsub(); adminUnsub(); };
  }, [user.uid]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDua.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'ameen_wall'), {
        userId: user.uid,
        userName: isAnonymous ? 'فاعل خير' : (user.displayName || 'مستخدم'),
        realName: user.displayName || 'Unknown', // Stored for admin view
        text: newDua.trim(),
        ameenCount: 0,
        timestamp: serverTimestamp(),
        ameenedBy: []
      });
      setNewDua('');
      updateStats(XP_RULES.POST_DUA);
      if(navigator.vibrate) navigator.vibrate(50);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAmeen = async (dua: Dua) => {
    if (dua.ameenedBy.includes(user.uid)) return;

    if(navigator.vibrate) navigator.vibrate(30);
    updateStats(XP_RULES.AMEEN);

    const duaRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'ameen_wall', dua.id);
    await updateDoc(duaRef, {
      ameenCount: increment(1),
      ameenedBy: arrayUnion(user.uid)
    });

    const userRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile');
    await updateDoc(userRef, {
       'stats.ameenCount': increment(1)
    });
  };

  const handleBlockUser = async (targetUserId: string, targetName: string) => {
      if(!window.confirm(`هل أنت متأكد من حظر المستخدم ${targetName}؟`)) return;
      await updateDoc(doc(db, 'artifacts', APP_ID, 'users', targetUserId, 'stats', 'profile'), { isBlocked: true });
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaderboard', targetUserId), { isBlocked: true });
      alert("تم حظر المستخدم");
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'الآن';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return "منذ " + Math.floor(interval) + " سنة";
    interval = seconds / 2592000;
    if (interval > 1) return "منذ " + Math.floor(interval) + " شهر";
    interval = seconds / 86400;
    if (interval > 1) return "منذ " + Math.floor(interval) + " يوم";
    interval = seconds / 3600;
    if (interval > 1) return "منذ " + Math.floor(interval) + " ساعة";
    interval = seconds / 60;
    if (interval > 1) return "منذ " + Math.floor(interval) + " دقيقة";
    return "منذ قليل";
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/assets/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
             <h2 className="font-bold text-xl mb-1 flex items-center gap-2"><Sparkles className="text-yellow-300" size={20}/> حائط الدعاء</h2>
             <p className="text-violet-100 text-sm opacity-90 max-w-xs leading-relaxed">ادعُ لنفسك ولإخوانك بظهر الغيب، ولك بالمثل إن شاء الله.</p>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-800 p-1 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
        <form onSubmit={handlePost} className="bg-slate-50 dark:bg-slate-900 rounded-[1.8rem] p-4">
          <textarea
            value={newDua}
            onChange={(e) => setNewDua(e.target.value)}
            placeholder="اكتب دعاءً يلامس قلبك..."
            className="w-full bg-transparent border-none focus:ring-0 min-h-[80px] text-slate-800 dark:text-white placeholder:text-slate-400 resize-none text-base leading-relaxed"
            maxLength={300}
          />
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
             <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${isAnonymous ? 'bg-slate-800 text-white dark:bg-slate-600' : 'bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100'}`}
             >
                <UserIcon size={14}/> {isAnonymous ? 'مجهول' : 'باسمك'}
             </button>
             <button
                type="submit"
                disabled={loading || !newDua.trim()}
                className="bg-violet-600 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-violet-700 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-violet-500/20 text-sm"
             >
                {loading ? '...' : <><Send size={16} className="rtl:rotate-180"/> انشر</>}
             </button>
          </div>
        </form>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {duas.length === 0 ? (
            <div className="text-center py-12 opacity-60">
                <Cloud size={48} className="mx-auto text-slate-300 mb-4"/>
                <p className="text-slate-500">لا يوجد دعوات بعد، كن أول المبادرين!</p>
            </div>
        ) : (
            duas.map((dua, idx) => {
                const isMe = dua.userId === user.uid;
                const hasAmeened = dua.ameenedBy.includes(user.uid);
                
                return (
                    <div key={dua.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-bottom-4 transition-transform hover:scale-[1.01]" style={{animationDelay: `${idx * 50}ms`}}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm ${isMe ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                                    {outlineContent(isMe ? "icon:user" : "icon:handheart")}
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                        {dua.userName}
                                        {isMe && <span className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">أنت</span>}
                                        {/* Admin specific view */}
                                        {isAdmin && !isMe && (
                                            <span className="text-[9px] text-red-400 ml-2">({(dua as any).realName || 'Unknown'})</span>
                                        )}
                                    </h4>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                        <Clock size={10}/>
                                        <span>{getTimeAgo(dua.timestamp)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {isAdmin && !isMe && (
                                <button onClick={() => handleBlockUser(dua.userId, dua.userName)} className="text-red-300 hover:text-red-500 p-2">
                                    <UserX size={16}/>
                                </button>
                            )}
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl mb-4 relative">
                             {/* Quote decoration */}
                             <Quote size={20} className="absolute -top-2 -right-2 text-slate-200 dark:text-slate-700" />
                             <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm whitespace-pre-wrap relative z-10 font-medium">
                                {dua.text}
                             </p>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400 font-medium">
                                {dua.ameenCount > 0 ? `${dua.ameenCount} شخص أمنوا على دعائك` : 'كن أول من يؤمن'}
                            </span>
                            <button
                                onClick={() => handleAmeen(dua)}
                                disabled={hasAmeened}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 border ${hasAmeened ? 'bg-emerald-500 text-white border-transparent' : 'bg-white border-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100 dark:bg-slate-700/50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300'}`}
                            >
                                <Heart size={18} className={`transition-colors ${hasAmeened ? 'fill-white' : ''}`} />
                                {hasAmeened ? 'تم التأمين' : 'أمين'}
                            </button>
                        </div>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};

export default AmeenWall;
