import React, { useEffect, useMemo, useState, useRef } from 'react';
import { User } from 'firebase/auth';
import { ArrowLeft, Plus, Trash2, Settings2, CheckCircle, GripHorizontal } from 'lucide-react';
import { hapticCounter } from '../src/services/haptics';
import { backNavigationService } from '../src/services/backNavigationService';
import { clanService } from '../src/services/clanService';

interface MasbahaPageProps {
  user: User;
  onBack: () => void;
}

interface MasbahaState {
  count: number;
  themeId: string;
  customList: string[];
  selectedZekr: string;
}

const THEMES = [
  {
    id: 'royal',
    name: 'ملكي',
    bg: 'bg-gradient-to-br from-indigo-900 via-violet-900 to-fuchsia-900',
    accent: 'text-fuchsia-300',
    button: 'bg-white/10',
  },
  {
    id: 'dawn',
    name: 'فجر',
    bg: 'bg-gradient-to-br from-orange-400 via-rose-400 to-purple-500',
    accent: 'text-white',
    button: 'bg-white/20',
  },
  {
    id: 'nature',
    name: 'سكينة',
    bg: 'bg-gradient-to-br from-emerald-800 via-teal-700 to-cyan-900',
    accent: 'text-emerald-200',
    button: 'bg-emerald-900/40',
  },
  {
    id: 'dark',
    name: 'ليل',
    bg: 'bg-slate-950',
    accent: 'text-slate-300',
    button: 'bg-slate-800',
  },
];

const DEFAULT_LIST = [
  'سبحان الله',
  'الحمد لله',
  'الله أكبر',
  'لا إله إلا الله',
  'أستغفر الله',
  'اللهم صل على محمد',
  'لا حول ولا قوة إلا بالله',
];

const buildMasbahaStorageKey = (userId: string) => `masbaha_state_${userId}`;

const getDefaultState = (): MasbahaState => ({
  count: 0,
  themeId: THEMES[0].id,
  customList: [],
  selectedZekr: DEFAULT_LIST[0],
});

