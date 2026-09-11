let audioContext: AudioContext | null = null;
let lastFeedbackAt = 0;

function isUiSoundEnabled() {
  return localStorage.getItem('ifaqa_ui_sound_enabled') !== 'false';
}

export function playUiFeedback(kind: 'tap' | 'navigate' | 'success' = 'tap') {
  if (!isUiSoundEnabled() || typeof window === 'undefined') return;
  const now = performance.now();
  if (now - lastFeedbackAt < 55) return;
  lastFeedbackAt = now;

  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const duration = kind === 'success' ? 0.09 : 0.045;
    const frequency = kind === 'success' ? 720 : kind === 'navigate' ? 510 : 420;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.08, audioContext.currentTime + duration);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.025, audioContext.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Audio feedback is decorative; unsupported devices continue silently.
  }
}

export function installUiFeedback() {
  const handlePointerUp = (event: PointerEvent) => {
    const target = event.target as Element | null;
    const interactive = target?.closest('button:not(:disabled), [role="button"]:not([aria-disabled="true"]), a[href]');
    if (!interactive || interactive.closest('[data-ui-sound="off"]')) return;
    playUiFeedback(interactive.hasAttribute('data-navigation') ? 'navigate' : 'tap');
  };

  document.addEventListener('pointerup', handlePointerUp, { passive: true });
  return () => document.removeEventListener('pointerup', handlePointerUp);
}
