import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { AladhanTimings, parsePrayerTimeForToday } from './prayerTimes';

export type AthkarReminderType = 'morning' | 'evening';

export const ATHKAR_REMINDER_CHANNEL_ID = 'ifaqa_athkar_reminders';
export const MORNING_REMINDER_ID = 8801;
export const EVENING_REMINDER_ID = 8802;
export const SNOOZE_REMINDER_ID = 8803;

export interface SnoozeState {
  type: AthkarReminderType;
  until: number;
}

export const SNOOZE_DURATIONS = [
  { minutes: 5, label: '٥ دقائق', sub: 'سريع' },
  { minutes: 10, label: '١٠ دقائق', sub: 'قريب' },
  { minutes: 15, label: 'ربع ساعة (١٥ د)', sub: 'مناسب' },
  { minutes: 30, label: 'نصف ساعة (٣٠ د)', sub: 'سحور أو راحة' },
  { minutes: 60, label: 'ساعة كاملة', sub: 'مهلة كافية' },
] as const;

/**
 * Setup high-importance lock screen channel for Athkar reminders
 */
export async function setupAthkarReminderChannel(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await LocalNotifications.createChannel({
      id: ATHKAR_REMINDER_CHANNEL_ID,
      name: 'تذكير أذكار الصباح والمساء',
      description: 'تنبيهات شاشة القفل لأذكار الصباح بعد الفجر وأذكار المساء بعد العصر',
      importance: 5, // High importance (heads-up / lock screen)
      visibility: 1, // Public on lockscreen
      vibration: true,
      sound: 'default',
    });
  } catch (err) {
    console.warn('setupAthkarReminderChannel error:', err);
  }
}

/**
 * Get the storage key for whether athkar was completed today
 */
export function getAthkarTodayKey(type: AthkarReminderType): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
  return `ifaqa_athkar_${type}_done_${dateStr}`;
}

/**
 * Check if athkar was marked as done today
 */
export function isAthkarDoneToday(type: AthkarReminderType): boolean {
  try {
    return localStorage.getItem(getAthkarTodayKey(type)) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark athkar as read/done today
 */
export function markAthkarDoneToday(type: AthkarReminderType): void {
  try {
    localStorage.setItem(getAthkarTodayKey(type), 'true');
    // Clear snooze
    localStorage.removeItem('ifaqa_athkar_snooze');
    // Cancel any active snooze notification
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.cancel({ notifications: [{ id: SNOOZE_REMINDER_ID }] }).catch(() => {});
    }
  } catch (e) {
    console.warn('markAthkarDoneToday error:', e);
  }
}

/**
 * Get active snooze state if still valid
 */
export function getActiveSnooze(): SnoozeState | null {
  try {
    const raw = localStorage.getItem('ifaqa_athkar_snooze');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SnoozeState;
    if (parsed.until > Date.now()) {
      return parsed;
    }
    // Expired
    localStorage.removeItem('ifaqa_athkar_snooze');
    return null;
  } catch {
    return null;
  }
}

/**
 * Snooze Athkar reminder by specified minutes
 */
export async function snoozeAthkarReminder(type: AthkarReminderType, minutes: number): Promise<number> {
  const triggerTimeMs = Date.now() + minutes * 60 * 1000;
  
  const snoozeState: SnoozeState = {
    type,
    until: triggerTimeMs,
  };

  try {
    localStorage.setItem('ifaqa_athkar_snooze', JSON.stringify(snoozeState));
  } catch {}

  // Schedule native lock screen notification
  if (Capacitor.isNativePlatform()) {
    try {
      const { display } = await LocalNotifications.requestPermissions();
      if (display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: SNOOZE_REMINDER_ID,
              title: type === 'morning' ? '☀️ تذكير أذكار الصباح' : '🌙 تذكير أذكار المساء',
              body: type === 'morning' 
                ? 'حان موعد تذكيرك المؤجل بأذكار الصباح المباركة · حصن يومك ونورك' 
                : 'حان موعد تذكيرك المؤجل بأذكار المساء المباركة · حفظ وأمان ليلتك',
              schedule: {
                at: new Date(triggerTimeMs),
                allowWhileIdle: true,
              },
              channelId: ATHKAR_REMINDER_CHANNEL_ID,
              extra: {
                action: 'athkar_reminder',
                type,
              },
            },
          ],
        });
      }
    } catch (e) {
      console.warn('Failed to schedule snooze notification:', e);
    }
  }

  return triggerTimeMs;
}

/**
 * Schedule daily Morning (after Fajr) & Evening (after Asr) reminders
 */
