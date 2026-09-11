import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  Crown,
  Trophy,
  TrendingUp,
  Medal,
  Sparkles,
  ShieldCheck,
  Award,
  CheckCircle2,
  Lock,
  Flame,
  BookOpen,
  Heart,
  Zap,
  Info,
  X,
  ChevronLeft,
  Shield,
  Star,
  ArrowUpRight,
} from 'lucide-react';
import { db } from '../services/firebase';
import { APP_ID, CHARACTERS, TIERS } from '../constants';
import { UserData, BadgeCategory, Tier } from '../types';
import { ISLAMIC_BADGES, calculateBadgeProgress } from '../src/services/badgeService';

interface LeaderboardPageProps {
  user: User;
  userData?: UserData | null;
}

const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ user, userData }) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'badges' | 'tiers'>('leaderboard');
  const [badgeCategory, setBadgeCategory] = useState<BadgeCategory | 'unlocked'>('all');
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);

  // Leaderboard state
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'leaderboard'),
      orderBy('xp', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const userXp = userData?.xp || 0;
  const currentTier = useMemo(() => {
    return TIERS.find((t) => userXp >= t.min && userXp <= t.max) || TIERS[TIERS.length - 1];
  }, [userXp]);

  const currentTierIndex = useMemo(() => {
    return TIERS.findIndex((t) => t.id === currentTier.id);
  }, [currentTier]);

  const nextTier = useMemo(() => {
    return TIERS[currentTierIndex + 1] || currentTier;
  }, [currentTierIndex, currentTier]);

  const progressToNextTier = useMemo(() => {
    if (!nextTier || nextTier.id === currentTier.id) return 100;
    const tierRange = nextTier.min - currentTier.min;
    const gainedInTier = Math.max(0, userXp - currentTier.min);
    return Math.min(100, Math.max(0, Math.round((gainedInTier / tierRange) * 100)));
  }, [userXp, currentTier, nextTier]);

  const getAvatar = (u: any) => {
    if (u.photoURL) return <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover rounded-full" />;
    if (u.characterId) {
      const char = CHARACTERS.find((c) => c.id === u.characterId);
      if (char) return <img src={char.img} alt={u.name} className="w-full h-full object-cover rounded-full" />;
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-2xl">
        {outlineContent(u.gender === 'female' ? "icon:user" : "icon:user")}
      </div>
    );
  };

  // Evaluate all badges with live progress
  const badgesWithProgress = useMemo(() => {
    return ISLAMIC_BADGES.map((badge) => calculateBadgeProgress(badge, userData));
  }, [userData]);

  const unlockedCount = useMemo(() => {
    return badgesWithProgress.filter((b) => b.isUnlocked).length;
  }, [badgesWithProgress]);

  const filteredBadges = useMemo(() => {
    if (badgeCategory === 'all') return badgesWithProgress;
    if (badgeCategory === 'unlocked') return badgesWithProgress.filter((b) => b.isUnlocked);
    return badgesWithProgress.filter((b) => b.badge.category === badgeCategory);
  }, [badgesWithProgress, badgeCategory]);

  const rest = list.slice(3);

  const getCategoryName = (cat?: string) => {
    switch (cat) {
      case 'prayer': return 'الصلاة والفرائض';
      case 'quran': return 'القرآن الكريم';
      case 'athkar': return 'الذكر والتسبيح';
      case 'spirit': return 'الهمة والتحديات';
      case 'special': return 'أوسمة خاصة';
      default: return 'عام';
    }
  };

  const getTierDescription = (tierId: string) => {
    switch (tierId) {
      case 'bronze':
        return 'بداية الانطلاقة في رحلة الالتزام والإقبال على الطاعات.';
      case 'silver':
        return 'المواظبة على أداء الصلوات والأوراد اليومية بثبات واستمرار.';
      case 'gold':
        return 'المسارعة إلى الخيرات واستباق الطاعات وقيام الليل.';
      case 'diamond':
        return 'خشوع القلب وتدبر القرآن وبلوغ مراتب الإحسان.';
      case 'legendary':
        return 'ثبات راسخ وهمة عالية في الصيام والذكر والقرآن.';
      case 'elite':
        return 'قمة سباق الخيرات، ونخبة المتسابقين في درجات الجنان.';
      default:
        return 'رتبة شرفية في سباق الخيرات.';
    }
  };

  return (
    <div className="pt-2 pb-24 min-h-screen animate-in fade-in duration-300 select-none">
      
      {/* Top Segmented Navigation Switcher (3 Tabs: المتصدرين / الأوسمة / الدروع) */}
      <div className="max-w-lg mx-auto px-3 mb-6">
        <div className="bg-slate-100/90 dark:bg-slate-900/90 p-1.5 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex items-center gap-1 backdrop-blur-md">
          
          {/* Tab 1: Leaderboard */}
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              setActiveTab('leaderboard');
            }}
            className={`flex-1 py-2.5 px-2 rounded-[1.6rem] font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-95 ${
              activeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Trophy size={15} />
            <span>المتصدرين</span>
          </button>

          {/* Tab 2: Badges Museum */}
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              setActiveTab('badges');
            }}
            className={`flex-1 py-2.5 px-2 rounded-[1.6rem] font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-95 ${
              activeTab === 'badges'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Award size={15} />
            <span>الأوسمة</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black ${
              activeTab === 'badges' ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300'
            }`}>
              {unlockedCount}
            </span>
          </button>

          {/* Tab 3: Tiers & Shields */}
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              setActiveTab('tiers');
            }}
            className={`flex-1 py-2.5 px-2 rounded-[1.6rem] font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-95 ${
              activeTab === 'tiers'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck size={15} />
            <span>الدروع والرتب</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="animate-in fade-in duration-300">
          {/* Header Banner */}
          <div className="text-center mb-6 px-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white mb-1 tracking-tight">لوحة المتصدرين</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-bold">وفي ذلك فليتنافس المتنافسون</p>
          </div>

          {loading ? (
            <div className="text-center py-24 text-slate-400 font-bold animate-pulse">جاري تحميل لوحة الأبطال...</div>
          ) : list.length === 0 ? (
            <div className="text-center py-20 opacity-60">
              <TrendingUp size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-bold">لا توجد بيانات متصدرين بعد</p>
            </div>
          ) : (
            <>
              {/* 3D Royal Podium Section */}
              <div className="flex items-end justify-center gap-2.5 sm:gap-5 mb-8 px-2 h-72 sm:h-80 max-w-lg mx-auto">
                {/* 2nd Place (Silver) */}
                {list[1] && (
                  <div className="flex flex-col items-center w-1/3 max-w-[125px] animate-in slide-in-from-bottom duration-700 delay-100 relative group">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-slate-300 dark:border-slate-400 bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center relative overflow-hidden z-10">
                      {getAvatar(list[1])}
                    </div>
                    <div className="mt-[-2rem] pt-10 w-full bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 h-36 sm:h-44 rounded-t-[2rem] shadow-xl flex flex-col items-center justify-start border-t-4 border-slate-300 dark:border-slate-400 relative">
                      <div className="text-4xl font-black text-slate-500/20 absolute bottom-2 font-mono">2</div>
                      <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate w-full text-center px-1.5 mt-2">{list[1].name}</h3>
                      <div className="bg-white/60 dark:bg-black/40 px-2.5 py-0.5 rounded-full text-[10px] text-slate-800 dark:text-slate-200 font-mono font-black mt-1 shadow-sm">
                        {list[1].xp.toLocaleString()}
                      </div>
                      <Medal size={16} className="text-slate-400 mt-1" />
                    </div>
                  </div>
                )}

                {/* 1st Place (Gold Champion) */}
                {list[0] && (
                  <div className="flex flex-col items-center w-1/3 max-w-[145px] z-20 animate-in slide-in-from-bottom duration-700 relative group">
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30">
                      <Crown className="text-amber-400 fill-amber-400 w-11 h-11 animate-bounce drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
                    </div>
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-amber-400 bg-amber-50 dark:bg-amber-950/40 shadow-[0_0_35px_rgba(250,204,21,0.4)] flex items-center justify-center relative overflow-hidden z-10">
                      {getAvatar(list[0])}
                    </div>
                    <div className="mt-[-2.5rem] pt-12 w-full bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600 dark:from-amber-600 dark:via-yellow-700 dark:to-amber-800 h-44 sm:h-52 rounded-t-[2.5rem] shadow-2xl flex flex-col items-center justify-start border-t-4 border-amber-300 relative overflow-hidden ifaqa-gold-shimmer">
                      <div className="text-5xl font-black text-white/25 absolute bottom-2 font-mono">1</div>
                      <h3 className="font-black text-sm sm:text-base text-white truncate w-full text-center px-2 mt-2 drop-shadow-md">{list[0].name}</h3>
                      <div className="bg-white/25 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white font-mono font-black mt-1 shadow-md border border-white/20">
                        {list[0].xp.toLocaleString()} XP
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        <Sparkles className="text-white w-4 h-4 animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {list[2] && (
                  <div className="flex flex-col items-center w-1/3 max-w-[125px] animate-in slide-in-from-bottom duration-700 delay-200 relative group">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-amber-700/60 bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center relative overflow-hidden z-10">
                      {getAvatar(list[2])}
                    </div>
                    <div className="mt-[-2rem] pt-10 w-full bg-gradient-to-b from-amber-600/80 via-amber-700 to-amber-900 h-32 sm:h-40 rounded-t-[2rem] shadow-xl flex flex-col items-center justify-start border-t-4 border-amber-600 relative">
                      <div className="text-4xl font-black text-white/20 absolute bottom-2 font-mono">3</div>
                      <h3 className="font-black text-xs sm:text-sm text-white truncate w-full text-center px-1.5 mt-2">{list[2].name}</h3>
                      <div className="bg-white/25 px-2.5 py-0.5 rounded-full text-[10px] text-white font-mono font-black mt-1 shadow-sm">
                        {list[2].xp.toLocaleString()}
                      </div>
                      <Medal size={16} className="text-amber-400 mt-1" />
                    </div>
                  </div>
                )}
              </div>

              {/* Ranks 4+ List */}
              <div className="space-y-2.5 max-w-lg mx-auto px-4" dir="rtl">
                {rest.map((u, i) => {
                  const rank = i + 4;
                  const isMe = u.id === user.uid;

                  return (
                    <div
                      key={u.id}
                      className={`flex items-center gap-3.5 p-3.5 sm:p-4 rounded-[1.8rem] transition-all duration-200 ${
                        isMe
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-indigo-600/20 scale-[1.02] border-2 border-violet-400'
                          : 'bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-violet-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="w-8 flex-shrink-0 text-center">
                        <span className={`font-black font-mono text-base sm:text-lg ${isMe ? 'text-white' : 'text-slate-400'}`}>
                          #{rank}
                        </span>
                      </div>

                      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0 border-2 ${
                        isMe ? 'border-white/40 shadow-md' : 'border-slate-200 dark:border-slate-700'
                      }`}>
                        {getAvatar(u)}
                      </div>

                      <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-black text-sm sm:text-base truncate ${isMe ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                            {u.name}
                          </h4>
                          {isMe && <span className="bg-white/25 px-2 py-0.5 rounded-full text-[9px] font-black">أنت</span>}
                        </div>
                        <p className={`text-xs mt-0.5 font-bold truncate ${isMe ? 'text-violet-200' : 'text-slate-400'}`}>
                          {u.userTitle || u.tier || 'مبتدئ'}
                        </p>
                      </div>

                      <div className="text-left flex-shrink-0">
                        <span className={`block font-black font-mono text-base ${isMe ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                          {u.xp.toLocaleString()}
                        </span>
                        <span className={`text-[9px] font-bold ${isMe ? 'text-violet-200' : 'text-amber-500 font-mono'}`}>XP</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* VIEW 2: BADGES MUSEUM */}
      {activeTab === 'badges' && (
        <div className="animate-in fade-in duration-300 max-w-2xl mx-auto px-2 space-y-5">
          
          {/* Progress Summary Card */}
          <div className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-violet-950 via-slate-900 to-indigo-950 p-5 text-white shadow-xl border border-white/15">
            <div className="ifaqa-header-orb ifaqa-header-orb-one opacity-30" />
            <div className="ifaqa-header-orb ifaqa-header-orb-two opacity-25" />
            
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="text-right space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 border border-white/10 text-[10px] font-black">
                  <ShieldCheck size={13} />
                  <span>متحف الأوسمة الإيمانية</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  أنجزت <span className="text-amber-300 font-mono">{unlockedCount}</span> من <span className="font-mono">{ISLAMIC_BADGES.length}</span> وساماً
                </h3>
                <p className="text-xs font-bold text-violet-200/85">
                  أوسمة شرفية تُخلّد أعمالك الصالحة وطاعاتك اليومية.
                </p>
              </div>

              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/10 border border-white/20 shadow-inner">
                <span className="text-3xl filter drop-shadow"><OutlineIcon name="trophy" /></span>
              </div>
            </div>

            {/* Total Overall Progress Bar */}
            <div className="relative z-10 mt-4">
              <div className="h-2.5 overflow-hidden rounded-full bg-black/40 p-0.5 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-amber-300 via-yellow-300 to-violet-300 transition-all duration-700 ifaqa-gold-shimmer"
                  style={{ width: `${Math.round((unlockedCount / ISLAMIC_BADGES.length) * 100)}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-violet-200/75">
                <span>نسبة فتح المتحف</span>
                <span className="font-mono text-amber-300">{Math.round((unlockedCount / ISLAMIC_BADGES.length) * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-right" dir="rtl">
            {[
              { id: 'all', label: 'الكل', count: ISLAMIC_BADGES.length },
              { id: 'unlocked', label: 'المفتوحة', count: unlockedCount },
              { id: 'prayer', label: 'الصلاة', count: ISLAMIC_BADGES.filter((b) => b.category === 'prayer').length },
              { id: 'quran', label: 'القرآن', count: ISLAMIC_BADGES.filter((b) => b.category === 'quran').length },
              { id: 'athkar', label: 'الذكر', count: ISLAMIC_BADGES.filter((b) => b.category === 'athkar').length },
              { id: 'spirit', label: 'الهمة', count: ISLAMIC_BADGES.filter((b) => b.category === 'spirit').length },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(8);
                  setBadgeCategory(cat.id as any);
                }}
                className={`shrink-0 px-3.5 py-2 rounded-2xl font-black text-xs transition-all active:scale-95 flex items-center gap-1.5 ${
                  badgeCategory === cat.id
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  badgeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/5 opacity-75'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Badges Grid (Interactive cards with live X of Y counters) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="rtl">
            {filteredBadges.map((bp) => {
              const { badge, current, target, progressPercent, isUnlocked } = bp;
              return (
                <div
                  key={badge.id}
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(15);
                    setSelectedBadge(bp);
                  }}
                  className={`group relative p-4 rounded-[2rem] border transition-all duration-300 cursor-pointer text-right flex flex-col justify-between ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 border-amber-300/60 dark:border-amber-500/40 shadow-lg shadow-amber-500/10 hover:scale-[1.02]'
                      : 'bg-white/80 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800/80 hover:border-violet-300 dark:hover:border-violet-800 shadow-sm'
                  }`}
                >
                  {/* Top Row: Icon & Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className={`grid h-14 w-14 place-items-center rounded-2xl text-2xl transition-transform group-hover:scale-110 ${
                      isUnlocked
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/30 border border-amber-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 grayscale border border-slate-200/50 dark:border-slate-700/50'
                    }`}>
                      <span>{outlineContent(badge.icon)}</span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isUnlocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                          <CheckCircle2 size={11} />
                          <span>مفتوح <OutlineIcon name="check" /></span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                          <Lock size={10} />
                          <span>قيد الإنجاز</span>
                        </span>
                      )}
                      
                      {badge.xpBonus && (
                        <span className="text-[10px] font-mono font-black text-amber-500">
                          +{outlineContent(badge.xpBonus)} XP
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Info */}
                  <div className="space-y-1 my-1">
                    <h4 className="font-black text-sm text-slate-800 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {outlineContent(badge.name)}
                    </h4>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {outlineContent(badge.description)}
                    </p>
                  </div>

                  {/* Bottom: Progress Counter X of Y + Bar */}
                  <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] font-black mb-1.5">
                      <span className="text-slate-700 dark:text-slate-300 font-mono">
                        {current.toLocaleString()} / {target.toLocaleString()} {outlineContent(badge.unit)}
                      </span>
                      <span className={`font-mono text-[10px] ${isUnlocked ? 'text-emerald-600 dark:text-emerald-400' : 'text-violet-600 dark:text-violet-400'}`}>
                        {progressPercent}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isUnlocked
                            ? 'bg-gradient-to-l from-emerald-400 to-teal-500 shadow-sm'
                            : 'bg-gradient-to-l from-violet-600 to-indigo-600 shadow-sm'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: TIERS & SHIELDS (دروع المستويات والرتب - شبكة درعين في كل صف بدون فريمات) */}
      {activeTab === 'tiers' && (
        <div className="animate-in fade-in duration-300 max-w-lg mx-auto px-4 py-4" dir="rtl">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8">
            {TIERS.map((tier) => {
              const isCurrent = tier.id === currentTier.id;

              return (
                <div
                  key={tier.id}
                  className="flex flex-col items-center text-center select-none group"
                >
                  {/* 3D Shield image directly on page without frames */}
                  <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center relative">
                    <img
                      src={tier.img}
                      alt={tier.name}
                      className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)] filter transition-transform duration-300 group-hover:scale-105 group-active:scale-95"
                    />
                  </div>

                  {/* Tier Name */}
                  <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-2.5">
                    درع {tier.name}
                  </h4>

                  {/* Required Points */}
                  <span className="text-xs sm:text-sm font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                    {tier.min === 0 ? 'من 0 نقطة' : `من ${tier.min.toLocaleString('ar-EG')} نقطة`}
                  </span>

                  {/* Current Active Indicator */}
                  {isCurrent && (
                    <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                      
                      رتبتك الحالية <OutlineIcon name="star" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BADGE DETAILS MODAL */}
      {selectedBadge && createPortal(
        <div
          className="fixed inset-0 bg-black/30 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in overflow-hidden select-none"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800 text-right space-y-4 max-h-[85vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header / Close */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black px-3 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40">
                {outlineContent(getCategoryName(selectedBadge.badge.category))}
              </span>
              <button
                onClick={() => setSelectedBadge(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Icon & Title */}
            <div className="text-center py-2 space-y-2">
              <div className={`mx-auto grid h-20 w-20 place-items-center rounded-3xl text-4xl shadow-xl ${
                selectedBadge.isUnlocked
                  ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white shadow-amber-500/30 border-2 border-amber-300 animate-bounce'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}>
                <span>{outlineContent(selectedBadge.badge.icon)}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {outlineContent(selectedBadge.badge.name)}
              </h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                {outlineContent(selectedBadge.badge.description)}
              </p>
            </div>

            {/* Progress Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-slate-600 dark:text-slate-400">التقدم الإيماني الحالي:</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  {selectedBadge.current.toLocaleString()} من {selectedBadge.target.toLocaleString()} {outlineContent(selectedBadge.badge.unit)}
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 p-0.5 shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    selectedBadge.isUnlocked
                      ? 'bg-gradient-to-l from-emerald-400 to-teal-500'
                      : 'bg-gradient-to-l from-violet-600 to-indigo-600'
                  }`}
                  style={{ width: `${selectedBadge.progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 pt-1">
                <span>الحالة: {outlineContent(selectedBadge.isUnlocked ? "مكتمل ومفتوح بنجاح " : "جاري إتمام الطاعات ")}</span>
                <span className="font-mono font-black text-amber-500">+{outlineContent(selectedBadge.badge.xpBonus)} XP</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-violet-600/30 active:scale-95 transition"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default LeaderboardPage;
