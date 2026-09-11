import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { 
  Sparkles, Star, Calendar, Trophy, BookOpen, Clock, Edit, Plus, 
  ArrowRight, Users, Flame, ChevronLeft, ShieldAlert, Award, Compass 
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { MawanEvent, UserData } from '../types';
import { db } from '../services/firebase';
import { APP_ID, ADMIN_UIDS } from '../constants';
import EventCompetitionView from './EventCompetitionView';
import AdminEventModal from './AdminEventModal';

const ICONS: { [key: string]: React.ElementType } = {
  Star, Calendar, Trophy, BookOpen, Sparkles, Flame, Award, Compass
};

const SkeletonCard: React.FC = () => (
    <div className="relative rounded-[2.2rem] overflow-hidden p-6 bg-slate-200/80 dark:bg-slate-800/80 animate-pulse space-y-4">
        <div className="flex justify-between items-center">
            <div className="w-20 h-7 bg-slate-300 dark:bg-slate-700 rounded-full" />
            <div className="w-8 h-8 bg-slate-300 dark:bg-slate-700 rounded-xl" />
        </div>
        <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded-lg w-3/4" />
        <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded-lg w-1/2" />
        <div className="h-12 bg-slate-300 dark:bg-slate-700 rounded-2xl w-full pt-2" />
    </div>
);

const EventCard: React.FC<{ 
  event: MawanEvent; 
  onClick: () => void; 
  onEdit: () => void; 
  isAdmin: boolean; 
  isFeatured?: boolean;
}> = ({ event, onClick, onEdit, isAdmin, isFeatured }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (event.status === 'ended') {
        setTimeLeft('انتهت الفعالية');
        return;
    }

    const updateTimer = () => {
      const targetDate = event.status === 'upcoming' ? event.startTime.toDate() : event.endTime.toDate();
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft(event.status === 'upcoming' ? 'بدأت الآن!' : 'انتهت الفعالية');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      let formatted = '';
      if (days > 0) formatted += `${days} يوم `;
      if (hours > 0) formatted += `${hours} ساعة `;
      if (days === 0 && minutes > 0) formatted += `${minutes} دقيقة `;
      if (days === 0 && hours === 0) formatted += `${seconds} ثانية`;

      setTimeLeft(formatted.trim() || 'قريبًا');
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [event]);

  const Icon = ICONS[event.icon] || (Icons as any)[event.icon] || Trophy;

  const isActive = event.status === 'active';
  const isUpcoming = event.status === 'upcoming';

  return (
    <div
      onClick={onClick}
      className={`group relative w-full rounded-[2.5rem] overflow-hidden p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer hover:-translate-y-1 active:scale-[0.99] border border-white/20 ${
        isFeatured 
          ? 'bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-950 ring-2 ring-violet-400/40 shadow-violet-900/30' 
          : event.gradient 
            ? `bg-gradient-to-br ${event.gradient}` 
            : 'bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700'
      }`}
    >
       {/* Background Pattern and Lighting */}
       <div className="absolute inset-0 bg-[url('/assets/patterns/cubes.png')] opacity-15 mix-blend-overlay pointer-events-none" />
       <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-700" />
       <Icon className="absolute -left-6 -bottom-6 w-44 h-44 text-white opacity-5 group-hover:opacity-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 ease-out pointer-events-none" />
       
       <div className="relative z-10 flex flex-col justify-between h-full space-y-5 text-right">
          {/* Header row */}
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
                <span className={`px-3.5 py-1 rounded-full text-[11px] font-black backdrop-blur-md border shadow-sm flex items-center gap-1.5 ${
                  isActive 
                    ? 'bg-emerald-500/25 border-emerald-300/40 text-emerald-200' 
                    : isUpcoming 
                      ? 'bg-sky-500/25 border-sky-300/40 text-sky-200' 
                      : 'bg-slate-500/30 border-white/20 text-slate-300'
                }`}>
                   <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : isUpcoming ? 'bg-sky-400' : 'bg-slate-400'}`} />
                   <span>{isActive ? 'نشطة الآن' : isUpcoming ? 'تبدأ قريباً' : 'منتهية'}</span>
                </span>

                {isFeatured && (
                  <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles size={11} />
                    <span>الفعالية الكبرى</span>
                  </span>
                )}
             </div>
             
             {isAdmin && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                  className="bg-black/30 hover:bg-black/60 p-2.5 rounded-2xl backdrop-blur-md transition-colors border border-white/10"
                  aria-label="تعديل الفعالية"
                >
                   <Edit size={16} className="text-white" />
                </button>
             )}
          </div>

          {/* Title & Description */}
          <div>
              <div className="w-13 h-13 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-3 border border-white/15 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 inline-flex p-3">
                  <Icon size={28} className="text-white drop-shadow-md" />
              </div>

              <h3 className="text-xl sm:text-2xl font-black mb-1.5 leading-snug drop-shadow-md text-white">
                {event.title}
              </h3>
              
              {event.description && (
                <p className="text-xs text-white/80 font-bold line-clamp-2 leading-relaxed mb-3">
                  {event.description}
                </p>
              )}

              {/* Time Remaining Bar */}
              <div className="flex items-center gap-2 text-xs text-white/90 font-bold bg-black/25 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 w-fit">
                   <Clock size={15} className="text-amber-300 flex-shrink-0" />
                   <span className="font-mono">{timeLeft}</span>
              </div>
          </div>

          {/* Action Button */}
          <button className="w-full py-3.5 px-4 bg-white/95 text-slate-900 hover:bg-white rounded-2xl font-black text-sm transition-all duration-300 shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 group-hover:shadow-white/25">
              <span>{isActive ? 'دخول ساحة التنافس' : 'عرض التفاصيل والترتيب'}</span>
              <ChevronLeft size={18} className="text-slate-500 group-hover:text-slate-900 group-hover:-translate-x-1 transition-all" />
          </button>
       </div>
    </div>
  );
};

interface MawanEventsPageProps {
  user: User;
  userData: UserData;
}

const MawanEventsPage: React.FC<MawanEventsPageProps> = ({ user, userData }) => {
  const [viewedEvent, setViewedEvent] = useState<MawanEvent | null>(null);
  const [events, setEvents] = useState<MawanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MawanEvent | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'upcoming' | 'ended'>('all');

  const isAdmin = ADMIN_UIDS.includes(user.uid) || userData?.isAdmin === true;

  useEffect(() => {
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'mawan_events'), orderBy('startTime', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
          const fetchedEvents = snap.docs.map(d => ({ id: d.id, ...d.data() } as MawanEvent));
          setEvents(fetchedEvents);
          setLoading(false);
      });
      return () => unsub();
  }, []);

  const handleCreateEvent = () => {
      setEditingEvent(null);
      setShowAdminModal(true);
  };
  
  const handleEditEvent = (event: MawanEvent) => {
      setEditingEvent(event);
      setShowAdminModal(true);
  };

  if (viewedEvent) {
    return <EventCompetitionView event={viewedEvent} user={user} userData={userData} onBack={() => setViewedEvent(null)} />;
  }

  const now = new Date();
  const getStatus = (event: MawanEvent): 'active' | 'upcoming' | 'ended' => {
      const startTime = event.startTime.toDate();
      const endTime = event.endTime.toDate();
      if (now < startTime) return 'upcoming';
      if (now > endTime) return 'ended';
      return 'active';
  };

  const filteredEvents = events.filter(e => {
      if (isAdmin && e.status === 'draft') return true;
      if (!isAdmin && e.status === 'draft') return false;
      if (activeFilter === 'all') return true;
      return getStatus(e) === activeFilter;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
            {[
              { key: 'all', label: 'الكل' },
              { key: 'active', label: " نشطة الآن" },
              { key: 'upcoming', label: " قادمة" },
              { key: 'ended', label: " منتهية" }
            ].map(tab => (
              <button 
                key={tab.key}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(10);
                  setActiveFilter(tab.key as any);
                }} 
                className={`py-2 px-4 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
                  activeFilter === tab.key 
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25 scale-[1.02]' 
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                  {tab.label}
              </button>
            ))}
        </div>

        {/* Admin Add Button */}
        {isAdmin && (
            <div>
                <button 
                  onClick={handleCreateEvent} 
                  className="w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 text-white py-3.5 rounded-2xl font-black text-sm hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md"
                >
                    <Plus size={18} />
                    <span>إضافة مسابقة / فعالية جديدة</span>
                </button>
            </div>
        )}

        {/* Events Grid */}
        {loading ? (
           <div className="grid grid-cols-1 gap-4">
              <SkeletonCard />
              <SkeletonCard />
           </div>
        ) : filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
                {filteredEvents.map((event, idx) => (
                    <EventCard 
                      key={event.id} 
                      event={event} 
                      onClick={() => setViewedEvent(event)} 
                      onEdit={() => handleEditEvent(event)} 
                      isAdmin={isAdmin}
                      isFeatured={idx === 0 && getStatus(event) === 'active'}
                    />
                ))}
            </div>
        ) : (
            <div className="text-center py-16 px-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                 <div className="bg-violet-100 dark:bg-violet-900/30 w-16 h-16 rounded-[2rem] flex items-center justify-center mx-auto text-violet-600 dark:text-violet-400 shadow-md">
                    <Calendar size={28} />
                </div>
                <h4 className="font-black text-base text-slate-800 dark:text-slate-200">لا توجد فعاليات في هذا القسم</h4>
                <p className="text-xs font-bold text-slate-400 max-w-xs mx-auto leading-relaxed">ترقب انطلاق مسابقات وتحديات معوان القادمة وتنافس مع آلاف المسلمين في الخيرات.</p>
            </div>
        )}

      {showAdminModal && (
          <AdminEventModal eventToEdit={editingEvent} onClose={() => setShowAdminModal(false)} />
      )}
    </div>
  );
};

export default MawanEventsPage;
