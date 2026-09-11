export interface Badge {
  id: string;
  name: string;
  description: string;
  condition?: string;
  icon: string;
  category: 'prayer' | 'quran' | 'athkar' | 'fasting' | 'general' | 'spirit' | 'special';
  target: number;
  unit: string;
  xpBonus: number;
}

export interface BadgeProgress {
  badge: Badge;
  current: number;
  target: number;
  progressPercent: number;
  isUnlocked: boolean;
}

export interface UserData {
  xp?: number;
  badges?: string[];
  completedChallenges?: string[];
  stats?: {
    fajrStreak?: number;
    fajrCount?: number;
    jamaahCount?: number;
    totalPrayers?: number;
    qiyamCount?: number;
    sunnahCount?: number;
    quranPagesRead?: number;
    quranKhatmas?: number;
    kahfFridays?: number;
    audioTracksListened?: number;
    adhkarCount?: number;
    athkarCount?: number;
    tasbeehCount?: number;
    istighfarCount?: number;
    prophetSalawat?: number;
    ameenCount?: number;
    streakDays?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

export const ISLAMIC_BADGES: Badge[] = [
  // --- 1. الصلاة والفرائض (Prayers & Obligations) ---
  {
    id: 'fajr_knight',
    name: 'فارس الفجر',
    description: 'المحافظة على صلاة الفجر في جماعة أو وقتها 40 يوماً متتالية.',
    icon: "icon:sparkles",
    category: 'prayer',
    target: 40,
    unit: 'صلاة فجر',
    xpBonus: 500,
  },
  {
    id: 'fajr_sentinel',
    name: 'حارس الفجر',
    description: 'تسجيل وأداء 100 صلاة فجر في وقتها بدون تأخير.',
    icon: "icon:sunrise",
    category: 'prayer',
    target: 100,
    unit: 'صلاة فجر',
    xpBonus: 800,
  },
  {
    id: 'jamaah_novice',
    name: 'عُمّار المساجد',
    description: 'أداء 50 صلاة في بيت من بيوت الله جماعة.',
    icon: "icon:landmark",
    category: 'prayer',
    target: 50,
    unit: 'صلاة جماعة',
    xpBonus: 300,
  },
  {
    id: 'jamaah_hero',
    name: 'بطل الجماعة',
    description: 'أداء 500 صلاة في المسجد جماعة لنيل أجر الـ 27 ضعفاً.',
    icon: "icon:landmark",
    category: 'prayer',
    target: 500,
    unit: 'صلاة جماعة',
    xpBonus: 1500,
  },
  {
    id: 'prayer_devotee',
    name: 'المقيم للصلاة',
    description: 'المواظبة وتسجيل 200 صلاة مفروضة في وقتها.',
    icon: "icon:landmark",
    category: 'prayer',
    target: 200,
    unit: 'صلاة',
    xpBonus: 400,
  },
  {
    id: 'prayer_master',
    name: 'عمود الدين',
    description: 'تسجيل وأداء 1,000 صلاة مفروضة متقنة.',
    icon: "icon:zap",
    category: 'prayer',
    target: 1000,
    unit: 'صلاة',
    xpBonus: 2000,
  },
  {
    id: 'qiyam_devotee',
    name: 'خاشع الليل',
    description: 'إحياء قيام الليل والوتر 30 ليلة تقرباً لله تعالى.',
    icon: "icon:moon",
    category: 'prayer',
    target: 30,
    unit: 'ليلة',
    xpBonus: 600,
  },
  {
    id: 'sunnah_guardian',
    name: 'حارس السنن',
    description: 'المحافظة على 100 ركعة من السنن الرواتب لبناء بيت في الجنة.',
    icon: "icon:sparkles",
    category: 'prayer',
    target: 100,
    unit: 'ركعة راتبة',
    xpBonus: 450,
  },

  // --- 2. القرآن الكريم والتدبر (Quran & Reflection) ---
  {
    id: 'quran_reader_50',
    name: 'ورتّل القرآن',
    description: 'تلاوة وقراءة 50 صفحة من كتاب الله تعالى بتدبر.',
    icon: "icon:book",
    category: 'quran',
    target: 50,
    unit: 'صفحة',
    xpBonus: 250,
  },
  {
    id: 'quran_reader_100',
    name: 'قارئ الآيات',
    description: 'تلاوة 100 صفحة من المصحف الشريف.',
    icon: "icon:scroll",
    category: 'quran',
    target: 100,
    unit: 'صفحة',
    xpBonus: 500,
  },
  {
    id: 'quran_reader_500',
    name: 'رفيق المصحف',
    description: 'قراءة وتدبر 500 صفحة من المصحف الشريف.',
    icon: "icon:gem",
    category: 'quran',
    target: 500,
    unit: 'صفحة',
    xpBonus: 1200,
  },
  {
    id: 'quran_khatma_1',
    name: 'خاتم القرآن',
    description: 'إتمام أول ختمة مباركة لكتاب الله عز وجل كاملاً.',
    icon: "icon:crown",
    category: 'quran',
    target: 1,
    unit: 'ختمة',
    xpBonus: 1000,
  },
  {
    id: 'quran_khatma_3',
    name: 'صاحب القرآن',
    description: 'إتمام 3 ختمات قرآنية كاملة في التطبيق.',
    icon: "icon:trophy",
    category: 'quran',
    target: 3,
    unit: 'ختمات',
    xpBonus: 2500,
  },
  {
    id: 'kahf_friday',
    name: 'نور الجمعتين',
    description: 'المحافظة على قراءة سورة الكهف 10 جمعات.',
    icon: "icon:sparkles",
    category: 'quran',
    target: 10,
    unit: 'جمعة',
    xpBonus: 400,
  },
  {
    id: 'quran_listener',
    name: 'السميع الخاشع',
    description: 'الاستماع لـ 30 تلاوة عطرة لكبار القراء في مشغل القرآن.',
    icon: "icon:headphones",
    category: 'quran',
    target: 30,
    unit: 'تلاوة',
    xpBonus: 350,
  },

  // --- 3. الذكر والاستغفار (Athkar & Tasbeeh) ---
  {
    id: 'athkar_fortress',
    name: 'حصن المؤمن',
    description: 'قراءة أذكار الصباح والمساء 30 يوماً لحفظ النفس.',
    icon: "icon:shield",
    category: 'athkar',
    target: 30,
    unit: 'يوم',
    xpBonus: 400,
  },
  {
    id: 'athkar_steadfast',
    name: 'لسان رطب',
    description: 'إتمام 100 جلسة أذكار وأدعية مأثورة.',
    icon: "icon:leaf",
    category: 'athkar',
    target: 100,
    unit: 'جلسة ذكر',
    xpBonus: 600,
  },
  {
    id: 'tasbeeh_1000',
    name: 'المسبّح',
    description: 'التسبيح والتحميد 1,000 مرة في المسبحة الإلكترونية.',
    icon: "icon:circle",
    category: 'athkar',
    target: 1000,
    unit: 'تسبيحة',
    xpBonus: 300,
  },
  {
    id: 'tasbeeh_10000',
    name: 'درع التسبيح',
    description: 'التسبيح والتهليل والاستغفار 10,000 مرة.',
    icon: "icon:gem",
    category: 'athkar',
    target: 10000,
    unit: 'تسبيحة',
    xpBonus: 1200,
  },
  {
    id: 'istighfar_master',
    name: 'المستغفر بالأسحار',
    description: 'الاستغفار والتوبة 3,000 مرة لفتح أبواب الرزق والرحمة.',
    icon: "icon:bird",
    category: 'athkar',
    target: 3000,
    unit: 'استغفار',
    xpBonus: 700,
  },

  // --- 4. التحديات والأخوة والهمة (Spirit & Challenges) ---
  {
    id: 'prophet_salawat_500',
    name: 'محب النبي ﷺ',
    description: 'الصلاة على الحبيب المصطفى ﷺ 500 مرة.',
    icon: "icon:flower",
    category: 'spirit',
    target: 500,
    unit: 'صلاة على النبي',
    xpBonus: 350,
  },
  {
    id: 'prophet_salawat_2500',
    name: 'سفير الشفاعة ﷺ',
    description: 'الصلاة على النبي ﷺ 2,500 مرة لنيل شفاعته يوم القيامة.',
    icon: "icon:flower",
    category: 'spirit',
    target: 2500,
    unit: 'صلاة على النبي',
    xpBonus: 1000,
  },
  {
    id: 'social_spirit',
    name: 'الروح الاجتماعية',
    description: 'المشاركة بتأمين 100 دعاء في حائط الدعاء والتضرع.',
    icon: "icon:handheart",
    category: 'spirit',
    target: 100,
    unit: 'تأمين',
    xpBonus: 300,
  },
  {
    id: 'challenge_master',
    name: 'بطل التحديات',
    description: 'إنجاز وإتمام 15 تحدياً إيمانياً من تحديات الطاعات.',
    icon: "icon:target",
    category: 'spirit',
    target: 15,
    unit: 'تحدي',
    xpBonus: 600,
  },
  {
    id: 'streak_champion',
    name: 'ثبات المؤمن',
    description: 'الاستمرار والمواظبة على العبادة في التطبيق 30 يوماً.',
    icon: "icon:flame",
    category: 'spirit',
    target: 30,
    unit: 'يوم',
    xpBonus: 800,
  },
  {
    id: 'xp_legend',
    name: 'سابق بالخيرات',
    description: 'جمع 5,000 نقطة خبرة XP في سباق الطاعات والدرجات.',
    icon: "icon:medal",
    category: 'special',
    target: 5000,
    unit: 'XP',
    xpBonus: 1000,
  },
];

/**
 * Calculates current progress for a given badge based on UserData and local storage backups.
 */
export const calculateBadgeProgress = (badge: Badge, userData?: UserData | null): BadgeProgress => {
  if (!userData) {
    return {
      badge,
      current: 0,
      target: badge.target,
      progressPercent: 0,
      isUnlocked: false,
    };
  }

  // If already marked as unlocked in userData.badges
  const isExplicitlyUnlocked = Array.isArray(userData.badges) && userData.badges.includes(badge.id);

  let current = 0;
  const stats = userData.stats || ({} as any);

  // Safe localStorage helper
  const getLocalCount = (key: string, fallback = 0) => {
    try {
      const val = localStorage.getItem(key);
      return val ? parseInt(val, 10) || fallback : fallback;
    } catch {
      return fallback;
    }
  };

  switch (badge.id) {
    // Fajr
    case 'fajr_knight':
      current = Math.max(stats.fajrStreak || 0, stats.fajrCount || 0, getLocalCount('ifaqa_fajr_streak_count'));
      break;
    case 'fajr_sentinel':
      current = Math.max(stats.fajrCount || 0, stats.fajrStreak || 0, getLocalCount('ifaqa_fajr_total_count'));
      break;

    // Jamaah
    case 'jamaah_novice':
    case 'jamaah_hero':
      current = Math.max(stats.jamaahCount || 0, getLocalCount('ifaqa_jamaah_total_count'));
      break;

    // Total prayers
    case 'prayer_devotee':
    case 'prayer_master':
      current = Math.max(stats.totalPrayers || 0, (stats.jamaahCount || 0) * 1.2, getLocalCount('ifaqa_total_prayers_count'));
      break;

    // Qiyam
    case 'qiyam_devotee':
      current = Math.max(stats.qiyamCount || 0, getLocalCount('ifaqa_qiyam_count'));
      break;

    // Sunnah
    case 'sunnah_guardian':
      current = Math.max(stats.sunnahCount || 0, getLocalCount('ifaqa_sunnah_count'));
      break;

    // Quran Pages
    case 'quran_reader_50':
    case 'quran_reader_100':
    case 'quran_reader_500':
      current = Math.max(stats.quranPagesRead || 0, getLocalCount('ifaqa_quran_reading_pages', 1));
      break;

    // Quran Khatma
    case 'quran_khatma_1':
    case 'quran_khatma_3':
      current = Math.max(stats.quranKhatmas || 0, getLocalCount('ifaqa_khatma_completed_count'));
      break;

    // Kahf Friday
    case 'kahf_friday':
      current = Math.max(stats.kahfFridays || 0, getLocalCount('ifaqa_kahf_fridays_count'));
      break;

    // Quran Audio Listener
    case 'quran_listener':
      current = Math.max(stats.audioTracksListened || 0, getLocalCount('ifaqa_audio_tracks_count'));
      break;

    // Athkar
    case 'athkar_fortress':
    case 'athkar_steadfast':
      current = Math.max(stats.adhkarCount || 0, stats.athkarCount || 0, getLocalCount('ifaqa_athkar_days_count'));
      break;

    // Tasbeeh
    case 'tasbeeh_1000':
    case 'tasbeeh_10000':
      current = Math.max(stats.tasbeehCount || 0, getLocalCount('masbaha_total_count'), getLocalCount('ifaqa_masbaha_total'));
      break;

    // Istighfar
    case 'istighfar_master':
      current = Math.max(stats.istighfarCount || 0, getLocalCount('ifaqa_istighfar_count'), Math.floor((stats.tasbeehCount || 0) * 0.4));
      break;

    // Salawat on the Prophet
    case 'prophet_salawat_500':
    case 'prophet_salawat_2500':
      current = Math.max(stats.prophetSalawat || 0, getLocalCount('ifaqa_prophet_challenge_user_score'), getLocalCount('prophet_challenge_score'));
      break;

    // Ameen
    case 'social_spirit':
      current = Math.max(stats.ameenCount || 0, getLocalCount('ifaqa_ameen_count'));
      break;

    // Challenges
    case 'challenge_master':
      current = Array.isArray(userData.completedChallenges) ? userData.completedChallenges.length : getLocalCount('ifaqa_challenges_completed');
      break;

    // Streak
    case 'streak_champion':
      current = Math.max(stats.streakDays || 0, getLocalCount('ifaqa_daily_streak', 1));
      break;

    // XP
    case 'xp_legend':
      current = userData.xp || 0;
      break;

    default:
      current = 0;
  }

  // Ensure current doesn't stay 0 if explicitly unlocked in DB
  if (isExplicitlyUnlocked && current < badge.target) {
    current = badge.target;
  }

  const isUnlocked = isExplicitlyUnlocked || current >= badge.target;
  const progressPercent = Math.min(100, Math.max(0, Math.round((current / badge.target) * 100)));

  return {
    badge,
    current: Math.min(current, badge.target),
    target: badge.target,
    progressPercent,
    isUnlocked,
  };
};

/**
 * Returns all badges with evaluated progress for the active user.
 */
export const getAllBadgesWithProgress = (userData?: UserData | null): BadgeProgress[] => {
  return ISLAMIC_BADGES.map((badge) => calculateBadgeProgress(badge, userData));
};
