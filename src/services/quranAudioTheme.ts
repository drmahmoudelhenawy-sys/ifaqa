export type AudioThemeId = 'midnight' | 'emerald' | 'amethyst' | 'light_dawn' | 'sepia_sahara';

export type PlayerBgMode =
  | 'aurora_ocean'     // أزرق محيطي مشع
  | 'aurora_emerald'   // زمردي وذهبي
  | 'aurora_sunset'    // شفق الغروب
  | 'aurora_violet'    // بنفسجي ملكي
  | 'aurora_northern'  // الشفق القطبي
  | 'solid_amoled'     // أسود AMOLED نقي
  | 'solid_navy'       // كحلي داكن ملكي
  | 'solid_forest'     // أخضر زمردي
  | 'solid_espresso'   // بني قهوة دافئ
  | 'solid_violet'     // أرجواني ملكي
  | 'solid_teal'       // سماوي بترولي
  | 'solid_burgundy'   // عنابي كستنائي
  | 'solid_slate';     // رمادي معدني

export interface PlayerBgPreset {
  id: PlayerBgMode;
  name: string;
  category: 'gradient' | 'solid';
  previewColor: string;
  previewSecondary?: string;
  accentColor: string;
  topColor: string;
  isSolid: boolean;
  oceanGradient?: string;
  blob1?: string;
  blob2?: string;
  blob3?: string;
  waveColor1?: string;
  waveColor2?: string;
}

