import { OutlineIcon, outlineContent } from './OutlineIcon';
import React, { useState } from 'react';
import {
  WifiOff,
  Wifi,
  Zap,
  CloudUpload,
  RefreshCw,
  CheckCircle2,
  ListOrdered,
  Sparkles,
  Clock
} from 'lucide-react';
import { PendingXPEntry, syncPendingXP } from '../services/xpService';
import { haptic, hapticTap, hapticSuccess } from '../services/haptics';
import toast from 'react-hot-toast';

interface OfflinePointsBannerProps {
  isOffline: boolean;
  pendingAmount: number;
  entries: PendingXPEntry[];
  userId?: string;
  onOpenDetails: () => void;
}

export const OfflinePointsBanner: React.FC<OfflinePointsBannerProps> = ({
  isOffline,
  pendingAmount,
  entries,
  userId,
  onOpenDetails,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  // If online and no pending points and not just synced, hide banner
  if (!isOffline && pendingAmount <= 0 && !justSynced) {
    return null;
  }

  const latestEntry = entries.length > 0 ? entries[0] : null;

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!navigator.onLine) {
      void haptic('warning');
      toast.error("أنت غير متصل بالإنترنت حالياً. سيتم تصفير العداد ورفع النقاط تلقائياً فور عودة الشبكة ");
      return;
    }

    void hapticTap();
    setIsSyncing(true);
    try {
      const success = await syncPendingXP(userId, true);
      if (success) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 4000);
      } else {
        toast.error('تعذر إكمال المزامنة، يرجى المحاولة لاحقاً.');
      }
    } catch {
      toast.error('حدث خطأ أثناء المزامنة.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (justSynced) {
    return (
      <div className="mb-3 p-3.5 rounded-[1.8rem] bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/20 border border-emerald-400/30 flex items-center justify-between animate-in zoom-in-95 duration-300" dir="rtl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 size={20} className="text-emerald-200" />
          </div>
          <div className="text-right">
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <span>تمت مزامنة وتصفير النقاط بنجاح!</span>
              <Sparkles size={14} className="text-yellow-300" />
            </h4>
            <p className="text-[10px] font-bold text-emerald-100">تم تسجيل كافة طاعاتك في حسابك ولوحة المتصدرين <OutlineIcon name="sparkles" /></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onOpenDetails}
      className={`group relative mb-3 overflow-hidden rounded-[1.9rem] p-3.5 sm:p-4 border shadow-xl transition-all duration-300 cursor-pointer active:scale-[0.99] select-none ${
        isOffline
          ? 'bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-amber-950/70 border-amber-500/30 shadow-amber-950/30 text-white'
          : 'bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-teal-950/70 border-emerald-500/30 shadow-emerald-950/30 text-white'
      }`}
      dir="rtl"
    >
      {/* Soft Ambient Background Glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
        isOffline ? 'bg-amber-500/15' : 'bg-emerald-500/15'
      }`} />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left / Main Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-md ${
            isOffline
              ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
              : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
          }`}>
            {isOffline ? (
              <WifiOff size={22} className="animate-pulse" />
            ) : (
              <CloudUpload size={22} className="animate-bounce" />
            )}
          </div>

          <div className="text-right min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                isOffline
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {outlineContent(isOffline ? " وضع الأوفلاين نشط" : " عاد الاتصال بالإنترنت")}
              </span>

              <span className="text-[10px] font-bold text-slate-400">
                {entries.length > 0 ? `${entries.length} طاعات مسجلة` : 'تسجيل حي'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-xs sm:text-sm font-black text-white">
                {isOffline ? 'نقاطك المسجلة أثناء عدم الاتصال:' : 'نقاط معلقة بانتظار المزامنة:'}
              </h3>
              <span className="text-base sm:text-lg font-black font-mono tracking-tight text-amber-300">
                +{pendingAmount.toLocaleString('ar-EG')} XP
              </span>
            </div>

            {latestEntry && (
              <p className="text-[10px] font-bold text-slate-300 truncate mt-0.5 flex items-center gap-1">
                <Clock size={10} className="text-amber-400 shrink-0" />
                <span>آخر طاعة: {latestEntry.label} (+{latestEntry.amount} XP)</span>
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
          {!isOffline ? (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex-1 sm:flex-initial py-2 px-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{outlineContent(isSyncing ? 'جاري المزامنة...' : "مزامنة وتصفير الآن ")}</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails();
              }}
              className="flex-1 sm:flex-initial py-2 px-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <ListOrdered size={14} className="text-amber-300" />
              <span>عرض سجل الطاعات <OutlineIcon name="sparkles" /></span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
