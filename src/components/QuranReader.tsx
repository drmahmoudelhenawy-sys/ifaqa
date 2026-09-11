import React, { useState, useEffect, useMemo, useRef } from 'react';
import localforage from 'localforage';
import { AyahTadabburModal } from './AyahTadabburModal';
import { AyahToolbar } from './AyahToolbar';
import { MutashabihatModal } from './MutashabihatModal';
import { BookOpen, Palette, Link2, ChevronRight, ChevronLeft, Search, Settings, Maximize2 } from 'lucide-react';
import { QuranSearchModal } from './QuranSearchModal';

interface Surah {
  number: number;
  name: string;
  englishName: string;
  startPage: number;
  ayahs: any[];
}

const SURAH_START_PAGES = [
  1, 2, 50, 77, 106, 128, 151, 177, 187, 208, 221, 235, 249, 255, 262, 267, 282, 293, 305, 312, 322, 332, 342, 350, 359, 367, 377, 385, 396, 404, 411, 415, 418, 428, 434, 440, 446, 453, 458, 467, 477, 483, 489, 496, 499, 502, 507, 511, 515, 518, 520, 523, 526, 528, 531, 534, 537, 542, 545, 549, 551, 553, 554, 556, 558, 560, 562, 564, 567, 570, 572, 574, 575, 577, 578, 580, 582, 583, 585, 587, 587, 589, 590, 591, 593, 594, 595, 596, 597, 597, 598, 599, 599, 600, 600, 601, 601, 601, 602, 602, 602, 602, 603, 603, 603, 603, 603, 603, 604, 604, 604, 604, 604, 604
];

const SURAH_NAMES = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه", "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم", "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر", "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق", "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة", "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج", "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس", "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد", "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات", "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر", "المسد", "الإخلاص", "الفلق", "الناس"
];

