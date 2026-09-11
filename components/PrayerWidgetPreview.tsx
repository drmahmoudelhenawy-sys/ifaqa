import React from 'react';
import './PrayerWidget.css';
import { Bell, Clock, Sun, Sunrise, Moon, CloudSun, Sunset, Calendar } from 'lucide-react';
import { usePrayerTimer } from '../src/hooks/usePrayerTimer';
import { getCachedTimings } from '../src/services/prayerTimes';

interface PrayerWidgetPreviewProps {
  mode?: 'white' | 'green';
}

const PrayerWidgetPreview: React.FC<PrayerWidgetPreviewProps> = ({ mode = 'green' }) => {
  const [timings, setTimings] = React.useState<any>(() => getCachedTimings() || {});
  
  React.useEffect(() => {
    const load = async () => {
      const t = await getCachedTimings();
      if (t) setTimings(t);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const PRAYER_LABELS: any = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
  
  const getPrayerTimestamp = (time?: string) => {
    if (!time) return Number.POSITIVE_INFINITY;
    const cleanTime = time.split(' ')[0];
    const [hours, minutes] = cleanTime.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.POSITIVE_INFINITY;
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.getTime();
  };

  const timerTimings = React.useMemo(() => {
    const result: any = {};
    Object.entries(timings).forEach(([key, timeStr]) => {
      if (typeof timeStr === 'string' && ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(key)) {
        result[key] = getPrayerTimestamp(timeStr);
      }
    });
    return result;
  }, [timings]);

  const { nextPrayer, currentPrayer, timeLeft, mode: timerMode } = usePrayerTimer(timerTimings);
  const themeClass = mode === 'white' ? 'theme-light' : 'theme-mosque';
  
  return (
    <div className={`prayer-widget-main ${themeClass} animate-in fade-in duration-500`}>
      {/* Mosque Silhouette Overlay & Moon */}
      <div className="mosque-overlay"></div>
      <div className="moon-overlay"></div>

      <div className="widget-content-wrapper">
        <div className="top-section">
          {/* Right: Next Prayer Info (First in DOM for RTL) */}
          <div className="next-prayer-display">
             <div className="prayer-name-row">
                <h2>{nextPrayer ? PRAYER_LABELS[nextPrayer.name] : 'الظهر'}</h2>
                <Sunrise size={36} className="prayer-icon-large" />
             </div>
             <span className="sub-status">
                {nextPrayer ? (
                    // @ts-ignore
                    timerMode === 'passed' ? `حان الآن موعد صلاة ${PRAYER_LABELS[nextPrayer.name]}` : `الصلاة القادمة هي ${PRAYER_LABELS[nextPrayer.name]}`
                ) : 'جارِ جلب المواقيت...'}
             </span>
          </div>

          {/* Left: Countdown */}
          <div className="countdown-container">
            <Bell size={14} className="mb-1 text-emerald-400" />
            <span className="countdown-val">
              {nextPrayer ? timeLeft : '--:--:--'}
            </span>
            <span className="countdown-txt">
              {nextPrayer ? (
                // @ts-ignore
                timerMode === 'passed' ? 'مضى على الأذان' : 'بقي على الأذان'
              ) : 'جارِ التحميل...'}
            </span>
          </div>
        </div>

        {/* Bottom: Grid 2 Columns */}
        <div className="times-grid-landscape">
          <div className={`time-row ${(nextPrayer?.name === 'Fajr' && timerMode !== 'passed') || (currentPrayer?.name === 'Fajr' && timerMode === 'passed') ? 'active' : ''}`}>
             <div className="row-label"><Sunrise size={16} className="row-icon"/> الفجر</div>
             <span className="row-val">{timings.Fajr?.split(' ')[0] || '--:--'}</span>
          </div>
          <div className="time-row">
             <div className="row-label"><Sun size={16} className="row-icon"/> الشروق</div>
             <span className="row-val">{timings.Sunrise?.split(' ')[0] || '--:--'}</span>
          </div>
          
          <div className={`time-row ${(nextPrayer?.name === 'Dhuhr' && timerMode !== 'passed') || (currentPrayer?.name === 'Dhuhr' && timerMode === 'passed') ? 'active' : ''}`}>
             <div className="row-label"><CloudSun size={16} className="row-icon"/> الظهر</div>
             <span className="row-val">{timings.Dhuhr?.split(' ')[0] || '--:--'}</span>
          </div>
          <div className={`time-row ${(nextPrayer?.name === 'Asr' && timerMode !== 'passed') || (currentPrayer?.name === 'Asr' && timerMode === 'passed') ? 'active' : ''}`}>
             <div className="row-label"><Sun size={16} className="row-icon"/> العصر</div>
             <span className="row-val">{timings.Asr?.split(' ')[0] || '--:--'}</span>
          </div>
          
          <div className={`time-row ${(nextPrayer?.name === 'Maghrib' && timerMode !== 'passed') || (currentPrayer?.name === 'Maghrib' && timerMode === 'passed') ? 'active' : ''}`}>
             <div className="row-label"><Sunset size={16} className="row-icon"/> المغرب</div>
             <span className="row-val">{timings.Maghrib?.split(' ')[0] || '--:--'}</span>
          </div>
          <div className={`time-row ${(nextPrayer?.name === 'Isha' && timerMode !== 'passed') || (currentPrayer?.name === 'Isha' && timerMode === 'passed') ? 'active' : ''}`}>
             <div className="row-label"><Moon size={16} className="row-icon"/> العشاء</div>
             <span className="row-val">{timings.Isha?.split(' ')[0] || '--:--'}</span>
          </div>
        </div>

        <div className="footer-date">
          <Calendar size={14} />
          <span>{new Intl.DateTimeFormat('ar-SA-u-ca-islamic-uma', {day:'numeric', month:'long', year:'numeric'}).format(new Date())} هـ • {new Intl.DateTimeFormat('ar-EG', {day:'numeric', month:'long', year:'numeric'}).format(new Date())}</span>
        </div>
      </div>
    </div>
  );
};

export default PrayerWidgetPreview;
