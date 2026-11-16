import React from 'react';
import { CheckCircle2, Play, Pause, RotateCcw } from 'lucide-react';

interface SimulatorShellProps {
  title: string;
  challengeText: string;
  challengeDone: boolean;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onReset?: () => void;
  stage: React.ReactNode;
  controls: React.ReactNode;
  readouts?: React.ReactNode;
}

export const SimulatorShell: React.FC<SimulatorShellProps> = ({
  title,
  challengeText,
  challengeDone,
  isPlaying,
  onTogglePlay,
  onReset,
  stage,
  controls,
  readouts,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
            {challengeDone ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  Sfida completata: {challengeText}
                </span>
              </>
            ) : (
              <span>Obiettivo interattivo: {challengeText}</span>
            )}
          </p>
        </div>

        {(onTogglePlay || onReset) && (
          <div className="flex items-center gap-2 shrink-0">
            {onTogglePlay && (
              <button
                type="button"
                onClick={onTogglePlay}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? 'Pausa' : 'Avvia'}
              </button>
            )}
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Ripristina
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-8 p-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4 bg-white dark:bg-slate-900">
          {stage}
          {readouts && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {readouts}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 xl:col-span-4 p-5 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-5 justify-between">
          {controls}
        </div>
      </div>
    </div>
  );
};

export const ReadoutCell: React.FC<{
  label: string;
  value: string;
  sublabel?: string;
  tone?: 'neutral' | 'azure' | 'emerald' | 'amber' | 'coral';
}> = ({ label, value, sublabel, tone = 'neutral' }) => {
  const valueColor =
    tone === 'azure'
      ? 'text-sky-700 dark:text-sky-400'
      : tone === 'emerald'
        ? 'text-emerald-700 dark:text-emerald-400'
        : tone === 'amber'
          ? 'text-amber-700 dark:text-amber-400'
          : tone === 'coral'
            ? 'text-red-700 dark:text-red-400'
            : 'text-slate-900 dark:text-slate-100';

  return (
    <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-base font-semibold font-mono tabular-nums mt-0.5 ${valueColor}`}>
        {value}
      </div>
      {sublabel && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sublabel}</div>
      )}
    </div>
  );
};
