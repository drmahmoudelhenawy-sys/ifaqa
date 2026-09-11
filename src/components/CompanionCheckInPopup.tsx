import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {onAuthStateChanged} from 'firebase/auth';
import {doc,onSnapshot} from 'firebase/firestore';
import {HandHeart,MessageCircle,X} from 'lucide-react';
import {auth,db} from '../../services/firebase';
import {APP_ID} from '../../constants';
import {clanService,type ClanCheckInMessage} from '../services/clanService';
import {outlineContent} from './OutlineIcon';
import '../styles/CompanionCheckInPopup.css';
export const COMPANION_CHAT_EVENT='ifaqa-open-companion-chat';
export function requestedCompanion(){try{return JSON.parse(sessionStorage.getItem('ifaqa-companion-chat')||'null') as {peerId:string;clanId:string}|null;}catch{return null;}}
export default function CompanionCheckInPopup(){
 const [user,setUser]=useState(auth.currentUser),[clanId,setClanId]=useState<string|null>(null),[messages,setMessages]=useState<ClanCheckInMessage[]>([]),[seen,setSeen]=useState<Set<string>>(new Set());
 const box=useRef<HTMLDivElement>(null);
 useEffect(()=>onAuthStateChanged(auth,setUser),[]);
 useEffect(()=>{setClanId(null);setMessages([]);setSeen(new Set());if(!user)return;return clanService.subscribeToUserClan(user.uid,setClanId);},[user?.uid]);
 useEffect(()=>{setMessages([]);if(!user||!clanId)return;return onSnapshot(doc(db,'artifacts',APP_ID,'public','data','clans',clanId,'members',user.uid),snap=>setMessages(snap.data()?.checkInMessages||[]),()=>setMessages([]));},[clanId,user?.uid]);
 const unseen=messages.filter(m=>!seen.has(m.fromUserId+':'+m.sentAt));
 const current=unseen[0];
 useEffect(()=>{if(!current)return;const prev=document.activeElement as HTMLElement;box.current?.focus();return()=>prev?.focus();},[current?.sentAt]);
 if(!current||!user||!clanId)return null;
 const close=()=>{setSeen(new Set([...seen,...messages.map(m=>m.fromUserId+':'+m.sentAt)]));void clanService.dismissCompanionCheckIns(clanId,user.uid);};
 const reply=()=>{sessionStorage.setItem('ifaqa-companion-chat',JSON.stringify({peerId:current.fromUserId,clanId}));window.dispatchEvent(new CustomEvent(COMPANION_CHAT_EVENT));close();};
 return createPortal(<div className="companion-popup-backdrop"><div ref={box} tabIndex={-1} className="companion-popup" role="dialog" aria-modal="true" aria-labelledby="companion-popup-title" dir="rtl" onKeyDown={e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const buttons=box.current?.querySelectorAll<HTMLButtonElement>('button');if(!buttons?.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===box.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===box.current)){e.preventDefault();first.focus();}}}}>
 <button className="companion-popup-close" onClick={close} aria-label="إغلاق رسالة التفقد"><X size={20}/></button><span className="companion-popup-icon"><HandHeart size={34} strokeWidth={1.5}/></span><small>رسالة مودة من رفقائك</small><h2 id="companion-popup-title">رفيقك بيسأل عليك</h2><p><strong>{current.fromUserName}</strong> افتقدك وترك لك رسالة طيبة</p><blockquote>{outlineContent(current.message)}</blockquote><button className="companion-popup-reply" onClick={reply}><MessageCircle size={18}/> طمّن رفيقك ورد عليه</button><button className="companion-popup-later" onClick={close}>وصلتني رسالتك، جزاك الله خيراً</button>
 </div></div>,document.body);
}
