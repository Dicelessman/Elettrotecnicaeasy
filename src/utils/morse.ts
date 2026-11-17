export interface MorseEntry {
  char: string;
  code: string;
  rhythm: string;
  mnemonic: string;
  kochOrder: number;
}

export interface NatoEntry {
  letter: string;
  word: string;
  pronunciation: string;
}

export interface QCodeEntry {
  code: string;
  questionMeaning: string;
  statementMeaning: string;
  scoutExample: string;
}

export const MORSE_TABLE: MorseEntry[] = [
  { char: 'A', code: '.-', rhythm: 'di-DAH', mnemonic: 'A-mo', kochOrder: 6 },
  { char: 'B', code: '-...', rhythm: 'DAH-di-di-dit', mnemonic: 'Bar-ba-ri-tà', kochOrder: 18 },
  { char: 'C', code: '-.-.', rhythm: 'DAH-di-DAH-dit', mnemonic: 'Co-ca-co-la', kochOrder: 14 },
  { char: 'D', code: '-..', rhythm: 'DAH-di-dit', mnemonic: 'Da-vi-de', kochOrder: 11 },
  { char: 'E', code: '.', rhythm: 'dit', mnemonic: 'È', kochOrder: 7 },
  { char: 'F', code: '..-.', rhythm: 'di-di-DAH-dit', mnemonic: 'Fi-li-bu-sta', kochOrder: 21 },
  { char: 'G', code: '--.', rhythm: 'DAH-DAH-dit', mnemonic: 'Gon-go-la', kochOrder: 16 },
  { char: 'H', code: '....', rhythm: 'di-di-di-dit', mnemonic: 'Ha-ra-ki-ri', kochOrder: 23 },
  { char: 'I', code: '..', rhythm: 'di-dit', mnemonic: 'I-ri', kochOrder: 8 },
  { char: 'J', code: '.---', rhythm: 'di-DAH-DAH-DAH', mnemonic: 'Je-ho-và-va', kochOrder: 25 },
  { char: 'K', code: '-.-', rhythm: 'DAH-di-DAH', mnemonic: 'Ka-ra-tè', kochOrder: 1 },
  { char: 'L', code: '.-..', rhythm: 'di-DAH-di-dit', mnemonic: 'Li-mo-na-ta', kochOrder: 9 },
  { char: 'M', code: '--', rhythm: 'DAH-DAH', mnemonic: 'Ma-mà', kochOrder: 2 },
  { char: 'N', code: '-.', rhythm: 'DAH-dit', mnemonic: 'No-te', kochOrder: 10 },
  { char: 'O', code: '---', rhythm: 'DAH-DAH-DAH', mnemonic: 'O-ro-lò', kochOrder: 12 },
  { char: 'P', code: '.--.', rhythm: 'di-DAH-DAH-dit', mnemonic: 'Pa-pa-gàl-lo', kochOrder: 13 },
  { char: 'Q', code: '--.-', rhythm: 'DAH-DAH-di-DAH', mnemonic: 'Quo-va-di-sì', kochOrder: 24 },
  { char: 'R', code: '.-.', rhythm: 'di-DAH-dit', mnemonic: 'Ra-mà-ro', kochOrder: 3 },
  { char: 'S', code: '...', rhythm: 'di-di-dit', mnemonic: 'Si-ci-lia', kochOrder: 4 },
  { char: 'T', code: '-', rhythm: 'DAH', mnemonic: 'Tè', kochOrder: 15 },
  { char: 'U', code: '..-', rhythm: 'di-di-DAH', mnemonic: 'U-ni-tà', kochOrder: 5 },
  { char: 'V', code: '...-', rhythm: 'di-di-di-DAH', mnemonic: 'Vi-va-l’i-talia', kochOrder: 22 },
  { char: 'W', code: '.--', rhythm: 'di-DAH-DAH', mnemonic: 'Wa-gò-nè', kochOrder: 17 },
  { char: 'X', code: '-..-', rhythm: 'DAH-di-di-DAH', mnemonic: 'Xè-ro-co-pìa', kochOrder: 26 },
  { char: 'Y', code: '-.--', rhythm: 'DAH-di-DAH-DAH', mnemonic: 'Yo-gù-r-tè', kochOrder: 19 },
  { char: 'Z', code: '--..', rhythm: 'DAH-DAH-di-dit', mnemonic: 'Zò-o-lo-go', kochOrder: 20 },
  { char: '0', code: '-----', rhythm: 'DAH-DAH-DAH-DAH-DAH', mnemonic: '5 linee', kochOrder: 36 },
  { char: '1', code: '.----', rhythm: 'di-DAH-DAH-DAH-DAH', mnemonic: '1 punto + 4 linee', kochOrder: 27 },
  { char: '2', code: '..---', rhythm: 'di-di-DAH-DAH-DAH', mnemonic: '2 punti + 3 linee', kochOrder: 28 },
  { char: '3', code: '...--', rhythm: 'di-di-di-DAH-DAH', mnemonic: '3 punti + 2 linee', kochOrder: 29 },
  { char: '4', code: '....-', rhythm: 'di-di-di-di-DAH', mnemonic: '4 punti + 1 linea', kochOrder: 30 },
  { char: '5', code: '.....', rhythm: 'di-di-di-di-dit', mnemonic: '5 punti', kochOrder: 31 },
  { char: '6', code: '-....', rhythm: 'DAH-di-di-di-dit', mnemonic: '1 linea + 4 punti', kochOrder: 32 },
  { char: '7', code: '--...', rhythm: 'DAH-DAH-di-di-dit', mnemonic: '2 linee + 3 punti', kochOrder: 33 },
  { char: '8', code: '---..', rhythm: 'DAH-DAH-DAH-di-dit', mnemonic: '3 linee + 2 punti', kochOrder: 34 },
  { char: '9', code: '----.', rhythm: 'DAH-DAH-DAH-DAH-dit', mnemonic: '4 linee + 1 punto', kochOrder: 35 },
];

