import React, { useEffect, useState } from 'react';
import { FUNDAMENTAL_PRAYERS, getCachedTimings, getPrayerSettings } from '../services/prayerTimes';
import { BellRing } from 'lucide-react';

export const IqamahBanner: React.FC = () => {
  const [activeIqamah, setActiveIqamah] = useState<{
    prayer: string;
    passedMinutes: number;
    remainingMinutes: number;
  } | null>(null);

  useEffect(() => {
    const checkIqamahTime = () => {
      const timings = getCachedTimings();
      if (!timings) return;

      const settings = getPrayerSettings();
      const now = new Date();
      const currentMs = now.getTime();

      let found = false;

      for (const prayer of FUNDAMENTAL_PRAYERS) {
        const timeStr = timings[prayer];
        if (!timeStr) continue;

        const cleanTime = timeStr.split(' ')[0];
        const [hours, minutes] = cleanTime.split(':').map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) continue;

        const prayerDate = new Date();
        prayerDate.setHours(hours, minutes, 0, 0);
        const azanMs = prayerDate.getTime();

        const offset = settings.offsets[prayer]?.iqama || 0;
        if (offset <= 0) continue;

        const iqamaMs = azanMs + (offset * 60 * 1000);

        // If current time is between Azan and Iqamah
        if (currentMs >= azanMs && currentMs < iqamaMs) {
          const passedMinutes = Math.floor((currentMs - azanMs) / 60000);
          const remainingMinutes = Math.ceil((iqamaMs - currentMs) / 60000);
          
          const namesAr: Record<string, string> = {
            Fajr: 'الفجر',
            Dhuhr: 'الظهر',
            Asr: 'العصر',
            Maghrib: 'المغرب',
            Isha: 'العشاء'
          };

          setActiveIqamah({
            prayer: namesAr[prayer] || prayer,
            passedMinutes,
            remainingMinutes
          });
          found = true;
          break;
        }
      }

      if (!found) {
        setActiveIqamah(null);
      }
    };

    checkIqamahTime();
    const interval = setInterval(checkIqamahTime, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (!activeIqamah) return null;

  return (
    <div className="bg-[var(--quran-accent)] text-white px-4 py-3 shadow-lg flex items-center justify-center gap-3 w-full z-50 sticky top-0" dir="rtl">
      <BellRing size={20} className="animate-pulse" />
      <div className="text-sm font-bold">
        <span>مضى على أذان {activeIqamah.prayer} </span>
        <span className="text-yellow-200">{activeIqamah.passedMinutes} دقائق</span>
        <span> - متبقي على الإقامة </span>
        <span className="text-yellow-200">{activeIqamah.remainingMinutes} دقيقة</span>
      </div>
    </div>
  );
};
