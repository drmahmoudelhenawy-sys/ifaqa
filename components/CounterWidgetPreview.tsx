import React, { useState, useEffect } from 'react';
import './CounterWidget.css';
import { RefreshCw, ChevronLeft } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';

const AZKAR_LIST = [
  "سبحان الله",
  "الحمد لله",
  "لا إله إلا الله",
  "الله أكبر",
  "أستغفر الله",
  "سبحان الله وبحمده",
  "لا حول ولا قوة إلا بالله"
];

interface CounterWidgetPreviewProps {
  mode?: 'white' | 'emerald';
}

const CounterWidgetPreview: React.FC<CounterWidgetPreviewProps> = ({ mode = 'emerald' }) => {
  const [count, setCount] = useState(0);
  const [zikrIndex, setZikrIndex] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const savedCount = await Preferences.get({ key: 'gen_counter_count' });
      const savedIndex = await Preferences.get({ key: 'gen_counter_index' });
      if (savedCount.value) setCount(parseInt(savedCount.value));
      if (savedIndex.value) setZikrIndex(parseInt(savedIndex.value));
    };
    loadData();
  }, []);

  const handleIncrement = async () => {
    const newCount = count + 1;
    setCount(newCount);
    await Preferences.set({ key: 'gen_counter_count', value: newCount.toString() });
  };

  const handleNextZikr = async () => {
    const nextIndex = (zikrIndex + 1) % AZKAR_LIST.length;
    setZikrIndex(nextIndex);
    setCount(0); // Reset count for new zikr
    await Preferences.set({ key: 'gen_counter_index', value: nextIndex.toString() });
    await Preferences.set({ key: 'gen_counter_count', value: '0' });
  };

  const themeClass = mode === 'white' ? 'theme-white' : 'theme-emerald';

  return (
    <div className={`counter-widget-main ${themeClass} animate-in fade-in duration-500`}>
      <div className="counter-header" onClick={handleNextZikr}>
        <span className="counter-zikr-text">{AZKAR_LIST[zikrIndex]}</span>
        <RefreshCw size={14} className="opacity-60" />
      </div>
      
      <div className="counter-main-btn" onClick={handleIncrement}>
         <span className="counter-number">{count}</span>
      </div>

      <div className="counter-reset-btn" onClick={() => {setCount(0); Preferences.set({key: 'gen_counter_count', value: '0'})}}>تصفير</div>
    </div>
  );
};

export default CounterWidgetPreview;
