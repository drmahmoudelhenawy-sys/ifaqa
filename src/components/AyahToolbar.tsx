import React, { useEffect, useState } from 'react';
import {
  Play, Copy, X, ChevronDown, ChevronUp, BookOpen,
  Info, Library, Layers, MessageSquare, Bookmark,
  ChevronLeft, ChevronRight, Loader2, Sparkles, AlertTriangle, Folder, Share2
} from 'lucide-react';
import { fetchIraabSurahOnline, fetchTafsirAyahOnline, getOfflineIraab, getOfflineTafsir, getTafsirStorageKey, TAFSIR_KEYS } from '../services/offlineBundle';
import { QuranOfflineManager, AyahUIBannerData } from '../services/quranOfflineManager';
import { quraniApi } from '../services/quraniApi';
import { findAdvancedMutashabihat } from '../services/mutashabihatEngine';

interface WordData {
  wordText: string;
  meaning: string;
  grammarRole: string;
  root?: string;
  weight?: string;
}

interface AyahData {
  surah: number;
  ayah: number;
  text: string;
}

interface TafseerSource {
  id: number;
  name?: string;
  book_name?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ayahData: AyahData | null;
  onHighlight: (color: string) => void;
  onOpenGroupPicker?: () => void;
  onPrevAyah?: () => void;
  onNextAyah?: () => void;
  onAddNote?: () => void;
  onBookmark?: () => void;
  onDownloadSurahTools?: () => void;
  onDownloadCurrentMorphology?: () => void;
  onOpenWordMeanings?: () => void;
  onOpenMutashabihat?: () => void;
  onOpenAyahTheme?: () => void;
  onOpenIraab?: () => void;
  onDownloadCurrentTajweed?: () => void;
  onNavigateToAyah?: (surahId: number, ayahId: number, pageNumber: number) => void;
  onShareCard?: () => void;
  surahName?: string;
  availableTafseers?: TafseerSource[];
  selectedTafseerId?: number;
  onTafseerChange?: (id: number) => void;
}

const colors = [
  { name: 'yellow', value: 'rgba(253, 224, 71, 0.4)' },
  { name: 'green', value: 'rgba(34, 197, 94, 0.4)' },
  { name: 'blue', value: 'rgba(59, 130, 246, 0.4)' },
  { name: 'brown', value: 'rgba(165, 42, 42, 0.4)' },
];

const sections = [
  { key: 'tafsir', label: 'التفسير الميسر', icon: BookOpen, source: 'التفسير الميسر', offlineKey: TAFSIR_KEYS.muyassar, quranComId: 16 },
  { key: 'words', label: 'معاني الكلمات', icon: Library, source: 'مفردات القرآن' },
  { key: 'mutashabih', label: 'المتشابهات اللفظية', icon: Layers, source: 'الآيات المتشابهة' },
  { key: 'theme', label: 'موضوع الآية', icon: Info, source: 'الموضوعات والقصص' },
  { key: 'tajweed', label: 'أحكام التجويد', icon: Sparkles, source: 'قواعد الترتيل' },
  { key: 'irab', label: 'الإعراب التفصيلي', icon: MessageSquare, source: 'الإعراب الميسر', offlineKey: TAFSIR_KEYS.qurtubi, quranComId: 90 },
] as const;

