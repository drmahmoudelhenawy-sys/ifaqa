import React from 'react';

export interface EmbeddedSurahHeaderFrameProps {
  surahNumber?: number;
  surahName?: string;
  className?: string;
}

/**
 * A title-free ornament sized specifically for the surah calligraphy already
 * embedded in the Madinah page SVG, or optionally displaying the official surah
 * calligraphy glyph when surahNumber is provided (e.g. for pages 1 and 2).
 */
export const EmbeddedSurahHeaderFrame: React.FC<EmbeddedSurahHeaderFrameProps> = ({
  surahNumber,
  surahName,
  className = '',
}) => (
  <div
    className={`relative h-full w-full text-[var(--quran-muted)] transition-colors duration-300 ${className}`}
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 1000 200"
      preserveAspectRatio="none"
      fill="none"
      className="absolute inset-0 h-full w-full overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M28 20H972Q984 20 984 32V168Q984 180 972 180H28Q16 180 16 168V32Q16 20 28 20Z"
        stroke="currentColor"
        strokeWidth="2.4"
        opacity=".82"
      />
      <path
        d="M38 30H962Q974 30 974 42V158Q974 170 962 170H38Q26 170 26 158V42Q26 30 38 30Z"
        stroke="currentColor"
        strokeWidth="1.15"
        opacity=".58"
      />

      <g stroke="currentColor" fill="none" opacity=".72">
        <g transform="translate(92 100)">
          <path d="M0-25 25 0 0 25-25 0Z" strokeWidth="1.6" />
          <path d="M0-15 15 0 0 15-15 0Z" strokeWidth="1" />
          <circle r="5" strokeWidth="1" />
          <path d="M42 0H172M67-4l8 4-8 4M145-4l-8 4 8 4" strokeWidth="1.15" />
        </g>
        <g transform="translate(908 100) scale(-1 1)">
          <path d="M0-25 25 0 0 25-25 0Z" strokeWidth="1.6" />
          <path d="M0-15 15 0 0 15-15 0Z" strokeWidth="1" />
          <circle r="5" strokeWidth="1" />
          <path d="M42 0H172M67-4l8 4-8 4M145-4l-8 4 8 4" strokeWidth="1.15" />
        </g>
      </g>

      <g stroke="currentColor" strokeWidth="1.25" opacity=".64">
        <path d="M26 48 54 20M26 62 68 20M26 20l34 34" />
        <path d="M974 48 946 20M974 62 932 20M974 20l-34 34" />
        <path d="M26 152 54 180M26 138 68 180M26 180l34-34" />
        <path d="M974 152 946 180M974 138 932 180M974 180l-34-34" />
      </g>
    </svg>

    {surahNumber && (
      <div className="absolute inset-0 flex items-center justify-center px-12 sm:px-24 pointer-events-none">
        <span
          role="img"
          aria-label={surahName ? `سورة ${surahName}` : `سورة رقم ${surahNumber}`}
          className="block h-[58%] w-[55%] max-w-sm bg-current opacity-95 transition-colors"
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
      </div>
    )}
  </div>
);

export default EmbeddedSurahHeaderFrame;
