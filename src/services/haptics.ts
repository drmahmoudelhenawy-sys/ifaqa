import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export type HapticKind = 'tap' | 'selection' | 'counter' | 'pageTurn' | 'success' | 'warning' | 'completion';

let lastHapticAt = 0;

export function isHapticsEnabled() {
  return typeof window !== 'undefined' && localStorage.getItem('ifaqa_haptics_enabled') !== 'false';
}

function webPattern(kind: HapticKind): number | number[] {
  switch (kind) {
    case 'selection': return 10;
    case 'counter': return 18;
    case 'pageTurn': return 14;
    case 'success': return [35, 45, 65];
    case 'warning': return [80, 45, 80];
    case 'completion': return [100, 60, 240];
    default: return 12;
  }
}

export async function haptic(kind: HapticKind = 'tap') {
  if (!isHapticsEnabled()) return;

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const throttleMs = kind === 'counter' ? 28 : kind === 'completion' ? 0 : 42;
  if (kind !== 'completion' && now - lastHapticAt < throttleMs) return;
  lastHapticAt = now;

  try {
    if (Capacitor.isNativePlatform()) {
      if (kind === 'completion') {
        // Strong, extended vibration when finishing full count of a thikr
        await Haptics.vibrate({ duration: 350 });
      } else if (kind === 'success') {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (kind === 'warning') {
        await Haptics.notification({ type: NotificationType.Warning });
      } else if (kind === 'selection' || kind === 'pageTurn') {
        await Haptics.selectionChanged();
      } else {
        await Haptics.impact({ style: kind === 'counter' ? ImpactStyle.Medium : ImpactStyle.Light });
      }
      return;
    }

    if ('vibrate' in navigator) navigator.vibrate(webPattern(kind));
  } catch {
    // Haptics are enhancement-only; unsupported devices continue normally.
  }
}

export const hapticTap = () => void haptic('tap');
export const hapticSelection = () => void haptic('selection');
export const hapticCounter = () => void haptic('counter');
export const hapticPageTurn = () => void haptic('pageTurn');
export const hapticSuccess = () => void haptic('success');
export const hapticWarning = () => void haptic('warning');
export const hapticCompletion = () => void haptic('completion');