export const CHAR_TO_MORSE: Record<string, string> = MORSE_TABLE.reduce(
  (acc, item) => {
    acc[item.char] = item.code;
    return acc;
  },
  { '/': '-..-.', '?': '..--..', '.': '.-.-.-', ',': '--..--' } as Record<string, string>
);

export const MORSE_TO_CHAR: Record<string, string> = Object.entries(CHAR_TO_MORSE).reduce(
  (acc, [ch, code]) => {
    acc[code] = ch;
    return acc;
  },
  {} as Record<string, string>
);

export const KOCH_LETTERS = MORSE_TABLE.filter((m) => /^[A-Z]$/.test(m.char)).sort(
  (a, b) => a.kochOrder - b.kochOrder
);

export const NATO_ALPHABET: NatoEntry[] = [
  { letter: 'A', word: 'Alfa', pronunciation: 'AL-FA' },
  { letter: 'B', word: 'Bravo', pronunciation: 'BRA-VO' },
  { letter: 'C', word: 'Charlie', pronunciation: 'CIAR-LI' },
  { letter: 'D', word: 'Delta', pronunciation: 'DEL-TA' },
  { letter: 'E', word: 'Echo', pronunciation: 'E-CO' },
  { letter: 'F', word: 'Foxtrot', pronunciation: 'FOKS-TROT' },
  { letter: 'G', word: 'Golf', pronunciation: 'GOLF' },
  { letter: 'H', word: 'Hotel', pronunciation: 'O-TEL' },
  { letter: 'I', word: 'India', pronunciation: 'IN-DI-A' },
  { letter: 'J', word: 'Juliett', pronunciation: 'GIU-LIET' },
  { letter: 'K', word: 'Kilo', pronunciation: 'KI-LO' },
  { letter: 'L', word: 'Lima', pronunciation: 'LI-MA' },
  { letter: 'M', word: 'Mike', pronunciation: 'MAIK' },
  { letter: 'N', word: 'November', pronunciation: 'NO-VEM-BER' },
  { letter: 'O', word: 'Oscar', pronunciation: 'OS-CAR' },
  { letter: 'P', word: 'Papa', pronunciation: 'PA-PA' },
  { letter: 'Q', word: 'Quebec', pronunciation: 'KE-BEK' },
  { letter: 'R', word: 'Romeo', pronunciation: 'RO-ME-O' },
  { letter: 'S', word: 'Sierra', pronunciation: 'SI-ER-RA' },
  { letter: 'T', word: 'Tango', pronunciation: 'TAN-GO' },
  { letter: 'U', word: 'Uniform', pronunciation: 'IU-NI-FORM' },
  { letter: 'V', word: 'Victor', pronunciation: 'VIK-TOR' },
  { letter: 'W', word: 'Whiskey', pronunciation: 'UIS-KI' },
  { letter: 'X', word: 'X-ray', pronunciation: 'EKS-REI' },
  { letter: 'Y', word: 'Yankee', pronunciation: 'IAN-KI' },
  { letter: 'Z', word: 'Zulu', pronunciation: 'ZU-LU' },
];

