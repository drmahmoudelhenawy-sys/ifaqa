import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';

import { COMPANION_CHAT_EVENT } from '../src/components/CompanionCheckInPopup';
import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, setDoc, increment, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { Moon, Sun, Trophy, CheckCircle, Zap, Sparkles, BookOpen, X, MessageCircle, LogOut, AlertTriangle, WifiOff, Settings, Clock3, Compass, LayoutGrid, Headphones } from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../services/firebase';
import { APP_ID, TIERS, BADGES, LOGO_WHITE, THEME_COLORS, LOGO_COLORED, ADMIN_EMAILS, CHARACTERS } from '../constants';
import { UserData, Tier } from '../types';

import HomePage from './HomePage';
import AthkarView from './AthkarView';
import ChallengesPage from './ChallengesPage';
import LeaderboardPage from './LeaderboardPage';
import ProfilePage from './ProfilePage';
import EventsShell from './EventsShell';
import ProphetChallengeModal from './ProphetChallengeModal';
import AdminPanel from './AdminPanel';
import MasbahaPage from './MasbahaPage';
import QuranDashboard from './QuranDashboard';
import QuranReader from './QuranReader';
import PrayerTimesPage from './PrayerTimesPage';
import ToolsPage from '../src/components/ToolsPage';
import HadithReader from '../src/components/HadithReader';
import RadioPlayer from '../src/components/RadioPlayer';
import IslamicCalendarPage from '../src/components/IslamicCalendarPage';
import QiblaCompassPage from '../src/components/QiblaCompassPage';
import WidgetSelectionPage from './WidgetSelectionPage';
import { DownloadsManager } from '../src/components/DownloadsManager';
import { QuranAudioHubPage } from '../src/components/QuranAudioHub/QuranAudioHubPage';
import { FloatingMiniPlayer } from '../src/components/QuranAudioHub/FloatingMiniPlayer';
import { FullAudioPlayerModal } from '../src/components/QuranAudioHub/FullAudioPlayerModal';
import { quranSurahs } from '../quranMetadata';
import '../src/services/audioListeningTracker';
import { scheduleFastingReminders, updatePersistentPrayerNotification } from '../src/services/notificationService';
import { getCachedTimings, fetchAndSchedulePrayers } from '../src/services/prayerTimes';
import { clanService } from '../src/services/clanService';
import { isRibatSaharActive } from '../src/services/clanRules';
import { usePrayerTimer } from '../src/hooks/usePrayerTimer';
import { App as CapApp } from '@capacitor/app';
import { initializeWirdData } from '../src/services/wirdService';
import { getCachedXP, setCachedXP, queueOfflineXP, getPendingXPAmount, syncPendingXP, subscribePendingXP, addXP, PendingXPEntry } from '../src/services/xpService';
import { OfflineXpModal } from '../src/components/OfflineXpModal';
import { OfflinePointsBanner } from '../src/components/OfflinePointsBanner';
import AthkarReminderModal from '../src/components/AthkarReminderModal';
import {
  checkAthkarReminderEligibility,
  AthkarReminderType,
  setupAthkarReminderChannel,
  markAthkarDoneToday
} from '../src/services/athkarReminderService';
import { LocalNotifications } from '@capacitor/local-notifications';
import { startTrackerSync, syncWidgetToFirestore, startProphetSync, startGeneralCounterSync, syncProphetToFirestore, startQuranSync } from '../src/services/trackerSyncService';
import { backNavigationService } from '../src/services/backNavigationService';
import { useGlobalSwipeBack } from '../src/hooks/useGlobalSwipeBack';

