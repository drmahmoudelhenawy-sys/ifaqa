import { AudioTrack } from './quranAudioHubService';

export interface ReciterStat {
  reciterId: number;
  reciterName: string;
  reciterPhoto?: string;
  totalSeconds: number;
  playCount: number;
  lastListenedAt: number;
}

export interface SurahStat {
  surahNumber: number;
  surahName: string;
  totalSeconds: number;
  playCount: number;
  lastListenedAt: number;
}

export interface QuranAudioBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  progress: number; // 0 to 100
}

export interface QuranAudioStatsData {
  totalSeconds: number;
  dailyGoalMinutes: number;
  listenedSurahNumbers: number[];
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  historyByDay: Record<string, number>; // date -> seconds
  reciters: Record<string, ReciterStat>;
  surahs: Record<number, SurahStat>;
  completedSurahsCount: number;
  nightListeningSeconds: number;
  fridayKahfCount: number;
}

const STATS_STORAGE_KEY = 'ifaqa_quran_audio_stats_v1';

const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayDateString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const defaultData: QuranAudioStatsData = {
  totalSeconds: 0,
  dailyGoalMinutes: 30,
  listenedSurahNumbers: [],
  streakDays: 0,
  lastActiveDate: '',
  historyByDay: {},
  reciters: {},
  surahs: {},
  completedSurahsCount: 0,
  nightListeningSeconds: 0,
  fridayKahfCount: 0,
};

let cachedData: QuranAudioStatsData | null = null;
let pendingSaveTimer: any = null;
const listeners = new Set<(stats: QuranAudioStatsData) => void>();

