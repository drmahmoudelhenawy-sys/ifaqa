import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
  Volume2,
  Palette,
  Check,
  Play,
  Square,
  Sparkles,
  Sliders,
  Upload,
  Music,
  Bell,
  Clock
} from 'lucide-react';
import FajrAlarmPreviewModal from './FajrAlarmPreviewModal';
import {
  FajrAlarmUserSettings,
  FAJR_ALARM_THEMES,
  SOUND_PRESETS,
  loadFajrAlarmSettings,
  saveFajrAlarmSettings,
  FajrAlarmSoundOption,
  FajrAlarmThemeId
} from '../services/fajrAlarmCustomization';
import {
  FajrAlarm,
  fetchFajrAlarmCalendar,
  isNativeAlarm
} from '../services/fajrWakeService';

interface Props {
  onBack: () => void;
  defaultAdminSound?: string;
  onSaved?: (settings: FajrAlarmUserSettings) => void;
}

export default function FajrAlarmCustomizeView({ onBack, defaultAdminSound, onSaved }: Props) {
  const [settings, setSettings] = useState<FajrAlarmUserSettings>(loadFajrAlarmSettings);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [customInput, setCustomInput] = useState(settings.customSoundUrl || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setSettings(loadFajrAlarmSettings());
    return () => {
      stopAudio();
    };
  }, []);

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingId(null);
  }

  function playPreview(id: string, url?: string, fallbackUrl?: string) {
    if (playingId === id) {
      stopAudio();
      return;
    }
    stopAudio();

    let targetUrl = url;
    if (id === 'default') {
      targetUrl = defaultAdminSound || '/audio/adhan/makkah.mp3';
    } else if (id === 'custom') {
      targetUrl = customInput || settings.customSoundUrl;
    }

    if (!targetUrl) return;

    try {
      const audio = new Audio(targetUrl);
      audioRef.current = audio;
      setPlayingId(id);

      audio.play().catch((err) => {
        console.warn('Audio play failed, trying fallback:', err);
        if (fallbackUrl) {
          const fallback = new Audio(fallbackUrl);
          audioRef.current = fallback;
          fallback.play().catch(() => setPlayingId(null));
          fallback.onended = () => setPlayingId(null);
        } else {
          setPlayingId(null);
        }
      });

      audio.onended = () => {
        setPlayingId(null);
        audioRef.current = null;
      };
    } catch {
      setPlayingId(null);
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setCustomInput(url);
    setSettings(s => ({
      ...s,
      soundType: 'custom',
      customSoundUrl: url,
      customSoundName: file.name
    }));
  };

  const handleSave = async () => {
    stopAudio();
    const updatedSettings: FajrAlarmUserSettings = {
      ...settings,
      customSoundUrl: customInput || settings.customSoundUrl
    };

    saveFajrAlarmSettings(updatedSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);

    if (isNativeAlarm()) {
      try {
        const s = await FajrAlarm.status();
        if (s.enabled) {
          const entries = await fetchFajrAlarmCalendar(updatedSettings);
          let soundUrl = '';
          if (updatedSettings.soundType === 'default') {
            soundUrl = defaultAdminSound || '/audio/adhan/makkah.mp3';
          } else if (updatedSettings.soundType === 'custom') {
            soundUrl = updatedSettings.customSoundUrl || '';
          } else {
            const matched = SOUND_PRESETS.find(p => p.id === updatedSettings.soundType);
            soundUrl = (matched as any)?.url || '';
          }
          await FajrAlarm.schedule({
            entries,
            uid: '',
            clanId: '',
            soundUrl,
            themeId: updatedSettings.themeId || 'emerald'
          });
        }
      } catch (err) {
        console.warn('Alarm reschedule error on save:', err);
      }
    }

    onSaved?.(updatedSettings);
  };

  const currentTheme = FAJR_ALARM_THEMES[settings.themeId] || FAJR_ALARM_THEMES.emerald;

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-300 pb-36" dir="rtl">
      {/* Top Header Bar with Back Button */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900/90 border border-white/15 shadow-xl text-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { stopAudio(); onBack(); }}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white active:scale-95 transition shadow-sm"
            title="العودة لمنبّه الفجر"
          >
            <ArrowRight size={20} />
          </button>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>تخصيص منبّه الفجر</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                كامل الشاشة
              </span>
            </h2>
            <p className="text-xs font-bold text-slate-300">تحديد الأصوات، الخلفيات، والمظهر، وموعد الرنين</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5 active:scale-95 transition"
        >
          <Check size={16} strokeWidth={3} />
          <span>حفظ</span>
        </button>
      </div>

      {/* Success Notification */}
      {savedSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100 text-xs font-black shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2">
          <Check size={18} className="text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
          <span>تم حفظ وتطبيق إعدادات المنبّه بنجاح!</span>
        </div>
      )}

      {/* SECTION 1: THEMES & APPEARANCE */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/15 shadow-xl space-y-4 text-white">
        <div className="flex items-center gap-2 text-xs font-black text-amber-300">
          <Palette size={18} />
          <span>١. مظهر شاشة المنبّه (الخلفيات والألوان)</span>
        </div>

        {/* Live Preview Box */}
        <div className={`p-5 rounded-2xl bg-gradient-to-br ${currentTheme.bgGradient} border-2 ${currentTheme.previewBorder} shadow-2xl transition-all duration-300`}>
          <div className="flex items-center justify-between text-xs opacity-90 mb-2">
            <span className="font-black text-white">معاينة شاشة المنبّه الحية</span>
            <span className="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full font-black text-white">{currentTheme.name}</span>
          </div>
          <div className="text-center py-4">
            <div className="text-4xl sm:text-5xl font-black tracking-widest font-mono text-white drop-shadow-md">04:30</div>
            <div className="text-xs font-bold text-white/90 mt-2">حيّ على الصلاة · حيّ على الفلاح</div>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 text-xs font-black text-amber-300 border border-white/20 shadow-inner">
              غفوة ٥ دقائق
            </div>
          </div>

          <button
            type="button"
            onClick={() => { stopAudio(); setShowPreviewModal(true); }}
            className="mt-2 w-full py-3 px-4 rounded-xl bg-white/20 hover:bg-white/30 border border-white/25 text-xs font-black text-white flex items-center justify-center gap-2 transition active:scale-95 shadow backdrop-blur-md"
          >
            <Sparkles size={16} className="text-amber-300" />
            <span>تجربة شاشة المنبّه كاملة مع الصوت بملء الشاشة</span>
          </button>
        </div>

        {/* Theme Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {(Object.keys(FAJR_ALARM_THEMES) as FajrAlarmThemeId[]).map((themeKey) => {
            const t = FAJR_ALARM_THEMES[themeKey];
            const isSelected = settings.themeId === themeKey;
            return (
              <button
                key={themeKey}
                type="button"
                onClick={() => setSettings(s => ({ ...s, themeId: themeKey }))}
                className={`p-3.5 rounded-2xl border text-right transition flex flex-col gap-1.5 active:scale-98 ${
                  isSelected
                    ? `bg-slate-800 border-amber-400 ring-2 ring-amber-400/40 shadow-xl`
                    : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-full shadow-md" style={{ backgroundColor: t.accentColor }} />
                  {isSelected && <Check size={18} className="text-amber-400" strokeWidth={3} />}
                </div>
                <div className="text-sm font-black text-white">{t.name}</div>
                <div className="text-xs text-slate-300 font-bold leading-tight">{t.subtitle}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: SOUND & TONE SELECTION */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/15 shadow-xl space-y-4 text-white">
        <div className="flex items-center gap-2 text-xs font-black text-amber-300">
          <Volume2 size={18} />
          <span>٢. صوت ونغمة المنبّه</span>
        </div>

        <div className="space-y-2.5">
          {SOUND_PRESETS.map((preset) => {
            const isSelected = settings.soundType === preset.id;
            const isPlaying = playingId === preset.id;
            const hasPlayableUrl = preset.id === 'custom' ? !!(customInput || settings.customSoundUrl) : true;

            return (
              <div
                key={preset.id}
                onClick={() => setSettings(s => ({ ...s, soundType: preset.id as FajrAlarmSoundOption }))}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 active:scale-98 ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                    : 'bg-slate-800/90 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800 text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-slate-400 bg-slate-700/60'
                  }`}>
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-white truncate">{preset.name}</div>
                    <div className="text-xs font-bold text-slate-300 truncate">{preset.desc}</div>
                  </div>
                </div>

                {hasPlayableUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playPreview(preset.id, (preset as any).url, (preset as any).fallbackUrl);
                    }}
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex-shrink-0 active:scale-95"
                    title={isPlaying ? 'إيقاف المعاينة' : 'تشغيل النغمة'}
                  >
                    {isPlaying ? <Square size={16} className="text-red-400 fill-current" /> : <Play size={16} className="fill-current text-amber-300" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom Sound Uploader if custom selected */}
        {settings.soundType === 'custom' && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-white/15 space-y-3 animate-in fade-in">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Music size={16} className="text-amber-400" />
              <span>إدخال رابط صوتي مباشر (MP3) أو رفع ملف من هاتفك:</span>
            </div>

            <input
              type="url"
              placeholder="https://example.com/sound.mp3"
              dir="ltr"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-900 border border-white/15 text-white outline-none focus:border-amber-400"
            />

            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-center text-xs font-black text-white flex items-center justify-center gap-2 transition">
                <Upload size={16} />
                <span>اختيار ورفع ملف صوتي من الجهاز</span>
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              </label>
              {customInput && (
                <button
                  type="button"
                  onClick={() => playPreview('custom', customInput)}
                  className="p-3 rounded-xl bg-amber-500 text-slate-950 font-black hover:bg-amber-400 transition"
                  title="معاينة الملف"
                >
                  {playingId === 'custom' ? <Square size={16} /> : <Play size={16} className="fill-current" />}
                </button>
              )}
            </div>
            {settings.customSoundName && (
              <p className="text-xs text-amber-300 font-bold truncate">ملف محدد: {settings.customSoundName}</p>
            )}
          </div>
        )}
      </div>

      {/* SECTION 3: ALARM TIMING */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/15 shadow-xl space-y-4 text-white">
        <div className="flex items-center gap-2 text-xs font-black text-amber-300">
          <Clock size={18} />
          <span>٣. توقيت رنين المنبّه (متى يرن؟)</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {[
            { offset: 0, label: 'مع أذان الفجر', sub: 'في نفس اللحظة' },
            { offset: 15, label: 'قبل الفجر بـ ١٥ د', sub: 'الموصى بها ⭐' },
            { offset: 30, label: 'قبل الفجر بـ ٣٠ د', sub: 'قيام وسحور 🌙' },
            { offset: 60, label: 'قبل الفجر بساعة', sub: 'تهجد واستغفار ✨' }
          ].map((opt) => {
            const isSelected = settings.mode !== 'fixed' && settings.timeOffset === opt.offset;
            return (
              <button
                key={opt.offset}
                type="button"
                onClick={() => setSettings(s => ({ ...s, timeOffset: opt.offset, mode: 'relative' }))}
                className={`p-3.5 rounded-2xl border text-right transition flex flex-col gap-1 active:scale-95 ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 text-white shadow-lg'
                    : 'bg-slate-800/90 border-slate-700/80 hover:border-slate-500 text-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white">{opt.label}</span>
                  {isSelected && <Check size={16} className="text-amber-400" strokeWidth={3} />}
                </div>
                <span className="text-xs text-slate-300 font-bold">{opt.sub}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-300">خيارات أخرى:</span>
          {[10, 20, 45].map((mins) => {
            const isSelected = settings.mode !== 'fixed' && settings.timeOffset === mins;
            return (
              <button
                key={mins}
                type="button"
                onClick={() => setSettings(s => ({ ...s, timeOffset: mins, mode: 'relative' }))}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition active:scale-95 ${
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
            onClick={() => setSettings(s => ({
              ...s,
              mode: s.mode === 'fixed' ? 'relative' : 'fixed',
              customFixedTime: s.customFixedTime || '04:15'
            }))}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 active:scale-95 ${
              settings.mode === 'fixed'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15'
            }`}
          >
            <Clock size={14} />
            <span>وقت يدوي ثابت</span>
          </button>
        </div>

        {settings.mode === 'fixed' && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-amber-400/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <span className="text-xs font-bold text-slate-200">حدد الوقت الثابت للرنين يومياً:</span>
            <input
              type="time"
              value={settings.customFixedTime || '04:15'}
              onChange={(e) => setSettings(s => ({ ...s, customFixedTime: e.target.value }))}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-amber-400 text-amber-300 font-mono font-black text-base outline-none text-center cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Floating / Sticky Bottom Action Bar */}
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-md p-2 rounded-3xl bg-slate-950/95 border border-white/20 shadow-2xl backdrop-blur-xl flex items-center gap-2">
        <button
          type="button"
          onClick={() => { stopAudio(); setShowPreviewModal(true); }}
          className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95 flex-shrink-0"
        >
          <Bell size={16} className="animate-bounce text-amber-300" />
          <span>معاينة حية</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl flex items-center justify-center gap-2 transition active:scale-98"
        >
          <Check size={18} strokeWidth={3} />
          <span>حفظ وتطبيق الإعدادات</span>
        </button>
      </div>

      {/* Alarm Preview Interactive Modal */}
      <FajrAlarmPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        themeId={settings.themeId}
        soundType={settings.soundType}
        customSoundUrl={customInput || settings.customSoundUrl}
        defaultAdminSound={defaultAdminSound}
      />
    </div>
  );
}
