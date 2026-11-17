import React, { useEffect, useState } from 'react';
import type { LabPreset } from '../../types/radiolab';
import { ReadoutCell, SimulatorShell } from './SimulatorShell';

interface Props {
  onChallengeComplete?: () => void;
  preset?: LabPreset | null;
}

export const Lesson02OhmBatteriesSim: React.FC<Props> = ({ onChallengeComplete, preset }) => {
  const [topology, setTopology] = useState<'series' | 'parallel'>('series');
  const [loadOhm, setLoadOhm] = useState<number>(6);
  const [challengeDone, setChallengeDone] = useState(false);

  useEffect(() => {
    if (!preset || preset.lessonId !== 'lesson-02') return;
    if (preset.params.topology) {
      setTopology(preset.params.topology);
    }
    if (typeof preset.params.loadOhm === 'number') {
      setLoadOhm(Math.max(2, Math.min(24, Math.round(preset.params.loadOhm))));
    }
  }, [preset]);

  const totalVoltage = topology === 'series' ? 24 : 12;
  const totalAh = topology === 'series' ? 200 : 400;
  const currentA = totalVoltage / loadOhm;
  const powerW = totalVoltage * currentA;
  const hoursAutonomy = totalAh / Math.max(0.1, currentA);
  const isOverVoltage = topology === 'series';

  useEffect(() => {
    if (topology === 'parallel' && loadOhm === 6 && !challengeDone) {
      setChallengeDone(true);
      onChallengeComplete?.();
    }
  }, [topology, loadOhm, challengeDone, onChallengeComplete]);

  return (
    <SimulatorShell
      title="Banco Batterie (2 × 12 V 200 Ah) e Legge di Ohm"
      challengeText="Collega le due batterie in Parallelo con carico 6 Ω per ottenere 12 V sicuri e 2 A"
      challengeDone={challengeDone}
      onReset={() => {
        setTopology('series');
        setLoadOhm(6);
      }}
      stage={
        <div className="space-y-3">
          <svg
            viewBox="0 0 520 220"
            className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
            role="img"
            aria-label="Schema collegamenti batterie serie e parallelo con carico"
          >
            <defs>
              <pattern id="grid-l2" width="24" height="24" patternUnits="userSpaceOnUse">
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeWidth="0.8"
                />
              </pattern>
            </defs>
            <rect width="520" height="220" fill="url(#grid-l2)" />

            {/* Battery 1 */}
            <rect
              x="44"
              y="40"
              width="110"
              height="58"
              rx="8"
              className="fill-white dark:fill-slate-900 stroke-slate-900 dark:stroke-slate-300"
              strokeWidth="2"
            />
            <text x="99" y="64" textAnchor="middle" className="text-xs font-semibold fill-slate-900 dark:fill-slate-100">
              Batteria A
            </text>
            <text x="99" y="82" textAnchor="middle" className="text-[11px] font-mono fill-slate-600 dark:fill-slate-300">
              12 V · 200 Ah
            </text>

            {/* Battery 2 */}
            <rect
              x="44"
              y="126"
              width="110"
              height="58"
              rx="8"
              className="fill-white dark:fill-slate-900 stroke-slate-900 dark:stroke-slate-300"
              strokeWidth="2"
            />
            <text x="99" y="150" textAnchor="middle" className="text-xs font-semibold fill-slate-900 dark:fill-slate-100">
              Batteria B
            </text>
            <text x="99" y="168" textAnchor="middle" className="text-[11px] font-mono fill-slate-600 dark:fill-slate-300">
              12 V · 200 Ah
            </text>

            {/* Wiring depending on Series vs Parallel */}
            {topology === 'series' ? (
              <g stroke="#d97706" strokeWidth="3" fill="none">
                <path d="M 99 98 L 99 126" />
                <path d="M 154 68 L 350 68 L 350 86" />
                <path d="M 154 155 L 350 155 L 350 134" />
                <text x="235" y="56" className="text-[11px] font-mono fill-amber-700 dark:fill-amber-400" stroke="none">
                  Serie: + su − → Somma Volt (24 V)
                </text>
              </g>
            ) : (
              <g stroke="#0284c7" strokeWidth="3" fill="none">
                <path d="M 154 58 L 210 58 L 210 144 L 154 144" />
                <path d="M 154 80 L 240 80 L 240 166 L 154 166" />
                <path d="M 210 100 L 350 100 L 350 86" />
                <path d="M 240 124 L 350 124 L 350 134" />
                <text x="235" y="56" className="text-[11px] font-mono fill-sky-700 dark:fill-sky-400" stroke="none">
                  Parallelo: + con +, − con − → 12 V / 400 Ah
                </text>
              </g>
            )}

            {/* Load box */}
            <rect
              x="315"
              y="84"
              width="165"
              height="68"
              rx="10"
              fill={isOverVoltage ? '#dc2626' : '#059669'}
              fillOpacity="0.14"
              stroke={isOverVoltage ? '#dc2626' : '#059669'}
              strokeWidth="2"
            />
            <text x="397" y="109" textAnchor="middle" className="text-xs font-semibold fill-slate-900 dark:fill-slate-100">
              Stazione Radio (Carico {loadOhm} Ω)
            </text>
            <text
              x="397"
              y="128"
              textAnchor="middle"
              className={`text-[11px] font-mono font-semibold ${
                isOverVoltage ? 'fill-red-700 dark:fill-red-400' : 'fill-emerald-700 dark:fill-emerald-400'
              }`}
            >
              {isOverVoltage ? 'ATTENZIONE: 24 V!' : 'Tensione sicura: 12 V'}
            </text>
            <text x="397" y="143" textAnchor="middle" className="text-[10px] font-mono fill-slate-600 dark:fill-slate-300">
              Calore Joule: {powerW.toFixed(0)} W
            </text>
          </svg>
        </div>
      }
      readouts={
        <>
          <ReadoutCell
            label="Tensione Totale"
            value={`${totalVoltage} V`}
            sublabel={isOverVoltage ? 'Troppo alta per radio 12V' : 'Ideale per radio 12V'}
            tone={isOverVoltage ? 'coral' : 'emerald'}
          />
          <ReadoutCell
            label="Corrente (I = V/R)"
            value={`${currentA.toFixed(2)} A`}
            sublabel="Flusso assorbito"
            tone="azure"
          />
          <ReadoutCell
            label="Potenza (P = V·I)"
            value={`${powerW.toFixed(1)} W`}
            sublabel="Effetto Joule"
            tone={powerW > 60 ? 'amber' : 'neutral'}
          />
          <ReadoutCell
            label="Autonomia Stimata"
            value={`${hoursAutonomy.toFixed(0)} h`}
            sublabel={`Capacità ${totalAh} Ah`}
          />
        </>
      }
      controls={
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Collegamento Batterie
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTopology('series')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                  topology === 'series'
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-600 dark:border-amber-500 text-amber-900 dark:text-amber-200'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                Serie (24 V)
              </button>
              <button
                type="button"
                onClick={() => setTopology('parallel')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                  topology === 'parallel'
                    ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                Parallelo (12 V)
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l2-load">Resistenza del carico (R)</label>
              <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {loadOhm} Ω
              </span>
            </div>
            <input
              id="l2-load"
              type="range"
              min={2}
              max={24}
              step={1}
              value={loadOhm}
              onChange={(e) => setLoadOhm(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong className="text-slate-900 dark:text-slate-100">Regola pratica:</strong> con la stessa resistenza di
            carico, raddoppiare la tensione da 12 V a 24 V fa raddoppiare la corrente e{' '}
            <strong>quadruplicare</strong> il calore dissipato (<span className="font-mono">P = V²/R</span>)!
          </div>
        </div>
      }
    />
  );
};