export const QuranAudioStatsService = {
  getRawData(): QuranAudioStatsData {
    if (cachedData) return cachedData;
    if (typeof window === 'undefined') return { ...defaultData };
    try {
      const stored = localStorage.getItem(STATS_STORAGE_KEY);
      if (stored) {
        cachedData = { ...defaultData, ...JSON.parse(stored) };
        return cachedData!;
      }
    } catch (e) {
      console.error('Failed to load Quran audio stats:', e);
    }
    cachedData = { ...defaultData };
    return cachedData;
  },

  save() {
    if (typeof window === 'undefined' || !cachedData) return;
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(cachedData));
      listeners.forEach((fn) => fn(cachedData!));
    } catch (e) {
      console.error('Failed to save Quran audio stats:', e);
    }
  },

  scheduleSave() {
    if (pendingSaveTimer) return;
    pendingSaveTimer = setTimeout(() => {
      pendingSaveTimer = null;
      this.save();
    }, 3000);
  },

  recordGeneralListeningSeconds(seconds: number = 1) {
    if (seconds <= 0) return;
    const data = this.getRawData();
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    data.totalSeconds += seconds;
    data.historyByDay[today] = (data.historyByDay[today] || 0) + seconds;

    if (data.lastActiveDate !== today) {
      if (data.lastActiveDate === yesterday) {
        data.streakDays = (data.streakDays || 0) + 1;
      } else {
        data.streakDays = 1;
      }
      data.lastActiveDate = today;
    }

    this.scheduleSave();
  },

  recordListeningSeconds(track: AudioTrack, seconds: number = 1) {
    if (!track || seconds <= 0) return;
    const data = this.getRawData();
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    // 1. Update total & daily seconds
    data.totalSeconds += seconds;
    data.historyByDay[today] = (data.historyByDay[today] || 0) + seconds;

    // 2. Update streak
    if (data.lastActiveDate !== today) {
      if (data.lastActiveDate === yesterday) {
        data.streakDays = (data.streakDays || 0) + 1;
      } else if (!data.lastActiveDate) {
        data.streakDays = 1;
      } else {
        data.streakDays = 1;
      }
      data.lastActiveDate = today;
    }

    // 3. Update Khatma unique surahs
    if (!data.listenedSurahNumbers.includes(track.surahNumber)) {
      data.listenedSurahNumbers.push(track.surahNumber);
    }

    // 4. Update Reciter stats
    const reciterKey = track.reciterName || `قارئ ${track.reciterId}`;
    if (!data.reciters[reciterKey]) {
      data.reciters[reciterKey] = {
        reciterId: track.reciterId,
        reciterName: track.reciterName,
        reciterPhoto: track.reciterPhoto,
        totalSeconds: 0,
        playCount: 1,
        lastListenedAt: Date.now(),
      };
    }
    data.reciters[reciterKey].totalSeconds += seconds;
    data.reciters[reciterKey].lastListenedAt = Date.now();
    if (track.reciterPhoto && !data.reciters[reciterKey].reciterPhoto) {
      data.reciters[reciterKey].reciterPhoto = track.reciterPhoto;
    }

    // 5. Update Surah stats
    if (!data.surahs[track.surahNumber]) {
      data.surahs[track.surahNumber] = {
        surahNumber: track.surahNumber,
        surahName: track.surahName,
        totalSeconds: 0,
        playCount: 1,
        lastListenedAt: Date.now(),
      };
    }
    data.surahs[track.surahNumber].totalSeconds += seconds;
    data.surahs[track.surahNumber].lastListenedAt = Date.now();

    // 6. Night listening check (from midnight to 5am)
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      data.nightListeningSeconds = (data.nightListeningSeconds || 0) + seconds;
    }

    // 7. Friday Surah Al-Kahf check
    const isFriday = new Date().getDay() === 5;
    if (isFriday && track.surahNumber === 18) {
      data.fridayKahfCount = (data.fridayKahfCount || 0) + 1;
    }

    this.scheduleSave();
  },

  recordSurahCompletion(track: AudioTrack) {
    if (!track) return;
    const data = this.getRawData();
    data.completedSurahsCount = (data.completedSurahsCount || 0) + 1;
    
    const reciterKey = track.reciterName || `قارئ ${track.reciterId}`;
    if (data.reciters[reciterKey]) {
      data.reciters[reciterKey].playCount += 1;
    }
    if (data.surahs[track.surahNumber]) {
      data.surahs[track.surahNumber].playCount += 1;
    }
    this.save();
  },

  setDailyGoal(minutes: number) {
    const data = this.getRawData();
    data.dailyGoalMinutes = Math.max(5, Math.min(300, minutes));
    this.save();
  },

  resetKhatma() {
    const data = this.getRawData();
    data.listenedSurahNumbers = [];
    this.save();
  },

  subscribe(fn: (data: QuranAudioStatsData) => void): () => void {
    listeners.add(fn);
    fn(this.getRawData());
    return () => {
      listeners.delete(fn);
    };
  },

  getComputedStats() {
    const data = this.getRawData();
    const today = getTodayDateString();
    const todaySeconds = data.historyByDay[today] || 0;
    const todayMinutes = Math.floor(todaySeconds / 60);
    const totalMinutes = Math.floor(data.totalSeconds / 60);
    const totalHours = (data.totalSeconds / 3600).toFixed(1);
    const dailyGoalMinutes = data.dailyGoalMinutes || 30;
    const dailyGoalProgress = Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100));
    const khatmaPercent = Math.min(100, Math.round((data.listenedSurahNumbers.length / 114) * 100));

    // Top Reciters
    const topReciters: ReciterStat[] = (Object.values(data.reciters) as ReciterStat[])
      .sort((a, b) => b.totalSeconds - a.totalSeconds)
      .slice(0, 10);

    // Top Surahs
    const topSurahs: SurahStat[] = (Object.values(data.surahs) as SurahStat[])
      .sort((a, b) => b.totalSeconds - a.totalSeconds)
      .slice(0, 10);

    // Last 7 days history
    const last7Days: { date: string; label: string; minutes: number; dayName: string }[] = [];
    const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const daySeconds = data.historyByDay[dateStr] || 0;
      last7Days.push({
        date: dateStr,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        minutes: Math.floor(daySeconds / 60),
        dayName: i === 0 ? 'اليوم' : i === 1 ? 'أمس' : arabicDays[d.getDay()],
      });
    }

    // Badges calculation
    const badges: QuranAudioBadge[] = [
      {
        id: 'first_listen',
        title: 'نور البداية',
        description: 'الاستماع لأول تلاوة قرآنية في التطبيق',
        icon: "icon:sparkles",
        isUnlocked: data.totalSeconds >= 60,
        progress: Math.min(100, Math.round((data.totalSeconds / 60) * 100)),
      },
      {
        id: 'one_hour',
        title: 'ساعة قرآنية',
        description: 'إتمام 60 دقيقة من الاستماع لآيات الذكر الحكيم',
        icon: "icon:sparkles",
        isUnlocked: data.totalSeconds >= 3600,
        progress: Math.min(100, Math.round((data.totalSeconds / 3600) * 100)),
      },
      {
        id: 'ten_hours',
        title: 'أنس التلاوة',
        description: 'قضاء 10 ساعات كاملة في رحاب القرآن',
        icon: "icon:crown",
        isUnlocked: data.totalSeconds >= 36000,
        progress: Math.min(100, Math.round((data.totalSeconds / 36000) * 100)),
      },
      {
        id: 'khatma_quarter',
        title: 'ربع الختمة',
        description: 'الاستماع إلى 28 سورة مختلفة من كتاب الله',
        icon: "icon:book",
        isUnlocked: data.listenedSurahNumbers.length >= 28,
        progress: Math.min(100, Math.round((data.listenedSurahNumbers.length / 28) * 100)),
      },
      {
        id: 'khatma_half',
        title: 'نصف الختمة',
        description: 'الاستماع إلى 57 سورة مختلفة',
        icon: "icon:sparkles",
        isUnlocked: data.listenedSurahNumbers.length >= 57,
        progress: Math.min(100, Math.round((data.listenedSurahNumbers.length / 57) * 100)),
      },
      {
        id: 'khatma_full',
        title: 'الختمة السماعية',
        description: 'الاستماع إلى سور القرآن الكريم الـ 114 كاملة',
        icon: "icon:trophy",
        isUnlocked: data.listenedSurahNumbers.length >= 114,
        progress: Math.min(100, Math.round((data.listenedSurahNumbers.length / 114) * 100)),
      },
      {
        id: 'streak_7',
        title: 'المواظب القرآني',
        description: 'الاستماع اليومي المتواصل لمدة 7 أيام متتالية',
        icon: "icon:flame",
        isUnlocked: data.streakDays >= 7,
        progress: Math.min(100, Math.round((data.streakDays / 7) * 100)),
      },
      {
        id: 'night_quran',
        title: 'أنس الأسحار',
        description: 'الاستماع للقرآن في الثلث الأخير من الليل',
        icon: "icon:moon",
        isUnlocked: (data.nightListeningSeconds || 0) >= 600,
        progress: Math.min(100, Math.round(((data.nightListeningSeconds || 0) / 600) * 100)),
      },
      {
        id: 'friday_kahf',
        title: 'نور الجمعة',
        description: 'الاستماع لسورة الكهف في يوم الجمعة المبارك',
        icon: "icon:landmark",
        isUnlocked: (data.fridayKahfCount || 0) >= 1,
        progress: (data.fridayKahfCount || 0) >= 1 ? 100 : 0,
      },
    ];

    return {
      totalSeconds: data.totalSeconds,
      totalMinutes,
      totalHours,
      todaySeconds,
      todayMinutes,
      dailyGoalMinutes,
      dailyGoalProgress,
      streakDays: data.streakDays || 0,
      listenedSurahsCount: data.listenedSurahNumbers.length,
      khatmaPercent,
      completedSurahsCount: data.completedSurahsCount || 0,
      topReciters,
      topSurahs,
      last7Days,
      badges,
      unlockedBadgesCount: badges.filter((b) => b.isUnlocked).length,
    };
  },
};
