import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { APP_ID } from '../../constants';

export type GroupCategory = 'youth_boys' | 'youth_girls' | 'general';

export interface FajrGroup {
  id: string;
  name: string;
  description: string;
  category: GroupCategory;
  isPrivate: boolean;
  pinCode?: string; // Secret PIN for private groups
  createdBy: string;
  createdByName: string;
  creatorPhone?: string;
  createdAt: any;
  membersCount: number;
}

export interface GroupMember {
  id: string;
  name: string;
  phone?: string;
  awakeDate: string; // YYYY-MM-DD
  awakeTime?: string; // HH:mm
  updatedAt: any;
}

const GROUPS_COLLECTION = `artifacts/${APP_ID}/public/data/fajr_wake_groups`;
const LOCAL_JOINED_KEY = 'ifaqa_joined_fajr_groups_v1';

export function getTodayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getCurrentTimeFormatted(): string {
  const d = new Date();
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const period = h >= 12 ? 'م' : 'ص';
  const displayH = h % 12 || 12;
  return `${displayH}:${m} ${period}`;
}

export const fajrGroupsService = {
  getJoinedGroupIds(): string[] {
    try {
      const raw = localStorage.getItem(LOCAL_JOINED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveJoinedGroupId(groupId: string): void {
    try {
      const current = this.getJoinedGroupIds();
      if (!current.includes(groupId)) {
        current.push(groupId);
        localStorage.setItem(LOCAL_JOINED_KEY, JSON.stringify(current));
      }
    } catch {}
  },

  removeJoinedGroupId(groupId: string): void {
    try {
      const current = this.getJoinedGroupIds().filter(id => id !== groupId);
      localStorage.setItem(LOCAL_JOINED_KEY, JSON.stringify(current));
    } catch {}
  },

  async createGroup(data: {
    name: string;
    description: string;
    category: GroupCategory;
    isPrivate: boolean;
    pinCode?: string;
    creatorName: string;
    creatorPhone?: string;
  }): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً لإنشاء مجموعة.');

    const name = data.name.trim();
    if (!name) throw new Error('يرجى كتابة اسم المجموعة.');
    if (data.isPrivate && (!data.pinCode || data.pinCode.trim().length < 3)) {
      throw new Error('يرجى كتابة رقم سري للمجموعة الخاصة (٣ أرقام أو أحرف على الأقل).');
    }

    const groupRef = doc(collection(db, GROUPS_COLLECTION));
    const groupId = groupRef.id;

    const groupData: FajrGroup = {
      id: groupId,
      name,
      description: data.description?.trim() || '',
      category: data.category,
      isPrivate: data.isPrivate,
      pinCode: data.isPrivate ? data.pinCode?.trim() : '',
      createdBy: user.uid,
      createdByName: data.creatorName || user.displayName || 'المنشئ',
      creatorPhone: data.creatorPhone?.trim() || '',
      createdAt: serverTimestamp(),
      membersCount: 1
    };

    await setDoc(groupRef, groupData);

    // Add creator as first member
    const memberRef = doc(db, `${GROUPS_COLLECTION}/${groupId}/members`, user.uid);
    await setDoc(memberRef, {
      id: user.uid,
      name: data.creatorName || user.displayName || 'صاحب المجموعة',
      phone: data.creatorPhone?.trim() || '',
      awakeDate: '',
      awakeTime: '',
      updatedAt: serverTimestamp()
    });

    this.saveJoinedGroupId(groupId);
    return groupId;
  },

  async joinGroup(groupId: string, enteredPin?: string, memberName?: string, memberPhone?: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً للانضمام للمجموعة.');

    const cleanGroupId = groupId.trim();
    const groupSnap = await getDoc(doc(db, GROUPS_COLLECTION, cleanGroupId));
    if (!groupSnap.exists()) {
      throw new Error('المجموعة غير موجودة، تأكد من كود المجموعة.');
    }

    const group = groupSnap.data() as FajrGroup;

    if (group.isPrivate) {
      const cleanEnteredPin = (enteredPin || '').trim();
      const cleanExpectedPin = (group.pinCode || '').trim();
      if (!cleanEnteredPin || cleanEnteredPin !== cleanExpectedPin) {
        throw new Error('الرقم السري للمجموعة غير صحيح. اطلب الرقم من صاحب المجموعة.');
      }
    }

    const memberRef = doc(db, `${GROUPS_COLLECTION}/${cleanGroupId}/members`, user.uid);
    const existingMember = await getDoc(memberRef);

    if (!existingMember.exists()) {
      await setDoc(memberRef, {
        id: user.uid,
        name: memberName || user.displayName || 'رفيق الفجر',
        phone: memberPhone?.trim() || '',
        awakeDate: '',
        awakeTime: '',
        updatedAt: serverTimestamp()
      });

      // Increment membersCount
      try {
        await updateDoc(doc(db, GROUPS_COLLECTION, cleanGroupId), {
          membersCount: increment(1)
        });
      } catch {}
    }

    this.saveJoinedGroupId(cleanGroupId);
  },

  async updateMemberPhone(groupId: string, phone: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً.');

    const memberRef = doc(db, `${GROUPS_COLLECTION}/${groupId}/members`, user.uid);
    await updateDoc(memberRef, {
      phone: phone.trim(),
      updatedAt: serverTimestamp()
    });
  },

  async leaveGroup(groupId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await deleteDoc(doc(db, `${GROUPS_COLLECTION}/${groupId}/members`, user.uid));
      await updateDoc(doc(db, GROUPS_COLLECTION, groupId), {
        membersCount: increment(-1)
      });
    } catch {}

    this.removeJoinedGroupId(groupId);
  },

  async markAwake(groupId: string, day = getTodayDateStr()): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً.');

    const memberRef = doc(db, `${GROUPS_COLLECTION}/${groupId}/members`, user.uid);
    await updateDoc(memberRef, {
      awakeDate: day,
      awakeTime: getCurrentTimeFormatted(),
      updatedAt: serverTimestamp()
    });
  },

  async undoAwake(groupId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً.');

    const memberRef = doc(db, `${GROUPS_COLLECTION}/${groupId}/members`, user.uid);
    await updateDoc(memberRef, {
      awakeDate: '',
      awakeTime: '',
      updatedAt: serverTimestamp()
    });
  },

  subscribePublicGroups(callback: (groups: FajrGroup[]) => void, onError?: (err: any) => void) {
    const q = query(
      collection(db, GROUPS_COLLECTION),
      where('isPrivate', '==', false),
      limit(50)
    );

    return onSnapshot(q, (snap) => {
      const groups = snap.docs.map(d => ({ ...d.data(), id: d.id } as FajrGroup));
      callback(groups);
    }, (err) => {
      console.warn('subscribePublicGroups error:', err);
      onError?.(err);
    });
  },

  subscribeGroup(groupId: string, callback: (group: FajrGroup | null) => void) {
    return onSnapshot(doc(db, GROUPS_COLLECTION, groupId), (snap) => {
      if (snap.exists()) {
        callback({ ...snap.data(), id: snap.id } as FajrGroup);
      } else {
        callback(null);
      }
    }, (err) => {
      console.warn('subscribeGroup error:', err);
    });
  },

  subscribeGroupMembers(groupId: string, callback: (members: GroupMember[]) => void) {
    return onSnapshot(collection(db, `${GROUPS_COLLECTION}/${groupId}/members`), (snap) => {
      const members = snap.docs.map(d => ({ ...d.data(), id: d.id } as GroupMember));
      callback(members);
    }, (err) => {
      console.warn('subscribeGroupMembers error:', err);
    });
  }
};
