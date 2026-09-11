import { OutlineIcon, outlineContent } from './OutlineIcon';
import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  Clock3,
  MoonStar,
  Sparkles,
  Star,
  Sun,
  Flame,
  Settings,
  Info,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  getCurrentTimeLabel,
  getGregorianDateLabel,
  getHijriDateLabel,
  getUpcomingIslamicOccasions,
  getMonthCalendarGrid,
  CalendarDayInfo,
  HIJRI_MONTHS,
} from '../services/islamicCalendarService';
import { haptic } from '../services/haptics';

interface IslamicCalendarPageProps {
  onBack: () => void;
}

const IslamicCalendarPage: React.FC<IslamicCalendarPageProps> = ({ onBack }) => {
  const [now, setNow] = useState(new Date());
  
  // Navigation for monthly calendar (Year & MonthIndex 0-11)
  const [currentYear, setCurrentYear] = useState(() => now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => now.getMonth());
  
  // Hijri adjustment offset in days (-2 to +2)
  const [hijriOffset, setHijriOffset] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('ifaqa_hijri_offset') || '0', 10);
    } catch {
      return 0;
    }
  });

  const [selectedDay, setSelectedDay] = useState<CalendarDayInfo | null>(null);

  // Live seconds clock
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleOffsetChange = (offset: number) => {
    void haptic('selection');
    setHijriOffset(offset);
    localStorage.setItem('ifaqa_hijri_offset', String(offset));
  };

  // Calendar Grid for selected month
  const { days, hijriSummary, gregorianSummary } = useMemo(() => {
    return getMonthCalendarGrid(currentYear, currentMonth, hijriOffset);
  }, [currentYear, currentMonth, hijriOffset]);

  // Upcoming occasions
  const occasions = useMemo(() => {
    return getUpcomingIslamicOccasions(now, 8, hijriOffset);
  }, [now, hijriOffset]);

  // Handle month navigation
  const prevMonth = () => {
    void haptic('selection');
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    void haptic('selection');
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const resetToToday = () => {
    void haptic('selection');
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const isCurrentViewingMonth = currentYear === now.getFullYear() && currentMonth === now.getMonth();

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-300 overflow-hidden select-none" dir="rtl">
      
      {/* Top Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 p-4 safe-top flex items-center justify-between">
        <button 
          onClick={onBack} 
          className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 transition"
        >
          <ChevronRight size={22} />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-black text-slate-800 dark:text-white">التقويم والمناسبات</h2>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">التقويم الهجري والميلادي الشامل</p>
        </div>
        
        {/* Hijri Adjustment Trigger */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-300">
          <span>الرؤية:</span>
          <button
            onClick={() => handleOffsetChange(hijriOffset === 0 ? 1 : hijriOffset === 1 ? -1 : 0)}
            className="font-mono text-violet-600 dark:text-violet-400 hover:underline"
            title="تعديل التقويم الهجري بحسب الرؤية الشرعية"
          >
            {hijriOffset > 0 ? `+${hijriOffset}` : hijriOffset} يوم
          </button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-5">
        
        {/* Hero Today Live Card */}
        <div className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-950 p-5 sm:p-6 text-white shadow-xl border border-white/15">
          <div className="absolute inset-0 bg-[url('/assets/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
          <div className="ifaqa-header-orb ifaqa-header-orb-one opacity-30" />
          <div className="ifaqa-header-orb ifaqa-header-orb-two opacity-20" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black border border-white/15 backdrop-blur-md text-emerald-200">
                <CalendarDays size={14} />
                <span>اليوم في التقويم</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-200/90 font-mono text-xs font-black bg-black/20 px-3 py-1 rounded-full">
                <Clock3 size={13} />
                <span>{getCurrentTimeLabel(now)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur-md text-right">
                <div className="flex items-center gap-2 mb-1 text-emerald-200">
                  <MoonStar size={16} />
                  <span className="text-[11px] font-black">التاريخ الهجري الحالي</span>
                </div>
                <p className="text-lg sm:text-xl font-black text-white leading-relaxed">
                  {getHijriDateLabel(now, hijriOffset)}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur-md text-right">
                <div className="flex items-center gap-2 mb-1 text-teal-200">
                  <CalendarDays size={16} />
                  <span className="text-[11px] font-black">التاريخ الميلادي</span>
                </div>
                <p className="text-lg sm:text-xl font-black text-white leading-relaxed">
                  {getGregorianDateLabel(now)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MONTHLY CALENDAR GRID SECTION */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          
          {/* Month Switcher Navigation */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={prevMonth}
              className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-95 transition"
              aria-label="الشهر السابق"
            >
              <ChevronRight size={20} />
            </button>

            <div className="text-center flex-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {hijriSummary}
              </h3>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {gregorianSummary}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {!isCurrentViewingMonth && (
                <button
                  onClick={resetToToday}
                  className="px-3 py-2 rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 font-black text-[11px] hover:bg-violet-100 transition active:scale-95"
                >
                  اليوم
                </button>
              )}
              <button
                onClick={nextMonth}
                className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-95 transition"
                aria-label="الشهر التالي"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          </div>

          {/* Weekday Column Headers (Saturday -> Friday) */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((dayName, idx) => (
              <div
                key={dayName}
                className={`py-1.5 text-[10px] sm:text-[11px] font-black rounded-lg ${
                  idx === 6
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Days 7-column Matrix */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {days.map((dayItem, index) => {
              const isSelected = selectedDay?.dateStr === dayItem.dateStr;
              return (
                <div
                  key={`${dayItem.dateStr}-${index}`}
                  onClick={() => {
                    void haptic('selection');
                    setSelectedDay(dayItem);
                  }}
                  className={`relative flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-2xl min-h-[52px] sm:min-h-[60px] cursor-pointer transition-all duration-200 active:scale-95 ${
                    dayItem.isToday
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black shadow-lg shadow-emerald-500/30 scale-[1.03] z-10 ring-2 ring-emerald-300'
                      : isSelected
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 ring-2 ring-violet-400'
                      : !dayItem.isCurrentMonth
                      ? 'opacity-25 hover:opacity-50 text-slate-400'
                      : dayItem.isFriday
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/25 text-slate-800 dark:text-slate-100 hover:bg-emerald-100/70'
                      : 'bg-slate-50/80 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {/* Hijri Day Number (Large) */}
                  <span className="text-sm sm:text-base font-black font-mono leading-none">
                    {dayItem.hijriDay}
                  </span>

                  {/* Gregorian Day Number (Small) */}
                  <span className={`text-[9px] font-bold font-mono mt-1 ${
                    dayItem.isToday || isSelected ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {dayItem.gregorianDay}
                  </span>

                  {/* Indicators (Ayyam al-Beed / Sunnah / Occasion) */}
                  <div className="absolute top-1 left-1 flex items-center gap-0.5">
                    {dayItem.occasion && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title={dayItem.occasion.name} />
                    )}
                    {dayItem.isWhiteDay && !dayItem.isToday && (
                      <span className="text-[8px] leading-none" title="الأيام البيض"><OutlineIcon name="sparkles" /></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Color Key / Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>اليوم الحالي</span>
            </span>
            <span className="flex items-center gap-1">
              <span><OutlineIcon name="sparkles" /></span>
              <span>الأيام البيض (١٣-١٥)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>مناسبة إسلامية</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-200 dark:bg-emerald-900" />
              <span>يوم الجمعة</span>
            </span>
          </div>

          {/* Selected Day Details Inspector Card */}
          {selectedDay && (
            <div className="mt-3 p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 via-slate-50 to-indigo-500/10 dark:from-violet-950/40 dark:via-slate-850 dark:to-slate-800 border border-violet-200 dark:border-violet-800/50 animate-in fade-in space-y-2 text-right">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-violet-700 dark:text-violet-300">
                  تفاصيل يوم {selectedDay.dayName}
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  {selectedDay.dateStr}
                </span>
              </div>

              <div className="text-sm font-black text-slate-900 dark:text-white">
                {selectedDay.hijriDay} {selectedDay.hijriMonthName} {selectedDay.hijriYear} هـ
                <span className="text-xs font-bold text-slate-500 mr-2">
                  (الموافق {selectedDay.gregorianDay}/{selectedDay.gregorianMonth}/{selectedDay.gregorianYear} م)
                </span>
              </div>

              {selectedDay.occasion && (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
                  <Star size={15} className="text-amber-500 shrink-0 fill-amber-500" />
                  <span>{selectedDay.occasion.name}: {selectedDay.occasion.note}</span>
                </div>
              )}

              {selectedDay.isWhiteDay && (
                <p className="text-xs text-amber-700 dark:text-amber-300 font-bold">
                  
                  <OutlineIcon name="sparkles" /> من الأيام البيض المستحب صيامها (١٣، ١٤، ١٥ من الشهر الهجري).
                </p>
              )}

              {selectedDay.isSunnahFasting && !selectedDay.isWhiteDay && (
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                  
                  <OutlineIcon name="leaf" /> يوم {selectedDay.dayName} يُسنّ فيه الصيام طلباً للأجر ورفعة الدرجات.
                </p>
              )}

              {selectedDay.isFriday && (
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                  
                  <OutlineIcon name="landmark" /> يوم الجمعة خير يوم طلعت فيه الشمس، لا تنسَ قراءة سورة الكهف والصلاة على النبي ﷺ.
                </p>
              )}
            </div>
          )}
        </div>

        {/* UPCOMING ISLAMIC OCCASIONS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 px-1">
            <Sparkles size={18} className="text-amber-500" />
            <h3 className="text-base sm:text-lg font-black">المناسبات الإسلامية القادمة</h3>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {occasions.map((occasion) => (
              <div
                key={occasion.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-[1.8rem] border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3 text-right"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    occasion.isToday
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                      : 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200/50 dark:border-violet-800/30'
                  }`}>
                    {occasion.isToday ? <Flame size={20} /> : <MoonStar size={20} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm sm:text-base font-black text-slate-800 dark:text-white truncate">
                      {occasion.name}
                    </h4>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                      {occasion.hijriLabel}
                    </p>
                    {occasion.note && (
                      <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1 line-clamp-1">
                        {occasion.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-center">
                  <span className={`inline-block px-3 py-1.5 rounded-2xl font-black text-xs font-mono ${
                    occasion.isToday
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {outlineContent(occasion.isToday ? "اليوم " : `متبقي ${occasion.daysRemaining} يوم`)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IslamicCalendarPage;
