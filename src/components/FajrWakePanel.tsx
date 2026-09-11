import React,{useEffect,useState} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { AlarmClock, Bell, BellRing, Check, CheckCircle2, Loader2, Phone, RotateCcw, ShieldCheck, Sliders, Sunrise, Users, X } from 'lucide-react';
import { auth, db } from '../../services/firebase';
import { APP_ID } from '../../constants';
import { clanService } from '../services/clanService';
import { chatError } from '../services/clanChatService';
import { FajrAlarm, fajrWakeService, fetchFajrAlarmCalendar, isNativeAlarm, syncFajrWakeEvents, wakeDay, type WakeMember } from '../services/fajrWakeService';
import FajrAlarmSettingsModal from './FajrAlarmSettingsModal';
import FajrAlarmPreviewModal from './FajrAlarmPreviewModal';
import { loadFajrAlarmSettings } from '../services/fajrAlarmCustomization';
import '../styles/FajrWake.css';

export default function FajrWakePanel(){
 const [user,setUser]=useState(auth.currentUser),[clanId,setClanId]=useState<string|null>(null),[name,setName]=useState('');
 const [people,setPeople]=useState<WakeMember[]>([]),[phone,setPhone]=useState(''),[consent,setConsent]=useState(false),[editing,setEditing]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[today,setToday]=useState(wakeDay());
 const [alarm,setAlarm]=useState<Awaited<ReturnType<typeof FajrAlarm.status>>|null>(null);
 const [showAlarmSettings,setShowAlarmSettings]=useState(false);
 const [showAlarmPreview,setShowAlarmPreview]=useState(false);
 const [defaultAdminSound,setDefaultAdminSound]=useState<string>('');
 const me=people.find(p=>p.id===user?.uid);const awake=me?.awakeDate===today;

 const refresh=async()=>{setToday(wakeDay());if(isNativeAlarm())try{setAlarm(await FajrAlarm.status());await syncFajrWakeEvents();}catch{setError('تعذر الاتصال بمنبّه الهاتف. حدّث نسخة أندرويد.');}};
 useEffect(()=>onAuthStateChanged(auth,setUser),[]);
 useEffect(()=>{
   const unsub = onSnapshot(doc(db, 'artifacts', APP_ID, 'public', 'data', 'app_config', 'settings'), (snap) => {
     if (snap.exists() && snap.data().defaultFajrAlarmSound) {
       setDefaultAdminSound(snap.data().defaultFajrAlarmSound);
     }
   }, () => {});
   return () => unsub();
 }, []);
 useEffect(()=>{setClanId(null);setPeople([]);if(!user)return;return clanService.subscribeToUserClan(user.uid,setClanId,e=>setError(chatError(e)));},[user?.uid]);
 useEffect(()=>{setPeople([]);setPhone('');setConsent(false);if(!clanId||!user)return;const a=fajrWakeService.subscribe(clanId,setPeople,e=>{setPeople([]);setError(chatError(e));});const b=clanService.subscribeToClanMembers(clanId,m=>setName(m.find(x=>x.id===user.uid)?.name||user.displayName||'رفيق'));return()=>{a();b();};},[clanId,user?.uid]);
 useEffect(()=>{refresh();const timer=setInterval(()=>setToday(wakeDay()),30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};},[]);
 async function act(work:()=>Promise<void>){if(busy)return;setBusy(true);setError('');setNotice('');try{await work();}catch(e){setError(chatError(e));}finally{setBusy(false);}}
 async function enable(){
   if(!isNativeAlarm())return;
   const status=await FajrAlarm.status();setAlarm(status);
   if(!status.notifications){await FajrAlarm.requestAccess({kind:'notifications'});setNotice('اسمح بإشعارات المنبّه ثم اضغط تفعيل مرة أخرى.');return;}
   if(!status.exact){await FajrAlarm.requestAccess({kind:'exact'});setNotice('اسمح بالمنبّهات الدقيقة ثم ارجع واضغط تفعيل.');return;}
   const entries=await fetchFajrAlarmCalendar();
   const alarmSettings = (await import('../services/fajrAlarmCustomization')).loadFajrAlarmSettings();
   let soundUrl = '';
   if (alarmSettings.soundType === 'default') {
     soundUrl = defaultAdminSound;
   } else if (alarmSettings.soundType === 'custom') {
     soundUrl = alarmSettings.customSoundUrl || '';
   } else {
     const presets = (await import('../services/fajrAlarmCustomization')).SOUND_PRESETS;
     const matched = presets.find(p => p.id === alarmSettings.soundType);
     soundUrl = (matched as any)?.url || '';
   }
   await FajrAlarm.schedule({
     entries,
     uid: user?.uid || '',
     clanId: clanId || '',
     soundUrl,
     themeId: alarmSettings.themeId || 'emerald'
   });
   await refresh();
   setNotice('تم ضبط منبّه الفجر بنجاح حسب مواقيت الصلاة والصوت والمظهر المختار.');
 }
 return <section className="fajr-wake" dir="rtl" aria-label="أيقظني للفجر">
  <header><span className="fajr-symbol"><Sunrise size={28} strokeWidth={1.6}/></span><div><small>نتعاون على صلاة الفجر</small><h2>أيقظني للفجر</h2><p>نصحى سوا… ونبدأ يومنا بالصلاة</p></div></header>
  {error&&<p className="fajr-feedback" role="alert">{error}</p>}{notice&&<p className="fajr-feedback" role="status">{notice}</p>}
  <div className="fajr-alarm-card">
    <AlarmClock size={26}/>
    <div>
      <h3>منبّه الفجر</h3>
      <p>{alarm?.enabled&&alarm.nextAt ? `المنبّه القادم: ${new Date(alarm.nextAt).toLocaleString('ar-EG',{weekday:'long',hour:'2-digit',minute:'2-digit'})}`:'يوقظك في موعد الفجر حتى بعد إغلاق التطبيق.'}</p>
      {alarm?.enabled&&<small>مواعيد محفوظة لـ {alarm.count} يوم. جدّدها عند تغيير المدينة أو اقتراب انتهائها.</small>}
      {!isNativeAlarm()&&<small>منبّه شاشة القفل متاح في نسخة أندرويد؛ المتصفح لا يرن وهو مغلق.</small>}
    </div>
    <div style={{display:'flex',alignItems:'center',gap:6}}>
      <button type="button" onClick={()=>setShowAlarmPreview(true)} style={{background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:12,padding:'8px 10px',color:'#fbbf24',display:'flex',alignItems:'center',gap:4,cursor:'pointer',fontSize:12,fontWeight:700}} title="معاينة شاشة المنبّه وصوت الأذان مباشرة">
        <Bell size={14}/>
        <span>معاينة</span>
      </button>
      <button type="button" onClick={()=>setShowAlarmSettings(true)} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:12,padding:'8px 10px',color:'#fcd34d',display:'flex',alignItems:'center',gap:4,cursor:'pointer',fontSize:12,fontWeight:700}} title="تخصيص المنبّه والأصوات والخلفيات">
        <Sliders size={15}/>
        <span>إعدادات</span>
      </button>
      <button disabled={busy||!isNativeAlarm()} onClick={()=>act(alarm?.enabled?async()=>{await FajrAlarm.cancel();await refresh();}:enable)}>{busy?<Loader2 size={17} className="animate-spin"/>:alarm?.enabled?'إيقاف':'تفعيل'}</button>
    </div>
  </div>
  {alarm?.enabled&&<button className="fajr-link" disabled={busy} onClick={()=>act(enable)}>تحديث مواعيد المنبّه</button>}
  <div className="fajr-community-heading"><h3><Users size={19}/> رفقاء الفجر</h3><span>{people.filter(p=>p.awakeDate===today).length.toLocaleString('ar-EG')} استيقظوا اليوم</span></div>
  {!user?<p>سجّل الدخول لتشارك رفقاءك الاستيقاظ.</p>:!clanId?<p>انضم لفريق في «قوافل الخير» لتتبادلوا مكالمات الإيقاظ.</p>:<>
   {me&&!editing?<div className="fajr-my-status">
     <div>
       <strong>{awake?'تم الاستيقاظ. صباح الخير!':'بانتظار استيقاظك'}</strong>
       <small dir="ltr">{me.phone}</small>
     </div>
     <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
       {!awake ? (
         <button disabled={busy} onClick={()=>act(async()=>{await fajrWakeService.awake(clanId);setNotice('تم تسجيل استيقاظك بنجاح. صباح الخير والبركة!');})}>
           <CheckCircle2 size={18}/> أنا صحيت
         </button>
       ) : (
         <>
           <span style={{background:'rgba(16,185,129,0.15)',color:'#10b981',border:'1px solid #10b981',padding:'6px 12px',borderRadius:10,fontSize:12,fontWeight:800,display:'flex',alignItems:'center',gap:4}}>
             <CheckCircle2 size={16}/> مسجّل كـ "صحيت"
           </span>
           <button type="button" className="fajr-link" style={{color:'#f87171',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:3}} disabled={busy} onClick={()=>act(async()=>{await fajrWakeService.undoAwake(clanId);setNotice('تم التراجع عن تسجيل الاستيقاظ.');})}>
             <RotateCcw size={13}/> تراجع (لم أستيقظ بعد)
           </button>
         </>
       )}
     </div>
     <button className="fajr-link" onClick={()=>{setPhone(me.phone);setConsent(false);setEditing(true);}}>تعديل رقمي</button>
   </div>:<form className="fajr-join" onSubmit={e=>{e.preventDefault();if(consent)act(async()=>{await fajrWakeService.join(clanId,name,phone);setEditing(false);setNotice('رقمك متاح الآن لأعضاء فريقك.');});}}><label>رقمك مع كود الدولة<input type="tel" dir="ltr" autoComplete="tel" placeholder="+20 10 1234 5678" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={24}/></label><label className="fajr-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>أوافق على عرض رقمي لأعضاء فريقي للاتصال بي وقت الفجر.</span></label><button disabled={busy||!consent||!phone.trim()} type="submit"><Phone size={16}/> {me?'حفظ الرقم':'انضم لرفقاء الفجر'}</button>{editing&&<button type="button" className="fajr-link" onClick={()=>setEditing(false)}>إلغاء</button>}</form>}
   {me&&<><p className="fajr-privacy"><ShieldCheck size={15}/> رقمك يظهر لأعضاء نفس الفريق فقط. إطفاء المنبّه بزر «أنا صحيت» يسجّل استيقاظك، وعند انقطاع الإنترنت تُحدّث الحالة بعد عودة الاتصال.</p><div className="fajr-people">{people.filter(p=>p.id!==user.uid).sort((a,b)=>Number(a.awakeDate===today)-Number(b.awakeDate===today)).map(p=><article key={p.id}><span className="fajr-person-avatar">{p.name?.slice(0,1)}</span><div><strong>{p.name}</strong><small>{p.awakeDate===today?<><Check size={13}/> تم الاستيقاظ</>:'لم يسجّل الاستيقاظ بعد'}</small></div>{p.awakeDate!==today?<a href={`tel:${p.phone}`} aria-label={`اتصل بـ ${p.name}`}><Phone size={18}/> إيقاظ</a>:<CheckCircle2 size={22}/>}</article>)}</div><button className="fajr-link" disabled={busy} onClick={()=>act(async()=>{await fajrWakeService.leave(clanId);setPhone('');setConsent(false);setNotice('تم إخفاء رقمك وإلغاء المشاركة.');})}><X size={14}/> إخفاء رقمي وإلغاء المشاركة</button></>}
  </>}
  <FajrAlarmSettingsModal isOpen={showAlarmSettings} onClose={()=>setShowAlarmSettings(false)} defaultAdminSound={defaultAdminSound}/>
  {showAlarmPreview && (
    <FajrAlarmPreviewModal
      isOpen={showAlarmPreview}
      onClose={()=>setShowAlarmPreview(false)}
      themeId={loadFajrAlarmSettings().themeId}
      soundType={loadFajrAlarmSettings().soundType}
      customSoundUrl={loadFajrAlarmSettings().customSoundUrl}
      defaultAdminSound={defaultAdminSound}
    />
  )}
 </section>;
}
