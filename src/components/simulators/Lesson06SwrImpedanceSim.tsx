import React, { useEffect, useRef, useState } from 'react';
import { ReadoutCell, SimulatorShell } from './SimulatorShell';

interface Props {
  onChallengeComplete?: () => void;
}

export const Lesson06SwrImpedanceSim: React.FC<Props> = ({ onChallengeComplete }) => {
  const [antennaZ, setAntennaZ] = useState<number>(150);
  const [txPower, setTxPower] = useState<number>(25);
  const [xtOhm, setXtOhm] = useState<number>(20);
  const [isPlaying, setIsPlaying] = useState(true);
  const [phase, setPhase] = useState(0);
  const [challengeDone, setChallengeDone] = useState(false);

  const rafRef = useRef<number | null>(null);

  const zTotal = Math.sqrt(antennaZ * antennaZ + xtOhm * xtOhm);
  const gamma = Math.abs(zTotal - 50) / (zTotal + 50);
  const swr = gamma >= 0.98 ? 99 : (1 + gamma) / (1 - gamma);
  const reflectedW = txPower * gamma * gamma;
  const radiatedW = txPower - reflectedW;

  useEffect(() => {
    if (swr <= 1.3 && !challengeDone) {
      setChallengeDone(true);
      onChallengeComplete?.();
    }
  }, [swr, challengeDone, onChallengeComplete]);

  useEffect(() => {
    if (!isPlaying) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setPhase((p) => (p + dt * 4.5) % (Math.PI * 2));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  const swrTone = swr <= 1.5 ? 'emerald' : swr <= 2.3 ? 'amber' : 'coral';
  const swrStatus =
    swr <= 1.5 ? 'Ottimo (Sicuro)' : swr <= 2.3 ? 'Accettabile (Accordare)' : 'Pericolo Finale!';

  const fwdPts: string[] = [];
  const refPts: string[] = [];
  for (let i = 0; i <= 50; i += 1) {
    const t = i / 50;
    const x = 115 + t * 280;
    const yf = 110 - 24 * Math.sin(t * Math.PI * 4 - phase);
    const yr = 110 - 24 * gamma * Math.sin(t * Math.PI * 4 + phase);
    fwdPts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yf.toFixed(1)}`);
    refPts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yr.toFixed(1)}`);
  }

  return (
    <SimulatorShell
      title="Impedenza AC e Rosmetro (ROS / SWR) su Linea da 50 Ω"
      challengeText="Adatta R antenna vicino a 50 Ω e azzera la reattanza XT per portare il ROS sotto 1,3"
      challengeDone={challengeDone}
      isPlaying={isPlaying}
      onTogglePlay={() => setIsPlaying((p) => !p)}
      onReset={() => {
        setAntennaZ(150);
        setTxPower(25);
        setXtOhm(20);
        setIsPlaying(true);
      }}
      stage={
        <svg
          viewBox="0 0 520 220"
          className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
          role="img"
          aria-label="Onda diretta e riflessa lungo il cavo coassiale verso l'antenna"
        >
          <defs>
            <pattern id="grid-l6" width="24" height="24" patternUnits="userSpaceOnUse">
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeWidth="0.7"
              />
            </pattern>
          </defs>
          <rect width="520" height="220" fill="url(#grid-l6)" />

          <rect
            x="20"
            y="64"
            width="95"
            height="92"
            rx="8"
            className="fill-white dark:fill-slate-900 stroke-slate-900 dark:stroke-slate-300"
            strokeWidth="2"
          />
          <text x="67" y="96" textAnchor="middle" className="text-xs font-semibold fill-slate-900 dark:fill-slate-100">
            Radio TX
          </text>
          <text x="67" y="114" textAnchor="middle" className="text-[11px] font-mono fill-sky-700 dark:fill-sky-400">
            50 Ω · {txPower} W
          </text>
          <text x="67" y="136" textAnchor="middle" className="text-[10px] fill-slate-500 dark:fill-slate-400">
            Uscita coassiale
          </text>

          <rect
            x="115"
            y="72"
            width="280"
            height="76"
            className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          <line x1="115" y1="110" x2="395" y2="110" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />

          <path d={fwdPts.join(' ')} fill="none" stroke="#0284c7" strokeWidth="2.5" />
          {gamma > 0.04 && (
            <path
              d={refPts.join(' ')}
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          )}

          <rect
            x="395"
            y="64"
            width="105"
            height="92"
            rx="8"
            fill={swr <= 1.5 ? '#059669' : swr <= 2.3 ? '#d97706' : '#dc2626'}
            fillOpacity="0.14"
            stroke={swr <= 1.5 ? '#059669' : swr <= 2.3 ? '#d97706' : '#dc2626'}
            strokeWidth="2"
          />
          <text x="447" y="94" textAnchor="middle" className="text-xs font-semibold fill-slate-900 dark:fill-slate-100">
            Antenna
          </text>
          <text x="447" y="114" textAnchor="middle" className="text-[11px] font-mono fill-slate-700 dark:fill-slate-200">
            Z = {zTotal.toFixed(0)} Ω
          </text>
          <text
            x="447"
            y="136"
            textAnchor="middle"
            className={`text-[10px] font-semibold ${
              swr <= 1.5
                ? 'fill-emerald-700 dark:fill-emerald-400'
                : swr <= 2.3
                  ? 'fill-amber-700 dark:fill-amber-400'
                  : 'fill-red-700 dark:fill-red-400'
            }`}
          >
            ROS {swr.toFixed(2)} : 1
          </text>

          <text x="122" y="176" className="text-[11px] font-medium fill-sky-700 dark:fill-sky-400">
            ─── Onda diretta: {txPower} W
          </text>
          <text x="300" y="176" className="text-[11px] font-medium fill-red-700 dark:fill-red-400">
            - - - Onda riflessa: {reflectedW.toFixed(1)} W
          </text>
        </svg>
      }
      readouts={
        <>
          <ReadoutCell
            label="ROS (SWR)"
            value={`${swr.toFixed(2)} : 1`}
            sublabel={swrStatus}
            tone={swrTone}
          />
          <ReadoutCell label="Impedenza Totale Z" value={`${zTotal.toFixed(1)} Ω`} sublabel="Target: 50 Ω" />
          <ReadoutCell label="Potenza Irraggiata" value={`${radiatedW.toFixed(1)} W`} tone="emerald" />
          <ReadoutCell
            label="Potenza Riflessa"
            value={`${reflectedW.toFixed(1)} W`}
            sublabel="Torna nella radio"
            tone={reflectedW > 2 ? 'coral' : 'neutral'}
          />
        </>
      }
      controls={
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l6-rant">Resistenza di radiazione antenna (R)</label>
              <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {antennaZ} Ω
              </span>
            </div>
            <input
              id="l6-rant"
              type="range"
              min={15}
              max={200}
              step={5}
              value={antennaZ}
              onChange={(e) => setAntennaZ(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l6-xt">Reattanza residua XT (XL − XC)</label>
              <span className="font-mono tabular-nums text-amber-700 dark:text-amber-400">
                {xtOhm} Ω
              </span>
            </div>
            <input
              id="l6-xt"
              type="range"
              min={0}
              max={120}
              step={5}
              value={xtOhm}
              onChange={(e) => setXtOhm(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l6-pwr">Potenza Trasmettitore</label>
              <span className="font-mono tabular-nums text-sky-700 dark:text-sky-400">
                {txPower} W
              </span>
            </div>
            <input
              id="l6-pwr"
              type="range"
              min={5}
              max={100}
              step={5}
              value={txPower}
              onChange={(e) => setTxPower(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>
        </div>
      }
    />
  );
};
