import React, { useEffect, useState } from 'react';
import type { LabPreset } from '../../types/radiolab';
import { ReadoutCell, SimulatorShell } from './SimulatorShell';

interface Props {
  onChallengeComplete?: () => void;
  preset?: LabPreset | null;
}

type AntennaType = 'dipole' | 'inv-v' | 'gp' | 'yagi';

const BANDS = [
  { label: '40m (7,1 MHz)', freq: 7.1 },
  { label: '20m (14,2 MHz)', freq: 14.2 },
  { label: '2m VHF (145 MHz)', freq: 145 },
  { label: '70cm UHF (433 MHz)', freq: 433 },
];

export const Lesson11AntennaSim: React.FC<Props> = ({ onChallengeComplete, preset }) => {
  const [antennaType, setAntennaType] = useState<AntennaType>('inv-v');
  const [freqMhz, setFreqMhz] = useState<number>(7.1);
  const [polTiltDeg, setPolTiltDeg] = useState<number>(0);
  const [seenTilt90, setSeenTilt90] = useState(false);
  const [challengeDone, setChallengeDone] = useState(false);

  useEffect(() => {
    if (!preset || preset.lessonId !== 'lesson-11') return;
    if (typeof preset.params.freqMhz === 'number' && preset.params.freqMhz > 0) {
      setFreqMhz(preset.params.freqMhz);
    }
  }, [preset]);

  const armMeters = 72 / freqMhz;
  const gpCm = 7200 / freqMhz;
  const polLossFactor = Math.cos((polTiltDeg * Math.PI) / 180);
  const polLossDb = polTiltDeg >= 88 ? -20 : 20 * Math.log10(Math.max(0.1, polLossFactor));

  const nominalZ =
    antennaType === 'dipole'
      ? '75 Ω'
      : antennaType === 'inv-v'
        ? '50 Ω (ideale!)'
        : antennaType === 'gp'
          ? '50 Ω (radiali 45°)'
          : '50 Ω (direttiva)';

  useEffect(() => {
    if (polTiltDeg >= 85) setSeenTilt90(true);
  }, [polTiltDeg]);

  useEffect(() => {
    if (antennaType === 'inv-v' && Math.abs(freqMhz - 7.1) < 0.2 && seenTilt90 && !challengeDone) {
      setChallengeDone(true);
      onChallengeComplete?.();
    }
  }, [antennaType, freqMhz, seenTilt90, challengeDone, onChallengeComplete]);

  return (
    <SimulatorShell
      title="Progettista Antenne e Polarizzazione TX ↔ RX"
      challengeText="Calcola la V-Invertita sui 40m (7,1 MHz) e inclina la radio ricevente a 90° per vedere la perdita di segnale"
      challengeDone={challengeDone}
      onReset={() => {
        setAntennaType('inv-v');
        setFreqMhz(7.1);
        setPolTiltDeg(0);
      }}
      stage={
        <svg
          viewBox="0 0 520 220"
          className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
          role="img"
          aria-label="Geometria antenna e confronto polarizzazione"
        >
          <defs>
            <pattern id="grid-l11" width="24" height="24" patternUnits="userSpaceOnUse">
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeWidth="0.7"
              />
            </pattern>
          </defs>
          <rect width="520" height="220" fill="url(#grid-l11)" />

          <g>
            {antennaType === 'dipole' && (
              <>
                <line x1="155" y1="74" x2="155" y2="190" stroke="#94a3b8" strokeWidth="3" />
                <line x1="40" y1="74" x2="150" y2="74" stroke="#0284c7" strokeWidth="4" />
                <line x1="160" y1="74" x2="270" y2="74" stroke="#0284c7" strokeWidth="4" />
                <circle cx="155" cy="74" r="5" fill="#d97706" />
                <text x="155" y="54" textAnchor="middle" className="text-[11px] font-semibold fill-slate-800 dark:fill-slate-100">
                  Dipolo piatto (bracci {armMeters.toFixed(2)} m)
                </text>
              </>
            )}

            {antennaType === 'inv-v' && (
              <>
                <line x1="155" y1="54" x2="155" y2="190" stroke="#94a3b8" strokeWidth="4" />
                <line x1="150" y1="56" x2="48" y2="145" stroke="#059669" strokeWidth="4" />
                <line x1="160" y1="56" x2="262" y2="145" stroke="#059669" strokeWidth="4" />
                <circle cx="155" cy="56" r="5" fill="#d97706" />
                <text x="155" y="34" textAnchor="middle" className="text-[11px] font-semibold fill-slate-800 dark:fill-slate-100">
                  V-Invertita 120° ({armMeters.toFixed(2)} m/lato)
                </text>
              </>
            )}

            {antennaType === 'gp' && (
              <>
                <line x1="155" y1="115" x2="155" y2="195" stroke="#94a3b8" strokeWidth="4" />
                <line x1="155" y1="115" x2="155" y2="45" stroke="#0284c7" strokeWidth="4" />
                <line x1="155" y1="115" x2="96" y2="162" stroke="#d97706" strokeWidth="3" />
                <line x1="155" y1="115" x2="214" y2="162" stroke="#d97706" strokeWidth="3" />
                <text x="155" y="30" textAnchor="middle" className="text-[11px] font-semibold fill-slate-800 dark:fill-slate-100">
                  Ground Plane λ/4 ({gpCm.toFixed(1)} cm)
                </text>
              </>
            )}

            {antennaType === 'yagi' && (
              <>
                <line x1="55" y1="110" x2="255" y2="110" stroke="#64748b" strokeWidth="4" />
                <line x1="75" y1="52" x2="75" y2="168" stroke="#94a3b8" strokeWidth="4" />
                <line x1="135" y1="62" x2="135" y2="158" stroke="#0284c7" strokeWidth="4" />
                <line x1="215" y1="72" x2="215" y2="148" stroke="#059669" strokeWidth="4" />
                <polygon points="270,110 256,103 256,117" fill="#059669" />
                <text x="155" y="34" textAnchor="middle" className="text-[11px] font-semibold fill-slate-800 dark:fill-slate-100">
                  Yagi Direttiva (Riflettore → Direttori)
                </text>
              </>
            )}
          </g>

          <line x1="305" y1="24" x2="305" y2="196" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="4 4" strokeWidth="1" />

          <g transform="translate(320, 24)">
            <text x="90" y="14" textAnchor="middle" className="text-xs font-semibold fill-slate-800 dark:fill-slate-100">
              Polarizzazione TX ↔ RX
            </text>
            <line x1="40" y1="45" x2="40" y2="125" stroke="#0284c7" strokeWidth="4" />
            <text x="40" y="142" textAnchor="middle" className="text-[10px] font-mono fill-slate-600 dark:fill-slate-300">
              Base (0°)
            </text>

            <g transform={`translate(140, 85) rotate(${polTiltDeg})`}>
              <line x1="0" y1="-38" x2="0" y2="38" stroke={polTiltDeg > 60 ? '#dc2626' : '#059669'} strokeWidth="4" />
              <circle cx="0" cy="0" r="5" className="fill-slate-900 dark:fill-slate-100" />
            </g>
            <text x="140" y="142" textAnchor="middle" className="text-[10px] font-mono fill-slate-600 dark:fill-slate-300">
              Portatile ({polTiltDeg}°)
            </text>

            <text
              x="90"
              y="170"
              textAnchor="middle"
              className={`text-xs font-mono font-semibold ${
                polTiltDeg > 60
                  ? 'fill-red-700 dark:fill-red-400'
                  : 'fill-emerald-700 dark:fill-emerald-400'
              }`}
            >
              Perdita: {polLossDb.toFixed(1)} dB
            </text>
          </g>
        </svg>
      }
      readouts={
        <>
          <ReadoutCell
            label={antennaType === 'gp' ? 'Stilo λ/4 (cm)' : 'Braccio λ/4 (m)'}
            value={antennaType === 'gp' ? `${gpCm.toFixed(1)} cm` : `${armMeters.toFixed(2)} m`}
            sublabel={antennaType === 'gp' ? '7200 / MHz' : '72 / MHz'}
            tone="azure"
          />
          <ReadoutCell label="Lunghezza Totale" value={`${(armMeters * 2).toFixed(2)} m`} sublabel="Dipolo completo" />
          <ReadoutCell label="Impedenza Tipica" value={nominalZ} tone="emerald" />
          <ReadoutCell
            label="Allineamento RX"
            value={`${Math.round(polLossFactor * 100)}%`}
            sublabel={polTiltDeg > 60 ? 'Segnale quasi perso!' : 'Polarizzazione ok'}
            tone={polTiltDeg > 60 ? 'coral' : 'emerald'}
          />
        </>
      }
      controls={
        <div className="space-y-3.5">
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Tipo di Antenna
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['inv-v', 'V-Invertita'],
                  ['dipole', 'Dipolo Piatto'],
                  ['gp', 'Ground Plane'],
                  ['yagi', 'Yagi Direttiva'],
                ] as [AntennaType, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAntennaType(key)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                    antennaType === key
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
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              <span>Banda Operativa</span>
              <span className="font-mono text-[11px] text-sky-700 dark:text-sky-400">
                {freqMhz} MHz
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {BANDS.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => setFreqMhz(b.freq)}
                  className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg border cursor-pointer ${
                    Math.abs(freqMhz - b.freq) < 0.1
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l11-tilt">Inclinazione radio ricevente</label>
              <span className="font-mono tabular-nums text-amber-700 dark:text-amber-400">
                {polTiltDeg}°
              </span>
            </div>
            <input
              id="l11-tilt"
              type="range"
              min={0}
              max={90}
              step={5}
              value={polTiltDeg}
              onChange={(e) => setPolTiltDeg(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>
        </div>
      }
    />
  );
};
