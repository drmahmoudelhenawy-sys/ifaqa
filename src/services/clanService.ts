import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  runTransaction,
  addDoc,
  deleteField
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { APP_ID } from '../../constants';

export interface Territory {
  id: string;
  name: string;
  arabicTitle: string;
  cost: number;
  description: string;
  icon: string;
  gradient: string;
  capacityBonus: number;
  perk: string;
  mapCoords: { x: number; y: number };
  buildDurationHours: number;
  thumbnail: string;
  realmIndex: number;
}

export interface ClanRealmInfo {
  id: string;
  index: number;
  name: string;
  subtitle: string;
  icon: string;
  themeColor: string;
  overlayClass: string;
  badgeText: string;
  description: string;
}

export const CLAN_REALMS: ClanRealmInfo[] = [
  {
    id: 'realm_1',
    index: 1,
    name: 'أرض السكينة والواحات الأولى',
    subtitle: 'واحات الطمأنينة وظلال النخيل والبدايات المباركة',
    icon: "icon:palm",
    themeColor: '#10b981',
    overlayClass: 'realm-theme-emerald',
    badgeText: 'العالم الأول',
    description: 'أرض البدايات الإيمانية حيث تتفجر ينابيع التوبة وتورق رياض الذكر الأولى للقبائل.'
  },
  {
    id: 'realm_2',
    index: 2,
    name: 'ديار الأنوار وفيوض البركة',
    subtitle: 'قباب بيضاء مشيدة ومآذن تسابق الغمام',
    icon: "icon:landmark",
    themeColor: '#06b6d4',
    overlayClass: 'realm-theme-sapphire',
    badgeText: 'العالم الثاني',
    description: 'حواضر عامرة بصلوات الليل وتلاوات الفجر، تشع بنور الوحي وتهتدي بها القوافل.'
  },
  {
    id: 'realm_3',
    index: 3,
    name: 'ثغور الفرقان وقلاع العزائم',
    subtitle: 'قلاع منيعة وأبراج شامخة لحماية العهد',
    icon: "icon:castle",
    themeColor: '#8b5cf6',
    overlayClass: 'realm-theme-amethyst',
    badgeText: 'العالم الثالث',
    description: 'معاقل المرابطين والمجاهدين في مدارج الطاعات، حصون لا تلين في وجه الفتور.'
  },
  {
    id: 'realm_4',
    index: 4,
    name: 'فيافي الصبر وشموخ الرواسي',
    subtitle: 'كثبان ذهبية شاسعة وقمم تناطح كبد السماء',
    icon: "icon:mountain",
    themeColor: '#f59e0b',
    overlayClass: 'realm-theme-amber',
    badgeText: 'العالم الرابع',
    description: 'أرض المجاهدة الكبرى ومصابرة الأبدان، حيث يُختبر الصدق وتُرفع الدرجات.'
  },
  {
    id: 'realm_5',
    index: 5,
    name: 'رياض الفردوس وصروح الخلود',
    subtitle: 'أعلى غايات السالكين والنعيم المقيم',
    icon: "icon:sun",
    themeColor: '#eab308',
    overlayClass: 'realm-theme-firdaws',
    badgeText: 'العالم الخامس والأعظم',
    description: 'صروح نورانية سرمدية وأنهار الكوثر وظلال طوبى التي لا تزول، تاج فخار الرَّكْب.'
  }
];

export interface SpeedUpContribution {
  userId: string;
  userName: string;
  worshipType: 'salawat' | 'quran_pages' | 'audio_minutes' | 'tasbeeh';
  worshipTitle: string;
  hoursReduced: number;
  timestamp: number;
}

export interface TerritoryProject {
  territoryId: string;
  startedAt: number; // timestamp in ms
  durationHours: number;
  reducedHours: number;
  isCompleted: boolean;
  contributions: SpeedUpContribution[];
}

export interface ClanQuest {
  id: string;
  title: string;
  description: string;
  targetType: 'quran_pages' | 'audio_minutes' | 'salawat' | 'tasbeeh' | 'collective_khatma';
  targetAmount: number;
  currentAmount: number;
  bonusPoints: number;
  isCompleted: boolean;
  icon: string;
  scheduleType?: 'all_time' | 'friday_only' | 'weekly';
  category?: 'weekly' | 'milestone' | 'friday';
}

export function isFridayTime(): boolean {
  const now = new Date();
  const day = now.getDay();
  // Friday all day (5), or Thursday evening after 17:00 (Maghrib / eve of Friday)
  return day === 5 || (day === 4 && now.getHours() >= 17);
}

export interface ClanCheckInMessage {
  fromUserId: string;
  fromUserName: string;
  sentAt: number;
  message: string;
}

export interface ClanActivityItem {
  id: string;
  clanId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  actionType: 'khatma_page' | 'khatma_juz' | 'speed_up' | 'tasbeeh' | 'salawat' | 'quran' | 'sahar_lantern' | 'check_in' | 'twin_contribution' | 'duaa' | 'fasting';
  message: string;
  highlightText?: string;
  icon: string;
  timestamp: number;
}

export interface ClanMember {
  id: string; // userId
  name: string;
  avatar?: string;
  role: 'leader' | 'elder' | 'member';
  contributedPoints: number;
  joinedPersonalXp?: number;
  streakDays?: number;
  lastActiveDate?: string;
  lastActive?: any;
  lastCheckedInAt?: number;
  checkInMessages?: ClanCheckInMessage[];
  joinedAt: any;
}

export interface ClanKhatmaSlot {
  juzNumber: number;
  juzName: string;
  startPage: number;
  endPage: number;
  totalPages: number;
  claimedByUserId?: string | null;
  claimedByName?: string | null;
  claimedAt?: number | null;
  readPages: number[];
  isCompleted: boolean;
  completedAt?: number | null;
}

