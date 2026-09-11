import React, { useState } from 'react';
import { addKhatma } from '../services/khatmaService';
import { X, BookOpen, Clock, BellRing } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const DURATIONS = [
  { label: '3 أيام', days: 3 },
  { label: '7 أيام', days: 7 },
  { label: '15 يوم', days: 15 },
  { label: '30 يوم', days: 30 },
  { label: '60 يوم', days: 60 }
];

export const CreateKhatmaModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [reminderTime, setReminderTime] = useState('');

  const dailyTarget = Math.ceil(604 / selectedDays);

  const handleCreate = async () => {
    await addKhatma(title.trim() || 'ختمة جديدة', selectedDays, reminderTime);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all" dir="rtl">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl">
              <BookOpen size={20} />
            </div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white">إضافة ختمة</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 text-right">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">اسم الختمة</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ختمة جديدة"
              className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 font-bold text-slate-900 dark:text-white transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Clock size={16} className="text-violet-500" />
              مدة الختمة
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DURATIONS.map(dur => (
                <button
                  key={dur.days}
                  onClick={() => setSelectedDays(dur.days)}
                  className={`py-3 px-2 rounded-xl font-bold text-sm transition-all ${
                    selectedDays === dur.days 
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 ring-2 ring-violet-600 ring-offset-2 dark:ring-offset-slate-900' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {dur.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <BellRing size={16} className="text-violet-500" />
              تذكير يومي (اختياري)
            </label>
            <input 
              type="time" 
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 font-bold text-slate-900 dark:text-white transition-all text-left"
            />
          </div>

          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-4 text-center border border-violet-100 dark:border-violet-900/30">
            <p className="text-violet-600 dark:text-violet-400 font-bold text-sm">الورد اليومي المطلوب:</p>
            <p className="text-2xl font-black text-violet-700 dark:text-violet-300 mt-1">{dailyTarget} صفحة</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button 
            onClick={handleCreate}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-3.5 rounded-xl font-bold transition-colors shadow-lg shadow-violet-600/20 active:scale-[0.98]"
          >
            إنشاء الختمة
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-3.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.98]"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateKhatmaModal;
