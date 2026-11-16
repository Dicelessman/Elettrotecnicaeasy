import React, { useEffect, useState } from 'react';
import { ReadoutCell, SimulatorShell } from './SimulatorShell';

interface Props {
  onChallengeComplete?: () => void;
}

export const Lesson05InductorSim: React.FC<Props> = ({ onChallengeComplete }) => {
  const [turns, setTurns] = useState<number>(8);
  const [hasFerrite, setHasFerrite] = useState<boolean>(false);
  const [freqMhz, setFreqMhz] = useState<number>(5);
  const [challengeDone, setChallengeDone] = useState(false);

  const inductanceUh = turns * turns * 0.04 * (hasFerrite ? 4 : 1);
  const referenceCapPf = 100;
  const xl = 2 * Math.PI * (freqMhz * 1e6) * (inductanceUh * 1e-6);
  const xc =
    freqMhz <= 0
      ? Infinity
      : 1 / (2 * Math.PI * (freqMhz * 1e6) * (referenceCapPf * 1e-12));

  useEffect(() => {
    if (xl > xc && freqMhz > 0 && !challengeDone) {
      setChallengeDone(true);
      onChallengeComplete?.();
    }
  }, [xl, xc, freqMhz, challengeDone, onChallengeComplete]);

  const loopCount = Math.min(14, Math.max(4, Math.round(turns / 1.5)));
  const fluxScale = Math.min(1.5, 0.5 + inductanceUh / 25);

  return (
    <SimulatorShell
      title="Bobina, Nucleo Magnetico e Confronto XL vs XC"
      challengeText="Aumenta spire, ferrite o frequenza fino a far superare XL rispetto a XC (100 pF)"
      challengeDone={challengeDone}
      onReset={() => {
        setTurns(8);
        setHasFerrite(false);
        setFreqMhz(5);
      }}
      stage={
        <div className="space-y-3">
          <svg
            viewBox="0 0 520 220"
            className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
            role="img"
            aria-label="Solenoide con linee di campo magnetico e confronto reattanza"
          >
            <defs>
              <pattern id="grid-l5" width="24" height="24" patternUnits="userSpaceOnUse">
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeWidth="0.7"
                />
              </pattern>
            </defs>
            <rect width="520" height="220" fill="url(#grid-l5)" />

            {[1, 2].map((ring) => (
              <ellipse
                key={ring}
                cx="175"
                cy="110"
                rx={70 + ring * 26 * fluxScale}
                ry={26 + ring * 18 * fluxScale}
                fill="none"
                stroke="#0284c7"
                strokeOpacity={0.28 + (hasFerrite ? 0.25 : 0)}
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
            ))}

            {hasFerrite && (
              <rect
                x="102"
                y="96"
                width="146"
                height="28"
                rx="4"
                fill="#475569"
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
            )}

            {Array.from({ length: loopCount }, (_, i) => {
              const x = 110 + (i / (loopCount - 1)) * 130;
              return (
                <ellipse
                  key={i}
                  cx={x}
                  cy="110"
                  rx="7"
                  ry="24"
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="3"
                />
              );
            })}

            <text x="175" y="196" textAnchor="middle" className="text-xs font-medium fill-slate-700 dark:fill-slate-300">
              {hasFerrite ? 'Nucleo in ferrite inserito (campo concentrato)' : 'Bobina avvolta in aria'}
            </text>

            <g transform="translate(335, 34)">
              <rect
                width="160"
                height="154"
                rx="10"
                className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700"
                strokeWidth="1.2"
              />
              <text x="80" y="22" textAnchor="middle" className="text-[11px] font-semibold fill-slate-800 dark:fill-slate-100">
                Confronto Reattanza
              </text>

              <rect x="26" y="42" width="42" height="90" rx="4" className="fill-slate-100 dark:fill-slate-800" />
              <rect
                x="26"
                y={132 - Math.min(90, (xl / 800) * 90)}
                width="42"
                height={Math.min(90, (xl / 800) * 90)}
                rx="4"
                fill="#d97706"
              />
              <text x="47" y="146" textAnchor="middle" className="text-[10px] font-mono fill-slate-700 dark:fill-slate-200">
                XL
              </text>

              <rect x="92" y="42" width="42" height="90" rx="4" className="fill-slate-100 dark:fill-slate-800" />
              <rect
                x="92"
                y={132 - Math.min(90, (Math.min(800, xc) / 800) * 90)}
                width="42"
                height={Math.min(90, (Math.min(800, xc) / 800) * 90)}
                rx="4"
                fill="#0284c7"
              />
              <text x="113" y="146" textAnchor="middle" className="text-[10px] font-mono fill-slate-700 dark:fill-slate-200">
                XC
              </text>
            </g>
          </svg>
        </div>
      }
      readouts={
        <>
          <ReadoutCell label="Induttanza (L)" value={`${inductanceUh.toFixed(1)} μH`} tone="amber" />
          <ReadoutCell
            label="Reattanza XL"
            value={`${xl.toFixed(0)} Ω`}
            sublabel="Sale con f"
            tone={xl > xc ? 'emerald' : 'amber'}
          />
          <ReadoutCell
            label="Reattanza XC (100pF)"
            value={xc === Infinity ? '∞ Ω' : `${xc.toFixed(0)} Ω`}
            sublabel="Scende con f"
            tone="azure"
          />
          <ReadoutCell
            label="Dominante"
            value={freqMhz === 0 ? 'DC (passa L)' : xl > xc ? 'Induttiva' : 'Capacitiva'}
            sublabel={xl > xc ? 'XL > XC' : 'XC ≥ XL'}
          />
        </>
      }
      controls={
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l5-turns">Numero di spire</label>
              <span className="font-mono tabular-nums text-amber-700 dark:text-amber-400">
                {turns} spire
              </span>
            </div>
            <input
              id="l5-turns"
              type="range"
              min={4}
              max={20}
              step={1}
              value={turns}
              onChange={(e) => setTurns(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              Nucleo di Ferrite (×4 L)
            </span>
            <button
              type="button"
              onClick={() => setHasFerrite((v) => !v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-colors ${
                hasFerrite
                  ? 'bg-sky-600 border-sky-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
              }`}
            >
              {hasFerrite ? 'Inserito' : 'In Aria'}
            </button>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l5-freq">Frequenza segnale</label>
              <span className="font-mono tabular-nums text-sky-700 dark:text-sky-400">
                {freqMhz === 0 ? '0 Hz (DC)' : `${freqMhz} MHz`}
              </span>
            </div>
            <input
              id="l5-freq"
              type="range"
              min={0}
              max={30}
              step={1}
              value={freqMhz}
              onChange={(e) => setFreqMhz(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>
        </div>
      }
    />
  );
};
