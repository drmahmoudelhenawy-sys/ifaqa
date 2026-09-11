import { Capacitor, registerPlugin } from '@capacitor/core';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { getPrayerSettings } from './prayerTimes';
export type WakeMember = { id: string; name: string; phone: string; awakeDate: string; updatedAt: any };
export type FajrAlarmEntry = { at: number; day: string };
type AlarmState = { exact: boolean; fullScreen: boolean; notifications: boolean; enabled: boolean; nextAt: number; count: number };
type WakeEvent = { id: string; uid: string; clanId: string; day: string };
export const FajrAlarm = registerPlugin<{
  status(): Promise<AlarmState>;
  requestAccess(options: { kind: 'exact' | 'fullScreen' | 'notifications' }): Promise<void>;
  schedule(options: { entries: FajrAlarmEntry[]; uid: string; clanId: string; soundUrl?: string; themeId?: string }): Promise<void>;
  cancel(): Promise<void>;
  events(): Promise<{ events: WakeEvent[] }>;
  acknowledge(options: { ids: string[] }): Promise<void>;
}>('FajrAlarm');
export const isNativeAlarm = () => Capacitor.getPlatform() === 'android';
export function wakeDay(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
const wakeRef = (clanId: string, uid: string) => doc(db, 'ifaqa_fajr_teams', clanId, 'members', uid);
export function normalizeWakePhone(value: string) {
  const phone = value.replace(/[٠-٩]/g, c => String(c.charCodeAt(0)-1632)).replace(/[\s()-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('اكتب الرقم مع كود الدولة، مثل +201012345678.');
  return phone;
}
export const fajrWakeService = {
  subscribe(clanId: string, next: (people: WakeMember[]) => void, fail: (e: Error) => void) {
    return onSnapshot(collection(db, 'ifaqa_fajr_teams', clanId, 'members'), snap => next(snap.docs.map(d => ({...d.data(),id:d.id} as WakeMember))), fail);
  },
  async join(clanId: string, name: string, phone: string) {
    const uid = auth.currentUser?.uid; if (!uid) throw new Error('سجّل الدخول أولاً.');
    await setDoc(wakeRef(clanId, uid), { name: name.slice(0,100), phone: normalizeWakePhone(phone), updatedAt: serverTimestamp() }, { merge:true });
  },
  async leave(clanId: string) { const uid=auth.currentUser?.uid;if(uid)await deleteDoc(wakeRef(clanId,uid)); },
  async awake(clanId: string, day = wakeDay()) {
    const uid=auth.currentUser?.uid;if(!uid)throw new Error('سجّل الدخول أولاً.');
    // updateDoc prevents recreating a phone-sharing record after withdrawal.
    const { updateDoc } = await import('firebase/firestore');
    await updateDoc(wakeRef(clanId,uid), { awakeDate:day, updatedAt:serverTimestamp() });
  },
  async undoAwake(clanId: string) {
    const uid=auth.currentUser?.uid;if(!uid)throw new Error('سجّل الدخول أولاً.');
    const { updateDoc } = await import('firebase/firestore');
    await updateDoc(wakeRef(clanId,uid), { awakeDate:'', updatedAt:serverTimestamp() });
  }
};
export async function syncFajrWakeEvents() {
  if (!isNativeAlarm() || !auth.currentUser) return;
  const uid=auth.currentUser.uid;
  const pending=await FajrAlarm.events();
  const done:string[]=[];
  for(const event of pending.events){
    if(event.uid!==uid)continue;
    if(!event.clanId || event.day!==wakeDay()){done.push(event.id);continue;}
    try { await fajrWakeService.awake(event.clanId,event.day);done.push(event.id); }
    catch(e){const code=(e as {code?:string}).code;if(code==='not-found'||code==='permission-denied')done.push(event.id);}
  }
  if(done.length)await FajrAlarm.acknowledge({ids:done});
}
export function zonedFajrTimestamp(year:number, month:number, day:number, hours:number, minutes:number, zone:string) {
  const utc=Date.UTC(year,month-1,day,hours,minutes);let guess=utc;
  const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  for(let i=0;i<3;i++){const p=Object.fromEntries(formatter.formatToParts(new Date(guess)).map(x=>[x.type,x.value]));const wall=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);guess+=utc-wall;}
  return guess;
}
export async function fetchFajrAlarmCalendar(userSettings?: { timeOffset?: number; mode?: 'relative' | 'fixed'; customFixedTime?: string }):Promise<FajrAlarmEntry[]> {
  const settings=getPrayerSettings();
  let location:{latitude:number;longitude:number}|undefined;
  try { const cached=JSON.parse(localStorage.getItem('prayer_timings_cache_v2')||'null');if(settings.autoLocation && cached?.source==='coordinates')location=cached.location; }catch{}
  const now=new Date();const entries:FajrAlarmEntry[]=[];
  const offsetMinutes = userSettings?.timeOffset || 0;
  const isFixed = userSettings?.mode === 'fixed' && Boolean(userSettings?.customFixedTime);

  // Two complete monthly calendars give at least 30 accurate daily Fajr times.
  for(let offset=0;offset<2;offset++){
    const date=new Date(now.getFullYear(),now.getMonth()+offset,1);
    const params=new URLSearchParams({method:String(settings.calcMethod),school:String(settings.asrMethod)});
    if(location){params.set('latitude',String(location.latitude));params.set('longitude',String(location.longitude));}
    else {params.set('city',settings.city);params.set('country',settings.country);}
    const endpoint=location?'calendar':'calendarByCity';
    const response=await fetch(`https://api.aladhan.com/v1/${endpoint}/${date.getFullYear()}/${date.getMonth()+1}?${params}`,{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error('تعذر تحميل مواعيد الفجر. حاول مرة أخرى.');
    const json=await response.json();if(!Array.isArray(json.data))throw new Error('مواعيد الفجر غير متاحة لهذه المدينة.');
    for(const item of json.data){
      const [d,m,y]=String(item.date.gregorian.date).split('-').map(Number);
      let targetH = 0;
      let targetMin = 0;
      if (isFixed && userSettings?.customFixedTime) {
        const [fh, fm] = userSettings.customFixedTime.split(':').map(Number);
        targetH = fh;
        targetMin = fm;
      } else {
        const [h,min]=String(item.timings.Fajr).split(' ')[0].split(':').map(Number);
        if(![d,m,y,h,min].every(Number.isFinite))continue;
        targetH = h;
        targetMin = min;
      }
      let at=zonedFajrTimestamp(y,m,d,targetH,targetMin,item.meta.timezone);
      if (!isFixed && offsetMinutes > 0) {
        at -= offsetMinutes * 60 * 1000;
      }
      if(at>Date.now()+1000) {
        entries.push({at,day:`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`});
      }
    }
  }
  const result=entries.sort((a,b)=>a.at-b.at).slice(0,30);if(!result.length)throw new Error('لا توجد مواعيد فجر قادمة.');return result;
}
