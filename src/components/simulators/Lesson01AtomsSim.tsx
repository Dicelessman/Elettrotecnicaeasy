import React, { useEffect, useRef, useState } from 'react';
import { ReadoutCell, SimulatorShell } from './SimulatorShell';

interface Props {
  onChallengeComplete?: () => void;
}

type MaterialKey = 'copper' | 'silicon' | 'plastic';

const MATERIALS: Record<
  MaterialKey,
  { label: string; factor: number; desc: string; tone: string }
> = {
  copper: {
    label: 'Rame (Conduttore)',
    factor: 1,
    desc: 'Elettroni liberi: basta poca spinta (Volt) per creare un flusso ordinato e intenso.',
    tone: 'emerald',
  },
  silicon: {
    label: 'Silicio (Semiconduttore)',
    factor: 0.25,
    desc: 'Lascia passare una corrente ridotta solo quando la tensione supera una soglia.',
    tone: 'amber',
  },
  plastic: {
    label: 'Plastica (Isolante)',
    factor: 0,
    desc: 'Elettroni bloccati negli atomi: anche aumentando i Volt la corrente resta nulla.',
    tone: 'coral',
  },
};

export const Lesson01AtomsSim: React.FC<Props> = ({ onChallengeComplete }) => {
  const [material, setMaterial] = useState<MaterialKey>('copper');
  const [voltage, setVoltage] = useState<number>(6);
  const [resistance, setResistance] = useState<number>(12);
  const [isPlaying, setIsPlaying] = useState(true);
  const [offset, setOffset] = useState(0);
  const [challengeDone, setChallengeDone] = useState(false);

  const rafRef = useRef<number | null>(null);
  const mat = MATERIALS[material];

  const effectiveCurrent =
    mat.factor === 0
      ? 0
      : material === 'silicon' && voltage < 1
        ? 0
        : (voltage / Math.max(1, resistance)) * mat.factor;

  useEffect(() => {
    if (material === 'copper' && voltage === 12 && !challengeDone) {
      setChallengeDone(true);
      onChallengeComplete?.();
    }
  }, [material, voltage, challengeDone, onChallengeComplete]);

  useEffect(() => {
    if (!isPlaying) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (effectiveCurrent > 0) {
        setOffset((prev) => (prev + dt * Math.min(240, effectiveCurrent * 65)) % 480);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, effectiveCurrent]);

  const atomsX = [60, 140, 220, 300, 380, 460];
  const electrons = Array.from({ length: 14 }, (_, idx) => {
    const lane = idx % 2 === 0 ? 78 : 132;
    const base = (idx * 36 + offset) % 500;
    return { id: idx, x: base + 10, y: lane };
  });

  return (
    <SimulatorShell
      title="Banco Elettroni: Conduttore, Tensione e Corrente"
      challengeText="Imposta il Rame e regola la tensione esattamente a 12 V"
      challengeDone={challengeDone}
      isPlaying={isPlaying}
      onTogglePlay={() => setIsPlaying((p) => !p)}
      onReset={() => {
        setMaterial('copper');
        setVoltage(6);
        setResistance(12);
        setIsPlaying(true);
      }}
      stage={
        <div className="space-y-3">
          <svg
            viewBox="0 0 520 210"
            className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
            role="img"
            aria-label="Animazione flusso di elettroni nel conduttore"
          >
            <defs>
              <pattern id="grid-l1" width="24" height="24" patternUnits="userSpaceOnUse">
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeWidth="0.8"
                />
              </pattern>
            </defs>
            <rect width="520" height="210" fill="url(#grid-l1)" />

            {/* Wire casing */}
            <rect
              x="16"
              y="52"
              width="488"
              height="106"
              rx="14"
              fill={
                material === 'plastic'
                  ? '#94a3b8'
                  : material === 'silicon'
                    ? '#d97706'
                    : '#0284c7'
              }
              fillOpacity="0.14"
              stroke={
                material === 'plastic'
                  ? '#94a3b8'
                  : material === 'silicon'
                    ? '#d97706'
                    : '#0284c7'
              }
              strokeWidth="2"
            />

            {/* Polarity labels */}
            <text x="26" y="40" className="text-[11px] font-mono fill-slate-600 dark:fill-slate-300">
              Polo − ({voltage} V di spinta)
            </text>
            <text x="412" y="40" className="text-[11px] font-mono fill-slate-600 dark:fill-slate-300">
              Polo + (Attrazione)
            </text>

            {/* Fixed atomic nuclei */}
            {atomsX.map((cx) => (
              <g key={cx}>
                <circle
                  cx={cx}
                  cy={105}
                  r={14}
                  className="fill-slate-200 dark:fill-slate-800 stroke-slate-500 dark:stroke-slate-400"
                  strokeWidth="1.5"
                />
                <text
                  x={cx}
                  y={109}
                  textAnchor="middle"
                  className="text-[11px] font-mono font-semibold fill-slate-700 dark:fill-slate-200"
                >
                  +
                </text>
              </g>
            ))}

            {/* Moving or blocked electrons */}
            {electrons.map((el) => {
              const jitter = effectiveCurrent === 0 ? Math.sin(el.id * 2) * 2 : 0;
              return (
                <g key={el.id} transform={`translate(${el.x + jitter}, ${el.y})`}>
                  <circle
                    r="7"
                    fill={effectiveCurrent > 0 ? '#0284c7' : '#94a3b8'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text y="3" textAnchor="middle" className="text-[10px] font-mono font-bold fill-white">
                    −
                  </text>
                </g>
              );
            })}

            {/* Current flow arrow */}
            <g opacity={effectiveCurrent > 0 ? 1 : 0.4}>
              <line x1="170" y1="184" x2="340" y2="184" stroke="currentColor" strokeWidth="2" />
              <polygon points="340,179 352,184 340,189" fill="currentColor" />
              <text
                x="260"
                y="177"
                textAnchor="middle"
                className="text-[11px] font-medium fill-slate-700 dark:fill-slate-200"
              >
                {effectiveCurrent > 0
                  ? `Flusso attivo: ${effectiveCurrent.toFixed(2)} Coulomb/s`
                  : 'Nessun flusso di carica'}
              </text>
            </g>
          </svg>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{mat.desc}</p>
        </div>
      }
      readouts={
        <>
          <ReadoutCell label="Tensione (d.d.p.)" value={`${voltage} V`} sublabel="Spinta applicata" tone="azure" />
          <ReadoutCell label="Resistenza" value={`${resistance} Ω`} sublabel="Freno del carico" />
          <ReadoutCell
            label="Corrente (I)"
            value={`${effectiveCurrent.toFixed(2)} A`}
            sublabel={effectiveCurrent === 0 ? 'Circuito fermo' : 'Flusso attivo'}
            tone={effectiveCurrent > 0 ? 'emerald' : 'amber'}
          />
          <ReadoutCell
            label="Carica in 10 s"
            value={`${(effectiveCurrent * 10).toFixed(1)} C`}
            sublabel="Q = I × t"
          />
        </>
      }
      controls={
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Materiale del filo
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {(Object.keys(MATERIALS) as MaterialKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMaterial(key)}
                  className={`px-3 py-2 text-left text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    material === key
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {MATERIALS[key].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l1-volt">Tensione (spinta)</label>
              <span className="font-mono tabular-nums text-sky-700 dark:text-sky-400">
                {voltage} V
              </span>
            </div>
            <input
              id="l1-volt"
              type="range"
              min={0}
              max={24}
              step={1}
              value={voltage}
              onChange={(e) => setVoltage(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l1-ohm">Resistenza sul sentiero</label>
              <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {resistance} Ω
              </span>
            </div>
            <input
              id="l1-ohm"
              type="range"
              min={2}
              max={60}
              step={2}
              value={resistance}
              onChange={(e) => setResistance(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>
        </div>
      }
    />
  );
};
