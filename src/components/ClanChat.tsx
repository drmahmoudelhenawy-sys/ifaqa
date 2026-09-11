import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Loader2, Lock, MessageCircle, Plus, Search, Send, Users, X } from 'lucide-react';
import type { ClanMember } from '../services/clanService';
import { CHAT_MAX_LENGTH, chatError, clanChatService, directRoomId, type ChatMessage, type ChatPage, type ChatRoom } from '../services/clanChatService';
import '../styles/ClanChat.css';

type Props = { clanId: string; clanName: string; userId: string; members: ClanMember[]; initialPeerId: string | null; onPeerChange: (id: string | null) => void; online: boolean };
const millis = (value: any) => value?.toMillis?.() || 0;
const time = (value: any) => millis(value) ? new Date(millis(value)).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';
const ClanChat: React.FC<Props> = ({ clanId, clanName, userId, members, initialPeerId, onPeerChange, online }: Props) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomReady, setRoomReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pagination, setPagination] = useState<ChatPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [olderBusy, setOlderBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [listVisible, setListVisible] = useState(initialPeerId === null);
  const [newMessages, setNewMessages] = useState(false);
  const stream = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);
  const sendingRef = useRef(false);
  const submission = useRef<{ room: string; text: string; id: string } | null>(null);
  const roomId = initialPeerId ? directRoomId(userId, initialPeerId) : 'team';
  const currentRoom = useRef(roomId);
  currentRoom.current = roomId;
  const peer = members.find(m => m.id === initialPeerId);
  const draft = drafts[roomId] || '';
  const exists = rooms.some(r => r.id === roomId);
  const allowed = members.some(m => m.id === userId) && (!initialPeerId || !!peer);
  const scrollBottom = () => { const el = stream.current; if (el) el.scrollTop = el.scrollHeight; nearBottom.current = true; setNewMessages(false); };

  useEffect(() => {
    setRoomReady(false); setError('');
    return clanChatService.subscribeRooms(clanId, userId, result => { setRooms(result); setRoomReady(true); }, e => { setRooms([]); setError(chatError(e)); setRoomReady(false); });
  }, [clanId, userId, retry]);
  useEffect(() => {
    setMessages([]); setPagination(null); setNewMessages(false); nearBottom.current = true;
    if (!roomReady || !exists || !allowed) { setLoading(false); return; }
    setLoading(true);
    return clanChatService.subscribeMessages(clanId, roomId, result => {
      setMessages(previous => {
        const merged = new Map<string, ChatMessage>(previous.map(m => [m.id, m]));
        result.messages.forEach(m => merged.set(m.id, m));
        return [...merged.values()].sort((a, b) => millis(a.createdAt) - millis(b.createdAt) || a.id.localeCompare(b.id));
      });
      setPagination(previous => previous || result); setLoading(false);
      if (nearBottom.current) requestAnimationFrame(scrollBottom); else setNewMessages(true);
    }, e => { setMessages([]); setLoading(false); setError(chatError(e)); });
  }, [clanId, roomId, roomReady, exists, allowed, retry]);
  useEffect(() => { if (initialPeerId) setListVisible(false); }, [initialPeerId]);
  const choose = (id: string | null) => { onPeerChange(id); setListVisible(false); setPicker(false); setSearch(''); setError(''); };
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sendingRef.current || !online || !allowed || !roomReady || !draft.trim()) return;
    const text = draft.trim(), sentRoom = roomId;
    if (!submission.current || submission.current.text !== text || submission.current.room !== sentRoom) submission.current = { room: sentRoom, text, id: crypto.randomUUID() };
    sendingRef.current = true; setSending(true); setError('');
    try {
      await clanChatService.send(clanId, initialPeerId, text, submission.current.id);
      setDrafts(previous => ({ ...previous, [sentRoom]: previous[sentRoom]?.trim() === text ? '' : previous[sentRoom] }));
      submission.current = null;
      if (currentRoom.current === sentRoom) { requestAnimationFrame(scrollBottom); input.current?.focus(); }
    } catch (e) { if (currentRoom.current === sentRoom) setError(chatError(e)); }
    finally { sendingRef.current = false; setSending(false); }
  };
  const older = async () => {
    if (!pagination?.cursor || olderBusy) return;
    const oldRoom = roomId, el = stream.current, oldHeight = el?.scrollHeight || 0;
    setOlderBusy(true);
    try {
      const result = await clanChatService.older(clanId, roomId, pagination.cursor);
      if (currentRoom.current !== oldRoom) return;
      setMessages(previous => { const map = new Map([...result.messages, ...previous].map(m => [m.id, m])); return [...map.values()].sort((a, b) => millis(a.createdAt) - millis(b.createdAt) || a.id.localeCompare(b.id)); });
      setPagination(result);
      requestAnimationFrame(() => { if (el && currentRoom.current === oldRoom) el.scrollTop += el.scrollHeight - oldHeight; });
    } catch (e) { if (currentRoom.current === oldRoom) setError(chatError(e)); }
    finally { setOlderBusy(false); }
  };
  const direct = rooms.filter(r => r.kind === 'direct').sort((a, b) => millis(b.updatedAt) - millis(a.updatedAt));
  return <section className={`clan-chat ${listVisible ? 'chat-show-list' : ''}`} aria-label="محادثات الفريق">
    <aside className="chat-sidebar">
      <div className="chat-sidebar-heading"><div><span className="clan-eyebrow">صحبة وسؤال</span><h2>المحادثات</h2></div><button className="clan-icon-button" aria-label="محادثة خاصة جديدة" onClick={() => setPicker(v => !v)}>{picker ? <X size={20} /> : <Plus size={20} />}</button></div>
      {picker && <div className="chat-picker"><label className="chat-search"><Search size={16} /><input placeholder="ابحث عن رفيق" aria-label="البحث عن عضو" value={search} onChange={e => setSearch(e.target.value)} /></label>{members.filter(m => m.id !== userId && m.name?.includes(search)).map(m => <button key={m.id} onClick={() => choose(m.id)}><span className="chat-avatar">{m.name?.slice(0, 1)}</span>{m.name}<MessageCircle size={17} /></button>)}{members.length < 2 && <p>لا يوجد رفقاء آخرون بعد.</p>}</div>}
      <button className={`chat-room ${roomId === 'team' ? 'is-active' : ''}`} onClick={() => choose(null)}><span className="chat-avatar"><Users size={22} /></span><span><strong>مجلس الفريق</strong><small>{rooms.find(r => r.id === 'team')?.lastText || 'حديث يجمع كل الرفقاء'}</small></span></button>
      <p className="chat-list-label">المحادثات الخاصة</p>
      {direct.map(r => { const id = r.participants.find(p => p !== userId); const person = members.find(m => m.id === id); return <button key={r.id} className={`chat-room ${roomId === r.id ? 'is-active' : ''}`} onClick={() => id && choose(id)}><span className="chat-avatar">{person?.name?.slice(0, 1) || <Lock size={18} />}</span><span><strong>{person?.name || 'رفيق غادر الفريق'}</strong><small>{r.lastText}</small></span><time>{time(r.updatedAt)}</time></button>; })}
      {!direct.length && <div className="chat-sidebar-empty"><MessageCircle size={28} /><p>ابدأ بسؤال طيب عن رفيقك.</p><button className="clan-text-button" onClick={() => setPicker(true)}>اختيار رفيق</button></div>}
    </aside>
    <div className="chat-conversation">
      <header className="chat-heading"><button className="clan-icon-button chat-back" aria-label="قائمة المحادثات" onClick={() => setListVisible(true)}><ArrowRight size={21} /></button><span className="chat-avatar">{initialPeerId ? <MessageCircle size={23} /> : <Users size={23} />}</span><div><h2>{initialPeerId ? peer?.name || 'محادثة خاصة' : 'مجلس الفريق'}</h2><p>{initialPeerId ? <><Lock size={12} /> بينك وبين رفيقك</> : `${clanName} · ${members.length.toLocaleString('ar-EG')} رفقاء`}</p></div></header>
      {error && <div className="chat-error" role="alert">{error}<button onClick={() => { setError(''); setRetry(n => n + 1); }}>إعادة المحاولة</button></div>}
      <div className="chat-messages" ref={stream} role="log" aria-label="الرسائل" aria-live="polite" aria-busy={loading} onScroll={() => { const el = stream.current; if (el) { nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; if (nearBottom.current) setNewMessages(false); } }}>
        {pagination?.hasMore && <button className="chat-load-more" disabled={olderBusy} onClick={older}>{olderBusy ? 'جارٍ التحميل…' : 'رسائل أقدم'}</button>}
        {loading || !roomReady && !error ? <div className="chat-empty"><Loader2 className="clan-spin" size={26} /><p>جارٍ تحميل المحادثة…</p></div> : !messages.length && !error ? <div className="chat-empty"><MessageCircle size={42} strokeWidth={1.4} /><h3>{initialPeerId ? 'السؤال بداية الوصل' : 'أهلاً بكم في مجلس الفريق'}</h3><p>{initialPeerId ? 'اطمئن على رفيقك وشاركه كلمة طيبة.' : 'مساحة للتواصل والتشجيع وترتيب وردكم معاً.'}</p></div> : null}
        {messages.map((message, index) => { const mine = message.senderId === userId; const date = millis(message.createdAt); const previous = millis(messages[index - 1]?.createdAt); const day = date && new Date(date).toDateString(); return <React.Fragment key={message.id}>{day && day !== (previous && new Date(previous).toDateString()) && <div className="chat-date"><span>{new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}</span></div>}<article className={`chat-message ${mine ? 'is-mine' : ''}`}>{!mine && <strong>{message.senderName}</strong>}<p dir="auto">{message.text}</p><footer><time>{time(message.createdAt)}</time>{mine && <Check size={13} aria-label="تم الإرسال" />}</footer></article></React.Fragment>; })}
      </div>
      {newMessages && <button className="chat-new" onClick={scrollBottom}><ChevronDown size={16} /> رسائل جديدة</button>}
      <form className="chat-composer" onSubmit={send}>
        {!allowed && <p role="status">المراسلة متاحة بين الأعضاء الحاليين في الفريق.</p>}
        {!online && <p role="status">أنت غير متصل. يمكنك إكمال الكتابة والإرسال عند عودة الاتصال.</p>}
        <div><textarea ref={input} aria-label="نص الرسالة" placeholder="اكتب رسالة طيبة…" rows={2} maxLength={CHAT_MAX_LENGTH} value={draft} disabled={!allowed} onChange={e => setDrafts(p => ({ ...p, [roomId]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} /><button type="submit" aria-label="إرسال الرسالة" disabled={sending || !online || !allowed || !roomReady || !draft.trim()}>{sending ? <Loader2 size={21} className="clan-spin" /> : <Send size={21} />}</button></div>
        <small>{draft.length.toLocaleString('ar-EG')} / ٢٠٠٠ · سطر جديد بـ Enter</small>
      </form>
    </div>
  </section>;
};
export default ClanChat;