export interface ClanKhatma {
  khatmaNumber: number;
  slots: Record<string, ClanKhatmaSlot>;
  completedCount: number; // 0 to 30
  isCompleted: boolean;
  completedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface SaharActiveWorshipper {
  userId: string;
  userName: string;
  userBadge?: string;
  litAt: number; // timestamp of active worship
  actionType?: 'quran' | 'tasbeeh' | 'salawat' | 'istighfar';
}

export interface RibatSaharNight {
  date: string;
  lanterns: SaharActiveWorshipper[]; // Kept backwards-compatible property name
  speedUpGranted?: boolean;
}

export type ClanJoinPolicy = 'open' | 'passcode' | 'approval' | 'hybrid';

export interface ClanJoinRequest {
  id: string;
  clanId: string;
  clanName: string;
  userId: string;
  userName: string;
  userBadge?: string;
  personalXp: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
  resolvedAt?: any;
}

export interface Clan {
  id: string;
  name: string;
  description: string;
  bannerColor: string;
  badgeIcon: string;
  leaderId: string;
  leaderName: string;
  memberCount: number;
  maxCapacity: number;
  totalPoints: number;
  individualPoints: number;
  questBonusPoints: number;
  unlockedTerritories: string[];
  territoryProjects?: Record<string, TerritoryProject>;
  oasisKeys?: number;
  isEligibleForMap: boolean;
  joinPolicy?: ClanJoinPolicy;
  isPrivate?: boolean;
  joinPasscode?: string;
  clanTag?: string; // e.g. #1024
  twinPactId?: string | null;
  twinClanId?: string | null;
  twinClanName?: string | null;
  twinClanBadge?: string | null;
  twinStatus?: 'none' | 'pending_sent' | 'pending_received' | 'active';
  twinPendingClanId?: string | null;
  recentActivities?: ClanActivityItem[];
  createdAt: any;
  updatedAt: any;
}

// 26 High Quality Graphical Clan Logos from /public/clan_logos
export const CLAN_LOGOS = [
  './clan_logos/clan_01.gif',
  './clan_logos/clan_02.gif',
  './clan_logos/clan_03.gif',
  './clan_logos/clan_04.gif',
  './clan_logos/clan_05.gif',
  './clan_logos/clan_06.gif',
  './clan_logos/clan_07.gif',
  './clan_logos/clan_08.gif',
  './clan_logos/clan_09.png',
  './clan_logos/clan_10.gif',
  './clan_logos/clan_11.gif',
  './clan_logos/clan_12.gif',
  './clan_logos/clan_13.gif',
  './clan_logos/clan_14.gif',
  './clan_logos/clan_15.gif',
  './clan_logos/clan_16.gif',
  './clan_logos/clan_17.gif',
  './clan_logos/clan_18.gif',
  './clan_logos/clan_19.gif',
  './clan_logos/clan_20.gif',
  './clan_logos/clan_21.gif',
  './clan_logos/clan_22.gif',
  './clan_logos/clan_23.gif',
  './clan_logos/clan_24.gif',
  './clan_logos/clan_25.gif',
  './clan_logos/clan_26.gif',
];

export const CLAN_BANNER_COLORS = [
  { id: 'emerald', name: 'زمردي ملكي', gradient: 'linear-gradient(135deg, #134e3a, #09261c)', hex: '#134e3a' },
  { id: 'sapphire', name: 'كحلي أندلسي', gradient: 'linear-gradient(135deg, #1e3a5f, #0f1d30)', hex: '#1e3a5f' },
  { id: 'amber', name: 'ذهبي عتيق', gradient: 'linear-gradient(135deg, #6c4e1a, #38280b)', hex: '#6c4e1a' },
  { id: 'amethyst', name: 'أرجواني فاخر', gradient: 'linear-gradient(135deg, #4a2569, #251235)', hex: '#4a2569' },
  { id: 'ruby', name: 'عنابي وقور', gradient: 'linear-gradient(135deg, #5c1d24, #2d0d12)', hex: '#5c1d24' },
  { id: 'teal', name: 'فيروزي نقي', gradient: 'linear-gradient(135deg, #115357, #08292b)', hex: '#115357' },
];

/**
 * Checks if a color, hex, or gradient string has a dark perceived luminance (< 145/255).
 * Used for dynamic text contrast adjustment so typography is always crystal clear.
 */
export function isDarkColor(colorStr?: string): boolean {
  if (!colorStr) return false;
  const hexMatches = colorStr.match(/#([0-9a-fA-F]{3,8})\b/g);
  if (hexMatches && hexMatches.length > 0) {
    let totalLum = 0;
    for (const h of hexMatches) {
      let r = 0, g = 0, b = 0;
      const clean = h.replace('#', '');
      if (clean.length === 3) {
        r = parseInt(clean[0] + clean[0], 16);
        g = parseInt(clean[1] + clean[1], 16);
        b = parseInt(clean[2] + clean[2], 16);
      } else {
        r = parseInt(clean.substring(0, 2), 16);
        g = parseInt(clean.substring(2, 4), 16);
        b = parseInt(clean.substring(4, 6), 16);
      }
      totalLum += (0.299 * r + 0.587 * g + 0.114 * b);
    }
    return (totalLum / hexMatches.length) < 145;
  }
  const rgbMatches = colorStr.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g);
  if (rgbMatches && rgbMatches.length > 0) {
    let totalLum = 0;
    for (const item of rgbMatches) {
      const parts = item.match(/\d+/g);
      if (parts && parts.length >= 3) {
        const r = parseInt(parts[0], 10);
        const g = parseInt(parts[1], 10);
        const b = parseInt(parts[2], 10);
        totalLum += (0.299 * r + 0.587 * g + 0.114 * b);
      }
    }
    return (totalLum / rgbMatches.length) < 145;
  }
  return true;
}

export interface MemberLevelInfo {
  level: number;
  title: string;
  minPoints: number;
  nextLevelPoints: number;
  progressPercent: number;
}

export function getMemberLevel(points: number = 0): MemberLevelInfo {
  const p = Math.max(0, points);
  if (p < 200) {
    return { level: 1, title: "مبتدئ الهمة ", minPoints: 0, nextLevelPoints: 200, progressPercent: Math.round((p / 200) * 100) };
  } else if (p < 800) {
    return { level: 2, title: "سالك الهدى ", minPoints: 200, nextLevelPoints: 800, progressPercent: Math.round(((p - 200) / 600) * 100) };
  } else if (p < 2500) {
    return { level: 3, title: "مبادر الخيرات ", minPoints: 800, nextLevelPoints: 2500, progressPercent: Math.round(((p - 800) / 1700) * 100) };
  } else if (p < 7000) {
    return { level: 4, title: "صاحب الهمّة ", minPoints: 2500, nextLevelPoints: 7000, progressPercent: Math.round(((p - 2500) / 4500) * 100) };
  } else if (p < 20000) {
    return { level: 5, title: "رائد الفتوحات ", minPoints: 7000, nextLevelPoints: 20000, progressPercent: Math.round(((p - 7000) / 13000) * 100) };
  } else {
    return { level: 6, title: "سابق بالخيرات ", minPoints: 20000, nextLevelPoints: 50000, progressPercent: Math.min(100, Math.round(((p - 20000) / 30000) * 100)) };
  }
}

// 40 Predefined Grand Islamic & Spiritual Landmarks across 5 Sequential Realms
export const TERRITORIES: Territory[] = [
  // ==========================================
  // REALM 1: أرض السكينة والواحات الأولى (1M - 60M)
  // ==========================================
  {
    id: 'oasis_tranquility',
    name: 'واحة اليقين',
    arabicTitle: 'روضة الهدوء واستقرار القلوب',
    cost: 1000000,
    description: 'واحة غناء تفيض بالطمأنينة وظلال النخيل وبرك الماء الفيروزية، تُفتح بمليون نقطة.',
    icon: "icon:palm",
    gradient: 'from-emerald-600 via-teal-700 to-emerald-900',
    capacityBonus: 5,
    perk: '+5 سعة أعضاء وشارة واحة اليقين (مليونية الفتح الأولى)',
    mapCoords: { x: 50, y: 78 },
    buildDurationHours: 24,
    thumbnail: './landmark_oasis.jpg',
    realmIndex: 1
  },
  {
    id: 'dhikr_valley',
    name: 'بستان الذكر',
    arabicTitle: 'مفيض الأذكار والتسبيح الرنان',
    cost: 10000000,
    description: 'رياض خضراء فسيحة يعبق شذاها من كثرة المستغفرين بالأسحار والمصلين على المختار، تُفتح بـ 10 ملايين نقطة.',
    icon: "icon:flower",
    gradient: 'from-fuchsia-600 via-pink-700 to-rose-900',
    capacityBonus: 5,
    perk: '+5 سعة أعضاء ووشاح الذكر المبارك',
    mapCoords: { x: 74, y: 69 },
    buildDurationHours: 48,
    thumbnail: './landmark_oasis.jpg',
    realmIndex: 1
  },
  {
    id: 'city_of_light',
    name: 'مدينة السلام',
    arabicTitle: 'حاضرة الأمان والأنوار',
    cost: 2500000,
    description: 'حاضرة ساحلية عريقة بمآذن وقباب بيضاء تفيض بنور الوحي ودروس العلم، تُفتح بـ 2.5 مليون نقطة.',
    icon: "icon:landmark",
    gradient: 'from-cyan-600 via-blue-700 to-indigo-900',
    capacityBonus: 5,
    perk: '+5 سعة أعضاء وشارة منارة السلام',
    mapCoords: { x: 38, y: 61 },
    buildDurationHours: 36,
    thumbnail: './clan_map.jpg',
    realmIndex: 1
  },
  {
    id: 'barakah_river',
    name: 'نهر البركة',
    arabicTitle: 'معبر الخيرات والجسور الميمونة',
    cost: 18000000,
    description: 'نهر فيروزي عذب يربط أرجاء المعمورة ويمد الواحات بالحياة والنماء، يُفتح بـ 18 مليون نقطة.',
    icon: "icon:waves",
    gradient: 'from-teal-600 via-cyan-700 to-sky-900',
    capacityBonus: 5,
    perk: '+5 سعة أعضاء وشارة نماء البركة',
    mapCoords: { x: 73, y: 52 },
    buildDurationHours: 60,
    thumbnail: './clan_map.jpg',
    realmIndex: 1
  },
  {
    id: 'furqan_fortress',
    name: 'حصن الفجر',
    arabicTitle: 'معقل الثبات على الحق',
    cost: 5000000,
    description: 'قلعة شامخة تعلو قمم الجبال تحمي همة الصالحين وترفع رايات النصر، تُفتح بـ 5 ملايين نقطة.',
    icon: "icon:castle",
    gradient: 'from-indigo-600 via-violet-700 to-purple-900',
    capacityBonus: 5,
    perk: '+5 سعة أعضاء ودرع الحصن الذهبي',
    mapCoords: { x: 35, y: 43 },
    buildDurationHours: 48,
    thumbnail: './landmark_fortress.jpg',
    realmIndex: 1
  },
  {
    id: 'sabr_desert',
    name: 'صحراء الصبر',
    arabicTitle: 'أرض المجاهدة وبلوغ المعالي',
    cost: 28000000,
    description: 'كثبان ذهبية تتطلب صبراً ومصابرة في الطاعة وتحدياً للكسل والفتور، تُفتح بـ 28 مليون نقطة.',
    icon: "icon:sparkles",
    gradient: 'from-amber-600 via-orange-700 to-yellow-900',
    capacityBonus: 5,
    perk: '+5 سعة أعضاء ووسام صابرين الفتح',
    mapCoords: { x: 75, y: 34 },
    buildDurationHours: 72,
    thumbnail: './clan_map.jpg',
    realmIndex: 1
  },
  {
    id: 'tilawah_peak',
    name: 'جبل الرواسي',
    arabicTitle: 'قمة التلاوة الشاهقة',
    cost: 40000000,
    description: 'جبال باسقة تناطح السحاب يصدح منها ترتيل آيات كتاب الله آناء الليل وأطراف النهار، تُفتح بـ 40 مليون نقطة.',
    icon: "icon:mountain",
    gradient: 'from-slate-600 via-stone-700 to-zinc-900',
    capacityBonus: 5,
    perk: '+5 سعة أعضاء وتاج التلاوة الملكي',
    mapCoords: { x: 42, y: 25 },
    buildDurationHours: 96,
    thumbnail: './clan_map.jpg',
    realmIndex: 1
  },
  {
    id: 'firdaws_citadel',
    name: 'صرح الفردوس',
    arabicTitle: 'أعلى غايات السالكين',
    cost: 60000000,
    description: 'أعلى غايات السالكين ومحطة الفتح الكبرى للقبيلة، تُفتح عند جمع ستين مليون نقطة تعاون.',
    icon: "icon:sun",
    gradient: 'from-amber-500 via-yellow-600 to-orange-800',
    capacityBonus: 25,
    perk: '+25 سعة أعضاء ولقب أساطير معوان الخالد',
    mapCoords: { x: 54, y: 16 },
    buildDurationHours: 120,
    thumbnail: './landmark_fortress.jpg',
    realmIndex: 1
  },

  // ==========================================
  // REALM 2: ديار الأنوار وفيوض البركة (75M - 220M)
  // ==========================================
  {
    id: 'rawdat_tahajjud',
    name: 'روضة التهجد',
    arabicTitle: 'محراب المتهجدين ونور الأسحار',
    cost: 75000000,
    description: 'رياض أندلسية معطرة بعبير المسك، أضاءت بنور المستغفرين عند الهزيع الأخير من الليل.',
    icon: "icon:sparkles",
    gradient: 'from-teal-600 via-emerald-700 to-cyan-900',
    capacityBonus: 6,
    perk: '+6 سعة أعضاء وبرد الطمأنينة وقنديل التهجد',
    mapCoords: { x: 50, y: 78 },
    buildDurationHours: 48,
    thumbnail: './landmark_oasis.jpg',
    realmIndex: 2
  },
  {
    id: 'manarat_hidaya',
    name: 'منارة الهداية',
    arabicTitle: 'مشكاة العلم وقبس الرشاد',
    cost: 90000000,
    description: 'منارة بيضاء مذهبة ترشد السفن والسالكين إلى ساحل الأمان وحلقات تدبر الذكر الحكيم.',
    icon: "icon:sparkles",
    gradient: 'from-cyan-600 via-sky-700 to-blue-900',
    capacityBonus: 6,
    perk: '+6 سعة أعضاء وشارة قبس الهداية المضيء',
    mapCoords: { x: 74, y: 69 },
    buildDurationHours: 54,
    thumbnail: './clan_map.jpg',
    realmIndex: 2
  },
  {
    id: 'wadi_tasabeeh',
    name: 'وادي التسابيح',
    arabicTitle: 'مفيض الأذكار ومجمع الاستغفار',
    cost: 110000000,
    description: 'وادٍ فسيح تلتقي فيه أصوات المسبحين كحفيف أوراق الشجر في جنات النعيم.',
    icon: "icon:circle",
    gradient: 'from-sky-600 via-indigo-700 to-blue-950',
    capacityBonus: 6,
    perk: '+6 سعة أعضاء ومسبحة البركة الوثيقة',
    mapCoords: { x: 38, y: 61 },
    buildDurationHours: 60,
    thumbnail: './landmark_oasis.jpg',
    realmIndex: 2
  },
  {
    id: 'ayn_salsabeel',
    name: 'عين السلسبيل',
    arabicTitle: 'نبع الارتواء والصفاء القلبي',
    cost: 130000000,
    description: 'عين ماء نمير تتدفق من صخور الكريستال، تروي ظمأ الأرواح الظامئة للهدى.',
    icon: "icon:droplet",
    gradient: 'from-blue-600 via-teal-700 to-emerald-900',
    capacityBonus: 6,
    perk: '+6 سعة أعضاء ووشاح السلسبيل العذب',
    mapCoords: { x: 73, y: 52 },
    buildDurationHours: 66,
    thumbnail: './clan_map.jpg',
    realmIndex: 2
  },
  {
    id: 'ribat_salihin',
    name: 'رباط الصالحين',
    arabicTitle: 'مجمع الأخيار وائتلاف القلوب',
    cost: 150000000,
    description: 'قصر مبارك تلتقي فيه وفود الصالحين لتدارس كتاب الله ومواساة المحتاجين.',
    icon: "icon:handheart",
    gradient: 'from-emerald-600 via-cyan-800 to-indigo-900',
    capacityBonus: 6,
    perk: '+6 سعة أعضاء وميثاق الصالحين الأوفياء',
    mapCoords: { x: 35, y: 43 },
    buildDurationHours: 72,
    thumbnail: './landmark_fortress.jpg',
    realmIndex: 2
  },
  {
    id: 'bawwabat_fath',
    name: 'بوابة الفتح',
    arabicTitle: 'معبر النصر والبشائر الميمونة',
    cost: 175000000,
    description: 'بوابة ضخمة محفورة بالآيات القرآنية الذهبية، تعبر منها قبائل الهدى نحو فتوحات كبرى.',
    icon: "icon:door",
    gradient: 'from-amber-600 via-yellow-700 to-stone-900',
    capacityBonus: 6,
    perk: '+6 سعة أعضاء وراية الفتح المبين',
    mapCoords: { x: 75, y: 34 },
    buildDurationHours: 78,
    thumbnail: './clan_map.jpg',
    realmIndex: 2
  },
  {
    id: 'qasr_ihsan',
    name: 'قصر الإحسان',
    arabicTitle: 'درجة المراقبة وكمال الطاعة',
    cost: 195000000,
    description: 'صرح مهيب من الرخام الصافي يمثل عبادة الله كأنك تراه، فإن لم تكن تراه فإنه يراك.',
    icon: "icon:landmark",
    gradient: 'from-indigo-600 via-sky-700 to-teal-900',
    capacityBonus: 6,
    perk: '+6 سعة أعضاء وتاج الإحسان النضير',
    mapCoords: { x: 42, y: 25 },
    buildDurationHours: 84,
    thumbnail: './clan_map.jpg',
    realmIndex: 2
  },
  {
    id: 'dar_salam',
    name: 'دار السلام الكبرى',
    arabicTitle: 'حاضرة الأمن والأمان المطلق',
    cost: 220000000,
    description: 'درة ديار الأنوار وحاضرتها العظمى، تُفتح بتمام 220 مليون نقطة لتتوج فتوحات العالم الثاني.',
    icon: "icon:bird",
    gradient: 'from-teal-500 via-emerald-600 to-cyan-800',
    capacityBonus: 10,
    perk: '+10 سعة أعضاء ووسام ختام ديار الأنوار الملكي',
    mapCoords: { x: 54, y: 16 },
    buildDurationHours: 96,
    thumbnail: './landmark_fortress.jpg',
    realmIndex: 2
  },

  // ==========================================
  // REALM 3: ثغور الفرقان وقلاع العزائم (250M - 650M)
  // ==========================================
  {
    id: 'thagr_murabiteen',
    name: 'ثغر المرابطين',
    arabicTitle: 'خط الدفاع الأول ورباط الهمم',
    cost: 250000000,
    description: 'حصن حدودي منيع يحرس قلوب السالكين من وساوس التراجع والفتور في العبادة.',
    icon: "icon:shield",
    gradient: 'from-purple-700 via-indigo-800 to-slate-950',
    capacityBonus: 7,
    perk: '+7 سعة أعضاء ودرع المرابطين الحصين',
    mapCoords: { x: 50, y: 78 },
    buildDurationHours: 60,
    thumbnail: './landmark_fortress.jpg',
    realmIndex: 3
  },
  {
    id: 'hisn_wafaa',
    name: 'حصن الوفاء',
    arabicTitle: 'صرح العهد والثبات على الطاعة',
    cost: 290000000,
    description: 'قلعة شاهقة مبنية من الصخر الأسود الصواني تمجد الوفاء بالعهود والمواظبة على الأوراد.',
    icon: "icon:swords",
    gradient: 'from-indigo-700 via-violet-800 to-zinc-950',
    capacityBonus: 7,
    perk: '+7 سعة أعضاء وسيف الوفاء الأغر',
    mapCoords: { x: 74, y: 69 },
    buildDurationHours: 66,
    thumbnail: './clan_map.jpg',
    realmIndex: 3
  },
  {
    id: 'madeeq_tawakkul',
    name: 'مضيق التوكل',
    arabicTitle: 'ممر اليقين وتفويض الأمور لله',
    cost: 340000000,
    description: 'ممر جبلي ضيق بين صخرتين عظيمتين، لا يعبره إلا من امتلأ قلبه بصدق التوكل وحسن الظن بربه.',
    icon: "icon:mountain",
    gradient: 'from-slate-700 via-purple-900 to-indigo-950',
    capacityBonus: 7,
    perk: '+7 سعة أعضاء ووشاح التوكل الصادق',
    mapCoords: { x: 38, y: 61 },
    buildDurationHours: 72,
    thumbnail: './clan_map.jpg',
    realmIndex: 3
  },
  {
    id: 'burj_rumat',
    name: 'برج الرماة',
    arabicTitle: 'مرقب الاستبصار وحراسة الثغور',
    cost: 400000000,
    description: 'برج مراقبة فلكي يرصد ساعات الإجابة وحركات القوافل بالدعاء والذكر المستمر.',
    icon: "icon:sparkles",
    gradient: 'from-violet-700 via-purple-800 to-slate-900',
    capacityBonus: 7,
    perk: '+7 سعة أعضاء وقوس العزيمة الوثاب',
    mapCoords: { x: 73, y: 52 },
    buildDurationHours: 78,
    thumbnail: './landmark_fortress.jpg',
    realmIndex: 3
  },
  {
    id: 'maaqal_iman',
    name: 'معقل الإيمان',
    arabicTitle: 'حرم العقيدة وركيزة التوحيد',
    cost: 460000000,
    description: 'صرح راسخ في جوف الجبل تتوقد فيه مشاعل الإيمان واليقين الخالص الذي لا يتزعزع.',
    icon: "icon:gem",
    capacityBonus: 7,
    gradient: 'from-indigo-600 via-violet-800 to-purple-950',
    perk: '+7 سعة أعضاء وياقوتة الإيمان الراسخ',
    mapCoords: { x: 35, y: 43 },
    buildDurationHours: 84,
    thumbnail: './landmark_fortress.jpg',
    realmIndex: 3
  },
  {
    id: 'qalaat_muttaqeen',
    name: 'قلعة المتقين',
    arabicTitle: 'حصن الورع وصيانة الجوارح',
    cost: 520000000,
    description: 'قلعة بيضاء شامخة فوق قمة مسننة تحوطها السحب، بُنيت بطاعات أهل الورع والمراقبة.',
    icon: "icon:castle",
    gradient: 'from-purple-600 via-indigo-700 to-slate-900',
    capacityBonus: 7,
    perk: '+7 سعة أعضاء وخاتم التقوى الذهبي',
    mapCoords: { x: 75, y: 34 },
    buildDurationHours: 90,
    thumbnail: './clan_map.jpg',
    realmIndex: 3
  },
  {
    id: 'sakhra_istiqama',
    name: 'صخرة الاستقامة',
    arabicTitle: 'عماد المداومة ورسوخ الأقدام',
    cost: 580000000,
    description: 'صخرة جرانيتية عظيمة لا تحركها عواصف الفتن، ترمز لقوله تعالى: ﴿فَاسْتَقِمْ كَمَا أُمِرْتَ﴾.',
    icon: "icon:sparkles",
    gradient: 'from-stone-700 via-purple-900 to-zinc-950',
    capacityBonus: 7,
    perk: '+7 سعة أعضاء وصلابة الاستقامة الدائمة',
    mapCoords: { x: 42, y: 25 },
    buildDurationHours: 96,
    thumbnail: './clan_map.jpg',
    realmIndex: 3
  },
  {
    id: 'sarh_furqan',
    name: 'صرح الفرقان العظيم',
    arabicTitle: 'تاج الثغور ومحطة التمكين الأكبر',
    cost: 650000000,
    description: 'أعظم معاقل الثغور، صرح إمبراطوري يضيء بنور التفريق بين الحق والباطل، خاتمة العالم الثالث.',
    icon: "icon:crown",
    gradient: 'from-violet-600 via-purple-700 to-amber-900',
    capacityBonus: 12,
    perk: '+12 سعة أعضاء ووسام سيد الفرقان المجيد',
    mapCoords: { x: 54, y: 16 },
    buildDurationHours: 120,
    thumbnail: './landmark_fortress.jpg',
    realmIndex: 3
  },

  // ==========================================
  // REALM 4: فيافي الصبر وشموخ الرواسي (750M - 1.8B)
  // ==========================================
  {
    id: 'kuthban_inaba',
    name: 'كثبان الإنابة',
    arabicTitle: 'رمال الرجوع والتوبة الخالصة',
    cost: 750000000,
    description: 'كثبان رملية ذهبية متلألئة تمحو عنها الرياح كل أثر، كالتوبة الصادقة تجبّ ما قبلها.',
    icon: "icon:sparkles",
    gradient: 'from-amber-600 via-orange-700 to-stone-900',
    capacityBonus: 8,
    perk: '+8 سعة أعضاء وبركة الإنابة المستمرة',
    mapCoords: { x: 50, y: 78 },
    buildDurationHours: 72,
    thumbnail: './clan_map.jpg',
    realmIndex: 4
  },
  {
    id: 'wahat_mujahada',
    name: 'واحة المجاهدة',
    arabicTitle: 'مغالبة الهوى وميدان الصابرين',
    cost: 860000000,
    description: 'واحة نادرة تنبثق في قلب الصحراء القاحلة جزاءً لمن صبر وجاهد نفسه في ذات الله.',
    icon: "icon:leaf",
    gradient: 'from-emerald-700 via-amber-800 to-stone-950',
    capacityBonus: 8,
    perk: '+8 سعة أعضاء ودرع المجاهدة الصابرة',
    mapCoords: { x: 74, y: 69 },
    buildDurationHours: 80,
    thumbnail: './landmark_oasis.jpg',
    realmIndex: 4
  },
  {
    id: 'shieb_muhtasibeen',
    name: 'شِعب المحتسبين',
    arabicTitle: 'ملاذ الصابرين على لأواء الطريق',
    cost: 980000000,
    description: 'شعب جبلي وعر لا يقوى على صعوده إلا من وطّن نفسه على احتساب الأجر عند الله تعالى.',
    icon: "icon:sparkles",
    gradient: 'from-stone-700 via-orange-800 to-amber-950',
    capacityBonus: 8,
    perk: '+8 سعة أعضاء ووشاح الصبر والاحتساب',
    mapCoords: { x: 38, y: 61 },
    buildDurationHours: 88,
    thumbnail: './clan_map.jpg',
    realmIndex: 4
  },
  {
    id: 'wadi_qaniteen',
    name: 'وادي القانتين',
    arabicTitle: 'مقام الخشوع وطول القيام لله',
    cost: 1100000000,
    description: 'وادٍ مهيب تحيطه الجبال من كل جانب، سكنت فيه الرياح خشوعاً وطاعة لرب العالمين.',
    icon: "icon:sparkles",
    gradient: 'from-amber-700 via-stone-800 to-zinc-950',
    capacityBonus: 8,
    perk: '+8 سعة أعضاء وقنديل القنوت الساطع',
    mapCoords: { x: 73, y: 52 },
    buildDurationHours: 96,
    thumbnail: './landmark_oasis.jpg',
    realmIndex: 4
  },
  {
    id: 'saqee_ghaffar',
    name: 'صقيع الغفار',
    arabicTitle: 'أرض كبح الشهوات وطهارة النفس',
    cost: 1250000000,
    description: 'هضبة جليدية ناصعة البياض ترمز لطهور القلب بعد مغفرة الذنوب وتجاوز الخطايا.',
    icon: "icon:sparkles",
    gradient: 'from-sky-700 via-stone-800 to-slate-950',
    capacityBonus: 8,
    perk: '+8 سعة أعضاء وبياض المغفرة النقية',
    mapCoords: { x: 35, y: 43 },
    buildDurationHours: 104,
    thumbnail: './clan_map.jpg',
    realmIndex: 4
  },
  {
    id: 'magharat_ikhbat',
    name: 'مغارة الإخبات',
    arabicTitle: 'خلوة المتفكرين وانكسار العارفين',
    cost: 1400000000,
    description: 'كهف عظيم يشع من سقفه بلورات نورانية، موئل المتفكرين في آلاء الله وعظمته.',
    icon: "icon:sparkles",
    gradient: 'from-indigo-800 via-stone-900 to-amber-950',
    capacityBonus: 8,
    perk: '+8 سعة أعضاء ونور الإخبات الصادق',
    mapCoords: { x: 75, y: 34 },
    buildDurationHours: 112,
    thumbnail: './clan_map.jpg',
    realmIndex: 4
  },
  {
    id: 'hadabat_mouqineen',
    name: 'هضبة الموقنين',
    arabicTitle: 'أفق اليقين الذي لا يخالطه شك',
    cost: 1600000000,
    description: 'هضبة عالية ينكشف منها أفق السماء صافياً، تمنح الناظر بصيرة وبلوغاً لمرتبة عين اليقين.',
    icon: "icon:sunrise",
    gradient: 'from-orange-600 via-amber-700 to-stone-950',
    capacityBonus: 8,
    perk: '+8 سعة أعضاء وشمس اليقين الراسخ',
    mapCoords: { x: 42, y: 25 },
    buildDurationHours: 120,
    thumbnail: './clan_map.jpg',
    realmIndex: 4
  },
  {
    id: 'qimmat_ridwan',
    name: 'قمة الرضوان الشامخة',
    arabicTitle: 'منتهى الرضا وبلوغ غاية الفيافي',
    cost: 1800000000,
    description: 'أعلى قمم الرواسي على الإطلاق، من بلغها حاز رضا الرحمن وتأهل لدخول رياض الفردوس الأبدي.',
    icon: "icon:mountain",
    gradient: 'from-amber-500 via-orange-600 to-red-950',
    capacityBonus: 15,
    perk: '+15 سعة أعضاء وتاج الرضوان الأكبر',
    mapCoords: { x: 54, y: 16 },
    buildDurationHours: 144,
    thumbnail: './clan_map.jpg',
    realmIndex: 4
  },

  // ==========================================
  // REALM 5: رياض الفردوس وصروح الخلود (2B - 5B)
  // ==========================================
  {
    id: 'bab_rayyan',
    name: 'باب الريان',
    arabicTitle: 'مدخل الصائمين وجنة القائمين',
    cost: 2000000000,
    description: 'باب مذهب عظيم تشع منه أنوار القدس، لا يدخل منه إلا الصائمون المحتسبون.',
    icon: "icon:door",
    gradient: 'from-yellow-500 via-amber-600 to-emerald-950',
    capacityBonus: 10,
    perk: '+10 سعة أعضاء وبرد الريان العذب الخالد',
    mapCoords: { x: 50, y: 78 },
    buildDurationHours: 96,
    thumbnail: './clan_map.jpg',
    realmIndex: 5
  },
  {
    id: 'nahr_kawthar',
    name: 'نهر الكوثر',
    arabicTitle: 'الحوض المورود وشربة لا ظمأ بعدها',
    cost: 2300000000,
    description: 'نهر ماؤه أشد بياضاً من اللبن وأحلى من العسل، آنيته كنجوم السماء، شربة منه تذهب الظمأ أبداً.',
    icon: "icon:waves",
    gradient: 'from-cyan-400 via-teal-500 to-emerald-900',
    capacityBonus: 10,
    perk: '+10 سعة أعضاء وكأس الكوثر المبارك',
    mapCoords: { x: 74, y: 69 },
    buildDurationHours: 108,
    thumbnail: './clan_map.jpg',
    realmIndex: 5
  },
  {
    id: 'hadaiq_naeem',
    name: 'حدائق النعيم',
    arabicTitle: 'جنات تجري من تحتها الأنهار',
    cost: 2700000000,
    description: 'بساتين بهيجة قطوفها دانية، فيها ما لا عين رأت ولا أذن سمعت ولا خطر على قلب بشر.',
    icon: "icon:flower",
    gradient: 'from-emerald-500 via-green-600 to-teal-900',
    capacityBonus: 10,
    perk: '+10 سعة أعضاء وزهور النعيم الدائم',
    mapCoords: { x: 38, y: 61 },
    buildDurationHours: 120,
    thumbnail: './landmark_oasis.jpg',
    realmIndex: 5
  },
  {
    id: 'thilal_tuba',
    name: 'ظلال طوبى',
    arabicTitle: 'شجرة يسير الراكب في ظلها مائة عام',
    cost: 3200000000,
    description: 'شجرة غرسها الرحمن بيده، تخرج منها ثياب أهل الجنة وظلالها تظل أرجاء الصروح الإيمانية.',
    icon: "icon:leaf",
    gradient: 'from-green-500 via-emerald-700 to-yellow-950',
    capacityBonus: 10,
    perk: '+10 سعة أعضاء وظل طوبى الوارف الممتد',
    mapCoords: { x: 73, y: 52 },
    buildDurationHours: 132,
    thumbnail: './landmark_oasis.jpg',
    realmIndex: 5
  },
  {
    id: 'qasr_lulu',
    name: 'قصر اللؤلؤ والمرجان',
    arabicTitle: 'خيام مجوفة من اللؤلؤ والزمرد',
    cost: 3700000000,
    description: 'قصور مشيدة من اللؤلؤ الأبيض المجوف والياقوت الأحمر، ترفل في بهاء الجمال الإلهي.',
    icon: "icon:sparkles",
    gradient: 'from-amber-400 via-rose-500 to-indigo-950',
    capacityBonus: 10,
    perk: '+10 سعة أعضاء وصرح اللؤلؤ الرفيع',
    mapCoords: { x: 35, y: 43 },
    buildDurationHours: 144,
    thumbnail: './landmark_fortress.jpg',
    realmIndex: 5
  },
  {
    id: 'ayn_tasneem',
    name: 'عين التسنيم',
    arabicTitle: 'مزاج المقربين وأشرف شراب أهل الجنة',
    cost: 4200000000,
    description: 'عين تنحدر من علو صروح الجنة، يشرب منها المقربون صرفاً وتُمزج لسائر الأبرار.',
    icon: "icon:wine",
    gradient: 'from-yellow-400 via-amber-500 to-orange-900',
    capacityBonus: 10,
    perk: '+10 سعة أعضاء وقطرات التسنيم الزكية',
    mapCoords: { x: 75, y: 34 },
    buildDurationHours: 156,
    thumbnail: './clan_map.jpg',
    realmIndex: 5
  },
  {
    id: 'sidrat_muntaha',
    name: 'سدرة المنتهى الروحانية',
    arabicTitle: 'مقام القرب الذي تنتهي إليه العلوم',
    cost: 4600000000,
    description: 'عندها جنة المأوى، يغشاها من نور الله وجماله ما يحار فيه الألباب ويسجد عنده كل مؤمن.',
    icon: "icon:sparkles",
    gradient: 'from-amber-400 via-purple-600 to-yellow-900',
    capacityBonus: 12,
    perk: '+12 سعة أعضاء ونور السدرة العظيم',
    mapCoords: { x: 42, y: 25 },
    buildDurationHours: 168,
    thumbnail: './clan_map.jpg',
    realmIndex: 5
  },
  {
    id: 'firdaws_aala',
    name: 'صرح الفردوس الأعلى السرمدي',
    arabicTitle: 'سقفها عرش الرحمن ومنتهى الرجاء',
    cost: 5000000000,
    description: 'أعلى درجات الجنة وأوسطها، سقفها عرش الرحمن ومنها تفجر أنهار الجنة الأربعة، تاج خلود الرَّكْب الأعظم.',
    icon: "icon:crown",
    gradient: 'from-yellow-300 via-amber-500 to-orange-700',
    capacityBonus: 30,
    perk: '+30 سعة أعضاء ووسام سادة الفردوس الخالد إلى الأبد',
    mapCoords: { x: 54, y: 16 },
    buildDurationHours: 192,
    thumbnail: './landmark_fortress.jpg',
    realmIndex: 5
  }
];

// Helper functions for 5 sequential realms
export function isRealmUnlocked(realmIndex: number, unlockedTerritoryIds: string[] = []): boolean {
  if (realmIndex <= 1) return true;
  const prevRealmTerritories = TERRITORIES.filter(t => t.realmIndex === realmIndex - 1);
  if (prevRealmTerritories.length === 0) return true;
  return prevRealmTerritories.every(t => unlockedTerritoryIds.includes(t.id));
}

export function getRealmProgress(realmIndex: number, unlockedTerritoryIds: string[] = []) {
  const realmTerritories = TERRITORIES.filter(t => t.realmIndex === realmIndex);
  const completed = realmTerritories.filter(t => unlockedTerritoryIds.includes(t.id)).length;
  const total = realmTerritories.length;
  const isUnlocked = isRealmUnlocked(realmIndex, unlockedTerritoryIds);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, isUnlocked, percent };
}

