import { OutlineIcon, outlineContent } from '../OutlineIcon';
import React, { useEffect, useState } from 'react';
import {
  Clock3,
  Flame,
  BookOpen,
  Award,
  Users,
  BarChart3,
  Calendar,
  Sparkles,
  Play,
  RotateCcw,
  Target,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Lock,
  Headphones
} from 'lucide-react';
import { QuranAudioStatsService, QuranAudioStatsData, ReciterStat, SurahStat, QuranAudioBadge } from '../../services/quranAudioStatsService';
import { AudioTheme } from '../../services/quranAudioTheme';
import { ReciterAvatar } from './ReciterAvatar';
import { audioPlayerEngine } from '../../services/audioPlayerEngine';
import { QuranAudioHubService, RECITER_PORTRAITS } from '../../services/quranAudioHubService';
import { quranSurahs } from '../../../quranMetadata';
import { hapticTap, hapticSelection } from '../../services/haptics';
import toast from 'react-hot-toast';

interface QuranAudioStatsViewProps {
  theme: AudioTheme;
  onOpenReciter?: (reciterId: number) => void;
  onOpenMushaf?: (surahNumber: number) => void;
}

export const QuranAudioStatsView: React.FC<QuranAudioStatsViewProps> = ({
  theme,
  onOpenReciter,
  onOpenMushaf,
}) => {
  const [stats, setStats] = useState(QuranAudioStatsService.getComputedStats());
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showKhatmaModal, setShowKhatmaModal] = useState(false);
  const isDark = theme.type === 'dark';

  useEffect(() => {
    const unsub = QuranAudioStatsService.subscribe(() => {
      setStats(QuranAudioStatsService.getComputedStats());
    });
    return () => unsub();
  }, []);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds} ثانية`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hrs} س ${remMins} د` : `${hrs} ساعة`;
  };

  const handlePlayReciter = async (reciterStat: ReciterStat) => {
    hapticTap();
    try {
      const allReciters = await QuranAudioHubService.getReciters();
      const rec = allReciters.find((r) => r.name === reciterStat.reciterName || r.id === reciterStat.reciterId);
      if (rec && rec.moshaf[0]) {
        const moshaf = rec.moshaf[0];
        const surahsList = moshaf.surah_list.split(',').map(Number);
        const surahNum = surahsList[0] || 1;
        const meta = quranSurahs.find((s) => s.number === surahNum);
        const track = {
          surahNumber: surahNum,
          surahName: meta ? meta.name : `سورة ${surahNum}`,
          surahEnglishName: meta?.englishName || '',
          ayahCount: meta?.ayahCount || 0,
          reciterId: rec.id,
          reciterName: rec.name,
          reciterPhoto: rec.photoUrl || RECITER_PORTRAITS[rec.name],
          moshafName: moshaf.name || 'المصحف المرتل',
          audioUrl: QuranAudioHubService.buildAudioUrl(moshaf.server, surahNum),
        };
        audioPlayerEngine.playTrack(track);
        toast.success(`بدأ الاستماع للشيخ ${rec.name}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetGoal = (mins: number) => {
    hapticSelection();
    QuranAudioStatsService.setDailyGoal(mins);
    setShowGoalModal(false);
    toast.success(`تم ضبط الهدف اليومي: ${mins} دقيقة `);
  };

  const handleResetKhatma = () => {
    hapticTap();
    if (window.confirm('هل تريد بالتأكيد إعادة تصفير ختمة الاستماع لبدء ختمة جديدة؟')) {
      QuranAudioStatsService.resetKhatma();
      toast.success("تم تصفير ختمة الاستماع بنجاح، بالتوفيق في ختمتك الجديدة! ");
    }
  };

  const maxWeeklyMinutes = Math.max(1, ...stats.last7Days.map((d) => d.minutes));

  return (
    <div className="space-y-6 pt-2 pb-12 animate-in fade-in duration-300">
      
      {/* 1. Hero Summary Grid */}
      <div className="px-4">
        <div className={`p-5 rounded-[2.2rem] border ${theme.borderClass} ${theme.cardBackground} shadow-xl relative overflow-hidden`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
                <BarChart3 size={22} />
              </div>
              <div className="text-right">
                <h2 className={`text-base font-black ${theme.textColor}`}>إحصائيات الاستماع</h2>
                <p className={`text-[11px] font-bold ${theme.subtextColor}`}>سجل تدبرك وسماعك لكتاب الله</p>
              </div>
            </div>

            <button
              onClick={() => {
                hapticTap();
                setShowGoalModal(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-black hover:bg-emerald-500/20 active:scale-95 transition"
            >
              <Target size={13} />
              <span>الهدف: {stats.dailyGoalMinutes} د</span>
            </button>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Total Listening Time */}
            <div className={`p-3.5 rounded-2xl border ${theme.borderClass} ${isDark ? 'bg-black/25' : 'bg-slate-100/80'} text-right`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold ${theme.subtextColor}`}>إجمالي الاستماع</span>
                <Clock3 size={15} className="text-emerald-400" />
              </div>
              <strong className="text-lg font-black text-emerald-400 font-mono block">
                {stats.totalHours} <span className="text-xs font-bold font-sans">ساعة</span>
              </strong>
              <span className={`text-[9px] font-bold ${theme.subtextColor}`}>
                ({stats.totalMinutes.toLocaleString()} دقيقة)
              </span>
            </div>

            {/* Today's Listening vs Goal */}
            <div className={`p-3.5 rounded-2xl border ${theme.borderClass} ${isDark ? 'bg-black/25' : 'bg-slate-100/80'} text-right`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold ${theme.subtextColor}`}>استماع اليوم</span>
                <Sparkles size={15} className="text-amber-400" />
              </div>
              <strong className="text-lg font-black text-amber-400 font-mono block">
                {stats.todayMinutes} <span className="text-xs font-bold font-sans">دقيقة</span>
              </strong>
              <div className="mt-1.5 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.dailyGoalProgress}%` }}
                />
              </div>
            </div>

            {/* Streak Days */}
            <div className={`p-3.5 rounded-2xl border ${theme.borderClass} ${isDark ? 'bg-black/25' : 'bg-slate-100/80'} text-right`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold ${theme.subtextColor}`}>أيام متتالية</span>
                <Flame size={15} className="text-rose-400" />
              </div>
              <strong className="text-lg font-black text-rose-400 font-mono block">
                {stats.streakDays} <span className="text-xs font-bold font-sans">يومًا</span>
              </strong>
              <span className={`text-[9px] font-bold ${theme.subtextColor}`}>
                {outlineContent(stats.streakDays > 0 ? "مواظبة مستمرة " : 'ابدأ مواظبتك اليوم')}
              </span>
            </div>

            {/* Khatma Surahs */}
            <div className={`p-3.5 rounded-2xl border ${theme.borderClass} ${isDark ? 'bg-black/25' : 'bg-slate-100/80'} text-right`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold ${theme.subtextColor}`}>ختمة السماع</span>
                <BookOpen size={15} className="text-cyan-400" />
              </div>
              <strong className="text-lg font-black text-cyan-400 font-mono block">
                {stats.listenedSurahsCount} <span className="text-xs font-bold font-sans">/ 114</span>
              </strong>
              <span className={`text-[9px] font-bold ${theme.subtextColor}`}>
                إنجاز {stats.khatmaPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Weekly Activity Chart */}
      <div className="px-4">
        <div className={`p-5 rounded-[2.2rem] border ${theme.borderClass} ${theme.cardBackground} shadow-lg text-right`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-black flex items-center gap-1.5 ${theme.textColor}`}>
              <TrendingUp size={16} className="text-emerald-400" />
              <span>نشاط الاستماع هذا الأسبوع</span>
            </h3>
            <span className={`text-[10px] font-bold ${theme.subtextColor}`}>بالدقائق</span>
          </div>

          {/* Chart Bars */}
          <div className="flex items-end justify-between gap-2 h-28 pt-4 pb-1 px-1">
            {stats.last7Days.map((day, idx) => {
              const heightPercent = maxWeeklyMinutes > 0 ? Math.max(12, (day.minutes / maxWeeklyMinutes) * 100) : 12;
              const isToday = idx === stats.last7Days.length - 1;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[9px] font-mono font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition">
                    {day.minutes}د
                  </span>
                  <div className="w-full max-w-[28px] bg-white/10 rounded-xl overflow-hidden flex flex-col justify-end h-full p-0.5">
                    <div
                      className={`w-full rounded-lg transition-all duration-700 ${
                        isToday
                          ? 'bg-gradient-to-t from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/30'
                          : day.minutes > 0
                          ? 'bg-gradient-to-t from-slate-600 to-slate-400 dark:from-slate-700 dark:to-emerald-600/70'
                          : 'bg-transparent'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold truncate ${isToday ? 'text-emerald-400 font-black' : theme.subtextColor}`}>
                    {day.dayName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Listening Khatma Showcase */}
      <div className="px-4">
        <div className={`p-5 rounded-[2.2rem] border ${theme.borderClass} ${theme.cardBackground} shadow-lg text-right`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-cyan-400" />
              <div>
                <h3 className={`text-sm font-black ${theme.textColor}`}>ختمة السماع المباركة</h3>
                <p className={`text-[10px] font-bold ${theme.subtextColor}`}>
                  استمعت إلى {stats.listenedSurahsCount} من أصل 114 سورة ({stats.khatmaPercent}%)
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                hapticTap();
                setShowKhatmaModal(true);
              }}
              className="text-xs font-black text-emerald-500 hover:underline"
            >
              عرض الفهرس
            </button>
          </div>

          {/* Khatma Progress Line */}
          <div className="w-full bg-black/20 dark:bg-white/10 h-3 rounded-full overflow-hidden p-0.5 mb-3">
            <div
              className="bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 h-full rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${stats.khatmaPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className={theme.subtextColor}>
              المتبقي: {114 - stats.listenedSurahsCount} سورة
            </span>
            {stats.listenedSurahsCount > 0 && (
              <button
                onClick={handleResetKhatma}
                className="text-[10px] font-bold text-rose-400 hover:underline flex items-center gap-1"
              >
                <RotateCcw size={11} />
                <span>بدء ختمة جديدة</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Top Most Listened Reciters (أكثر القراء استماعاً) */}
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className={`text-sm font-black flex items-center gap-1.5 ${theme.textColor}`}>
            <Users size={16} className="text-emerald-400" />
            <span>أكثر القراء استماعاً لديك</span>
          </h3>
          <span className={`text-[10px] font-bold ${theme.subtextColor}`}>مرتبة حسب الوقت</span>
        </div>

        {stats.topReciters.length === 0 ? (
          <div className={`p-8 rounded-[2rem] border ${theme.borderClass} ${theme.cardBackground} text-center space-y-2`}>
            <Headphones size={32} className="mx-auto text-slate-500 opacity-60" />
            <p className={`text-xs font-black ${theme.textColor}`}>لم تسجل تلاوات كافية بعد</p>
            <p className={`text-[11px] font-bold ${theme.subtextColor}`}>
              ابدأ بالاستماع لأي قارئ لتظهر إحصائياته هنا تلقائياً!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.topReciters.map((reciter, index) => {
              const maxReciterSecs = stats.topReciters[0]?.totalSeconds || 1;
              const barPercent = Math.max(10, Math.round((reciter.totalSeconds / maxReciterSecs) * 100));
              return (
                <div
                  key={reciter.reciterId || reciter.reciterName}
                  className={`p-3.5 rounded-2xl border ${theme.borderClass} ${theme.cardBackground} shadow-sm flex items-center justify-between gap-3 group transition active:scale-98`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Rank Badge */}
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black font-mono shrink-0 ${
                      index === 0 ? 'bg-amber-400 text-slate-950 shadow-md' : index === 1 ? 'bg-slate-300 text-slate-900' : index === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-slate-400'
                    }`}>
                      {index + 1}
                    </span>

                    <ReciterAvatar name={reciter.reciterName} src={reciter.reciterPhoto || RECITER_PORTRAITS[reciter.reciterName]} size={44} />

                    <div className="min-w-0 flex-1 text-right">
                      <h4 className={`text-xs sm:text-sm font-black truncate ${theme.textColor}`}>
                        الشيخ {reciter.reciterName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden max-w-[120px]">
                          <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${barPercent}%` }} />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">
                          {formatDuration(reciter.totalSeconds)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Play Button */}
                  <button
                    onClick={() => handlePlayReciter(reciter)}
                    className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition active:scale-90 shadow-sm"
                    title="الاستماع لهذا القارئ"
                  >
                    <Play size={15} fill="currentColor" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Top Most Listened Surahs (أكثر السور استماعاً) */}
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className={`text-sm font-black flex items-center gap-1.5 ${theme.textColor}`}>
            <BookOpen size={16} className="text-cyan-400" />
            <span>أكثر السور استماعاً</span>
          </h3>
          <span className={`text-[10px] font-bold ${theme.subtextColor}`}>السور الأكثر تكراراً</span>
        </div>

        {stats.topSurahs.length === 0 ? (
          <div className={`p-6 rounded-[2rem] border ${theme.borderClass} ${theme.cardBackground} text-center`}>
            <p className={`text-xs font-bold ${theme.subtextColor}`}>ستظهر هنا السور التي تفضل الاستماع إليها باستمرار</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {stats.topSurahs.slice(0, 6).map((surah) => (
              <div
                key={surah.surahNumber}
                className={`p-3.5 rounded-2xl border ${theme.borderClass} ${theme.cardBackground} shadow-sm text-right space-y-1.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                    رقم {surah.surahNumber}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400">
                    {formatDuration(surah.totalSeconds)}
                  </span>
                </div>
                <h4 className={`text-xs font-black truncate ${theme.textColor}`}>
                  سورة {surah.surahName}
                </h4>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Quranic Listening Badges & Achievements */}
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className={`text-sm font-black flex items-center gap-1.5 ${theme.textColor}`}>
            <Award size={16} className="text-amber-400" />
            <span>أوسمة وإنجازات الاستماع</span>
          </h3>
          <span className="text-[10px] font-black text-amber-400 font-mono">
            {stats.unlockedBadgesCount} / {stats.badges.length} مفتوح
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {stats.badges.map((badge) => (
            <div
              key={badge.id}
              className={`p-3.5 rounded-2xl border transition ${
                badge.isUnlocked
                  ? `${theme.borderClass} ${theme.cardBackground} shadow-md`
                  : `border-white/5 bg-white/[0.02] opacity-60`
              } text-right flex items-start gap-3`}
            >
              <div className={`text-2xl p-2 rounded-2xl shrink-0 ${badge.isUnlocked ? 'bg-amber-400/20' : 'bg-black/20'}`}>
                {outlineContent(badge.icon)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className={`text-xs font-black ${badge.isUnlocked ? theme.textColor : 'text-slate-400'}`}>
                    {outlineContent(badge.title)}
                  </h4>
                  {badge.isUnlocked ? (
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  ) : (
                    <Lock size={12} className="text-slate-500 shrink-0" />
                  )}
                </div>
                <p className={`text-[10px] font-bold mt-0.5 line-clamp-2 ${theme.subtextColor}`}>
                  {outlineContent(badge.description)}
                </p>

                {!badge.isUnlocked && (
                  <div className="mt-2 w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${badge.progress}%` }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Goal Customizer Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm p-6 rounded-[2rem] bg-slate-900 border border-white/20 text-white shadow-2xl text-right">
            <h3 className="text-base font-black mb-1 flex items-center gap-2">
              <Target className="text-emerald-400" size={18} />
              <span>تحديد هدف الاستماع اليومي</span>
            </h3>
            <p className="text-xs text-slate-400 font-bold mb-4">
              اختر الوقت اليومي الذي ترغب في قضائه مع القرآن الكريم
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[15, 30, 45, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleSetGoal(mins)}
                  className={`p-3 rounded-2xl border text-xs font-black transition active:scale-95 ${
                    stats.dailyGoalMinutes === mins
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>{mins} دقيقة يومياً</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowGoalModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 text-white text-xs font-black hover:bg-white/15"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Khatma Surahs Index Modal */}
      {showKhatmaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg max-h-[85vh] flex flex-col p-5 rounded-[2.2rem] bg-slate-900 border border-white/20 text-white shadow-2xl text-right">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="text-right">
                <h3 className="text-base font-black flex items-center gap-2">
                  <BookOpen size={18} className="text-cyan-400" />
                  <span>فهرس سور ختمة السماع</span>
                </h3>
                <p className="text-[11px] font-bold text-slate-400">
                  السور المظللة بالأخضر تم الاستماع لها ({stats.listenedSurahsCount} / 114)
                </p>
              </div>
              <button onClick={() => setShowKhatmaModal(false)} className="p-2 rounded-xl bg-white/10 text-slate-300 hover:text-white">
                
                <OutlineIcon name="x" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
              {quranSurahs.map((surah) => {
                const isListened = QuranAudioStatsService.getRawData().listenedSurahNumbers.includes(surah.number);
                return (
                  <div
                    key={surah.number}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                      isListened
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/5 border-white/5 text-slate-500'
                    }`}
                  >
                    <span className="font-black truncate">{surah.name}</span>
                    <span className="font-mono text-[10px] opacity-75">{surah.number}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
