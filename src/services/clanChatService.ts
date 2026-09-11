import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, startAfter, where, type QueryDocumentSnapshot } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { APP_ID } from '../../constants';

export const CHAT_PAGE_SIZE = 40;
export const CHAT_MAX_LENGTH = 2000;
export type ChatRoom = { id: string; kind: 'team' | 'direct'; participants: string[]; lastText: string; lastSenderId: string; updatedAt: any };
export type ChatMessage = { id: string; senderId: string; senderName: string; text: string; createdAt: any };
export type ChatPage = { messages: ChatMessage[]; cursor: QueryDocumentSnapshot | null; hasMore: boolean };
const rooms = (clanId: string) => collection(db, 'ifaqa_clan_chats', clanId, 'rooms');
const member = (clanId: string, uid: string) => doc(db, 'artifacts', APP_ID, 'public', 'data', 'clans', clanId, 'members', uid);
export const directRoomId = (a: string, b: string) => 'dm_' + [a, b].sort().map(encodeURIComponent).join(':');
export function chatError(error: unknown) {
  const code = (error as { code?: string })?.code || '';
  if (code.includes('permission-denied')) return 'المحادثة غير متاحة لحسابك حالياً. تأكد من عضويتك وتفعيل صلاحيات الشات.';
  if (code.includes('unavailable')) return 'تعذر الاتصال. رسالتك محفوظة في خانة الكتابة؛ أعد المحاولة.';
  return error instanceof Error && !code ? error.message : 'تعذر تحميل المحادثة. أعد المحاولة.';
}
function page(snapshot: { docs: QueryDocumentSnapshot[] }): ChatPage {
  return { messages: snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ChatMessage)).reverse(), cursor: snapshot.docs.at(-1) || null, hasMore: snapshot.docs.length === CHAT_PAGE_SIZE };
}
export const clanChatService = {
  subscribeRooms(clanId: string, uid: string, next: (rooms: ChatRoom[]) => void, fail: (e: Error) => void) {
    let team: ChatRoom[] = [], direct: ChatRoom[] = [];
    const emit = () => next([...team, ...direct]);
    const a = onSnapshot(doc(rooms(clanId), 'team'), snap => { team = snap.exists() ? [{ ...snap.data(), id: snap.id } as ChatRoom] : []; emit(); }, fail);
    const b = onSnapshot(query(rooms(clanId), where('participants', 'array-contains', uid), where('kind', '==', 'direct')), snap => { direct = snap.docs.map(d => ({ ...d.data(), id: d.id } as ChatRoom)); emit(); }, fail);
    return () => { a(); b(); };
  },
  subscribeMessages(clanId: string, roomId: string, next: (p: ChatPage) => void, fail: (e: Error) => void) {
    return onSnapshot(query(collection(doc(rooms(clanId), roomId), 'messages'), orderBy('createdAt', 'desc'), limit(CHAT_PAGE_SIZE)), snap => next(page(snap)), fail);
  },
  async older(clanId: string, roomId: string, cursor: QueryDocumentSnapshot) {
    return page(await getDocs(query(collection(doc(rooms(clanId), roomId), 'messages'), orderBy('createdAt', 'desc'), startAfter(cursor), limit(CHAT_PAGE_SIZE))));
  },
  async send(clanId: string, peerId: string | null, text: string, messageId: string) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('سجّل الدخول للمراسلة.');
    const body = text.trim();
    if (!body || body.length > CHAT_MAX_LENGTH) throw new Error('اكتب رسالة بين حرف و٢٠٠٠ حرف.');
    if (peerId === uid) throw new Error('اختر رفيقاً آخر للمحادثة.');
    const roomId = peerId ? directRoomId(uid, peerId) : 'team';
    const roomRef = doc(rooms(clanId), roomId);
    const messageRef = doc(collection(roomRef, 'messages'), messageId);
    await runTransaction(db, async tx => {
      const me = await tx.get(member(clanId, uid));
      if (!me.exists()) throw new Error('لم تعد عضواً في هذا الفريق.');
      if (peerId && !(await tx.get(member(clanId, peerId))).exists()) throw new Error('هذا الرفيق لم يعد عضواً في الفريق.');
      const previous = await tx.get(messageRef);
      if (previous.exists()) return; // Retrying the same submission never duplicates it.
      const room = await tx.get(roomRef);
      const data = { kind: peerId ? 'direct' : 'team', participants: peerId ? [uid, peerId].sort() : [], lastText: body, lastSenderId: uid, lastMessageId: messageId, updatedAt: serverTimestamp() };
      tx.set(roomRef, room.exists() ? { ...room.data(), ...data } : data);
      tx.set(messageRef, { senderId: uid, senderName: String(me.data().name || 'رفيق').slice(0, 100), text: body, createdAt: serverTimestamp() });
    });
  }
};
