import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { COMPANION_CHAT_EVENT, requestedCompanion } from '../src/components/CompanionCheckInPopup';
import ClanChat from '../src/components/ClanChat';
import '../src/styles/ClanChat.css';
import { MessageCircle } from 'lucide-react';
import type { User } from 'firebase/auth';
import { ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, Clock, Compass, Copy, Crown, Flame, Hammer, Heart, Headphones, Info, KeyRound, Loader2, Locate, Lock, LogOut, Palette, Plus, RotateCcw, Search, Settings, Shield, Sparkles, Trash2, Trophy, UserMinus, Users, X, Zap, ZoomIn, ZoomOut } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';
import confetti from 'canvas-confetti';
import { clanService, Clan, ClanMember, ClanQuest, TERRITORIES, isFridayTime, calculateTerritoriesDominance, Territory, CLAN_LOGOS, CLAN_BANNER_COLORS, isDarkColor, getMemberLevel, ClanKhatma, ClanKhatmaSlot, RibatSaharNight, ClanTwinningPact, JointMegaProjectState, ClanActivityItem, CLAN_REALMS, isRealmUnlocked, getRealmProgress, getDefaultActiveRealm, getTerritoriesByRealm, ClanJoinPolicy, ClanJoinRequest } from '../src/services/clanService';
import { CONTRIBUTION_LIMITS, QUEST_UNITS, formatRemainingHours, getProjectRemainingHours, getActiveBlessedTime, calculateStreakMultiplier, getRemainingDaysInCurrentWeek, BlessedTimeInfo, isRibatSaharActive, getTimeUntilNextSahar, isFridayGoldenHourActive, QURAN_JUZS, getDaysSinceActive, JOINT_MEGA_PROJECTS, JointMegaProjectTemplate, getConstructionStage, getProjectProgressPercent, TERRITORY_QURAN_AYAHS, TERRITORY_EXCLUSIVE_PERKS, TerritoryExclusivePerk, PROPHETIC_DUAS, RARE_ATHKAR, TADABBUR_CARDS, TERRITORY_MAP_ENHANCEMENTS, MAP_STONE_TRAIL_COORDS, buildSvgCurvePath, getRealmStoneTrailCoords } from '../src/services/clanRules';
import { getCachedXP } from '../src/services/xpService';
import { ADMIN_EMAILS } from '../constants';
import '../src/styles/ClansExperience.css';

