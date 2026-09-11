import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Share2, Copy, Check, Palette, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface AyahCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
  ayahText: string;
  tafsirText?: string;
}

type ThemeKey = 'emerald' | 'navy' | 'cream' | 'dark';

interface ThemeConfig {
  id: ThemeKey;
  name: string;
  bgGradient: string;
  cardBg: string;
  textColor: string;
  accentColor: string;
  subtextColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
}

const THEMES: Record<ThemeKey, ThemeConfig> = {
  emerald: {
    id: 'emerald',
    name: 'زمردي ذهبي',
    bgGradient: 'from-emerald-950 via-teal-950 to-slate-950',
    cardBg: 'linear-gradient(135deg, #064e3b 0%, #042f2e 100%)',
    textColor: '#f8fafc',
    accentColor: '#fbbf24',
    subtextColor: '#99f6e4',
    borderColor: '#059669',
    badgeBg: 'rgba(251, 191, 36, 0.15)',
    badgeText: '#fde68a',
  },
  navy: {
    id: 'navy',
    name: 'كحلي ليلي',
    bgGradient: 'from-slate-950 via-indigo-950 to-blue-950',
    cardBg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    textColor: '#ffffff',
    accentColor: '#60a5fa',
    subtextColor: '#cbd5e1',
    borderColor: '#3b82f6',
    badgeBg: 'rgba(96, 165, 250, 0.15)',
    badgeText: '#bfdbfe',
  },
  cream: {
    id: 'cream',
    name: 'ورقي كلاسيكي',
    bgGradient: 'from-amber-100 via-stone-100 to-amber-50',
    cardBg: 'linear-gradient(135deg, #fef3c7 0%, #fefce8 100%)',
    textColor: '#292524',
    accentColor: '#b45309',
    subtextColor: '#78716c',
    borderColor: '#d97706',
    badgeBg: 'rgba(180, 83, 9, 0.12)',
    badgeText: '#78350f',
  },
  dark: {
    id: 'dark',
    name: 'فخم داكن',
    bgGradient: 'from-zinc-950 via-neutral-950 to-stone-950',
    cardBg: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
    textColor: '#fafafa',
    accentColor: '#e4d4b8',
    subtextColor: '#a1a1aa',
    borderColor: '#52525b',
    badgeBg: 'rgba(228, 212, 184, 0.15)',
    badgeText: '#f4ede4',
  },
};

