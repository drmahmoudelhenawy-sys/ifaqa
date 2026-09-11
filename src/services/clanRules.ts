export const CONTRIBUTION_LIMITS = {
  quran_pages: Number.MAX_SAFE_INTEGER,
  audio_minutes: Number.MAX_SAFE_INTEGER,
  salawat: Number.MAX_SAFE_INTEGER,
  tasbeeh: Number.MAX_SAFE_INTEGER,
  collective_khatma: 1,
} as const;
export type QuestType = keyof typeof CONTRIBUTION_LIMITS;
export const QUEST_UNITS: Record<QuestType, string> = {
  quran_pages: 'صفحة', audio_minutes: 'دقيقة', salawat: 'صلاة على النبي ﷺ', tasbeeh: 'ذكر', collective_khatma: 'مشارك',
};
export function contributionProgress(quest: { targetType: QuestType; targetAmount: number; currentAmount: number; bonusPoints: number; isCompleted: boolean }, amount: number, alreadyRecorded = 0) {
  if (!Number.isSafeInteger(amount) || amount < 1) throw new Error('اكتب عددًا صحيحًا أكبر من صفر.');
  if (!Number.isSafeInteger(quest.targetAmount) || quest.targetAmount < 1 || !Number.isFinite(quest.bonusPoints) || quest.bonusPoints < 0) throw new Error('إعدادات هذا التحدي غير صالحة.');
  if (quest.isCompleted || quest.currentAmount >= quest.targetAmount) return { accepted: 0, currentAmount: quest.targetAmount, completed: true, bonusAwarded: 0 };
  if (quest.targetType === 'collective_khatma' && alreadyRecorded >= 1) {
    throw new Error('تم احتساب مشاركتك في هذا التحدي من قبل؛ الهدف مشاركة أعضاء مختلفين.');
  }
  const accepted = Math.min(amount, quest.targetAmount - Math.max(0, quest.currentAmount));
  const currentAmount = Math.max(0, quest.currentAmount) + accepted;
  const completed = currentAmount >= quest.targetAmount;
  return { accepted, currentAmount, completed, bonusAwarded: completed ? quest.bonusPoints : 0 };
}
export function unlockedProgress<T extends { id: string; cost: number; capacityBonus: number }>(territories: T[], points: number, _members = 1, existing: string[] = []) {
  const additions = territories.filter(t => points >= t.cost && !existing.includes(t.id));
  return { unlockedTerritories: [...new Set([...existing, ...additions.map(t => t.id)])], capacityBonus: additions.reduce((n, t) => n + t.capacityBonus, 0) };
}

export const SPEEDUP_RATES = {
  quran_pages: 0.5,   // 30 mins per page
  salawat: 0.02,      // ~12 mins per 10 salawat
  tasbeeh: 0.01,      // ~6 mins per 10 tasbeeh
  audio_minutes: 0.05 // ~15 mins per 5 audio mins
} as const;

export function getProjectRemainingHours(project: { startedAt: number; durationHours: number; reducedHours?: number }): number {
  const elapsedHours = Math.max(0, (Date.now() - project.startedAt) / (1000 * 3600));
  const effectiveHours = elapsedHours + (project.reducedHours || 0);
  return Math.max(0, project.durationHours - effectiveHours);
}

export function getProjectProgressPercent(project?: { startedAt: number; durationHours: number; reducedHours?: number; isCompleted?: boolean } | null): number {
  if (!project) return 0;
  if (project.isCompleted) return 100;
  if (!project.durationHours || project.durationHours <= 0) return 100;
  const elapsedHours = Math.max(0, (Date.now() - project.startedAt) / (1000 * 3600));
  const effectiveHours = elapsedHours + (project.reducedHours || 0);
  const percent = Math.min(100, Math.max(0, Math.round((effectiveHours / project.durationHours) * 100)));
  return percent;
}

export function formatRemainingHours(hours: number): string {
  if (hours <= 0) return 'اكتمل التشييد!';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h > 0 && m > 0) return `${h} ساعة و ${m} دقيقة`;
  if (h > 0) return `${h} ساعة`;
  return `${m} دقيقة`;
}

export interface ConstructionStageInfo {
  stage: 1 | 2 | 3;
  id: 'foundation' | 'rising' | 'completed';
  name: string;
  badge: string;
  icon: string;
  subtitle: string;
  description: string;
  visualTheme: string;
}

export function getConstructionStage(progressPercent: number): ConstructionStageInfo {
  if (progressPercent < 31) {
    return {
      stage: 1,
      id: 'foundation',
      name: 'وضع الأساسات',
      badge: "وضع الأساسات ",
      icon: "icon:hammer",
      subtitle: 'تجهيز الأرض والأوتاد (0% - 30%)',
      description: 'إرساء القواعد الأولى وحفر مجاري المياه وتثبيت دعامات البناء المحاطة بسياج العمل والهمّة.',
      visualTheme: 'stage-foundation'
    };
  } else if (progressPercent < 100) {
    return {
      stage: 2,
      id: 'rising',
      name: 'ارتفاع الصرح',
      badge: "ارتفاع الصرح ",
      icon: "icon:hammer",
      subtitle: 'ارتفاع الجدران واكتمال الأقواس (31% - 80%)',
      description: 'تعلو الجدران شامخة، وتورق الرياض وتبدأ الزخارف في الظهور مع إشراقة وتوهج خفيف في الأركان.',
      visualTheme: 'stage-rising'
    };
  } else {
    return {
      stage: 3,
      id: 'completed',
      name: 'التدشين والاكتمال المبارك',
      badge: "صرح مدشّن مبارك ",
      icon: "icon:sparkles",
      subtitle: 'التدشين والفتح التام (100%)',
      description: 'اكتمل الصرح وأشرقت أنواره وتدفقت المياه في الواحات وأضيئت المنارات بفضل الله ثم تكاتف الرفقاء.',
      visualTheme: 'stage-completed'
    };
  }
}

export interface TerritoryQuranAyah {
  text: string;
  surah: string;
  ayahNumber: number;
}

