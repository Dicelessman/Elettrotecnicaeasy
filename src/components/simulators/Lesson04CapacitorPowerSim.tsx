import React, { useEffect, useState } from 'react';
import { ReadoutCell, SimulatorShell } from './SimulatorShell';

interface Props {
  onChallengeComplete?: () => void;
}

export const Lesson04CapacitorPowerSim: React.FC<Props> = ({ onChallengeComplete }) => {
  const [mode, setMode] = useState<'capacitor' | 'mug'>('capacitor');
  const [freqMhz, setFreqMhz] = useState<number>(0);
  const [capPf, setCapPf] = useState<number>(100);
  const [phaseDeg, setPhaseDeg] = useState<number>(30);
  const [visitedBoth, setVisitedBoth] = useState<{ dc: boolean; ac: boolean; mug: boolean }>({
    dc: true,
    ac: false,
    mug: false,
  });
  const [challengeDone, setChallengeDone] = useState(false);

  const xc = freqMhz <= 0 ? Infinity : 1 / (2 * Math.PI * (freqMhz * 1e6) * (capPf * 1e-12));
  const passPercent = freqMhz <= 0 ? 0 : Math.min(100, Math.round((50 / (50 + xc)) * 100));

  const apparentVa = 100;
  const cosPhi = Math.cos((phaseDeg * Math.PI) / 180);
  const activeW = apparentVa * cosPhi;
  const reactiveVar = apparentVa * Math.sin((phaseDeg * Math.PI) / 180);

  useEffect(() => {
    setVisitedBoth((prev) => ({
      dc: prev.dc || freqMhz === 0,
      ac: prev.ac || freqMhz >= 10,
      mug: prev.mug || mode === 'mug',
    }));
  }, [freqMhz, mode]);

  useEffect(() => {
    if (visitedBoth.dc && visitedBoth.ac && visitedBoth.mug && !challengeDone) {
      setChallengeDone(true);
      onChallengeComplete?.();
    }
  }, [visitedBoth, challengeDone, onChallengeComplete]);

  return (
    <SimulatorShell
      title="Condensatore (Blocco DC / Passa AC) e Boccale di Potenza"
      challengeText="Confronta 0 Hz (DC) con ≥10 MHz (AC) e poi esplora la vista Boccale di Potenza"
      challengeDone={challengeDone}
      onReset={() => {
        setMode('capacitor');
        setFreqMhz(0);
        setCapPf(100);
        setPhaseDeg(30);
      }}
      stage={
        mode === 'capacitor' ? (
          <svg
            viewBox="0 0 520 220"
            className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
            role="img"
            aria-label="Comportamento del condensatore in DC e AC"
          >
            <defs>
              <pattern id="grid-l4" width="24" height="24" patternUnits="userSpaceOnUse">
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeWidth="0.7"
                />
              </pattern>
            </defs>
            <rect width="520" height="220" fill="url(#grid-l4)" />

            <line x1="40" y1="110" x2="215" y2="110" stroke="#0284c7" strokeWidth="4" />
            <rect x="215" y="55" width="12" height="110" rx="2" className="fill-slate-900 dark:fill-slate-200" />
            <rect x="242" y="60" width="14" height="100" fill="#fbbf24" opacity="0.65" />
            <rect x="256" y="55" width="12" height="110" rx="2" className="fill-slate-900 dark:fill-slate-200" />
            <line
              x1="268"
              y1="110"
              x2="450"
              y2="110"
              stroke={passPercent > 5 ? '#059669' : '#94a3b8'}
              strokeWidth="4"
              strokeDasharray={passPercent > 5 ? undefined : '6 6'}
            />

            <text x="241" y="40" textAnchor="middle" className="text-xs font-semibold fill-slate-800 dark:fill-slate-200">
              Armature + Dielettrico isolante ({capPf} pF)
            </text>

            <rect
              x="330"
              y="75"
              width="155"
              height="70"
              rx="10"
              className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700"
              strokeWidth="1.5"
            />
            <text x="407" y="100" textAnchor="middle" className="text-xs font-semibold fill-slate-800 dark:fill-slate-200">
              Segnale in Uscita
            </text>
            <text
              x="407"
              y="124"
              textAnchor="middle"
              className={`text-sm font-mono font-bold ${
                passPercent === 0
                  ? 'fill-red-700 dark:fill-red-400'
                  : 'fill-emerald-700 dark:fill-emerald-400'
              }`}
            >
              {passPercent === 0 ? 'BLOCCATO (0%)' : `${passPercent}% passa`}
            </text>
          </svg>
        ) : (
          <svg
            viewBox="0 0 520 220"
            className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
            role="img"
            aria-label="Analogia del boccale tra potenza attiva, reattiva e apparente"
          >
            <rect
              x="130"
              y="34"
              width="130"
              height="156"
              rx="10"
              className="fill-white dark:fill-slate-900 stroke-slate-900 dark:stroke-slate-300"
              strokeWidth="3"
            />
            <path
              d="M 260 66 C 300 66, 300 144, 260 144"
              fill="none"
              className="stroke-slate-900 dark:stroke-slate-300"
              strokeWidth="6"
            />

            <rect
              x="134"
              y={186 - (activeW / 100) * 144}
              width="122"
              height={(activeW / 100) * 144}
              rx="4"
              fill="#f59e0b"
            />
            <rect
              x="134"
              y={Math.max(38, 186 - ((activeW + reactiveVar) / 100) * 144)}
              width="122"
              height={(reactiveVar / 100) * 144}
              rx="4"
              fill="#fef3c7"
              stroke="#fbbf24"
              strokeWidth="1"
            />

            <g className="text-xs font-medium fill-slate-800 dark:fill-slate-200">
              <text x="305" y="75">
                Schiuma = Potenza Reattiva ({reactiveVar.toFixed(0)} VAR)
              </text>
              <text x="305" y="115">
                Birra = Potenza Attiva utile ({activeW.toFixed(0)} W)
              </text>
              <text x="305" y="155" className="font-semibold fill-slate-900 dark:fill-white">
                Boccale intero = Apparente (100 VA)
              </text>
            </g>
          </svg>
        )
      }
      readouts={
        mode === 'capacitor' ? (
          <>
            <ReadoutCell label="Frequenza" value={freqMhz === 0 ? '0 Hz (DC)' : `${freqMhz} MHz`} tone="azure" />
            <ReadoutCell label="Capacità (C)" value={`${capPf} pF`} />
            <ReadoutCell
              label="Reattanza Xc"
              value={xc === Infinity ? '∞ Ω' : `${xc.toFixed(0)} Ω`}
              sublabel="Freno del condensatore"
              tone={xc === Infinity ? 'coral' : 'emerald'}
            />
            <ReadoutCell
              label="Passaggio"
              value={`${passPercent}%`}
              sublabel={freqMhz === 0 ? 'DC bloccata' : 'AC fluida'}
              tone={passPercent > 30 ? 'emerald' : 'amber'}
            />
          </>
        ) : (
          <>
            <ReadoutCell label="Sfasamento φ" value={`${phaseDeg}°`} tone="azure" />
            <ReadoutCell label="Attiva (Birra)" value={`${activeW.toFixed(0)} W`} sublabel="Lavoro reale" tone="emerald" />
            <ReadoutCell label="Reattiva (Schiuma)" value={`${reactiveVar.toFixed(0)} VAR`} sublabel="Oscilla avanti/indietro" tone="amber" />
            <ReadoutCell label="Apparente (Boccale)" value="100 VA" sublabel="Totale richiesto" />
          </>
        )
      }
      controls={
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('capacitor')}
              className={`px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                mode === 'capacitor'
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              Condensatore (Xc)
            </button>
            <button
              type="button"
              onClick={() => setMode('mug')}
              className={`px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                mode === 'mug'
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              Boccale Potenze
            </button>
          </div>

          {mode === 'capacitor' ? (
            <>
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
                  <label htmlFor="l4-freq">Frequenza segnale</label>
                  <span className="font-mono tabular-nums text-sky-700 dark:text-sky-400">
                    {freqMhz === 0 ? '0 Hz (DC)' : `${freqMhz} MHz`}
                  </span>
                </div>
                <input
                  id="l4-freq"
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={freqMhz}
                  onChange={(e) => setFreqMhz(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
                  <label htmlFor="l4-cap">Capacità condensatore</label>
                  <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {capPf} pF
                  </span>
                </div>
                <input
                  id="l4-cap"
                  type="range"
                  min={10}
                  max={1000}
                  step={10}
                  value={capPf}
                  onChange={(e) => setCapPf(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>
            </>
          ) : (
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
                <label htmlFor="l4-phase">Angolo di sfasamento (φ)</label>
                <span className="font-mono tabular-nums text-amber-700 dark:text-amber-400">
                  {phaseDeg}°
                </span>
              </div>
              <input
                id="l4-phase"
                type="range"
                min={0}
                max={85}
                step={5}
                value={phaseDeg}
                onChange={(e) => setPhaseDeg(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>
          )}
        </div>
      }
    />
  );
};
