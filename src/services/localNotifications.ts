import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const setupPrayerChannel = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  try {
    await LocalNotifications.createChannel({ id: 'azan-makkah', name: 'Makkah', importance: 5, visibility: 1 });
    await LocalNotifications.createChannel({ id: 'azan-madinah', name: 'Madinah', importance: 5, visibility: 1 });
    await LocalNotifications.createChannel({ id: 'azan-default', name: 'Default', importance: 5, visibility: 1 });
  } catch (err) {
    console.warn('Failed to setup prayer notification channel:', err);
  }
};

export const scheduleLocalNotification = async (
  title: string,
  body: string,
  triggerTimeInMs: number,
  soundName: string = 'default'
): Promise<void> => {
  const permissions = await LocalNotifications.requestPermissions();

  if (permissions.display !== 'granted') {
    return;
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: Math.floor(Math.random() * 1000000),
        title,
        body,
        schedule: {
          at: new Date(triggerTimeInMs),
          allowWhileIdle: true
        },
        channelId: `azan-${soundName}`,
      },
    ],
  });
};

export const scheduleDailyReminder = async (
  id: number,
  title: string,
  body: string,
  hour: number,
  minute: number
): Promise<void> => {
  const permissions = await LocalNotifications.requestPermissions();
  if (permissions.display !== 'granted') return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
        channelId: 'azan-default'
      }
    ]
  });
};
