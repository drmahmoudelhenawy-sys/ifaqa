import { audioPlayerEngine } from './audioPlayerEngine';
import { radioPlaybackService } from './radioPlaybackService';
import { clanService } from './clanService';
import { QuranAudioStatsService } from './quranAudioStatsService';
import { auth } from '../../services/firebase';

const ACCUMULATOR_KEY = 'ifaqa_clan_audio_seconds_accumulator_v2';
const TOTAL_LISTENED_MINUTES_KEY = 'ifaqa_total_listened_audio_minutes_v1';

class AudioListeningTracker {
  private timer: NodeJS.Timeout | null = null;
  private isRadioPlaying = false;
  private isQuranAudioPlaying = false;
  private accumulatedSeconds = 0;

  constructor() {
    // Load previously accumulated unsubmitted seconds from storage
    try {
      const saved = localStorage.getItem(ACCUMULATOR_KEY);
      this.accumulatedSeconds = saved ? Math.max(0, parseInt(saved, 10) || 0) : 0;
    } catch {
      this.accumulatedSeconds = 0;
    }

    this.init();
  }

  private init() {
    // Listen to Quran Audio Hub player state
    audioPlayerEngine.subscribe((state) => {
      const wasPlaying = this.isQuranAudioPlaying;
      this.isQuranAudioPlaying = Boolean(state.isPlaying);
      if (this.isQuranAudioPlaying !== wasPlaying) {
        this.checkPlaybackState();
      }
    });

    // Listen to Radio player state
    radioPlaybackService.subscribe((state) => {
      const wasPlaying = this.isRadioPlaying;
      this.isRadioPlaying = Boolean(state.isPlaying);
      if (this.isRadioPlaying !== wasPlaying) {
        this.checkPlaybackState();
      }
    });

    // Check on startup if anything is already playing
    this.isQuranAudioPlaying = Boolean(audioPlayerEngine.getState().isPlaying);
    this.isRadioPlaying = Boolean(radioPlaybackService.getState().isPlaying);
    this.checkPlaybackState();

    // Periodic flush check when auth/network becomes active
    window.addEventListener('online', () => this.flushWholeMinutes());
  }

  private checkPlaybackState() {
    const isAnyAudioPlaying = this.isQuranAudioPlaying || this.isRadioPlaying;

    if (isAnyAudioPlaying && !this.timer) {
      this.startTimer();
    } else if (!isAnyAudioPlaying && this.timer) {
      this.stopTimer();
    }
  }

  private startTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick();
    }, 1000);
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.saveAccumulator();
  }

  private tick() {
    const isAnyAudioPlaying = this.isQuranAudioPlaying || this.isRadioPlaying;
    if (!isAnyAudioPlaying) {
      this.stopTimer();
      return;
    }

    this.accumulatedSeconds += 1;

    // If radio is playing (not covered by audioPlayerEngine ticker), record in general stats
    if (this.isRadioPlaying && !this.isQuranAudioPlaying) {
      QuranAudioStatsService.recordGeneralListeningSeconds(1);
    }

    // Persist every 10 seconds to guard against app force-close
    if (this.accumulatedSeconds % 10 === 0) {
      this.saveAccumulator();
    }

    // Every 60 seconds (1 whole minute), flush to clan quest
    if (this.accumulatedSeconds >= 60) {
      this.flushWholeMinutes();
    }
  }

  private saveAccumulator() {
    try {
      localStorage.setItem(ACCUMULATOR_KEY, String(this.accumulatedSeconds));
    } catch {}
  }

  public async flushWholeMinutes() {
    const wholeMinutes = Math.floor(this.accumulatedSeconds / 60);
    if (wholeMinutes <= 0) return;

    const uid = auth.currentUser?.uid;
    if (!uid) {
      // Save for when user logs in or auth is restored
      this.saveAccumulator();
      return;
    }

    try {
      // Deduct immediately before calling async to avoid double submission
      this.accumulatedSeconds -= wholeMinutes * 60;
      this.saveAccumulator();

      // Contribute to Clan quest
      await clanService.autoContributeClanQuest(uid, 'audio_minutes', wholeMinutes);

      // Track lifetime audio minutes locally
      try {
        const prevTotal = parseInt(localStorage.getItem(TOTAL_LISTENED_MINUTES_KEY) || '0', 10);
        localStorage.setItem(TOTAL_LISTENED_MINUTES_KEY, String(prevTotal + wholeMinutes));
      } catch {}

      // Dispatch global event so UI updates immediately
      window.dispatchEvent(new CustomEvent('ifaqa_audio_minutes_contributed', {
        detail: { minutesContributed: wholeMinutes, remainingSeconds: this.accumulatedSeconds }
      }));
    } catch (error) {
      console.warn('Error contributing audio minutes to clan quest:', error);
      // Restore the unsubmitted seconds on error so they aren't lost
      this.accumulatedSeconds += wholeMinutes * 60;
      this.saveAccumulator();
    }
  }

  public getAccumulatedSeconds(): number {
    return this.accumulatedSeconds;
  }
}

export const audioListeningTracker = new AudioListeningTracker();
