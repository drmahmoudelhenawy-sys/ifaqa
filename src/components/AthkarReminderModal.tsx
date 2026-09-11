import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Check,
  BookOpen,
  Clock,
  Bell,
  X,
  Sparkles,
  Heart,
  ChevronDown,
  ShieldCheck,
  AlarmClock
} from 'lucide-react';
import {
  AthkarReminderType,
  SNOOZE_DURATIONS,
  markAthkarDoneToday,
  snoozeAthkarReminder,
  markAthkarReminderDismissed
} from '../services/athkarReminderService';
import { hapticSuccess, hapticTap } from '../services/haptics';

interface Props {
  isOpen: boolean;
  type: AthkarReminderType;
  onClose: () => void;
  onReadNow: (type: AthkarReminderType) => void;
  onMarkDone: (type: AthkarReminderType) => void;
}

export default function AthkarReminderModal({
  isOpen,
  type,
  onClose,
  onReadNow,
  onMarkDone,
}: Props) {
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [isSuccessFeedback, setIsSuccessFeedback] = useState(false);

  if (!isOpen) return null;

  const isMorning = type === 'morning';

  const title = isMorning ? 'أذكار الصباح المباركة' : 'أذكار المساء والسكينة';
  const subTitle = isMorning
    ? 'حصن المسلم ونور الصباح · تبدأ بها يومك المبارك'
    : 'سكينة المساء وحفظ ليلتك · تختم بها نهارك بخير';

  const hadithQuote = isMorning
    ? '«مَن قالَ حِينَ يُصْبِحُ وحِينَ يُمْسِي: سُبْحَانَ اللهِ وبِحَمْدِهِ، مِئَةَ مَرَّةٍ، لَمْ يَأْتِ أَحَدٌ يَومَ القِيَامَةِ بأَفْضَلَ ممَّا جَاءَ به إلَّا أَحَدٌ قالَ مِثْلَ ما قالَ، أَوْ زَادَ عليه» [صحيح مسلم]'
    : '«أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ (لم يضرّه شيء حتى يُصبح)» [صحيح مسلم]';

  const timeWindowText = isMorning
    ? 'الوقت المستحب: بعد صلاة الفجر حتى شروق الشمس'
    : 'الوقت المستحب: بعد صلاة العصر حتى صلاة المغرب';

  const handleReadNowClick = () => {
    hapticTap();
    markAthkarReminderDismissed();
    onClose();
    onReadNow(type);
  };

  const handleMarkAsDoneClick = () => {
    hapticSuccess();
    markAthkarDoneToday(type);
    markAthkarReminderDismissed();
    setIsSuccessFeedback(true);
    setTimeout(() => {
      setIsSuccessFeedback(false);
      onMarkDone(type);
      onClose();
    }, 1200);
  };

  const handleSnoozeSelect = async (minutes: number) => {
    hapticTap();
    setSelectedDuration(minutes);
    await snoozeAthkarReminder(type, minutes);
    markAthkarReminderDismissed();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleDismiss = () => {
    hapticTap();
    markAthkarReminderDismissed();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-300"
      dir="rtl"
    >
      {/* Outer Card */}
      <div
        className={`relative w-full max-w-lg rounded-[2.5rem] p-6 sm:p-7 shadow-2xl border text-white overflow-hidden transition-all duration-300 ${
          isMorning
            ? 'bg-gradient-to-b from-amber-950/90 via-slate-950/95 to-slate-950 border-amber-400/40 shadow-amber-500/20'
            : 'bg-gradient-to-b from-indigo-950/90 via-slate-950/95 to-slate-950 border-purple-400/40 shadow-purple-500/20'
        }`}
      >
        {/* Ambient Glowing Orbs */}
        <div
          className={`absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none ${
            isMorning ? 'bg-amber-500/20' : 'bg-purple-500/20'
          }`}
        />
        <div
          className={`absolute bottom-0 left-0 w-72 h-72 rounded-full blur-3xl pointer-events-none ${
            isMorning ? 'bg-orange-500/15' : 'bg-indigo-500/15'
          }`}
        />

        {/* Top Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-5 left-5 w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95 z-20"
          title="إغلاق التذكير"
        >
          <X size={20} />
        </button>

        {/* Header Badge & Icon */}
        <div className="relative z-10 text-center space-y-3 pt-2">
          <div className="inline-flex items-center justify-center">
            <div
              className={`w-20 h-20 rounded-3xl border-2 flex items-center justify-center shadow-xl ${
                isMorning
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-200 text-slate-950 shadow-amber-500/30'
                  : 'bg-gradient-to-br from-violet-500 to-indigo-600 border-purple-200 text-white shadow-purple-500/30'
              }`}
            >
              {isMorning ? (
                <Sun size={40} className="animate-spin-slow" />
              ) : (
                <Moon size={40} className="animate-pulse" />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black border ${
                isMorning
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                  : 'bg-purple-500/20 text-purple-300 border-purple-400/30'
              }`}
            >
              <Sparkles size={13} />
              <span>تذكير شاشة القفل واليوم</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-bold max-w-sm mx-auto">
              {subTitle}
            </p>
          </div>
        </div>

        {/* Time Window Chip */}
        <div className="relative z-10 mt-4 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-xs font-bold text-slate-300">
          <Clock size={15} className={isMorning ? 'text-amber-400' : 'text-purple-300'} />
          <span>{timeWindowText}</span>
        </div>

        {/* Spiritual Hadith Box */}
        <div
          className={`relative z-10 mt-3 p-4 rounded-2xl border text-center ${
            isMorning
              ? 'bg-amber-950/30 border-amber-400/20 text-amber-100'
              : 'bg-indigo-950/30 border-purple-400/20 text-purple-100'
          }`}
        >
          <p className="text-xs sm:text-sm font-serif leading-relaxed italic drop-shadow-sm">
            {hadithQuote}
          </p>
        </div>

        {/* Success Feedback Overlay if marked as done */}
        {isSuccessFeedback && (
          <div className="relative z-20 mt-4 p-4 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm text-center shadow-xl flex items-center justify-center gap-2 animate-in zoom-in-95">
            <Check size={20} strokeWidth={3} />
            <span>تقبل الله منك! تم تسجيل أذكارك وإضافة +30 XP إلى رصيدك ✨</span>
          </div>
        )}

        {/* Primary Action Buttons */}
        {!isSuccessFeedback && (
          <div className="relative z-10 mt-6 space-y-2.5">
            {/* 1. أقرأها الآن (Read Now) */}
            <button
              type="button"
              onClick={handleReadNowClick}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 transition active:scale-98 ${
                isMorning
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-amber-500/25'
                  : 'bg-gradient-to-r from-violet-500 via-purple-600 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 text-white shadow-purple-500/25'
              }`}
            >
              <BookOpen size={18} strokeWidth={2.5} />
              <span>أقرأها الآن (فتح الأذكار)</span>
            </button>

            {/* 2. قرأتها (Mark as Read / Done) */}
            <button
              type="button"
              onClick={handleMarkAsDoneClick}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 hover:text-emerald-200 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-98"
            >
              <Check size={18} strokeWidth={3} className="text-emerald-400" />
              <span>قرأتها بالفعل · تسجيل الأجر (+30 XP)</span>
            </button>

            {/* 3. ذكّرني لاحقاً (Snooze Menu Toggle) */}
            <button
              type="button"
              onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
              className="w-full py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white font-black text-xs flex items-center justify-between transition active:scale-98"
            >
              <div className="flex items-center gap-2">
                <AlarmClock size={16} className="text-amber-400" />
                <span>ذكّرني لاحقاً (تأجيل)</span>
              </div>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${
                  showSnoozeOptions ? 'rotate-180 text-amber-400' : ''
                }`}
              />
            </button>

            {/* Snooze Options Drawer */}
            {showSnoozeOptions && (
              <div className="p-3.5 rounded-2xl bg-slate-900/95 border border-white/15 space-y-2 animate-in slide-in-from-top-2">
                <div className="text-[11px] font-bold text-slate-300 text-center">
                  اختر متى تريد أن يذكّرك التطبيق مرة أخرى:
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {SNOOZE_DURATIONS.map((dur) => {
                    const isPicked = selectedDuration === dur.minutes;
                    return (
                      <button
                        key={dur.minutes}
                        type="button"
                        onClick={() => handleSnoozeSelect(dur.minutes)}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                          isPicked
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md'
                            : 'bg-white/10 hover:bg-white/15 border-white/10 text-white'
                        }`}
                      >
                        <span className="text-xs font-black">{dur.label}</span>
                        <span className={`text-[9px] ${isPicked ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                          {dur.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedDuration && (
                  <div className="text-[11px] text-emerald-400 font-black text-center pt-1 animate-pulse">
                    تم ضبط التذكير بعد {selectedDuration} دقيقة بإذن الله!
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
