import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Volume2, Palette, Check, Play, Square, Sparkles, Sliders, Upload, Music, Bell, Clock } from 'lucide-react';
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultAdminSound?: string;
}

export default function FajrAlarmSettingsModal({ isOpen, onClose, defaultAdminSound }: Props) {
  const [settings, setSettings] = useState<FajrAlarmUserSettings>(loadFajrAlarmSettings);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [customInput, setCustomInput] = useState(settings.customSoundUrl || '');

  useEffect(() => {
    if (isOpen) {
      setSettings(loadFajrAlarmSettings());
    } else {
      stopAudio();
    }
  }, [isOpen]);

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
      const audio = new Audio();
      audio.src = targetUrl;
      audio.preload = 'auto';
      audioRef.current = audio;
      setPlayingId(id);

      audio.onerror = () => {
        if (fallbackUrl && audio.src !== fallbackUrl) {
          console.warn('Audio preview fallback triggered:', fallbackUrl);
          audio.src = fallbackUrl;
          audio.play().catch(() => setPlayingId(null));
        } else {
          setPlayingId(null);
        }
      };

      audio.play().catch((err) => {
        console.warn('Audio play failed:', err);
        if (fallbackUrl && audio.src !== fallbackUrl) {
          audio.src = fallbackUrl;
          audio.play().catch(() => setPlayingId(null));
        } else {
          setPlayingId(null);
        }
      });
      audio.onended = () => setPlayingId(null);
    } catch {
      setPlayingId(null);
    }
  }

  function handleSave() {
    stopAudio();
    const updated: FajrAlarmUserSettings = {
      ...settings,
      customSoundUrl: customInput.trim() || undefined
    };
    saveFajrAlarmSettings(updated);
    onClose();
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        setCustomInput(result);
        setSettings(prev => ({ ...prev, soundType: 'custom', customSoundUrl: result, customSoundName: file.name }));
      }
    };
    reader.readAsDataURL(file);
  }

  if (!isOpen) return null;

  const currentTheme = FAJR_ALARM_THEMES[settings.themeId] || FAJR_ALARM_THEMES.emerald;

  const modalContent = (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-lg" dir="rtl">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-white/20 shadow-2xl overflow-hidden text-white animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/95 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sliders size={20} />
            </span>
            <div>
              <h2 className="text-base font-black text-white">تخصيص منبّه الفجر</h2>
              <p className="text-[11px] font-bold text-slate-300">تحديد الأصوات، الخلفيات، والمظهر</p>
            </div>
          </div>
          <button
            onClick={() => { stopAudio(); onClose(); }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 pb-8">
          
          {/* Section 1: Themes & Colors */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-amber-300">
              <Palette size={16} />
              <span>مظهر شاشة المنبّه (الخلفيات والألوان)</span>
            </div>

            {/* Live Preview Box */}
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${currentTheme.bgGradient} border-2 ${currentTheme.previewBorder} shadow-lg transition-all duration-300`}>
              <div className="flex items-center justify-between text-xs opacity-90 mb-2">
                <span className="font-bold text-white">معاينة شاشة المنبّه الحية</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-black text-white">{currentTheme.name}</span>
              </div>
              <div className="text-center py-2">
                <div className="text-3xl sm:text-4xl font-black tracking-widest font-mono text-white drop-shadow">04:30</div>
                <div className="text-xs font-bold text-white/90 mt-1">حيّ على الصلاة · حيّ على الفلاح</div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 text-[10px] font-black text-amber-300 border border-white/15">
                  غفوة ٥ دقائق
                </div>
              </div>

              <button
                type="button"
                onClick={() => { stopAudio(); setShowPreviewModal(true); }}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-white/20 hover:bg-white/30 border border-white/25 text-xs font-black text-white flex items-center justify-center gap-1.5 transition active:scale-95 shadow backdrop-blur-md"
              >
                <Sparkles size={14} className="text-amber-300" />
                <span>تجربة شاشة المنبّه كاملة مع الصوت الآن</span>
              </button>
            </div>

            {/* Theme Selector Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {(Object.keys(FAJR_ALARM_THEMES) as FajrAlarmThemeId[]).map((themeKey) => {
                const t = FAJR_ALARM_THEMES[themeKey];
                const isSelected = settings.themeId === themeKey;
                return (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, themeId: themeKey }))}
                    className={`relative p-3 rounded-2xl border text-right transition flex flex-col gap-1.5 ${
                      isSelected
                        ? `bg-slate-800 border-amber-400 ring-2 ring-amber-400/40 shadow-lg`
                        : 'bg-slate-800/90 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-5 h-5 rounded-full shadow" style={{ backgroundColor: t.accentColor }} />
                      {isSelected && <Check size={16} className="text-amber-400" />}
                    </div>
                    <div className="text-xs font-black text-white">{t.name}</div>
                    <div className="text-[11px] text-slate-300 font-bold leading-tight">{t.subtitle}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Sound Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-black text-amber-300">
              <Volume2 size={16} />
              <span>صوت ونغمة المنبّه</span>
            </div>

            <div className="space-y-2">
              {SOUND_PRESETS.map((preset) => {
                const isSelected = settings.soundType === preset.id;
                const isPlaying = playingId === preset.id;
                const hasPlayableUrl = preset.id === 'custom' ? !!(customInput || settings.customSoundUrl) : true;

                return (
                  <div
                    key={preset.id}
                    onClick={() => setSettings(s => ({ ...s, soundType: preset.id as FajrAlarmSoundOption }))}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/40 shadow-lg'
                        : 'bg-slate-800/90 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-slate-400 bg-slate-700/60'
                      }`}>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate">{preset.name}</div>
                        <div className="text-[11px] font-bold text-slate-300 truncate">{preset.desc}</div>
                      </div>
                    </div>

                    {hasPlayableUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playPreview(preset.id, (preset as any).url, (preset as any).fallbackUrl);
                        }}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex-shrink-0 active:scale-95"
                        title={isPlaying ? 'إيقاف المعاينة' : 'تشغيل النغمة'}
                      >
                        {isPlaying ? <Square size={14} className="text-red-400 fill-current" /> : <Play size={14} className="fill-current text-amber-300" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom Sound Options if selected */}
            {settings.soundType === 'custom' && (
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-white/10 space-y-3 animate-in fade-in">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Music size={14} className="text-amber-400" />
                  <span>إدخال رابط صوتي مباشر (MP3) أو اختيار ملف:</span>
                </div>
                
                <input
                  type="url"
                  placeholder="https://example.com/sound.mp3"
                  dir="ltr"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-white/10 text-white outline-none focus:border-amber-400"
                />

                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-center text-xs font-bold text-white flex items-center justify-center gap-2 transition">
                    <Upload size={14} />
                    <span>رفع ملف صوتي من الجهاز</span>
                    <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {customInput && (
                    <button
                      type="button"
                      onClick={() => playPreview('custom', customInput)}
                      className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition"
                      title="معاينة الملف"
                    >
                      {playingId === 'custom' ? <Square size={15} /> : <Play size={15} className="fill-current" />}
                    </button>
                  )}
                </div>
                {settings.customSoundName && (
                  <p className="text-[10px] text-amber-300 font-bold truncate">ملف محدد: {settings.customSoundName}</p>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Alarm Timing */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-black text-amber-300">
              <Clock size={16} />
              <span>توقيت رنين المنبّه (متى يرن؟)</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
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
                    className={`p-3 rounded-2xl border text-right transition flex flex-col gap-1 active:scale-95 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/40 text-white shadow-lg'
                        : 'bg-slate-800/90 border-slate-700/80 hover:border-slate-500 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white">{opt.label}</span>
                      {isSelected && <Check size={14} className="text-amber-400" />}
                    </div>
                    <span className="text-[10px] text-slate-300 font-bold">{opt.sub}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-300">خيارات أخرى:</span>
              {[10, 20, 45].map((mins) => {
                const isSelected = settings.mode !== 'fixed' && settings.timeOffset === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, timeOffset: mins, mode: 'relative' }))}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition active:scale-95 ${
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
                className={`px-3 py-1 rounded-xl text-xs font-black transition flex items-center gap-1.5 active:scale-95 ${
                  settings.mode === 'fixed'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15'
                }`}
              >
                <Clock size={13} />
                <span>وقت يدوي ثابت</span>
              </button>
            </div>

            {settings.mode === 'fixed' && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-amber-400/40 flex items-center justify-between gap-3 animate-in fade-in">
                <span className="text-xs font-bold text-slate-200">الوقت الثابت للرنين يومياً:</span>
                <input
                  type="time"
                  value={settings.customFixedTime || '04:15'}
                  onChange={(e) => setSettings(s => ({ ...s, customFixedTime: e.target.value }))}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-400 text-amber-300 font-mono font-black text-sm outline-none text-center"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => { stopAudio(); setShowPreviewModal(true); }}
            className="py-3 px-3.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 flex-shrink-0"
            title="تجربة شاشة المنبّه الحية بالكامل"
          >
            <Bell size={15} className="text-amber-300 animate-bounce" />
            <span>معاينة المنبّه</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg flex items-center justify-center gap-2 transition active:scale-98"
          >
            <Check size={18} strokeWidth={2.5} />
            <span>حفظ إعدادات المنبّه</span>
          </button>
          <button
            type="button"
            onClick={() => { stopAudio(); onClose(); }}
            className="py-3 px-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition"
          >
            إلغاء
          </button>
        </div>

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

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
