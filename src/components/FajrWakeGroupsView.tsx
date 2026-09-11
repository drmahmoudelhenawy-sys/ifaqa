import React, { useState, useEffect } from 'react';
import {
  Users,
  Lock,
  Globe,
  Plus,
  KeyRound,
  CheckCircle2,
  Phone,
  RotateCcw,
  Sparkles,
  Share2,
  ChevronRight,
  LogOut,
  AlertCircle,
  Copy,
  Check,
  Sunrise,
  ShieldCheck,
  UserCheck,
  Clock,
  ArrowRight,
  Edit2
} from 'lucide-react';
import { auth } from '../../services/firebase';
import {
  fajrGroupsService,
  FajrGroup,
  GroupMember,
  GroupCategory,
  getTodayDateStr
} from '../services/fajrGroupsService';

export default function FajrWakeGroupsView() {
  const user = auth.currentUser;
  const todayStr = getTodayDateStr();

  const [activeTab, setActiveTab] = useState<'my_groups' | 'explore'>('my_groups');
  const [joinedGroupIds, setJoinedGroupIds] = useState<string[]>(fajrGroupsService.getJoinedGroupIds());
  const [myGroups, setMyGroups] = useState<FajrGroup[]>([]);
  const [publicGroups, setPublicGroups] = useState<FajrGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<FajrGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinPinModal, setShowJoinPinModal] = useState(false);

  // Create Form State
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createCategory, setCreateCategory] = useState<GroupCategory>('youth_boys');
  const [createIsPrivate, setCreateIsPrivate] = useState(true);
  const [createPin, setCreatePin] = useState('');
  const [creatorPhone, setCreatorPhone] = useState('');
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Join PIN State
  const [joinGroupIdInput, setJoinGroupIdInput] = useState('');
  const [joinPinInput, setJoinPinInput] = useState('');
  const [joinPhoneInput, setJoinPhoneInput] = useState('');
  const [joinError, setJoinError] = useState('');

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Phone editing state for current user
  const [editingPhone, setEditingPhone] = useState(false);
  const [userPhoneInput, setUserPhoneInput] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSavePhone = async () => {
    if (!selectedGroup) return;
    setIsSavingPhone(true);
    try {
      await fajrGroupsService.updateMemberPhone(selectedGroup.id, userPhoneInput);
      setEditingPhone(false);
      showToast('تم حفظ وتحديث رقم هاتفك للتنبيه بنجاح ✨');
    } catch (err: any) {
      showToast(err.message || 'فشل تحديث رقم الهاتف');
    } finally {
      setIsSavingPhone(false);
    }
  };

  // Subscribe to public groups
  useEffect(() => {
    const unsub = fajrGroupsService.subscribePublicGroups((groups) => {
      setPublicGroups(groups);
    });
    return () => unsub();
  }, []);

  // Sync user's joined groups
  useEffect(() => {
    const ids = fajrGroupsService.getJoinedGroupIds();
    setJoinedGroupIds(ids);

    if (ids.length === 0) {
      setMyGroups([]);
      setSelectedGroup(null);
      return;
    }

    // Load group details for each joined group
    const unsubs: (() => void)[] = [];
    const loadedMap = new Map<string, FajrGroup>();

    ids.forEach((id) => {
      const unsub = fajrGroupsService.subscribeGroup(id, (group) => {
        if (group) {
          loadedMap.set(id, group);
        } else {
          loadedMap.delete(id);
        }
        const arr = Array.from(loadedMap.values());
        setMyGroups(arr);
        if (!selectedGroup && arr.length > 0) {
          setSelectedGroup(arr[0]);
        }
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach(u => u());
    };
  }, [joinedGroupIds.length]);

  // Subscribe to selected group members
  useEffect(() => {
    if (!selectedGroup) {
      setGroupMembers([]);
      return;
    }
    const unsub = fajrGroupsService.subscribeGroupMembers(selectedGroup.id, (members) => {
      setGroupMembers(members);
    });
    return () => unsub();
  }, [selectedGroup?.id]);

  const currentMember = groupMembers.find(m => m.id === user?.uid);
  const isAwakeToday = currentMember?.awakeDate === todayStr;

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setIsSubmitting(true);

    try {
      const newGroupId = await fajrGroupsService.createGroup({
        name: createName,
        description: createDesc,
        category: createCategory,
        isPrivate: createIsPrivate,
        pinCode: createPin,
        creatorName: user?.displayName || 'المنشئ',
        creatorPhone: creatorPhone
      });

      setJoinedGroupIds(fajrGroupsService.getJoinedGroupIds());
      setShowCreateModal(false);
      setCreateName('');
      setCreateDesc('');
      setCreatePin('');
      showToast('تم إنشاء المجموعة بنجاح!');
    } catch (err: any) {
      setCreateError(err.message || 'حدث خطأ أثناء إنشاء المجموعة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    setIsSubmitting(true);

    try {
      await fajrGroupsService.joinGroup(
        joinGroupIdInput,
        joinPinInput,
        user?.displayName || 'رفيق الفجر',
        joinPhoneInput
      );

      setJoinedGroupIds(fajrGroupsService.getJoinedGroupIds());
      setShowJoinPinModal(false);
      setJoinGroupIdInput('');
      setJoinPinInput('');
      showToast('تم الانضمام للمجموعة بنجاح!');
    } catch (err: any) {
      setJoinError(err.message || 'تعذر الانضمام للمجموعة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickJoinPublic = async (group: FajrGroup) => {
    try {
      await fajrGroupsService.joinGroup(group.id, undefined, user?.displayName || 'رفيق الفجر');
      setJoinedGroupIds(fajrGroupsService.getJoinedGroupIds());
      setSelectedGroup(group);
      setActiveTab('my_groups');
      showToast(`أهلاً بك في مجموعة "${group.name}"!`);
    } catch (err: any) {
      showToast(err.message || 'تعذر الانضمام.');
    }
  };

  const handleMarkAwake = async () => {
    if (!selectedGroup) return;
    try {
      await fajrGroupsService.markAwake(selectedGroup.id);
      showToast('ما شاء الله! تقبل الله طاعتك وصلاة فجرك.');
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ.');
    }
  };

  const handleUndoAwake = async () => {
    if (!selectedGroup) return;
    try {
      await fajrGroupsService.undoAwake(selectedGroup.id);
      showToast('تم التراجع عن تسجيل الاستيقاظ.');
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ.');
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!window.confirm('هل أنت متأكد من مغادرة هذه المجموعة؟')) return;
    try {
      await fajrGroupsService.leaveGroup(groupId);
      setJoinedGroupIds(fajrGroupsService.getJoinedGroupIds());
      showToast('تمت مغادرة المجموعة.');
    } catch (err: any) {
      showToast(err.message || 'تعذر المغادرة.');
    }
  };

  const handleCopyInvite = (group: FajrGroup) => {
    const text = group.isPrivate
      ? `انضم لمجموعتي الخاصة في تطبيق إفاقة لإيقاظ الفجر:\nالمجموعة: ${group.name}\nكود المجموعة: ${group.id}\nالرقم السري: ${group.pinCode || 'بدون'}`
      : `انضم لمجموعة الفجر في تطبيق إفاقة:\nالمجموعة: ${group.name}\nكود المجموعة: ${group.id}`;

    navigator.clipboard?.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    showToast('تم نسخ بيانات المجموعة والرقم السري بنجاح!');
  };

  const getCategoryBadge = (cat: GroupCategory) => {
    switch (cat) {
      case 'youth_boys':
        return <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">👨‍👦 شباب</span>;
      case 'youth_girls':
        return <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">🧕 بنات</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">🌟 عامة</span>;
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-emerald-500/40 text-emerald-300 shadow-2xl text-xs font-black backdrop-blur-md animate-in fade-in slide-in-from-bottom-3">
          {toastMessage}
        </div>
      )}

      {/* Main Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-white/10 p-5 shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-black">
              <Sunrise size={14} />
              <span>نتعاون على صلاة الفجر</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">مجموعات ورفقاء الفجر</h2>
            <p className="text-xs text-slate-300 font-bold max-w-md">
              نصحى سوا ونعين بعض على طاعة الله… أنشئ مجموعة خاصة لأصحابك برقم سري أو انضم لمجموعات الشباب والبنات.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <Plus size={16} strokeWidth={3} />
              <span>إنشاء مجموعة</span>
            </button>
            <button
              type="button"
              onClick={() => setShowJoinPinModal(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-black text-xs flex items-center gap-1.5 active:scale-95 transition"
              title="انضمام برقم سري"
            >
              <KeyRound size={15} className="text-amber-300" />
              <span>كود / سرّي</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="relative z-10 mt-5 flex rounded-2xl bg-slate-950/80 p-1 border border-white/15">
          <button
            type="button"
            onClick={() => setActiveTab('my_groups')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'my_groups'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users size={15} className={activeTab === 'my_groups' ? 'text-slate-950' : 'text-amber-300'} />
            <span>مجموعاتي ({myGroups.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('explore')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'explore'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Globe size={15} className={activeTab === 'explore' ? 'text-slate-950' : 'text-amber-300'} />
            <span>استكشاف المجموعات العامة ({publicGroups.length})</span>
          </button>
        </div>
      </div>

      {/* CONTENT: MY GROUPS */}
      {activeTab === 'my_groups' && (
        <div className="space-y-4">
          {myGroups.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-slate-900/60 border border-white/5 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300">
                <Users size={28} />
              </div>
              <h3 className="text-base font-black text-white">لم تنضم لأي مجموعة بعد</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto font-bold">
                أنشئ مجموعة خاصة برقم سري لك ولأصدقائك، أو انضم لمجموعة عامة من تبويب الاستكشاف.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs"
                >
                  إنشاء مجموعة الآن
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('explore')}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white font-black text-xs"
                >
                  استكشاف المجموعات
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group Selector Pills */}
              {myGroups.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {myGroups.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGroup(g)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex-shrink-0 flex items-center gap-1.5 ${
                        selectedGroup?.id === g.id
                          ? 'bg-amber-400 text-slate-950 shadow'
                          : 'bg-slate-800/80 text-slate-300 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {g.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                      <span>{g.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Group Active View */}
              {selectedGroup && (
                <div className="rounded-3xl bg-slate-900/90 border border-white/10 p-5 space-y-5 shadow-2xl">
                  {/* Group Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-black text-white">{selectedGroup.name}</h3>
                        {selectedGroup.isPrivate ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            <Lock size={10} /> خاصة برقم سري
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <Globe size={10} /> عامة
                          </span>
                        )}
                        {getCategoryBadge(selectedGroup.category)}
                      </div>
                      {selectedGroup.description && (
                        <p className="text-xs text-slate-400 font-bold">{selectedGroup.description}</p>
                      )}
                      <p className="text-[11px] text-slate-500 font-mono">كود المجموعة: {selectedGroup.id}</p>
                      {selectedGroup.creatorPhone && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] text-slate-300 font-bold">هاتف مسؤول المجموعة:</span>
                          <a
                            href={`tel:${selectedGroup.creatorPhone}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-black active:scale-95 transition"
                            dir="ltr"
                            title="اتصال سريع بمسؤول المجموعة"
                          >
                            <Phone size={12} className="fill-current" />
                            <span>{selectedGroup.creatorPhone}</span>
                            <span className="text-[10px] font-sans font-black text-amber-300">(اتصال سريع)</span>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyInvite(selectedGroup)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-amber-300 transition"
                        title="مشاركة كود المجموعة والرقم السري"
                      >
                        {copiedCode ? <Check size={16} /> : <Share2 size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLeaveGroup(selectedGroup.id)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition"
                        title="مغادرة المجموعة"
                      >
                        <LogOut size={16} />
                      </button>
                    </div>
                  </div>

                  {/* My Status Card in this group */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-400">حالتي اليوم للفجر:</div>
                        <div className="flex items-center gap-2">
                          {isAwakeToday ? (
                            <span className="text-emerald-400 font-black text-sm flex items-center gap-1.5">
                              <CheckCircle2 size={18} className="text-emerald-400" />
                              <span>تم تسجيل استيقاظك {currentMember?.awakeTime ? `(${currentMember.awakeTime})` : ''}</span>
                            </span>
                          ) : (
                            <span className="text-amber-300 font-black text-sm flex items-center gap-1.5">
                              <Clock size={18} />
                              <span>بانتظار استيقاظك لصلاة الفجر</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isAwakeToday ? (
                          <button
                            type="button"
                            onClick={handleMarkAwake}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
                          >
                            <CheckCircle2 size={16} strokeWidth={3} />
                            <span>أنا صحيت للفجر</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleUndoAwake}
                            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-rose-300 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
                          >
                            <RotateCcw size={14} />
                            <span>تراجع (لم أستيقظ بعد)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* My Phone & Quick Call Options */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0">
                          <Phone size={15} />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400">رقم هاتفي المسجل للتنبيه بالأصدقاء:</div>
                          <div className="text-xs sm:text-sm font-mono font-black text-amber-300" dir="ltr">
                            {currentMember?.phone || 'لم تسجل رقماً بعد (اضغط لإضافة رقمك)'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {currentMember?.phone && (
                          <a
                            href={`tel:${currentMember.phone}`}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center gap-1.5 active:scale-95 transition"
                            title="تجربة الاتصال برقمي"
                          >
                            <Phone size={13} className="fill-current" />
                            <span>اتصال سريع (تجربة)</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setUserPhoneInput(currentMember?.phone || '');
                            setEditingPhone(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 text-xs font-black flex items-center gap-1 active:scale-95 transition"
                        >
                          <Edit2 size={12} />
                          <span>{currentMember?.phone ? 'تعديل الرقم' : '+ إضافة رقمي'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Phone Edit Drawer */}
                    {editingPhone && (
                      <div className="p-3.5 rounded-2xl bg-slate-900 border border-amber-400/40 space-y-2 animate-in slide-in-from-top-2">
                        <div className="text-xs font-black text-amber-300">تعديل رقم هاتفك للتنبيه والاتصال السريع:</div>
                        <div className="flex items-center gap-2">
                          <input
                            type="tel"
                            placeholder="مثال: +201012345678"
                            value={userPhoneInput}
                            onChange={(e) => setUserPhoneInput(e.target.value)}
                            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                            dir="ltr"
                          />
                          <button
                            type="button"
                            disabled={isSavingPhone}
                            onClick={handleSavePhone}
                            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 active:scale-95 transition"
                          >
                            {isSavingPhone ? 'جاري الحفظ...' : 'حفظ'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPhone(false)}
                            className="px-3 py-2 rounded-xl bg-white/10 text-slate-300 font-bold text-xs"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Members Awake Today List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-white flex items-center gap-1.5">
                        <Users size={16} className="text-amber-300" />
                        <span>أعضاء المجموعة ({groupMembers.length})</span>
                      </span>
                      <span className="text-emerald-400">
                        {groupMembers.filter(m => m.awakeDate === todayStr).length} استيقظوا اليوم
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {groupMembers.map((m) => {
                        const isMemberAwake = m.awakeDate === todayStr;
                        const isMe = m.id === user?.uid;

                        return (
                          <div
                            key={m.id}
                            className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                              isMemberAwake
                                ? 'bg-emerald-950/20 border-emerald-500/30'
                                : 'bg-slate-800/40 border-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                                isMemberAwake
                                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                                  : 'bg-slate-700 text-slate-300'
                              }`}>
                                {m.name?.slice(0, 1) || 'ر'}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-black text-white truncate flex items-center gap-1.5">
                                  <span>{m.name}</span>
                                  {isMe && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black">
                                      أنا
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className={`text-[10px] font-bold ${isMemberAwake ? 'text-emerald-400' : 'text-slate-400'}`}>
                                    {isMemberAwake ? `صحيت ${m.awakeTime || ''}` : 'لم يستيقظ بعد'}
                                  </span>
                                  {m.phone && (
                                    <span className="text-[10px] font-mono font-bold text-amber-300/90 flex items-center gap-1" dir="ltr">
                                      <Phone size={10} className="text-amber-400" />
                                      {m.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Quick Call Action */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {!isMe && m.phone ? (
                                <a
                                  href={`tel:${m.phone}`}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition ${
                                    isMemberAwake
                                      ? 'bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200'
                                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25'
                                  }`}
                                  title={`اتصال سريع بـ ${m.name}`}
                                >
                                  <Phone size={13} className="fill-current" />
                                  <span>{isMemberAwake ? 'اتصال سريع' : 'إيقاظ بالاتصال'}</span>
                                </a>
                              ) : isMe && m.phone ? (
                                <a
                                  href={`tel:${m.phone}`}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-black flex items-center gap-1 active:scale-95 transition"
                                  title="رقم هاتفي"
                                >
                                  <Phone size={12} />
                                  <span>رقمي</span>
                                </a>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONTENT: EXPLORE PUBLIC GROUPS */}
      {activeTab === 'explore' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
            <span>مجموعات عامة متاحة للجميع</span>
            <span>{publicGroups.length} مجموعة</span>
          </div>

          {publicGroups.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-slate-900/60 border border-white/5 space-y-2">
              <Globe size={24} className="mx-auto text-slate-500" />
              <p className="text-xs text-slate-400 font-bold">لا توجد مجموعات عامة حالياً. كن أول من ينشئ مجموعة!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {publicGroups.map((g) => {
                const isJoined = joinedGroupIds.includes(g.id);

                return (
                  <div
                    key={g.id}
                    className="p-4 rounded-3xl bg-slate-900/80 border border-white/10 space-y-3 shadow-lg hover:border-white/20 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="text-sm font-black text-white">{g.name}</div>
                        {g.description && <p className="text-[11px] text-slate-400 font-bold">{g.description}</p>}
                      </div>
                      {getCategoryBadge(g.category)}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                        <Users size={13} className="text-amber-300" />
                        <span>{g.membersCount || 1} رفيق</span>
                      </div>

                      {isJoined ? (
                        <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                          <Check size={14} /> منضم بالفعل
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuickJoinPublic(g)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs active:scale-95 transition"
                        >
                          انضمام
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FULL SCREEN VIEW: CREATE GROUP (FIT TO SCREEN - NO BLACK BORDERS) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[120] bg-slate-950 text-white flex flex-col overflow-hidden animate-in fade-in duration-200" dir="rtl">
          {/* Clean Header Bar with Back Button */}
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-slate-900/95 border-b border-white/15 shadow-lg flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white active:scale-95 transition"
                title="رجوع"
              >
                <ArrowRight size={20} />
              </button>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>إنشاء مجموعة فجر جديدة</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ملء الشاشة
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300 font-bold">للتشجيع على صلاة الفجر والتنبيه بالاتصال المباشر</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Full Screen Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-4 py-5 max-w-xl mx-auto w-full space-y-4 pb-36">
            {createError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="p-4 rounded-3xl bg-slate-900/90 border border-white/15 space-y-3">
                <div>
                  <label className="block text-xs font-black text-slate-200 mb-1.5">اسم المجموعة *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: شباب الصحبة الصالحة، رفيقات الفجر..."
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-200 mb-1.5">وصف المجموعة (اختياري)</label>
                  <input
                    type="text"
                    placeholder="كلمة تشجيعية للأعضاء ورفقاء الفجر..."
                    value={createDesc}
                    onChange={e => setCreateDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="p-4 rounded-3xl bg-slate-900/90 border border-white/15 space-y-2">
                <label className="block text-xs font-black text-slate-200 mb-1">الفئة المستهدفة</label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCreateCategory('youth_boys')}
                    className={`py-3 rounded-2xl text-xs font-black border transition ${
                      createCategory === 'youth_boys'
                        ? 'bg-blue-500/25 border-blue-400 text-blue-200 shadow-md'
                        : 'bg-slate-950 border-white/10 text-slate-400'
                    }`}
                  >
                    👨‍👦 شباب
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateCategory('youth_girls')}
                    className={`py-3 rounded-2xl text-xs font-black border transition ${
                      createCategory === 'youth_girls'
                        ? 'bg-pink-500/25 border-pink-400 text-pink-200 shadow-md'
                        : 'bg-slate-950 border-white/10 text-slate-400'
                    }`}
                  >
                    🧕 بنات
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateCategory('general')}
                    className={`py-3 rounded-2xl text-xs font-black border transition ${
                      createCategory === 'general'
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-md'
                        : 'bg-slate-950 border-white/10 text-slate-400'
                    }`}
                  >
                    🌟 عامة
                  </button>
                </div>
              </div>

              {/* Private Group Toggle */}
              <div className="p-4 rounded-3xl bg-slate-900/90 border border-white/15 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <Lock size={15} className="text-amber-400" />
                      <span>مجموعة خاصة وسرية (برقم سري)</span>
                    </span>
                    <p className="text-[11px] text-slate-300 font-bold">
                      لن تظهر في الاستكشاف العام، وتتطلب كود ورقم سري لدخول الأصدقاء.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={createIsPrivate}
                    onChange={e => setCreateIsPrivate(e.target.checked)}
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer flex-shrink-0"
                  />
                </label>

                {createIsPrivate && (
                  <div className="pt-2 border-t border-white/10">
                    <label className="block text-xs font-black text-amber-300 mb-1">الرقم السري للمجموعة (PIN) *</label>
                    <input
                      type="text"
                      required={createIsPrivate}
                      placeholder="مثال: 1234 أو كود سري"
                      value={createPin}
                      onChange={e => setCreatePin(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-amber-400/50 text-sm text-white font-mono focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Creator Phone & Quick Call Notice */}
              <div className="p-4 rounded-3xl bg-slate-900/90 border border-white/15 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                  <Phone size={16} />
                  <span>رقم هاتفك للتنبيه والاتصال السريع (لأعضاء المجموعة)</span>
                </div>
                <p className="text-[11px] text-slate-300 font-bold leading-relaxed">
                  سيظهر رقمك لأعضاء المجموعة ليتمكنوا من الاتصال بك مباشرة عبر خيار (اتصال سريع) لإيقاظك لصلاة الفجر 📞
                </p>
                <input
                  type="tel"
                  placeholder="+201012345678"
                  value={creatorPhone}
                  onChange={e => setCreatorPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/15 text-sm text-amber-300 font-mono font-black focus:outline-none focus:border-amber-400"
                  dir="ltr"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl active:scale-95 transition"
                >
                  {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء المجموعة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 font-black text-xs transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL SCREEN VIEW: JOIN BY CODE & PIN (FIT TO SCREEN - NO BLACK BORDERS) */}
      {showJoinPinModal && (
        <div className="fixed inset-0 z-[120] bg-slate-950 text-white flex flex-col overflow-hidden animate-in fade-in duration-200" dir="rtl">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-slate-900/95 border-b border-white/15 shadow-lg flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowJoinPinModal(false)}
                className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white active:scale-95 transition"
                title="رجوع"
              >
                <ArrowRight size={20} />
              </button>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>الانضمام لمجموعة خاصة برقم سري</span>
                </h3>
                <p className="text-[11px] text-slate-300 font-bold">أدخل كود المجموعة والرقم السري للانضمام لرفقاء الفجر</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowJoinPinModal(false)}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 max-w-xl mx-auto w-full space-y-4 pb-36">
            {joinError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleJoinWithPin} className="space-y-4">
              <div className="p-4 rounded-3xl bg-slate-900/90 border border-white/15 space-y-3">
                <div>
                  <label className="block text-xs font-black text-slate-200 mb-1.5">كود المجموعة *</label>
                  <input
                    type="text"
                    required
                    placeholder="الصق كود المجموعة الذي شاركه معك صديقك"
                    value={joinGroupIdInput}
                    onChange={e => setJoinGroupIdInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/15 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-amber-300 mb-1.5">الرقم السري للمجموعة (PIN)</label>
                  <input
                    type="text"
                    placeholder="أدخل الرقم السري للمجموعة الخاصة"
                    value={joinPinInput}
                    onChange={e => setJoinPinInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-amber-400/50 text-sm text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-slate-900/90 border border-white/15 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                  <Phone size={16} />
                  <span>رقم هاتفك للتنبيه والاتصال السريع</span>
                </div>
                <p className="text-[11px] text-slate-300 font-bold leading-relaxed">
                  سيظهر رقمك لرفقاء المجموعة ليتمكنوا من الاتصال بك مباشرة لإيقاظك لصلاة الفجر 📞
                </p>
                <input
                  type="tel"
                  placeholder="+201012345678"
                  value={joinPhoneInput}
                  onChange={e => setJoinPhoneInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/15 text-sm text-amber-300 font-mono font-black focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl active:scale-95 transition"
                >
                  {isSubmitting ? 'جاري التحقق...' : 'انضمام للمجموعة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinPinModal(false)}
                  className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 font-black text-xs transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
