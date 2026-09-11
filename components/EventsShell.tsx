import React, { useCallback, useState } from 'react';
import { User } from 'firebase/auth';
import { Sparkles, Zap, Trophy, User as UserIcon, ChevronRight } from 'lucide-react';
import { UserData } from '../types';
import MawanEventsPage from './MawanEventsPage';
import EventChallengesPage from './EventChallengesPage';
import EventLeaderboardPage from './EventLeaderboardPage';
import EventProfilePage from './EventProfilePage';
import EventsIntro from './EventsIntro';

interface EventsShellProps {
  user: User;
  userData: UserData;
  onExit: () => void;
}

type EventTab = 'events' | 'challenges' | 'leaderboards' | 'profile';

const EventsShell: React.FC<EventsShellProps> = ({ user, userData, onExit }) => {
  const [activeTab, setActiveTab] = useState<EventTab>('events');
  const [showIntro, setShowIntro] = useState(false); // Only show if explicit
  const handleFinishIntro = useCallback(() => {
    setShowIntro(false);
  }, []);
  
  const tabTitles: { [key in EventTab]: string } = {
    events: 'فعاليات ومسابقات معوان',
    challenges: 'دليل التحديات والمنافسة',
    leaderboards: 'قاعة الأبطال والمتصدرين',
    profile: 'إحصائياتي في معوان'
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'events':
        return <MawanEventsPage user={user} userData={userData} />;
      case 'challenges':
        return <EventChallengesPage />;
      case 'leaderboards':
        return <EventLeaderboardPage user={user} userData={userData} />;
      case 'profile':
        return <EventProfilePage user={user} userData={userData} />;
      default:
        return <MawanEventsPage user={user} userData={userData} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden animate-in fade-in duration-300">
      {showIntro && <EventsIntro onFinish={handleFinishIntro} />}
       
      {/* Top Persistent Safe Header */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-4 pb-3 pt-[max(env(safe-area-inset-top,0px),12px)] flex items-center justify-between z-30 shadow-sm">
        <button 
            onClick={onExit} 
            className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 text-slate-700 dark:text-slate-300 flex-shrink-0"
            aria-label="العودة للرئيسية"
        >
          <ChevronRight size={22} />
        </button>

        <div className="text-center min-w-0 flex-1 px-2">
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
              {tabTitles[activeTab]}
          </h1>
          <p className="text-[10px] text-slate-400 font-bold">بوابة التنافس الإسلامي في الطاعات</p>
        </div>

        <div className="w-10" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full pb-28">
        {renderContent()}
      </div>

      {/* Modern Floating Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 pb-[max(env(safe-area-inset-bottom,0px),8px)] shadow-lg">
        <nav className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
          <NavBtn icon={Sparkles} label="الفعاليات" active={activeTab === 'events'} onClick={() => setActiveTab('events')} />
          <NavBtn icon={Zap} label="التحديات" active={activeTab === 'challenges'} onClick={() => setActiveTab('challenges')} />
          <NavBtn icon={Trophy} label="المتصدرون" active={activeTab === 'leaderboards'} onClick={() => setActiveTab('leaderboards')} />
          <NavBtn icon={UserIcon} label="حسابي" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </nav>
      </div>
    </div>
  );
};

const NavBtn = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={() => {
      if (navigator.vibrate) navigator.vibrate(10);
      onClick();
    }}
    className={`flex flex-col items-center justify-center gap-1 w-1/4 h-full transition-all duration-200 ${
      active 
        ? 'text-violet-600 dark:text-violet-400 scale-105' 
        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
    }`}
  >
    <div className={`p-2 rounded-2xl transition-all duration-300 ${active ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 shadow-sm' : ''}`}>
        <Icon size={19} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className="text-[10px] font-bold whitespace-nowrap">{label}</span>
  </button>
);

export default EventsShell;
