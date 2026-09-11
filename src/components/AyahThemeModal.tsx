import React, { useEffect, useState } from 'react';
import { X, Info, Download, BookOpen, Loader2, Copy, Share2, ChevronRight, ChevronLeft } from 'lucide-react';
import { QuranOfflineManager } from '../services/quranOfflineManager';
import { quraniApi } from '../services/quraniApi';

interface ThemeDetails {
  title: string;
  color: string;
  relatedTitles?: string[];
}

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
}

const fallbackThemeColor = 'rgba(180, 140, 28, 0.14)';

function sanitizeThemeTitle(value?: string | null): string | null {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (/[ØÙÂ]/.test(text)) return null;
  if (text === 'موضوع عام') return null;
  return text;
}

export const AyahThemeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  surahId,
  ayahId,
  ayahText,
  surahName,
  onGoToDownloads,
  onPrevAyah,
  onNextAyah,
}) => {
  const [theme, setTheme] = useState<ThemeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadingSurah, setDownloadingSurah] = useState(false);
  const [hasNoTheme, setHasNoTheme] = useState(false);

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
  }, [isOpen, surahId, ayahId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    setTheme(null);
    setHasNoTheme(false);

    try {
      const downloaded = await QuranOfflineManager.isFeatureDownloaded(surahId, 'themes');
      setIsDownloaded(downloaded);

      if (downloaded) {
        const offlineAyah = await QuranOfflineManager.getAyahDataOffline(surahId, ayahId);
        const offlineTitle = sanitizeThemeTitle(offlineAyah?.themeTitle);
        if (offlineTitle) {
          setTheme({
            title: offlineTitle,
            color: offlineAyah?.themeColor || fallbackThemeColor,
          });
          setLoading(false);
          return;
        }
      }

      const rankedTopic = await quraniApi.getBestAyahTopic(surahId, ayahId);
      if (rankedTopic.title) {
        setTheme({
          title: rankedTopic.title,
          color: fallbackThemeColor,
          relatedTitles: rankedTopic.related,
        });
        setLoading(false);
        return;
      }

      const liveTheme = await quraniApi.getAyahThemeDetails(surahId, ayahId);
      const liveTitle = sanitizeThemeTitle(liveTheme?.title);
      if (liveTitle) {
        setTheme({
          title: liveTitle,
          color: liveTheme?.color || fallbackThemeColor,
        });
      } else {
        setHasNoTheme(true);
      }
    } catch (e) {
      console.error('Error loading ayah theme:', e);
      setError('تعذر تحميل موضوع الآية الآن.');
    }

    setLoading(false);
  };

  const handleDownloadNow = async () => {
    setDownloadingSurah(true);
    setError('');
    try {
      await QuranOfflineManager.downloadFeatureData(surahId, 'themes');
      setIsDownloaded(true);
      await loadData();
    } catch (e) {
      console.error('Error downloading ayah themes:', e);
      setError('تعذر تحميل موضوعات هذه السورة الآن.');
    } finally {
      setDownloadingSurah(false);
    }
  };

  const shareText = `${surahName || `سورة ${surahId}`} - آية ${ayahId}\n${theme?.title || ''}`.trim();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText || ayahText || '');
  };

  const handleShare = async () => {
    const text = shareText || ayahText || '';
    if (!text) return;
    if (navigator.share) {
      await navigator.share({
        title: `موضوع الآية - ${surahName || `سورة ${surahId}`} - آية ${ayahId}`,
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
            <h2 className="text-lg font-black">موضوع الآية</h2>
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
                <Info size={42} className="text-[var(--quran-muted)]/55" />
                <p className="max-w-xs text-sm font-bold leading-7 text-[var(--quran-text)]/80">{error}</p>
                <button
                  onClick={handleDownloadNow}
                  disabled={downloadingSurah}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--quran-accent)] px-5 py-3 font-black text-[var(--quran-accent-text)] transition active:scale-95 disabled:opacity-60"
                >
                  {downloadingSurah ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  <span>{downloadingSurah ? 'جارٍ التحميل...' : 'تحميل موضوعات هذه السورة'}</span>
                </button>
                <button
                  onClick={() => { onClose(); onGoToDownloads(); }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--quran-muted)]/10 px-5 py-3 font-black text-[var(--quran-text)] transition hover:bg-[var(--quran-muted)]/15"
                >
                  <BookOpen size={18} />
                  <span>إدارة التحميلات</span>
                </button>
              </div>
            ) : hasNoTheme ? (
              <div className="flex min-h-[9rem] flex-col items-center justify-center gap-3 text-center">
                <Info size={34} className="text-[var(--quran-muted)]/45" />
                <p className="text-sm font-bold text-[var(--quran-text)]/75">
                  لا يوجد موضوع محدد لهذه الآية.
                </p>
              </div>
            ) : theme ? (
              <div className="space-y-4 text-right">
                {!isDownloaded && (
                  <div className="rounded-2xl border border-[var(--quran-accent)]/20 bg-[var(--quran-accent)]/10 px-3 py-2 text-xs font-bold leading-6 text-[var(--quran-accent)]">
                    هذا الموضوع معروض الآن من الاتصال المباشر. يمكنك تحميل موضوعات هذه السورة ليعمل بدون إنترنت.
                  </div>
                )}

                <div
                  className="rounded-[1.75rem] border border-[var(--quran-muted)]/10 px-4 py-5"
                  style={{ background: `linear-gradient(135deg, ${theme.color || fallbackThemeColor}, rgba(255,255,255,0.72))` }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-black text-[var(--quran-accent)]">
                      الموضوع
                    </span>
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-white/85 text-[var(--quran-accent)] shadow-sm">
                      <Info size={20} />
                    </span>
                  </div>

                  <p className="text-2xl font-black leading-10 text-[var(--quran-text)]">
                    {theme.title}
                  </p>

                  {(theme.relatedTitles?.length ?? 0) > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {theme.relatedTitles!.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-[var(--quran-text)]/80"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
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
