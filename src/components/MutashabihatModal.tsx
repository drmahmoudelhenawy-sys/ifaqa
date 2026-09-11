import React, { useEffect, useMemo, useState } from 'react';
import { X, Layers, Download, BookOpen, Loader2, Copy, Share2, ChevronRight, ChevronLeft } from 'lucide-react';
import { QuranOfflineManager, Mutashabih } from '../services/quranOfflineManager';
import { AdvancedMutashabih, findAdvancedMutashabihat } from '../services/mutashabihatEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  surahId: number;
  ayahId: number;
  ayahText?: string;
  surahName?: string;
  onGoToDownloads: () => void;
  onPrevAyah?: () => void;
  onNextAyah?: () => void;
  onNavigateToAyah?: (surahId: number, ayahId: number, pageNumber: number) => void;
}

export const MutashabihatModal: React.FC<Props> = ({
  isOpen,
  onClose,
  surahId,
  ayahId,
  ayahText,
  surahName,
  onGoToDownloads,
  onPrevAyah,
  onNextAyah,
  onNavigateToAyah,
}) => {
  const [items, setItems] = useState<AdvancedMutashabih[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emptyState, setEmptyState] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadingSurah, setDownloadingSurah] = useState(false);

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
  }, [isOpen, surahId, ayahId]);

  const combinedText = useMemo(
    () =>
      items
        .map((item) => `${item.surahName} - آية ${item.ayahNumber}\n${item.text}`)
        .join('\n\n'),
    [items]
  );

  const loadData = async () => {
    setLoading(true);
    setError('');
    setEmptyState(false);
    setItems([]);

    try {
      const downloaded = await QuranOfflineManager.isFeatureDownloaded(surahId, 'mutashabihat');
      setIsDownloaded(downloaded);

      let curatedItems: Mutashabih[] = [];
      if (navigator.onLine) {
        try {
          curatedItems = await QuranOfflineManager.getFilteredMutashabihatForAyah(surahId, ayahId);
        } catch {}
      }
      if (downloaded) {
        const offlineAyah = await QuranOfflineManager.getAyahDataOffline(surahId, ayahId);
        if ((offlineAyah?.mutashabihat?.length ?? 0) > 0) {
          curatedItems = [...curatedItems, ...(offlineAyah?.mutashabihat || [])];
        }
      }
      const advancedItems = await findAdvancedMutashabihat(surahId, ayahId, curatedItems);
      if (advancedItems.length > 0) setItems(advancedItems);
      else setEmptyState(true);
    } catch (e) {
      console.error('Error loading mutashabihat:', e);
      setError('تعذر تحميل المتشابهات اللفظية الآن.');
    }

    setLoading(false);
  };

  const handleDownloadNow = async () => {
    setDownloadingSurah(true);
    setError('');
    try {
      await QuranOfflineManager.downloadFeatureData(surahId, 'mutashabihat');
      setIsDownloaded(true);
      await loadData();
    } catch (e) {
      console.error('Error downloading mutashabihat feature:', e);
      setError('تعذر تحميل بيانات هذه السورة الآن.');
    } finally {
      setDownloadingSurah(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(combinedText || ayahText || '');
  };

  const handleShare = async () => {
    const text = combinedText || ayahText || '';
    if (!text) return;
    if (navigator.share) {
      await navigator.share({
        title: `المتشابهات اللفظية - ${surahName || `سورة ${surahId}`} - آية ${ayahId}`,
        text,
      });
      return;
    }
    await navigator.clipboard.writeText(text);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[700] bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        className="fixed inset-x-3 bottom-3 z-[710] mx-auto max-w-md overflow-hidden rounded-[2rem] border border-[var(--quran-muted)]/20 bg-[var(--quran-panel)] text-[var(--quran-text)] shadow-2xl md:bottom-auto md:top-1/2 md:max-h-[76vh] md:-translate-y-1/2"
        dir="rtl"
      >
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-16 rounded-full bg-[var(--quran-muted)]/35" />
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-full bg-[var(--quran-muted)]/10 p-2 text-[var(--quran-muted)] transition hover:bg-[var(--quran-muted)]/20 hover:text-[var(--quran-text)]"
          >
            <X size={20} />
          </button>

          <div className="text-right">
            <h2 className="text-lg font-black">المتشابهات اللفظية</h2>
            <p className="text-[11px] font-bold text-[var(--quran-muted)]">
              {surahName || `سورة ${surahId}`} · آية {ayahId}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="rounded-xl border border-[var(--quran-accent)]/25 bg-[var(--quran-base)] p-2 text-[var(--quran-accent)] transition hover:bg-[var(--quran-muted)]/8"
            >
              <Copy size={18} />
            </button>
            <button
              onClick={handleShare}
              className="rounded-xl border border-[var(--quran-accent)]/25 bg-[var(--quran-base)] p-2 text-[var(--quran-accent)] transition hover:bg-[var(--quran-muted)]/8"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {ayahText && (
          <div className="px-4 pb-3">
            <div className="rounded-2xl border border-[var(--quran-muted)]/12 bg-[var(--quran-base)] px-4 py-3 text-right text-base font-bold leading-8 text-[var(--quran-text)]">
              {ayahText}
            </div>
          </div>
        )}

        <div className="px-4 pb-4">
          <div className="rounded-[1.5rem] border border-[var(--quran-muted)]/12 bg-[var(--quran-base)] p-4">
            {loading ? (
              <div className="flex h-44 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-[var(--quran-accent)]" />
              </div>
            ) : error ? (
              <div className="flex min-h-[13rem] flex-col items-center justify-center gap-4 text-center">
                <Layers size={42} className="text-[var(--quran-muted)]/55" />
                <p className="max-w-xs text-sm font-bold leading-7 text-[var(--quran-text)]/80">{error}</p>
                <button
                  onClick={handleDownloadNow}
                  disabled={downloadingSurah}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--quran-accent)] px-5 py-3 font-black text-[var(--quran-accent-text)] transition active:scale-95 disabled:opacity-60"
                >
                  {downloadingSurah ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  <span>{downloadingSurah ? 'جارٍ التحميل...' : 'تحميل متشابهات هذه السورة'}</span>
                </button>
                <button
                  onClick={() => { onClose(); onGoToDownloads(); }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--quran-muted)]/10 px-5 py-3 font-black text-[var(--quran-text)] transition hover:bg-[var(--quran-muted)]/15"
                >
                  <BookOpen size={18} />
                  <span>إدارة التحميلات</span>
                </button>
              </div>
            ) : emptyState ? (
              <div className="flex min-h-[13rem] flex-col items-center justify-center gap-4 text-center">
                <Layers size={42} className="text-[var(--quran-muted)]/55" />
                <p className="max-w-xs text-sm font-bold leading-7 text-[var(--quran-text)]/80">
                  لم يجد المحرك تشابهًا لفظيًا قويًا لهذه الآية.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-right">
                {!isDownloaded && (
                  <div className="rounded-2xl border border-[var(--quran-accent)]/20 bg-[var(--quran-accent)]/10 px-3 py-2 text-xs font-bold leading-6 text-[var(--quran-accent)]">
                    هذه النتائج معروضة الآن من الاتصال المباشر. يمكنك تحميلها لهذه السورة لتعمل بدون إنترنت.
                  </div>
                )}

                <div className="max-h-[38vh] space-y-3 overflow-y-auto pr-1 md:max-h-[32vh]">
                  {items.map((item, index) => (
                    <button
                      key={`${item.surahName}-${item.ayahNumber}-${index}`}
                      type="button"
                      onClick={() => onNavigateToAyah?.(item.surahId, item.ayahNumber, item.pageNumber)}
                      className="w-full rounded-2xl border border-[var(--quran-muted)]/12 bg-[var(--quran-panel-strong)] px-4 py-3 text-right transition active:scale-[.99]"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-black text-[var(--quran-accent)]">
                          سورة {item.surahName.replace('سورة ', '')} · آية {item.ayahNumber} · صفحة {item.pageNumber}
                        </p>
                        <span className="shrink-0 rounded-full bg-[var(--quran-muted)]/10 px-2 py-1 text-[9px] font-black text-[var(--quran-muted)]">
                          {item.source === 'curated' ? 'مصدر موثق' : `تشابه ${Math.round(item.score * 100)}٪`}
                        </span>
                      </div>
                      <div className="mb-2 rounded-xl bg-[var(--quran-base)]/70 px-3 py-2 font-quran text-sm leading-7">
                        {item.sourceDiff.map((token, tokenIndex) => (
                          <span key={`source-${tokenIndex}`} className={token.kind === 'different' ? 'font-black text-emerald-600 dark:text-emerald-400' : 'text-[var(--quran-muted)]'}>
                            {token.text}{' '}
                          </span>
                        ))}
                      </div>
                      <p className="font-quran text-sm font-bold leading-7 text-[var(--quran-text)]">
                        {item.targetDiff.map((token, tokenIndex) => (
                          <span key={`target-${tokenIndex}`} className={token.kind === 'different' ? 'font-black text-amber-600 dark:text-amber-400' : ''}>
                            {token.text}{' '}
                          </span>
                        ))}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--quran-muted)]/10 bg-[var(--quran-panel-strong)] px-4 py-4 text-[var(--quran-text)]">
          <button
            onClick={onPrevAyah}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--quran-muted)]/10 text-[var(--quran-muted)] transition hover:bg-[var(--quran-muted)]/18 disabled:opacity-40"
            disabled={!onPrevAyah}
          >
            <ChevronRight size={20} />
          </button>

          <div className="rounded-full border border-[var(--quran-accent)]/25 px-8 py-3 text-sm font-black">
            {surahName || `سورة ${surahId}`} {ayahId}
          </div>

          <button
            onClick={onNextAyah}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--quran-accent)] text-[var(--quran-accent-text)] transition hover:brightness-95 disabled:opacity-40"
            disabled={!onNextAyah}
          >
            <ChevronLeft size={20} />
          </button>
        </div>
      </div>
    </>
  );
};
