import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Antenna,
  BatteryCharging,
  Calculator,
  CheckCircle2,
  Gauge,
  Headphones,
  Play,
  Radio,
  RefreshCw,
  Square,
  Volume2,
  Waves,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  CHAR_TO_MORSE,
  KOCH_LETTERS,
  MORSE_TABLE,
  MORSE_TO_CHAR,
  NATO_ALPHABET,
  Q_CODES,
  formatMorseCode,
  formatMorseDisplay,
  playMorseAudio,
  startKeyerTone,
  stopMorsePlayback,
} from '../utils/morse';

type UtilitiesTab = 'morse-trainer' | 'nato-q' | 'calculators';
type CalcSubTab = 'antenna' | 'power-db' | 'battery' | 'bands';

const ALL_MORSE_CHARS = MORSE_TABLE.map((m) => m.char);
const KOCH_ORDER = KOCH_LETTERS.map((m) => m.char);
const NATO_BY_LETTER = NATO_ALPHABET.reduce<Record<string, { word: string; pronunciation: string }>>(
  (acc, item) => {
    acc[item.letter] = { word: item.word, pronunciation: item.pronunciation };
    return acc;
  },
  {}
);
const DIGIT_WORDS: Record<string, string> = {
  '0': 'Zero',
  '1': 'Uno',
  '2': 'Due',
  '3': 'Tre',
  '4': 'Quattro',
  '5': 'Cinque',
  '6': 'Sei',
  '7': 'Sette',
  '8': 'Otto',
  '9': 'Nove',
};

const RADIO_BANDS = [
  { band: '80 metri (HF)', freq: '3,500 – 3,800 MHz', usage: 'Collegamenti regionali NVIS notturni, CW / SSB / FT8' },
  { band: '40 metri (HF)', freq: '7,000 – 7,200 MHz', usage: 'Banda scout e traffico nazionale/europeo giorno-notte' },
  { band: '20 metri (HF)', freq: '14,000 – 14,350 MHz', usage: 'Principale banda DX intercontinentale diurna' },
  { band: '15 metri (HF)', freq: '21,000 – 21,450 MHz', usage: 'DX solare diurno a grande portata con antenne compatte' },
  { band: '11 metri (CB)', freq: '26,965 – 27,405 MHz', usage: 'Banda Cittadina 40 canali AM/FM/SSB uso libero' },
  { band: '10 metri (HF)', freq: '28,000 – 29,700 MHz', usage: 'Propagazione sporadica E e aperture solari' },
  { band: '6 metri (VHF bassa)', freq: '50,000 – 52,000 MHz', usage: '"Magic Band" tra HF e VHF' },
  { band: '2 metri (VHF)', freq: '144,000 – 146,000 MHz', usage: 'Ripetitori locali, FM diretta, APRS e satelliti' },
  { band: '70 cm (UHF)', freq: '430,000 – 440,000 MHz', usage: 'Ripetitori urbani, ponti digitali, antenne direttive portatili' },
  { band: 'PMR446', freq: '446,006 – 446,193 MHz', usage: 'Walkie-talkie uso libero 0,5 W senza licenza (16 ch)' },
];

