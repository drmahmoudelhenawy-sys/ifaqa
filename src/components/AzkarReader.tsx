import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Zikr } from '../hooks/useAzkar';

interface Props {
  category: string;
  azkar: Zikr[];
  progress: Record<string, number>;
  completionPercentage: number;
  userId: string;
  onBack: () => void;
  onZikrClick: (zikr: Zikr, userId: string) => void;
}

export const AzkarReader: React.FC<Props> = ({
  category,
  azkar,
  progress,
  completionPercentage,
  userId,
  onBack,
  onZikrClick
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-800 shadow-sm px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition">
            <ArrowRight className="text-slate-700 dark:text-slate-200" size={24} />
          </button>
          <h1 className="text-2xl font-bold font-arabic text-slate-800 dark:text-white">{category}</h1>
        </div>
        <div className="text-sm font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-4 py-2 rounded-full">
          {completionPercentage}% مكتمل
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {azkar.map((zikr) => {
          const currentCount = progress[zikr.id] || 0;
          const isDone = currentCount >= zikr.count;

          return (
            <div
              key={zikr.id}
              onClick={() => onZikrClick(zikr, userId)}
              className={`relative p-8 rounded-[2rem] cursor-pointer transition-all duration-300 ${
                isDone 
                  ? 'bg-slate-100 dark:bg-slate-800/50 opacity-70 scale-[0.98] shadow-inner' 
                  : 'bg-white dark:bg-slate-800 shadow-xl hover:shadow-2xl hover:-translate-y-1'
              }`}
            >
              {/* Top Row: Progress and XP */}
              <div className="flex justify-between items-center mb-6">
                <div className={`font-bold text-xl flex items-center gap-2 ${isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {isDone ? (
                    <><CheckCircle2 size={24} /> تمت</>
                  ) : (
                    <span>{currentCount} / {zikr.count}</span>
                  )}
                </div>
                {!isDone && (
                  <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-sm font-bold px-3 py-1 rounded-full shadow-sm">
                    +30 XP
                  </div>
                )}
              </div>

              {/* Main Zikr */}
              <p className="text-3xl leading-[2.5] font-arabic text-center text-slate-800 dark:text-slate-100 mb-6">
                {zikr.text}
              </p>

              {/* Description */}
              {zikr.description && (
                <div className="text-base text-center text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-4 font-arabic leading-relaxed">
                  {zikr.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
