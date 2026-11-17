import React, { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, Wrench, X } from 'lucide-react';
import { LESSONS } from '../data/curriculum';
import { useStudy } from '../context/StudyContext';
import type { LabPreset, LessonId } from '../types/radiolab';
import { TroubleshootingLab } from './TroubleshootingLab';
import { D3SineWaveSimulator } from './simulators/D3SineWaveSimulator';
import { SimulatorRouter } from './simulators/SimulatorRouter';

interface LabSandboxViewProps {
  onOpenLesson: (lessonId: LessonId) => void;
  initialPreset?: LabPreset | null;
}

const SIGNAL_LESSONS_WITH_D3: LessonId[] = [
  'lesson-03',
  'lesson-04',
  'lesson-07',
  'lesson-08',
  'lesson-09',
  'lesson-10',
];

export const LabSandboxView: React.FC<LabSandboxViewProps> = ({
  onOpenLesson,
  initialPreset,
}) => {
  const { proMode, setProMode, setIsTrackingStudy, markSectionCompleted } = useStudy();
  const [selectedId, setSelectedId] = useState<LessonId>(initialPreset?.lessonId ?? 'lesson-03');
  const [simMode, setSimMode] = useState<'module' | 'd3-wave'>('module');
  const [labSection, setLabSection] = useState<'simulators' | 'troubleshooting'>('simulators');
  const [dismissedPresetNonce, setDismissedPresetNonce] = useState<number | null>(null);

  const activeLesson = LESSONS.find((l) => l.id === selectedId) ?? LESSONS[0];
  const supportsD3Explorer = SIGNAL_LESSONS_WITH_D3.includes(activeLesson.id);

  useEffect(() => {
    setIsTrackingStudy(true);
    return () => setIsTrackingStudy(false);
  }, [setIsTrackingStudy]);

  useEffect(() => {
    if (!initialPreset) return;
    setSelectedId(initialPreset.lessonId);
    setSimMode('module');
    setLabSection('simulators');
    setDismissedPresetNonce(null);
  }, [initialPreset]);

  useEffect(() => {
    if (!proMode && labSection === 'troubleshooting') {
      setLabSection('simulators');
    }
  }, [proMode, labSection]);

  const showPresetBanner =
    Boolean(initialPreset) &&
    initialPreset!.lessonId === selectedId &&
    dismissedPresetNonce !== initialPreset!.nonce;

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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={proMode}
              onClick={() => setProMode(!proMode)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                proMode
                  ? 'bg-sky-600 border-sky-600 text-white hover:bg-sky-700'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modalità PRO: {proMode ? 'ATTIVA' : 'OFF'}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenLesson(activeLesson.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Vai alla lezione completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Optional PRO opt-in bar or PRO Lab switcher */}
        {proMode ? (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setLabSection('simulators')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  labSection === 'simulators'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Simulatori dei {LESSONS.length} Moduli
              </button>
              <button
                type="button"
                onClick={() => setLabSection('troubleshooting')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  labSection === 'troubleshooting'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Trova il Guasto (Banco Diagnostico PRO)</span>
              </button>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Modalità PRO attiva: banco guasti con multimetro virtuale sbloccato.
            </span>
          </div>
        ) : (
          <div className="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-slate-700 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-slate-100">Modalità PRO (opzionale):</strong>{' '}
              sblocca il banco diagnostico <em>&ldquo;Trova il guasto&rdquo;</em> con sonde sul circuito, i preset diretti da <em>Utilità</em> e QRN/QRM nel Trainer Morse.
            </div>
            <button
              type="button"
              onClick={() => {
                setProMode(true);
                setLabSection('troubleshooting');
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Attiva Modalità PRO
            </button>
          </div>
        )}

        {labSection === 'simulators' && (
          <>
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
          </>
        )}
      </div>

      {showPresetBanner && initialPreset && (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/30 px-4 py-3 flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200">
          <span>
            <strong>Valori caricati dai Calcolatori (PRO):</strong> {initialPreset.summary}
          </span>
          <button
            type="button"
            onClick={() => setDismissedPresetNonce(initialPreset.nonce)}
            aria-label="Chiudi avviso valori"
            className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {proMode && labSection === 'troubleshooting' ? (
        <TroubleshootingLab />
      ) : supportsD3Explorer && simMode === 'd3-wave' ? (
        <D3SineWaveSimulator
          lessonContext={activeLesson.id}
          onChallengeComplete={() => void markSectionCompleted(activeLesson.id, 'simulator')}
        />
      ) : (
        <SimulatorRouter
          simulatorId={activeLesson.simulatorId}
          preset={initialPreset}
          onChallengeComplete={() => void markSectionCompleted(activeLesson.id, 'simulator')}
        />
      )}
    </div>
  );
};
