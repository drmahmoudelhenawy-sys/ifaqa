
import React, { useState } from 'react';
import { doc, setDoc, addDoc, deleteDoc, collection, Timestamp } from 'firebase/firestore';
import { X, Save, Trash2, Plus, Star, Trophy, BookOpen, Calendar, AlertTriangle, ZapOff, Edit3 } from 'lucide-react';
import { db } from '../services/firebase';
import { APP_ID } from '../constants';
import { MawanEvent, Zekr } from '../types';

interface AdminEventModalProps {
  eventToEdit: MawanEvent | null;
  onClose: () => void;
}

const ICONS = { Star, Trophy, BookOpen, Calendar };
const GRADIENTS = [
    'from-yellow-400 to-orange-500',
    'from-emerald-400 to-teal-500',
    'from-blue-400 to-cyan-500',
    'from-rose-400 to-red-500',
    'from-purple-500 to-indigo-600',
    'from-pink-500 to-rose-600'
];

const AdminEventModal: React.FC<AdminEventModalProps> = ({ eventToEdit, onClose }) => {
  const [formData, setFormData] = useState<Partial<MawanEvent>>({
    title: eventToEdit?.title || '',
    description: eventToEdit?.description || '',
    rules: eventToEdit?.rules || '',
    icon: eventToEdit?.icon || 'Star',
    gradient: eventToEdit?.gradient || GRADIENTS[0],
    status: eventToEdit?.status || 'draft',
    requiredAdhkar: eventToEdit?.requiredAdhkar || [],
  });

  const toHTMLInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [startTime, setStartTime] = useState(toHTMLInputDate(eventToEdit?.startTime?.toDate() || new Date()));
  const [endTime, setEndTime] = useState(toHTMLInputDate(eventToEdit?.endTime?.toDate() || new Date()));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleAdhkarChange = (index: number, field: keyof Zekr, value: string | number) => {
    const newAdhkar = [...(formData.requiredAdhkar || [])];
    (newAdhkar[index] as any)[field] = value;
    setFormData({ ...formData, requiredAdhkar: newAdhkar });
  };

  const addAdhkar = () => {
    const newAdhkar: Zekr = { id: Date.now().toString(), text: '', count: 1, xp: 10, fadl: '' };
    setFormData({ ...formData, requiredAdhkar: [...(formData.requiredAdhkar || []), newAdhkar] });
  };
  
  const removeAdhkar = (index: number) => {
    const newAdhkar = [...(formData.requiredAdhkar || [])];
    newAdhkar.splice(index, 1);
    setFormData({ ...formData, requiredAdhkar: newAdhkar });
  };

  const handleSave = async () => {
    const dataToSave = {
        ...formData,
        startTime: Timestamp.fromDate(new Date(startTime)),
        endTime: Timestamp.fromDate(new Date(endTime))
    };

    if (eventToEdit) {
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'mawan_events', eventToEdit.id), dataToSave, { merge: true });
    } else {
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'mawan_events'), dataToSave);
    }
    onClose();
  };
  
  const handleDelete = async () => {
    if(eventToEdit && window.confirm("هل أنت متأكد من حذف هذه الفعالية نهائياً؟")) {
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'mawan_events', eventToEdit.id));
        onClose();
    }
  };
  
  const handleEndEvent = async () => {
    if (eventToEdit && window.confirm("هل أنت متأكد من إنهاء الفعالية الآن؟ سيتم تحديث وقت الانتهاء للحظة الحالية وتغيير الحالة إلى 'منتهية'.")) {
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'mawan_events', eventToEdit.id), {
            endTime: Timestamp.now(),
            status: 'ended'
        }, { merge: true });
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-[60] animate-in slide-in-from-bottom flex flex-col">
      <div className="flex-shrink-0 bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
        <h2 className="font-bold text-white">{eventToEdit ? 'تعديل فعالية' : 'فعالية جديدة'}</h2>
        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-700 rounded-full"><X size={20}/></button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8 text-white custom-scrollbar">
        {/* Basic Info Section */}
        <div className="space-y-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
            <h3 className="font-bold text-xs text-violet-400 uppercase tracking-widest flex items-center gap-2">
                <Edit3 size={14}/> المعلومات الأساسية
            </h3>
            <div className="space-y-3">
                <input name="title" value={formData.title} onChange={handleChange} placeholder="عنوان الفعالية (مثال: مسابقة العشر الأوائل)" className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all" />
                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="وصف قصير للفعالية يظهر في البطاقة التعريفية..." className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl h-24 focus:ring-2 focus:ring-violet-500 outline-none transition-all" />
                
                <div className="pt-2">
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block px-1">قوانين وشروط الفعالية (ستظهر للمشاركين)</label>
                    <textarea name="rules" value={formData.rules} onChange={handleChange} placeholder="اكتب هنا القوانين، طريقة احتساب النقاط، وأي شروط إضافية..." className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl h-40 focus:ring-2 focus:ring-violet-500 outline-none transition-all text-sm leading-relaxed" />
                </div>
            </div>
        </div>

        {/* Status & Timing Section */}
        <div className="space-y-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
            <h3 className="font-bold text-xs text-violet-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14}/> التوقيت والحالة
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block px-1">حالة الفعالية</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none">
                        <option value="draft"> مسودة (غير مرئية)</option>
                        <option value="upcoming"> قادمة (تظهر قريباً)</option>
                        <option value="active"> نشطة (جارية الآن)</option>
                        <option value="ended" disabled> منتهية (تلقائي)</option>
                    </select>
                </div>
                <div>
                     <label className="text-[10px] font-bold text-slate-500 mb-1 block px-1">وقت البدء</label>
                     <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl font-mono text-xs"/>
                </div>
                <div>
                     <label className="text-[10px] font-bold text-slate-500 mb-1 block px-1">وقت الانتهاء</label>
                     <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl font-mono text-xs"/>
                </div>
            </div>
        </div>

        {/* Design Section */}
        <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-400 border-b border-slate-700 pb-2">التصميم</h3>
            <div>
                <label className="font-bold mb-2 text-xs text-slate-300 block">الأيقونة</label>
                <div className="flex gap-2 p-2 bg-slate-800 rounded-lg border border-slate-700">
                    {Object.keys(ICONS).map(iconName => {
                        const Icon = ICONS[iconName as keyof typeof ICONS];
                        return <button key={iconName} onClick={() => setFormData({...formData, icon: iconName})} className={`p-3 rounded-md ${formData.icon === iconName ? 'bg-violet-600' : 'bg-slate-700'}`}><Icon size={20}/></button>
                    })}
                </div>
            </div>
            <div>
                <label className="font-bold mb-2 text-xs text-slate-300 block">الخلفية</label>
                <div className="flex gap-2 flex-wrap">
                    {GRADIENTS.map(g => (
                        <button key={g} onClick={() => setFormData({...formData, gradient: g})} className={`w-12 h-12 rounded-lg bg-gradient-to-br ${g} ${formData.gradient === g ? 'ring-2 ring-white' : ''}`}></button>
                    ))}
                </div>
            </div>
        </div>

        {/* Adhkar Section */}
        <div className="space-y-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
             <h3 className="font-bold text-xs text-violet-400 uppercase tracking-widest flex items-center gap-2">
                <BookOpen size={14}/> المهام / الأذكار المطلوبة
             </h3>
             <div className="space-y-3">
                 {formData.requiredAdhkar?.map((zekr, i) => (
                     <div key={i} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 space-y-3 relative group">
                         <textarea value={zekr.text} onChange={e => handleAdhkarChange(i, 'text', e.target.value)} placeholder="نص الذكر أو المهمة..." className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:border-violet-500 outline-none h-20"/>
                         <textarea value={zekr.fadl} onChange={e => handleAdhkarChange(i, 'fadl', e.target.value)} placeholder="فضل الذكر أو تعليمات المهمة (اختياري)..." className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-xs h-16 opacity-70 focus:opacity-100 transition-opacity outline-none"/>
                         <div className="grid grid-cols-3 gap-3">
                             <div>
                                <label className="text-[10px] text-slate-500 mb-1 block">العدد</label>
                                <input type="number" value={zekr.count} onChange={e => handleAdhkarChange(i, 'count', parseInt(e.target.value))} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-center font-bold"/>
                             </div>
                             <div>
                                <label className="text-[10px] text-slate-500 mb-1 block">نقاط XP</label>
                                <input type="number" value={zekr.xp} onChange={e => handleAdhkarChange(i, 'xp', parseInt(e.target.value))} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-center font-bold text-emerald-400"/>
                             </div>
                             <div className="flex items-end">
                                <button onClick={() => removeAdhkar(i)} className="w-full p-3 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors">إزالة</button>
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
             <button onClick={addAdhkar} className="w-full py-4 bg-violet-600/10 text-violet-400 rounded-xl flex items-center justify-center gap-2 font-bold border border-dashed border-violet-500/30 hover:bg-violet-600/20 transition-all active:scale-95">
                <Plus size={20}/> إضافة مهمة جديدة
             </button>
        </div>
      </div>
      
      <div className="flex-shrink-0 bg-slate-800 p-4 pb-safe grid grid-cols-3 gap-3 border-t border-slate-700">
        <div className="col-span-1 flex gap-3">
            {eventToEdit && (
                <button 
                    onClick={handleDelete} 
                    className="p-4 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors active:scale-95"
                    aria-label="حذف الفعالية"
                >
                    <Trash2 size={20}/>
                </button>
            )}
             {eventToEdit && eventToEdit.status === 'active' && (
                <button 
                    onClick={handleEndEvent} 
                    className="p-4 bg-amber-500/10 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-colors active:scale-95"
                    aria-label="إنهاء الفعالية الآن"
                >
                    <ZapOff size={20}/>
                </button>
            )}
        </div>
        <div className="col-span-2 flex gap-3">
             <button 
                onClick={onClose} 
                className="flex-1 py-4 bg-slate-700/50 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-colors active:scale-95"
            >
                إلغاء
            </button>
            <button 
                onClick={handleSave} 
                className="flex-1 py-4 bg-violet-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-violet-700 transition-colors active:scale-95 shadow-lg shadow-violet-500/20"
            >
                <Save size={20}/>
                <span>حفظ</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default AdminEventModal;
