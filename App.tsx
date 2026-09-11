
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { Toaster } from 'react-hot-toast';
import { CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { auth, db, listenToForegroundMessages } from './services/firebase';
import { syncPendingXP } from './src/services/xpService';
import { restoreUserDataFromCloud } from './src/services/userCloudSyncService';
import { setupPrayerChannel } from './src/services/localNotifications';
import { showInAppNotification } from './services/notifications';
import { pushNotificationService } from './src/services/pushNotificationService';
import { APP_ID } from './constants';
import { Network } from '@capacitor/network';
import { App as CapApp } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import SplashScreen from './components/SplashScreen';
import OnboardingFlow from './components/OnboardingFlow';
import AuthScreen from './components/AuthScreen';
import AppShell from './components/AppShell';
import { IqamahBanner } from './src/components/IqamahBanner';
import './src/styles/QuranPage.css';
import './src/styles/AppExperience.css';
import { installUiFeedback } from './src/services/uiFeedback';
import { reciterCustomPhotosService } from './src/services/reciterCustomPhotosService';

const QUICK_SPLASH_DELAY_MS = 250;
const FULL_SPLASH_DELAY_MS = 1000;

export default function IfaqaApp() {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<'splash' | 'download' | 'onboarding' | 'alerts' | 'auth' | 'app'>('splash'); 
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [announcement, setAnnouncement] = useState<{ title: string; body: string } | string | null>(null);
  const [appUpdate, setAppUpdate] = useState<string | null>(null);

  useEffect(() => {
    installUiFeedback();
    // Hide Status Bar / Notification bar completely
    StatusBar.hide().catch(() => {});
  }, []);

  useEffect(() => {
    void setupPrayerChannel().catch((error) => {
      console.error('Failed to setup prayer notification channel:', error);
    });

    const handleStatusChange = () => {
        const isNowOffline = !navigator.onLine;
        setIsOffline(isNowOffline);
    };
    
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    const hasLaunched = localStorage.getItem('ifaqa_launched_v69');
    
    let bootstrapUnsubscribers: Unsubscribe[] = [];
    let blockHandled = false;
    let splashTimer: any = null;

    const stopBootstrapListeners = () => {
      const listeners = bootstrapUnsubscribers;
      bootstrapUnsubscribers = [];
      listeners.forEach((stop) => {
        try {
          stop();
        } catch (error) {
          console.warn('Firestore listener cleanup was safely ignored:', error);
        }
      });
    };

    // Auth Listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      stopBootstrapListeners();
      blockHandled = false;

      if (currentUser && navigator.onLine) {
            const userProfileRef = doc(db, 'artifacts', APP_ID, 'users', currentUser.uid, 'stats', 'profile');
            bootstrapUnsubscribers.push(onSnapshot(
              userProfileRef,
              async (userProfileSnap) => {
                if (!blockHandled && userProfileSnap.exists() && userProfileSnap.data().isBlocked === true) {
                  blockHandled = true;
                  alert("تم تعليق حسابك. يرجى التواصل مع الإدارة.");
                  await signOut(auth);
                  setUser(null);
                  setAppState('auth');
                }
              },
              (error) => console.warn('Profile sync is unavailable; continuing locally:', error)
            ));

            void syncPendingXP(currentUser.uid).catch((error) => {
              console.warn('Pending XP will sync later:', error);
            });

            void restoreUserDataFromCloud(currentUser.uid).catch((error) => {
              console.warn('Cloud user data restore failed:', error);
            });

            void pushNotificationService.init(currentUser.uid).catch((error) => {
              console.warn('Push notification service init error:', error);
            });

            // Fetch announcements and updates in background without blocking splash transition
            void (async () => {
              try {
                const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'announcements'), where('active', '==', true));
                const snaps = await getDocs(q);
                if (!snaps.empty) {
                  const latestDoc = snaps.docs[snaps.docs.length - 1].data();
                  const announcementPayload = {
                    title: latestDoc.title || 'تنبيه هام',
                    body: latestDoc.body || latestDoc.text || ''
                  };
                  const seenKey = `${announcementPayload.title}_${announcementPayload.body}`;
                  const seen = sessionStorage.getItem('announcement_seen');
                  if (seen !== seenKey && announcementPayload.body) {
                    setAnnouncement(announcementPayload as any);
                    sessionStorage.setItem('announcement_seen', seenKey);
                  }
                }
                const updateSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'app_config', 'updates'));
                if (updateSnap.exists() && updateSnap.data().hasUpdate) {
                  setAppUpdate(updateSnap.data().latestVersionLink);
                }
              } catch(e) {}
            })();
      }

      setUser(currentUser);
      
      const hasSeenIntro = localStorage.getItem('ifaqa_has_seen_intro') === 'true';
      const introEnabled = localStorage.getItem('ifaqa_intro_enabled') !== 'false';
      const shouldShowFullIntro = introEnabled && !hasSeenIntro;
      const delay = shouldShowFullIntro ? FULL_SPLASH_DELAY_MS : QUICK_SPLASH_DELAY_MS;

      if (splashTimer) clearTimeout(splashTimer);

      splashTimer = setTimeout(() => {
         if (shouldShowFullIntro) {
            localStorage.setItem('ifaqa_has_seen_intro', 'true');
         }
         setAppState(prev => {
            if (prev === 'splash') {
                return currentUser ? 'app' : (hasLaunched ? 'auth' : 'onboarding');
            }
            return currentUser ? 'app' : 'auth';
         });
      }, delay); 
    });

    const reciterPhotosUnsub = reciterCustomPhotosService.subscribeToPhotos(() => {});

    return () => {
      if (splashTimer) clearTimeout(splashTimer);
      stopBootstrapListeners();
      unsubscribe();
      reciterPhotosUnsub();
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    const handleSync = () => {
      if (navigator.onLine) {
        void syncPendingXP(auth.currentUser?.uid);
      }
    };

    const networkListener = Network.addListener('networkStatusChange', status => {
      if (status.connected) {
        handleSync();
      }
    });

    const appStateListener = CapApp.addListener('appStateChange', state => {
      if (state.isActive && navigator.onLine) {
        handleSync();
      }
    });

    Network.getStatus().then(status => {
      if (status.connected) {
        handleSync();
      }
    });

    window.addEventListener('online', handleSync);

    return () => {
      networkListener.then(listener => listener.remove());
      appStateListener.then(listener => listener.remove());
      window.removeEventListener('online', handleSync);
    };
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = listenToForegroundMessages((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'New notification';
      const message = payload.notification?.body || payload.data?.message || payload.data?.body || '';

      showInAppNotification(title, message, 'info');
    });

    return unsubscribe;
  }, []);

  const renderWithToaster = (content: React.ReactNode) => (
    <>
      <Toaster
        position="top-center"
        gutter={8}
        containerStyle={{
          top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          left: 12,
          right: 12,
          zIndex: 99999,
        }}
        toastOptions={{
          duration: 2800,
          className: 'ifaqa-luxury-toast',
          style: {
            background: darkMode ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.97)',
            color: darkMode ? '#f8fafc' : '#0f172a',
            backdropFilter: 'blur(14px) saturate(1.35)',
            WebkitBackdropFilter: 'blur(14px) saturate(1.35)',
            border: darkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.08)',
            borderRadius: '16px',
            padding: '10px 14px',
            fontSize: '12px',
            fontWeight: 700,
            lineHeight: 1.55,
            direction: 'rtl',
            maxWidth: 'min(340px, calc(100vw - 32px))',
            minHeight: '44px',
            boxShadow: darkMode
              ? '0 10px 28px rgba(2, 6, 23, 0.34)'
              : '0 10px 28px rgba(15, 23, 42, 0.14)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#0f172a',
            },
          },
          error: {
            iconTheme: {
              primary: '#f43f5e',
              secondary: '#ffffff',
            },
          },
        }}
      />
      {content}
    </>
  );

  // Render logic
  if (appState === 'splash') {
    const introEnabled = localStorage.getItem('ifaqa_intro_enabled') !== 'false';
    const hasSeenIntro = localStorage.getItem('ifaqa_has_seen_intro') === 'true';
    const hasLaunched = localStorage.getItem('ifaqa_launched_v69');
    return renderWithToaster(
      <SplashScreen 
        quickMode={!introEnabled || hasSeenIntro}
        onDismiss={() => {
          localStorage.setItem('ifaqa_has_seen_intro', 'true');
          setAppState(user ? 'app' : (hasLaunched ? 'auth' : 'onboarding'));
        }}
      />
    );
  }

  if (appState === 'onboarding') {
      return renderWithToaster(
        <OnboardingFlow 
            onFinish={() => { 
                localStorage.setItem('ifaqa_launched_v69', 'true'); 
                setAppState('auth'); 
            }} 
        />
      );
  }
  
  if (appState === 'auth') return renderWithToaster(<AuthScreen onLogin={() => setAppState('app')} />);
  
  return renderWithToaster(
    <>
      {appState === 'app' && <></>}

      {/* Announcements Popup */}
      {announcement && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
                  <h3 className="font-bold text-xl mb-3 text-violet-600 dark:text-violet-400">
                    {typeof announcement === 'object' ? announcement.title : 'تنبيه هام'}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm leading-relaxed whitespace-pre-line">
                    {typeof announcement === 'object' ? announcement.body : announcement}
                  </p>
                  <button onClick={() => setAnnouncement(null)} className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-bold transition active:scale-95 shadow-lg shadow-violet-600/30">حسناً</button>
              </div>
          </div>
      )}

      {/* App Update Indicator */}
      {appUpdate && (
          <a href={appUpdate} target="_blank" rel="noreferrer" className="fixed top-20 left-4 z-[90] bg-emerald-500 text-white p-2 rounded-full shadow-lg animate-bounce">
              <RefreshCw size={20}/>
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
          </a>
      )}
      
      {appState === 'app' && user ? (
        <AppShell user={user} darkMode={darkMode} setDarkMode={setDarkMode} />
      ) : (
         <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <Loader2 className="animate-spin text-violet-600" size={40} />
         </div>
      )}
    </>
  );
}