interface ClansViewProps {
  user: User;
  updateStats: (amount: number, label?: string, category?: any) => Promise<void>;
  onOpenQuran?: (surah?: number, page?: number) => void;
  onOpenRadio?: () => void;
  onOpenMasbaha?: () => void;
  onOpenProphetChallenge?: () => void;
  onBack?: () => void;
}
const renderBadge = (badge: string, className = '') => /^(\.\/|\/|https?:)/.test(badge || '') ? <img src={badge} alt="" className={className} /> : <span className={className}>{outlineContent(badge || "icon:leaf")}</span>;
const tabs = [{ id: 'home', label: 'رَكْبي', icon: Users }, { id: 'chat', label: 'المحادثات', icon: MessageCircle }, { id: 'quests', label: 'سباق الخيرات', icon: Heart }, { id: 'journey', label: 'الرحلة', icon: Compass }, { id: 'discover', label: 'القوافل', icon: Trophy }, { id: 'rules', label: 'دليل الرَّكْب', icon: BookOpen }] as const;
type Tab = typeof tabs[number]['id'];
const number = (n: number) => (n || 0).toLocaleString('ar-EG');
const errorText = (error: unknown) => error instanceof Error && !error.message.startsWith('Firebase') ? error.message : 'تعذر الاتصال بخدمة قوافل الخير. تحقق من اتصالك ثم أعد المحاولة.';
// Types tracked automatically from real app activity — no manual entry needed
const AUTO_TRACKED: ClanQuest['targetType'][] = ['quran_pages', 'salawat', 'audio_minutes', 'tasbeeh', 'collective_khatma'];
const isAutoTracked = (type: ClanQuest['targetType']) => AUTO_TRACKED.includes(type);
function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const percent = Math.max(0, Math.min(100, max > 0 ? value / max * 100 : 0));
  return <div className="clan-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}><i style={{ width: `${percent}%` }} /></div>;
}
function Modal({ title, close, children, busy }: { title: string; close: () => void; children: React.ReactNode; busy: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus();
    return () => previous?.focus();
  }, []);
  return <div className="clan-overlay" onClick={event => { if (event.target === event.currentTarget && !busy) close(); }}>
    <div className="clan-modal" role="dialog" aria-modal="true" aria-labelledby="clan-dialog-title" tabIndex={-1} ref={ref} onKeyDown={event => {
      if (event.key === 'Escape' && !busy) close();
      if (event.key !== 'Tab') return;
      const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]') || []);
      const first = elements[0] as HTMLElement | undefined;
      const last = elements[elements.length - 1] as HTMLElement | undefined;
      if (!first || !last) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
    }}>
      <div className="clan-heading"><h2 id="clan-dialog-title">{title}</h2><button className="clan-icon-button" aria-label="إغلاق" onClick={close} disabled={busy}><X size={20} /></button></div>{children}
    </div>
  </div>;
}
export const ClansView: React.FC<ClansViewProps> = ({ user, onBack, onOpenQuran, onOpenRadio, onOpenMasbaha, onOpenProphetChallenge }) => {
  const [tab, setTab] = useState<Tab>(() => requestedCompanion() ? 'chat' : 'home');
  const [chatPeer, setChatPeer] = useState<string | null>(() => requestedCompanion()?.peerId || null);
  const openMemberChat = (id: string) => { setChatPeer(id); setSelectedMember(null); setTab('chat'); };
  useEffect(() => { const open = () => { const request = requestedCompanion(); if (request) { setChatPeer(request.peerId); setTab('chat'); sessionStorage.removeItem('ifaqa-companion-chat'); } }; open(); window.addEventListener(COMPANION_CHAT_EVENT, open); return () => window.removeEventListener(COMPANION_CHAT_EVENT, open); }, [user.uid]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [clanId, setClanId] = useState<string | null>(null);
  const [myClan, setMyClan] = useState<Clan | null>(null);
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [quests, setQuests] = useState<ClanQuest[]>([]);
  const [profileReady, setProfileReady] = useState(false);
  const [clanReady, setClanReady] = useState(false);
  const [listReady, setListReady] = useState(false);
  const [questsReady, setQuestsReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [search, setSearch] = useState('');
  const [questFilter, setQuestFilter] = useState<'active' | 'done'>('active');
  const [questCategory, setQuestCategory] = useState<'all' | 'weekly' | 'milestone'>('all');
  const [coOpMode, setCoOpMode] = useState<'quests' | 'khatma' | 'sahar'>('quests');
  const [khatma, setKhatma] = useState<ClanKhatma | null>(null);
  const [saharNight, setSaharNight] = useState<RibatSaharNight | null>(null);
  const [blessedTime, setBlessedTime] = useState<BlessedTimeInfo | null>(() => getActiveBlessedTime());
  const [create, setCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState<string>(CLAN_LOGOS[0] || "icon:leaf");
  const [createColor, setCreateColor] = useState(CLAN_BANNER_COLORS[0].gradient);
  const [createJoinPolicy, setCreateJoinPolicy] = useState<ClanJoinPolicy>('open');
  const [createIsPrivate, setCreateIsPrivate] = useState(false);
  const [createPasscode, setCreatePasscode] = useState('');
  const [joining, setJoining] = useState<Clan | null>(null);
  const [joinMode, setJoinMode] = useState<'passcode' | 'request'>('passcode');
  const [joinMessage, setJoinMessage] = useState('');
  const [userPendingRequest, setUserPendingRequest] = useState<{ clanId: string; clanName: string } | null>(null);
  const [pendingRequests, setPendingRequests] = useState<ClanJoinRequest[]>([]);
  const [pendingRequestsModalOpen, setPendingRequestsModalOpen] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [successor, setSuccessor] = useState('');
  const [quest, setQuest] = useState<ClanQuest | null>(null);
  const [amount, setAmount] = useState('1');
  const [confirmed, setConfirmed] = useState(false);
  const [journeySubTab, setJourneySubTab] = useState<'map' | 'list'>('list');
  const [activeRealmIndex, setActiveRealmIndex] = useState<number>(1);
  const [realmPickerOpen, setRealmPickerOpen] = useState(false);
  const [listFilterRealm, setListFilterRealm] = useState<number | 'all'>('all');
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [clanToDelete, setClanToDelete] = useState<Clan | null>(null);
  const [selectedMember, setSelectedMember] = useState<ClanMember | null>(null);
  const [memberToKick, setMemberToKick] = useState<ClanMember | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBadge, setEditBadge] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editJoinPolicy, setEditJoinPolicy] = useState<ClanJoinPolicy>('open');
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editPasscode, setEditPasscode] = useState('');
  const [twinPact, setTwinPact] = useState<ClanTwinningPact | null>(null);
  const [selectedJointProject, setSelectedJointProject] = useState<JointMegaProjectState | null>(null);
  const [twinningTargetClan, setTwinningTargetClan] = useState<Clan | null>(null);
  const [selectedJointProjectTemplateId, setSelectedJointProjectTemplateId] = useState<string>('dam_of_concord');
  const [activityFeedOpen, setActivityFeedOpen] = useState(false);
  const [activeTickerIndex, setActiveTickerIndex] = useState(0);
  const [activePerkModal, setActivePerkModal] = useState<TerritoryExclusivePerk | null>(null);
  const [selectedDuaaTargetId, setSelectedDuaaTargetId] = useState<string>('');
  const [selectedDuaaText, setSelectedDuaaText] = useState<string>(PROPHETIC_DUAS[0].text);
  const [tadabburIndex, setTadabburIndex] = useState<number>(0);

  // Admin Sahar Preview / Tester Mode
  const isAdmin = Boolean(user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  const [saharTesterMode, setSaharTesterMode] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('ifaqa_admin_sahar_tester_mode') === 'true';
  });

  useEffect(() => {
    const handleTesterChanged = () => {
      setSaharTesterMode(typeof window !== 'undefined' && localStorage.getItem('ifaqa_admin_sahar_tester_mode') === 'true');
    };
    window.addEventListener('ifaqa_admin_sahar_tester_changed', handleTesterChanged);
    return () => window.removeEventListener('ifaqa_admin_sahar_tester_changed', handleTesterChanged);
  }, []);

  const toggleSaharTesterMode = () => {
    const next = !saharTesterMode;
    setSaharTesterMode(next);
    localStorage.setItem('ifaqa_admin_sahar_tester_mode', next ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('ifaqa_admin_sahar_tester_changed', { detail: { active: next } }));
    setNotice(next ? " تم تفعيل وضع المجرّب لثيم ومحراب الأسحار!" : 'تم إيقاف وضع المجرّب لثيم الأسحار.');
  };

  // Mathematical boundary clamp: strictly prevents map edges from pulling inside viewport (ZERO black void ever visible)
  const clampPan = (targetX: number, targetY: number, targetZoom: number) => {
    if (!viewportRef.current) {
      return {
        x: 0,
        y: Math.max(-160, Math.min(160, targetY))
      };
    }
    const vw = viewportRef.current.clientWidth || 400;
    const vh = viewportRef.current.clientHeight || 600;
    const maxPanX = Math.max(0, ((targetZoom - 1) * vw) / 2);
    const maxPanY = Math.max(0, ((targetZoom - 1) * vh) / 2);
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, targetX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, targetY))
    };
  };

  // Interactive Zoom & Pan Map States (Starts zoomed in on the first oasis at bottom)
  const [zoom, setZoom] = useState<number>(1.35);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 110 });
  const [isPanning, setIsPanning] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 110 });
  const pinchStartRef = useRef<{ dist: number; startZoom: number } | null>(null);

  const handleZoomIn = () => {
    setZoom(z => {
      const nextZ = Math.min(2.6, +(z + 0.3).toFixed(2));
      setPan(p => clampPan(p.x, p.y, nextZ));
      return nextZ;
    });
  };

  const handleZoomOut = () => {
    setZoom(z => {
      const nextZ = Math.max(1.0, +(z - 0.3).toFixed(2));
      setPan(p => clampPan(p.x, p.y, nextZ));
      return nextZ;
    });
  };

  const handleFocusFirstOasis = () => {
    const targetZoom = 1.4;
    setZoom(targetZoom);
    if (viewportRef.current) {
      const vh = viewportRef.current.clientHeight || 600;
      const maxPanY = Math.max(0, ((targetZoom - 1) * vh) / 2);
      setPan({ x: 0, y: maxPanY });
    } else {
      setPan({ x: 0, y: 120 });
    }
  };

  const handleFocusFullMap = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsPanning(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  // Mouse wheel zoom support with passive: false to prevent scrolling the page
  useEffect(() => {
    if (tab !== 'journey' || journeySubTab !== 'map') return;
    const el = viewportRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      setZoom(prevZoom => {
        const nextZ = Math.max(1.0, Math.min(2.6, +(prevZoom * zoomFactor).toFixed(2)));
        setPan(p => clampPan(p.x, p.y, nextZ));
        return nextZ;
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [tab, journeySubTab]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan(clampPan(dragStartRef.current.panX + dx, dragStartRef.current.panY + dy, zoom));
    };
    const handleMouseUp = () => {
      setIsPanning(false);
    };
    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, zoom]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if ((e.target as HTMLElement).closest('button')) return;
      setIsPanning(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: pan.x,
        panY: pan.y
      };
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartRef.current = { dist, startZoom: zoom };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPan(clampPan(dragStartRef.current.panX + dx, dragStartRef.current.panY + dy, zoom));
    } else if (e.touches.length === 2) {
      if (e.cancelable) e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (!pinchStartRef.current) {
        pinchStartRef.current = { dist, startZoom: zoom };
      } else {
        const ratio = dist / pinchStartRef.current.dist;
        const nextZ = Math.max(1.0, Math.min(2.6, +(pinchStartRef.current.startZoom * ratio).toFixed(2)));
        setZoom(nextZ);
        setPan(p => clampPan(p.x, p.y, nextZ));
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    pinchStartRef.current = null;
  };

  const activities = useMemo(() => {
    if (myClan?.recentActivities && myClan.recentActivities.length > 0) {
      return myClan.recentActivities;
    }
    // Generate REAL activities from actual clan members (no fake demo names)
    const list: ClanActivityItem[] = [];
    if (members && members.length > 0) {
      members.forEach((m, idx) => {
        if (m.contributedPoints > 0) {
          list.push({
            id: `real_pts_${m.id}`,
            clanId: myClan?.id || '',
            userId: m.id,
            userName: m.name,
            actionType: 'tasbeeh',
            icon: "icon:sparkles",
            message: `ساهم ${m.name} بـ ${number(m.contributedPoints)} نقطة في ميزان الرَّكْب `,
            highlightText: `بـ ${number(m.contributedPoints)} نقطة`,
            timestamp: Date.now() - (idx + 1) * 1000 * 60 * 15
          });
        }
        if (m.streakDays && m.streakDays > 1) {
          list.push({
            id: `real_streak_${m.id}`,
            clanId: myClan?.id || '',
            userId: m.id,
            userName: m.name,
            actionType: 'speed_up',
            icon: "icon:leaf",
            message: `واصل ${m.name} سيره الإيماني بسلسلة ${number(m.streakDays)} أيام متتالية `,
            highlightText: `سلسلة ${number(m.streakDays)} أيام`,
            timestamp: Date.now() - (idx + 2) * 1000 * 60 * 45
          });
        }
      });
    }
    if (myClan) {
      list.push({
        id: `real_found_${myClan.id}`,
        clanId: myClan.id,
        userId: myClan.leaderId,
        userName: myClan.leaderName,
        actionType: 'speed_up',
        icon: "icon:shield",
        message: `تأسّس رَكْب «${myClan.name}» المبارك بقيادة ${myClan.leaderName} للتعاون على البر والتقوى `,
        highlightText: `تأسّس رَكْب «${myClan.name}»`,
        timestamp: Date.now() - 1000 * 3600 * 2
      });
    }
    return list;
  }, [myClan?.recentActivities, myClan?.id, myClan?.name, myClan?.leaderId, myClan?.leaderName, members]);

  useEffect(() => {
    if (activities.length <= 1) return;
    const timer = setInterval(() => {
      setActiveTickerIndex(prev => (prev + 1) % activities.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [activities.length]);

  const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const operation = useRef('');
  const main = useRef<HTMLElement>(null);
  useEffect(() => { main.current?.scrollTo({ top: 0 }); }, [tab]);
  useEffect(() => {
    const updateTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setBlessedTime(getActiveBlessedTime()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setProfileReady(false); setListReady(false); setError('');
    const fail = (e: Error) => setError(errorText(e));
    const a = clanService.subscribeToClans(list => { setClans(list); setListReady(true); }, fail);
    const b = clanService.subscribeToUserClan(user.uid, id => { setClanId(id); setProfileReady(true); }, fail);
    return () => { a(); b(); };
  }, [user.uid, retry]);
  useEffect(() => {
    setMyClan(null); setMembers([]); setQuests([]); setKhatma(null); setSaharNight(null); setClanReady(!clanId); setQuestsReady(!clanId);
    if (!clanId) return;
    const fail = (e: Error) => setError(errorText(e));
    const a = clanService.subscribeToClan(clanId, c => { setMyClan(c); setClanReady(true); }, fail);
    const b = clanService.subscribeToClanMembers(clanId, setMembers, fail);
    const c = clanService.subscribeToClanQuests(clanId, list => { setQuests(list); setQuestsReady(true); }, fail);
    const d = clanService.subscribeToClanKhatma(clanId, setKhatma);
    const today = new Date().toISOString().slice(0, 10);
    const e = clanService.subscribeToSaharNight(clanId, today, setSaharNight);
    return () => { a(); b(); c(); d(); e(); };
  }, [clanId, retry]);

  useEffect(() => {
    if (!myClan?.twinPactId) {
      setTwinPact(null);
      return;
    }
    const unsub = clanService.subscribeToClanTwinPact(myClan.twinPactId, setTwinPact);
    return () => unsub();
  }, [myClan?.twinPactId]);

  const claimJuz = async (juzNumber: number) => {
    if (!myClan || busy) return;
    await act(async () => {
      const userName = members.find(m => m.id === user.uid)?.name || user.displayName || 'رفيق في الرَّكْب';
      await clanService.claimKhatmaSlot(myClan.id, user.uid, userName, juzNumber);
      setNotice(`تم حجز الجزء ${juzNumber} بنجاح! سيتم احتساب تلاوتك تلقائياً عند القراءة من المصحف.`);
    });
  };

  useEffect(() => {
    if (!myClan || myClan.leaderId !== user.uid) {
      setPendingRequests([]);
      return;
    }
    const unsub = clanService.subscribeToPendingJoinRequests(myClan.id, reqs => {
      setPendingRequests(reqs);
    });
    return () => unsub();
  }, [myClan?.id, myClan?.leaderId, user?.uid]);

  useEffect(() => {
    if (clanId || !user?.uid) {
      setUserPendingRequest(null);
      return;
    }
    void clanService.getUserPendingJoinRequest(user.uid).then(req => {
      setUserPendingRequest(req);
    });
  }, [clanId, user?.uid]);

  const handleClaimKhatmaSlot = async (slotNumber: number) => {
    if (!myClan || busy) return;
    await act(async () => {
      await clanService.unclaimKhatmaSlot(myClan.id, user.uid, slotNumber);
      setNotice(`تم إلغاء حجز الجزء ${slotNumber}.`);
    });
  };

  const unclaimJuz = async (juzNumber: number) => {
    if (!myClan || busy) return;
    await act(async () => {
      await clanService.unclaimKhatmaSlot(myClan.id, user.uid, juzNumber);
      setNotice(`تم إلغاء حجز الجزء ${juzNumber}.`);
    });
  };

  const lightLantern = async () => {
    if (!myClan || busy) return;
    if (!isRibatSaharActive().isActive) {
      setError('محراب الأسحار غير متاح حالياً؛ يبدأ فقط في الثلث الأخير قبل أذان الفجر بـ ٩٠ دقيقة.');
      return;
    }
    await act(async () => {
      const myMember = members.find(m => m.id === user.uid);
      const userName = myMember?.name || user.displayName || 'رفيق في الرَّكْب';
      const userBadge = myMember?.badge || myClan.badgeIcon;
      await clanService.lightSaharLantern(myClan.id, user.uid, userName, 'istighfar', userBadge);
      setNotice(" تقبل الله قيامك واستغفارك! سُجل حضورك في نفحة السحر ومضاعفة الأجور نشطة.");
    });
  };

  const startNewKhatma = async () => {
    if (!myClan || busy) return;
    await act(async () => {
      await clanService.startNewClanKhatma(myClan.id, user.uid);
      setNotice(" تم تدشين ختمة جديدة بنجاح! تنافسوا في الخيرات.");
    });
  };

  // Immediately catch up and sync any uncredited prayers on the Prophet upon viewing the clan
  useEffect(() => {
    if (!clanId || !user?.uid) return;
    Preferences.get({ key: 'ifaqa_salat_period' }).then(pSnap => {
      const activeKey = pSnap.value || new Date().toISOString().slice(0, 10);
      Preferences.get({ key: 'ifaqa_salat_count' }).then(cSnap => {
        const countVal = Number(cSnap.value) || 0;
        const key = `ifaqa_clan_synced_salawat_${activeKey}_${user.uid}`;
        const alreadySynced = Number(localStorage.getItem(key)) || 0;
        if (countVal > alreadySynced) {
          const diff = countVal - alreadySynced;
          localStorage.setItem(key, String(countVal));
          void clanService.autoContributeClanQuest(user.uid, 'salawat', diff);
        }
      });
    }).catch(() => {});
  }, [clanId, user?.uid]);
  const act = async (work: () => Promise<void>) => {
    if (inFlight.current) return;
    if (!online) { setError('اتصل بالإنترنت أولًا؛ لم تُسجل أي تغييرات.'); return; }
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    try { await work(); } catch (e) { setError(errorText(e)); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const go = (next: Tab) => {
    setTab(next);
    setNotice('');
    if (next === 'journey') {
      setJourneySubTab('list');
    }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(myClan?.clanTag || `#${myClan?.id}`); setNotice('تم نسخ معرّف الرَّكْب. يمكن البحث به في قائمة القوافل.'); }
    catch { setError('تعذر النسخ؛ يمكنك تحديد معرّف الرَّكْب ونسخه يدويًا.'); }
  };
  const openQuest = (q: ClanQuest) => { setQuest(q); setAmount(q.targetType === 'tasbeeh' || q.targetType === 'salawat' ? '0' : q.targetType === 'audio_minutes' ? '15' : '1'); setConfirmed(false); operation.current = crypto.randomUUID(); setError(''); };
  const saveContribution = () => act(async () => {
    if (!myClan || !quest || !confirmed) return;
    const result = await clanService.contributeToQuest(myClan.id, quest.id, Number(amount), quest, operation.current);
    setQuest(null);
    setNotice(result.accepted ? `تم حفظ مساهمتك: ${number(result.accepted)} ${QUEST_UNITS[quest.targetType]}.${result.bonusAwarded ? ` اكتمل الهدف وأضيفت ${number(result.bonusAwarded)} نقطة لرَكْبكم.` : ' خطوة طيبة في مسيرتكم المشتركة.'}` : 'هذا الهدف مكتمل أو تم حفظ هذه المساهمة من قبل.');
  });
  const openWorship = (q: ClanQuest) => {
    setQuest(null); onBack?.();
    if (q.targetType === 'audio_minutes') onOpenRadio?.();
    else onOpenQuran?.(...(q.id === 'quest_kahf_friday' ? [18, 293] as [number, number] : []));
  };
  const ready = profileReady && clanReady;
  const completed = quests.filter(q => q.isCompleted).length;
  const next = TERRITORIES.find(t => !myClan?.unlockedTerritories?.includes(t.id));
  const visibleClans = clans.filter(c => c.memberCount > 0 && `${c.name} ${c.clanTag || ''} ${c.id}`.toLocaleLowerCase().includes(search.trim().replace(/^#/, '').toLocaleLowerCase()));
  const territoriesDominance = useMemo(() => calculateTerritoriesDominance(clans), [clans]);
  const activeProjectId = myClan?.territoryProjects
    ? Object.keys(myClan.territoryProjects).find(tid => !myClan.unlockedTerritories?.includes(tid) && !myClan.territoryProjects[tid].isCompleted)
    : null;
  const activeProject = activeProjectId && myClan?.territoryProjects ? myClan.territoryProjects[activeProjectId] : null;
  const activeTerritory = activeProjectId ? TERRITORIES.find(t => t.id === activeProjectId) : null;
  const remainingHours = activeProject ? getProjectRemainingHours(activeProject) : 0;

  const activeRealm = useMemo(() => CLAN_REALMS.find(r => r.index === activeRealmIndex) || CLAN_REALMS[0], [activeRealmIndex]);
  const activeRealmProgress = useMemo(() => getRealmProgress(activeRealmIndex, myClan?.unlockedTerritories || []), [activeRealmIndex, myClan?.unlockedTerritories]);
  const activeRealmUnlocked = activeRealmProgress.isUnlocked;
  const prevRealm = activeRealmIndex > 1 ? CLAN_REALMS[activeRealmIndex - 2] : null;
  const prevRealmProgress = useMemo(() => prevRealm ? getRealmProgress(prevRealm.index, myClan?.unlockedTerritories || []) : null, [prevRealm, myClan?.unlockedTerritories]);
  const realmTerritories = useMemo(() => TERRITORIES.filter(t => t.realmIndex === activeRealmIndex), [activeRealmIndex]);

  useEffect(() => {
    if (myClan?.unlockedTerritories) {
      const def = getDefaultActiveRealm(myClan.unlockedTerritories);
      setActiveRealmIndex(prev => Math.max(prev, def));
    }
  }, [myClan?.unlockedTerritories]);
  const actualMemberCount = members.length > 0 ? members.length : (myClan?.memberCount || 1);
  const myMember = useMemo(() => members.find(m => m.id === user.uid), [members, user.uid]);
  const unlockedPerks = useMemo(() => {
    if (!myClan?.unlockedTerritories) return [];
    return myClan.unlockedTerritories
      .map(tid => TERRITORY_EXCLUSIVE_PERKS[tid])
      .filter(Boolean);
  }, [myClan?.unlockedTerritories]);

  // Dynamic contrast calculation for hero banner
  const isDarkBanner = useMemo(() => {
    if (myClan?.bannerColor) {
      return isDarkColor(myClan.bannerColor);
    }
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  }, [myClan?.bannerColor]);
  const modalOpen = create || !!joining || leaving || !!quest || !!selectedTerritory || !!clanToDelete || !!selectedMember || !!memberToKick || settingsOpen || !!selectedJointProject || !!twinningTargetClan || activityFeedOpen || !!activePerkModal || pendingRequestsModalOpen;

  const handleCheckInMember = (target: ClanMember) => {
    if (!myClan) return;
    act(async () => {
      const res = await clanService.sendCompanionCheckIn(
        myClan.id,
        target.id,
        user.uid,
        user.displayName || 'رفيقك في الرَّكْب'
      );
      if (res.success) {
        setNotice(res.message);
        if (selectedMember && selectedMember.id === target.id) {
          setSelectedMember({
            ...selectedMember,
            lastCheckedInAt: Date.now()
          });
        }
      } else {
        setError(res.message);
      }
    });
  };

  const openSettingsModal = () => {
    if (!myClan) return;
    setEditName(myClan.name);
    setEditDescription(myClan.description || '');
    setEditBadge(myClan.badgeIcon || CLAN_LOGOS[0]);
    setEditColor(myClan.bannerColor || CLAN_BANNER_COLORS[0].gradient);
    setEditJoinPolicy(myClan.joinPolicy || (myClan.isPrivate ? 'passcode' : 'open'));
    setEditIsPrivate(Boolean(myClan.isPrivate));
    setEditPasscode(myClan.joinPasscode || '');
    setSettingsOpen(true);
    setError('');
  };

  return <div className={`clan-app ${isDark ? 'clan-theme-dark' : 'clan-theme-light'}`} dir="rtl">
    <div className={`clan-shell ${tab === 'journey' && journeySubTab === 'map' ? 'clan-shell-fullscreen-map' : ''}`} inert={modalOpen || undefined}>
      <header className="clan-top">
        <div className="clan-top-title">
          {onBack && (
            <button className="clan-icon-button" onClick={onBack} aria-label="العودة إلى التحديات">
              <ArrowRight size={20} />
            </button>
          )}
          <span className="clan-brand"><Shield size={22} /></span>
          <div>
            <strong>قوافل الخير</strong>
            <small>رَكْبٌ يعينك على الطاعة والهدى</small>
          </div>
        </div>
        <div className="clan-top-actions">
          {myClan && (
            <button
              type="button"
              className="clan-top-live-btn"
              onClick={() => setActivityFeedOpen(true)}
              title="قاعة المساهمين اللحظية وسجل النشاط الحي"
              aria-label="قاعة النشاط المباشر"
            >
              <span className="clan-live-dot" />
              <span className="clan-live-pill-label">مباشر</span>
              <span className="clan-live-pill-icon"><OutlineIcon name="scroll" /></span>
            </button>
          )}
          <button className="clan-icon-button" onClick={() => go('rules')} aria-label="دليل الرَّكْب" title="دليل الرَّكْب والأسئلة الشائعة">
            <Info size={20} />
          </button>
        </div>
      </header>
      <main ref={main} className={`clan-main ${tab === 'chat' ? 'clan-main-chat' : ''} ${tab === 'journey' && journeySubTab === 'map' ? 'clan-main-map' : ''}`}>
        {!online && <div className="clan-message" role="status">أنت غير متصل. يمكنك الاطلاع على البيانات المتاحة، والحفظ يحتاج إلى اتصال.</div>}
        {error && <div className="clan-message clan-error" role="alert">{error}<button onClick={() => setRetry(n => n + 1)}>إعادة الاتصال</button></div>}
        {notice && <div className="clan-message" role="status"><CheckCircle2 size={18} />{notice}</div>}
        {!ready ? <div className="clan-empty"><Loader2 className="clan-spin" /><h2>نجهّز مسيرتك…</h2><p>جارٍ تحميل عضويتك وبيانات الرَّكْب.</p></div> : <>
          {blessedTime && tab !== 'chat' && (tab !== 'journey' || journeySubTab !== 'map') && (
            <div className="clan-blessed-banner">
              <div className="clan-blessed-glow" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: 28, flexShrink: 0, filter: 'drop-shadow(0 2px 8px rgba(224, 201, 149, 0.4))' }}>{outlineContent(blessedTime.icon)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#fce49c', fontSize: 14 }}>نفحة بركة نشطة: {blessedTime.name}</strong>
                    <span className="clan-pill" style={{ background: 'rgba(224, 201, 149, 0.25)', borderColor: '#e0c995', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                      {blessedTime.badgeText}
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#e2e8f0', lineHeight: 1.4 }}>
                    {blessedTime.description} · متبقي {number(blessedTime.remainingMinutes)} دقيقة
                  </p>
                </div>
              </div>
            </div>
          )}
          {tab === 'chat' && (myClan ? <ClanChat key={myClan.id + user.uid} clanId={myClan.id} clanName={myClan.name} userId={user.uid} members={members} initialPeerId={chatPeer} onPeerChange={setChatPeer} online={online} /> : <div className="clan-empty"><MessageCircle size={36} /><h2>المحادثات تبدأ بصحبة</h2><p>انضم لفريق لتتواصل مع رفقائك.</p><button className="clan-primary" onClick={() => go('discover')}>استعراض القوافل</button></div>)}
          {tab === 'home' && <>
            {myClan?.leaderId === user.uid && pendingRequests.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  className="clan-leader-requests-pill"
                  onClick={() => setPendingRequestsModalOpen(true)}
                  title="عرض ومراجعة طلبات الانضمام المعلقة"
                >
                  <Users size={14} />
                  <strong>طلبات انضمام ({number(pendingRequests.length)}) — اضغط للمراجعة</strong>
                </button>
              </div>
            )}
            <section
              className={`clan-hero ${isDarkBanner ? 'is-dark-banner' : 'is-light-banner'}`}
              style={{
                background: myClan?.bannerColor || undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span
                  className="clan-eyebrow"
                  style={{
                    color: isDarkBanner ? '#fde68a' : '#854d0e',
                    textShadow: isDarkBanner ? '0 1px 4px rgba(0,0,0,0.55)' : 'none',
                    fontWeight: 700,
                  }}
                >
                  إفاقة · مسيرة نرتقي فيها معًا
                </span>
                {myClan?.leaderId === user.uid && (
                  <button
                    className="clan-icon-button"
                    title="إعدادات وتخصيص الرَّكْب"
                    onClick={openSettingsModal}
                    style={{
                      background: isDarkBanner ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.06)',
                      borderColor: isDarkBanner ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.12)',
                      color: isDarkBanner ? '#ffffff' : '#0f291e',
                    }}
                  >
                    <Settings size={18} />
                  </button>
                )}
              </div>
              <div className="clan-hero-badge">{outlineContent(renderBadge(myClan?.badgeIcon || "icon:leaf"))}</div>
              <h1
                style={{
                  color: isDarkBanner ? '#ffffff' : '#0f291e',
                  textShadow: isDarkBanner ? '0 2px 14px rgba(0,0,0,0.65)' : 'none',
                  fontWeight: 800,
                }}
              >
                {myClan?.name || 'الخير أجمل بصحبة'}
              </h1>
              <p
                style={{
                  color: isDarkBanner ? 'rgba(255, 255, 255, 0.92)' : '#244234',
                  textShadow: isDarkBanner ? '0 1px 6px rgba(0,0,0,0.5)' : 'none',
                  fontSize: 14,
                }}
              >
                {myClan?.description || 'اجتمع مع أهلك وأصحابك على خطوات إيمانية ثابتة. كل مساهمة ترفع الرَّكْب في مدارج الخير.'}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span
                  className="clan-pill"
                  style={{
                    background: isDarkBanner ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.06)',
                    borderColor: isDarkBanner ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.12)',
                    color: isDarkBanner ? '#ffffff' : '#0f291e',
                    backdropFilter: isDarkBanner ? 'blur(8px)' : 'none',
                    fontWeight: 600,
                  }}
                >
                  تعاون · استمرارية · بلا ضغط
                </span>
                {myClan?.isPrivate && (
                  <span
                    className="clan-pill"
                    style={{
                      background: isDarkBanner ? 'rgba(250, 204, 21, 0.2)' : 'rgba(224, 201, 149, 0.25)',
                      borderColor: isDarkBanner ? '#facc15' : '#ca8a04',
                      color: isDarkBanner ? '#fef08a' : '#854d0e',
                      fontWeight: 600,
                    }}
                  >
                    <Lock size={11} style={{ display: 'inline', marginLeft: 4 }} /> رَكْب خاص
                  </span>
                )}
                {myClan?.twinClanName && (
                  <button
                    type="button"
                    className="clan-twin-badge"
                    style={{
                      background: isDarkBanner ? 'rgba(255, 255, 255, 0.18)' : undefined,
                      borderColor: isDarkBanner ? 'rgba(255, 255, 255, 0.35)' : undefined,
                      color: isDarkBanner ? '#ffffff' : undefined,
                    }}
                    onClick={() => twinPact && setSelectedJointProject(twinPact.jointProject)}
                    title="اضغط لعرض تفاصيل الصرح المشترك"
                  >
                    
                    <OutlineIcon name="handheart" /> متآخٍ مع: <strong>{myClan.twinClanName}</strong>
                    {twinPact && <span style={{ color: isDarkBanner ? '#86efac' : '#166534', fontSize: 11 }}>({number(twinPact.jointProject.totalContributed)} / {number(twinPact.jointProject.targetPoints)})</span>}
                  </button>
                )}
              </div>
            </section>
            {!myClan ? <><div className="clan-actions"><button className="clan-primary" disabled={busy || !!clanId} onClick={() => setCreate(true)}><Plus size={18} />تأسيس رَكْب</button><button className="clan-secondary" onClick={() => go('discover')}><Users size={18} />اكتشف القوافل</button></div>{clanId && <div className="clan-message">تعذر العثور على رَكْبك السابق.<button onClick={() => act(async () => { await clanService.leaveClan(clanId, user.uid); setClanId(null); })}>إزالة الارتباط القديم</button></div>}<section className="clan-card"><h2>من أين تبدأ؟</h2><ol className="clan-steps"><li><b>١</b><div><strong>اختر صحبتك</strong><p>أنشئ رَكْباً عاماً أو انضم إلى قافلة لديها مقعد متاح.</p></div></li><li><b>٢</b><div><strong>شارك بما تقدر عليه</strong><p>اختر طاعة وسجّل ما أنجزته فعلًا. القليل المستمر له مكانه.</p></div></li><li><b>٣</b><div><strong>شاهد أثر تعاونكم</strong><p>تكملون الأهداف وتفتحون معالم إيمانية في مسيرة الرَّكْب.</p></div></li></ol></section></> : <>
              {myClan.twinStatus === 'pending_received' && twinPact && myClan.leaderId === user.uid && (
                <div className="clan-twinning-invite-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 32 }}><OutlineIcon name="handheart" /></span>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 4px', color: '#fce49c', fontSize: 16, fontWeight: 800 }}>
                        
                        دعوة مؤاخاة إيمانية واردة! <OutlineIcon name="sparkles" />
                      </h3>
                      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#f1f5f9', lineHeight: 1.6 }}>
                        يدعوكم <strong>«{twinPact.clan1Name}»</strong> لعقد ميثاق المؤاخاة في طاعة الله، وبناء صرح <strong>«{twinPact.jointProject.name}»</strong> المشترك معاً على الخريطة!
                      </p>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          className="clan-primary"
                          style={{ width: 'auto', padding: '8px 18px', background: '#22c55e', color: '#052e16', fontWeight: 800 }}
                          disabled={busy}
                          onClick={() => act(async () => {
                            const res = await clanService.respondToTwinningRequest(twinPact.id, myClan.id, user.uid, true);
                            setNotice(res.message);
                          })}
                        >
                          
                          قبول ميثاق المؤاخاة <OutlineIcon name="handheart" />
                        </button>
                        <button
                          className="clan-secondary"
                          style={{ width: 'auto', padding: '8px 14px' }}
                          disabled={busy}
                          onClick={() => act(async () => {
                            const res = await clanService.respondToTwinningRequest(twinPact.id, myClan.id, user.uid, false);
                            setNotice(res.message);
                          })}
                        >
                          اعتذار بلطف
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {myClan.twinStatus === 'pending_sent' && (
                <div style={{ padding: '10px 14px', borderRadius: 14, background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fce49c', fontSize: 12.5, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span><OutlineIcon name="clock" /> تم إرسال طلب المؤاخاة وبانتظار موافقة قائد الرَّكْب الآخر...</span>
                  {myClan.leaderId === user.uid && twinPact && (
                    <button
                      className="clan-text-button"
                      style={{ color: '#f87171', fontSize: 11 }}
                      onClick={() => act(async () => {
                        const res = await clanService.cancelOrEndTwinning(twinPact.id, myClan.id, user.uid);
                        setNotice(res.message);
                      })}
                    >
                      إلغاء الطلب
                    </button>
                  )}
                </div>
              )}
              {myMember?.checkInMessages && myMember.checkInMessages.length > 0 && (
                <div className="clan-companion-welcome-banner">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 30, filter: 'drop-shadow(0 2px 8px rgba(34, 197, 94, 0.5))' }}><OutlineIcon name="handheart" /></span>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 4px', color: '#fce49c', fontSize: 15, fontWeight: 800 }}>
                        
                        أثر الغائب · رفقاؤك في الرَّكْب سألوا عنك وتفقّدوك! <OutlineIcon name="leaf" />
                      </h3>
                      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#f1f5f9', lineHeight: 1.6 }}>
                        «المؤمن للمؤمن كالبنيان يشد بعضه بعضاً».. أثناء انقطاعك، بادر إخوانك في الرَّكْب بالسؤال عنك وتركوا لك هذه الرسائل الدافئة:
                      </p>
                      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                        {myMember.checkInMessages.map((msg, idx) => (
                          <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: 10, padding: '9px 12px', fontSize: 12, border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                            <div style={{ fontWeight: 700, color: '#86efac', marginBottom: 2 }}>{msg.fromUserName}:</div>
                            <div style={{ color: '#e2e8f0' }}>"{outlineContent(msg.message)}"</div>
                          </div>
                        ))}
                      </div>
                      <button
                        className="clan-primary"
                        style={{ padding: '8px 18px', fontSize: 12.5, width: 'auto', background: '#22c55e', color: '#052e16', fontWeight: 800 }}
                        onClick={() => {
                          if (myClan) {
                            clanService.dismissCompanionCheckIns(myClan.id, user.uid);
                          }
                        }}
                      >
                        
                        الحمد لله على عودتي، واصلتُ السير معكم <OutlineIcon name="heart" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="clan-stats">
                <div><strong>{number(myClan.totalPoints)}</strong><span>نقاط الرَّكْب</span></div>
                <div><strong>{number(actualMemberCount)}<small> / {number(myClan.maxCapacity || 10)}</small></strong><span>رفقاء الرَّكْب</span></div>
                <div><strong>{number(completed)}</strong><span>أهداف مكتملة</span></div>
              </div>

              {/* Unlocked Territory Exclusive Perks Shelf */}
              {unlockedPerks.length > 0 && (
                <div className="clan-perks-shelf-widget">
                  <div className="clan-perks-shelf-header">
                    <h3>
                      <Sparkles size={16} color="#34d399" />
                      فتوحات ومزايا الرَّكْب الحصرية ({number(unlockedPerks.length)})
                    </h3>
                    <span style={{ fontSize: 11, color: '#34d399', fontWeight: 700 }}>مفتوحة لأعضاء الرَّكْب <OutlineIcon name="sparkles" /></span>
                  </div>
                  <div className="clan-perks-shelf-items">
                    {unlockedPerks.map(perk => (
                      <div
                        key={perk.id}
                        className="clan-perk-shelf-chip"
                        onClick={() => setActivePerkModal(perk)}
                        title={perk.title}
                      >
                        <span className="chip-icon">{outlineContent(perk.icon)}</span>
                        <span className="chip-title">{outlineContent(perk.badge)}</span>
                        <span className="chip-sub">استخدام الميزة <OutlineIcon name="sparkles" /></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <section className="clan-card clan-next"><span className="clan-eyebrow">خطوتكم التالية</span><h2>{quests.find(q => !q.isCompleted)?.title || 'استمروا على الخير'}</h2><p>اختر طاعة تناسب يومك. لا يلزم أن ينجز الجميع المقدار نفسه.</p><button className="clan-primary" onClick={() => go('quests')}>شارك في سباق الخيرات <ArrowRight size={17} className="clan-arrow" /></button></section>
              <section className="clan-card">
                <div className="clan-heading">
                  <h2>رفقاء الرَّكْب</h2>
                  <span className="clan-muted">{number(actualMemberCount)} رفقاء</span>
                </div>
                <div className="clan-invite">
                  <code>{myClan.clanTag || `#${myClan.id}`}</code>
                  <button className="clan-icon-button" onClick={copy} aria-label="نسخ معرّف الرَّكْب"><Copy size={17} /></button>
                </div>
                {members.map(m => {
                  const levelInfo = getMemberLevel(m.contributedPoints || 0);
                  const streak = Math.max(1, m.streakDays || 1);
                  const streakBonus = calculateStreakMultiplier(streak);
                  const daysAbsent = getDaysSinceActive(m.lastActiveDate, m.lastActive);
                  const isAbsent = daysAbsent >= 2 && m.id !== user.uid;
                  const isCheckedInRecently = Boolean(m.lastCheckedInAt && (Date.now() - m.lastCheckedInAt < 20 * 3600 * 1000));

                  return (
                    <div className="clan-member" key={m.id} onClick={() => setSelectedMember(m)} title="اضغط لعرض الملف الشخصي للعضو">
                      <span className="clan-avatar">{m.name?.slice(0, 1) || 'ص'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <strong>{m.name}{m.id === user.uid ? ' (أنت)' : ''}</strong>
                          {m.role === 'leader' && <Crown size={15} color="#bca574" />}
                          {streak >= 3 && !isAbsent && (
                            <span style={{ fontSize: 10, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '2px 7px', borderRadius: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                              <Flame size={11} /> {number(streak)} أيام · {outlineContent(streakBonus.badge)}
                            </span>
                          )}
                          {isAbsent && (
                            <span style={{ fontSize: 10, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '2px 7px', borderRadius: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                              انقطاع {number(daysAbsent)} يوم
                            </span>
                          )}
                        </div>
                        <small>{m.role === 'leader' ? 'قائد الرَّكْب' : 'رفيق في الرَّكْب'} · <span style={{ color: '#bca574', fontWeight: 700 }}>المستوى {number(levelInfo.level)}</span></small>
                      </div>
                      <div className="clan-member-actions">
                        {m.id !== user.uid && <button className="clan-icon-button" aria-label={`راسل ${m.name}`} title="محادثة خاصة" onClick={e => { e.stopPropagation(); openMemberChat(m.id); }}><MessageCircle size={18} /></button>}
                        {isAbsent && (
                          <button
                            className="clan-checkin-quick-btn"
                            disabled={busy || isCheckedInRecently}
                            title={isCheckedInRecently ? 'تم تفقّد الرفيق اليوم، جزاكم الله خيراً' : 'انقطع يومين متتاليين - اضغط لتفقّده بإشعار دافئ (+50 نقطة إخاء)'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheckInMember(m);
                            }}
                          >
                            {outlineContent(isCheckedInRecently ? " تفقّدتموه اليوم" : " تفقّد الرفيق")}
                          </button>
                        )}
                        <span className="clan-member-points">{number(m.contributedPoints)} نقطة</span>
                      </div>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className="clan-text-button" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#ef4444' }} onClick={() => setLeaving(true)}>
                    <LogOut size={14} /> مغادرة الرَّكْب / إدارة القيادة
                  </button>
                  {myClan.leaderId === user.uid && (
                    <button className="clan-text-button" style={{ color: '#e0c995', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={openSettingsModal}>
                      <Settings size={14} /> إعدادات وتخصيص الرَّكْب
                    </button>
                  )}
                </div>
              </section>
            </>}
            <p className="clan-footnote"><Heart size={16} />النقاط وسيلة تشجيع داخل التطبيق؛ لا تقيس الأجر أو الإخلاص أو مكانة الإنسان.</p>
          </>}
          {tab === 'quests' && <><div className="clan-section-title"><span className="clan-eyebrow">خطوات صغيرة · أثر مشترك</span><h1>نتعاون على الخير</h1><p>سباق مستمر حتى إتمام الأهداف. تُضاف مكافأة كل هدف مرة واحدة لرَكْبكم.</p></div>{!myClan ? <div className="clan-empty"><Heart size={36} /><h2>ابدأ بصحبة</h2><p>انضم لرَكْب مبارك لتظهر أهدافكم المشتركة.</p><button className="clan-primary" onClick={() => go('discover')}>استعراض القوافل</button></div> : <>{(() => {
            const weeklyRemaining = getRemainingDaysInCurrentWeek();
            const saharActive = isRibatSaharActive();
            const fridayGoldenActive = isFridayGoldenHourActive();
            const filteredQuests = quests.filter(q => {
              if (q.isCompleted !== (questFilter === 'done')) return false;
              if (questCategory === 'weekly') return q.scheduleType === 'weekly' || q.scheduleType === 'friday_only';
              if (questCategory === 'milestone') return q.scheduleType !== 'weekly' && q.scheduleType !== 'friday_only';
              return true;
            });

            return <>
              {fridayGoldenActive.isActive && (
                <div className="clan-blessed-banner" style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.9), rgba(6, 78, 59, 0.9))', borderColor: '#60a5fa', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 26 }}><OutlineIcon name="landmark" /></span>
                      <div>
                        <strong style={{ color: '#93c5fd', fontSize: 14 }}>ساعة الإجابة وفضل الجمعة نشطة الآن!</strong>
                        <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#e0e7ff' }}>
                          ساعتان قبل مغرب الجمعة · مضاعف إضافي 1.5x على الصلاة على النبي ﷺ والدعاء
                        </p>
                      </div>
                    </div>
                    {onOpenProphetChallenge && (
                      <button className="clan-auto-shortcut" style={{ background: '#3b82f6', color: '#fff', padding: '6px 12px' }} onClick={onOpenProphetChallenge}>
                        الصلاة على النبي ﷺ <Heart size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Main Co-Op Sub-Tabs */}
              <div className="clan-segment" style={{ marginBottom: 14 }}>
                <button aria-pressed={coOpMode === 'quests'} onClick={() => setCoOpMode('quests')}>
                  
                  سباق المهام <OutlineIcon name="scroll" />
                </button>
                <button aria-pressed={coOpMode === 'khatma'} onClick={() => setCoOpMode('khatma')}>
                  
                  الختمة الموزعة (30 جزءاً) <OutlineIcon name="book" />
                </button>
                <button aria-pressed={coOpMode === 'sahar'} onClick={() => setCoOpMode('sahar')}>
                  
                  وبالأسحار هم يستغفرون <OutlineIcon name="moon" />
                </button>
              </div>

              {coOpMode === 'khatma' && (
                <section className="clan-card" style={{ marginBottom: 16 }}>
                  <div className="clan-heading">
                    <div>
                      <span className="clan-eyebrow">تعاون الأجزاء الثلاثين · مصحف كامل</span>
                      <h2 style={{ margin: '4px 0 0' }}>الختمة التشاركية (ختمة #{khatma?.khatmaNumber || 1})</h2>
                    </div>
                    <span className="clan-reward">مكافأة الإتمام · 20,000 نقطة</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--clan-muted)', margin: '4px 0 12px' }}>
                    يحجز كل رفيق جزءاً أو جزأين لتلاوتها. عند قراءة صفحات الجزء من المصحف يُحسب التقدم تلقائياً ويُقفل المقعد عند تمامه!
                  </p>

                  <div className="clan-heading clan-count" style={{ marginTop: 6 }}>
                    <strong>{number(khatma?.completedCount || 0)} <span>/ 30 جزءاً مكتمل</span></strong>
                    <span>{number(Math.min(100, Math.round(((khatma?.completedCount || 0) / 30) * 100)))}٪</span>
                  </div>
                  <Progress value={khatma?.completedCount || 0} max={30} label="إتمام أجزاء الختمة" />

                  {khatma?.isCompleted && (
                    <div style={{ marginTop: 14, padding: 14, background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', borderRadius: 14, textAlign: 'center' }}>
                      <h3 style={{ margin: '0 0 6px', color: '#22c55e', fontSize: 16 }}><OutlineIcon name="sparkles" /> اكتملت الختمة المباركة كاملاً!</h3>
                      <p style={{ margin: '0 0 10px', fontSize: 12 }}>نال الرَّكْب 20,000 نقطة بفضل تكاتف وتلاوة الرفقاء.</p>
                      <button className="clan-primary" onClick={startNewKhatma} disabled={busy}>
                        بدء ختمة جديدة برقم #{number((khatma.khatmaNumber || 1) + 1)}  <OutlineIcon name="sparkles" />
                      </button>
                    </div>
                  )}

                  <div className="clan-khatma-grid">
                    {QURAN_JUZS.map(juz => {
                      const slot = khatma?.slots?.[String(juz.juzNumber)];
                      const isCompleted = Boolean(slot?.isCompleted);
                      const isClaimedByMe = slot?.claimedByUserId === user.uid;
                      const isClaimedByOther = Boolean(slot?.claimedByUserId && !isClaimedByMe);
                      const savedLastPage = Number(localStorage.getItem(`ifaqa_clan_juz_last_page_${juz.juzNumber}`));
                      const localPagesCount = (savedLastPage && savedLastPage >= juz.startPage && savedLastPage <= juz.endPage)
                        ? (savedLastPage - juz.startPage + 1)
                        : 0;
                      const readCount = Math.max(slot?.readPages?.length || 0, isClaimedByMe ? localPagesCount : 0);
                      const resumePage = (savedLastPage && savedLastPage >= juz.startPage && savedLastPage <= juz.endPage)
                        ? savedLastPage
                        : (slot?.readPages && slot.readPages.length > 0 ? Math.min(juz.endPage, juz.startPage + slot.readPages.length) : juz.startPage);
                      const hasSavedBookmark = Boolean(savedLastPage && savedLastPage >= juz.startPage && savedLastPage <= juz.endPage);

                      return (
                        <div
                          key={juz.juzNumber}
                          className={`clan-juz-card ${isCompleted ? 'is-completed' : isClaimedByMe || isClaimedByOther ? 'is-claimed' : ''}`}
                        >
                          <div>
                            <div className="clan-juz-num">
                              <span>الجزء {number(juz.juzNumber)}</span>
                              {isCompleted && <span style={{ color: '#22c55e' }}><OutlineIcon name="check" /></span>}
                              {isClaimedByMe && !isCompleted && <span style={{ color: '#f59e0b' }}><OutlineIcon name="star" /> وردك</span>}
                            </div>
                            <div className="clan-juz-title">{juz.name}</div>
                            <div className="clan-juz-pages">ص {number(juz.startPage)} - {number(juz.endPage)} ({number(juz.totalPages)} ص)</div>
                          </div>

                          <div style={{ marginTop: 8 }}>
                            {isCompleted ? (
                              <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700 }}>
                                أتمّه: {slot?.claimedByName || 'رفيق'}  <OutlineIcon name="crown" />
                              </div>
                            ) : isClaimedByMe ? (
                              <div style={{ display: 'grid', gap: 5 }}>
                                <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>أنجزت {number(readCount)} / {number(juz.totalPages)} ص</span>
                                  {hasSavedBookmark && (
                                    <span style={{ fontSize: 9, color: 'var(--clan-text)', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 6px', borderRadius: 8 }}>
                                      
                                      <OutlineIcon name="sparkles" /> ص {number(resumePage)}
                                    </span>
                                  )}
                                </div>
                                <button
                                  className="clan-auto-shortcut"
                                  style={{ padding: '4px 8px', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                                  onClick={() => {
                                    localStorage.setItem('ifaqa_active_clan_juz', JSON.stringify({
                                      clanId: myClan?.id || '',
                                      juzNumber: juz.juzNumber,
                                      name: juz.name,
                                      startPage: juz.startPage,
                                      endPage: juz.endPage,
                                      totalPages: juz.totalPages
                                    }));
                                    onBack?.();
                                    onOpenQuran?.(undefined, resumePage);
                                  }}
                                >
                                  {hasSavedBookmark && resumePage > juz.startPage ? `تابع من ص ${number(resumePage)}` : 'اقرأ في المصحف'} <BookOpen size={11} />
                                </button>
                                <button
                                  className="clan-text-button"
                                  style={{ fontSize: 9.5, color: '#f87171', padding: 0 }}
                                  onClick={() => unclaimJuz(juz.juzNumber)}
                                  disabled={busy}
                                >
                                  إلغاء الحجز
                                </button>
                              </div>
                            ) : isClaimedByOther ? (
                              <div style={{ fontSize: 10, color: 'var(--clan-muted)' }}>
                                محجوز لـ: <b>{slot?.claimedByName}</b> ({number(readCount)}/{number(juz.totalPages)} ص)
                              </div>
                            ) : (
                              <button
                                className="clan-secondary"
                                style={{ width: '100%', padding: '4px 6px', fontSize: 10, margin: 0 }}
                                disabled={busy}
                                onClick={() => claimJuz(juz.juzNumber)}
                              >
                                احجز هذا الجزء <Plus size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {coOpMode === 'sahar' && (() => {
                const worshippers = saharNight?.lanterns || [];
                const activeCount = worshippers.length;
                const simulatedTesterCount = typeof window !== 'undefined' && localStorage.getItem('ifaqa_admin_sahar_tester_mode') === 'true'
                  ? Number(localStorage.getItem('ifaqa_admin_sahar_tester_worshippers') || 3)
                  : 0;
                const effectiveCount = Math.max(activeCount, simulatedTesterCount);
                // 2x for solo/two; 3x for 3 members, 4x for 4, etc.
                const currentMultiplier = effectiveCount >= 3 ? effectiveCount : 2;
                const isUserActive = saharActive.isActive && worshippers.some(w => w.userId === user.uid);
                const nextSahar = getTimeUntilNextSahar();

                const getActionIcon = (type?: string) => {
                  if (type === 'quran') return "icon:book";
                  if (type === 'salawat') return "icon:heart";
                  if (type === 'tasbeeh') return "icon:circle";
                  return "icon:handheart";
                };

                const getActionLabel = (type?: string) => {
                  if (type === 'quran') return 'يتلو القرآن';
                  if (type === 'salawat') return 'يصلي على النبي ﷺ';
                  if (type === 'tasbeeh') return 'يسبح ويذكر الله';
                  return 'مستغفر وقائم';
                };

                return (
                  <section className="clan-sahar-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <span className="clan-eyebrow" style={{ color: '#93c5fd', letterSpacing: '0.5px' }}>
                          الثلث الأخير · وقت التنزّل الإلهي والرحمات
                        </span>
                        <h2 style={{ margin: '4px 0 0', color: '#f8fafc', fontSize: 22, fontFamily: 'serif', fontWeight: 900 }}>
                          
                          «وَبِالْأَسْحَارِ هُمْ يَسْتَغْفِرُونَ» <OutlineIcon name="moon" />
                        </h2>
                      </div>
                      <span className="clan-pill" style={{ background: saharActive.isActive ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(16, 185, 129, 0.35))' : 'rgba(255,255,255,0.08)', borderColor: saharActive.isActive ? '#f59e0b' : 'rgba(255,255,255,0.2)', color: saharActive.isActive ? '#fef08a' : '#cbd5e1', fontWeight: 900, fontSize: 12, padding: '6px 14px' }}>
                        {outlineContent(saharActive.isActive ? `مضاعفة الحسنات نشطة x${number(currentMultiplier)} ` : "المضاعفة تُفعّل وقت السحر (x2 فأكثر) ")}
                      </span>
                    </div>

                    <p style={{ fontSize: 12.5, color: '#cbd5e1', margin: '10px 0 14px', lineHeight: 1.6 }}>
                      نافذة مباركة تبدأ قبل أذان الفجر بـ 90 دقيقة. أي <b>تلاوة في المصحف، أو تسبيح، أو صلاة على النبي ﷺ</b> خلال هذا الوقت تُضاعف نقاطها فوراً: <b style={{ color: '#fef08a' }}>تبدأ بمضاعفة x2</b>، وعند اجتماع 3 أشخاص فأكثر في محراب السحر تصبح المضاعفة <b style={{ color: '#fef08a' }}>3x أو حسب عدد الحاضرين (4x لأربعة، 5x لخمسة...)</b> لتشجيع همة الرَّكْب الجماعية!
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '10px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        <Clock size={16} color={saharActive.isActive ? '#34d399' : '#f59e0b'} />
                        <span style={{ color: '#e2e8f0' }}>نافذة الأسحار:</span>
                        <strong style={{ color: saharActive.isActive ? '#34d399' : '#fef08a' }}>
                          {saharActive.isActive
                            ? `نشطة الآن (متبقي ${number(saharActive.remainingMinutes)} دقيقة حتى أذان الفجر)`
                            : `مغلقة حالياً (تبدأ بعد ${number(nextSahar.hours)} س و ${number(nextSahar.minutes)} د)`}
                        </strong>
                      </div>
                      <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700 }}>
                        
                        <OutlineIcon name="users" /> {saharActive.isActive ? 'المستغفرون الليلة:' : 'مستغفرو السحر الأخير:'} <b style={{ color: '#fff', fontSize: 13 }}>{number(activeCount)}</b> رفقاء
                      </div>
                    </div>

                    {/* Admin Tester Mode Quick Card */}
                    {isAdmin && (
                      <div style={{
                        marginTop: 12,
                        padding: '10px 14px',
                        borderRadius: 14,
                        background: saharTesterMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: saharTesterMode ? '1px solid #60a5fa' : '1px dashed rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}><OutlineIcon name="flask" /></span>
                          <div>
                            <div style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>وضع المجرّب: ثيم ومحراب الأسحار (خاص بالمدير)</div>
                            <div style={{ color: '#94a3b8', fontSize: 10.5 }}>
                              {saharTesterMode ? 'نشط حالياً · يمكنك تجربة الثيم وتسجيل الحضور والمضاعفة في أي وقت' : 'معطل · الثيم والمحراب يعملان بتوقيت السحر الفعلي فقط'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={toggleSaharTesterMode}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 800,
                            background: saharTesterMode ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flexShrink: 0
                          }}
                        >
                          {outlineContent(saharTesterMode ? "إيقاف التجربة " : "تجربة المحراب ")}
                        </button>
                      </div>
                    )}

                    {/* Active Companions Worship Grid */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 700, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{saharActive.isActive ? 'محراب الرفقاء القائمين الليلة:' : 'رفقاء شَهِدوا السحر الأخير:'}</span>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>
                          {saharActive.isActive ? 'يتضاعف الأجر لكل رفيق ينضم إلى الرَّكْب' : 'يُفتح المحراب تلقائياً عند حلول وقت السحر'}
                        </span>
                      </div>

                      {activeCount === 0 ? (
                        <div style={{ textAlign: 'center', padding: '22px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)' }}>
                          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#cbd5e1' }}>لم يسجل رفقاء حضورهم بعد هذه الليلة <OutlineIcon name="moon" /></p>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>أي قراءة من المصحف أو ذكر في التطبيق يُسجّل اسمك ويرفع المضاعفة تلقائياً!</span>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                          {worshippers.map((w, idx) => {
                            const isMe = w.userId === user.uid;
                            return (
                              <div
                                key={w.userId || idx}
                                style={{
                                  background: isMe ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(245, 158, 11, 0.15))' : 'rgba(255,255,255,0.06)',
                                  border: isMe ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.12)',
                                  borderRadius: 12,
                                  padding: '8px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8
                                }}
                              >
                                <span style={{ fontSize: 18 }}>{getActionIcon(w.actionType)}</span>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: isMe ? '#86efac' : '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {w.userName} {isMe && '(أنت)'}
                                  </div>
                                  <div style={{ fontSize: 9.5, color: '#94a3b8' }}>
                                    {getActionLabel(w.actionType)}
                                  </div>
                                </div>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399', flexShrink: 0 }} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Quick Presence Button: strictly active only during Sahar window */}
                    <div style={{ marginTop: 14 }}>
                      {!saharActive.isActive ? (
                        <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(255, 255, 255, 0.04)', border: '1px dashed rgba(245, 158, 11, 0.35)', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#f59e0b', fontSize: 13, fontWeight: 800, marginBottom: 4 }}>
                            <Clock size={16} />
                            <span>زر التسجيل والمضاعفة غير متاح الآن</span>
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#94a3b8', lineHeight: 1.6 }}>
                            يُفتح التسجيل وتتضاعف أجور الطاعات فقط في الثلث الأخير من الليل (قبل أذان الفجر بـ ٩٠ دقيقة).
                            <span style={{ display: 'block', marginTop: 4, color: '#fce49c', fontWeight: 700 }}>
                              
                              <OutlineIcon name="clock" /> متبقي على نافذة الأسحار القادمة: {number(nextSahar.hours)} ساعة و {number(nextSahar.minutes)} دقيقة
                            </span>
                          </p>
                        </div>
                      ) : isUserActive ? (
                        <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#86efac', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>
                          
                          <OutlineIcon name="sparkles" /> تقبل الله منك! أنت مسجل في محراب الأسحار ومضاعفة أجورك نشطة (x{number(currentMultiplier)})
                        </div>
                      ) : (
                        <button
                          className="clan-primary"
                          style={{ width: '100%', minHeight: 44, background: 'linear-gradient(135deg, #10b981, #059669)', border: '1px solid #34d399' }}
                          onClick={lightLantern}
                          disabled={busy}
                        >
                          <Sparkles size={16} />  أنا قائم أستغفر الآن <OutlineIcon name="handheart" /> (تفعيل المضاعفة)
                        </button>
                      )}
                    </div>
                  </section>
                );
              })()}

              {coOpMode === 'quests' && (
                <>
                  <div className="clan-weekly-countdown-pill">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Clock size={16} className="clan-weekly-clock-icon" />
                      <span>تتجدد المهام الأسبوعية المشتركة خلال:</span>
                      <strong>{number(weeklyRemaining.days)} يوم و {number(weeklyRemaining.hours)} ساعة</strong>
                    </div>
                    <span className="clan-badge-weekly">
                      <Sparkles size={12} /> ختمة أسبوعية مشتركة (604 ص)
                    </span>
                  </div>

                  <div className="clan-segment" style={{ marginBottom: 8 }}>
                    <button aria-pressed={questFilter === 'active'} onClick={() => setQuestFilter('active')}>الجارية ({number(quests.length - completed)})</button>
                    <button aria-pressed={questFilter === 'done'} onClick={() => setQuestFilter('done')}>المكتملة ({number(completed)})</button>
                  </div>

                  <div className="clan-segment" style={{ marginBottom: 14 }}>
                    <button aria-pressed={questCategory === 'all'} onClick={() => setQuestCategory('all')}>كل الأهداف</button>
                    <button aria-pressed={questCategory === 'weekly'} onClick={() => setQuestCategory('weekly')}>المهام الأسبوعية <OutlineIcon name="clock" /></button>
                    <button aria-pressed={questCategory === 'milestone'} onClick={() => setQuestCategory('milestone')}>الأهداف الكبرى <OutlineIcon name="trophy" /></button>
                  </div>

                  {!questsReady ? <p role="status">جارٍ تحميل التحديات…</p> : filteredQuests.length === 0 ? <div className="clan-empty"><CheckCircle2 size={32} /><h2>{questFilter === 'done' ? 'كل رحلة تبدأ بخطوة' : 'أتممتم الأهداف في هذا القسم'}</h2><p>{questFilter === 'done' ? 'ستظهر هنا أهدافكم بعد إتمامها.' : 'يمكنكم متابعة وردكم المعتاد والعودة عند تجدد الأهداف الأسبوعية.'}</p></div> : <div className="clan-quest-grid">{filteredQuests.map(q => <article className="clan-card clan-quest" key={q.id}><div className="clan-heading"><span className="clan-quest-icon">{outlineContent(q.icon)}</span><div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>{q.scheduleType === 'weekly' && <span className="clan-badge-weekly"><Clock size={10} /> أسبوعي</span>}{q.scheduleType === 'friday_only' && <span className="clan-badge-friday"><Sparkles size={10} /> الجمعة</span>}<span className="clan-reward">{q.isCompleted ? 'تمت الإضافة' : 'مكافأة جماعية'} · {number(q.bonusPoints)} نقطة</span></div></div><h2>{q.title}</h2><p>{q.description}</p><div className="clan-heading clan-count"><strong>{number(Math.min(q.currentAmount, q.targetAmount))} <span>/ {number(q.targetAmount)} {QUEST_UNITS[q.targetType]}</span></strong><span>{number(Math.min(100, Math.round(q.currentAmount / q.targetAmount * 100)))}٪</span></div><Progress value={q.currentAmount} max={q.targetAmount} label={q.title} />{q.isCompleted ? <span className="clan-completed"><CheckCircle2 size={17} />هدف اكتمل بتعاونكم</span> : (q.scheduleType === 'friday_only' || q.id === 'quest_kahf_friday') && !isFridayTime() ? <div className="clan-time-gated"><Clock size={14} /><span>متاح يوم الجمعة المبارك (يبدأ مغرب الخميس)</span>{onOpenQuran && <button className="clan-auto-shortcut" onClick={() => { onBack?.(); onOpenQuran?.(18, 293); }}>تلاوة سورة الكهف <BookOpen size={14} /></button>}</div> : isAutoTracked(q.targetType) ? <div className="clan-auto-track"><Zap size={14} /><span>{q.targetType === 'tasbeeh' ? 'يُتابع تلقائياً من المسبحة' : q.targetType === 'collective_khatma' ? 'يُحتسب تلقائياً عند إتمام سورة الكهف' : q.targetType === 'salawat' ? 'يُتابع تلقائياً من الصلاة على النبي' : q.targetType === 'audio_minutes' ? 'يُتابع تلقائياً دقيقة بدقيقة من الإذاعة وتلاوات القرآن' : 'يُتابع تلقائياً من المصحف'}</span>{q.targetType === 'audio_minutes' && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>{onOpenRadio && <button className="clan-auto-shortcut" onClick={() => { onBack?.(); onOpenRadio(); }}>افتح الإذاعة <Headphones size={14} /></button>}<button className="clan-auto-shortcut" onClick={() => openQuest(q)}>تسجيل يدوي <Plus size={14} /></button></div>}{q.targetType === 'quran_pages' && onOpenQuran && <button className="clan-auto-shortcut" onClick={() => { onBack?.(); onOpenQuran?.(); }}>افتح المصحف <BookOpen size={14} /></button>}{q.targetType === 'tasbeeh' && onOpenMasbaha && <button className="clan-auto-shortcut" onClick={() => { onBack?.(); onOpenMasbaha(); }}>افتح المسبحة <Sparkles size={14} /></button>}{q.targetType === 'salawat' && onOpenProphetChallenge && <button className="clan-auto-shortcut" onClick={() => { onBack?.(); onOpenProphetChallenge(); }}>الصلاة على النبي ﷺ <Heart size={14} /></button>}{q.targetType === 'collective_khatma' && onOpenQuran && <button className="clan-auto-shortcut" onClick={() => { onBack?.(); onOpenQuran?.(18, 293); }}>افتح سورة الكهف <BookOpen size={14} /></button>}</div> : <button className="clan-secondary" disabled={busy || !online} onClick={() => openQuest(q)}>أضف مساهمتك <Plus size={17} /></button>}</article>)}</div>}
                </>
              )}
            </>;
          })()}<p className="clan-footnote">جميع أهداف الرَّكْب تُحتسب تلقائياً وبذكاء من نشاطك الفعلي في المصحف والمسبحة والإذاعة والتحديات دون حاجة لأي تسجيل يدوي.</p></>}</>}
          {tab === 'journey' && (
            journeySubTab === 'map' ? (
              <div className="clan-map-wrapper">
                {/* Floating Slim Glass Header Bar */}
                <div className="clan-map-floating-top">
                  <div className="clan-map-header-bar">
                    <button
                      type="button"
                      className="clan-map-realm-select-pill"
                      onClick={() => setRealmPickerOpen(true)}
                      aria-label="اختيار الخريطة والعالم"
                    >
                      <span className="clan-map-realm-icon">{outlineContent(activeRealm.icon)}</span>
                      <span className="clan-map-realm-title">
                        خريطة {number(activeRealm.index)}: {activeRealm.name}
                      </span>
                      <span className="clan-map-realm-badge">
                        {activeRealmUnlocked ? (
                          `${number(activeRealmProgress.completed)}/${number(activeRealmProgress.total)}`
                        ) : (
                          <Lock size={11} style={{ display: 'inline', verticalAlign: '-1px' }} />
                        )}
                      </span>
                      <ChevronDown size={14} className="clan-map-realm-chevron" />
                    </button>

                    <div className="clan-map-keys-pill" title="مفاتيح الواحات المتوفرة لدى الرَّكْب لتسريع البناء والفتح">
                      <span><OutlineIcon name="sparkles" /></span>
                      <strong>{number(myClan?.oasisKeys || 0)}</strong>
                    </div>

                    <div className="clan-map-segment-compact">
                      <button
                        type="button"
                        aria-pressed={journeySubTab === 'map'}
                        className={journeySubTab === 'map' ? 'is-active' : ''}
                        onClick={() => setJourneySubTab('map')}
                        title="عرض الخريطة"
                      >
                        
                        <OutlineIcon name="sparkles" /> الخريطة
                      </button>
                      <button
                        type="button"
                        aria-pressed={journeySubTab === 'list'}
                        className={journeySubTab === 'list' ? 'is-active' : ''}
                        onClick={() => setJourneySubTab('list')}
                        title="عرض المحطات كقائمة"
                      >
                        
                        <OutlineIcon name="scroll" /> ({number(TERRITORIES.length)})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Perspective Viewport & Stage */}
                <div
                  className="clan-map-viewport"
                  ref={viewportRef}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
                >
                  <div
                    className="clan-map-perspective-stage"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: '50% 50%',
                      transition: isPanning ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                  >
                    <img
                      src="./clan_map.jpg"
                      alt="خريطة العالم والقبائل التفاعلية"
                      className="clan-map-img"
                    />
                    <div className={`clan-map-overlay ${activeRealm.overlayClass}`} />

                    {/* Environmental Lighting & Micro-Animations */}
                    <div className="clan-map-celestial-rays" aria-hidden="true" />
                    <div className="clan-water-shimmer" style={{ left: '42%', top: '85%', width: 140, height: 90 }} aria-hidden="true" />
                    <div className="clan-water-shimmer" style={{ left: '60%', top: '55%', width: 120, height: 70 }} aria-hidden="true" />
                    <div className="clan-torch-fire" style={{ left: '23%', top: '48%' }} aria-hidden="true" />
                    <div className="clan-torch-fire" style={{ left: '29%', top: '46%' }} aria-hidden="true" />

                    {/* 8 Landmarks of the Active Realm */}
                    {realmTerritories.map(t => {
                      const dom = territoriesDominance[t.id];
                      const dominant = dom?.dominantClan;
                      const isDominant = !!dominant;
                      const isContested = (dom?.heatLevel || 0) >= 40;
                      const myClanUnlocked = Boolean(myClan?.unlockedTerritories?.includes(t.id));
                      const myClanBuilding = Boolean(activeProjectId === t.id);
                      const myClanProject = myClan?.territoryProjects?.[t.id];
                      const progressPct = myClanUnlocked ? 100 : myClanProject ? getProjectProgressPercent(myClanProject) : 0;
                      const stageInfo = getConstructionStage(progressPct);
                      const stageClass = myClanUnlocked ? 'is-stage-3' : (myClanBuilding && stageInfo.stage === 1 ? 'is-stage-1' : myClanBuilding && stageInfo.stage === 2 ? 'is-stage-2' : '');

                      return (
                        <button
                          key={t.id}
                          className={`clan-map-pin ${isDominant ? 'is-dominant' : ''} ${stageClass}`}
                          style={{ left: `${t.mapCoords.x}%`, top: `${t.mapCoords.y}%` }}
                          onClick={() => setSelectedTerritory(t)}
                          aria-label={`معلم ${t.name}`}
                        >
                          {/* 3D Jeweled Medallion Matching Image 2 */}
                          <div className={`clan-map-medallion-pin medallion-${t.id}`}>
                            <span className="clan-map-medallion-icon">{outlineContent(t.icon)}</span>

                            {/* Construction Stage & Completion Status */}
                            {myClanBuilding && (
                              <span className="clan-map-pin-stage-icon" title={stageInfo.subtitle}>
                                {outlineContent(stageInfo.icon)}
                              </span>
                            )}
                            {myClanUnlocked && (
                              <span className="clan-map-pin-stage-icon" title="صرح مدشّن مبارك">
                                
                                <OutlineIcon name="sparkles" />
                              </span>
                            )}
                            {dominant && !myClanBuilding && !myClanUnlocked && (
                              <span className="clan-map-pin-badge" title={`القبيلة المهيمنة: ${dominant.clanName}`}>
                                {renderBadge(dominant.clanBadge)}
                              </span>
                            )}
                            {isContested && (
                              <span className="clan-map-pin-heat" title="منافسة مشتعلة">
                                <Flame size={11} />
                              </span>
                            )}
                          </div>

                          {/* Engraved Plaque directly below medallion */}
                          <div className="clan-map-engraved-plaque">
                            <span className="plaque-title">{t.name}</span>
                            <span className="plaque-status">
                              {outlineContent(myClanBuilding ? (
                                `${stageInfo.name} (${number(progressPct)}٪)`
                              ) : myClanUnlocked ? (
                                "مكتمل مبارك "
                              ) : (
                                'متاح'
                              ))}
                            </span>
                          </div>

                          {/* Parchment Scroll Tag (+5) matching Image 2 */}
                          <div className="clan-map-parchment-tag" title={`سعة +${t.capacityBonus || 5} مقاعد`}>
                            +{t.capacityBonus || 5}
                          </div>
                        </button>
                      );
                    })}

                    {/* Twin Mega Project Pin on Map */}
                    {twinPact && twinPact.status === 'active' && (
                      <button
                        className="clan-map-twin-pin"
                        style={{
                          left: `${twinPact.jointProject.mapCoords.x}%`,
                          top: `${twinPact.jointProject.mapCoords.y}%`
                        }}
                        onClick={() => setSelectedJointProject(twinPact.jointProject)}
                        aria-label={`مشروع المؤاخاة المشترك: ${twinPact.jointProject.name}`}
                      >
                        <div className="clan-map-twin-pin-inner">
                          <span>{outlineContent(twinPact.jointProject.icon)}</span>
                          <div className="clan-map-twin-badges">
                            {renderBadge(twinPact.clan1Badge)}
                            {renderBadge(twinPact.clan2Badge)}
                          </div>
                        </div>
                        <div className="clan-map-twin-label">
                          
                          <OutlineIcon name="handheart" /> {twinPact.jointProject.name} ({number(Math.min(100, Math.round((twinPact.jointProject.totalContributed / twinPact.jointProject.targetPoints) * 100)))}٪)
                        </div>
                      </button>
                    )}
                    {!activeRealmUnlocked && (
                      <div className="clan-map-locked-veil">
                        <div className="clan-locked-veil-card">
                          <div className="clan-locked-veil-icon-wrap">
                            <Lock size={32} />
                          </div>
                          <h3 className="clan-locked-veil-title">خريطة «{activeRealm.name}» مغلقة <OutlineIcon name="lock" /></h3>
                          <p className="clan-locked-veil-desc">
                            هذا العالم محجوب بستار الهمة؛ ولفتحه يجب على قبيلتكم فتح وتشييد جميع واحات الخريطة السابقة <b>«{prevRealm?.name}»</b>.
                          </p>
                          {prevRealm && prevRealmProgress && (
                            <div className="clan-locked-veil-progress-box">
                              <div className="clan-locked-veil-progress-info">
                                <span>إنجاز واحات {prevRealm.name}:</span>
                                <b>{number(prevRealmProgress.completed)} / {number(prevRealmProgress.total)}</b>
                              </div>
                              <Progress value={prevRealmProgress.completed} max={prevRealmProgress.total} label="تقدم فك قفل الخريطة" />
                            </div>
                          )}
                          {prevRealm && (
                            <button
                              className="clan-locked-veil-btn"
                              onClick={() => setActiveRealmIndex(prevRealm.index)}
                            >
                              الذهاب إلى {prevRealm.name} ({outlineContent(prevRealm.icon)})
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Floating Map Zoom & Pan Controls */}
                  <div className="clan-map-zoom-controls">
                    <button
                      type="button"
                      className="clan-map-zoom-btn"
                      onClick={handleZoomIn}
                      title="تكبير الخريطة (Zoom In)"
                      aria-label="تكبير"
                    >
                      <ZoomIn size={18} />
                    </button>
                    <button
                      type="button"
                      className="clan-map-zoom-btn"
                      onClick={handleZoomOut}
                      title="تصغير الخريطة (Zoom Out)"
                      aria-label="تصغير"
                    >
                      <ZoomOut size={18} />
                    </button>
                    <button
                      type="button"
                      className="clan-map-zoom-btn"
                      onClick={handleFocusFirstOasis}
                      title="التركيز على أول واحة بالأسفل"
                      aria-label="أول واحة"
                    >
                      <Locate size={18} />
                    </button>
                    <button
                      type="button"
                      className="clan-map-zoom-btn"
                      onClick={handleFocusFullMap}
                      title="عرض كامل معالم العالم"
                      aria-label="كامل المعالم"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="clan-section-title">
                  <span className="clan-eyebrow">خريطة الفتوحات ومعالم القبائل</span>
                  <h1>رحلة الاستحواذ والتنافس</h1>
                  <p>تتنافس القبائل على فتح المعالم والواحات بالنقاط المليونية عبر 5 خرائط متسلسلة. كل فتح يثبت نفوذ قبيلتك، وتُنقص فترة البناء بالطاعات المشتركة.</p>
                </div>
                <div className="clan-segment" style={{ marginBottom: 12 }}>
                  <button aria-pressed={journeySubTab === 'map'} onClick={() => setJourneySubTab('map')}>خريطة النفوذ <OutlineIcon name="sparkles" /></button>
                  <button aria-pressed={journeySubTab === 'list'} onClick={() => setJourneySubTab('list')}>محطات المعالم ({number(TERRITORIES.length)}) <OutlineIcon name="scroll" /></button>
                </div>

                {/* 5 Realms filter tabs in Landmarks List */}
                <div className="clan-realm-list-filter">
                  <button
                    className={`clan-realm-list-btn ${listFilterRealm === 'all' ? 'is-active' : ''}`}
                    onClick={() => setListFilterRealm('all')}
                  >
                    جميع المحطات ({number(TERRITORIES.length)})
                  </button>
                  {CLAN_REALMS.map(r => {
                    const prog = getRealmProgress(r.index, myClan?.unlockedTerritories || []);
                    return (
                      <button
                        key={r.id}
                        className={`clan-realm-list-btn ${listFilterRealm === r.index ? 'is-active' : ''}`}
                        onClick={() => setListFilterRealm(r.index)}
                      >
                        {outlineContent(r.icon)} خريطة {number(r.index)} ({number(prog.completed)}/{number(prog.total)})
                      </button>
                    );
                  })}
                </div>
                {activeProject && activeTerritory && (() => {
                  const activeProgress = getProjectProgressPercent(activeProject);
                  const activeStage = getConstructionStage(activeProgress);

                  return (
                    <section className={`clan-construction-card ${activeStage.visualTheme}`} style={{ marginBottom: 18 }}>
                      <div className="clan-heading">
                        <span className="clan-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span>{outlineContent(activeStage.icon)}</span> {outlineContent(activeStage.badge)} · {activeStage.name}
                        </span>
                        <span className="clan-timer-pill"><Clock size={15} /> متبقي: {formatRemainingHours(remainingHours)} ({number(activeProgress)}٪)</span>
                      </div>
                      <h2 style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '8px 0 4px', fontSize: 18 }}>
                        <Hammer size={22} color="#fce49c" /> {outlineContent(activeTerritory.icon)} {activeTerritory.name}
                      </h2>
                      <p style={{ margin: '4px 0 8px', fontSize: 13, color: '#fce49c' }}>
                        {activeStage.subtitle}
                      </p>
                      <p style={{ margin: '0 0 12px', fontSize: 12, opacity: 0.9 }}>
                        {activeStage.description}
                      </p>
                      <div className="clan-speedup-actions">
                      {onOpenQuran && <button className="clan-speedup-btn" onClick={() => { onBack?.(); onOpenQuran?.(); }}><BookOpen size={14} /> تلاوة صفحة (تسريع ٣٠ د)</button>}
                      {onOpenMasbaha && <button className="clan-speedup-btn" onClick={() => { onBack?.(); onOpenMasbaha?.(); }}><Sparkles size={14} /> ١٠٠ تسبيحة (تسريع ساعة)</button>}
                      {onOpenProphetChallenge && <button className="clan-speedup-btn" onClick={() => { onBack?.(); onOpenProphetChallenge?.(); }}><Heart size={14} /> ٥٠ صلاة على النبي (تسريع ساعة)</button>}
                      {onOpenRadio && <button className="clan-speedup-btn" onClick={() => { onBack?.(); onOpenRadio?.(); }}><Headphones size={14} /> ٢٠ دقيقة إذاعة (تسريع ساعة)</button>}
                    </div>
                    {activeProject.contributions && activeProject.contributions.length > 0 && (
                      <div className="clan-speedup-feed">
                        <small style={{ color: '#a2c4b2', fontWeight: 700 }}>سجل تسريع البناء من أفراد القبيلة:</small>
                        {activeProject.contributions.slice(-3).reverse().map((c, idx) => (
                          <div className="clan-speedup-item" key={idx}>
                            <span><OutlineIcon name="zap" /> {c.userName} ({c.worshipTitle})</span>
                            <span style={{ color: '#fce49c', fontWeight: 700 }}>سرّع {number(c.hoursReduced)} ساعة</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ); })()}
                {twinPact && twinPact.status === 'active' && (
                  <article
                    className="clan-card clan-landmark is-unlocked"
                    style={{
                      background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.4), rgba(15, 23, 42, 0.5))',
                      borderColor: '#f59e0b',
                      cursor: 'pointer',
                      marginBottom: 16
                    }}
                    onClick={() => setSelectedJointProject(twinPact.jointProject)}
                  >
                    <span className="clan-landmark-icon" style={{ borderColor: '#f59e0b' }}>
                      {outlineContent(twinPact.jointProject.icon)}
                    </span>
                    <div>
                      <div className="clan-heading">
                        <span className="clan-eyebrow" style={{ color: '#fce49c' }}>
                          
                          صرح المؤاخاة المشترك <OutlineIcon name="handheart" /> بين «{twinPact.clan1Name}» و «{twinPact.clan2Name}»
                        </span>
                        <span className="clan-reward">
                          {number(twinPact.jointProject.totalContributed)} / {number(twinPact.jointProject.targetPoints)} نقطة
                        </span>
                      </div>
                      <h2>{twinPact.jointProject.name}</h2>
                      <p>{twinPact.jointProject.description}</p>
                      <div className="clan-dual-progress">
                        <div
                          className="clan-dual-progress-bar-1"
                          style={{
                            width: `${(twinPact.jointProject.clan1Contributed / twinPact.jointProject.targetPoints) * 100}%`
                          }}
                          title={`${twinPact.clan1Name}: ${number(twinPact.jointProject.clan1Contributed)}`}
                        />
                        <div
                          className="clan-dual-progress-bar-2"
                          style={{
                            width: `${(twinPact.jointProject.clan2Contributed / twinPact.jointProject.targetPoints) * 100}%`
                          }}
                          title={`${twinPact.clan2Name}: ${number(twinPact.jointProject.clan2Contributed)}`}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#e2e8f0' }}>
                        <span style={{ color: '#86efac' }}><OutlineIcon name="circle" /> {twinPact.clan1Name}: {number(twinPact.jointProject.clan1Contributed)} ن</span>
                        <span style={{ color: '#fce49c' }}><OutlineIcon name="circle" /> {twinPact.clan2Name}: {number(twinPact.jointProject.clan2Contributed)} ن</span>
                      </div>
                    </div>
                  </article>
                )}
                <div className="clan-timeline">
                  {(listFilterRealm === 'all' ? TERRITORIES : TERRITORIES.filter(t => t.realmIndex === listFilterRealm)).map((t, index) => {
                    const unlocked = myClan?.unlockedTerritories?.includes(t.id);
                    const isBuilding = activeProjectId === t.id;
                    const myClanProject = myClan?.territoryProjects?.[t.id];
                    const progressPct = unlocked ? 100 : myClanProject ? getProjectProgressPercent(myClanProject) : 0;
                    const stageInfo = getConstructionStage(progressPct);
                    const dom = territoriesDominance[t.id];
                    const dominant = dom?.dominantClan;

                    return (
                      <article
                        className={`clan-card clan-landmark ${unlocked ? 'is-unlocked' : ''} ${isBuilding ? stageInfo.visualTheme : ''}`}
                        key={t.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedTerritory(t)}
                      >
                        <span className="clan-landmark-icon">{outlineContent(t.icon)}</span>
                        <div>
                          <div className="clan-heading">
                            <span className="clan-eyebrow">خريطة {number(t.realmIndex)} · المحطة {number(index + 1)} · {outlineContent(unlocked ? "صرح مدشّن مبارك " : isBuilding ? `${stageInfo.icon} ${stageInfo.name} (${number(progressPct)}٪)` : 'مغلقة')}</span>
                            {dom && (
                              <span className={`clan-heat-badge ${dom.heatLevel >= 70 ? 'heat-fire' : dom.heatLevel >= 30 ? 'heat-contested' : 'heat-calm'}`}>
                                {dom.heatLevel >= 70 ? <><Flame size={12} /> اشتعال {number(dom.heatLevel)}٪</> : dom.heatLevel >= 30 ? `تنافس ${number(dom.heatLevel)}٪` : 'هادئ'}
                              </span>
                            )}
                          </div>
                          <h2>{t.name}</h2>
                          <p>{t.description}</p>
                          {dominant && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f3dfa7', margin: '4px 0 8px' }}>
                              <span>القافلة الأكثر إسهاماً:</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                                {renderBadge(dominant.clanBadge, 'w-4 h-4')} {dominant.clanName} ({number(dominant.sharePercent)}٪)
                              </span>
                            </div>
                          )}
                          <div className="clan-heading">
                            <span>{number(t.cost)} نقطة</span>
                            <span className="clan-reward">+{number(t.capacityBonus)} مقاعد</span>
                          </div>
                        </div>
                        {unlocked ? <CheckCircle2 size={19} color="#78dfa2" /> : isBuilding ? <Clock size={19} color="#fce49c" /> : <Lock size={16} />}
                      </article>
                    );
                  })}
                </div>
              </>
            )
          )}
          {tab === 'discover' && <><div className="clan-section-title"><span className="clan-eyebrow">مساحات للصحبة والتعاون</span><h1>اكتشف القوافل</h1><p>أعلى ٥٠ رَكْباً حسب مجموع نقاط التطبيق. الترتيب يتأثر بعدد الأعضاء ومدة المشاركة.</p></div><label className="clan-search"><Search size={20} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باسم الرَّكْب أو معرّفه" aria-label="البحث في القوافل المعروضة" />{search && <button className="clan-icon-button" aria-label="مسح البحث" onClick={() => setSearch('')}><X size={16} /></button>}</label>{!listReady ? <p role="status">جارٍ تحميل القوافل…</p> : visibleClans.length === 0 ? <div className="clan-empty"><Search size={32} /><h2>{search ? 'لا توجد نتيجة ضمن القوافل المعروضة' : 'كن بداية صحبة طيبة'}</h2><p>{search ? 'جرّب اسمًا آخر أو امسح البحث.' : 'أسّس رَكْباً وادعُ أصحابك للمشاركة.'}</p><button className="clan-secondary" onClick={() => search ? setSearch('') : setCreate(true)} disabled={!search && !!clanId}>{search ? 'مسح البحث' : 'تأسيس رَكْب'}</button></div> : visibleClans.map(c => {
            const policy: ClanJoinPolicy = c.joinPolicy || (c.isPrivate ? 'passcode' : 'open');
            const policyLabel = policy === 'passcode' ? "· برمز دعوة " : policy === 'approval' ? "· بموافقة القائد " : policy === 'hybrid' ? "· رمز أو طلب " : "· عامة ";
            const isPendingForThis = userPendingRequest?.clanId === c.id;
            const isMyCurrentClan = clanId === c.id;
            const isLeaderOfThisClan = myClan?.id === c.id && myClan?.leaderId === user.uid;

            return (
              <article className="clan-card" key={c.id}>
                <div className="clan-heading">
                  <div className="clan-top-title">
                    <span className="clan-list-badge">{outlineContent(renderBadge(c.badgeIcon))}</span>
                    <div>
                      <h2>{c.name}</h2>
                      <small>{number(c.memberCount)} / {number(c.maxCapacity || 10)} رفقاء {policyLabel}{outlineContent(isLeaderOfThisClan ? " · أنت قائد الرَّكْب " : '')}</small>
                      {c.twinClanName && (
                        <div style={{ marginTop: 2 }}>
                          <span className="clan-twin-badge" style={{ fontSize: 10, padding: '2px 8px' }}>
                            
                            <OutlineIcon name="handheart" /> متآخٍ مع {c.twinClanName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="clan-reward">{number(c.totalPoints)} نقطة</span>
                </div>
                <p>{c.description || 'صحبة تتعاون على الخير.'}</p>
                <div className="clan-actions" style={{ marginTop: 10 }}>
                  <button
                    className="clan-secondary"
                    disabled={busy || !online || (!isLeaderOfThisClan && !!clanId && !isMyCurrentClan) || (c.memberCount >= (c.maxCapacity || 10) && !isMyCurrentClan && !isPendingForThis)}
                    onClick={() => {
                      if (isMyCurrentClan) go('home');
                      else if (!clanId) {
                        setJoining(c); setPasscode(''); setJoinMessage(''); setJoinMode(policy === 'hybrid' ? 'passcode' : 'request');
                      } else {
                        go('home');
                      }
                    }}
                  >
                    {outlineContent(isMyCurrentClan
                      ? 'اذهب إلى رَكْبي'
                      : isPendingForThis
                      ? "طلبك قيد المراجعة "
                      : c.memberCount >= (c.maxCapacity || 10)
                      ? 'السعة مكتملة'
                      : clanId
                      ? 'أنت منضم لرَكْب آخر'
                      : policy === 'approval'
                      ? "إرسال طلب انضمام "
                      : 'انضم لهذه الصحبة')}
                  </button>
                  {myClan && myClan.leaderId === user.uid && !isMyCurrentClan && myClan.twinStatus !== 'active' && c.twinStatus !== 'active' && (
                    <button
                      className="clan-secondary"
                      style={{ flex: 'none', width: 'auto', padding: '0 12px', borderColor: '#f59e0b', color: '#f59e0b', fontSize: 12, fontWeight: 700 }}
                      onClick={() => setTwinningTargetClan(c)}
                      disabled={busy || myClan.twinStatus === 'pending_sent'}
                      title="طلب مؤاخاة وتشييد صرح خيري مشترك"
                    >
                      
                      <OutlineIcon name="handheart" /> طلب مؤاخاة
                    </button>
                  )}
                  {isLeaderOfThisClan && (
                    <button
                      className="clan-danger-btn"
                      title="تفكيك وحل هذا الرَّكْب نهائياً (بصفتك القائد)"
                      onClick={() => setClanToDelete(c)}
                      style={{
                        flex: 'none',
                        width: 'auto',
                        padding: '0 14px',
                        background: '#feebe7',
                        color: '#b72b14',
                        border: '1px solid #f8b4a5',
                        borderRadius: 14,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={16} />
                      <span>حل الرَّكْب</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}</>}
          {tab === 'rules' && <><div className="clan-section-title"><span className="clan-eyebrow">واضحة من أول خطوة</span><h1>دليل الرَّكْب</h1><p>قواعد تصف ما يحدث فعلًا داخل قوافل الخير.</p></div>{[
            ['النية أولًا', 'هذه مساحة للتشجيع على التعاون والاستمرار في الطاعة. النقاط والمعالم رموز داخل التطبيق، وليست تقديرًا للأجر أو ميزانًا للتدين. لا ضغط لتعويض يوم فاتك.'],
            ['كيف نشارك؟', 'تنضم إلى رَكْب واحد، وجميع مساهماتك في التحديات تُحتسب تلقائياً وبذكاء عند تلاوتك في المصحف، أو تسبيحك بالمسبحة، أو استماعك للإذاعة، أو صلاتك على النبي داخل التطبيق.'],
            ['حساب النقاط', 'نقاط الطاعات المعتمدة في التطبيق تُضاف للرَّكْب أثناء عضويتك. التحديات تتحدث تلقائياً مع طاعاتك؛ وعند اكتمال الهدف يحصل الرَّكْب على مكافأته مرة واحدة.'],
            ['أهداف مستمرة ومواقيت', 'التحديات تستمر حتى اكتمالها، وبعض التحديات يرتبط بمواقيت مباركة محددة مثل تحدي سورة الكهف في يوم الجمعة.'],
            ['طاعات بلا حدود', 'لا يوجد أي حد أو سقف لاحتساب طاعاتك خلال اليوم؛ كل صفحة قرآن تقرؤها، وكل دقيقة إذاعة، وكل تسبيحة أو صلاة على النبي ﷺ تذكرها تُحتسب كاملة لصالح رَكْبك بلا أي سقف وبلا قيود.'],
            ['فتح المعالم والواحات', 'يبدأ الرَّكْب بعشرة مقاعد وتزداد سعته مع كل فتح. لا يوجد حد أدنى لعدد الأعضاء؛ تفتح المعالم والمدن بالنقاط المليونية المجمعة من طاعات أفراد الرَّكْب بمجرد بلوغ رصيد الرَّكْب للنقاط المطلوبة.'],
            ['القيادة والمغادرة', 'يمكن للقائد نقل القيادة لرفيق حالي. ينقل القائد القيادة قبل مغادرة رَكْب به رفقاء آخرون. المغادرة لا تخصم مساهماتك القديمة من رصيد الرَّكْب، ولا تنقلها لرَكْب آخر.'],
            ['الحفظ والاتصال', 'المساهمات التلقائية تُرسل إلى الرَّكْب عند توفر اتصال بالإنترنت. استمر في وردك وسيتكفل التطبيق بحفظ الأثر الطيب.']
          ].map(([title, body], i) => <section className="clan-card" key={title}><span className="clan-eyebrow">{number(i + 1)} / الدليل</span><h2>{title}</h2><p>{body}</p></section>)}</>}
        </>}
      </main>
      <nav className="clan-nav" aria-label="أقسام قوافل الخير">{tabs.map(t => <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}><t.icon size={21} /><span>{t.label}</span>{tab === t.id && <i />}</button>)}</nav>
    </div>
    {create && <Modal title="تأسيس رَكْب مبارك" busy={busy} close={() => setCreate(false)}>
      <form onSubmit={e => {
        e.preventDefault();
        act(async () => {
          const id = await clanService.createClan(user.uid, user.displayName || 'رفيق الخير', {
            name,
            description,
            badgeIcon: badge,
            bannerColor: createColor,
            isPrivate: createIsPrivate,
            joinPasscode: createPasscode,
            joinPolicy: createJoinPolicy
          }, getCachedXP(user.uid) || 0);
          setClanId(id);
          setCreate(false);
          go('home');
          setNotice('تأسّس رَكْبك بنجاح! شارك معرّفه مع أصحابك.');
        });
      }}>
        <p>رَكْب جديد يبدأ بـ ١٠ مقاعد. يمكنك دعوة أصحابك باستخدام معرّفه.</p>
        <label>
          اسم الرَّكْب
          <input required minLength={3} maxLength={32} value={name} onChange={e => setName(e.target.value)} placeholder="مثل: رَكْب الهدى" />
        </label>
        <label>
          كلمة تعبّر عنكم
          <textarea maxLength={160} value={description} onChange={e => setDescription(e.target.value)} placeholder="خطوة صغيرة كل يوم، معًا" />
        </label>
        <fieldset>
          <legend>شعار الرَّكْب (اختر من الشعارات المميزة)</legend>
          <div className="clan-logo-picker">
            {CLAN_LOGOS.map((l, idx) => (
              <button
                type="button"
                key={l}
                className={`clan-logo-btn ${badge === l ? 'is-active' : ''}`}
                onClick={() => setBadge(l)}
                title={`شعار رقم ${idx + 1}`}
              >
                <img src={l} alt="" />
              </button>
            ))}
          </div>
        </fieldset>
          <fieldset>
            <legend>راية وهوية الرَّكْب</legend>
            <div className="clan-color-picker">
              {CLAN_BANNER_COLORS.map(c => (
                <button
                  type="button"
                  key={c.id}
                  className={`clan-color-swatch ${createColor === c.gradient ? 'is-active' : ''}`}
                  style={{ background: c.gradient }}
                  onClick={() => setCreateColor(c.gradient)}
                >
                  {createColor === c.gradient && <Check size={14} />} {c.name}
                </button>
              ))}
            </div>
            {/* Live Dynamic Preview of Clan Banner */}
            <div
              className={`clan-hero-preview ${isDarkColor(createColor) ? 'is-dark-banner' : 'is-light-banner'}`}
              style={{
                background: createColor,
                padding: '16px 18px',
                borderRadius: 18,
                marginTop: 10,
                border: isDarkColor(createColor) ? '1px solid rgba(255,255,255,0.2)' : '1px solid #b8e2cc',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
              }}
            >
              <span style={{ fontSize: 10.5, fontWeight: 700, color: isDarkColor(createColor) ? '#fde68a' : '#854d0e', display: 'block', marginBottom: 4 }}>
                
                معاينة هوية الرَّكْب الحية <OutlineIcon name="sparkles" />
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, flexShrink: 0 }}>{outlineContent(renderBadge(badge || "icon:leaf"))}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ fontSize: 17, color: isDarkColor(createColor) ? '#ffffff' : '#0f291e', display: 'block', textShadow: isDarkColor(createColor) ? '0 1px 6px rgba(0,0,0,0.5)' : 'none' }}>
                    {name || 'اسم الرَّكْب المبارك'}
                  </strong>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: isDarkColor(createColor) ? 'rgba(255,255,255,0.9)' : '#244234', lineHeight: 1.4, textShadow: isDarkColor(createColor) ? '0 1px 4px rgba(0,0,0,0.4)' : 'none' }}>
                    {description || 'وصف الرَّكْب والرسالة الإيمانية'}
                  </p>
                </div>
              </div>
            </div>
          </fieldset>
          {/* Join Policy Selection Grid */}
          <fieldset>
            <legend>طريقة الانضمام إلى الرَّكْب</legend>
            <div className="clan-policy-grid">
              <button
                type="button"
                className={`clan-policy-card ${createJoinPolicy === 'open' ? 'is-active' : ''}`}
                onClick={() => setCreateJoinPolicy('open')}
              >
                <span className="clan-policy-icon"><OutlineIcon name="circle" /></span>
                <strong className="clan-policy-title">مفتوح للجميع</strong>
                <span className="clan-policy-desc">انضمام فوري لأي رفيق دون شروط</span>
              </button>
              <button
                type="button"
                className={`clan-policy-card ${createJoinPolicy === 'passcode' ? 'is-active' : ''}`}
                onClick={() => setCreateJoinPolicy('passcode')}
              >
                <span className="clan-policy-icon"><OutlineIcon name="lock" /></span>
                <strong className="clan-policy-title">برقم سري فقط</strong>
                <span className="clan-policy-desc">الدخول لمن يملك الرمز السري</span>
              </button>
              <button
                type="button"
                className={`clan-policy-card ${createJoinPolicy === 'approval' ? 'is-active' : ''}`}
                onClick={() => setCreateJoinPolicy('approval')}
              >
                <span className="clan-policy-icon"><OutlineIcon name="mail" /></span>
                <strong className="clan-policy-title">بموافقة القائد</strong>
                <span className="clan-policy-desc">يرسل الراغب طلباً وتراجعه أنت</span>
              </button>
              <button
                type="button"
                className={`clan-policy-card ${createJoinPolicy === 'hybrid' ? 'is-active' : ''}`}
                onClick={() => setCreateJoinPolicy('hybrid')}
              >
                <span className="clan-policy-icon"><OutlineIcon name="key" /></span>
                <strong className="clan-policy-title">مشترك (رمز أو طلب)</strong>
                <span className="clan-policy-desc">بالرمز فوراً أو بإرسال طلب</span>
              </button>
            </div>
          </fieldset>

          {(createJoinPolicy === 'passcode' || createJoinPolicy === 'hybrid') && (
            <div style={{ background: 'var(--clan-stats-bg)', padding: 12, borderRadius: 14, border: '1px solid var(--clan-line)' }}>
              <label style={{ margin: 0 }}>
                الرقم السري للانضمام (PIN)
                <input
                  type="text"
                  required
                  minLength={4}
                  maxLength={12}
                  value={createPasscode}
                  onChange={e => setCreatePasscode(e.target.value)}
                  placeholder="مثال: 1234 أو كود سري"
                  autoComplete="off"
                />
              </label>
            </div>
          )}
        {error && <p role="alert" className="clan-inline-error">{error}</p>}
        <button className="clan-primary" disabled={busy || !online}>{busy ? 'جارٍ التأسيس…' : 'أسّس الرَّكْب'}</button>
      </form>
    </Modal>}
    {joining && (() => {
      const policy: ClanJoinPolicy = joining.joinPolicy || (joining.isPrivate ? 'passcode' : 'open');
      const isPending = userPendingRequest?.clanId === joining.id;

      return (
        <Modal title={`الانضمام إلى «${joining.name}»`} busy={busy} close={() => { setJoining(null); setError(''); }}>
          {isPending ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <span style={{ fontSize: 38, display: 'block', marginBottom: 10 }}><OutlineIcon name="clock" /></span>
              <h3 style={{ fontSize: 16, margin: '0 0 8px', color: 'var(--clan-text)' }}>طلب انضمامك قيد المراجعة</h3>
              <p style={{ fontSize: 13, color: 'var(--clan-muted)', margin: '0 0 18px', lineHeight: 1.6 }}>
                لقد أرسلت بالفعل طلب انضمام إلى رَكْب «{joining.name}». يراجع قائد الرَّكْب الطلبات وسينضم حسابك فور قبوله.
              </p>
              <button
                type="button"
                className="clan-danger"
                disabled={busy || !online}
                onClick={() => act(async () => {
                  await clanService.cancelJoinRequest(joining.id, user.uid);
                  setUserPendingRequest(null);
                  setNotice('تم إلغاء وسحب طلب الانضمام.');
                  setJoining(null);
                })}
              >
                إلغاء وسحب طلب الانضمام
              </button>
            </div>
          ) : (
            <form onSubmit={e => {
              e.preventDefault();
              act(async () => {
                if (policy === 'approval' || (policy === 'hybrid' && joinMode === 'request')) {
                  const res = await clanService.requestToJoinClan(
                    joining.id,
                    user.uid,
                    user.displayName || 'رفيق الخير',
                    joinMessage,
                    getCachedXP(user.uid) || 0
                  );
                  setUserPendingRequest({ clanId: joining.id, clanName: joining.name });
                  setJoining(null);
                  setNotice(res.message);
                } else {
                  await clanService.joinClan(
                    joining.id,
                    user.uid,
                    user.displayName || 'رفيق الخير',
                    passcode,
                    getCachedXP(user.uid) || 0
                  );
                  setClanId(joining.id);
                  setJoining(null);
                  go('home');
                  setNotice('أهلًا بك في صحبتك الجديدة المباركة.');
                }
              });
            }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--clan-muted)' }}>
                تبدأ مساهمتك من الآن، ورصيدك الشخصي السابق يبقى محفوظاً لك.
              </p>

              {policy === 'hybrid' && (
                <div className="clan-segment" style={{ marginBottom: 14 }}>
                  <button
                    type="button"
                    aria-pressed={joinMode === 'passcode'}
                    onClick={() => { setJoinMode('passcode'); setError(''); }}
                  >
                    
                    <OutlineIcon name="key" /> الدخول بالرمز السري
                  </button>
                  <button
                    type="button"
                    aria-pressed={joinMode === 'request'}
                    onClick={() => { setJoinMode('request'); setError(''); }}
                  >
                    
                    <OutlineIcon name="mail" /> إرسال طلب انضمام
                  </button>
                </div>
              )}

              {(policy === 'passcode' || (policy === 'hybrid' && joinMode === 'passcode')) && (
                <label>
                  رمز الانضمام السري (PIN)
                  <input
                    type="password"
                    required
                    autoComplete="off"
                    value={passcode}
                    onChange={e => setPasscode(e.target.value)}
                    placeholder="اكتب رمز الرَّكْب السري"
                  />
                </label>
              )}

              {(policy === 'approval' || (policy === 'hybrid' && joinMode === 'request')) && (
                <div>
                  <label>
                    رسالة تعريفية إلى قائد الرَّكْب (اختياري)
                    <textarea
                      maxLength={160}
                      rows={3}
                      value={joinMessage}
                      onChange={e => setJoinMessage(e.target.value)}
                      placeholder="اكتب كلمة طيبة أو سبب رغبتك بالانضمام لهذه الصحبة…"
                    />
                  </label>
                  <small style={{ color: 'var(--clan-muted)', display: 'block', marginTop: 4 }}>
                    سيصل طلبك لقائد الرَّكْب مع رصيد طاعاتك الحالي لمراجعته والموافقة عليه.
                  </small>
                </div>
              )}

              {error && <p role="alert" className="clan-inline-error">{error}</p>}

              <button className="clan-primary" disabled={busy || !online} style={{ marginTop: 14 }}>
                {busy ? (
                  <><Loader2 className="clan-spin" size={17} /> جارٍ التنفيذ…</>
                ) : policy === 'approval' || (policy === 'hybrid' && joinMode === 'request') ? (
                  <><Plus size={17} />  إرسال طلب الانضمام <OutlineIcon name="mail" /></>
                ) : (
                  <><Check size={18} /> تأكيد الانضمام</>
                )}
              </button>
            </form>
          )}
        </Modal>
      );
    })()}
    {leaving && myClan && <Modal title="القيادة والمغادرة" busy={busy} close={() => setLeaving(false)}><p>مساهماتك السابقة ستبقى ضمن رصيد الرَّكْب بعد مغادرتك.</p>{myClan.leaderId === user.uid && myClan.memberCount > 1 && <><label>انقل القيادة أولًا<select value={successor} onChange={e => setSuccessor(e.target.value)}><option value="">اختر رفيقاً</option>{members.filter(m => m.id !== user.uid).map(m => <option value={m.id} key={m.id}>{m.name}</option>)}</select></label><button className="clan-secondary" disabled={busy || !successor} onClick={() => act(async () => { await clanService.transferLeadership(myClan.id, successor); setNotice('تم نقل القيادة بنجاح.'); setLeaving(false); })}>تأكيد نقل القيادة</button></>}{error && <p role="alert" className="clan-inline-error">{error}</p>}<button className="clan-danger" disabled={busy || myClan.leaderId === user.uid && myClan.memberCount > 1} onClick={() => act(async () => { await clanService.leaveClan(myClan.id, user.uid); setClanId(null); setLeaving(false); setNotice('تمت مغادرة الرَّكْب.'); })}>{busy ? 'جارٍ الحفظ…' : 'تأكيد المغادرة'}</button>{myClan.leaderId === user.uid && <div style={{ marginTop: 18, borderTop: '1px solid var(--clan-line)', paddingTop: 14 }}><label style={{ color: '#d9381e', fontWeight: 700 }}>صلاحية قائد الرَّكْب:</label><p style={{ fontSize: 12, margin: '4px 0 10px', color: 'var(--clan-muted)' }}>بصفتك قائد الرَّكْب، يمكنك تفكيك وحل الرَّكْب نهائياً وإلغاء تسجيله من التطبيق.</p><button className="clan-danger" style={{ background: '#d9381e', color: '#ffffff', border: 0, marginTop: 4 }} onClick={() => { setLeaving(false); setClanToDelete(myClan); }}><Trash2 size={16} /> تفكيك وحل رَكْبي نهائياً</button></div>}</Modal>}
    {quest && <Modal title={quest.title} busy={busy} close={() => setQuest(null)}><p>{quest.description}</p><div className="clan-message">سجّل ما أنجزته فعلًا ولم تسجّله من قبل. لا تُمنح نقاط شخصية بمجرد الضغط.</div>{(quest.targetType === 'audio_minutes' ? !!onOpenRadio : ['quran_pages', 'collective_khatma'].includes(quest.targetType) && !!onOpenQuran) && <button className="clan-secondary" disabled={busy} onClick={() => openWorship(quest)}>{quest.targetType === 'audio_minutes' ? <Headphones size={18} /> : <BookOpen size={18} />}{quest.targetType === 'audio_minutes' ? 'افتح الإذاعة' : quest.id === 'quest_kahf_friday' ? 'افتح سورة الكهف' : 'افتح المصحف'} · سجّل مساهمتك بعد العودة</button>}
      {['salawat', 'tasbeeh'].includes(quest.targetType) && <button disabled={busy} className="clan-counter" onClick={() => setAmount(String(Number(amount) + 1))}><span>{quest.targetType === 'salawat' ? 'اللهم صلِّ وسلم على نبينا محمد' : 'سبحان الله وبحمده'}</span><strong>{number(Number(amount))}</strong><small>اضغط بعد كل مرة · عدّاد مساعد</small></button>}
      <form onSubmit={e => { e.preventDefault(); saveContribution(); }}><label>{quest.targetType === 'collective_khatma' ? 'مشاركتي في هذا الهدف (مرة واحدة)' : `المقدار المنجز · ${QUEST_UNITS[quest.targetType]}`}<input type="number" inputMode="numeric" min={1} max={quest.targetType === 'collective_khatma' ? 1 : undefined} step={1} required disabled={busy || quest.targetType === 'collective_khatma'} value={amount} onChange={e => { setAmount(e.target.value); setConfirmed(false); }} /></label><label className="clan-check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy} />أنجزت هذا المقدار ولم أسجّله من قبل.</label>{error && <p role="alert" className="clan-inline-error">{error}</p>}<button className="clan-primary" disabled={busy || !online || !confirmed || Number(amount) < 1}>{busy ? <><Loader2 className="clan-spin" size={17} />جارٍ الحفظ…</> : <><Check size={18} />حفظ المساهمة</>}</button><p className="clan-footnote">إذا تجاوزت المساهمة المتبقي من الهدف، يُحتسب المتبقي فقط.</p></form>
    </Modal>}
    {selectedTerritory && (
      <Modal
        title={`معلم: ${selectedTerritory.name} ${selectedTerritory.icon}`}
        busy={busy}
        close={() => setSelectedTerritory(null)}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <p style={{ margin: 0 }}>{selectedTerritory.description}</p>
          <div className="clan-stats">
            <div><strong>{number(selectedTerritory.cost)}</strong><span>نقاط الفتح المطلوبة</span></div>
            <div><strong>+{number(selectedTerritory.capacityBonus)}</strong><span>زيادة سعة الأعضاء</span></div>
            <div><strong>{number(selectedTerritory.buildDurationHours)} س</strong><span>مدة التشييد</span></div>
          </div>
          {(() => {
            const dom = territoriesDominance[selectedTerritory.id];
            const dominant = dom?.dominantClan;
            const myClanUnlocked = Boolean(myClan?.unlockedTerritories?.includes(selectedTerritory.id));
            const myClanProject = myClan?.territoryProjects?.[selectedTerritory.id];
            const myClanBuilding = Boolean(myClanProject && !myClanProject.isCompleted);
            const remH = myClanProject ? getProjectRemainingHours(myClanProject) : 0;
            const progressPct = myClanUnlocked ? 100 : myClanProject ? getProjectProgressPercent(myClanProject) : 0;
            const stageInfo = getConstructionStage(progressPct);
            const quranAyah = TERRITORY_QURAN_AYAHS[selectedTerritory.id];

            return (
              <>
                {/* Dynamic Construction Stage Card (3 Stages) */}
                <div className={`clan-construction-stage-card ${stageInfo.visualTheme}`}>
                  <div className="clan-stage-header">
                    <div className="clan-stage-icon-wrap">
                      <span className="clan-stage-big-icon">{outlineContent(stageInfo.icon)}</span>
                    </div>
                    <div className="clan-stage-info-text">
                      <span className="clan-stage-badge">{outlineContent(stageInfo.badge)}</span>
                      <h4 className="clan-stage-title">المرحلة {number(stageInfo.stage)}: {stageInfo.name}</h4>
                      <p className="clan-stage-sub">{stageInfo.subtitle}</p>
                    </div>
                    <span className="clan-stage-pct-pill">{number(progressPct)}٪</span>
                  </div>

                  <p className="clan-stage-desc">{stageInfo.description}</p>

                  {/* 3-Step Visual Progress Track */}
                  <div className="clan-stage-steps-track">
                    <div className="clan-stage-steps-line">
                      <div
                        className="clan-stage-steps-line-fill"
                        style={{ width: `${Math.min(100, Math.max(0, (progressPct / 100) * 100))}%` }}
                      />
                    </div>

                    <div className={`clan-stage-step-item ${stageInfo.stage >= 1 ? (stageInfo.stage > 1 ? 'is-done' : 'is-active') : ''}`}>
                      <div className="clan-stage-step-dot">{outlineContent(stageInfo.stage > 1 ? "icon:check" : '١')}</div>
                      <div className="clan-stage-step-label">وضع الأساسات</div>
                      <div className="clan-stage-step-sub">0% - 30%</div>
                    </div>

                    <div className={`clan-stage-step-item ${stageInfo.stage >= 2 ? (stageInfo.stage > 2 ? 'is-done' : 'is-active') : ''}`}>
                      <div className="clan-stage-step-dot">{outlineContent(stageInfo.stage > 2 ? "icon:check" : '٢')}</div>
                      <div className="clan-stage-step-label">ارتفاع الصرح</div>
                      <div className="clan-stage-step-sub">31% - 80%</div>
                    </div>

                    <div className={`clan-stage-step-item ${stageInfo.stage >= 3 ? 'is-done is-active' : ''}`}>
                      <div className="clan-stage-step-dot">{outlineContent(stageInfo.stage >= 3 ? "icon:sparkles" : '٣')}</div>
                      <div className="clan-stage-step-label">التدشين والاكتمال</div>
                      <div className="clan-stage-step-sub">100%</div>
                    </div>
                  </div>
                </div>

                {/* Blessed Quran Ayah for Completed Landmark */}
                {myClanUnlocked && quranAyah && (
                  <div className="clan-quran-ayah-box">
                    <div className="clan-quran-ayah-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                    <div className="clan-quran-ayah-text">﴿{quranAyah.text}﴾</div>
                    <div className="clan-quran-ayah-ref">سورة {quranAyah.surah} · آية {number(quranAyah.ayahNumber)}</div>
                  </div>
                )}

                {/* Exclusive Spiritual Perk & Unlocked Content Card */}
                {(() => {
                  const exclusivePerk = TERRITORY_EXCLUSIVE_PERKS[selectedTerritory.id];
                  if (!exclusivePerk) return null;

                  return (
                    <div className={`clan-exclusive-perk-card ${myClanUnlocked ? 'is-unlocked' : 'is-locked'}`}>
                      <div className="clan-perk-header">
                        <div className="clan-perk-icon-wrap">
                          <span>{outlineContent(exclusivePerk.icon)}</span>
                        </div>
                        <div className="clan-perk-title-wrap">
                          <div className="clan-perk-badge-row">
                            <span className="clan-perk-badge">{outlineContent(exclusivePerk.badge)}</span>
                            <span className={`clan-perk-status-tag ${myClanUnlocked ? 'unlocked' : 'locked'}`}>
                              {outlineContent(myClanUnlocked ? "مُفعّلة لرَكْبكم " : " ميزة حصرية مقفلة")}
                            </span>
                          </div>
                          <h4 className="clan-perk-title">{exclusivePerk.title}</h4>
                          <p className="clan-perk-tagline">{exclusivePerk.tagline}</p>
                        </div>
                      </div>

                      <div className="clan-perk-desc">
                        {exclusivePerk.description}
                      </div>

                      <div className="clan-perk-meta-grid">
                        <div className="clan-perk-meta-item">
                          <strong>الأثر الإيماني:</strong>
                          <span>{exclusivePerk.spiritualBenefit}</span>
                        </div>
                        <div className="clan-perk-meta-item">
                          <strong>الأثر التنافسي:</strong>
                          <span>{exclusivePerk.mechanic}</span>
                        </div>
                      </div>

                      {myClanUnlocked && (
                        <button
                          className="clan-perk-action-btn"
                          onClick={() => {
                            setSelectedTerritory(null);
                            setActivePerkModal(exclusivePerk);
                          }}
                        >
                          <Sparkles size={15} />
                          {exclusivePerk.actionLabel}
                        </button>
                      )}
                    </div>
                  );
                })()}

                <div className="clan-heat-row">
                  <span style={{ fontSize: 12, color: 'var(--clan-muted)' }}>مستوى الاشتعال والتنافس:</span>
                  <span className={`clan-heat-badge ${dom && dom.heatLevel >= 70 ? 'heat-fire' : dom && dom.heatLevel >= 30 ? 'heat-contested' : 'heat-calm'}`}>
                    {dom && dom.heatLevel >= 70 ? <><Flame size={13} /> تنافس ناري محتدم ({number(dom.heatLevel)}٪)</> : dom && dom.heatLevel >= 30 ? `تنافس نشط (${number(dom.heatLevel)}٪)` : 'أجواء هادئة'}
                  </span>
                </div>
                <div className="clan-dominant-highlight">
                  <small style={{ color: 'var(--clan-eyebrow)', display: 'block', fontWeight: 700, marginBottom: 4 }}>القافلة الأكثر إسهاماً ونفوذاً:</small>
                  {dominant ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{renderBadge(dominant.clanBadge)}</span>
                      <div>
                        <strong style={{ fontSize: 15, color: 'var(--clan-text)' }}>{dominant.clanName}</strong>
                        <div style={{ fontSize: 11, color: 'var(--clan-muted)' }}>تتقدم بنسبة {number(dominant.sharePercent)}٪ من إجمالي مساهمات القوافل نحو هذا المعلم</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--clan-muted)' }}>لم يسبق أي رَكْب إلى هذا المعلم بعد. فرصة رَكْبكم ليكون الأول!</div>
                  )}
                </div>
                {dom && dom.contestingClans.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, margin: '6px 0 10px', color: 'var(--clan-text)' }}>خريطة المنافسة والاستحواذ:</h3>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {dom.contestingClans.slice(0, 5).map((c, i) => (
                        <div className="clan-dominance-row" key={c.clanId}>
                          <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{renderBadge(c.clanBadge)}</span>
                          <div className="clan-dominance-bar-container">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                              <strong>{c.clanName} {c.clanId === myClan?.id ? ' (قبيلتكم)' : ''}</strong>
                              <span style={{ color: 'var(--clan-eyebrow)', fontWeight: 700 }}>{number(c.influenceShare)}٪ {outlineContent(c.isUnlocked ? " مفتوح" : c.isBuilding ? " قيد البناء" : '')}</span>
                            </div>
                            <div className="clan-dominance-bar-bg">
                              <div
                                className="clan-dominance-bar-fill"
                                style={{
                                  width: `${c.influenceShare}%`,
                                  background: i === 0 ? 'linear-gradient(90deg, #1f7747, #5cb884)' : 'linear-gradient(90deg, #3d7e5d, #8bbba3)'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="clan-my-status-box">
                  <div className="clan-heading">
                    <span className="clan-eyebrow">موقف قبيلتكم من هذا المعلم</span>
                    {myClanUnlocked ? (
                      <span style={{ color: 'var(--clan-brand-color)', fontWeight: 700, fontSize: 12 }}><OutlineIcon name="check" /> مفتوح ومدشّن بالكامل <OutlineIcon name="sparkles" /></span>
                    ) : myClanBuilding ? (
                      <span style={{ color: 'var(--clan-timer-pill-color)', fontWeight: 700, fontSize: 12 }}>{outlineContent(stageInfo.icon)} {stageInfo.name} ({formatRemainingHours(remH)})</span>
                    ) : (
                      <span style={{ color: 'var(--clan-muted)', fontSize: 12 }}>
                        متبقي {number(Math.max(0, selectedTerritory.cost - (myClan?.totalPoints || 0)))} نقطة للبدء
                      </span>
                    )}
                  </div>
                  {myClanBuilding && (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--clan-muted)' }}>أسرع طريقة لتقليص زمن البناء وإتمامه مع قبيلتك:</p>
                      {(myClan?.oasisKeys || 0) > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <button
                            className="clan-key-rush-btn"
                            disabled={busy}
                            onClick={() => act(async () => {
                              if (!myClan) return;
                              const userName = members.find(m => m.id === user.uid)?.name || user.displayName || 'رفيق في الرَّكْب';
                              const res = await clanService.useOasisKey(myClan.id, user.uid, userName);
                              setNotice(res.message);
                              if (res.success) {
                                confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
                              }
                            })}
                          >
                            <Sparkles size={14} />  <OutlineIcon name="sparkles" /> استخدام مفتاح واحة (-٤ ساعات فوراً) · متوفر {number(myClan?.oasisKeys || 0)}
                          </button>
                        </div>
                      )}
                      <div className="clan-speedup-actions">
                        {onOpenQuran && <button className="clan-speedup-btn" onClick={() => { setSelectedTerritory(null); onBack?.(); onOpenQuran?.(); }}><BookOpen size={14} /> تلاوة صفحة (-٣٠ د)</button>}
                        {onOpenMasbaha && <button className="clan-speedup-btn" onClick={() => { setSelectedTerritory(null); onBack?.(); onOpenMasbaha?.(); }}><Sparkles size={14} /> ١٠٠ تسبيحة (-ساعة)</button>}
                        {onOpenProphetChallenge && <button className="clan-speedup-btn" onClick={() => { setSelectedTerritory(null); onBack?.(); onOpenProphetChallenge?.(); }}><Heart size={14} /> ٥٠ صلاة على النبي (-ساعة)</button>}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </Modal>
    )}
    {clanToDelete && (
      <Modal
        title={`حل وتفكيك رَكْب «${clanToDelete.name}»`}
        busy={busy}
        close={() => setClanToDelete(null)}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ background: '#fdf0ed', border: '1px solid #f7c1b5', borderRadius: 16, padding: 14, color: '#b72b14' }}>
            <strong style={{ display: 'block', marginBottom: 6, fontSize: 14 }}><OutlineIcon name="alert" /> تحذير: هذا الإجراء نهائي ولا يمكن التراجع عنه</strong>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7 }}>
              أنت على وشك تفكيك وحل رَكْب <strong>«{clanToDelete.name}»</strong> نهائياً. سيتم إنهاء الرَّكْب وإزالته من الخريطة وقائمة القوافل، وإلغاء ارتباط الرفقاء به.
            </p>
          </div>
          {error && <p role="alert" className="clan-inline-error">{error}</p>}
          <div className="clan-actions" style={{ marginTop: 8 }}>
            <button
              className="clan-secondary"
              disabled={busy}
              onClick={() => setClanToDelete(null)}
            >
              إلغاء
            </button>
            <button
              className="clan-danger"
              style={{ background: '#d9381e', color: '#ffffff', border: 0, marginTop: 0 }}
              disabled={busy || !online}
              onClick={() => act(async () => {
                await clanService.deleteClan(clanToDelete.id, user.uid);
                if (clanId === clanToDelete.id) {
                  setClanId(null);
                  setMyClan(null);
                }
                setClanToDelete(null);
                setNotice(`تم تفكيك وحل رَكْب «${clanToDelete.name}» نهائياً.`);
              })}
            >
              {busy ? <><Loader2 className="clan-spin" size={16} /> جارٍ الحل…</> : <><Trash2 size={16} /> تأكيد تفكيك الرَّكْب</>}
            </button>
          </div>
        </div>
      </Modal>
    )}
    {selectedMember && (
      <Modal
        title="الملف الشخصي للعضو"
        busy={busy}
        close={() => setSelectedMember(null)}
      >
        {(() => {
          const levelInfo = getMemberLevel(selectedMember.contributedPoints || 0);
          const isMe = selectedMember.id === user.uid;
          const amILeader = myClan?.leaderId === user.uid;
          const isMemberLeader = selectedMember.role === 'leader' || selectedMember.id === myClan?.leaderId;
          const joinedDate = selectedMember.joinedAt?.toDate
            ? selectedMember.joinedAt.toDate().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
            : 'منذ التأسيس';

          return (
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="clan-profile-header">
                <div className="clan-profile-avatar">
                  {selectedMember.name?.slice(0, 1) || 'ص'}
                </div>
                <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
                  {selectedMember.name} {isMe ? '(أنت)' : ''}
                </h2>
                <div className="clan-profile-level-badge">
                  <Sparkles size={14} className="text-amber-500 shrink-0" />
                  <span>{levelInfo.title}</span>
                </div>
              </div>

              <div className="clan-profile-grid">
                <div className="clan-profile-stat">
                  <strong>{number(selectedMember.contributedPoints)}</strong>
                  <span>مساهمة نقاط الرَّكْب</span>
                </div>
                <div className="clan-profile-stat">
                  <strong>المستوى {number(levelInfo.level)}</strong>
                  <span>الرتبة الروحية</span>
                </div>
                <div className="clan-profile-stat">
                  <strong>{outlineContent(isMemberLeader ? "قائد الرَّكْب " : "رفيق في الرَّكْب ")}</strong>
                  <span>الصفة</span>
                </div>
                <div className="clan-profile-stat">
                  <strong>{joinedDate}</strong>
                  <span>تاريخ الانضمام</span>
                </div>
              </div>

              {(() => {
                const streakDays = Math.max(1, selectedMember.streakDays || 1);
                const streakBonus = calculateStreakMultiplier(streakDays);
                return (
                  <div className="clan-streak-banner">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Flame size={22} className="text-amber-500 shrink-0" />
                      <div>
                        <div className="clan-streak-title">مواظبة متصلة: {number(streakDays)} أيام</div>
                        <small className="clan-streak-sub">«أَدْوَمُهُ وَإِنْ قَلَّ» · {streakBonus.label}</small>
                      </div>
                    </div>
                    <span className="clan-streak-pill">
                      {outlineContent(streakBonus.badge)} مضاعف النقاط
                    </span>
                  </div>
                );
              })()}

              <div style={{ background: 'var(--clan-stats-bg)', padding: 12, borderRadius: 14, border: '1px solid var(--clan-line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                  <span>التقدم للمستوى التالي ({number(levelInfo.nextLevelPoints)} نقطة)</span>
                  <strong>{number(levelInfo.progressPercent)}٪</strong>
                </div>
                <Progress value={Math.max(0, selectedMember.contributedPoints - levelInfo.minPoints)} max={Math.max(1, levelInfo.nextLevelPoints - levelInfo.minPoints)} label="التقدم للمستوى" />
              </div>

              {(() => {
                const daysAbsent = getDaysSinceActive(selectedMember.lastActiveDate, selectedMember.lastActive);
                const isAbsent = daysAbsent >= 2 && !isMe;
                const isCheckedInRecently = Boolean(selectedMember.lastCheckedInAt && (Date.now() - selectedMember.lastCheckedInAt < 20 * 3600 * 1000));

                if (!isAbsent) return null;

                return (
                  <div className="clan-checkin-box">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 24 }}><OutlineIcon name="handheart" /></span>
                      <div style={{ flex: 1 }}>
                        <strong className="clan-streak-title" style={{ fontSize: 13, display: 'block' }}>
                          أثر الغائب · تفقّد الرفيق
                        </strong>
                        <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--clan-muted)', lineHeight: 1.5 }}>
                          انقطع هذا الرفيق منذ {number(daysAbsent)} أيام. تفقّد الرفيق رسالة مودة وسؤال ودعاء، نطمئن بها عليه ونذكّره بمكانته بين رفقائه.
                        </p>
                      </div>
                    </div>
                    <div style={{ background: 'var(--clan-stats-bg)', padding: '8px 12px', borderRadius: 10, fontSize: 11.5, marginBottom: 10, border: '1px solid var(--clan-line)', color: 'var(--clan-text)' }}>
                      
                      <OutlineIcon name="message" /> <i>"رفيقك في الرَّكْب ({user.displayName || 'رفيق بالركب'}) يفتقد أثرك ويسأل عنك، عسى المانع خيراً! مكانك في الرَّكْب محفوظ وننتظر عودتك."</i>
                    </div>
                    <button
                      className="clan-primary"
                      style={{ width: '100%', margin: 0, minHeight: 40, fontSize: 13 }}
                      disabled={busy || isCheckedInRecently}
                      onClick={() => handleCheckInMember(selectedMember)}
                    >
                      {outlineContent(isCheckedInRecently ? " تم تفقّد الرفيق اليوم (في حفظ الله)" : " إرسال تفقّد دافئ (+50 نقطة إخاء)")}
                    </button>
                  </div>
                );
              })()}

              {!isMe && <button className="clan-primary" onClick={() => openMemberChat(selectedMember.id)}><MessageCircle size={18} /> راسل الرفيق</button>}
              {isMe && (
                <div style={{ marginTop: 14, borderTop: '1px solid var(--clan-line)', paddingTop: 14 }}>
                  <button
                    className="clan-danger"
                    style={{ margin: 0, width: '100%', minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    disabled={busy}
                    onClick={() => {
                      setSelectedMember(null);
                      setLeaving(true);
                    }}
                  >
                    <LogOut size={16} /> مغادرة الرَّكْب / إدارة القيادة
                  </button>
                </div>
              )}

              {amILeader && !isMemberLeader && !isMe && (
                <div style={{ marginTop: 6, borderTop: '1px solid var(--clan-line)', paddingTop: 14 }}>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--clan-muted)' }}>
                    بصفتك قائد الرَّكْب، تملك صلاحية إخلاء مقعد الخمول ونقله لمقاعد الانتظار:
                  </p>
                  <button
                    className="clan-danger"
                    style={{ margin: 0, width: '100%', minHeight: 44 }}
                    disabled={busy}
                    onClick={() => {
                      setMemberToKick(selectedMember);
                      setSelectedMember(null);
                    }}
                  >
                    <UserMinus size={16} /> إخلاء مقعد الخمول
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    )}
    {memberToKick && myClan && (
      <Modal
        title={`إخلاء مقعد «${memberToKick.name}»`}
        busy={busy}
        close={() => setMemberToKick(null)}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ background: '#fdf0ed', border: '1px solid #f7c1b5', borderRadius: 16, padding: 14, color: '#b72b14' }}>
            <strong style={{ display: 'block', marginBottom: 6, fontSize: 14 }}><OutlineIcon name="alert" /> تأكيد إخلاء مقعد الخمول</strong>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7 }}>
              هل ترغب في إخلاء مقعد <strong>«{memberToKick.name}»</strong> واستبعاده إلى مقاعد الانتظار؟ سيتم إتاحة المقعد لرفيق جديد مواظب، مع بقاء مساهماته السابقة كاملة ضمن رصيد الرَّكْب.
            </p>
          </div>
          {error && <p role="alert" className="clan-inline-error">{error}</p>}
          <div className="clan-actions" style={{ marginTop: 8 }}>
            <button className="clan-secondary" disabled={busy} onClick={() => setMemberToKick(null)}>
              إلغاء
            </button>
            <button
              className="clan-danger"
              style={{ background: '#d9381e', color: '#ffffff', border: 0, marginTop: 0 }}
              disabled={busy || !online}
              onClick={() => act(async () => {
                await clanService.kickMember(myClan.id, user.uid, memberToKick.id);
                setMemberToKick(null);
                setNotice(`تم استبعاد «${memberToKick.name}» إلى مقاعد الانتظار وإخلاء المقعد بنجاح.`);
              })}
            >
              {busy ? <><Loader2 className="clan-spin" size={16} /> جارٍ إخلاء المقعد…</> : <><UserMinus size={16} /> تأكيد إخلاء المقعد</>}
            </button>
          </div>
        </div>
      </Modal>
    )}
    {settingsOpen && myClan && (
      <Modal
        title="إعدادات وتخصيص الرَّكْب"
        busy={busy}
        close={() => setSettingsOpen(false)}
      >
        <form onSubmit={e => {
          e.preventDefault();
          act(async () => {
            await clanService.updateClanSettings(myClan.id, user.uid, {
              name: editName,
              description: editDescription,
              badgeIcon: editBadge,
              bannerColor: editColor,
              isPrivate: editIsPrivate,
              joinPasscode: editPasscode,
              joinPolicy: editJoinPolicy
            });
            setSettingsOpen(false);
            setNotice('تم حفظ وتحديث إعدادات الرَّكْب بنجاح.');
          });
        }}>
          <label>
            اسم الرَّكْب
            <input
              required
              minLength={3}
              maxLength={32}
              value={editName}
              onChange={e => setEditName(e.target.value)}
            />
          </label>

          <label>
            وصف الرَّكْب
            <textarea
              maxLength={160}
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
            />
          </label>

          <fieldset>
            <legend>شعار الرَّكْب (اختر من الشعارات الـ 26)</legend>
            <div className="clan-logo-picker">
              {CLAN_LOGOS.map((logo, idx) => (
                <button
                  type="button"
                  key={logo}
                  className={`clan-logo-btn ${editBadge === logo ? 'is-active' : ''}`}
                  onClick={() => setEditBadge(logo)}
                  title={`شعار رقم ${idx + 1}`}
                >
                  <img src={logo} alt="" />
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>راية وهوية الرَّكْب</legend>
            <div className="clan-color-picker">
              {CLAN_BANNER_COLORS.map(c => (
                <button
                  type="button"
                  key={c.id}
                  className={`clan-color-swatch ${editColor === c.gradient ? 'is-active' : ''}`}
                  style={{ background: c.gradient }}
                  onClick={() => setEditColor(c.gradient)}
                >
                  {editColor === c.gradient && <Check size={14} />} {c.name}
                </button>
              ))}
            </div>
            {/* Live Dynamic Preview of Clan Banner */}
            <div
              className={`clan-hero-preview ${isDarkColor(editColor) ? 'is-dark-banner' : 'is-light-banner'}`}
              style={{
                background: editColor,
                padding: '16px 18px',
                borderRadius: 18,
                marginTop: 10,
                border: isDarkColor(editColor) ? '1px solid rgba(255,255,255,0.2)' : '1px solid #b8e2cc',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
              }}
            >
              <span style={{ fontSize: 10.5, fontWeight: 700, color: isDarkColor(editColor) ? '#fde68a' : '#854d0e', display: 'block', marginBottom: 4 }}>
                
                معاينة هوية الرَّكْب الحية <OutlineIcon name="sparkles" />
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, flexShrink: 0 }}>{outlineContent(renderBadge(editBadge || "icon:leaf"))}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ fontSize: 17, color: isDarkColor(editColor) ? '#ffffff' : '#0f291e', display: 'block', textShadow: isDarkColor(editColor) ? '0 1px 6px rgba(0,0,0,0.5)' : 'none' }}>
                    {editName || 'اسم الرَّكْب'}
                  </strong>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: isDarkColor(editColor) ? 'rgba(255,255,255,0.9)' : '#244234', lineHeight: 1.4, textShadow: isDarkColor(editColor) ? '0 1px 4px rgba(0,0,0,0.4)' : 'none' }}>
                    {editDescription || 'وصف الرَّكْب والرسالة الإيمانية'}
                  </p>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Join Policy Selection Grid in Settings */}
          <fieldset>
            <legend>طريقة الانضمام إلى الرَّكْب</legend>
            <div className="clan-policy-grid">
              <button
                type="button"
                className={`clan-policy-card ${editJoinPolicy === 'open' ? 'is-active' : ''}`}
                onClick={() => setEditJoinPolicy('open')}
              >
                <span className="clan-policy-icon"><OutlineIcon name="circle" /></span>
                <strong className="clan-policy-title">مفتوح للجميع</strong>
                <span className="clan-policy-desc">انضمام فوري دون شروط</span>
              </button>
              <button
                type="button"
                className={`clan-policy-card ${editJoinPolicy === 'passcode' ? 'is-active' : ''}`}
                onClick={() => setEditJoinPolicy('passcode')}
              >
                <span className="clan-policy-icon"><OutlineIcon name="lock" /></span>
                <strong className="clan-policy-title">برقم سري فقط</strong>
                <span className="clan-policy-desc">لمن يملك الرمز فقط</span>
              </button>
              <button
                type="button"
                className={`clan-policy-card ${editJoinPolicy === 'approval' ? 'is-active' : ''}`}
                onClick={() => setEditJoinPolicy('approval')}
              >
                <span className="clan-policy-icon"><OutlineIcon name="mail" /></span>
                <strong className="clan-policy-title">بموافقة القائد</strong>
                <span className="clan-policy-desc">يرسل طلباً وتراجعه أنت</span>
              </button>
              <button
                type="button"
                className={`clan-policy-card ${editJoinPolicy === 'hybrid' ? 'is-active' : ''}`}
                onClick={() => setEditJoinPolicy('hybrid')}
              >
                <span className="clan-policy-icon"><OutlineIcon name="key" /></span>
                <strong className="clan-policy-title">مشترك (رمز أو طلب)</strong>
                <span className="clan-policy-desc">بالرمز أو إرسال طلب</span>
              </button>
            </div>
          </fieldset>

          {(editJoinPolicy === 'passcode' || editJoinPolicy === 'hybrid') && (
            <div style={{ background: 'var(--clan-stats-bg)', padding: 12, borderRadius: 14, border: '1px solid var(--clan-line)' }}>
              <label style={{ margin: 0 }}>
                الرقم السري للانضمام (PIN)
                <input
                  type="text"
                  required
                  minLength={4}
                  maxLength={12}
                  value={editPasscode}
                  onChange={e => setEditPasscode(e.target.value)}
                  placeholder="مثال: 1234 أو كود خاص"
                  autoComplete="off"
                />
              </label>
            </div>
          )}

          {error && <p role="alert" className="clan-inline-error">{error}</p>}
          <button className="clan-primary" disabled={busy || !online}>
            {busy ? <><Loader2 className="clan-spin" size={17} /> جارٍ الحفظ…</> : <><Check size={18} /> حفظ التعديلات</>}
          </button>
          <div style={{ marginTop: 14, borderTop: '1px solid var(--clan-line)', paddingTop: 12, display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              className="clan-text-button"
              style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => {
                setSettingsOpen(false);
                setLeaving(true);
              }}
            >
              <LogOut size={15} /> التنازل عن القيادة أو مغادرة الرَّكْب
            </button>
          </div>
        </form>
      </Modal>
    )}
    {pendingRequestsModalOpen && myClan && (
      <Modal title={`طلبات الانضمام (${pendingRequests.length})`} busy={busy} close={() => setPendingRequestsModalOpen(false)}>
        <div style={{ display: 'grid', gap: 12 }}>
          {pendingRequests.length === 0 ? (
            <div className="clan-empty" style={{ padding: '24px 0' }}>
              <Users size={32} />
              <h2>لا توجد طلبات معلّقة</h2>
              <p>لم يتقدّم أحد بطلب انضمام حتى الآن.</p>
            </div>
          ) : pendingRequests.map(req => (
            <div key={req.userId} className="clan-req-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <span style={{ fontSize: 28 }}>{outlineContent(req.userBadge || "icon:leaf")}</span>
                <div>
                  <strong style={{ fontSize: 14 }}>{req.userName}</strong>
                  <div style={{ fontSize: 11, color: 'var(--clan-muted)', marginTop: 1 }}>
                    {req.personalXp?.toLocaleString('ar-EG') || '0'} نقطة · {outlineContent(req.message || 'بدون رسالة')}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  className="clan-req-btn-accept"
                  disabled={busy}
                  onClick={() => act(async () => {
                    await clanService.acceptJoinRequest(myClan.id, user.uid, req);
                    setNotice(`تم قبول طلب «${req.userName}» بالمشاركة في رَكْب الخير `);
                  })}
                >
                  <Check size={14} /> قبول
                </button>
                <button
                  className="clan-req-btn-reject"
                  disabled={busy}
                  onClick={() => act(async () => {
                    await clanService.rejectJoinRequest(myClan.id, user.uid, req.userId);
                    setNotice(`تم رفض طلب «${req.userName}».`);
                  })}
                >
                  <X size={14} /> رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    )}
    {selectedJointProject && twinPact && (() => {
      const jointProgressPct = Math.min(100, Math.round((selectedJointProject.totalContributed / selectedJointProject.targetPoints) * 100));
      const jointStage = getConstructionStage(jointProgressPct);
      const jointQuranAyah = TERRITORY_QURAN_AYAHS[selectedJointProject.id];

      return (
        <Modal
          title={`صرح المؤاخاة: ${selectedJointProject.name}`}
          busy={busy}
          close={() => setSelectedJointProject(null)}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <span style={{ fontSize: 48 }}>{outlineContent(selectedJointProject.icon)}</span>
              <h3 style={{ margin: '6px 0 2px', fontSize: 17, color: '#fce49c' }}>{selectedJointProject.name}</h3>
              <span style={{ fontSize: 12, color: 'var(--clan-muted)' }}>{selectedJointProject.arabicTitle}</span>
            </div>

            {/* Dynamic Stage Card */}
            <div className={`clan-construction-stage-card ${jointStage.visualTheme}`}>
              <div className="clan-stage-header">
                <div className="clan-stage-icon-wrap">
                  <span className="clan-stage-big-icon">{outlineContent(jointStage.icon)}</span>
                </div>
                <div className="clan-stage-info-text">
                  <span className="clan-stage-badge">{outlineContent(jointStage.badge)}</span>
                  <h4 className="clan-stage-title">المرحلة {number(jointStage.stage)}: {jointStage.name}</h4>
                  <p className="clan-stage-sub">{jointStage.subtitle}</p>
                </div>
                <span className="clan-stage-pct-pill">{number(jointProgressPct)}٪</span>
              </div>
              <p className="clan-stage-desc">{jointStage.description}</p>
            </div>

            {/* Quran Ayah if Completed or in Progress */}
            {jointQuranAyah && (
              <div className="clan-quran-ayah-box">
                <div className="clan-quran-ayah-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                <div className="clan-quran-ayah-text">﴿{jointQuranAyah.text}﴾</div>
                <div className="clan-quran-ayah-ref">سورة {jointQuranAyah.surah} · آية {number(jointQuranAyah.ayahNumber)}</div>
              </div>
            )}

            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>{selectedJointProject.description}</p>

            <div style={{ background: 'var(--clan-stats-bg)', padding: 12, borderRadius: 14, border: '1px solid var(--clan-line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                <span>إجمالي نقاط الإخاء المشتركة</span>
                <span style={{ color: '#86efac' }}>{number(selectedJointProject.totalContributed)} / {number(selectedJointProject.targetPoints)} ({number(jointProgressPct)}٪)</span>
              </div>
              <div className="clan-dual-progress">
                <div
                  className="clan-dual-progress-bar-1"
                  style={{ width: `${(selectedJointProject.clan1Contributed / selectedJointProject.targetPoints) * 100}%` }}
                />
                <div
                  className="clan-dual-progress-bar-2"
                  style={{ width: `${(selectedJointProject.clan2Contributed / selectedJointProject.targetPoints) * 100}%` }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                <span style={{ color: '#86efac' }}><OutlineIcon name="circle" /> {twinPact.clan1Name}: {number(selectedJointProject.clan1Contributed)} ن</span>
                <span style={{ color: '#fce49c' }}><OutlineIcon name="circle" /> {twinPact.clan2Name}: {number(selectedJointProject.clan2Contributed)} ن</span>
              </div>
            </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 12, padding: '10px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span><strong>مكافأة الإتمام:</strong> {selectedJointProject.perk}</span>
          </div>

          {twinPact.recentContributions && twinPact.recentContributions.length > 0 && (
            <div>
              <small style={{ fontWeight: 700, color: 'var(--clan-muted)', display: 'block', marginBottom: 6 }}>آخر المساهمات المشتركة للركبين:</small>
              <div style={{ display: 'grid', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                {twinPact.recentContributions.slice(0, 5).map((rc, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: 8, fontSize: 11.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><OutlineIcon name="handheart" /> <b>{rc.userName}</b> ({rc.clanName})</span>
                    <span style={{ color: '#86efac', fontWeight: 700 }}>+{number(rc.points)} ن</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {myClan?.leaderId === user.uid && (
            <div style={{ borderTop: '1px solid var(--clan-line)', paddingTop: 10, marginTop: 4 }}>
              <button
                className="clan-text-button"
                style={{ color: '#f87171', fontSize: 11 }}
                onClick={() => act(async () => {
                  const res = await clanService.cancelOrEndTwinning(twinPact.id, myClan.id, user.uid);
                  setSelectedJointProject(null);
                  setNotice(res.message);
                })}
              >
                إنهاء ميثاق المؤاخاة بسلام
              </button>
            </div>
          )}
        </div>
      </Modal>
    ); })()}
    {twinningTargetClan && myClan && (
      <Modal
        title={`طلب مؤاخاة مع «${twinningTargetClan.name}»`}
        busy={busy}
        close={() => setTwinningTargetClan(null)}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.2), rgba(15, 23, 42, 0.4))', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 14, padding: 14, color: '#f1f5f9' }}>
            <strong style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#fce49c' }}><OutlineIcon name="handheart" /> ميثاق الأخوة والتعاون على البر والتقوى</strong>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
              اقتداءً بسنة النبي ﷺ في المؤاخاة بين المؤمنين، يتحد ركابكم مع <strong>«{twinningTargetClan.name}»</strong> لإنجاز مشروع خيري مشترك على الخريطة وتوحيد الجهود بدلاً من التنافس الفردي.
            </p>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>اختر الصرح المشترك للتشييد:</label>
            <div style={{ display: 'grid', gap: 8 }}>
              {JOINT_MEGA_PROJECTS.map(proj => (
                <div
                  key={proj.id}
                  onClick={() => setSelectedJointProjectTemplateId(proj.id)}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: `1.5px solid ${selectedJointProjectTemplateId === proj.id ? '#f59e0b' : 'var(--clan-line)'}`,
                    background: selectedJointProjectTemplateId === proj.id ? 'rgba(245, 158, 11, 0.12)' : 'var(--clan-stats-bg)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}
                >
                  <span style={{ fontSize: 24 }}>{outlineContent(proj.icon)}</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13, display: 'block' }}>{proj.name}</strong>
                    <small style={{ color: 'var(--clan-muted)' }}>{proj.description} ({number(proj.targetPoints)} نقطة)</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="clan-actions" style={{ marginTop: 8 }}>
            <button className="clan-secondary" disabled={busy} onClick={() => setTwinningTargetClan(null)}>
              إلغاء
            </button>
            <button
              className="clan-primary"
              style={{ background: '#f59e0b', color: '#1a1001', fontWeight: 800 }}
              disabled={busy || !online}
              onClick={() => act(async () => {
                const res = await clanService.sendTwinningRequest(myClan.id, twinningTargetClan.id, user.uid, selectedJointProjectTemplateId);
                setTwinningTargetClan(null);
                setNotice(res.message);
              })}
            >
              
              إرسال طلب المؤاخاة <OutlineIcon name="handheart" />
            </button>
          </div>
        </div>
      </Modal>
    )}
    {activityFeedOpen && myClan && (
      <Modal
        title="قاعة المساهمين اللحظية · نفحات الرَّكْب "
        busy={busy}
        close={() => setActivityFeedOpen(false)}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.25), rgba(15, 23, 42, 0.45))', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}><OutlineIcon name="scroll" /></span>
            <div>
              <strong style={{ color: '#fce49c', fontSize: 13.5, display: 'block' }}>ميدان السباق إلى الخيرات</strong>
              <small style={{ color: 'var(--clan-muted)', fontSize: 11.5, lineHeight: 1.5 }}>
                سجل حي ومباشر لطاعات رفقاء الرَّكْب؛ تلاوة، وتسبيح، وقيام بالأسحار، وتسريع للمشاريع المباركة.
              </small>
            </div>
          </div>

          <div className="clan-activity-list">
            {activities.map((actItem, idx) => {
              const timeAgoMinutes = Math.max(1, Math.round((Date.now() - actItem.timestamp) / (1000 * 60)));
              const timeAgoText = timeAgoMinutes < 60 ? `منذ ${number(timeAgoMinutes)} دقيقة` : `منذ ${number(Math.round(timeAgoMinutes / 60))} ساعة`;

              return (
                <div className="clan-activity-card" key={actItem.id || idx}>
                  <div className="clan-activity-icon-bubble">
                    {outlineContent(actItem.icon || "icon:leaf")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="clan-activity-msg">
                      {outlineContent(actItem.message)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <span className="clan-activity-time">{timeAgoText}</span>
                      <button
                        type="button"
                        className="clan-text-button"
                        style={{ fontSize: 11, color: '#86efac', padding: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotice(`تقبل الله منا ومنكم صالح الأعمال وجزاكم خيراً `);
                        }}
                      >
                        
                        تقبّل الله <OutlineIcon name="handheart" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="clan-primary"
            style={{ width: '100%', margin: 0 }}
            onClick={() => setActivityFeedOpen(false)}
          >
            إغلاق قاعة النشاط
          </button>
        </div>
      </Modal>
    )}

    {/* ============================================================ */}
    {/* EXCLUSIVE TERRITORY PERKS INTERACTIVE MODAL */}
    {/* ============================================================ */}
    {activePerkModal && (
      <Modal
        title={`${activePerkModal.icon} ${activePerkModal.title}`}
        busy={busy}
        close={() => setActivePerkModal(null)}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          {/* Header Banner */}
          <div style={{ background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.45), rgba(15, 23, 42, 0.85))', border: '1px solid #34d399', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 28 }}>{outlineContent(activePerkModal.icon)}</span>
              <div>
                <strong style={{ fontSize: 15, color: '#f8fafc' }}>{activePerkModal.title}</strong>
                <div style={{ fontSize: 11.5, color: '#34d399', fontWeight: 700 }}>ميزة حصرية مفتوحة لرَكْبكم <OutlineIcon name="sparkles" /></div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.6 }}>{activePerkModal.description}</p>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 12px', borderRadius: 10, fontSize: 12, display: 'grid', gap: 4 }}>
            <div><strong style={{ color: '#fce49c' }}>الأثر الإيماني:</strong> <span style={{ color: '#e2e8f0' }}>{activePerkModal.spiritualBenefit}</span></div>
            <div><strong style={{ color: '#86efac' }}>الميزة التنافسية:</strong> <span style={{ color: '#e2e8f0' }}>{activePerkModal.mechanic}</span></div>
          </div>

          {/* 1. Multiplier Perk Category */}
          {activePerkModal.category === 'multiplier' && (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(16, 185, 129, 0.15))', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: 14, padding: 14, textAlign: 'center' }}>
                <span style={{ fontSize: 36, display: 'block', marginBottom: 4 }}><OutlineIcon name="sparkles" /><OutlineIcon name="sparkles" /></span>
                <strong style={{ fontSize: 16, color: '#fce49c', display: 'block' }}>مضاعفة الحسنات والنقاط نشطة</strong>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6 }}>
                  {activePerkModal.mechanic}
                </p>
              </div>

              <p style={{ fontSize: 12, color: 'var(--clan-muted)', margin: '2px 0 4px' }}>
                استفد من مضاعف الصرح الآن في طاعاتك اليومية:
              </p>

              <div style={{ display: 'grid', gap: 8 }}>
                {onOpenQuran && (
                  <button
                    className="clan-secondary"
                    style={{ justifyContent: 'flex-start', minHeight: 44 }}
                    onClick={() => {
                      setActivePerkModal(null);
                      onBack?.();
                      onOpenQuran?.();
                    }}
                  >
                    <BookOpen size={16} color="#34d399" />
                    <span>تلاوة المصحف الشريف مع المضاعف <OutlineIcon name="book" /></span>
                  </button>
                )}
                {onOpenMasbaha && (
                  <button
                    className="clan-secondary"
                    style={{ justifyContent: 'flex-start', minHeight: 44 }}
                    onClick={() => {
                      setActivePerkModal(null);
                      onBack?.();
                      onOpenMasbaha?.();
                    }}
                  >
                    <Sparkles size={16} color="#34d399" />
                    <span>المسبحة الإلكترونية ومضاعفة الأذكار <OutlineIcon name="circle" /></span>
                  </button>
                )}
                {onOpenProphetChallenge && (
                  <button
                    className="clan-secondary"
                    style={{ justifyContent: 'flex-start', minHeight: 44 }}
                    onClick={() => {
                      setActivePerkModal(null);
                      onBack?.();
                      onOpenProphetChallenge?.();
                    }}
                  >
                    <Heart size={16} color="#34d399" />
                    <span>الصلاة على النبي ﷺ بمضاعف البركة <OutlineIcon name="heart" /></span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. Speedup Perk Category */}
          {activePerkModal.category === 'speedup' && (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(16, 185, 129, 0.15))', border: '1px solid rgba(56, 189, 248, 0.35)', borderRadius: 14, padding: 14, textAlign: 'center' }}>
                <span style={{ fontSize: 36, display: 'block', marginBottom: 4 }}><OutlineIcon name="zap" /><OutlineIcon name="rocket" /></span>
                <strong style={{ fontSize: 16, color: '#38bdf8', display: 'block' }}>تسريع البناء وتخفيض الساعات مفعّل</strong>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6 }}>
                  {activePerkModal.mechanic}
                </p>
              </div>

              {activeProjectId ? (
                <div style={{ background: 'var(--clan-stats-bg)', padding: 12, borderRadius: 12, border: '1px solid var(--clan-line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span>المشروع الجاري: <strong>{activeTerritory?.name}</strong></span>
                    <span style={{ color: '#86efac' }}>متبقي {formatRemainingHours(remainingHours)}</span>
                  </div>
                  <button
                    className="clan-primary"
                    style={{ width: '100%', margin: '4px 0 0', minHeight: 42 }}
                    onClick={() => {
                      setActivePerkModal(null);
                      if (activeTerritory) setSelectedTerritory(activeTerritory);
                    }}
                  >
                    
                    معاينة تقدم التشييد وتسريعه <OutlineIcon name="zap" />
                  </button>
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 12, textAlign: 'center', fontSize: 12, color: 'var(--clan-muted)' }}>
                  لا يوجد معلم قيد التشييد حالياً؛ سيتم تطبيق خصم الساعات تلقائياً فور بدء تشييد المعلم القادم.
                </div>
              )}
            </div>
          )}

          {/* 3. Keys Perk Category */}
          {activePerkModal.category === 'keys' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.15))', border: '1px solid #f59e0b', borderRadius: 14, padding: 14, textAlign: 'center' }}>
                <span style={{ fontSize: 40, display: 'block', marginBottom: 4 }}><OutlineIcon name="sparkles" /><OutlineIcon name="sparkles" /></span>
                <strong style={{ fontSize: 16, color: '#fce49c', display: 'block' }}>خزانة مفاتيح الفتح الإيماني</strong>
                <div style={{ margin: '6px 0', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.3)', padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                  <span style={{ fontSize: 18 }}><OutlineIcon name="sparkles" /></span>
                  <strong style={{ fontSize: 15, color: '#fce49c' }}>{number(myClan?.oasisKeys || 0)} مفاتيح متاحة</strong>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6 }}>
                  {activePerkModal.mechanic}
                </p>
              </div>

              {activeProjectId && (myClan?.oasisKeys || 0) > 0 && (
                <button
                  className="clan-primary"
                  style={{ width: '100%', minHeight: 44, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#1a1001', fontWeight: 800 }}
                  disabled={busy}
                  onClick={() => act(async () => {
                    if (!myClan) return;
                    const res = await clanService.useOasisKey(myClan.id, user.uid, user.displayName || 'رفيق في الرَّكْب');
                    setNotice(res.message);
                    setActivePerkModal(null);
                    if (res.success) confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
                  })}
                >
                  <Sparkles size={16} />  استخدام مفتاح لتسريع البناء ٤ ساعات فورية <OutlineIcon name="sparkles" /><OutlineIcon name="zap" />
                </button>
              )}
            </div>
          )}


        </div>
      </Modal>
    )}

    {/* Realm Selector Modal (On-demand Picker) */}
    {realmPickerOpen && (
      <Modal
        title="خرائط وعوالم الرَّكْب (٥ خرائط متسلسلة)"
        busy={busy}
        close={() => setRealmPickerOpen(false)}
      >
        <div className="clan-realm-picker-modal-content">
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--clan-muted)' }}>
            تنقل بين عوالم وخرائط الرَّكْب. تُفتح كل خريطة تالياً عند استكمال فتح معالم الخريطة التي تسبقها.
          </p>

          <div className="clan-realm-picker-list">
            {CLAN_REALMS.map(r => {
              const prog = getRealmProgress(r.index, myClan?.unlockedTerritories || []);
              const isCurrent = r.index === activeRealmIndex;
              const isCompleted = prog.completed === prog.total;

              return (
                <button
                  type="button"
                  key={r.id}
                  className={`clan-realm-picker-card ${isCurrent ? 'is-selected' : ''} ${!prog.isUnlocked ? 'is-locked' : ''} ${isCompleted ? 'is-completed' : ''}`}
                  onClick={() => {
                    setActiveRealmIndex(r.index);
                    setRealmPickerOpen(false);
                  }}
                >
                  <div className="clan-realm-picker-card-header">
                    <div className="clan-realm-picker-card-icon">{outlineContent(r.icon)}</div>
                    <div className="clan-realm-picker-card-info">
                      <div className="clan-realm-picker-card-title-row">
                        <span className="clan-realm-picker-card-num">خريطة {number(r.index)}</span>
                        <h4 className="clan-realm-picker-card-name">{r.name}</h4>
                      </div>
                      <p className="clan-realm-picker-card-sub">{r.subtitle}</p>
                    </div>
                  </div>

                  <div className="clan-realm-picker-card-footer">
                    <div className="clan-realm-picker-card-prog-wrap">
                      <div className="clan-realm-picker-card-prog-labels">
                        <span>واحات الفتح</span>
                        <b>{number(prog.completed)} / {number(prog.total)}</b>
                      </div>
                      <Progress value={prog.completed} max={prog.total} label={r.name} />
                    </div>

                    <div className="clan-realm-picker-card-status">
                      {isCurrent ? (
                        <span className="clan-realm-picker-badge is-active">المعروضة حالياً <OutlineIcon name="check" /></span>
                      ) : !prog.isUnlocked ? (
                        <span className="clan-realm-picker-badge is-locked">
                          <Lock size={12} /> مقفلة
                        </span>
                      ) : isCompleted ? (
                        <span className="clan-realm-picker-badge is-completed">مكتملة <OutlineIcon name="sparkles" /></span>
                      ) : (
                        <span className="clan-realm-picker-badge is-open">مفتوحة للفتح</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Modal>
    )}
  </div>;
};
export default ClansView;
