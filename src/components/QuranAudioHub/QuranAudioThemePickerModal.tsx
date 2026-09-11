import React from 'react';
import { Palette, Check, X, Moon, Sun, Sparkles } from 'lucide-react';
import { AUDIO_THEMES, AudioThemeId, QuranAudioThemeService, AudioTheme } from '../../services/quranAudioTheme';
import { hapticSelection, hapticTap } from '../../services/haptics';

interface QuranAudioThemePickerModalProps {
  currentTheme: AudioTheme;
  isOpen: boolean;
  onClose: () => void;
}

export const QuranAudioThemePickerModal: React.FC<QuranAudioThemePickerModalProps> = ({
  currentTheme,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleSelectTheme = (id: AudioThemeId) => {
    hapticSelection();
    QuranAudioThemeService.setTheme(id);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-5 bg-black/75 backdrop-blur-xl animate-in fade-in" dir="rtl">
      <div className="w-full max-w-sm rounded-[2.5rem] bg-slate-900 border border-white/20 text-white shadow-2xl p-6 relative overflow-hidden animate-in zoom-in-95 backdrop-blur-3xl">
        
        {/* Glow */}
        <div className="absolute -top-10 right-0 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 left-0 w-36 h-36 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-white/10 text-emerald-400">
              <Palette size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">ثيمات الاستماع</h3>
              <p className="text-[11px] text-slate-400 font-bold">اختر المظهر والألوان المناسبة لراحتك</p>
            </div>
          </div>
          <button
            onClick={() => {
              hapticTap();
              onClose();
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Themes Grid */}
        <div className="space-y-2.5 relative z-10">
          {(Object.values(AUDIO_THEMES) as AudioTheme[]).map((theme) => {
            const isSelected = currentTheme.id === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => handleSelectTheme(theme.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition active:scale-98 ${
                  isSelected
                    ? 'bg-white/15 border-white/40 shadow-lg text-white font-black'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Theme Color Palette Preview Swatch */}
                  <div
                    className="w-9 h-9 rounded-xl shadow-md border border-white/20 flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: theme.previewBg }}
                  >
                    <div
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: theme.previewAccent }}
                    />
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black">{theme.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 text-slate-400 font-bold flex items-center gap-1">
                        {theme.type === 'dark' ? <Moon size={10} /> : <Sun size={10} />}
                        {theme.type === 'dark' ? 'داكن' : 'فاتح'}
                      </span>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-md">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Done Button */}
        <button
          onClick={() => {
            hapticTap();
            onClose();
          }}
          className="w-full mt-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs shadow-xl active:scale-95 transition"
        >
          حفظ المظهر
        </button>
      </div>
    </div>
  );
};
