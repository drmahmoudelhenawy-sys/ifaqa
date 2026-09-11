import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  Settings,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Timer,
  Compass,
  Users,
  AlarmClock,
  Sparkles,
  Volume2,
  CheckCircle2,
  Check,
  BookOpen,
  ChevronLeft,
  Calendar,
  Sliders
} from 'lucide-react';
import { fetchAndSchedulePrayers, getPrayerSettings } from '../src/services/prayerTimes';
import { PrayerSettingsModal } from '../src/components/PrayerSettingsModal';
import { usePrayerTimer } from '../src/hooks/usePrayerTimer';
import FajrAlarmHubView from '../src/components/FajrAlarmHubView';
import FajrAlarmCustomizeView from '../src/components/FajrAlarmCustomizeView';
import FajrWakeGroupsView from '../src/components/FajrWakeGroupsView';
import { SOUND_PRESETS } from '../src/services/fajrAlarmCustomization';

const PRAYERS = [
  { key: 'Fajr',    label: 'الفجر',  icon: Sunrise, tone: 'from-sky-500 to-cyan-400',       bgHero: 'from-sky-950 via-slate-950 to-indigo-950',    iqamaMins: 20, sunnahText: 'ركعتان قبل الفجر' },
  { key: 'Dhuhr',   label: 'الظهر',  icon: Sun,     tone: 'from-amber-500 to-orange-400',   bgHero: 'from-amber-950 via-slate-950 to-orange-950',  iqamaMins: 10, sunnahText: '٤ قبلها و ٢ بعدها' },
  { key: 'Asr',     label: 'العصر',  icon: Clock3,  tone: 'from-orange-500 to-amber-500',   bgHero: 'from-orange-950 via-slate-950 to-amber-950',  iqamaMins: 10, sunnahText: '٤ ركعات قبلها مستحبة' },
  { key: 'Maghrib', label: 'المغرب', icon: Sunset,  tone: 'from-rose-500 to-fuchsia-500',   bgHero: 'from-rose-950 via-slate-950 to-purple-950',   iqamaMins: 5,  sunnahText: 'ركعتان بعد المغرب' },
  { key: 'Isha',    label: 'العشاء', icon: Moon,    tone: 'from-indigo-500 to-violet-500',  bgHero: 'from-slate-950 via-indigo-950 to-purple-950', iqamaMins: 15, sunnahText: 'ركعتان بعدها + الوتر' },
] as const;

type PrayerKey = typeof PRAYERS[number]['key'];
type PrayerTimings = Partial<Record<PrayerKey, string>>;

function parsePrayerTime(time?: string) {
  if (!time) return { time: '--:--', period: '' };
  const cleanTime = time.split(' ')[0];
  const [rawHours, rawMinutes] = cleanTime.split(':');
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return { time: '--:--', period: '' };
  const period = hours >= 12 ? 'م' : 'ص';
  const displayHours = hours % 12 || 12;
  return {
    time: `${displayHours}:${minutes.toString().padStart(2, '0')}`,
    period,
  };
}

function cleanPrayerTime(time?: string) {
  const parsed = parsePrayerTime(time);
  if (!parsed.period) return parsed.time;
  return `${parsed.time} ${parsed.period}`;
}

function addMinutesToTime(time?: string, mins?: number): string {
  if (!time || !mins) return '--:--';
  const cleanTime = time.split(' ')[0];
  const [h, m] = cleanTime.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '--:--';
  const totalMins = h * 60 + m + mins;
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  const period = newH >= 12 ? 'م' : 'ص';
  const displayH = newH % 12 || 12;
  return `${displayH}:${newM.toString().padStart(2, '0')} ${period}`;
}

