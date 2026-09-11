
import { Timestamp } from "firebase/firestore";
import React from 'react';



export interface UserStats {
  fajrStreak: number;
  totalPrayers: number;
  fajrCount: number;
  jamaahCount: number;
  adhkarCount: number;
  ameenCount?: number;
}

export interface ThemePreferences {
  accentColor: 'violet' | 'blue' | 'rose' | 'emerald' | 'amber';
  fontSize: 'sm' | 'base' | 'lg';
  soundEnabled?: boolean;
  hapticsEnabled?: boolean;
  showIntro?: boolean;
  showGlobalScore?: boolean;
}

export interface EventStats {
  participatedCount: number;
  firstPlaceWins: number;
  totalScore: number;
  bestRank: number | null;
  processedEvents?: string[];
}

export type AppMode = 'lite' | 'full';

export interface UserData {
  name: string;
  email?: string;
  gender: 'male' | 'female';
  photoURL?: string;
  xp: number;
  pendingXp?: number; // For offline accumulation
  level?: number;
  tier: string;
  joinedAt?: Timestamp;
  lastActive?: Timestamp;
  completedChallenges?: string[];
  quranSettings?: QuranSettings;
  badges?: string[]; // IDs of unlocked badges
  stats?: UserStats;
  themePreferences?: ThemePreferences;
  appMode?: AppMode; // New: Lite or Full
  fastingMode?: boolean; // New: Fasting Mode
  isAdmin?: boolean;
  isBlocked?: boolean;
  showOnLeaderboard?: boolean;
  eventStats?: EventStats;
  customMasbahaAdhkar?: string[];
  // New Fields for Character System
  characterId?: string;
  userTitle?: string;
}

export interface QuranSettings {
  readerTheme?: 'day' | 'night';
  lastMode?: QuranMode;
  preferredReciter?: string;
}

export interface SunanConfig {
  hasPre: boolean;
  hasPost: boolean;
  preCount?: number;
  postCount?: number;
}

export interface Prayer {
  id: string;
  name: string;
  isFajr?: boolean;
  fadl: string;
  status: 'none' | 'jamaah' | 'ontime' | 'late' | 'qada';
  sunanConfig: SunanConfig;
  sunanPreDone?: boolean;
  sunanPostDone?: boolean;
  hadith?: string; // New: For specific Hadith text
}

export interface Zekr {
  id: string;
  text: string;
  count: number;
  xp: number;
  fadl: string;
}

export interface SituationalCategory {
  id: string;
  title: string;
  icon: string | React.ReactNode;
  adhkar: Zekr[];
}

export interface Tier {
  id: string;
  name: string;
  min: number;
  max: number;
  img: string;
  color: string;
}

export interface Challenge {
  id: string;
  title: string;
  xp: number;
}

export interface IslamicOccasion {
  name: string;
  date: string;
  icon: React.ReactNode;
}

export type BadgeCategory = 'all' | 'prayer' | 'quran' | 'athkar' | 'fasting' | 'general' | 'spirit' | 'special';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string | React.ReactNode;
  category?: 'prayer' | 'quran' | 'athkar' | 'fasting' | 'general' | 'spirit' | 'special';
  target?: number;
  unit?: string;
  xpBonus?: number;
  condition?: ((stats: UserStats) => boolean) | string;
}

export interface BadgeProgress {
  badge: Badge;
  current: number;
  target: number;
  progressPercent: number;
  isUnlocked: boolean;
}

export interface Dua {
  id: string;
  userId: string;
  userName: string;
  text: string;
  ameenCount: number;
  timestamp: any;
  ameenedBy: string[];
}

export interface SupportMessage {
  id: string;
  userId: string;
  userName: string;
  realName?: string; // For Admin to block even if anonymous
  message: string;
  reply?: string;
  status: 'open' | 'replied' | 'seen'; // Added 'seen'
  timestamp: any;
  isAdminReply?: boolean;
  isAutoReply?: boolean;
}

export interface Announcement {
  id: string;
  text: string;
  active: boolean;
}

export interface AppUpdate {
  version: string;
  link: string;
  force: boolean;
}

export interface MawanEvent {
  id: string;
  title: string;
  icon: string; 
  gradient: string;
  status: 'draft' | 'active' | 'upcoming' | 'ended';
  startTime: Timestamp;
  endTime: Timestamp;
  description: string;
  rules: string;
  requiredAdhkar: Zekr[];
}

// New: Dynamic Content Item
export interface ContentItem {
  id: string;
  type: 'hadith' | 'zekr' | 'wisdom';
  text: string;
  explanation?: string;
  source?: string; // e.g. Bukhari
  duration: number; // Display duration in seconds
  active: boolean;
}

export type WirdType = 'new' | 'near_review' | 'far_review';
export type WirdQuality = 'perfect' | 'with_errors' | 'needs_repeat';
export type WirdStatus = 'pending' | 'done';

export interface WirdTask {
  id: string;
  type: WirdType;
  title: string;
  status: WirdStatus;
  quality?: WirdQuality;
  completedAt?: any;
}

export interface WirdDay {
  progress: number;
  tasks: WirdTask[];
}

export interface WeakPoint {
  id: string;
  title: string;
  type: WirdType;
  lastQuality: WirdQuality;
  addedAt: any;
}

// Quran System Types
export type QuranMode = 'reading' | 'new_hifz' | 'near_review' | 'far_review' | 'casual';

export interface QuranBookmark {
  surah: number;
  ayah: number;
  updatedAt: any;
}

export interface QuranMark {
  surah: number;
  ayah?: number;
  page?: number;
  target?: 'ayah' | 'page';
  color?: 'emerald' | 'amber' | 'sky' | 'rose';
  category?: 'قراءة' | 'حفظ' | 'مراجعة' | 'تدبر';
  note?: string;
  createdAt?: any;
}

export interface KhatmaGoal {
  targetDays: number;
  startDate: string; // ISO Date
  pagesPerDay: number;
  completedPages?: number;
  updatedAt?: any;
}

export interface QuranState {
  bookmarks: Record<QuranMode, QuranBookmark>;
  ayahBookmarks?: Record<string, QuranMark>;
  pageBookmarks?: Record<string, QuranMark>;
  highlights?: Record<string, QuranMark>;
  khatmaGoal?: KhatmaGoal;
  dailyPagesRead: Record<string, number>; // DateStr -> count
  readPageKeys?: Record<string, string[]>; // DateStr -> unique mushaf page keys
}

import { quranSurahs, quranJuz, type SurahMetadata, type JuzMetadata } from './quranMetadata';
export type { SurahMetadata, JuzMetadata };
export { quranSurahs, quranJuz };

export interface QuranAyah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean | any;
}

export const getSurahAyahCount = (surahNumber: number): number => {
  const s = quranSurahs.find(item => item.number === surahNumber);
  return s ? s.ayahCount : 0;
};

export const searchQuran = async (_query: string): Promise<any[]> => {
  return [];
};