function formatTafsirText(raw: string): string[] {
  const clean = raw
    .replace(/<[^>]*>?/gm, '')
    .replace(/\r\n/g, '\n')
    .trim();

  const parts = clean
    .split(/(?<=[\u0621-\u064A\w\d\)\]"'»›،;:])\s*[\n]+\s*/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return parts.length > 0 ? parts : [clean];
}

function normalizeWordEntry(word: any): WordData {
  const morphology = word?.morphology ?? {};
  return {
    wordText: word?.word?.text || word?.text || word?.word || '',
    meaning:
      morphology.translation ||
      morphology.gloss ||
      morphology.meaning ||
      word?.meaning ||
      'لا تتوفر ترجمة مختصرة لهذه الكلمة',
    grammarRole: morphology.grammar || word?.grammar_role || 'غير متوفر',
    root: morphology.root,
    weight: morphology.lemma,
  };
}

function hasArabicWordMeanings(words?: WordData[]): boolean {
  return Boolean(words?.length && words.every((word) => /[\u0600-\u06FF]/.test(word.meaning || '')));
}

type SectionState = {
  status: 'loading' | 'loaded' | 'error';
  paragraphs: string[];
  action?: { label: string; onClick: () => void };
};

export const AyahToolbar: React.FC<Props> = ({
  isOpen,
  onClose,
  ayahData,
  onHighlight,
  onOpenGroupPicker,
  onPrevAyah,
  onNextAyah,
  onBookmark,
  onDownloadSurahTools,
  onDownloadCurrentMorphology,
  onOpenWordMeanings,
  onOpenMutashabihat,
  onOpenAyahTheme,
  onOpenIraab,
  onDownloadCurrentTajweed,
  onNavigateToAyah,
  onShareCard,
  surahName,
  selectedTafseerId = 1,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [sectionState, setSectionState] = useState<Record<string, SectionState>>({});
  const [hubData, setHubData] = useState<AyahUIBannerData | null>(null);
  const [showPlayOptions, setShowPlayOptions] = useState(false);
  const [segments, setSegments] = useState<any[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);

  useEffect(() => {
    setExpandedSection(null);
    setSectionState({});
    setShowPlayOptions(false);
    setHubData(null);

    if (isOpen && ayahData) {
      QuranOfflineManager.getAyahDataOffline(ayahData.surah, ayahData.ayah).then((data) => {
        if (data) setHubData(data);
      });
      quraniApi
        .getAyahSegments(ayahData.surah, ayahData.ayah)
        .then(setSegments)
        .catch(() => setSegments([]));
    }
  }, [ayahData?.surah, ayahData?.ayah, isOpen]);

  useEffect(() => {
    const handleTimeUpdate = (e: any) => {
      const { currentTime, surah, ayah } = e.detail;
      if (ayahData && surah === ayahData.surah && ayah === ayahData.ayah && segments.length > 0) {
        const index = segments.findIndex((s) => currentTime >= s.startTime && currentTime <= s.endTime);
        setCurrentWordIndex(index !== -1 ? index : null);
      } else {
        setCurrentWordIndex(null);
      }
    };

    window.addEventListener('quran_audio_timeupdate', handleTimeUpdate);
    return () => window.removeEventListener('quran_audio_timeupdate', handleTimeUpdate);
  }, [ayahData, segments]);

  if (!isOpen || !ayahData) return null;

  const handleCopy = () => navigator.clipboard.writeText(ayahData.text);

  const handlePlayRequest = (mode: 'ayah' | 'surah') => {
    window.dispatchEvent(
      new CustomEvent('play_ayah_request', {
        detail: {
          surah: ayahData.surah,
          ayah: ayahData.ayah,
          mode,
        },
      })
    );
    setShowPlayOptions(false);
  };

  const handleSectionExpand = async (sectionKey: string) => {
    if (expandedSection === sectionKey) {
      setExpandedSection(null);
      return;
    }
    setExpandedSection(sectionKey);

    if (sectionState[sectionKey]?.status === 'loaded') return;

    setSectionState((prev) => ({ ...prev, [sectionKey]: { status: 'loading', paragraphs: [] } }));

    if (sectionKey === 'tafsir') {
      const offline = await getOfflineTafsir(ayahData.surah, ayahData.ayah, getTafsirStorageKey(selectedTafseerId));
      if (offline) {
        setSectionState((prev) => ({
          ...prev,
          tafsir: { status: 'loaded', paragraphs: formatTafsirText(offline) },
        }));
        return;
      }
      try {
        const online = await fetchTafsirAyahOnline(selectedTafseerId, ayahData.surah, ayahData.ayah);
        if (online) {
          setSectionState((prev) => ({
            ...prev,
            tafsir: { status: 'loaded', paragraphs: formatTafsirText(online) },
          }));
          return;
        }
      } catch {}
      setSectionState((prev) => ({
        ...prev,
        tafsir: {
          status: 'error',
          paragraphs: ['التفسير غير متوفر حالياً بدون إنترنت لهذا الموضع.'],
          action: onDownloadSurahTools
            ? { label: 'تحميل حزمة التفسير لهذه السورة', onClick: onDownloadSurahTools }
            : undefined,
        },
      }));
    } else if (sectionKey === 'words') {
      if (hasArabicWordMeanings(hubData?.wordByWord)) {
        setSectionState((prev) => ({
          ...prev,
          words: { status: 'loaded', paragraphs: ['تم جلب بيانات الكلمات'] },
        }));
        return;
      }
      try {
        const onlineAyah = await quraniApi.getAyahDetails(ayahData.surah, ayahData.ayah);
        if (onlineAyah && Array.isArray(onlineAyah.words)) {
          const mappedWords = onlineAyah.words.map(normalizeWordEntry).filter((word) => /[\u0600-\u06FF]/.test(word.meaning));
          if (mappedWords.length === 0) throw new Error('arabic-word-meanings-empty');
          setHubData((prev) => ({
            ...(prev || {
              surahId: ayahData.surah,
              ayahId: ayahData.ayah,
              text: ayahData.text,
              surahName: surahName || '',
            }),
            wordByWord: mappedWords,
          }));
          setSectionState((prev) => ({
            ...prev,
            words: { status: 'loaded', paragraphs: ['تم جلب بيانات الكلمات'] },
          }));
          return;
        }
      } catch {}

      setSectionState((prev) => ({
        ...prev,
        words: {
          status: 'error',
          paragraphs: ['معاني الكلمات غير متوفرة أوفلاين لهذه السورة.'],
          action: onDownloadCurrentMorphology
            ? { label: 'تحميل معاني الكلمات للسورة', onClick: onDownloadCurrentMorphology }
            : onOpenWordMeanings
            ? { label: 'فتح المعجم اللغوي الكامل', onClick: onOpenWordMeanings }
            : undefined,
        },
      }));
    } else if (sectionKey === 'mutashabih') {
      if (hubData?.mutashabihat && hubData.mutashabihat.length > 0) {
        setSectionState((prev) => ({
          ...prev,
          mutashabih: { status: 'loaded', paragraphs: ['تم جلب المتشابهات'] },
        }));
        return;
      }
      try {
        let curated: any[] = [];
        try {
          curated = await QuranOfflineManager.getFilteredMutashabihatForAyah(ayahData.surah, ayahData.ayah);
        } catch {}
        const online = await findAdvancedMutashabihat(ayahData.surah, ayahData.ayah, curated, 5);
        if (online && online.length > 0) {
          setHubData((prev) => ({
            ...(prev || {
              surahId: ayahData.surah,
              ayahId: ayahData.ayah,
              text: ayahData.text,
              surahName: surahName || '',
            }),
            mutashabihat: online,
          }));
          setSectionState((prev) => ({
            ...prev,
            mutashabih: { status: 'loaded', paragraphs: ['تم جلب المتشابهات'] },
          }));
          return;
        }
      } catch {}

      setSectionState((prev) => ({
        ...prev,
        mutashabih: {
          status: 'error',
          paragraphs: ['لم يجد المحرك تشابهًا لفظيًا قويًا لهذه الآية.'],
        },
      }));
    } else if (sectionKey === 'theme') {
      if (hubData?.themeTitle) {
        setSectionState((prev) => ({
          ...prev,
          theme: { status: 'loaded', paragraphs: [hubData.themeTitle] },
        }));
        return;
      }
      try {
        const online = await quraniApi.getBestAyahTopic(ayahData.surah, ayahData.ayah);
        if (online.title) {
          setHubData((prev) => ({
            ...(prev || {
              surahId: ayahData.surah,
              ayahId: ayahData.ayah,
              text: ayahData.text,
              surahName: surahName || '',
            }),
            themeTitle: online.title,
          }));
          setSectionState((prev) => ({
            ...prev,
            theme: { status: 'loaded', paragraphs: [online.title, ...online.related] },
          }));
          return;
        }
      } catch {}

      setSectionState((prev) => ({
        ...prev,
        theme: {
          status: 'error',
          paragraphs: ['موضوع الآية غير متوفر أوفلاين.'],
          action: onOpenAyahTheme
            ? { label: 'فتح موضوعات السورة', onClick: onOpenAyahTheme }
            : undefined,
        },
      }));
    } else if (sectionKey === 'tajweed') {
      if (hubData?.tajweed?.length) {
        setSectionState((prev) => ({
          ...prev,
          tajweed: { status: 'loaded', paragraphs: hubData.tajweed },
        }));
        return;
      }
      try {
        const rules = await quraniApi.getTajweedRules(ayahData.surah, ayahData.ayah);
        if (rules && rules.length > 0) {
          setSectionState((prev) => ({
            ...prev,
            tajweed: { status: 'loaded', paragraphs: rules },
          }));
          return;
        }
      } catch {}
      setSectionState((prev) => ({
        ...prev,
        tajweed: {
          status: 'error',
          paragraphs: ['تعذر جلب أحكام التجويد لهذه الآية.'],
          action: onDownloadCurrentTajweed
            ? { label: 'تحميل أحكام التجويد للسورة', onClick: onDownloadCurrentTajweed }
            : undefined,
        },
      }));
    } else if (sectionKey === 'irab') {
      const offline = await getOfflineIraab(ayahData.surah, ayahData.ayah);
      if (offline) {
        setSectionState((prev) => ({
          ...prev,
          irab: { status: 'loaded', paragraphs: formatTafsirText(offline) },
        }));
        return;
      }
      try {
        const online = await fetchIraabSurahOnline(ayahData.surah);
        const onlineEntry = online.find((item: any) => Number(item?.ayah) === ayahData.ayah || Number(item?.number) === ayahData.ayah);
        const onlineText = onlineEntry?.text || onlineEntry?.content || onlineEntry?.iraab;
        if (onlineText) {
          setSectionState((prev) => ({
            ...prev,
            irab: { status: 'loaded', paragraphs: formatTafsirText(onlineText) },
          }));
          return;
        }
      } catch {}
      setSectionState((prev) => ({
        ...prev,
        irab: {
          status: 'error',
          paragraphs: ['الإعراب غير متوفر لهذه السورة بدون إنترنت.'],
          action: onOpenIraab
            ? { label: 'فتح نافذة الإعراب والتحميل', onClick: onOpenIraab }
            : undefined,
        },
      }));
    }
  };

  const getRoleColor = (role: string) => {
    if (role.includes('مبتدأ') || role.includes('فاعل'))
      return 'border-blue-500/20 bg-blue-50/50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-200';
    if (role.includes('خبر') || role.includes('مفعول'))
      return 'border-emerald-500/20 bg-emerald-50/50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200';
    if (role.includes('مجرور') || role.includes('إضافة'))
      return 'border-purple-500/20 bg-purple-50/50 text-purple-900 dark:border-purple-500/30 dark:bg-purple-950/30 dark:text-purple-200';
    return 'border-slate-200 bg-slate-50/80 text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300';
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl rounded-t-[2.5rem] border-t border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/95"
      dir="rtl"
    >
      <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-1.5 p-3.5 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              onClick={() => setShowPlayOptions(!showPlayOptions)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/20 transition hover:scale-105 active:scale-95"
              title="خيارات الاستماع"
              aria-label="تشغيل"
            >
              <Play size={18} fill="currentColor" />
            </button>
            {showPlayOptions && (
              <div className="absolute right-0 top-13 z-50 w-52 space-y-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in duration-150">
                <button
                  onClick={() => handlePlayRequest('ayah')}
                  className="w-full rounded-xl p-2.5 text-right text-xs font-black transition hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-800"
                >
                  الاستماع لهذه الآية فقط
                </button>
                <button
                  onClick={() => handlePlayRequest('surah')}
                  className="w-full rounded-xl p-2.5 text-right text-xs font-black transition hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-800"
                >
                  الاستماع بداية من هذه الآية
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleCopy}
            className="rounded-2xl border border-slate-200/60 bg-slate-100/80 p-2.5 text-slate-600 transition hover:scale-105 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 active:scale-90"
            title="نسخ الآية"
            aria-label="نسخ"
          >
            <Copy size={17} />
          </button>

          <button
            onClick={onBookmark}
            className="rounded-2xl border border-slate-200/60 bg-slate-100/80 p-2.5 text-slate-600 transition hover:scale-105 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 active:scale-90"
            title="حفظ علامة"
            aria-label="علامة"
          >
            <Bookmark size={17} />
          </button>

          {/* Group / Folder button */}
          <button
            onClick={() => onOpenGroupPicker ? onOpenGroupPicker() : onHighlight('yellow')}
            className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400 transition hover:scale-105 hover:bg-amber-500/20 active:scale-90 flex items-center gap-1"
            title="حفظ في مجلد / مجموعة"
            aria-label="مجلد"
          >
            <Folder size={17} />
          </button>

          {/* Share as Card button */}
          {onShareCard && (
            <button
              onClick={onShareCard}
              className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-2.5 text-purple-600 dark:text-purple-400 transition hover:scale-105 hover:bg-purple-500/20 active:scale-90 flex items-center gap-1"
              title="مشاركة الآية كبطاقة صورة"
              aria-label="بطاقة الآية"
            >
              <Share2 size={17} />
            </button>
          )}
        </div>

        {/* Colors quick picker */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200/60 bg-slate-100/80 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-800/80">
          {colors.map((color) => (
            <button
              key={color.name}
              onClick={() => onHighlight(color.name)}
              className="h-5 w-5 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-125 active:scale-90 dark:border-slate-900"
              style={{ backgroundColor: color.value.replace('0.4', '1') }}
            />
          ))}
          <button
            onClick={() => onHighlight('transparent')}
            className="p-0.5 text-slate-400 opacity-70 transition hover:text-rose-500 hover:opacity-100 active:scale-90"
            title="إلغاء التلوين"
          >
            <X size={14} />
          </button>
        </div>

        <button
          onClick={onClose}
          className="rounded-2xl p-2 text-slate-400 opacity-80 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white active:scale-90"
          aria-label="إغلاق"
        >
          <X size={19} />
        </button>
      </div>

      {/* Expandable Info Tabs */}
      <div className="max-h-[50vh] space-y-1 overflow-y-auto p-2" dir="rtl">
        {sections.map((sec) => {
          const state = sectionState[sec.key];
          const isExpanded = expandedSection === sec.key;
          return (
            <div key={sec.key} className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/60">
              <button
                onClick={() => handleSectionExpand(sec.key)}
                className={`w-full px-4 py-3 transition-all ${
                  isExpanded
                    ? 'bg-emerald-50/70 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200'
                    : 'bg-transparent text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <sec.icon size={18} className={isExpanded ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                    <div className="text-right">
                      <span className="block text-xs sm:text-sm font-black">{sec.label}</span>
                      <span className="text-[10px] font-bold opacity-60">{sec.source}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-emerald-600" /> : <ChevronDown size={16} className="opacity-50" />}
                </div>
              </button>

              {isExpanded && (
                <div className="animate-in border-t border-slate-100 bg-white px-4 py-3.5 text-xs sm:text-sm dark:border-slate-800 dark:bg-slate-950/60 fade-in duration-200">
                  {state?.status === 'loading' ? (
                    <div className="flex items-center gap-2 py-2 text-slate-400 font-bold">
                      <Loader2 size={16} className="animate-spin text-emerald-600" />
                      <span className="text-xs">جارٍ التحميل والتجهيز...</span>
                    </div>
                  ) : state?.status === 'error' ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/30 dark:bg-rose-950/20">
                      <div className="mb-2 flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <AlertTriangle size={16} />
                        <span className="text-xs font-bold">{state.paragraphs[0]}</span>
                      </div>
                      {state.action && (
                        <button
                          onClick={state.action.onClick}
                          className="w-full rounded-xl bg-rose-600 py-2 text-xs font-black text-white shadow-lg shadow-rose-600/20 transition active:scale-95"
                        >
                          {state.action.label}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sec.key === 'words' && (hubData?.wordByWord?.length ?? 0) > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {hubData?.wordByWord?.map((word, idx) => {
                            const isCurrent = currentWordIndex === idx;
                            const roleStyles = getRoleColor(word.grammarRole);
                            return (
                              <div
                                key={idx}
                                className={`rounded-2xl border p-3 transition-all duration-300 ${
                                  isCurrent
                                    ? 'scale-105 border-emerald-500 bg-emerald-600 text-white shadow-lg'
                                    : roleStyles
                                }`}
                              >
                                <p className={`mb-1 text-center text-lg font-quran ${isCurrent ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{word.wordText}</p>
                                <p className={`mb-1 text-center text-[11px] font-black ${isCurrent ? 'text-white/95' : 'text-emerald-700 dark:text-emerald-400'}`}>{word.meaning}</p>
                                <div className="mb-1 flex flex-wrap justify-center gap-1">
                                  {word.root && <span className={`rounded-md px-1.5 py-0.5 text-[8px] font-bold ${isCurrent ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>جذر: {word.root}</span>}
                                  {word.weight && <span className={`rounded-md px-1.5 py-0.5 text-[8px] font-bold ${isCurrent ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>وزن: {word.weight}</span>}
                                </div>
                                <p className={`text-center text-[9px] font-bold leading-tight opacity-60 ${isCurrent ? 'text-white/80' : ''}`}>{word.grammarRole}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {sec.key === 'mutashabih' && (hubData?.mutashabihat?.length ?? 0) > 0 && (
                        <div className="space-y-2.5">
                          {hubData?.mutashabihat?.map((m, idx) => (
                            <button type="button" onClick={() => onNavigateToAyah?.((m as any).surahId, m.ayahNumber, (m as any).pageNumber)} key={idx} className="w-full rounded-2xl border-r-4 border-rose-500 bg-slate-50/80 p-3 text-right dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                              <p className="mb-1 text-xs font-black text-slate-800 dark:text-slate-100">سورة {m.surahName.replace('سورة ', '')} - آية {m.ayahNumber}{(m as any).pageNumber ? ` - صفحة ${(m as any).pageNumber}` : ''}</p>
                              <p className="text-xs sm:text-sm font-quran leading-relaxed text-slate-600 dark:text-slate-300">{m.text}</p>
                            </button>
                          ))}
                        </div>
                      )}

                      {sec.key !== 'words' && sec.key !== 'mutashabih' && state?.paragraphs.map((paragraph, i) => (
                        <p key={i} className="font-sans text-xs sm:text-sm leading-[2.1] text-justify font-bold text-slate-700 dark:text-slate-200">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-b-[2.2rem] border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-950/60 px-4 py-3">
        <button
          onClick={onPrevAyah}
          className="p-2 text-slate-400 transition hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-75"
          title="الآية السابقة"
          aria-label="الآية السابقة"
        >
          <ChevronRight size={22} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-black text-slate-800 dark:text-white">{surahName || `سورة ${ayahData.surah}`}</span>
          <span className="text-[10px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 font-mono">آية {ayahData.ayah}</span>
        </div>
        <button
          onClick={onNextAyah}
          className="p-2 text-slate-400 transition hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-75"
          title="الآية التالية"
          aria-label="الآية التالية"
        >
          <ChevronLeft size={22} />
        </button>
      </div>
    </div>
  );
};
