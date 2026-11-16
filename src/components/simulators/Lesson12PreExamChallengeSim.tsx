import React, { useEffect, useState } from 'react';
import { ReadoutCell, SimulatorShell } from './SimulatorShell';

interface Props {
  onChallengeComplete?: () => void;
}

export const Lesson12PreExamChallengeSim: React.FC<Props> = ({ onChallengeComplete }) => {
  const [freqMhz, setFreqMhz] = useState<number>(14.2);
  const [txPowerW, setTxPowerW] = useState<number>(10);
  const [batteryV, setBatteryV] = useState<number>(12);
  const [touchedCount, setTouchedCount] = useState<number>(0);
  const [challengeDone, setChallengeDone] = useState(false);

  const wavelengthM = 300 / freqMhz;
  const dipoleArmM = 72 / freqMhz;
  const gpCm = 7200 / freqMhz;
  const txCurrentA = txPowerW / batteryV;
  const dbGainOver1W = 10 * Math.log10(txPowerW);

  useEffect(() => {
    if (touchedCount >= 3 && !challengeDone) {
      setChallengeDone(true);
      onChallengeComplete?.();
    }
  }, [touchedCount, challengeDone, onChallengeComplete]);

  return (
    <SimulatorShell
      title="Cruscotto Formule Rapide Pre-Esame"
      challengeText="Modifica almeno 3 parametri sul cruscotto per verificare al volo λ, dipolo, corrente e dB"
      challengeDone={challengeDone}
      onReset={() => {
        setFreqMhz(14.2);
        setTxPowerW(10);
        setBatteryV(12);
      }}
      stage={
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              1. Onda & Dimensioni
            </div>
            <div className="text-lg font-mono font-semibold text-sky-700 dark:text-sky-400 mt-1 tabular-nums">
              λ = {wavelengthM.toFixed(2)} m
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Calcolata con <span className="font-mono">300 / {freqMhz.toFixed(1)} MHz</span>
            </p>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              2. Taglio Dipolo λ/2
            </div>
            <div className="text-lg font-mono font-semibold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
              {dipoleArmM.toFixed(2)} m per braccio
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Ground Plane λ/4: <span className="font-mono">{gpCm.toFixed(1)} cm</span>
            </p>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              3. Assorbimento Batteria
            </div>
            <div className="text-lg font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
              I = {txCurrentA.toFixed(2)} A
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Stimato per {txPowerW} W ideali a {batteryV} V (<span className="font-mono">I = P / V</span>)
            </p>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              4. Livello in dB rispetto a 1 W
            </div>
            <div className="text-lg font-mono font-semibold text-amber-700 dark:text-amber-400 mt-1 tabular-nums">
              +{dbGainOver1W.toFixed(1)} dBW
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Ricorda: 10 W = +10 dBW · 100 W = +20 dBW
            </p>
          </div>
        </div>
      }
      readouts={
        <>
          <ReadoutCell label="Frequenza" value={`${freqMhz.toFixed(1)} MHz`} tone="azure" />
          <ReadoutCell label="Potenza" value={`${txPowerW} W`} tone="emerald" />
          <ReadoutCell label="Batteria" value={`${batteryV} V`} />
          <ReadoutCell label="Dipolo Totale" value={`${(dipoleArmM * 2).toFixed(2)} m`} />
        </>
      }
      controls={
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l12-freq">Frequenza operativa</label>
              <span className="font-mono tabular-nums text-sky-700 dark:text-sky-400">
                {freqMhz.toFixed(1)} MHz
              </span>
            </div>
            <input
              id="l12-freq"
              type="range"
              min={3.5}
              max={146}
              step={0.5}
              value={freqMhz}
              onChange={(e) => {
                setFreqMhz(Number(e.target.value));
                setTouchedCount((c) => c + 1);
              }}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l12-pwr">Potenza RF (Watt)</label>
              <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {txPowerW} W
              </span>
            </div>
            <input
              id="l12-pwr"
              type="range"
              min={1}
              max={100}
              step={1}
              value={txPowerW}
              onChange={(e) => {
                setTxPowerW(Number(e.target.value));
                setTouchedCount((c) => c + 1);
              }}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Tensione Batteria
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[12, 24].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setBatteryV(v);
                    setTouchedCount((c) => c + 1);
                  }}
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border cursor-pointer ${
                    batteryV === v
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {v} V
                </button>
              ))}
            </div>
          </div>
        </div>
      }
    />
  );
};
