import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';
import React from 'react';
import { User } from 'firebase/auth';
import { UserData } from '../types';
import { Award, Shield, Star, BarChart2, LogOut, Trophy, Flame, Sparkles } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

interface EventProfilePageProps {
  user: User;
  userData: UserData;
}

const StatCard: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  gradient: string; 
}> = ({ icon, label, value, gradient }) => (
  <div className="bg-white dark:bg-slate-900 p-4.5 rounded-[2.2rem] flex items-center gap-3.5 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all text-right">
    <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradient} text-white flex-shrink-0 shadow-md`}>
        {outlineContent(icon)}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{label}</p>
      <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate font-mono mt-0.5">{value}</p>
    </div>
  </div>
);

const EventProfilePage: React.FC<EventProfilePageProps> = ({ user, userData }) => {
  const stats = userData.eventStats || {
    participatedCount: 0,
    firstPlaceWins: 0,
    totalScore: 0,
    bestRank: null,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Profile Header */}
      <div className="relative pt-4 pb-2 text-center">
        <div className="relative inline-block mb-3">
           <div className="w-24 h-24 rounded-[2.2rem] bg-gradient-to-br from-violet-600 to-indigo-600 p-1 shadow-xl shadow-violet-500/25">
              <div className="w-full h-full rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center">
                  {userData.photoURL ? (
                      <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                      <div className="text-4xl">{outlineContent(userData.gender === 'female' ? "icon:user" : "icon:user")}</div>
                  )}
              </div>
           </div>
           <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 p-1.5 rounded-xl shadow-lg border-2 border-white dark:border-slate-900">
              <Trophy size={16} />
           </div>
        </div>
        
        <div className="space-y-0.5">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{userData.name || user.displayName || 'مستخدم'}</h2>
          <p className="text-slate-400 text-xs font-bold font-mono">{user.email}</p>
        </div>
      </div>

      {/* Level/Tier Section */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden border border-violet-500/20 text-right">
           <div className="absolute inset-0 bg-[url('/assets/patterns/cubes.png')] opacity-10 pointer-events-none" />
           <div className="relative z-10 flex justify-between items-center mb-4">
               <div>
                  <p className="text-[10px] font-black text-violet-300 tracking-wider uppercase mb-1">الرتبة والمستوى العام</p>
                  <h3 className="text-2xl font-black text-white font-mono">{(userData.xp || 0).toLocaleString()} <span className="text-xs font-sans text-violet-300">XP</span></h3>
               </div>
               <div className="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-black text-amber-300">
                 {userData.tier || 'مبتدئ'}
               </div>
           </div>
      </div>

      {/* Stats Section */}
      <div className="space-y-3">
         <h3 className="font-black text-slate-800 dark:text-white text-base px-1 flex items-center gap-2 text-right">
              <BarChart2 className="text-violet-500" size={18} /> 
              <span>سجل بطولات وفعاليات معوان</span>
         </h3>
         <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Award size={18} />} label="المشاركات" value={(stats.participatedCount || 0).toString()} gradient="from-violet-600 to-indigo-600" />
            <StatCard icon={<Shield size={18} />} label="المركز الأول " value={(stats.firstPlaceWins || 0).toString()} gradient="from-amber-500 to-orange-600" />
            <StatCard icon={<Star size={18} />} label="مجموع النقاط" value={(stats.totalScore || 0).toLocaleString()} gradient="from-emerald-500 to-teal-600" />
            <StatCard icon={<Trophy size={18} />} label="أعلى ترتيب" value={stats.bestRank ? `#${stats.bestRank}` : '--'} gradient="from-fuchsia-600 to-pink-600" />
         </div>
      </div>
    </div>
  );
};

export default EventProfilePage;
