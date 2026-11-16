export type FeedbackEventType =
  | 'quizPass'
  | 'quizTryAgain'
  | 'badgeUnlock'
  | 'examPass'
  | 'stepCorrect'
  | 'stepWrong'
  | 'preview';

export interface FeedbackPreferences {
  soundEffectsEnabled: boolean;
  hapticFeedbackEnabled: boolean;
}

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }

  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume().catch(() => {
      // Ignore autoplay restriction errors
    });
  }

  return sharedAudioCtx;
}

function scheduleTone(
  ctx: AudioContext,
  destination: AudioNode,
  opts: {
    freq: number;
    startOffset: number;
    duration: number;
    type?: OscillatorType;
    peakGain?: number;
    slideToFreq?: number;
  }
): void {
  const startTime = ctx.currentTime + opts.startOffset;
  const endTime = startTime + opts.duration;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = opts.type ?? 'triangle';
  osc.frequency.setValueAtTime(opts.freq, startTime);
  if (opts.slideToFreq && opts.slideToFreq > 0) {
    osc.frequency.exponentialRampToValueAtTime(opts.slideToFreq, endTime);
  }

  const peak = opts.peakGain ?? 0.14;
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(peak, startTime + Math.min(0.015, opts.duration * 0.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(startTime);
  osc.stop(endTime + 0.02);
}

function triggerAudioCue(type: FeedbackEventType): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.75, ctx.currentTime);
  master.connect(ctx.destination);

  switch (type) {
    case 'quizPass': {
      // Bright ascending major arpeggio: C5 -> E5 -> G5 -> C6
      scheduleTone(ctx, master, { freq: 523.25, startOffset: 0, duration: 0.14, type: 'triangle', peakGain: 0.14 });
      scheduleTone(ctx, master, { freq: 659.25, startOffset: 0.08, duration: 0.14, type: 'triangle', peakGain: 0.14 });
      scheduleTone(ctx, master, { freq: 783.99, startOffset: 0.16, duration: 0.16, type: 'triangle', peakGain: 0.15 });
      scheduleTone(ctx, master, { freq: 1046.5, startOffset: 0.24, duration: 0.38, type: 'sine', peakGain: 0.18 });
      break;
    }

    case 'badgeUnlock': {
      // Distinct radio harmonic fanfare: G5 -> B5 -> D6 -> shimmering G6 chord + crisp Morse-like ping
      scheduleTone(ctx, master, { freq: 783.99, startOffset: 0, duration: 0.12, type: 'triangle', peakGain: 0.13 });
      scheduleTone(ctx, master, { freq: 987.77, startOffset: 0.075, duration: 0.12, type: 'triangle', peakGain: 0.14 });
      scheduleTone(ctx, master, { freq: 1174.66, startOffset: 0.15, duration: 0.15, type: 'triangle', peakGain: 0.15 });
      // Sustained reward chord (G5 + B5 + G6)
      scheduleTone(ctx, master, { freq: 783.99, startOffset: 0.24, duration: 0.48, type: 'sine', peakGain: 0.1 });
      scheduleTone(ctx, master, { freq: 1174.66, startOffset: 0.24, duration: 0.48, type: 'sine', peakGain: 0.1 });
      scheduleTone(ctx, master, { freq: 1567.98, startOffset: 0.24, duration: 0.52, type: 'sine', peakGain: 0.16 });
      // Crisp celebratory sparkle overtone
      scheduleTone(ctx, master, { freq: 2093.0, startOffset: 0.36, duration: 0.26, type: 'sine', peakGain: 0.07 });
      break;
    }

    case 'examPass': {
      // Full 30-question exam completion chord sequence: D5 -> F#5 -> A5 -> D6
      scheduleTone(ctx, master, { freq: 587.33, startOffset: 0, duration: 0.13, type: 'triangle', peakGain: 0.14 });
      scheduleTone(ctx, master, { freq: 739.99, startOffset: 0.09, duration: 0.13, type: 'triangle', peakGain: 0.14 });
      scheduleTone(ctx, master, { freq: 880.0, startOffset: 0.18, duration: 0.15, type: 'triangle', peakGain: 0.15 });
      scheduleTone(ctx, master, { freq: 1174.66, startOffset: 0.27, duration: 0.48, type: 'sine', peakGain: 0.18 });
      scheduleTone(ctx, master, { freq: 1760.0, startOffset: 0.32, duration: 0.4, type: 'sine', peakGain: 0.08 });
      break;
    }

    case 'quizTryAgain': {
      // Gentle neutral two-step cadence (not harsh)
      scheduleTone(ctx, master, { freq: 392.0, startOffset: 0, duration: 0.16, type: 'sine', peakGain: 0.12 });
      scheduleTone(ctx, master, { freq: 329.63, startOffset: 0.14, duration: 0.26, type: 'sine', peakGain: 0.11 });
      break;
    }

    case 'stepCorrect': {
      // Subtle crisp confirmation tap
      scheduleTone(ctx, master, { freq: 659.25, startOffset: 0, duration: 0.09, type: 'sine', peakGain: 0.1 });
      scheduleTone(ctx, master, { freq: 987.77, startOffset: 0.06, duration: 0.15, type: 'sine', peakGain: 0.11 });
      break;
    }

    case 'stepWrong': {
      // Muted low soft thud
      scheduleTone(ctx, master, {
        freq: 260,
        slideToFreq: 196,
        startOffset: 0,
        duration: 0.16,
        type: 'sine',
        peakGain: 0.1,
      });
      break;
    }

    case 'preview': {
      // Short confirmation chime for settings test button
      scheduleTone(ctx, master, { freq: 587.33, startOffset: 0, duration: 0.11, type: 'triangle', peakGain: 0.13 });
      scheduleTone(ctx, master, { freq: 880.0, startOffset: 0.08, duration: 0.22, type: 'sine', peakGain: 0.15 });
      break;
    }
  }
}

const HAPTIC_PATTERNS: Record<FeedbackEventType, number | number[]> = {
  quizPass: [22, 32, 48],
  badgeUnlock: [28, 36, 36, 36, 85],
  examPass: [28, 32, 32, 32, 75],
  quizTryAgain: [24, 40, 24],
  stepCorrect: 14,
  stepWrong: [18, 28, 16],
  preview: [20, 30, 45],
};

function triggerHapticCue(type: FeedbackEventType): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[type]);
  } catch {
    // Ignore vibration errors in restricted browsers/frames
  }
}

export function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function triggerGamificationFeedback(
  type: FeedbackEventType,
  prefs: FeedbackPreferences
): void {
  if (prefs.soundEffectsEnabled) {
    triggerAudioCue(type);
  }
  if (prefs.hapticFeedbackEnabled) {
    triggerHapticCue(type);
  }
}
