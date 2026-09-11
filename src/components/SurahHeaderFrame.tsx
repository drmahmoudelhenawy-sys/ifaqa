import React from 'react';

export interface SurahHeaderFrameProps {
  surahNumber?: number;
  surahName?: string;
  className?: string;
  children?: React.ReactNode;
  showTitle?: boolean;
}

/**
 * Islamic Decorative Outline Frame for Surah Titles (الترويسة الزخرفية المفرغة)
 * Pure stroke vector frame (`fill="none"`, `stroke="currentColor"`)
 * with traditional Islamic geometric motifs, arabesque side medallions, and double border.
 */
export const SurahHeaderFrame: React.FC<SurahHeaderFrameProps> = ({
  surahNumber,
  surahName,
  className = '',
  children,
  showTitle = true,
}) => {
  return (
    <div
      dir="rtl"
      className={`relative flex h-full w-full items-center justify-center bg-transparent select-none text-stone-500/90 transition-colors duration-300 dark:text-stone-400/80 ${className}`}
      style={{ color: 'var(--quran-muted, #78716c)' }}
    >
      {/* Decorative Vector Islamic Frame */}
      <svg
        viewBox="0 0 1000 155"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
        aria-hidden="true"
      >
        {/* Outer Heavy Outline Border */}
        <rect
          x="10"
          y="10"
          width="980"
          height="135"
          rx="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          className="opacity-90"
        />

        {/* Inner Parallel Outline Border */}
        <rect
          x="18"
          y="18"
          width="964"
          height="119"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="opacity-75"
        />

        {/* Dashed Fine Guide Border */}
        <rect
          x="24"
          y="24"
          width="952"
          height="107"
          rx="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeDasharray="6 4"
          className="opacity-45"
        />

        {/* 4 Traditional Islamic Corner Accents */}
        <g transform="translate(20, 20)" stroke="currentColor" strokeWidth="1.4" className="opacity-85">
          <path d="M 0,22 L 22,0 M 0,30 L 30,0 M 0,0 L 25,25" />
          <circle cx="10" cy="10" r="3.5" fill="none" strokeWidth="1" />
        </g>

        <g transform="translate(980, 20) scale(-1, 1)" stroke="currentColor" strokeWidth="1.4" className="opacity-85">
          <path d="M 0,22 L 22,0 M 0,30 L 30,0 M 0,0 L 25,25" />
          <circle cx="10" cy="10" r="3.5" fill="none" strokeWidth="1" />
        </g>

        <g transform="translate(20, 135) scale(1, -1)" stroke="currentColor" strokeWidth="1.4" className="opacity-85">
          <path d="M 0,22 L 22,0 M 0,30 L 30,0 M 0,0 L 25,25" />
          <circle cx="10" cy="10" r="3.5" fill="none" strokeWidth="1" />
        </g>

        <g transform="translate(980, 135) scale(-1, -1)" stroke="currentColor" strokeWidth="1.4" className="opacity-85">
          <path d="M 0,22 L 22,0 M 0,30 L 30,0 M 0,0 L 25,25" />
          <circle cx="10" cy="10" r="3.5" fill="none" strokeWidth="1" />
        </g>

        {/* Right Geometric Rosette & Divider Finial */}
        <g transform="translate(85, 77.5)" stroke="currentColor" fill="none" className="opacity-80">
          <polygon points="0,-22 22,0 0,22 -22,0" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="10" strokeWidth="1.2" />
          <circle cx="0" cy="0" r="4.5" strokeWidth="0.9" />
          <circle cx="0" cy="-14" r="2" fill="currentColor" />
          <circle cx="0" cy="14" r="2" fill="currentColor" />
          <circle cx="-14" cy="0" r="2" fill="currentColor" />
          <circle cx="14" cy="0" r="2" fill="currentColor" />
          <path d="M 50,0 L 150,0" strokeWidth="1.2" />
          <polygon points="150,0 142,-4 142,4" fill="currentColor" />
          <circle cx="100" cy="0" r="3.5" strokeWidth="1" />
        </g>

        {/* Left Geometric Rosette & Divider Finial */}
        <g transform="translate(915, 77.5)" stroke="currentColor" fill="none" className="opacity-80">
          <polygon points="0,-22 22,0 0,22 -22,0" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="10" strokeWidth="1.2" />
          <circle cx="0" cy="0" r="4.5" strokeWidth="0.9" />
          <circle cx="0" cy="-14" r="2" fill="currentColor" />
          <circle cx="0" cy="14" r="2" fill="currentColor" />
          <circle cx="-14" cy="0" r="2" fill="currentColor" />
          <circle cx="14" cy="0" r="2" fill="currentColor" />
          <path d="M -50,0 L -150,0" strokeWidth="1.2" />
          <polygon points="-150,0 -142,-4 -142,4" fill="currentColor" />
          <circle cx="-100" cy="0" r="3.5" strokeWidth="1" />
        </g>
      </svg>

      {/* Center content. Surah names are path-based SVG glyphs, never CSS text. */}
      <div className="relative z-10 flex h-full w-full items-center justify-center px-10 text-center pointer-events-none sm:px-24">
        {children ? (
          children
        ) : showTitle && surahNumber ? (
          <span
            role="img"
            aria-label={surahName ? `سورة ${surahName}` : `سورة رقم ${surahNumber}`}
            className="block h-[68%] max-h-9 w-[64%] max-w-64 bg-current opacity-95 transition-colors"
            style={{
              color: 'var(--quran-text, currentColor)',
              WebkitMaskImage: `url("${import.meta.env.BASE_URL}assets/surah-names/${surahNumber}.svg")`,
              maskImage: `url("${import.meta.env.BASE_URL}assets/surah-names/${surahNumber}.svg")`,
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

export default SurahHeaderFrame;
