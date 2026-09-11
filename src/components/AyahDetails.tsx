import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AyahAnalysis } from '../services/quranAnalysis';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ayahText: string;
  analysis: AyahAnalysis | null;
  isLoading: boolean;
}

type TabKey = 'tafsir' | 'irab' | 'balagha' | 'sarf' | 'meanings' | 'theme';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'tafsir', label: 'التفسير' },
  { key: 'irab', label: 'الإعراب' },
  { key: 'balagha', label: 'البلاغة' },
  { key: 'sarf', label: 'الصرف' },
  { key: 'meanings', label: 'المعاني' },
  { key: 'theme', label: 'الموضوع' },
];

export const AyahDetails: React.FC<Props> = ({ isOpen, onClose, ayahText, analysis, isLoading }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('tafsir');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="quran-tool-sheet fixed inset-x-0 bottom-0 z-[410] rounded-t-[2.5rem] transform transition-transform duration-300 max-h-[85vh] flex flex-col">
        {/* Header Handle */}
        <div className="w-full flex justify-center pt-4 pb-2" onClick={onClose}>
          <div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full cursor-pointer"></div>
        </div>

        {/* Header Content */}
        <div className="px-6 pb-4 flex justify-between items-start border-b border-slate-100 dark:border-slate-800">
          <div className="flex-1 text-center px-4">
            <h2 className="text-2xl md:text-3xl font-arabic leading-loose text-slate-800 dark:text-slate-100">
              {ayahText}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
            <X className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Scrollable Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar px-6 py-4 gap-3 border-b border-slate-100 dark:border-slate-800" dir="rtl">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20 scale-105'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 font-arabic" dir="rtl">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : analysis ? (
            <div className="text-slate-700 dark:text-slate-300 text-xl leading-[2.5] space-y-4">
              {analysis[activeTab] ? (
                <p className="whitespace-pre-wrap">{analysis[activeTab]}</p>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 opacity-50">
                  <p className="text-center text-slate-500 font-bold">لا توجد بيانات متاحة لهذا القسم.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 opacity-70">
              <p className="text-center text-slate-500 font-bold leading-relaxed">
                تعذر تحميل بيانات الآية.<br/> يرجى التأكد من تفعيل وضع الأوفلاين وتحميل الحزمة المتقدمة.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