function getPrayerTimestamp(time?: string) {
  if (!time) return Number.POSITIVE_INFINITY;
  const cleanTime = time.split(' ')[0];
  const [hours, minutes] = cleanTime.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.POSITIVE_INFINITY;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

function useLiveCountdown(targetMs: number | null) {
  const [display, setDisplay] = useState('--:--:--');

  useEffect(() => {
    if (targetMs === null) return;
    const tick = () => {
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setDisplay('00:00:00');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDisplay(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  return display;
}

export default function PrayerTimesPage() {
  const [activeTab, setActiveTab] = useState<'times' | 'alarm' | 'customize' | 'wake' | 'qibla'>('times');
  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [locationLabel, setLocationLabel] = useState<string>('جاري تحديد الموقع...');
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  // Daily prayer checkmarks
  const todayKey = useMemo(() => {
    const d = new Date();
    return `ifaqa_prayers_done_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
  }, []);

  const [donePrayers, setDonePrayers] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(todayKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const togglePrayerDone = (key: string) => {
    setDonePrayers(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem(todayKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Sunan Rawatib Tracking
  const sunnahStorageKey = useMemo(() => {
    const d = new Date();
    return `ifaqa_sunnah_done_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
  }, []);

  const [doneSunnah, setDoneSunnah] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(sunnahStorageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const toggleSunnahDone = (id: string) => {
    setDoneSunnah(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      localStorage.setItem(sunnahStorageKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Update time every second
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const refreshLocationLabel = () => {
    try {
      const s = getPrayerSettings();
      if (s.cityNameAr) {
        setLocationLabel(s.cityNameAr);
      } else if (s.city) {
        setLocationLabel(s.city);
      } else if (s.autoLocation) {
        setLocationLabel('موقعي الحالي (GPS)');
      } else {
        setLocationLabel('بتوقيت الجهاز المباشر');
      }
    } catch {
      setLocationLabel('بتوقيت الجهاز المباشر');
    }
  };

  const loadPrayerTimes = async () => {
    setIsLoading(true);
    setError(null);
    refreshLocationLabel();
    const nextTimings = await fetchAndSchedulePrayers();
    if (nextTimings) setTimings(nextTimings);
    else setError('تعذر تحميل مواقيت الصلاة الآن. تأكد من اتصال الإنترنت ثم حاول ثانية.');
    setIsLoading(false);
  };

  useEffect(() => {
    loadPrayerTimes();
  }, []);

  // Next upcoming prayer
  const nextPrayerInfo = useMemo(() => {
    if (!timings) return null;
    return PRAYERS
      .map(p => ({ ...p, time: cleanPrayerTime(timings[p.key]), timestamp: getPrayerTimestamp(timings[p.key]) }))
      .filter(p => p.timestamp > nowMs)
      .sort((a, b) => a.timestamp - b.timestamp)[0] || null;
  }, [timings, nowMs]);

  const countdown = useLiveCountdown(nextPrayerInfo ? nextPrayerInfo.timestamp : null);

  // Iqamah Countdown Window
  const betweenAzanAndIqamah = useMemo(() => {
    if (!timings || !nextPrayerInfo) return null;
    const idx = PRAYERS.findIndex(p => p.key === nextPrayerInfo.key);
    if (idx <= 0) return null;
    const prev = PRAYERS[idx - 1];
    const prevTs = getPrayerTimestamp(timings[prev.key]);
    const iqamaMs = prevTs + prev.iqamaMins * 60 * 1000;
    if (nowMs >= prevTs && nowMs < iqamaMs) {
      const diff = iqamaMs - nowMs;
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      return { label: prev.label, remaining: `${m}:${String(s).padStart(2, '0')}` };
    }
    return null;
  }, [timings, nextPrayerInfo, nowMs]);

  // Audio Playback
  const handlePlayAzan = (key: string) => {
    if (playingKey === key) {
      setPlayingKey(null);
      return;
    }
    setPlayingKey(key);
    try {
      const audio = new Audio('/audio/adhan/makkah.mp3');
      audio.play().catch(() => setPlayingKey(null));
      audio.onended = () => setPlayingKey(null);
    } catch {
      setPlayingKey(null);
    }
  };

  const doneCount = Object.values(donePrayers).filter(Boolean).length;
  const currentHeroGradient = nextPrayerInfo?.bgHero || 'from-slate-950 via-indigo-950 to-slate-900';

  return (
    <section className="space-y-4 pb-8 animate-in fade-in duration-300" dir="rtl">
      {/* Top Location & Settings Bar */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-white/10 text-xs font-black text-slate-200 backdrop-blur-md shadow-sm">
            <MapPin size={13} className="text-amber-400 animate-pulse" />
            <span>{locationLabel}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="text-[11px] font-black text-amber-400 hover:text-amber-300 underline underline-offset-4"
          >
            تغيير المدينة
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={loadPrayerTimes}
            className="w-9 h-9 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-center hover:bg-white/10 text-slate-300 active:scale-95 transition"
            title="تحديث المواقيت"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin text-amber-400' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-center hover:bg-white/10 text-slate-300 active:scale-95 transition"
            title="إعدادات الحساب والأذان"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* Segmented Top Navigation */}
      <div className="flex p-1 rounded-2xl bg-slate-950/90 border border-white/15 shadow-xl backdrop-blur-md overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('times')}
          className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            activeTab === 'times'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-200 hover:text-white hover:bg-white/10'
          }`}
        >
          <Sun size={14} className={activeTab === 'times' ? 'text-slate-950' : 'text-amber-300'} />
          <span>المواقيت</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('alarm')}
          className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            activeTab === 'alarm'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-200 hover:text-white hover:bg-white/10'
          }`}
        >
          <AlarmClock size={14} className={activeTab === 'alarm' ? 'text-slate-950' : 'text-amber-300'} />
          <span>منبّه الفجر</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customize')}
          className={`flex-1 min-w-[95px] py-2 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            activeTab === 'customize'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-200 hover:text-white hover:bg-white/10'
          }`}
        >
          <Sliders size={14} className={activeTab === 'customize' ? 'text-slate-950' : 'text-amber-300'} />
          <span>تخصيص المنبّه</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wake')}
          className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            activeTab === 'wake'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-200 hover:text-white hover:bg-white/10'
          }`}
        >
          <Users size={14} className={activeTab === 'wake' ? 'text-slate-950' : 'text-amber-300'} />
          <span>أيقظني (المجموعات)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qibla')}
          className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            activeTab === 'qibla'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-200 hover:text-white hover:bg-white/10'
          }`}
        >
          <Compass size={14} className={activeTab === 'qibla' ? 'text-slate-950' : 'text-amber-300'} />
          <span>القبلة والسنن</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PRAYER TIMES & TRACKER */}
      {/* ======================================================== */}
      {activeTab === 'times' && (
        <div className="space-y-4">
          {/* Celestial Next Prayer Hero Stage */}
          <div className={`relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br ${currentHeroGradient} text-white p-6 sm:p-7 shadow-2xl border border-white/15 transition-all duration-700`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_60%)] pointer-events-none" />

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-black text-amber-300 backdrop-blur-md">
                  <Clock3 size={13} />
                  <span>الصلاة القادمة</span>
                </div>
                <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight drop-shadow">
                  صلاة {nextPrayerInfo?.label || 'الفجر'}
                </h1>
                <p className="mt-1 text-xs sm:text-sm font-bold text-slate-300">
                  موعد الأذان المبارك: <strong className="font-mono text-white text-base">{nextPrayerInfo?.time || '--:--'}</strong>
                </p>
              </div>

              {/* Countdown Stage */}
              <div className="text-left bg-white/10 border border-white/15 rounded-3xl p-3.5 sm:p-4 backdrop-blur-md">
                <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider flex items-center justify-end gap-1">
                  <Timer size={12} /> متبقي للأذان
                </span>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums text-white drop-shadow mt-1" dir="ltr">
                  {countdown}
                </div>
              </div>
            </div>

            {/* Iqamah Alert Banner if active */}
            {betweenAzanAndIqamah && (
              <div className="relative z-10 mt-5 p-3.5 rounded-2xl bg-amber-500/25 border border-amber-400/40 backdrop-blur-md flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black shadow">
                    <Bell size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-amber-200">الإقامة الآن لصلاة {betweenAzanAndIqamah.label}</div>
                    <div className="text-[10px] text-slate-300 font-bold">وقت استجابة الدعاء بين الأذان والإقامة</div>
                  </div>
                </div>
                <div className="text-xl font-black font-mono text-amber-300 tabular-nums">
                  {betweenAzanAndIqamah.remaining}
                </div>
              </div>
            )}

            {/* Daily Commitment Bar */}
            <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>الصلوات المؤداة اليوم: <strong>{doneCount} من ٥</strong></span>
              </span>
              <div className="w-28 h-2 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-500 rounded-full"
                  style={{ width: `${(doneCount / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="animate-spin text-amber-400" size={32} />
              <p className="text-xs font-bold">جاري تحديث مواقيت الصلاة بدقة...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="p-4 rounded-3xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold text-center">
              {error}
            </div>
          )}

          {/* 5 Prayers Grid List */}
          {!isLoading && timings && (
            <div className="grid gap-2.5">
              {PRAYERS.map(({ key, label, icon: Icon, tone, iqamaMins, sunnahText }) => {
                const ts = getPrayerTimestamp(timings[key]);
                const isPast = ts <= nowMs;
                const isNext = nextPrayerInfo?.key === key;
                const iqamaTime = addMinutesToTime(timings[key], iqamaMins);
                const parsedTime = parsePrayerTime(timings[key]);
                const isDone = !!donePrayers[key];

                return (
                  <div
                    key={key}
                    className={`rounded-3xl border p-4 sm:p-4.5 transition-all duration-300 flex items-center justify-between gap-3 ${
                      isNext
                        ? 'bg-slate-900 border-amber-400/80 shadow-xl shadow-amber-500/10 ring-1 ring-amber-400/40 scale-[1.01]'
                        : isDone
                        ? 'bg-slate-900/60 border-emerald-500/30'
                        : isPast
                        ? 'bg-slate-900/40 border-white/5 opacity-70'
                        : 'bg-slate-900/80 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Right: Icon & Names */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tone} text-white flex-shrink-0 flex items-center justify-center shadow-lg`}>
                        <Icon size={22} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base sm:text-lg font-black text-white">{label}</span>
                          {isNext && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase">
                              القادمة
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-bold">
                          <span>الإقامة: <strong className="text-slate-300 font-mono">{iqamaTime}</strong></span>
                          <span>•</span>
                          <span className="text-amber-400/90 truncate">{sunnahText}</span>
                        </div>
                      </div>
                    </div>

                    {/* Left: Time Display & Done Toggle */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      {/* Audio listen button */}
                      <button
                        type="button"
                        onClick={() => handlePlayAzan(key)}
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center transition active:scale-95 ${
                          playingKey === key
                            ? 'bg-amber-500 border-amber-400 text-slate-950 animate-pulse'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-amber-300'
                        }`}
                        title="استماع للأذان"
                      >
                        <Volume2 size={14} />
                      </button>

                      {/* Time text */}
                      <div className="text-left" dir="ltr">
                        <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight tabular-nums ${
                          isNext ? 'text-amber-400' : 'text-white'
                        }`}>
                          {parsedTime.time}
                        </span>
                        <span className="text-[10px] font-black mr-1 text-slate-400">
                          {parsedTime.period}
                        </span>
                      </div>

                      {/* Prayer Done Checkbox */}
                      <button
                        type="button"
                        onClick={() => togglePrayerDone(key)}
                        className={`w-9 h-9 rounded-2xl border flex items-center justify-center transition active:scale-90 ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'bg-white/5 border-white/15 text-slate-500 hover:border-emerald-400/50 hover:text-emerald-400'
                        }`}
                        title={isDone ? 'تم أداء الصلاة (اضغط للإلغاء)' : 'تسجيل أداء الصلاة'}
                      >
                        <Check size={16} strokeWidth={isDone ? 3 : 2} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: FAJR ALARM HUB */}
      {/* ======================================================== */}
      {activeTab === 'alarm' && (
        <FajrAlarmHubView
          fajrTimeFormatted={timings?.Fajr ? cleanPrayerTime(timings.Fajr) : undefined}
          nextFajrMs={timings?.Fajr ? getPrayerTimestamp(timings.Fajr) : null}
          onOpenCustomize={() => setActiveTab('customize')}
        />
      )}

      {/* ======================================================== */}
      {/* TAB 3: FAJR ALARM FULL-SCREEN CUSTOMIZE (FIT FOR SCREEN) */}
      {/* ======================================================== */}
      {activeTab === 'customize' && (
        <FajrAlarmCustomizeView
          onBack={() => setActiveTab('alarm')}
          onSaved={() => setActiveTab('alarm')}
        />
      )}

      {/* ======================================================== */}
      {/* TAB 3: FAJR WAKE GROUPS (PRIVATE PIN & EXPLORE) */}
      {/* ======================================================== */}
      {activeTab === 'wake' && (
        <FajrWakeGroupsView />
      )}

      {/* ======================================================== */}
      {/* TAB 4: QIBLA & SUNAN RAWATIB */}
      {/* ======================================================== */}
      {activeTab === 'qibla' && (
        <div className="space-y-4">
          {/* Sunan Rawatib Tracker Card */}
          <div className="rounded-3xl bg-slate-900/90 border border-white/10 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h3 className="text-base font-black text-white">السنن الرواتب (١٢ ركعة)</h3>
                  <p className="text-[11px] text-slate-400 font-bold">«مَن صلَّى في يومٍ اثنتَي عشرةَ ركعةً تطوُّعاً بُنِيَ له بيتٌ في الجنَّةِ»</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { id: 'fajr_pre', label: 'سنة الفجر (ركعتان قبلية)', count: '٢ ركعة' },
                { id: 'dhuhr_pre', label: 'سنة الظهر القبلية (٤ ركعات)', count: '٤ ركعات' },
                { id: 'dhuhr_post', label: 'سنة الظهر البعدية (ركعتان)', count: '٢ ركعة' },
                { id: 'maghrib_post', label: 'سنة المغرب البعدية (ركعتان)', count: '٢ ركعة' },
                { id: 'isha_post', label: 'سنة العشاء البعدية (ركعتان)', count: '٢ ركعة' },
                { id: 'witr', label: 'صلاة الوتر وقيام الليل', count: 'مستحبة' },
              ].map(s => {
                const isChecked = !!doneSunnah[s.id];
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSunnahDone(s.id)}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between text-right ${
                      isChecked
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800/40 border-white/5 text-slate-300 hover:border-white/15'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black">{s.label}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{s.count}</div>
                    </div>
                    <div className={`w-7 h-7 rounded-xl border flex items-center justify-center ${
                      isChecked ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black' : 'border-white/20'
                    }`}>
                      {isChecked && <Check size={14} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Post-Prayer Azkar Advice */}
          <div className="p-4 rounded-3xl bg-slate-900/60 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <BookOpen size={18} />
              </span>
              <div>
                <h4 className="text-xs font-black text-white">أذكار ما بعد الصلاة المكتوبة</h4>
                <p className="text-[11px] text-slate-400 font-bold">الاستغفار ٣ مرات، وآية الكرسي، والتسبيح ٣٣، والحمد ٣٣، والتكبير ٣٣.</p>
              </div>
            </div>
          </div>

          {/* Lockscreen Athkar Reminder Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-purple-500/10 border border-white/15 space-y-3 shadow-xl text-white">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Bell size={18} />
                </span>
                <div>
                  <h4 className="text-sm font-black text-white">تنبيهات أذكار الصباح والمساء (شاشة القفل)</h4>
                  <p className="text-[11px] text-slate-300 font-bold">تذكير تلقائي بعد الفجر وبعد العصر مع خيارات القراءة والتأجيل</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('ifaqa_open_athkar_reminder', { detail: { type: 'morning' } }))}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
              >
                <Sun size={15} />
                <span>معاينة تذكير الصباح ☀️</span>
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('ifaqa_open_athkar_reminder', { detail: { type: 'evening' } }))}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
              >
                <Moon size={15} />
                <span>معاينة تذكير المساء 🌙</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <PrayerSettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          loadPrayerTimes();
        }}
      />
    </section>
  );
}