export const UtilitiesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<UtilitiesTab>('morse-trainer');

  // --- TAB 1: MORSE TRAINER ---
  const [cwText, setCwText] = useState('CQ CQ DE IU2SCOUT K');
  const [cwWpm, setCwWpm] = useState(16);
  const [cwFarnsworth, setCwFarnsworth] = useState(10);
  const [cwFreq, setCwFreq] = useState(700);
  const [isPlayingCw, setIsPlayingCw] = useState(false);
  const [lampOn, setLampOn] = useState(false);

  // Morse Ear-Training Quiz
  const [quizUseKoch, setQuizUseKoch] = useState(false);
  const [quizKochCount, setQuizKochCount] = useState(8);
  const [quizTargetChar, setQuizTargetChar] = useState<string>('R');
  const [quizOptions, setQuizOptions] = useState<string[]>(['R', 'K', 'C', 'A']);
  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [quizStats, setQuizStats] = useState({ total: 0, correct: 0, streak: 0 });

  // Live Tactile Keyer
  const [keyerDown, setKeyerDown] = useState(false);
  const [keyerElements, setKeyerElements] = useState('');
  const [keyerDecoded, setKeyerDecoded] = useState('');
  const stopToneRef = useRef<(() => void) | null>(null);
  const pressStartRef = useRef<number>(0);
  const letterTimerRef = useRef<number | null>(null);
  const wordTimerRef = useRef<number | null>(null);
  const currentElementsRef = useRef<string>('');

  const encodedCw = useMemo(() => formatMorseDisplay(formatMorseCode(cwText)), [cwText]);

  const buildNextMorseQuiz = useCallback(
    (useKoch: boolean, kochLevel: number) => {
      const pool = useKoch
        ? KOCH_ORDER.slice(0, Math.max(4, Math.min(KOCH_ORDER.length, kochLevel)))
        : ALL_MORSE_CHARS;
      const target = pool[Math.floor(Math.random() * pool.length)];
      const distractors = pool
        .filter((c) => c !== target)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      const opts = [target, ...distractors].sort(() => Math.random() - 0.5);
      setQuizTargetChar(target);
      setQuizOptions(opts);
      setQuizSelected(null);
      return target;
    },
    []
  );

  useEffect(() => {
    buildNextMorseQuiz(quizUseKoch, quizKochCount);
  }, [buildNextMorseQuiz, quizUseKoch, quizKochCount]);

  useEffect(() => {
    return () => {
      stopMorsePlayback();
      if (stopToneRef.current) stopToneRef.current();
      if (letterTimerRef.current) window.clearTimeout(letterTimerRef.current);
      if (wordTimerRef.current) window.clearTimeout(wordTimerRef.current);
    };
  }, []);

  const handlePlaySentence = () => {
    if (isPlayingCw) {
      stopMorsePlayback();
      setIsPlayingCw(false);
      setLampOn(false);
      return;
    }
    if (!cwText.trim()) return;
    setIsPlayingCw(true);
    playMorseAudio(cwText, {
      wpm: cwWpm,
      farnsworth: cwFarnsworth < cwWpm,
      freqHz: cwFreq,
      onStep: (seg) => setLampOn(Boolean(seg?.on)),
      onDone: () => {
        setIsPlayingCw(false);
        setLampOn(false);
      },
    });
  };

  const handlePlayQuizChar = (ch: string) => {
    setIsPlayingCw(false);
    playMorseAudio(ch, {
      wpm: Math.max(12, cwWpm),
      farnsworth: false,
      freqHz: cwFreq,
      onStep: (seg) => setLampOn(Boolean(seg?.on)),
      onDone: () => setLampOn(false),
    });
  };

  const handleAnswerMorseQuiz = (choice: string) => {
    if (quizSelected !== null) return;
    setQuizSelected(choice);
    const ok = choice === quizTargetChar;
    setQuizStats((prev) => ({
      total: prev.total + 1,
      correct: prev.correct + (ok ? 1 : 0),
      streak: ok ? prev.streak + 1 : 0,
    }));
  };

  const handleKeyDown = useCallback(() => {
    if (keyerDown) return;
    if (letterTimerRef.current) window.clearTimeout(letterTimerRef.current);
    if (wordTimerRef.current) window.clearTimeout(wordTimerRef.current);
    pressStartRef.current = performance.now();
    setKeyerDown(true);
    stopToneRef.current = startKeyerTone(cwFreq);
  }, [keyerDown, cwFreq]);

  const handleKeyUp = useCallback(() => {
    if (!keyerDown) return;
    setKeyerDown(false);
    if (stopToneRef.current) {
      stopToneRef.current();
      stopToneRef.current = null;
    }
    const elapsed = performance.now() - pressStartRef.current;
    const ditMs = 1200 / Math.max(8, cwWpm);
    const symbol = elapsed >= ditMs * 2 ? '-' : '.';
    const nextEl = currentElementsRef.current + symbol;
    currentElementsRef.current = nextEl;
    setKeyerElements(nextEl);

    letterTimerRef.current = window.setTimeout(() => {
      const code = currentElementsRef.current;
      if (code) {
        const ch = MORSE_TO_CHAR[code] ?? '?';
        setKeyerDecoded((prev) => (prev + ch).slice(-48));
        currentElementsRef.current = '';
        setKeyerElements('');
      }
      wordTimerRef.current = window.setTimeout(() => {
        setKeyerDecoded((prev) => (prev && !prev.endsWith(' ') ? `${prev} ` : prev));
      }, ditMs * 5);
    }, Math.max(220, ditMs * 3.4));
  }, [keyerDown, cwWpm]);

  // --- TAB 2: NATO & Q-CODES ---
  const [natoInput, setNatoInput] = useState('IU2SCOUT');
  const [qSearch, setQSearch] = useState('');
  const [natoQuizTarget, setNatoQuizTarget] = useState(() => NATO_ALPHABET[2]);
  const [natoQuizOpts, setNatoQuizOpts] = useState<string[]>([]);
  const [natoQuizChoice, setNatoQuizChoice] = useState<string | null>(null);

  const natoSpelling = useMemo(() => {
    return natoInput
      .toUpperCase()
      .split('')
      .filter((ch) => /[A-Z0-9]/.test(ch))
      .map((ch) => ({
        char: ch,
        word: NATO_BY_LETTER[ch]?.word ?? DIGIT_WORDS[ch] ?? ch,
      }));
  }, [natoInput]);

  const filteredQCodes = useMemo(() => {
    const q = qSearch.trim().toLowerCase();
    if (!q) return Q_CODES;
    return Q_CODES.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.statementMeaning.toLowerCase().includes(q) ||
        item.questionMeaning.toLowerCase().includes(q)
    );
  }, [qSearch]);

  const generateNatoQuiz = useCallback(() => {
    const letters = NATO_ALPHABET.filter((n) => /^[A-Z]$/.test(n.letter));
    const picked = letters[Math.floor(Math.random() * letters.length)];
    const distractors = letters
      .filter((x) => x.letter !== picked.letter)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((x) => x.word);
    setNatoQuizTarget(picked);
    setNatoQuizOpts([picked.word, ...distractors].sort(() => Math.random() - 0.5));
    setNatoQuizChoice(null);
  }, []);

  useEffect(() => {
    generateNatoQuiz();
  }, [generateNatoQuiz]);

  // --- TAB 3: FIELD CALCULATORS ---
  const [calcTab, setCalcTab] = useState<CalcSubTab>('antenna');

  // 3a. Antenna & Wavelength Calculator
  const [antFreqMhz, setAntFreqMhz] = useState(14.2);
  const [velFactor, setVelFactor] = useState(0.95);
  const lambdaM = antFreqMhz > 0 ? 300 / antFreqMhz : 0;
  const halfWaveArmM = antFreqMhz > 0 ? (75 / antFreqMhz) * velFactor : 0;
  const halfWaveTotalM = halfWaveArmM * 2;
  const gpVerticalCm = halfWaveArmM * 100;
  const gpRadialCm = gpVerticalCm * 1.04;

  // 3b. Power / dBm / dB Link Budget
  const [txPowerW, setTxPowerW] = useState(5);
  const [cableLossDb, setCableLossDb] = useState(1.5);
  const [antGainDbi, setAntGainDbi] = useState(3);
  const safeTxW = Math.max(0.001, txPowerW);
  const txDbm = 10 * Math.log10(safeTxW * 1000);
  const netGainDb = antGainDbi - cableLossDb;
  const eirpDbm = txDbm + netGainDb;
  const eirpW = Math.pow(10, (eirpDbm - 30) / 10);

  // 3c. Field Battery Autonomy
  const [battAh, setBattAh] = useState(12);
  const [battChem, setBattChem] = useState<'lifepo4' | 'lead' | 'liion'>('lifepo4');
  const [rxMa, setRxMa] = useState(350);
  const [txAmps, setTxAmps] = useState(2.5);
  const [txDutyPct, setTxDutyPct] = useState(15);
  const usableFraction = battChem === 'lead' ? 0.5 : battChem === 'liion' ? 0.85 : 0.9;
  const usableAh = battAh * usableFraction;
  const avgCurrentA = (txDutyPct / 100) * txAmps + (1 - txDutyPct / 100) * (rxMa / 1000);
  const autonomyHours = avgCurrentA > 0 ? usableAh / avgCurrentA : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4" />
              <span>Cassetta degli Attrezzi da Stazione</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Utilità: Trainer CW/NATO &amp; Calcolatori da Campo
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
              Strumenti operativi pronti per il campo scout, l&apos;officina o il ripasso d&apos;esame: allenatore Morse CW in tempo reale, compitatore NATO / Codici Q e calcolatori RF per antenne, dBm e batterie.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Sezioni Utilità"
            className="inline-flex flex-wrap gap-1 p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0"
          >
            {(
              [
                { id: 'morse-trainer' as const, label: 'Trainer Morse CW', icon: Headphones },
                { id: 'nato-q' as const, label: 'NATO & Codici Q', icon: Volume2 },
                { id: 'calculators' as const, label: 'Calcolatori RF', icon: Calculator },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* TAB 1: MORSE CW TRAINER */}
      {activeTab === 'morse-trainer' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1A: Text to Morse Player + Optical Lamp */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                    Generatore CW Testo → Audio &amp; Luce
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ascolta con spaziatura Farnsworth o allena il riconoscimento ottico con la lampada.
                  </p>
                </div>
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    lampOn
                      ? 'bg-amber-400 border-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.8)]'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                  }`}
                  title="Lampada ottica CW"
                >
                  <Zap className={`w-4 h-4 ${lampOn ? 'text-slate-950' : 'text-slate-400'}`} />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="util-cw-text" className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                  Testo da trasmettere in CW
                </label>
                <input
                  id="util-cw-text"
                  type="text"
                  value={cwText}
                  onChange={(e) => setCwText(e.target.value.toUpperCase().slice(0, 64))}
                  className="w-full px-3 py-2 text-sm font-mono uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
                <div className="flex flex-wrap gap-1.5">
                  {['CQ CQ DE IU2SCOUT K', 'SOS SOS', 'QTH ROMA 73', 'QRP 5W'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCwText(preset)}
                      className="px-2 py-1 text-[11px] font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-400 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 font-mono text-sm tracking-wider text-sky-800 dark:text-sky-300 min-h-[44px] break-all">
                {encodedCw || '—'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className="space-y-1">
                  <span className="flex justify-between font-medium text-slate-600 dark:text-slate-300">
                    <span>Carattere</span>
                    <span className="font-mono font-bold">{cwWpm} WPM</span>
                  </span>
                  <input
                    type="range"
                    min={8}
                    max={30}
                    value={cwWpm}
                    onChange={(e) => setCwWpm(Number(e.target.value))}
                    className="w-full accent-sky-600"
                  />
                </label>

                <label className="space-y-1">
                  <span className="flex justify-between font-medium text-slate-600 dark:text-slate-300">
                    <span>Farnsworth</span>
                    <span className="font-mono font-bold">{Math.min(cwWpm, cwFarnsworth)} WPM</span>
                  </span>
                  <input
                    type="range"
                    min={5}
                    max={cwWpm}
                    value={Math.min(cwWpm, cwFarnsworth)}
                    onChange={(e) => setCwFarnsworth(Number(e.target.value))}
                    className="w-full accent-sky-600"
                  />
                </label>

                <label className="space-y-1">
                  <span className="flex justify-between font-medium text-slate-600 dark:text-slate-300">
                    <span>Tono</span>
                    <span className="font-mono font-bold">{cwFreq} Hz</span>
                  </span>
                  <input
                    type="range"
                    min={450}
                    max={900}
                    step={25}
                    value={cwFreq}
                    onChange={(e) => setCwFreq(Number(e.target.value))}
                    className="w-full accent-sky-600"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handlePlaySentence}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg text-white transition-colors cursor-pointer ${
                  isPlayingCw ? 'bg-red-600 hover:bg-red-700' : 'bg-sky-600 hover:bg-sky-700'
                }`}
              >
                {isPlayingCw ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlayingCw ? 'Ferma Riproduzione' : 'Riproduci Sequenza CW'}</span>
              </button>
            </section>

            {/* 1B: Audio Recognition Quiz (Ear Training) */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                    Allenamento d&apos;Ascolto (Ear Training)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ascolta il carattere CW e riconosci la lettera senza guardare i punti.
                  </p>
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  Prec.: {quizStats.total > 0 ? Math.round((quizStats.correct / quizStats.total) * 100) : 0}% · Serie {quizStats.streak}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizUseKoch}
                    onChange={(e) => setQuizUseKoch(e.target.checked)}
                    className="accent-sky-600"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    Limita ai caratteri Koch ({quizUseKoch ? `primi ${quizKochCount}` : 'tutto A–Z / 0–9'})
                  </span>
                </label>
                {quizUseKoch && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{quizKochCount}</span>
                    <input
                      type="range"
                      min={4}
                      max={20}
                      value={quizKochCount}
                      onChange={(e) => setQuizKochCount(Number(e.target.value))}
                      className="w-24 accent-sky-600"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handlePlayQuizChar(quizTargetChar)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Ascolta Segnale CW</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextChar = buildNextMorseQuiz(quizUseKoch, quizKochCount);
                    handlePlayQuizChar(nextChar);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Nuovo Carattere</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {quizOptions.map((opt) => {
                  const chosen = quizSelected === opt;
                  const isTarget = opt === quizTargetChar;
                  let style =
                    'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 hover:border-indigo-500';
                  if (quizSelected !== null) {
                    if (isTarget) {
                      style =
                        'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200';
                    } else if (chosen) {
                      style = 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200';
                    } else {
                      style = 'border-slate-200 dark:border-slate-800 opacity-60';
                    }
                  }
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={quizSelected !== null}
                      onClick={() => handleAnswerMorseQuiz(opt)}
                      className={`py-4 rounded-xl border text-center font-mono text-xl font-bold transition-colors ${
                        quizSelected !== null ? 'cursor-default' : 'cursor-pointer'
                      } ${style}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {quizSelected !== null && (
                <div className="flex items-center justify-between gap-2 text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <span className="flex items-center gap-1.5 font-medium">
                    {quizSelected === quizTargetChar ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    Carattere <strong>{quizTargetChar}</strong> ={' '}
                    <span className="font-mono font-bold">
                      {formatMorseDisplay(CHAR_TO_MORSE[quizTargetChar] ?? '')}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextChar = buildNextMorseQuiz(quizUseKoch, quizKochCount);
                      handlePlayQuizChar(nextChar);
                    }}
                    className="font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Prossimo →
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* 1C: Tactile Keyer Sandbox */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Tasto Telegrafico Diretto (Decodificatore Live)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tieni premuto il pulsante per trasmettere punti (breve) e linee (almeno 2× dit). Soglia automatica calcolata su {cwWpm} WPM ({Math.round(1200 / cwWpm)} ms/dit).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  currentElementsRef.current = '';
                  setKeyerElements('');
                  setKeyerDecoded('');
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Pulisci lavagna
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-5">
                <button
                  type="button"
                  onPointerDown={handleKeyDown}
                  onPointerUp={handleKeyUp}
                  onPointerLeave={handleKeyUp}
                  onPointerCancel={handleKeyUp}
                  className={`w-full py-5 px-4 rounded-xl border-2 font-semibold text-sm select-none touch-none transition-all cursor-pointer ${
                    keyerDown
                      ? 'bg-indigo-600 border-indigo-700 text-white scale-[0.98]'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-indigo-500'
                  }`}
                >
                  {keyerDown ? 'TRASMISSIONE ATTIVA (Rilascia)' : 'TIENI PREMUTO IL TASTO CW'}
                </button>
              </div>

              <div className="md:col-span-7 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Impulsi in corso:</span>
                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 text-sm">
                    {keyerElements ? formatMorseDisplay(keyerElements) : '—'}
                  </span>
                </div>
                <div className="text-base font-mono font-bold tracking-widest text-slate-900 dark:text-white min-h-[28px] break-all">
                  {keyerDecoded || 'Inizia a battere · e − sul tasto...'}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: NATO PHONETIC & Q-CODES */}
      {activeTab === 'nato-q' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* NATO Callsign / Spelling Helper */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Compitatore Alfabeto Fonetico NATO (ICAO)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Inserisci un nominativo o una parola difficile per ottenere lo spelling standard internazionale in fonia.
                </p>
              </div>

              <input
                type="text"
                value={natoInput}
                onChange={(e) => setNatoInput(e.target.value.toUpperCase().slice(0, 24))}
                placeholder="Es. IU2SCOUT"
                className="w-full px-3 py-2 text-sm font-mono uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />

              <div className="flex flex-wrap gap-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                {natoSpelling.length === 0 ? (
                  <span className="text-xs text-slate-400">Scrivi lettere o numeri qui sopra...</span>
                ) : (
                  natoSpelling.map((item, idx) => (
                    <div
                      key={`${item.char}-${idx}`}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <span className="font-mono font-bold text-sky-700 dark:text-sky-400 mr-1.5">
                        {item.char}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {item.word}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Compact A-Z Quiz */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Verifica rapida: qual è la parola NATO per{' '}
                    <strong className="font-mono text-base text-sky-700 dark:text-sky-400 ml-1">
                      {natoQuizTarget.letter}
                    </strong>
                    ?
                  </span>
                  <button
                    type="button"
                    onClick={generateNatoQuiz}
                    className="text-sky-700 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
                  >
                    Cambia lettera
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {natoQuizOpts.map((word) => {
                    const isRight = word === natoQuizTarget.word;
                    const chosen = natoQuizChoice === word;
                    let cls =
                      'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-sky-400';
                    if (natoQuizChoice !== null) {
                      if (isRight) {
                        cls = 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-semibold';
                      } else if (chosen) {
                        cls = 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200';
                      } else {
                        cls = 'border-slate-200 dark:border-slate-800 opacity-50';
                      }
                    }
                    return (
                      <button
                        key={word}
                        type="button"
                        disabled={natoQuizChoice !== null}
                        onClick={() => setNatoQuizChoice(word)}
                        className={`px-3 py-2 text-xs rounded-lg border text-left transition-colors ${
                          natoQuizChoice !== null ? 'cursor-default' : 'cursor-pointer'
                        } ${cls}`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Q-Codes Interactive Table */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                    Prontuario Codici Q (CW &amp; Fonia)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Abbreviazioni operative internazionali: aggiungi &ldquo;?&rdquo; per la forma interrogativa.
                  </p>
                </div>
                <input
                  type="search"
                  value={qSearch}
                  onChange={(e) => setQSearch(e.target.value)}
                  placeholder="Cerca QTH, QRM..."
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 w-40"
                />
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[380px] overflow-y-auto pr-1">
                {filteredQCodes.map((item) => (
                  <div key={item.code} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <span className="font-mono font-bold text-sky-700 dark:text-sky-400 text-sm">
                        {item.code}
                      </span>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                        {item.statementMeaning}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        Domanda ({item.code}?): {item.questionMeaning}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => playMorseAudio(item.code, { wpm: 15, farnsworth: true, freqHz: 700 })}
                      className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-sky-400 font-mono text-[11px] shrink-0 cursor-pointer"
                      title={`Ascolta ${item.code} in Morse`}
                    >
                      CW ♪
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 3: FIELD CALCULATORS & BAND TABLE */}
      {activeTab === 'calculators' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'antenna' as const, label: 'Dipolo & Ground Plane', icon: Antenna },
                { id: 'power-db' as const, label: 'Watt, dBm & Bilancio dB', icon: Gauge },
                { id: 'battery' as const, label: 'Autonomia Batteria Campo', icon: BatteryCharging },
                { id: 'bands' as const, label: 'Tabella Bande Radio', icon: Waves },
              ] as const
            ).map((sub) => {
              const Icon = sub.icon;
              const active = calcTab === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setCalcTab(sub.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>

          {calcTab === 'antenna' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Calcolatore Dimensionamento Antenne Filari e Ground Plane
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calcola rapidamente lunghezza d&apos;onda λ, dipolo λ/2 e stilo verticale λ/4 per una frequenza operativa.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1.5 text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 block">
                    Frequenza operativa (MHz)
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min={1}
                    max={1300}
                    value={antFreqMhz}
                    onChange={(e) => setAntFreqMhz(Math.max(0.5, Number(e.target.value) || 0.5))}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { label: '7,10 MHz (40m)', f: 7.1 },
                      { label: '14,20 MHz (20m)', f: 14.2 },
                      { label: '27,18 MHz (CB)', f: 27.185 },
                      { label: '145,5 MHz (2m)', f: 145.5 },
                      { label: '446,0 MHz (PMR)', f: 446.0 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setAntFreqMhz(p.f)}
                        className="px-2 py-0.5 text-[11px] font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-sky-400 cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </label>

                <label className="space-y-1.5 text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 block">
                    Fattore di raccorciamento (effetto d&apos;estremità k)
                  </span>
                  <select
                    value={velFactor}
                    onChange={(e) => setVelFactor(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value={0.95}>Filo di rame nudo (k = 0,95)</option>
                    <option value={0.93}>Filo isolato con guaina PVC (k = 0,93)</option>
                    <option value={0.96}>Tubo rigido alluminio (k = 0,96 — formula 72/f)</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Lunghezza d&apos;onda λ</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {lambdaM.toFixed(2)} m
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                  <div className="text-[11px] text-sky-700 dark:text-sky-300">Singolo braccio Dipolo</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-sky-800 dark:text-sky-200 mt-1">
                    {halfWaveArmM.toFixed(2)} m
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Dipolo totale (λ/2)</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {halfWaveTotalM.toFixed(2)} m
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300">Ground Plane λ/4 · Radiali</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-800 dark:text-emerald-200 mt-1">
                    {gpVerticalCm.toFixed(0)} cm / {gpRadialCm.toFixed(0)} cm
                  </div>
                </div>
              </div>
            </section>
          )}

          {calcTab === 'power-db' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Convertitore Watt ↔ dBm &amp; Bilancio RF di Stazione
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calcola la potenza equivalente irradiata (EIRP) combinando uscita radio, perdita del coassiale e guadagno antenna.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <label className="space-y-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300 block">
                    Potenza Radio TX (Watt)
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min={0.01}
                    max={1500}
                    value={txPowerW}
                    onChange={(e) => setTxPowerW(Math.max(0.01, Number(e.target.value) || 0.01))}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300 block">
                    Perdita Cavo &amp; Connettori (dB)
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={30}
                    value={cableLossDb}
                    onChange={(e) => setCableLossDb(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300 block">
                    Guadagno Antenna (dBi)
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min={-10}
                    max={25}
                    value={antGainDbi}
                    onChange={(e) => setAntGainDbi(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Livello TX in dBm</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {txDbm.toFixed(1)} dBm
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Bilancio Netto Sistema</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {netGainDb >= 0 ? `+${netGainDb.toFixed(1)}` : netGainDb.toFixed(1)} dB
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                  <div className="text-[11px] text-sky-700 dark:text-sky-300">Potenza EIRP</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-sky-800 dark:text-sky-200 mt-1">
                    {eirpW.toFixed(2)} W
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300">EIRP in dBm</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-800 dark:text-emerald-200 mt-1">
                    {eirpDbm.toFixed(1)} dBm
                  </div>
                </div>
              </div>
            </section>
          )}

          {calcTab === 'battery' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Autonomia Batteria Stazione Portatile (Duty-Cycle RX/TX)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Stima quante ore resiste una batteria da campo considerando la percentuale reale di trasmissione vs ricezione.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                <label className="space-y-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300 block">Capacità (Ah)</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={battAh}
                    onChange={(e) => setBattAh(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300 block">Chimica</span>
                  <select
                    value={battChem}
                    onChange={(e) => setBattChem(e.target.value as 'lifepo4' | 'lead' | 'liion')}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="lifepo4">LiFePO4 (90% utile)</option>
                    <option value="liion">Li-Ion (85% utile)</option>
                    <option value="lead">Piombo/AGM (50% utile)</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300 block">Consumo RX (mA)</span>
                  <input
                    type="number"
                    min={20}
                    max={3000}
                    step={50}
                    value={rxMa}
                    onChange={(e) => setRxMa(Math.max(10, Number(e.target.value) || 10))}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300 block">Consumo TX (A)</span>
                  <input
                    type="number"
                    min={0.2}
                    max={30}
                    step={0.5}
                    value={txAmps}
                    onChange={(e) => setTxAmps(Math.max(0.1, Number(e.target.value) || 0.1))}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300 block">% Tempo in TX</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={txDutyPct}
                    onChange={(e) => setTxDutyPct(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Capacità Reale Utilizzabile</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {usableAh.toFixed(1)} Ah
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Assorbimento Medio Stimato</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {avgCurrentA.toFixed(2)} A
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300">Autonomia Stimata al Campo</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-800 dark:text-emerald-200 mt-1">
                    ~ {autonomyHours.toFixed(1)} ore
                  </div>
                </div>
              </div>
            </section>
          )}

          {calcTab === 'bands' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Tabella Rapida delle Principali Bande Radio
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Promemoria delle frequenze radioamatoriali IARU Regione 1, CB e PMR446.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-4 font-semibold">Banda</th>
                      <th className="py-2 px-4 font-semibold">Intervallo di Frequenza</th>
                      <th className="py-2 pl-4 font-semibold">Caratteristiche &amp; Impiego</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {RADIO_BANDS.map((row) => (
                      <tr key={row.band}>
                        <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {row.band}
                        </td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-sky-700 dark:text-sky-400 whitespace-nowrap">
                          {row.freq}
                        </td>
                        <td className="py-2.5 pl-4 text-slate-600 dark:text-slate-300">
                          {row.usage}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
