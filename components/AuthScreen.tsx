import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';

import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { auth, db } from '../services/firebase';
import { APP_ID, WELCOME_CHAR, ADMIN_EMAILS } from '../constants';

interface AuthScreenProps {
  onLogin: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '', gender: 'male' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await updateProfile(cred.user, { displayName: formData.name });
        
        const initialData: any = {
          name: formData.name, email: formData.email, gender: formData.gender,
          xp: 0, level: 1, streak: 0, tier: 'مبتدئ',
          joinedAt: serverTimestamp(), lastActive: serverTimestamp(), completedChallenges: [],
          stats: { fajrStreak: 0, totalPrayers: 0, fajrCount: 0, jamaahCount: 0, adhkarCount: 0 },
          isBlocked: false,
          showOnLeaderboard: true,
          eventStats: {
            participatedCount: 0,
            firstPlaceWins: 0,
            totalScore: 0,
            bestRank: null,
            processedEvents: []
          }
        };

        // Check if the new user's email is in the admin list
        if (ADMIN_EMAILS.includes(formData.email.toLowerCase())) {
            initialData.isAdmin = true;
        }

        await setDoc(doc(db, 'artifacts', APP_ID, 'users', cred.user.uid, 'stats', 'profile'), initialData);
        
        const leaderboardData: any = {
          name: formData.name, xp: 0, tier: 'مبتدئ', gender: formData.gender,
          email: formData.email,
          isAdmin: initialData.isAdmin || false,
          isBlocked: false
        };
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaderboard', cred.user.uid), leaderboardData);
      }
      onLogin();
    } catch (err: any) { 
        let msg = "حدث خطأ ما";
        if (err.code === 'auth/wrong-password') msg = "كلمة المرور غير صحيحة";
        if (err.code === 'auth/user-not-found') msg = "البريد الإلكتروني غير مسجل";
        if (err.code === 'auth/email-already-in-use') msg = "البريد الإلكتروني مستخدم بالفعل";
        setError(msg); 
    } finally { 
        setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white w-full max-w-md p-6 rounded-3xl shadow-xl border border-slate-100 relative">
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 w-32 h-32">
            <img src={WELCOME_CHAR} alt="Welcome" className="w-full h-full object-contain drop-shadow-lg"/>
        </div>
        <div className="mt-12 mb-6 text-center">
            <h2 className="text-2xl font-bold text-slate-800">{isLogin ? 'مرحباً بعودتك' : 'حساب جديد'}</h2>
            <p className="text-slate-400 text-sm">رفيقك في رحلة الطاعة</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-bold text-center">{error}</div>}
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <input type="text" placeholder="الاسم" required className="w-full p-4 border border-slate-200 rounded-xl" onChange={e => setFormData({...formData, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setFormData({...formData, gender: 'male'})} className={`p-3 rounded-xl border ${formData.gender === 'male' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white'}`}><OutlineIcon name="user" /> ذكر</button>
                <button type="button" onClick={() => setFormData({...formData, gender: 'female'})} className={`p-3 rounded-xl border ${formData.gender === 'female' ? 'bg-pink-50 border-pink-500 text-pink-700' : 'bg-white'}`}><OutlineIcon name="user" /> أنثى</button>
              </div>
            </>
          )}
          <input type="email" placeholder="البريد" required className="w-full p-4 border border-slate-200 rounded-xl" onChange={e => setFormData({...formData, email: e.target.value})} />
          <input type="password" placeholder="كلمة المرور" required className="w-full p-4 border border-slate-200 rounded-xl" onChange={e => setFormData({...formData, password: e.target.value})} />
          <button disabled={loading} className="w-full bg-violet-600 text-white p-4 rounded-xl font-bold hover:bg-violet-700">{loading ? '...' : (isLogin ? 'دخول' : 'انشاء حساب')}</button>
        </form>
        <p onClick={() => setIsLogin(!isLogin)} className="text-center mt-6 text-violet-600 font-bold cursor-pointer">
           {isLogin ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;