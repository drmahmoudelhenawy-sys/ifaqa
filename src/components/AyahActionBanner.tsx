import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Headphones, BookOpen, AlignLeft, Palette, GitMerge, Trophy, 
  Play, Pause, RotateCcw, ChevronRight, Loader2, CheckCircle2 
} from 'lucide-react';
import { QuranOfflineManager, AyahUIBannerData } from '../services/quranOfflineManager';
import { quranSurahs } from '../../quranMetadata';
import toast, { Toaster } from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  surahId: number;
  ayahId: number;
}

type TabType = 'audio' | 'tafsir' | 'irab' | 'highlight' | 'mutashabihat' | 'gamification';

const HIGHLIGHT_COLORS = [
  { id: 'none', color: 'transparent', label: 'None' },
  { id: 'yellow', color: '#facc15', label: 'Review', opacity: 'bg-yellow-400/20' },
  { id: 'green', color: '#4ade80', label: 'Memorized', opacity: 'bg-green-400/20' },
  { id: 'red', color: '#f87171', label: 'Mistake', opacity: 'bg-red-400/20' },
  { id: 'blue', color: '#60a5fa', label: 'Tajweed', opacity: 'bg-blue-400/20' },
];

export const AyahActionBanner: React.FC<Props> = ({ isOpen, onClose, surahId, ayahId }) => {
  const [ayahData, setAyahData] = useState<AyahUIBannerData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('audio');
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const surahName = quranSurahs.find(s => s.number === surahId)?.name || '';

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      // Pause audio if banner closes
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isOpen, surahId, ayahId]);

  const loadData = async () => {
    setLoading(true);
    const data = await QuranOfflineManager.getAyahDataOffline(surahId, ayahId);
    setAyahData(data);
    setLoading(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const handleAudioEnded = () => {
    if (repeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      setIsPlaying(false);
      setProgress(0);
    }
  };

  const handleMarkMemorized = () => {
    toast.success("تم الحفظ! +50 XP لقبيلتك ", {
      duration: 3000,
      position: 'top-center',
      style: {
        background: '#1a1a1a',
        color: '#fff',
        borderRadius: '1rem',
        border: '1px solid rgba(255,255,255,0.1)'
      }
    });
    // In a real app, call xpService here
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center px-4 pb-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Banner / Bottom Sheet */}
      <div 
        className={`relative w-full max-w-lg overflow-hidden transition-all duration-500 transform 
          ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
          bg-white/70 dark:bg-[#1a1a1a]/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-white/10`}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-gray-400/30 dark:bg-gray-500/30 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-6 py-2 flex items-center justify-between border-b border-gray-200/20 dark:border-white/5">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-gray-800 dark:text-gray-100">سورة {surahName}</h2>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-widest">آية {ayahId}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-200/50 dark:bg-white/5 rounded-full hover:bg-gray-300 dark:hover:bg-white/10 transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Action Tabs */}
        <div className="px-4 py-4 overflow-x-auto hide-scrollbar">
          <div className="flex items-center space-x-3 space-x-reverse min-w-max">
            {[
              { id: 'audio', icon: Headphones, label: 'الاستماع' },
              { id: 'tafsir', icon: BookOpen, label: 'التفسير' },
              { id: 'irab', icon: AlignLeft, label: 'الإعراب' },
              { id: 'highlight', icon: Palette, label: 'تظليل' },
              { id: 'mutashabihat', icon: GitMerge, label: 'متشابهات' },
              { id: 'gamification', icon: Trophy, label: 'حفظ' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl min-w-[70px] transition-all duration-300
                  ${activeTab === tab.id 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105' 
                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
              >
                <tab.icon size={22} className={activeTab === tab.id ? 'animate-pulse' : ''} />
                <span className="text-[10px] mt-1.5 font-bold">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 pb-8 min-h-[280px] max-h-[60vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="mt-4 text-sm text-gray-500 font-bold">جاري تحميل البيانات...</p>
            </div>
          ) : !ayahData ? (
            <div className="text-center py-20 text-gray-500">تعذر جلب البيانات. تأكد من تحميل السورة.</div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeTab === 'audio' && (
                <div className="flex flex-col items-center space-y-6 pt-4">
                  <audio 
                    ref={audioRef} 
                    src={ayahData.audioLocalPath} 
                    onTimeUpdate={handleAudioTimeUpdate}
                    onEnded={handleAudioEnded}
                  />
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-200" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center space-x-8 space-x-reverse">
                    <button 
                      onClick={() => setRepeat(!repeat)}
                      className={`p-3 rounded-full transition-colors ${repeat ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-400'}`}
                    >
                      <RotateCcw size={20} />
                    </button>
                    <button 
                      onClick={togglePlay}
                      className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:scale-110 active:scale-95 transition-transform"
                    >
                      {isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="ml-1" />}
                    </button>
                    <button className="p-3 text-gray-400">
                      <Loader2 size={20} className="opacity-0" /> {/* Placeholder for alignment */}
                    </button>
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {surahName} : {ayahId}
                  </p>
                </div>
              )}

              {activeTab === 'tafsir' && (
                <div className="pt-2 text-right">
                  <p className="text-lg leading-loose font-arabic text-gray-800 dark:text-gray-200 text-justify">
                    {ayahData.tafsir}
                  </p>
                </div>
              )}

              {activeTab === 'irab' && (
                <div className="pt-2">
                  <div className="flex flex-wrap flex-row-reverse justify-start gap-4">
                    {ayahData.wordByWord.map((word, idx) => (
                      <div key={idx} className="flex flex-col items-center min-w-[50px] p-2 rounded-xl bg-gray-100 dark:bg-white/5">
                        <span className={`text-xl font-arabic font-bold mb-1 ${getGrammarColor(word.grammarRole)}`}>
                          {word.wordText}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                          {word.meaning}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'highlight' && (
                <div className="pt-4 flex flex-col items-center">
                  <p className="text-sm text-gray-500 mb-6">اختر لوناً لتمييز هذه الآية</p>
                  <div className="flex space-x-6 space-x-reverse">
                    {HIGHLIGHT_COLORS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          toast.success(`تم التظليل بـ ${c.label}`);
                          onClose();
                        }}
                        className={`w-12 h-12 rounded-full border-4 border-white dark:border-[#1a1a1a] shadow-lg transition-transform hover:scale-125
                          ${c.id === 'none' ? 'bg-gray-200 flex items-center justify-center' : ''}`}
                        style={{ backgroundColor: c.color }}
                      >
                        {c.id === 'none' && <X size={20} className="text-gray-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'mutashabihat' && (
                <div className="pt-2 space-y-4">
                  {ayahData.mutashabihat.length > 0 ? ayahData.mutashabihat.map((m, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200/10 text-right">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-emerald-500">سورة {m.surahName} - آية {m.ayahNumber}</span>
                        <ChevronRight size={14} className="text-gray-400 rotate-180" />
                      </div>
                      <p className="text-md font-arabic leading-relaxed text-gray-700 dark:text-gray-300">
                        {m.text}
                      </p>
                    </div>
                  )) : (
                    <div className="text-center py-10 text-gray-400">لا يوجد متشابهات مسجلة لهذه الآية</div>
                  )}
                </div>
              )}

              {activeTab === 'gamification' && (
                <div className="pt-10 flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                    <Trophy size={48} className="text-emerald-500 animate-bounce" />
                  </div>
                  <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2">هل أتممت حفظ هذه الآية؟</h3>
                  <p className="text-sm text-gray-500 mb-8 max-w-xs">بمجرد الضغط على الزر أدناه، ستحصل على نقاط خبرة وتساهم في رفع ترتيب قبيلتك!</p>
                  
                  <button 
                    onClick={handleMarkMemorized}
                    className="group relative px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center">
                      <CheckCircle2 size={20} className="ml-2" />
                      تم الحفظ (+50 XP)
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </div>
  );
};

// Helper for grammar colors
function getGrammarColor(role: string): string {
  const r = role.toLowerCase();
  if (r.includes('fael') || r.includes('فاعل')) return 'text-blue-500 dark:text-blue-400';
  if (r.includes('mafoul') || r.includes('مفعول')) return 'text-green-500 dark:text-green-400';
  if (r.includes('harf') || r.includes('حرف')) return 'text-gray-500 dark:text-gray-400';
  if (r.includes('mubtada') || r.includes('مبتدأ')) return 'text-purple-500 dark:text-purple-400';
  if (r.includes('khabar') || r.includes('خبر')) return 'text-orange-500 dark:text-orange-400';
  return 'text-gray-800 dark:text-gray-200';
}
