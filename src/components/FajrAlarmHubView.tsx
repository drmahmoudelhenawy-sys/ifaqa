import React, { useState, useEffect } from 'react';
import {
  AlarmClock,
  Bell,
  Sliders,
  Sparkles,
  CheckCircle2,
  Loader2,
  Volume2,
  Palette,
  ShieldCheck,
  Sunrise,
  Sun,
  Flame,
  Info,
  AlertCircle,
  Clock
} from 'lucide-react';
import {
  FajrAlarm,
  fetchFajrAlarmCalendar,
  isNativeAlarm,
  syncFajrWakeEvents
} from '../services/fajrWakeService';
import {
  loadFajrAlarmSettings,
  saveFajrAlarmSettings,
  FAJR_ALARM_THEMES,
  SOUND_PRESETS,
  FajrAlarmUserSettings
} from '../services/fajrAlarmCustomization';
import FajrAlarmSettingsModal from './FajrAlarmSettingsModal';
import FajrAlarmPreviewModal from './FajrAlarmPreviewModal';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { APP_ID } from '../../constants';

interface Props {
  fajrTimeFormatted?: string;
  nextFajrMs?: number | null;
  onOpenCustomize?: () => void;
}

export default function FajrAlarmHubView({ fajrTimeFormatted, nextFajrMs, onOpenCustomize }: Props) {
  const [alarmState, setAlarmState] = useState<Awaited<ReturnType<typeof FajrAlarm.status>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [defaultAdminSound, setDefaultAdminSound] = useState('');
  const [settings, setSettings] = useState<FajrAlarmUserSettings>(loadFajrAlarmSettings);

  const getTimingLabel = (s: FajrAlarmUserSettings) => {
    if (s.mode === 'fixed' && s.customFixedTime) {
      return `يومياً في تمام الساعة ${s.customFixedTime}`;
    }
    if (!s.timeOffset || s.timeOffset === 0) {
      return 'مع وقت أذان الفجر بالضبط';
    }
    return `قبل أذان الفجر بـ ${s.timeOffset} دقيقة`;
  };

  const refreshStatus = async () => {
    if (isNativeAlarm()) {
      try {
        const s = await FajrAlarm.status();
        setAlarmState(s);
        await syncFajrWakeEvents();
      } catch (e) {
        console.warn('Alarm status check:', e);
      }
    } else {
      const isWebEnabled = localStorage.getItem('ifaqa_web_alarm_enabled') === 'true';
      setAlarmState({
        enabled: isWebEnabled,
        count: isWebEnabled ? 30 : 0,
        nextAt: isWebEnabled && nextFajrMs ? nextFajrMs - (settings.timeOffset || 0) * 60000 : 0,
        exact: true,
        fullScreen: true,
        notifications: true
      });
    }
  };

  useEffect(() => {
    refreshStatus();
    window.addEventListener('focus', refreshStatus);
    return () => window.removeEventListener('focus', refreshStatus);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'artifacts', APP_ID, 'public', 'data', 'app_config', 'settings'), (snap) => {
      if (snap.exists() && snap.data().defaultFajrAlarmSound) {
        setDefaultAdminSound(snap.data().defaultFajrAlarmSound);
      }
    }, () => {});
    return () => unsub();
  }, []);

  // One-tap to Activate, another tap to Deactivate
  const handleToggleAlarm = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const isCurrentlyEnabled = Boolean(alarmState?.enabled);

      // دوسة تانية يلغي التفعيل (Cancel if currently enabled)
      if (isCurrentlyEnabled) {
        if (isNativeAlarm()) {
          await FajrAlarm.cancel();
        }
        localStorage.setItem('ifaqa_web_alarm_enabled', 'false');
        setAlarmState(prev => ({
          ...(prev || { exact: true, fullScreen: true, notifications: true, count: 0, nextAt: 0 }),
          enabled: false,
          count: 0,
          nextAt: 0
        }));
        setNotice('تم إلغاء تفعيل منبّه الفجر بنجاح.');
        setBusy(false);
        return;
      }

      // دوسة تفعيل (Activate if disabled)
      const currentAlarmSettings = loadFajrAlarmSettings();
      const timingText = getTimingLabel(currentAlarmSettings);

      if (!isNativeAlarm()) {
        localStorage.setItem('ifaqa_web_alarm_enabled', 'true');
        setAlarmState({
          enabled: true,
          count: 30,
          nextAt: nextFajrMs ? nextFajrMs - (currentAlarmSettings.timeOffset || 0) * 60000 : Date.now() + 86400000,
          exact: true,
          fullScreen: true,
          notifications: true
        });
        setNotice(`تم تفعيل منبّه الفجر بنجاح (${timingText}). يوقظك حتى لو كان الهاتف مقفلاً.`);
        setBusy(false);
        return;
      }

      const status = await FajrAlarm.status();
      if (!status.notifications) {
        await FajrAlarm.requestAccess({ kind: 'notifications' });
        setNotice('يرجى السماح بإشعارات المنبّه ثم الضغط على تفعيل مرة أخرى.');
        setBusy(false);
        return;
      }
      if (!status.exact) {
        await FajrAlarm.requestAccess({ kind: 'exact' });
        setNotice('يرجى السماح بالمنبّهات الدقيقة ثم الضغط على تفعيل مرة أخرى.');
        setBusy(false);
        return;
      }

      const entries = await fetchFajrAlarmCalendar(currentAlarmSettings);

      let soundUrl = '';
      if (currentAlarmSettings.soundType === 'default') {
        soundUrl = defaultAdminSound || '/audio/adhan/makkah.mp3';
      } else if (currentAlarmSettings.soundType === 'custom') {
        soundUrl = currentAlarmSettings.customSoundUrl || '';
      } else {
        const matched = SOUND_PRESETS.find(p => p.id === currentAlarmSettings.soundType);
        soundUrl = (matched as any)?.url || '';
      }

      await FajrAlarm.schedule({
        entries,
        uid: '',
        clanId: '',
        soundUrl,
        themeId: currentAlarmSettings.themeId || 'emerald'
      });

      localStorage.setItem('ifaqa_web_alarm_enabled', 'true');
      await refreshStatus();
      setNotice(`تم تفعيل منبّه الفجر بنجاح لمواعيد الشهر القادم (${timingText}).`);
    } catch (e: any) {
      setError(e.message || 'حدث خطأ أثناء ضبط المنبّه.');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateOffset = async (offset: number, mode: 'relative' | 'fixed') => {
    const updated: FajrAlarmUserSettings = {
      ...settings,
      timeOffset: offset,
      mode
    };
    setSettings(updated);
    saveFajrAlarmSettings(updated);

    const timingText = getTimingLabel(updated);
    setNotice(`تم ضبط توقيت المنبّه: ${timingText}`);

    // If alarm is already active, reschedule immediately with new time
    if (alarmState?.enabled) {
      if (isNativeAlarm()) {
        try {
          const entries = await fetchFajrAlarmCalendar(updated);
          let soundUrl = '';
          if (updated.soundType === 'default') {
            soundUrl = defaultAdminSound || '/audio/adhan/makkah.mp3';
          } else if (updated.soundType === 'custom') {
            soundUrl = updated.customSoundUrl || '';
          } else {
            const matched = SOUND_PRESETS.find(p => p.id === updated.soundType);
            soundUrl = (matched as any)?.url || '';
          }
          await FajrAlarm.schedule({
            entries,
            uid: '',
            clanId: '',
            soundUrl,
            themeId: updated.themeId || 'emerald'
          });
          await refreshStatus();
        } catch (err) {
          console.warn('Reschedule on offset change:', err);
        }
      }
    }
  };

  const handleUpdateCustomTime = async (timeStr: string) => {
    const updated: FajrAlarmUserSettings = {
      ...settings,
      customFixedTime: timeStr,
      mode: 'fixed'
    };
    setSettings(updated);
    saveFajrAlarmSettings(updated);
    setNotice(`تم ضبط موعد رنين المنبّه يومياً في الساعة: ${timeStr}`);

    if (alarmState?.enabled && isNativeAlarm()) {
      try {
        const entries = await fetchFajrAlarmCalendar(updated);
        let soundUrl = '';
        if (updated.soundType === 'default') {
          soundUrl = defaultAdminSound || '/audio/adhan/makkah.mp3';
        } else if (updated.soundType === 'custom') {
          soundUrl = updated.customSoundUrl || '';
        } else {
          const matched = SOUND_PRESETS.find(p => p.id === updated.soundType);
          soundUrl = (matched as any)?.url || '';
        }
        await FajrAlarm.schedule({
          entries,
          uid: '',
          clanId: '',
          soundUrl,
          themeId: updated.themeId || 'emerald'
        });
        await refreshStatus();
      } catch (err) {
        console.warn('Reschedule on custom time change:', err);
      }
    }
  };

  const currentTheme = FAJR_ALARM_THEMES[settings.themeId] || FAJR_ALARM_THEMES.emerald;
  const currentSoundPreset = SOUND_PRESETS.find(p => p.id === settings.soundType);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Notice / Error banners with crystal clear contrast */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-500/50 dark:border-rose-500/40 text-rose-950 dark:text-rose-100 text-xs sm:text-sm font-black shadow-md flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <AlertCircle size={18} strokeWidth={2.5} />
          </div>
          <span className="leading-relaxed flex-1">{error}</span>
        </div>
      )}
      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-500/50 dark:border-emerald-500/40 text-emerald-950 dark:text-emerald-100 text-xs sm:text-sm font-black shadow-md flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Info size={18} strokeWidth={2.5} />
          </div>
          <span className="leading-relaxed flex-1">{notice}</span>
        </div>
      )}

      {/* Main Luxury Fajr Alarm Stage */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border border-white/15 p-6 sm:p-7 shadow-2xl text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-right space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
              <Sunrise size={15} />
              <span>منبّه صلاة الفجر الذكي</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {alarmState?.enabled ? 'المنبّه نشط وجاهز للإيقاظ' : 'منبّه شاشة القفل للفجر'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-bold max-w-md">
              {alarmState?.enabled && alarmState.nextAt
                ? `موعد الرنين القادم: ${new Date(alarmState.nextAt).toLocaleString('ar-EG', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}`
                : 'يوقظك بصوت الأذان المختار حتى بعد إغلاق التطبيق وقفل الشاشة.'}
            </p>
          </div>

          {/* Toggle Button & Big Visual */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={handleToggleAlarm}
              className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 shadow-2xl active:scale-95 group ${
                alarmState?.enabled
                  ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 border-emerald-300 shadow-[0_0_35px_rgba(16,185,129,0.45)] text-slate-950 font-black'
                  : 'bg-slate-900/95 border-amber-400/60 hover:border-amber-400 shadow-amber-500/10 text-white'
              }`}
            >
              {busy ? (
                <Loader2 size={36} className="animate-spin text-amber-400" />
              ) : alarmState?.enabled ? (
                <>
                  <CheckCircle2 size={36} strokeWidth={2.5} className="text-slate-950 animate-bounce" />
                  <span className="text-xs font-black tracking-wide text-slate-950">
                    المنبّه نشط
                  </span>
                  <span className="text-[10px] font-black text-slate-900 bg-white/35 px-2 py-0.5 rounded-full">
                    اضغط للإلغاء
                  </span>
                </>
              ) : (
                <>
                  <AlarmClock size={36} className="text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-black tracking-wide text-white">
                    اضغط للتفعيل
                  </span>
                  <span className="text-[10px] font-bold text-amber-300">
                    تشغيل المنبّه
                  </span>
                </>
              )}
            </button>
            {alarmState?.enabled && alarmState.count > 0 && (
              <span className="text-[11px] font-black text-emerald-300 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/40 shadow-sm">
                مجدول لـ {alarmState.count} يوم قادم
              </span>
            )}
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              if (onOpenCustomize) {
                onOpenCustomize();
              } else {
                setSettings(loadFajrAlarmSettings());
                setShowSettings(true);
              }
            }}
            className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-between gap-3 text-white transition active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Sliders size={18} />
              </span>
              <div className="text-right">
                <div className="text-xs font-black">تخصيص النغمة والمظهر</div>
                <div className="text-[10px] text-slate-300 font-bold truncate">
                  الصوت: {currentSoundPreset?.name} · المظهر: {currentTheme.name}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-300">تعديل ❯</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSettings(loadFajrAlarmSettings());
              setShowPreview(true);
            }}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-400/30 flex items-center justify-between gap-3 text-white transition active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500 text-slate-950 shadow">
                <Sparkles size={18} />
              </span>
              <div className="text-right">
                <div className="text-xs font-black text-amber-200">تجربة شاشة المنبّه الحية</div>
                <div className="text-[10px] text-slate-300 font-bold">معاينة الصوت والشاشة كاملة الآن</div>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-300">معاينة ❯</span>
          </button>
        </div>
      </div>

      {/* Timing Customization Card - متى يرن المنبّه */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/15 shadow-xl space-y-3.5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-black text-amber-300">
            <Clock size={16} />
            <span>تخصيص وقت رنين المنبّه (متى يرن؟)</span>
          </div>
          <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            {getTimingLabel(settings)}
          </span>
        </div>

        {/* Primary Timing Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { offset: 0, label: 'مع أذان الفجر', sub: 'في نفس الدقيقة' },
            { offset: 15, label: 'قبل الفجر بـ ١٥ د', sub: 'الموصى بها ⭐' },
            { offset: 30, label: 'قبل الفجر بـ ٣٠ د', sub: 'قيام وسحور 🌙' },
            { offset: 60, label: 'قبل الفجر بساعة', sub: 'تهجد واستغفار ✨' }
          ].map((opt) => {
            const isSelected = settings.mode !== 'fixed' && settings.timeOffset === opt.offset;
            return (
              <button
                key={opt.offset}
                type="button"
                onClick={() => handleUpdateOffset(opt.offset, 'relative')}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 active:scale-95 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/40'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-white/10 text-white'
                }`}
              >
                <span className="text-xs font-black">{opt.label}</span>
                <span className={`text-[10px] ${isSelected ? 'text-slate-950 font-black' : 'text-slate-300 font-bold'}`}>
                  {opt.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary Choices */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
          <span className="text-[11px] font-bold text-slate-300">خيارات متقدمة:</span>
          {[10, 20, 45].map((mins) => {
            const isSelected = settings.mode !== 'fixed' && settings.timeOffset === mins;
            return (
              <button
                key={mins}
                type="button"
                onClick={() => handleUpdateOffset(mins, 'relative')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15'
                }`}
              >
                قبل الفجر بـ {mins} د
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              if (settings.mode === 'fixed') {
                handleUpdateOffset(0, 'relative');
              } else {
                handleUpdateCustomTime(settings.customFixedTime || '04:15');
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 active:scale-95 ${
              settings.mode === 'fixed'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15'
            }`}
          >
            <Clock size={13} />
            <span>وقت يدوي محدد</span>
          </button>
        </div>

        {/* Custom Time Selector if Fixed Mode is chosen */}
        {settings.mode === 'fixed' && (
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-400/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="text-xs font-bold text-slate-200">
              اختر وقت الرنين اليومي الثابت:
            </div>
            <input
              type="time"
              value={settings.customFixedTime || '04:15'}
              onChange={(e) => handleUpdateCustomTime(e.target.value)}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-amber-400 text-amber-300 font-mono font-black text-base outline-none shadow-inner text-center cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Fajr Virtues Card */}
      <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-black text-amber-300">
          <Flame size={16} />
          <span>فضل صلاة الفجر والتبكير إليها</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-bold">
          قال رسول الله ﷺ: «مَن صلَّى الصُّبحَ فهو في ذِمَّةِ اللهِ» [صحيح مسلم].
          وقال أيضاً: «ركعتا الفجر خيرٌ من الدنيا وما فيها».
        </p>
      </div>

      {/* Settings Modal */}
      <FajrAlarmSettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          setSettings(loadFajrAlarmSettings());
        }}
        defaultAdminSound={defaultAdminSound}
      />

      {/* Full Screen Live Preview Modal */}
      {showPreview && (
        <FajrAlarmPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          themeId={settings.themeId}
          soundType={settings.soundType}
          customSoundUrl={settings.customSoundUrl}
          defaultAdminSound={defaultAdminSound}
        />
      )}
    </div>
  );
}
