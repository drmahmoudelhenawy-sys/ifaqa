import React from 'react';
import { SurahHeaderFrame } from './SurahHeaderFrame';

export interface SurahHeaderProps {
  surahNumber: number;
  surahNameArabic: string;
  revelationPlace?: 'Meccan' | 'Medinan' | 'مكية' | 'مدنية' | string;
  ayahCount?: number;
  showBismillah?: boolean;
  className?: string;
}

const BISMILLAH_TEXT = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

/**
 * Format the Arabic Surah name to always produce the complete formal title "سُورَةُ [الاسم]"
 */
const formatFullSurahTitle = (name: string): string => {
  if (!name) return '';
  let cleaned = name
    .replace(/Ø³ÙˆØ±Ø©/g, 'سورة')
    .replace(/â€¢/g, '')
    .trim();

  if (cleaned.startsWith('سورة ')) {
    cleaned = cleaned.replace('سورة ', '');
  } else if (cleaned.startsWith('سُورَةُ ')) {
    cleaned = cleaned.replace('سُورَةُ ', '');
  }

  return `سُورَةُ ${cleaned}`;
};

/**
 * Outline Quran Surah Header Component (ترويسة السورة الفيكتور المفرغة)
 * Pure stroke-based vector Islamic frame with dynamic theming via `currentColor`
 * and official King Fahd Complex Medina Mushaf Calligraphy ("سُورَةُ [الاسم]").
 */
export const SurahHeader: React.FC<SurahHeaderProps> = ({
  surahNumber,
  surahNameArabic,
  revelationPlace,
  ayahCount,
  showBismillah = true,
  className = '',
}) => {
  const fullTitle = formatFullSurahTitle(surahNameArabic);
  // Surah At-Tawbah (#9) does not start with Basmala
  const shouldRenderBismillah = showBismillah && surahNumber !== 9;

  return (
    <header
      dir="rtl"
      className={`relative w-full max-w-2xl mx-auto my-3 sm:my-4 px-2 select-none text-stone-700 dark:text-stone-300 transition-colors duration-300 ${className}`}
      aria-label={`${fullTitle} - ترويسة السورة`}
    >
      <SurahHeaderFrame className="h-12 sm:h-14" surahNumber={surahNumber} surahName={surahNameArabic} />

      {/* Standard Centered Basmala (when showBismillah is enabled) */}
      {shouldRenderBismillah && (
        <div
          className="mt-4 mb-2 text-center font-uthmanic text-xl sm:text-2xl md:text-3xl leading-[2] text-stone-800 dark:text-stone-100 select-none transition-colors duration-300"
          style={{
            fontFamily: '"Amiri Quran", "KFGQPC Uthmanic Script HAFS", "Amiri", serif',
          }}
          aria-label="بسم الله الرحمن الرحيم"
        >
          {BISMILLAH_TEXT}
        </div>
      )}
    </header>
  );
};

export default SurahHeader;
