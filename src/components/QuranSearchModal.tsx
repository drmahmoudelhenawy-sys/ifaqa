import { OutlineIcon, outlineContent } from './OutlineIcon';
import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, ChevronLeft, BookOpen, Sparkles, FileText } from 'lucide-react';
import localforage from 'localforage';
import { getOfflineTafsir, TAFSIR_KEYS } from '../services/offlineBundle';
import { quraniApi } from '../services/quraniApi';
import { quranSurahs } from '../../quranMetadata';

export interface SearchResult {
  surah: number;
  surahName: string;
  ayah: number;
  text: string;
  page?: number;
  tafsir?: string;
}

interface QuranSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAyah: (surah: number, ayah: number, page?: number) => void;
}

export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/ـ/g, '')
    .trim()
    .toLowerCase();
}

const QURAN_TOPICS = [
  { label: 'الصبر', icon: "icon:leaf", keywords: ['صبر', 'اصبر', 'صابرين', 'الصابرين'] },
  { label: 'الجنة', icon: "icon:leaf", keywords: ['جنه', 'جنات', 'الفردوس', 'النعيم'] },
  { label: 'النار', icon: "icon:flame", keywords: ['نار', 'جهنم', 'السعير'] },
  { label: 'التوبة', icon: "icon:heart", keywords: ['توبوا', 'تاب', 'التواب', 'توبه'] },
  { label: 'الدعاء', icon: "icon:handheart", keywords: ['ادعوني', 'ربنا', 'رب اغفر', 'دعاء'] },
  { label: 'الرحمة', icon: "icon:heart", keywords: ['رحمه', 'الرحيم', 'الرحمن'] },
  { label: 'التقوى', icon: "icon:shield", keywords: ['تقوي', 'المتقين', 'اتقوا', 'تتقون'] },
  { label: 'العلم', icon: "icon:book", keywords: ['علم', 'يعلمون', 'عالم', 'العلماء'] },
  { label: 'الإيمان', icon: "icon:sparkles", keywords: ['امنوا', 'المؤمنون', 'الايمان', 'مؤمن'] },
  { label: 'الشكر', icon: "icon:sparkles", keywords: ['اشكروا', 'الشاكرين', 'شكر', 'شكور'] },
];