export const PLAYER_BG_PRESETS: PlayerBgPreset[] = [
  // Multi-color Live Aurora Gradients
  {
    id: 'aurora_ocean',
    name: 'أزرق محيطي',
    category: 'gradient',
    previewColor: '#0096ff',
    previewSecondary: '#003c80',
    accentColor: '#38bdf8',
    topColor: '#020612',
    isSolid: false,
    oceanGradient: 'linear-gradient(180deg, rgba(2,6,18,0) 0%, rgba(3,30,95,0.42) 20%, rgba(2,78,195,0.75) 45%, rgba(0,140,255,0.92) 75%, #0096ff 100%)',
    blob1: 'radial-gradient(circle, #00d2ff 0%, #0066ff 65%, transparent 100%)',
    blob2: 'radial-gradient(circle, #38bdf8 0%, #1d4ed8 65%, transparent 100%)',
    blob3: 'radial-gradient(circle, rgba(56, 189, 248, 0.95) 0%, rgba(3, 105, 161, 0.6) 65%, transparent 100%)',
    waveColor1: 'rgba(0, 180, 255, 0.35)',
    waveColor2: 'rgba(56, 189, 248, 0.22)',
  },
  {
    id: 'aurora_emerald',
    name: 'زمرد وذهب',
    category: 'gradient',
    previewColor: '#10b981',
    previewSecondary: '#064e3b',
    accentColor: '#34d399',
    topColor: '#02120d',
    isSolid: false,
    oceanGradient: 'linear-gradient(180deg, rgba(2,18,13,0) 0%, rgba(4,47,39,0.45) 20%, rgba(5,150,105,0.78) 45%, rgba(16,185,129,0.92) 75%, #059669 100%)',
    blob1: 'radial-gradient(circle, #34d399 0%, #059669 65%, transparent 100%)',
    blob2: 'radial-gradient(circle, #6ee7b7 0%, #047857 65%, transparent 100%)',
    blob3: 'radial-gradient(circle, rgba(251, 191, 36, 0.85) 0%, rgba(217, 119, 6, 0.55) 65%, transparent 100%)',
    waveColor1: 'rgba(16, 185, 129, 0.35)',
    waveColor2: 'rgba(52, 211, 153, 0.22)',
  },
  {
    id: 'aurora_sunset',
    name: 'شفق الغروب',
    category: 'gradient',
    previewColor: '#f97316',
    previewSecondary: '#701a75',
    accentColor: '#fb923c',
    topColor: '#12040c',
    isSolid: false,
    oceanGradient: 'linear-gradient(180deg, rgba(18,4,12,0) 0%, rgba(88,28,135,0.45) 20%, rgba(190,24,93,0.78) 45%, rgba(249,115,22,0.92) 75%, #ea580c 100%)',
    blob1: 'radial-gradient(circle, #f43f5e 0%, #e11d48 65%, transparent 100%)',
    blob2: 'radial-gradient(circle, #fb923c 0%, #ea580c 65%, transparent 100%)',
    blob3: 'radial-gradient(circle, rgba(168, 85, 247, 0.9) 0%, rgba(126, 34, 206, 0.6) 65%, transparent 100%)',
    waveColor1: 'rgba(249, 115, 22, 0.35)',
    waveColor2: 'rgba(244, 63, 94, 0.22)',
  },
  {
    id: 'aurora_violet',
    name: 'أرجواني ملكي',
    category: 'gradient',
    previewColor: '#a855f7',
    previewSecondary: '#3b0764',
    accentColor: '#c084fc',
    topColor: '#0c0418',
    isSolid: false,
    oceanGradient: 'linear-gradient(180deg, rgba(12,4,24,0) 0%, rgba(59,7,100,0.45) 20%, rgba(126,34,206,0.78) 45%, rgba(168,85,247,0.92) 75%, #9333ea 100%)',
    blob1: 'radial-gradient(circle, #c084fc 0%, #7e22ce 65%, transparent 100%)',
    blob2: 'radial-gradient(circle, #e879f9 0%, #9333ea 65%, transparent 100%)',
    blob3: 'radial-gradient(circle, rgba(129, 140, 248, 0.9) 0%, rgba(79, 70, 229, 0.6) 65%, transparent 100%)',
    waveColor1: 'rgba(168, 85, 247, 0.35)',
    waveColor2: 'rgba(192, 132, 252, 0.22)',
  },
  {
    id: 'aurora_northern',
    name: 'شفق قطبي',
    category: 'gradient',
    previewColor: '#14b8a6',
    previewSecondary: '#042f2e',
    accentColor: '#2dd4bf',
    topColor: '#021415',
    isSolid: false,
    oceanGradient: 'linear-gradient(180deg, rgba(2,20,21,0) 0%, rgba(4,47,46,0.45) 20%, rgba(13,148,136,0.78) 45%, rgba(20,184,166,0.92) 75%, #0d9488 100%)',
    blob1: 'radial-gradient(circle, #2dd4bf 0%, #0f766e 65%, transparent 100%)',
    blob2: 'radial-gradient(circle, #a7f3d0 0%, #059669 65%, transparent 100%)',
    blob3: 'radial-gradient(circle, rgba(56, 189, 248, 0.9) 0%, rgba(2, 132, 199, 0.6) 65%, transparent 100%)',
    waveColor1: 'rgba(20, 184, 166, 0.35)',
    waveColor2: 'rgba(45, 212, 191, 0.22)',
  },

  // Single-Hue Monochromatic Aurora Waves (أمواج شفقية حية بلون أحادي نقي)
  {
    id: 'solid_navy',
    name: 'أزرق نقي',
    category: 'solid',
    previewColor: '#2563eb',
    accentColor: '#3b82f6',
    topColor: '#020612',
    isSolid: false,
    oceanGradient: 'linear-gradient(180deg, rgba(2,6,18,0) 0%, rgba(3,25,80,0.45) 20%, rgba(29,78,216,0.75) 45%, rgba(37,99,235,0.92) 75%, #1d4ed8 100%)',
    blob1: 'radial-gradient(circle, #3b82f6 0%, #1d4ed8 65%, transparent 100%)',
    blob2: 'radial-gradient(circle, #60a5fa 0%, #2563eb 65%, transparent 100%)',
    blob3: 'radial-gradient(circle, rgba(59,130,246,0.9) 0%, rgba(29,78,216,0.6) 65%, transparent 100%)',
    waveColor1: 'rgba(37,99,235,0.35)',
    waveColor2: 'rgba(59,130,246,0.22)',
  },
  {
    id: 'solid_forest',
    name: 'أخضر زمردي',
    category: 'solid',
    previewColor: '#10b981',
    accentColor: '#10b981',
    topColor: '#020e09',
    isSolid: false,
    oceanGradient: 'linear-gradient(180deg, rgba(2,14,9,0) 0%, rgba(4,47,31,0.45) 20%, rgba(5,150,105,0.75) 45%, rgba(16,185,129,0.92) 75%, #059669 100%)',
    blob1: 'radial-gradient(circle, #10b981 0%, #047857 65%, transparent 100%)',
    blob2: 'radial-gradient(circle, #34d399 0%, #059669 65%, transparent 100%)',
    blob3: 'radial-gradient(circle, rgba(16,185,129,0.9) 0%, rgba(4,120,87,0.6) 65%, transparent 100%)',
    waveColor1: 'rgba(16,185,129,0.35)',
    waveColor2: 'rgba(52,211,153,0.22)',
  },
  {
    id: 'solid_violet',
    name: 'أرجواني ملكي',
    category: 'solid',
    previewColor: '#9333ea',
    accentColor: '#a855f7',
    topColor: '#0c0414',
    isSolid: false,
    oceanGradient: 'linear-gradient(180deg, rgba(12,4,20,0) 0%, rgba(59,7,100,0.45) 20%, rgba(126,34,206,0.75) 45%, rgba(147,51,234,0.92) 75%, #7e22ce 100%)',
    blob1: 'radial-gradient(circle, #a855f7 0%, #7e22ce 65%, transparent 100%)',
    blob2: 'radial-gradient(circle, #c084fc 0%, #9333ea 65%, transparent 100%)',
    blob3: 'radial-gradient(circle, rgba(168,85,247,0.9) 0%, rgba(126,34,206,0.6) 65%, transparent 100%)',
    waveColor1: 'rgba(147,51,234,0.35)',
    waveColor2: 'rgba(168,85,247,0.22)',
  },
  {
    id: 'solid_espresso',
    name: 'ذهبي عنبري',
    category: 'solid',
    previewColor: '#f59e0b',
    accentColor: '#fbbf24',
    topColor: '#120902',
    isSolid: false,
    oceanGradient: 'linear-gradient(180deg, rgba(18,9,2,0) 0%, rgba(69,26,3,0.45) 20%, rgba(180,83,9,0.75) 45%, rgba(245,158,11,0.92) 75%, #d97706 100%)',
    blob1: 'radial-gradient(circle, #fbbf24 0%, #d97706 65%, transparent 100%)',
    blob2: 'radial-gradient(circle, #fcd34d 0%, #b45309 65%, transparent 100%)',
    blob3: 'radial-gradient(circle, rgba(251,191,36,0.9) 0%, rgba(180,83,9,0.6) 65%, transparent 100%)',
    waveColor1: 'rgba(245,158,11,0.35)',
    waveColor2: 'rgba(251,191,36,0.22)',
  },
  {
    id: 'solid_teal',
    name: 'سماوي فيروزي',
    category: 'solid',
    previewColor: '#06b6d4',
    accentColor: '#22d3ee',
    topColor: '#021217',
    isSolid: false,
    oceanGradient: 'linear-gradient(180deg, rgba(2,18,23,0) 0%, rgba(8,51,68,0.45) 20%, rgba(14,116,144,0.75) 45%, rgba(6,182,212,0.92) 75%, #0891b2 100%)',
    blob1: 'radial-gradient(circle, #22d3ee 0%, #0891b2 65%, transparent 100%)',
    blob2: 'radial-gradient(circle, #67e8f9 0%, #0e7490 65%, transparent 100%)',
    blob3: 'radial-gradient(circle, rgba(34,211,238,0.9) 0%, rgba(8,145,178,0.6) 65%, transparent 100%)',
    waveColor1: 'rgba(6,182,212,0.35)',
    waveColor2: 'rgba(34,211,238,0.22)',
  },
  {
    id: 'solid_burgundy',
    name: 'ياقوتي كستنائي',
    category: 'solid',
    previewColor: '#e11d48',
    accentColor: '#fb7185',
    topColor: '#140207',
    isSolid: false,
    oceanGradient: 'linear-gradient(180deg, rgba(20,2,7,0) 0%, rgba(76,5,25,0.45) 20%, rgba(159,18,57,0.75) 45%, rgba(225,29,72,0.92) 75%, #be123c 100%)',
    blob1: 'radial-gradient(circle, #fb7185 0%, #be123c 65%, transparent 100%)',
    blob2: 'radial-gradient(circle, #fda4af 0%, #9f1239 65%, transparent 100%)',
    blob3: 'radial-gradient(circle, rgba(251,113,133,0.9) 0%, rgba(159,18,57,0.6) 65%, transparent 100%)',
    waveColor1: 'rgba(225,29,72,0.35)',
    waveColor2: 'rgba(251,113,133,0.22)',
  },
  {
    id: 'solid_slate',
    name: 'فضي تيتانيوم',
    category: 'solid',
    previewColor: '#94a3b8',
    accentColor: '#cbd5e1',
    topColor: '#0b0f17',
    isSolid: false,
    oceanGradient: 'linear-gradient(180deg, rgba(11,15,23,0) 0%, rgba(30,41,59,0.45) 20%, rgba(71,85,105,0.75) 45%, rgba(148,163,184,0.92) 75%, #475569 100%)',
    blob1: 'radial-gradient(circle, #cbd5e1 0%, #475569 65%, transparent 100%)',
    blob2: 'radial-gradient(circle, #e2e8f0 0%, #334155 65%, transparent 100%)',
    blob3: 'radial-gradient(circle, rgba(203,213,225,0.9) 0%, rgba(71,85,105,0.6) 65%, transparent 100%)',
    waveColor1: 'rgba(148,163,184,0.35)',
    waveColor2: 'rgba(203,213,225,0.22)',
  },
  {
    id: 'solid_amoled',
    name: 'أسود AMOLED مطفأ',
    category: 'solid',
    previewColor: '#000000',
    accentColor: '#38bdf8',
    topColor: '#000000',
    isSolid: true,
    oceanGradient: 'transparent',
  },
];

