import React, { useState, useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';
import localforage from 'localforage';

interface AyahData {
  surah: number;
  ayah: number;
  text: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ayahData: AyahData | null;
}

type TabKey = 'tafsir' | 'meanings' | 'irab' | 'sarf' | 'balagha' | 'theme';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'tafsir', label: 'التفسير' },
  { key: 'meanings', label: 'معاني الكلمات' },
  { key: 'irab', label: 'الإعراب' },
  { key: 'sarf', label: 'الصرف' },
  { key: 'balagha', label: 'البلاغة' },
  { key: 'theme', label: 'الموضوع' },
];

export const AyahTadabburModal: React.FC<Props> = ({ isOpen, onClose, ayahData }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('tafsir');
  const [tafsirData, setTafsirData] = useState<any>(null);
  const [linguisticsData, setLinguisticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && ayahData) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const tafsir = await localforage.getItem<any>('quran_tafsir');
          const linguistics = await localforage.getItem<any>('quran_linguistics');
          
          setTafsirData(tafsir);
          setLinguisticsData(linguistics);
        } catch (error) {
          console.error('Error loading ayah details:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [isOpen, ayahData]);

  if (!isOpen || !ayahData) return null;

  // Handle alquran.cloud Tafsir structure
  let currentTafsir = '';
  if (tafsirData?.data?.surahs) {
    const surah = tafsirData.data.surahs.find((s: any) => s.number === ayahData.surah);
    const ayah = surah?.ayahs?.find((a: any) => a.numberInSurah === ayahData.ayah);
    currentTafsir = ayah?.text || 'تعذر العثور على التفسير.';
  }

  // Linguistics data extraction
  const langKey = `${ayahData.surah}:${ayahData.ayah}`;
  const ayahLinguistics = linguisticsData?.[langKey] || linguisticsData?.[ayahData.surah]?.[ayahData.ayah] || {};

  const contentMap: Record<TabKey, string> = {
    tafsir: currentTafsir,
    meanings: ayahLinguistics.meanings || ayahLinguistics.words || 'غير متوفر',
    irab: ayahLinguistics.irab || ayahLinguistics.اعراب || 'غير متوفر',
    sarf: ayahLinguistics.sarf || ayahLinguistics.صرف || 'غير متوفر',
    balagha: ayahLinguistics.balagha || ayahLinguistics.بلاغة || 'غير متوفر',
    theme: ayahLinguistics.theme || ayahLinguistics.موضوع || 'غير متوفر'
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal / Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 z-[510] bg-white dark:bg-slate-900 md:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl w-full md:w-[600px] lg:w-[800px] h-[85vh] md:h-[80vh] flex flex-col overflow-hidden font-arabic transition-transform">
        
        {/* Mobile Handle */}
        <div className="w-full flex justify-center pt-4 pb-2 md:hidden" onClick={onClose}>
          <div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-6 md:px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start gap-4 bg-white dark:bg-slate-900 z-10">
          <div className="flex-1 text-center mt-2">
            <h3 className="text-2xl md:text-3xl text-slate-800 dark:text-slate-100 leading-[2.2] md:leading-[2.2] font-bold text-justify" dir="rtl">
              {ayahData.text}
              <span className="inline-flex items-center justify-center w-10 h-10 text-sm border-2 border-violet-400 text-violet-600 dark:border-violet-600 dark:text-violet-400 rounded-full mx-2 font-bold align-middle bg-slate-50 dark:bg-slate-800">
                {ayahData.ayah}
              </span>
            </h3>
          </div>
          <button onClick={onClose} className="p-3 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors shrink-0 mt-2 shadow-sm">
            <X className="text-slate-600 dark:text-slate-300" size={24} />
          </button>
        </div>

        {/* Scrollable Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar px-6 md:px-8 py-5 gap-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 z-10 shadow-inner" dir="rtl">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap px-6 py-3 rounded-full font-bold text-lg transition-all duration-300 flex items-center gap-2 border ${
                activeTab === tab.key
                  ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-500/30 scale-105'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 shadow-sm'
              }`}
            >
              <BookOpen size={18} className={activeTab === tab.key ? 'opacity-100' : 'opacity-50'} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-10 overflow-y-auto flex-1 bg-white dark:bg-slate-900" dir="rtl">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-14 h-14 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2.5 h-10 bg-violet-500 rounded-full"></div>
                <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {tabs.find(t => t.key === activeTab)?.label}
                </h4>
              </div>
              
              <div className="text-slate-700 dark:text-slate-300 text-2xl leading-[2.5] md:text-3xl md:leading-[2.8] text-justify font-arabic">
                {contentMap[activeTab] && contentMap[activeTab] !== 'غير متوفر' ? (
                  <p className="whitespace-pre-wrap">{contentMap[activeTab]}</p>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 opacity-50 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <p className="text-center text-slate-500 dark:text-slate-400 font-bold text-xl">لا توجد بيانات متاحة لهذا القسم.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
