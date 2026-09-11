import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clock, Trash2, X, Sparkles, BookOpen, Sunrise, Sun, Sunset, Moon, CloudSun, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { Prayer } from '../types';

interface PrayerCardProps {
  prayer: Prayer;
  userId: string;
  onUpdate: (status: Prayer['status']) => void;
  onSunnahUpdate?: (prayerId: string, type: 'pre' | 'post', current: boolean) => void;
}

const PrayerCard: React.FC<PrayerCardProps> = ({ prayer, userId, onUpdate, onSunnahUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);

  const PrayerIcon = {
    fajr: Sunrise,
    dhuhr: Sun,
    asr: CloudSun,
    maghrib: Sunset,
    isha: Moon,
  }[prayer.id] || Clock;

  const getLabel = (status: Prayer['status']) => {
    switch (status) {
      case 'jamaah':
        return 'جماعة المسجد';
      case 'ontime':
        return 'في الوقت';
      case 'late':
        return 'متأخرة';
      case 'qada':
        return 'قضاء';
      default:
        return 'لم تسجل';
    }
  };

  const getStatusStyles = (status: Prayer['status']) => {
    if (status === 'jamaah') return 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 text-white border-violet-400/30 shadow-lg shadow-violet-500/25';
    if (status === 'ontime') return 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white border-emerald-400/30 shadow-lg shadow-emerald-500/25';
    if (status === 'late') return 'bg-white dark:bg-slate-900 border-orange-300/60 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 shadow-sm';
    if (status === 'qada') return 'bg-white dark:bg-slate-900 border-rose-300/60 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-sm';
    return 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 shadow-sm hover:border-violet-200 dark:hover:border-slate-700';
  };

  const isDone = prayer.status !== 'none';

  return (
    <>
      <div
        onClick={() => {
          setIsOpen(true);
          if (navigator.vibrate) navigator.vibrate(10);
        }}
        className={`group relative cursor-pointer overflow-hidden rounded-[2rem] border p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] ${getStatusStyles(prayer.status)}`}
      >
        <PrayerIcon
          className={`absolute -bottom-7 -left-5 h-36 w-36 rotate-12 opacity-[0.04] transition-transform duration-700 group-hover:scale-110 ${isDone ? 'text-white opacity-[0.16]' : 'text-slate-900 dark:text-white'}`}
        />

        <div className={`absolute -right-[23px] top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-slate-50 shadow-md transition-all duration-500 dark:border-slate-900 ${isDone ? (prayer.status === 'jamaah' ? 'bg-violet-500 shadow-violet-500/50' : 'bg-emerald-500 shadow-emerald-500/50') : 'bg-slate-300 dark:bg-slate-700'}`} />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-13 w-13 items-center justify-center rounded-2xl shadow-inner transition-all duration-300 ${isDone ? 'bg-white/20 text-white backdrop-blur-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-400 group-hover:bg-violet-50 dark:group-hover:bg-slate-800 group-hover:text-violet-600'}`}>
              {isDone ? <Check size={26} strokeWidth={3} className="animate-in zoom-in spin-in-12 duration-300" /> : <PrayerIcon size={26} className="transition-transform duration-300 group-hover:scale-110" />}
            </div>

            <div className="text-right">
              <h4 className={`text-lg font-black transition-colors duration-300 ${isDone ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                {prayer.name}
              </h4>
              <div className={`flex items-center gap-2 text-xs font-bold transition-colors duration-300 ${isDone ? 'text-white/85' : 'text-slate-400'}`}>
                <span>{prayer.fadl}</span>
                {(prayer.sunanPreDone || prayer.sunanPostDone) && (
                  <div className="flex gap-1 items-center mr-1">
                    {prayer.sunanPreDone && <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(250,204,21,0.9)]" />}
                    {prayer.sunanPostDone && <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(250,204,21,0.9)]" />}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isDone && (
            <div className="rounded-xl border border-white/20 bg-white/20 px-3.5 py-1.5 text-xs font-black text-white shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-left-2 duration-300">
              {getLabel(prayer.status)}
            </div>
          )}
        </div>
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200 select-none" 
          onClick={() => setIsOpen(false)}
        >
          <div className="w-full max-w-sm my-auto animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div
              className="relative w-full max-h-[85vh] overflow-y-auto scrollbar-hide rounded-[2.2rem] bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
            >
              {/* Decorative Glow */}
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="mb-4 flex items-center justify-between relative z-10">
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 active:scale-90"
                  aria-label="إغلاق"
                >
                  <X size={16} />
                </button>
                <div className="text-right">
                  <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">
                    {prayer.name === 'الجمعة' ? 'صلاة الجمعة' : `صلاة ${prayer.name}`}
                  </h3>
                  <p className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-wider">تسجيل أداء الصلاة</p>
                </div>
              </div>

              {(prayer.sunanConfig.hasPre || prayer.sunanConfig.hasPost) && (
                <div className="mb-4 rounded-[1.4rem] bg-slate-50/90 p-3 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 relative z-10">
                  <div className="mb-2.5 flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full dark:bg-amber-900/50 dark:text-amber-300">
                       <Sparkles size={10} />
                       <span>{prayer.name === 'الجمعة' ? 'سنة الجمعة' : 'بيت في الجنة'}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400">السنن الرواتب</span>
                  </div>

                  <div className={`grid gap-2 ${prayer.sunanConfig.hasPre && prayer.sunanConfig.hasPost ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {prayer.sunanConfig.hasPre && (
                      <button
                        onClick={() => {
                          if (onSunnahUpdate) onSunnahUpdate(prayer.id, 'pre', prayer.sunanPreDone || false);
                          if (navigator.vibrate) navigator.vibrate(20);
                        }}
                        className={`flex items-center justify-between rounded-xl border p-2 sm:p-2.5 transition-all duration-200 active:scale-95 ${prayer.sunanPreDone ? 'border-amber-500 bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md shadow-amber-500/20' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                      >
                        <div className="text-right">
                           <div className="text-xs font-black">سنة قبلية</div>
                           <div className="text-[9px] font-bold opacity-75">{prayer.sunanConfig.preCount} ركعات</div>
                        </div>
                        <div className={`p-1.5 rounded-lg ${prayer.sunanPreDone ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-700'}`}>
                           <Check size={12} className={prayer.sunanPreDone ? 'text-white stroke-[3]' : 'text-slate-300'} />
                        </div>
                      </button>
                    )}
                    {prayer.sunanConfig.hasPost && (
                      <button
                        onClick={() => {
                          if (onSunnahUpdate) onSunnahUpdate(prayer.id, 'post', prayer.sunanPostDone || false);
                          if (navigator.vibrate) navigator.vibrate(20);
                        }}
                        className={`flex items-center justify-between rounded-xl border p-2 sm:p-2.5 transition-all duration-200 active:scale-95 ${prayer.sunanPostDone ? 'border-amber-500 bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md shadow-amber-500/20' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                      >
                        <div className="text-right">
                           <div className="text-xs font-black">سنة بعدية</div>
                           <div className="text-[9px] font-bold opacity-75">{prayer.sunanConfig.postCount} ركعات</div>
                        </div>
                        <div className={`p-1.5 rounded-lg ${prayer.sunanPostDone ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-700'}`}>
                           <Check size={12} className={prayer.sunanPostDone ? 'text-white stroke-[3]' : 'text-slate-300'} />
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <StatusBtn 
                  label="جماعة" 
                  icon={Users} 
                  xp={prayer.isFajr ? 100 : (prayer.name === 'الجمعة' ? 80 : 60)} 
                  color="violet" 
                  onClick={() => { onUpdate('jamaah'); setIsOpen(false); }} 
                />
                <StatusBtn 
                  label="في الوقت" 
                  icon={CheckCircle2} 
                  xp={prayer.isFajr ? 80 : 40} 
                  color="emerald" 
                  onClick={() => { onUpdate('ontime'); setIsOpen(false); }} 
                />
                <StatusBtn 
                  label="متأخرة" 
                  icon={Clock} 
                  xp={10} 
                  color="orange" 
                  onClick={() => { onUpdate('late'); setIsOpen(false); }} 
                />
                <StatusBtn 
                  label="قضاء" 
                  icon={AlertCircle} 
                  xp={5} 
                  color="rose" 
                  onClick={() => { onUpdate('qada'); setIsOpen(false); }} 
                />
              </div>

              {prayer.status !== 'none' && (
                <button
                  onClick={() => { onUpdate('none'); setIsOpen(false); }}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-xs font-black text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 active:scale-95 dark:bg-slate-800/80 dark:text-slate-400"
                >
                  <Trash2 size={13} />
                  <span>إلغاء تسجيل الصلاة</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

const StatusBtn = ({ label, icon: Icon, xp, color, onClick }: any) => {
    const colors: any = {
        violet: 'border-violet-200 bg-violet-50/70 text-violet-700 hover:bg-violet-100 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-300',
        emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300',
        orange: 'border-orange-200 bg-orange-50/70 text-orange-700 hover:bg-orange-100 dark:border-orange-800/50 dark:bg-orange-950/30 dark:text-orange-300',
        rose: 'border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300',
    };

    return (
        <button 
            onClick={onClick} 
            className={`flex flex-col items-center justify-center rounded-[1.2rem] border p-2.5 sm:p-3 transition-all hover:shadow-md active:scale-95 ${colors[color]}`}
        >
            <div className="mb-1.5 p-1.5 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                <Icon size={18} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-black mb-0.5">{label}</span>
            <span className="text-[9px] font-bold opacity-75 font-mono">+{xp} XP</span>
        </button>
    );
};

export default PrayerCard;
