import React, { useEffect, useState } from 'react';
import './WirdWidget.css';
import { BookOpen, Target, History, BookmarkCheck, RotateCcw, Clock } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';

interface WirdWidgetPreviewProps {
  mode?: 'white' | 'emerald';
}

const WirdWidgetPreview: React.FC<WirdWidgetPreviewProps> = ({ mode = 'emerald' }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const hifz = await Preferences.get({ key: 'user_wird_hifz' });
      const near = await Preferences.get({ key: 'user_wird_rev_near_data' });
      const far = await Preferences.get({ key: 'user_wird_rev_far_data' });

      setData({
        hifz: hifz.value ? JSON.parse(hifz.value) : { surahName: 'الملك', juzNumber: 29, pageNumber: 562 },
        near: near.value ? JSON.parse(near.value) : { surahName: 'النبأ', juzNumber: 30, pageNumber: 582 },
        far: far.value ? JSON.parse(far.value) : { surahName: 'يس', juzNumber: 23, pageNumber: 440 }
      });
    };
    loadData();
  }, []);

  const themeClass = mode === 'white' ? 'theme-white' : 'theme-emerald';

  if (!data) return null;

  return (
    <div className={`wird-widget-main ${themeClass} animate-in fade-in duration-500`}>
      <div className="wird-widget-header">
        <h3>أورادي اليومية</h3>
        <div className="p-1.5 bg-white/10 rounded-lg">
           <BookOpen size={18} className="opacity-80" />
        </div>
      </div>

      <div className="wird-widget-content">
        {/* Hifz Card */}
        <div className="wird-card">
          <div className="wird-card-info">
             <div className="wird-icon-box">
                <BookmarkCheck size={20} />
             </div>
             <div className="wird-texts">
                <span className="wird-type-label">ورد الحفظ</span>
                <span className="wird-current-surah">{data.hifz.surahName}</span>
             </div>
          </div>
          <div className="wird-progress-details">
             <div className="wird-page-tag">ص {data.hifz.pageNumber}</div>
             <span className="wird-juz-tag">الجزء {data.hifz.juzNumber}</span>
          </div>
        </div>

        {/* Near Revision Card */}
        <div className="wird-card">
          <div className="wird-card-info">
             <div className="wird-icon-box" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.15)' }}>
                <RotateCcw size={20} />
             </div>
             <div className="wird-texts">
                <span className="wird-type-label">مراجعة قريبة</span>
                <span className="wird-current-surah">{data.near.surahName}</span>
             </div>
          </div>
          <div className="wird-progress-details">
             <div className="wird-page-tag">ص {data.near.pageNumber}</div>
             <span className="wird-juz-tag">الجزء {data.near.juzNumber}</span>
          </div>
        </div>

        {/* Far Revision Card */}
        <div className="wird-card">
          <div className="wird-card-info">
             <div className="wird-icon-box" style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.15)' }}>
                <Clock size={20} />
             </div>
             <div className="wird-texts">
                <span className="wird-type-label">مراجعة بعيدة</span>
                <span className="wird-current-surah">{data.far.surahName}</span>
             </div>
          </div>
          <div className="wird-progress-details">
             <div className="wird-page-tag">ص {data.far.pageNumber}</div>
             <span className="wird-juz-tag">الجزء {data.far.juzNumber}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WirdWidgetPreview;
