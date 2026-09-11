import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, CheckCircle2, Sparkles, Star, ThumbsUp, AlertCircle, RotateCcw, 
  BookOpen, Plus, Tag, MessageSquare, Award, ArrowLeft
} from 'lucide-react';

const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNumber(value: number | string) {
  return String(value).replace(/[0-9]/g, (digit) => arabicDigits[Number(digit)]);
}

export interface WirdEvaluation {
  id: string;
  wirdId: string;
  wirdTitle: string;
  date: string;
  startPage: number;
  endPage: number;
  totalPages: number;
  quality: 'perfect' | 'good' | 'with_errors' | 'needs_repeat';
  notes: string;
  weakPoints: string[];
  xpAwarded: number;
  createdAt: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  wirdId: string;
  wirdTitle: string;
  startPage: number;
  currentPage: number;
  surahName?: string;
  isReadingWird?: boolean;
  onSaveEvaluation: (evaluation: WirdEvaluation) => void;
}

export const getQualityOptions = () => [
  {
    id: 'perfect' as const,
    label: 'ممتاز · إتقان تام',
    desc: 'تلاوة وحفظ متقن دون أي أخطاء أو تردد',
    icon: Star,
    xp: 150,
    color: 'emerald',
    borderColor: 'border-emerald-500',
    bgActive: 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border-emerald-500',
    badgeBg: 'bg-emerald-500 text-white'
  },
  {
    id: 'good' as const,
    label: 'جيد جداً · تردد يسير',
    desc: 'حفظ جيد مع تردد خفيف أو خطأ تم تداركه',
    icon: ThumbsUp,
    xp: 120,
    color: 'sky',
    borderColor: 'border-sky-500',
    bgActive: 'bg-sky-500/15 text-sky-900 dark:text-sky-200 border-sky-500',
    badgeBg: 'bg-sky-500 text-white'
  },
  {
    id: 'with_errors' as const,
    label: 'يحتاج تثبيت · أخطاء',
    desc: 'عدة أخطاء أو نسيان لبعض الآيات يتطلب مراجعة قريبة وتثبيتاً',
    icon: AlertCircle,
    xp: 90,
    color: 'amber',
    borderColor: 'border-amber-500',
    bgActive: 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500',
    badgeBg: 'bg-amber-500 text-white'
  },
  {
    id: 'needs_repeat' as const,
    label: 'إعادة · تكرار الحفظ',
    desc: 'الحفظ غير ثابت ويلزم تكرار ورد الحفظ نفسه غداً',
    icon: RotateCcw,
    xp: 60,
    color: 'rose',
    borderColor: 'border-rose-500',
    bgActive: 'bg-rose-500/15 text-rose-900 dark:text-rose-200 border-rose-500',
    badgeBg: 'bg-rose-500 text-white'
  },
];

