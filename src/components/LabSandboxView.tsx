import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { LESSONS } from '../data/curriculum';
import { useStudy } from '../context/StudyContext';
import type { LessonId } from '../types/radiolab';
import { D3SineWaveSimulator } from './simulators/D3SineWaveSimulator';
import { SimulatorRouter } from './simulators/SimulatorRouter';

interface LabSandboxViewProps {
  onOpenLesson: (lessonId: LessonId) => void;
}

const SIGNAL_LESSONS_WITH_D3: LessonId[] = [
  'lesson-03',
  'lesson-04',
  'lesson-07',
  'lesson-08',
  'lesson-09',
  'lesson-10',
];

export const LabSandboxView: React.FC<LabSandboxViewProps> = ({ onOpenLesson }) => {
  const { setIsTrackingStudy, markSectionCompleted } = useStudy();
  const [selectedId, setSelectedId] = useState<LessonId>('lesson-03');
  const [simMode, setSimMode] = useState<'module' | 'd3-wave'>('module');

  const activeLesson = LESSONS.find((l) => l.id === selectedId) ?? LESSONS[0];
  const supportsD3Explorer = SIGNAL_LESSONS_WITH_D3.includes(activeLesson.id);

  useEffect(() => {
    setIsTrackingStudy(true);
    return () => setIsTrackingStudy(false);
  }, [setIsTrackingStudy]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
              Laboratorio Interattivo Libero
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Sperimenta subito qualsiasi fenomeno dei {LESSONS.length} moduli senza dover seguire l’ordine delle lezioni.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenLesson(activeLesson.id)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Vai alla lezione completa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
          {LESSONS.map((l) => {
            const active = l.id === selectedId;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setSelectedId(l.id);
                  setSimMode('module');
                }}
                className={`px-3 py-2 text-left rounded-lg border text-xs transition-colors cursor-pointer ${
                  active
                    ? 'bg-sky-600 border-sky-600 text-white font-semibold'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div
                  className={`font-mono text-[10px] ${
                    active ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {String(l.number).padStart(2, '0')}
                </div>
                <div className="truncate">{l.shortTitle}</div>
              </button>
            );
          })}
        </div>

        {supportsD3Explorer && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Questo modulo tratta i segnali elettrici: puoi anche aprire il generatore sinusoidale D3.js dedicato.
            </span>
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setSimMode('module')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  simMode === 'module'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Simulatore del Modulo
              </button>
              <button
                type="button"
                onClick={() => setSimMode('d3-wave')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  simMode === 'd3-wave'
                    ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Onda Sinusoidale (D3.js)
              </button>
            </div>
          </div>
        )}
      </div>

      {supportsD3Explorer && simMode === 'd3-wave' ? (
        <D3SineWaveSimulator
          lessonContext={activeLesson.id}
          onChallengeComplete={() => void markSectionCompleted(activeLesson.id, 'simulator')}
        />
      ) : (
        <SimulatorRouter
          simulatorId={activeLesson.simulatorId}
          onChallengeComplete={() => void markSectionCompleted(activeLesson.id, 'simulator')}
        />
      )}
    </div>
  );
};