export interface AudioTheme {
  id: AudioThemeId;
  name: string;
  type: 'dark' | 'light';
  previewBg: string;
  previewAccent: string;
  appBackground: string;
  headerBackground: string;
  cardBackground: string;
  activeTabBackground: string;
  textColor: string;
  subtextColor: string;
  accentColor: string;
  borderClass: string;
  playerGradient: string;
}

export const AUDIO_THEMES: Record<AudioThemeId, AudioTheme> = {
  midnight: {
    id: 'midnight',
    name: 'ليل سماوي',
    type: 'dark',
    previewBg: '#050b14',
    previewAccent: '#10b981',
    appBackground: 'bg-[#050b14] text-white',
    headerBackground: 'bg-[#07111f] border-white/10 text-white',
    cardBackground: 'bg-slate-900 border-white/10 text-white shadow-xl',
    activeTabBackground: 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/30',
    textColor: 'text-white',
    subtextColor: 'text-slate-400',
    accentColor: '#10b981',
    borderClass: 'border-white/10',
    playerGradient: 'from-[#050b14] via-[#071324] to-[#03070f]',
  },
  emerald: {
    id: 'emerald',
    name: 'زمرد ملكي',
    type: 'dark',
    previewBg: '#021f19',
    previewAccent: '#fbbf24',
    appBackground: 'bg-[#021f19] text-emerald-50',
    headerBackground: 'bg-[#03251e] border-emerald-500/20 text-emerald-50',
    cardBackground: 'bg-[#042f27] border-emerald-500/25 text-emerald-50 shadow-xl',
    activeTabBackground: 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-950/30',
    textColor: 'text-emerald-50',
    subtextColor: 'text-emerald-300/80',
    accentColor: '#34d399',
    borderClass: 'border-emerald-500/20',
    playerGradient: 'from-[#021f19] via-[#043329] to-[#011410]',
  },
  amethyst: {
    id: 'amethyst',
    name: 'أرجواني ملكي',
    type: 'dark',
    previewBg: '#0e071e',
    previewAccent: '#c084fc',
    appBackground: 'bg-[#0e071e] text-purple-50',
    headerBackground: 'bg-[#150a2b] border-purple-500/20 text-purple-50',
    cardBackground: 'bg-[#1b0d36] border-purple-500/25 text-purple-50 shadow-xl',
    activeTabBackground: 'bg-gradient-to-b from-purple-400 to-fuchsia-500 text-slate-950 shadow-lg shadow-purple-950/30',
    textColor: 'text-purple-50',
    subtextColor: 'text-purple-300/80',
    accentColor: '#c084fc',
    borderClass: 'border-purple-500/20',
    playerGradient: 'from-[#0e071e] via-[#1a0c36] to-[#07030f]',
  },
  light_dawn: {
    id: 'light_dawn',
    name: 'فجر نقي',
    type: 'light',
    previewBg: '#f1f5f9',
    previewAccent: '#059669',
    appBackground: 'bg-[#f1f5f9] text-slate-900',
    headerBackground: 'bg-white border-slate-200 text-slate-900 shadow-sm',
    cardBackground: 'bg-white border-slate-200 text-slate-900 shadow-md',
    activeTabBackground: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20',
    textColor: 'text-slate-900',
    subtextColor: 'text-slate-500',
    accentColor: '#059669',
    borderClass: 'border-slate-200',
    playerGradient: 'from-[#ffffff] via-[#f8fafc] to-[#e2e8f0]',
  },
  sepia_sahara: {
    id: 'sepia_sahara',
    name: 'صحراء دافئة',
    type: 'light',
    previewBg: '#f8f2e6',
    previewAccent: '#d97706',
    appBackground: 'bg-[#f8f2e6] text-amber-950',
    headerBackground: 'bg-[#fcf5e9] border-amber-200 text-amber-950 shadow-sm',
    cardBackground: 'bg-[#fffaf0] border-amber-200/80 text-amber-950 shadow-md',
    activeTabBackground: 'bg-gradient-to-b from-amber-600 to-amber-700 text-white shadow-md shadow-amber-700/20',
    textColor: 'text-amber-950',
    subtextColor: 'text-amber-800/80',
    accentColor: '#d97706',
    borderClass: 'border-amber-200',
    playerGradient: 'from-[#fffaf0] via-[#f9f0e1] to-[#eeddc2]',
  },
};