export const WirdEvaluationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  wirdId,
  wirdTitle,
  startPage,
  currentPage,
  surahName,
  isReadingWird,
  onSaveEvaluation
}) => {
  const [quality, setQuality] = useState<'perfect' | 'good' | 'with_errors' | 'needs_repeat'>('perfect');
  const [notes, setNotes] = useState('');
  const [weakPointInput, setWeakPointInput] = useState('');
  const [weakPoints, setWeakPoints] = useState<string[]>([]);

  if (!isOpen) return null;

  const isReading = isReadingWird ?? (wirdTitle.includes('تلاوة') || wirdTitle.includes('قراءة') || wirdTitle.includes('ختمة') || !wirdTitle.includes('حفظ'));
  const qualityOptions = getQualityOptions();

  const minPage = Math.min(startPage, currentPage);
  const maxPage = Math.max(startPage, currentPage);
  const totalPages = Math.max(1, maxPage - minPage + 1);

  const handleAddWeakPoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weakPointInput.trim()) return;
    if (!weakPoints.includes(weakPointInput.trim())) {
      setWeakPoints([...weakPoints, weakPointInput.trim()]);
    }
    setWeakPointInput('');
  };

  const handleRemoveWeakPoint = (tag: string) => {
    setWeakPoints(weakPoints.filter(t => t !== tag));
  };

  const handleSubmit = () => {
    const selectedQualityObj = qualityOptions.find(q => q.id === quality) || qualityOptions[0];
    const evaluation: WirdEvaluation = {
      id: `eval-${Date.now()}`,
      wirdId,
      wirdTitle,
      date: new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }),
      startPage: minPage,
      endPage: maxPage,
      totalPages,
      quality,
      notes: notes.trim(),
      weakPoints,
      xpAwarded: selectedQualityObj.xp,
      createdAt: Date.now()
    };

    onSaveEvaluation(evaluation);
    onClose();
  };

  const selectedOpt = qualityOptions.find(q => q.id === quality) || qualityOptions[0];

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg my-auto max-h-[85vh] overflow-y-auto scrollbar-hide rounded-[2.3rem] bg-white p-5 sm:p-6 shadow-2xl dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-200 text-right"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Luminous Glow */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <Award size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-800 dark:text-white">إتمام وتقييم الورد</h3>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  +{selectedOpt.xp} XP
                </span>
              </div>
              <p className="text-xs font-bold text-slate-400">
                {isReading ? 'سجل مستوى تدبرك وتلاوتك لختمة القرآن' : 'سجل مستوى إتقانك وملاحظاتك لتثبيت الحفظ'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 transition"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        {/* Wird Summary Banner */}
        <div className="mb-4 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/40 p-4 border border-slate-200/80 dark:border-slate-800 dark:from-slate-800/60 dark:to-slate-800/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-black text-slate-800 dark:text-white">{wirdTitle}</span>
            </div>
            {surahName && (
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">سورة {surahName}</span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <span>النطاق المقروء:</span>
            <span className="font-black text-emerald-700 dark:text-emerald-300 font-mono">
              صفحة {toArabicNumber(minPage)} ➔ صفحة {toArabicNumber(maxPage)} ({toArabicNumber(totalPages)} صفحة)
            </span>
          </div>
        </div>

        {/* Quality Options Grid */}
        <div className="mb-4">
          <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
            {isReading ? 'مستوى التلاوة والتدبر' : 'مستوى الإتقان والتسميع'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {qualityOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = quality === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setQuality(opt.id)}
                  className={`flex flex-col text-right p-3 rounded-2xl border transition-all active:scale-[0.98] ${
                    isSelected 
                      ? `${opt.bgActive} shadow-md` 
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <Icon size={15} />
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${opt.badgeBg}`}>
                        +{opt.xp} XP
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold opacity-75 line-clamp-1">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficult Ayahs / Weak Points Input */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Tag size={13} className="text-slate-400" />
              <span>مواضع تحتاج تثبيت أو انتباه (اختياري)</span>
            </label>
          </div>

          <form onSubmit={handleAddWeakPoint} className="flex gap-2 mb-2">
            <input
              type="text"
              value={weakPointInput}
              onChange={(e) => setWeakPointInput(e.target.value)}
              placeholder="مثال: آية 25، المتشابه مع آل عمران..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3.5 py-2 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-200 active:scale-95 transition"
            >
              + إضافة
            </button>
          </form>

          {weakPoints.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-0.5">
              {weakPoints.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300/50 dark:border-amber-800/50 px-2 py-0.5 text-[11px] font-black text-amber-800 dark:text-amber-200"
                >
                  <span>{tag}</span>
                  <button type="button" onClick={() => handleRemoveWeakPoint(tag)} className="hover:text-rose-600">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notes Textarea */}
        <div className="mb-5">
          <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <MessageSquare size={13} className="text-slate-400" />
            <span>ملاحظات وتوجيهات للورد القادم (اختياري)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="اكتب ملاحظاتك على تلاوة اليوم، أو خطتك للورد القادم..."
            rows={2}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800/50 dark:text-white resize-none transition"
          />
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-600/25 hover:brightness-105 active:scale-95 transition"
        >
          <Sparkles size={16} />
        </button>
      </div>
    </div>,
    document.body
  );
};