export function getDefaultActiveRealm(unlockedTerritoryIds: string[] = []): number {
  for (let i = 5; i >= 1; i--) {
    if (isRealmUnlocked(i, unlockedTerritoryIds)) return i;
  }
  return 1;
}

export function getTerritoriesByRealm(realmIndex: number): Territory[] {
  return TERRITORIES.filter(t => t.realmIndex === realmIndex);
}

// Predefined collective quests (weekly collaborative and grand milestones)
export const DEFAULT_CLAN_QUESTS: ClanQuest[] = [
  {
    id: 'quest_weekly_khatma',
    title: 'الختمة الأسبوعية المشتركة',
    description: 'تلاوة 604 صفحات (مصحف كامل) بتعاون وتكاتف جميع رفقاء الرَّكْب خلال الأسبوع.',
    targetType: 'quran_pages',
    targetAmount: 604,
    currentAmount: 0,
    bonusPoints: 12000,
    isCompleted: false,
    icon: "icon:book",
    scheduleType: 'weekly',
    category: 'weekly'
  },
  {
    id: 'quest_kahf_friday',
    title: 'نور بين الجمعتين (سورة الكهف)',
    description: 'قراءة سورة الكهف من قِبل 5 رفقاء على الأقل من الرَّكْب يوم الجمعة.',
    targetType: 'collective_khatma',
    targetAmount: 5,
    currentAmount: 0,
    bonusPoints: 6000,
    isCompleted: false,
    icon: "icon:sparkles",
    scheduleType: 'friday_only',
    category: 'weekly'
  },
  {
    id: 'quest_weekly_tasbeeh',
    title: 'واحة الذكر الأسبوعية',
    description: 'تحقيق 15,000 تسبيحة واستغفار جماعي متجدد خلال أيام الأسبوع.',
    targetType: 'tasbeeh',
    targetAmount: 15000,
    currentAmount: 0,
    bonusPoints: 6000,
    isCompleted: false,
    icon: "icon:circle",
    scheduleType: 'weekly',
    category: 'weekly'
  },
  {
    id: 'quest_weekly_salawat',
    title: 'فيض الصلاة على الحبيب ﷺ',
    description: 'إنجاز 10,000 صلاة على النبي ﷺ تملأ أسبوع الرَّكْب بالنور والبركة.',
    targetType: 'salawat',
    targetAmount: 10000,
    currentAmount: 0,
    bonusPoints: 7500,
    isCompleted: false,
    icon: "icon:heart",
    scheduleType: 'weekly',
    category: 'weekly'
  },
  {
    id: 'quest_1000_minutes',
    title: 'ألف دقيقة تدبر واستماع',
    description: 'تحقيق 1,000 دقيقة استماع لإذاعات وتلاوات القرآن الكريم للرَّكْب ككل.',
    targetType: 'audio_minutes',
    targetAmount: 1000,
    currentAmount: 0,
    bonusPoints: 5000,
    isCompleted: false,
    icon: "icon:headphones",
    scheduleType: 'all_time',
    category: 'milestone'
  },
  {
    id: 'quest_50000_tasbeeh',
    title: 'ميدان المسبحة الكبرى (٥٠ ألف ذكر)',
    description: 'الوصول إلى 50,000 ذكر واستغفار في مسيرة الرَّكْب الكبرى.',
    targetType: 'tasbeeh',
    targetAmount: 50000,
    currentAmount: 0,
    bonusPoints: 15000,
    isCompleted: false,
    icon: "icon:gem",
    scheduleType: 'all_time',
    category: 'milestone'
  }
];

