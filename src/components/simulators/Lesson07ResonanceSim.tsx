import React, { useEffect, useState } from 'react';
import { ReadoutCell, SimulatorShell } from './SimulatorShell';

interface Props {
  onChallengeComplete?: () => void;
}

export const Lesson07ResonanceSim: React.FC<Props> = ({ onChallengeComplete }) => {
  const [inductanceUh, setInductanceUh] = useState<number>(8);
  const [capPf, setCapPf] = useState<number>(120);
  const [seriesR, setSeriesR] = useState<number>(12);
  const [mode, setMode] = useState<'series' | 'parallel'>('series');
  const [challengeDone, setChallengeDone] = useState(false);

  const f0Mhz = 159.155 / Math.sqrt(inductanceUh * capPf);
  const xlAtRes = 2 * Math.PI * (f0Mhz * 1e6) * (inductanceUh * 1e-6);
  const qFactor = xlAtRes / Math.max(1, seriesR);
  const bandwidthKhz = (f0Mhz * 1000) / Math.max(0.5, qFactor);

  useEffect(() => {
    if (Math.abs(f0Mhz - 7.1) <= 0.15 && qFactor > 15 && !challengeDone) {
      setChallengeDone(true);
      onChallengeComplete?.();
    }
  }, [f0Mhz, qFactor, challengeDone, onChallengeComplete]);

  const minF = 2;
  const maxF = 15;
  const pathPts: string[] = [];
  for (let i = 0; i <= 90; i += 1) {
    const f = minF + (i / 90) * (maxF - minF);
    const delta = (f - f0Mhz) / Math.max(0.1, f0Mhz / qFactor);
    const normResponse = 1 / Math.sqrt(1 + delta * delta * 4);
    const x = 40 + (i / 90) * 440;
    const y = mode === 'series' ? 185 - normResponse * 135 : 50 + normResponse * 135;
    pathPts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  const targetX = 40 + ((7.1 - minF) / (maxF - minF)) * 440;
  const f0X = 40 + Math.max(0, Math.min(1, (f0Mhz - minF) / (maxF - minF))) * 440;

  return (
    <SimulatorShell
      title="Sintonizzatore Risonanza RLC e Fattore di Merito Q"
      challengeText="Regola L, C e R per centrare f₀ su 7,10 MHz (linea tratteggiata) con Q > 15"
      challengeDone={challengeDone}
      onReset={() => {
        setInductanceUh(8);
        setCapPf(120);
        setSeriesR(12);
        setMode('series');
      }}
      stage={
        <svg
          viewBox="0 0 520 220"
          className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
          role="img"
          aria-label="Curva di risonanza RLC in frequenza"
        >
          <defs>
            <pattern id="grid-l7" width="22" height="22" patternUnits="userSpaceOnUse">
              <path
                d="M 22 0 L 0 0 0 22"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeWidth="0.7"
              />
            </pattern>
          </defs>
          <rect width="520" height="220" fill="url(#grid-l7)" />

          <line x1="40" y1="185" x2="485" y2="185" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
          <line x1="40" y1="30" x2="40" y2="185" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />

          <line x1={targetX} y1="30" x2={targetX} y2="185" stroke="#059669" strokeDasharray="4 4" strokeWidth="1.5" />
          <text x={targetX + 5} y="44" className="text-[10px] font-mono fill-emerald-700 dark:fill-emerald-400">
            Target 7,10 MHz
          </text>

          <line x1={f0X} y1="36" x2={f0X} y2="185" stroke="#0284c7" strokeWidth="1.2" strokeOpacity="0.6" />

          <path d={pathPts.join(' ')} fill="none" stroke="#0284c7" strokeWidth="3" />

          <text x="45" y="203" className="text-[10px] font-mono fill-slate-500 dark:fill-slate-400">
            2 MHz
          </text>
          <text x="255" y="203" textAnchor="middle" className="text-[10px] font-mono fill-slate-600 dark:fill-slate-300">
            f₀ attuale: {f0Mhz.toFixed(2)} MHz
          </text>
          <text x="478" y="203" textAnchor="end" className="text-[10px] font-mono fill-slate-500 dark:fill-slate-400">
            15 MHz
          </text>
        </svg>
      }
      readouts={
        <>
          <ReadoutCell
            label="Risonanza f₀"
            value={`${f0Mhz.toFixed(2)} MHz`}
            sublabel="Target: 7,10 MHz"
            tone={Math.abs(f0Mhz - 7.1) <= 0.15 ? 'emerald' : 'azure'}
          />
          <ReadoutCell
            label="Fattore Q"
            value={qFactor.toFixed(1)}
            sublabel={qFactor > 15 ? 'Alta selettività' : 'Banda larga'}
            tone={qFactor > 15 ? 'emerald' : 'amber'}
          />
          <ReadoutCell label="Banda (−3 dB)" value={`${bandwidthKhz.toFixed(0)} kHz`} sublabel="B = f₀ / Q" />
          <ReadoutCell
            label="Comportamento"
            value={mode === 'series' ? 'Picco Corrente' : 'Circuito Tappo'}
            sublabel={mode === 'series' ? 'Minima Z a f₀' : 'Massima Z a f₀'}
          />
        </>
      }
      controls={
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('series')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                mode === 'series'
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              RLC Serie
            </button>
            <button
              type="button"
              onClick={() => setMode('parallel')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                mode === 'parallel'
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              RLC Parallelo
            </button>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l7-l">Induttanza bobina (L)</label>
              <span className="font-mono tabular-nums text-amber-700 dark:text-amber-400">
                {inductanceUh.toFixed(1)} μH
              </span>
            </div>
            <input
              id="l7-l"
              type="range"
              min={1}
              max={20}
              step={0.5}
              value={inductanceUh}
              onChange={(e) => setInductanceUh(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l7-c">Condensatore variabile (C)</label>
              <span className="font-mono tabular-nums text-sky-700 dark:text-sky-400">
                {capPf} pF
              </span>
            </div>
            <input
              id="l7-c"
              type="range"
              min={20}
              max={300}
              step={5}
              value={capPf}
              onChange={(e) => setCapPf(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l7-r">Resistenza parassita (R)</label>
              <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {seriesR} Ω
              </span>
            </div>
            <input
              id="l7-r"
              type="range"
              min={3}
              max={45}
              step={1}
              value={seriesR}
              onChange={(e) => setSeriesR(Number(e.target.value))}
              className="w-full accent-slate-700 cursor-pointer"
            />
          </div>
        </div>
      }
    />
  );
};