export const Q_CODES: QCodeEntry[] = [
  {
    code: 'QTH',
    questionMeaning: 'Qual è la tua posizione?',
    statementMeaning: 'La mia posizione / località è…',
    scoutExample: '“QTH Campo Base Monte Cimone, passo.”',
  },
  {
    code: 'QSL',
    questionMeaning: 'Mi dai conferma di ricezione?',
    statementMeaning: 'Ricevuto e confermato!',
    scoutExample: '“QSL per l’orario di rientro al campo.”',
  },
  {
    code: 'QRM',
    questionMeaning: 'Hai interferenze da altre stazioni?',
    statementMeaning: 'Ho disturbi causati da altre trasmissioni umane.',
    scoutExample: '“C’è forte QRM su questo canale, cambiamo frequenza.”',
  },
  {
    code: 'QRN',
    questionMeaning: 'Hai disturbi atmosferici / statica?',
    statementMeaning: 'Disturbi naturali (temporali, scariche elettriche).',
    scoutExample: '“Temporale vicino: molto QRN in ricezione.”',
  },
  {
    code: 'QRZ',
    questionMeaning: 'Chi mi chiama?',
    statementMeaning: 'Sei chiamato da…',
    scoutExample: '“QRZ squadra Aquile? Ripetete nominativo.”',
  },
  {
    code: 'QSO',
    questionMeaning: 'Puoi comunicare direttamente con…?',
    statementMeaning: 'Collegamento / conversazione radio attiva.',
    scoutExample: '“Bel QSO pulito tra il rifugio e il campo!”',
  },
  {
    code: 'QRP',
    questionMeaning: 'Devo ridurre la potenza?',
    statementMeaning: 'Trasmetto a bassa potenza (≤ 5 W, tipico portatile).',
    scoutExample: '“Opero in QRP con batteria da zaino per risparmiare Ah.”',
  },
  {
    code: 'QSY',
    questionMeaning: 'Devo cambiare frequenza / canale?',
    statementMeaning: 'Mi sposto sulla frequenza / canale…',
    scoutExample: '“QSY sul canale 4 PMR per lasciare libero il canale di chiamata.”',
  },
  {
    code: 'QRT',
    questionMeaning: 'Devo cessare le trasmissioni?',
    statementMeaning: 'Chiudo la stazione / spengo la radio.',
    scoutExample: '“Batteria quasi scarica, vado QRT alle 21:00. 73!”',
  },
  {
    code: 'QRV',
    questionMeaning: 'Sei pronto a ricevere?',
    statementMeaning: 'Sono pronto all’ascolto!',
    scoutExample: '“Campo Base QRV sul canale 1.”',
  },
];

export function formatMorseCode(text: string): string {
  return text
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      word
        .split('')
        .map((ch) => CHAR_TO_MORSE[ch] ?? '')
        .filter(Boolean)
        .join(' ')
    )
    .join(' / ');
}

export function formatMorseDisplay(code: string): string {
  return code.replace(/\./g, '·').replace(/-/g, '−');
}

/**
 * Computes PARIS standard dot duration in milliseconds:
 * 1 word ("PARIS ") = 50 dot units -> T_dot = 1200 / WPM
 */
export function getDotDurationMs(wpm: number): number {
  const clamped = Math.max(5, Math.min(35, wpm));
  return Math.round(1200 / clamped);
}

