export type FajrAlarmSoundOption = 'default' | 'makkah' | 'madinah' | 'abdulbasit' | 'alaqsa' | 'takbeerat' | 'tranquil' | 'custom';

export type FajrAlarmThemeId = 'emerald' | 'midnight' | 'royal_purple' | 'warm_amber';

export interface FajrAlarmTheme {
  id: FajrAlarmThemeId;
  name: string;
  subtitle: string;
  bgGradient: string;
  bgColorRgb: [number, number, number];
  accentColor: string;
  textColor: string;
  previewBorder: string;
}

export const FAJR_ALARM_THEMES: Record<FajrAlarmThemeId, FajrAlarmTheme> = {
  emerald: {
    id: 'emerald',
    name: 'فجر السكينة (زمردي)',
    subtitle: 'ظلال هادئة ونفحات الفجر الأولى',
    bgGradient: 'from-emerald-950 via-slate-950 to-teal-950',
    bgColorRgb: [15, 38, 30],
    accentColor: '#10b981',
    textColor: '#c3e1d0',
    previewBorder: 'border-emerald-500'
  },
  midnight: {
    id: 'midnight',
    name: 'قبس الفجر (كحلي نيلي)',
    subtitle: 'هدوء جوف الليل ونور المآذن',
    bgGradient: 'from-slate-950 via-indigo-950 to-blue-950',
    bgColorRgb: [12, 18, 38],
    accentColor: '#6366f1',
    textColor: '#c7d2fe',
    previewBorder: 'border-indigo-500'
  },
  royal_purple: {
    id: 'royal_purple',
    name: 'نور السحر (بنفسجي ملكي)',
    subtitle: 'إشراقة إيمانية متألقة بروحانية',
    bgGradient: 'from-slate-950 via-purple-950 to-violet-950',
    bgColorRgb: [26, 12, 38],
    accentColor: '#a855f7',
    textColor: '#e9d5ff',
    previewBorder: 'border-purple-500'
  },
  warm_amber: {
    id: 'warm_amber',
    name: 'عنبر الصباح (أسود ملكي وذهبي)',
    subtitle: 'دفء تباشير الصبح وضياء الأفق',
    bgGradient: 'from-zinc-950 via-amber-950 to-stone-950',
    bgColorRgb: [35, 25, 10],
    accentColor: '#f59e0b',
    textColor: '#fde68a',
    previewBorder: 'border-amber-500'
  }
};

export interface FajrAlarmUserSettings {
  soundType: FajrAlarmSoundOption;
  customSoundUrl?: string;
  customSoundName?: string;
  themeId: FajrAlarmThemeId;
  timeOffset: number; // 0 = وقت الفجر، 10، 15، 20، 30، 45، 60 دقيقة قبل الفجر
  mode: 'relative' | 'fixed'; // نسبة لوقت الفجر أو وقت مخصص ثابت
  customFixedTime?: string; // مثل "04:15"
}

const STORAGE_KEY = 'ifaqa_fajr_alarm_user_settings';

export const DEFAULT_ALARM_SETTINGS: FajrAlarmUserSettings = {
  soundType: 'default',
  themeId: 'emerald',
  timeOffset: 0,
  mode: 'relative',
  customFixedTime: '04:15'
};

export const SOUND_PRESETS = [
  { id: 'default', name: 'الصوت الافتراضي للتطبيق', desc: 'الصوت المعتمد في التطبيق أو المحدد من الإدارة', url: '/audio/adhan/makkah.mp3' },
  { id: 'makkah', name: 'أذان الفجر - الحرم المكي', desc: 'أذان الفجر المكي العذب بنبرة خاشعة', url: '/audio/adhan/makkah.mp3', fallbackUrl: 'https://server9.mp3quran.net/adhan/01.mp3' },
  { id: 'madinah', name: 'أذان الفجر - المسجد النبوي', desc: 'أذان المدينة المنورة بجماله الساحر', url: '/audio/adhan/madinah.mp3', fallbackUrl: 'https://server9.mp3quran.net/adhan/02.mp3' },
  { id: 'abdulbasit', name: 'أذان مصر - الشيخ عبد الباسط', desc: 'أذان تاريخي عذب ومهيب برواية مصرية', url: '/audio/adhan/abdulbasit.mp3', fallbackUrl: 'https://server9.mp3quran.net/adhan/03.mp3' },
  { id: 'alaqsa', name: 'أذان المسجد الأقصى المبارك', desc: 'أذان الأقصى الشريف بنبرته المؤثرة', url: '/audio/adhan/alaqsa.mp3', fallbackUrl: 'https://server9.mp3quran.net/adhan/01.mp3' },
  { id: 'takbeerat', name: 'تكبيرات الفجر والسكينة', desc: 'تكبيرات مباركة تبعث النشاط والهمة', url: '/audio/adhan/takbeerat.mp3', fallbackUrl: 'https://server9.mp3quran.net/adhan/03.mp3' },
  { id: 'tranquil', name: 'رنين السكينة الهادئ', desc: 'نغمة تصاعدية لطيفة توقظك برفق', url: '/audio/adhan/tranquil.mp3', fallbackUrl: 'https://server9.mp3quran.net/adhan/04.mp3' },
  { id: 'custom', name: 'صوت مخصص (رابط أو ملف)', desc: 'اختر أو ارفع ملفك الصوتي الخاص من هاتفك' }
] as const;

export function loadFajrAlarmSettings(): FajrAlarmUserSettings {
  if (typeof window === 'undefined') return DEFAULT_ALARM_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ALARM_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_ALARM_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_ALARM_SETTINGS;
  }
}

export function saveFajrAlarmSettings(settings: FajrAlarmUserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Also save to Preferences for native capacitor access if available
    try {
      import('@capacitor/preferences').then(({ Preferences }) => {
        Preferences.set({
          key: 'ifaqa_fajr_alarm_settings',
          value: JSON.stringify(settings)
        }).catch(() => {});
      });
    } catch {}
  } catch {}
}
