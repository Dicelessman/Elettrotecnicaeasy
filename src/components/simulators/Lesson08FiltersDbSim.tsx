import React, { useEffect, useState } from 'react';
import type { LabPreset } from '../../types/radiolab';
import { ReadoutCell, SimulatorShell } from './SimulatorShell';

interface Props {
  onChallengeComplete?: () => void;
  preset?: LabPreset | null;
}

type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';

export const Lesson08FiltersDbSim: React.FC<Props> = ({ onChallengeComplete, preset }) => {
  const [filterType, setFilterType] = useState<FilterType>('lowpass');
  const [cutoffMhz, setCutoffMhz] = useState<number>(15);
  const [testFreqMhz, setTestFreqMhz] = useState<number>(30);
  const [challengeDone, setChallengeDone] = useState(false);

  useEffect(() => {
    if (!preset || preset.lessonId !== 'lesson-08') return;
    if (typeof preset.params.cutoffMhz === 'number') {
      setCutoffMhz(Math.max(5, Math.min(40, Math.round(preset.params.cutoffMhz))));
    }
    if (typeof preset.params.freqMhz === 'number') {
      setTestFreqMhz(Math.max(2, Math.min(50, Math.round(preset.params.freqMhz))));
    }
  }, [preset]);

  const calcGainDb = (f: number): number => {
    const ratio = f / Math.max(1, cutoffMhz);
    if (filterType === 'lowpass') {
      return -10 * Math.log10(1 + Math.pow(ratio, 4));
    }
    if (filterType === 'highpass') {
      return -10 * Math.log10(1 + Math.pow(1 / Math.max(0.05, ratio), 4));
    }
    if (filterType === 'bandpass') {
      const detune = (f - cutoffMhz) / Math.max(1.5, cutoffMhz * 0.25);
      return -10 * Math.log10(1 + detune * detune * 3);
    }
    const detune = (f - cutoffMhz) / Math.max(1.5, cutoffMhz * 0.18);
    const notch = 1 / (1 + detune * detune * 14);
    return -32 * notch;
  };

  const testDb = calcGainDb(testFreqMhz);
  const powerPassPercent = Math.pow(10, testDb / 10) * 100;

  useEffect(() => {
    if (
      filterType === 'lowpass' &&
      cutoffMhz === 10 &&
      testFreqMhz >= 30 &&
      testDb <= -18 &&
      !challengeDone
    ) {
      setChallengeDone(true);
      onChallengeComplete?.();
    }
  }, [filterType, cutoffMhz, testFreqMhz, testDb, challengeDone, onChallengeComplete]);

  const pts: string[] = [];
  for (let i = 0; i <= 90; i += 1) {
    const f = 1 + (i / 90) * 49;
    const db = Math.max(-40, calcGainDb(f));
    const x = 44 + (i / 90) * 436;
    const y = 40 + (Math.abs(db) / 40) * 135;
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  const testX = 44 + ((testFreqMhz - 1) / 49) * 436;
  const testY = 40 + (Math.min(40, Math.abs(testDb)) / 40) * 135;
  const yMinus3Db = 40 + (3 / 40) * 135;

  return (
    <SimulatorShell
      title="Banco Filtri (Grafico di Bode) e Scala Decibel"
      challengeText="Imposta Passa-Basso con taglio fc = 10 MHz e verifica l’attenuazione dell’armonica a ≥ 30 MHz"
      challengeDone={challengeDone}
      onReset={() => {
        setFilterType('lowpass');
        setCutoffMhz(15);
        setTestFreqMhz(30);
      }}
      stage={
        <svg
          viewBox="0 0 520 220"
          className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
          role="img"
          aria-label="Curva di attenuazione del filtro in decibel"
        >
          <defs>
            <pattern id="grid-l8" width="22" height="22" patternUnits="userSpaceOnUse">
              <path
                d="M 22 0 L 0 0 0 22"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeWidth="0.7"
              />
            </pattern>
          </defs>
          <rect width="520" height="220" fill="url(#grid-l8)" />

          <line x1="44" y1="40" x2="480" y2="40" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
          <line x1="44" y1="175" x2="480" y2="175" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.4" />
          <line x1="44" y1="40" x2="44" y2="175" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.4" />

          <line x1="44" y1={yMinus3Db} x2="480" y2={yMinus3Db} stroke="#059669" strokeDasharray="4 4" strokeWidth="1.2" />
          <text x="478" y={yMinus3Db - 4} textAnchor="end" className="text-[10px] font-mono fill-emerald-700 dark:fill-emerald-400">
            Taglio −3 dB (metà potenza)
          </text>

          <path d={pts.join(' ')} fill="none" stroke="#0284c7" strokeWidth="3" />

          <line x1={testX} y1="40" x2={testX} y2="175" stroke="#d97706" strokeDasharray="3 3" strokeWidth="1" />
          <circle cx={testX} cy={testY} r="5.5" fill="#d97706" stroke="#ffffff" strokeWidth="1.5" />

          <text x="38" y="44" textAnchor="end" className="text-[10px] font-mono fill-slate-500 dark:fill-slate-400">
            0 dB
          </text>
          <text x="38" y="176" textAnchor="end" className="text-[10px] font-mono fill-slate-500 dark:fill-slate-400">
            −40
          </text>
          <text x="44" y="196" className="text-[10px] font-mono fill-slate-500 dark:fill-slate-400">
            1 MHz
          </text>
          <text x="480" y="196" textAnchor="end" className="text-[10px] font-mono fill-slate-500 dark:fill-slate-400">
            50 MHz
          </text>
        </svg>
      }
      readouts={
        <>
          <ReadoutCell label="Segnale di Test" value={`${testFreqMhz} MHz`} tone="azure" />
          <ReadoutCell
            label="Attenuazione"
            value={`${testDb.toFixed(1)} dB`}
            sublabel={testDb > -3 ? 'Banda passante' : 'Segnale attenuato'}
            tone={testDb > -3 ? 'emerald' : 'amber'}
          />
          <ReadoutCell label="Potenza Uscita" value={`${powerPassPercent.toFixed(1)}%`} sublabel="Rispetto a ingresso" />
          <ReadoutCell label="Frequenza Taglio fc" value={`${cutoffMhz} MHz`} sublabel="Punto −3 dB" />
        </>
      }
      controls={
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Tipo di Filtro
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['lowpass', 'Passa-Basso'],
                  ['highpass', 'Passa-Alto'],
                  ['bandpass', 'Passa-Banda'],
                  ['notch', 'Notch (Elimina)'],
                ] as [FilterType, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterType(key)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                    filterType === key
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l8-fc">Frequenza di taglio / centro (fc)</label>
              <span className="font-mono tabular-nums text-sky-700 dark:text-sky-400">
                {cutoffMhz} MHz
              </span>
            </div>
            <input
              id="l8-fc"
              type="range"
              min={5}
              max={40}
              step={1}
              value={cutoffMhz}
              onChange={(e) => setCutoffMhz(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l8-test">Frequenza segnale di test</label>
              <span className="font-mono tabular-nums text-amber-700 dark:text-amber-400">
                {testFreqMhz} MHz
              </span>
            </div>
            <input
              id="l8-test"
              type="range"
              min={2}
              max={50}
              step={1}
              value={testFreqMhz}
              onChange={(e) => setTestFreqMhz(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>
        </div>
      }
    />
  );
};