export const AyahCardModal: React.FC<AyahCardModalProps> = ({
  isOpen,
  onClose,
  surahName,
  ayahNumber,
  ayahText,
  tafsirText,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>('emerald');
  const [showTafsir, setShowTafsir] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const currentTheme = THEMES[selectedTheme];

  const handleCopyText = async () => {
    const textToCopy = `﴿ ${ayahText} ﴾\n[سورة ${surahName} - آية ${ayahNumber}]\n\nعبر تطبيق إفاقة`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      toast.success('تم نسخ نص الآية بنجاح');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('فشل نسخ النص');
    }
  };

  const generateCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const cardEl = cardRef.current;
    if (!cardEl) return null;

    const width = 800;
    const padding = 60;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // We calculate required height dynamically
    ctx.font = 'bold 30px "KFGQPC HAFS Regular", "Amiri Quran", serif';
    const words = ayahText.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > width - padding * 2 && i > 0) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = 54;
    const textBlockHeight = lines.length * lineHeight;
    let extraHeight = 0;
    const tafsirLines: string[] = [];

    if (showTafsir && tafsirText) {
      ctx.font = '20px sans-serif';
      const cleanTafsir = tafsirText.replace(/<[^>]*>/g, '').trim();
      const tWords = cleanTafsir.split(' ');
      let tLine = '';
      for (let i = 0; i < tWords.length; i++) {
        const testTLine = tLine ? `${tLine} ${tWords[i]}` : tWords[i];
        if (ctx.measureText(testTLine).width > width - padding * 2 && i > 0) {
          tafsirLines.push(tLine);
          tLine = tWords[i];
          if (tafsirLines.length >= 4) break; // Limit tafsir length on card
        } else {
          tLine = testTLine;
        }
      }
      if (tLine && tafsirLines.length < 4) tafsirLines.push(tLine);
      extraHeight = tafsirLines.length * 32 + 50;
    }

    const height = Math.max(700, 240 + textBlockHeight + extraHeight);
    canvas.width = width;
    canvas.height = height;

    // Draw Background
    if (selectedTheme === 'emerald') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.6, '#042f2e');
      grad.addColorStop(1, '#021e1d');
      ctx.fillStyle = grad;
    } else if (selectedTheme === 'navy') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.6, '#1e1b4b');
      grad.addColorStop(1, '#0a0f1d');
      ctx.fillStyle = grad;
    } else if (selectedTheme === 'cream') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#fef3c7');
      grad.addColorStop(0.6, '#fffbeb');
      grad.addColorStop(1, '#fefce8');
      ctx.fillStyle = grad;
    } else {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#18181b');
      grad.addColorStop(0.6, '#111113');
      grad.addColorStop(1, '#09090b');
      ctx.fillStyle = grad;
    }
    ctx.fillRect(0, 0, width, height);

    // Draw Ornamental Border
    ctx.strokeStyle = currentTheme.accentColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // Decorative corner marks
    const cornerSize = 16;
    const corners = [
      [36, 36],
      [width - 36, 36],
      [36, height - 36],
      [width - 36, height - 36],
    ];
    ctx.fillStyle = currentTheme.accentColor;
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx - cornerSize / 2, cy - cornerSize / 2, cornerSize, cornerSize);
    });

    // Draw Header: Basmala / Decorative
    ctx.textAlign = 'center';
    ctx.fillStyle = currentTheme.accentColor;
    ctx.font = '24px "Amiri Quran", "KFGQPC HAFS Regular", serif';
    ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', width / 2, 85);

    // Surah badge
    const badgeText = `سورة ${surahName} · الآية ${ayahNumber}`;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = currentTheme.subtextColor;
    ctx.fillText(badgeText, width / 2, 130);

    // Draw Divider Line
    ctx.strokeStyle = currentTheme.borderColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 120, 155);
    ctx.lineTo(width / 2 + 120, 155);
    ctx.stroke();

    // Draw Ayah Text
    ctx.fillStyle = currentTheme.textColor;
    ctx.font = 'bold 30px "KFGQPC HAFS Regular", "Amiri Quran", serif';
    let y = 230;
    lines.forEach((line) => {
      ctx.fillText(line, width / 2, y);
      y += lineHeight;
    });

    // Draw Tafsir if enabled
    if (showTafsir && tafsirLines.length > 0) {
      y += 20;
      ctx.fillStyle = currentTheme.accentColor;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('التفسير الميسر', width / 2, y);
      y += 30;

      ctx.fillStyle = currentTheme.subtextColor;
      ctx.font = '19px sans-serif';
      tafsirLines.forEach((tLine) => {
        ctx.fillText(tLine, width / 2, y);
        y += 30;
      });
    }

    // Draw Footer: App Branding
    ctx.fillStyle = currentTheme.subtextColor;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('تطبيق إفاقة · رفيقك القرآني', width / 2, height - 55);

    return canvas;
  };

  const handleDownloadImage = async () => {
    setIsGenerating(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) throw new Error('Failed to generate image');

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `ayah-${surahName}-${ayahNumber}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('تم تحميل بطاقة الآية كصورة بنجاح');
    } catch {
      toast.error('تعذر تصدير الصورة');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    setIsGenerating(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) throw new Error('Canvas unavailable');

      canvas.toBlob(async (blob) => {
        if (blob && navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'ayah.png', { type: 'image/png' })] })) {
          const file = new File([blob], `ayah-${surahName}-${ayahNumber}.png`, { type: 'image/png' });
          await navigator.share({
            title: `سورة ${surahName} - آية ${ayahNumber}`,
            text: `﴿ ${ayahText} ﴾\n[سورة ${surahName} : آية ${ayahNumber}]`,
            files: [file],
          });
        } else if (navigator.share) {
          await navigator.share({
            title: `سورة ${surahName} - آية ${ayahNumber}`,
            text: `﴿ ${ayahText} ﴾\n[سورة ${surahName} : آية ${ayahNumber}]\n\nعبر تطبيق إفاقة`,
          });
        } else {
          handleCopyText();
        }
      }, 'image/png');
    } catch {
      handleCopyText();
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col max-h-[85vh] w-full max-w-lg rounded-3xl bg-slate-900 border border-white/10 p-5 sm:p-6 shadow-2xl overflow-y-auto scrollbar-hide text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/15 text-amber-400">
              <Sparkles size={20} />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">بطاقة مشاركة الآية</h3>
              <p className="text-xs text-slate-400">سورة {surahName} · الآية {ayahNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Theme Picker */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-2">
            <Palette size={14} className="text-amber-400" />
            <span>اختر نمط البطاقة:</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
              const th = THEMES[key];
              const isSelected = selectedTheme === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedTheme(key)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border text-[11px] font-bold transition active:scale-95 ${
                    isSelected
                      ? 'border-amber-400 bg-white/15 text-white shadow-sm'
                      : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div
                    className="h-4 w-4 rounded-full border border-white/30"
                    style={{ background: th.accentColor }}
                  />
                  <span>{th.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tafsir Toggle if available */}
        {tafsirText && (
          <div className="mb-4 flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/5">
            <span className="text-xs font-bold text-slate-300">تضمين التفسير الميسر في البطاقة</span>
            <input
              type="checkbox"
              checked={showTafsir}
              onChange={(e) => setShowTafsir(e.target.checked)}
              className="h-4 w-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
            />
          </div>
        )}

        {/* Preview Card */}
        <div className="relative my-2 flex justify-center">
          <div
            ref={cardRef}
            className="w-full rounded-2xl p-6 sm:p-7 border transition-all duration-300 shadow-xl flex flex-col items-center text-center relative overflow-hidden"
            style={{
              background: currentTheme.cardBg,
              borderColor: currentTheme.borderColor,
              color: currentTheme.textColor,
            }}
          >
            {/* Ornamental Frame details */}
            <div
              className="absolute inset-2 border border-dashed rounded-xl pointer-events-none opacity-40"
              style={{ borderColor: currentTheme.accentColor }}
            />

            {/* Basmala */}
            <p
              className="font-uthmanic text-sm sm:text-base font-bold mb-2 opacity-90 select-none"
              style={{ color: currentTheme.accentColor }}
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </p>

            {/* Badge */}
            <span
              className="px-3 py-0.5 rounded-full text-xs font-bold mb-4 select-none"
              style={{
                backgroundColor: currentTheme.badgeBg,
                color: currentTheme.badgeText,
              }}
            >
              سورة {surahName} · آية {ayahNumber}
            </span>

            {/* Ayah Text */}
            <p
              className="text-lg sm:text-2xl font-black leading-loose select-none max-w-md my-2"
              style={{
                fontFamily: '"Amiri Quran", "KFGQPC HAFS Regular", serif',
                color: currentTheme.textColor,
              }}
            >
              ﴿ {ayahText} ﴾
            </p>

            {/* Optional Tafsir preview */}
            {showTafsir && tafsirText && (
              <div
                className="mt-3 pt-3 border-t text-xs font-bold leading-relaxed line-clamp-3 select-none opacity-85"
                style={{
                  borderColor: currentTheme.borderColor,
                  color: currentTheme.subtextColor,
                }}
              >
                {tafsirText.replace(/<[^>]*>/g, '')}
              </div>
            )}

            {/* Watermark */}
            <p
              className="mt-5 text-[10px] font-bold opacity-60 tracking-wider select-none"
              style={{ color: currentTheme.subtextColor }}
            >
              تطبيق إفاقة
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-3 gap-2.5 pt-2 border-t border-white/10">
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleDownloadImage}
            className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
          >
            <Download size={16} />
            <span>حفظ كصورة</span>
          </button>

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleShare}
            className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-white/10 text-white font-bold text-xs sm:text-sm hover:bg-white/15 active:scale-95 transition disabled:opacity-50"
          >
            <Share2 size={16} />
            <span>مشاركة</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-white/5 text-slate-300 font-bold text-xs sm:text-sm hover:bg-white/10 active:scale-95 transition"
          >
            {isCopied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            <span>{isCopied ? 'تم النسخ' : 'نسخ النص'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AyahCardModal;
