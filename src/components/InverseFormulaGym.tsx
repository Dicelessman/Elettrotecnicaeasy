import React, { useEffect, useState } from 'react';
import { Calculator, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { INVERSE_FORMULA_DRILLS } from '../data/inverseFormulas';
import { useStudy } from '../context/StudyContext';
import type { LessonId } from '../types/radiolab';
import { triggerGamificationFeedback } from '../utils/feedbackAudio';

interface InverseFormulaGymProps {
  lessonId: LessonId;
}

export const InverseFormulaGym: React.FC<InverseFormulaGymProps> = ({ lessonId }) => {
  const { profile } = useStudy();
  const drill = INVERSE_FORMULA_DRILLS[lessonId];

  const [step1Choice, setStep1Choice] = useState<number | null>(null);
  const [step2Choice, setStep2Choice] = useState<number | null>(null);

  useEffect(() => {
    setStep1Choice(null);
    setStep2Choice(null);
  }, [lessonId]);

  if (!drill) return null;

  const step1Done = step1Choice !== null;
  const step1Correct = step1Choice === drill.step1CorrectIndex;
  const step2Done = step2Choice !== null;
  const step2Correct = step2Choice === drill.step2CorrectIndex;

  const handleChoose1 = (idx: number) => {
    if (step1Done) return;
    setStep1Choice(idx);
    triggerGamificationFeedback(idx === drill.step1CorrectIndex ? 'stepCorrect' : 'stepWrong', {
      soundEffectsEnabled: profile.soundEffectsEnabled,
      hapticFeedbackEnabled: profile.hapticFeedbackEnabled,
    });
  };

  const handleChoose2 = (idx: number) => {
    if (step2Done) return;
    setStep2Choice(idx);
    triggerGamificationFeedback(idx === drill.step2CorrectIndex ? 'stepCorrect' : 'stepWrong', {
      soundEffectsEnabled: profile.soundEffectsEnabled,
      hapticFeedbackEnabled: profile.hapticFeedbackEnabled,
    });
  };

  const handleReset = () => {
    setStep1Choice(null);
    setStep2Choice(null);
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-700 dark:text-sky-400 shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Palestra delle Formule Inverse e Unità di Misura
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Allena l’isolamento algebrico di <strong className="font-mono text-sky-700 dark:text-sky-400">{drill.targetSymbol}</strong> ({drill.targetName}) dalla formula base <span className="font-mono">{drill.baseFormula}</span>.
            </p>
          </div>
        </div>

        {(step1Done || step2Done) && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Riprova esercizio</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Step A: Algebraic isolation */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
          <div className="text-xs font-semibold text-sky-700 dark:text-sky-400">
            Passo A · Ricava l’incognita
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {drill.step1Prompt}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {drill.step1Options.map((opt, idx) => {
              const isSelected = step1Choice === idx;
              const isOk = idx === drill.step1CorrectIndex;
              let cls =
                'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-sky-400';
              if (step1Done) {
                if (isOk) {
                  cls =
                    'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 text-emerald-900 dark:text-emerald-200 font-semibold';
                } else if (isSelected && !isOk) {
                  cls =
                    'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-900 dark:text-red-200';
                } else {
                  cls =
                    'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400';
                }
              }
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={step1Done}
                  onClick={() => handleChoose1(idx)}
                  className={`px-3.5 py-2.5 text-left font-mono text-xs sm:text-sm rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                    step1Done ? 'cursor-default' : 'cursor-pointer'
                  } ${cls}`}
                >
                  <span>{opt}</span>
                  {step1Done && isOk && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  {step1Done && isSelected && !isOk && (
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
          {step1Done && (
            <p
              className={`text-xs rounded-lg p-3 border leading-relaxed ${
                step1Correct
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                  : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
              }`}
            >
              {drill.step1Explanation}
            </p>
          )}
        </div>

        {/* Step B: Unit scale / numeric sanity check */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Passo B · Verifica numeri e unità di misura
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {drill.step2Prompt}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {drill.step2Options.map((opt, idx) => {
              const isSelected = step2Choice === idx;
              const isOk = idx === drill.step2CorrectIndex;
              let cls =
                'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-sky-400';
              if (step2Done) {
                if (isOk) {
                  cls =
                    'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 text-emerald-900 dark:text-emerald-200 font-semibold';
                } else if (isSelected && !isOk) {
                  cls =
                    'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-900 dark:text-red-200';
                } else {
                  cls =
                    'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400';
                }
              }
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={step2Done}
                  onClick={() => handleChoose2(idx)}
                  className={`px-3.5 py-2.5 text-left font-mono text-xs sm:text-sm rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                    step2Done ? 'cursor-default' : 'cursor-pointer'
                  } ${cls}`}
                >
                  <span>{opt}</span>
                  {step2Done && isOk && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  {step2Done && isSelected && !isOk && (
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
          {step2Done && (
            <p
              className={`text-xs rounded-lg p-3 border leading-relaxed ${
                step2Correct
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                  : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
              }`}
            >
              {drill.step2Explanation}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
