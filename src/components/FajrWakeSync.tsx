import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { syncFajrWakeEvents } from '../services/fajrWakeService';
export default function FajrWakeSync(){
 useEffect(()=>{let busy=false;const sync=async()=>{if(busy)return;busy=true;try{await syncFajrWakeEvents();}catch{}finally{busy=false;}};const off=onAuthStateChanged(auth,sync);window.addEventListener('focus',sync);window.addEventListener('online',sync);const timer=setInterval(sync,30000);return()=>{off();clearInterval(timer);window.removeEventListener('focus',sync);window.removeEventListener('online',sync);};},[]);
 return null;
}
