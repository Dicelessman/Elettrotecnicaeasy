import React, { useEffect, useState } from 'react';
import { ReadoutCell, SimulatorShell } from './SimulatorShell';

interface Props {
  onChallengeComplete?: () => void;
}

type RectifierStage = 'ac' | 'half' | 'bridge' | 'filtered';

export const Lesson09DiodeTransistorSim: React.FC<Props> = ({ onChallengeComplete }) => {
  const [tab, setTab] = useState<'rectifier' | 'transistor'>('rectifier');
  const [rectStage, setRectStage] = useState<RectifierStage>('ac');
  const [baseCurrentMa, setBaseCurrentMa] = useState<number>(1.2);
  const [hfe, setHfe] = useState<number>(100);
  const [visited, setVisited] = useState<{ filtered: boolean; transistor: boolean }>({
    filtered: false,
    transistor: false,
  });
  const [challengeDone, setChallengeDone] = useState(false);

  const collectorMa = Math.min(500, baseCurrentMa * hfe);
  const stateLabel =
    baseCurrentMa <= 0.1
      ? 'Interdizione (Spento)'
      : collectorMa >= 490
        ? 'Saturazione (Tutto aperto)'
        : 'Zona Lineare (Amplifica)';

  useEffect(() => {
    setVisited((prev) => ({
      filtered: prev.filtered || rectStage === 'filtered',
      transistor: prev.transistor || (tab === 'transistor' && baseCurrentMa >= 2),
    }));
  }, [rectStage, tab, baseCurrentMa]);

  useEffect(() => {
    if (visited.filtered && visited.transistor && !challengeDone) {
      setChallengeDone(true);
      onChallengeComplete?.();
    }
  }, [visited, challengeDone, onChallengeComplete]);

  const pts: string[] = [];
  for (let i = 0; i <= 90; i += 1) {
    const t = i / 90;
    const x = 44 + t * 430;
    const raw = Math.sin(t * Math.PI * 4);
    let val = raw;
    if (rectStage === 'half') {
      val = Math.max(0, raw);
    } else if (rectStage === 'bridge') {
      val = Math.abs(raw);
    } else if (rectStage === 'filtered') {
      const absRaw = Math.abs(raw);
      val = 0.78 + absRaw * 0.18;
    }
    const y = 120 - val * 62;
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  return (
    <SimulatorShell
      title="Ponte di Graetz (AC → DC) e Transistor Rubinetto BJT"
      challengeText="Prova il Ponte + Condensatore livellatore e poi comanda il Transistor con Ib ≥ 2 mA"
      challengeDone={challengeDone}
      onReset={() => {
        setTab('rectifier');
        setRectStage('ac');
        setBaseCurrentMa(1.2);
        setHfe(100);
      }}
      stage={
        tab === 'rectifier' ? (
          <svg
            viewBox="0 0 520 220"
            className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
            role="img"
            aria-label="Trasformazione da onda AC a DC tramite Ponte di Graetz"
          >
            <defs>
              <pattern id="grid-l9" width="22" height="22" patternUnits="userSpaceOnUse">
                <path
                  d="M 22 0 L 0 0 0 22"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeWidth="0.7"
                />
              </pattern>
            </defs>
            <rect width="520" height="220" fill="url(#grid-l9)" />

            <line x1="40" y1="120" x2="480" y2="120" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2" />
            <line x1="44" y1="35" x2="44" y2="195" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" />

            <path
              d={pts.join(' ')}
              fill="none"
              stroke={rectStage === 'filtered' ? '#059669' : '#0284c7'}
              strokeWidth="3"
            />

            <text x="54" y="34" className="text-xs font-semibold fill-slate-800 dark:fill-slate-100">
              {rectStage === 'ac' && 'Onda AC pura (sale e scende sotto lo zero)'}
              {rectStage === 'half' && '1 Diodo (Semionda: metà energia sprecata)'}
              {rectStage === 'bridge' && 'Ponte di Graetz (4 diodi: sfrutta entrambe le semionde)'}
              {rectStage === 'filtered' && 'Ponte di Graetz + Condensatore → Tensione Continua stabile!'}
            </text>
          </svg>
        ) : (
          <svg
            viewBox="0 0 520 220"
            className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
            role="img"
            aria-label="Schema transistor BJT NPN come rubinetto di corrente"
          >
            <circle
              cx="240"
              cy="110"
              r="46"
              className="fill-white dark:fill-slate-900 stroke-slate-900 dark:stroke-slate-300"
              strokeWidth="2.2"
            />
            <line x1="226" y1="84" x2="226" y2="136" className="stroke-slate-900 dark:stroke-slate-200" strokeWidth="4" />

            <line x1="80" y1="110" x2="226" y2="110" stroke="#d97706" strokeWidth={2 + baseCurrentMa * 0.7} />
            <text x="84" y="96" className="text-xs font-semibold fill-amber-800 dark:fill-amber-400">
              Base (Ib = {baseCurrentMa.toFixed(1)} mA)
            </text>

            <line x1="226" y1="96" x2="262" y2="72" stroke="#0284c7" strokeWidth="2.5" />
            <line
              x1="262"
              y1="72"
              x2="262"
              y2="24"
              stroke="#0284c7"
              strokeWidth={Math.max(2, Math.min(11, 2 + collectorMa / 55))}
            />
            <text x="276" y="42" className="text-xs font-semibold fill-sky-800 dark:fill-sky-400">
              Collettore (Ic = {collectorMa.toFixed(0)} mA)
            </text>

            <line x1="226" y1="124" x2="262" y2="148" stroke="#059669" strokeWidth="2.5" />
            <line
              x1="262"
              y1="148"
              x2="262"
              y2="196"
              stroke="#059669"
              strokeWidth={Math.max(2, Math.min(11, 2 + (collectorMa + baseCurrentMa) / 55))}
            />
            <text x="276" y="186" className="text-xs font-semibold fill-emerald-800 dark:fill-emerald-400">
              Emettitore (Ie = {(collectorMa + baseCurrentMa).toFixed(1)} mA)
            </text>

            <circle
              cx="420"
              cy="110"
              r="30"
              fill={collectorMa < 20 ? '#94a3b8' : collectorMa >= 490 ? '#facc15' : '#38bdf8'}
              fillOpacity={collectorMa < 20 ? 0.3 : 0.75}
              className="stroke-slate-900 dark:stroke-slate-300"
              strokeWidth="2"
            />
            <text x="420" y="158" textAnchor="middle" className="text-[11px] font-medium fill-slate-700 dark:fill-slate-200">
              {stateLabel}
            </text>
          </svg>
        )
      }
      readouts={
        tab === 'rectifier' ? (
          <>
            <ReadoutCell label="Stadio Attivo" value={rectStage.toUpperCase()} tone="azure" />
            <ReadoutCell label="Soglia Diodo Si" value="0,7 V" sublabel="Germanio: 0,2 V" />
            <ReadoutCell
              label="Ondulazione"
              value={rectStage === 'filtered' ? 'Minima (DC)' : rectStage === 'bridge' ? '100 Hz (2×)' : '50 Hz'}
              tone={rectStage === 'filtered' ? 'emerald' : 'amber'}
            />
            <ReadoutCell
              label="Uso pratico"
              value={rectStage === 'filtered' ? 'Alimenta Radio' : 'Richiede filtro'}
            />
          </>
        ) : (
          <>
            <ReadoutCell label="Comando Base (Ib)" value={`${baseCurrentMa.toFixed(1)} mA`} tone="amber" />
            <ReadoutCell label="Guadagno (hfe)" value={`× ${hfe}`} />
            <ReadoutCell label="Uscita Ic" value={`${collectorMa.toFixed(0)} mA`} tone="azure" />
            <ReadoutCell
              label="Regime"
              value={baseCurrentMa <= 0.1 ? 'Spento' : collectorMa >= 490 ? 'Saturo' : 'Lineare'}
              tone={collectorMa >= 490 ? 'amber' : 'emerald'}
            />
          </>
        )
      }
      controls={
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTab('rectifier')}
              className={`px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                tab === 'rectifier'
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              Ponte di Graetz
            </button>
            <button
              type="button"
              onClick={() => setTab('transistor')}
              className={`px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                tab === 'transistor'
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              Transistor BJT
            </button>
          </div>

          {tab === 'rectifier' ? (
            <div className="grid grid-cols-1 gap-1.5">
              {(
                [
                  ['ac', '1. Ingresso AC (Sinusoide)'],
                  ['half', '2. Un solo Diodo (Semionda)'],
                  ['bridge', '3. Ponte di Graetz (4 Diodi)'],
                  ['filtered', '4. Ponte + Condensatore (DC liscia)'],
                ] as [RectifierStage, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRectStage(key)}
                  className={`px-3 py-2 text-left text-xs font-medium rounded-lg border cursor-pointer ${
                    rectStage === key
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
                  <label htmlFor="l9-ib">Corrente di Base (Ib)</label>
                  <span className="font-mono tabular-nums text-amber-700 dark:text-amber-400">
                    {baseCurrentMa.toFixed(1)} mA
                  </span>
                </div>
                <input
                  id="l9-ib"
                  type="range"
                  min={0}
                  max={6}
                  step={0.2}
                  value={baseCurrentMa}
                  onChange={(e) => setBaseCurrentMa(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
                  <label htmlFor="l9-hfe">Guadagno hfe</label>
                  <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">{hfe}</span>
                </div>
                <input
                  id="l9-hfe"
                  type="range"
                  min={50}
                  max={200}
                  step={25}
                  value={hfe}
                  onChange={(e) => setHfe(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>
            </>
          )}
        </div>
      }
    />
  );
};
