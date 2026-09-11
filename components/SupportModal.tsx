import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, getDocs } from 'firebase/firestore';
import { X, Send, MessageSquare, UserX, Shield } from 'lucide-react';
import { db } from '../services/firebase';
import { APP_ID } from '../constants';

interface SupportModalProps {
  user: User;
  onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ user, onClose }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [isAnonymous, setIsAnonymous] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'artifacts', APP_ID, 'support_messages'), where('userId', '==', user.uid));
        const unsub = onSnapshot(q, (snap) => {
            const msgs = snap.docs.map(d => ({id: d.id, ...d.data()}));
            msgs.sort((a: any, b: any) => {
                const tA = a.timestamp?.seconds || (a.timestamp ? 0 : Infinity);
                const tB = b.timestamp?.seconds || (b.timestamp ? 0 : Infinity);
                return tB - tA;
            });
            setMessages(msgs);
        });
        return () => unsub();
    }, [user.uid]);

    const checkDailyAutoReply = async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check if there is already an auto-reply or admin reply today
        const hasReplyToday = messages.some(msg => {
            if (!msg.timestamp) return true; // Pending write
            const msgDate = new Date(msg.timestamp.seconds * 1000);
            return (msg.reply || msg.isAutoReply) && msgDate >= today;
        });

        if (!hasReplyToday) {
             setTimeout(async () => {
                await addDoc(collection(db, 'artifacts', APP_ID, 'support_messages'), {
                    userId: user.uid,
                    userName: 'System',
                    reply: 'أهلاً بك! سعداء بتواصلك. سيتم مراجعة رسالتك والرد عليك قريباً.',
                    status: 'replied',
                    timestamp: serverTimestamp(),
                    isAutoReply: true
                });
            }, 1000);
        }
    };

    const handleSend = async () => {
        if(!message.trim()) return;
        
        await addDoc(collection(db, 'artifacts', APP_ID, 'support_messages'), {
            userId: user.uid, // Always store real ID for blocking/tracking
            userName: isAnonymous ? 'مجهول' : (user.displayName || 'User'),
            realName: user.displayName || 'Unknown', // Extra field for admin if needed
            message: message.trim(),
            status: 'open',
            timestamp: serverTimestamp()
        });
        
        await checkDailyAutoReply();
        setMessage('');
    };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/75 z-[9999] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-md animate-in fade-in select-none" onClick={onClose}>
             <div 
               role="dialog"
               aria-modal="true"
               className="ifaqa-modal-solid bg-white w-full max-w-md h-[80vh] sm:h-[600px] rounded-t-[2rem] sm:rounded-3xl p-0 flex flex-col shadow-2xl relative border border-slate-200 text-slate-900"
               style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
               onClick={e => e.stopPropagation()}
             >
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-[2rem] sm:rounded-t-3xl">
                    <h3 className="font-black text-lg text-slate-900 flex items-center gap-2"><MessageSquare className="text-violet-600"/> الدعم والمقترحات</h3>
                    <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition"><X size={20}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4 bg-slate-50 flex flex-col-reverse">
                    {messages.length === 0 && <p className="text-center text-slate-400 py-10 self-center font-bold text-sm">لديك استفسار أو اقتراح؟ نحن هنا للسماع منك.</p>}
                    {messages.map(msg => (
                        <div key={msg.id} className="w-full flex flex-col gap-2">
                             {msg.message && (
                                <div className="bg-violet-600 text-white p-3.5 rounded-2xl rounded-tr-none self-end max-w-[85%] ml-auto shadow-md">
                                    <p className="text-sm leading-relaxed">{outlineContent(msg.message)}</p>
                                    {msg.userName === 'مجهول' && <span className="text-[9px] opacity-70 block text-right mt-1 font-bold">مرسل كمجهول</span>}
                                </div>
                             )}
                            {msg.reply && (
                                <div className="bg-white text-slate-800 p-3.5 rounded-2xl rounded-tl-none self-start max-w-[85%] border border-slate-200 shadow-sm">
                                    <p className="text-xs text-emerald-600 font-black mb-1">الدعم الفني:</p>
                                    <p className="text-sm leading-relaxed font-bold">{msg.reply}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-white border-t border-slate-200 pb-safe rounded-b-[2rem] sm:rounded-b-3xl">
                    <div className="mb-2 flex items-center gap-2">
                        <button 
                            onClick={() => setIsAnonymous(!isAnonymous)} 
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${isAnonymous ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}
                        >
                            {isAnonymous ? <><UserX size={12}/> إرسال كمجهول</> : <><Shield size={12}/> إرسال باسمي</>}
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="اكتب رسالتك..."
                            className="flex-1 bg-slate-100 dark:bg-slate-900 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                        <button onClick={handleSend} className="bg-blue-500 text-white p-3 rounded-xl hover:bg-blue-600 transition shadow-lg shadow-blue-500/20"><Send size={20} className="rtl:rotate-180"/></button>
                    </div>
                </div>
             </div>
        </div>,
        document.body
    );
};

export default SupportModal;