export interface ClanTerritoryInfluence {
  clanId: string;
  clanName: string;
  clanBadge: string;
  bannerColor: string;
  totalPoints: number;
  isUnlocked: boolean;
  isBuilding: boolean;
  progressPercent: number;
  influenceShare: number;
}

export interface TerritoryDominanceInfo {
  territory: Territory;
  dominantClan: {
    clanId: string;
    clanName: string;
    clanBadge: string;
    bannerColor: string;
    sharePercent: number;
  } | null;
  contestingClans: ClanTerritoryInfluence[];
  heatLevel: number;
  totalContributedPoints: number;
}

export function calculateTerritoriesDominance(clans: Clan[]): Record<string, TerritoryDominanceInfo> {
  const result: Record<string, TerritoryDominanceInfo> = {};
  for (const t of TERRITORIES) {
    const list: (ClanTerritoryInfluence & { rawWeight: number })[] = [];
    let sumMetric = 0;

    for (const c of clans) {
      const unlocked = Boolean(c.unlockedTerritories?.includes(t.id));
      const building = Boolean(c.territoryProjects?.[t.id] && !c.territoryProjects[t.id].isCompleted);
      const progress = unlocked ? 100 : Math.min(99, Math.round(((c.totalPoints || 0) / t.cost) * 100));

      if (progress > 0 || unlocked) {
        const weight = unlocked ? t.cost + (c.totalPoints || 0) * 0.1 : Math.min(c.totalPoints || 0, t.cost);
        sumMetric += weight;
        list.push({
          clanId: c.id,
          clanName: c.name,
          clanBadge: c.badgeIcon,
          bannerColor: c.bannerColor || 'from-emerald-800 to-teal-950',
          totalPoints: c.totalPoints || 0,
          isUnlocked: unlocked,
          isBuilding: building,
          progressPercent: progress,
          influenceShare: 0,
          rawWeight: weight
        });
      }
    }

    list.sort((a, b) => b.rawWeight - a.rawWeight);
    const contesting: ClanTerritoryInfluence[] = list.slice(0, 5).map(item => ({
      clanId: item.clanId,
      clanName: item.clanName,
      clanBadge: item.clanBadge,
      bannerColor: item.bannerColor,
      totalPoints: item.totalPoints,
      isUnlocked: item.isUnlocked,
      isBuilding: item.isBuilding,
      progressPercent: item.progressPercent,
      influenceShare: sumMetric > 0 ? Math.round((item.rawWeight / sumMetric) * 100) : 0
    }));

    const top = contesting[0] || null;
    const dominantClan = top ? {
      clanId: top.clanId,
      clanName: top.clanName,
      clanBadge: top.clanBadge,
      bannerColor: top.bannerColor,
      sharePercent: top.influenceShare
    } : null;

    const heat = contesting.length >= 2
      ? Math.min(100, Math.round(100 - Math.abs((contesting[0]?.influenceShare || 0) - (contesting[1]?.influenceShare || 0))))
      : contesting.length === 1 ? 45 : 5;

    result[t.id] = {
      territory: t,
      dominantClan,
      contestingClans: contesting,
      heatLevel: heat,
      totalContributedPoints: sumMetric
    };
  }
  return result;
}

import {
  contributionProgress,
  unlockedProgress,
  SPEEDUP_RATES,
  calculateStreakMultiplier,
  getActiveBlessedTime,
  getCurrentIslamicWeekId,
  QURAN_JUZS,
  getJuzFromPage,
  isRibatSaharActive,
  isFridayGoldenHourActive,
  getDaysSinceActive,
  JOINT_MEGA_PROJECTS,
  JointMegaProjectTemplate,
  QuranJuzMeta
} from './clanRules';

export interface JointMegaProjectState {
  id: string;
  name: string;
  arabicTitle: string;
  description: string;
  icon: string;
  targetPoints: number;
  clan1Contributed: number;
  clan2Contributed: number;
  totalContributed: number;
  isCompleted: boolean;
  completedAt?: number | null;
  mapCoords: { x: number; y: number };
  perk: string;
}

export interface ClanTwinningPact {
  id: string;
  clan1Id: string;
  clan1Name: string;
  clan1Badge: string;
  clan2Id: string;
  clan2Name: string;
  clan2Badge: string;
  status: 'pending' | 'active' | 'completed';
  requestedByClanId: string;
  requestedByName: string;
  requestedAt: number;
  acceptedAt?: number | null;
  jointProject: JointMegaProjectState;
  recentContributions?: Array<{
    userId: string;
    userName: string;
    clanId: string;
    clanName: string;
    points: number;
    worshipType: string;
    timestamp: number;
  }>;
}

