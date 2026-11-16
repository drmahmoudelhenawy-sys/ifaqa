import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User } from 'firebase/auth';
import { collection, query, onSnapshot, doc, writeBatch, updateDoc, deleteDoc, addDoc, setDoc, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { X, Search, MoreVertical, Shield, UserX, ShieldOff, UserCheck, Loader2, Edit3, Megaphone, Database, Save, Trash, MessageSquare, Quote, Reply, Send, Check, CheckCheck, ArrowLeft, Plus, Trophy, Mic, Settings as SettingsIcon, Target, RotateCcw, Zap, Sparkles, Bell, Calendar, Clock, Radio, CheckCircle, ExternalLink, SendHorizontal, Users, Moon, Headphones, Image, Upload, Volume2, Play, Square, Music } from 'lucide-react';
import { createPortal } from 'react-dom';
import { db } from '../services/firebase';
import { APP_ID } from '../constants';
import { ContentItem, MawanEvent, Challenge } from '../types';
import { dailyChallengesService } from '../src/services/dailyChallengesService';
import { clanService, ClanQuest } from '../src/services/clanService';
import { reciterCustomPhotosService, CustomReciterPhoto, normalizeReciterKey } from '../src/services/reciterCustomPhotosService';
import { QuranAudioHubService, HubReciter } from '../src/services/quranAudioHubService';
import { getReciterPhotoByName } from '../src/services/reciterPhotos';
import AdminEventModal from './AdminEventModal';

export interface AnnouncementItem {
  id: string;
  title?: string;
  text?: string;
  body?: string;
  active: boolean;
  isScheduled?: boolean;
  scheduledAt?: string | null;
  status?: 'pending' | 'sent' | 'cancelled';
  targetTopic?: string;
  targetPage?: string;
  timestamp?: any;
  sentAt?: any;
  createdBy?: string;
}

interface AdminPanelProps {
  user: User;
  onClose: () => void;
}

interface LeaderboardUser {
    id: string;
    name: string;
    xp: number;
    email?: string;
    isAdmin?: boolean;
    isBlocked?: boolean;
    photoURL?: string;
    gender?: 'male' | 'female';
}

interface SupportMsg {
    id: string;
    userId: string;
    userName: string;
    message: string;
    reply?: string;
    status: 'open' | 'replied' | 'seen';
    timestamp: any;
    isAutoReply?: boolean;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user, onClose }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'challenges' | 'reciters' | 'announcements' | 'content' | 'support' | 'events' | 'settings'>('users');
    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [announcementTitle, setAnnouncementTitle] = useState("تطبيق إفاقة ");
    const [announcementText, setAnnouncementText] = useState('');
    const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledDateTime, setScheduledDateTime] = useState('');
    const [targetPage, setTargetPage] = useState('home');
    const [targetTopic, setTargetTopic] = useState('all_users');
    const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
    const [updateLink, setUpdateLink] = useState('');
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
    const [defaultAlarmSound, setDefaultAlarmSound] = useState('https://server9.mp3quran.net/adhan/01.mp3');
    const [isSavingAlarmSound, setIsSavingAlarmSound] = useState(false);
    const [playingAlarmSound, setPlayingAlarmSound] = useState(false);
    const [isUploadingAlarmSound, setIsUploadingAlarmSound] = useState(false);
    const [uploadedAlarmFileName, setUploadedAlarmFileName] = useState('');
    const alarmFileInputRef = useRef<HTMLInputElement>(null);
    const adminAlarmAudioRef = useRef<HTMLAudioElement | null>(null);
    
    // Challenges State
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [newChallengeTitle, setNewChallengeTitle] = useState('');
    const [newChallengeXP, setNewChallengeXP] = useState<number | string>(150);
    const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editXP, setEditXP] = useState<number | string>(150);
    const [isSavingChallenge, setIsSavingChallenge] = useState(false);
    const [challengeFilter, setChallengeFilter] = useState('');

    // Clan Challenges State
    const [challengeSubTab, setChallengeSubTab] = useState<'daily' | 'clans'>('daily');
    const [clanQuests, setClanQuests] = useState<ClanQuest[]>([]);
    const [newClanQuestTitle, setNewClanQuestTitle] = useState('');
    const [newClanQuestDesc, setNewClanQuestDesc] = useState('');
    const [newClanQuestType, setNewClanQuestType] = useState<ClanQuest['targetType']>('salawat');
    const [newClanQuestTarget, setNewClanQuestTarget] = useState<number | string>(5000);
    const [newClanQuestBonus, setNewClanQuestBonus] = useState<number | string>(3500);
    const [newClanQuestIcon, setNewClanQuestIcon] = useState("icon:heart");
    const [isSavingClanQuest, setIsSavingClanQuest] = useState(false);

    // Content State
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [newContent, setNewContent] = useState<Partial<ContentItem>>({ type: 'hadith', duration: 15, active: true });

    // Support State (WhatsApp Style)
    const [supportMsgs, setSupportMsgs] = useState<SupportMsg[]>([]);
    const [chatUser, setChatUser] = useState<string | null>(null); // userId of active chat
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Sahar Night & Multiplier Tester State
    const [saharTesterMode, setSaharTesterMode] = useState<boolean>(() => {
        return localStorage.getItem('ifaqa_admin_sahar_tester_mode') === 'true';
    });
    const [testerWorshippers, setTesterWorshippers] = useState<number>(() => {
        const raw = localStorage.getItem('ifaqa_admin_sahar_tester_worshippers');
        return raw ? Math.max(1, parseInt(raw, 10) || 3) : 3;
    });

    useEffect(() => {
        const syncTesterState = () => {
            setSaharTesterMode(localStorage.getItem('ifaqa_admin_sahar_tester_mode') === 'true');
            const raw = localStorage.getItem('ifaqa_admin_sahar_tester_worshippers');
            setTesterWorshippers(raw ? Math.max(1, parseInt(raw, 10) || 3) : 3);
        };
        window.addEventListener('ifaqa_admin_sahar_tester_changed', syncTesterState);
        return () => window.removeEventListener('ifaqa_admin_sahar_tester_changed', syncTesterState);
    }, []);

    const handleToggleSaharTester = () => {
        const next = !saharTesterMode;
        setSaharTesterMode(next);
        localStorage.setItem('ifaqa_admin_sahar_tester_mode', next ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent('ifaqa_admin_sahar_tester_changed', { detail: { active: next, worshippers: testerWorshippers } }));
    };

    const handleChangeWorshippers = (delta: number) => {
        const next = Math.max(1, testerWorshippers + delta);
        setTesterWorshippers(next);
        localStorage.setItem('ifaqa_admin_sahar_tester_worshippers', String(next));
        window.dispatchEvent(new CustomEvent('ifaqa_admin_sahar_tester_changed', { detail: { active: saharTesterMode, worshippers: next } }));
    };

    // Events State
    const [events, setEvents] = useState<MawanEvent[]>([]);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<MawanEvent | null>(null);

    // Reciter Photos Management State
    const [allHubReciters, setAllHubReciters] = useState<HubReciter[]>([]);
    const [customPhotos, setCustomPhotos] = useState<Record<string, CustomReciterPhoto>>({});
    const [recitersLoading, setRecitersLoading] = useState(false);
    const [reciterSearch, setReciterSearch] = useState('');
    const [reciterFilter, setReciterFilter] = useState<'all' | 'custom' | 'missing'>('all');
    const [editingReciter, setEditingReciter] = useState<{
        name: string;
        photoUrl: string;
        notes?: string;
        isNew?: boolean;
    } | null>(null);
    const [isSavingReciterPhoto, setIsSavingReciterPhoto] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'leaderboard'));
        const unsub = onSnapshot(q, (snap) => {
            const userList = snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaderboardUser));
            setUsers(userList);
            setLoading(false);
        });
        
        // Fetch Content
        const contentUnsub = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'dynamic_content'), (snap) => {
            setContentItems(snap.docs.map(d => ({id: d.id, ...d.data()} as ContentItem)));
        });

        // Fetch ALL Support Messages
        const supportUnsub = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'support_messages'), orderBy('timestamp', 'desc')), (snap) => {
            setSupportMsgs(snap.docs.map(d => ({id: d.id, ...d.data()} as SupportMsg)));
        });

        // Fetch Events
        const eventsUnsub = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'mawan_events'), orderBy('startTime', 'desc')), (snap) => {
            setEvents(snap.docs.map(d => ({id: d.id, ...d.data()} as MawanEvent)));
        });

        // Fetch Global Config
        const configUnsub = onSnapshot(doc(db, 'artifacts', APP_ID, 'public', 'data', 'app_config', 'settings'), (snap) => {
            if (snap.exists()) {
                setIsVoiceEnabled(snap.data().voiceEnabled !== false);
                if (snap.data().defaultFajrAlarmSound) {
                    setDefaultAlarmSound(snap.data().defaultFajrAlarmSound);
                }
            }
        });

        // Subscribe to Daily Challenges
        const challengesUnsub = dailyChallengesService.subscribeToChallenges((items) => {
            setChallenges(items);
        });

        // Subscribe to Announcements & Notifications
        const announcementsUnsub = onSnapshot(
            query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'announcements'), orderBy('timestamp', 'desc')),
            (snap) => {
                setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as AnnouncementItem)));
            },
            (err) => console.warn('Announcements fetch error:', err)
        );

        // Subscribe to Global Clan Quests
        const clanQuestsUnsub = clanService.subscribeToGlobalQuests((items) => {
            setClanQuests(items);
        });

        // Subscribe to Reciters & Custom Photos
        setRecitersLoading(true);
        QuranAudioHubService.getReciters().then((list) => {
            setAllHubReciters(list || []);
            setRecitersLoading(false);
        }).catch((err) => {
            console.warn('Failed to load hub reciters in admin:', err);
            setRecitersLoading(false);
        });

        const reciterPhotosUnsub = reciterCustomPhotosService.subscribeToPhotos((photos) => {
            setCustomPhotos(photos);
        });

        return () => { unsub(); contentUnsub(); supportUnsub(); eventsUnsub(); configUnsub(); challengesUnsub(); announcementsUnsub(); clanQuestsUnsub(); reciterPhotosUnsub(); };
    }, []);

    // Daily Challenges Handlers
    const handleAddChallenge = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = newChallengeTitle.trim();
        if (!trimmed) {
            alert('يرجى كتابة عنوان التحدي أولاً');
            return;
        }
        const xpNum = Math.max(10, Math.round(Number(newChallengeXP) || 100));
        setIsSavingChallenge(true);
        try {
            await dailyChallengesService.addChallenge(trimmed, xpNum);
            setNewChallengeTitle('');
            setNewChallengeXP(150);
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء إضافة التحدي');
        } finally {
            setIsSavingChallenge(false);
        }
    };

    const handleStartEditChallenge = (ch: Challenge) => {
        setEditingChallengeId(ch.id);
        setEditTitle(ch.title);
        setEditXP(ch.xp);
    };

    const handleCancelEditChallenge = () => {
        setEditingChallengeId(null);
        setEditTitle('');
        setEditXP(150);
    };

    const handleSaveEditChallenge = async (id: string) => {
        const trimmed = editTitle.trim();
        if (!trimmed) {
            alert('يرجى إدخال عنوان التحدي');
            return;
        }
        const xpNum = Math.max(10, Math.round(Number(editXP) || 100));
        setIsSavingChallenge(true);
        try {
            await dailyChallengesService.updateChallenge(id, {
                title: trimmed,
                xp: xpNum
            });
            setEditingChallengeId(null);
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء تعديل التحدي');
        } finally {
            setIsSavingChallenge(false);
        }
    };

    const handleDeleteChallenge = async (id: string, title: string) => {
        if (window.confirm(`هل أنت متأكد من حذف التحدي:\n"${title}"؟`)) {
            setIsSavingChallenge(true);
            try {
                await dailyChallengesService.deleteChallenge(id);
            } catch (err) {
                console.error(err);
                alert('حدث خطأ أثناء حذف التحدي');
            } finally {
                setIsSavingChallenge(false);
            }
        }
    };

    const handleResetChallenges = async () => {
        if (window.confirm('هل تريد استعادة قائمة التحديات اليومية الافتراضية (10 تحديات)؟')) {
            setIsSavingChallenge(true);
            try {
                await dailyChallengesService.resetToDefaults();
                alert('تمت استعادة التحديات الافتراضية بنجاح.');
            } catch (err) {
                console.error(err);
                alert('حدث خطأ أثناء استعادة التحديات');
            } finally {
                setIsSavingChallenge(false);
            }
        }
    };

    // Clan Challenges Handlers
    const handleAddClanQuest = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newClanQuestTitle.trim();
        if (!trimmed) {
            alert('يرجى كتابة عنوان تحدي القبيلة');
            return;
        }
        setIsSavingClanQuest(true);
        try {
            await clanService.addGlobalQuest({
                title: trimmed,
                description: newClanQuestDesc.trim() || 'تحدي قبلي أسبوعي مشترك بين جميع أفراد القبيلة',
                targetType: newClanQuestType,
                targetAmount: Math.max(1, Number(newClanQuestTarget) || 100),
                bonusPoints: Math.max(10, Number(newClanQuestBonus) || 1000),
                icon: newClanQuestIcon || "icon:swords"
            });
            setNewClanQuestTitle('');
            setNewClanQuestDesc('');
            alert('تم نشر التحدي بنجاح لجميع القبائل في التطبيق!');
        } catch (err: any) {
            alert(err.message || 'حدث خطأ أثناء إضافة التحدي');
        } finally {
            setIsSavingClanQuest(false);
        }
    };

    const handleDeleteClanQuest = async (id: string, title: string) => {
        if (!window.confirm(`هل أنت متأكد من حذف تحدي القبائل "${title}"؟`)) return;
        try {
            await clanService.deleteGlobalQuest(id);
            alert('تم حذف التحدي بنجاح');
        } catch (err: any) {
            alert(err.message || 'حدث خطأ أثناء حذف التحدي');
        }
    };

    const handleToggleVoice = async () => {
        const newValue = !isVoiceEnabled;
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'app_config', 'settings'), {
            voiceEnabled: newValue
        }, { merge: true });
        alert(`تم ${newValue ? 'تفعيل' : 'تعطيل'} التسميع بالصوت لجميع المستخدمين`);
    };

    const handleTogglePlayAdminAlarm = (urlToPlay?: string) => {
        const target = urlToPlay || defaultAlarmSound;
        if (!target) return;
        if (playingAlarmSound) {
            if (adminAlarmAudioRef.current) {
                adminAlarmAudioRef.current.pause();
                adminAlarmAudioRef.current = null;
            }
            setPlayingAlarmSound(false);
            return;
        }
        try {
            const audio = new Audio(target);
            adminAlarmAudioRef.current = audio;
            setPlayingAlarmSound(true);
            audio.play().catch(() => setPlayingAlarmSound(false));
            audio.onended = () => setPlayingAlarmSound(false);
        } catch {
            setPlayingAlarmSound(false);
        }
    };

    const handleSaveDefaultAlarmSound = async (soundUrlToSave?: string) => {
        const urlToUse = soundUrlToSave !== undefined ? soundUrlToSave : defaultAlarmSound;
        setIsSavingAlarmSound(true);
        try {
            await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'app_config', 'settings'), {
                defaultFajrAlarmSound: urlToUse.trim()
            }, { merge: true });
            alert('تم حفظ نغمة منبّه الفجر الافتراضية بنجاح واعتمادها لجميع المستخدمين!');
        } catch (e: any) {
            alert(e.message || 'تعذر حفظ النغمة الافتراضية');
        } finally {
            setIsSavingAlarmSound(false);
        }
    };

    const handleUploadAlarmSound = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingAlarmSound(true);
        try {
            // Attempt to upload to Firebase Storage
            try {
                const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                const { storage } = await import('../services/firebase');
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const fileRef = ref(storage, `app_assets/fajr_alarms/${Date.now()}_${safeName}`);
                await uploadBytes(fileRef, file, { contentType: file.type || 'audio/mpeg' });
                const downloadUrl = await getDownloadURL(fileRef);
                setDefaultAlarmSound(downloadUrl);
                setUploadedAlarmFileName(file.name);
                alert(`تم رفع الملف "${file.name}" بنجاح إلى السحابة! يمكنك تجربته أو الضغط على "حفظ للجميع".`);
                return;
            } catch (storageErr: any) {
                console.warn('Firebase Storage upload error, using Data URL fallback:', storageErr);
            }

            // Fallback to FileReader Data URL
            const reader = new FileReader();
            reader.onload = (evt) => {
                const result = evt.target?.result as string;
                if (result) {
                    setDefaultAlarmSound(result);
                    setUploadedAlarmFileName(file.name);
                    alert(`تم تجهيز الملف "${file.name}" بنجاح! يمكنك تجربته أو الضغط على "حفظ للجميع".`);
                }
            };
            reader.readAsDataURL(file);
        } catch (err: any) {
            alert(err.message || 'تعذر معالجة الملف الصوتي');
        } finally {
            setIsUploadingAlarmSound(false);
            if (e.target) e.target.value = '';
        }
    };

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (chatUser && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatUser, supportMsgs]);

    const handleAction = async (targetUser: LeaderboardUser, action: 'toggleAdmin' | 'toggleBlock' | 'editXP') => {
        if (action === 'editXP') {
            const pin = window.prompt("أدخل كود الحماية لتعديل النقاط:");
            if (pin !== '085222') {
                alert("كود خاطئ!");
                return;
            }
            const newXP = parseInt(window.prompt(`النقاط الحالية: ${targetUser.xp}. أدخل النقاط الجديدة:`) || '');
            if (isNaN(newXP)) return;

            const batch = writeBatch(db);
            batch.update(doc(db, 'artifacts', APP_ID, 'users', targetUser.id, 'stats', 'profile'), { xp: newXP });
            batch.update(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaderboard', targetUser.id), { xp: newXP });
            await batch.commit();
            alert("تم تعديل النقاط بنجاح.");
            setActiveMenu(null);
            return;
        }

        const confirmationText = action === 'toggleAdmin' 
            ? `هل أنت متأكد من ${targetUser.isAdmin ? 'إزالة صلاحيات المدير من' : 'ترقية'} ${targetUser.name}؟`
            : `هل أنت متأكد من ${targetUser.isBlocked ? 'رفع الحظر عن' : 'حظر'} ${targetUser.name}؟`;
            
        if (!window.confirm(confirmationText)) return;

        const batch = writeBatch(db);
        const privateProfileRef = doc(db, 'artifacts', APP_ID, 'users', targetUser.id, 'stats', 'profile');
        const publicLeaderboardRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaderboard', targetUser.id);

        if (action === 'toggleAdmin') {
            const newAdminStatus = !targetUser.isAdmin;
            batch.update(privateProfileRef, { isAdmin: newAdminStatus });
            batch.update(publicLeaderboardRef, { isAdmin: newAdminStatus });
        } else {
            const newBlockedStatus = !targetUser.isBlocked;
            batch.update(privateProfileRef, { isBlocked: newBlockedStatus });
            batch.update(publicLeaderboardRef, { isBlocked: newBlockedStatus });
        }

        await batch.commit();
        setActiveMenu(null);
    };

    const handlePostAnnouncement = async () => {
        const title = announcementTitle.trim() || "تطبيق إفاقة ";
        const body = announcementText.trim();
        if (!body) {
            alert('يرجى كتابة نص التنبيه أولاً');
            return;
        }

        if (isScheduled && !scheduledDateTime) {
            alert('يرجى تحديد تاريخ ووقت الجدولة أولاً');
            return;
        }

        if (isScheduled && new Date(scheduledDateTime).getTime() <= Date.now()) {
            alert('يجب أن يكون وقت الجدولة في المستقبل (بعد الوقت الحالي)');
            return;
        }

        setIsSendingAnnouncement(true);
        try {
            const scheduledAtIso = isScheduled && scheduledDateTime ? new Date(scheduledDateTime).toISOString() : null;
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'announcements'), {
                title,
                body,
                text: body, // backward compatibility
                active: true,
                isScheduled,
                scheduledAt: scheduledAtIso,
                // 'pending' either way: the onCreate function skips docs already marked 'sent',
                // so marking instant announcements 'sent' here meant no push ever went out.
                status: 'pending',
                targetTopic,
                targetPage,
                timestamp: new Date(),
                sentAt: null,
                createdBy: user.email || user.displayName || user.uid
            });

            setAnnouncementText('');
            setScheduledDateTime('');
            setIsScheduled(false);
            alert(isScheduled ? " تمت جدولة التنبيه بنجاح" : " تم نشر التنبيه وإرساله بنجاح");
        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء حفظ ونشر التنبيه');
        } finally {
            setIsSendingAnnouncement(false);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا التنبيه؟')) return;
        try {
            await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'announcements', id));
        } catch (e) {
            console.error(e);
            alert('فشل حذف التنبيه');
        }
    };

    const handleToggleAnnouncementActive = async (item: AnnouncementItem) => {
        try {
            await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'announcements', item.id), {
                active: !item.active
            });
        } catch (e) {
            console.error(e);
            alert('فشل تحديث حالة التنبيه');
        }
    };

    const handleUpdateLink = async () => {
        if(!updateLink.trim()) return;
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'app_config', 'updates'), {
            hasUpdate: true,
            latestVersionLink: updateLink,
            timestamp: new Date()
        }, { merge: true });
        setUpdateLink('');
        alert('تم تحديث رابط التطبيق');
    };

    const handleAddContent = async () => {
        if(!newContent.text) return;
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'dynamic_content'), newContent);
        setNewContent({ type: 'hadith', duration: 15, active: true, text: '', source: '', explanation: '' });
    };

    const handleDeleteContent = async (id: string) => {
        if(window.confirm('حذف هذا المحتوى؟')) {
            await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'dynamic_content', id));
        }
    };

    // Chat Functions
    const getUniqueChatUsers = () => {
        const uniqueUsers = new Map();
        supportMsgs.forEach(msg => {
            if (!uniqueUsers.has(msg.userId)) {
                uniqueUsers.set(msg.userId, { 
                    name: msg.userName, 
                    lastMsg: msg,
                    count: 1 
                });
            } else {
                const data = uniqueUsers.get(msg.userId);
                // Keep latest
                if (msg.timestamp?.seconds > data.lastMsg.timestamp?.seconds) {
                    data.lastMsg = msg;
                }
                data.count++;
            }
        });
        return Array.from(uniqueUsers.entries()).map(([id, data]) => ({ id, ...data }));
    };

    const sendAdminReply = async () => {
        if (!chatUser || !chatInput.trim()) return;
        
        await addDoc(collection(db, 'artifacts', APP_ID, 'support_messages'), {
            userId: chatUser,
            userName: 'Admin',
            reply: chatInput.trim(), // Storing as reply but effectively a new message row
            status: 'replied',
            timestamp: new Date()
        });
        setChatInput('');
    };

    const markAsSeen = async (msgId: string) => {
        await updateDoc(doc(db, 'artifacts', APP_ID, 'support_messages', msgId), { status: 'seen' });
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Reciter Photos Handlers & Computations
    const handleSaveReciterPhoto = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!editingReciter) return;
        const name = editingReciter.name.trim();
        const photoUrl = (previewUrl || editingReciter.photoUrl).trim();
        if (!name) {
            alert('يرجى إدخال اسم الشيخ أو القارئ');
            return;
        }
        if (!photoUrl) {
            alert('يرجى إدخال رابط الصورة أو اختيار صورة من جهازك');
            return;
        }

        setIsSavingReciterPhoto(true);
        try {
            await reciterCustomPhotosService.savePhoto(name, photoUrl, user.email || 'Admin', editingReciter.notes);
            alert(`تم حفظ وتحديث صورة الشيخ "${name}" بنجاح وتطبيقها لجميع مستخدمي التطبيق `);
            setEditingReciter(null);
            setPreviewUrl('');
        } catch (err: any) {
            console.error(err);
            alert('حدث خطأ أثناء حفظ الصورة: ' + (err?.message || 'يرجى المحاولة مجدداً'));
        } finally {
            setIsSavingReciterPhoto(false);
        }
    };

    const handleDeleteCustomPhoto = async (name: string) => {
        if (window.confirm(`هل أنت متأكد من إلغاء الصورة المخصصة للشيخ:\n"${name}"\nوالعودة للصورة الافتراضية للتطبيق؟`)) {
            try {
                await reciterCustomPhotosService.deletePhoto(name);
                alert('تمت استعادة الصورة الافتراضية بنجاح.');
            } catch (err) {
                console.error(err);
                alert('حدث خطأ أثناء حذف الصورة.');
            }
        }
    };

    const handleFileChosen = (file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 360;
                let width = img.width;
                let height = img.height;
                const minDim = Math.min(width, height);
                const sx = (width - minDim) / 2;
                const sy = (height - minDim) / 2;
                canvas.width = Math.min(minDim, MAX_SIZE);
                canvas.height = Math.min(minDim, MAX_SIZE);
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    if (editingReciter) {
                        setEditingReciter({ ...editingReciter, photoUrl: dataUrl });
                    }
                    setPreviewUrl(dataUrl);
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const combinedRecitersList = useMemo(() => {
        const list: { id: string | number; name: string; photoUrl: string; isCustom: boolean; customData?: CustomReciterPhoto }[] = [];
        const seenNames = new Set<string>();

        // 1. Add all hub reciters
        allHubReciters.forEach((r) => {
            const custom = reciterCustomPhotosService.getCustomPhoto(r.name);
            const photo = custom || r.photoUrl || getReciterPhotoByName(r.name);
            list.push({
                id: r.id,
                name: r.name,
                photoUrl: photo,
                isCustom: !!custom,
                customData: custom ? customPhotos[normalizeReciterKey(r.name)] : undefined
            });
            seenNames.add(normalizeReciterKey(r.name));
        });

        // 2. Add custom photos that might not exist in hub reciters (e.g. newly added sheikhs)
        (Object.values(customPhotos) as CustomReciterPhoto[]).forEach((c) => {
            if (!c || !c.name) return;
            const norm = normalizeReciterKey(c.name);
            if (!seenNames.has(norm)) {
                list.unshift({
                    id: `custom_${norm}`,
                    name: c.name,
                    photoUrl: c.photoUrl,
                    isCustom: true,
                    customData: c
                });
                seenNames.add(norm);
            }
        });

        return list;
    }, [allHubReciters, customPhotos]);

    const filteredReciters = useMemo(() => {
        const term = reciterSearch.trim().toLowerCase();
        return combinedRecitersList.filter((r) => {
            const matchesSearch = !term || r.name.toLowerCase().includes(term);
            if (!matchesSearch) return false;
            if (reciterFilter === 'custom') return r.isCustom;
            if (reciterFilter === 'missing') return !r.photoUrl;
            return true;
        });
    }, [combinedRecitersList, reciterSearch, reciterFilter]);

    return createPortal(
        <div className="fixed inset-0 bg-slate-900 z-[80] flex flex-col text-white animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex-shrink-0 bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
                <h2 className="font-bold text-lg flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-violet-500/20 text-violet-400"><OutlineIcon name="shield" /></span>
                    <span>لوحة الإدارة والتحكم</span>
                </h2>
                <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-700 rounded-full"><X size={20}/></button>
            </div>
            
            {/* Tabs */}
            <div className="flex p-2 bg-slate-800/50 overflow-x-auto gap-1">
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${activeTab === 'users' ? 'bg-violet-600 shadow-lg' : 'text-slate-400 hover:bg-slate-700'}`}>المستخدمين</button>
                <button onClick={() => setActiveTab('challenges')} className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'challenges' ? 'bg-violet-600 shadow-lg text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
                    <Target size={16}/>
                    <span>التحديات اليومية</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-950/80 text-violet-300 font-mono">
                        {challenges.length}
                    </span>
                </button>
                <button onClick={() => setActiveTab('reciters')} className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'reciters' ? 'bg-violet-600 shadow-lg text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
                    <Headphones size={16}/>
                    <span>صور القراء والشيوخ</span>
                    {Object.keys(customPhotos).length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-mono">
                            {Object.keys(customPhotos).length}
                        </span>
                    )}
                </button>
                <button onClick={() => setActiveTab('support')} className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${activeTab === 'support' ? 'bg-violet-600 shadow-lg' : 'text-slate-400 hover:bg-slate-700'}`}>الدعم الفني</button>
                <button onClick={() => setActiveTab('events')} className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${activeTab === 'events' ? 'bg-violet-600 shadow-lg' : 'text-slate-400 hover:bg-slate-700'}`}>الفعاليات</button>
                <button onClick={() => setActiveTab('content')} className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${activeTab === 'content' ? 'bg-violet-600 shadow-lg' : 'text-slate-400 hover:bg-slate-700'}`}>المحتوى</button>
                <button onClick={() => setActiveTab('announcements')} className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${activeTab === 'announcements' ? 'bg-violet-600 shadow-lg' : 'text-slate-400 hover:bg-slate-700'}`}>تنبيهات</button>
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'settings' ? 'bg-violet-600 shadow-lg text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
                    <SettingsIcon size={16}/>
                    <span>الإدارة والتحكم</span>
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 bg-[#0b141a]">
                
                {/* Users Tab */}
                {activeTab === 'users' && (
                    <>
                         <div className="relative mb-4">
                            <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                            <input 
                                type="text"
                                placeholder="ابحث بالاسم أو البريد..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-4 pr-12 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        </div>
                        {loading ? (
                             <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-violet-500" size={32}/></div>
                        ) : (
                            <div className="space-y-2">
                                {filteredUsers.map(u => (
                                    <div key={u.id} className="bg-slate-800 p-3 rounded-lg flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                                            {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" alt={u.name} /> : <span className="flex items-center justify-center h-full text-lg">{outlineContent(u.gender === 'female' ? "icon:user" : "icon:user")}</span>}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-bold truncate text-sm flex items-center gap-2">
                                                {u.name}
                                                {u.isAdmin && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">مدير</span>}
                                                {u.isBlocked && <span className="text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">محظور</span>}
                                            </p>
                                            <p className="text-xs text-slate-400 truncate">{u.email} | {u.xp} XP</p>
                                        </div>
                                        <div className="relative">
                                            <button onClick={() => setActiveMenu(activeMenu === u.id ? null : u.id)} className="p-2 text-slate-400 hover:bg-slate-700 rounded-full">
                                                <MoreVertical size={20} />
                                            </button>
                                            {activeMenu === u.id && (
                                                <div className="absolute left-0 top-10 w-48 bg-slate-700 rounded-lg shadow-2xl z-20 p-2 space-y-1 animate-in fade-in zoom-in-95">
                                                    <button onClick={() => handleAction(u, 'editXP')} className="w-full text-right p-2 text-sm rounded-md hover:bg-slate-600 flex items-center gap-2">
                                                        <Edit3 size={16}/> تعديل النقاط
                                                    </button>
                                                    <button onClick={() => handleAction(u, 'toggleAdmin')} className="w-full text-right p-2 text-sm rounded-md hover:bg-slate-600 flex items-center gap-2">
                                                        {u.isAdmin ? <><ShieldOff size={16}/> إزالة صلاحيات</> : <><Shield size={16}/> ترقية لمدير</>}
                                                    </button>
                                                    <button onClick={() => handleAction(u, 'toggleBlock')} className="w-full text-right p-2 text-sm rounded-md hover:bg-slate-600 flex items-center gap-2">
                                                        {u.isBlocked ? <><UserCheck size={16}/> رفع الحظر</> : <><UserX size={16}/> حظر المستخدم</>}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Challenges Tab (Daily & Clan Quests) */}
                {activeTab === 'challenges' && (
                    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
                        {/* Sub-tab Navigation Switch */}
                        <div className="flex items-center gap-2 p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-inner w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => setChallengeSubTab('daily')}
                                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                                    challengeSubTab === 'daily'
                                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <Zap size={15} />
                                <span>التحديات اليومية الفردية</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setChallengeSubTab('clans')}
                                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                                    challengeSubTab === 'clans'
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <Shield size={15} />
                                <span>تحديات القبائل الأسبوعية ({clanQuests.length})</span>
                            </button>
                        </div>

                        {challengeSubTab === 'daily' && (
                            <>
                        {/* Header & Stats Banner */}
                        <div className="bg-gradient-to-r from-violet-950/60 via-indigo-950/50 to-slate-900 p-5 rounded-2xl border border-violet-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 flex-shrink-0">
                                    <Target size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                                        <span>إدارة التحديات اليومية</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-300 border border-violet-500/30 font-mono">
                                            {challenges.length} تحديات
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        إجمالي نقاط اليوم المتاحة: <span className="font-bold text-emerald-400 font-mono">{challenges.reduce((sum, c) => sum + (c.xp || 0), 0).toLocaleString()} XP</span>
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleResetChallenges}
                                disabled={isSavingChallenge}
                                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition active:scale-95 disabled:opacity-50"
                                title="استعادة التحديات الافتراضية"
                            >
                                <RotateCcw size={14} className={isSavingChallenge ? 'animate-spin' : ''} />
                                <span>استعادة الافتراضي</span>
                            </button>
                        </div>

                        {/* Add New Challenge Form */}
                        <form onSubmit={handleAddChallenge} className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700 shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                                    <Plus size={18} className="text-violet-400" />
                                    <span>إضافة تحدي يومي جديد</span>
                                </h4>
                                <span className="text-[11px] text-slate-400">يظهر فوراً لجميع المستخدمين</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-bold text-slate-400 mb-1.5">عنوان التحدي</label>
                                    <input
                                        type="text"
                                        value={newChallengeTitle}
                                        onChange={(e) => setNewChallengeTitle(e.target.value)}
                                        placeholder="مثال: صيام يوم الخميس، قراءة أذكار المساء، زيارة مريض..."
                                        className="w-full p-3 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition"
                                        disabled={isSavingChallenge}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 mb-1.5">النقاط (XP)</label>
                                    <input
                                        type="number"
                                        min="10"
                                        step="10"
                                        value={newChallengeXP}
                                        onChange={(e) => setNewChallengeXP(e.target.value)}
                                        placeholder="150"
                                        className="w-full p-3 bg-slate-900/90 border border-slate-700 rounded-xl text-sm font-bold text-emerald-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition font-mono"
                                        disabled={isSavingChallenge}
                                    />
                                </div>
                            </div>

                            {/* Quick XP selector chips */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[10px] text-slate-400 font-bold ml-1">نقاط سريعة:</span>
                                {[50, 100, 150, 200, 250, 300, 400, 500].map((pts) => (
                                    <button
                                        key={pts}
                                        type="button"
                                        onClick={() => setNewChallengeXP(pts)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
                                            Number(newChallengeXP) === pts
                                                ? 'bg-violet-600 text-white shadow-md'
                                                : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300'
                                        }`}
                                    >
                                        +{pts} XP
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={isSavingChallenge || !newChallengeTitle.trim()}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm rounded-xl transition-all duration-200 active:scale-95 shadow-lg shadow-violet-600/30"
                                >
                                    {isSavingChallenge ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    <span>إضافة التحدي</span>
                                </button>
                            </div>
                        </form>

                        {/* Challenges List Header with Search */}
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                                    <Zap size={16} className="text-amber-400" />
                                    <span>قائمة التحديات الحالية ({challenges.filter(c => c.title.toLowerCase().includes(challengeFilter.toLowerCase())).length})</span>
                                </h4>

                                {challenges.length > 4 && (
                                    <div className="relative w-full sm:w-64">
                                        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            value={challengeFilter}
                                            onChange={(e) => setChallengeFilter(e.target.value)}
                                            placeholder="بحث في التحديات..."
                                            className="w-full py-1.5 pr-9 pl-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-violet-500 outline-none"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Challenges List Items */}
                            <div className="space-y-2.5">
                                {challenges
                                    .filter(c => c.title.toLowerCase().includes(challengeFilter.toLowerCase()))
                                    .map((ch, index) => {
                                        const isEditing = editingChallengeId === ch.id;

                                        if (isEditing) {
                                            return (
                                                <div key={ch.id} className="p-4 bg-slate-800 rounded-2xl border-2 border-violet-500 shadow-xl space-y-3 animate-in zoom-in-95 duration-200">
                                                    <div className="flex items-center justify-between text-xs font-bold text-violet-300">
                                                        <span>تعديل التحدي #{index + 1}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono">ID: {ch.id}</span>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        <div className="sm:col-span-2">
                                                            <label className="block text-[10px] font-bold text-slate-400 mb-1">عنوان التحدي</label>
                                                            <input
                                                                type="text"
                                                                value={editTitle}
                                                                onChange={(e) => setEditTitle(e.target.value)}
                                                                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-violet-500 outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-400 mb-1">النقاط (XP)</label>
                                                            <input
                                                                type="number"
                                                                min="10"
                                                                step="10"
                                                                value={editXP}
                                                                onChange={(e) => setEditXP(e.target.value)}
                                                                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-emerald-400 focus:ring-2 focus:ring-violet-500 outline-none font-mono"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-1">
                                                        {[50, 100, 150, 200, 250, 300, 400, 500].map((pts) => (
                                                            <button
                                                                key={pts}
                                                                type="button"
                                                                onClick={() => setEditXP(pts)}
                                                                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                                                                    Number(editXP) === pts
                                                                        ? 'bg-violet-600 text-white font-bold'
                                                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                                }`}
                                                            >
                                                                +{pts}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="flex justify-end gap-2 pt-1 border-t border-slate-700/60">
                                                        <button
                                                            onClick={handleCancelEditChallenge}
                                                            disabled={isSavingChallenge}
                                                            className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition flex items-center gap-1"
                                                        >
                                                            <X size={14} />
                                                            <span>إلغاء</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleSaveEditChallenge(ch.id)}
                                                            disabled={isSavingChallenge}
                                                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                                                        >
                                                            {isSavingChallenge ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                            <span>حفظ التعديلات</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div 
                                                key={ch.id}
                                                className="p-3.5 bg-slate-800/80 hover:bg-slate-800 rounded-2xl border border-slate-700/80 hover:border-slate-600 transition-all duration-200 flex items-center justify-between gap-3 shadow-sm group"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="w-7 h-7 rounded-xl bg-slate-700/70 text-slate-400 text-xs font-mono font-bold flex items-center justify-center flex-shrink-0">
                                                        {index + 1}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-sm text-white truncate">
                                                            {ch.title}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                                                                +{ch.xp} XP
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleStartEditChallenge(ch)}
                                                        className="p-2 rounded-xl bg-slate-700/60 hover:bg-violet-600 text-slate-300 hover:text-white transition-all active:scale-95"
                                                        title="تعديل النقاط والاسم"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteChallenge(ch.id, ch.title)}
                                                        className="p-2 rounded-xl bg-slate-700/60 hover:bg-red-600/90 text-slate-300 hover:text-white transition-all active:scale-95"
                                                        title="حذف التحدي"
                                                    >
                                                        <Trash size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                {challenges.filter(c => c.title.toLowerCase().includes(challengeFilter.toLowerCase())).length === 0 && (
                                    <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700 text-slate-400">
                                        <Target size={36} className="mx-auto mb-2 opacity-30 text-violet-400" />
                                        <p className="font-bold text-sm">
                                            {challengeFilter ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد تحديات مضافة حالياً'}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            يمكنك إضافة تحديات جديدة من النموذج أعلاه أو الضغط على "استعادة الافتراضي"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                            </>
                        )}

                        {/* Clan Quests Manager */}
                        {challengeSubTab === 'clans' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                {/* Clan Quests Header */}
                                <div className="bg-gradient-to-r from-amber-950/60 via-orange-950/50 to-slate-900 p-5 rounded-2xl border border-amber-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                                            <Shield size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base text-white flex items-center gap-2">
                                                <span>إدارة تحديات وغزوات القبائل</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                                                    {clanQuests.length} تحديات نشطة
                                                </span>
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                أي تحدٍ يُضاف هنا يظهر فوراً لجميع القبائل، وعند مساهمة أي عضو تُحسب له وللقبيلة تلقائياً.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Add New Clan Quest Form */}
                                <form onSubmit={handleAddClanQuest} className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700 shadow-xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                                            <Plus size={18} className="text-amber-400" />
                                            <span>نشر تحدي قبيلة أسبوعي جديد</span>
                                        </h4>
                                        <span className="text-[11px] text-slate-400">ينتشر فوراً لكل القبائل</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">عنوان التحدي</label>
                                            <input
                                                type="text"
                                                required
                                                value={newClanQuestTitle}
                                                onChange={(e) => setNewClanQuestTitle(e.target.value)}
                                                placeholder="مثال: غزو الاستغفار العظيم، ختمة جزء عم..."
                                                className="w-full p-3 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none transition"
                                                disabled={isSavingClanQuest}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">نوع المساهمة وطريقة الحساب</label>
                                            <select
                                                value={newClanQuestType}
                                                onChange={(e) => {
                                                    const val = e.target.value as ClanQuest['targetType'];
                                                    setNewClanQuestType(val);
                                                    if (val === 'salawat') { setNewClanQuestIcon("icon:heart"); setNewClanQuestTarget(5000); }
                                                    else if (val === 'quran_pages') { setNewClanQuestIcon("icon:scroll"); setNewClanQuestTarget(300); }
                                                    else if (val === 'audio_minutes') { setNewClanQuestIcon("icon:headphones"); setNewClanQuestTarget(1000); }
                                                    else if (val === 'collective_khatma') { setNewClanQuestIcon("icon:book"); setNewClanQuestTarget(10); }
                                                    else if (val === 'tasbeeh') { setNewClanQuestIcon("icon:circle"); setNewClanQuestTarget(5000); }
                                                }}
                                                className="w-full p-3 bg-slate-900/90 border border-slate-700 rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-amber-500 outline-none transition"
                                                disabled={isSavingClanQuest}
                                            >
                                                <option value="salawat">الصلاة على النبي ﷺ (عداد صلوات تفاعلي)</option>
                                                <option value="quran_pages">تلاوة صفحات المصحف (ربط تلقائي بالصفحات)</option>
                                                <option value="collective_khatma">سورة معينة / ختمة جماعية (مثل سورة الكهف)</option>
                                                <option value="audio_minutes">استماع وتدبر (دقائق استماع إذاعات القرآن)</option>
                                                <option value="tasbeeh">رياض التسبيح والذكر (سبحة تفاعلية)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 mb-1.5">وصف التحدي والهدف منه</label>
                                        <input
                                            type="text"
                                            value={newClanQuestDesc}
                                            onChange={(e) => setNewClanQuestDesc(e.target.value)}
                                            placeholder="مثال: إنجاز 5000 صلاة على الحبيب المصطفى لتعطير موازين القبيلة"
                                            className="w-full p-3 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none transition"
                                            disabled={isSavingClanQuest}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">الهدف الرقمي (Target)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={newClanQuestTarget}
                                                onChange={(e) => setNewClanQuestTarget(e.target.value)}
                                                placeholder="5000"
                                                className="w-full p-3 bg-slate-900/90 border border-slate-700 rounded-xl text-sm font-bold text-amber-400 font-mono focus:ring-2 focus:ring-amber-500 outline-none transition"
                                                disabled={isSavingClanQuest}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">مكافأة بونص القبيلة (Bonus XP)</label>
                                            <input
                                                type="number"
                                                min="50"
                                                step="50"
                                                value={newClanQuestBonus}
                                                onChange={(e) => setNewClanQuestBonus(e.target.value)}
                                                placeholder="3500"
                                                className="w-full p-3 bg-slate-900/90 border border-slate-700 rounded-xl text-sm font-bold text-emerald-400 font-mono focus:ring-2 focus:ring-amber-500 outline-none transition"
                                                disabled={isSavingClanQuest}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">الأيقونة (إيموجي)</label>
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="text"
                                                    value={newClanQuestIcon}
                                                    onChange={(e) => setNewClanQuestIcon(e.target.value)}
                                                    className="w-14 p-2.5 text-center text-xl bg-slate-900/90 border border-slate-700 rounded-xl text-white outline-none"
                                                    disabled={isSavingClanQuest}
                                                />
                                                <div className="flex flex-wrap gap-1 flex-1">
                                                    {["icon:heart", "icon:scroll", "icon:book", "icon:headphones", "icon:circle", "icon:swords", "icon:landmark", "icon:star"].map(ic => (
                                                        <button
                                                            key={ic}
                                                            type="button"
                                                            onClick={() => setNewClanQuestIcon(ic)}
                                                            className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition ${newClanQuestIcon === ic ? 'bg-amber-500/30 border border-amber-500' : 'bg-slate-700/50 hover:bg-slate-700'}`}
                                                        >
                                                            {outlineContent(ic)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSavingClanQuest || !newClanQuestTitle.trim()}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-sm rounded-xl transition-all duration-200 active:scale-95 shadow-lg shadow-amber-500/20"
                                        >
                                            {isSavingClanQuest ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                            <span>نشر التحدي للقبائل</span>
                                        </button>
                                    </div>
                                </form>

                                {/* Active Clan Quests List */}
                                <div className="space-y-3">
                                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                                        <Shield size={16} className="text-amber-400" />
                                        <span>التحديات الأسبوعية النشطة ({clanQuests.length})</span>
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {clanQuests.map((quest) => (
                                            <div
                                                key={quest.id}
                                                className="p-4 bg-slate-800/90 hover:bg-slate-800 rounded-2xl border border-slate-700/80 shadow-md flex items-start justify-between gap-3 transition"
                                            >
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-2xl flex items-center justify-center shrink-0">
                                                        {outlineContent(quest.icon)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h5 className="font-bold text-sm text-white truncate">
                                                            {quest.title}
                                                        </h5>
                                                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                                                            {quest.description}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                                                الهدف: {quest.targetAmount.toLocaleString()}
                                                            </span>
                                                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                                                                +{quest.bonusPoints.toLocaleString()} XP بونص
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleDeleteClanQuest(quest.id, quest.title)}
                                                    className="p-2 rounded-xl bg-slate-700/60 hover:bg-red-600/90 text-slate-400 hover:text-white transition active:scale-95 shrink-0"
                                                    title="حذف هذا التحدي"
                                                >
                                                    <Trash size={15} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Reciters Photos Tab */}
                {activeTab === 'reciters' && (
                    <div className="space-y-5 animate-in fade-in duration-300 pb-10">
                        {/* Header Banner & Add Button */}
                        <div className="bg-gradient-to-r from-violet-950/80 via-slate-800 to-indigo-950/80 p-5 rounded-2xl border border-violet-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-violet-600/30 border border-violet-400/40 flex items-center justify-center text-violet-300 shrink-0 shadow-inner">
                                    <Headphones size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                                        <span>إدارة صور الشيوخ والقراء</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30">
                                            
                                            مباشر لجميع المستخدمين <OutlineIcon name="cloud" />
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-300/80 mt-1 leading-relaxed">
                                        تعديل أو رفع صور الشيوخ والقراء وتُحفظ مركزياً في السحابة وتنعكس في كافة واجهات ومشغلات التطبيق فوراً.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setEditingReciter({ name: '', photoUrl: '', isNew: true });
                                    setPreviewUrl('');
                                }}
                                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-violet-950/40 active:scale-95 transition-all shrink-0"
                            >
                                <Plus size={16} />
                                <span>إضافة شيخ / قارئ جديد</span>
                            </button>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="relative flex-1">
                                <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="ابحث باسم الشيخ أو القارئ (مثل: سلمان المطيري، المنشاوي، العفاسي)..."
                                    value={reciterSearch}
                                    onChange={(e) => setReciterSearch(e.target.value)}
                                    className="w-full p-3.5 pr-11 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-xs text-white placeholder:text-slate-500"
                                />
                            </div>

                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                <button
                                    type="button"
                                    onClick={() => setReciterFilter('all')}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                                        reciterFilter === 'all' ? 'bg-violet-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    الكل ({combinedRecitersList.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReciterFilter('custom')}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1 ${
                                        reciterFilter === 'custom' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    <span>مخصصة من الإدارة <OutlineIcon name="sparkles" /></span>
                                    <span>({Object.keys(customPhotos).length})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReciterFilter('missing')}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                                        reciterFilter === 'missing' ? 'bg-amber-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    بحاجة لصورة ({combinedRecitersList.filter(r => !r.photoUrl).length})
                                </button>
                            </div>
                        </div>

                        {/* Reciters List / Grid */}
                        {recitersLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                <Loader2 className="animate-spin text-violet-400" size={32} />
                                <span className="text-xs font-bold">جاري تحميل قائمة القراء والشيوخ...</span>
                            </div>
                        ) : filteredReciters.length === 0 ? (
                            <div className="text-center py-16 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 text-slate-400 space-y-2">
                                <Headphones size={40} className="mx-auto opacity-20" />
                                <p className="text-sm font-bold">لا يوجد قراء يطابقون البحث</p>
                                <p className="text-xs text-slate-500">يمكنك الضغط على «إضافة شيخ / قارئ جديد» لإدراج الاسم والصورة يدوياً</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {filteredReciters.map((r) => (
                                    <div
                                        key={r.name}
                                        className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 hover:border-violet-500/50 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all group shadow-sm"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="relative shrink-0">
                                                {r.photoUrl ? (
                                                    <img
                                                        src={r.photoUrl}
                                                        alt={r.name}
                                                        className="w-13 h-13 rounded-2xl object-cover ring-2 ring-slate-700 group-hover:ring-violet-500/50 shadow-md transition"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-violet-700 to-indigo-800 flex items-center justify-center text-white font-bold text-base shadow-md">
                                                        {r.name.slice(0, 2)}
                                                    </div>
                                                )}
                                                {r.isCustom && (
                                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-800 flex items-center justify-center text-[8px]" title="مخصصة من الإدارة">
                                                        
                                                        <OutlineIcon name="star" />
                                                    </span>
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-violet-200 transition">
                                                    {r.name}
                                                </h4>
                                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                    {r.isCustom ? (
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                                                            <span>مخصصة</span>
                                                            <span><OutlineIcon name="sparkles" /></span>
                                                        </span>
                                                    ) : r.photoUrl ? (
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-700/80 text-slate-300 font-semibold">
                                                            صورة افتراضية
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                                                            لا توجد صورة
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingReciter({
                                                        name: r.name,
                                                        photoUrl: r.photoUrl || '',
                                                        isNew: false
                                                    });
                                                    setPreviewUrl(r.photoUrl || '');
                                                }}
                                                className="px-2.5 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white text-xs font-bold flex items-center gap-1 transition active:scale-95"
                                                title="تغيير / تعديل الصورة"
                                            >
                                                <Edit3 size={13} />
                                                <span>تعديل</span>
                                            </button>

                                            {r.isCustom && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteCustomPhoto(r.name)}
                                                    className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition active:scale-95"
                                                    title="استعادة الصورة الافتراضية"
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Support Messages Tab (WhatsApp Style) */}
                {activeTab === 'support' && (
                    <div className="h-full flex flex-col bg-[#0b141a]">
                        {!chatUser ? (
                            // Chat List
                            <div className="space-y-2">
                                {getUniqueChatUsers().map(chat => (
                                    <div 
                                        key={chat.id} 
                                        onClick={() => setChatUser(chat.id)}
                                        className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-700 transition"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center text-xl">
                                            
                                            <OutlineIcon name="user" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <h4 className="font-bold text-white">{chat.name}</h4>
                                                <span className="text-[10px] text-slate-400">
                                                    {chat.lastMsg.timestamp?.seconds ? new Date(chat.lastMsg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-400 truncate">
                                                {outlineContent(chat.lastMsg.reply ? `Admin: ${chat.lastMsg.reply}` : chat.lastMsg.message)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {getUniqueChatUsers().length === 0 && <p className="text-center text-slate-500 mt-10">لا توجد رسائل</p>}
                            </div>
                        ) : (
                            // Active Chat Window
                            <div className="flex flex-col h-full absolute inset-0 bg-[#0b141a] z-50">
                                {/* Chat Header */}
                                <div className="bg-slate-800 p-3 flex items-center gap-3 shadow-md">
                                    <button onClick={() => setChatUser(null)} className="p-1"><ArrowLeft/></button>
                                    <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center"><OutlineIcon name="user" /></div>
                                    <h3 className="font-bold">{getUniqueChatUsers().find(u => u.id === chatUser)?.name || 'User'}</h3>
                                </div>
                                
                                {/* Messages Area */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('/assets/patterns/chat.png')] bg-opacity-10 bg-fixed">
                                    {supportMsgs
                                        .filter(msg => msg.userId === chatUser)
                                        .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)) // Oldest first
                                        .map(msg => {
                                            // Render User Message
                                            const isUserMsg = !!msg.message;
                                            // Render Admin Reply
                                            const isAdminMsg = !!msg.reply;

                                            // If message has reply, we show user message then admin message
                                            // Or simplified: treat row as user message, create fake row for admin reply
                                            return (
                                                <React.Fragment key={msg.id}>
                                                    {isUserMsg && (
                                                        <div className="flex justify-start">
                                                            <div className="bg-slate-800 text-white p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl max-w-[80%] shadow-sm relative">
                                                                <p className="text-sm pb-1">{outlineContent(msg.message)}</p>
                                                                <span className="text-[10px] text-slate-400 block text-right">
                                                                    {msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {isAdminMsg && (
                                                        <div className="flex justify-end">
                                                            <div className="bg-[#005c4b] text-white p-3 rounded-tl-xl rounded-bl-xl rounded-br-xl max-w-[80%] shadow-sm relative">
                                                                <p className="text-sm pb-1">{msg.reply}</p>
                                                                <div className="flex justify-end items-center gap-1">
                                                                    <span className="text-[10px] text-green-200">
                                                                        {msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                                                    </span>
                                                                    {msg.status === 'seen' ? <CheckCheck size={14} className="text-blue-300"/> : <Check size={14} className="text-slate-300"/>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    <div ref={chatEndRef}></div>
                                </div>

                                {/* Input Area */}
                                <div className="bg-slate-800 p-2 flex gap-2">
                                    <input 
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        placeholder="اكتب ردك..."
                                        className="flex-1 bg-slate-700 border-none rounded-full px-4 text-white"
                                        onKeyDown={e => e.key === 'Enter' && sendAdminReply()}
                                    />
                                    <button onClick={sendAdminReply} className="bg-[#00a884] p-3 rounded-full text-white"><Send size={18} className="rtl:rotate-180"/></button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Content Management Tab */}
                {activeTab === 'content' && (
                    <div className="space-y-6">
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <h3 className="font-bold mb-4 flex items-center gap-2"><Quote className="text-violet-400"/> إضافة محتوى جديد</h3>
                            <div className="space-y-3">
                                <select 
                                    className="w-full bg-slate-700 rounded-lg p-2 text-sm"
                                    value={newContent.type}
                                    onChange={e => setNewContent({...newContent, type: e.target.value as any})}
                                >
                                    <option value="hadith">حديث</option>
                                    <option value="zekr">ذكر</option>
                                    <option value="wisdom">حكمة</option>
                                </select>
                                <textarea 
                                    className="w-full bg-slate-700 rounded-lg p-2 text-sm h-20"
                                    placeholder="نص المحتوى..."
                                    value={newContent.text}
                                    onChange={e => setNewContent({...newContent, text: e.target.value})}
                                />
                                <input 
                                    className="w-full bg-slate-700 rounded-lg p-2 text-sm"
                                    placeholder="المصدر (اختياري)"
                                    value={newContent.source}
                                    onChange={e => setNewContent({...newContent, source: e.target.value})}
                                />
                                <input 
                                    className="w-full bg-slate-700 rounded-lg p-2 text-sm"
                                    placeholder="شرح مبسط (اختياري)"
                                    value={newContent.explanation}
                                    onChange={e => setNewContent({...newContent, explanation: e.target.value})}
                                />
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-slate-400">المدة (ثواني)</label>
                                    <input 
                                        type="number"
                                        className="w-20 bg-slate-700 rounded-lg p-2 text-sm"
                                        value={newContent.duration}
                                        onChange={e => setNewContent({...newContent, duration: parseInt(e.target.value)})}
                                    />
                                </div>
                                <button onClick={handleAddContent} className="w-full bg-violet-600 py-2 rounded-lg font-bold text-sm">نشر المحتوى</button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-bold text-sm text-slate-400">المحتوى النشط</h3>
                            {contentItems.map(item => (
                                <div key={item.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center group">
                                    <div className="flex-1">
                                        <p className="text-sm font-bold truncate">{item.text}</p>
                                        <span className="text-[10px] text-slate-500">{item.type} | {item.duration}s</span>
                                    </div>
                                    <button onClick={() => handleDeleteContent(item.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Announcements & Push Notifications Tab */}
                {activeTab === 'announcements' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Header Info Banner */}
                        <div className="bg-gradient-to-r from-violet-900/60 via-indigo-900/40 to-slate-800 p-4 rounded-2xl border border-violet-500/20 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-violet-300">
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-white text-base">مركز التنبيهات والإشعارات الفورية (FCM)</h3>
                                    <p className="text-xs text-slate-300">إرسال وجدولة إشعارات حقيقية للمستخدمين تظهر في شريط إشعارات الهاتف حتى والتطبيق مغلق.</p>
                                </div>
                            </div>
                            <span className="text-xs font-black px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                {announcements.length} تنبيه
                            </span>
                        </div>

                        {/* Compose & Schedule Form */}
                        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/60 space-y-4 shadow-xl">
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-sm text-white flex items-center gap-2">
                                    <Megaphone size={18} className="text-yellow-400" />
                                    <span>إنشاء تنبيه جديد لجميع المشتركين</span>
                                </h3>
                                <span className="text-[11px] font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                                    
                                    القناة: all_users <OutlineIcon name="globe" />
                                </span>
                            </div>

                            {/* Quick Title Chips */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5">اقتراحات عناوين سريعة:</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        "تطبيق إفاقة ",
                                        "تذكير بورد اليوم ",
                                        "تحدي جديد ينتظرك ",
                                        "صلاة على النبي ﷺ ",
                                        "تنبيه هام ومبارك "
                                    ].map(chip => (
                                        <button
                                            key={chip}
                                            type="button"
                                            onClick={() => setAnnouncementTitle(chip)}
                                            className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition ${
                                                announcementTitle === chip
                                                    ? 'bg-violet-600 text-white border-violet-500'
                                                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                                            }`}
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title Input */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">عنوان التنبيه (Title):</label>
                                <input
                                    type="text"
                                    value={announcementTitle}
                                    onChange={e => setAnnouncementTitle(e.target.value)}
                                    placeholder="مثال: لا تنسَ وردك القرآني اليوم..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500"
                                />
                            </div>

                            {/* Body Textarea */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-slate-400">نص التنبيه (Body):</label>
                                    <span className="text-[10px] text-slate-500 font-mono">{announcementText.length} حرف</span>
                                </div>
                                <textarea
                                    value={announcementText}
                                    onChange={e => setAnnouncementText(e.target.value)}
                                    rows={3}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 resize-none"
                                    placeholder="اكتب نص الإشعار هنا..."
                                />
                            </div>

                            {/* Action Destination */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">عند ضغط المستخدم على الإشعار، يفتح التطبيق على:</label>
                                <select
                                    value={targetPage}
                                    onChange={e => setTargetPage(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                                >
                                    <option value="home"> الصفحة الرئيسية (يومي)</option>
                                    <option value="quran_dashboard"> المصحف الشريف</option>
                                    <option value="quran_audio_hub"> إذاعات وتلاوات القرآن</option>
                                    <option value="challenges"> التحديات والمسابقات</option>
                                    <option value="prayer_times"> مواقيت الصلاة والأذان</option>
                                    <option value="athkar"> الأذكار اليومية</option>
                                    <option value="masbaha"> المسبحة الإلكترونية</option>
                                </select>
                            </div>

                            {/* Delivery Mode Selector (Instant vs Scheduled) */}
                            <div className="space-y-2 pt-1">
                                <label className="block text-xs font-bold text-slate-400">طريقة وتوقيت الإرسال:</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsScheduled(false)}
                                        className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                                            !isScheduled
                                                ? 'bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-600/30'
                                                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                        }`}
                                    >
                                        <Zap size={14} className={!isScheduled ? 'text-yellow-300' : ''} />
                                        <span>إرسال فوري الآن <OutlineIcon name="zap" /></span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsScheduled(true)}
                                        className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                                            isScheduled
                                                ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/30'
                                                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                        }`}
                                    >
                                        <Clock size={14} className={isScheduled ? 'text-amber-200' : ''} />
                                        <span>جدولة الإشعار لاحقاً <OutlineIcon name="clock" /></span>
                                    </button>
                                </div>

                                {isScheduled && (
                                    <div className="bg-slate-900/90 border border-amber-500/40 p-3 rounded-xl mt-2 animate-in fade-in space-y-1.5">
                                        <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                            <Calendar size={13} />
                                            <span>حدد تاريخ ووقت إطلاق الإشعار:</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={scheduledDateTime}
                                            onChange={e => setScheduledDateTime(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                                        />
                                        <p className="text-[11px] text-slate-400 leading-tight">
                                            سيتم وضع الإشعار في طابور الجدولة وإرساله تلقائياً للأجهزة المشتركة في الموعد المحدد.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Live Mobile Notification Preview */}
                            <div className="pt-2">
                                <label className="block text-xs font-bold text-slate-400 mb-1.5">معاينة حية لشريط إشعارات الهاتف (Android Notification):</label>
                                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 shadow-inner">
                                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                                        <div className="flex items-center gap-1.5 font-bold">
                                            <div className="w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center text-[9px] text-white"><OutlineIcon name="leaf" /></div>
                                            <span className="text-white">إفاقة</span>
                                            <span>•</span>
                                            <span className="text-violet-400">
                                                {isScheduled && scheduledDateTime
                                                    ? `مجدول: ${new Date(scheduledDateTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
                                                    : 'الآن'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">
                                            {outlineContent(isScheduled ? " مجدول" : " فوري")}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-white text-sm mb-0.5">
                                        {outlineContent(announcementTitle || "تطبيق إفاقة ")}
                                    </h4>
                                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                                        {announcementText || 'نص التنبيه سيظهر هنا في شريط إشعارات الهاتف...'}
                                    </p>
                                    <div className="mt-2 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-400">
                                        <span>الهدف: {targetPage}</span>
                                        <span className="text-emerald-400 flex items-center gap-1">
                                            <CheckCircle size={11} />
                                            <span>جاهز للإرسال لجميع الأجهزة</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="button"
                                disabled={isSendingAnnouncement || !announcementText.trim()}
                                onClick={handlePostAnnouncement}
                                className={`w-full py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${
                                    isScheduled
                                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-amber-600/30 hover:brightness-110'
                                        : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-violet-600/30 hover:brightness-110'
                                }`}
                            >
                                {isSendingAnnouncement ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>جارٍ حفظ ونشر التنبيه...</span>
                                    </>
                                ) : isScheduled ? (
                                    <>
                                        <Clock size={16} />
                                        <span>حفظ وجدولة الإشعار <OutlineIcon name="clock" /></span>
                                    </>
                                ) : (
                                    <>
                                        <SendHorizontal size={16} />
                                        <span>نشر وإرسال الإشعار لجميع الأجهزة الآن <OutlineIcon name="rocket" /></span>
                                    </>
                                )}
                            </button>
                            <p className="text-[10px] text-center text-slate-500">
                                يظهر الإشعار في شريط التنبيهات الخارجي للهاتف (System Tray) وأيضاً عند فتح التطبيق.
                            </p>
                        </div>

                        {/* Announcements History & Queue */}
                        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/60 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-sm text-white flex items-center gap-2">
                                    <Clock size={16} className="text-violet-400" />
                                    <span>طابور وسجل الإشعارات ({announcements.length})</span>
                                </h3>
                            </div>

                            {announcements.length === 0 ? (
                                <p className="text-xs text-slate-500 text-center py-4">لا توجد تنبيهات منشورة حتى الآن.</p>
                            ) : (
                                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                                    {announcements.map((item) => {
                                        const isItemScheduled = item.isScheduled && item.status === 'pending';
                                        return (
                                            <div
                                                key={item.id}
                                                className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                                                    isItemScheduled
                                                        ? 'bg-amber-950/20 border-amber-500/30'
                                                        : item.active
                                                        ? 'bg-slate-900 border-slate-700/80'
                                                        : 'bg-slate-900/50 border-slate-800 opacity-60'
                                                }`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h4 className="text-sm font-black text-white truncate">
                                                            {item.title || 'تنبيه عام'}
                                                        </h4>
                                                        {isItemScheduled ? (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                
                                                                <OutlineIcon name="clock" /> مجدول
                                                            </span>
                                                        ) : item.active ? (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                
                                                                <OutlineIcon name="circle" /> نشط / مُرسل
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                                                                
                                                                <OutlineIcon name="circle" /> متوقف
                                                            </span>
                                                        )}
                                                        {item.targetPage && (
                                                            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                                                
                                                                <OutlineIcon name="target" /> {item.targetPage}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-xs text-slate-300 leading-relaxed mb-2 break-words">
                                                        {item.body || item.text}
                                                    </p>

                                                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                                        {item.scheduledAt && (
                                                            <span className="text-amber-300">
                                                                موعد الإطلاق: {new Date(item.scheduledAt).toLocaleString('ar-EG')}
                                                            </span>
                                                        )}
                                                        {item.timestamp && (
                                                            <span>
                                                                تاريخ الإنشاء: {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString('ar-EG') : new Date().toLocaleDateString('ar-EG')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0 pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleAnnouncementActive(item)}
                                                        className={`p-1.5 rounded-lg border transition ${
                                                            item.active
                                                                ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
                                                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                                        }`}
                                                        title={item.active ? 'إيقاف التنبيه' : 'تفعيل التنبيه'}
                                                    >
                                                        <CheckCircle size={15} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteAnnouncement(item.id)}
                                                        className="p-1.5 rounded-lg bg-slate-800 text-red-400 border border-slate-700 hover:bg-red-950/40 hover:border-red-500/40 transition"
                                                        title="حذف التنبيه"
                                                    >
                                                        <Trash size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* App Update Section */}
                        <div className="bg-slate-800 p-4 rounded-xl space-y-3">
                            <h3 className="font-bold flex items-center gap-2"><Database size={20} className="text-emerald-400"/> تحديث التطبيق</h3>
                            <input 
                                type="url"
                                value={updateLink}
                                onChange={e => setUpdateLink(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white"
                                placeholder="رابط التحميل الجديد..."
                            />
                            <button onClick={handleUpdateLink} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold w-full">تحديث الرابط</button>
                            <p className="text-[10px] text-slate-500">سيظهر للمستخدمين نقطة خضراء وإشعار بوجود تحديث.</p>
                        </div>
                    </div>
                )}

                {/* Events Management Tab */}
                {activeTab === 'events' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <button 
                            onClick={() => { setEditingEvent(null); setShowEventModal(true); }}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                        >
                            <Plus size={20}/>
                            إضافة فعالية جديدة
                        </button>

                        <div className="space-y-3">
                            {events.map(event => (
                                <div key={event.id} className="bg-slate-800/80 backdrop-blur-sm p-4 rounded-xl border border-slate-700/50 flex justify-between items-center group hover:bg-slate-800 transition-colors">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${event.gradient || 'from-slate-600 to-slate-700'} flex items-center justify-center flex-shrink-0 shadow-inner ring-1 ring-white/10`}>
                                            <Trophy size={20} className="text-white drop-shadow-sm"/>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-sm truncate text-white">{event.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                                    event.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    event.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
                                                    event.status === 'draft' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                    {event.status === 'active' ? 'نشطة' : event.status === 'upcoming' ? 'قادمة' : event.status === 'draft' ? 'مسودة' : 'منتهية'}
                                                </span>
                                                <span className="text-[9px] text-slate-500 font-bold">
                                                    {event.startTime?.toDate().toLocaleDateString('ar-EG')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => { setEditingEvent(event); setShowEventModal(true); }}
                                            className="p-2.5 bg-slate-700/50 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-all active:scale-95"
                                            title="تعديل"
                                        >
                                            <Edit3 size={18}/>
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                if(window.confirm('هل أنت متأكد من حذف هذه الفعالية؟')) {
                                                    await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'mawan_events', event.id));
                                                }
                                            }}
                                            className="p-2.5 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
                                            title="حذف"
                                        >
                                            <Trash size={18}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {events.length === 0 && (
                                <div className="text-center py-20 text-slate-500 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
                                    <Database size={48} className="mx-auto mb-4 opacity-10"/>
                                    <p className="text-sm font-bold">لا توجد فعاليات مضافة بعد</p>
                                    <p className="text-xs mt-1 text-slate-600">ابدأ بإضافة أول فعالية لمعوان الآن</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Sahar Night & Multiplier Tester Card */}
                        <div className="bg-gradient-to-br from-purple-950/90 via-slate-900 to-indigo-950/90 p-6 rounded-2xl border border-purple-500/40 shadow-xl space-y-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
                                        
                                        <OutlineIcon name="moon" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-base text-white">ثيم المستغفرين بالأسحار ومحراب القبائل (وضع المجرّب)</h3>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                
                                                خاص بالمدير <OutlineIcon name="zap" />
                                            </span>
                                        </div>
                                        <p className="text-xs text-purple-200/80 mt-1 leading-relaxed">
                                            تجربة وتفعيل ثيم السماء البنفسجية السماوية والنجوم اللامعة ومضاعفة نقاط القبائل في أي وقت دون انتظار وقت الثلث الأخير قبل الفجر.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Status & Toggle Controls */}
                            <div className="bg-purple-900/30 border border-purple-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                    <span className={`w-3 h-3 rounded-full shrink-0 ${saharTesterMode ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400' : 'bg-slate-500'}`} />
                                    <span className="text-xs font-bold text-slate-200">
                                        حالة وضع التجربة: {saharTesterMode ? <span className="text-emerald-400 font-black">نشط حالياً (الواجهة تعمل بثيم الأسحار <OutlineIcon name="sparkles" />)</span> : <span className="text-slate-400">معطل (يعمل بتوقيت السحر الفعلي فقط)</span>}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleToggleSaharTester}
                                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg ${
                                        saharTesterMode
                                            ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white hover:from-red-500 hover:to-rose-600 shadow-red-950/40'
                                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-purple-950/40'
                                    }`}
                                >
                                    <span>{outlineContent(saharTesterMode ? "إيقاف وضع التجربة " : "تفعيل وضع التجربة ")}</span>
                                </button>
                            </div>

                            {/* Attendees / Multiplier Simulator */}
                            <div className="bg-slate-900/70 border border-purple-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="space-y-1 w-full sm:w-auto">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                                        <Users size={16} className="text-purple-400" />
                                        <span>محاكاة رفقاء المحراب (لاختبار المضاعفة)</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                        إذا كان عدد المصلين 3 أو أكثر تظهر مضاعفة <strong className="text-amber-300 font-mono">3x <OutlineIcon name="star" /></strong> أو أكثر في الواجهة الرئيسية والقبائل، وأقل من 3 تظهر مضاعفة <strong className="text-amber-300 font-mono">2x <OutlineIcon name="star" /></strong>.
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl p-1.5">
                                        <button
                                            type="button"
                                            disabled={testerWorshippers <= 1}
                                            onClick={() => handleChangeWorshippers(-1)}
                                            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-black flex items-center justify-center transition"
                                            title="إنقاص عدد المصلين"
                                        >
                                            -
                                        </button>
                                        <span className="min-w-[3.5rem] text-center font-mono font-black text-sm text-purple-300">
                                            
                                            <OutlineIcon name="users" /> {testerWorshippers}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleChangeWorshippers(1)}
                                            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-black flex items-center justify-center transition"
                                            title="زيادة عدد المصلين"
                                        >
                                            +
                                        </button>
                                    </div>

                                    <div className="px-3 py-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-black font-mono flex items-center gap-1 shrink-0">
                                        <span>{testerWorshippers >= 3 ? `${testerWorshippers}x` : '2x'}</span>
                                        <span><OutlineIcon name="star" /></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-3">
                                <SettingsIcon className="text-violet-400" size={24}/>
                                إعدادات النظام العامة
                            </h3>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${isVoiceEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                            <Mic size={24}/>
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">التسميع بالصوت (الميكروفون)</p>
                                            <p className="text-[10px] text-slate-500">إظهار أو إخفاء أيقونة الميكروفون في المصحف لجميع المستخدمين</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleToggleVoice}
                                        className={`w-14 h-8 rounded-full relative transition-colors duration-300 outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${isVoiceEnabled ? 'bg-emerald-600' : 'bg-slate-600'}`}
                                    >
                                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-lg ${isVoiceEnabled ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Default Alarm Sound Card */}
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-5">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-lg flex items-center gap-3">
                                    <Volume2 className="text-amber-400" size={24}/>
                                    نغمة منبّه الفجر الافتراضية
                                </h3>
                                <span className="text-xs bg-amber-500/15 text-amber-300 px-3 py-1 rounded-full font-bold border border-amber-500/30">
                                    عامة لكل المستخدمين
                                </span>
                            </div>

                            <p className="text-xs text-slate-400">
                                يمكنك رفع ملف صوتي مباشر من جهازك (MP3) أو اختيار نغمة جاهزة لتكون نغمة منبه الفجر الافتراضية التي ترن لدى جميع مستخدمي التطبيق.
                            </p>

                            {/* Prominent Upload Box */}
                            <div 
                                onClick={() => alarmFileInputRef.current?.click()}
                                className="border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 active:scale-99"
                            >
                                <input 
                                    ref={alarmFileInputRef}
                                    type="file" 
                                    accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac" 
                                    onChange={handleUploadAlarmSound} 
                                    className="hidden" 
                                />
                                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center shadow-md">
                                    {isUploadingAlarmSound ? <Loader2 size={26} className="animate-spin text-amber-400" /> : <Upload size={26} />}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white">
                                        {isUploadingAlarmSound ? 'جاري رفع الملف الصوتي...' : 'اضغط هنا لرفع نغمة من جهازك (UPLOAD)'}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-1">يدعم ملفات الصوت (MP3, WAV, M4A, OGG) مباشرة من هاتفك أو حاسوبك</p>
                                </div>
                                {uploadedAlarmFileName && (
                                    <div className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-sm animate-in zoom-in">
                                        <Check size={14} strokeWidth={3} />
                                        <span>ملف محدد: {uploadedAlarmFileName}</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="text-[11px] font-bold text-slate-400 mb-2">أو اختر من النغمات الإسلامية الجاهزة:</div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {[
                                        { name: 'أذان الحرم المكي', url: 'https://server9.mp3quran.net/adhan/01.mp3' },
                                        { name: 'أذان المسجد النبوي', url: 'https://server9.mp3quran.net/adhan/02.mp3' },
                                        { name: 'تكبيرات الفجر', url: 'https://server9.mp3quran.net/adhan/03.mp3' },
                                        { name: 'نغمة السكينة', url: 'https://server9.mp3quran.net/adhan/04.mp3' }
                                    ].map((preset) => (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => {
                                                setDefaultAlarmSound(preset.url);
                                                setUploadedAlarmFileName('');
                                            }}
                                            className={`p-2.5 rounded-xl border text-center text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                                defaultAlarmSound === preset.url
                                                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/40'
                                                    : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                                            }`}
                                        >
                                            <Music size={13} />
                                            <span>{preset.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                                <input
                                    type="text"
                                    value={defaultAlarmSound.startsWith('data:') ? `[ملف مرفوع] ${uploadedAlarmFileName || 'صوت مخصص'}` : defaultAlarmSound}
                                    onChange={(e) => {
                                        if (!e.target.value.startsWith('[ملف مرفوع]')) {
                                            setDefaultAlarmSound(e.target.value);
                                        }
                                    }}
                                    readOnly={defaultAlarmSound.startsWith('data:')}
                                    placeholder="رابط النغمة المباشر (MP3) أو ملف مرفوع"
                                    dir="ltr"
                                    className="flex-1 min-w-[200px] p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono outline-none focus:border-amber-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleTogglePlayAdminAlarm()}
                                    className="p-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-amber-300 font-bold flex items-center gap-1.5 transition flex-shrink-0"
                                    title={playingAlarmSound ? 'إيقاف التجربة' : 'تجربة الصوت'}
                                >
                                    {playingAlarmSound ? <Square size={16} className="fill-current text-red-400" /> : <Play size={16} className="fill-current" />}
                                    <span className="text-xs">{playingAlarmSound ? 'إيقاف' : 'تجربة'}</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={isSavingAlarmSound || isUploadingAlarmSound || !defaultAlarmSound.trim()}
                                    onClick={() => handleSaveDefaultAlarmSound()}
                                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg transition disabled:opacity-50 flex-shrink-0"
                                >
                                    {isSavingAlarmSound ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    <span>حفظ للجميع</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-violet-600/10 rounded-xl border border-violet-500/20">
                            <p className="text-xs text-violet-300 leading-relaxed text-center">
                                هذه الإعدادات تؤثر على جميع مستخدمي التطبيق فوراً. يرجى استخدامها بحذر.
                            </p>
                        </div>
                    </div>
                )}

            </div>

            {/* Event Modal Integration */}
            {showEventModal && (
                <AdminEventModal 
                    eventToEdit={editingEvent} 
                    onClose={() => setShowEventModal(false)}
                />
            )}

            {/* Reciter Photo Edit / Add Modal */}
            {editingReciter && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full text-white shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <Headphones size={20} className="text-violet-400" />
                                <span>{editingReciter.isNew ? 'إضافة شيخ / قارئ جديد' : `تعديل صورة الشيخ`}</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => { setEditingReciter(null); setPreviewUrl(''); }}
                                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Live Avatar Preview */}
                        <div className="flex flex-col items-center justify-center py-2 space-y-2">
                            <div className="relative">
                                {(previewUrl || editingReciter.photoUrl) ? (
                                    <img
                                        src={previewUrl || editingReciter.photoUrl}
                                        alt="معاينة"
                                        className="w-24 h-24 rounded-2xl object-cover shadow-2xl ring-4 ring-violet-500/50"
                                        onError={() => setPreviewUrl('')}
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 gap-1">
                                        <Image size={24} />
                                        <span className="text-[10px]">لا توجد صورة</span>
                                    </div>
                                )}
                            </div>
                            <span className="text-[11px] text-slate-400">معاينة الصورة الحية كما ستظهر في التطبيق</span>
                        </div>

                        <form onSubmit={handleSaveReciterPhoto} className="space-y-4">
                            {/* Reciter Name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                                    اسم الشيخ / القارئ
                                </label>
                                <input
                                    type="text"
                                    disabled={!editingReciter.isNew}
                                    value={editingReciter.name}
                                    onChange={(e) => setEditingReciter({ ...editingReciter, name: e.target.value })}
                                    placeholder="مثال: سلمان عبيد المطيري"
                                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-violet-500 outline-none disabled:opacity-60"
                                    required
                                />
                            </div>

                            {/* Option 1: Upload from Device */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                                    
                                    طريقة 1: رفع صورة من هاتفك أو جهازك (موصى بها <OutlineIcon name="folder" />)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-violet-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98"
                                >
                                    <Upload size={16} />
                                    <span>اختيار صورة من المعرض / الملفات</span>
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    onChange={(e) => handleFileChosen(e.target.files?.[0] || null)}
                                    className="hidden"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">
                                    يتم قصها وضغطها تلقائياً كأفاتار خفيف وعالي الجودة لتُحفظ بالسحابة وتعمل لجميع المستخدمين.
                                </p>
                            </div>

                            {/* Option 2: Image URL */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                                    طريقة 2: أو لصق رابط صورة مباشر (URL)
                                </label>
                                <input
                                    type="url"
                                    value={editingReciter.photoUrl}
                                    onChange={(e) => {
                                        setEditingReciter({ ...editingReciter, photoUrl: e.target.value });
                                        setPreviewUrl(e.target.value);
                                    }}
                                    placeholder="https://example.com/photo.jpg"
                                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white dir-ltr font-mono focus:ring-2 focus:ring-violet-500 outline-none"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setEditingReciter(null); setPreviewUrl(''); }}
                                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingReciterPhoto || !editingReciter.name.trim() || !(previewUrl || editingReciter.photoUrl).trim()}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-violet-950/50 transition"
                                >
                                    {isSavingReciterPhoto ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>جاري الحفظ...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            <span>حفظ للجميع <OutlineIcon name="save" /></span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};

export default AdminPanel;
