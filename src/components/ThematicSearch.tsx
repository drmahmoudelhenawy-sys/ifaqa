import { OutlineIcon, outlineContent } from './OutlineIcon';
import React, { useState, useCallback } from 'react';
import { Search, BookOpen, Loader2, X, ChevronLeft, Filter } from 'lucide-react';

interface ThematicResult {
  surah: number;
  surahName: string;
  ayah: number;
  text: string;
  keyword: string;
}

interface ThematicSearchProps {
  onNavigateToAyah?: (surah: number, ayah: number) => void;
}

// Popular Arabic Quranic topics with keywords
const QURAN_TOPICS = [
  { label: 'الصبر', icon: "icon:leaf", keywords: ['اصبر', 'صابرين', 'الصابرين', 'صبر', 'بالصبر'] },
  { label: 'الجنة', icon: "icon:leaf", keywords: ['الجنة', 'جنات', 'جنة', 'الفردوس'] },
  { label: 'النار', icon: "icon:flame", keywords: ['النار', 'جهنم', 'نار'] },
  { label: 'التوبة', icon: "icon:heart", keywords: ['توبوا', 'تاب', 'التواب', 'توبة'] },
  { label: 'الدعاء', icon: "icon:handheart", keywords: ['ادعوني', 'ربنا', 'رب اغفر', 'ادع'] },
  { label: 'الرحمة', icon: "icon:heart", keywords: ['رحمته', 'الرحيم', 'الرحمن', 'رحمة'] },
  { label: 'التقوى', icon: "icon:shield", keywords: ['تتقون', 'المتقين', 'اتقوا', 'تقوى'] },
  { label: 'الجهاد', icon: "icon:swords", keywords: ['قاتلوا', 'جاهدوا', 'الجهاد'] },
  { label: 'العلم', icon: "icon:book", keywords: ['علموا', 'العلم', 'يعلمون', 'عالم'] },
  { label: 'الإيمان', icon: "icon:sparkles", keywords: ['آمنوا', 'المؤمنون', 'الإيمان', 'آمن'] },
  { label: 'الشكر', icon: "icon:sparkles", keywords: ['اشكروا', 'الشاكرين', 'شكر', 'شكرا'] },
  { label: 'البر والإحسان', icon: "icon:sparkles", keywords: ['البر', 'أحسنوا', 'الإحسان', 'محسنين'] },
];

export const ThematicSearch: React.FC<ThematicSearchProps> = ({ onNavigateToAyah }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ThematicResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchByKeyword = useCallback(async (kw: string, topicLabel?: string) => {
    if (!kw.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setSelectedTopic(topicLabel || kw);
    setResults([]);

    try {
      const res = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(kw)}/all/ar`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      const matches = data.data?.matches || [];
      const formatted: ThematicResult[] = matches.slice(0, 30).map((m: any) => ({
        surah: m.surah.number,
        surahName: m.surah.name,
        ayah: m.numberInSurah,
        text: m.text,
        keyword: kw,
      }));
      setResults(formatted);
    } catch {
      // fallback: search using stored quran_text
      try {
        const localforage = (await import('localforage')).default;
        const stored = await localforage.getItem<any>('quran_text');
        if (stored?.data?.surahs) {
          const allResults: ThematicResult[] = [];
          for (const surah of stored.data.surahs) {
            for (const ayah of surah.ayahs) {
              if (ayah.text.includes(kw)) {
                allResults.push({
                  surah: surah.number,
                  surahName: surah.name,
                  ayah: ayah.numberInSurah,
                  text: ayah.text,
                  keyword: kw,
                });
                if (allResults.length >= 30) break;
              }
            }
            if (allResults.length >= 30) break;
          }
          setResults(allResults);
        }
      } catch (e) {
        console.error('Offline search failed', e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTopicClick = (topic: typeof QURAN_TOPICS[0]) => {
    const kw = topic.keywords[0];
    setQuery(topic.label);
    searchByKeyword(kw, topic.label);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) searchByKeyword(query.trim(), query.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950 font-sans" dir="rtl">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 pb-8 pt-8 px-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="relative">
          <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
            <span className="text-4xl"><OutlineIcon name="search" /></span>
            البحث الموضوعي
          </h1>
          <p className="text-indigo-100 text-sm font-bold">ابحث في القرآن بالموضوع أو الكلمة</p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-6 relative">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              type="text"
              placeholder="اكتب كلمة أو موضوع مثل: الصبر، الجنة..."
              className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/60 rounded-2xl py-4 pr-5 pl-16 font-bold outline-none focus:bg-white/25 focus:border-white/50 transition"
            />
            <button
              type="submit"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white text-indigo-600 p-2.5 rounded-xl shadow-lg font-bold"
            >
              <Search size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* Topics Grid */}
      {!hasSearched && (
        <div className="p-4">
          <h2 className="font-black text-slate-700 dark:text-slate-200 mb-4 text-lg">مواضيع شائعة</h2>
          <div className="grid grid-cols-3 gap-3">
            {QURAN_TOPICS.map(topic => (
              <button
                key={topic.label}
                onClick={() => handleTopicClick(topic)}
                className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all"
              >
                <span className="text-3xl">{outlineContent(topic.icon)}</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{topic.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {hasSearched && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-black text-slate-800 dark:text-slate-100 text-xl">
                {selectedTopic}
              </h2>
              {!loading && (
                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">
                  {results.length} نتيجة
                </p>
              )}
            </div>
            <button
              onClick={() => { setHasSearched(false); setQuery(''); setResults([]); }}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
            >
              <X size={18} />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-indigo-500" size={40} />
              <p className="text-slate-500 font-bold">جاري البحث...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-6xl mb-4 block"><OutlineIcon name="search" /></span>
              <p className="font-black text-slate-500 text-lg">لا توجد نتائج</p>
              <p className="text-slate-400 text-sm">جرب كلمة أخرى</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => onNavigateToAyah?.(result.surah, result.ayah)}
                  className="w-full text-right bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                        {result.surahName}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        آية {result.ayah}
                      </span>
                    </div>
                    <ChevronLeft size={16} className="text-slate-300 flex-shrink-0 mt-1" />
                  </div>
                  <p className="text-xl text-slate-800 dark:text-slate-100 font-quran leading-relaxed text-justify" style={{ fontFamily: 'var(--quran-font, "KFGQPC HAFS Regular"), serif' }}>
                    {result.text}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThematicSearch;
