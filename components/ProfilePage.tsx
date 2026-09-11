import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, signOut } from 'firebase/auth';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import {
  Edit3,
  CheckCircle,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  HelpCircle,
  Palette,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  ArrowRight,
  UserCircle2,
  Zap,
  Moon,
  Utensils,
  Bell,
  BookOpen,
  Coffee,
  LayoutGrid,
  Vibrate,
  VibrateOff,
  HardDrive,
} from 'lucide-react';
import { auth, db } from '../services/firebase';
import { APP_ID, TIERS, BADGES, CHARACTERS, THEME_COLORS, ADMIN_EMAILS } from '../constants';
import { UserData, Tier, ThemePreferences } from '../types';
import SupportModal from './SupportModal';

interface ProfilePageProps {
  user: User;
  userData: UserData;
  onOpenAdminPanel: () => void;
  onOpenSupport: () => void;
  showSupport: boolean;
  closeSupport: () => void;
  onOpenWidgets: () => void;
  onOpenDownloads?: () => void;
  onBack: () => void;
}

const getTier = (xp: number): Tier => {
  const safeXP = Math.max(0, xp || 0);
  return TIERS.find((tier) => safeXP >= tier.min && safeXP <= tier.max) || TIERS[TIERS.length - 1];
};

const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  userData,
  onOpenAdminPanel,
  onOpenSupport,
  showSupport,
  closeSupport,
  onOpenWidgets,
  onOpenDownloads,
  onBack,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(userData.name);
  const [newTitle, setNewTitle] = useState(userData.userTitle || '');
  const [showCharSelector, setShowCharSelector] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ifaqa_notif_prefs') || '{}');
    } catch {
      return {};
    }
  });

  const [wirdTime, setWirdTime] = useState(() => localStorage.getItem('ifaqa_wird_time') || '08:00');
  const [startWithQuran, setStartWithQuran] = useState(() => localStorage.getItem('ifaqa_start_with_quran') === 'true');
  const [saharTesterActive, setSaharTesterActive] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('ifaqa_admin_sahar_tester_mode') === 'true';
  });

  useEffect(() => {
    const handleTesterChanged = () => {
      setSaharTesterActive(typeof window !== 'undefined' && localStorage.getItem('ifaqa_admin_sahar_tester_mode') === 'true');
    };
    window.addEventListener('ifaqa_admin_sahar_tester_changed', handleTesterChanged);
    return () => window.removeEventListener('ifaqa_admin_sahar_tester_changed', handleTesterChanged);
  }, []);

  const toggleStartWithQuran = () => {
    const next = !startWithQuran;
    setStartWithQuran(next);
    localStorage.setItem('ifaqa_start_with_quran', String(next));
  };

  const toggleNotif = (key: string) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    localStorage.setItem('ifaqa_notif_prefs', JSON.stringify(updated));
  };

  const currentTier = getTier(userData.xp || 0);
  const themePrefs = userData.themePreferences || {
    accentColor: 'violet',
    fontSize: 'base',
    soundEnabled: true,
    hapticsEnabled: true,
    showIntro: true,
    showGlobalScore: true,
  };
  const appMode = userData.appMode || 'full';

  const saveName = async () => {
    const batch = writeBatch(db);
    const userProfileRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile');
    const leaderboardRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaderboard', user.uid);
    const updates = { name: newName, userTitle: newTitle };

    batch.update(userProfileRef, updates);
    batch.update(leaderboardRef, updates);
    await batch.commit();
    setIsEditing(false);
  };

  const handleCharacterSelect = async (charId: string) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile'), {
      characterId: charId,
      photoURL: null,
    });
    batch.update(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaderboard', user.uid), {
      characterId: charId,
      photoURL: null,
    });
    await batch.commit();
    setShowCharSelector(false);
  };

  const updateTheme = async (newTheme: Partial<ThemePreferences>) => {
    const updatedPrefs = { ...themePrefs, ...newTheme };
    if (typeof newTheme.showIntro === 'boolean') {
      localStorage.setItem('ifaqa_intro_enabled', newTheme.showIntro ? 'true' : 'false');
    }
    await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile'), {
      themePreferences: updatedPrefs,
    });
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  const toggleAppMode = async () => {
    const newMode = appMode === 'full' ? 'lite' : 'full';
    if (
      newMode === 'lite' &&
      !window.confirm('التحويل للنمط الهادئ سيخفي التحديات والنقاط والفعاليات. هل أنت متأكد؟')
    ) {
      return;
    }

    await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile'), { appMode: newMode });
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const toggleFastingMode = async () => {
    await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile'), {
      fastingMode: !userData.fastingMode,
    });
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  const handleShowOnLeaderboardToggle = async (show: boolean) => {
    const batch = writeBatch(db);
    const userProfileRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile');
    const leaderboardRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaderboard', user.uid);
    batch.update(userProfileRef, { showOnLeaderboard: show });

    if (show) {
      batch.set(
        leaderboardRef,
        {
          name: userData.name,
          xp: userData.xp,
          tier: userData.tier,
          gender: userData.gender,
          photoURL: userData.photoURL || null,
          email: user.email,
          isAdmin: userData.isAdmin || false,
          isBlocked: userData.isBlocked || false,
          characterId: userData.characterId || null,
          userTitle: userData.userTitle || null,
        },
        { merge: true }
      );
    } else {
      batch.delete(leaderboardRef);
    }

    await batch.commit();
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  const resetScore = async () => {
    if (!window.confirm('تحذير: سيتم مسح جميع نقاطك. هل أنت متأكد؟')) {
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const batch = writeBatch(db);
    batch.update(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile'), {
      xp: 0,
      tier: 'مبتدئ',
      streak: 0,
      completedChallenges: [],
      badges: [],
      photoURL: null,
      characterId: null,
      'stats.fajrStreak': 0,
      'stats.totalPrayers': 0,
      'stats.jamaahCount': 0,
      'stats.ameenCount': 0,
    });
    batch.update(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaderboard', user.uid), {
      xp: 0,
      tier: 'مبتدئ',
    });
    batch.delete(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'daily', todayStr));
    await batch.commit();
    alert('تم التصفير.');
  };

  const activeChar = userData.characterId ? CHARACTERS.find((char) => char.id === userData.characterId) : null;

  return (
    <div className="pt-2 px-1 pb-24 space-y-6 animate-in fade-in duration-500">
      {showSupport && <SupportModal user={user} onClose={closeSupport} />}

      {/* Identity Passport Card */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-950 text-white p-6 shadow-2xl border border-white/15">
        <div className="absolute inset-0 bg-[url('/assets/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
        <div className="ifaqa-header-orb ifaqa-header-orb-one opacity-30" />
        <div className="ifaqa-header-orb ifaqa-header-orb-two opacity-20" />

        <div className="relative z-10 flex items-center justify-between mb-4">
          <span className="text-[10px] font-black tracking-widest text-violet-300 uppercase bg-white/10 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
            الهوية الإيمانية
          </span>
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              onBack();
            }}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-md border border-white/10 text-white transition active:scale-95"
            aria-label="رجوع"
          >
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          {appMode === 'full' && (
            <div className="relative w-32 h-32 mb-4 group cursor-pointer" onClick={() => setShowCharSelector(true)}>
              <div className="absolute inset-0 bg-violet-500/30 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity" />

              <div className="w-full h-full rounded-full border-2 border-white/25 bg-white/10 backdrop-blur-xl p-2 shadow-2xl flex items-center justify-center overflow-hidden">
                {activeChar ? (
                  <img
                    src={activeChar.img}
                    alt={activeChar.name}
                    className="w-full h-full object-contain relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <img
                    src={currentTier.img}
                    alt="Rank"
                    className="w-full h-full object-contain relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
                  />
                )}
              </div>

              <div
                className="absolute bottom-0 right-0 w-9 h-9 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full shadow-lg border-2 border-white cursor-pointer flex items-center justify-center hover:brightness-110 transition z-20"
                aria-label="تغيير الشخصية"
              >
                <UserCircle2 size={18} className="text-white" />
              </div>
            </div>
          )}

          {isEditing ? (
            <div className="flex flex-col items-center gap-2 mb-2 animate-in fade-in w-full max-w-xs">
              <input
                className="border border-white/20 bg-white/10 backdrop-blur-md p-2.5 rounded-2xl text-center w-full text-white placeholder-slate-400 font-bold outline-none focus:border-violet-400"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="الاسم"
              />
              <input
                className="border border-white/20 bg-white/10 backdrop-blur-md p-2.5 rounded-2xl text-center w-full text-xs text-white placeholder-slate-400 font-bold outline-none focus:border-violet-400"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="اللقب (مثال: محب الخير)"
              />
              <button 
                onClick={saveName} 
                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-2.5 rounded-2xl w-full flex items-center justify-center gap-2 font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition"
              >
                <CheckCircle size={18} />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-black text-white flex items-center gap-2 drop-shadow-md">
                {userData.name}
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
                  aria-label="تعديل الاسم"
                >
                  <Edit3 size={15} />
                </button>
              </h2>
              {userData.userTitle && <p className="text-violet-300 text-xs font-black mt-1 bg-violet-950/60 px-3 py-0.5 rounded-full border border-violet-800/40">{userData.userTitle}</p>}
            </>
          )}

          {appMode === 'full' && (
            <div className="mt-3.5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-black text-amber-300 border border-white/15 shadow-sm">
              <span>{currentTier.name}</span>
              <span className="opacity-40">•</span>
              <span className="font-mono">{userData.xp?.toLocaleString() || 0} XP</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(userData.isAdmin || (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()))) && (
          <>
            <button
              onClick={onOpenAdminPanel}
              className="w-full py-4 px-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-[1.8rem] font-black flex items-center justify-between shadow-lg border border-slate-700 active:scale-98 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <ShieldCheck size={20} />
                </div>
                <span className="text-sm">لوحة الإدارة والتحكم</span>
              </div>
              <ArrowRight size={16} className="rtl:rotate-180 text-slate-400" />
            </button>

            <div className="col-span-full p-4 bg-gradient-to-r from-purple-950/70 via-indigo-950/70 to-slate-900/80 rounded-[1.8rem] border border-purple-500/30 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 text-lg shrink-0">
                  
                  <OutlineIcon name="moon" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-black text-white truncate">ثيم المستغفرين بالأسحار (وضع المجرّب)</h4>
                  <p className="text-[10px] sm:text-xs text-purple-200/70 font-semibold truncate">
                    {saharTesterActive ? 'نشط الآن · ثيم الأسحار والمضاعفة مفعلة للتجربة' : 'مغلق · متاح أيضاً داخل تبويب الإدارة والتحكم'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !saharTesterActive;
                  setSaharTesterActive(next);
                  localStorage.setItem('ifaqa_admin_sahar_tester_mode', next ? 'true' : 'false');
                  window.dispatchEvent(new CustomEvent('ifaqa_admin_sahar_tester_changed', { detail: { active: next } }));
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition ${
                  saharTesterActive ? 'bg-purple-600 text-white shadow' : 'bg-white/10 text-slate-200 hover:bg-white/15'
                }`}
              >
                {outlineContent(saharTesterActive ? "إيقاف " : "تفعيل ")}
              </button>
            </div>
          </>
        )}

        <button
          onClick={onOpenWidgets}
          className="w-full py-4 px-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white rounded-[1.8rem] font-black flex items-center justify-between shadow-sm hover:border-violet-400 active:scale-98 transition"
        >
          <div className="flex items-center gap-3">
             <div className="bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 p-2 rounded-xl">
                <LayoutGrid size={20} />
             </div>
             <span className="text-sm">ودجت الشاشة الرئيسية</span>
          </div>
          <ArrowRight size={16} className="text-slate-400 rtl:rotate-180" />
        </button>

        <button
          onClick={onOpenDownloads}
          className="w-full py-4 px-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white rounded-[1.8rem] font-black flex items-center justify-between shadow-sm hover:border-emerald-400 active:scale-98 transition"
        >
          <div className="flex items-center gap-3">
             <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 p-2 rounded-xl">
                <HardDrive size={20} />
             </div>
             <div className="text-right">
               <span className="text-sm block">إدارة التنزيلات (أوفلاين)</span>
               <span className="text-[11px] text-slate-400 font-normal">المصحف، التفاسير، والتلاوات</span>
             </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 rtl:rotate-180" />
        </button>
      </div>

      {/* App Mode Toggle Card */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2 mb-3.5">
          <Zap size={18} className="text-amber-500" />
          <span>نمط التطبيق</span>
        </h3>
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 gap-1">
          <button
            onClick={toggleAppMode}
            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              appMode === 'full' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md text-white' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Zap size={15} />
            <span>كامل (تفاعلي)</span>
          </button>
          <button
            onClick={toggleAppMode}
            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              appMode === 'lite' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md text-white' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Moon size={15} />
            <span>هادئ (بدون نقاط)</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-2.5 text-center font-bold">النمط الهادئ يخفي النقاط والتحديات للتركيز التام على العبادة</p>
      </div>

      {/* Settings & Appearance */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-5">
        <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
          <Palette size={18} className="text-violet-500" />
          <span>المظهر والتفضيلات</span>
        </h3>

        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-2.5 font-black">لون التطبيق المفضل</label>
          <div className="flex gap-3 flex-wrap">
            {Object.keys(THEME_COLORS).map((color) => (
              <button
                key={color}
                onClick={() => updateTheme({ accentColor: color as ThemePreferences['accentColor'] })}
                className={`w-9 h-9 rounded-2xl border-2 transition-all active:scale-90 ${
                  themePrefs.accentColor === color ? 'border-slate-800 dark:border-white scale-110 shadow-lg ring-2 ring-violet-400/40' : 'border-transparent opacity-75'
                }`}
                style={{ backgroundColor: `rgb(${THEME_COLORS[color as keyof typeof THEME_COLORS][500]})` }}
                aria-label={`تحديد لون ${color}`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <ToggleItem label="وضع الصيام (الإمساكية التلقائية)" isOn={userData.fastingMode || false} onClick={toggleFastingMode} icon={Utensils} />
          <ToggleItem
            label="تشغيل المؤثرات الصوتية"
            isOn={themePrefs.soundEnabled !== false}
            onClick={() => updateTheme({ soundEnabled: !(themePrefs.soundEnabled !== false) })}
            icon={themePrefs.soundEnabled !== false ? Volume2 : VolumeX}
          />
          <ToggleItem
            label="تشغيل اهتزازات اللمس"
            isOn={themePrefs.hapticsEnabled !== false}
            onClick={() => updateTheme({ hapticsEnabled: !(themePrefs.hapticsEnabled !== false) })}
            icon={themePrefs.hapticsEnabled !== false ? Vibrate : VibrateOff}
          />
          <ToggleItem
            label="فتح المصحف تلقائياً عند بدء التطبيق"
            isOn={startWithQuran}
            onClick={toggleStartWithQuran}
            icon={BookOpen}
          />
          <ToggleItem
            label="عرض شاشة الترحيب (الانترو) عند الفتح"
            isOn={themePrefs.showIntro !== false}
            onClick={() => updateTheme({ showIntro: !(themePrefs.showIntro !== false) })}
            icon={PlayCircle}
          />
          {appMode === 'full' && (
            <ToggleItem
              label="إظهار اسمي ونقاطي في المتصدرين"
              isOn={userData.showOnLeaderboard !== false}
              onClick={() => handleShowOnLeaderboardToggle(!(userData.showOnLeaderboard !== false))}
              icon={userData.showOnLeaderboard !== false ? Eye : EyeOff}
            />
          )}
        </div>
      </div>

      {/* Notifications & Reminders */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
        <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2 mb-2">
          <Bell size={18} className="text-violet-500" />
          <span>الإشعارات والتذكيرات الذكية</span>
        </h3>
        <div className="space-y-2.5">
          <ToggleItem label="صيام الاثنين والخميس" isOn={notifPrefs.fasting_mon_thu || false} onClick={() => toggleNotif('fasting_mon_thu')} icon={Utensils} />
          <ToggleItem label="صيام الأيام البيض (13، 14، 15)" isOn={notifPrefs.fasting_lunar || false} onClick={() => toggleNotif('fasting_lunar')} icon={Moon} />
          <ToggleItem label="قراءة سورة الكهف (يوم الجمعة)" isOn={notifPrefs.kahf_friday || false} onClick={() => toggleNotif('kahf_friday')} icon={BookOpen} />
          <ToggleItem label="أذكار الصباح" isOn={notifPrefs.morning_athkar || false} onClick={() => toggleNotif('morning_athkar')} icon={Coffee} />
          <ToggleItem label="أذكار المساء" isOn={notifPrefs.evening_athkar || false} onClick={() => toggleNotif('evening_athkar')} icon={Moon} />
        </div>

        <div className="mt-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800">
          <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-2 flex items-center gap-2">
            <Bell size={13} className="text-amber-500" />
            <span>تذكير الورد اليومي (حدد الموعد)</span>
          </label>
          <input
            type="time"
            value={wirdTime}
            onChange={(event) => {
              setWirdTime(event.target.value);
              localStorage.setItem('ifaqa_wird_time', event.target.value);
            }}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm font-black font-mono text-slate-800 dark:text-white outline-none focus:border-violet-400"
          />
          <p className="mt-2 text-[11px] text-slate-400 font-bold">سيصلك إشعار لتلاوة وردك اليومي في هذا الوقت بدقة.</p>
        </div>
      </div>

      {/* Danger Zone & Logout */}
      <div className="space-y-2.5 pt-2">
        {appMode === 'full' && (
          <button
            onClick={resetScore}
            className="w-full py-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border border-rose-200/50 dark:border-rose-900/30 hover:bg-rose-100 active:scale-98 transition"
          >
            <AlertTriangle size={16} />
            <span>تصفير العدادات والنقاط</span>
          </button>
        )}
        <button
          onClick={() => signOut(auth)}
          className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-98 transition"
        >
          <LogOut size={16} />
          <span>تسجيل الخروج</span>
        </button>
      </div>

      {showCharSelector && createPortal(
        <div
          className="fixed inset-0 bg-black/75 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-in fade-in overflow-hidden select-none"
          onClick={() => setShowCharSelector(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="ifaqa-modal-solid bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom border border-slate-200 flex flex-col max-h-[85vh] scrollbar-hide text-slate-900"
            style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            onClick={(event) => event.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-4 flex-shrink-0 text-right">
              <div>
                <h3 className="font-black text-lg sm:text-xl text-slate-900">اختر صورتك الرمزية (الافتار)</h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5">{CHARACTERS.length} شخصية دائرية مميزة لهويتك الإيمانية</p>
              </div>
              <button
                onClick={() => setShowCharSelector(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              >
                <OutlineIcon name="x" />
              </button>
            </div>

            {/* Scrollable Avatars Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3 overflow-y-auto p-1 flex-1 max-h-[58vh] pr-1">
              {CHARACTERS.map((char) => {
                const isSelected = userData.characterId === char.id;
                return (
                  <button
                    key={char.id}
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(20);
                      handleCharacterSelect(char.id);
                    }}
                    className={`group relative flex flex-col items-center p-2.5 rounded-3xl border-2 transition-all duration-200 active:scale-95 ${
                      isSelected
                        ? 'border-violet-600 bg-violet-50 shadow-md shadow-violet-500/20 scale-[1.03]'
                        : 'border-slate-200 bg-slate-50/90 hover:border-violet-300 hover:bg-violet-50/50'
                    }`}
                  >
                    <div className="relative w-15 h-15 sm:w-18 sm:h-18 rounded-full p-1 bg-gradient-to-tr from-violet-500/20 via-transparent to-indigo-500/20 flex items-center justify-center overflow-hidden">
                      <img
                        src={char.img}
                        alt={char.name}
                        loading="lazy"
                        className="w-full h-full object-cover rounded-full transition-transform group-hover:scale-110"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-violet-600/30 rounded-full flex items-center justify-center backdrop-blur-[1px]">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-violet-600 text-white shadow-md text-xs font-black">
                            <OutlineIcon name="check" />
                          </span>
                        </div>
                      )}
                    </div>
                    <p className={`text-[11px] font-black mt-1.5 truncate max-w-full ${
                      isSelected ? 'text-violet-700 font-bold' : 'text-slate-700'
                    }`}>
                      {char.name}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="pt-3.5 mt-2 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={() => setShowCharSelector(false)}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-black transition active:scale-95 text-xs sm:text-sm shadow-sm border border-slate-200"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const ToggleItem = ({ label, isOn, onClick, icon: Icon }: any) => (
  <div 
    onClick={() => {
      if (navigator.vibrate) navigator.vibrate(15);
      onClick();
    }} 
    className="flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-100/80 dark:border-slate-800/80"
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl transition-colors ${isOn ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
        <Icon size={18} />
      </div>
      <span className="font-black text-xs text-slate-800 dark:text-slate-200">{label}</span>
    </div>
    <div className={`w-11 h-6.5 rounded-full relative transition-colors duration-300 ${isOn ? 'bg-gradient-to-r from-violet-600 to-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
      <div className={`absolute top-1 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 shadow-md ${isOn ? 'right-1' : 'right-5.5'}`} />
    </div>
  </div>
);

const PlayCircle = ({ size, className }: any) => (
  <svg
    width={size}
    height={size}
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" />
  </svg>
);

export default ProfilePage;
