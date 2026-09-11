
import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  History, 
  Trash2,
  Check,
  X,
  MoreVertical,
  Star,
  RefreshCcw,
  Zap
} from 'lucide-react';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  deleteDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { APP_ID, XP_RULES } from '../constants';
import { WirdDay, WirdTask, WirdType, WirdQuality, WeakPoint } from '../types';
import { User } from 'firebase/auth';

interface WirdPageProps {
  user: User;
  updateStats: (amount: number, label?: string, category?: any) => void;
}

const WirdPage: React.FC<WirdPageProps> = ({ user, updateStats }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [wirdData, setWirdData] = useState<WirdDay | null>(null);
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTaskMenu, setActiveTaskMenu] = useState<string | null>(null);

  const dateStr = selectedDate.toISOString().split('T')[0];

  // Fetch daily wird
  useEffect(() => {
    setLoading(true);
    const docRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'wird', dateStr);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setWirdData(snap.data() as WirdDay);
      } else {
        setWirdData({ progress: 0, tasks: [] });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user.uid, dateStr]);

  // Fetch weak points
  useEffect(() => {
    const colRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'quran_weak_points');
    const unsub = onSnapshot(colRef, (snap) => {
      const points = snap.docs.map(d => ({ id: d.id, ...d.data() } as WeakPoint));
      setWeakPoints(points);
    });
    return () => unsub();
  }, [user.uid]);

  const handleToggleTask = async (task: WirdTask) => {
    console.log('Toggling task:', task.id, task.status);
    if (task.status === 'done') {
      // Undo
      setWirdData(prev => {
        if (!prev) return prev;
        const newTasks = prev.tasks.map(t => 
          t.id === task.id ? { ...t, status: 'pending', quality: undefined } as WirdTask : t
        );
        const completed = newTasks.filter(t => t.status === 'done').length;
        const progress = newTasks.length > 0 ? Math.round((completed / newTasks.length) * 100) : 0;
        
        // Background save
        const docRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'wird', dateStr);
        setDoc(docRef, { progress, tasks: newTasks }, { merge: true });
        
        return { progress, tasks: newTasks };
      });
    } else {
      // Show menu
      setActiveTaskMenu(task.id);
    }
  };

  const handleEvaluate = async (taskId: string, quality: WirdQuality) => {
    console.log('Evaluating task:', taskId, quality);
    
    if (!wirdData) return;
    const task = wirdData.tasks.find(t => t.id === taskId);
    if (!task || task.status === 'done') return;

    const newTasks = wirdData.tasks.map(t => 
      t.id === taskId ? { ...t, status: 'done', quality, completedAt: new Date() } as WirdTask : t
    );

    const completed = newTasks.filter(t => t.status === 'done').length;
    const progress = newTasks.length > 0 ? Math.round((completed / newTasks.length) * 100) : 0;

    setWirdData({ progress, tasks: newTasks });
    setActiveTaskMenu(null);

    // Single side-effect call for XP and Firestore save
    updateStats(XP_RULES.QURAN_WIRD || 150, 'إتمام الورد القرآني', 'quran');

    const docRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'wird', dateStr);
    setDoc(docRef, { progress, tasks: newTasks }, { merge: true }).catch(() => {});

    if (quality !== 'perfect') {
      addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'quran_weak_points'), {
        title: task.title,
        type: task.type,
        lastQuality: quality,
        addedAt: serverTimestamp(),
        sourceDate: dateStr
      }).catch(() => {});
    }
  };

  const removeWeakPoint = async (id: string) => {
    await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'quran_weak_points', id));
  };

  // Calendar logic
  const days = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const isSelected = (d: Date) => d.toDateString() === selectedDate.toDateString();

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
      
      {/* Calendar Strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1">
        {days.map((day, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedDate(day)}
            className={`flex flex-col items-center min-w-[4.5rem] py-3 rounded-2xl transition-all duration-300 relative ${
              isSelected(day) 
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/40 scale-105' 
                : isToday(day)
                  ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 border-2 border-violet-200 dark:border-violet-800'
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700'
            }`}
          >
            <span className="text-[10px] font-bold opacity-80 mb-1">
              {day.toLocaleDateString('ar-EG', { weekday: 'short' })}
            </span>
            <span className="text-lg font-black">{day.getDate()}</span>
            {isToday(day) && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Progress & Header */}
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-xl border border-slate-100 dark:border-slate-700 relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">وردي اليومي</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {selectedDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="40" cy="40" r="34"
                className="stroke-slate-100 dark:stroke-slate-700 fill-none"
                strokeWidth="8"
              />
              <circle
                cx="40" cy="40" r="34"
                className="stroke-violet-500 fill-none transition-all duration-1000 ease-out"
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={2 * Math.PI * 34 * (1 - (wirdData?.progress || 0) / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-black text-violet-600 dark:text-violet-400">{wirdData?.progress || 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Sections */}
      <div className="space-y-4">
        <TaskSection 
          title="حفظ جديد" 
          type="new" 
          tasks={wirdData?.tasks.filter(t => t.type === 'new') || []} 
          onToggle={handleToggleTask}
          activeMenu={activeTaskMenu}
          onEvaluate={handleEvaluate}
        />
        <TaskSection 
          title="مراجعة قريبة" 
          type="near_review" 
          tasks={wirdData?.tasks.filter(t => t.type === 'near_review') || []} 
          onToggle={handleToggleTask}
          activeMenu={activeTaskMenu}
          onEvaluate={handleEvaluate}
        />
        <TaskSection 
          title="مراجعة بعيدة" 
          type="far_review" 
          tasks={wirdData?.tasks.filter(t => t.type === 'far_review') || []} 
          onToggle={handleToggleTask}
          activeMenu={activeTaskMenu}
          onEvaluate={handleEvaluate}
        />
      </div>

      {/* Restoration Box */}
      {weakPoints.length > 0 && (
        <div className="mt-4 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="bg-rose-500/10 p-2 rounded-xl text-rose-500">
              <Zap size={20} />
            </div>
            <h3 className="font-black text-slate-900 dark:text-white">صندوق الترميم (نقاط الضعف)</h3>
          </div>
          <div className="grid gap-3">
            {weakPoints.map((point) => (
              <div 
                key={point.id} 
                className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-rose-100 dark:border-rose-900/30 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${point.lastQuality === 'needs_repeat' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{point.title}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {point.type === 'new' ? 'حفظ' : point.type === 'near_review' ? 'مراجعة قريبة' : 'مراجعة بعيدة'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => removeWeakPoint(point.id)}
                  className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-500 transition"
                >
                  <Check size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      <button 
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 left-6 w-14 h-14 bg-violet-600 text-white rounded-2xl shadow-2xl shadow-violet-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white dark:border-slate-900"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {showAddModal && (
        <WirdModal 
          onClose={() => setShowAddModal(false)} 
          onAdd={async (task) => {
            console.log('Adding task:', task.title);
            const newTask = { ...task, id: Date.now().toString(), status: 'pending' } as WirdTask;
            
            setWirdData(prev => {
              const currentTasks = prev?.tasks || [];
              const newTasks = [...currentTasks, newTask];
              const completed = newTasks.filter(t => t.status === 'done').length;
              const progress = newTasks.length > 0 ? Math.round((completed / newTasks.length) * 100) : 0;
              
              // Background save
              const docRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'wird', dateStr);
              setDoc(docRef, { progress, tasks: newTasks }, { merge: true });
              
              return { progress, tasks: newTasks };
            });

            setShowAddModal(false);
          }} 
        />
      )}
    </div>
  );
};

const TaskSection = ({ 
  title, 
  tasks, 
  onToggle, 
  activeMenu, 
  onEvaluate 
}: { 
  title: string, 
  type: WirdType, 
  tasks: WirdTask[], 
  onToggle: (t: WirdTask) => void,
  activeMenu: string | null,
  onEvaluate: (id: string, q: WirdQuality) => void
}) => {
  if (tasks.length === 0) return null;

  return (
    <div className="bg-white/50 dark:bg-slate-800/50 rounded-3xl p-4 border border-slate-100 dark:border-slate-700/50">
      <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 mb-3 px-2 uppercase tracking-widest">{title}</h3>
      <div className="grid gap-2">
        {tasks.map((task) => (
          <div key={task.id} className="relative">
            <div 
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                task.status === 'done' 
                  ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' 
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
              }`}
            >
              <button 
                onClick={() => onToggle(task)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  task.status === 'done' 
                    ? 'bg-emerald-500 text-white scale-110' 
                    : 'border-2 border-slate-200 dark:border-slate-600 hover:border-violet-400'
                }`}
              >
                {task.status === 'done' ? <Check size={16} strokeWidth={4} /> : null}
              </button>
              
              <div className="flex-1">
                <p className={`font-bold transition-all ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                  {task.title}
                </p>
                {task.quality && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    task.quality === 'perfect' ? 'bg-emerald-100 text-emerald-600' : 
                    task.quality === 'with_errors' ? 'bg-amber-100 text-amber-600' : 
                    'bg-rose-100 text-rose-600'
                  }`}>
                    {task.quality === 'perfect' ? 'ممتاز' : task.quality === 'with_errors' ? 'به أخطاء' : 'يحتاج إعادة'}
                  </span>
                )}
              </div>
            </div>

            {/* Evaluation Menu Popup */}
            {activeMenu === task.id && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 rounded-2xl border border-violet-200 dark:border-violet-900 animate-in fade-in zoom-in duration-200">
                <div className="flex gap-2 p-1">
                  <button onClick={() => onEvaluate(task.id, 'perfect')} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 transition">
                    <Star size={20} fill="currentColor" />
                    <span className="text-[10px] font-bold">ممتاز</span>
                  </button>
                  <button onClick={() => onEvaluate(task.id, 'with_errors')} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 transition">
                    <RefreshCcw size={20} />
                    <span className="text-[10px] font-bold">أخطاء</span>
                  </button>
                  <button onClick={() => onEvaluate(task.id, 'needs_repeat')} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 transition">
                    <X size={20} />
                    <span className="text-[10px] font-bold">إعادة</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const WirdModal = ({ onClose, onAdd }: { onClose: () => void, onAdd: (task: Partial<WirdTask>) => void }) => {
  const [type, setType] = useState<WirdType>('new');
  const [inputs, setInputs] = useState<Record<WirdType, { surah: string, verses: string }>>({
    new: { surah: '', verses: '' },
    near_review: { surah: '', verses: '' },
    far_review: { surah: '', verses: '' }
  });

  const handleAdd = () => {
    const { surah, verses } = inputs[type];
    if (!surah) return;
    onAdd({ type, title: `${surah} ${verses}`.trim() });
    // Reset inputs for this type
    setInputs(prev => ({ ...prev, [type]: { surah: '', verses: '' } }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500 relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition">
          <X size={24} />
        </button>

        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6">إضافة ورد جديد</h3>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">نوع الورد</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'new', label: 'حفظ جديد', color: 'violet' },
                { id: 'near_review', label: 'مراجعة قريبة', color: 'emerald' },
                { id: 'far_review', label: 'مراجعة بعيدة', color: 'amber' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setType(opt.id as WirdType)}
                  className={`py-3 px-2 rounded-2xl text-[10px] font-black border transition-all ${
                    type === opt.id 
                      ? `bg-${opt.color}-600 text-white border-${opt.color}-600 shadow-lg` 
                      : 'bg-slate-50 dark:bg-slate-700/50 text-slate-500 border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">السورة</label>
            <input 
              type="text" 
              value={inputs[type].surah} 
              onChange={e => setInputs(prev => ({ ...prev, [type]: { ...prev[type], surah: e.target.value } }))}
              placeholder="مثلاً: البقرة" 
              className="w-full bg-slate-50 dark:bg-slate-700/50 border-2 border-transparent focus:border-violet-500 rounded-2xl py-4 px-6 outline-none transition font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">الآيات (اختياري)</label>
            <input 
              type="text" 
              value={inputs[type].verses} 
              onChange={e => setInputs(prev => ({ ...prev, [type]: { ...prev[type], verses: e.target.value } }))}
              placeholder="مثلاً: 1-20" 
              className="w-full bg-slate-50 dark:bg-slate-700/50 border-2 border-transparent focus:border-violet-500 rounded-2xl py-4 px-6 outline-none transition font-bold text-slate-900 dark:text-white"
            />
          </div>

          <button 
            disabled={!inputs[type].surah}
            onClick={handleAdd}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-5 rounded-[2rem] font-black shadow-xl shadow-violet-500/30 transition-all active:scale-95"
          >
            إضافة إلى وردي
          </button>
        </div>
      </div>
    </div>
  );
};

export default WirdPage;