export async function scheduleAthkarDailyReminders(timings: AladhanTimings): Promise<void> {
  await setupAthkarReminderChannel();

  if (!Capacitor.isNativePlatform()) return;

  try {
    const { display } = await LocalNotifications.requestPermissions();
    if (display !== 'granted') return;

    const notificationsToSchedule: any[] = [];
    const now = Date.now();

    // 1. Morning Athkar: Fajr + 20 minutes
    if (timings.Fajr) {
      const fajrMs = parsePrayerTimeForToday(timings.Fajr);
      if (fajrMs) {
        let morningTrigger = fajrMs + 20 * 60 * 1000; // 20 mins after Fajr
        // If already passed today, schedule for tomorrow
        if (morningTrigger < now) {
          morningTrigger += 24 * 60 * 60 * 1000;
        }

        notificationsToSchedule.push({
          id: MORNING_REMINDER_ID,
          title: '☀️ حان وقت أذكار الصباح المباركة',
          body: '«أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ» · حصنك اليومي الحصين، اضغط للقراءة أو التأجيل.',
          schedule: {
            at: new Date(morningTrigger),
            allowWhileIdle: true,
          },
          channelId: ATHKAR_REMINDER_CHANNEL_ID,
          extra: {
            action: 'athkar_reminder',
            type: 'morning',
          },
        });
      }
    }

    // 2. Evening Athkar: Asr + 15 minutes
    if (timings.Asr) {
      const asrMs = parsePrayerTimeForToday(timings.Asr);
      if (asrMs) {
        let eveningTrigger = asrMs + 15 * 60 * 1000; // 15 mins after Asr
        if (eveningTrigger < now) {
          eveningTrigger += 24 * 60 * 60 * 1000;
        }

        notificationsToSchedule.push({
          id: EVENING_REMINDER_ID,
          title: '🌙 حان وقت أذكار المساء المباركة',
          body: '«أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ» · حفظ وسكينة لمسائك، اضغط للقراءة أو التأجيل.',
          schedule: {
            at: new Date(eveningTrigger),
            allowWhileIdle: true,
          },
          channelId: ATHKAR_REMINDER_CHANNEL_ID,
          extra: {
            action: 'athkar_reminder',
            type: 'evening',
          },
        });
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule });
    }
  } catch (err) {
    console.warn('scheduleAthkarDailyReminders error:', err);
  }
}

/**
 * Check if the full screen reminder should pop up right now inside the app
 */
export function checkAthkarReminderEligibility(timings?: AladhanTimings | null): {
  shouldShow: boolean;
  type: AthkarReminderType;
} | null {
  const now = Date.now();

  // 1. Check if snooze is active
  const activeSnooze = getActiveSnooze();
  if (activeSnooze) {
    // Snooze is still counting down, don't interrupt
    return null;
  }

  // 2. Check last shown time in this session to prevent spamming
  const lastDismissedRaw = sessionStorage.getItem('ifaqa_athkar_reminder_dismissed_at');
  if (lastDismissedRaw) {
    const diff = now - Number(lastDismissedRaw);
    if (diff < 30 * 60 * 1000) { // Don't re-show within 30 minutes unless snoozed
      return null;
    }
  }

  if (!timings) return null;

  // Check Morning: between Fajr and Dhuhr
  const fajrMs = timings.Fajr ? parsePrayerTimeForToday(timings.Fajr) : null;
  const dhuhrMs = timings.Dhuhr ? parsePrayerTimeForToday(timings.Dhuhr) : null;

  if (fajrMs && dhuhrMs && now >= (fajrMs + 10 * 60 * 1000) && now < dhuhrMs) {
    if (!isAthkarDoneToday('morning')) {
      return { shouldShow: true, type: 'morning' };
    }
  }

  // Check Evening: between Asr and Isha
  const asrMs = timings.Asr ? parsePrayerTimeForToday(timings.Asr) : null;
  const ishaMs = timings.Isha ? parsePrayerTimeForToday(timings.Isha) : null;

  if (asrMs && ishaMs && now >= (asrMs + 10 * 60 * 1000) && now < ishaMs) {
    if (!isAthkarDoneToday('evening')) {
      return { shouldShow: true, type: 'evening' };
    }
  }

  return null;
}

/**
 * Record session dismissal so it doesn't pop up immediately on next click
 */
export function markAthkarReminderDismissed(): void {
  try {
    sessionStorage.setItem('ifaqa_athkar_reminder_dismissed_at', Date.now().toString());
  } catch {}
}