const THEME_STORAGE_KEY = 'ifaqa_quran_audio_theme';
const PLAYER_BG_STORAGE_KEY = 'ifaqa_quran_player_bg_preset';

const listeners = new Set<(theme: AudioTheme) => void>();
const playerBgListeners = new Set<(preset: PlayerBgPreset) => void>();

export const QuranAudioThemeService = {
  getThemeId(): AudioThemeId {
    if (typeof window === 'undefined') return 'midnight';
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as AudioThemeId;
    if (stored && AUDIO_THEMES[stored]) {
      return stored;
    }
    return 'midnight';
  },

  getTheme(): AudioTheme {
    const id = this.getThemeId();
    return AUDIO_THEMES[id];
  },

  setTheme(id: AudioThemeId) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    }
    const theme = AUDIO_THEMES[id];
    listeners.forEach((fn) => fn(theme));
  },

  toggleTheme() {
    const current = this.getTheme();
    const nextId: AudioThemeId = current.type === 'dark' ? 'light_dawn' : 'midnight';
    this.setTheme(nextId);
  },

  getPlayerBgMode(): PlayerBgMode {
    if (typeof window === 'undefined') return 'aurora_ocean';
    const stored = localStorage.getItem(PLAYER_BG_STORAGE_KEY) as PlayerBgMode;
    const found = PLAYER_BG_PRESETS.find((p) => p.id === stored);
    if (found) return found.id;
    return 'aurora_ocean';
  },

  getPlayerBgPreset(): PlayerBgPreset {
    const mode = this.getPlayerBgMode();
    return PLAYER_BG_PRESETS.find((p) => p.id === mode) || PLAYER_BG_PRESETS[0];
  },

  setPlayerBgMode(mode: PlayerBgMode) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PLAYER_BG_STORAGE_KEY, mode);
    }
    const preset = PLAYER_BG_PRESETS.find((p) => p.id === mode) || PLAYER_BG_PRESETS[0];
    playerBgListeners.forEach((fn) => fn(preset));
  },

  subscribe(fn: (theme: AudioTheme) => void): () => void {
    listeners.add(fn);
    fn(this.getTheme());
    return () => {
      listeners.delete(fn);
    };
  },

  subscribePlayerBg(fn: (preset: PlayerBgPreset) => void): () => void {
    playerBgListeners.add(fn);
    fn(this.getPlayerBgPreset());
    return () => {
      playerBgListeners.delete(fn);
    };
  },
};
