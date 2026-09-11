import React, { useEffect, useMemo, useRef, useState } from 'react';

export type MushafAyah = {
  number: number;
  text: string;
  surahNumber?: number;
  globalNumber?: number;
};

export type MushafToken = {
  text: string;
  type: 'word' | 'end';
  ayah: MushafAyah;
};

export type MushafLine = {
  lineNumber: number;
  lineType?: 'ayah' | 'basmallah' | 'surah_name';
  isCentered?: boolean;
  justify?: boolean;
  tokens: MushafToken[];
};

type GroupedAyahTokens = {
  ayah: MushafAyah;
  tokens: MushafToken[];
};

import { SurahHeader } from './SurahHeader';

export type MushafPageProps = {
  lines: MushafLine[];
  bismillah?: string | null;
  surahHeader?: {
    surahName: string;
    surahNumber?: number;
    ayahCount?: number;
    revelationType?: string;
  } | null;
  className?: string;
  onAyahClick?: (ayah: MushafAyah) => void;
  getAyahClassName?: (ayah: MushafAyah) => string;
  getAyahStyle?: (ayah: MushafAyah) => React.CSSProperties | undefined;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const joinClassNames = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');

const groupTokensByAyah = (tokens: MushafToken[]): GroupedAyahTokens[] => {
  const groups: GroupedAyahTokens[] = [];

  for (const token of tokens) {
    const current = groups[groups.length - 1];
    if (
      current &&
      current.ayah.surahNumber === token.ayah.surahNumber &&
      current.ayah.number === token.ayah.number
    ) {
      current.tokens.push(token);
    } else {
      groups.push({
        ayah: token.ayah,
        tokens: [token],
      });
    }
  }

  return groups;
};

const AyahToken = React.memo(({ token, isLast }: { token: MushafToken; isLast: boolean }) => (
  <React.Fragment>
    {token.type === 'end' ? (
      <span data-ayah-marker className="text-[#8a6118] inline-block">
        {token.text}
      </span>
    ) : (
      <span data-ayah-text className="inline-block">{token.text}</span>
    )}
    {!isLast ? ' ' : ''}
  </React.Fragment>
));

AyahToken.displayName = 'AyahToken';

const AyahComponent = React.memo(({ 
  group, 
  measure = false, 
  onAyahClick, 
  getAyahClassName, 
  getAyahStyle 
}: {
  group: GroupedAyahTokens;
  measure?: boolean;
  onAyahClick?: (ayah: MushafAyah) => void;
  getAyahClassName?: (ayah: MushafAyah) => string;
  getAyahStyle?: (ayah: MushafAyah) => React.CSSProperties | undefined;
}) => {
  const ayah = group.ayah;
  const className = useMemo(() => joinClassNames(
    'inline cursor-pointer rounded-md px-[0.08em] py-[0.02em] transition-colors duration-150',
    !measure && 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b78c32]/70 hover:bg-[#ead9b1]/40 active:bg-[#ead9b1]/60',
    !measure && getAyahClassName?.(ayah)
  ), [measure, getAyahClassName, ayah]);

  const style = useMemo(() => (!measure ? getAyahStyle?.(ayah) : undefined), [measure, getAyahStyle, ayah]);

  return (
    <span
      key={`${ayah.surahNumber ?? 0}-${ayah.number}`}
      id={!measure ? `ayah-${ayah.surahNumber ?? 's'}-${ayah.number}` : undefined}
      data-ayah-number={ayah.number}
      data-surah-number={ayah.surahNumber}
      onClick={
        !measure && onAyahClick
          ? (event) => {
              event.stopPropagation();
              onAyahClick(ayah);
            }
          : undefined
      }
      className={className}
      style={style}
      role={!measure && onAyahClick ? 'button' : undefined}
      tabIndex={!measure && onAyahClick ? 0 : undefined}
    >
      {group.tokens.map((token, tokenIndex) => (
        <AyahToken 
          key={`${ayah.surahNumber ?? 0}-${ayah.number}-${token.type}-${tokenIndex}`}
          token={token}
          isLast={tokenIndex === group.tokens.length - 1}
        />
      ))}
    </span>
  );
});

AyahComponent.displayName = 'AyahComponent';

export const MushafPage: React.FC<MushafPageProps> = ({
  lines,
  bismillah,
  surahHeader,
  className = '',
  onAyahClick,
  getAyahClassName,
  getAyahStyle,
}) => {
  const renderLines = useMemo(() => lines.filter((line) => line.tokens.length > 0), [lines]);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const measureRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [lineScales, setLineScales] = useState<number[]>([]);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;

    const updateScales = () => {
      const nextScales = renderLines.map((_, index) => {
        const measureEl = measureRefs.current[index];
        if (!measureEl || !root.clientWidth) return 1;

        const measureWidth = measureEl.scrollWidth || measureEl.getBoundingClientRect().width || 1;
        const availableWidth = root.clientWidth - 6;
        return clamp(availableWidth / measureWidth, 0.68, 1.06);
      });

      setLineScales((current) => {
        if (
          current.length === nextScales.length &&
          current.every((value, index) => Math.abs(value - nextScales[index]) < 0.01)
        ) {
          return current;
        }
        return nextScales;
      });
    };

    const frame = window.requestAnimationFrame(updateScales);
    const observer = new ResizeObserver(updateScales);
    observer.observe(root);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [renderLines]);

  return (
    <section
      dir="rtl"
      aria-label="صفحة المصحف"
      className={joinClassNames(
        'relative w-full overflow-hidden px-1 text-[#24190a] sm:px-2 antialiased subpixel-antialiased leading-[2.5]',
        className
      )}
    >
      {/* Ornate Islamic Surah Header Banner (Medina Mushaf Style) */}
      {surahHeader && (
        <SurahHeader
          surahNumber={surahHeader.surahNumber || 1}
          surahNameArabic={surahHeader.surahName}
          ayahCount={surahHeader.ayahCount}
          revelationPlace={surahHeader.revelationType}
          showBismillah={!bismillah}
          className="mb-2"
        />
      )}

      {bismillah ? (
        <div
          className="mb-4 text-center font-uthmanic text-[clamp(1.85rem,5vw,3rem)] leading-[2.5] text-[var(--quran-text,#24190a)]"
          style={{ fontFamily: '"KFGQPC Uthmanic Script HAFS", "Amiri Quran", "Amiri", serif' }}
        >
          {bismillah}
        </div>
      ) : null}

      <div
        ref={pageRef}
        className="relative flex w-full flex-col gap-2.5 text-[clamp(1.85rem,4.7vw,3.05rem)] [backface-visibility:hidden] [font-feature-settings:'kern'] [font-smooth:always] [-webkit-font-smoothing:antialiased] selection:bg-[#d7b25d]/35 selection:text-[#1f1407] sm:gap-3 leading-[2.5]"
        style={{
          direction: 'rtl',
          fontFamily: '"KFGQPC Uthmanic Script HAFS", "Amiri Quran", "Amiri", serif',
        }}
      >
        {renderLines.map((line, index) => {
          const scale = lineScales[index] || 1;
          const groupedAyahs = groupTokensByAyah(line.tokens);
          const justifyLine = line.justify && !line.isCentered;
          const textAlign = line.isCentered ? 'center' : 'right';
          const textAlignLast = line.isCentered ? 'center' : (justifyLine ? 'justify' : 'right');

          return (
            <div
              key={`mushaf-line-${line.lineNumber}-${index}`}
              className="relative min-h-[1.78em] origin-right"
              style={{
                fontSize: `${scale}em`,
                lineHeight: 2.5,
              }}
            >
              <div
                className="w-full whitespace-nowrap"
                style={{
                  textAlign: justifyLine ? 'justify' : textAlign,
                  textAlignLast,
                }}
              >
                {groupedAyahs.map((group, groupIndex) => (
                  <React.Fragment key={`ayah-group-${group.ayah.surahNumber ?? 0}-${group.ayah.number}-${groupIndex}`}>
                    <AyahComponent 
                        group={group} 
                        onAyahClick={onAyahClick} 
                        getAyahClassName={getAyahClassName} 
                        getAyahStyle={getAyahStyle}
                    />
                    {groupIndex < groupedAyahs.length - 1 ? ' ' : ''}
                  </React.Fragment>
                ))}
              </div>

              <div
                ref={(node) => {
                  measureRefs.current[index] = node;
                }}
                className="pointer-events-none invisible absolute -top-[9999px] right-0 w-auto whitespace-nowrap"
                aria-hidden="true"
                style={{
                  textAlign: justifyLine ? 'justify' : textAlign,
                  textAlignLast,
                }}
              >
                {groupedAyahs.map((group, groupIndex) => (
                  <React.Fragment key={`measure-ayah-group-${group.ayah.surahNumber ?? 0}-${group.ayah.number}-${groupIndex}`}>
                    <AyahComponent 
                        group={group} 
                        measure={true}
                    />
                    {groupIndex < groupedAyahs.length - 1 ? ' ' : ''}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default MushafPage;