export const QuranSearchModal: React.FC<QuranSearchModalProps> = ({ isOpen, onClose, onNavigateToAyah }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'thematic' | 'root'>('text');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedAyah, setExpandedAyah] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setExpandedAyah(null);
    }
  }, [isOpen]);

  const handleSearch = async (kw: string) => {
    if (!kw.trim()) return;
    setLoading(true);
    setResults([]);
    setExpandedAyah(null);

    const normKw = normalizeArabicText(kw);

    try {
      let allResults: SearchResult[] = [];
      
      if (activeTab === 'root') {
        try {
          const apiResults = await quraniApi.searchRoot(normKw);
          allResults = apiResults.map((r: any) => {
            const surahInfo = quranSurahs.find(s => s.number === (r.surah_number || r.surah));
            return {
              surah: r.surah_number || r.surah,
              surahName: r.surah_name || surahInfo?.name || `سورة ${r.surah}`,
              ayah: r.ayah_number || r.ayah,
              text: r.text,
              page: r.page || surahInfo?.startPage,
            };
          });
        } catch {
          // fallback to standard search if root fails
        }
      }

      if (allResults.length === 0) {
        // 1. Check local cached full text with normalization
        const stored = await localforage.getItem<any>('quran_text');
        if (stored?.data?.surahs) {
          for (const surah of stored.data.surahs) {
            const surahMeta = quranSurahs.find(s => s.number === surah.number);
            for (const ayah of surah.ayahs) {
              const normAyah = normalizeArabicText(ayah.text);
              if (normAyah.includes(normKw)) {
                allResults.push({
                  surah: surah.number,
                  surahName: surah.name,
                  ayah: ayah.numberInSurah,
                  text: ayah.text,
                  page: ayah.page || surahMeta?.startPage,
                });
                if (allResults.length >= 30) break;
              }
            }
            if (allResults.length >= 30) break;
          }
        }

        // 2. Network search fallback
        if (allResults.length < 5) {
          try {
            const apiResults = await quraniApi.searchKeyword(kw);
            apiResults.forEach((m: any) => {
              const sNum = m.surah_number || m.surah;
              const aNum = m.ayah_number || m.ayah;
              const surahMeta = quranSurahs.find(s => s.number === sNum);
              if (!allResults.find(r => r.surah === sNum && r.ayah === aNum)) {
                allResults.push({
                  surah: sNum,
                  surahName: m.surah_name || surahMeta?.name || `سورة ${sNum}`,
                  ayah: aNum,
                  text: m.text,
                  page: m.page || surahMeta?.startPage,
                });
              }
            });
          } catch {
            const res = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(kw)}/all/ar`);
            if (res.ok) {
              const data = await res.json();
              const matches = data.data?.matches || [];
              matches.slice(0, 25).forEach((m: any) => {
                if (!allResults.find(r => r.surah === m.surah.number && r.ayah === m.numberInSurah)) {
                  allResults.push({
                    surah: m.surah.number,
                    surahName: m.surah.name,
                    ayah: m.numberInSurah,
                    text: m.text,
                    page: m.page,
                  });
                }
              });
            }
          }
        }
      }
      setResults(allResults);
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setLoading(false);
    }
  };

  const loadTafsir = async (surah: number, ayah: number) => {
    const key = `${surah}:${ayah}`;
    if (expandedAyah === key) {
      setExpandedAyah(null);
      return;
    }

    const res = results.find(r => r.surah === surah && r.ayah === ayah);
    if (res && !res.tafsir) {
      const tafsir = await getOfflineTafsir(surah, ayah, TAFSIR_KEYS.muyassar);
      if (tafsir) {
        setResults(prev => prev.map(r => 
          (r.surah === surah && r.ayah === ayah) ? { ...r, tafsir } : r
        ));
      } else {
        try {
          const apiRes = await fetch(`https://api.quran.com/api/v4/tafsirs/16/by_ayah/${surah}:${ayah}`);
          if (apiRes.ok) {
            const data = await apiRes.json();
            setResults(prev => prev.map(r => 
              (r.surah === surah && r.ayah === ayah) ? { ...r, tafsir: data.tafsir.text.replace(/<[^>]*>?/gm, '') } : r
            ));
          }
        } catch {}
      }
    }
    setExpandedAyah(key);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 max-h-[85vh] border border-white/20">
        
        {/* Header */}
        <div className="p-5 border-b dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[var(--quran-accent)]/10 flex items-center justify-center text-[var(--quran-accent)]">
                <Search size={18} />
              </div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">البحث في المصحف</h2>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400">
              <X size={18} />
            </button>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4 overflow-x-auto">
            {[
              { id: 'text' as const, label: 'بحث عادي', icon: <Search size={14} /> },
              { id: 'root' as const, label: 'بحث بالجذر', icon: <BookOpen size={14} /> },
              { id: 'thematic' as const, label: 'بحث موضوعي', icon: <Sparkles size={14} /> }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 shrink-0 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-black text-xs transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white dark:bg-slate-700 text-[var(--quran-accent)] shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {outlineContent(tab.icon)}
                {tab.label}
              </button>
            ))}
          </div>

          {(activeTab === 'text' || activeTab === 'root') && (
            <div className="relative">
              <input 
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value.length > 2) handleSearch(e.target.value);
                }}
                placeholder={activeTab === 'root' ? "مثال: كتب، صبر رحم..." : "اكتب كلمة أو رقم آية..."}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pr-4 pl-10 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 ring-[var(--quran-accent)]/20 transition-all outline-none"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
          {activeTab === 'thematic' && !query && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {QURAN_TOPICS.map(topic => (
                <button
                  key={topic.label}
                  onClick={() => {
                    setQuery(topic.label);
                    setActiveTab('text');
                    handleSearch(topic.keywords[0]);
                  }}
                  className="flex flex-col items-center gap-1.5 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-transparent hover:border-[var(--quran-accent)]/30 hover:bg-[var(--quran-accent)]/5 active:scale-95 transition-all group shadow-sm"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{outlineContent(topic.icon)}</span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">{topic.label}</span>
                </button>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((r, i) => {
                const isExpanded = expandedAyah === `${r.surah}:${r.ayah}`;
                return (
                  <div key={i} className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all">
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black text-[var(--quran-accent)] bg-[var(--quran-accent)]/10 px-2.5 py-0.5 rounded-full">
                            سورة {r.surahName}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            آية {r.ayah}
                          </span>
                          {r.page && (
                            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              صفحة {r.page}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <button 
                            onClick={() => loadTafsir(r.surah, r.ayah)}
                            className={`p-1.5 rounded-lg transition-all ${isExpanded ? 'bg-[var(--quran-accent)] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                            title="التفسير"
                          >
                            <BookOpen size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              onNavigateToAyah(r.surah, r.ayah, r.page);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--quran-accent)] text-white text-xs font-black shadow-sm hover:scale-105 active:scale-95 transition-all"
                            title="الانتقال إلى الآية والصفحة"
                          >
                            <span>انتقال</span>
                            <ChevronLeft size={14} />
                          </button>
                        </div>
                      </div>
                      <p 
                        className="text-lg text-slate-800 dark:text-slate-100 font-quran leading-relaxed"
                        style={{ fontFamily: 'var(--quran-font, "KFGQPC HAFS Regular"), serif' }}
                      >
                        {r.text}
                      </p>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-r-4 border-[var(--quran-accent)]">
                          <p className="text-[11px] font-black text-[var(--quran-accent)] mb-1">الشرح (التفسير الميسر):</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-loose font-bold">
                            {r.tafsir || 'جاري تحميل التفسير...'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {query && !loading && results.length === 0 && (
            <div className="text-center py-12 opacity-50">
              <span className="text-4xl block mb-2"><OutlineIcon name="search" /></span>
              <p className="text-sm font-bold">لم يتم العثور على نتائج لـ "{query}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