export function createInitialClanKhatma(khatmaNumber = 1): ClanKhatma {
  const slots: Record<string, ClanKhatmaSlot> = {};
  for (const j of QURAN_JUZS) {
    slots[String(j.juzNumber)] = {
      juzNumber: j.juzNumber,
      juzName: j.name,
      startPage: j.startPage,
      endPage: j.endPage,
      totalPages: j.totalPages,
      claimedByUserId: null,
      claimedByName: null,
      claimedAt: null,
      readPages: [],
      isCompleted: false,
      completedAt: null
    };
  }
  return {
    khatmaNumber,
    slots,
    completedCount: 0,
    isCompleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}
const clanRef = (id: string) => doc(db, 'artifacts', APP_ID, 'public', 'data', 'clans', id);
const clanTwinRef = (id: string) => doc(db, 'artifacts', APP_ID, 'public', 'data', 'clan_twins', id);
const profileRef = (id: string) => doc(db, 'artifacts', APP_ID, 'users', id, 'stats', 'profile');
const memberRef = (clanId: string, userId: string) => doc(clanRef(clanId), 'members', userId);
const joinRequestRef = (clanId: string, userId: string) => doc(clanRef(clanId), 'joinRequests', userId);
const userJoinRequestRef = (userId: string) => doc(db, 'artifacts', APP_ID, 'users', userId, 'stats', 'clanJoinRequest');
const globalQuestsRef = () => collection(db, 'artifacts', APP_ID, 'public', 'data', 'global_clan_quests');
const requireUser = (userId?: string) => {
  if (!auth.currentUser || (userId && auth.currentUser.uid !== userId)) throw new Error('سجّل الدخول للمشاركة مع الرَّكْب.');
  return auth.currentUser.uid;
};

export function computeMemberStreak(prevStreak = 0, lastActiveDate = ''): number {
  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

  if (lastActiveDate === today) {
    return Math.max(1, prevStreak);
  } else if (lastActiveDate === yesterday) {
    return prevStreak + 1;
  } else {
    return 1;
  }
}
function pointsUpdate(clan: Clan, points: number, memberCount = clan.memberCount) {
  const projects = { ...(clan.territoryProjects || {}) };
  const unlocked = new Set(clan.unlockedTerritories || []);
  let capacityBonus = 0;

  for (const t of TERRITORIES) {
    if (unlocked.has(t.id)) {
      capacityBonus += t.capacityBonus;
      continue;
    }
    if (points >= t.cost) {
      if (!projects[t.id]) {
        // Automatically start construction phase for this landmark
        projects[t.id] = {
          territoryId: t.id,
          startedAt: Date.now(),
          durationHours: t.buildDurationHours,
          reducedHours: 0,
          isCompleted: false,
          contributions: []
        };
      } else {
        const p = projects[t.id];
        const elapsed = Math.max(0, (Date.now() - p.startedAt) / (1000 * 3600)) + (p.reducedHours || 0);
        if (elapsed >= p.durationHours) {
          p.isCompleted = true;
          unlocked.add(t.id);
          capacityBonus += t.capacityBonus;
        }
      }
    }
  }

  return {
    totalPoints: points,
    memberCount,
    isEligibleForMap: true,
    unlockedTerritories: Array.from(unlocked),
    territoryProjects: projects,
    maxCapacity: (clan.maxCapacity || 10) + capacityBonus,
    updatedAt: serverTimestamp()
  };
}
class ClanService {
  public subscribeToClans(callback: (clans: Clan[]) => void, onError?: (error: Error) => void) {
    return onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'clans'), orderBy('totalPoints', 'desc'), limit(50)), snap => callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as Clan))), error => onError?.(error));
  }
  public subscribeToUserClan(userId: string, callback: (id: string | null) => void, onError?: (error: Error) => void) {
    return onSnapshot(profileRef(userId), snap => callback(snap.data()?.clanId || null), error => onError?.(error));
  }
  public subscribeToClan(id: string, callback: (clan: Clan | null) => void, onError?: (error: Error) => void) {
    return onSnapshot(clanRef(id), snap => callback(snap.exists() ? { ...snap.data(), id: snap.id } as Clan : null), error => onError?.(error));
  }
  public subscribeToClanMembers(id: string, callback: (members: ClanMember[]) => void, onError?: (error: Error) => void) {
    return onSnapshot(
      query(collection(clanRef(id), 'members'), orderBy('contributedPoints', 'desc')),
      snap => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as ClanMember));
        // Auto-reconcile memberCount in clan doc if it diverged
        if (list.length > 0) {
          getDoc(clanRef(id)).then(cSnap => {
            if (cSnap.exists()) {
              const current = cSnap.data()?.memberCount;
              if (current !== list.length) {
                updateDoc(clanRef(id), { memberCount: list.length, updatedAt: serverTimestamp() }).catch(() => {});
              }
            }
          }).catch(() => {});
        }
        callback(list);
      },
      error => onError?.(error)
    );
  }
  public async getUserClanId(userId: string): Promise<string | null> {
    return (await getDoc(profileRef(userId))).data()?.clanId || null;
  }
  public async createClan(
    userId: string,
    userName: string,
    data: {
      name: string;
      description: string;
      badgeIcon: string;
      bannerColor: string;
      isPrivate?: boolean;
      joinPasscode?: string;
      joinPolicy?: ClanJoinPolicy;
    },
    initialPersonalXp = 0
  ): Promise<string> {
    requireUser(userId);
    if (data.name.trim().length < 3 || data.name.trim().length > 32) throw new Error('اسم الرَّكْب من 3 إلى 32 حرفًا.');
    if (data.description.trim().length > 160) throw new Error('وصف الرَّكْب لا يتجاوز 160 حرفًا.');
    const policy: ClanJoinPolicy = data.joinPolicy || (data.isPrivate ? 'passcode' : 'open');
    if ((policy === 'passcode' || policy === 'hybrid') && (!data.joinPasscode || data.joinPasscode.trim().length < 4)) {
      throw new Error('يرجى تحديد رقم سري مكون من 4 خانات على الأقل.');
    }
    const ref = doc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'clans'));
    await runTransaction(db, async tx => {
      const profile = await tx.get(profileRef(userId));
      if (profile.data()?.clanId) throw new Error('أنت منضم بالفعل إلى رَكْب آخر.');
      tx.set(ref, {
        name: data.name.trim(),
        description: data.description.trim(),
        badgeIcon: data.badgeIcon,
        bannerColor: data.bannerColor,
        leaderId: userId,
        leaderName: userName,
        memberCount: 1,
        maxCapacity: 10,
        totalPoints: 0,
        individualPoints: 0,
        questBonusPoints: 0,
        unlockedTerritories: [],
        isEligibleForMap: true,
        joinPolicy: policy,
        isPrivate: policy === 'passcode' || policy === 'hybrid',
        ...((policy === 'passcode' || policy === 'hybrid') && data.joinPasscode ? { joinPasscode: data.joinPasscode.trim() } : {}),
        clanTag: '#' + ref.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      tx.set(memberRef(ref.id, userId), { name: userName, role: 'leader', contributedPoints: 0, joinedPersonalXp: initialPersonalXp, joinedAt: serverTimestamp() });
      tx.set(profileRef(userId), { clanId: ref.id, clanName: data.name.trim(), clanBadge: data.badgeIcon }, { merge: true });
    });
    return ref.id;
  }
  public async updateClanSettings(
    clanId: string,
    leaderId: string,
    data: {
      name: string;
      description: string;
      badgeIcon: string;
      bannerColor: string;
      isPrivate: boolean;
      joinPasscode?: string;
      joinPolicy?: ClanJoinPolicy;
    }
  ): Promise<void> {
    requireUser(leaderId);
    if (data.name.trim().length < 3 || data.name.trim().length > 32) throw new Error('اسم القبيلة من 3 إلى 32 حرفًا.');
    if (data.description.trim().length > 160) throw new Error('وصف القبيلة لا يتجاوز 160 حرفًا.');
    const policy: ClanJoinPolicy = data.joinPolicy || (data.isPrivate ? 'passcode' : 'open');
    if ((policy === 'passcode' || policy === 'hybrid') && (!data.joinPasscode || data.joinPasscode.trim().length < 4)) {
      throw new Error('يرجى كتابة رقم سري مكون من 4 خانات على الأقل.');
    }

    const cRef = clanRef(clanId);
    const cDoc = await getDoc(cRef);
    if (!cDoc.exists()) throw new Error('القبيلة غير موجودة.');
    const clan = cDoc.data() as Clan;
    if (clan.leaderId !== leaderId) throw new Error('فقط قائد القبيلة يملك صلاحية تعديل الإعدادات.');

    await updateDoc(cRef, {
      name: data.name.trim(),
      description: data.description.trim(),
      badgeIcon: data.badgeIcon,
      bannerColor: data.bannerColor,
      joinPolicy: policy,
      isPrivate: policy === 'passcode' || policy === 'hybrid',
      joinPasscode: (policy === 'passcode' || policy === 'hybrid') ? data.joinPasscode?.trim() || '' : '',
      updatedAt: serverTimestamp()
    });

    try {
      await updateDoc(profileRef(leaderId), {
        clanName: data.name.trim(),
        clanBadge: data.badgeIcon
      });
    } catch (e) {}
  }
  public async kickMember(clanId: string, leaderId: string, memberId: string): Promise<void> {
    requireUser(leaderId);
    if (leaderId === memberId) throw new Error('لا يمكن للقائد إخلاء مقعد نفسه؛ استخدم نقل القيادة أو تفكيك الرَّكْب.');

    await runTransaction(db, async tx => {
      const [cDoc, mDoc] = await Promise.all([
        tx.get(clanRef(clanId)),
        tx.get(memberRef(clanId, memberId))
      ]);

      if (!cDoc.exists()) throw new Error('الرَّكْب غير موجود.');
      const clan = cDoc.data() as Clan;
      if (clan.leaderId !== leaderId) throw new Error('فقط قائد الرَّكْب يملك صلاحية إخلاء مقاعد الأعضاء.');
      if (!mDoc.exists()) throw new Error('هذا الرفيق غير مسجل في الرَّكْب.');

      tx.delete(memberRef(clanId, memberId));
      tx.update(clanRef(clanId), {
        memberCount: Math.max(1, (clan.memberCount || 1) - 1),
        updatedAt: serverTimestamp()
      });
      tx.set(profileRef(memberId), { clanId: null, clanName: null, clanBadge: null }, { merge: true });
    });
  }
  public async joinClan(id: string, userId: string, userName: string, passcode?: string, initialPersonalXp = 0): Promise<boolean> {
    requireUser(userId);
    await runTransaction(db, async tx => {
      const [c, p, m] = await Promise.all([tx.get(clanRef(id)), tx.get(profileRef(userId)), tx.get(memberRef(id, userId))]);
      if (!c.exists()) throw new Error('هذا الرَّكْب لم يعد متاحاً.');
      if (p.data()?.clanId === id && m.exists()) return;
      if (p.data()?.clanId || m.exists()) throw new Error('أنت منضم بالفعل إلى رَكْب آخر.');
      const clan = c.data() as Clan;
      if (clan.memberCount >= (clan.maxCapacity || 10)) throw new Error('اكتملت سعة هذا الرَّكْب؛ اختر ركباً آخر.');
      
      const policy: ClanJoinPolicy = clan.joinPolicy || (clan.isPrivate ? 'passcode' : 'open');
      if (policy === 'passcode') {
        if (!clan.joinPasscode || passcode?.trim() !== clan.joinPasscode.trim()) throw new Error('رمز الانضمام غير صحيح.');
      } else if (policy === 'approval') {
        throw new Error('هذا الرَّكْب يتطلب إرسال طلب انضمام وموافقة القائد أولاً.');
      } else if (policy === 'hybrid') {
        if (!clan.joinPasscode || passcode?.trim() !== clan.joinPasscode.trim()) {
          throw new Error('رمز الانضمام غير صحيح. يمكنك بدلاً من ذلك إرسال طلب انضمام لقائد الرَّكْب.');
        }
      }

      tx.set(memberRef(id, userId), { name: userName, role: 'member', contributedPoints: 0, joinedPersonalXp: initialPersonalXp, joinedAt: serverTimestamp() });
      tx.update(clanRef(id), pointsUpdate(clan, clan.totalPoints || 0, clan.memberCount + 1));
      tx.set(profileRef(userId), { clanId: id, clanName: clan.name, clanBadge: clan.badgeIcon }, { merge: true });
      tx.delete(joinRequestRef(id, userId));
      tx.delete(userJoinRequestRef(userId));
    });
    return true;
  }
  public async requestToJoinClan(clanId: string, userId: string, userName: string, message = '', personalXp = 0): Promise<{ success: boolean; message: string }> {
    requireUser(userId);
    const cRef = clanRef(clanId);
    const cDoc = await getDoc(cRef);
    if (!cDoc.exists()) throw new Error('هذا الرَّكْب لم يعد متاحاً.');
    const clan = cDoc.data() as Clan;
    if (clan.memberCount >= (clan.maxCapacity || 10)) throw new Error('سعة هذا الرَّكْب مكتملة حالياً.');
    
    const pSnap = await getDoc(profileRef(userId));
    if (pSnap.exists() && pSnap.data()?.clanId) throw new Error('أنت منضم بالفعل إلى رَكْب آخر.');

    const reqRef = joinRequestRef(clanId, userId);
    const userReqRef = userJoinRequestRef(userId);

    const requestData: ClanJoinRequest = {
      id: userId,
      clanId,
      clanName: clan.name,
      userId,
      userName: userName || 'رفيق الخير',
      personalXp: personalXp || 0,
      message: message.trim().slice(0, 160),
      status: 'pending',
      createdAt: Date.now()
    };

    await Promise.all([
      setDoc(reqRef, requestData),
      setDoc(userReqRef, { clanId, clanName: clan.name, status: 'pending', createdAt: Date.now() })
    ]);

    return { success: true, message: "تم إرسال طلب الانضمام بنجاح إلى قائد الرَّكْب " };
  }
  public async cancelJoinRequest(clanId: string, userId: string): Promise<void> {
    requireUser(userId);
    await Promise.all([
      deleteDoc(joinRequestRef(clanId, userId)).catch(() => {}),
      deleteDoc(userJoinRequestRef(userId)).catch(() => {})
    ]);
  }
  public async getPendingJoinRequests(clanId: string): Promise<ClanJoinRequest[]> {
    try {
      const snap = await getDocs(query(collection(clanRef(clanId), 'joinRequests'), where('status', '==', 'pending')));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as ClanJoinRequest));
    } catch {
      return [];
    }
  }
  public subscribeToPendingJoinRequests(clanId: string, callback: (reqs: ClanJoinRequest[]) => void): () => void {
    const q = query(collection(clanRef(clanId), 'joinRequests'), where('status', '==', 'pending'));
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as ClanJoinRequest));
      callback(list);
    }, err => {
      console.warn('Error subscribing to join requests:', err);
      callback([]);
    });
  }
  public async acceptJoinRequest(clanId: string, leaderId: string, request: ClanJoinRequest): Promise<void> {
    requireUser(leaderId);
    await runTransaction(db, async tx => {
      const cDoc = await tx.get(clanRef(clanId));
      if (!cDoc.exists()) throw new Error('الرَّكْب غير موجود.');
      const clan = cDoc.data() as Clan;
      if (clan.leaderId !== leaderId) throw new Error('فقط قائد الرَّكْب يملك صلاحية قبول الطلبات.');
      if (clan.memberCount >= (clan.maxCapacity || 10)) throw new Error('السعة مكتملة، لا يمكن إضافة أعضاء جدد.');

      const pDoc = await tx.get(profileRef(request.userId));
      if (pDoc.exists() && pDoc.data()?.clanId && pDoc.data()?.clanId !== clanId) {
        tx.delete(joinRequestRef(clanId, request.userId));
        tx.delete(userJoinRequestRef(request.userId));
        throw new Error('هذا الرفيق انضم إلى رَكْب آخر بالفعل.');
      }

      tx.set(memberRef(clanId, request.userId), {
        name: request.userName || 'رفيق الخير',
        role: 'member',
        contributedPoints: 0,
        joinedPersonalXp: request.personalXp || 0,
        joinedAt: serverTimestamp()
      });

      tx.update(clanRef(clanId), pointsUpdate(clan, clan.totalPoints || 0, clan.memberCount + 1));
      tx.set(profileRef(request.userId), { clanId, clanName: clan.name, clanBadge: clan.badgeIcon }, { merge: true });

      tx.delete(joinRequestRef(clanId, request.userId));
      tx.delete(userJoinRequestRef(request.userId));
    });

    this.pushClanActivity(clanId, {
      userId: request.userId,
      userName: request.userName,
      actionType: 'check_in',
      icon: "icon:handheart",
      message: `رحّب الرَّكْب بانضمام الرفيق «${request.userName}» بصحبة الخير `,
      highlightText: request.userName
    }).catch(() => {});
  }
  public async rejectJoinRequest(clanId: string, leaderId: string, applicantUserId: string): Promise<void> {
    requireUser(leaderId);
    const cDoc = await getDoc(clanRef(clanId));
    if (!cDoc.exists() || (cDoc.data() as Clan).leaderId !== leaderId) {
      throw new Error('فقط قائد الرَّكْب يملك صلاحية رفض الطلبات.');
    }
    await Promise.all([
      deleteDoc(joinRequestRef(clanId, applicantUserId)).catch(() => {}),
      deleteDoc(userJoinRequestRef(applicantUserId)).catch(() => {})
    ]);
  }
  public async getUserPendingJoinRequest(userId: string): Promise<{ clanId: string; clanName: string } | null> {
    try {
      const snap = await getDoc(userJoinRequestRef(userId));
      if (snap.exists() && snap.data()?.status === 'pending') {
        return { clanId: snap.data().clanId, clanName: snap.data().clanName };
      }
    } catch {}
    return null;
  }
  public async leaveClan(id: string, userId: string): Promise<void> {
    requireUser(userId);
    await runTransaction(db, async tx => {
      const [c, p, m] = await Promise.all([tx.get(clanRef(id)), tx.get(profileRef(userId)), tx.get(memberRef(id, userId))]);
      if (p.data()?.clanId !== id) throw new Error('تغيّرت عضويتك؛ أعد فتح الصفحة.');
      if (c.exists() && m.exists()) {
        const clan = c.data() as Clan;
        if (clan.leaderId === userId && clan.memberCount > 1) throw new Error('انقل القيادة إلى أحد رفقاء الرَّكْب قبل المغادرة.');
        tx.delete(memberRef(id, userId));
        tx.update(clanRef(id), { memberCount: Math.max(0, clan.memberCount - 1), isEligibleForMap: true, ...(clan.leaderId === userId ? { leaderId: '', leaderName: '' } : {}), updatedAt: serverTimestamp() });
      }
      tx.set(profileRef(userId), { clanId: null, clanName: null, clanBadge: null }, { merge: true });
    });
  }
  public async deleteClan(id: string, userId: string): Promise<void> {
    requireUser(userId);
    const cRef = clanRef(id);
    const cDoc = await getDoc(cRef);
    if (!cDoc.exists()) {
      try {
        const pSnap = await getDoc(profileRef(userId));
        if (pSnap.exists() && pSnap.data()?.clanId === id) {
          await updateDoc(profileRef(userId), { clanId: null, clanName: null, clanBadge: null });
        }
      } catch (e) {}
      return;
    }
    const clan = cDoc.data() as Clan;
    if (clan.leaderId && clan.leaderId !== userId) {
      const userMemberDoc = await getDoc(memberRef(id, userId));
      if (!userMemberDoc.exists()) {
        throw new Error('فقط قائد الرَّكْب يملك صلاحية تفكيك وحل الرَّكْب.');
      }
    }

    try {
      const membersSnap = await getDocs(collection(cRef, 'members'));
      await Promise.all(membersSnap.docs.map(async mDoc => {
        const mUid = mDoc.id;
        try {
          const pSnap = await getDoc(profileRef(mUid));
          if (pSnap.exists() && pSnap.data()?.clanId === id) {
            await updateDoc(profileRef(mUid), { clanId: null, clanName: null, clanBadge: null });
          }
        } catch (e) {
          console.warn('Profile cleanup error', mUid, e);
        }
        return deleteDoc(mDoc.ref);
      }));
    } catch (e) {
      console.warn('Members cleanup error', e);
    }

    try {
      const pSnap = await getDoc(profileRef(userId));
      if (pSnap.exists() && pSnap.data()?.clanId === id) {
        await updateDoc(profileRef(userId), { clanId: null, clanName: null, clanBadge: null });
      }
    } catch (e) {}

    try {
      const questsSnap = await getDocs(collection(cRef, 'quests'));
      await Promise.all(questsSnap.docs.map(qDoc => deleteDoc(qDoc.ref)));
    } catch (e) {}

    await deleteDoc(cRef);
  }
  public async transferLeadership(id: string, successorId: string): Promise<void> {
    const userId = requireUser();
    await runTransaction(db, async tx => {
      const [c, next, current] = await Promise.all([tx.get(clanRef(id)), tx.get(memberRef(id, successorId)), tx.get(memberRef(id, userId))]);
      if (!c.exists() || c.data().leaderId !== userId || !current.exists() || !next.exists() || successorId === userId) throw new Error('تعذر نقل القيادة لهذا العضو.');
      tx.update(clanRef(id), { leaderId: successorId, leaderName: next.data().name, updatedAt: serverTimestamp() });
      tx.update(memberRef(id, userId), { role: 'member' });
      tx.update(memberRef(id, successorId), { role: 'leader' });
    });
  }
  public async recordClanActivity(userId: string, points: number): Promise<void> {
    if (!Number.isFinite(points) || points <= 0) return;
    try {
      requireUser(userId);
      await runTransaction(db, async tx => {
        const p = await tx.get(profileRef(userId));
        const id = p.data()?.clanId;
        if (!id) return;
        const [c, m] = await Promise.all([tx.get(clanRef(id)), tx.get(memberRef(id, userId))]);
        if (!c.exists() || !m.exists()) return;
        const clan = c.data() as Clan;
        const memberData = m.data() as ClanMember;
        const today = new Date().toISOString().slice(0, 10);

        const streakDays = computeMemberStreak(memberData.streakDays, memberData.lastActiveDate);
        const streakBonus = calculateStreakMultiplier(streakDays);
        const blessedBonus = getActiveBlessedTime();
        const combinedMultiplier = streakBonus.multiplier * (blessedBonus?.multiplier || 1.0);
        const multipliedPoints = Math.round(points * combinedMultiplier);

        tx.update(memberRef(id, userId), {
          contributedPoints: increment(multipliedPoints),
          streakDays,
          lastActiveDate: today,
          lastActive: serverTimestamp()
        });
        tx.update(clanRef(id), {
          ...pointsUpdate(clan, (clan.totalPoints || 0) + multipliedPoints),
          individualPoints: increment(multipliedPoints)
        });

        if (multipliedPoints >= 100) {
          this.pushClanActivity(id, {
            userId,
            userName: memberData.name || 'رفيق بالركب',
            actionType: 'tasbeeh',
            icon: "icon:circle",
            message: `ساهم ${memberData.name || 'رفيق بالركب'} بـ ${multipliedPoints.toLocaleString('ar-EG')} تسبيحة وطاعة في مسيرة الرَّكْب `,
            highlightText: `بـ ${multipliedPoints.toLocaleString('ar-EG')} تسبيحة`
          }).catch(() => {});
        }

        if (clan.twinPactId && clan.twinStatus === 'active') {
          this.contributeToJointProject(
            clan.twinPactId,
            id,
            Math.round(multipliedPoints * 0.15),
            'طاعات الركب المبارك',
            userId,
            memberData.name || 'رفيق بالركب'
          ).catch(err => console.warn('Joint project auto contribution sync:', err));
        }
      });
    } catch (error) { console.warn('Clan points could not sync', error); }
  }
  public async contributeToQuest(id: string, questId: string, amount: number, _targetQuest?: ClanQuest, operationId = crypto.randomUUID(), actingUserId?: string): Promise<{ completed: boolean; bonusAwarded: number; accepted: number }> {
    const userId = actingUserId || auth.currentUser?.uid || requireUser();
    if (!navigator.onLine) throw new Error('اتصل بالإنترنت لحفظ مساهمتك.');
    const currentWeekId = getCurrentIslamicWeekId();
    const isWeekly = questId.startsWith('quest_weekly_') || questId === 'quest_kahf_friday';
    const questDocKey = isWeekly ? `${questId}_${currentWeekId}` : questId;

    const questRef = doc(clanRef(id), 'quests', questDocKey);
    const receiptRef = doc(memberRef(id, userId), 'contributions', operationId);
    const globalRef = doc(globalQuestsRef(), questId);
    const day = new Date().toISOString().slice(0, 10);
    return runTransaction(db, async tx => {
      const [c, m, p, q, g, receipt] = await Promise.all([tx.get(clanRef(id)), tx.get(memberRef(id, userId)), tx.get(profileRef(userId)), tx.get(questRef), tx.get(globalRef), tx.get(receiptRef)]);
      if (!c.exists() || !m.exists() || p.data()?.clanId !== id) throw new Error('انضم إلى الرَّكْب قبل تسجيل مساهمة.');
      if (receipt.exists()) return { completed: Boolean(receipt.data().completed), bonusAwarded: 0, accepted: 0 };
      const definition = g.exists() ? { ...g.data(), id: g.id } as ClanQuest : DEFAULT_CLAN_QUESTS.find(item => item.id === questId);
      if (!definition) throw new Error('هذا التحدي لم يعد متاحًا.');
      if ((definition.scheduleType === 'friday_only' || questId === 'quest_kahf_friday') && !isFridayTime()) {
        throw new Error('هذا التحدي مبارك وخاص بيوم الجمعة فقط (يبدأ من مغرب الخميس).');
      }
      const tallyRef = doc(memberRef(id, userId), 'questTotals', questDocKey + (definition.targetType === 'collective_khatma' ? '' : '_' + day));
      const tally = await tx.get(tallyRef);
      const result = contributionProgress({ ...definition, currentAmount: q.data()?.currentAmount || 0, isCompleted: Boolean(q.data()?.isCompleted) }, amount, tally.data()?.amount || 0);
      if (!result.accepted) return result;
      tx.set(questRef, { ...definition, currentAmount: result.currentAmount, isCompleted: result.completed, updatedAt: serverTimestamp() });
      tx.set(tallyRef, { amount: (tally.data()?.amount || 0) + result.accepted, updatedAt: serverTimestamp() });
      tx.set(receiptRef, { questId, amount: result.accepted, completed: result.completed, createdAt: serverTimestamp() });
      
      const memberData = m.data() as ClanMember;
      const today = new Date().toISOString().slice(0, 10);
      const streakDays = computeMemberStreak(memberData.streakDays, memberData.lastActiveDate);
      const streakBonus = calculateStreakMultiplier(streakDays);
      const blessedBonus = getActiveBlessedTime();
      const combinedMultiplier = streakBonus.multiplier * (blessedBonus?.multiplier || 1.0);

      const multipliedAccepted = Math.round(result.accepted * combinedMultiplier);
      const pointsEarned = multipliedAccepted + (result.bonusAwarded || 0);
      const clan = c.data() as Clan;

      tx.update(memberRef(id, userId), {
        contributedPoints: increment(multipliedAccepted),
        streakDays,
        lastActiveDate: today,
        lastActive: serverTimestamp()
      });
      tx.update(clanRef(id), {
        ...pointsUpdate(clan, (clan.totalPoints || 0) + pointsEarned),
        individualPoints: increment(multipliedAccepted),
        ...(result.bonusAwarded ? { questBonusPoints: increment(result.bonusAwarded) } : {})
      });

      return result;
    });
  }
  public subscribeToClanQuests(id: string, callback: (quests: ClanQuest[]) => void, onError?: (error: Error) => void) {
    let definitions: ClanQuest[] | null = null;
    let progress: Record<string, any> | null = null;
    const currentWeekId = getCurrentIslamicWeekId();
    const emit = () => {
      if (!definitions) return;
      const prog = progress || {};
      callback(definitions.map(q => {
        const isWeekly = q.scheduleType === 'weekly' || q.scheduleType === 'friday_only';
        const key = isWeekly ? `${q.id}_${currentWeekId}` : q.id;
        return {
          ...q,
          currentAmount: prog[key]?.currentAmount || 0,
          isCompleted: Boolean(prog[key]?.isCompleted)
        };
      }));
    };
    const a = this.subscribeToGlobalQuests(list => { definitions = list; emit(); }, onError);
    const b = onSnapshot(collection(clanRef(id), 'quests'), snap => { progress = Object.fromEntries(snap.docs.map(d => [d.id, d.data()])); emit(); }, error => onError?.(error));
    return () => { a(); b(); };
  }
  public subscribeToGlobalQuests(callback: (quests: ClanQuest[]) => void, onError?: (error: Error) => void) {
    return onSnapshot(globalQuestsRef(), snap => callback(snap.empty ? DEFAULT_CLAN_QUESTS : snap.docs.map(d => ({ ...d.data(), id: d.id } as ClanQuest))), error => onError?.(error));
  }
  public async autoContributeClanQuest(userId: string, type: ClanQuest['targetType'], amount: number, pageNumber?: number): Promise<void> {
    if (!Number.isSafeInteger(amount) || amount <= 0) return;
    const id = await this.getUserClanId(userId);
    if (!id) return;
    let quests: ClanQuest[] = [];
    try {
      const snap = await getDocs(globalQuestsRef());
      quests = snap.empty ? DEFAULT_CLAN_QUESTS : snap.docs.map(d => ({ ...d.data(), id: d.id } as ClanQuest));
    } catch {
      quests = DEFAULT_CLAN_QUESTS;
    }
    for (const quest of quests.filter(q => q.targetType === type)) {
      if ((quest.scheduleType === 'friday_only' || quest.id === 'quest_kahf_friday') && !isFridayTime()) {
        continue;
      }
      try {
        await this.contributeToQuest(id, quest.id, amount, quest, crypto.randomUUID(), userId);
      } catch (err) {
        console.warn('Auto contribute to clan quest error:', err);
      }
    }

    // 1. وبالأسحار هم يستغفرون: If pre-dawn Sahar window is active, record active worshipper presence
    if (isRibatSaharActive().isActive) {
      try {
        const p = await getDoc(profileRef(userId));
        const userName = p.data()?.clanName || auth.currentUser?.displayName || 'رفيق في الرَّكْب';
        const userBadge = p.data()?.clanBadge;
        const saharAction: 'quran' | 'tasbeeh' | 'salawat' | 'istighfar' = 
          type === 'quran_pages' ? 'quran' :
          type === 'salawat' ? 'salawat' :
          type === 'tasbeeh' ? 'tasbeeh' : 'istighfar';
        void this.lightSaharLantern(id, userId, userName, saharAction, userBadge);
      } catch (e) {
        console.warn('Sahar presence auto record error', e);
      }
    }

    // 2. Distributed Khatma: If pageNumber provided, record progress on claimed Juz slot!
    if (type === 'quran_pages' && pageNumber) {
      void this.recordKhatmaPageRead(id, userId, pageNumber);
    }

    // Automatically accelerate any active construction project if clan has one!
    try {
      const p = await getDoc(profileRef(userId));
      const userName = p.data()?.clanName || auth.currentUser?.displayName || 'رفيق في الرَّكْب';
      if (['quran_pages', 'salawat', 'audio_minutes', 'tasbeeh'].includes(type)) {
        void this.speedUpActiveProject(id, userId, userName, type as any, amount);
      }

      // Record real activity in clan feed
      if (type === 'tasbeeh' && amount >= 33) {
        void this.pushClanActivity(id, {
          userId,
          userName,
          actionType: 'tasbeeh',
          icon: "icon:circle",
          message: `سبّح واستغفر ${userName} ${amount.toLocaleString('ar-EG')} تسبيحة في ميزان الرَّكْب `,
          highlightText: `${amount.toLocaleString('ar-EG')} تسبيحة`
        });
      } else if (type === 'salawat' && amount >= 10) {
        void this.pushClanActivity(id, {
          userId,
          userName,
          actionType: 'salawat',
          icon: "icon:heart",
          message: `صلّى ${userName} على النبي ﷺ ${amount.toLocaleString('ar-EG')} مرة في ميزان الرَّكْب `,
          highlightText: `${amount.toLocaleString('ar-EG')} صلاة`
        });
      } else if (type === 'quran_pages' && amount >= 1) {
        void this.pushClanActivity(id, {
          userId,
          userName,
          actionType: 'quran',
          icon: "icon:book",
          message: `تلا ${userName} ${amount.toLocaleString('ar-EG')} ${amount === 1 ? 'صفحة' : 'صفحات'} من كتاب الله تعالى `,
          highlightText: `${amount.toLocaleString('ar-EG')} صفحة`
        });
      }
    } catch {
      // Non-blocking speedup & activity log
    }
  }

  public subscribeToClanKhatma(clanId: string, callback: (khatma: ClanKhatma) => void): () => void {
    const kRef = doc(clanRef(clanId), 'features', 'khatma');
    return onSnapshot(kRef, snap => {
      if (snap.exists()) {
        callback(snap.data() as ClanKhatma);
      } else {
        const initial = createInitialClanKhatma(1);
        setDoc(kRef, initial).catch(() => {});
        callback(initial);
      }
    }, err => {
      console.warn('Khatma subscribe error', err);
      callback(createInitialClanKhatma(1));
    });
  }

  public async claimKhatmaSlot(clanId: string, userId: string, userName: string, juzNumber: number): Promise<void> {
    requireUser(userId);
    const kRef = doc(clanRef(clanId), 'features', 'khatma');
    await runTransaction(db, async tx => {
      const snap = await tx.get(kRef);
      const data: ClanKhatma = snap.exists() ? (snap.data() as ClanKhatma) : createInitialClanKhatma(1);
      
      const userClaimedUnfinished = Object.values(data.slots || {}).filter(
        s => s.claimedByUserId === userId && !s.isCompleted
      );
      if (userClaimedUnfinished.length >= 3) {
        throw new Error('لقد حجزت 3 أجزاء جارية بالفعل؛ أتمم قراءتها أولاً لإتاحة الفرصة للرفقاء.');
      }

      const slot = data.slots[String(juzNumber)];
      if (!slot) throw new Error('رقم الجزء غير صحيح.');
      if (slot.isCompleted) throw new Error('هذا الجزء مكتمل ومقفل.');
      if (slot.claimedByUserId && slot.claimedByUserId !== userId) {
        throw new Error(`هذا الجزء محجوز حالياً للرفيق «${slot.claimedByName}».`);
      }

      slot.claimedByUserId = userId;
      slot.claimedByName = userName;
      slot.claimedAt = Date.now();
      data.updatedAt = Date.now();

      tx.set(kRef, data, { merge: true });
    });
  }

  public async unclaimKhatmaSlot(clanId: string, userId: string, juzNumber: number): Promise<void> {
    requireUser(userId);
    const kRef = doc(clanRef(clanId), 'features', 'khatma');
    await runTransaction(db, async tx => {
      const snap = await tx.get(kRef);
      if (!snap.exists()) return;
      const data = snap.data() as ClanKhatma;
      const slot = data.slots?.[String(juzNumber)];
      if (!slot) return;
      if (slot.claimedByUserId !== userId) throw new Error('لا يمكنك إلغاء حجز جزء مخصص لرفيق آخر.');
      if (slot.isCompleted) throw new Error('لا يمكن إلغاء حجز جزء تم إتمامه.');

      slot.claimedByUserId = null;
      slot.claimedByName = null;
      slot.claimedAt = null;
      slot.readPages = [];
      data.updatedAt = Date.now();

      tx.set(kRef, data, { merge: true });
    });
  }

  public async recordKhatmaPageRead(clanId: string, userId: string, pageNumber: number): Promise<{ juzCompleted: boolean; juzNumber: number } | null> {
    const juzMeta = getJuzFromPage(pageNumber);
    const kRef = doc(clanRef(clanId), 'features', 'khatma');
    try {
      return await runTransaction(db, async tx => {
        const snap = await tx.get(kRef);
        if (!snap.exists()) return null;
        const data = snap.data() as ClanKhatma;
        const slot = data.slots?.[String(juzMeta.juzNumber)];
        if (!slot) return null;
        if (slot.claimedByUserId !== userId || slot.isCompleted) return null;

        const pages = new Set(slot.readPages || []);
        pages.add(pageNumber);
        slot.readPages = Array.from(pages);

        let completed = false;
        if (slot.readPages.length >= slot.totalPages || (pageNumber === slot.endPage && slot.readPages.length >= 12)) {
          slot.isCompleted = true;
          slot.completedAt = Date.now();
          completed = true;
          data.completedCount = (data.completedCount || 0) + 1;
        }
        data.updatedAt = Date.now();

        let isEntireKhatmaComplete = false;
        if (data.completedCount >= 30) {
          data.isCompleted = true;
          data.completedAt = Date.now();
          isEntireKhatmaComplete = true;
        }

        tx.set(kRef, data, { merge: true });

        if (completed) {
          tx.update(memberRef(clanId, userId), { contributedPoints: increment(500) });
          tx.update(clanRef(clanId), { totalPoints: increment(1500), individualPoints: increment(500) });
          this.pushClanActivity(clanId, {
            userId,
            userName: slot.claimedByName || 'رفيق بالركب',
            actionType: 'khatma_juz',
            icon: "icon:book",
            message: `أتم ${slot.claimedByName || 'رفيق بالركب'} قراءة الجزء ${juzMeta.juzNumber} (${juzMeta.name}) كاملاً من الختمة التشاركية المباركة `,
            highlightText: `أتم الجزء ${juzMeta.juzNumber} كاملاً`
          }).catch(() => {});
        }
        if (isEntireKhatmaComplete) {
          tx.update(clanRef(clanId), { totalPoints: increment(20000), questBonusPoints: increment(20000) });
        }

        return { juzCompleted: completed, juzNumber: juzMeta.juzNumber };
      });
    } catch (e) {
      console.warn('recordKhatmaPageRead error', e);
      return null;
    }
  }

  public async recordKhatmaStandingPage(clanId: string, userId: string, juzNumber: number, standingPage: number): Promise<void> {
    const kRef = doc(clanRef(clanId), 'features', 'khatma');
    try {
      await runTransaction(db, async tx => {
        const snap = await tx.get(kRef);
        if (!snap.exists()) return;
        const data = snap.data() as ClanKhatma;
        const slot = data.slots?.[String(juzNumber)];
        if (!slot || slot.claimedByUserId !== userId || slot.isCompleted) return;

        const pages = new Set(slot.readPages || []);
        for (let p = slot.startPage; p <= standingPage; p++) {
          pages.add(p);
        }
        slot.readPages = Array.from(pages);

        let completed = false;
        if (slot.readPages.length >= slot.totalPages || (standingPage === slot.endPage && slot.readPages.length >= 12)) {
          slot.isCompleted = true;
          slot.completedAt = Date.now();
          completed = true;
          data.completedCount = (data.completedCount || 0) + 1;
        }
        data.updatedAt = Date.now();

        let isEntireKhatmaComplete = false;
        if (data.completedCount >= 30) {
          data.isCompleted = true;
          data.completedAt = Date.now();
          isEntireKhatmaComplete = true;
        }

        tx.set(kRef, data, { merge: true });

        if (completed) {
          tx.update(memberRef(clanId, userId), { contributedPoints: increment(500) });
          tx.update(clanRef(clanId), { totalPoints: increment(1500), individualPoints: increment(500) });
          const juzMeta = QURAN_JUZS.find(j => j.juzNumber === juzNumber);
          this.pushClanActivity(clanId, {
            userId,
            userName: slot.claimedByName || 'رفيق بالركب',
            actionType: 'khatma_juz',
            icon: "icon:book",
            message: `أتم ${slot.claimedByName || 'رفيق بالركب'} قراءة الجزء ${juzNumber} (${juzMeta?.name || ''}) كاملاً من الختمة التشاركية المباركة `,
            highlightText: `أتم الجزء ${juzNumber} كاملاً`
          }).catch(() => {});
        }
        if (isEntireKhatmaComplete) {
          tx.update(clanRef(clanId), { totalPoints: increment(20000), questBonusPoints: increment(20000) });
        }
      });
    } catch (e) {
      console.warn('recordKhatmaStandingPage error', e);
    }
  }

  public async startNewClanKhatma(clanId: string, userId: string): Promise<void> {
    requireUser(userId);
    const kRef = doc(clanRef(clanId), 'features', 'khatma');
    await runTransaction(db, async tx => {
      const snap = await tx.get(kRef);
      const prevNum = snap.exists() ? (snap.data()?.khatmaNumber || 1) : 1;
      const fresh = createInitialClanKhatma(prevNum + 1);
      tx.set(kRef, fresh);
    });
  }

  public subscribeToSaharNight(clanId: string, dateStr: string, callback: (night: RibatSaharNight) => void): () => void {
    const sRef = doc(clanRef(clanId), 'features', 'sahar_' + dateStr);
    return onSnapshot(sRef, snap => {
      if (snap.exists()) {
        callback(snap.data() as RibatSaharNight);
      } else {
        callback({ date: dateStr, lanterns: [], speedUpGranted: false });
      }
    }, () => {
      callback({ date: dateStr, lanterns: [], speedUpGranted: false });
    });
  }

  public async lightSaharLantern(
    clanId: string,
    userId: string,
    userName: string,
    actionType: 'quran' | 'tasbeeh' | 'salawat' | 'istighfar' = 'istighfar',
    userBadge?: string
  ): Promise<{ isFirstLantern: boolean; speedUpGranted: boolean; lanternsCount: number }> {
    requireUser(userId);
    if (!isRibatSaharActive().isActive) {
      throw new Error('محراب الأسحار غير متاح حالياً؛ يبدأ فقط في الثلث الأخير من الليل قبل أذان الفجر بـ ٩٠ دقيقة.');
    }
    const today = new Date().toISOString().slice(0, 10);
    const sRef = doc(clanRef(clanId), 'features', 'sahar_' + today);

    return runTransaction(db, async tx => {
      const snap = await tx.get(sRef);
      const data: RibatSaharNight = snap.exists() ? (snap.data() as RibatSaharNight) : { date: today, lanterns: [], speedUpGranted: false };
      
      const existingIndex = (data.lanterns || []).findIndex(l => l.userId === userId);
      const isFirstLantern = existingIndex === -1;
      
      if (isFirstLantern) {
        data.lanterns = [...(data.lanterns || []), { userId, userName, userBadge, litAt: Date.now(), actionType }];
      } else {
        // Update existing worshipper with latest timestamp and activity
        const updated = [...(data.lanterns || [])];
        updated[existingIndex] = {
          ...updated[existingIndex],
          userName: userName || updated[existingIndex].userName,
          litAt: Date.now(),
          actionType: actionType || updated[existingIndex].actionType,
          userBadge: userBadge || updated[existingIndex].userBadge
        };
        data.lanterns = updated;
      }

      tx.set(sRef, data, { merge: true });

      if (isFirstLantern) {
        const actionLabel = actionType === 'quran' ? 'بتلاوة القرآن' : actionType === 'salawat' ? 'بالصلاة على النبي ﷺ' : actionType === 'tasbeeh' ? 'بالتسبيح والذكر' : 'بالاستغفار والقيام';
        this.pushClanActivity(clanId, {
          userId,
          userName,
          actionType: 'sahar_lantern',
          icon: "icon:moon",
          message: `شهد ${userName} نفحة السحر ${actionLabel} (مضاعفة أجور الأسحار نشطة) `,
          highlightText: `شهد نفحة السحر `
        }).catch(() => {});
      }

      return { isFirstLantern, speedUpGranted: false, lanternsCount: data.lanterns.length };
    });
  }

  public async speedUpActiveProject(clanId: string, userId: string, userName: string, worshipType: 'salawat' | 'quran_pages' | 'audio_minutes' | 'tasbeeh', amount: number): Promise<{ hoursReduced: number; territoryName?: string } | null> {
    const rate = SPEEDUP_RATES[worshipType] || 0.05;
    const hoursToReduce = Math.min(6, Math.max(0.25, Math.round(amount * rate * 10) / 10));

    return runTransaction(db, async tx => {
      const c = await tx.get(clanRef(clanId));
      if (!c.exists()) return null;
      const clan = c.data() as Clan;
      const projects = { ...(clan.territoryProjects || {}) };

      const activeProjectKey = Object.keys(projects).find(k => !projects[k].isCompleted);
      if (!activeProjectKey) return null;

      const project = { ...projects[activeProjectKey] };
      const territory = TERRITORIES.find(t => t.id === project.territoryId);

      const newReduced = (project.reducedHours || 0) + hoursToReduce;
      const elapsedHours = Math.max(0, (Date.now() - project.startedAt) / (1000 * 3600)) + newReduced;
      const completed = elapsedHours >= project.durationHours;

      const contribution: SpeedUpContribution = {
        userId,
        userName,
        worshipType,
        worshipTitle: worshipType === 'quran_pages' ? 'تلاوة صفحات المصحف' : worshipType === 'tasbeeh' ? 'رياض التسبيح' : worshipType === 'salawat' ? 'الصلاة على النبي ﷺ' : 'استماع الإذاعة',
        hoursReduced: hoursToReduce,
        timestamp: Date.now()
      };

      project.reducedHours = newReduced;
      project.isCompleted = completed;
      project.contributions = [contribution, ...(project.contributions || [])].slice(0, 20);
      projects[activeProjectKey] = project;

      const unlocked = new Set(clan.unlockedTerritories || []);
      let capacityBonus = 0;
      if (completed) {
        unlocked.add(project.territoryId);
        if (territory) capacityBonus = territory.capacityBonus;
      }

      tx.update(clanRef(clanId), {
        territoryProjects: projects,
        unlockedTerritories: Array.from(unlocked),
        ...(capacityBonus > 0 ? { maxCapacity: increment(capacityBonus) } : {}),
        ...(completed ? { oasisKeys: increment(1) } : {}),
        updatedAt: serverTimestamp()
      });

      if (contribution.hoursReduced) {
        const timeReducedText = contribution.hoursReduced === 0.5 ? '٣٠ دقيقة' : contribution.hoursReduced === 1 ? 'ساعة' : contribution.hoursReduced === 2 ? 'ساعتين' : `${contribution.hoursReduced} ساعات`;
        this.pushClanActivity(clanId, {
          userId,
          userName,
          actionType: 'speed_up',
          icon: "icon:zap",
          message: `أتم ${userName} ${contribution.worshipTitle} واختصر ${timeReducedText} من تشييد ${territory?.name || 'المعلم'}`,
          highlightText: `اختصر ${timeReducedText} من تشييد ${territory?.name || 'المعلم'}`
        }).catch(() => {});
      }

      return { hoursReduced: contribution.hoursReduced, territoryName: territory?.name };
    }).catch(err => {
      console.warn('Speed-up transaction error:', err);
      return null;
    });
  }

  /**
   * استخدام مفتاح واحات إيماني لتسريع البناء فوراً بمقدار 4 ساعات
   */
  public async useOasisKey(
    clanId: string,
    userId: string,
    userName: string
  ): Promise<{ success: boolean; message: string }> {
    requireUser(userId);
    return runTransaction(db, async tx => {
      const cRef = clanRef(clanId);
      const snap = await tx.get(cRef);
      if (!snap.exists()) return { success: false, message: 'الرَّكْب غير موجود.' };
      const clan = snap.data() as Clan;
      const currentKeys = clan.oasisKeys || 0;
      if (currentKeys <= 0) {
        return { success: false, message: 'لا تملك قبيلتكم مفاتيح فتح حالياً. تُكتسب المفاتيح تلقائياً عند إتمام فتح الواحات.' };
      }

      const projects = { ...(clan.territoryProjects || {}) };
      const activeProjectKey = Object.keys(projects).find(k => !projects[k].isCompleted);
      if (!activeProjectKey) {
        return { success: false, message: 'لا يوجد مشروع قيد التشييد حالياً لاستخدام المفتاح عليه.' };
      }

      const project = { ...projects[activeProjectKey] };
      const territory = TERRITORIES.find(t => t.id === project.territoryId);

      const hoursToReduce = 4;
      const newReduced = (project.reducedHours || 0) + hoursToReduce;
      const elapsedHours = Math.max(0, (Date.now() - project.startedAt) / (1000 * 3600)) + newReduced;
      const completed = elapsedHours >= project.durationHours;

      const contribution: SpeedUpContribution = {
        userId,
        userName,
        worshipType: 'tasbeeh',
        worshipTitle: "مفتاح واحات ذهبي ",
        hoursReduced: hoursToReduce,
        timestamp: Date.now()
      };

      project.reducedHours = newReduced;
      project.isCompleted = completed;
      project.contributions = [contribution, ...(project.contributions || [])].slice(0, 20);
      projects[activeProjectKey] = project;

      const unlocked = new Set(clan.unlockedTerritories || []);
      let capacityBonus = 0;
      if (completed) {
        unlocked.add(project.territoryId);
        if (territory) capacityBonus = territory.capacityBonus;
      }

      tx.update(cRef, {
        oasisKeys: Math.max(0, currentKeys - 1),
        territoryProjects: projects,
        unlockedTerritories: Array.from(unlocked),
        ...(capacityBonus > 0 ? { maxCapacity: increment(capacityBonus) } : {}),
        ...(completed ? { oasisKeys: increment(1) } : {}),
        updatedAt: serverTimestamp()
      });

      this.pushClanActivity(clanId, {
        userId,
        userName,
        actionType: 'speed_up',
        icon: "icon:sparkles",
        message: `استخدم ${userName} مفتاح واحة ذهبي  واختصر ٤ ساعات كاملة من تشييد «${territory?.name || 'المعلم'}»! `,
        highlightText: "استخدم مفتاح واحة ذهبي  (-٤ ساعات)"
      }).catch(() => {});

      return {
        success: true,
        message: ` تم استخدام مفتاح الفتح واختصار ٤ ساعات كاملة من تشييد «${territory?.name || 'المعلم'}»!`
      };
    });
  }
  public async addGlobalQuest(quest: Omit<ClanQuest, 'id' | 'currentAmount' | 'isCompleted'>): Promise<string> {
    contributionProgress({ ...quest, currentAmount: 0, isCompleted: false }, 1);
    return (await addDoc(globalQuestsRef(), { ...quest, currentAmount: 0, isCompleted: false, createdAt: serverTimestamp() })).id;
  }
  public async updateGlobalQuest(id: string, updates: Partial<ClanQuest>): Promise<void> {
    await setDoc(doc(globalQuestsRef(), id), { ...updates, updatedAt: serverTimestamp() }, { merge: true });
  }
  public async deleteGlobalQuest(id: string): Promise<void> { await deleteDoc(doc(globalQuestsRef(), id)); }

  /**
   * أثر الغائب (التفقد):
   * إذا انقطع عضو يومين متتاليين، يظهر بجوار اسمه زر "تفقّد الرفيق" لبقية الأعضاء؛
   * عند الضغط عليه، يصله إشعار دافئ (مثلاً: "رفيقك في الركب يفتقد أثرك اليوم").
   * يُكافأ المتفقد بـ 50 نقطة إخاء، ويُسجل الإشعار للغائب ليجده فور عودته.
   */
  public async sendCompanionCheckIn(
    clanId: string,
    targetMemberId: string,
    senderId: string,
    senderName: string,
    customMessage?: string
  ): Promise<{ success: boolean; message: string; cooldown?: boolean }> {
    requireUser(senderId);
    if (senderId === targetMemberId) {
      return { success: false, message: 'لا يمكنك تفقّد نفسك!' };
    }

    const tMemberRef = memberRef(clanId, targetMemberId);
    const sMemberRef = memberRef(clanId, senderId);
    const snap = await getDoc(tMemberRef);
    if (!snap.exists()) {
      return { success: false, message: 'العضو غير موجود في هذا الركب.' };
    }

    const targetData = snap.data() as ClanMember;
    const now = Date.now();
    const lastChecked = targetData.lastCheckedInAt || 0;
    // مهلة تفقّد: 20 ساعة لمنع تكرار الإشعار أو الإزعاج
    if (now - lastChecked < 20 * 3600 * 1000) {
      return { success: false, message: 'تم تفقّد هذا الرفيق مؤخراً ووصله نداؤكم، جزاكم الله خيراً.', cooldown: true };
    }

    const defaultMsg = `رفيقك في الرَّكْب (${senderName}) يفتقد أثرك ويسأل عنك، عسى المانع خيراً! مكانك في الرَّكْب محفوظ وننتظر عودتك.`;
    const checkInMsg: ClanCheckInMessage = {
      fromUserId: senderId,
      fromUserName: senderName,
      sentAt: now,
      message: customMessage || defaultMsg
    };

    const existingMsgs = targetData.checkInMessages || [];
    const updatedMsgs = [checkInMsg, ...existingMsgs].slice(0, 5);

    // تحديث وثيقة العضو في الركب
    await updateDoc(tMemberRef, {
      lastCheckedInAt: now,
      checkInMessages: updatedMsgs
    });

    // تحديث بروفايل العضو ليظهر الإشعار في كامل التطبيق فور فتحه
    try {
      await updateDoc(profileRef(targetMemberId), {
        pendingClanCheckIn: {
          clanId,
          fromUserId: senderId,
          fromUserName: senderName,
          message: checkInMsg.message,
          sentAt: now
        }
      });
    } catch (e) {
      // قد لا يتوفر بروفايل أو تمنع الصلاحيات الكتابة المباشرة لبروفايل مستخدم آخر
    }

    // مكافأة المتفقد بنقاط إخاء في الرَّكْب (+50 نقطة)
    try {
      await updateDoc(sMemberRef, {
        contributedPoints: increment(50)
      });
      await updateDoc(clanRef(clanId), {
        totalPoints: increment(50),
        individualPoints: increment(50),
        updatedAt: serverTimestamp()
      });
      this.pushClanActivity(clanId, {
        userId: senderId,
        userName: senderName,
        actionType: 'check_in',
        icon: "icon:handheart",
        message: `تفقّد ${senderName} رفيقه الغائب ${targetData.name} وسأل عنه ودعا له بالخير `,
        highlightText: `تفقّد رفيقه ${targetData.name}`
      }).catch(() => {});
    } catch (e) {
      console.warn('Could not increment check-in sender points:', e);
    }

    return {
      success: true,
      message: `وصل سلامك وتفقّدك لأخيك (${targetData.name})، وكُتبت لك 50 نقطة إخاء في ميزان الرَّكْب.`
    };
  }

  /**
   * مسح رسائل التفقّد عند عودة الرفيق وقراءتها
   */
  public async dismissCompanionCheckIns(clanId: string, memberId: string): Promise<void> {
    requireUser(memberId);
    try {
      await updateDoc(memberRef(clanId, memberId), {
        checkInMessages: []
      });
    } catch (e) {
      console.warn('Could not dismiss clan check-in messages:', e);
    }
    try {
      await updateDoc(profileRef(memberId), {
        pendingClanCheckIn: deleteField()
      });
    } catch (e) {
      // ignore
    }
  }

  /**
   * إرسال طلب مؤاخاة (Twinning Request) من قائد رَكْب إلى رَكْب آخر
   */
  public async sendTwinningRequest(
    myClanId: string,
    targetClanId: string,
    leaderId: string,
    projectId = 'dam_of_concord'
  ): Promise<{ success: boolean; message: string }> {
    requireUser(leaderId);
    if (myClanId === targetClanId) {
      return { success: false, message: 'لا يمكن مؤاخاة الرَّكْب مع نفسه!' };
    }

    const mySnap = await getDoc(clanRef(myClanId));
    const targetSnap = await getDoc(clanRef(targetClanId));
    if (!mySnap.exists() || !targetSnap.exists()) {
      return { success: false, message: 'أحد الركاب غير موجود.' };
    }

    const myClan = mySnap.data() as Clan;
    const targetClan = targetSnap.data() as Clan;

    if (myClan.leaderId !== leaderId) {
      return { success: false, message: 'المؤاخاة من صلاحيات قائد الرَّكْب فقط.' };
    }
    if (myClan.twinStatus === 'active') {
      return { success: false, message: 'رَكْبكم مرتبط بالفعل بميثاق مؤاخاة نشط.' };
    }
    if (targetClan.twinStatus === 'active') {
      return { success: false, message: 'الرَّكْب المطلوب مرتبط بالفعل بميثاق مؤاخاة مع قافلة أخرى.' };
    }

    const template = JOINT_MEGA_PROJECTS.find(p => p.id === projectId) || JOINT_MEGA_PROJECTS[0];
    const pactId = [myClanId, targetClanId].sort().join('_');

    const pact: ClanTwinningPact = {
      id: pactId,
      clan1Id: myClanId,
      clan1Name: myClan.name,
      clan1Badge: myClan.badgeIcon || "icon:leaf",
      clan2Id: targetClanId,
      clan2Name: targetClan.name,
      clan2Badge: targetClan.badgeIcon || "icon:leaf",
      status: 'pending',
      requestedByClanId: myClanId,
      requestedByName: myClan.name,
      requestedAt: Date.now(),
      jointProject: {
        id: template.id,
        name: template.name,
        arabicTitle: template.arabicTitle,
        description: template.description,
        icon: template.icon,
        targetPoints: template.targetPoints,
        clan1Contributed: 0,
        clan2Contributed: 0,
        totalContributed: 0,
        isCompleted: false,
        completedAt: null,
        mapCoords: template.mapCoords,
        perk: template.perk
      },
      recentContributions: []
    };

    await setDoc(clanTwinRef(pactId), pact, { merge: true });

    await updateDoc(clanRef(myClanId), {
      twinStatus: 'pending_sent',
      twinPendingClanId: targetClanId,
      twinPactId: pactId,
      updatedAt: serverTimestamp()
    });

    await updateDoc(clanRef(targetClanId), {
      twinStatus: 'pending_received',
      twinPendingClanId: myClanId,
      twinPactId: pactId,
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      message: `تم إرسال طلب المؤاخاة وبناء «${template.name}» إلى «${targetClan.name}» بنجاح `
    };
  }

  /**
   * الرد على طلب المؤاخاة (قبول أو اعتذار)
   */
  public async respondToTwinningRequest(
    pactId: string,
    myClanId: string,
    leaderId: string,
    accept: boolean
  ): Promise<{ success: boolean; message: string }> {
    requireUser(leaderId);
    const pactSnap = await getDoc(clanTwinRef(pactId));
    if (!pactSnap.exists()) {
      return { success: false, message: 'طلب المؤاخاة غير موجود أو تم إلغاؤه.' };
    }

    const pact = pactSnap.data() as ClanTwinningPact;
    const otherClanId = pact.clan1Id === myClanId ? pact.clan2Id : pact.clan1Id;
    const otherClanName = pact.clan1Id === myClanId ? pact.clan2Name : pact.clan1Name;
    const otherClanBadge = pact.clan1Id === myClanId ? pact.clan2Badge : pact.clan1Badge;

    const mySnap = await getDoc(clanRef(myClanId));
    if (!mySnap.exists()) return { success: false, message: 'الرَّكْب غير موجود.' };
    const myClan = mySnap.data() as Clan;
    if (myClan.leaderId !== leaderId) {
      return { success: false, message: 'البتّ في المؤاخاة من صلاحية قائد الرَّكْب فقط.' };
    }

    if (accept) {
      await updateDoc(clanTwinRef(pactId), {
        status: 'active',
        acceptedAt: Date.now()
      });

      await updateDoc(clanRef(myClanId), {
        twinStatus: 'active',
        twinPactId: pactId,
        twinClanId: otherClanId,
        twinClanName: otherClanName,
        twinClanBadge: otherClanBadge,
        twinPendingClanId: null,
        updatedAt: serverTimestamp()
      });

      await updateDoc(clanRef(otherClanId), {
        twinStatus: 'active',
        twinPactId: pactId,
        twinClanId: myClanId,
        twinClanName: myClan.name,
        twinClanBadge: myClan.badgeIcon || "icon:leaf",
        twinPendingClanId: null,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: `تم عقد ميثاق المؤاخاة المبارك بين «${myClan.name}» و «${otherClanName}» وتدشين «${pact.jointProject.name}» على الخريطة! `
      };
    } else {
      await deleteDoc(clanTwinRef(pactId));
      await updateDoc(clanRef(myClanId), {
        twinStatus: 'none',
        twinPactId: null,
        twinPendingClanId: null,
        updatedAt: serverTimestamp()
      });
      await updateDoc(clanRef(otherClanId), {
        twinStatus: 'none',
        twinPactId: null,
        twinPendingClanId: null,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'تم الاعتذار عن طلب المؤاخاة بلطف.'
      };
    }
  }

  /**
   * إنهاء أو إلغاء ميثاق المؤاخاة
   */
  public async cancelOrEndTwinning(
    pactId: string,
    myClanId: string,
    leaderId: string
  ): Promise<{ success: boolean; message: string }> {
    requireUser(leaderId);
    const pactSnap = await getDoc(clanTwinRef(pactId));
    if (!pactSnap.exists()) {
      return { success: false, message: 'الميثاق غير موجود.' };
    }
    const pact = pactSnap.data() as ClanTwinningPact;
    const otherClanId = pact.clan1Id === myClanId ? pact.clan2Id : pact.clan1Id;

    await deleteDoc(clanTwinRef(pactId));
    await updateDoc(clanRef(myClanId), {
      twinStatus: 'none',
      twinPactId: null,
      twinClanId: null,
      twinClanName: null,
      twinClanBadge: null,
      twinPendingClanId: null,
      updatedAt: serverTimestamp()
    });
    await updateDoc(clanRef(otherClanId), {
      twinStatus: 'none',
      twinPactId: null,
      twinClanId: null,
      twinClanName: null,
      twinClanBadge: null,
      twinPendingClanId: null,
      updatedAt: serverTimestamp()
    });

    return { success: true, message: 'تم فك ميثاق المؤاخاة بسلام.' };
  }

  /**
   * الاشتراك اللحظي في ميثاق المؤاخاة
   */
  public subscribeToClanTwinPact(
    pactId: string,
    callback: (pact: ClanTwinningPact | null) => void
  ): () => void {
    return onSnapshot(clanTwinRef(pactId), snap => {
      if (snap.exists()) {
        callback(snap.data() as ClanTwinningPact);
      } else {
        callback(null);
      }
    }, err => {
      console.warn('Error subscribing to clan twin pact:', err);
      callback(null);
    });
  }

  /**
   * المساهمة في صرح المؤاخاة المشترك
   */
  public async contributeToJointProject(
    pactId: string,
    clanId: string,
    points: number,
    worshipType: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      await runTransaction(db, async tx => {
        const pRef = clanTwinRef(pactId);
        const snap = await tx.get(pRef);
        if (!snap.exists()) return;
        const pact = snap.data() as ClanTwinningPact;
        if (pact.status !== 'active') return;

        const proj = { ...pact.jointProject };
        const isClan1 = pact.clan1Id === clanId;
        const pts = Math.max(1, points);

        if (isClan1) {
          proj.clan1Contributed = (proj.clan1Contributed || 0) + pts;
        } else {
          proj.clan2Contributed = (proj.clan2Contributed || 0) + pts;
        }
        proj.totalContributed = (proj.totalContributed || 0) + pts;
        if (proj.totalContributed >= proj.targetPoints && !proj.isCompleted) {
          proj.isCompleted = true;
          proj.completedAt = Date.now();
        }

        const contribution = {
          userId,
          userName,
          clanId,
          clanName: isClan1 ? pact.clan1Name : pact.clan2Name,
          points: pts,
          worshipType,
          timestamp: Date.now()
        };

        const recents = [contribution, ...(pact.recentContributions || [])].slice(0, 15);

        tx.update(pRef, {
          jointProject: proj,
          recentContributions: recents
        });
      });
    } catch (e) {
      console.warn('Could not contribute to joint project:', e);
    }
  }

  /**
   * تسجيل نشاط لحظي في قاعة المساهمين للرَّكْب (Activity Feed)
   */
  public async pushClanActivity(
    clanId: string,
    activity: Omit<ClanActivityItem, 'id' | 'timestamp' | 'clanId'>
  ): Promise<void> {
    try {
      const item: ClanActivityItem = {
        ...activity,
        id: crypto.randomUUID(),
        clanId,
        timestamp: Date.now()
      };
      const cRef = clanRef(clanId);
      const snap = await getDoc(cRef);
      if (!snap.exists()) return;
      const clan = snap.data() as Clan;
      const current = clan.recentActivities || [];
      const updated = [item, ...current].slice(0, 30);
      await updateDoc(cRef, {
        recentActivities: updated
      });
    } catch (e) {
      console.warn('Could not push clan activity:', e);
    }
  }
}
export const clanService = new ClanService();

