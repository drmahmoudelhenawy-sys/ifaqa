import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const requestNotificationPermissions = async () => {
  if (Capacitor.isNativePlatform()) {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  }
};

// Helper to get Hijri day
export const getHijriDay = (date: Date): number => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { day: 'numeric' });
    const dayStr = formatter.format(date);
    return parseInt(dayStr, 10);
  } catch (e) {
    return 1;
  }
};

export const scheduleFastingReminders = async () => {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    await requestNotificationPermissions();
    
    // Clear previous fasting reminders (IDs 100-200)
    const pending = await LocalNotifications.getPending();
    const toCancel = pending.notifications.filter(n => n.id >= 100 && n.id <= 200);
    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel });
    }

    const notificationsToSchedule = [];
    const today = new Date();
    
    // Look ahead 30 days
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      
      const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday, 4 is Thursday
      const hijriDay = getHijriDay(d);
      
      let fastingReason = '';
      if (dayOfWeek === 1) fastingReason = 'غداً الإثنين، تُعرض فيه الأعمال، صم تُؤجر.';
      else if (dayOfWeek === 4) fastingReason = 'غداً الخميس، تُعرض فيه الأعمال، صم تُؤجر.';
      else if (hijriDay === 13 || hijriDay === 14 || hijriDay === 15) {
        fastingReason = `غداً يوم ${hijriDay} من الأيام البيض، أوصى النبي بصيامها.`;
      }

      if (fastingReason) {
        // Schedule at 8:00 PM the night before
        const scheduleDate = new Date(d);
        scheduleDate.setDate(scheduleDate.getDate() - 1);
        scheduleDate.setHours(20, 0, 0, 0);

        if (scheduleDate.getTime() > Date.now()) {
          notificationsToSchedule.push({
            id: 100 + i,
            title: "تذكير بالصيام",
            body: fastingReason,
            schedule: { at: scheduleDate },
            smallIcon: 'ic_stat_prayer',
            sound: 'default'
          });
        }
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule });
    }
  } catch (err) {
    console.warn('scheduleFastingReminders handled error:', err);
  }
};

import { registerPlugin } from '@capacitor/core';

const WidgetPlugin = registerPlugin<any>('WidgetPlugin');

export const updatePersistentPrayerNotification = async (prayerLabel?: string, timeStr?: string) => {
  if (!Capacitor.isNativePlatform()) return;
  
  await requestNotificationPermissions();

  try {
    // 1. Trigger native Android persistent chronometer notification
    await WidgetPlugin.updatePrayerNotification().catch(() => {});
  } catch (error) {
    console.warn('Native prayer notification error:', error);
  }
};
