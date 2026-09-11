import { OutlineIcon, outlineContent } from './OutlineIcon';
import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  Filter,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import HadithDownloadModal from './HadithDownloadModal';
import {
  HADITH_EDITIONS,
  loadHadithCollection,
  type Hadith,
  type HadithEdition,
  type HadithLoadResult,
} from '../services/hadithService';
import { HadithFavoritesService, type FavoriteHadith } from '../services/hadithFavoritesService';
import { normalizeArabicText } from '../utils/textUtils';

interface HadithReaderProps {
  onBack: () => void;
}

const HadithReader: React.FC<HadithReaderProps> = ({ onBack }) => {
  const [edition, setEdition] = useState<string>('ara-bukhari');
  const [data, setData] = useState<HadithEdition | null>(null);
  const [loadState, setLoadState] = useState<HadithLoadResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [favoritesRevision, setFavoritesRevision] = useState(0);
  const itemsPerPage = 20;

  const favoritesList = useMemo(() => {
    void favoritesRevision;
    return HadithFavoritesService.getFavorites();
  }, [favoritesRevision]);

  useEffect(() => {
    const handleFavChange = () => setFavoritesRevision((v) => v + 1);
    window.addEventListener('hadith_favorites_changed', handleFavChange);
    return () => window.removeEventListener('hadith_favorites_changed', handleFavChange);
  }, []);

  useEffect(() => {
    if (edition === 'favorites') {
      setLoading(true);
      const favs = HadithFavoritesService.getFavorites();
      const hadiths: Hadith[] = favs.map((f) => ({
        hadithnumber: f.hadithnumber,
        arabicnumber: f.arabicnumber,
        text: f.text,
        grades: f.grades || [],
        section: f.section ? `${f.collectionName} • ${f.section}` : f.collectionName,
        reference: {
          collection: f.collection as any,
          edition: `ara-${f.collection}`,
          provider: 'fawazahmed-cdn',
        },
      }));

      setData({
        name: 'الأحاديث المفضلة',
        author: 'مختاراتك المحفوظة',
        hadiths,
        metadata: {
          id: 'fawazahmed-cdn',
          name: 'المفضلة',
          baseUrl: '',
          sourceType: 'json-repository',
          language: 'ara',
          supportedCollections: [],
          editions: {} as any,
        },
      });
      setLoadState({
        status: 'local',
        collection: 'bukhari',
        edition: 'favorites',
        data: null,
        isDownloaded: true,
        shouldPromptDownload: false,
      });
      setSelectedSection('all');
      setCurrentPage(1);
      setLoading(false);
      return;
    }

    const selectedEdition = HADITH_EDITIONS.find((item) => item.id === edition);
    if (!selectedEdition) {
      return;
    }

    const loadHadiths = async () => {
      setLoading(true);
      const result = await loadHadithCollection(selectedEdition.collection);
      setLoadState(result);
      setData(result.data);
      setSelectedSection('all');
      setCurrentPage(1);
      setLoading(false);
    };

    void loadHadiths();
  }, [edition, favoritesRevision]);

  const normalizedSearchQuery = useMemo(() => normalizeArabicText(searchQuery || ''), [searchQuery]);

  const sections = useMemo(() => {
    if (!data?.hadiths) {
      return [];
    }

    const list: string[] = [];
    const seen = new Set<string>();
    for (const hadith of data.hadiths) {
      const section = hadith.section?.trim();
      if (section && !seen.has(section)) {
        seen.add(section);
        list.push(section);
      }
    }
    return list;
  }, [data]);

  const filteredHadiths = useMemo(() => {
    if (!data?.hadiths) {
      return [];
    }

    return data.hadiths.filter((hadith) => {
      if (!hadith.text || !hadith.text.trim()) {
        return false;
      }
      const matchesSection = selectedSection === 'all' || hadith.section === selectedSection;
      if (!matchesSection) {
        return false;
      }

      if (!normalizedSearchQuery) {
        return true;
      }

      const normalizedText = normalizeArabicText(hadith.text || '');
      const normalizedSection = normalizeArabicText(hadith.section || '');

      return (
        normalizedText.includes(normalizedSearchQuery) ||
        normalizedSection.includes(normalizedSearchQuery) ||
        hadith.hadithnumber.toString().includes(normalizedSearchQuery) ||
        hadith.arabicnumber.toString().includes(normalizedSearchQuery)
      );
    });
  }, [data, normalizedSearchQuery, selectedSection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearchQuery, selectedSection]);

  const totalPages = Math.ceil(filteredHadiths.length / itemsPerPage);
  const currentItems = filteredHadiths.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success('تم نسخ الحديث بنجاح');
  };

  const handleShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'حديث شريف',
          text,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopy(text);
    }
  };

  const handleToggleFavorite = (hadith: Hadith) => {
    const selectedEdition = HADITH_EDITIONS.find((item) => item.collection === hadith.reference.collection);
    const collectionName = selectedEdition?.name || 'الأحاديث النبوية';
    const isAdded = HadithFavoritesService.toggleFavorite(hadith, collectionName);
    setFavoritesRevision((v) => v + 1);
    if (isAdded) {
      toast.success("تمت إضافة الحديث إلى المفضلة ");
    } else {
      toast.success('تمت إزالة الحديث من المفضلة');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="animate-spin text-violet-600" size={40} />
          <p className="text-slate-500 font-bold">جارٍ تحميل الأحاديث...</p>
        </div>
      );
    }

    if (edition === 'favorites' && favoritesList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-inner">
            <Star size={32} />
          </div>
          <p className="text-slate-700 dark:text-slate-200 font-black text-lg">لا توجد أحاديث في المفضلة بعد</p>
          <p className="text-sm font-bold text-slate-500 max-w-xs leading-relaxed">
            
            يمكنك النقر على زر النجمة <OutlineIcon name="star" /> بجانب أي حديث شريف لحفظه هنا والرجوع إليه بسهولة.
          </p>
        </div>
      );
    }

    if (loadState?.status === 'download_required' && !data) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <BookOpen size={60} className="text-slate-200 dark:text-slate-800" />
          <p className="text-slate-700 dark:text-slate-200 font-black text-lg">هذه المجموعة غير متوفرة محليًا الآن</p>
          <p className="text-sm font-bold text-slate-500 max-w-xs leading-relaxed">
            افتح مدير التنزيلات من زر الإعدادات لتحميل الكتاب واستخدامه بدون إنترنت.
          </p>
          <button
            onClick={() => setIsDownloadModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-violet-600 text-white font-black shadow-lg shadow-violet-500/20 active:scale-95"
          >
            فتح مدير التنزيلات
          </button>
        </div>
      );
    }

    if (loadState?.status === 'unavailable' && !data) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <BookOpen size={60} className="text-slate-200 dark:text-slate-800" />
          <p className="text-slate-700 dark:text-slate-200 font-black text-lg">تعذر تحميل الأحاديث الآن</p>
          <p className="text-sm font-bold text-slate-500 max-w-xs leading-relaxed">
            تأكد من الاتصال بالإنترنت أو قم بتحميل المجموعة مسبقًا من مدير التنزيلات.
          </p>
        </div>
      );
    }

    if (currentItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <BookOpen size={60} className="text-slate-200 dark:text-slate-800" />
          <p className="text-slate-500 font-bold text-lg">لم يتم العثور على نتائج</p>
        </div>
      );
    }

    return currentItems.map((hadith: Hadith, idx) => {
      const isFav = HadithFavoritesService.isFavorite(hadith.reference.collection, hadith.hadithnumber);

      return (
        <div
          key={`${hadith.reference.collection}-${hadith.hadithnumber}-${idx}`}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 animate-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: `${idx * 50}ms` }}
        >
          <div className="flex justify-between items-start gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex">
                  حديث رقم {hadith.hadithnumber}
                </div>
                {hadith.section && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-700/40 text-amber-800 dark:text-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex">
                    {hadith.section}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleToggleFavorite(hadith)}
                className={`p-2 rounded-xl border transition active:scale-90 ${
                  isFav
                    ? 'bg-amber-500/15 text-amber-500 border-amber-400/40 shadow-sm'
                    : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent'
                }`}
                title={isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                aria-label="المفضلة"
              >
                <Star size={18} fill={isFav ? 'currentColor' : 'none'} />
              </button>
              <button onClick={() => handleCopy(hadith.text)} className="p-2 text-slate-400 hover:text-violet-600 transition" title="نسخ الحديث">
                <Copy size={18} />
              </button>
              <button onClick={() => void handleShare(hadith.text)} className="p-2 text-slate-400 hover:text-violet-600 transition" title="مشاركة الحديث">
                <Share2 size={18} />
              </button>
            </div>
          </div>

          <p className="text-lg leading-relaxed font-arabic text-slate-800 dark:text-slate-200 text-right font-medium">
            {hadith.text}
          </p>

          {hadith.grades.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {hadith.grades.map((grade, gradeIndex) => (
                <div key={gradeIndex} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <Star size={12} className="text-amber-500 fill-amber-500" />
                  <span className="text-[10px] font-bold text-slate-500">
                    {grade.name}: {grade.grade}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 safe-top">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <ChevronRight size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">الأحاديث النبوية</h2>
          <button
            onClick={() => setIsDownloadModalOpen(true)}
            className="p-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-violet-600 transition"
            aria-label="فتح مدير التنزيلات"
          >
            <Settings size={20} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setEdition('favorites')}
              className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                edition === 'favorites'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <Star size={14} fill={edition === 'favorites' ? 'currentColor' : 'none'} />
              <span>المفضلة ({favoritesList.length})</span>
            </button>
            {HADITH_EDITIONS.map((ed) => (
              <button
                key={ed.id}
                onClick={() => setEdition(ed.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  edition === ed.id
                    ? 'bg-violet-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {ed.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-[11px] font-black">
          <span
            className={`px-3 py-1 rounded-full ${
              loadState?.status === 'local'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {loadState?.status === 'local' ? 'وضع أوفلاين' : 'عرض مباشر'}
          </span>
          <button
            onClick={() => setIsDownloadModalOpen(true)}
            className="text-violet-600 dark:text-violet-400 hover:underline"
          >
            إدارة التنزيلات
          </button>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="ابحث بحثًا عامًا في النص أو الباب أو رقم الحديث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-3 pr-10 pl-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
              <Filter size={16} className="text-violet-500" />
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full bg-transparent outline-none font-bold"
              >
                <option value="all">كل الأبواب والموضوعات ({sections.length} باب)</option>
                {sections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </label>

            <div className="px-3 py-2 rounded-2xl bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs font-black text-center">
              {filteredHadiths.length} نتيجة
            </div>

            <div className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black text-center">
              {data?.hadiths.length || 0} حديث
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-bold px-1">
            البحث الحالي عام داخل نص الحديث والباب ورقم الحديث، مع فلترة حسب الموضوع.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">{renderContent()}</div>

      {!loading && totalPages > 1 && currentItems.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            className={`p-2 rounded-full border border-slate-200 dark:border-slate-800 ${currentPage === 1 ? 'opacity-30' : 'active:scale-95'}`}
          >
            <ChevronRight size={24} />
          </button>

          <span className="text-xs font-bold text-slate-500">صفحة {currentPage} من {totalPages}</span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            className={`p-2 rounded-full border border-slate-200 dark:border-slate-800 ${currentPage === totalPages ? 'opacity-30' : 'active:scale-95'}`}
          >
            <ChevronLeft size={24} />
          </button>
        </div>
      )}

      <HadithDownloadModal isOpen={isDownloadModalOpen} onClose={() => setIsDownloadModalOpen(false)} />
    </div>
  );
};

export default HadithReader;
