import React, { useEffect, useState } from 'react';
import { getReciterPhotoByName, getReciterInitials, getReciterBadgeName } from '../../services/reciterPhotos';
import { reciterImageCache } from '../../services/reciterImageCache';

interface ReciterAvatarProps {
  name: string;
  src?: string;
  size?: number;
  className?: string;
  ring?: boolean;
}

const PHOTO_CACHE_KEY = 'ifaqa_reciter_photo_cache_v2';
const pendingRequests = new Map<string, Promise<string | null>>();

const getLocalCache = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(PHOTO_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
};

const resolveWikipediaPhoto = (name: string): Promise<string | null> => {
  const cache = getLocalCache();
  if (cache[name]) {
    return Promise.resolve(cache[name] === 'none' ? null : cache[name]);
  }

  const existing = pendingRequests.get(name);
  if (existing) return existing;

  const req = fetch(`https://ar.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`)
    .then(async (res) => (res.ok ? res.json() : null))
    .then((data) => {
      const url = data?.thumbnail?.source || data?.originalimage?.source || null;
      const c = getLocalCache();
      c[name] = url || 'none';
      try {
        localStorage.setItem(PHOTO_CACHE_KEY, JSON.stringify(c));
      } catch {}
      return url as string | null;
    })
    .catch(() => null)
    .finally(() => pendingRequests.delete(name));

  pendingRequests.set(name, req);
  return req;
};

/**
 * Authentic Reciter Avatar Component with Graceful Fallback & Islamic Calligraphic Badge
 */
export const ReciterAvatar: React.FC<ReciterAvatarProps> = ({
  name,
  src,
  size = 52,
  className = '',
  ring = true,
}) => {
  const defaultPhoto = src || getReciterPhotoByName(name);
  const [resolvedSrc, setResolvedSrc] = useState<string>(defaultPhoto);
  const [failed, setFailed] = useState<boolean>(!defaultPhoto);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const initialUrl = src || getReciterPhotoByName(name);

    if (initialUrl) {
      setResolvedSrc(initialUrl);
      setFailed(false);
      return;
    }

    // Check IndexedDB / Local persistent cache
    void reciterImageCache.get(name).then((cached) => {
      if (!active) return;
      if (cached) {
        setResolvedSrc(cached);
        setFailed(false);
        return;
      }

      // Wikipedia fallback fetch
      void resolveWikipediaPhoto(name).then((url) => {
        if (!active) return;
        if (url) {
          setResolvedSrc(url);
          setFailed(false);
          void reciterImageCache.remember(name, url);
        } else {
          setFailed(true);
        }
      });
    });

    const handlePhotosUpdated = () => {
      const updated = src || getReciterPhotoByName(name);
      if (updated) {
        setResolvedSrc(updated);
        setFailed(false);
      }
    };
    window.addEventListener('ifaqa_reciter_photos_updated', handlePhotosUpdated);

    return () => {
      active = false;
      window.removeEventListener('ifaqa_reciter_photos_updated', handlePhotosUpdated);
    };
  }, [name, src]);

  const initials = getReciterInitials(name);
  const badgeInfo = getReciterBadgeName(name);

  const isSmall = size < 50;
  const isLarge = size >= 90;

  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full transition-all duration-300 ${
        ring
          ? 'border border-stone-200/90 dark:border-stone-700/90 shadow-sm ring-2 ring-amber-500/15 dark:ring-amber-400/10'
          : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        aspectRatio: '1 / 1',
      }}
      aria-label={`صورة القارئ ${name}`}
    >
      {!failed && resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={name}
          className={`absolute inset-0 h-full w-full rounded-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ objectPosition: '50% 28%' }}
          width={size}
          height={size}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setFailed(true);
            setResolvedSrc('');
          }}
        />
      ) : null}

      {/* Enhanced Islamic Calligraphic Badge Fallback */}
      {(!resolvedSrc || failed || !isLoaded) && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-emerald-950 via-stone-900 to-amber-950 text-amber-100 select-none shadow-inner p-1 overflow-hidden"
          aria-hidden="true"
        >
          {/* Subtle Islamic Geometric Motif Overlay */}
          <svg
            className="absolute inset-0 w-full h-full opacity-15 text-amber-400 pointer-events-none"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <circle cx="50" cy="50" r="42" strokeDasharray="3 3" />
            <polygon points="50,10 90,50 50,90 10,50" />
            <polygon points="50,10 90,50 50,90 10,50" transform="rotate(45 50 50)" />
          </svg>

          {isSmall ? (
            <span
              className="font-bold tracking-wider leading-none text-amber-200 z-10"
              style={{
                fontSize: `${Math.max(11, Math.round(size * 0.38))}px`,
                fontFamily: '"Amiri", "Cairo", serif',
              }}
            >
              {initials}
            </span>
          ) : (
            <div className="flex flex-col items-center justify-center text-center z-10 px-1">
              <span
                className="font-bold leading-tight text-amber-200 line-clamp-1"
                style={{
                  fontSize: `${isLarge ? 17 : Math.max(11, Math.round(size * 0.22))}px`,
                  fontFamily: '"Amiri", "Cairo", serif',
                }}
              >
                {badgeInfo.title}
              </span>
              {badgeInfo.subtitle && (
                <span
                  className="text-[9px] text-amber-400/80 font-medium leading-none mt-0.5 line-clamp-1"
                  style={{
                    fontSize: `${isLarge ? 12 : Math.max(9, Math.round(size * 0.16))}px`,
                  }}
                >
                  {badgeInfo.subtitle}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReciterAvatar;