export const QuranReader: React.FC<any> = ({ params, onBack }) => {
  const [currentPage, setCurrentPage] = useState<number>(params?.page || 1);
  const [loading, setLoading] = useState(false);
  const [quranData, setQuranData] = useState<any[]>([]);
  const [showControls, setShowGrammar] = useState(false); // Used for UI toggle
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Modals & Interaction state
  const [markers, setMarkers] = useState<any[]>([]);
  const [pageDimensions, setPageDimensions] = useState({ width: 235, height: 235 });
  const [highlights, setHighlights] = useState<Record<string, string>>({});
  const [selectedAyah, setSelectedAyah] = useState<any>(null);
  const [activeAyah, setActiveAyah] = useState<{surah: number, ayah: number} | null>(null);
  const [mutashabihatAyah, setMutashabihatAyah] = useState<any>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<any>(null);

  // Load Initial Data
  useEffect(() => {
    const init = async () => {
      const data = await localforage.getItem<any>('quran_text');
      if (data) setQuranData(data.data?.surahs || data || []);
      
      const savedHighlights = await localforage.getItem<Record<string, string>>('ayah_highlights');
      if (savedHighlights) setHighlights(savedHighlights);

      const savedPage = await localforage.getItem<number>('last_read_page');
      if (savedPage && !params?.page) setCurrentPage(savedPage);
      
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    init();
  }, []);

  // Update page when params change
  useEffect(() => {
    if (params?.page) {
        setLoading(true);
        setCurrentPage(params.page);
    } else if (params?.surah) {
        setLoading(true);
        setCurrentPage(SURAH_START_PAGES[params.surah - 1]);
    }
  }, [params]);

  // Load Markers for current page and determine dimensions
  useEffect(() => {
    const formattedPage = currentPage.toString().padStart(3, '0');
    fetch(`/json/${formattedPage}.json`)
        .then(res => res.json())
        .then(data => {
            setMarkers(data);
            
            // Determine page dimensions from marker coordinates
            let maxX = 235;
            let maxY = 235;
            data.forEach((m: any) => {
                const coords = m.polygon.match(/[\d.]+/g);
                if (coords) {
                    coords.forEach((c: string, i: number) => {
                        const val = parseFloat(c);
                        // Even indices are X, odd are Y
                        if (i % 2 === 0) maxX = Math.max(maxX, val);
                        else maxY = Math.max(maxY, val);
                    });
                }
            });

            // Normalize to standard Mushaf sizes to avoid noise from JSON
            if (maxX > 300) maxX = 345;
            if (maxY > 500) maxY = 550;
            if (maxX < 250 && maxY < 250) { maxX = 235; maxY = 235; }
            
            setPageDimensions({ width: maxX, height: maxY });
        })
        .catch(err => {
            console.warn(`Markers not found for page ${formattedPage}`, err);
            setMarkers([]);
            setPageDimensions({ width: 235, height: 235 });
        });
  }, [currentPage]);

  // Save progress
  useEffect(() => {
    localforage.setItem('last_read_page', currentPage);
  }, [currentPage]);

  const pageUrl = useMemo(() => {
    const formattedPage = currentPage.toString().padStart(3, '0');
    return `/svg/${formattedPage}.svg`;
  }, [currentPage]);

  const handleNextPage = () => {
    if (currentPage < 604) {
        setLoading(true);
        setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
        setLoading(true);
        setCurrentPage(prev => prev - 1);
    }
  };

  const { currentSurahName, currentSurahNumber, currentSurah } = useMemo(() => {
    let surahIdx = 0;
    for (let i = SURAH_START_PAGES.length - 1; i >= 0; i--) {
      if (currentPage >= SURAH_START_PAGES[i]) {
        surahIdx = i;
        break;
      }
    }
    return { 
        currentSurahName: SURAH_NAMES[surahIdx], 
        currentSurahNumber: surahIdx + 1,
        currentSurah: quranData[surahIdx] 
    };
  }, [currentPage, quranData]);

  const handleAyahClick = (marker: any) => {
    setActiveAyah({ surah: marker.surahNumber, ayah: marker.ayahNumber });
    setShowGrammar(false); // Close controls if clicking an ayah
  };

  const openTadabbur = (marker: any) => {
    const surah = quranData.find(s => s.number === marker.surahNumber);
    const ayah = surah?.ayahs.find((a: any) => a.numberInSurah === marker.ayahNumber);
    setSelectedAyah({
        surah: marker.surahNumber,
        ayah: marker.ayahNumber,
        text: ayah?.text || ''
    });
  };

  const handleTouchStart = (marker: any) => {
    longPressTimer.current = setTimeout(() => {
        openTadabbur(marker);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const saveHighlight = async (color: string | null) => {
    if (!selectedAyah) return;
    const key = `${selectedAyah.surah}:${selectedAyah.ayah}`;
    const newHighlights = { ...highlights };
    
    if (color) newHighlights[key] = color;
    else delete newHighlights[key];
    
    setHighlights(newHighlights);
    await localforage.setItem('ayah_highlights', newHighlights);
  };

  return (
    <div className="fixed inset-0 bg-[#f7edd7] dark:bg-slate-950 flex flex-col overflow-hidden" dir="rtl">
      {/* Top Header — fixed height, holds back + surah selector + prev/next nav + search */}
      <div className="h-11 shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b dark:border-slate-800 flex items-center justify-between px-1 z-50">
        {/* Left cluster: back + prev page */}
        <div className="flex items-center gap-0">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
            aria-label="رجوع"
          >
            <ChevronRight size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handlePrevPage(); }}
            disabled={currentPage <= 1}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition disabled:opacity-30"
            aria-label="الصفحة السابقة"
          >
            <ChevronRight size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Center: surah selector */}
        <div className="flex-1 flex justify-center">
          <select
            value={currentSurahNumber}
            onChange={(e) => setCurrentPage(SURAH_START_PAGES[Number(e.target.value) - 1])}
            className="bg-transparent border-none font-black text-slate-900 dark:text-white p-0 focus:ring-0 cursor-pointer text-sm text-center leading-tight max-w-[140px] truncate"
          >
            {SURAH_NAMES.map((name, i) => (
              <option key={i} value={i + 1} className="dark:bg-slate-900">
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Right cluster: search + next page */}
        <div className="flex items-center gap-0">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-90"
            aria-label="بحث"
          >
            <Search size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleNextPage(); }}
            disabled={currentPage >= 604}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition disabled:opacity-30"
            aria-label="الصفحة التالية"
          >
            <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* Main Mushaf Area — flex-1 fills all remaining space, zero vertical padding */}
      <div 
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden flex justify-center items-center bg-[#fdf6e3] dark:bg-slate-950"
        style={{ padding: '0 2px' }}
        onClick={() => setShowGrammar(!showControls)}
      >
        <div 
            className="relative h-full w-full max-w-full flex justify-center items-center"
            style={{ 
              aspectRatio: `${pageDimensions.width} / ${pageDimensions.height}`,
              maxWidth: '100%',
              margin: 0,
            }}
        >
            {/* SVG Page Image */}
            <img 
              src={pageUrl} 
              alt={`Page ${currentPage}`}
              className={`w-full h-full object-contain z-20 pointer-events-none ${loading ? 'opacity-30 blur-sm' : 'opacity-100'} ${isDarkMode ? 'dark-mushaf-filter' : 'multiply-blend'}`}
              onLoad={() => setLoading(false)}
            />
            
            {/* Interactive Ayah Overlay */}
            {!loading && markers.length > 0 && (
                <svg 
                    viewBox={`0 0 ${pageDimensions.width} ${pageDimensions.height}`} 
                    preserveAspectRatio="xMidYMid meet"
                    className="absolute inset-0 w-full h-full z-30"
                    style={{ mixBlendMode: isDarkMode ? 'screen' : 'multiply' }}
                >
                    {markers.map((m, i) => {
                        const isPath = m.polygon?.includes('M');
                        const Component = isPath ? 'path' : 'polygon';
                        const shapeProps = isPath ? { d: m.polygon } : { points: m.polygon };
                        
                        return (
                            <Component
                                key={`${currentPage}-${i}`}
                                {...shapeProps}
                                className="cursor-pointer outline-none"
                                fill={highlights[`${m.surahNumber}:${m.ayahNumber}`] || (activeAyah?.surah === m.surahNumber && activeAyah?.ayah === m.ayahNumber 
                                    ? (isDarkMode ? "rgba(139, 92, 246, 0.4)" : "rgba(16, 185, 129, 0.25)") 
                                    : "transparent")}
                                stroke={activeAyah?.surah === m.surahNumber && activeAyah?.ayah === m.ayahNumber 
                                    ? (isDarkMode ? "rgba(139, 92, 246, 0.6)" : "rgba(16, 185, 129, 0.5)") 
                                    : "transparent"}
                                strokeWidth="1"
                                onClick={(e: any) => {
                                    e.stopPropagation();
                                    handleAyahClick(m);
                                }}
                                onContextMenu={(e: any) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openTadabbur(m);
                                }}
                                onTouchStart={() => handleTouchStart(m)}
                                onTouchEnd={handleTouchEnd}
                                onTouchMove={handleTouchEnd}
                            />
                        );
                    })}
                </svg>
            )}
        </div>
      </div>

      {/* Bottom Page Number Bar — fixed height, always visible */}
      <div className="h-9 shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t dark:border-slate-800 flex items-center justify-between px-4 z-50">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          الجزء {Math.ceil(currentPage / 20)}
        </span>
        <span className="text-sm font-black text-violet-600 dark:text-violet-400">
          {currentPage}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {currentPage} / 604
        </span>
      </div>

      {/* Bottom Progress Slider (shown on tap) */}
      <div className={`fixed bottom-9 left-0 right-0 p-4 bg-gradient-to-t from-black/40 to-transparent transition-transform duration-500 z-50 ${showControls ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-xl mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl flex flex-col gap-3 border dark:border-slate-800">
              <input 
                type="range" 
                min="1" 
                max="604" 
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                className="w-full accent-violet-600 h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700"
              />
              <div className="flex justify-between items-center text-xs font-black text-slate-500 dark:text-slate-400">
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">الفاتحة</span>
                <div className="flex flex-col items-center">
                    <span className="text-violet-600 dark:text-violet-400 text-lg font-black">{currentPage}</span>
                    <span className="text-[10px] uppercase tracking-tighter opacity-60">صفحة</span>
                </div>
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">الناس</span>
              </div>
          </div>
      </div>

      {/* Global CSS for Dark Mode Filter */}
      <style>{`
        .dark-mushaf-filter {
          filter: invert(0.95) sepia(0.2) hue-rotate(150deg) brightness(1.3) contrast(1.1);
        }
        .multiply-blend {
          mix-blend-mode: multiply;
        }
      `}</style>

      {/* Ayah Tools Banner */}
      <AyahToolbar 
        isOpen={!!selectedAyah}
        onClose={() => setSelectedAyah(null)}
        ayahData={selectedAyah}
        onHighlight={saveHighlight}
      />

      <MutashabihatModal
        isOpen={!!mutashabihatAyah}
        onClose={() => setMutashabihatAyah(null)}
        surah={mutashabihatAyah?.surah}
        ayah={mutashabihatAyah?.ayah}
        ayahText={mutashabihatAyah?.text}
        onNavigateToAyah={(s, a) => {
          // Find page of surah/ayah
          setMutashabihatAyah(null);
        }}
      />

      <QuranSearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigateToAyah={(s, a) => {
          const startPage = SURAH_START_PAGES[s - 1];
          // Approximate page for ayah (this is complex because pages vary)
          // For now, we go to start of surah. Real apps use a mapping service.
          setCurrentPage(startPage);
          setIsSearchOpen(false);
          // Highlight the ayah
          setActiveAyah({ surah: s, ayah: a });
        }}
      />
    </div>
  );
};