export const TERRITORY_QURAN_AYAHS: Record<string, TerritoryQuranAyah> = {
  // Realm 1
  oasis_tranquility: { text: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', surah: 'الرعد', ayahNumber: 28 },
  dhikr_valley: { text: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ', surah: 'البقرة', ayahNumber: 152 },
  city_of_light: { text: 'ادْخُلُوهَا بِسَلَامٍ آمِنِينَ', surah: 'الحجر', ayahNumber: 46 },
  barakah_river: { text: 'وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ أَفَلَا يُؤْمِنُونَ', surah: 'الأنبياء', ayahNumber: 30 },
  furqan_fortress: { text: 'أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ إِلَىٰ غَسَقِ اللَّيْلِ وَقُرْآنَ الْفَجْرِ ۖ إِنَّ قُرْآنَ الْفَجْرِ كَانَ مَشْهُودًا', surah: 'الإسراء', ayahNumber: 78 },
  sabr_desert: { text: 'إِنَّمَا يُوَفَّى الصَّابِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ', surah: 'الزمر', ayahNumber: 10 },
  tilawah_peak: { text: 'وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا', surah: 'المزمل', ayahNumber: 4 },
  firdaws_citadel: { text: 'إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ كَانَتْ لَهُمْ جَنَّاتُ الْفِرْدَوْسِ نُزُلًا', surah: 'الكهف', ayahNumber: 107 },

  // Realm 2
  rawdat_tahajjud: { text: 'وَمِنَ اللَّيْلِ فَتَهَجَّدْ بِهِ نَافِلَةً لَّكَ عَسَىٰ أَن يَبْعَثَكَ رَبُّكَ مَقَامًا مَّحْمُودًا', surah: 'الإسراء', ayahNumber: 79 },
  manarat_hidaya: { text: 'يَهْدِي بِهِ اللَّهُ مَنِ اتَّبَعَ رِضْوَانَهُ سُبُلَ السَّلَامِ وَيُخْرِجُهُم مِّنَ الظُّلُمَاتِ إِلَى النُّورِ', surah: 'المائدة', ayahNumber: 16 },
  wadi_tasabeeh: { text: 'تُسَبِّحُ لَهُ السَّمَاوَاتُ السَّبْعُ وَالْأَرْضُ وَمَن فِيهِنَّ ۚ وَإِن مِّن شَيْءٍ إِلَّا يُسَبِّحُ بِحَمْدِهِ', surah: 'الإسراء', ayahNumber: 44 },
  ayn_salsabeel: { text: 'عَيْنًا فِيهَا تُسَمَّىٰ سَلْسَبِيلًا', surah: 'الإنسان', ayahNumber: 18 },
  ribat_salihin: { text: 'إِنَّمَا الْمُؤْمِنُونَ إِخْوَةٌ فَأَصْلِحُوا بَيْنَ أَخَوَيْكُمْ', surah: 'الحجرات', ayahNumber: 10 },
  bawwabat_fath: { text: 'إِنَّا فَتَحْنَا لَكَ فَتْحًا مُّبِينًا', surah: 'الفتح', ayahNumber: 1 },
  qasr_ihsan: { text: 'هَلْ جَزَاءُ الْإِحْسَانِ إِلَّا الْإِحْسَانُ', surah: 'الرحمن', ayahNumber: 60 },
  dar_salam: { text: 'وَاللَّهُ يَدْعُو إِلَىٰ دَارِ السَّلَامِ وَيَهْدِي مَن يَشَاءُ إِلَىٰ صِرَاطٍ مُّسْتَقِيمٍ', surah: 'يونس', ayahNumber: 25 },

  // Realm 3
  thagr_murabiteen: { text: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اصْبِرُوا وَصَابِرُوا وَرَابِطُوا وَاتَّقُوا اللَّهَ لَعَلَّكُمْ تُفْلِحُونَ', surah: 'آل عمران', ayahNumber: 200 },
  hisn_wafaa: { text: 'وَأَوْفُوا بِعَهْدِ اللَّهِ إِذَا عَاهَدتُّمْ', surah: 'النحل', ayahNumber: 91 },
  madeeq_tawakkul: { text: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', surah: 'الطلاق', ayahNumber: 3 },
  burj_rumat: { text: 'وَأَعِدُّوا لَهُم مَّا اسْتَطَعْتُم مِّن قُوَّةٍ', surah: 'الأنفال', ayahNumber: 60 },
  maaqal_iman: { text: 'يُثَبِّتُ اللَّهُ الَّذِينَ آمَنُوا بِالْقَوْلِ الثَّابِتِ فِي الْحَيَاةِ الدُّنْيَا وَفِي الْآخِرَةِ', surah: 'إبراهيم', ayahNumber: 27 },
  qalaat_muttaqeen: { text: 'إِنَّ لِلْمُتَّقِينَ مَفَازًا', surah: 'النبأ', ayahNumber: 31 },
  sakhra_istiqama: { text: 'إِنَّ الَّذِينَ قَالُوا رَبُّنَا اللَّهُ ثُمَّ اسْتَقَامُوا تَتَنَزَّلُ عَلَيْهِمُ الْمَلَائِكَةُ', surah: 'فصلت', ayahNumber: 30 },
  sarh_furqan: { text: 'تَبَارَكَ الَّذِي نَزَّلَ الْفُرْقَانَ عَلَىٰ عَبْدِهِ لِيَكُونَ لِلْعَالَمِينَ نَذِيرًا', surah: 'الفرقان', ayahNumber: 1 },

  // Realm 4
  kuthban_inaba: { text: 'وَأَنِيبُوا إِلَىٰ رَبِّكُمْ وَأَسْلِمُوا لَهُ', surah: 'الزمر', ayahNumber: 54 },
  wahat_mujahada: { text: 'وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا ۚ وَإِنَّ اللَّهَ لَمَعَ الْمُحْسِنِينَ', surah: 'العنكبوت', ayahNumber: 69 },
  shieb_muhtasibeen: { text: 'وَبَشِّرِ الصَّابِرِينَ الَّذِينَ إِذَا أَصَابَتْهُم مُّصِيبَةٌ قَالُوا إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ', surah: 'البقرة', ayahNumber: 155 },
  wadi_qaniteen: { text: 'أَمَّنْ هُوَ قَانِتٌ آنَاءَ اللَّيْلِ سَاجِدًا وَقَائِمًا يَحْذَرُ الْآخِرَةَ وَيَرْجُو رَحْمَةَ رَبِّهِ', surah: 'الزمر', ayahNumber: 9 },
  saqee_ghaffar: { text: 'وَإِنِّي لَغَفَّارٌ لِّمَن تَابَ وَآمَنَ وَعَمِلَ صَالِحًا ثُمَّ اهْتَدَىٰ', surah: 'طه', ayahNumber: 82 },
  magharat_ikhbat: { text: 'وَبَشِّرِ الْمُخْبِتِينَ الَّذِينَ إِذَا ذُكِرَ اللَّهُ وَجِلَتْ قُلُوبُهُمْ', surah: 'الحج', ayahNumber: 34 },
  hadabat_mouqineen: { text: 'وَفِي الْأَرْضِ آيَاتٌ لِّلْمُوقِنِينَ وَفِي أَنفُسِكُمْ ۚ أَفَلَا تُبْصِرُونَ', surah: 'الذاريات', ayahNumber: 20 },
  qimmat_ridwan: { text: 'رَّضِيَ اللَّهُ عَنْهُمْ وَرَضُوا عَنْهُ ۚ ذَٰلِكَ الْفَوْزُ الْعَظِيمُ', surah: 'المائدة', ayahNumber: 119 },

  // Realm 5
  bab_rayyan: { text: 'وَسِيقَ الَّذِينَ اتَّقَوْا رَبَّهُمْ إِلَى الْجَنَّةِ زُمَرًا ۖ حَتَّىٰ إِذَا جَاءُوهَا وَفُتِحَتْ أَبْوَابُهَا', surah: 'الزمر', ayahNumber: 73 },
  nahr_kawthar: { text: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ', surah: 'الكوثر', ayahNumber: 1 },
  hadaiq_naeem: { text: 'إِنَّ الْمُتَّقِينَ فِي جَنَّاتٍ وَنَعِيمٍ', surah: 'الطور', ayahNumber: 17 },
  thilal_tuba: { text: 'الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ طُوبَىٰ لَهُمْ وَحُسْنُ مَآبٍ', surah: 'الرعد', ayahNumber: 29 },
  qasr_lulu: { text: 'يُحَلَّوْنَ فِيهَا مِنْ أَسَاوِرَ مِن ذَهَبٍ وَلُؤْلُؤًا ۖ وَلِبَاسُهُمْ فِيهَا حَرِيرٌ', surah: 'الحج', ayahNumber: 23 },
  ayn_tasneem: { text: 'وَمِزَاجُهُ مِن تَسْنِيمٍ عَيْنًا يَشْرَبُ بِهَا الْمُقَرَّبُونَ', surah: 'المطففين', ayahNumber: 27 },
  sidrat_muntaha: { text: 'عِندَ سِدْرَةِ الْمُنتَهَىٰ عِندَهَا جَنَّةُ الْمَأْوَىٰ', surah: 'النجم', ayahNumber: 14 },
  firdaws_aala: { text: 'أُولَٰئِكَ هُمُ الْوَارِثُونَ الَّذِينَ يَرِثُونَ الْفِرْدَوْسَ هُمْ فِيهَا خَالِدُونَ', surah: 'المؤمنون', ayahNumber: 11 },

  // Joint Mega Projects
  dam_of_concord: { text: 'وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا', surah: 'آل عمران', ayahNumber: 103 },
  well_of_ruwah: { text: 'عَيْنًا يَشْرَبُ بِهَا عِبَادُ اللَّهِ يُفَجِّرُونَهَا تَفْجِيرًا', surah: 'الإنسان', ayahNumber: 6 }
};

export interface TerritoryExclusivePerk {
  id: string;
  territoryId: string;
  title: string;
  tagline: string;
  icon: string;
  category: 'multiplier' | 'speedup' | 'keys';
  badge: string;
  description: string;
  spiritualBenefit: string;
  mechanic: string;
  actionLabel: string;
}

export const TERRITORY_EXCLUSIVE_PERKS: Record<string, TerritoryExclusivePerk> = {
  oasis_tranquility: {
    id: 'perk_oasis_multiplier',
    territoryId: 'oasis_tranquility',
    title: 'ينبوع مضاعفة الحسنات والبركة',
    tagline: "مضاعفة مستمرة +25% لكافة نقاط التلاوة والذكر + مفتاح فتح إيماني ",
    icon: "icon:sparkles",
    category: 'multiplier',
    badge: "ينبوع البركة ",
    description: 'تتدفق بركات هذا الصرح على جميع أفراد الرَّكْب؛ حيث ينال كل رفيق مضاعفة دائمة بنسبة +25% على كافة نقاط قراءة المصحف والتسبيح، مع منح مفتاح فتح إيماني فور التدشين.',
    spiritualBenefit: 'استشعار مضاعفة ثواب الطاعات والبركة في الأوقات والأعمال.',
    mechanic: "+25% نقاط إضافية دائمة لجميع الطاعات + 1 مفتاح واحات  للرَّكْب.",
    actionLabel: "تفعيل فيض البركة "
  },
  dhikr_valley: {
    id: 'perk_dhikr_speedup',
    territoryId: 'dhikr_valley',
    title: 'مضاعف الذكر وتسريع البناء',
    tagline: 'مضاعفة نقاط المسبحة 2x كاملة واقتطاع 3 ساعات من كل تشييد',
    icon: "icon:zap",
    category: 'speedup',
    badge: "مضاعف التسبيح ",
    description: 'يضاعف ثواب التسبيح والأذكار في المسبحة الإلكترونية إلى الضعف (2x) لجميع رفقاء الرَّكْب، ويخصم 3 ساعات فورية من زمن تشييد أي معلم قادم.',
    spiritualBenefit: 'دوام ذكر الله ومضاعفة أجور الذاكرين والذاكرات كثيراً.',
    mechanic: 'مضاعف 2x على نقاط التسبيح + تسريع 3 ساعات لجميع المشاريع القادمة.',
    actionLabel: "تسريع مشاريع الرَّكْب "
  },
  city_of_light: {
    id: 'perk_city_keys',
    territoryId: 'city_of_light',
    title: 'خزانة مفاتيح الفتح الكبرى',
    tagline: 'منح الرَّكْب 3 مفاتيح واحات ذهبية لتسريع الفتح والبناء',
    icon: "icon:sparkles",
    category: 'keys',
    badge: "خزانة المفاتيح ",
    description: 'تمنح الرَّكْب حزمة من 3 مفاتيح واحات ذهبية، يمكن استخدامها في تسريع تشييد أي معلم بنسبة 50% أو خصم ساعات البناء فوراً.',
    spiritualBenefit: 'المسارعة إلى الخيرات واستباق الصالحات بتعاون وثيق.',
    mechanic: "إيداع 3 مفاتيح فتح فورية  في رصيد خزانة الرَّكْب.",
    actionLabel: "استلام واستخدام المفاتيح "
  },
  barakah_river: {
    id: 'perk_barakah_stream',
    territoryId: 'barakah_river',
    title: 'سيل تسريع التشييد الدائم',
    tagline: 'خصم دائم بنسبة 30% من ساعات تشييد كافة الواحات والمعالم القادمة',
    icon: "icon:waves",
    category: 'speedup',
    badge: "سيل السرعة ",
    description: 'تفيض بركة هذا النهر بتسريع دائم ومستمر لزمن تشييد كافة مشاريع الواحات وصروح المؤاخاة القادمة بنسبة 30% تلقائياً دون أي انتظار.',
    spiritualBenefit: 'استشعار النماء والبركة في السعي والعمل الجماعي.',
    mechanic: 'خصم 30% تلقائياً من ساعات التشييد لجميع المشاريع القادمة للرَّكْب.',
    actionLabel: "معاينة أثر تسريع البناء "
  },
  furqan_fortress: {
    id: 'perk_furqan_multiplier',
    territoryId: 'furqan_fortress',
    title: 'حصن مضاعفة التحديات والتسريع الفوري',
    tagline: 'مضاعفة نقاط المهام الجماعية 1.5x وتسريع فوري 6 ساعات',
    icon: "icon:shield",
    category: 'multiplier',
    badge: "حصن المضاعفة ",
    description: 'يمنح ركابكم مضاعفة بنسبة 1.5 ضعف على جميع نقاط المهام الأسبوعية والمحطات الكبرى المكتملة، مع تسريع فوري 6 ساعات لمشروع البناء الجاري.',
    spiritualBenefit: 'شحذ الهمم وتوثيق الترابط الإيماني لنيل أعلى المراتب.',
    mechanic: 'مضاعف 1.5x على نقاط التحديات + تسريع فوري 6 ساعات للمشروع الجاري.',
    actionLabel: "تسريع فوري 6 ساعات "
  },
  sabr_desert: {
    id: 'perk_sabr_discount',
    territoryId: 'sabr_desert',
    title: 'عزيمة الصابرين وتخفيض تكلفة الفتح',
    tagline: "خصم 25% من نقاط فتح أي واحة قادمة + مفتاحان ذهبيان ",
    icon: "icon:sparkles",
    category: 'speedup',
    badge: "عزيمة الفتح ",
    description: 'تثمر مكابدة الصبر تخفيضاً كبيراً في تكلفة النقاط المطلوبة لفتح أي واحة تالية بنسبة 25%، مع إهداء الرَّكْب مفتاحين ذهبيين لتسريع البناء.',
    spiritualBenefit: '﴿إِنَّمَا يُوَفَّى الصَّابِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ﴾.',
    mechanic: "خصم 25% من نقاط فتح المعالم + 2 مفتاح فتح إيماني .",
    actionLabel: "تطبيق خصم تكلفة الفتح "
  },
  tilawah_peak: {
    id: 'perk_tilawah_multiplier',
    territoryId: 'tilawah_peak',
    title: 'مضاعف تلاوة القرآن الأكبر 2x',
    tagline: 'مضاعفة نقاط كل صفحة من المصحف والختمات التشاركية إلى الضعف',
    icon: "icon:book",
    category: 'multiplier',
    badge: "تاج التلاوة ",
    description: 'يمنح جميع أفراد الرَّكْب مضاعفة 2x كاملة على نقاط كل صفحة تُقرأ من المصحف الشريف والختمات التشاركية لترتفع درجات الرَّكْب في مدارج القرآن.',
    spiritualBenefit: '«الَّذِي يَقْرَأُ القُرْآنَ وَهُوَ مَاهِرٌ بِهِ مَعَ السَّفَرَةِ الكِرَامِ البَرَرَةِ».',
    mechanic: 'مضاعف 2x دائم لكافة صفحات المصحف والختمات الموزعة.',
    actionLabel: "تفعيل مضاعف التلاوة "
  },
  firdaws_citadel: {
    id: 'perk_firdaws_keys',
    territoryId: 'firdaws_citadel',
    title: 'تاج الفتح الأعظم ومفتاح العوالم الأبدي',
    tagline: 'فتح الخريطة التالية مجاناً بمفتاح الفتح الأبدي + مضاعفة شاملة 3x',
    icon: "icon:crown",
    category: 'keys',
    badge: "مفتاح الفردوس ",
    description: 'أعظم صروح المسيرة: يمنح الرَّكْب "مفتاح الفتح الأبدي" الذي يفتح الخريطة التالية تلقائياً ومجاناً دون انتظار، مع مضاعفة شاملة 3x لجميع طاعات أفراد الرَّكْب.',
    spiritualBenefit: 'بلوغ الفردوس الأعلى وتمام الفتح بفضل الله ومنّه.',
    mechanic: 'فتح الخريطة التالية فوراً بالمفتاح الأبدي + مضاعفة 3x لكافة الطاعات.',
    actionLabel: "استخدام مفتاح العوالم الأبدي "
  }
};

export const PROPHETIC_DUAS = [
  { id: 'dua_1', text: 'اللهم ارزقه من الخير كله عاجله وآجله ما علم منه وما لم يعلم، واصرف عنه كل سوء.', category: 'جوامع الخير' },
  { id: 'dua_2', text: 'اللهم ثبّت قلبه على دينك، واشرح صدره بنور القرآن، واجعل له من كل ضيق مخرجاً.', category: 'الثبات والسكينة' },
  { id: 'dua_3', text: 'اللهم بارك له في أهله وعمله ووقته وعمره، واجعله مباركاً أينما كان.', category: 'البركة والتيسير' },
  { id: 'dua_4', text: 'اللهم اجعلنا وإياه من أهل الفردوس الأعلى برفقة الحبيب المصطفى ﷺ.', category: 'الفردوس الأعلى' },
  { id: 'dua_5', text: 'اللهم فرّج كربه واقضِ دينه واشفِ سقمه ويسّر أمره كله.', category: 'تفريج الهموم' }
];

export const RARE_ATHKAR = [
  { id: 'dhikr_1', text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ: عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ (٣ مرات)', virtue: 'تعدل ساعات طويلة من الذكر المتواصل كما أخبر ﷺ جويرية رضي الله عنها.' },
  { id: 'dhikr_2', text: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ (١٠٠ مرة)', virtue: 'كانت له عدل عشر رقاب، وكتبت له مئة حسنة، ومحيت عنه مئة سيئة، وكانت له حرزاً من الشيطان.' },
  { id: 'dhikr_3', text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', virtue: 'كنز عظيم من كنوز الجنة وباب من أبوابها.' },
  { id: 'dhikr_4', text: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيَّ الْقَيُّومَ وَأَتُوبُ إِلَيْهِ (٣ مرات)', virtue: 'غُفرت ذنوبه وإن كان فاراً من الزحف.' }
];

export const TADABBUR_CARDS = [
  {
    surah: 'الرعد: 28',
    ayah: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    reflection: 'طمأنينة القلب ليست غياب المشاكل، بل حضور السكينة الإلهية في خضم العواصف؛ فالذكر يربط العبد برب السموات فيصغر في عينيه كل ما سواه.',
    author: 'هدايات اليقين'
  },
  {
    surah: 'الإسراء: 78',
    ayah: 'إِنَّ قُرْآنَ الْفَجْرِ كَانَ مَشْهُودًا',
    reflection: 'تشهده ملائكة الليل وملائكة النهار، فيا لغبطة من استيقظ والناس نيام ليصدح بكلام ربه فيسجل اسمه في ديوان المشهودين.',
    author: 'أسرار الأسحار'
  },
  {
    surah: 'الكهف: 107',
    ayah: 'إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ كَانَتْ لَهُمْ جَنَّاتُ الْفِرْدَوْسِ نُزُلًا',
    reflection: 'النُّزُل: ما يُعد للضيف إكراماً له عند أول قدومه؛ فإذا كان الفردوس العظيم مجرد نُزُل وضيافة مبدئية، فكيف بما أعده الله بعد ذلك؟',
    author: 'بشائر الفردوس'
  },
  {
    surah: 'الأنبياء: 87',
    ayah: 'لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ',
    reflection: 'دعوة في ظلمات ثلاث جمعت بين التوحيد والتنزيه والاعتراف بالتقصير، فكانت مفتاح النجاة التي وعد الله بها كل مؤمن: ﴿وَكَذَٰلِكَ نُنجِي الْمُؤْمِنِينَ﴾.',
    author: 'مفاتيح الفرج'
  }
];

export interface TerritoryMapEnhancement {
  territoryId: string;
  materialTheme: 'wood' | 'rose-marble' | 'white-marble' | 'lapis' | 'ironstone' | 'sandstone' | 'granite' | 'royal-gold';
  plaqueStyleClass: string;
  medallionShape: 'octagon' | 'arch' | 'star';
  glowColor: string;
  borderHue: string;
  perkShortBadge: string;
  environmentalFX?: 'water-shimmer' | 'palm-sway' | 'torch-flame' | 'desert-dust' | 'mountain-frost' | 'celestial-beacon';
}

export const TERRITORY_MAP_ENHANCEMENTS: Record<string, TerritoryMapEnhancement> = {
  oasis_tranquility: {
    territoryId: 'oasis_tranquility',
    materialTheme: 'wood',
    plaqueStyleClass: 'plaque-oasis',
    medallionShape: 'arch',
    glowColor: '#10b981',
    borderHue: '#059669',
    perkShortBadge: " مضاعف",
    environmentalFX: 'palm-sway'
  },
  city_of_light: {
    territoryId: 'city_of_light',
    materialTheme: 'white-marble',
    plaqueStyleClass: 'plaque-city',
    medallionShape: 'arch',
    glowColor: '#06b6d4',
    borderHue: '#0284c7',
    perkShortBadge: " مفاتيح",
    environmentalFX: 'water-shimmer'
  },
  furqan_fortress: {
    territoryId: 'furqan_fortress',
    materialTheme: 'ironstone',
    plaqueStyleClass: 'plaque-fortress',
    medallionShape: 'octagon',
    glowColor: '#6366f1',
    borderHue: '#4f46e5',
    perkShortBadge: " مضاعف 1.5x",
    environmentalFX: 'torch-flame'
  },
  dhikr_valley: {
    territoryId: 'dhikr_valley',
    materialTheme: 'rose-marble',
    plaqueStyleClass: 'plaque-dhikr',
    medallionShape: 'star',
    glowColor: '#ec4899',
    borderHue: '#db2777',
    perkShortBadge: " تسريع",
    environmentalFX: 'palm-sway'
  },
  barakah_river: {
    territoryId: 'barakah_river',
    materialTheme: 'lapis',
    plaqueStyleClass: 'plaque-river',
    medallionShape: 'arch',
    glowColor: '#14b8a6',
    borderHue: '#0d9488',
    perkShortBadge: " تسريع 30%",
    environmentalFX: 'water-shimmer'
  },
  sabr_desert: {
    territoryId: 'sabr_desert',
    materialTheme: 'sandstone',
    plaqueStyleClass: 'plaque-desert',
    medallionShape: 'octagon',
    glowColor: '#f59e0b',
    borderHue: '#d97706',
    perkShortBadge: " خصم 25%",
    environmentalFX: 'desert-dust'
  },
  tilawah_peak: {
    territoryId: 'tilawah_peak',
    materialTheme: 'granite',
    plaqueStyleClass: 'plaque-peak',
    medallionShape: 'star',
    glowColor: '#94a3b8',
    borderHue: '#64748b',
    perkShortBadge: " مضاعف 2x",
    environmentalFX: 'mountain-frost'
  },
  firdaws_citadel: {
    territoryId: 'firdaws_citadel',
    materialTheme: 'royal-gold',
    plaqueStyleClass: 'plaque-citadel',
    medallionShape: 'star',
    glowColor: '#fbbf24',
    borderHue: '#f59e0b',
    perkShortBadge: " مفتاح العوالم",
    environmentalFX: 'celestial-beacon'
  }
};

export const REALM_STONE_TRAILS: Record<number, { id: string; x: number; y: number }[]> = {
  1: [
    { id: 'oasis_tranquility', x: 50, y: 78 },
    { id: 'dhikr_valley', x: 74, y: 69 },
    { id: 'city_of_light', x: 38, y: 61 },
    { id: 'barakah_river', x: 73, y: 52 },
    { id: 'furqan_fortress', x: 35, y: 43 },
    { id: 'sabr_desert', x: 75, y: 34 },
    { id: 'tilawah_peak', x: 42, y: 25 },
    { id: 'firdaws_citadel', x: 54, y: 16 }
  ],
  2: [
    { id: 'rawdat_tahajjud', x: 50, y: 78 },
    { id: 'manarat_hidaya', x: 74, y: 69 },
    { id: 'wadi_tasabeeh', x: 38, y: 61 },
    { id: 'ayn_salsabeel', x: 73, y: 52 },
    { id: 'ribat_salihin', x: 35, y: 43 },
    { id: 'bawwabat_fath', x: 75, y: 34 },
    { id: 'qasr_ihsan', x: 42, y: 25 },
    { id: 'dar_salam', x: 54, y: 16 }
  ],
  3: [
    { id: 'thagr_murabiteen', x: 50, y: 78 },
    { id: 'hisn_wafaa', x: 74, y: 69 },
    { id: 'madeeq_tawakkul', x: 38, y: 61 },
    { id: 'burj_rumat', x: 73, y: 52 },
    { id: 'maaqal_iman', x: 35, y: 43 },
    { id: 'qalaat_muttaqeen', x: 75, y: 34 },
    { id: 'sakhra_istiqama', x: 42, y: 25 },
    { id: 'sarh_furqan', x: 54, y: 16 }
  ],
  4: [
    { id: 'kuthban_inaba', x: 50, y: 78 },
    { id: 'wahat_mujahada', x: 74, y: 69 },
    { id: 'shieb_muhtasibeen', x: 38, y: 61 },
    { id: 'wadi_qaniteen', x: 73, y: 52 },
    { id: 'saqee_ghaffar', x: 35, y: 43 },
    { id: 'magharat_ikhbat', x: 75, y: 34 },
    { id: 'hadabat_mouqineen', x: 42, y: 25 },
    { id: 'qimmat_ridwan', x: 54, y: 16 }
  ],
  5: [
    { id: 'bab_rayyan', x: 50, y: 78 },
    { id: 'nahr_kawthar', x: 74, y: 69 },
    { id: 'hadaiq_naeem', x: 38, y: 61 },
    { id: 'thilal_tuba', x: 73, y: 52 },
    { id: 'qasr_lulu', x: 35, y: 43 },
    { id: 'ayn_tasneem', x: 75, y: 34 },
    { id: 'sidrat_muntaha', x: 42, y: 25 },
    { id: 'firdaws_aala', x: 54, y: 16 }
  ]
};

export function getRealmStoneTrailCoords(realmIndex: number = 1): { id: string; x: number; y: number }[] {
  return REALM_STONE_TRAILS[realmIndex] || REALM_STONE_TRAILS[1];
}

export const MAP_STONE_TRAIL_COORDS = REALM_STONE_TRAILS[1];

export function buildSvgCurvePath(coords: { x: number; y: number }[]): string {
  if (!coords || coords.length === 0) return '';
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const midY = (prev.y + curr.y) / 2;
    d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }
  return d;
}


export interface StreakBonus {
  multiplier: number;
  label: string;
  badge: string;
  nextTierDays: number;
}

export function calculateStreakMultiplier(streakDays: number = 0): StreakBonus {
  if (streakDays >= 14) {
    return { multiplier: 2.0, label: 'سابق بالخيرات (أدومه وإن قل)', badge: " x2.0", nextTierDays: 14 };
  }
  if (streakDays >= 7) {
    return { multiplier: 1.5, label: 'همّة متصلة', badge: " x1.5", nextTierDays: 14 };
  }
  if (streakDays >= 3) {
    return { multiplier: 1.25, label: 'مواظبة وثبات', badge: " x1.25", nextTierDays: 7 };
  }
  return { multiplier: 1.0, label: 'بداية المسير', badge: " x1.0", nextTierDays: 3 };
}

export interface BlessedTimeInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  multiplier: number;
  badgeText: string;
  remainingMinutes: number;
}

export function getActiveBlessedTime(now: Date = new Date()): BlessedTimeInfo | null {
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTotalMinutes = hours * 60 + minutes;

  // 1. الثلث الأخير من الليل (02:30 إلى 05:00)
  if (currentTotalMinutes >= 150 && currentTotalMinutes < 300) {
    const rem = Math.max(1, 300 - currentTotalMinutes);
    return {
      id: 'last_third_night',
      name: 'الثلث الأخير من الليل',
      icon: "icon:moon",
      description: 'وقت التنزل الإلهي والاستغفار بالأسحار · أثر مضاعف x2',
      multiplier: 2.0,
      badgeText: 'نفحة السحر x2',
      remainingMinutes: rem,
    };
  }

  // 2. ساعة البكور (بعد الفجر إلى الشروق - 05:00 إلى 06:45)
  if (currentTotalMinutes >= 300 && currentTotalMinutes < 405) {
    const rem = Math.max(1, 405 - currentTotalMinutes);
    return {
      id: 'fajr_bukoor',
      name: 'ساعة البكور',
      icon: "icon:sunrise",
      description: '«اللهم بارك لأمتي في بكورها» · بركة مضافة +50%',
      multiplier: 1.5,
      badgeText: 'ساعة البكور x1.5',
      remainingMinutes: rem,
    };
  }

  // 3. ساعة الإجابة يوم الجمعة (عصر الجمعة - 16:30 إلى 18:30)
  if (day === 5 && currentTotalMinutes >= 990 && currentTotalMinutes < 1110) {
    const rem = Math.max(1, 1110 - currentTotalMinutes);
    return {
      id: 'friday_golden_hour',
      name: 'ساعة الإجابة يوم الجمعة',
      icon: "icon:landmark",
      description: 'أشرف ساعات الأسبوع وأرجى أوقات الإجابة · أثر مضاعف x2',
      multiplier: 2.0,
      badgeText: 'ساعة الإجابة x2',
      remainingMinutes: rem,
    };
  }

  // 4. أصيل الذكر وأذكار المساء (16:30 إلى 18:15 في باقي الأيام)
  if (day !== 5 && currentTotalMinutes >= 990 && currentTotalMinutes < 1095) {
    const rem = Math.max(1, 1095 - currentTotalMinutes);
    return {
      id: 'evening_adhkar_hour',
      name: 'أصيل الذكر والمساء',
      icon: "icon:sunset",
      description: 'تسبيح العشي وأذكار المساء الفاضلة · بركة مضافة +25%',
      multiplier: 1.25,
      badgeText: 'أصيل الذكر x1.25',
      remainingMinutes: rem,
    };
  }

  return null;
}

export function getCurrentIslamicWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getRemainingDaysInCurrentWeek(now: Date = new Date()): { days: number; hours: number } {
  const day = now.getDay();
  // Count towards end of week (Friday 18:00)
  const diffDays = (5 - day + 7) % 7 || 7;
  const hoursLeft = Math.max(0, 18 - now.getHours());
  return { days: diffDays > 1 ? diffDays - 1 : 0, hours: hoursLeft };
}

export interface QuranJuzMeta {
  juzNumber: number;
  name: string;
  startPage: number;
  endPage: number;
  totalPages: number;
}

export const QURAN_JUZS: QuranJuzMeta[] = [
  { juzNumber: 1, name: 'الم (الفاتحة والبقرة)', startPage: 1, endPage: 21, totalPages: 21 },
  { juzNumber: 2, name: 'سيقول السفهاء (البقرة)', startPage: 22, endPage: 41, totalPages: 20 },
  { juzNumber: 3, name: 'تلك الرسل (البقرة وآل عمران)', startPage: 42, endPage: 61, totalPages: 20 },
  { juzNumber: 4, name: 'لن تنالوا البر (آل عمران والنساء)', startPage: 62, endPage: 81, totalPages: 20 },
  { juzNumber: 5, name: 'والمحصنات (النساء)', startPage: 82, endPage: 101, totalPages: 20 },
  { juzNumber: 6, name: 'لا يحب الله (النساء والمائدة)', startPage: 102, endPage: 121, totalPages: 20 },
  { juzNumber: 7, name: 'وإذا سمعوا (المائدة والأنعام)', startPage: 122, endPage: 141, totalPages: 20 },
  { juzNumber: 8, name: 'ولو أننا نزلنا (الأنعام والأعراف)', startPage: 142, endPage: 161, totalPages: 20 },
  { juzNumber: 9, name: 'قال الملأ (الأعراف والأنفال)', startPage: 162, endPage: 181, totalPages: 20 },
  { juzNumber: 10, name: 'واعلموا (الأنفال والتوبة)', startPage: 182, endPage: 201, totalPages: 20 },
  { juzNumber: 11, name: 'يعتذرون إليكم (التوبة ويونس وهود)', startPage: 202, endPage: 221, totalPages: 20 },
  { juzNumber: 12, name: 'وما من دابة (هود ويوسف)', startPage: 222, endPage: 241, totalPages: 20 },
  { juzNumber: 13, name: 'وما أبرئ نفسي (يوسف والرعد وإبراهيم)', startPage: 242, endPage: 261, totalPages: 20 },
  { juzNumber: 14, name: 'ربما يود (الحجر والنحل)', startPage: 262, endPage: 281, totalPages: 20 },
  { juzNumber: 15, name: 'سبحان الذي أسرى (الإسراء والكهف)', startPage: 282, endPage: 301, totalPages: 20 },
  { juzNumber: 16, name: 'قال ألم أقل لك (الكهف ومريم وطه)', startPage: 302, endPage: 321, totalPages: 20 },
  { juzNumber: 17, name: 'اقترب للناس (الأنبياء والحج)', startPage: 322, endPage: 341, totalPages: 20 },
  { juzNumber: 18, name: 'قد أفلح المؤمنون (المؤمنون والنور والفرقان)', startPage: 342, endPage: 361, totalPages: 20 },
  { juzNumber: 19, name: 'وقال الذين لا يرجون (الفرقان والشعراء والنمل)', startPage: 362, endPage: 381, totalPages: 20 },
  { juzNumber: 20, name: 'فما كان جواب قومه (النمل والقصص والعنكبوت)', startPage: 382, endPage: 401, totalPages: 20 },
  { juzNumber: 21, name: 'ولا تجادلوا (العنكبوت والروم ولقمان والسجدة والأحزاب)', startPage: 402, endPage: 421, totalPages: 20 },
  { juzNumber: 22, name: 'ومن يقنت (الأحزاب وسبأ وفاطر ويس)', startPage: 422, endPage: 441, totalPages: 20 },
  { juzNumber: 23, name: 'وما أنزلنا على قومه (يس والصافات وص والزمر)', startPage: 442, endPage: 461, totalPages: 20 },
  { juzNumber: 24, name: 'فمن أظلم (الزمر وغافر وفصلت)', startPage: 462, endPage: 481, totalPages: 20 },
  { juzNumber: 25, name: 'إليه يرد علم الساعة (فصلت والشورى والزخرف والدخان والجاثية)', startPage: 482, endPage: 501, totalPages: 20 },
  { juzNumber: 26, name: 'حم (الأحقاف ومحمد والفتح والحجرات وق والذاريات)', startPage: 502, endPage: 521, totalPages: 20 },
  { juzNumber: 27, name: 'قال فما خطبكم (الذاريات والطور والنجم والقمر والرحمن والواقعة والحديد)', startPage: 522, endPage: 541, totalPages: 20 },
  { juzNumber: 28, name: 'قد سمع الله (المجادلة إلى التحريم)', startPage: 542, endPage: 561, totalPages: 20 },
  { juzNumber: 29, name: 'تبارك الذي بيده الملك (الملك إلى المرسلات)', startPage: 562, endPage: 581, totalPages: 20 },
  { juzNumber: 30, name: 'عمّ يتساءلون (النبأ إلى الناس)', startPage: 582, endPage: 604, totalPages: 23 },
];

export function getJuzFromPage(pageNumber: number): QuranJuzMeta {
  const p = Math.max(1, Math.min(604, pageNumber));
  return QURAN_JUZS.find(j => p >= j.startPage && p <= j.endPage) || QURAN_JUZS[0];
}

export function isRibatSaharActive(now: Date = new Date()): { isActive: boolean; remainingMinutes: number } {
  // Support Admin tester/preview mode to test Sahar theme and features without waiting
  if (typeof window !== 'undefined' && localStorage.getItem('ifaqa_admin_sahar_tester_mode') === 'true') {
    return { isActive: true, remainingMinutes: 89 };
  }
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMins = hours * 60 + minutes;
  // 90 minutes before Fajr: 03:30 to 05:00 = 210 to 300 minutes
  const isActive = totalMins >= 210 && totalMins < 300;
  const remainingMinutes = isActive ? Math.max(1, 300 - totalMins) : 0;
  return { isActive, remainingMinutes };
}

export function getTimeUntilNextSahar(now: Date = new Date()): { hours: number; minutes: number } {
  if (typeof window !== 'undefined' && localStorage.getItem('ifaqa_admin_sahar_tester_mode') === 'true') {
    return { hours: 0, minutes: 0 };
  }
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMins = hours * 60 + minutes;
  let diff = 0;
  if (totalMins < 210) {
    diff = 210 - totalMins;
  } else {
    diff = (1440 - totalMins) + 210;
  }
  return {
    hours: Math.floor(diff / 60),
    minutes: diff % 60
  };
}

export function isFridayGoldenHourActive(now: Date = new Date()): { isActive: boolean; remainingMinutes: number } {
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMins = hours * 60 + minutes;
  // Friday 16:30 to 18:30 (990 to 1110)
  const isActive = day === 5 && totalMins >= 990 && totalMins < 1110;
  const remainingMinutes = isActive ? Math.max(1, 1110 - totalMins) : 0;
  return { isActive, remainingMinutes };
}

export function getDaysSinceActive(lastActiveDate?: string, lastActiveTimestamp?: any): number {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  if (!lastActiveDate && !lastActiveTimestamp) return 2;

  let lastDateStr = lastActiveDate;
  if (!lastDateStr && lastActiveTimestamp?.toDate) {
    lastDateStr = lastActiveTimestamp.toDate().toISOString().slice(0, 10);
  }
  if (!lastDateStr) return 2;

  const d1 = new Date(todayStr).getTime();
  const d2 = new Date(lastDateStr).getTime();
  const diffDays = Math.round((d1 - d2) / (1000 * 3600 * 24));
  return Math.max(0, diffDays);
}

export interface JointMegaProjectTemplate {
  id: string;
  name: string;
  arabicTitle: string;
  description: string;
  icon: string;
  targetPoints: number;
  mapCoords: { x: number; y: number };
  perk: string;
}

export const JOINT_MEGA_PROJECTS: JointMegaProjectTemplate[] = [
  {
    id: 'dam_of_concord',
    name: 'سد الوفاق العظيم',
    arabicTitle: 'سد الأمان والبركة المشتركة',
    description: 'صرح حصين في ملتقى الأودية بتعاون ركابين متآخيين، يجمع مياه الرحمة والغيث ويحمي واحات الخير.',
    icon: "icon:waves",
    targetPoints: 60000,
    mapCoords: { x: 50, y: 52 },
    perk: '+2 سعة مقاعد إضافية لكلا الرَّكْبَيْن ووسام حليف الإخاء'
  },
  {
    id: 'well_of_ruwah',
    name: 'بئر الرُّوَاة والسُّقيا',
    arabicTitle: 'سقيا الإخاء ونماء القوافل',
    description: 'بئر عذب نمير في واحة التقاء القوافل، يُروي السالكين اقتداءً بسنة المؤاخاة وسقيا الماء المباركة.',
    icon: "icon:sparkles",
    targetPoints: 35000,
    mapCoords: { x: 48, y: 72 },
    perk: '+15% تسريع لجميع مشاريع التشييد الجارية في الرَّكْبَيْن'
  }
];



