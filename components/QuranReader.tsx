import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Menu,
  Headphones,
  Highlighter,
  Languages,
  LayoutGrid,
  Loader2,
  Palette,
  Home,
  Pause,
  Play,
  PlayCircle,
  Repeat,
  Search,
  Share2,
  Settings,
  SlidersHorizontal,
  Save,
  Target,
  Trash2,
  Type,
  Volume2,
  X,
  Library,
  Sparkles,
  Layers,
  Info,
  HardDrive,
  Eye,
  EyeOff,
  Gauge,
  HelpCircle,
  MapPin,
  Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { quranJuz, quranSurahHeaderPositions, quranSurahs } from '../quranMetadata';
import { getStaticPageMetadata } from '../quranPageMetadata';
import { SurahHeader } from '../src/components/SurahHeader';
import { SurahHeaderFrame } from '../src/components/SurahHeaderFrame';
import { EmbeddedSurahHeaderFrame } from '../src/components/EmbeddedSurahHeaderFrame';
import { getKhatmas, Khatma, updateKhatmaProgress } from '../src/services/khatmaService';
import { storageService } from '../src/services/storageService';
import {
  checkBundleStatus,
  downloadQuran,
  downloadTafsir
} from '../src/services/offlineBundle';
import {
  downloadQuranMushafOffline,
  downloadTafseerOffline,
  getCachedMuyassarAyah,
  getOfflineStatus,
  OfflinePackKey,
  OfflineStatusMap
} from '../services/offlineCache';
import { downloadAudioForOffline, getAudioUrl } from '../src/services/audioCache';
import {
  getSurahAyahCount,
  QuranAyah,
  searchQuran,
  SurahMetadata
} from '../types';
import { QuranOfflineManager, QURAN_API_BASE, DEFAULT_RECITER_ID } from '../src/services/quranOfflineManager';
import CreateKhatmaModal from '../src/components/CreateKhatmaModal';
import { IraabModal } from '../src/components/IraabModal';
import { MaaniModal } from '../src/components/MaaniModal';
import { MutashabihatModal } from '../src/components/MutashabihatModal';
import { AyahThemeModal } from '../src/components/AyahThemeModal';
import { TafsirReader } from '../src/components/TafsirReader';
import { DownloadsManager } from '../src/components/DownloadsManager';
import { AyahToolbar } from '../src/components/AyahToolbar';
import { QuranSearchModal } from '../src/components/QuranSearchModal';
import { MushafPage, MushafAyah, MushafLine, MushafToken } from '../src/components/MushafPage';
import { quraniApi } from '../src/services/quraniApi';
import { hapticPageTurn, hapticSelection, hapticTap, hapticSuccess } from '../src/services/haptics';
import { AyahGroupPickerModal } from '../src/components/AyahGroupPickerModal';
import { WirdEvaluationModal, WirdEvaluation } from '../src/components/WirdEvaluationModal';
import { Award } from 'lucide-react';
import { nativeQuranAudio, shouldUseNativeQuranAudio } from '../src/services/nativeQuranAudio';
import { HubReciter, QuranAudioHubService } from '../src/services/quranAudioHubService';
import { AyahCardModal } from '../src/components/AyahCardModal';
import { StopMarksGuideModal } from '../src/components/StopMarksGuideModal';
import { auth } from '../services/firebase';
import { saveLastReadPosition, syncAwradToCloud, syncBookmarksToCloud } from '../src/services/userCloudSyncService';
import { clanService } from '../src/services/clanService';


interface QuranReaderProps {
  onBack?: () => void;
  mode?: 'reading' | 'memorization' | 'review' | 'new_hifz' | 'near_review' | 'far_review' | 'casual' | string;
  params?: {
    page?: number;
    surah?: number;
    ayah?: number;
    mode?: string;
    planId?: string;
  } | null;
  user?: unknown;
  onOpenSurah?: (surah: number, ayah?: number) => void;
  updateStats?: (amount: number, label?: string, category?: any) => void | Promise<void>;
}

interface QuranMetadata {
  surahName: string;
  surahNumber: number;
  juzNumber: number;
  hizbNumber: number;
  hizbQuarter: number;
}

interface ApiAyah {
  number?: number;
  text?: string;
  juz?: number;
  page?: number;
  hizbQuarter?: number;
  numberInSurah?: number;
  surah?: {
    number?: number;
    name?: string;
    englishName?: string;
  };
  words?: Array<{
    text?: string;
    char_type_name?: string;
    position?: number;
    line_number?: number;
    verse_key?: string;
    location?: string;
    page_number?: number;
  }>;
}

interface MushafSurahSection {
  surahNumber: number;
  surahName: string;
  lines?: MushafLine[];
  ayahs?: MushafAyah[];
  showHeader: boolean;
  bismillah?: string | null;
}

interface MushafLayoutLineMeta {
  lineNumber: number;
  lineType: 'ayah' | 'basmallah' | 'surah_name';
  isCentered: boolean;
  surahNumber: number | null;
}

interface SurahItem {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
  firstPage?: number;
  revelationType?: 'Meccan' | 'Medinan';
}

interface JuzItem {
  number: number;
  firstSurahNumber: number;
  firstAyahNumber: number;
  lastSurahNumber: number;
  lastAyahNumber: number;
}

interface SajdaItem {
  number: number;
  surah: number;
  ayah: number;
  type: 'obligatory' | 'recommended';
}

interface AyahCoordinate {
  page: number;
  surahNumber: number;
  ayahNumber: number;
  rectangles: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

interface HafsAyahPolygon {
  ayahNumber: number;
  surahNumber: number;
  x?: number;
  y?: number;
  polygon: string;
}

type ThemeName = 'white' | 'classic' | 'dark' | 'green' | 'blue' | 'warm';
type HighlightColor = 'transparent' | 'yellow' | 'blue' | 'green' | 'brown';

interface UserAyahData {
  color: HighlightColor | '';
  note: string;
  isBookmarked: boolean;
  timestamp: number;
}

type UserQuranData = Record<string, UserAyahData>;
type PageUserData = Record<string, Record<string, UserAyahData>>;

type WirdKind = 'reading' | 'hifz' | 'near_review' | 'far_review';
type QuranWird = {
  id: WirdKind;
  title: string;
  startPage: number;
  currentPage: number;
  updatedAt?: string;
};

type QuranGroup = {
  id: string;
  name: string;
  items: string[];
};

interface TafseerSource {
  id: number;
  name?: string;
  language?: string;
  author?: string;
  book_name?: string;
}

interface TafseerState {
  ayahText: string;
  tafseerText: string;
  error: string;
}

interface ActiveClanJuzSession {
  clanId: string;
  juzNumber: number;
  name: string;
  startPage: number;
  endPage: number;
  totalPages: number;
}

const ACTIVE_CLAN_JUZ_KEY = 'ifaqa_active_clan_juz';
const TOTAL_PAGES = 604;
const QURAN_PAGE_XP = 10;
const READING_TRACKER_KEY = 'quranDailyPagesRead';
const READ_PAGE_KEYS_KEY = 'quranDailyReadPages';
const LAST_READ_PAGE_KEY = 'quranLastReadPage';
const TOTAL_KHATMA_PROGRESS_KEY = 'quranTotalKhatmaProgress';
const QURAN_DAILY_XP_KEY = 'quranDailyXp';
const QURAN_TOTAL_XP_KEY = 'quranTotalXp';
const QURAN_XP_PAGE_KEYS_KEY = 'quranDailyXpPages';
const QURAN_SHOW_PAGE_XP_TOAST_KEY = 'quranShowPageXpToast';
const QURAN_PLANS_KEY = 'quranMultiPlans';
const QURAN_AWRAD_KEY = 'quranAwrad';
const USER_QURAN_DATA_KEY = 'userQuranData';
const PAGE_USER_DATA_KEY = 'userData';
const BOOKMARKS_KEY = 'quranPageBookmarks';
const QURAN_REFERENCE_GROUPS_KEY = 'quranReferenceGroups';
const QURAN_HIGHLIGHT_GROUPS_KEY = 'quranHighlightGroups';
const QURAN_SAVE_DESTINATION_MODE_KEY = 'quranSaveDestinationMode';
const PREFERRED_TAFSEER_KEY = 'preferredTafseerId';
const DEFAULT_TAFSEER_ID = 1;
const JUZ_NAMES = [
  '',
  'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس',
  'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
  'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر',
  'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون',
  'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون',
  'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون'
];
const TAFSEER_API_BASE = 'https://api.quran-tafseer.com';
const TAFSEER_FETCH_TIMEOUT_MS = 5000;
const DEFAULT_HAFS_VIEWBOX = '0 0 235 235';
const ayahCountsBySurah = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98,
  135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11,
  11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25,
  22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6,
  3, 5, 4, 5, 6
];

const themeOptions: Array<{ id: ThemeName; label: string; swatch: string }> = [
  { id: 'white', label: 'أبيض', swatch: '#ffffff' },
  { id: 'classic', label: 'سكري', swatch: '#f7edd7' },
  { id: 'dark', label: 'أسود', swatch: '#242321' },
  { id: 'green', label: 'أخضر', swatch: '#dbe8cd' },
  { id: 'blue', label: 'أزرق', swatch: '#d7ecf4' },
  { id: 'warm', label: 'دافئ', swatch: '#e3b27f' }
];

interface ReaderReciter {
  id: string;
  quranComId?: number;
  name: string;
  hubReciter?: HubReciter;
}

const RECITERS: ReaderReciter[] = [
  { id: 'ar.alafasy', quranComId: 7, name: 'مشاري راشد العفاسي' },
  { id: 'ar.abdulbasitmurattal', quranComId: 2, name: 'عبد الباسط عبد الصمد (مرتل)' },
  { id: 'ar.abdulbasitmujawwad', quranComId: 1, name: 'عبد الباسط عبد الصمد (مجود)' },
  { id: 'ar.husary', quranComId: 5, name: 'محمود خليل الحصري' },
  { id: 'ar.husarymujawwad', quranComId: 4, name: 'محمود خليل الحصري (مجود)' },
  { id: 'ar.minshawi', quranComId: 6, name: 'محمد صديق المنشاوي' },
  { id: 'ar.minshawimujawwad', quranComId: 112, name: 'محمد صديق المنشاوي (مجود)' },
  { id: 'ar.mahermuaiqly', quranComId: 8, name: 'ماهر المعيقلي' },
  { id: 'ar.saoodshuraym', quranComId: 10, name: 'سعود الشريم' },
  { id: 'ar.abdullahbasfar', quranComId: 11, name: 'عبدالله بصفر' },
  { id: 'ar.ahmedajamy', quranComId: 12, name: 'أحمد العجمي' },
  { id: 'ar.hudaifi', quranComId: 3, name: 'علي الحذيفي' },
  { id: 'ar.khaleeluhayary', quranComId: 161, name: 'خليل الحصري' },
  { id: 'ar.nasser_alqatami', quranComId: 13, name: 'ناصر القطامي' },
  { id: 'ar.yasser_aldossary', quranComId: 14, name: 'ياسر الدوسري' },
  { id: 'ar.fares_abbad', quranComId: 15, name: 'فارس عباد' },
  { id: 'ar.idrees_abkar', quranComId: 16, name: 'إدريس أبكر' },
  { id: 'ar.mishary_al_afasy_2', quranComId: 17, name: 'مشاري العفاسي (نسخة 2)' },
  { id: 'ar.abdur_rashid_sufi', quranComId: 18, name: 'عبدالرشيد صوفي' },
  { id: 'ar.m_ayyoub', quranComId: 19, name: 'محمد أيوب' },
];

const FALLBACK_TAFSEER_LIST: TafseerSource[] = [
  { id: 1, name: 'التفسير الميسر' },
  { id: 2, name: 'تفسير الجلالين' },
  { id: 3, name: 'تفسير السعدي' },
  { id: 4, name: 'تفسير ابن كثير' },
  { id: 5, name: 'تفسير الطبري' },
  { id: 6, name: 'تفسير القرطبي' },
  { id: 7, name: 'تفسير البغوي' },
  { id: 8, name: 'أيسر التفاسير' }
];

const defaultAwrad: QuranWird[] = [
  { id: 'reading', title: 'ورد القراءة والتلاوة', startPage: 1, currentPage: 1 },
  { id: 'hifz', title: 'ورد الحفظ والتدبر', startPage: 1, currentPage: 1 },
  { id: 'near_review', title: 'ورد المراجعة القريبة', startPage: 1, currentPage: 1 },
  { id: 'far_review', title: 'ورد المراجعة البعيدة', startPage: 1, currentPage: 1 }
];

const defaultQuranGroups: QuranGroup[] = [
  { id: 'general', name: 'العام', items: [] }
];

