import React from 'react';
import { createPortal } from 'react-dom';
import { X, BookMarked, Info, Sparkles, CheckCircle2 } from 'lucide-react';

interface StopMarksGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StopSign {
  mark: string;
  name: string;
  rule: string;
  description: string;
  example: string;
  badgeBg: string;
  badgeText: string;
}

const STOP_SIGNS: StopSign[] = [
  {
    mark: 'مـ',
    name: 'الوقف اللازم',
    rule: 'يلزم الوقف عنده',
    description: 'يجب الوقف هنا لتفادي ربط المعنى بما بعده؛ لأن الوصل قد يوهم معنى فاسداً أو غير مراد.',
    example: '﴿ إِنَّمَا يَسْتَجِيبُ الَّذِينَ يَسْمَعُونَ ۘ وَالْمَوْتَىٰ يَبْعَثُهُمُ اللَّهُ ﴾ [الأنعام: 36]',
    badgeBg: 'bg-rose-500/15 border-rose-500/30',
    badgeText: 'text-rose-400',
  },
  {
    mark: 'لا',
    name: 'الوقف الممنوع',
    rule: 'لا يوقف عنده',
    description: 'لا يحسن الوقف هنا لتعلق ما بعده بما قبله لفظاً ومعنى، وإذا وقف القارئ لضيق نفس يعيد ما قبله.',
    example: '﴿ الَّذِينَ تَتَوَفَّاهُمُ الْمَلَائِكَةُ طَيِّبِينَ ۙ يَقُولُونَ سَلَامٌ عَلَيْكُمُ ﴾ [النحل: 32]',
    badgeBg: 'bg-red-500/15 border-red-500/30',
    badgeText: 'text-red-400',
  },
  {
    mark: 'ج',
    name: 'الوقف الجائز',
    rule: 'جواز الوقف والوصل على السواء',
    description: 'استواء الطرفين؛ يجوز للقارئ أن يقف أو يصل بدون ترجيح لأحدهما على الآخر.',
    example: '﴿ نَحْنُ نَقُصُّ عَلَيْكَ نَبَأَهُم بِالْحَقِّ ۚ إِنَّهُمْ فِتْيَةٌ آمَنُوا بِرَبِّهِمْ ﴾ [الكهف: 13]',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
    badgeText: 'text-emerald-400',
  },
  {
    mark: 'قلى',
    name: 'الوقف أولى',
    rule: 'يجوز الوصل والوقف أرجح',
    description: 'رمز (قلى) مشتق من "الوقف أولى"؛ يجوز الوصل لكن الوقف تام وحسن وأفضل في المعنى.',
    example: '﴿ قُل رَّبِّي أَعْلَمُ بِعِدَّتِهِم مَّا يَعْلَمُهُمْ إِلَّا قَلِيلٌ ۗ فَلَا تُمَارِ فِيهِمْ ﴾ [الكهف: 22]',
    badgeBg: 'bg-amber-500/15 border-amber-500/30',
    badgeText: 'text-amber-400',
  },
  {
    mark: 'صلى',
    name: 'الوصل أولى',
    rule: 'يجوز الوقف والوصل أرجح',
    description: 'رمز (صلى) مشتق من "الوصل أولى"؛ المعنى متصل اتصالاً وثيقاً والوصل يعطي المعنى الأكمل.',
    example: '﴿ وَإِن يَمْسَسْكَ اللَّهُ بِضُرٍّ فَلَا كَاشِفَ لَهُ إِلَّا هُوَ ۖ وَإِن يَمْسَسْكَ بِخَيْرٍ ﴾ [الأنعام: 17]',
    badgeBg: 'bg-sky-500/15 border-sky-500/30',
    badgeText: 'text-sky-400',
  },
  {
    mark: '∴  ∴',
    name: 'تعانق الوقف (المراقبة)',
    rule: 'إذا وقفت عند أحدهما لا تقف عند الآخر',
    description: 'نقطتان ثلاثيتان متقاربتان؛ إذا وقفت على الموضع الأول وجب وصل الثاني، وإن وصلت الأول جاز الوقف على الثاني.',
    example: '﴿ ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ ﴾ [البقرة: 2]',
    badgeBg: 'bg-purple-500/15 border-purple-500/30',
    badgeText: 'text-purple-400',
  },
  {
    mark: '۩',
    name: 'سجدة التلاوة',
    rule: 'يُسن السجود عند قراءتها أو سماعها',
    description: 'علامة تدل على موضع سجود التلاوة في المصحف الشريف؛ يسجد القارئ والمستمع تكبيراً وتسبيحاً.',
    example: '﴿ وَاسْجُدْ وَاقْتَرِب ۩ ﴾ [العلق: 19]',
    badgeBg: 'bg-teal-500/15 border-teal-500/30',
    badgeText: 'text-teal-400',
  },
];

export const StopMarksGuideModal: React.FC<StopMarksGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col max-h-[85vh] w-full max-w-xl rounded-3xl bg-slate-900 border border-white/10 p-5 sm:p-6 shadow-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/15 text-amber-400">
              <BookMarked size={20} />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">دليل علامات الوقف في المصحف</h3>
              <p className="text-xs text-slate-400">اصطلاحات وضبط الوقف والابتداء المعتمدة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Overview Notice */}
        <div className="my-3 p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 text-xs text-slate-300 shrink-0">
          <Info size={18} className="text-amber-400 shrink-0" />
          <p className="leading-relaxed">
            علامات الوقف وضعها علماء التجويد والرسم العثماني لتيسير فهم الآيات ومنع التباس المعاني أثناء التلاوة.
          </p>
        </div>

        {/* List of Signs */}
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pr-1 pl-1">
          {STOP_SIGNS.map((item, index) => (
            <div
              key={index}
              className="rounded-2xl bg-white/5 hover:bg-white/[0.08] p-3.5 sm:p-4 border border-white/5 transition duration-200"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`grid h-9 min-w-[2.25rem] px-2 place-items-center rounded-xl border text-sm font-black font-quran ${item.badgeBg} ${item.badgeText}`}
                  >
                    {item.mark}
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-white">{item.name}</h4>
                    <p className={`text-[11px] font-bold ${item.badgeText}`}>{item.rule}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-2">
                {item.description}
              </p>

              <div className="rounded-xl bg-black/30 p-2.5 text-xs font-quran text-amber-100/90 leading-relaxed border border-white/5">
                <span className="text-[10px] font-sans font-bold text-slate-400 ml-1">مثال:</span>
                {item.example}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-white/10 text-center shrink-0">
          <p className="text-[11px] text-slate-400 font-bold">
            وفق ضبط مجمع الملك فهد لطباعة المصحف الشريف
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StopMarksGuideModal;