interface AppShellProps {
  user: User;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const getTier = (xp: number): Tier => {
    const safeXP = isNaN(xp) || xp < 0 ? 0 : xp;
    return TIERS.find(t => safeXP >= t.min && safeXP <= t.max) || TIERS[TIERS.length - 1];
};

type AppPage = 'home' | 'challenges' | 'events' | 'leaderboard' | 'profile' | 'prayer_times' | 'quran_dashboard' | 'quran_reader' | 'masbaha' | 'tools' | 'hadith_reader' | 'radio_player' | 'calendar_tools' | 'qibla_compass' | 'widget_selection' | 'wird' | 'athkar' | 'quran_audio_hub';

const AppShell: React.FC<AppShellProps> = ({ user, darkMode, setDarkMode }) => {
  useEffect(() => { const open = () => setCurrentPage('challenges'); window.addEventListener(COMPANION_CHAT_EVENT, open); return () => window.removeEventListener(COMPANION_CHAT_EVENT, open); }, []);
  // Global edge-swipe gesture navigation for all pages & tabs
  useGlobalSwipeBack();

  const [currentPage, _setCurrentPage] = useState<AppPage>(() => {
    try {
      const startWithQuran = localStorage.getItem('ifaqa_start_with_quran') === 'true';
      if (startWithQuran) {
        return 'quran_dashboard';
      }
    } catch {}
    return 'home';
  });
  const [navigationHistory, setNavigationHistory] = useState<AppPage[]>([]);
  const [athkarType, setAthkarType] = useState<'morning' | 'evening' | 'situational'>('morning');

  const setCurrentPage = (page: AppPage) => {
    if (page !== currentPage) {
      setNavigationHistory(prev => [...prev, currentPage]);
      _setCurrentPage(page);
    }
  };

  const goBack = () => {
    if (navigationHistory.length > 0) {
      const prev = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      _setCurrentPage(prev);
    } else if (currentPage !== 'home') {
      _setCurrentPage('home');
    } else {
      backNavigationService.handleRootHomeBack();
    }
  };

  const [quranParams, setQuranParams] = useState<any>(null);
  const [userData, setUserData] = useState<UserData>(() => {
    let cachedProfile: any = null;
    try {
      const stored = localStorage.getItem('ifaqa_cached_profile_' + user.uid);
      if (stored) cachedProfile = JSON.parse(stored);
    } catch {}

    const cachedXP = getCachedXP(user.uid);
    const pendingXP = getPendingXPAmount();
    const effectiveXP = Math.max(cachedXP, (cachedProfile?.xp || 0) + pendingXP);
    const initialTier = getTier(effectiveXP);

    return {
      name: cachedProfile?.name || user.displayName || 'مستخدم', 
      gender: cachedProfile?.gender || 'male', 
      tier: cachedProfile?.tier || initialTier.name || 'مبتدئ',
      ...cachedProfile,
      xp: effectiveXP
    };
  });
  const [showProphetChallenge, setShowProphetChallenge] = useState(false); 
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showDownloadsModal, setShowDownloadsModal] = useState(false);
  const [showBetaPopup, setShowBetaPopup] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showKahfAlert, setShowKahfAlert] = useState(false);
  const [globalTimings, setGlobalTimings] = useState<any>(null);
  const [athkarReminder, setAthkarReminder] = useState<{ isOpen: boolean; type: AthkarReminderType }>({
    isOpen: false,
    type: 'morning',
  });

  const [showOfflineXpModal, setShowOfflineXpModal] = useState(false);
  const [pendingXpAmount, setPendingXpAmount] = useState<number>(() => getPendingXPAmount());
  const [pendingXpEntries, setPendingXpEntries] = useState<PendingXPEntry[]>([]);

  useEffect(() => {
    setupAthkarReminderChannel().catch(() => {});

    // Listen to local notification tap
    let listenerSub: any = null;
    try {
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        const extra = notification.notification?.extra;
        if (extra?.action === 'athkar_reminder' && extra?.type) {
          setAthkarReminder({
            isOpen: true,
            type: extra.type as AthkarReminderType,
          });
        }
      }).then((sub) => {
        listenerSub = sub;
      });
    } catch {}

    // Check reminder eligibility periodically
    const checkReminder = () => {
      const timings = globalTimings || getCachedTimings();
      const eligible = checkAthkarReminderEligibility(timings);
      if (eligible?.shouldShow) {
        setAthkarReminder({
          isOpen: true,
          type: eligible.type,
        });
      }
    };

    const initTimer = setTimeout(checkReminder, 4000);
    const interval = setInterval(checkReminder, 60000);

    const handleOpenReminder = (e: any) => {
      const type = e.detail?.type || 'morning';
      setAthkarReminder({ isOpen: true, type });
    };
    window.addEventListener('ifaqa_open_athkar_reminder', handleOpenReminder);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
      listenerSub?.remove?.();
      window.removeEventListener('ifaqa_open_athkar_reminder', handleOpenReminder);
    };
  }, [globalTimings]);

  useEffect(() => {
    const unsub = subscribePendingXP((amount, entries) => {
      setPendingXpAmount(amount);
      setPendingXpEntries(entries);
    });
    return unsub;
  }, []);

  // Sahar Window State («وبالأسحار هم يستغفرون»)
  const [saharInfo, setSaharInfo] = useState(() => isRibatSaharActive());
  const [saharClanWorshippersCount, setSaharClanWorshippersCount] = useState<number>(0);
  const [testerWorshippersCount, setTesterWorshippersCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 3;
    const saved = localStorage.getItem('ifaqa_admin_sahar_tester_worshippers');
    return saved ? Math.max(1, Number(saved)) : 3;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setSaharInfo(isRibatSaharActive());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleTesterChanged = () => {
      setSaharInfo(isRibatSaharActive());
    };
    window.addEventListener('ifaqa_admin_sahar_tester_changed', handleTesterChanged);
    return () => window.removeEventListener('ifaqa_admin_sahar_tester_changed', handleTesterChanged);
  }, []);

  // Sync Sahar Theme class to html and body
  useEffect(() => {
    if (saharInfo.isActive) {
      document.documentElement.classList.add('ifaqa-sahar-night-theme');
      document.body.classList.add('ifaqa-sahar-night-theme');
    } else {
      document.documentElement.classList.remove('ifaqa-sahar-night-theme');
      document.body.classList.remove('ifaqa-sahar-night-theme');
    }
  }, [saharInfo.isActive]);

  const isAdminUser = Boolean(userData.isAdmin || (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())));

  // Subscribe to clan Sahar active worshippers if user is in a clan
  useEffect(() => {
    let nightUnsub: (() => void) | null = null;
    const today = new Date().toISOString().slice(0, 10);
    const clanUnsub = clanService.subscribeToUserClan(user.uid, (cid) => {
      nightUnsub?.();
      if (cid) {
        nightUnsub = clanService.subscribeToSaharNight(cid, today, (night) => {
          setSaharClanWorshippersCount((night?.lanterns || []).length);
        });
      }
    });
    return () => {
      clanUnsub?.();
      nightUnsub?.();
    };
  }, [user.uid]);

  const isTesterActive = typeof window !== 'undefined' && localStorage.getItem('ifaqa_admin_sahar_tester_mode') === 'true';
  const effectiveWorshippersCount = isTesterActive 
    ? Math.max(saharClanWorshippersCount, testerWorshippersCount) 
    : saharClanWorshippersCount;
  const effectiveMultiplier = effectiveWorshippersCount >= 3 ? effectiveWorshippersCount : 2;


  // Online / Offline Auto-Sync with celebration
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      void syncPendingXP(user.uid, true);
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial silent sync on mount if online and has pending
    if (navigator.onLine) {
      void syncPendingXP(user.uid, false);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user.uid]);

  // Initialize Global Hardware Back Button and Modal Handlers
  useEffect(() => {
    backNavigationService.init(() => goBack);
  }, [currentPage, navigationHistory]);

  // Register AppShell Modals with hierarchical priorities
  useEffect(() => {
    if (showOfflineXpModal) {
      return backNavigationService.register('appshell_offline_xp', 95, () => setShowOfflineXpModal(false));
    }
  }, [showOfflineXpModal]);

  useEffect(() => {
    if (showDownloadsModal) {
      return backNavigationService.register('appshell_downloads', 100, () => setShowDownloadsModal(false));
    }
  }, [showDownloadsModal]);

  useEffect(() => {
    if (showSupport) {
      return backNavigationService.register('appshell_support', 90, () => setShowSupport(false));
    }
  }, [showSupport]);

  useEffect(() => {
    if (showAdminPanel) {
      return backNavigationService.register('appshell_admin', 90, () => setShowAdminPanel(false));
    }
  }, [showAdminPanel]);

  useEffect(() => {
    if (showProphetChallenge) {
      return backNavigationService.register('appshell_prophet', 90, () => setShowProphetChallenge(false));
    }
  }, [showProphetChallenge]);

  useEffect(() => {
    if (showBetaPopup) {
      return backNavigationService.register('appshell_beta', 80, () => setShowBetaPopup(false));
    }
  }, [showBetaPopup]);

  useEffect(() => {
    if (showKahfAlert) {
      return backNavigationService.register('appshell_kahf', 80, () => setShowKahfAlert(false));
    }
  }, [showKahfAlert]);

  // Load Prayer Timings globally for persistent notification
  useEffect(() => {
    const loadTimings = async () => {
      const timings = await fetchAndSchedulePrayers();
      if (timings) setGlobalTimings(timings);
    };
    loadTimings();
  }, []);

  const timerTimings = React.useMemo(() => {
    if (!globalTimings) return {};
    const PRAYERS = [
      { key: 'Fajr', label: 'الفجر' },
      { key: 'Dhuhr', label: 'الظهر' },
      { key: 'Asr', label: 'العصر' },
      { key: 'Maghrib', label: 'المغرب' },
      { key: 'Isha', label: 'العشاء' },
    ];
    return PRAYERS.reduce<any>((items, prayer) => {
      const timeStr = globalTimings[prayer.key];
      if (timeStr) {
        const [hours, minutes] = timeStr.split(' ')[0].split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        items[prayer.key] = date.getTime();
      }
      return items;
    }, {});
  }, [globalTimings]);

  const { nextPrayer } = usePrayerTimer(timerTimings);

  // Update Persistent Notification when Next Prayer changes
  useEffect(() => {
    if (nextPrayer && globalTimings) {
      const timeStr = globalTimings[nextPrayer.name];
      if (timeStr) {
        const labels: any = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
        
        let formattedTime = timeStr.split(' ')[0];
        const [h, m] = formattedTime.split(':').map(Number);
        const period = h >= 12 ? 'م' : 'ص';
        formattedTime = `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${period}`;
        
        updatePersistentPrayerNotification(labels[nextPrayer.name], formattedTime);
      }
    }
  }, [nextPrayer?.name]);

  useEffect(() => {
      scheduleFastingReminders();

      const today = new Date();
      const isFriday = today.getDay() === 5;
      const todayStr = today.toDateString();
      const kahfReadDate = localStorage.getItem('kahf_read_date');
      
      if (isFriday && kahfReadDate !== todayStr) {
          setShowKahfAlert(true);
      }

      // Initialize Wird Data for Widgets
      initializeWirdData();

      // Handle Deep Links from Widgets
      CapApp.addListener('appUrlOpen', data => {
          try {
              // Handle custom schemes like ifaqaa://wird/...
              const urlStr = data.url.replace('ifaqa://', 'http://');
              const url = new URL(urlStr);
              
              if (url.host === 'wird') {
                  const paths = url.pathname.split('/');
                  const type = paths[1]; // e.g. "quran"
                  const surah = decodeURIComponent(paths[2] || '');
                  const ayah = parseInt(paths[3] || '1');

                  if (type === 'quran') {
                      const surahData = quranSurahs.find(s => s.name === surah);
                      const surahNumber = surahData ? surahData.number : 1;
                      setQuranParams({ mode: 'reading', surah: surahNumber, ayah });
                      _setCurrentPage('quran_reader');
                  }
              }

              if (url.host === 'azkar') {
                  const type = url.pathname.replace('/', '');
                  if (type === 'morning' || type === 'evening') {
                      localStorage.setItem('ifaqa_auto_open_athkar', type);
                      _setCurrentPage('home'); // Use _setCurrentPage to avoid double history entry
                  }
              }

              if (url.host === 'radio') {
                  _setCurrentPage('radio_player');
              }
          } catch (e) {
              console.error('Deep link error:', e);
          }
      });
  }, []);

  const handleKahfRead = () => {
      localStorage.setItem('kahf_read_date', new Date().toDateString());
      setShowKahfAlert(false);
  };

  const handleOpenKahf = () => {
      setQuranParams({ mode: 'reading', page: 293 });
      setCurrentPage('quran_dashboard');
  };

  // Load Beta Popup state
  useEffect(() => {
      const hasSeenBeta = localStorage.getItem('v1_beta_popup_seen');
      if (!hasSeenBeta) {
          setShowBetaPopup(true);
      }
  }, []);

  const closeBetaPopup = () => {
      localStorage.setItem('v1_beta_popup_seen', 'true');
      setShowBetaPopup(false);
  };

  useEffect(() => {
    // 1. Listen to Profile Doc
    const unsubProfile = onSnapshot(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile'), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserData;
        if(!data.name) updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile'), { name: user.displayName || 'مستخدم' });
        
        // Handle Temp Mode
        const tempMode = localStorage.getItem('temp_app_mode');
        if (tempMode && !data.appMode) {
            updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile'), { appMode: tempMode });
            localStorage.removeItem('temp_app_mode');
        }

        // --- Badge Checking Logic ---
        if (data.stats && data.appMode !== 'lite') { 
            const earnedBadges = data.badges || [];
            const newBadges: string[] = [];
            
            BADGES.forEach(badge => {
                if (!earnedBadges.includes(badge.id) && typeof (badge as any).condition === 'function' && (badge as any).condition(data.stats!)) {
                    newBadges.push(badge.id);
                }
            });

            if (newBadges.length > 0) {
                await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile'), {
                    badges: arrayUnion(...newBadges)
                });
                confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors: ['#FFD700', '#FFA500'] });
            }
        }
        const pendingXP = getPendingXPAmount();
        const serverXP = Number(data.xp) || 0;
        const cachedXP = getCachedXP(user.uid);
        const resolvedXP = Math.max(serverXP, cachedXP, serverXP + pendingXP);
        const resolvedTier = getTier(resolvedXP);

        setCachedXP(user.uid, resolvedXP);
        try {
          localStorage.setItem('ifaqa_cached_profile_' + user.uid, JSON.stringify({ ...data, xp: resolvedXP, tier: resolvedTier.name }));
        } catch {}

        setUserData(prev => ({
          ...prev,
          ...data,
          xp: resolvedXP,
          tier: resolvedTier.name,
        }));
      } else {
        const initialData = { 
            name: user.displayName || 'مستخدم', email: user.email, xp: getCachedXP(user.uid), tier: 'مبتدئ', gender: 'male', 
            joinedAt: serverTimestamp(), stats: { fajrStreak: 0, totalPrayers: 0, fajrCount: 0, jamaahCount: 0 },
            appMode: localStorage.getItem('temp_app_mode') || 'full'
        };
        await setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile'), initialData, {merge: true});
      }
    });

    // 2. Self-Healing Leaderboard Listener: Reconciles if Leaderboard has higher verified XP
    const unsubLeaderboard = onSnapshot(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaderboard', user.uid), (leadSnap) => {
      if (leadSnap.exists()) {
        const leadData = leadSnap.data();
        const leadXP = Number(leadData.xp) || 0;
        if (leadXP > 0) {
          const currentCached = getCachedXP(user.uid);
          if (leadXP > currentCached) {
            setCachedXP(user.uid, leadXP);
            const newTier = getTier(leadXP);
            setUserData(prev => ({
              ...prev,
              xp: leadXP,
              tier: newTier.name
            }));
            try {
              localStorage.setItem('ifaqa_cached_profile_' + user.uid, JSON.stringify({ ...userData, xp: leadXP, tier: newTier.name }));
              updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile'), { xp: leadXP, tier: newTier.name }).catch(() => {});
            } catch {}
          }
        }
      }
    });

    return () => {
      unsubProfile();
      unsubLeaderboard();
    };
  }, [user.uid]);

  // --- Offline XP Sync ---
  const syncOfflineXP = async () => {
    if (!navigator.onLine) return;
    try {
      await syncPendingXP(user.uid);
    } catch (error) {
      console.error('Error syncing offline XP:', error);
    }
  };

  // Listen to XP synced event to immediately reflect in state
  useEffect(() => {
    const handleXPSynced = (e: any) => {
      const syncedUserId = e.detail?.userId;
      if (syncedUserId === user.uid) {
        const cached = getCachedXP(user.uid);
        setUserData(prev => ({ ...prev, xp: Math.max(prev.xp || 0, cached) }));
      }
    };
    window.addEventListener('ifaqa_xp_synced', handleXPSynced);
    return () => window.removeEventListener('ifaqa_xp_synced', handleXPSynced);
  }, [user.uid]);

  useEffect(() => {
    if (user?.uid) {
        syncWidgetToFirestore(user.uid);
        syncProphetToFirestore(user.uid);
        const cleanupTracker = startTrackerSync(user.uid);
        const cleanupProphet = startProphetSync(user.uid);
        const cleanupCounter = startGeneralCounterSync(user.uid);
        const cleanupQuran = startQuranSync(user.uid);
        return () => {
          cleanupTracker();
          cleanupProphet();
          cleanupCounter();
          cleanupQuran();
        };
    }
  }, [user?.uid]);

  useEffect(() => {
    syncOfflineXP();
    window.addEventListener('online', syncOfflineXP);
    return () => window.removeEventListener('online', syncOfflineXP);
  }, [user.uid]);

  useEffect(() => {
    const handleStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  // --- Dynamic Theme ---
  useEffect(() => {
    const themePrefs = userData.themePreferences || { accentColor: 'violet', fontSize: 'base', soundEnabled: true, hapticsEnabled: true };
    localStorage.setItem('ifaqa_ui_sound_enabled', themePrefs.soundEnabled === false ? 'false' : 'true');
    localStorage.setItem('ifaqa_haptics_enabled', themePrefs.hapticsEnabled === false ? 'false' : 'true');
    const root = document.documentElement;
    if (themePrefs.fontSize === 'sm') root.style.fontSize = '14px';
    else if (themePrefs.fontSize === 'lg') root.style.fontSize = '18px';
    else root.style.fontSize = '16px';

    const colorPalette = THEME_COLORS[themePrefs.accentColor];
    if (colorPalette) {
        const styleId = 'dynamic-theme-styles';
        let styleTag = document.getElementById(styleId);
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }
        const cssVariables = Object.entries(colorPalette).map(([shade, value]) => {
            return `--color-violet-${shade}: ${value};`;
        }).join('\n');
        styleTag.innerHTML = `:root { ${cssVariables} }`;
    }
  }, [userData.themePreferences]);

  const handleGlobalScore = async (amount: number, label = 'طاعة منجزة', category: PendingXPEntry['category'] = 'general') => {
    if (userData.appMode === 'lite') return;
    if (amount === 0) return;

    // Apply pre-dawn Sahar multiplier («وبالأسحار هم يستغفرون»)
    let finalAmount = amount;
    if (isRibatSaharActive().isActive && ['quran', 'salat', 'prophet', 'adhkar', 'general'].includes(category)) {
      finalAmount = Math.round(amount * effectiveMultiplier);
    }

    // Track today's accumulated XP in local storage for daily tally
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayKey = `ifaqa_today_total_xp_${user.uid}_${todayStr}`;
    try {
      const currentToday = Number(localStorage.getItem(todayKey)) || 0;
      const nextToday = Math.max(0, currentToday + finalAmount);
      localStorage.setItem(todayKey, String(nextToday));
      window.dispatchEvent(new CustomEvent('ifaqa_daily_xp_updated', { detail: { xp: nextToday } }));
    } catch {}

    // 1. If offline, queue locally and update UI instantly
    if (!navigator.onLine) {
      const newTotal = queueOfflineXP(user.uid, finalAmount, label, category);
      setUserData(prev => ({ ...prev, xp: newTotal }));
      try {
        localStorage.setItem('ifaqa_cached_profile_' + user.uid, JSON.stringify({ ...userData, xp: newTotal }));
      } catch {}
      return;
    }

    // 2. If online, update backend, leaderboard, and local cache
    try {
      const userRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'stats', 'profile');
      const xpUpdate = increment(finalAmount);
      await updateDoc(userRef, { xp: xpUpdate, lastActive: serverTimestamp() });
      
      const newTotal = (userData.xp || 0) + finalAmount;
      setCachedXP(user.uid, newTotal);
      setUserData(prev => ({ ...prev, xp: newTotal }));
      try {
        localStorage.setItem('ifaqa_cached_profile_' + user.uid, JSON.stringify({ ...userData, xp: newTotal }));
      } catch {}

      if (userData.showOnLeaderboard !== false) {
        const userName = userData.name || user.displayName || 'مستخدم';
        const leaderboardData: any = { xp: xpUpdate, name: userName, tier: userData.tier || 'مبتدئ' };
        if (userData.photoURL) leaderboardData.photoURL = userData.photoURL;
        if (userData.characterId) leaderboardData.characterId = userData.characterId;
        if (userData.userTitle) leaderboardData.userTitle = userData.userTitle;
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaderboard', user.uid), leaderboardData, { merge: true });
      }

      // Automatically forward individual points to the user's Clan & update territory unlocks
      void clanService.recordClanActivity(user.uid, finalAmount);

      // Clan quest quantities are recorded explicitly; XP labels do not measure worship.
    } catch (err) {
      // Fallback to queueing if network write failed
      const newTotal = queueOfflineXP(user.uid, finalAmount, label, category);
      setUserData(prev => ({ ...prev, xp: newTotal }));
    }
  };
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 3 && hour < 11) return 'صباح النور والبركة';
    if (hour >= 11 && hour < 16) return 'طاب يومك بذكر الله';
    if (hour >= 16 && hour < 20) return 'طاب مساؤك بالخير';
    return 'ليلة مباركة وذكر طيب';
  };

  const currentTier = getTier(userData.xp);
  const nextTierIndex = TIERS.findIndex(t => t.id === currentTier.id) + 1;
  const nextTier = TIERS[nextTierIndex] || TIERS[TIERS.length - 1];
  const progressPercent = Math.min(100, Math.max(0, (((userData.xp || 0) - currentTier.min) / (nextTier.min - currentTier.min)) * 100));
  const isLite = userData.appMode === 'lite';

  const NavBtn = ({ icon: Icon, label, active, onClick, vertical }: { icon: any, label: string, active: boolean, onClick: () => void, vertical?: boolean }) => (
    <button 
        onClick={() => {
          onClick();
          if (navigator.vibrate) navigator.vibrate(15);
        }} 
        data-navigation
        aria-current={active ? 'page' : undefined}
        className={`group relative flex ${vertical ? 'w-full flex-col gap-1 items-center px-2 py-3.5' : 'min-w-[2.5rem] flex-1 flex-col items-center justify-center px-1 py-1.5'} overflow-hidden rounded-[1.25rem] transition-all duration-300 active:scale-95 ${
          active 
            ? 'bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-700 text-white shadow-lg shadow-violet-600/35' 
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 hover:text-slate-950 dark:hover:bg-slate-800/80 dark:hover:text-white'
        }`}
    >
        <Icon size={vertical ? 22 : 19} strokeWidth={active ? 2.6 : 2.2} className={`relative z-10 transition-transform duration-300 ${active ? '-translate-y-0.5 scale-110' : 'group-hover:-translate-y-0.5 text-slate-700 dark:text-slate-200'}`} />
        <span className={`relative z-10 mt-0.5 text-[10px] font-black tracking-tight transition-all duration-300 truncate ${active ? 'text-white drop-shadow-sm' : 'text-slate-800 dark:text-slate-100 font-black'}`}>{label}</span>
        {active && (
          <>
            <span className="absolute inset-0 bg-gradient-to-t from-white/15 to-transparent pointer-events-none" />
            <span className="absolute -bottom-1 h-2 w-6 rounded-full bg-white/40 blur-sm pointer-events-none" />
          </>
        )}
    </button>
  );

  const renderContent = () => {
    switch(currentPage) {
        case 'home': return <HomePage user={user} userData={userData} updateStats={handleGlobalScore} onOpenProphetChallenge={() => setShowProphetChallenge(true)} onOpenMasbaha={() => setCurrentPage('masbaha')} onOpenLeaderboard={() => setCurrentPage('leaderboard')} onOpenAthkar={(type) => { setAthkarType(type); setCurrentPage('athkar'); }} />;
        case 'athkar': return <AthkarView type={athkarType} user={user} dateStr={new Date().toISOString().split('T')[0]} onBack={goBack} updateStats={handleGlobalScore} />;
        case 'challenges': return (
          <ChallengesPage 
            user={user} 
            updateStats={handleGlobalScore} 
            onOpenProphetChallenge={() => setShowProphetChallenge(true)} 
            onOpenMawanEvents={() => setCurrentPage('events')} 
            onOpenQuran={(surah, page) => {
              const targetPage = typeof page === 'number' && page >= 1 ? page : (surah ? quranSurahs.find(s => s.number === surah)?.startPage || 1 : 1);
              let targetSurah = surah;
              if (!targetSurah) {
                let matched = quranSurahs[0];
                for (const s of quranSurahs) {
                  if (s.startPage <= targetPage) matched = s;
                  else break;
                }
                targetSurah = matched.number;
              }
              setQuranParams({ mode: 'casual', surah: targetSurah, page: targetPage, ayah: 1 });
              setCurrentPage('quran_reader');
            }}
            onOpenRadio={() => setCurrentPage('quran_audio_hub')}
            onOpenMasbaha={() => setCurrentPage('masbaha')}
          />
        );
        case 'events': return <EventsShell user={user} userData={userData} onExit={goBack} />;
        case 'leaderboard': return <LeaderboardPage user={user} userData={userData} />;
        case 'prayer_times': return <PrayerTimesPage />;
        case 'quran_audio_hub': return (
          <QuranAudioHubPage 
            darkMode={darkMode}
            onToggleTheme={() => setDarkMode(!darkMode)}
            onBack={goBack} 
            onOpenMushaf={(surah) => {
              const targetPage = quranSurahs.find(s => s.number === surah)?.startPage || 1;
              setQuranParams({ mode: 'casual', surah, page: targetPage, ayah: 1 });
              setCurrentPage('quran_reader');
            }} 
          />
        );
        case 'quran_dashboard': return <QuranReader user={user} params={quranParams || { mode: 'reading', page: 1 }} onBack={goBack} onOpenSurah={(surah, ayah = 1) => setQuranParams({ ...quranParams, mode: quranParams?.mode || 'casual', surah, ayah })} updateStats={handleGlobalScore} />;
        case 'quran_reader': return <QuranReader user={user} params={quranParams} onBack={goBack} onOpenSurah={(surah, ayah = 1) => setQuranParams({ ...quranParams, mode: quranParams?.mode || 'casual', surah, ayah })} updateStats={handleGlobalScore} />;
        case 'profile': return <ProfilePage user={user} userData={userData} onOpenAdminPanel={() => setShowAdminPanel(true)} onOpenSupport={() => setShowSupport(true)} showSupport={showSupport} closeSupport={() => setShowSupport(false)} onOpenWidgets={() => setCurrentPage('widget_selection')} onOpenDownloads={() => setShowDownloadsModal(true)} onBack={goBack}/>;
        case 'masbaha': return <MasbahaPage user={user} onBack={goBack} />;
        case 'tools': return <ToolsPage onOpenTool={(id) => {
          if (id === 'quran_audio_hub') setCurrentPage('quran_audio_hub');
          else if (id === 'athkar') { setAthkarType('morning'); setCurrentPage('athkar'); }
          else if (id === 'hadith') setCurrentPage('hadith_reader');
          else if (id === 'radio') setCurrentPage('radio_player');
          else if (id === 'calendar') setCurrentPage('calendar_tools');
          else if (id === 'qibla') setCurrentPage('qibla_compass');
          else if (id === 'downloads') setShowDownloadsModal(true);
          else if (id === 'masbaha') setCurrentPage('masbaha');
          else if (id === 'widgets') setCurrentPage('widget_selection');
          else if (id === 'prayer_times') setCurrentPage('prayer_times');
          else if (id === 'challenges') setCurrentPage('challenges');
          else if (id === 'leaderboard') setCurrentPage('leaderboard');
          else if (id === 'prophet_challenge') setShowProphetChallenge(true);
        }} />;
        case 'hadith_reader': return <HadithReader onBack={goBack} />;
        case 'radio_player': return <RadioPlayer onBack={goBack} />;
        case 'calendar_tools': return <IslamicCalendarPage onBack={goBack} />;
        case 'qibla_compass': return <QiblaCompassPage onBack={goBack} />;
        case 'widget_selection': return <WidgetSelectionPage user={user} onBack={goBack} />;
        default: return <HomePage user={user} userData={userData} updateStats={handleGlobalScore} onOpenProphetChallenge={() => setShowProphetChallenge(true)} onOpenMasbaha={() => setCurrentPage('masbaha')} onOpenLeaderboard={() => setCurrentPage('leaderboard')} onOpenAthkar={(type) => { setAthkarType(type); setCurrentPage('athkar'); }} />;
    }
  }

  const isImmersive = currentPage === 'quran_reader' || currentPage === 'quran_dashboard' || currentPage === 'athkar';
  const isStandalonePage = [
    'radio_player', 
    'hadith_reader', 
    'calendar_tools', 
    'qibla_compass', 
    'masbaha', 
    'widget_selection', 
    'profile',
    'events'
  ].includes(currentPage);
  const isFullBleed = isImmersive || currentPage === 'quran_audio_hub' || isStandalonePage;

  const userGreetingName = useMemo(() => {
    const raw = userData.name || user.displayName || user.email?.split('@')[0] || '';
    if (!raw) return 'بك';
    const cleaned = raw.replace(/[._\d-]+/g, ' ').trim();
    return cleaned || raw;
  }, [userData.name, user.displayName, user.email]);

  const activeChar = useMemo(() => {
    return userData.characterId ? CHARACTERS.find((char) => char.id === userData.characterId) : null;
  }, [userData.characterId]);

  return (
    <div className={`ifaqa-app-shell h-[100dvh] flex overflow-hidden font-sans transition-colors duration-300 relative ${saharInfo.isActive ? 'ifaqa-sahar-night-theme' : ''}`} dir="rtl">
      
      {/* Pre-Dawn Celestial Sky Backdrop (Twinkling stars & soft lunar glow) */}
      {saharInfo.isActive && (
        <div className="ifaqa-sahar-stars-canvas pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl" />
          <div className="absolute top-10 right-6 w-36 h-36 rounded-full bg-amber-300/15 blur-2xl" />
          <div className="ifaqa-sahar-stars-layer" />
          <div className="ifaqa-sahar-stars-layer-sparse" />
        </div>
      )}

      {/* Tablet/Desktop Sidebar (Visible on md+) */}
      {!isFullBleed && (
          <div className="ifaqa-glass hidden md:flex flex-col w-28 border-y-0 border-r-0 h-full py-6 px-2 items-center justify-between z-50 shadow-2xl">
              <div className="flex flex-col gap-4 w-full items-center">
                  <div className="mb-2 p-2 rounded-2xl bg-violet-500/10 border border-violet-500/20 shadow-inner">
                    <img src={LOGO_COLORED} className="w-12 h-12 object-contain drop-shadow-md" alt="Logo"/>
                  </div>
                  <NavBtn icon={CheckCircle} label="يومي" active={currentPage === 'home'} onClick={() => setCurrentPage('home')} vertical />
                  <NavBtn icon={BookOpen} label="المصحف" active={currentPage === 'quran_dashboard'} onClick={() => setCurrentPage('quran_dashboard')} vertical />
                  <NavBtn icon={Headphones} label="استماع" active={currentPage === 'quran_audio_hub'} onClick={() => setCurrentPage('quran_audio_hub')} vertical />
                  <NavBtn icon={Clock3} label="الصلاة" active={currentPage === 'prayer_times'} onClick={() => setCurrentPage('prayer_times')} vertical />
                  <NavBtn icon={LayoutGrid} label="الأدوات" active={currentPage === 'tools'} onClick={() => setCurrentPage('tools')} vertical />
                  {!isLite && <NavBtn icon={Zap} label="التحديات" active={currentPage === 'challenges'} onClick={() => setCurrentPage('challenges')} vertical />}
                  {!isLite && <NavBtn icon={Trophy} label="المتصدرون" active={currentPage === 'leaderboard'} onClick={() => setCurrentPage('leaderboard')} vertical />}
              </div>
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                className="w-11 h-11 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:scale-105 active:scale-95 transition shadow-sm"
              >
                  {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-600" />}
              </button>
          </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden relative w-full ${isFullBleed ? '' : 'md:max-w-2xl md:mx-auto'}`}>
          
          {/* Scrollable Container */}
          <div className={`flex-1 overflow-y-auto scrollbar-hide w-full ${!isFullBleed ? 'pb-28 md:pb-6' : 'pb-0'}`}>
              
              {/* Luxury Adaptive Modern Header (Home Page Only) */}
              {!showProphetChallenge && currentPage === 'home' && (
                <header className="relative mx-3.5 mb-3.5 mt-2.5 space-y-3 select-none">
                  {/* Pre-Dawn Celestial Banner («وبالأسحار هم يستغفرون») */}
                  {saharInfo.isActive && (
                    <div 
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(15);
                        setCurrentPage('challenges');
                      }}
                      className="cursor-pointer relative overflow-hidden p-3.5 rounded-2xl border border-purple-400/50 bg-gradient-to-r from-purple-950/95 via-violet-900/90 to-indigo-950/95 shadow-xl shadow-purple-950/60 flex items-center justify-between gap-3 animate-in fade-in duration-300"
                    >
                      {/* Subtle starry glimmers inside banner */}
                      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(1px_1px_at_20px_15px,#fff,transparent),radial-gradient(1.5px_1.5px_at_80px_35px,#fef08a,transparent),radial-gradient(1px_1px_at_160px_10px,#fff,transparent),radial-gradient(1.5px_1.5px_at_240px_25px,#e9d5ff,transparent)]" />

                      <div className="flex items-center gap-3 min-w-0 relative z-10">
                        <div className="relative shrink-0 flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-300/25 to-purple-500/30 border border-amber-300/40 shadow-inner">
                          <span className="text-2xl drop-shadow"><OutlineIcon name="moon" /></span>
                          <span className="absolute -top-1 -right-1 text-[11px] animate-pulse"><OutlineIcon name="sparkles" /></span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs sm:text-sm font-black text-amber-200 font-serif tracking-wide truncate drop-shadow-sm">
                              «وَبِالْأَسْحَارِ هُمْ يَسْتَغْفِرُونَ»
                            </p>
                            {isTesterActive && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/30 text-purple-200 border border-purple-400/40 font-bold shrink-0">
                                
                                وضع المجرّب <OutlineIcon name="flask" />
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] sm:text-[11px] text-purple-200/90 font-bold truncate mt-0.5">
                            {outlineContent(effectiveWorshippersCount >= 3 
                              ? `وقت التنزّل الإلهي · مضاعفة الحسنات نشطة (${effectiveWorshippersCount} رفقاء في الرَّكْب )`
                              : "وقت التنزّل الإلهي · مضاعفة أجور الطاعات نشطة الآن ")}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 relative z-10 flex flex-col items-end">
                        <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400/25 to-yellow-500/20 border border-amber-400/60 text-amber-300 text-xs font-black dir-ltr font-mono shadow-md shadow-purple-950/50 flex items-center gap-1">
                          <span>{effectiveMultiplier}x</span>
                          <span className="text-amber-300 text-xs"><OutlineIcon name="star" /></span>
                        </span>
                      </div>
                    </div>
                  )}



                  {/* Top Bar: User Profile / Brand on Right + Quick Actions on Left */}
                  <div className="flex items-center justify-between gap-3 px-0.5">
                    {/* User Greeting & Avatar */}
                    <div 
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(10);
                        setCurrentPage('profile');
                      }}
                      className="flex items-center gap-3 cursor-pointer group active:scale-98 transition-transform"
                    >
                      <div className="relative shrink-0">
                        {activeChar ? (
                          <img 
                            src={activeChar.img} 
                            alt={userGreetingName} 
                            className="w-12 h-12 sm:w-13 sm:h-13 object-cover rounded-full drop-shadow-md group-hover:scale-105 transition-transform" 
                          />
                        ) : (
                          <div className="w-12 h-12 sm:w-13 sm:h-13 bg-violet-600 rounded-full flex items-center justify-center drop-shadow-md group-hover:scale-105 transition-transform">
                            <img src={LOGO_WHITE} alt="إفاقة" className="h-7 w-7 object-contain drop-shadow" />
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950 shadow-sm" />
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block leading-tight">
                          {getGreeting()}  <OutlineIcon name="leaf" />
                        </span>
                        <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                          أهلًا بك، {userGreetingName}
                        </h1>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {!isLite && (
                        <button 
                          onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(10);
                            setCurrentPage('leaderboard');
                          }} 
                          className={`w-10 h-10 rounded-2xl border shadow-sm hover:scale-105 active:scale-95 transition flex items-center justify-center backdrop-blur-md ${
                            currentPage === 'leaderboard' 
                              ? 'bg-amber-500 text-white border-amber-400 shadow-amber-500/30' 
                              : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/70 dark:border-slate-800 text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                          }`} 
                          aria-label="لوحة المتصدرين والأوسمة"
                          title="لوحة المتصدرين والأوسمة"
                        >
                          <Trophy size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => setDarkMode(!darkMode)} 
                        className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition flex items-center justify-center text-slate-700 dark:text-slate-200 backdrop-blur-md" 
                        aria-label="تغيير المظهر"
                      >
                        {darkMode ? <Sun size={18} className="text-amber-400 animate-in spin-in-45" /> : <Moon size={18} className="text-indigo-600" />}
                      </button>
                      <button 
                        onClick={() => setCurrentPage('profile')} 
                        className={`w-10 h-10 rounded-2xl border shadow-sm hover:scale-105 active:scale-95 transition flex items-center justify-center backdrop-blur-md ${
                          currentPage === 'profile' 
                            ? 'bg-violet-600 text-white border-violet-500 shadow-violet-600/30' 
                            : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`} 
                        aria-label="إعدادات الحساب"
                      >
                        <Settings size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Royal XP & Level Progression Ribbon (Home Only) */}
                  {currentPage === 'home' && !isLite && (
                    <div 
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(10);
                        setCurrentPage('leaderboard');
                      }}
                      className="cursor-pointer group relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-violet-600 via-indigo-700 to-purple-800 p-4 text-white shadow-xl shadow-indigo-600/20 border border-white/20 transition-all duration-300 hover:shadow-2xl active:scale-[0.99]"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="relative z-10 flex items-center gap-3.5">
                        {/* Tier 3D Shield (Directly on header, enlarged & borderless) */}
                        <div className="shrink-0 flex items-center justify-center">
                          <img 
                            src={currentTier.img} 
                            alt={currentTier.name} 
                            className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)] filter group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300" 
                          />
                        </div>

                        {/* Info & Progress */}
                        <div className="flex-1 min-w-0 text-right">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div>
                              <span className="text-[9px] font-black text-violet-200 px-2 py-0.5 rounded-full bg-white/15 inline-block mb-0.5">
                                رتبتك الحالية
                              </span>
                              <h4 className="text-sm font-black text-white">{currentTier.name}</h4>
                            </div>

                            {userData.themePreferences?.showGlobalScore !== false && (
                              <div className="text-left">
                                <span className="text-lg sm:text-xl font-black font-mono tracking-tight text-white">
                                  {(userData.xp || 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-black text-amber-300 mr-1">XP</span>
                              </div>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <div className="h-2 overflow-hidden rounded-full bg-black/35 p-0.5 shadow-inner">
                            <div
                              className="h-full rounded-full bg-gradient-to-l from-amber-300 via-yellow-200 to-white transition-all duration-1000 ifaqa-gold-shimmer shadow-sm"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[9px] font-bold text-violet-200/80">
                            <span>{nextTier.min.toLocaleString()} نقطة للمستوى التالي</span>
                            <span className="font-mono text-amber-200 font-black">{Math.round(progressPercent)}%</span>
                          </div>

                          {/* Offline Pending XP Badge */}
                          {pendingXpAmount > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowOfflineXpModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-200 text-[10px] font-black hover:bg-amber-400/30 transition active:scale-95 animate-pulse"
                              >
                                <Zap size={12} className="text-amber-300 fill-amber-300" />
                                <span>+{pendingXpAmount.toLocaleString('ar-EG')} XP بانتظار المزامنة</span>
                              </button>

                              <span className="text-[9px] font-bold text-violet-200/90">
                                {outlineContent(isOffline ? "محفوظة محلياً " : "جاهزة للمزامنة ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </header>
              )}

              {/* Main Page Content */}
              <div className={`${!isFullBleed ? 'px-3.5' : 'px-0'} ${currentPage !== 'home' && !isFullBleed ? 'safe-top pt-3' : ''} relative`}>
                 {/* Offline Points Live Banner (visible when offline or pending points exist) */}
                 {!isImmersive && (isOffline || pendingXpAmount > 0) && (
                   <OfflinePointsBanner
                     isOffline={isOffline}
                     pendingAmount={pendingXpAmount}
                     entries={pendingXpEntries}
                     userId={user.uid}
                     onOpenDetails={() => setShowOfflineXpModal(true)}
                   />
                 )}

                 {showKahfAlert && currentPage === 'home' && (
                     <div className="mb-4 bg-gradient-to-l from-emerald-600 via-teal-600 to-emerald-700 rounded-[2rem] p-4 text-white shadow-xl flex items-center justify-between gap-4 border border-white/25 animate-in fade-in slide-in-from-top-4">
                         <div className="flex items-start gap-3">
                             <div className="bg-white/20 p-2.5 rounded-2xl mt-0.5 shadow-inner">
                                 <BookOpen size={22} className="text-emerald-100" />
                             </div>
                             <div className="text-right">
                                 <h3 className="font-black text-sm mb-1 flex items-center gap-1.5">
                                   <span>سنن يوم الجمعة</span>
                                   <Sparkles size={14} className="text-yellow-300" />
                                 </h3>
                                 <p className="text-xs text-emerald-100/90 font-bold leading-relaxed">لا تنسَ قراءة سورة الكهف، فهي نور لك ما بين الجمعتين.</p>
                             </div>
                         </div>
                         <div className="flex flex-col gap-2 min-w-[95px]">
                             <button onClick={handleOpenKahf} className="w-full bg-white text-emerald-700 text-xs font-black py-2 rounded-xl hover:bg-emerald-50 active:scale-95 transition shadow-md">
                                 فتح السورة
                             </button>
                             <button onClick={handleKahfRead} className="w-full bg-black/25 text-white text-xs font-bold py-1.5 rounded-xl hover:bg-black/35 active:scale-95 transition border border-white/10">
                                 قرأتها
                             </button>
                         </div>
                     </div>
                 )}
                 <div
                   key={currentPage}
                   data-page={currentPage}
                   className={`${isImmersive ? 'ifaqa-immersive-frame' : 'ifaqa-page-transition'} ifaqa-screen-frame`}
                 >
                   {renderContent()}
                 </div>
              </div>
          </div>
          
          {/* Mobile Bottom Navigation Dock (Responsive with Challenges Tab) */}
          {!isImmersive && !showSupport && currentPage !== 'quran_audio_hub' && !isStandalonePage && (
            <div className="md:hidden fixed bottom-2.5 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-[98%] px-1">
                <nav className="ifaqa-bottom-nav rounded-[1.85rem] p-1 flex justify-between items-center gap-0.5 shadow-2xl">
                    <NavBtn icon={CheckCircle} label="يومي" active={currentPage === 'home'} onClick={() => setCurrentPage('home')} />
                    <NavBtn icon={BookOpen} label="المصحف" active={currentPage === 'quran_dashboard'} onClick={() => setCurrentPage('quran_dashboard')} />
                    <NavBtn icon={Headphones} label="استماع" active={currentPage === 'quran_audio_hub'} onClick={() => setCurrentPage('quran_audio_hub')} />
                    <NavBtn icon={Clock3} label="الصلاة" active={currentPage === 'prayer_times'} onClick={() => setCurrentPage('prayer_times')} />
                    {!isLite && <NavBtn icon={Zap} label="التحديات" active={currentPage === 'challenges'} onClick={() => setCurrentPage('challenges')} />}
                    <NavBtn icon={LayoutGrid} label="الأدوات" active={currentPage === 'tools'} onClick={() => setCurrentPage('tools')} />
                </nav>
            </div>
          )}
      </div>
      
      <OfflineXpModal
        isOpen={showOfflineXpModal}
        onClose={() => setShowOfflineXpModal(false)}
        pendingAmount={pendingXpAmount}
        entries={pendingXpEntries}
        isOnline={!isOffline}
        userId={user.uid}
      />
      {(showAdminPanel && (userData.isAdmin || (user.email && ADMIN_EMAILS.includes(user.email)))) && <AdminPanel user={user} onClose={() => setShowAdminPanel(false)} />}
      {showProphetChallenge && <ProphetChallengeModal user={user} userData={userData} onClose={() => setShowProphetChallenge(false)} updateStats={handleGlobalScore} />}
      {showDownloadsModal && <DownloadsManager onClose={() => setShowDownloadsModal(false)} />}
      {currentPage !== 'quran_reader' && (
        <FloatingMiniPlayer 
          hasBottomNav={!isImmersive && !showSupport && currentPage !== 'quran_audio_hub'}
          onOpenSurahInMushaf={(surah) => { 
            const targetPage = quranSurahs.find(s => s.number === surah)?.startPage || 1;
            setQuranParams({ mode: 'casual', surah, page: targetPage, ayah: 1 }); 
            setCurrentPage('quran_reader'); 
          }} 
        />
      )}
      <FullAudioPlayerModal onOpenMushaf={(surah, page, ayah) => {
        const targetPage = page || quranSurahs.find(s => s.number === surah)?.startPage || 1;
        setQuranParams({ mode: 'casual', surah, page: targetPage, ayah: ayah || 1 });
        setCurrentPage('quran_reader');
      }} />
      <AthkarReminderModal
        isOpen={athkarReminder.isOpen}
        type={athkarReminder.type}
        onClose={() => setAthkarReminder(prev => ({ ...prev, isOpen: false }))}
        onReadNow={(type) => {
          setAthkarReminder(prev => ({ ...prev, isOpen: false }));
          setAthkarType(type);
          setCurrentPage('athkar');
        }}
        onMarkDone={(type) => {
          setAthkarReminder(prev => ({ ...prev, isOpen: false }));
          handleGlobalScore(30, type === 'morning' ? 'أذكار الصباح' : 'أذكار المساء', 'athkar');
        }}
      />
      {showBetaPopup && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
              <div 
                role="dialog"
                aria-modal="true"
                className="ifaqa-modal-solid bg-white p-7 rounded-[2.5rem] max-w-sm w-full text-center relative overflow-hidden border border-slate-200 shadow-2xl text-slate-900"
                style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
              >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/20 to-transparent rounded-bl-full pointer-events-none"></div>
                  <div className="w-16 h-16 rounded-3xl bg-violet-100 text-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/10">
                    <Sparkles size={32}/>
                  </div>
                  <h3 className="font-black text-2xl mb-2 text-slate-900">النسخة الأولى (BETA)</h3>
                  <p className="text-slate-600 mb-6 text-sm font-medium leading-relaxed">
                      أهلاً بك في إفاقة بحلتها الجديدة! سعداء بمشاركتك ونسعد دائماً بملاحظاتك لتطوير التطبيق.
                  </p>
                  <button onClick={closeBetaPopup} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-violet-600/30 hover:brightness-110 active:scale-95 transition">ابدأ الرحلة المباركة</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default AppShell;

