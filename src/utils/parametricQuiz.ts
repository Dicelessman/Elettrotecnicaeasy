import type { LessonId, QuizQuestion } from '../types/radiolab';

export interface ParametricQuestionItem {
  id: string;
  lessonId: LessonId;
  question: QuizQuestion;
}

function formatIt(num: number, decimals = 2): string {
  const rounded = Number(num.toFixed(decimals));
  return String(rounded).replace('.', ',');
}

function buildOptions(correctLabel: string, distractors: string[]): { options: string[]; correctIndex: number } {
  const uniqueDistractors = Array.from(new Set(distractors.filter((d) => d !== correctLabel))).slice(0, 3);
  const all = [correctLabel, ...uniqueDistractors];
  // Fisher-Yates shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return {
    options: all,
    correctIndex: all.indexOf(correctLabel),
  };
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type GeneratorFn = (uid: string) => ParametricQuestionItem;

const GENERATORS: GeneratorFn[] = [
  // 1. Legge di Ohm (V = R * I -> calcola I o V)
  (uid) => {
    const voltages = [12, 24, 9, 13.8, 18, 36] as const;
    const resistors = [4, 6, 8, 10, 12, 50] as const;
    const v = pick(voltages);
    const r = pick(resistors);
    const current = v / r;
    const correct = `${formatIt(current, 2)} A`;
    const { options, correctIndex } = buildOptions(correct, [
      `${formatIt(v * r, 1)} A`,
      `${formatIt(r / v, 2)} A`,
      `${formatIt(current * 2, 2)} A`,
    ]);
    return {
      id: uid,
      lessonId: 'lesson-02',
      question: {
        id: uid,
        question: `[Calcolo dinamico] Ai capi di un resistore da ${r} Ω è applicata una tensione continua di ${formatIt(v, 1)} V. Quanta corrente I scorre nel circuito?`,
        options,
        correctIndex,
        explanation: `Per la Legge di Ohm: I = V / R = ${formatIt(v, 1)} / ${r} = ${correct}.`,
      },
    };
  },

  // 2. Potenza elettrica P = V * I
  (uid) => {
    const v = pick([12, 13.8, 24, 48] as const);
    const i = pick([1.5, 2, 2.5, 3, 4, 5] as const);
    const watts = v * i;
    const correct = `${formatIt(watts, 1)} W`;
    const { options, correctIndex } = buildOptions(correct, [
      `${formatIt(v / i, 1)} W`,
      `${formatIt(watts / 2, 1)} W`,
      `${formatIt(v + i, 1)} W`,
    ]);
    return {
      id: uid,
      lessonId: 'lesson-02',
      question: {
        id: uid,
        question: `[Calcolo dinamico] Un ricetrasmettitore alimentato a ${formatIt(v, 1)} V assorbe ${formatIt(i, 1)} A in trasmissione. Qual è la potenza elettrica assorbita?`,
        options,
        correctIndex,
        explanation: `La potenza DC è P = V × I = ${formatIt(v, 1)} × ${formatIt(i, 1)} = ${correct}.`,
      },
    };
  },

  // 3. Lunghezza d'onda lambda = 300 / f(MHz)
  (uid) => {
    const bands = [
      { f: 7.1, band: '40 m' },
      { f: 14.2, band: '20 m' },
      { f: 21.2, band: '15 m' },
      { f: 28.5, band: '10 m' },
      { f: 50.2, band: '6 m' },
      { f: 145, band: '2 m' },
    ] as const;
    const chosen = pick(bands);
    const lambda = 300 / chosen.f;
    const correct = `${formatIt(lambda, 2)} m`;
    const { options, correctIndex } = buildOptions(correct, [
      `${formatIt(lambda * 2, 2)} m`,
      `${formatIt(lambda / 2, 2)} m`,
      `${formatIt(chosen.f / 3, 2)} m`,
    ]);
    return {
      id: uid,
      lessonId: 'lesson-03',
      question: {
        id: uid,
        question: `[Calcolo dinamico] Quanto misura la lunghezza d’onda λ di un segnale radio sulla frequenza di ${formatIt(chosen.f, 1)} MHz (banda ${chosen.band})?`,
        options,
        correctIndex,
        explanation: `Usando λ(m) = 300 / f(MHz): 300 / ${formatIt(chosen.f, 1)} ≈ ${correct}.`,
      },
    };
  },

  // 4. Tensione efficace e di picco Veff = Vp / 1.414
  (uid) => {
    const vPeak = pick([10, 20, 40, 100, 141, 200] as const);
    const vEff = vPeak * 0.7071;
    const correct = `Circa ${formatIt(vEff, 1)} V`;
    const { options, correctIndex } = buildOptions(correct, [
      `Circa ${formatIt(vPeak * 1.414, 1)} V`,
      `Circa ${formatIt(vPeak / 2, 1)} V`,
      `Circa ${formatIt(vPeak * 2, 1)} V`,
    ]);
    return {
      id: uid,
      lessonId: 'lesson-03',
      question: {
        id: uid,
        question: `[Calcolo dinamico] Un’onda sinusoidale raggiunge una tensione di picco Vp = ${vPeak} V. Qual è il suo valore efficace (Veff)?`,
        options,
        correctIndex,
        explanation: `Per una sinusoide pura Veff = Vp / √2 ≈ ${vPeak} × 0,707 ≈ ${formatIt(vEff, 1)} V.`,
      },
    };
  },

  // 5. Dipolo mezz'onda: lunghezza singolo braccio L = 72 / f(MHz)
  (uid) => {
    const freq = pick([7.1, 10.1, 14.1, 21.2, 28.4, 50.1] as const);
    const arm = 72 / freq;
    const correct = `${formatIt(arm, 2)} m`;
    const { options, correctIndex } = buildOptions(correct, [
      `${formatIt(arm * 2, 2)} m`,
      `${formatIt(arm / 2, 2)} m`,
      `${formatIt(300 / freq, 2)} m`,
    ]);
    return {
      id: uid,
      lessonId: 'lesson-11',
      question: {
        id: uid,
        question: `[Calcolo dinamico] Vuoi tagliare un dipolo λ/2 risonante a ${formatIt(freq, 1)} MHz. Quanto sarà lungo CIASCUN braccio (circa λ/4 con fattore 0,96)?`,
        options,
        correctIndex,
        explanation: `Con la formula pratica L_braccio(m) = 72 / f(MHz): 72 / ${formatIt(freq, 1)} ≈ ${correct}.`,
      },
    };
  },

  // 6. Scala Decibel in potenza (+3 dB = x2, +6 dB = x4, +10 dB = x10, +13 dB = x20)
  (uid) => {
    const startW = pick([2, 5, 10, 25] as const);
    const steps = [
      { db: '+3 dB', mult: 2 },
      { db: '+6 dB', mult: 4 },
      { db: '+10 dB', mult: 10 },
      { db: '−3 dB', mult: 0.5 },
    ] as const;
    const step = pick(steps);
    const outW = startW * step.mult;
    const correct = `${formatIt(outW, 1)} W`;
    const { options, correctIndex } = buildOptions(correct, [
      `${formatIt(startW * 3, 1)} W`,
      `${formatIt(startW + step.mult * 2, 1)} W`,
      `${formatIt(step.mult >= 1 ? startW / 2 : startW * 2, 1)} W`,
    ]);
    return {
      id: uid,
      lessonId: 'lesson-08',
      question: {
        id: uid,
        question: `[Calcolo dinamico] Un amplificatore o sistema d’antenna introduce una variazione netta di ${step.db} su un segnale iniziale da ${startW} W. Quanta potenza ottieni?`,
        options,
        correctIndex,
        explanation: `Ricorda: +3 dB raddoppia (×2), +6 dB quadruplica (×4), +10 dB moltiplica per 10, −3 dB dimezza (÷2). Quindi ${startW} × ${formatIt(step.mult, 1)} = ${correct}.`,
      },
    };
  },

  // 7. Conversione prefissi MHz <-> kHz / pF <-> nF
  (uid) => {
    const mode = pick(['freq', 'cap'] as const);
    if (mode === 'freq') {
      const mhz = pick([3.65, 7.074, 14.074, 27.185, 145.5] as const);
      const khz = Math.round(mhz * 1000);
      const correct = `${khz.toLocaleString('it-IT')} kHz`;
      const { options, correctIndex } = buildOptions(correct, [
        `${Math.round(mhz * 100).toLocaleString('it-IT')} kHz`,
        `${Math.round(mhz * 10000).toLocaleString('it-IT')} kHz`,
        `${formatIt(mhz / 1000, 4)} kHz`,
      ]);
      return {
        id: uid,
        lessonId: 'lesson-01',
        question: {
          id: uid,
          question: `[Calcolo dinamico] A quanti kilohertz (kHz) corrisponde esattamente la frequenza di ${formatIt(mhz, 3)} MHz?`,
          options,
          correctIndex,
          explanation: `1 MHz = 1.000 kHz: basta moltiplicare per 1.000 spostando la virgola di 3 cifre a destra → ${correct}.`,
        },
      };
    }
    const nf = pick([2.2, 4.7, 10, 22, 47] as const);
    const pf = Math.round(nf * 1000);
    const correct = `${pf.toLocaleString('it-IT')} pF`;
    const { options, correctIndex } = buildOptions(correct, [
      `${Math.round(nf * 100).toLocaleString('it-IT')} pF`,
      `${Math.round(nf * 10).toLocaleString('it-IT')} pF`,
      `${formatIt(nf / 1000, 4)} pF`,
    ]);
    return {
      id: uid,
      lessonId: 'lesson-04',
      question: {
        id: uid,
        question: `[Calcolo dinamico] Sul corpo di un condensatore da ${formatIt(nf, 1)} nF quanti picofarad (pF) sono equivalenti?`,
        options,
        correctIndex,
        explanation: `1 nanofarad (nF) vale 1.000 picofarad (pF): ${formatIt(nf, 1)} × 1.000 = ${correct}.`,
      },
    };
  },

  // 8. Timing Codice Morse PARIS: T_dit = 1200 / WPM
  (uid) => {
    const wpm = pick([10, 12, 15, 20, 24, 30] as const);
    const ditMs = 1200 / wpm;
    const askDah = Math.random() > 0.45;
    if (askDah) {
      const dahMs = ditMs * 3;
      const correct = `${Math.round(dahMs)} ms`;
      const { options, correctIndex } = buildOptions(correct, [
        `${Math.round(ditMs)} ms`,
        `${Math.round(ditMs * 2)} ms`,
        `${Math.round(ditMs * 7)} ms`,
      ]);
      return {
        id: uid,
        lessonId: 'lesson-13',
        question: {
          id: uid,
          question: `[Calcolo dinamico] Alla velocità di trasmissione di ${wpm} WPM (standard PARIS), quanto dura una LINEA (dah = 3 × dit)?`,
          options,
          correctIndex,
          explanation: `Un punto dura T_dit = 1200 / ${wpm} = ${ditMs} ms. Una linea dura 3 × ${ditMs} = ${correct}.`,
        },
      };
    }
    const correct = `${Math.round(ditMs)} ms`;
    const { options, correctIndex } = buildOptions(correct, [
      `${Math.round(ditMs * 3)} ms`,
      `${Math.round(600 / wpm)} ms`,
      `${Math.round(ditMs * 2)} ms`,
    ]);
    return {
      id: uid,
      lessonId: 'lesson-13',
      question: {
        id: uid,
        question: `[Calcolo dinamico] Secondo la formula PARIS (T_dit = 1200 / WPM), quanto dura un singolo PUNTO (dit) a ${wpm} WPM?`,
        options,
        correctIndex,
        explanation: `T_dit = 1200 / ${wpm} = ${correct}.`,
      },
    };
  },
];

export function generateParametricQuestions(
  count: number,
  allowedLessons?: LessonId[]
): ParametricQuestionItem[] {
  const safeCount = Math.max(0, Math.min(20, count));
  if (safeCount === 0) return [];

  const pool = [...GENERATORS];
  const results: ParametricQuestionItem[] = [];
  let attempt = 0;

  while (results.length < safeCount && attempt < safeCount * 4) {
    const gen = pool[attempt % pool.length];
    const uid = `param-${Date.now()}-${attempt}-${Math.floor(Math.random() * 1000)}`;
    const item = gen(uid);
    if (!allowedLessons || allowedLessons.includes(item.lessonId)) {
      results.push(item);
    }
    attempt++;
  }

  return results;
}
