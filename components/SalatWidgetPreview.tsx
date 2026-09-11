import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import './SalatWidget.css';
import { Preferences } from '@capacitor/preferences';

import { getProphetChallengeSchedule } from '../src/services/prophetChallengeSchedule';

interface SalatWidgetPreviewProps {
  mode?: 'white' | 'emerald';
}

const SalatWidgetPreview: React.FC<SalatWidgetPreviewProps> = ({ mode = 'emerald' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      const schedule = getProphetChallengeSchedule();
      const currentPeriod = schedule.periodKey;
      const savedPeriod = await Preferences.get({ key: 'ifaqa_salat_period' });

      if (savedPeriod.value === currentPeriod) {
        const saved = await Preferences.get({ key: 'ifaqa_salat_count' });
        if (saved.value) setCount(parseInt(saved.value, 10));
      } else {
        setCount(0);
        await Preferences.set({ key: 'ifaqa_salat_period', value: currentPeriod });
        await Preferences.set({ key: 'ifaqa_salat_count', value: '0' });
      }
    };
    loadCount();
    
    // Refresh count when it might have changed
    const interval = setInterval(loadCount, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleIncrement = async () => {
    const schedule = getProphetChallengeSchedule();
    const currentPeriod = schedule.periodKey;
    const newCount = count + 1;
    setCount(newCount);
    await Preferences.set({ key: 'ifaqa_salat_period', value: currentPeriod });
    await Preferences.set({ key: 'ifaqa_salat_count', value: newCount.toString() });
  };

  const themeClass = mode === 'white' ? 'theme-white' : 'theme-emerald';

  return (
    <div className={`salat-widget-main ${themeClass} animate-in fade-in duration-500`}>
      <div className="salat-content-wrapper" onClick={handleIncrement}>
        <div className="salat-heart-container">
           <Heart size={40} className="salat-heart-icon" fill="currentColor" />
           <span className="salat-text-center">صلِّ</span>
        </div>
        
        <div className="salat-counter-display">
           <span className="salat-count">{count.toLocaleString()}</span>
           <p className="salat-subtext">صلاة علي الرسول ﷺ</p>
        </div>
      </div>
    </div>
  );
};

export default SalatWidgetPreview;