const MasbahaPage: React.FC<MasbahaPageProps> = ({ user, onBack }) => {
  const storageKey = useMemo(() => buildMasbahaStorageKey(user.uid), [user.uid]);
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState(THEMES[0]);
  const [customList, setCustomList] = useState<string[]>([]);
  const [selectedZekr, setSelectedZekr] = useState(DEFAULT_LIST[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [newZekr, setNewZekr] = useState('');
  const [animate, setAnimate] = useState(false);

  // Batch / Debounce clan tasbeeh contributions
  const pendingClanTaps = useRef(0);
  const clanDebounceTimer = useRef<number | null>(null);

  const flushClanTasbeeh = () => {
    if (clanDebounceTimer.current) {
      window.clearTimeout(clanDebounceTimer.current);
      clanDebounceTimer.current = null;
    }
    const amount = pendingClanTaps.current;
    if (amount > 0 && user?.uid) {
      pendingClanTaps.current = 0;
      void clanService.autoContributeClanQuest(user.uid, 'tasbeeh', amount);
    }
  };

  useEffect(() => {
    return () => {
      flushClanTasbeeh();
    };
  }, [user?.uid]);

  const activeList = useMemo(() => [...DEFAULT_LIST, ...customList], [customList]);

  const persistState = (partial?: Partial<MasbahaState>) => {
    const currentState: MasbahaState = {
      count,
      themeId: theme.id,
      customList,
      selectedZekr,
      ...partial,
    };
    localStorage.setItem(storageKey, JSON.stringify(currentState));
  };

  useEffect(() => {
    const savedRaw = localStorage.getItem(storageKey);
    if (!savedRaw) {
      persistState(getDefaultState());
      return;
    }

    try {
      const savedState = JSON.parse(savedRaw) as Partial<MasbahaState>;
      const nextTheme = THEMES.find((item) => item.id === savedState.themeId) || THEMES[0];
      const nextCustomList = Array.isArray(savedState.customList) ? savedState.customList.filter(Boolean) : [];
      const nextSelected =
        typeof savedState.selectedZekr === 'string' && savedState.selectedZekr.trim()
          ? savedState.selectedZekr
          : DEFAULT_LIST[0];
      const nextCount =
        typeof savedState.count === 'number' && Number.isFinite(savedState.count) && savedState.count >= 0
          ? savedState.count
          : 0;

      setTheme(nextTheme);
      setCustomList(nextCustomList);
      setSelectedZekr(nextSelected);
      setCount(nextCount);
    } catch (error) {
      console.error('Failed to restore masbaha state:', error);
      persistState(getDefaultState());
    }
  }, [storageKey]);

  useEffect(() => {
    persistState();
  }, [count, theme.id, customList, selectedZekr]);

  useEffect(() => {
    if (showSettings) {
      return backNavigationService.register('masbaha_settings', 80, () => {
        setShowSettings(false);
      });
    }
  }, [showSettings]);

  const handleTap = () => {
    const nextCount = count + 1;
    setCount(nextCount);
    persistState({ count: nextCount });

    hapticCounter();
    if (navigator.vibrate) navigator.vibrate(30);

    setAnimate(true);
    window.setTimeout(() => setAnimate(false), 150);

    // Auto-contribute tasbeeh count to clan quests seamlessly (batched/debounced)
    pendingClanTaps.current += 1;
    if (pendingClanTaps.current >= 10) {
      flushClanTasbeeh();
    } else {
      if (clanDebounceTimer.current) window.clearTimeout(clanDebounceTimer.current);
      clanDebounceTimer.current = window.setTimeout(flushClanTasbeeh, 1500);
    }
  };

  const resetCounter = () => {
    if (!window.confirm('تصفير العداد؟')) {
      return;
    }

    setCount(0);
    persistState({ count: 0 });
  };

  const handleThemeChange = (themeId: string) => {
    const nextTheme = THEMES.find((item) => item.id === themeId) || THEMES[0];
    setTheme(nextTheme);
    persistState({ themeId: nextTheme.id });
  };

  const handleSelectZekr = (zekr: string) => {
    setSelectedZekr(zekr);
    persistState({ selectedZekr: zekr });
    setShowSettings(false);
  };

  const handleAddZekr = () => {
    const trimmed = newZekr.trim();
    if (!trimmed) {
      return;
    }

    const updatedList = [...customList, trimmed];
    setCustomList(updatedList);
    setNewZekr('');
    persistState({ customList: updatedList });
  };

  const handleRemoveZekr = (zekr: string) => {
    const updatedList = customList.filter((item) => item !== zekr);
    const nextSelected = selectedZekr === zekr ? DEFAULT_LIST[0] : selectedZekr;

    setCustomList(updatedList);
    setSelectedZekr(nextSelected);
    persistState({
      customList: updatedList,
      selectedZekr: nextSelected,
    });
  };

  return (
    <div className={`min-h-screen flex flex-col ${theme.bg} transition-colors duration-700 relative overflow-hidden text-white`}>
      <div className="p-4 flex justify-between items-center z-20">
        <button onClick={onBack} className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition">
          <ArrowLeft size={24} className="rtl:rotate-180" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-xs opacity-80 font-black uppercase tracking-[0.3em]">المسبحة</span>
        </div>

        <button onClick={() => setShowSettings(true)} className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition">
          <Settings2 size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-between py-6 z-10 px-4">
        {/* Selected Dhikr & Counter Glass Card */}
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 text-center max-w-sm w-full shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">الذكر المختار</div>
          <h3 className="text-xl sm:text-2xl font-black mb-3 leading-relaxed min-h-[3.5rem] flex items-center justify-center text-white drop-shadow-md">{selectedZekr}</h3>
          
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-3" />
          
          <div className={`text-6xl sm:text-7xl font-mono font-black ${theme.accent} drop-shadow-2xl tracking-tighter py-2 transition-transform duration-100 ${animate ? 'scale-105' : 'scale-100'}`}>
            {count.toLocaleString()}
          </div>
        </div>

        {/* Tactile Tasbeeh Button with Shockwave Ripples */}
        <div className="relative my-auto flex items-center justify-center">
          {/* Animated Shockwave Rings */}
          <div
            className={`absolute w-72 h-72 rounded-full border-2 border-white/20 bg-white/10 transition-all duration-500 pointer-events-none ${
              animate ? 'scale-125 opacity-0' : 'scale-100 opacity-60'
            }`}
          />
          <div
            className={`absolute w-84 h-84 rounded-full border border-white/10 transition-all duration-700 pointer-events-none ${
              animate ? 'scale-140 opacity-0' : 'scale-90 opacity-30'
            }`}
          />

          <button
            onClick={handleTap}
            className={`w-60 h-60 sm:w-68 sm:h-68 rounded-full ${theme.button} backdrop-blur-2xl border-2 border-white/30 shadow-[0_0_60px_rgba(0,0,0,0.35)] flex flex-col items-center justify-center active:scale-90 transition-all duration-150 relative group overflow-hidden`}
            aria-label="تسبيح"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-white/10 opacity-70 pointer-events-none" />
            <span className="text-3xl font-black text-white/90 drop-shadow-md mb-1">سبّح</span>
            <span className="text-[11px] font-bold text-white/60 tracking-wider">اضغط للتسبيح</span>
            <GripHorizontal size={32} className="opacity-30 mt-2 text-white" />
          </button>
        </div>

        {/* Reset Action */}
        <button 
          onClick={resetCounter} 
          className="text-xs font-black bg-white/15 backdrop-blur-md px-6 py-2.5 rounded-full hover:bg-rose-500/30 hover:text-rose-200 border border-white/20 transition-all active:scale-95 shadow-md flex items-center gap-2"
        >
          <Trash2 size={13} />
          <span>تصفير العداد</span>
        </button>
      </div>

      {showSettings && (
        <div className="absolute inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowSettings(false)} />

          <div className="bg-slate-950/95 w-full max-w-sm h-full p-6 overflow-y-auto relative animate-in slide-in-from-left duration-300 shadow-2xl border-r border-white/15">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-white">إعدادات المسبحة</h3>
              <button 
                onClick={() => setShowSettings(false)} 
                className="p-2 bg-slate-800 rounded-full text-slate-300 hover:text-white"
                aria-label="إغلاق"
              >
                <ArrowLeft size={20} className="rtl:rotate-180" />
              </button>
            </div>

            <div className="mb-6">
              <h4 className="text-slate-400 text-xs font-black mb-3 uppercase tracking-wider">المظهر والثيم</h4>
              <div className="grid grid-cols-2 gap-2.5">
                {THEMES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleThemeChange(item.id)}
                    className={`p-3 rounded-2xl flex items-center gap-2.5 border transition-all ${
                      theme.id === item.id ? 'border-violet-500 bg-violet-500/20 shadow-md shadow-violet-500/10' : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl ${item.bg} shadow-sm border border-white/20`} />
                    <span className="text-xs font-bold text-white">{item.name}</span>
                    {theme.id === item.id && <CheckCircle size={15} className="text-violet-400 mr-auto" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-slate-400 text-xs font-black mb-3 uppercase tracking-wider">قائمة الأذكار</h4>
              <div className="space-y-2 mb-4">
                {activeList.map((zekr, index) => (
                  <div
                    key={`${zekr}-${index}`}
                    onClick={() => handleSelectZekr(zekr)}
                    className={`p-3.5 rounded-2xl flex justify-between items-center cursor-pointer transition-all duration-200 ${
                      selectedZekr === zekr ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30' : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate text-sm font-bold">{zekr}</span>
                    {customList.includes(zekr) && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveZekr(zekr);
                        }}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition"
                        aria-label="حذف الذكر"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
                <input
                  value={newZekr}
                  onChange={(event) => setNewZekr(event.target.value)}
                  placeholder="أضف ذكرًا مخصصًا..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white focus:border-violet-500 placeholder:text-slate-500"
                />
                <button 
                  onClick={handleAddZekr} 
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-3 rounded-2xl hover:brightness-110 active:scale-95 transition shadow-md shadow-violet-600/30"
                  aria-label="إضافة ذكر"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasbahaPage;