export interface MorseTimelineSegment {
  on: boolean;
  durationMs: number;
  symbol?: '.' | '-';
  char?: string;
}

export function buildMorseTimeline(
  text: string,
  opts: { wpm: number; farnsworth?: boolean }
): MorseTimelineSegment[] {
  const charWpm = Math.max(5, Math.min(35, opts.wpm));
  const dotMs = 1200 / charWpm;
  // Farnsworth keeps character elements crisp at >=18 WPM while stretching inter-char/word gaps
  const effectiveGapWpm = opts.farnsworth ? Math.max(5, Math.min(charWpm, Math.round(charWpm * 0.55))) : charWpm;
  const gapUnitMs = 1200 / effectiveGapWpm;

  const words = text.toUpperCase().trim().split(/\s+/).filter(Boolean);
  const segments: MorseTimelineSegment[] = [];

  words.forEach((word, wIdx) => {
    const chars = word.split('').filter((c) => Boolean(CHAR_TO_MORSE[c]));
    chars.forEach((ch, cIdx) => {
      const code = CHAR_TO_MORSE[ch];
      for (let sIdx = 0; sIdx < code.length; sIdx += 1) {
        const sym = code[sIdx] === '-' ? '-' : '.';
        segments.push({
          on: true,
          durationMs: sym === '-' ? dotMs * 3 : dotMs,
          symbol: sym,
          char: ch,
        });
        if (sIdx < code.length - 1) {
          segments.push({ on: false, durationMs: dotMs });
        }
      }
      if (cIdx < chars.length - 1) {
        segments.push({ on: false, durationMs: gapUnitMs * 3 });
      }
    });
    if (wIdx < words.length - 1) {
      segments.push({ on: false, durationMs: gapUnitMs * 7 });
    }
  });

  return segments;
}

let sharedMorseAudioCtx: AudioContext | null = null;
let activePlaybackStop: (() => void) | null = null;

function ensureAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedMorseAudioCtx) {
    try {
      sharedMorseAudioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (sharedMorseAudioCtx.state === 'suspended') {
    void sharedMorseAudioCtx.resume().catch(() => {});
  }
  return sharedMorseAudioCtx;
}

export function stopMorsePlayback(): void {
  if (activePlaybackStop) {
    activePlaybackStop();
    activePlaybackStop = null;
  }
}

export function playMorseAudio(
  text: string,
  opts: {
    wpm?: number;
    farnsworth?: boolean;
    freqHz?: number;
    noiseLevel?: number;
    qrmEnabled?: boolean;
    onStep?: (seg: MorseTimelineSegment | null, index: number) => void;
    onDone?: () => void;
  } = {}
): () => void {
  stopMorsePlayback();
  const ctx = ensureAudioContext();
  const timeline = buildMorseTimeline(text, {
    wpm: opts.wpm ?? 16,
    farnsworth: opts.farnsworth ?? false,
  });

  if (timeline.length === 0) {
    opts.onDone?.();
    return () => {};
  }

  let cancelled = false;
  const timers: number[] = [];
  const freq = Math.max(400, Math.min(1000, opts.freqHz ?? 680));

  let osc: OscillatorNode | null = null;
  let gainNode: GainNode | null = null;
  let noiseSource: AudioBufferSourceNode | null = null;
  let noiseGain: GainNode | null = null;
  let qrmOsc: OscillatorNode | null = null;
  let qrmGain: GainNode | null = null;

  if (ctx) {
    osc = ctx.createOscillator();
    gainNode = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    let cursorSec = ctx.currentTime + 0.03;
    const ramp = 0.004; // 4 ms clickless envelope
    for (const seg of timeline) {
      const durSec = seg.durationMs / 1000;
      if (seg.on) {
        gainNode.gain.setValueAtTime(0.0001, cursorSec);
        gainNode.gain.linearRampToValueAtTime(0.18, cursorSec + ramp);
        gainNode.gain.setValueAtTime(0.18, Math.max(cursorSec + ramp, cursorSec + durSec - ramp));
        gainNode.gain.linearRampToValueAtTime(0.0001, cursorSec + durSec);
      }
      cursorSec += durSec;
    }

    const totalDurSec = Math.max(0.2, cursorSec - ctx.currentTime + 0.05);

    // Optional PRO QRN atmospheric band-pass noise
    const noiseLvl = Math.max(0, Math.min(0.45, opts.noiseLevel ?? 0));
    if (noiseLvl > 0.005) {
      const bufferLen = Math.max(1024, Math.floor(ctx.sampleRate * Math.min(2, totalDurSec)));
      const buffer = ctx.createBuffer(1, bufferLen, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferLen; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, ctx.currentTime);
      filter.Q.setValueAtTime(2.2, ctx.currentTime);

      noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(noiseLvl * 0.18, ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start(ctx.currentTime + 0.01);
      noiseSource.stop(cursorSec + 0.04);
    }

    // Optional PRO QRM weak adjacent-frequency CW interference
    if (opts.qrmEnabled) {
      qrmOsc = ctx.createOscillator();
      qrmGain = ctx.createGain();
      qrmOsc.type = 'sine';
      qrmOsc.frequency.setValueAtTime(freq + 145, ctx.currentTime);
      qrmGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      qrmOsc.connect(qrmGain);
      qrmGain.connect(ctx.destination);

      let qrmCursor = ctx.currentTime + 0.08;
      let toggle = 0;
      while (qrmCursor < cursorSec - 0.1) {
        const pulse = toggle % 3 === 0 ? 0.14 : 0.055;
        qrmGain.gain.setValueAtTime(0.0001, qrmCursor);
        qrmGain.gain.linearRampToValueAtTime(0.045, qrmCursor + 0.006);
        qrmGain.gain.setValueAtTime(0.045, qrmCursor + pulse);
        qrmGain.gain.linearRampToValueAtTime(0.0001, qrmCursor + pulse + 0.006);
        qrmCursor += pulse + (toggle % 4 === 3 ? 0.16 : 0.06);
        toggle += 1;
      }
      qrmOsc.start(ctx.currentTime + 0.02);
      qrmOsc.stop(cursorSec + 0.04);
    }

    osc.start(ctx.currentTime + 0.02);
    osc.stop(cursorSec + 0.03);
  }

  // Visual step callbacks synced to timeline
  let elapsedMs = 30;
  timeline.forEach((seg, idx) => {
    const t = window.setTimeout(() => {
      if (!cancelled) {
        opts.onStep?.(seg, idx);
      }
    }, elapsedMs);
    timers.push(t);
    elapsedMs += seg.durationMs;
  });

  const endTimer = window.setTimeout(() => {
    if (!cancelled) {
      opts.onStep?.(null, -1);
      opts.onDone?.();
      activePlaybackStop = null;
    }
  }, elapsedMs + 20);
  timers.push(endTimer);

  const stop = () => {
    cancelled = true;
    for (const t of timers) {
      window.clearTimeout(t);
    }
    if (ctx) {
      try {
        if (osc && gainNode) {
          gainNode.gain.cancelScheduledValues(ctx.currentTime);
          gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
          osc.stop(ctx.currentTime + 0.01);
        }
        if (noiseSource && noiseGain) {
          noiseGain.gain.cancelScheduledValues(ctx.currentTime);
          noiseGain.gain.setValueAtTime(0.0001, ctx.currentTime);
          noiseSource.stop(ctx.currentTime + 0.01);
        }
        if (qrmOsc && qrmGain) {
          qrmGain.gain.cancelScheduledValues(ctx.currentTime);
          qrmGain.gain.setValueAtTime(0.0001, ctx.currentTime);
          qrmOsc.stop(ctx.currentTime + 0.01);
        }
      } catch {
        // Ignore already stopped
      }
    }
    opts.onStep?.(null, -1);
  };

  activePlaybackStop = stop;
  return stop;
}

export function startKeyerTone(freqHz = 680): () => void {
  const ctx = ensureAudioContext();
  if (!ctx) return () => {};
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freqHz, ctx.currentTime);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.005);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();

  return () => {
    try {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.008);
      osc.stop(ctx.currentTime + 0.015);
    } catch {
      // Ignore
    }
  };
}
