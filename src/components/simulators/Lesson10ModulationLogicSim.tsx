import React, { useEffect, useState } from 'react';
import { ReadoutCell, SimulatorShell } from './SimulatorShell';

interface Props {
  onChallengeComplete?: () => void;
}

type GateType = 'AND' | 'NAND' | 'OR' | 'NOR' | 'XOR';

function evalGate(gate: GateType, a: boolean, b: boolean): boolean {
  switch (gate) {
    case 'AND':
      return a && b;
    case 'NAND':
      return !(a && b);
    case 'OR':
      return a || b;
    case 'NOR':
      return !(a || b);
    case 'XOR':
      return a !== b;
  }
}

export const Lesson10ModulationLogicSim: React.FC<Props> = ({ onChallengeComplete }) => {
  const [tab, setTab] = useState<'mod' | 'logic'>('mod');
  const [modMode, setModMode] = useState<'AM' | 'FM'>('AM');
  const [modDepth, setModDepth] = useState<number>(70);
  const [gateType, setGateType] = useState<GateType>('XOR');
  const [inputA, setInputA] = useState<boolean>(true);
  const [inputB, setInputB] = useState<boolean>(false);
  const [seen, setSeen] = useState({ overmod: false, fm: false, xor: false });
  const [challengeDone, setChallengeDone] = useState(false);

  const isOverMod = modMode === 'AM' && modDepth > 100;
  const gateOut = evalGate(gateType, inputA, inputB);

  useEffect(() => {
    setSeen((prev) => ({
      overmod: prev.overmod || (modMode === 'AM' && modDepth > 100),
      fm: prev.fm || modMode === 'FM',
      xor: prev.xor || (tab === 'logic' && gateType === 'XOR'),
    }));
  }, [modMode, modDepth, tab, gateType]);

  useEffect(() => {
    if (seen.overmod && seen.fm && seen.xor && !challengeDone) {
      setChallengeDone(true);
      onChallengeComplete?.();
    }
  }, [seen, challengeDone, onChallengeComplete]);

  const carrierPts: string[] = [];
  const audioPts: string[] = [];
  const m = modDepth / 100;
  for (let i = 0; i <= 180; i += 1) {
    const t = i / 180;
    const x = 36 + t * 448;
    const audioVal = Math.sin(t * Math.PI * 4);
    audioPts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${(48 - audioVal * 18).toFixed(1)}`);

    let modulated = 0;
    if (modMode === 'AM') {
      const env = Math.max(0, 1 + m * audioVal);
      modulated = env * Math.sin(t * Math.PI * 36);
      const y = 148 - Math.max(-1.2, Math.min(1.2, modulated * 0.55)) * 46;
      carrierPts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    } else {
      const integral = -Math.cos(t * Math.PI * 4) / (Math.PI * 4);
      const phase = t * Math.PI * 34 + m * 14 * integral;
      modulated = Math.sin(phase);
      const y = 148 - modulated * 42;
      carrierPts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  }

  return (
    <SimulatorShell
      title="Modulatore AM / FM e Laboratorio Porte Logiche"
      challengeText="Spingi l’AM sopra il 100% (sovramodulazione), prova la FM e testa la porta XOR"
      challengeDone={challengeDone}
      onReset={() => {
        setTab('mod');
        setModMode('AM');
        setModDepth(70);
        setGateType('XOR');
        setInputA(true);
        setInputB(false);
      }}
      stage={
        tab === 'mod' ? (
          <svg
            viewBox="0 0 520 220"
            className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
            role="img"
            aria-label="Segnale modulante vocale e portante modulata AM o FM"
          >
            <text x="36" y="22" className="text-[11px] font-semibold fill-amber-700 dark:fill-amber-400">
              Voce dal microfono (Onda modulante)
            </text>
            <path d={audioPts.join(' ')} fill="none" stroke="#d97706" strokeWidth="2" />

            <line x1="36" y1="84" x2="484" y2="84" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
            <text x="36" y="99" className="text-[11px] font-semibold fill-slate-800 dark:fill-slate-100">
              {modMode === 'AM'
                ? isOverMod
                  ? 'Portante AM — SOVRAMODULAZIONE! Taglio e interferenze'
                  : 'Portante AM (cambia l’altezza al ritmo della voce)'
                : 'Portante FM (altezza costante, cambia la frequenza delle creste)'}
            </text>
            <path
              d={carrierPts.join(' ')}
              fill="none"
              stroke={isOverMod ? '#dc2626' : '#0284c7'}
              strokeWidth="2"
            />
          </svg>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    Ingresso A
                  </span>
                  <button
                    type="button"
                    onClick={() => setInputA((v) => !v)}
                    className={`px-4 py-1.5 text-xs font-mono font-semibold rounded-md border cursor-pointer ${
                      inputA
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {inputA ? '1 (ALTO)' : '0 (BASSO)'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    Ingresso B
                  </span>
                  <button
                    type="button"
                    onClick={() => setInputB((v) => !v)}
                    className={`px-4 py-1.5 text-xs font-mono font-semibold rounded-md border cursor-pointer ${
                      inputB
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {inputB ? '1 (ALTO)' : '0 (BASSO)'}
                  </button>
                </div>
                <div
                  className={`p-3 rounded-lg border text-center font-mono text-sm font-semibold ${
                    gateOut
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Porta {gateType} → Uscita: {gateOut ? '1 (VERO)' : '0 (FALSO)'}
                </div>
              </div>

              <table className="w-full text-xs font-mono tabular-nums border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                  <tr>
                    <th className="py-1.5 px-2">A</th>
                    <th className="py-1.5 px-2">B</th>
                    <th className="py-1.5 px-2">Uscita ({gateType})</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [false, false],
                    [false, true],
                    [true, false],
                    [true, true],
                  ].map(([aVal, bVal], idx) => {
                    const active = aVal === inputA && bVal === inputB;
                    const out = evalGate(gateType, aVal, bVal);
                    return (
                      <tr
                        key={idx}
                        className={
                          active
                            ? 'bg-sky-50 dark:bg-sky-950/60 font-semibold text-sky-900 dark:text-sky-200'
                            : 'text-slate-600 dark:text-slate-300'
                        }
                      >
                        <td className="py-1 px-2 text-center border-t border-slate-100 dark:border-slate-800">
                          {aVal ? 1 : 0}
                        </td>
                        <td className="py-1 px-2 text-center border-t border-slate-100 dark:border-slate-800">
                          {bVal ? 1 : 0}
                        </td>
                        <td className="py-1 px-2 text-center border-t border-slate-100 dark:border-slate-800">
                          {out ? 1 : 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      }
      readouts={
        tab === 'mod' ? (
          <>
            <ReadoutCell label="Tecnica" value={modMode} tone="azure" />
            <ReadoutCell
              label={modMode === 'AM' ? 'Indice m%' : 'Deviazione'}
              value={`${modDepth}%`}
              tone={isOverMod ? 'coral' : 'emerald'}
            />
            <ReadoutCell
              label="Qualità Segnale"
              value={isOverMod ? 'Distorto!' : modMode === 'FM' ? 'Anti-disturbo' : 'Pulito'}
              tone={isOverMod ? 'coral' : 'emerald'}
            />
            <ReadoutCell
              label="Ampiezza Creste"
              value={modMode === 'AM' ? 'Variabile' : 'Costante'}
            />
          </>
        ) : (
          <>
            <ReadoutCell label="Porta Selezionata" value={gateType} tone="azure" />
            <ReadoutCell label="Ingresso A" value={inputA ? '1' : '0'} />
            <ReadoutCell label="Ingresso B" value={inputB ? '1' : '0'} />
            <ReadoutCell label="Uscita Y" value={gateOut ? '1 (Attiva)' : '0'} tone={gateOut ? 'emerald' : 'neutral'} />
          </>
        )
      }
      controls={
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTab('mod')}
              className={`px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                tab === 'mod'
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              Modulatore AM / FM
            </button>
            <button
              type="button"
              onClick={() => setTab('logic')}
              className={`px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                tab === 'logic'
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              Porte Logiche
            </button>
          </div>

          {tab === 'mod' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModMode('AM')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                    modMode === 'AM'
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-600 dark:border-amber-500 text-amber-900 dark:text-amber-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  Modo AM
                </button>
                <button
                  type="button"
                  onClick={() => setModMode('FM')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                    modMode === 'FM'
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  Modo FM
                </button>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
                  <label htmlFor="l10-depth">
                    {modMode === 'AM' ? 'Profondità modulazione (m%)' : 'Intensità deviazione FM'}
                  </label>
                  <span
                    className={`font-mono tabular-nums ${
                      isOverMod
                        ? 'text-red-700 dark:text-red-400 font-semibold'
                        : 'text-sky-700 dark:text-sky-400'
                    }`}
                  >
                    {modDepth}%
                  </span>
                </div>
                <input
                  id="l10-depth"
                  type="range"
                  min={20}
                  max={140}
                  step={5}
                  value={modDepth}
                  onChange={(e) => setModDepth(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>
            </>
          ) : (
            <div>
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Scegli Porta Logica
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['AND', 'NAND', 'OR', 'NOR', 'XOR'] as GateType[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGateType(g)}
                    className={`px-2.5 py-2 text-xs font-mono font-medium rounded-lg border cursor-pointer ${
                      gateType === g
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      }
    />
  );
};
