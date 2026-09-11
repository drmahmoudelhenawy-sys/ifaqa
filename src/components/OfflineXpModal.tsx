import { OutlineIcon, outlineContent } from './OutlineIcon';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Zap,
  WifiOff,
  CloudUpload,
  CheckCircle2,
  Clock,
  BookOpen,
  Sparkles,
  Flame,
  X,
  RefreshCw,
  Award,
} from 'lucide-react';
import { PendingXPEntry, syncPendingXP } from '../services/xpService';
import { haptic, hapticTap, hapticSuccess } from '../services/haptics';
import toast from 'react-hot-toast';

interface OfflineXpModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingAmount: number;
  entries: PendingXPEntry[];
  isOnline: boolean;
  userId?: string;
}

export const OfflineXpModal: React.FC<OfflineXpModalProps> = ({
  isOpen,
  onClose,
  pendingAmount,
  entries,
  isOnline,
  userId,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  const effectiveAmount = entries.length > 0
    ? entries.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
    : pendingAmount;

  if (!isOpen) return null;

  const handleManualSync = async () => {
    if (!isOnline) {
      void haptic('warning');
      toast.error('أنت غير متصل بالإنترنت حالياً، سيتم رفع النقاط تلقائياً فور عودة الشبكة.');
      return;
    }

    void hapticTap();
    setIsSyncing(true);
    try {
      const success = await syncPendingXP(userId, true);
      if (success) {
        onClose();
      } else {
        toast.error('تعذر إكمال المزامنة، يرجى المحاولة لاحقاً.');
      }
    } catch {
      toast.error('حدث خطأ أثناء المزامنة.');
    } finally {
      setIsSyncing(false);
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'quran':
        return <BookOpen size={16} className="text-emerald-500" />;
      case 'athkar':
        return <Flame size={16} className="text-teal-500" />;
      case 'challenge':
        return <Zap size={16} className="text-amber-500" />;
      default:
        return <Sparkles size={16} className="text-violet-500" />;
    }
  };

  const formatTime = (ts: number) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200 select-none overflow-hidden"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="relative p-6 bg-gradient-to-br from-violet-600 via-indigo-700 to-purple-800 text-white overflow-hidden text-right">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-95"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>

          <div className="relative z-10 flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg shrink-0">
              {isOnline ? (
                <CloudUpload size={24} className="text-amber-300" />
              ) : (
                <WifiOff size={24} className="text-amber-300" />
              )}
            </div>
            <div>
              <span className="text-[10px] font-black text-violet-200 px-2 py-0.5 rounded-full bg-white/15 inline-block">
                {isOnline ? 'جاهز للمزامنة' : 'حفظ بدون إنترنت'}
              </span>
              <h3 className="text-lg font-black text-white">نقاط الأوفلاين المعلقة</h3>
            </div>
          </div>

          <div className="relative z-10 flex items-baseline justify-between mt-3 pt-3 border-t border-white/15">
            <span className="text-xs font-bold text-violet-200">النقاط المحفوظة محلياً:</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono tracking-tight text-amber-300">
                +{effectiveAmount.toLocaleString('ar-EG')}
              </span>
              <span className="text-xs font-black text-white">XP</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto scrollbar-hide space-y-4 text-right">
          
          {/* Explanation Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200 text-xs font-bold leading-relaxed flex items-start gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-emerald-800 dark:text-emerald-300 mb-0.5">طاعاتك ونقاطك محفوظة بالكامل <OutlineIcon name="leaf" /></p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                تم احتساب النقاط وتحديث رتبتك محلياً فوراً، وسيتم رفعها تلقائياً إلى لوحة المتصدرين فور توفر الاتصال بالإنترنت.
              </p>
            </div>
          </div>

          {/* Pending Entries List */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 px-1">
              سجل الطاعات بانتظار المزامنة ({entries.length})
            </h4>

            {entries.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide pr-1">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shrink-0 shadow-sm">
                        {getCategoryIcon(entry.category)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-800 dark:text-slate-200 truncate">
                          {entry.label}
                        </p>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black font-mono text-xs shrink-0">
                      +{entry.amount} XP
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center text-slate-400 font-bold text-xs">
                تمت مزامنة كافة النقاط سابقاً بنجاح!
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center gap-2.5">
          <button
            onClick={handleManualSync}
            disabled={isSyncing || pendingAmount <= 0}
            className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
              isOnline && pendingAmount > 0
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-emerald-600/20 hover:opacity-95'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
            <span>{outlineContent(isSyncing ? 'جاري المزامنة...' : isOnline ? "مزامنة النقاط الآن " : 'في انتظار الاتصال بالإنترنت')}</span>
          </button>

          <button
            onClick={onClose}
            className="py-3 px-4 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition active:scale-95"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