const fetchWithTimeout = async (url: string, timeoutMs = TAFSEER_FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const themeStyles: Record<ThemeName, {
  base: string;
  text: string;
  muted: string;
  panel: string;
  panelStrong: string;
  accent: string;
  accentRgb: string;
  accentText: string;
  imageFilter: React.CSSProperties;
}> = {
  white: {
    base: '#f8f7f2',
    text: '#20251f',
    muted: '#6f756c',
    panel: 'rgba(255, 255, 252, 0.82)',
    panelStrong: 'rgba(255, 255, 252, 0.96)',
    accent: '#8a6815',
    accentRgb: '138, 104, 21',
    accentText: '#ffffff',
    imageFilter: {}
  },
  classic: {
    base: '#f2e8d2',
    text: '#3f301e',
    muted: '#7c6849',
    panel: 'rgba(252, 247, 234, 0.84)',
    panelStrong: 'rgba(252, 247, 234, 0.97)',
    accent: '#8e6b20',
    accentRgb: '142, 107, 32',
    accentText: '#fff8df',
    imageFilter: {}
  },
  dark: {
    base: '#090c0b',
    text: '#f0d88f',
    muted: '#aaa387',
    panel: 'rgba(22, 27, 24, 0.82)',
    panelStrong: 'rgba(19, 24, 21, 0.97)',
    accent: '#d7b75b',
    accentRgb: '215, 183, 91',
    accentText: '#15130d',
    imageFilter: { filter: 'invert(1) hue-rotate(180deg)' }
  },
  green: {
    base: '#e7efe2',
    text: '#26392a',
    muted: '#607561',
    panel: 'rgba(245, 250, 241, 0.84)',
    panelStrong: 'rgba(245, 250, 241, 0.97)',
    accent: '#477654',
    accentRgb: '71, 118, 84',
    accentText: '#f7fff3',
    imageFilter: { filter: 'sepia(0.5) hue-rotate(70deg)' }
  },
  blue: {
    base: '#e8f1f4',
    text: '#203b49',
    muted: '#607c89',
    panel: 'rgba(244, 250, 252, 0.84)',
    panelStrong: 'rgba(244, 250, 252, 0.97)',
    accent: '#3e758d',
    accentRgb: '62, 117, 141',
    accentText: '#f5fcff',
    imageFilter: { filter: 'sepia(0.2) hue-rotate(155deg) saturate(1.1)' }
  },
  warm: {
    base: '#f1ddc8',
    text: '#49301f',
    muted: '#876a4e',
    panel: 'rgba(253, 243, 231, 0.84)',
    panelStrong: 'rgba(253, 243, 231, 0.97)',
    accent: '#a96835',
    accentRgb: '169, 104, 53',
    accentText: '#fff7ed',
    imageFilter: { filter: 'sepia(0.3)' }
  }
};

// Temporary production-shaped sample database. Coordinates are page-image percentages.
const sampleCoordinates: AyahCoordinate[] = [
  { page: 1, surahNumber: 1, ayahNumber: 1, rectangles: [{ x: 24, y: 27.9, width: 52, height: 3.9 }] },
  { page: 1, surahNumber: 1, ayahNumber: 2, rectangles: [{ x: 20, y: 35.1, width: 60, height: 3.9 }] },
  { page: 1, surahNumber: 1, ayahNumber: 3, rectangles: [{ x: 23, y: 42.1, width: 54, height: 3.9 }] },
  { page: 1, surahNumber: 1, ayahNumber: 4, rectangles: [{ x: 29, y: 49, width: 42, height: 3.9 }] },
  { page: 1, surahNumber: 1, ayahNumber: 5, rectangles: [{ x: 20, y: 55.9, width: 60, height: 3.9 }] },
  { page: 1, surahNumber: 1, ayahNumber: 6, rectangles: [{ x: 22, y: 63, width: 56, height: 3.9 }] },
  { page: 1, surahNumber: 1, ayahNumber: 7, rectangles: [{ x: 13.5, y: 69.8, width: 73, height: 8.1 }] },
  { page: 2, surahNumber: 2, ayahNumber: 1, rectangles: [{ x: 11, y: 21.7, width: 78, height: 4.1 }] },
  { page: 2, surahNumber: 2, ayahNumber: 2, rectangles: [{ x: 11, y: 29, width: 78, height: 4.1 }] },
  { page: 2, surahNumber: 2, ayahNumber: 3, rectangles: [{ x: 11, y: 36.3, width: 78, height: 4.1 }] },
  { page: 2, surahNumber: 2, ayahNumber: 4, rectangles: [{ x: 11, y: 43.6, width: 78, height: 4.1 }] },
  { page: 2, surahNumber: 2, ayahNumber: 5, rectangles: [{ x: 11, y: 50.9, width: 78, height: 4.1 }] }
];

const highlightStyles: Record<HighlightColor, { bg: string; text: string; swatch: string }> = {
  transparent: { bg: 'transparent', text: 'text-slate-500', swatch: 'transparent' },
  yellow: { bg: 'rgba(254, 240, 138, 0.35)', text: 'text-yellow-700', swatch: '#fef08a' },
  blue: { bg: 'rgba(191, 219, 254, 0.35)', text: 'text-blue-700', swatch: '#bfdbfe' },
  green: { bg: 'rgba(187, 247, 208, 0.35)', text: 'text-green-700', swatch: '#bbf7d0' },
  brown: { bg: 'rgba(254, 215, 170, 0.35)', text: 'text-[#7a4b21]', swatch: '#fed7aa' }
};

const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function toArabicNumber(value: number | string) {
  return String(value).replace(/[0-9]/g, (digit) => arabicDigits[Number(digit)]);
}

function clampPage(page: number) {
  return Math.min(TOTAL_PAGES, Math.max(1, page));
}

function formatPageFile(page: number) {
  return String(page).padStart(3, '0');
}

function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

function getGlobalAyahId(surah: number, ayah: number) {
  const previousAyahs = ayahCountsBySurah
    .slice(0, Math.max(0, surah - 1))
    .reduce((sum, count) => sum + count, 0);
  return previousAyahs + ayah;
}

function buildAyahTextFromWords(ayah: ApiAyah | null | undefined) {
  if (!ayah) return '';
  const wordText = (ayah.words || [])
    .filter((word) => word.text && word.char_type_name !== 'end')
    .map((word) => word.text?.replace(/^\uFEFF/, '') || '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return wordText || ayah.text || '';
}

function polygonToPath(points: string) {
  const trimmed = points.trim();
  if (/^[MLCQAZHVST]/i.test(trimmed)) return trimmed;

  const pairs = trimmed.split(/\s+/).filter(Boolean);
  if (!pairs.length) return '';
  return pairs
    .map((pair, index) => {
      const [x, y] = pair.split(',').map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return '';
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .filter(Boolean)
    .join(' ')
    .concat(' Z');
}

function scalePathData(points: string, scaleX: number, scaleY: number) {
  const path = polygonToPath(points);
  const tokens = path.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  let command = '';
  let coordIndex = 0;

  return tokens.map((token) => {
    if (/^[a-zA-Z]$/.test(token)) {
      command = token.toUpperCase();
      coordIndex = 0;
      return token;
    }

    const value = Number(token);
    if (!Number.isFinite(value)) return token;

    if (command === 'H') return Number((value * scaleX).toFixed(3));
    if (command === 'V') return Number((value * scaleY).toFixed(3));

    const scaled = coordIndex % 2 === 0 ? value * scaleX : value * scaleY;
    coordIndex += 1;
    return Number(scaled.toFixed(3));
  }).join(' ');
}

function getPathCoordinateBounds(points: string) {
  const path = polygonToPath(points);
  const tokens = path.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  const xValues: number[] = [];
  const yValues: number[] = [];
  let command = '';
  let coordIndex = 0;

  tokens.forEach((token: string) => {
    if (/^[a-zA-Z]$/.test(token)) {
      command = token.toUpperCase();
      coordIndex = 0;
      return;
    }

    const value = Number(token);
    if (!Number.isFinite(value)) return;

    if (command === 'H') {
      xValues.push(value);
      return;
    }

    if (command === 'V') {
      yValues.push(value);
      return;
    }

    if (coordIndex % 2 === 0) xValues.push(value);
    else yValues.push(value);
    coordIndex += 1;
  });

  return {
    minX: xValues.length ? Math.min(...xValues) : 0,
    minY: yValues.length ? Math.min(...yValues) : 0,
    width: xValues.length ? Math.max(...xValues) - Math.min(...xValues) : 0,
    height: yValues.length ? Math.max(...yValues) - Math.min(...yValues) : 0,
    maxX: xValues.length ? Math.max(...xValues) : 0,
    maxY: yValues.length ? Math.max(...yValues) : 0
  };
}

const BISMILLAH_TEXT = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const normalizeMushafText = (value: string) =>
  value
    .replace(/^\uFEFF/, '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/\s+/g, '')
    .trim();

function getJsonCoordinateSize(polygons: HafsAyahPolygon[], svgSize: { width: number; height: number }) {
  const bounds = polygons.map((item) => getPathCoordinateBounds(item.polygon));
  const maxX = Math.max(0, ...bounds.map((item) => item.maxX));
  const maxY = Math.max(0, ...bounds.map((item) => item.maxY));

  return {
    width: Math.max(maxX, svgSize.width),
    height: Math.max(maxY, svgSize.height)
  };
}

function parseSvgViewBox(svgText: string) {
  const match = svgText.match(/\bviewBox=(["'])([^"']+)\1/i);
  const viewBox = match?.[2]?.trim() || DEFAULT_HAFS_VIEWBOX;
  const [, , width, height] = viewBox.split(/\s+/).map(Number);

  return {
    viewBox,
    width: Number.isFinite(width) && width > 0 ? width : 235,
    height: Number.isFinite(height) && height > 0 ? height : 235
  };
}

const quranSvgCache = new Map<number, string>();
const quranPolygonCache = new Map<number, HafsAyahPolygon[]>();

async function fetchPageSvgCached(page: number, signal?: AbortSignal): Promise<string> {
  if (page < 1 || page > TOTAL_PAGES) return '';
  if (quranSvgCache.has(page)) return quranSvgCache.get(page)!;
  try {
    const formatted = formatPageFile(page);
    const response = await fetch(`/svg/${formatted}.svg`, { signal });
    if (!response.ok) return '';
    const svgText = await response.text();
    const cleanedSvg = svgText
      .replace(/<\?xml.*?\?>/gi, '')
      .replace(/<!DOCTYPE.*?>/gi, '')
      .replace(/\bpreserveAspectRatio="[^"]*"/gi, '')
      .replace(/<svg\b([^>]*)>/i, '<svg$1 preserveAspectRatio="xMidYMid meet">')
      .trim();
    quranSvgCache.set(page, cleanedSvg);
    return cleanedSvg;
  } catch {
    return '';
  }
}

async function fetchPagePolygonsCached(page: number, signal?: AbortSignal): Promise<HafsAyahPolygon[]> {
  if (page < 1 || page > TOTAL_PAGES) return [];
  if (quranPolygonCache.has(page)) return quranPolygonCache.get(page)!;
  try {
    const formatted = formatPageFile(page);
    const response = await fetch(`/json/${formatted}.json`, { signal });
    if (!response.ok) return [];
    const polygons = (await response.json()) as HafsAyahPolygon[];
    const list = Array.isArray(polygons) ? polygons : [];
    quranPolygonCache.set(page, list);
    return list;
  } catch {
    return [];
  }
}

function prefetchSurroundingPages(currentPage: number) {
  const pagesToPrefetch = [
    currentPage - 1,
    currentPage + 1,
    currentPage - 2,
    currentPage + 2
  ].filter(p => p >= 1 && p <= TOTAL_PAGES);

  pagesToPrefetch.forEach(page => {
    if (!quranSvgCache.has(page)) {
      void fetchPageSvgCached(page);
    }
    if (!quranPolygonCache.has(page)) {
      void fetchPagePolygonsCached(page);
    }
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

function readStoredNumber(key: string, fallback: number) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Builds the stable persistent key for a Quran interaction entry.
 * The key follows the production storage contract `surah:ayah`, so UI state,
 * localStorage reads, and future sync code all point to the same ayah record.
 */
function buildAyahKey(surah: number, ayah: number) {
  return `${surah}:${ayah}`;
}

/**
 * Reads a single ayah interaction record from `userQuranData` in localStorage.
 * It returns a complete default shape when the ayah was never touched, allowing
 * the overlay and bottom sheet to render immediately without defensive null UI.
 */
function getAyahData(surah: number, ayah: number): UserAyahData {
  const allData = readJson<UserQuranData>(USER_QURAN_DATA_KEY, {});
  return allData[buildAyahKey(surah, ayah)] || {
    color: '',
    note: '',
    isBookmarked: false,
    timestamp: 0
  };
}

/**
 * Persists one ayah interaction record into `userQuranData` in localStorage.
 * The function merges partial updates with the previous ayah record, writes the
 * full object back to storage, and returns the updated whole dataset for React
 * state so the overlays and bottom sheet refresh in the same tick.
 */
function saveAyahData(surah: number, ayah: number, data: Partial<UserAyahData>): UserQuranData {
  const allData = readJson<UserQuranData>(USER_QURAN_DATA_KEY, {});
  const key = buildAyahKey(surah, ayah);
  const previous = getAyahData(surah, ayah);
  const next = {
    ...allData,
    [key]: {
      ...previous,
      ...data,
      timestamp: Date.now()
    }
  };

  localStorage.setItem(USER_QURAN_DATA_KEY, JSON.stringify(next));
  return next;
}

function getPageAyahData(pageNumber: number, ayahId: string | number): UserAyahData {
  const allData = readJson<PageUserData>(PAGE_USER_DATA_KEY, {});
  return allData[String(pageNumber)]?.[String(ayahId)] || {
    color: '',
    note: '',
    isBookmarked: false,
    timestamp: 0
  };
}

function savePageAyahData(pageNumber: number, ayahId: string | number, data: Partial<UserAyahData>): PageUserData {
  const allData = readJson<PageUserData>(PAGE_USER_DATA_KEY, {});
  const pageKey = String(pageNumber);
  const ayahKeyForPage = String(ayahId);
  const previous = getPageAyahData(pageNumber, ayahKeyForPage);
  const next = {
    ...allData,
    [pageKey]: {
      ...(allData[pageKey] || {}),
      [ayahKeyForPage]: {
        ...previous,
        ...data,
        timestamp: Date.now()
      }
    }
  };

  localStorage.setItem(PAGE_USER_DATA_KEY, JSON.stringify(next));
  return next;
}

function persistReadingProgress(pageNumber: number) {
  const day = todayKey();
  const readPages = readJson<Record<string, number[]>>(READ_PAGE_KEYS_KEY, {});
  const pagesForDay = new Set(readPages[day] || []);

  localStorage.setItem(LAST_READ_PAGE_KEY, String(pageNumber));

  if (pagesForDay.has(pageNumber)) return false;

  pagesForDay.add(pageNumber);
  const nextReadPages = { ...readPages, [day]: Array.from(pagesForDay).sort((a, b) => a - b) };
  const dailyPagesRead = readJson<Record<string, number>>(READING_TRACKER_KEY, {});
  const nextDailyPagesRead = { ...dailyPagesRead, [day]: pagesForDay.size };
  const totalUniquePages = new Set(Object.values(nextReadPages).flat()).size;
  const totalKhatmaProgress = Math.min(100, Math.round((totalUniquePages / TOTAL_PAGES) * 100));

  localStorage.setItem(READ_PAGE_KEYS_KEY, JSON.stringify(nextReadPages));
  localStorage.setItem(READING_TRACKER_KEY, JSON.stringify(nextDailyPagesRead));
  localStorage.setItem('dailyPagesRead', String(pagesForDay.size));
  localStorage.setItem(TOTAL_KHATMA_PROGRESS_KEY, String(totalKhatmaProgress));
  window.dispatchEvent(new CustomEvent('quran-progress-updated', {
    detail: { pageNumber, dailyPagesRead: pagesForDay.size, totalKhatmaProgress }
  }));
  console.log(`[QuranReader] Counted page ${pageNumber}. Daily pages read: ${pagesForDay.size}`);
  return true;
}

function persistQuranXp(pageNumber: number, points: number) {
  const day = todayKey();
  const xpPages = readJson<Record<string, number[]>>(QURAN_XP_PAGE_KEYS_KEY, {});
  const pagesForDay = new Set(xpPages[day] || []);
  if (pagesForDay.has(pageNumber)) return false;

  pagesForDay.add(pageNumber);
  const nextXpPages = { ...xpPages, [day]: Array.from(pagesForDay).sort((a, b) => a - b) };
  const dailyXp = readJson<Record<string, number>>(QURAN_DAILY_XP_KEY, {});
  const nextDailyXp = { ...dailyXp, [day]: (dailyXp[day] || 0) + points };
  const totalXp = readStoredNumber(QURAN_TOTAL_XP_KEY, 0) + points;

  localStorage.setItem(QURAN_XP_PAGE_KEYS_KEY, JSON.stringify(nextXpPages));
  localStorage.setItem(QURAN_DAILY_XP_KEY, JSON.stringify(nextDailyXp));
  localStorage.setItem(QURAN_TOTAL_XP_KEY, String(totalXp));
  window.dispatchEvent(new CustomEvent('quran-xp-updated', {
    detail: { pageNumber, points, day, totalXp }
  }));
  return true;
}

function persistPlanProgress(planId: string | undefined, pageNumber: number) {
  if (!planId) return;

  if (planId.startsWith('khatma_')) {
    updateKhatmaProgress(planId, pageNumber);
  } else {
    const plans = readJson<Array<Record<string, unknown>>>(QURAN_PLANS_KEY, []);
    const nextPlans = plans.map((plan) => plan.id === planId
      ? {
        ...plan,
        currentPage: pageNumber,
        updatedAt: new Date().toISOString()
      }
      : plan);

    localStorage.setItem(QURAN_PLANS_KEY, JSON.stringify(nextPlans));
  }
  
  window.dispatchEvent(new CustomEvent('quran-plan-progress-updated', {
    detail: { planId, pageNumber }
  }));
}

function normalizeGroups(groups: QuranGroup[]) {
  const hasGeneral = groups.some((group) => group.id === 'general');
  return hasGeneral ? groups : [{ id: 'general', name: 'العام', items: [] }, ...groups];
}

function IconButton({
  icon,
  label,
  onClick,
  className = ''
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`quran-icon-button grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] transition active:scale-95 ${className}`}
      aria-label={label}
      title={label}
    >
      {outlineContent(icon)}
    </button>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-8 w-14 rounded-full p-1 transition ${checked ? 'bg-[var(--quran-accent)]' : 'bg-black/20'}`}
      aria-pressed={checked}
    >
      <span className={`block h-6 w-6 rounded-full bg-white shadow transition ${checked ? '-translate-x-6' : ''}`} />
    </button>
  );
}

export const QuranReader: React.FC<QuranReaderProps> = ({ onBack, mode, params, user, updateStats }) => {
  const currentUserId = (user as any)?.uid || auth.currentUser?.uid || '';
  const isExplicitPageProvided = typeof params?.page === 'number';
  const initialPage = isExplicitPageProvided ? params.page : Number(localStorage.getItem(LAST_READ_PAGE_KEY)) || 1;
  const activeMode = mode || params?.mode || 'reading';
  const isReadingMode = activeMode === 'reading';
  const longPressTimer = useRef<number | null>(null);
  const pageLongPressTimer = useRef<number | null>(null);
  const didLongPressAyahRef = useRef(false);
  const pendingContextAyahRef = useRef<{ surahNumber: number; ayahNumber: number } | null>(null);
  const pageAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const swipeGestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startedAt: number;
    width: number;
    horizontal: boolean;
    cancelled: boolean;
  } | null>(null);
  const swipeCommitTimerRef = useRef<number | null>(null);
  const didSwipeRef = useRef(false);
  const updateStatsRef = useRef(updateStats);

  const [pageNumber, setPageNumber] = useState<number>(() => {
    // If navigating to an explicit page (even page 1), honor that directly
    if (typeof params?.page === 'number' && params.page >= 1) return clampPage(params.page);
    const session = readJson<ActiveClanJuzSession | null>(ACTIVE_CLAN_JUZ_KEY, null);
    if (session) {
      const savedJuzPage = Number(localStorage.getItem(`ifaqa_clan_juz_last_page_${session.juzNumber}`));
      if (savedJuzPage && savedJuzPage >= session.startPage && savedJuzPage <= session.endPage) {
        return clampPage(savedJuzPage);
      }
      return clampPage(session.startPage);
    }
    const saved = localStorage.getItem('lastReadQuranPage');
    return saved ? clampPage(parseInt(saved, 10)) : 1;
  });
  const [showBars, setShowBars] = useState(true);
  const [theme, setTheme] = useState<ThemeName>(() => (localStorage.getItem('quranTheme') as ThemeName) || 'classic');
  const [showPageXpToast, setShowPageXpToast] = useState(() => localStorage.getItem(QURAN_SHOW_PAGE_XP_TOAST_KEY) !== 'false');
  const [quranXpToast, setQuranXpToast] = useState<{ points: number; page: number } | null>(null);

  const [pageReadProgress, setPageReadProgress] = useState(0);
  const [isPageValidated, setIsPageValidated] = useState(false);
  const [secondsOnCurrentPage, setSecondsOnCurrentPage] = useState<number>(0);

  useEffect(() => {
    if (typeof params?.page !== 'number') {
      storageService.getLastPage().then(saved => {
        if (saved) setPageNumber(clampPage(saved));
      });
    }
    storageService.getTheme().then(t => {
      if (t) setTheme(t as ThemeName);
    });
  }, []);

  useEffect(() => {
    if (typeof params?.page === 'number' && params.page >= 1) {
      setPageNumber(clampPage(params.page));
    }
  }, [params?.page]);

  useEffect(() => {
    storageService.saveLastPage(pageNumber);
    if (currentUserId) {
      saveLastReadPosition(currentUserId, pageNumber);
    }
  }, [pageNumber, currentUserId]);

  useEffect(() => {
    const handleCloudSync = (e: any) => {
      const data = e.detail;
      if (data?.awrad && Array.isArray(data.awrad)) {
        setAwrad(data.awrad);
      }
      if (data?.userQuranData) {
        setUserQuranData(data.userQuranData);
      }
      if (data?.userData) {
        setUserData(data.userData);
      }
      if (data?.lastReadPosition?.pageNumber && typeof params?.page !== 'number') {
        setPageNumber(clampPage(data.lastReadPosition.pageNumber));
      }
    };
    window.addEventListener('quran-cloud-synced', handleCloudSync);
    return () => window.removeEventListener('quran-cloud-synced', handleCloudSync);
  }, [params?.page]);

  useEffect(() => {
    storageService.saveTheme(theme);
  }, [theme]);
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatusMap>(getOfflineStatus);
  const [offlineDownload, setOfflineDownload] = useState<{ key: OfflinePackKey; progress: number; label: string } | null>(null);
  const [offlineError, setOfflineError] = useState('');
  const [isUnifiedSearchOpen, setIsUnifiedSearchOpen] = useState(false);
  const [ayahThemes, setAyahThemes] = useState<Record<string, string>>({});
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playingAyahKey, setPlayingAyahKey] = useState<string | null>(null); // "surah:ayah"
  const [audioRepeatMode, setAudioRepeatMode] = useState<'none' | 'ayah' | 'range'>('none');
  const [audioRange, setAudioRange] = useState<{ start: number; end: number } | null>(null);
  const [selectedReciter, setSelectedReciter] = useState(() => localStorage.getItem('quranSelectedReciter') || 'ar.alafasy');
  const [readerReciters, setReaderReciters] = useState<ReaderReciter[]>(RECITERS);
  const [audioStartPage, setAudioStartPage] = useState(() => clampPage(Number(localStorage.getItem('quranAudioStartPage') || initialPage)));
  const [audioEndPage, setAudioEndPage] = useState(() => clampPage(Number(localStorage.getItem('quranAudioEndPage') || initialPage)));
  const [repeatPageAudio, setRepeatPageAudio] = useState(false);
  const [isPageAudioPlaying, setIsPageAudioPlaying] = useState(false);
  const [isAudioDownloading, setIsAudioDownloading] = useState(false);
  const audioRepeatModeRef = useRef<'none' | 'ayah' | 'range'>('none');
  const audioRangeRef = useRef<{ start: number; end: number } | null>(null);
  const playingAyahKeyRef = useRef<string | null>(null);
  const playbackModeRef = useRef<'single' | 'surah'>('surah');
  const playbackStartAyahKeyRef = useRef<string | null>(null);
  const singlePlaybackStopHandledRef = useRef(false);
  const audioPlaybackSessionRef = useRef(0);
  const selectedReciterRef = useRef(localStorage.getItem('quranSelectedReciter') || 'ar.alafasy');
  const surahAudioRef = useRef<{ url: string; timestamps: any[]; surah: number; reciter: string } | null>(null);
  const [audioOfflineDownload, setAudioOfflineDownload] = useState<{ progress: number; label: string } | null>(null);
  const [activeAyah, setActiveAyah] = useState<number | null>(null);
  const [contextAyah, setContextAyah] = useState<number | null>(null);
  const [contextSurah, setContextSurah] = useState<number>(params?.surah || 1);
   const [tafseerState, setTafseerState] = useState<TafseerState>({ ayahText: '', tafseerText: '', error: '' });
   const [tafseerList, setTafseerList] = useState<TafseerSource[]>([]);
   const [selectedTafseerId, setSelectedTafseerId] = useState(() => readStoredNumber(PREFERRED_TAFSEER_KEY, DEFAULT_TAFSEER_ID));
   const [isIndexOpen, setIsIndexOpen] = useState(false);
   const [isTafsirLoading, setIsTafsirLoading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [downloadingItem, setDownloadingItem] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  // Quran.com enhancements: Audio Speed, Repeat Counts, Share Card, Stop Marks, Memorization Mode
  const [audioSpeed, setAudioSpeed] = useState<number>(1);
  const audioSpeedRef = useRef<number>(1);
  const [repeatCountTarget, setRepeatCountTarget] = useState<number>(1);
  const repeatCountTargetRef = useRef<number>(1);
  const currentRepeatIterationRef = useRef<number>(1);
  const [isShareCardOpen, setIsShareCardOpen] = useState(false);
  const [isStopMarksOpen, setIsStopMarksOpen] = useState(false);
  const [isHifzTestMode, setIsHifzTestMode] = useState(false);
  const [revealedAyahs, setRevealedAyahs] = useState<Set<number>>(new Set());
  const [activityTick, setActivityTick] = useState(0);
  const [surahs, setSurahs] = useState<SurahItem[]>(() => quranSurahs.map((surah) => ({
    number: surah.number,
    name: surah.name,
    englishName: surah.englishName,
    numberOfAyahs: surah.ayahCount,
    firstPage: surah.startPage
  })));

  const startingSurahsOnPage = useMemo(() => {
    return quranSurahs.filter(s => s.startPage === pageNumber);
  }, [pageNumber]);
  const [indexQuery, setIndexQuery] = useState('');
  const [indexTab, setIndexTab] = useState<'surahs' | 'juz' | 'quarters' | 'khatma' | 'awrad' | 'references' | 'favorites' | 'notes'>('surahs');
  const [awrad, setAwrad] = useState<QuranWird[]>(() => {
    const stored = readJson<QuranWird[]>(QURAN_AWRAD_KEY, defaultAwrad);
    const merged = defaultAwrad.map((wird) => ({ ...wird, ...(stored.find((item) => item.id === wird.id) || {}) }));
    stored.forEach((s) => {
      if (!merged.find((m) => m.id === s.id)) merged.push(s);
    });
    return merged;
  });
  const [activeWirdId, setActiveWirdId] = useState<WirdKind | null>(() => {
    if (params?.mode === 'reading' || !params?.mode) return 'reading';
    return null;
  });
  const [activePlanId, setActivePlanId] = useState<string | null>(params?.planId || null);
  const [referenceGroups, setReferenceGroups] = useState<QuranGroup[]>(() => normalizeGroups(readJson<QuranGroup[]>(QURAN_REFERENCE_GROUPS_KEY, defaultQuranGroups)));
  const [highlightGroups, setHighlightGroups] = useState<QuranGroup[]>(() => normalizeGroups(readJson<QuranGroup[]>(QURAN_HIGHLIGHT_GROUPS_KEY, defaultQuranGroups)));
  const [activeReferenceGroupId, setActiveReferenceGroupId] = useState('general');
  const [activeHighlightGroupId, setActiveHighlightGroupId] = useState('general');
  const [hiddenWirdIds, setHiddenWirdIds] = useState<WirdKind[]>(() => readJson<WirdKind[]>('quranHiddenAwrad', []));
  const [saveDestinationMode, setSaveDestinationMode] = useState<'auto_general' | 'ask'>(() => (
    localStorage.getItem(QURAN_SAVE_DESTINATION_MODE_KEY) === 'ask' ? 'ask' : 'auto_general'
  ));
  const [activeHighlightColor, setActiveHighlightColor] = useState<HighlightColor | 'all'>('all');
  
  // Group Picker Modal State
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [groupPickerData, setGroupPickerData] = useState<{
    surahNumber: number;
    ayahNumber: number;
    ayahText?: string;
    surahName?: string;
    selectedColor: string;
    currentGroupId?: string;
    currentNote?: string;
  } | null>(null);

  // Wird Evaluation Modal State
  const [showWirdEvaluation, setShowWirdEvaluation] = useState(false);
  const [wirdEvaluationTarget, setWirdEvaluationTarget] = useState<{
    id: string;
    title: string;
    startPage: number;
    currentPage: number;
    surahName?: string;
  } | null>(null);
  const [wirdEvaluations, setWirdEvaluations] = useState<WirdEvaluation[]>(() => readJson<WirdEvaluation[]>('quranWirdEvaluationsHistory', []));

  // Clan Khatma Juz Challenge Session
  const [clanJuzSession, setClanJuzSession] = useState<ActiveClanJuzSession | null>(() => {
    return readJson<ActiveClanJuzSession | null>(ACTIVE_CLAN_JUZ_KEY, null);
  });
  const [clanJuzLastMarkedPage, setClanJuzLastMarkedPage] = useState<number>(() => {
    const session = readJson<ActiveClanJuzSession | null>(ACTIVE_CLAN_JUZ_KEY, null);
    if (!session) return 0;
    return Number(localStorage.getItem(`ifaqa_clan_juz_last_page_${session.juzNumber}`)) || session.startPage;
  });

  // Re-sync active Clan Juz session if changed or re-entered
  useEffect(() => {
    const session = readJson<ActiveClanJuzSession | null>(ACTIVE_CLAN_JUZ_KEY, null);
    setClanJuzSession(session);
    if (session) {
      const saved = Number(localStorage.getItem(`ifaqa_clan_juz_last_page_${session.juzNumber}`));
      setClanJuzLastMarkedPage(saved || session.startPage);
    }
  }, [params?.page, params?.surah]);

  const handleMarkClanJuzBookmark = () => {
    if (!clanJuzSession) return;
    if (!isPageValidated) {
      const remainingSec = Math.max(1, 20 - secondsOnCurrentPage);
      toast(`يرجى إكمال قراءة الصفحة (${toArabicNumber(remainingSec)} ث) قبل تثبيت وقوفك.`, {
        icon: "icon:clock",
        duration: 3000
      });
      return;
    }
    localStorage.setItem(`ifaqa_clan_juz_last_page_${clanJuzSession.juzNumber}`, String(pageNumber));
    setClanJuzLastMarkedPage(pageNumber);
    const pagesCompleted = Math.max(1, pageNumber - clanJuzSession.startPage + 1);
    toast.success(` تم حفظ وقوفك عند صفحة ${toArabicNumber(pageNumber)} (${toArabicNumber(pagesCompleted)} ص من الجزء)!`, {
      icon: "icon:star",
      duration: 3500
    });
    hapticSuccess();
    if (clanJuzSession.clanId && currentUserId) {
      void clanService.recordKhatmaStandingPage(clanJuzSession.clanId, currentUserId, clanJuzSession.juzNumber, pageNumber);
    }
  };

  const [pageAyahs, setPageAyahs] = useState<ApiAyah[]>([]);
  const [pageLayoutMeta, setPageLayoutMeta] = useState<MushafLayoutLineMeta[]>([]);
  
  const getApiAyah = (surah: number, ayah: number) => {
    return pageAyahs.find(a => 
      (a.surah?.number || (a as any).surah_id) === surah && 
      (a.numberInSurah || (a as any).ayah_id) === ayah
    );
  };
  const [pageThemes, setPageThemes] = useState<Record<string, { color: string; title: string }>>({});
  const [pagePolygons, setPagePolygons] = useState<HafsAyahPolygon[]>([]);
  const [svgMarkup, setSvgMarkup] = useState('');
  const [neighborSvgMarkup, setNeighborSvgMarkup] = useState<{ previous: string; next: string }>({ previous: '', next: '' });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeTransitionEnabled, setSwipeTransitionEnabled] = useState(true);
  const [svgViewBox, setSvgViewBox] = useState(DEFAULT_HAFS_VIEWBOX);
  const [svgSize, setSvgSize] = useState({ width: 235, height: 235 });
  const [jsonCoordinateSize, setJsonCoordinateSize] = useState({ width: 235, height: 235 });
  const pageViewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: window.innerWidth || 390,
    height: window.innerHeight || 740
  }));
  const [isPageAssetLoading, setIsPageAssetLoading] = useState(true);
  const [noteDraft, setNoteDraft] = useState('');

  useEffect(() => () => {
    if (swipeCommitTimerRef.current) window.clearTimeout(swipeCommitTimerRef.current);
  }, []);
  const [userQuranData, setUserQuranData] = useState<UserQuranData>(() => readJson(USER_QURAN_DATA_KEY, {}));
  const [userData, setUserData] = useState<PageUserData>(() => readJson(PAGE_USER_DATA_KEY, {}));
  const [showCreateKhatma, setShowCreateKhatma] = useState(false);
  const [khatmas, setKhatmas] = useState<Khatma[]>([]);
  const [juzs, setJuzs] = useState<JuzItem[]>([]);
  const [sajdas, setSajdas] = useState<SajdaItem[]>([]);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [currentAudioAyah, setCurrentAudioAyah] = useState<{surah: number, ayah: number} | null>(null);

  useEffect(() => {
    const handleTimeUpdate = (e: any) => {
      setCurrentAudioTime(e.detail.currentTime);
      setCurrentAudioAyah({ surah: e.detail.surah, ayah: e.detail.ayah });
    };
    window.addEventListener('quran_audio_timeupdate', handleTimeUpdate);
    return () => window.removeEventListener('quran_audio_timeupdate', handleTimeUpdate);
  }, []);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [surahList, juzList, sajdaList] = await Promise.all([
          quraniApi.getSurahs(),
          quraniApi.getJuzs(),
          quraniApi.getSajdas()
        ]);

        if (surahList.length > 0) {
          setSurahs(surahList.map(s => ({
            number: s.number,
            name: s.name,
            englishName: s.englishName,
            numberOfAyahs: s.numberOfAyahs,
            revelationType: s.revelationType,
            firstPage: quranSurahs.find(qs => qs.number === s.number)?.startPage
          })));
        }
        setJuzs(juzList);
        setSajdas(sajdaList);
      } catch (e) {
        console.error('Failed to fetch Qurani.ai metadata', e);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => { audioRepeatModeRef.current = audioRepeatMode; }, [audioRepeatMode]);
  useEffect(() => { audioRangeRef.current = audioRange; }, [audioRange]);
  useEffect(() => { playingAyahKeyRef.current = playingAyahKey; }, [playingAyahKey]);
  useEffect(() => { selectedReciterRef.current = selectedReciter; }, [selectedReciter]);
  useEffect(() => { audioSpeedRef.current = audioSpeed; }, [audioSpeed]);
  useEffect(() => { repeatCountTargetRef.current = repeatCountTarget; }, [repeatCountTarget]);
  useEffect(() => { setRevealedAyahs(new Set()); }, [pageNumber]);
  useEffect(() => {
    let cancelled = false;
    QuranAudioHubService.getReciters().then((hubReciters) => {
      if (cancelled) return;
      const coreNames = new Set(RECITERS.map((reciter) => reciter.name.replace(/\s*\([^)]*\)\s*/g, '').trim()));
      const additional = hubReciters
        .filter((reciter) => reciter.moshaf?.length > 0)
        .filter((reciter) => !coreNames.has(reciter.name.replace(/\s*\([^)]*\)\s*/g, '').trim()))
        .map<ReaderReciter>((reciter) => ({
          id: `mp3quran:${reciter.id}`,
          name: reciter.name,
          hubReciter: reciter,
        }));
      setReaderReciters([...RECITERS, ...additional].sort((a, b) => a.name.localeCompare(b.name, 'ar')));
    }).catch((error) => {
      console.warn('تعذر تحديث قائمة القراء الكاملة:', error);
    });
    return () => { cancelled = true; };
  }, []);

  const updatePlayingAyahKey = (ayahKey: string | null) => {
    playingAyahKeyRef.current = ayahKey;
    setPlayingAyahKey(ayahKey);
  };

  const disposeAudioInstance = (audio: HTMLAudioElement | null) => {
    if (!audio) return;
    audio.onplay = null;
    audio.onpause = null;
    audio.oncanplay = null;
    audio.onerror = null;
    audio.onended = null;
    audio.ontimeupdate = null;
    audio.onloadedmetadata = null;
    audio.pause();
    audio.src = '';
  };

  useEffect(() => {
    if (indexTab === 'khatma') {
      setKhatmas(getKhatmas());
    }
  }, [indexTab]);

  const ayahRefs = useRef<Record<string, HTMLSpanElement>>({});

  const [metadata, setMetadata] = useState<QuranMetadata>(() => {
    const staticMeta = getStaticPageMetadata(pageNumber);
    const surahNumber = staticMeta.surahNumber || params?.surah || 1;
    const localSurahName = quranSurahs.find((s) => s.number === surahNumber)?.name;
    return {
      surahName: localSurahName ? `سورة ${localSurahName}` : 'المصحف',
      surahNumber,
      juzNumber: staticMeta.juzNumber || 1,
      hizbNumber: staticMeta.hizbNumber || 1,
      hizbQuarter: staticMeta.hizbQuarter || 1
    };
  });


  const [showSettings, setShowSettings] = useState(false);
  const [showStatsDetails, setShowStatsDetails] = useState(false);
  const [offlineDownloadsStatus, setOfflineDownloadsStatus] = useState<{ quran: 'idle' | 'loading' | 'done', tafsir: 'idle' | 'loading' | 'done', audio: 'idle' | 'loading' | 'done' }>({ quran: 'idle', tafsir: 'idle', audio: 'idle' });
  const [reciterDownloads, setReciterDownloads] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const status = getOfflineStatus();
    setOfflineDownloadsStatus({
      quran: status.quranMushaf?.downloaded ? 'done' : 'idle',
      tafsir: status.tafseerMuyassar?.downloaded ? 'done' : 'idle',
      audio: 'idle'
    });
  }, [showSettings]);

  useEffect(() => {
    const checkAudio = async () => {
      const { isAudioDownloaded } = await import('../src/services/offlineBundle');
      const status: Record<string, boolean> = {};
      for (const reciter of RECITERS) {
        status[reciter.id] = await isAudioDownloaded(reciter.id, metadata.surahNumber);
      }
      setReciterDownloads(status);
    };
    if (showSettings) checkAudio();
  }, [showSettings, metadata.surahNumber]);

  const [activeOfflineModal, setActiveOfflineModal] = useState<'tafsir' | 'iraab' | 'maani' | 'mutashabihat' | 'theme' | null>(null);
  const [activeModalAyah, setActiveModalAyah] = useState<{ surah: number; ayah: number } | null>(null);
  const [showDownloadsManager, setShowDownloadsManager] = useState(false);
  const [showResumeToast, setShowResumeToast] = useState(false);

  // Persist last-read page on every change
  useEffect(() => {
    localStorage.setItem('lastReadQuranPage', pageNumber.toString());
    const planId = params?.planId;
    if (planId) {
      const raw = localStorage.getItem(QURAN_PLANS_KEY);
      if (raw) {
        const plans = JSON.parse(raw);
        const updated = plans.map((p: any) => p.id === planId ? { ...p, currentPage: pageNumber, updatedAt: new Date().toISOString() } : p);
        localStorage.setItem(QURAN_PLANS_KEY, JSON.stringify(updated));
        const active = updated.find((p: any) => p.id === planId);
        if (active) {
          const s = quranSurahs.find(surah => surah.startPage <= pageNumber && (!quranSurahs[quranSurahs.indexOf(surah)+1] || quranSurahs[quranSurahs.indexOf(surah)+1].startPage > pageNumber));
          const item = JSON.stringify({ surahName: s ? s.name : 'البقرة', juzNumber: Math.floor((pageNumber - 2) / 20) + 1, pageNumber });
          import('@capacitor/preferences').then(({ Preferences }) => {
            if (active.type === 'new_hifz' || active.mode === 'new_hifz') Preferences.set({ key: 'user_wird_hifz', value: item });
            else if (active.type === 'near_review' || active.mode === 'near_review') Preferences.set({ key: 'user_wird_rev_near_data', value: item });
            else if (active.type === 'far_review' || active.mode === 'far_review') Preferences.set({ key: 'user_wird_rev_far_data', value: item });
          });
        }
      }
    }
  }, [pageNumber, params?.planId]);

  // Show resume toast if we restored from storage
  useEffect(() => {
    const saved = localStorage.getItem('lastReadQuranPage');
    if (saved && !isExplicitPageProvided && parseInt(saved) > 1) {
      setShowResumeToast(true);
      setTimeout(() => setShowResumeToast(false), 3000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    checkBundleStatus().then(status => {
      setOfflineDownloadsStatus(prev => ({
        ...prev,
        quran: status.quran ? 'done' : 'idle',
        tafsir: status.tafsir ? 'done' : 'idle',
      }));
    });
  }, []);

  const handleQuranDownload = async () => {
    setOfflineDownloadsStatus(prev => ({ ...prev, quran: 'loading' }));
    try {
      await downloadQuran();
      setOfflineDownloadsStatus(prev => ({ ...prev, quran: 'done' }));
    } catch {
      setOfflineDownloadsStatus(prev => ({ ...prev, quran: 'idle' }));
    }
  };

  const handleFeatureDownload = async (feature: 'morphology' | 'tajweed' | 'themes' | 'mutashabihat', scope: 'current' | 'all' = 'all') => {
    if (downloadingItem) return;
    setDownloadingItem(`${feature}_${scope}`);
    setDownloadProgress(0);
    
    try {
        if (scope === 'current') {
            await (QuranOfflineManager as any).downloadFeatureData(metadata.surahNumber, feature, (p: number) => {
                setDownloadProgress(Math.round(p * 100));
            });
        } else {
            const surahsToDownload = Array.from({length: 114}, (_, i) => i + 1);
            for (let i = 0; i < surahsToDownload.length; i++) {
                const sId = surahsToDownload[i];
                await (QuranOfflineManager as any).downloadFeatureData(sId, feature, (p: number) => {
                    const totalProgress = (i / 114) + (p / 114);
                    setDownloadProgress(Math.round(totalProgress * 100));
                });
            }
        }
        const featureLabels = {
          morphology: 'معاني الكلمات والتحليل الصرفي',
          tajweed: 'أحكام التجويد',
          themes: 'موضوعات الآيات',
          mutashabihat: 'المتشابهات اللفظية'
        } as const;
        toast.success(`تم تحميل ${featureLabels[feature]} بنجاح!`);
    } catch (error) {
        console.error(`Failed to download ${feature}:`, error);
        toast.error('حدث خطأ أثناء تحميل البيانات.');
    } finally {
        setDownloadingItem(null);
        setDownloadProgress(0);
    }
  };

  const handleDownloadCurrentSurahTools = async () => {
    if (downloadingItem) return;
    setDownloadingItem('current_surah_all_tools');
    setDownloadProgress(0);
    
    try {
        const surahId = metadata.surahNumber;
        const features: ('morphology' | 'tajweed' | 'themes' | 'mutashabihat')[] = ['morphology', 'tajweed', 'themes', 'mutashabihat'];
        
        for (let i = 0; i < features.length; i++) {
            await (QuranOfflineManager as any).downloadFeatureData(surahId, features[i], (p: number) => {
                const totalProgress = (i / features.length) + (p / features.length);
                setDownloadProgress(Math.round(totalProgress * 100));
            });
        }
        toast.success('تم تحميل كافة أدوات السورة بنجاح!');
    } catch (error) {
        console.error('Failed to download surah tools:', error);
        toast.error('حدث خطأ أثناء تحميل أدوات السورة.');
    } finally {
        setDownloadingItem(null);
        setDownloadProgress(0);
    }
  };

  const handleTafsirDownload = async () => {
    setOfflineDownloadsStatus(prev => ({ ...prev, tafsir: 'loading' }));
    try {
      await downloadTafsir();
      setOfflineDownloadsStatus(prev => ({ ...prev, tafsir: 'done' }));
    } catch {
      setOfflineDownloadsStatus(prev => ({ ...prev, tafsir: 'idle' }));
    }
  };

  const handleAudioDownload = async () => {
    setOfflineDownloadsStatus(prev => ({ ...prev, audio: 'loading' }));
    try {
      const dummyUrl = `https://server8.mp3quran.net/afs/${String(metadata.surahNumber).padStart(3, '0')}.mp3`;
      await downloadAudioForOffline(String(metadata.surahNumber), dummyUrl);
      setOfflineDownloadsStatus(prev => ({ ...prev, audio: 'done' }));
    } catch {
      setOfflineDownloadsStatus(prev => ({ ...prev, audio: 'idle' }));
    }
  };

  const formattedPage = formatPageFile(pageNumber);
  const jsonAssetPath = `/json/${formattedPage}.json`;
  const svgAssetPath = `/svg/${formattedPage}.svg`;

  useEffect(() => {
    prefetchSurroundingPages(pageNumber);
    const controller = new AbortController();
    Promise.all([
      fetchPageSvgCached(pageNumber - 1, controller.signal),
      fetchPageSvgCached(pageNumber + 1, controller.signal)
    ]).then(([previous, next]) => {
      if (!controller.signal.aborted) setNeighborSvgMarkup({ previous, next });
    });

    return () => controller.abort();
  }, [pageNumber]);

  const currentTheme = themeStyles[theme];
  const svgAspectRatio = `${svgSize.width} / ${svgSize.height}`;
  const svgFrame = useMemo(() => {
    // Measured content area already excludes chrome, safe areas and side padding.
    const maxWidth = Math.max(1, viewportSize.width);
    const availableHeight = Math.max(1, viewportSize.height);

    let targetWidth = maxWidth;
    let targetHeight = targetWidth * (svgSize.height / svgSize.width);

    if (targetHeight > availableHeight) {
      targetHeight = availableHeight;
      targetWidth = targetHeight * (svgSize.width / svgSize.height);
    }

    return {
      width: Math.floor(targetWidth),
      height: Math.floor(targetHeight)
    };
  }, [viewportSize.height, viewportSize.width, svgSize.height, svgSize.width]);
  const coordinateScale = useMemo(() => ({
    x: svgSize.width / jsonCoordinateSize.width,
    y: svgSize.height / jsonCoordinateSize.height
  }), [jsonCoordinateSize.height, jsonCoordinateSize.width, svgSize.height, svgSize.width]);
  const visibleBars = showBars && !contextAyah;
  const selectedAyah = useMemo(
    () => pageAyahs.find((ayah) => ayah.surah?.number === contextSurah && ayah.numberInSurah === contextAyah) || null,
    [contextAyah, contextSurah, pageAyahs]
  );
  const contextAyahText = useMemo(
    () => buildAyahTextFromWords(pageAyahs.find((ayah) => ayah.surah?.number === contextSurah && ayah.numberInSurah === contextAyah)),
    [contextAyah, contextSurah, pageAyahs]
  );
  const displaySurahName = useMemo(() => {
    const staticMeta = getStaticPageMetadata(pageNumber);
    const sNum = metadata.surahNumber || staticMeta.surahNumber;
    const localSurah = quranSurahs.find((surah) => surah.number === sNum);
    return localSurah ? `سورة ${localSurah.name}` : metadata.surahName;
  }, [metadata.surahName, metadata.surahNumber, pageNumber]);

  const currentJuzNumber = useMemo(() => {
    return metadata.juzNumber || getStaticPageMetadata(pageNumber).juzNumber || 1;
  }, [metadata.juzNumber, pageNumber]);

  const currentHizbNumber = useMemo(() => {
    return metadata.hizbNumber || getStaticPageMetadata(pageNumber).hizbNumber || 1;
  }, [metadata.hizbNumber, pageNumber]);
  const contextSurahName = useMemo(() => {
    const localSurah = quranSurahs.find((surah) => surah.number === contextSurah);
    return localSurah ? `سورة ${localSurah.name}` : displaySurahName;
  }, [contextSurah, displaySurahName]);
  const activeModalSurah = activeModalAyah?.surah || contextSurah || metadata.surahNumber;
  const activeModalAyahNumber = activeModalAyah?.ayah || contextAyah || 1;
  const activeModalSurahName = useMemo(() => {
    const localSurah = quranSurahs.find((surah) => surah.number === activeModalSurah);
    return localSurah ? `سورة ${localSurah.name}` : displaySurahName;
  }, [activeModalSurah, displaySurahName]);
  const activeModalAyahText = useMemo(() => {
    return (
      buildAyahTextFromWords(
        pageAyahs.find((ayah) => ayah.surah?.number === activeModalSurah && ayah.numberInSurah === activeModalAyahNumber)
      ) || contextAyahText
    );
  }, [activeModalAyahNumber, activeModalSurah, contextAyahText, pageAyahs]);

  useEffect(() => {
    if (!pagePolygons.length || !pageAyahs.length) return;

    setPagePolygons((current) => {
      let changed = false;
      const next = current.map((polygon, index) => {
        const pageAyah = pageAyahs[index];
        if (!pageAyah) return polygon;

        const expectedSurahNumber = pageAyah.surah?.number || metadata.surahNumber;
        const expectedAyahNumber = pageAyah.numberInSurah || index + 1;

        if (
          polygon.surahNumber === expectedSurahNumber &&
          polygon.ayahNumber === expectedAyahNumber
        ) {
          return polygon;
        }

        changed = true;

        return {
          ...polygon,
          // The bundled coordinate files intentionally contain zero IDs. The
          // current page API is authoritative, and also fixes any stale IDs
          // left behind when a fast page swipe finishes before metadata loads.
          surahNumber: expectedSurahNumber,
          ayahNumber: expectedAyahNumber
        };
      });

      return changed ? next : current;
    });
  }, [metadata.surahNumber, pageAyahs, pagePolygons]);

  useEffect(() => {
    const pendingTarget = pendingContextAyahRef.current;
    if (!pendingTarget || !pageAyahs.length) return;

    const existsOnPage = pageAyahs.some(
      (ayah) =>
        (ayah.surah?.number || metadata.surahNumber) === pendingTarget.surahNumber &&
        (ayah.numberInSurah || 0) === pendingTarget.ayahNumber
    );

    if (!existsOnPage) return;

    pendingContextAyahRef.current = null;
    setActiveAyah(pendingTarget.ayahNumber);
    setContextSurah(pendingTarget.surahNumber);
    setContextAyah(pendingTarget.ayahNumber);
  }, [metadata.surahNumber, pageAyahs]);
  const displaySurahLabel = useMemo(() => {
    const localSurah = quranSurahs.find((surah) => surah.number === metadata.surahNumber);
    return localSurah ? `سورة ${localSurah.name}` : metadata.surahName;
  }, [metadata.surahName, metadata.surahNumber]);
  const mushafSections = useMemo<MushafSurahSection[]>(() => {
    return [];
    const sections: MushafSurahSection[] = [];

    for (const ayah of pageAyahs) {
      const surahNumber = ayah.surah?.number || metadata.surahNumber;
      const surahName = quranSurahs.find((surah) => surah.number === surahNumber)?.name || ayah.surah?.name || `سورة ${surahNumber}`;
      const mushafAyah: MushafAyah = {
        number: ayah.numberInSurah || 1,
        surahNumber,
        globalNumber: ayah.number,
        text: ayah.text || ''
      };

      const lastSection = sections[sections.length - 1];
      if (!lastSection || lastSection.surahNumber !== surahNumber) {
        sections.push({
          surahNumber,
          surahName,
          ayahs: [mushafAyah],
          showHeader: (ayah.numberInSurah || 1) === 1 && surahNumber !== 9
        });
      } else {
        lastSection.ayahs.push(mushafAyah);
      }
    }

    return sections;
  }, [metadata.surahNumber, pageAyahs]);
  const mushafRenderSections = useMemo<MushafSurahSection[]>(() => [], []);
  const perfectMushafSections = useMemo<MushafSurahSection[]>(() => [], []);
  const finalMushafSections = useMemo<MushafSurahSection[]>(() => {
    const sections: MushafSurahSection[] = [];
    const sectionMap = new Map<number, MushafSurahSection>();

    for (const ayah of pageAyahs) {
      const surahNumber = ayah.surah?.number || metadata.surahNumber;
      const surahName = quranSurahs.find((surah) => surah.number === surahNumber)?.name || `سورة ${surahNumber}`;

      let section = sectionMap.get(surahNumber);
      if (!section) {
        section = {
          surahNumber,
          surahName,
          lines: [],
          showHeader: (ayah.numberInSurah || 1) === 1,
          bismillah: (ayah.numberInSurah || 1) === 1 && surahNumber !== 1 && surahNumber !== 9 ? BISMILLAH_TEXT : null
        };
        sectionMap.set(surahNumber, section);
        sections.push(section);
      }

      const baseAyah: MushafAyah = {
        number: ayah.numberInSurah || 1,
        surahNumber,
        globalNumber: ayah.number,
        text: ayah.text || ''
      };

      const ayahLineBuckets = new Map<number, MushafToken[]>();
      for (const word of ayah.words || []) {
        const lineNumber = word.line_number;
        if (!lineNumber || !word.text) continue;

        const token: MushafToken = {
          text: word.text.replace(/^\uFEFF/, ''),
          type: word.char_type_name === 'end' ? 'end' : 'word',
          ayah: baseAyah
        };

        const current = ayahLineBuckets.get(lineNumber) || [];
        current.push(token);
        ayahLineBuckets.set(lineNumber, current);
      }

      for (const lineNumber of Array.from(ayahLineBuckets.keys()).sort((a, b) => a - b)) {
        const tokens = ayahLineBuckets.get(lineNumber) || [];
        section.lines?.push({
          lineNumber,
          lineType: 'ayah',
          isCentered: false,
          justify: true,
          tokens
        });
      }
    }

    for (const section of sections) {
      if (!section.lines?.length) continue;
      const lastIndex = section.lines.length - 1;
      section.lines[lastIndex] = {
        ...section.lines[lastIndex],
        justify: false
      };
    }

    return sections;
  }, [metadata.surahNumber, pageAyahs]);
  const stableMushafSections = useMemo<MushafSurahSection[]>(() => {
    const sections: MushafSurahSection[] = [];
    const normalizedBismillah = normalizeMushafText(BISMILLAH_TEXT);

    for (const ayah of pageAyahs) {
      const surahNumber = ayah.surah?.number || metadata.surahNumber;
      const resolvedSurahName =
        quranSurahs.find((surah) => surah.number === surahNumber)?.name ||
        ayah.surah?.name ||
        `سورة ${surahNumber}`;
      const isSurahStart = (ayah.numberInSurah || 1) === 1;
      const shouldShowBismillah = isSurahStart && surahNumber !== 1 && surahNumber !== 9;

      let section = sections[sections.length - 1];
      if (!section || section.surahNumber !== surahNumber) {
        section = {
          surahNumber,
          surahName: resolvedSurahName,
          lines: [],
          showHeader: isSurahStart,
          bismillah: shouldShowBismillah ? BISMILLAH_TEXT : null
        };
        sections.push(section);
      }

      const baseAyah: MushafAyah = {
        number: ayah.numberInSurah || 1,
        surahNumber,
        globalNumber: ayah.number,
        text: ayah.text || ''
      };

      const sourceWords = (ayah.words || []).filter((word) => word.line_number && word.text);
      const shouldStripBismillah =
        shouldShowBismillah &&
        normalizeMushafText(baseAyah.text).startsWith(normalizedBismillah);

      let skipWordCount = 0;
      if (shouldStripBismillah) {
        let joinedPrefix = '';
        for (const word of sourceWords) {
          if (word.char_type_name === 'end') continue;
          joinedPrefix += normalizeMushafText(word.text || '');
          skipWordCount += 1;

          if (joinedPrefix === normalizedBismillah) break;
          if (!normalizedBismillah.startsWith(joinedPrefix)) {
            skipWordCount = 0;
            break;
          }
        }
      }

      let skippedWords = 0;
      for (const word of sourceWords) {
        const lineNumber = word.line_number;
        if (!lineNumber || !word.text) continue;

        if (skipWordCount && word.char_type_name !== 'end' && skippedWords < skipWordCount) {
          skippedWords += 1;
          continue;
        }

        const token: MushafToken = {
          text: word.text.replace(/^\uFEFF/, ''),
          type: word.char_type_name === 'end' ? 'end' : 'word',
          ayah: baseAyah
        };

        let line = section.lines?.find((entry) => entry.lineNumber === lineNumber);
        if (!line) {
          line = {
            lineNumber,
            lineType: 'ayah',
            isCentered: false,
            justify: true,
            tokens: []
          };
          section.lines?.push(line);
        }

        line.tokens.push(token);
      }
    }

    for (const section of sections) {
      if (!section.lines?.length) continue;
      section.lines.sort((a, b) => a.lineNumber - b.lineNumber);
      const lastIndex = section.lines.length - 1;
      section.lines[lastIndex] = {
        ...section.lines[lastIndex],
        justify: false
      };
    }

    return sections;
  }, [metadata.surahNumber, pageAyahs]);
  const selectedAyahData = contextAyah
    ? userData[String(pageNumber)]?.[String(contextAyah)] || userQuranData[buildAyahKey(contextSurah, contextAyah)] || getAyahData(contextSurah, contextAyah)
    : null;
  const selectedAyahText = selectedAyah?.text || `${displaySurahName} - آية ${contextAyah || activeAyah || 1}`;
  const selectedAyahLabel = selectedAyah?.text || `${displaySurahLabel} - آية ${contextAyah || activeAyah || 1}`;
  const selectedAyahGlobalId = selectedAyah?.number || (contextAyah ? getGlobalAyahId(contextSurah, contextAyah) : 1);
  const getMushafAyahClassName = (ayah: MushafAyah) => {
    const ayahKey = `${ayah.surahNumber}:${ayah.number}`;
    const isSelected = contextAyah === ayah.number && contextSurah === ayah.surahNumber;
    const isActive = activeAyah === ayah.number && metadata.surahNumber === ayah.surahNumber;
    const isPlaying = playingAyahKey === ayahKey || (currentAudioAyah?.surah === ayah.surahNumber && currentAudioAyah?.ayah === ayah.number);

    if (isSelected || isActive || isPlaying) {
      return 'bg-[rgba(177,137,57,0.18)] text-[var(--quran-text)]';
    }

    return '';
  };
  const getMushafAyahStyle = (ayah: MushafAyah) => {
    const storedColor = userData[String(pageNumber)]?.[String(ayah.number)]?.color
      || userQuranData[buildAyahKey(ayah.surahNumber || metadata.surahNumber, ayah.number)]?.color;

    if (storedColor && highlightStyles[storedColor as HighlightColor]) {
      return {
        backgroundColor: highlightStyles[storedColor as HighlightColor].swatch,
        boxShadow: 'inset 0 0 0 1px rgba(122, 92, 29, 0.08)'
      } as React.CSSProperties;
    }

    const themeOverlay = ayahThemes[`${ayah.surahNumber}:${ayah.number}`];
    return themeOverlay ? { backgroundColor: themeOverlay } as React.CSSProperties : undefined;
  };
  const availableTafseers = useMemo(() => {
    const items = [...FALLBACK_TAFSEER_LIST, ...tafseerList];
    return items.filter((source, index, list) => list.findIndex((item) => item.id === source.id) === index);
  }, [tafseerList]);
  const selectedTafseer = availableTafseers.find((source) => source.id === selectedTafseerId);
  const favoriteItems = useMemo(() => {
    return Object.entries(userData).flatMap(([page, ayahs]) =>
      Object.entries(ayahs)
        .filter(([, data]) => Boolean(data.color || data.isBookmarked))
        .map(([ayahId, data]) => {
          const coordinate = sampleCoordinates.find((item) => item.page === Number(page) && String(item.ayahNumber) === ayahId);
          const surahNumber = coordinate?.surahNumber || 0;
          const surahName = surahs.find((surah) => surah.number === surahNumber)?.name || (surahNumber ? `سورة ${surahNumber}` : 'علامة صفحة');
          return { page: Number(page), ayahId, data, surahNumber, surahName };
        })
    ).sort((a, b) => a.page - b.page || Number(a.ayahId) - Number(b.ayahId));
  }, [surahs, userData]);
  const filteredSurahs = useMemo(() => {
    const needle = indexQuery.trim().toLowerCase();
    if (!needle) return surahs;
    return surahs.filter((surah) => `${surah.number} ${surah.name} ${surah.englishName}`.toLowerCase().includes(needle));
  }, [indexQuery, surahs]);
  const filteredJuz = useMemo(() => {
    const needle = indexQuery.trim();
    // Use dynamic juzs if available, mapping firstSurah to startPage
    const source = (juzs && juzs.length > 0) ? juzs.map(j => ({
      number: j.number,
      startPage: quranSurahs.find(s => s.number === j.firstSurahNumber)?.startPage || 1
    })) : quranJuz;

    if (!needle) return source;
    return source.filter((juz) => String(juz.number).includes(needle) || String(juz.startPage).includes(needle));
  }, [indexQuery, juzs]);
  const quranQuarters = useMemo(() => Array.from({ length: 240 }, (_, index) => {
    const quarterNumber = index + 1;
    return {
      number: quarterNumber,
      hizb: Math.floor(index / 4) + 1,
      quarter: (index % 4) + 1,
      startPage: clampPage(Math.floor((index * TOTAL_PAGES) / 240) + 1)
    };
  }), []);
  const filteredQuarters = useMemo(() => {
    const needle = indexQuery.trim();
    if (!needle) return quranQuarters;
    return quranQuarters.filter((quarter) =>
      String(quarter.number).includes(needle) ||
      String(quarter.hizb).includes(needle) ||
      String(quarter.startPage).includes(needle)
    );
  }, [indexQuery, quranQuarters]);
  const referenceItems = useMemo(() => favoriteItems.filter((item) => item.ayahId === '_page' || item.data.isBookmarked), [favoriteItems]);
  const isCurrentPageBookmarked = Boolean(userData[String(pageNumber)]?.['_page']?.isBookmarked);
  const noteItems = useMemo(() => favoriteItems.filter((item) => Boolean(item.data.note)), [favoriteItems]);
  const highlightItems = useMemo(() => favoriteItems.filter((item) => Boolean(item.data.color)), [favoriteItems]);
  const activeReferenceGroup = referenceGroups.find((group) => group.id === activeReferenceGroupId) || referenceGroups[0];
  const activeHighlightGroup = highlightGroups.find((group) => group.id === activeHighlightGroupId) || highlightGroups[0];
  const groupedReferenceItems = useMemo(() => {
    if (!activeReferenceGroup || activeReferenceGroup.id === 'general') return referenceItems;
    const groupItems = new Set(activeReferenceGroup.items);
    return referenceItems.filter((item) => groupItems.has(`page:${item.page}:${item.ayahId}`));
  }, [activeReferenceGroup, referenceItems]);
  const groupedHighlightItems = useMemo(() => {
    if (!activeHighlightGroup || activeHighlightGroup.id === 'general') return highlightItems;
    const groupItems = new Set(activeHighlightGroup.items);
    return highlightItems.filter((item) => groupItems.has(`page:${item.page}:${item.ayahId}`));
  }, [activeHighlightGroup, highlightItems]);
  const filteredGroupedHighlightItems = useMemo(() => {
    if (activeHighlightColor === 'all') return groupedHighlightItems;
    return groupedHighlightItems.filter((item) => item.data.color === activeHighlightColor);
  }, [activeHighlightColor, groupedHighlightItems]);
  const quranStatsDays = useMemo(() => {
    const pagesByDay = readJson<Record<string, number>>(READING_TRACKER_KEY, {});
    const xpByDay = readJson<Record<string, number>>(QURAN_DAILY_XP_KEY, {});

    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - index);
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: date.toLocaleDateString('ar-EG', { weekday: 'long' }),
        date: date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' }),
        pages: pagesByDay[key] || 0,
        xp: xpByDay[key] || 0
      };
    });
  }, [pageNumber, quranXpToast]);
  const quranTotalXp = useMemo(() => readStoredNumber(QURAN_TOTAL_XP_KEY, 0), [quranXpToast]);
  const totalReadPages = useMemo(() => {
    const pagesByDay = readJson<Record<string, number>>(READING_TRACKER_KEY, {});
    return Object.values(pagesByDay).reduce((sum, pages) => sum + pages, 0);
  }, [pageNumber, quranXpToast]);
  const activeWird = useMemo(() => awrad.find((wird) => wird.id === activeWirdId) || null, [activeWirdId, awrad]);
  const visibleAwrad = useMemo(() => awrad.filter((wird) => !hiddenWirdIds.includes(wird.id)), [awrad, hiddenWirdIds]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHafsPageAssets() {
      // 1. If page is already cached in memory, apply instantly with zero delay & no size jumping!
      if (quranSvgCache.has(pageNumber)) {
        const cachedSvg = quranSvgCache.get(pageNumber)!;
        const cachedPolygons = quranPolygonCache.get(pageNumber) || [];
        const parsed = parseSvgViewBox(cachedSvg);
        setSvgViewBox(parsed.viewBox);
        setSvgSize({ width: parsed.width, height: parsed.height });
        const jsonSize = getJsonCoordinateSize(cachedPolygons, parsed);
        setJsonCoordinateSize(jsonSize);

        setSvgMarkup(cachedSvg);
        setPagePolygons(cachedPolygons);
        setIsPageAssetLoading(false);
        prefetchSurroundingPages(pageNumber);

        const first = cachedPolygons[0] || null;
        if (first && first.surahNumber > 0) {
          setMetadata((current) => ({
            ...current,
            surahNumber: first.surahNumber
          }));
        }
        return;
      }

      setIsPageAssetLoading(true);

      try {
        const [cleanedSvg, polygons] = await Promise.all([
          fetchPageSvgCached(pageNumber, controller.signal),
          fetchPagePolygonsCached(pageNumber, controller.signal)
        ]);

        if (!cleanedSvg) throw new Error('SVG not found');

        const parsed = parseSvgViewBox(cleanedSvg);
        setSvgViewBox(parsed.viewBox);
        setSvgSize({ width: parsed.width, height: parsed.height });
        const jsonSize = getJsonCoordinateSize(polygons, parsed);
        setJsonCoordinateSize(jsonSize);

        setSvgMarkup(cleanedSvg);
        setPagePolygons(polygons);

        const first = polygons[0] || null;
        if (first) {
          if (first.surahNumber > 0) {
            setMetadata((current) => ({
              ...current,
              surahNumber: first.surahNumber
            }));
          }
          if (first.ayahNumber > 0) setActiveAyah((current) => current || first.ayahNumber);
        }

        prefetchSurroundingPages(pageNumber);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error(error);
        }
      } finally {
        if (!controller.signal.aborted) setIsPageAssetLoading(false);
      }
    }

    loadHafsPageAssets();
    return () => controller.abort();
  }, [pageNumber]);

  useEffect(() => {
    const controller = new AbortController();

    // Never let coordinates for the new page bind to ayahs retained from the
    // previous page while the metadata request is still in flight.
    setPageAyahs([]);
    setPageLayoutMeta([]);

    // Immediately update metadata from offline static mapping so Header & Footer
    // are ALWAYS 100% correct, instantly on page turn even when offline!
    const staticMeta = getStaticPageMetadata(pageNumber);
    const localSurah = quranSurahs.find((s) => s.number === staticMeta.surahNumber);
    setMetadata({
      surahName: localSurah ? `سورة ${localSurah.name}` : 'المصحف',
      surahNumber: staticMeta.surahNumber,
      juzNumber: staticMeta.juzNumber,
      hizbNumber: staticMeta.hizbNumber,
      hizbQuarter: staticMeta.hizbQuarter
    });

    async function fetchMetadata() {
      try {
        const [pageResponse, layoutResponse] = await Promise.all([
          fetch(`https://api.qurani.ai/gw/qh/v1/page/${pageNumber}?words=true&limit=2000&offset=0`, {
            signal: controller.signal
          }),
          fetch(`https://api.qurani.ai/gw/qh/v1/mushaf-layouts/qpc-v1-15-lines/pages/${pageNumber}`, {
            signal: controller.signal
          })
        ]);
        if (!pageResponse.ok) return;

        const payload = await pageResponse.json();
        const layoutPayload = layoutResponse.ok ? await layoutResponse.json() : null;
        const firstAyah = payload?.data?.ayahs?.[0] as ApiAyah | undefined;
        if (!firstAyah) return;

        setPageAyahs(payload?.data?.ayahs || []);
        setPageLayoutMeta(layoutPayload?.data || []);
        const hizbQuarter = firstAyah.hizbQuarter || staticMeta.hizbQuarter;
        const surahNumber = firstAyah.surah?.number || staticMeta.surahNumber;
        const localSurahName = quranSurahs.find((surah) => surah.number === surahNumber)?.name;
        setMetadata({
          surahName: localSurahName ? `سورة ${localSurahName}` : (localSurah ? `سورة ${localSurah.name}` : 'المصحف'),
          surahNumber,
          juzNumber: firstAyah.juz || staticMeta.juzNumber,
          hizbNumber: Math.max(1, Math.ceil(hizbQuarter / 4)),
          hizbQuarter
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    fetchMetadata();
    setActiveAyah(null);
    setContextAyah(null);
    setTafseerState({ ayahText: '', tafseerText: '', error: '' });
    setNoteDraft('');
    setIsDownloaded(false);
    localStorage.setItem(LAST_READ_PAGE_KEY, String(pageNumber));
    persistPlanProgress(params?.planId, pageNumber);

    return () => controller.abort();
  }, [pageNumber, params?.planId, params?.surah]);

  useEffect(() => {
    if (!isIndexOpen || surahs.length) return;

    async function fetchSurahs() {
      const response = await fetch('https://api.alquran.cloud/v1/surah');
      if (!response.ok) return;
      const payload = await response.json();
      setSurahs(payload?.data || []);
    }

    fetchSurahs();
  }, [isIndexOpen, surahs.length]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchTafseerList() {
      try {
        const response = await fetch(`${TAFSEER_API_BASE}/tafseer`, { signal: controller.signal });
        if (!response.ok) return;
        const payload = await response.json();
        const items = Array.isArray(payload) ? payload : [];
        setTafseerList(items);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    fetchTafseerList();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    updateStatsRef.current = updateStats;
  }, [updateStats]);

  useEffect(() => {
    localStorage.setItem('quranSelectedReciter', selectedReciter);
    localStorage.setItem('quranAudioStartPage', String(audioStartPage));
    localStorage.setItem('quranAudioEndPage', String(audioEndPage));
  }, [audioEndPage, audioStartPage, selectedReciter]);

  useEffect(() => {
    localStorage.setItem(QURAN_AWRAD_KEY, JSON.stringify(awrad));
    if (currentUserId) {
      syncAwradToCloud(currentUserId, awrad);
    }
  }, [awrad, currentUserId]);

  useEffect(() => {
    localStorage.setItem('quranHiddenAwrad', JSON.stringify(hiddenWirdIds));
  }, [hiddenWirdIds]);

  useEffect(() => {
    localStorage.setItem(QURAN_REFERENCE_GROUPS_KEY, JSON.stringify(referenceGroups));
  }, [referenceGroups]);

  useEffect(() => {
    localStorage.setItem(QURAN_HIGHLIGHT_GROUPS_KEY, JSON.stringify(highlightGroups));
  }, [highlightGroups]);

  useEffect(() => {
    localStorage.setItem(QURAN_SAVE_DESTINATION_MODE_KEY, saveDestinationMode);
  }, [saveDestinationMode]);

  useEffect(() => {
    localStorage.setItem('quranTheme', theme);
  }, [theme]);

  useEffect(() => {
    if (params?.planId) {
      setActivePlanId(params.planId);
      setActiveWirdId(null);
    }
  }, [params?.planId]);

  useEffect(() => {
    const refreshStatus = () => setOfflineStatus(getOfflineStatus());
    window.addEventListener('ifaqa-offline-status-updated', refreshStatus);
    window.addEventListener('storage', refreshStatus);
    refreshStatus();

    return () => {
      window.removeEventListener('ifaqa-offline-status-updated', refreshStatus);
      window.removeEventListener('storage', refreshStatus);
    };
  }, []);

  useEffect(() => {
    const viewport = pageViewportRef.current;
    if (!viewport) return;
    const updateViewportSize = () => {
      const styles = window.getComputedStyle(viewport);
      const width = viewport.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      const height = viewport.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
      setViewportSize(current => current.width === width && current.height === height ? current : { width, height });
    };
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(viewport);
    updateViewportSize();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIsPageValidated(false);
    setSecondsOnCurrentPage(0);
    setPageReadProgress(0);

    const interval = window.setInterval(() => {
      setSecondsOnCurrentPage(prev => {
        const nextSec = prev + 1;
        setPageReadProgress(Math.min(100, Math.round((nextSec / 20) * 100)));
        if (nextSec >= 20) {
          window.clearInterval(interval);
        }
        return Math.min(20, nextSec);
      });
    }, 1000);

    const timer = window.setTimeout(() => {
      setIsPageValidated(true);
      setSecondsOnCurrentPage(20);
      setPageReadProgress(100);

      // 1. Persist local page read
      persistReadingProgress(pageNumber);

      // 2. Award XP and credit clan quests
      const awardedPageXp = persistQuranXp(pageNumber, QURAN_PAGE_XP);
      if (awardedPageXp) {
        Promise.resolve(updateStatsRef.current?.(QURAN_PAGE_XP, `قراءة صفحة ${pageNumber} من المصحف`, 'quran')).catch((error) => {
          console.error('Quran XP Error:', error);
        });
        console.log(`[QuranReader] Awarded ${QURAN_PAGE_XP} XP for page ${pageNumber}`);
        if (showPageXpToast) {
          setQuranXpToast({ points: QURAN_PAGE_XP, page: pageNumber });
        }
        // Auto-contribute to clan quests — 1 page per validated read
        const uid = auth.currentUser?.uid;
        if (uid) {
          void clanService.autoContributeClanQuest(uid, 'quran_pages', 1, pageNumber);
        }
      }

      // 3. Update active Clan Khatma Juz bookmark only after 20 seconds of real reading!
      const activeSession = readJson<ActiveClanJuzSession | null>(ACTIVE_CLAN_JUZ_KEY, null);
      if (activeSession && pageNumber >= activeSession.startPage && pageNumber <= activeSession.endPage) {
        localStorage.setItem(`ifaqa_clan_juz_last_page_${activeSession.juzNumber}`, String(pageNumber));
        setClanJuzLastMarkedPage(pageNumber);
      }

      // 4. Track Surah Al-Kahf progress (pages 293 to 304)
      if (pageNumber >= 293 && pageNumber <= 304) {
        try {
          const todayStr = new Date().toISOString().slice(0, 10);
          const kahfPagesKey = `ifaqa_kahf_pages_read_${todayStr}`;
          const currentList: number[] = JSON.parse(localStorage.getItem(kahfPagesKey) || '[]');
          if (!currentList.includes(pageNumber)) {
            currentList.push(pageNumber);
            localStorage.setItem(kahfPagesKey, JSON.stringify(currentList));
          }

          // User completed Surah Al-Kahf:
          // Validated page 304 (end of surah) with >= 6 pages read, OR validated >= 10 pages in the surah range
          const kahfDoneKey = `ifaqa_kahf_completed_${todayStr}`;
          const alreadyDone = localStorage.getItem(kahfDoneKey);
          const isKahfComplete = (pageNumber === 304 && currentList.length >= 6) || currentList.length >= 10;

          if (isKahfComplete && !alreadyDone) {
            localStorage.setItem(kahfDoneKey, 'true');
            localStorage.setItem('kahf_read_date', new Date().toDateString());

            // Check Friday time (Friday all day, or Thursday evening after 17:00)
            const now = new Date();
            const isFriday = now.getDay() === 5 || (now.getDay() === 4 && now.getHours() >= 17);
            const currentUid = auth.currentUser?.uid;
            if (isFriday && currentUid) {
              void clanService.autoContributeClanQuest(currentUid, 'collective_khatma', 1);
              toast.success("تقبل الله! أتممت قراءة سورة الكهف، وتم احتساب مساهمتك في تحدي القبيلة ");
              confetti({
                particleCount: 70,
                spread: 60,
                origin: { y: 0.6 }
              });
            }
          }
        } catch (e) {
          console.warn('[QuranReader] Error tracking Al-Kahf completion:', e);
        }
      }
    }, 20000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
      setIsPageValidated(false);
      setSecondsOnCurrentPage(0);
      setPageReadProgress(0);
    };
  }, [pageNumber, showPageXpToast]);

  useEffect(() => {
    if (!quranXpToast) return;
    const timer = window.setTimeout(() => setQuranXpToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [quranXpToast]);

  useEffect(() => {
    if (!isReadingMode || showSettings || isIndexOpen || isUnifiedSearchOpen || contextAyah || showAudioPlayer) return;

    const timer = window.setTimeout(() => {
      setShowBars(false);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [activityTick, contextAyah, isIndexOpen, isReadingMode, isUnifiedSearchOpen, pageNumber, showAudioPlayer, showSettings]);

  useEffect(() => {
    if (!contextAyah) return;
    setNoteDraft(getAyahData(contextSurah, contextAyah).note);
  }, [contextAyah, contextSurah]);

  // Fetch Ayah Themes for current page from Hub Manager
  useEffect(() => {
    const fetchThemes = async () => {
      const themes: Record<string, string> = {};
      const uniqueSurahs: number[] = Array.from(new Set<number>(pageAyahs.map(a => a.surah?.number || metadata.surahNumber)));
      
      for (const surahId of uniqueSurahs) {
        const surahAyahs = pageAyahs.filter(a => (a.surah?.number || metadata.surahNumber) === surahId);
        for (const a of surahAyahs) {
          const ayahId = Number(a.numberInSurah) || 1;
          const data = await QuranOfflineManager.getAyahDataOffline(surahId, ayahId);
          if (data?.themeColor && data.themeColor !== '#FFFFFF11' && data.themeColor !== '#00000000') {
            themes[`${surahId}:${ayahId}`] = data.themeColor;
          }
        }
      }
      setAyahThemes(themes);
    };

    if (pageAyahs.length > 0) {
      fetchThemes();
    }
  }, [pageAyahs, pageNumber, metadata.surahNumber]);

  useEffect(() => {
    if (!contextAyah) return;

    const timer = window.setTimeout(() => {
      handleSaveNote(noteDraft);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [noteDraft, contextAyah, contextSurah]);

  const imageStyle = useMemo<React.CSSProperties>(() => ({
    ...currentTheme.imageFilter,
    transition: 'filter 240ms ease, opacity 240ms ease'
  }), [currentTheme.imageFilter]);

  const cssVars = {
    '--quran-base': currentTheme.base,
    '--quran-text': currentTheme.text,
    '--quran-muted': currentTheme.muted,
    '--quran-panel': currentTheme.panel,
    '--quran-panel-strong': currentTheme.panelStrong,
    '--quran-accent': currentTheme.accent,
    '--quran-accent-rgb': currentTheme.accentRgb,
    '--quran-accent-text': currentTheme.accentText
  } as React.CSSProperties;

  /**
   * Tracks reader activity so reading mode can hide toolbars after inactivity.
   * It only updates lightweight React state and does not touch localStorage,
   * causing the focus-mode timer to restart without disturbing saved ayah data.
   */
  const registerActivity = () => {
    if (isReadingMode) setActivityTick((current) => current + 1);
  };

  const goToPreviousPage = () => setPageNumber((current) => clampPage(current - 1));
  const goToNextPage = () => setPageNumber((current) => clampPage(current + 1));
  const jumpToPage = (page: number) => {
    const nextPage = clampPage(page);
    if (nextPage !== pageNumber) hapticPageTurn();
    setPageNumber(nextPage);
    setContextAyah(null);
    setShowBars(true);
  };

  const handlePointerSwipeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0) || swipeCommitTimerRef.current) return;

    didSwipeRef.current = false;
    setSwipeTransitionEnabled(false);
    swipeGestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: performance.now(),
      width: Math.max(1, event.currentTarget.clientWidth),
      horizontal: false,
      cancelled: false
    };
  };

  const handlePointerSwipeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = swipeGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.cancelled) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (!gesture.horizontal) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      if (Math.abs(deltaY) >= Math.abs(deltaX)) {
        gesture.cancelled = true;
        return;
      }
      gesture.horizontal = true;
      didSwipeRef.current = true;
      clearLongPress();
      clearPageLongPress();
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    const hasTargetPage = deltaX > 0 ? pageNumber < TOTAL_PAGES : pageNumber > 1;
    setSwipeOffset(hasTargetPage ? deltaX : deltaX * 0.18);
  };

  const finishPointerSwipe = (event: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const gesture = swipeGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    swipeGestureRef.current = null;

    if (!gesture.horizontal || gesture.cancelled) {
      setSwipeOffset(0);
      setSwipeTransitionEnabled(true);
      return;
    }

    const deltaX = event.clientX - gesture.startX;
    const elapsed = Math.max(1, performance.now() - gesture.startedAt);
    const velocity = deltaX / elapsed;
    const targetPage = deltaX > 0 ? pageNumber + 1 : pageNumber - 1;
    const canTurn = targetPage >= 1 && targetPage <= TOTAL_PAGES;
    const shouldTurn = !cancelled && canTurn && (
      Math.abs(deltaX) >= gesture.width * 0.22 ||
      (Math.abs(deltaX) >= 42 && Math.abs(velocity) >= 0.5)
    );

    setSwipeTransitionEnabled(true);
    if (!shouldTurn) {
      setSwipeOffset(0);
      return;
    }

    const direction = deltaX > 0 ? 'next' : 'previous';
    setSwipeOffset(deltaX > 0 ? gesture.width : -gesture.width);
    swipeCommitTimerRef.current = window.setTimeout(() => {
      const target = clampPage(targetPage);
      const cachedMarkup = quranSvgCache.get(target) || neighborSvgMarkup[direction];
      const cachedPolygons = quranPolygonCache.get(target);
      setSwipeTransitionEnabled(false);
      if (cachedMarkup) setSvgMarkup(cachedMarkup);
      if (cachedPolygons) setPagePolygons(cachedPolygons);
      setPageNumber(target);
      setContextAyah(null);
      setSwipeOffset(0);
      swipeCommitTimerRef.current = null;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setSwipeTransitionEnabled(true));
      });
    }, 240);
  };

  const handleReaderClick = () => {
    if (didSwipeRef.current) {
      didSwipeRef.current = false;
      return;
    }
    toggleReaderChrome();
  };

  /**
   * Opens the premium ayah interaction sheet for the chosen ayah.
   * It records the active surah/ayah in React state, reads the ayah's persisted
   * note through `getAyahData`, and makes the toolbar visible so the UI feels
   * intentional instead of hidden behind focus mode.
   */
  const openAyahContext = (surahNumber: number, ayahNumber: number) => {
    hapticSelection();
    const savedData = getAyahData(surahNumber, ayahNumber);
    setActiveAyah(ayahNumber);
    setContextSurah(surahNumber);
    setContextAyah(ayahNumber);
    setNoteDraft(savedData.note);
    setShowBars(true);
  };

  const toggleReaderChrome = () => {
    setShowBars((visible) => {
      const next = !visible;
      if (!next) {
        setContextAyah(null);
        setActiveAyah(null);
      }
      return next;
    });
  };

  const resolveAyahTarget = (element: Element | null) => {
    const textAyah = element?.closest('[data-ayah-number]') as HTMLElement | null;
    if (textAyah) {
      const surahNum = parseInt(textAyah.dataset.surahNumber || textAyah.dataset.surah || '0');
      const ayahNum = parseInt(textAyah.dataset.ayahNumber || textAyah.dataset.ayah || '0');
      if (ayahNum > 0) {
        return { surahNumber: surahNum || metadata.surahNumber, ayahNumber: ayahNum };
      }
    }

    const svgAyah = element?.closest('[data-ayah]') as HTMLElement | null;
    if (svgAyah) {
      const surahNum = parseInt(svgAyah.dataset.surah || '0');
      const ayahNum = parseInt(svgAyah.dataset.ayah || '0');
      if (ayahNum > 0) {
        return { surahNumber: surahNum || metadata.surahNumber, ayahNumber: ayahNum };
      }
    }

    return null;
  };

  /** Opens the audio player and plays a specific ayah directly. */
  const playAudioFromAyah = (surah: number, ayah: number) => {
    playAyah(surah, ayah, false);
    setShowAudioPlayer(true);
    setContextAyah(null);
  };

  const openGroupPickerForAyah = (color = 'yellow') => {
    const surah = activeModalAyah?.surah || contextSurah || metadata.surahNumber;
    const ayah = activeModalAyah?.ayah || contextAyah || 1;
    const ayahData = getAyahData(surah, ayah);
    const apiAyah = getApiAyah(surah, ayah);
    const surahMeta = quranSurahs.find(s => s.number === surah);

    const itemKey = `page:${pageNumber}:${ayah}`;
    const currentGroup = highlightGroups.find(g => g.items.includes(itemKey));

    setGroupPickerData({
      surahNumber: surah,
      ayahNumber: ayah,
      ayahText: apiAyah?.text || '',
      surahName: surahMeta?.name || metadata.surahName,
      selectedColor: color !== 'transparent' ? color : (ayahData.color || 'yellow'),
      currentGroupId: currentGroup?.id || 'general',
      currentNote: ayahData.note || ''
    });
    setShowGroupPicker(true);
  };

  const handleColorChange = (color: HighlightColor) => {
    if (!contextAyah) return;
    if (color === 'transparent') {
      const next = saveAyahData(contextSurah, contextAyah, { color: '' });
      const nextPageData = savePageAyahData(pageNumber, contextAyah, { color: '', isBookmarked: false });
      removeItemFromGroups('highlights', `page:${pageNumber}:${contextAyah}`);
      setUserQuranData(next);
      setUserData(nextPageData);
      toast.success('تمت إزالة التظليل');
      return;
    }
    openGroupPickerForAyah(color);
  };

  /**
   * Persists the current note draft for the active ayah.
   */
  const handleSaveNote = (note: string) => {
    if (!contextAyah) return;
    const next = saveAyahData(contextSurah, contextAyah, { note });
    const nextPageData = savePageAyahData(pageNumber, contextAyah, { note });
    setUserQuranData(next);
    setUserData(nextPageData);
  };

  const handleHighlight = (color: string | null) => {
    if (!contextAyah) return;
    if (color === 'transparent' || !color) {
      const next = saveAyahData(contextSurah, contextAyah, { color: '' });
      const nextPageData = savePageAyahData(pageNumber, contextAyah, { color: '' });
      removeItemFromGroups('highlights', `page:${pageNumber}:${contextAyah}`);
      setUserQuranData(next);
      setUserData(nextPageData);
      toast.success('تمت إزالة التظليل');
      return;
    }
    openGroupPickerForAyah(color);
  };

  const handleSaveAyahToGroup = (groupId: string, color: string, note?: string) => {
    if (!groupPickerData) return;
    const { surahNumber, ayahNumber } = groupPickerData;
    const colorValue = color as HighlightColor;
    const next = saveAyahData(surahNumber, ayahNumber, { color: colorValue, note: note || '' });
    const nextPageData = savePageAyahData(pageNumber, ayahNumber, {
      color: colorValue,
      note: note || '',
      isBookmarked: true
    });

    const itemKey = `page:${pageNumber}:${ayahNumber}`;
    removeItemFromGroups('highlights', itemKey);
    addItemToGroupById('highlights', groupId, itemKey);

    setUserQuranData(next);
    setUserData(nextPageData);

    const groupObj = highlightGroups.find(g => g.id === groupId);
    toast.success(`تم حفظ الآية في مجلد "${groupObj?.name || 'العام'}" `);
    setShowGroupPicker(false);
    setGroupPickerData(null);
  };

  const handleCreateGroupFromModal = (name: string): string => {
    const newId = `group-${Date.now()}`;
    const newGroup: QuranGroup = { id: newId, name, items: [] };
    setHighlightGroups(prev => [...prev, newGroup]);
    setActiveHighlightGroupId(newId);
    return newId;
  };

  const isHifzOrReviewWird = (w?: QuranWird | null) => {
    const id = w?.id || activeWird?.id;
    return Boolean(id && ['hifz', 'new_hifz', 'near_review', 'far_review'].includes(id));
  };

  const saveActiveReadingTarget = () => {
    localStorage.setItem(LAST_READ_PAGE_KEY, String(pageNumber));
    localStorage.setItem('lastReadQuranPage', String(pageNumber));
    persistReadingProgress(pageNumber);
    if (activeWird) {
      updateWird(activeWird.id, { currentPage: pageNumber });
    }
    if (activePlanId) {
      persistPlanProgress(activePlanId, pageNumber);
    }
    hapticTap();
  };

  const handleCompleteReadingWird = (wirdToComplete?: QuranWird | null) => {
    const targetWird = wirdToComplete || activeWird || awrad.find(w => w.id === activeWirdId) || awrad.find(w => w.id === 'reading');
    
    // 1. Update wird position to current page
    if (targetWird) {
      updateWird(targetWird.id, { currentPage: pageNumber, startPage: pageNumber });
    }
    
    // 2. If active khatma / plan
    if (activePlanId) {
      persistPlanProgress(activePlanId, pageNumber);
    }
    
    // 3. Save reading position to localStorage & tracker
    localStorage.setItem(LAST_READ_PAGE_KEY, String(pageNumber));
    localStorage.setItem('lastReadQuranPage', String(pageNumber));
    persistReadingProgress(pageNumber);
    
    // 4. Award XP for completing reading wird (100 XP)
    const awardedXp = 100;
    Promise.resolve(updateStatsRef.current?.(awardedXp, `إتمام ورد القراءة (صفحة ${pageNumber})`, 'quran')).catch(() => {});
    persistQuranXp(pageNumber, awardedXp);
    
    // 5. Trigger celebratory confetti
    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6']
    });
    
    // 6. Show toast
    toast.success(` مبارك! تم إتمام ورد القراءة حتى صفحة ${toArabicNumber(pageNumber)} بنجاح (+${awardedXp} نقطة XP)`, {
      duration: 4000
    });
    
    hapticSuccess();
  };

  const openWirdEvaluationForActive = (wirdToEval?: QuranWird | null) => {
    const targetWird = wirdToEval || activeWird || awrad.find(w => w.id === activeWirdId);
    
    // Regular reading wird has no evaluation - only Hifz, Near Review, and Far Review have evaluations!
    if (!targetWird || !['hifz', 'new_hifz', 'near_review', 'far_review'].includes(targetWird.id)) {
      handleCompleteReadingWird(targetWird);
      return;
    }

    setWirdEvaluationTarget({
      id: targetWird.id,
      title: targetWird.title,
      startPage: targetWird.startPage || 1,
      currentPage: pageNumber,
      surahName: metadata.surahName
    });
    setShowWirdEvaluation(true);
  };

  const handleSaveWirdEvaluation = (evaluation: WirdEvaluation) => {
    const nextEvaluations = [evaluation, ...wirdEvaluations];
    setWirdEvaluations(nextEvaluations);
    localStorage.setItem('quranWirdEvaluationsHistory', JSON.stringify(nextEvaluations));

    if (evaluation.wirdId && ['reading', 'hifz', 'near_review', 'far_review'].includes(evaluation.wirdId)) {
      updateWird(evaluation.wirdId as WirdKind, { currentPage: evaluation.endPage, startPage: evaluation.endPage });
    }

    if (activePlanId) {
      persistPlanProgress(activePlanId, evaluation.endPage);
    }

    if (evaluation.xpAwarded > 0) {
      Promise.resolve(updateStatsRef.current?.(evaluation.xpAwarded, `تقييم ورد القرآن: ${evaluation.wirdTitle || 'الورد'}`, 'quran')).catch(() => {});
      persistQuranXp(pageNumber, evaluation.xpAwarded);
    }

    toast.success(` تم تسجيل تقييم ${evaluation.wirdTitle || 'ورد القراءة'} بنجاح! (+${evaluation.xpAwarded} نقطة XP)`, {
      duration: 4000
    });

    setShowWirdEvaluation(false);
    setWirdEvaluationTarget(null);
  };

  const handlePrevAyah = () => {
    if (!contextAyah) return;
    const currentIndex = pagePolygons.findIndex(
      (p) => p.ayahNumber === contextAyah && (p.surahNumber || metadata.surahNumber) === contextSurah
    );
    if (currentIndex > 0) {
      const prev = pagePolygons[currentIndex - 1];
      openAyahContext(prev.surahNumber, prev.ayahNumber);
      return;
    }

    const previousAyahNumber = contextAyah - 1;
    if (previousAyahNumber >= 1) {
      pendingContextAyahRef.current = { surahNumber: contextSurah, ayahNumber: previousAyahNumber };
      jumpToPage(Math.max(1, pageNumber - 1));
      return;
    }

    const previousSurah = quranSurahs.find((surah) => surah.number === contextSurah - 1);
    if (previousSurah) {
      pendingContextAyahRef.current = { surahNumber: previousSurah.number, ayahNumber: previousSurah.ayahCount };
      jumpToPage(Math.max(1, pageNumber - 1));
    }
  };

  const handleNextAyah = () => {
    if (!contextAyah) return;
    const currentIndex = pagePolygons.findIndex(
      (p) => p.ayahNumber === contextAyah && (p.surahNumber || metadata.surahNumber) === contextSurah
    );
    if (currentIndex < pagePolygons.length - 1) {
      const next = pagePolygons[currentIndex + 1];
      openAyahContext(next.surahNumber, next.ayahNumber);
      return;
    }

    const currentSurahMeta = quranSurahs.find((surah) => surah.number === contextSurah);
    if (currentSurahMeta && contextAyah < currentSurahMeta.ayahCount) {
      pendingContextAyahRef.current = { surahNumber: contextSurah, ayahNumber: contextAyah + 1 };
      jumpToPage(Math.min(TOTAL_PAGES, pageNumber + 1));
      return;
    }

    const nextSurah = quranSurahs.find((surah) => surah.number === contextSurah + 1);
    if (nextSurah) {
      pendingContextAyahRef.current = { surahNumber: nextSurah.number, ayahNumber: 1 };
      jumpToPage(Math.min(TOTAL_PAGES, pageNumber + 1));
    }
  };

  const stepModalAyah = (direction: 'prev' | 'next') => {
    const currentSurahNumber = activeModalAyah?.surah || contextSurah;
    const currentAyahNumber = activeModalAyah?.ayah || contextAyah;
    if (!currentSurahNumber || !currentAyahNumber) return;

    const currentSurahMeta = quranSurahs.find((surah) => surah.number === currentSurahNumber);
    if (!currentSurahMeta) return;

    let nextTarget: { surah: number; ayah: number } | null = null;

    if (direction === 'prev') {
      if (currentAyahNumber > 1) {
        nextTarget = { surah: currentSurahNumber, ayah: currentAyahNumber - 1 };
      } else {
        const previousSurah = quranSurahs.find((surah) => surah.number === currentSurahNumber - 1);
        if (previousSurah) {
          nextTarget = { surah: previousSurah.number, ayah: previousSurah.ayahCount };
        }
      }
    } else {
      if (currentAyahNumber < currentSurahMeta.ayahCount) {
        nextTarget = { surah: currentSurahNumber, ayah: currentAyahNumber + 1 };
      } else {
        const nextSurah = quranSurahs.find((surah) => surah.number === currentSurahNumber + 1);
        if (nextSurah) {
          nextTarget = { surah: nextSurah.number, ayah: 1 };
        }
      }
    }

    if (!nextTarget) return;

    setActiveModalAyah(nextTarget);
    setContextSurah(nextTarget.surah);
    setContextAyah(nextTarget.ayah);
    setActiveAyah(nextTarget.ayah);

    const isOnCurrentPage = pageAyahs.some(
      (ayah) => ayah.surah?.number === nextTarget.surah && ayah.numberInSurah === nextTarget.ayah
    );

    if (!isOnCurrentPage) {
      pendingContextAyahRef.current = { surahNumber: nextTarget.surah, ayahNumber: nextTarget.ayah };
      jumpToPage(Math.max(1, Math.min(TOTAL_PAGES, pageNumber + (direction === 'next' ? 1 : -1))));
    }
  };

  /**
   * Toggles bookmark state for the active ayah in persistent storage.
   * It uses the same `userQuranData` object as colors and notes, then updates
   * React state so the bookmark button changes style without a refresh.
   */
  const handleBookmarkAyah = () => {
    if (!contextAyah) return;
    const current = selectedAyahData || getAyahData(contextSurah, contextAyah);
    const next = saveAyahData(contextSurah, contextAyah, { isBookmarked: !current.isBookmarked });
    const nextPageData = savePageAyahData(pageNumber, contextAyah, { isBookmarked: !current.isBookmarked });
    if (!current.isBookmarked) {
      addItemToGroupById('references', chooseGroupForSave('references'), `page:${pageNumber}:${contextAyah}`);
    }
    setUserQuranData(next);
    setUserData(nextPageData);
  };

  /**
   * Copies the selected ayah text to the system clipboard.
   * It does not write localStorage; it only updates the user's clipboard and
   * keeps the modal open so the user can continue annotating.
   */
  const handleCopyAyah = async () => {
    await navigator.clipboard.writeText(selectedAyahLabel);
  };

  /**
   * Shares the selected ayah text using the Web Share API when available.
   * This function does not mutate localStorage; it exposes the current ayah
   * content and app URL to native share targets, with clipboard fallback.
   */
  const handleShareAyah = async () => {
    const shareText = selectedAyahLabel;
    if (navigator.share) {
      await navigator.share({ title: `${displaySurahLabel} - آية ${contextAyah}`, text: shareText });
    } else {
      await navigator.clipboard.writeText(shareText);
    }
  };

  const handleTafseerChange = (tafseerId: number) => {
    setSelectedTafseerId(tafseerId);
    localStorage.setItem(PREFERRED_TAFSEER_KEY, String(tafseerId));
  };

  const getSurahAudioCacheKey = (reciterId = selectedReciter, surahNumber = metadata.surahNumber) => {
    return `${reciterId}:${surahNumber}`;
  };

  const fetchSurahAudioData = async (surahNumber: number, reciterId = selectedReciter) => {
    const reciter = readerReciters.find((item) => item.id === reciterId) || RECITERS.find((item) => item.id === reciterId) || RECITERS[0];

    if (reciter.hubReciter) {
      const supportsSurah = (moshaf: any) => String(moshaf?.surah_list || '')
        .split(',')
        .map(Number)
        .includes(surahNumber);
      const availableMoshafs = reciter.hubReciter.moshaf.filter(supportsSurah);
      const moshaf = availableMoshafs.find((item) => /حفص/.test(item.name)) || availableMoshafs[0];
      if (!moshaf?.server) return null;
      const server = moshaf.server.endsWith('/') ? moshaf.server : `${moshaf.server}/`;
      const audioUrl = `${server}${String(surahNumber).padStart(3, '0')}.mp3`;
      let timestamps: Array<{ verse_key: string; timestamp_from: number; timestamp_to: number }> = [];
      try {
        const timingResponse = await fetch(`https://mp3quran.net/api/v3/ayat_timing?surah=${surahNumber}&read=${moshaf.id}`);
        if (timingResponse.ok) {
          const timingPayload = await timingResponse.json();
          timestamps = (Array.isArray(timingPayload) ? timingPayload : [])
            .filter((item: any) => Number(item?.ayah) > 0)
            .map((item: any) => ({
              verse_key: `${surahNumber}:${Number(item.ayah)}`,
              timestamp_from: Number(item.start_time) || 0,
              timestamp_to: Number(item.end_time) || 0,
            }));
        }
      } catch (error) {
        console.warn(`تعذر جلب توقيت الآيات للقارئ ${reciter.name}:`, error);
      }
      return { audioUrl, timestamps, hasAyahTiming: timestamps.length > 0, source: 'mp3quran' as const };
    }

    if (!reciter.quranComId) return null;
    const response = await fetch(`https://api.quran.com/api/v4/chapter_recitations/${reciter.quranComId}/${surahNumber}?segments=true`);
    if (!response.ok) return null;

    const payload = await response.json();
    const audioFile = payload?.audio_file;
    const timestamps = Array.isArray(audioFile?.timestamps) ? audioFile.timestamps : [];
    return {
      audioUrl: audioFile?.audio_url || payload?.audio_files?.[0]?.audio_url || '',
      timestamps,
      hasAyahTiming: timestamps.length > 0,
      source: 'quran-com' as const,
    };
  };

  const fetchSurahAudioUrl = async (reciterId = selectedReciter, surahNumber = metadata.surahNumber) => {
    const audioData = await fetchSurahAudioData(surahNumber, reciterId);
    return audioData?.audioUrl || '';
  };

  const handleOfflineDownload = async (key: OfflinePackKey) => {
    setOfflineError('');
    const label = key === 'quranMushaf' ? 'تحميل المصحف' : 'تحميل التفسير';
    setOfflineDownload({ key, progress: 0, label });

    try {
      const onProgress = (done: number, total: number) => {
        setOfflineDownload({ key, label, progress: Math.round((done / total) * 100) });
      };

      if (key === 'quranMushaf') {
        await downloadQuranMushafOffline(onProgress);
      } else {
        await downloadTafseerOffline(onProgress);
      }
      setOfflineStatus(getOfflineStatus());
    } catch (error) {
      console.error('Offline Download Error:', error);
      setOfflineError('تعذر التحميل الآن. تأكد من الاتصال ثم حاول مرة أخرى.');
    } finally {
      window.setTimeout(() => setOfflineDownload(null), 600);
    }
  };

  const handleDownloadAllReciterAudio = async () => {
    setOfflineError('');
    setAudioOfflineDownload({ progress: 0, label: 'تحميل أصوات الشيوخ' });

    try {
      let done = 0;

      for (const reciter of RECITERS) {
        const url = await fetchSurahAudioUrl(reciter.id);
        if (url) {
          await downloadAudioForOffline(getSurahAudioCacheKey(reciter.id), url);
        }

        done += 1;
        setAudioOfflineDownload({
          progress: Math.round((done / RECITERS.length) * 100),
          label: reciter.name,
        });
      }
    } catch (error) {
      console.error('Audio Offline Download Error:', error);
      setOfflineError('تعذر تحميل أصوات الشيوخ الآن. تأكد من الاتصال ثم حاول مرة أخرى.');
    } finally {
      window.setTimeout(() => setAudioOfflineDownload(null), 600);
    }
  };

  /**
   * Fetches verse details and tafseer from the selected quran-tafseer.com source,
   * falling back to AlQuran Cloud's Muyassar edition when the primary service is unavailable.
   */
  const fetchTafsir = async (surahNumber: number, ayahNumber: number, tafseerId: number) => {
    setIsTafsirLoading(true);
    setTafseerState({ ayahText: '', tafseerText: '', error: '' });

    try {
      let ayahText = '';
      let tafseerText = '';

      const fetchFallbackTafseer = async () => {
        const cachedTafseer = await getCachedMuyassarAyah(surahNumber, ayahNumber);
        if (cachedTafseer) {
          ayahText = selectedAyahLabel;
          tafseerText = cachedTafseer;
          return;
        }

        const fallbackResponse = await fetchWithTimeout(
          `https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}/ar.muyassar`
        );

        if (!fallbackResponse.ok) throw new Error('tafseer-fallback-request-failed');

        const jsonResponse = await fallbackResponse.json();
        ayahText = selectedAyahLabel;
        tafseerText = jsonResponse?.data?.text || '';
      };

      try {
        const [verseResponse, tafseerResponse] = await Promise.all([
          fetchWithTimeout(`${TAFSEER_API_BASE}/quran/${surahNumber}/${ayahNumber}`),
          fetchWithTimeout(`${TAFSEER_API_BASE}/tafseer/${tafseerId}/${surahNumber}/${ayahNumber}`)
        ]);

        if (!verseResponse.ok || !tafseerResponse.ok) {
          throw new Error('tafseer-request-failed');
        }

        const [versePayload, tafseerPayload] = await Promise.all([
          verseResponse.json(),
          tafseerResponse.json()
        ]);

        ayahText = versePayload?.text || versePayload?.ayah_text || versePayload?.verse || '';
        tafseerText = tafseerPayload?.text || tafseerPayload?.tafseer || tafseerPayload?.content || '';

        if (!tafseerText) {
          throw new Error('tafseer-empty-response');
        }
      } catch (primaryError) {
        console.error('Tafseer Error:', primaryError);
        await fetchFallbackTafseer();
      }

      if (!tafseerText) {
        throw new Error('tafseer-empty-response');
      }

      setTafseerState({
        ayahText,
        tafseerText,
        error: ''
      });
    } catch (error) {
      console.error('Tafseer Error:', error);
      setTafseerState({
        ayahText: selectedAyahLabel,
        tafseerText: '',
        error: 'تعذر تحميل التفسير الآن. تحقق من الاتصال أو جرّب مصدرًا آخر.'
      });
    } finally {
      setIsTafsirLoading(false);
    }
  };

  const toggleBookmark = () => {
    const bookmarks = readJson<number[]>(BOOKMARKS_KEY, []);
    const next = bookmarks.includes(pageNumber)
      ? bookmarks.filter((page) => page !== pageNumber)
      : [...bookmarks, pageNumber].sort((a, b) => a - b);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
    if (currentUserId) {
      syncBookmarksToCloud(currentUserId, next);
    }
  };

  const bookmarkCurrentPageFallback = () => {
    const current = getPageAyahData(pageNumber, '_page');
    const nextPageData = savePageAyahData(pageNumber, '_page', {
      isBookmarked: !current.isBookmarked,
      note: current.note || 'Page bookmark',
      color: current.color || (!current.isBookmarked ? 'yellow' : '')
    });
    if (!current.isBookmarked) {
      addItemToGroupById('references', chooseGroupForSave('references'), `page:${pageNumber}:_page`);
    }
    setUserData(nextPageData);
    if (currentUserId) {
      syncBookmarksToCloud(currentUserId, undefined, undefined, nextPageData);
    }
  };

  const downloadCurrentPage = () => {
    const link = document.createElement('a');
    link.href = svgAssetPath;
    link.download = `quran-page-${formattedPage}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setIsDownloaded(true);
  };

  const openSurah = async (surah: SurahItem) => {
    let firstPage = surah.firstPage || quranSurahs.find((item) => item.number === surah.number)?.startPage;

    if (!firstPage) {
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/quran-uthmani`);
      if (response.ok) {
        const payload = await response.json();
        firstPage = payload?.data?.ayahs?.[0]?.page;
      }
    }

    if (firstPage) {
      jumpToPage(firstPage);
      setIsIndexOpen(false);
      setIndexQuery('');
    }
  };

  const loadAudio = async () => {
    setShowAudioPlayer(true);
    if (audioUrl || isAudioLoading) return;

    setIsAudioLoading(true);
    try {
      const url = await fetchSurahAudioUrl();
      setAudioUrl(url ? await getAudioUrl(getSurahAudioCacheKey(), url) : '');
    } finally {
      setIsAudioLoading(false);
    }
  };

  /**
   * Cancels a pending long-press timer for ayah overlays.
   * This protects the UI from accidentally opening the bottom sheet after a
   * normal tap, without reading or writing localStorage.
   */
  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const playCurrentPageAudio = async () => {
    setShowAudioPlayer(true);
    if (isPageAudioPlaying) {
      pausePageAudio();
      return;
    }

    if (shouldUseNativeQuranAudio() && audioUrl) {
      setIsAudioLoading(true);
      try {
        await nativeQuranAudio.play();
        setIsPageAudioPlaying(true);
      } finally {
        setIsAudioLoading(false);
      }
      return;
    }

    if (pageAudioRef.current) {
      setIsAudioLoading(true);
      try {
        await pageAudioRef.current.play();
        setIsPageAudioPlaying(true);
      } finally {
        setIsAudioLoading(false);
      }
      return;
    }

    pageAudioRef.current?.pause();
    setIsAudioLoading(true);

    try {
      const url = await fetchSurahAudioUrl();
      if (!url) return;

      const playableUrl = await getAudioUrl(getSurahAudioCacheKey(), url);
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = null;
      }
      if (playableUrl.startsWith('blob:')) {
        audioObjectUrlRef.current = playableUrl;
      }

      setAudioUrl(playableUrl);
      setAudioCurrentTime(0);
      setAudioDuration(0);

      if (shouldUseNativeQuranAudio()) {
        const surahMeta = quranSurahs.find(item => item.number === metadata.surahNumber);
        const title = `سورة ${surahMeta?.name || 'القرآن الكريم'}`;
        const artist = readerReciters.find(r => r.id === selectedReciterRef.current)?.name || RECITERS.find(r => r.id === selectedReciterRef.current)?.name || 'القارئ';
        const targetUrl = (playableUrl && !playableUrl.startsWith('blob:')) ? playableUrl : url;
        await nativeQuranAudio.playUrl({
          url: targetUrl,
          title,
          artist,
          album: 'المصحف الشريف',
          speed: 1,
          position: 0
        });
        setIsPageAudioPlaying(true);
        return;
      }

      const audio = new Audio(playableUrl);
      pageAudioRef.current = audio;
      if ('mediaSession' in navigator) {
        const surahMeta = quranSurahs.find(item => item.number === metadata.surahNumber);
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `سورة ${surahMeta?.name || 'القرآن الكريم'}`,
          artist: readerReciters.find(r => r.id === selectedReciterRef.current)?.name || RECITERS.find(r => r.id === selectedReciterRef.current)?.name || 'القارئ',
          album: 'المصحف الشريف',
        });
        navigator.mediaSession.setActionHandler('play', () => { audio.play(); setIsPageAudioPlaying(true); });
        navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); setIsPageAudioPlaying(false); });
      }
      audio.ontimeupdate = () => setAudioCurrentTime(audio.currentTime);
      audio.onloadedmetadata = () => setAudioDuration(audio.duration);
      audio.onended = () => {
        if (repeatPageAudio) {
          audio.currentTime = 0;
          audio.play();
          return;
        }
        setIsPageAudioPlaying(false);
      };
      audio.onerror = () => setIsPageAudioPlaying(false);
      setIsPageAudioPlaying(true);
      await audio.play();
    } finally {
      setIsAudioLoading(false);
    }
  };

  const stopPageAudio = () => {
    audioPlaybackSessionRef.current += 1;
    if (shouldUseNativeQuranAudio()) {
      void nativeQuranAudio.stop();
    }
    disposeAudioInstance(pageAudioRef.current);
    pageAudioRef.current = null;
    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
    }
    setIsPageAudioPlaying(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    // NOTE: Do NOT clear playingAyahKey here - playAyah will set the new one
  };

  const pausePageAudio = () => {
    if (shouldUseNativeQuranAudio()) {
      void nativeQuranAudio.pause();
    }
    pageAudioRef.current?.pause();
    setIsPageAudioPlaying(false);
  };

  const seekPageAudio = (time: number) => {
    if (shouldUseNativeQuranAudio()) {
      void nativeQuranAudio.seek(time);
      setAudioCurrentTime(time);
      return;
    }
    if (!pageAudioRef.current) return;
    pageAudioRef.current.currentTime = time;
    setAudioCurrentTime(time);
  };

  const handleAudioSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!audioDuration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    seekPageAudio(audioDuration * ratio);
  };

  const changeAudioSpeed = (speed: number) => {
    setAudioSpeed(speed);
    audioSpeedRef.current = speed;
    if (pageAudioRef.current) {
      pageAudioRef.current.playbackRate = speed;
    }
    if (shouldUseNativeQuranAudio()) {
      void nativeQuranAudio.setSpeed(speed).catch(() => {});
    }
  };

  const playAyah = async (surah: number, ayah: number, continuous = true) => {
    try {
      audioPlaybackSessionRef.current += 1;
      const playbackSessionId = audioPlaybackSessionRef.current;
      disposeAudioInstance(pageAudioRef.current);
      pageAudioRef.current = null;
      currentRepeatIterationRef.current = 1;

      const ayahKey = `${surah}:${ayah}`;
      const reciterId = selectedReciterRef.current;
      const reciter = readerReciters.find(r => r.id === reciterId) || RECITERS.find(r => r.id === reciterId) || RECITERS[0];
      playbackModeRef.current = continuous ? 'surah' : 'single';
      playbackStartAyahKeyRef.current = ayahKey;
      singlePlaybackStopHandledRef.current = false;

      updatePlayingAyahKey(ayahKey);
      setShowAudioPlayer(true);
      setIsAudioLoading(true);
      setContextAyah(null);
      setShowBars(true);

      const tryPlay = async (audioUrl: string, startTime = 0) => {
        if (shouldUseNativeQuranAudio()) {
          const surahMeta = quranSurahs.find(item => item.number === surah);
          const title = `سورة ${surahMeta?.name || surah} - آية ${ayah}`;
          const artist = reciter.name || 'القارئ';
          const album = `المصحف الشريف · سورة ${surahMeta?.name || surah}`;
          const targetUrl = (audioUrl && !audioUrl.startsWith('blob:')) ? audioUrl : (surahAudioData?.audioUrl || audioUrl);
          await nativeQuranAudio.playUrl({
            url: targetUrl,
            title,
            artist,
            album,
            speed: audioSpeedRef.current,
            position: startTime
          });
          setIsPageAudioPlaying(true);
          setIsAudioLoading(false);
          return;
        }

        return new Promise<void>((resolve, reject) => {
          const audio = new Audio();
          audio.preload = "auto";
          audio.src = audioUrl;
          audio.playbackRate = audioSpeedRef.current;
          pageAudioRef.current = audio;

          if ('mediaSession' in navigator) {
            const surahMeta = quranSurahs.find(item => item.number === surah);
            navigator.mediaSession.metadata = new MediaMetadata({
              title: `سورة ${surahMeta?.name || surah} - آية ${ayah}`,
              artist: reciter.name || 'القارئ',
              album: `المصحف الشريف · سورة ${surahMeta?.name || surah}`,
            });
            navigator.mediaSession.setActionHandler('play', () => { audio.play(); setIsPageAudioPlaying(true); });
            navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); setIsPageAudioPlaying(false); });
          }

          audio.onplay = () => {
            if (playbackSessionId !== audioPlaybackSessionRef.current) return;
            setIsPageAudioPlaying(true);
          };
          audio.onpause = () => {
            if (playbackSessionId !== audioPlaybackSessionRef.current) return;
            setIsPageAudioPlaying(false);
          };

          let timedOut = false;
          const currentTimeout = window.setTimeout(() => {
            timedOut = true;
            disposeAudioInstance(audio);
            reject(new Error("Timeout"));
          }, 10000);

          audio.oncanplay = () => {
            if (timedOut || playbackSessionId !== audioPlaybackSessionRef.current) return;
            window.clearTimeout(currentTimeout);
            setIsAudioLoading(false);
            audio.playbackRate = audioSpeedRef.current;
            if (startTime > 0 && Math.abs(audio.currentTime - startTime) > 1) {
              audio.currentTime = startTime;
            }
            audio.play()
              .then(() => resolve())
              .catch(err => reject(err));
          };

          audio.onerror = () => {
            window.clearTimeout(currentTimeout);
            if (playbackSessionId !== audioPlaybackSessionRef.current) return;
            reject(new Error("Audio Error"));
          };

          audio.onended = () => {
            if (playbackSessionId !== audioPlaybackSessionRef.current) return;
            setIsPageAudioPlaying(false);
            const currentRepeatMode = audioRepeatModeRef.current;
            const currentRange = audioRangeRef.current;
            const currentKey = playingAyahKeyRef.current || `${surah}:${ayah}`;
            const [s, a] = currentKey.split(':').map(Number);
            const isAtRangeEnd = currentRange && a >= currentRange.end;

            if (currentRepeatMode === 'ayah') {
              const targetCount = repeatCountTargetRef.current;
              // targetCount === 0 means infinite repetition
              if (targetCount === 0 || currentRepeatIterationRef.current < targetCount) {
                currentRepeatIterationRef.current += 1;
                if (surahAudioRef.current && pageAudioRef.current?.src === surahAudioRef.current.url) {
                  const repeatedSegment = surahAudioRef.current.timestamps.find(t => t.verse_key === currentKey);
                  if (repeatedSegment) {
                    pageAudioRef.current.currentTime = repeatedSegment.timestamp_from / 1000;
                    pageAudioRef.current.playbackRate = audioSpeedRef.current;
                    pageAudioRef.current.play().catch(() => {});
                    return;
                  }
                }
                playAyah(surah, ayah, continuous);
                return;
              }
              currentRepeatIterationRef.current = 1;
              if (continuous) {
                const nextAyah = a + 1;
                const currentSurahMeta = quranSurahs.find(item => item.number === s);
                if (nextAyah <= (currentSurahMeta?.ayahCount || 286)) {
                  playAyah(s, nextAyah, true);
                } else if (s < 114) {
                  playAyah(s + 1, 1, true);
                } else {
                  setShowAudioPlayer(false);
                  updatePlayingAyahKey(null);
                }
              }
              return;
            } else if (currentRepeatMode === 'range' && isAtRangeEnd) {
              playAyah(surah, currentRange?.start || 1, true);
            } else if (continuous) {
              if (surahAudioRef.current && pageAudioRef.current?.src === surahAudioRef.current.url) {
                if (isAtRangeEnd) {
                  pageAudioRef.current.pause();
                  setShowAudioPlayer(false);
                  updatePlayingAyahKey(null);
                  toast.success('تم الانتهاء من النطاق المحدد');
                }
                return;
              }

              if (isAtRangeEnd) {
                setShowAudioPlayer(false);
                updatePlayingAyahKey(null);
                toast.success('تم الانتهاء من النطاق المحدد');
              } else {
                const nextAyah = a + 1;
                const currentSurahMeta = quranSurahs.find(item => item.number === s);
                if (nextAyah <= (currentSurahMeta?.ayahCount || 286)) {
                  playAyah(s, nextAyah, true);
                } else if (s < 114) {
                  playAyah(s + 1, 1, true);
                } else {
                  setShowAudioPlayer(false);
                  updatePlayingAyahKey(null);
                }
              }
            }
          };

          audio.ontimeupdate = () => {
            if (playbackSessionId !== audioPlaybackSessionRef.current) return;
            setAudioCurrentTime(audio.currentTime);

            if (surahAudioRef.current && audio.src === surahAudioRef.current.url) {
              const ms = audio.currentTime * 1000;
              const targetAyahKey = playbackStartAyahKeyRef.current || ayahKey;

              if (playbackModeRef.current === 'single') {
                const targetSegment = surahAudioRef.current.timestamps.find(t => t.verse_key === targetAyahKey);
                if (playingAyahKeyRef.current !== targetAyahKey) {
                  updatePlayingAyahKey(targetAyahKey);
                }
                if (!targetSegment) return;

                const segmentEndMs = Math.max(targetSegment.timestamp_to - 50, targetSegment.timestamp_from);
                if (ms >= segmentEndMs) {
                  if (audioRepeatModeRef.current === 'ayah') {
                    audio.currentTime = targetSegment.timestamp_from / 1000;
                    setAudioCurrentTime(audio.currentTime);
                    return;
                  }

                  if (!singlePlaybackStopHandledRef.current) {
                    singlePlaybackStopHandledRef.current = true;
                    audio.pause();
                    audio.currentTime = targetSegment.timestamp_to / 1000;
                    setAudioCurrentTime(audio.currentTime);
                    updatePlayingAyahKey(targetAyahKey);
                    setIsPageAudioPlaying(false);
                  }
                } else {
                  singlePlaybackStopHandledRef.current = false;
                }
                return;
              }

              singlePlaybackStopHandledRef.current = false;
              const currentSegment = surahAudioRef.current.timestamps.find(t => ms >= t.timestamp_from && ms < t.timestamp_to);
              if (currentSegment && currentSegment.verse_key !== playingAyahKeyRef.current) {
                updatePlayingAyahKey(currentSegment.verse_key);
              }

              if (audioRepeatModeRef.current === 'ayah') {
                const currentAyahSegment = surahAudioRef.current.timestamps.find(t => t.verse_key === playingAyahKeyRef.current);
                if (currentAyahSegment && ms >= currentAyahSegment.timestamp_to) {
                  audio.currentTime = currentAyahSegment.timestamp_from / 1000;
                  setAudioCurrentTime(audio.currentTime);
                }
              }
            }
          };

          audio.onloadedmetadata = () => {
            if (playbackSessionId !== audioPlaybackSessionRef.current) return;
            setAudioDuration(audio.duration);
          };
          audio.load();
        });
      };

      const cachedSurahAudio = surahAudioRef.current;
      const cachedSegment = cachedSurahAudio?.surah === surah && cachedSurahAudio.reciter === reciterId
        ? cachedSurahAudio.timestamps.find(t => t.verse_key === ayahKey)
        : null;

      if (cachedSurahAudio && cachedSegment) {
        pageAudioRef.current?.pause();
        setAudioUrl(cachedSurahAudio.url);
        setAudioCurrentTime(cachedSegment.timestamp_from / 1000);
        await tryPlay(cachedSurahAudio.url, cachedSegment.timestamp_from / 1000);
        return;
      }

      let url = '';
      let startTime = 0;
      const surahAudioData = await fetchSurahAudioData(surah, reciterId);
      const targetSegment = surahAudioData?.timestamps?.find((item: any) => item.verse_key === ayahKey);

      if (surahAudioData?.audioUrl && targetSegment) {
        url = await getAudioUrl(getSurahAudioCacheKey(reciterId, surah), surahAudioData.audioUrl);
        startTime = targetSegment.timestamp_from / 1000;
        surahAudioRef.current = {
          url,
          timestamps: surahAudioData.timestamps,
          surah,
          reciter: reciterId,
        };
      } else if (surahAudioData?.audioUrl && reciter.hubReciter) {
        url = await getAudioUrl(getSurahAudioCacheKey(reciterId, surah), surahAudioData.audioUrl);
        startTime = 0;
        surahAudioRef.current = {
          url,
          timestamps: [],
          surah,
          reciter: reciterId,
        };
        toast('لا يتوفر توقيت الآيات لهذه التلاوة؛ سيبدأ التشغيل من أول السورة');
      } else {
        surahAudioRef.current = null;
      }

      if (!url) {
        const s = String(surah).padStart(3, '0');
        const a = String(ayah).padStart(3, '0');
        const directReciters: Record<number, string> = {
          7: 'Alafasy_128kbps',
          5: 'Husary_128kbps',
          2: 'AbdulSamad_64kbps',
          6: 'Minshawy_Murattal_128kbps',
          12: 'Ahmed_al_Ajamy_128kbps',
          8: 'Maher_AlMuaiqly_64kbps'
        };
        const folder = directReciters[reciter.quranComId || 0] || 'Alafasy_128kbps';
        url = `https://everyayah.com/data/${folder}/${s}${a}.mp3`;
      }

      if (url && !url.startsWith('http') && !url.startsWith('blob:')) {
        url = `https:${url}`;
      }

      setAudioUrl(url);

      try {
        await tryPlay(url, startTime);
      } catch (err) {
        console.warn("Primary audio source failed, trying fallback...", err);
        const s = String(surah).padStart(3, '0');
        const a = String(ayah).padStart(3, '0');
        const directReciters: Record<number, string> = {
          7: 'Alafasy_128kbps',
          5: 'Husary_128kbps',
          2: 'AbdulSamad_64kbps',
          6: 'Minshawy_Murattal_128kbps',
          12: 'Ahmed_al_Ajamy_128kbps',
          8: 'Maher_AlMuaiqly_64kbps'
        };
        const folder = directReciters[reciter.quranComId || 0] || 'Alafasy_128kbps';
        const fallbackUrl = `https://everyayah.com/data/${folder}/${s}${a}.mp3`;

        try {
          surahAudioRef.current = null;
          setAudioUrl(fallbackUrl);
          await tryPlay(fallbackUrl);
        } catch (finalErr) {
          console.error("All audio sources failed:", finalErr);
          setIsAudioLoading(false);
          toast.error('فشل تشغيل الصوت. حاول مرة أخرى أو اختر قارئًا آخر');
        }
      }

    } catch (e) {
      console.error("PlayAyah Error:", e);
      setIsAudioLoading(false);
      setIsPageAudioPlaying(false);
    }
  };
  const playAyahRef = useRef(playAyah);
  useEffect(() => { playAyahRef.current = playAyah; });

  useEffect(() => {
    const handleRequest = (e: any) => {
      const { surah, ayah, mode } = e.detail;
      setContextAyah(null);
      setShowBars(true);
      playAyahRef.current(surah, ayah, mode === 'surah');
    };
    window.addEventListener('play_ayah_request', handleRequest);
    return () => window.removeEventListener('play_ayah_request', handleRequest);
  }, []);

  useEffect(() => {
    if (!shouldUseNativeQuranAudio()) return;

    let stateHandle: any = null;
    let completedHandle: any = null;

    nativeQuranAudio.listen((state) => {
      setIsPageAudioPlaying(state.isPlaying);
      setIsAudioLoading(state.isBuffering);
      setAudioCurrentTime(state.currentTime);
      if (state.duration > 0) {
        setAudioDuration(state.duration);
      }

      if (surahAudioRef.current && surahAudioRef.current.timestamps) {
        const ms = state.currentTime * 1000;
        const currentSegment = surahAudioRef.current.timestamps.find((t: any) => ms >= t.timestamp_from && ms < t.timestamp_to);
        if (currentSegment && currentSegment.verse_key !== playingAyahKeyRef.current) {
          updatePlayingAyahKey(currentSegment.verse_key);
        }
      }
    }).then((h) => { stateHandle = h; }).catch(() => {});

    nativeQuranAudio.onCompleted(() => {
      setIsPageAudioPlaying(false);
      const currentRepeatMode = audioRepeatModeRef.current;
      const currentRange = audioRangeRef.current;
      const currentKey = playingAyahKeyRef.current;
      if (!currentKey) return;
      const [s, a] = currentKey.split(':').map(Number);
      const isAtRangeEnd = currentRange && a >= currentRange.end;

      if (currentRepeatMode === 'ayah') {
        playAyahRef.current(s, a, playbackModeRef.current === 'surah');
      } else if (currentRepeatMode === 'range' && isAtRangeEnd) {
        playAyahRef.current(s, currentRange?.start || 1, true);
      } else if (playbackModeRef.current === 'surah') {
        if (isAtRangeEnd) {
          setShowAudioPlayer(false);
          updatePlayingAyahKey(null);
          toast.success('تم الانتهاء من النطاق المحدد');
        } else {
          const nextAyah = a + 1;
          const currentSurahMeta = quranSurahs.find(item => item.number === s);
          if (nextAyah <= (currentSurahMeta?.ayahCount || 286)) {
            playAyahRef.current(s, nextAyah, true);
          } else if (s < 114) {
            playAyahRef.current(s + 1, 1, true);
          } else {
            setShowAudioPlayer(false);
            updatePlayingAyahKey(null);
          }
        }
      }
    }).then((h) => { completedHandle = h; }).catch(() => {});

    return () => {
      if (stateHandle?.remove) stateHandle.remove();
      if (completedHandle?.remove) completedHandle.remove();
    };
  }, []);

  const updateWird = (id: WirdKind, patch: Partial<QuranWird>) => {
    setAwrad((items) => items.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item));
  };

  const deleteWird = (id: WirdKind) => {
    setHiddenWirdIds((items) => items.includes(id) ? items : [...items, id]);
    if (activeWirdId === id) setActiveWirdId(null);
  };

  const restoreDefaultAwrad = () => {
    setHiddenWirdIds([]);
  };

  const addQuranGroup = (kind: 'references' | 'highlights') => {
    const name = window.prompt(kind === 'references' ? 'اسم مجموعة المرجعيات' : 'اسم مجموعة الفواصل');
    if (!name?.trim()) return;

    const group = { id: `group-${Date.now()}`, name: name.trim(), items: [] };
    if (kind === 'references') {
      setReferenceGroups((groups) => [...groups, group]);
      setActiveReferenceGroupId(group.id);
    } else {
      setHighlightGroups((groups) => [...groups, group]);
      setActiveHighlightGroupId(group.id);
    }
  };

  const addItemToGroup = (kind: 'references' | 'highlights', itemKey: string) => {
    const activeId = kind === 'references' ? activeReferenceGroupId : activeHighlightGroupId;
    const setter = kind === 'references' ? setReferenceGroups : setHighlightGroups;

    setter((groups) => groups.map((group) => {
      if (group.id !== activeId || group.items.includes(itemKey)) return group;
      return { ...group, items: [...group.items, itemKey] };
    }));
  };

  const chooseGroupForSave = (kind: 'references' | 'highlights') => {
    if (saveDestinationMode === 'auto_general') return 'general';

    return kind === 'references' ? activeReferenceGroupId : activeHighlightGroupId;
  };

  const addItemToGroupById = (kind: 'references' | 'highlights', groupId: string, itemKey: string) => {
    const setter = kind === 'references' ? setReferenceGroups : setHighlightGroups;

    setter((groups) => groups.map((group) => {
      if (group.id !== groupId || group.items.includes(itemKey)) return group;
      return { ...group, items: [...group.items, itemKey] };
    }));
  };

  const removeItemFromGroups = (kind: 'references' | 'highlights', itemKey: string) => {
    const setter = kind === 'references' ? setReferenceGroups : setHighlightGroups;
    setter((groups) => groups.map((group) => ({
      ...group,
      items: group.items.filter((item) => item !== itemKey)
    })));
  };

  const deleteReferenceItem = (page: number, ayahId: string) => {
    const itemKey = `page:${page}:${ayahId}`;
    const current = getPageAyahData(page, ayahId);
    const nextPageData = savePageAyahData(page, ayahId, {
      ...current,
      isBookmarked: false,
      color: ayahId === '_page' ? '' : current.color,
      note: ayahId === '_page' ? '' : current.note
    });

    if (ayahId !== '_page') {
      const coordinate = sampleCoordinates.find((item) => item.page === page && String(item.ayahNumber) === ayahId);
      const surahNumber = coordinate?.surahNumber || metadata.surahNumber;
      const nextAyahData = saveAyahData(surahNumber, Number(ayahId), { isBookmarked: false });
      setUserQuranData(nextAyahData);
    }

    removeItemFromGroups('references', itemKey);
    setUserData(nextPageData);
  };

  const clearPageLongPress = () => {
    if (pageLongPressTimer.current) {
      window.clearTimeout(pageLongPressTimer.current);
      pageLongPressTimer.current = null;
    }
  };

  useEffect(() => {
    if (!contextAyah || !contextSurah) return;
    fetchTafsir(contextSurah, contextAyah, selectedTafseerId);
  }, [contextAyah, contextSurah, selectedTafseerId]);

  return (
    <main
      dir="rtl"
      className={`quran-reader-shell bg-skin-base quran-theme-${theme} relative h-[100dvh] w-full overflow-hidden text-[var(--quran-text)]`}
      onPointerDownCapture={registerActivity}
      onKeyDownCapture={registerActivity}
      style={cssVars}
    >
      <style>
        {`
          .bg-skin-base { background: var(--quran-base); }
          .quran-reader-safe-top { padding-top: max(env(safe-area-inset-top), 12px); }
          .quran-reader-safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 12px); }
          .hafs-svg-shell svg {
            display: block;
            width: 100%;
            height: 100%;
          }
          .quran-svg-art {
            transition: filter 240ms ease, opacity 240ms ease;
            pointer-events: none;
            mix-blend-mode: multiply;
          }
          .quran-theme-dark .quran-svg-art {
            mix-blend-mode: screen;
          }
          .ayahPolygon {
            fill: transparent;
            fill-opacity: 0;
            stroke: transparent;
            stroke-width: 0;
            cursor: pointer;
            pointer-events: auto;
            transition: fill-opacity 0.2s ease, fill 0.2s ease;
            mix-blend-mode: multiply;
          }
          .quran-theme-dark .ayahPolygon {
            mix-blend-mode: screen;
          }
          .ayahPolygon:hover,
          .ayahPolygon:focus,
          .ayahPolygon.selected {
            fill: #f5e6a3;
            fill-opacity: 0.8;
          }
          .quran-theme-dark .ayahPolygon:hover,
          .quran-theme-dark .ayahPolygon:focus,
          .quran-theme-dark .ayahPolygon.selected {
            fill: #44403c;
            fill-opacity: 0.6;
          }
          .quran-no-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .quran-no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .quran-tafseer-ayah {
            font-family: 'KFGQPC HAFS Regular', 'Amiri Quran', 'Amiri', serif;
            font-feature-settings: "liga" 1, "calt" 1;
            letter-spacing: 0;
            word-spacing: 0.08em;
            direction: rtl;
          }
        `}
      </style>

      {/* Resume Reading Toast */}
      {showResumeToast && (
        <div className="fixed top-4 left-1/2 z-[200] -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 rounded-full bg-[var(--quran-accent)] px-5 py-2.5 text-sm font-black text-white shadow-xl">
            <BookOpen size={16} />
            <span>تابِع القراءة · صفحة {pageNumber}</span>
          </div>
        </div>
      )}

      <div
        className="quran-reading-layout absolute inset-0 z-0 flex flex-col items-center overflow-hidden"
        style={{ touchAction: 'pan-y' }}
        onPointerDownCapture={handlePointerSwipeStart}
        onPointerMoveCapture={handlePointerSwipeMove}
        onPointerUpCapture={(event) => finishPointerSwipe(event)}
        onPointerCancelCapture={(event) => finishPointerSwipe(event, true)}
        onClick={handleReaderClick}
      >
        {/* Compact Header - Surah on right, Search + Juz on left */}
        <div
          className="quran-compact-header h-9 w-full flex-shrink-0 flex items-center justify-between select-none z-20"
          dir="rtl"
        >
          {/* Surah Selector (Always on Right) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              hapticTap();
              setIndexTab('surahs');
              setIsIndexOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 transition active:scale-95 text-right font-quran text-xs sm:text-sm font-black text-[var(--quran-text)] opacity-95 tracking-wide shadow-sm backdrop-blur-sm"
            title="فتح فهرس السور"
          >
            <span>{displaySurahName.replace('سورة ', '')}</span>
            <ChevronDown size={14} className="opacity-60" />
          </button>

          {/* Search + Juz Selector (Always on Left) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hapticTap();
                setIsUnifiedSearchOpen(true);
              }}
              className="p-1.5 rounded-2xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-[var(--quran-text)] transition active:scale-95 shadow-sm backdrop-blur-sm"
              title="البحث الذكي في القرآن"
            >
              <Search size={15} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hapticTap();
                setIndexTab('juz');
                setIsIndexOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 transition active:scale-95 font-quran text-xs sm:text-sm font-bold text-[var(--quran-muted)] opacity-90 shadow-sm backdrop-blur-sm"
              title="فتح فهرس الأجزاء"
            >
              <span>الجزء {JUZ_NAMES[currentJuzNumber] || toArabicNumber(currentJuzNumber)}</span>
              <ChevronDown size={14} className="opacity-60" />
            </button>
          </div>
        </div>

        {/* Floating Memorization Mode Banner */}
        {isHifzTestMode && (
          <div className="absolute top-12 sm:top-14 z-30 flex flex-wrap items-center justify-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs shadow-xl backdrop-blur-md animate-in slide-in-from-top duration-300 pointer-events-auto">
            <span className="flex items-center gap-1">
              <EyeOff size={14} />
              <span>اختبار الحفظ: المس الآية لكشفها</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRevealedAyahs(new Set(pagePolygons.map(p => p.ayahNumber || 0)));
                }}
                className="px-2 py-0.5 rounded-lg bg-black/15 hover:bg-black/25 text-[10px] transition"
              >
                كشف الكل
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRevealedAyahs(new Set());
                }}
                className="px-2 py-0.5 rounded-lg bg-black/15 hover:bg-black/25 text-[10px] transition"
              >
                حجب الكل
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHifzTestMode(false);
                }}
                className="p-1 rounded-full bg-black/15 hover:bg-black/25 transition"
                title="إنهاء الاختبار"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Mushaf viewport fills the space between the fixed header and footer */}
        <div
          ref={pageViewportRef}
          className="quran-page-viewport w-full flex flex-col items-center justify-center relative overflow-hidden"
        >

          {swipeOffset !== 0 && (() => {
            const direction = swipeOffset > 0 ? 'next' : 'previous';
            const adjacentMarkup = neighborSvgMarkup[direction];
            const adjacentOffset = swipeOffset > 0
              ? swipeOffset - svgFrame.width
              : swipeOffset + svgFrame.width;

            return adjacentMarkup ? (
              <div
                className="absolute inset-0 m-auto select-none"
                aria-hidden="true"
                style={{
                  zIndex: 1,
                  aspectRatio: svgAspectRatio,
                  width: `${svgFrame.width}px`,
                  height: `${svgFrame.height}px`,
                  transform: `translate3d(${adjacentOffset}px, 0, 0) scale(${zoomLevel})`,
                  transformOrigin: 'top center',
                  transition: swipeTransitionEnabled ? 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
                }}
              >
                <div
                  className="quran-svg-art hafs-svg-shell absolute inset-0 h-full w-full pointer-events-none [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                  style={{ filter: currentTheme.imageFilter?.filter }}
                  dangerouslySetInnerHTML={{ __html: adjacentMarkup }}
                />
              </div>
            ) : null;
          })()}

          <div
            className="quran-svg-page-frame relative flex max-w-full select-none flex-col items-center justify-center"
            onContextMenu={(e) => {
              e.preventDefault();
              const el = document.elementFromPoint(e.clientX, e.clientY);
              const target = resolveAyahTarget(el);
              if (target) {
                openAyahContext(target.surahNumber, target.ayahNumber);
                return;
              }
              // Fallback: use active ayah if set
              if (activeAyah) {
                const p = pagePolygons.find(p => p.ayahNumber === activeAyah);
                if (p) openAyahContext(p.surahNumber || metadata.surahNumber, p.ayahNumber);
              }
            }}
            onPointerDown={(e) => {
              const clientX = e.clientX;
              const clientY = e.clientY;
              clearPageLongPress();
              pageLongPressTimer.current = window.setTimeout(() => {
                const el = document.elementFromPoint(clientX, clientY);
                const target = resolveAyahTarget(el);
                if (target) {
                  openAyahContext(target.surahNumber, target.ayahNumber);
                  return;
                }
                // Fallback: use active ayah
                if (activeAyah) {
                  const p = pagePolygons.find(p => p.ayahNumber === activeAyah);
                  if (p) { openAyahContext(p.surahNumber || metadata.surahNumber, p.ayahNumber); return; }
                }
                bookmarkCurrentPageFallback();
              }, 520);
            }}
            onPointerUp={clearPageLongPress}
            onPointerCancel={clearPageLongPress}
            style={{
              zIndex: 2,
              aspectRatio: svgAspectRatio,
              width: `${svgFrame.width}px`,
              height: `${svgFrame.height}px`,
              transform: `translate3d(${swipeOffset}px, 0, 0) scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: swipeTransitionEnabled ? 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
              willChange: swipeOffset !== 0 ? 'transform' : undefined
            }}
          >
            <div className="relative min-h-0 w-full flex-1">
            <>
            <svg
              className="absolute left-0 top-0 z-10 h-full w-full object-contain"
              viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
              style={{ pointerEvents: 'none' }}
            >
              {pagePolygons.map((ayah, index) => {
                const surahNumber = ayah.surahNumber || metadata.surahNumber;
                const ayahNumber = ayah.ayahNumber || index + 1;
                const apiAyah = getApiAyah(surahNumber, ayahNumber);
                const storedColor = userData[String(pageNumber)]?.[String(ayahNumber)]?.color || userQuranData[buildAyahKey(surahNumber, ayahNumber)]?.color;
                const isActive = activeAyah === ayahNumber;
                const isPlaying = playingAyahKey === `${surahNumber}:${ayahNumber}`;
                const savedFill = storedColor && highlightStyles[storedColor as HighlightColor] ? highlightStyles[storedColor as HighlightColor].swatch : undefined;

                if (!savedFill && !isActive && !isPlaying) return null;

                return (
                  <path
                    key={`highlight-${surahNumber}-${ayahNumber}-${index}`}
                    className="ayahPolygon"
                    d={scalePathData(ayah.polygon, coordinateScale.x, coordinateScale.y)}
                    style={{
                      fill: isPlaying ? 'var(--quran-accent)' : savedFill || '#f5e6a3',
                      fillOpacity: isPlaying ? 0.3 : (theme === 'dark' ? 0.45 : 0.8),
                      mixBlendMode: theme === 'dark' ? 'screen' : 'multiply'
                    }}
                  />
                );
              })}
            </svg>

            {/* Draw the authentic header frame with exact proportions on all pages */}
            {startingSurahsOnPage.map((surah) => {
              const isPage1Or2 = pageNumber === 1 || pageNumber === 2;
              const rawTopY = quranSurahHeaderPositions[surah.number - 1] ?? 24.32;
              const topY = isPage1Or2 ? 0 : Math.max(0, rawTopY - 24);
              // The first two page SVGs have a taller intrinsic top margin than
              // standard Mushaf pages, so lift their added header slightly.
              const topPercent = isPage1Or2 ? -3 : (topY / svgSize.height) * 100;
              // On standard pages (345x550), (44 / 550) = 8.0%.
              // On square pages 1 & 2 (235x235), we use 12.5% to maintain the exact same
              // visual aspect ratio (7.1:1) and generous vertical height as all other surahs.
              const heightPercent = isPage1Or2 ? 12.5 : (44 / svgSize.height) * 100;

              return (
                <div
                  key={`surah-frame-${surah.number}`}
                  className="absolute z-[22] pointer-events-none transition-all duration-300 text-stone-600/90 dark:text-stone-300/85"
                  style={{
                    top: `${topPercent}%`,
                    left: '4.8%',
                    right: '4.8%',
                    height: `${heightPercent}%`,
                  }}
                >
                  <EmbeddedSurahHeaderFrame
                    surahNumber={isPage1Or2 ? surah.number : undefined}
                    surahName={isPage1Or2 ? surah.name : undefined}
                  />
                </div>
              );
            })}

            <div
              className="quran-svg-art hafs-svg-shell absolute inset-0 z-20 h-full w-full select-none pointer-events-none [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
              style={{
                filter: currentTheme.imageFilter?.filter
              }}
              aria-label={`Quran page ${pageNumber}`}
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />

            {isPageAssetLoading && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-[var(--quran-base)]/80">
                <Loader2 className="animate-spin text-[var(--quran-accent)]" size={32} />
              </div>
            )}

            {!isPageAssetLoading && !svgMarkup && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-[var(--quran-panel)] p-6 text-center text-sm font-black text-[var(--quran-muted)]">
                تعذر تحميل صفحة المصحف من {svgAssetPath}
              </div>
            )}

          <svg
            className="absolute left-0 top-0 z-[25] h-full w-full"
            viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
            preserveAspectRatio="xMidYMid meet"
            aria-label="Ayah interaction layer"
            style={{ pointerEvents: 'all' }}
          >
            {pagePolygons.map((ayah, index) => {
              const surahNumber = ayah.surahNumber || metadata.surahNumber;
              const ayahNumber = ayah.ayahNumber || index + 1;
              const apiAyah = getApiAyah(surahNumber, ayahNumber);
              const storedColor = userData[String(pageNumber)]?.[String(ayahNumber)]?.color || userQuranData[buildAyahKey(surahNumber, ayahNumber)]?.color;
              const isActive = activeAyah === ayahNumber;
              const savedFill = storedColor && highlightStyles[storedColor as HighlightColor] ? highlightStyles[storedColor as HighlightColor].swatch : undefined;
              const isHifzMasked = isHifzTestMode && !revealedAyahs.has(ayahNumber);

              return (
                <g key={`${surahNumber}-${ayahNumber}-${index}`}>
                  <path
                    className="ayahPolygon outline-none"
                    d={scalePathData(ayah.polygon, coordinateScale.x, coordinateScale.y)}
                    tabIndex={0}
                    role="button"
                    data-surah={surahNumber}
                    data-ayah={ayahNumber}
                    onClick={(event) => {
                      if (isHifzTestMode) {
                        event.stopPropagation();
                        hapticTap();
                        setRevealedAyahs((prev) => {
                          const next = new Set(prev);
                          if (next.has(ayahNumber)) next.delete(ayahNumber);
                          else next.add(ayahNumber);
                          return next;
                        });
                        return;
                      }
                      if (didLongPressAyahRef.current) {
                        didLongPressAyahRef.current = false;
                        return;
                      }
                      event.stopPropagation();
                      handleReaderClick();
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      openAyahContext(surahNumber, ayahNumber);
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      clearLongPress();
                      didLongPressAyahRef.current = false;
                      longPressTimer.current = window.setTimeout(() => {
                        didLongPressAyahRef.current = true;
                        openAyahContext(surahNumber, ayahNumber);
                      }, 520);
                    }}
                    onPointerUp={clearLongPress}
                    onPointerCancel={clearLongPress}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openAyahContext(surahNumber, ayahNumber);
                      }
                    }}
                    style={{
                      fill: isHifzMasked
                        ? (theme === 'dark' ? '#0f172a' : '#f1f5f9')
                        : ((isActive || (currentAudioAyah?.surah === surahNumber && currentAudioAyah?.ayah === ayahNumber)) 
                          ? 'rgba(var(--quran-accent-rgb), 0.15)' 
                          : (ayahThemes[`${surahNumber}:${ayahNumber}`] || 'rgba(0,0,0,0.001)')),
                      fillOpacity: isHifzMasked
                        ? 0.98
                        : ((isActive || (currentAudioAyah?.surah === surahNumber && currentAudioAyah?.ayah === ayahNumber) || ayahThemes[`${surahNumber}:${ayahNumber}`]) ? 0.3 : 1),
                      mixBlendMode: isHifzMasked ? 'normal' : (theme === 'dark' ? 'screen' : 'multiply'),
                      pointerEvents: 'auto',
                      cursor: 'pointer'
                    }}
                    aria-label={`خيارات الآية ${ayahNumber} من السورة ${surahNumber}`}
                  />
                  {isHifzMasked && (() => {
                    const bounds = getPathCoordinateBounds(ayah.polygon);
                    const centerX = (ayah.x || (bounds.minX + bounds.maxX) / 2) * coordinateScale.x;
                    const centerY = (ayah.y || (bounds.minY + bounds.maxY) / 2) * coordinateScale.y;
                    return (
                      <g className="pointer-events-none select-none">
                        <circle
                          cx={centerX}
                          cy={centerY}
                          r="12"
                          fill="var(--quran-accent)"
                          fillOpacity="0.15"
                          stroke="var(--quran-accent)"
                          strokeWidth="1"
                        />
                        <text
                          x={centerX}
                          y={centerY + 3.5}
                          fontSize="9.5"
                          fontWeight="bold"
                          fill="var(--quran-accent)"
                          textAnchor="middle"
                        >
                          {toArabicNumber(ayahNumber)}
                        </text>
                      </g>
                    );
                  })()}
                  {sajdas.some(s => s.surah === surahNumber && s.ayah === ayahNumber) && (() => {
                    const bounds = getPathCoordinateBounds(ayah.polygon);
                    const centerX = (ayah.x || (bounds.minX + bounds.maxX) / 2) * coordinateScale.x;
                    const centerY = (ayah.y || (bounds.minY + bounds.maxY) / 2) * coordinateScale.y;
                    return (
                      <text
                        x={centerX}
                        y={centerY - 8}
                        fontSize="10"
                        fontWeight="bold"
                        fill="var(--quran-accent)"
                        textAnchor="middle"
                        className="pointer-events-none opacity-80"
                        style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))' }}
                      >
                        ۩
                      </text>
                    );
                  })()}
                </g>
              );
            })}
          </svg>

          </>
          </div>
          </div>
        </div>

        {/* Compact Footer (32px) - Page number & Hizb */}
        <div
          className={`quran-compact-footer h-8 w-full flex-shrink-0 flex items-center z-20 select-none ${
            pageNumber % 2 === 1 ? 'justify-end' : 'justify-start'
          }`}
          dir="rtl"
        >
          <div className="flex items-center gap-2.5 rounded-xl bg-[var(--quran-panel)]/95 backdrop-blur-md px-3.5 py-0.5 border border-[var(--quran-accent)]/35 shadow-sm text-xs font-bold text-[var(--quran-text)]">
            <span className="text-[10px] text-[var(--quran-accent)] font-serif opacity-75 leading-none"><OutlineIcon name="chevronleft" /></span>
            <span className="font-mono text-xs sm:text-base font-black text-[var(--quran-text)] tracking-wider">
              {toArabicNumber(pageNumber)}
            </span>
            <span className="text-[var(--quran-muted)] opacity-35">|</span>
            <span className="text-[10px] sm:text-xs font-bold text-[var(--quran-muted)]">
              الحزب {toArabicNumber(currentHizbNumber)}
            </span>
            <span className="text-[10px] text-[var(--quran-accent)] font-serif opacity-75 leading-none"><OutlineIcon name="chevronright" /></span>
          </div>
        </div>
      </div>
      <header className={`quran-reader-header pointer-events-none absolute left-0 right-0 top-0 z-40 p-3 sm:p-4 pt-[max(env(safe-area-inset-top,0px),0.75rem)] transition-transform duration-300 ease-out ${visibleBars ? 'translate-y-0' : 'translate-y-[-110%]'}`}>
        <div className="quran-top-dock pointer-events-auto mx-auto max-w-xl rounded-[1.65rem] px-3 py-2">
          {/* Row 1: All Buttons at the top next to each other */}
          <div className="flex items-center justify-between gap-1 pb-1">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <IconButton icon={<Home size={20} />} label="الرئيسية" onClick={onBack} className="h-9 w-9 sm:h-10 sm:w-10 text-[var(--quran-accent)] hover:bg-black/5 dark:hover:bg-white/5" />
              <IconButton icon={<Settings size={19} />} label="الإعدادات" onClick={() => setShowSettings(true)} className="h-9 w-9 sm:h-10 sm:w-10 text-[var(--quran-accent)] hover:bg-black/5 dark:hover:bg-white/5" />
              <IconButton
                icon={<HelpCircle size={18} />}
                label="علامات الوقف"
                onClick={() => setIsStopMarksOpen(true)}
                className="h-9 w-9 sm:h-10 sm:w-10 text-[var(--quran-accent)] hover:bg-black/5 dark:hover:bg-white/5"
              />
              <IconButton
                icon={isHifzTestMode ? <Eye size={18} /> : <EyeOff size={18} />}
                label={isHifzTestMode ? 'إنهاء اختبار الحفظ' : 'اختبار الحفظ'}
                onClick={() => {
                  const next = !isHifzTestMode;
                  setIsHifzTestMode(next);
                  if (next) {
                    toast.success('تم تفعيل وضع اختبار الحفظ (المس الآية لكشفها)', { icon: "icon:target" });
                  } else {
                    toast('تم إنهاء وضع اختبار الحفظ');
                  }
                }}
                className={`h-9 w-9 sm:h-10 sm:w-10 transition ${
                  isHifzTestMode
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                    : 'text-[var(--quran-accent)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              />
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              <IconButton
                icon={<Bookmark size={18} />}
                label={isCurrentPageBookmarked ? 'إلغاء حفظ الصفحة' : 'حفظ الصفحة'}
                onClick={bookmarkCurrentPageFallback}
                className={`h-9 w-9 sm:h-10 sm:w-10 ${isCurrentPageBookmarked ? 'bg-[var(--quran-accent)] text-[var(--quran-accent-text)] shadow-md shadow-black/10' : 'text-[var(--quran-accent)] hover:bg-black/5 dark:hover:bg-white/5'}`}
              />
              <IconButton
                icon={<Search size={18} />}
                label="البحث"
                onClick={() => setIsUnifiedSearchOpen(true)}
                className="h-9 w-9 sm:h-10 sm:w-10 text-[var(--quran-accent)] hover:bg-black/5 dark:hover:bg-white/5"
              />
              <IconButton
                icon={<Menu size={18} />}
                label="الفهرس"
                onClick={() => {
                  if (!['surahs', 'juz', 'quarters'].includes(indexTab)) {
                    setIndexTab('surahs');
                  }
                  setIsIndexOpen(true);
                }}
                className="h-9 w-9 sm:h-10 sm:w-10 text-[var(--quran-accent)] hover:bg-black/5 dark:hover:bg-white/5"
              />
            </div>
          </div>

          {/* Row 2: Surah Name underneath with Page and Juz next to it */}
          <div className="quran-surah-identity flex items-center justify-between gap-2 px-2 pt-1.5 pb-0.5 border-t border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm sm:text-base font-black text-[var(--quran-text)] truncate">{displaySurahLabel}</h2>
              {surahs.find(s => s.number === metadata.surahNumber)?.revelationType && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--quran-accent)]/15 text-[var(--quran-accent)] font-bold shrink-0">
                  {surahs.find(s => s.number === metadata.surahNumber)?.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[var(--quran-muted)] opacity-85 shrink-0">
              <span>صفحة {toArabicNumber(pageNumber)}</span>
              <span className="opacity-40">·</span>
              <span>الجزء {toArabicNumber(metadata.juzNumber)}</span>
            </div>
          </div>

          {/* Clan Khatma Juz Challenge HUD (شريط تحدي الجزء التشاركي) */}
          {clanJuzSession && (
            <div className="mt-1.5 pt-1.5 pb-1 px-2.5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-amber-500/15 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-amber-500 font-bold shrink-0"><OutlineIcon name="star" /></span>
                  <span className="font-extrabold text-[var(--quran-text)] text-[11px] truncate">
                    تحدي الختمة · الجزء {toArabicNumber(clanJuzSession.juzNumber)}
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--quran-muted)] shrink-0 hidden sm:inline">
                    (ص {toArabicNumber(clanJuzSession.startPage)} - {toArabicNumber(clanJuzSession.endPage)})
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!isPageValidated}
                    onClick={handleMarkClanJuzBookmark}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                      !isPageValidated
                        ? 'opacity-60 cursor-not-allowed bg-black/5 dark:bg-white/5 text-[var(--quran-muted)] border border-dashed border-amber-500/30'
                        : clanJuzLastMarkedPage === pageNumber
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 shadow-sm'
                    }`}
                    title={
                      !isPageValidated
                        ? `يتفعل الزر بعد إكمال قراءة الصفحة (${toArabicNumber(Math.max(1, 20 - secondsOnCurrentPage))} ثانية)`
                        : 'تثبيت موضع قراءتك في الجزء'
                    }
                  >
                    {!isPageValidated ? (
                      <>
                        <span className="text-[10px] animate-pulse"><OutlineIcon name="clock" /></span>
                        <span>وقفت هنا ({toArabicNumber(Math.max(1, 20 - secondsOnCurrentPage))}ث)</span>
                      </>
                    ) : clanJuzLastMarkedPage === pageNumber ? (
                      <>
                        <Check size={11} />
                        <span>وقفت هنا</span>
                      </>
                    ) : (
                      <>
                        <MapPin size={11} />
                        <span>وقفت هنا</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setClanJuzSession(null);
                      localStorage.removeItem(ACTIVE_CLAN_JUZ_KEY);
                      toast('تم إنهاء وضع متابعة الجزء التشاركي', { icon: "icon:info" });
                    }}
                    className="p-1 rounded-md text-[var(--quran-muted)] hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/5 transition"
                    title="إغلاق شريط التحدي"
                    aria-label="إغلاق شريط التحدي"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Mini Juz Progress & 20s Reading Validator Indicator */}
              <div className="mt-1 flex items-center justify-between text-[9.5px] font-bold text-[var(--quran-muted)]">
                <div className="flex items-center gap-1.5">
                  {pageNumber >= clanJuzSession.startPage && pageNumber <= clanJuzSession.endPage ? (
                    <>
                      <span>صفحة {toArabicNumber(Math.min(clanJuzSession.totalPages, pageNumber - clanJuzSession.startPage + 1))} من {toArabicNumber(clanJuzSession.totalPages)}</span>
                      {isPageValidated ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                          <Check size={10} /> تم اعتماد الصفحة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full text-[9px] font-bold animate-pulse">
                          
                          <OutlineIcon name="clock" /> يُعتمد بعد {toArabicNumber(Math.max(1, 20 - secondsOnCurrentPage))} ث
                        </span>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPageNumber(clampPage(clanJuzLastMarkedPage || clanJuzSession.startPage))}
                      className="text-amber-600 dark:text-amber-400 underline font-bold hover:text-amber-700 cursor-pointer"
                    >
                      خارج نطاق الجزء {toArabicNumber(clanJuzSession.juzNumber)} · اضغط للانتقال إلى وردك (ص {toArabicNumber(clanJuzLastMarkedPage || clanJuzSession.startPage)}) <OutlineIcon name="target" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isPageValidated && pageNumber >= clanJuzSession.startPage && pageNumber <= clanJuzSession.endPage && (
                    <div className="w-14 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden" title="مؤشر إتمام قراءة الصفحة (٢٠ ثانية)">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${(secondsOnCurrentPage / 20) * 100}%` }}
                      />
                    </div>
                  )}
                  <span className="font-mono dir-ltr" dir="ltr">
                    {pageNumber < clanJuzSession.startPage ? 0 : Math.min(100, Math.max(0, Math.round(((pageNumber - clanJuzSession.startPage + 1) / clanJuzSession.totalPages) * 100)))}%
                  </span>
                </div>
              </div>
              <div className="mt-0.5 h-1 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-[width] duration-300"
                  style={{
                    width: `${pageNumber < clanJuzSession.startPage ? 0 : Math.min(100, Math.max(0, ((pageNumber - clanJuzSession.startPage + 1) / clanJuzSession.totalPages) * 100))}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="quran-global-progress mt-1.5 h-1 overflow-hidden rounded-full">
            <div className="h-full rounded-full bg-[var(--quran-accent)] transition-[width] duration-500" style={{ width: `${(pageNumber / TOTAL_PAGES) * 100}%` }} />
          </div>
        </div>
      </header>

      {/* Inline Ayah Context Menu Removed in favor of AyahToolbar component */}

      <footer className={`quran-reader-safe-bottom pointer-events-none absolute bottom-0 left-0 right-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] transition-transform duration-300 ease-out ${visibleBars ? 'translate-y-0' : 'translate-y-[125%]'}`}>
        <div className="pointer-events-auto mx-auto max-w-xl space-y-3">
          {showAudioPlayer && (
            <div className={`quran-audio-card mx-auto w-[92%] max-w-sm rounded-[1.8rem] p-4 animate-in slide-in-from-bottom duration-300 pointer-events-auto mb-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--quran-accent)]/10 flex items-center justify-center text-[var(--quran-accent)]">
                    <Headphones size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black truncate">{metadata.surahName} - آية {toArabicNumber(playingAyahKey?.split(':')[1] || activeAyah || 1)}</p>
                    <p className="text-[10px] font-bold text-[var(--quran-muted)] truncate">{readerReciters.find(r => r.id === selectedReciter)?.name || RECITERS[0].name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!reciterDownloads[selectedReciter] && (
                    <button 
                      onClick={async () => {
                        if (isAudioDownloading) return;
                        setIsAudioDownloading(true);
                        const loadingToast = toast.loading('جاري تجهيز تحميل السورة...');
                        try {
                          const url = await fetchSurahAudioUrl(selectedReciter);
                          if (url) {
                            const { downloadAudioSurah } = await import('../src/services/offlineBundle');
                            await downloadAudioSurah(selectedReciter, metadata.surahNumber, url);
                            setReciterDownloads(prev => ({ ...prev, [selectedReciter]: true }));
                            toast.success('تم تحميل السورة بنجاح للاستماع أوفلاين', { id: loadingToast });
                          } else {
                            throw new Error('Could not find audio URL');
                          }
                        } catch (e) {
                          toast.error('فشل تحميل السورة. تأكد من اتصالك بالإنترنت', { id: loadingToast });
                        } finally {
                          setIsAudioDownloading(false);
                        }
                      }}
                      disabled={isAudioDownloading}
                      className="p-2 rounded-full bg-[var(--quran-accent)]/10 text-[var(--quran-accent)] hover:bg-[var(--quran-accent)]/20 transition disabled:opacity-50"
                      title="تحميل السورة للاستماع أوفلاين"
                    >
                      {isAudioDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    </button>
                  )}
                  <button onClick={() => setShowAudioPlayer(false)} className="p-2 rounded-full hover:bg-[var(--quran-muted)]/10 text-[var(--quran-muted)] transition">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div
                    className="h-1.5 rounded-full bg-[var(--quran-muted)]/10 overflow-hidden cursor-pointer"
                    onClick={handleAudioSeek}
                  >
                    <div 
                      className="h-full bg-[var(--quran-accent)] transition-all relative" 
                      style={{ width: `${audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0}%` }} 
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-[var(--quran-muted)] px-1 dir-ltr font-mono" dir="ltr">
                    <span>{formatAudioTime(audioCurrentTime)}</span>
                    <span>{formatAudioTime(audioDuration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button 
                    onClick={() => setAudioRepeatMode(prev => prev === 'none' ? 'ayah' : prev === 'ayah' ? 'range' : 'none')}
                    className={`p-2 rounded-xl transition ${audioRepeatMode !== 'none' ? 'bg-[var(--quran-accent)]/15 text-[var(--quran-accent)]' : 'opacity-40'}`}
                    title="خيارات التكرار"
                  >
                    <Repeat size={18} />
                  </button>
                  
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        const [s, a] = (playingAyahKey || '1:1').split(':').map(Number);
                        if (a > 1) playAyah(s, a - 1, true);
                        else if (s > 1) {
                           const prevSurahMeta = quranSurahs.find(item => item.number === s - 1);
                           playAyah(s - 1, prevSurahMeta?.ayahCount || 7, true);
                        }
                      }}
                      className="p-1 opacity-60 hover:opacity-100 transition active:scale-75"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <button 
                      onClick={() => {
                        if (isAudioLoading) return;
                        if (isPageAudioPlaying) {
                          pausePageAudio();
                        } else if (pageAudioRef.current && pageAudioRef.current.src) {
                          // Resume existing loaded audio
                          pageAudioRef.current.play()
                            .then(() => setIsPageAudioPlaying(true))
                            .catch(() => {
                              // If resume fails, re-load the ayah
                              const [s, a] = (playingAyahKey || '1:1').split(':').map(Number);
                              playAyah(s, a, true);
                            });
                        } else {
                          // No audio loaded - start from the current/last ayah
                          const [s, a] = (playingAyahKey || '1:1').split(':').map(Number);
                          playAyah(s, a, true);
                        }
                      }}
                      className="w-12 h-12 rounded-full bg-[var(--quran-accent)] text-[var(--quran-panel)] flex items-center justify-center shadow-lg shadow-[var(--quran-accent)]/20 hover:scale-105 active:scale-95 transition disabled:opacity-50"
                      disabled={isAudioLoading}
                    >
                      {isAudioLoading ? (
                        <div className="flex flex-col items-center">
                          <Loader2 size={24} className="animate-spin" />
                        </div>
                      ) : isPageAudioPlaying ? (
                        <Pause size={24} fill="currentColor" /> 
                      ) : (
                        <Play size={24} fill="currentColor" />
                      )}
                    </button>
                    <button 
                      onClick={() => {
                        const [s, a] = (playingAyahKey || '1:1').split(':').map(Number);
                        const surahMeta = quranSurahs.find(item => item.number === s);
                        if (a < (surahMeta?.ayahCount || 286)) playAyah(s, a + 1, true);
                        else if (s < 114) playAyah(s + 1, 1, true);
                      }}
                      className="p-1 opacity-60 hover:opacity-100 transition active:scale-75"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  </div>

                  <button 
                    onClick={() => setShowStatsDetails(!showStatsDetails)} // Mini-settings toggle
                    className={`p-2 rounded-xl transition ${showStatsDetails ? 'bg-[var(--quran-accent)]/15 text-[var(--quran-accent)]' : 'opacity-40 hover:opacity-100'}`}
                  >
                    <Settings size={18} />
                  </button>
                </div>

                {showStatsDetails && (
                  <div className="pt-4 mt-3 border-t border-[var(--quran-muted)]/10 animate-in slide-in-from-top duration-200">
                     <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex-1 flex items-center gap-2 bg-[var(--quran-muted)]/5 p-2 rounded-2xl border border-[var(--quran-muted)]/10">
                          <span className="text-[10px] font-black text-[var(--quran-muted)] px-1">من</span>
                          <input 
                            type="number" 
                            min="1"
                            max={metadata.ayahCount || 286}
                            className="w-full bg-transparent text-center text-sm font-black outline-none" 
                            value={audioRange?.start || 1} 
                            onChange={e => setAudioRange(prev => ({ start: Math.max(1, Number(e.target.value)), end: prev?.end || 286 }))}
                          />
                        </div>

                        <div className="flex-1 flex items-center gap-2 bg-[var(--quran-muted)]/5 p-2 rounded-2xl border border-[var(--quran-muted)]/10">
                          <span className="text-[10px] font-black text-[var(--quran-muted)] px-1">إلى</span>
                          <input 
                            type="number" 
                            min="1"
                            max={metadata.ayahCount || 286}
                            className="w-full bg-transparent text-center text-sm font-black outline-none" 
                            value={audioRange?.end || 7} 
                            onChange={e => setAudioRange(prev => ({ start: prev?.start || 1, end: Math.max(1, Number(e.target.value)) }))}
                          />
                        </div>
                     </div>

                     <select 
                       value={selectedReciter} 
                       onChange={(e) => setSelectedReciter(e.target.value)}
                       className="w-full h-10 rounded-xl bg-[var(--quran-muted)]/5 text-xs font-black outline-none border border-[var(--quran-muted)]/10 px-3 mb-4"
                     >
                       {readerReciters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                     </select>

                     <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setAudioRepeatMode('none')}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black transition ${audioRepeatMode === 'none' ? 'bg-[var(--quran-accent)] text-[var(--quran-panel)]' : 'bg-[var(--quran-muted)]/5 text-[var(--quran-muted)]'}`}
                        >
                          بدون تكرار
                        </button>
                        <button 
                          onClick={() => setAudioRepeatMode('ayah')}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black transition ${audioRepeatMode === 'ayah' ? 'bg-[var(--quran-accent)] text-[var(--quran-panel)]' : 'bg-[var(--quran-muted)]/5 text-[var(--quran-muted)]'}`}
                        >
                          تكرار الآية
                        </button>
                        <button 
                          onClick={() => setAudioRepeatMode('range')}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black transition ${audioRepeatMode === 'range' ? 'bg-[var(--quran-accent)] text-[var(--quran-panel)]' : 'bg-[var(--quran-muted)]/5 text-[var(--quran-muted)]'}`}
                        >
                          تكرار النطاق
                        </button>
                     </div>

                     {/* Repetition Count Selector when ayah repeat is active */}
                     {audioRepeatMode === 'ayah' && (
                       <div className="mt-3 pt-3 border-t border-[var(--quran-muted)]/10 flex items-center justify-between animate-in fade-in duration-200">
                         <span className="text-[11px] font-bold text-[var(--quran-muted)]">مرات تكرار الآية:</span>
                         <div className="flex items-center gap-1.5">
                           {[1, 3, 5, 10, 0].map((count) => (
                             <button
                               key={count}
                               type="button"
                               onClick={() => setRepeatCountTarget(count)}
                               className={`px-2.5 py-1 rounded-xl text-xs font-black transition ${
                                 repeatCountTarget === count
                                   ? 'bg-[var(--quran-accent)] text-white shadow-sm'
                                   : 'bg-[var(--quran-muted)]/5 text-[var(--quran-muted)] hover:bg-[var(--quran-muted)]/10'
                               }`}
                             >
                               {count === 0 ? '∞' : `${count}x`}
                             </button>
                           ))}
                         </div>
                       </div>
                     )}

                     {/* Playback Speed Selector */}
                     <div className="mt-3 pt-3 border-t border-[var(--quran-muted)]/10 flex items-center justify-between">
                       <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--quran-muted)]">
                         <Gauge size={14} />
                         <span>سرعة التلاوة:</span>
                       </div>
                       <div className="flex items-center gap-1.5">
                         {[0.75, 1, 1.25, 1.5].map((spd) => (
                           <button
                             key={spd}
                             type="button"
                             onClick={() => changeAudioSpeed(spd)}
                             className={`px-2.5 py-1 rounded-xl text-xs font-black transition ${
                               audioSpeed === spd
                                 ? 'bg-[var(--quran-accent)] text-white shadow-sm'
                                 : 'bg-[var(--quran-muted)]/5 text-[var(--quran-muted)] hover:bg-[var(--quran-muted)]/10'
                             }`}
                           >
                             {spd}x
                           </button>
                         ))}
                       </div>
                     </div>
                  </div>
                )}
              </div>
            </div>
          )}


          <div className="quran-page-dock rounded-[1.55rem] px-3 py-2.5">
            <div className="grid items-center gap-2">
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between px-1 text-[10px] font-black text-[var(--quran-muted)]">
                  <span>{displaySurahLabel}</span>
                  <span>صفحة {toArabicNumber(pageNumber)} / {toArabicNumber(TOTAL_PAGES)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => jumpToPage(pageNumber - 1)} disabled={pageNumber <= 1} className="quran-page-step grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--quran-accent)] disabled:opacity-25" aria-label="الصفحة السابقة">
                    <ChevronRight size={18} />
                  </button>
                  <input
                    type="range"
                    min={1}
                    max={TOTAL_PAGES}
                    value={pageNumber}
                    onChange={(event) => jumpToPage(Number(event.target.value))}
                    className="quran-page-range h-2 min-w-0 flex-1 accent-[var(--quran-accent)]"
                    dir="rtl"
                    aria-label="سحب الصفحات"
                  />
                  <button type="button" onClick={() => jumpToPage(pageNumber + 1)} disabled={pageNumber >= TOTAL_PAGES} className="quran-page-step grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--quran-accent)] disabled:opacity-25" aria-label="الصفحة التالية">
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </footer>



      {quranXpToast && (
        <section className="pointer-events-none fixed left-4 right-4 top-[max(env(safe-area-inset-top),1rem)] z-[95] mx-auto max-w-sm">
          <div className="rounded-[1.5rem] border border-white/20 bg-[var(--quran-panel-strong)] px-4 py-3 text-[var(--quran-text)] shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black">تم احتساب قراءة الصفحة</p>
                <p className="text-xs font-bold text-[var(--quran-muted)]">صفحة {toArabicNumber(quranXpToast.page)} أضيفت لإحصائية القرآن</p>
              </div>
              <span className="rounded-full bg-[var(--quran-accent)] px-4 py-2 text-sm font-black text-[var(--quran-accent-text)]">
                +{toArabicNumber(quranXpToast.points)} نقطة
              </span>
            </div>
          </div>
        </section>
      )}

      <div
        className={`quran-sheet-backdrop fixed inset-0 z-[70] transition-opacity duration-300 ${
          showSettings || isIndexOpen || isUnifiedSearchOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() => {
          setShowSettings(false);
          setIsIndexOpen(false);
          setIsUnifiedSearchOpen(false);
        }}
      ></div>

      <aside className={`quran-settings-sheet quran-reader-safe-bottom quran-no-scrollbar fixed inset-x-0 bottom-0 z-[80] mx-auto max-h-[92dvh] max-w-xl overflow-y-auto rounded-t-[2rem] px-5 pt-3 text-[var(--quran-text)] transition-transform duration-300 ${showSettings ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-black/15" />
        <div className="mb-5 flex items-center justify-between">
          <button type="button" onClick={() => setShowSettings(false)} className="grid h-11 w-11 place-items-center rounded-full bg-black/10 text-[var(--quran-muted)]" aria-label="إغلاق الإعدادات">
            <X size={22} />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black">إعدادات</h2>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--quran-accent)]/15 text-[var(--quran-accent)]">
              <Settings size={24} />
            </span>
          </div>
        </div>

        <section className="space-y-5 pb-4">
          <div className="rounded-[1.5rem] bg-black/10 dark:bg-white/5 p-4 border border-[var(--quran-muted)]/10">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[var(--quran-accent)]/15 text-[var(--quran-accent)] rounded-xl">
                  <BarChart3 size={20} />
                </div>
                <h3 className="font-black text-lg">إحصائيات المصحف</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-2xl bg-[var(--quran-panel)] p-4 border border-[var(--quran-muted)]/10 shadow-sm">
                <p className="text-[11px] font-black text-[var(--quran-muted)] uppercase tracking-wider">إجمالي الصفحات</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-3xl font-black text-[var(--quran-text)]">{toArabicNumber(totalReadPages)}</p>
                  <span className="text-[10px] font-bold text-[var(--quran-muted)]">صفحة</span>
                </div>
              </div>
              <div className="rounded-2xl bg-[var(--quran-panel)] p-4 border border-[var(--quran-muted)]/10 shadow-sm">
                <p className="text-[11px] font-black text-[var(--quran-muted)] uppercase tracking-wider">النقاط الكلية</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-3xl font-black text-[var(--quran-text)]">{toArabicNumber(quranTotalXp)}</p>
                  <span className="text-[10px] font-bold text-[var(--quran-muted)]">نقطة</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowStatsDetails(!showStatsDetails)}
              className="w-full py-3 rounded-2xl bg-[var(--quran-panel)] text-sm font-black border border-[var(--quran-muted)]/10 hover:bg-[var(--quran-muted)]/5 transition flex items-center justify-center gap-2"
            >
              <CalendarDays size={18} className="text-[var(--quran-accent)]" />
              {showStatsDetails ? 'إخفاء تفاصيل الأيام' : 'عرض سجل القراءة اليومي'}
              {showStatsDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showStatsDetails && (
              <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                {quranStatsDays.map((day) => (
                  <div key={day.key} className="flex items-center justify-between rounded-2xl bg-[var(--quran-panel)] px-4 py-3 border border-[var(--quran-muted)]/5">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="block text-sm font-black">{day.label}</span>
                        <span className="text-[10px] font-bold text-[var(--quran-muted)]">{day.date}</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-[var(--quran-accent)]">{toArabicNumber(day.pages)} صفحة</p>
                      <p className="text-[10px] font-bold text-[var(--quran-muted)]">{toArabicNumber(day.xp)} نقطة</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] bg-black/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette size={20} className="text-[var(--quran-accent)]" />
                <h3 className="font-black">Themes</h3>
              </div>
              <span className="text-xs font-black text-[var(--quran-muted)]">{theme}</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {themeOptions.map((option) => (
                <button key={option.id} type="button" onClick={() => setTheme(option.id)} className="min-w-0 text-center" aria-label={option.label}>
                  <span className={`mx-auto block h-11 w-11 rounded-full border-4 transition ${theme === option.id ? 'border-[var(--quran-accent)] scale-105' : 'border-transparent'}`} style={{ backgroundColor: option.swatch }} />
                  <span className="mt-2 block truncate text-[11px] font-bold text-[var(--quran-muted)]">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-black/5 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type size={20} className="text-[var(--quran-accent)]" />
                <h3 className="font-black">Zoom</h3>
              </div>
              <span className="text-xs font-black text-[var(--quran-muted)]">{Math.round(zoomLevel * 100)}%</span>
            </div>
            <input type="range" min="1" max="1.55" step="0.05" value={zoomLevel} onChange={(event) => setZoomLevel(Number(event.target.value))} className="h-2 w-full accent-[var(--quran-accent)]" aria-label="Zoom" />
          </div>
          
          {/* Offline Downloads Central Tile */}
          <div className="flex items-center justify-between p-4 rounded-[1.5rem] bg-[var(--quran-panel)] border border-[var(--quran-muted)]/15 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[var(--quran-accent)]/15 text-[var(--quran-accent)]">
                <HardDrive size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-[var(--quran-text)]">إدارة التنزيلات بدون إنترنت</h4>
                <p className="text-xs font-bold text-[var(--quran-muted)]">المصحف، التفاسير، القراء، واللغويات</p>
              </div>
            </div>
            <button
              onClick={() => setShowDownloadsManager(true)}
              className="px-4 py-2 rounded-xl bg-[var(--quran-accent)] text-[var(--quran-accent-text)] text-xs font-black active:scale-95 transition shadow-sm"
            >
              فتح المدير
            </button>
          </div>

          <div className="flex items-center justify-between rounded-[1.5rem] bg-black/5 p-4">
            <div className="flex items-center gap-3">
              <BookOpen size={21} className="text-[var(--quran-accent)]" />
              <div>
                <h3 className="font-black">تنبيه نقاط الصفحة</h3>
                <p className="text-xs font-bold text-[var(--quran-muted)]">بعد 20 ثانية من قراءة الصفحة</p>
              </div>
            </div>
            <ToggleSwitch
              checked={showPageXpToast}
              onChange={() => {
                setShowPageXpToast((value) => {
                  const next = !value;
                  localStorage.setItem(QURAN_SHOW_PAGE_XP_TOAST_KEY, String(next));
                  return next;
                });
              }}
            />
          </div>

          <div className="rounded-[1.5rem] bg-black/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Bookmark size={20} className="text-[var(--quran-accent)]" />
              <h3 className="font-black">مكان حفظ المرجعيات والفواصل</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/5 p-1">
              {[
                { id: 'auto_general' as const, label: 'تلقائيًا في العام' },
                { id: 'ask' as const, label: 'اختيار من القائمة' }
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSaveDestinationMode(option.id)}
                  className={`rounded-xl py-3 text-xs font-black transition ${
                    saveDestinationMode === option.id
                      ? 'bg-[var(--quran-accent)] text-[var(--quran-accent-text)]'
                      : 'text-[var(--quran-muted)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {saveDestinationMode === 'ask' && (
              <div className="mt-3 grid gap-2">
                <label className="grid gap-1 text-[11px] font-black text-[var(--quran-muted)]">
                  مجموعة المرجعيات
                  <select
                    value={activeReferenceGroupId}
                    onChange={(event) => setActiveReferenceGroupId(event.target.value)}
                    className="h-11 rounded-xl bg-white/65 px-3 text-sm font-black text-[var(--quran-text)] outline-none focus:ring-2 focus:ring-[var(--quran-accent)]"
                  >
                    {referenceGroups.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-[11px] font-black text-[var(--quran-muted)]">
                  مجموعة الفواصل
                  <select
                    value={activeHighlightGroupId}
                    onChange={(event) => setActiveHighlightGroupId(event.target.value)}
                    className="h-11 rounded-xl bg-white/65 px-3 text-sm font-black text-[var(--quran-text)] outline-none focus:ring-2 focus:ring-[var(--quran-accent)]"
                  >
                    {highlightGroups.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] bg-black/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-[var(--quran-accent)]" />
                <h3 className="font-black">مصدر التفسير</h3>
              </div>
              <span className="text-xs font-black text-[var(--quran-muted)]">ID {selectedTafseerId}</span>
            </div>
            <select
              value={selectedTafseerId}
              onChange={(event) => handleTafseerChange(Number(event.target.value))}
              className="h-12 w-full rounded-2xl bg-white/65 px-4 text-sm font-black text-[var(--quran-text)] outline-none ring-[var(--quran-accent)] focus:ring-2"
            >
              {availableTafseers.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name || source.book_name || `Tafseer ${source.id}`}
                </option>
              ))}
            </select>
          </div>

        </section>
      </aside>

      {showCreateKhatma && (
        <CreateKhatmaModal 
          onClose={() => setShowCreateKhatma(false)} 
          onSuccess={() => setKhatmas(getKhatmas())} 
        />
      )}

      <aside className={`quran-index-sheet quran-no-scrollbar fixed inset-0 z-[80] overflow-y-auto px-3 pb-5 pt-[max(env(safe-area-inset-top),0.75rem)] text-[var(--quran-text)] transition-transform duration-300 sm:px-5 ${isIndexOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-black/15" />
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={() => setIsIndexOpen(false)} className="grid h-11 w-11 place-items-center rounded-full bg-black/10" aria-label="إغلاق الفهرس">
            <X size={22} />
          </button>
          <h2 className="text-2xl font-black">الفهرس</h2>
        </div>
        <div className="quran-no-scrollbar mb-3 flex items-center gap-2 overflow-x-auto rounded-2xl bg-black/5 p-2">
          {[
            { id: 'khatma' as const, title: 'الختمة', hint: 'خطط القراءة', icon: <BookOpen size={20} /> },
            { id: 'awrad' as const, title: 'أورادي', hint: 'حفظ ومراجعة', icon: <Target size={20} /> },
            { id: 'references' as const, title: 'المرجعيات', hint: 'صفحات محفوظة', icon: <Bookmark size={20} /> },
            { id: 'favorites' as const, title: 'الفواصل', hint: 'ألوان الآيات', icon: <Highlighter size={20} /> },
            { id: 'notes' as const, title: 'الملاحظات', hint: 'خواطر الآيات', icon: <FileText size={20} /> }
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => setIndexTab(item.id)}
              className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-black transition active:scale-[0.98] ${
                indexTab === item.id ? 'bg-[var(--quran-accent)] text-[var(--quran-accent-text)]' : 'bg-white/50 text-[var(--quran-muted)]'
              }`}
            >
              {outlineContent(item.icon)}
              <span>{item.title}</span>
            </button>
          ))}
        </div>
        <div className="mb-3 rounded-2xl bg-black/5 p-2">
          <div className="mb-2 flex items-center gap-2 px-2 text-xs font-black text-[var(--quran-muted)]">
            <LayoutGrid size={16} className="text-[var(--quran-accent)]" />
            الفهرس
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'surahs' as const, label: 'السور', icon: <BookOpen size={17} /> },
              { id: 'juz' as const, label: 'الأجزاء', icon: <LayoutGrid size={17} /> },
              { id: 'quarters' as const, label: 'الأرباع', icon: <SlidersHorizontal size={17} /> }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndexTab(item.id)}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition ${
                  indexTab === item.id ? 'bg-[var(--quran-accent)] text-[var(--quran-accent-text)]' : 'text-[var(--quran-muted)]'
                }`}
              >
                {outlineContent(item.icon)}
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute right-4 top-3.5 text-[var(--quran-muted)]" size={19} />
          <input
            value={indexQuery}
            onChange={(event) => setIndexQuery(event.target.value)}
            className="h-12 w-full rounded-2xl bg-black/5 pr-11 pl-4 text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--quran-accent)]"
            placeholder="ابحث باسم السورة أو رقمها"
          />
        </div>
        <div className="quran-no-scrollbar grid flex-1 content-start gap-2 overflow-y-auto pb-[max(env(safe-area-inset-bottom),1rem)]">
          {indexTab === 'khatma' && (
            <div className="space-y-4 text-right">
              <div className="rounded-2xl bg-black/5 px-4 py-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-lg font-black">الختمات</p>
                    <p className="text-xs font-bold text-[var(--quran-muted)]">هنا تظهر خطط الختمة وتقسيم الأيام.</p>
                  </div>
                  <button onClick={() => setShowCreateKhatma(true)} type="button" className="rounded-full bg-[var(--quran-accent)] px-4 py-2 text-xs font-black text-[var(--quran-accent-text)] hover:opacity-90 active:scale-95 transition-all">
                    إضافة ختمة
                  </button>
                </div>
                {khatmas.length === 0 ? (
                  <>
                    <div className="h-2 overflow-hidden rounded-full bg-black/10">
                      <div className="h-full w-0 rounded-full bg-[var(--quran-accent)]" />
                    </div>
                    <p className="mt-3 text-xs font-bold text-[var(--quran-muted)]">لم يتم إنشاء ختمة بعد.</p>
                  </>
                ) : (
                  <div className="space-y-3">
                    {khatmas.map(khatma => {
                      const percentage = Math.min(100, (khatma.pagesRead / 604) * 100).toFixed(1);
                      return (
                        <div key={khatma.id} className="bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-white/20">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold">{khatma.title}</h3>
                            <span className="text-xs px-2 py-1 bg-[var(--quran-accent)]/20 text-[var(--quran-accent)] rounded-lg font-bold">
                              {khatma.totalDays} أيام
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-black/10 mb-2">
                            <div className="h-full rounded-full bg-[var(--quran-accent)] transition-all" style={{ width: `${percentage}%` }} />
                          </div>
                          <div className="flex justify-between text-[11px] font-bold text-[var(--quran-muted)] mb-3">
                            <span>تم قراءة {khatma.pagesRead} من 604 صفحة</span>
                            <span>{percentage}%</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              jumpToPage(Math.max(1, khatma.pagesRead));
                              setActivePlanId(khatma.id);
                              setActiveWirdId(null);
                              setIsIndexOpen(false);
                            }}
                            className="w-full h-11 rounded-xl bg-[var(--quran-accent)] text-[var(--quran-accent-text)] text-sm font-black transition active:scale-95 shadow-md"
                          >
                            متابعة القراءة
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          {indexTab === 'awrad' && visibleAwrad.length === 0 && (
            <div className="rounded-2xl bg-black/5 px-4 py-8 text-center">
              <p className="text-sm font-bold text-[var(--quran-muted)]">لا توجد أوراد ظاهرة الآن.</p>
              <button type="button" onClick={restoreDefaultAwrad} className="mt-3 rounded-xl bg-[var(--quran-accent)] px-4 py-2 text-xs font-black text-[var(--quran-accent-text)]">
                استرجاع الأوراد الافتراضية
              </button>
            </div>
          )}
          {indexTab === 'awrad' && visibleAwrad.map((wird) => (
            <div key={wird.id} className="rounded-2xl bg-black/5 p-4 text-right">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-black">{wird.title}</p>
                  <p className="text-xs font-bold text-[var(--quran-muted)]">
                    البداية صفحة {toArabicNumber(wird.startPage)} · آخر حفظ صفحة {toArabicNumber(wird.currentPage)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => deleteWird(wird.id)}
                    className="grid h-11 w-11 place-items-center rounded-xl bg-red-500/10 text-red-600 transition active:scale-95"
                    aria-label="حذف الورد"
                  >
                    <Trash2 size={18} />
                  </button>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--quran-accent)]/15 text-[var(--quran-accent)]">
                    <Target size={20} />
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-[11px] font-black text-[var(--quran-muted)]">
                  ابدأ من صفحة
                  <input
                    type="number"
                    min={1}
                    max={TOTAL_PAGES}
                    value={wird.startPage}
                    onChange={(event) => updateWird(wird.id, { startPage: clampPage(Number(event.target.value)) })}
                    className="h-11 rounded-xl bg-white/65 px-3 text-sm font-black text-[var(--quran-text)] outline-none focus:ring-2 focus:ring-[var(--quran-accent)]"
                  />
                </label>
                <label className="grid gap-1 text-[11px] font-black text-[var(--quran-muted)]">
                  آخر صفحة محفوظة
                  <input
                    type="number"
                    min={1}
                    max={TOTAL_PAGES}
                    value={wird.currentPage}
                    onChange={(event) => updateWird(wird.id, { currentPage: clampPage(Number(event.target.value)) })}
                    className="h-11 rounded-xl bg-white/65 px-3 text-sm font-black text-[var(--quran-text)] outline-none focus:ring-2 focus:ring-[var(--quran-accent)]"
                  />
                </label>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    jumpToPage(wird.currentPage);
                    setActiveWirdId(wird.id);
                    setActivePlanId(null);
                    setIsIndexOpen(false);
                  }}
                  className="h-11 rounded-xl bg-white/55 text-xs font-black transition active:scale-95"
                >
                  فتح الورد
                </button>
                <button
                  type="button"
                  onClick={() => updateWird(wird.id, { currentPage: pageNumber })}
                  className="flex h-11 items-center justify-center gap-1 rounded-xl bg-black/5 text-xs font-black transition active:scale-95"
                >
                  <Save size={14} />
                  <span>حفظ هنا</span>
                </button>
                {isHifzOrReviewWird(wird) ? (
                  <button
                    type="button"
                    onClick={() => {
                      openWirdEvaluationForActive(wird);
                      setIsIndexOpen(false);
                    }}
                    className="flex h-11 items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-black text-white transition active:scale-95 shadow-md shadow-emerald-600/20 hover:brightness-105"
                  >
                    <Sparkles size={14} />
                    <span>إتمام وتقييم</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleCompleteReadingWird(wird);
                      setIsIndexOpen(false);
                    }}
                    className="flex h-11 items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-black text-white transition active:scale-95 shadow-md shadow-emerald-600/20 hover:brightness-105"
                  >
                    <Sparkles size={14} />
                    <span>إتمام الورد</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Wird Evaluations History Log */}
          {indexTab === 'awrad' && (
            <div className="mt-5 rounded-2xl bg-black/5 p-4 text-right">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Award size={16} />
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-[var(--quran-text)]">سجل تقييمات الحفظ والمراجعة</h4>
                    <p className="text-[10px] font-bold text-[var(--quran-muted)]">الأوراد المنجزة ومستوى إتقان الحفظ وملاحظات التثبيت</p>
                  </div>
                </div>
                <span className="rounded-full bg-black/10 px-2.5 py-0.5 text-[10px] font-mono font-black">
                  {wirdEvaluations.length} تقييم
                </span>
              </div>

              {wirdEvaluations.length === 0 ? (
                <p className="py-4 text-center text-xs font-bold text-[var(--quran-muted)]">
                  لم يتم تسجيل أي تقييم بعد. يظهر التقييم عند إنهاء ورد الحفظ أو المراجعة.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {wirdEvaluations.map((ev) => {
                    const qualityMap = {
                      perfect: { label: " ممتاز", bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
                      good: { label: " جيد جداً", bg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
                      with_errors: { label: " يحتاج تثبيت", bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
                      needs_repeat: { label: " إعادة", bg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' }
                    };
                    const qInfo = qualityMap[ev.quality] || qualityMap.perfect;
                    return (
                      <div key={ev.id} className="rounded-xl bg-white/70 dark:bg-black/30 p-3 border border-black/5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${qInfo.bg}`}>
                              {qInfo.label}
                            </span>
                            <span className="text-xs font-black text-[var(--quran-text)]">{ev.wirdTitle}</span>
                          </div>
                          <span className="text-[10px] font-bold text-[var(--quran-muted)]">{ev.date}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-[var(--quran-muted)]">
                          <span>الصفحات: {toArabicNumber(ev.startPage)} - {toArabicNumber(ev.endPage)} ({toArabicNumber(ev.totalPages)} صفحة)</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">+{ev.xpAwarded} XP</span>
                        </div>
                        {ev.weakPoints && ev.weakPoints.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {ev.weakPoints.map(wp => (
                              <span key={wp} className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                                
                                <OutlineIcon name="sparkles" /> {wp}
                              </span>
                            ))}
                          </div>
                        )}
                        {ev.notes && (
                          <p className="text-[11px] font-bold text-[var(--quran-text)]/80 bg-black/5 dark:bg-white/5 p-2 rounded-lg mt-1">
                            
                            <OutlineIcon name="sparkles" /> {ev.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {indexTab === 'references' && (
            <div className="quran-no-scrollbar mb-2 flex items-center gap-2 overflow-x-auto rounded-2xl bg-black/5 p-2">
              {referenceGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveReferenceGroupId(group.id)}
                  className={`h-9 shrink-0 rounded-full px-3 text-xs font-black ${activeReferenceGroupId === group.id ? 'bg-[var(--quran-accent)] text-[var(--quran-accent-text)]' : 'bg-white/55 text-[var(--quran-muted)]'}`}
                >
                  {group.name}
                </button>
              ))}
              <button type="button" onClick={() => addQuranGroup('references')} className="h-9 shrink-0 rounded-full bg-white/55 px-3 text-xs font-black text-[var(--quran-accent)]">
                + مجموعة
              </button>
            </div>
          )}
          {indexTab === 'references' && groupedReferenceItems.length === 0 && (
            <div className="rounded-2xl bg-black/5 px-4 py-8 text-center text-sm font-bold text-[var(--quran-muted)]">
              لا توجد صفحات محفوظة بعد. استخدم زر الحفظ أعلى الصفحة لإضافتها.
            </div>
          )}
          {indexTab === 'references' && groupedReferenceItems.map((item) => (
            <div
              key={`reference-${item.page}-${item.ayahId}`}
              className="flex items-center justify-between gap-3 rounded-2xl bg-black/5 px-3 py-3 text-right font-black"
            >
              <button
                type="button"
                onClick={() => {
                  setPageNumber(item.page);
                  setIsIndexOpen(false);
                }}
                className="min-w-0 flex-1 text-right transition active:scale-[0.99]"
              >
                <span className="block">{item.ayahId === '_page' ? 'مرجعية صفحة' : `${item.surahName} - آية ${toArabicNumber(item.ayahId)}`}</span>
                <span className="text-xs text-[var(--quran-muted)]">صفحة {toArabicNumber(item.page)}</span>
              </button>
              <div className="flex items-center gap-2">
                <Bookmark size={18} className="text-[var(--quran-accent)]" />
                <button
                  type="button"
                  onClick={() => deleteReferenceItem(item.page, item.ayahId)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-red-500/10 text-red-600 transition active:scale-95"
                  aria-label="حذف المرجعية"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {indexTab === 'notes' && noteItems.length === 0 && (
            <div className="rounded-2xl bg-black/5 px-4 py-8 text-center text-sm font-bold text-[var(--quran-muted)]">
              لا توجد ملاحظات بعد. اضغط مطولًا على آية واكتب ملاحظتك.
            </div>
          )}
          {indexTab === 'notes' && noteItems.map((item) => (
            <button
              key={`note-${item.page}-${item.ayahId}`}
              type="button"
              onClick={() => {
                setPageNumber(item.page);
                setIsIndexOpen(false);
                if (item.ayahId !== '_page') {
                  window.setTimeout(() => openAyahContext(item.surahNumber || metadata.surahNumber, Number(item.ayahId)), 120);
                }
              }}
              className="rounded-2xl bg-black/5 px-4 py-3 text-right font-black transition active:scale-[0.99]"
            >
              <span className="block">{item.surahName} - آية {toArabicNumber(item.ayahId)}</span>
              <span className="mt-1 line-clamp-2 block text-xs font-bold text-[var(--quran-muted)]">{item.data.note}</span>
            </button>
          ))}
          {indexTab === 'favorites' && (
            <div className="mb-2 space-y-2">
              <div className="quran-no-scrollbar flex items-center gap-2 overflow-x-auto rounded-2xl bg-black/5 p-2">
                {highlightGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setActiveHighlightGroupId(group.id)}
                    className={`h-9 shrink-0 rounded-full px-3 text-xs font-black ${activeHighlightGroupId === group.id ? 'bg-[var(--quran-accent)] text-[var(--quran-accent-text)]' : 'bg-white/55 text-[var(--quran-muted)]'}`}
                  >
                    {group.name}
                  </button>
                ))}
                <button type="button" onClick={() => addQuranGroup('highlights')} className="h-9 shrink-0 rounded-full bg-white/55 px-3 text-xs font-black text-[var(--quran-accent)]">
                  + مجموعة
                </button>
              </div>
              <div className="quran-no-scrollbar flex items-center gap-2 overflow-x-auto rounded-2xl bg-black/5 p-2">
                <button type="button" onClick={() => setActiveHighlightColor('all')} className={`h-8 shrink-0 rounded-full px-3 text-xs font-black ${activeHighlightColor === 'all' ? 'bg-[var(--quran-accent)] text-[var(--quran-accent-text)]' : 'bg-white/55 text-[var(--quran-muted)]'}`}>
                  كل الألوان
                </button>
                {(['yellow', 'blue', 'green', 'brown'] as HighlightColor[]).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setActiveHighlightColor(color)}
                    className={`h-8 w-8 shrink-0 rounded-full border-4 ${activeHighlightColor === color ? 'border-[var(--quran-accent)]' : 'border-white'}`}
                    style={{ backgroundColor: highlightStyles[color].swatch }}
                    aria-label={`فلترة لون ${color}`}
                  />
                ))}
              </div>
            </div>
          )}
          {indexTab === 'favorites' && filteredGroupedHighlightItems.length === 0 && (
            <div className="rounded-2xl bg-black/5 px-4 py-8 text-center text-sm font-bold text-[var(--quran-muted)]">
              لا توجد آيات ملوّنة أو محفوظة بعد.
            </div>
          )}
          {indexTab === 'favorites' && filteredGroupedHighlightItems.map((item) => (
            <button
              key={`${item.page}-${item.ayahId}`}
              type="button"
              onClick={() => {
                setPageNumber(item.page);
                setIsIndexOpen(false);
                if (item.ayahId !== '_page') {
                  window.setTimeout(() => openAyahContext(item.surahNumber || metadata.surahNumber, Number(item.ayahId)), 120);
                }
              }}
              className="flex items-center justify-between rounded-2xl bg-black/5 px-4 py-3 text-right font-black transition active:scale-[0.99]"
            >
              <span>
                <span className="block">{item.ayahId === '_page' ? 'علامة صفحة' : `${item.surahName} - آية ${toArabicNumber(item.ayahId)}`}</span>
                <span className="text-xs text-[var(--quran-muted)]">صفحة {toArabicNumber(item.page)} · {item.data.color || 'محفوظة'}</span>
              </span>
              <span className="h-7 w-7 rounded-full border-2 border-white shadow" style={{ backgroundColor: item.data.color ? highlightStyles[item.data.color].swatch : 'rgba(0,0,0,0.12)' }} />
            </button>
          ))}
          {indexTab === 'surahs' && (
            <>
          {!surahs.length && <Loader2 className="mx-auto my-8 animate-spin text-[var(--quran-accent)]" size={28} />}
          {filteredSurahs.map((surah) => (
            <button
              key={surah.number}
              type="button"
              onClick={() => openSurah(surah)}
              className="flex items-center justify-between rounded-2xl bg-black/5 px-4 py-3 text-right font-black transition active:scale-[0.99]"
            >
              <span>
                <span className="flex items-center gap-2">
                  <span className="block font-black">سورة {surah.name}</span>
                  {surah.revelationType && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${surah.revelationType === 'Meccan' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                    </span>
                  )}
                </span>
                <span className="text-xs text-[var(--quran-muted)]">{toArabicNumber(surah.number)} · {toArabicNumber(surah.numberOfAyahs)} آية</span>
              </span>
              <ChevronLeft size={18} className="text-[var(--quran-accent)]" />
            </button>
          ))}
              </>
            )}
            {indexTab === 'juz' && filteredJuz.map((juz) => (
              <button
                key={juz.number}
                type="button"
                onClick={() => {
                  jumpToPage(juz.startPage);
                  setIsIndexOpen(false);
                  setIndexQuery('');
                }}
                className="flex items-center justify-between rounded-2xl bg-black/5 px-4 py-4 text-right font-black transition active:scale-[0.99]"
              >
                <span>
                  <span className="block">الجزء {toArabicNumber(juz.number)}</span>
                  <span className="text-xs text-[var(--quran-muted)]">يبدأ من صفحة {toArabicNumber(juz.startPage)}</span>
                </span>
                <ChevronLeft size={18} className="text-[var(--quran-accent)]" />
              </button>
            ))}
            {indexTab === 'quarters' && filteredQuarters.map((quarter) => (
              <button
                key={quarter.number}
                type="button"
                onClick={() => {
                  jumpToPage(quarter.startPage);
                  setIsIndexOpen(false);
                  setIndexQuery('');
                }}
                className="flex items-center justify-between rounded-2xl bg-black/5 px-4 py-4 text-right font-black transition active:scale-[0.99]"
              >
                <span>
                  <span className="block">ربع {toArabicNumber(quarter.quarter)} من الحزب {toArabicNumber(quarter.hizb)}</span>
                  <span className="text-xs text-[var(--quran-muted)]">يبدأ من صفحة {toArabicNumber(quarter.startPage)}</span>
                </span>
                <ChevronLeft size={18} className="text-[var(--quran-accent)]" />
              </button>
            ))}
          </div>
        </div>
      </aside>

      <IraabModal
        isOpen={activeOfflineModal === 'iraab'}
        onClose={() => { setActiveOfflineModal(null); setActiveModalAyah(null); }}
        surahId={activeModalSurah}
        ayahId={activeModalAyahNumber}
        onGoToDownloads={() => setShowDownloadsManager(true)}
      />

      <MaaniModal
        isOpen={activeOfflineModal === 'maani'}
        onClose={() => { setActiveOfflineModal(null); setActiveModalAyah(null); }}
        surahId={activeModalSurah}
        ayahId={activeModalAyahNumber}
        ayahText={activeModalAyahText}
        surahName={activeModalSurahName}
        onGoToDownloads={() => setShowDownloadsManager(true)}
        onPrevAyah={() => stepModalAyah('prev')}
        onNextAyah={() => stepModalAyah('next')}
      />

      <MutashabihatModal
        isOpen={activeOfflineModal === 'mutashabihat'}
        onClose={() => { setActiveOfflineModal(null); setActiveModalAyah(null); }}
        surahId={activeModalSurah}
        ayahId={activeModalAyahNumber}
        ayahText={activeModalAyahText}
        surahName={activeModalSurahName}
        onGoToDownloads={() => setShowDownloadsManager(true)}
        onPrevAyah={() => stepModalAyah('prev')}
        onNextAyah={() => stepModalAyah('next')}
        onNavigateToAyah={(surah, ayah, targetPage) => {
          setActiveOfflineModal(null);
          setActiveModalAyah(null);
          jumpToPage(targetPage || quranSurahs.find((item) => item.number === surah)?.startPage || 1);
          setActiveAyah(ayah);
          setContextSurah(surah);
          setContextAyah(ayah);
          window.setTimeout(() => openAyahContext(surah, ayah), 150);
        }}
      />

      <AyahThemeModal
        isOpen={activeOfflineModal === 'theme'}
        onClose={() => { setActiveOfflineModal(null); setActiveModalAyah(null); }}
        surahId={activeModalSurah}
        ayahId={activeModalAyahNumber}
        ayahText={activeModalAyahText}
        surahName={activeModalSurahName}
        onGoToDownloads={() => setShowDownloadsManager(true)}
        onPrevAyah={() => stepModalAyah('prev')}
        onNextAyah={() => stepModalAyah('next')}
      />

      <TafsirReader
        isOpen={activeOfflineModal === 'tafsir'}
        onClose={() => { setActiveOfflineModal(null); setActiveModalAyah(null); }}
        surahId={activeModalSurah}
        ayahId={activeModalAyahNumber}
        tafsirId={selectedTafseerId}
        onGoToDownloads={() => setShowDownloadsManager(true)}
        onTafsirChange={handleTafseerChange}
      />

      {showDownloadsManager && (
        <DownloadsManager onClose={() => setShowDownloadsManager(false)} />
      )}

      <AyahToolbar
        isOpen={!!contextAyah && showBars}
        onClose={() => {
          setContextAyah(null);
          setActiveAyah(null);
        }}
        ayahData={contextAyah ? {
          surah: contextSurah,
          ayah: contextAyah,
          text: getApiAyah(contextSurah, contextAyah)?.text || ''
        } : null}
        onHighlight={handleHighlight}
        onOpenGroupPicker={() => openGroupPickerForAyah('yellow')}
        onOpenWordMeanings={() => {
          setShowBars(false);
          setActiveModalAyah(contextAyah ? { surah: contextSurah, ayah: contextAyah } : null);
          setActiveOfflineModal('maani');
        }}
        onOpenMutashabihat={() => {
          setShowBars(false);
          setActiveModalAyah(contextAyah ? { surah: contextSurah, ayah: contextAyah } : null);
          setActiveOfflineModal('mutashabihat');
        }}
        onOpenAyahTheme={() => {
          setShowBars(false);
          setActiveModalAyah(contextAyah ? { surah: contextSurah, ayah: contextAyah } : null);
          setActiveOfflineModal('theme');
        }}
        onOpenIraab={() => {
          setShowBars(false);
          setActiveModalAyah(contextAyah ? { surah: contextSurah, ayah: contextAyah } : null);
          setActiveOfflineModal('iraab');
        }}
        onDownloadCurrentTajweed={() => handleFeatureDownload('tajweed', 'current')}
        onNavigateToAyah={(surah, ayah, targetPage) => {
          jumpToPage(targetPage || quranSurahs.find((item) => item.number === surah)?.startPage || 1);
          setActiveAyah(ayah);
          setContextSurah(surah);
          setContextAyah(ayah);
          window.setTimeout(() => openAyahContext(surah, ayah), 150);
        }}
        onPrevAyah={handlePrevAyah}
        onNextAyah={handleNextAyah}
        onAddNote={() => {}} // Placeholder
        onBookmark={() => openGroupPickerForAyah('yellow')}
        onDownloadSurahTools={handleDownloadCurrentSurahTools}
        onDownloadCurrentMorphology={() => handleFeatureDownload('morphology', 'current')}
        onShareCard={() => setIsShareCardOpen(true)}
        surahName={metadata.surahName}
        availableTafseers={availableTafseers}
        selectedTafseerId={selectedTafseerId}
        onTafseerChange={handleTafseerChange}
      />

      <AyahGroupPickerModal
        isOpen={showGroupPicker}
        onClose={() => setShowGroupPicker(false)}
        surahNumber={groupPickerData?.surahNumber || contextSurah}
        ayahNumber={groupPickerData?.ayahNumber || contextAyah || 1}
        ayahText={groupPickerData?.ayahText}
        surahName={groupPickerData?.surahName || metadata.surahName}
        pageNumber={pageNumber}
        selectedColor={groupPickerData?.selectedColor || 'yellow'}
        groups={highlightGroups}
        currentGroupId={groupPickerData?.currentGroupId}
        currentNote={groupPickerData?.currentNote}
        onSaveToGroup={handleSaveAyahToGroup}
        onCreateGroup={handleCreateGroupFromModal}
        onRemoveHighlight={() => {
          if (groupPickerData) {
            saveAyahData(groupPickerData.surahNumber, groupPickerData.ayahNumber, { color: '' });
            savePageAyahData(pageNumber, groupPickerData.ayahNumber, { color: '' });
            removeItemFromGroups('highlights', `page:${pageNumber}:${groupPickerData.ayahNumber}`);
            toast.success('تمت إزالة التظليل');
          }
        }}
      />

      <WirdEvaluationModal
        isOpen={showWirdEvaluation}
        onClose={() => setShowWirdEvaluation(false)}
        wirdId={wirdEvaluationTarget?.id || 'hifz'}
        wirdTitle={wirdEvaluationTarget?.title || 'ورد الحفظ'}
        startPage={wirdEvaluationTarget?.startPage || 1}
        currentPage={wirdEvaluationTarget?.currentPage || pageNumber}
        surahName={wirdEvaluationTarget?.surahName || metadata.surahName}
        onSaveEvaluation={handleSaveWirdEvaluation}
      />

      <QuranSearchModal
        isOpen={isUnifiedSearchOpen}
        onClose={() => setIsUnifiedSearchOpen(false)}
        onNavigateToAyah={(s, a, targetPage) => {
          const target = targetPage || quranSurahs.find(item => item.number === s)?.startPage || 1;
          setPageNumber(target);
          setActiveAyah(a);
          setContextSurah(s);
          setContextAyah(a);
          setIsUnifiedSearchOpen(false);
          window.setTimeout(() => {
            openAyahContext(s, a);
          }, 150);
        }}
      />

      <AyahCardModal
        isOpen={isShareCardOpen}
        onClose={() => setIsShareCardOpen(false)}
        surahName={quranSurahs.find(s => s.number === contextSurah)?.name || metadata.surahName.replace('سورة ', '')}
        surahNumber={contextSurah}
        ayahNumber={contextAyah || 1}
        ayahText={getApiAyah(contextSurah, contextAyah || 1)?.text || selectedAyahText}
        tafsirText={tafseerState.tafseerText}
      />

      <StopMarksGuideModal
        isOpen={isStopMarksOpen}
        onClose={() => setIsStopMarksOpen(false)}
      />
    </main>
  );
};

export default QuranReader;
