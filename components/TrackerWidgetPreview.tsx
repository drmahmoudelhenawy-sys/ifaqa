import React, { useState, useEffect } from 'react';
import './TrackerWidget.css';
import { Check, Home, User, Clock, Star } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';

// Prayer States: 0: None, 1: Mosque, 2: Alone, 3: Late
const PRAYER_STATES = [
  { id: 0, label: 'لم تصل بعد', color: 'transparent', icon: null },
  { id: 1, label: 'جماعة في المسجد', color: '#10b981', icon: <Home size={18} /> },
  { id: 2, label: 'صلاة منفرد', color: '#3b82f6', icon: <User size={18} /> },
  { id: 3, label: 'صلاة قضاء/متأخر', color: '#f59e0b', icon: <Clock size={18} /> }
];

const PRAYERS = [
  { id: 'fajr', name: 'الفجر', sunnah: 2 },
  { id: 'dhuhr', name: 'الظهر', sunnah: 12 },
  { id: 'asr', name: 'العصر', sunnah: 4 },
  { id: 'maghrib', name: 'المغرب', sunnah: 6 },
  { id: 'isha', name: 'العشاء', sunnah: 9 }
];

interface TrackerWidgetPreviewProps {
  mode?: 'white' | 'emerald';
}

const TrackerWidgetPreview: React.FC<TrackerWidgetPreviewProps> = ({ mode = 'emerald' }) => {
  const [data, setData] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadData = async () => {
      const today = new Date().toISOString().split('T')[0];
      const saved = await Preferences.get({ key: `ifaqa_tracker_${today}` });
      if (saved.value) setData(JSON.parse(saved.value));
    };
    loadData();
  }, []);

  const cyclePrayerState = async (prayerId: string) => {
    const currentState = data[prayerId]?.state || 0;
    const nextState = (currentState + 1) % 4;
    
    const newData = { 
      ...data, 
      [prayerId]: { ...data[prayerId], state: nextState } 
    };
    
    setData(newData);
    const today = new Date().toISOString().split('T')[0];
    await Preferences.set({ key: `ifaqa_tracker_${today}`, value: JSON.stringify(newData) });
  };

  const toggleSunnah = async (prayerId: string) => {
    const isDone = data[prayerId]?.sunnahDone || false;
    const newData = { 
      ...data, 
      [prayerId]: { ...data[prayerId], sunnahDone: !isDone } 
    };
    
    setData(newData);
    const today = new Date().toISOString().split('T')[0];
    await Preferences.set({ key: `ifaqa_tracker_${today}`, value: JSON.stringify(newData) });
  };

  const themeClass = mode === 'white' ? 'theme-white' : 'theme-emerald';

  return (
    <div className={`tracker-widget-main ${themeClass} animate-in fade-in duration-500`}>
      <div className="tracker-header">
        <div className="flex flex-col">
          <h3>تتبع العبادات اليومية</h3>
          <span className="text-[9px] opacity-60">اضغط مراراً لتغيير حالة الصلاة</span>
        </div>
        <div className="flex gap-2">
           {PRAYER_STATES.filter(s => s.id !== 0).map(s => (
             <div key={s.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
           ))}
        </div>
      </div>

      <div className="tracker-prayers-row">
        {PRAYERS.map(p => {
          const pData = data[p.id] || { state: 0, sunnahDone: false };
          const stateInfo = PRAYER_STATES[pData.state];
          
          return (
            <div key={p.id} className="prayer-track-item">
              {/* Sunnah Toggle */}
              <div 
                className={`sunnah-indicator ${pData.sunnahDone ? 'done' : ''}`}
                onClick={() => toggleSunnah(p.id)}
              >
                <Star size={8} />
              </div>

              {/* Main Prayer Circle */}
              <div 
                className={`prayer-circle state-${pData.state}`} 
                onClick={() => cyclePrayerState(p.id)}
                style={{ backgroundColor: stateInfo.color, borderColor: pData.state === 0 ? '' : 'rgba(255,255,255,0.3)' }}
              >
                {stateInfo.icon || <span className="text-[10px] opacity-40">--</span>}
              </div>
              <span className="prayer-name">{p.name}</span>
            </div>
          );
        })}
      </div>

      {/* Extra tracking footer */}
      <div className="tracker-extra-row">
         <div className="text-[10px] font-bold opacity-70 bg-white/5 px-3 py-1 rounded-full">
            إنجاز اليوم: {Object.values(data).filter((v: any) => v.state > 0).length} / 5 صلوات
         </div>
      </div>
    </div>
  );
};

export default TrackerWidgetPreview;
