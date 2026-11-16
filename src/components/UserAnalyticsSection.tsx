import React, { useMemo, useState } from 'react';
import { BarChart3, Clock, LineChart as LineChartIcon, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LESSONS } from '../data/curriculum';
import { useStudy } from '../context/StudyContext';
import type { QuizAttemptKind, QuizAttemptRecord } from '../types/radiolab';

type AttemptFilter = 'all' | 'lesson' | 'practice';

interface ScoreChartPoint {
  index: number;
  shortDate: string;
  fullDateTime: string;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  label: string;
  kind: QuizAttemptKind;
}

interface ModuleBarPoint {
  shortCode: string;
  moduleTitle: string;
  minutesStudied: number;
  completed: boolean;
  quizBestScore: number;
  status: 'Completato' | 'In corso' | 'Da iniziare';
}

const KIND_LABELS: Record<QuizAttemptKind, string> = {
  lesson: 'Quiz Modulo',
  review: 'Ripasso Veloce',
  exam: 'Simulazione Esame',
};

function formatAttemptDate(ms: number): { shortDate: string; fullDateTime: string } {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return {
    shortDate: `${dd}/${mm}`,
    fullDateTime: `${dd}/${mm}/${d.getFullYear()} · ${hh}:${min}`,
  };
}

interface ScoreTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: ScoreChartPoint }>;
}

const ScoreTooltip: React.FC<ScoreTooltipProps> = ({ active, payload }) => {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  const passed = point.scorePercent >= 70;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 shadow-lg text-xs space-y-1 max-w-xs">
      <div className="font-semibold text-slate-900 dark:text-slate-50">{point.label}</div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400">
        {KIND_LABELS[point.kind]} · {point.fullDateTime}
      </div>
      <div className="pt-1 flex items-center justify-between gap-4 font-mono tabular-nums">
        <span
          className={`font-bold ${
            passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
          }`}
        >
          {point.scorePercent}% ({point.correctCount}/{point.totalQuestions})
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {passed ? 'Superato' : 'Sotto 70%'}
        </span>
      </div>
    </div>
  );
};

interface ModuleTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: ModuleBarPoint }>;
}

const ModuleTimeTooltip: React.FC<ModuleTooltipProps> = ({ active, payload }) => {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 shadow-lg text-xs space-y-1 max-w-xs">
      <div className="font-semibold text-slate-900 dark:text-slate-50">
        {item.shortCode} · {item.moduleTitle}
      </div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400">Stato: {item.status}</div>
      <div className="pt-1 flex items-center justify-between gap-4 font-mono tabular-nums">
        <span className="font-bold text-sky-700 dark:text-sky-400">
          {item.minutesStudied} min studiati
        </span>
        {item.quizBestScore > 0 && (
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
            Miglior quiz: {item.quizBestScore}%
          </span>
        )}
      </div>
    </div>
  );
};

export const UserAnalyticsSection: React.FC = () => {
  const { profile, lessonProgress, quizAttempts } = useStudy();
  const [filter, setFilter] = useState<AttemptFilter>('all');

  const isDark = profile.theme === 'dark';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const axisTickColor = isDark ? '#94a3b8' : '#64748b';

  const filteredAttempts = useMemo<QuizAttemptRecord[]>(() => {
    if (filter === 'lesson') {
      return quizAttempts.filter((a) => a.kind === 'lesson');
    }
    if (filter === 'practice') {
      return quizAttempts.filter((a) => a.kind === 'review' || a.kind === 'exam');
    }
    return quizAttempts;
  }, [quizAttempts, filter]);

  const scoreSeries = useMemo<ScoreChartPoint[]>(() => {
    const recent = filteredAttempts.slice(-30);
    return recent.map((att, idx) => {
      const formatted = formatAttemptDate(att.recordedAtMs);
      return {
        index: idx + 1,
        shortDate: `#${idx + 1} · ${formatted.shortDate}`,
        fullDateTime: formatted.fullDateTime,
        scorePercent: att.scorePercent,
        correctCount: att.correctCount,
        totalQuestions: att.totalQuestions,
        label: att.label,
        kind: att.kind,
      };
    });
  }, [filteredAttempts]);

  const scoreStats = useMemo(() => {
    if (scoreSeries.length === 0) {
      return { latest: null as number | null, avg: null as number | null, best: null as number | null };
    }
    const sum = scoreSeries.reduce((acc, p) => acc + p.scorePercent, 0);
    const best = Math.max(...scoreSeries.map((p) => p.scorePercent));
    const latest = scoreSeries[scoreSeries.length - 1].scorePercent;
    return {
      latest,
      avg: Math.round(sum / scoreSeries.length),
      best,
    };
  }, [scoreSeries]);

  const moduleTimeSeries = useMemo<ModuleBarPoint[]>(() => {
    return LESSONS.map((lesson) => {
      const lp = lessonProgress[lesson.id];
      const mins = lp?.minutesStudied ?? 0;
      const completed = Boolean(lp?.completed);
      const started = completed || (lp?.completedSections?.length ?? 0) > 0 || mins > 0;
      return {
        shortCode: `M${String(lesson.number).padStart(2, '0')}`,
        moduleTitle: lesson.shortTitle,
        minutesStudied: mins,
        completed,
        quizBestScore: lp?.quizBestScore ?? 0,
        status: completed ? 'Completato' : started ? 'In corso' : 'Da iniziare',
      };
    });
  }, [lessonProgress]);

  const totalModuleMinutes = useMemo(
    () => moduleTimeSeries.reduce((acc, item) => acc + item.minutesStudied, 0),
    [moduleTimeSeries]
  );

  const topModule = useMemo(() => {
    return moduleTimeSeries.reduce<ModuleBarPoint | null>(
      (best, cur) => (!best || cur.minutesStudied > best.minutesStudied ? cur : best),
      null
    );
  }, [moduleTimeSeries]);

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Analisi Apprendimento e Statistiche (Recharts)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Evoluzione cronologica dei punteggi nei quiz e distribuzione del tempo di studio sui {moduleTimeSeries.length} moduli.
          </p>
        </div>
        <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
          {quizAttempts.length} {quizAttempts.length === 1 ? 'prova registrata' : 'prove registrate'} · {totalModuleMinutes} min totali
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 1. LineChart: Quiz Scores Over Time */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-4 sm:p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LineChartIcon className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Andamento Punteggio Quiz nel Tempo
                </h3>
              </div>

              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-[11px] font-medium">
                {(
                  [
                    { id: 'all', label: 'Tutte' },
                    { id: 'lesson', label: 'Moduli' },
                    { id: 'practice', label: 'Esami/Ripassi' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      filter === tab.id
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-2">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Ultimo</div>
                <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                  {scoreStats.latest !== null ? `${scoreStats.latest}%` : '—'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-2">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Media</div>
                <div className="text-sm font-bold font-mono tabular-nums text-sky-700 dark:text-sky-400">
                  {scoreStats.avg !== null ? `${scoreStats.avg}%` : '—'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-2">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Massimo</div>
                <div className="text-sm font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {scoreStats.best !== null ? `${scoreStats.best}%` : '—'}
                </div>
              </div>
            </div>
          </div>

          {scoreSeries.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreSeries} margin={{ top: 12, right: 16, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="shortDate"
                    tick={{ fill: axisTickColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                    minTickGap={18}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 70, 100]}
                    tickFormatter={(val) => `${val}%`}
                    tick={{ fill: axisTickColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                  />
                  <Tooltip content={<ScoreTooltip />} />
                  <ReferenceLine
                    y={70}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Soglia 70%',
                      position: 'insideTopRight',
                      fill: isDark ? '#34d399' : '#047857',
                      fontSize: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="scorePercent"
                    name="Punteggio"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={(dotProps) => {
                      const { cx, cy, payload } = dotProps;
                      if (typeof cx !== 'number' || typeof cy !== 'number') return <g key={dotProps.key} />;
                      const point = payload as ScoreChartPoint;
                      const fill =
                        point.kind === 'exam'
                          ? '#d97706'
                          : point.kind === 'review'
                            ? '#7c3aed'
                            : point.scorePercent >= 70
                              ? '#059669'
                              : '#0284c7';
                      return (
                        <circle
                          key={dotProps.key}
                          cx={cx}
                          cy={cy}
                          r={4.5}
                          fill={fill}
                          stroke={isDark ? '#0f172a' : '#ffffff'}
                          strokeWidth={1.5}
                        />
                      );
                    }}
                    activeDot={{ r: 6.5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center px-6 space-y-1.5">
              <LineChartIcon className="w-6 h-6 text-slate-400" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Nessun tentativo registrato in questa categoria
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
                Completa un quiz di fine modulo, un Ripasso Veloce o una Simulazione Esame per tracciare la curva dei tuoi punteggi.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Quiz modulo ≥70%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                Ripasso Veloce
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                Simulazione Esame
              </span>
            </div>
            <span>Ultimi {Math.min(30, filteredAttempts.length)} tentativi</span>
          </div>
        </div>

        {/* 2. BarChart: Study Time Per Module */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-4 sm:p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Tempo di Studio per Modulo (M01–M12)
                </h3>
              </div>

              <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                {totalModuleMinutes} min totali
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Modulo più approfondito</div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-50 truncate mt-0.5">
                  {topModule && topModule.minutesStudied > 0
                    ? `${topModule.shortCode} · ${topModule.moduleTitle} (${topModule.minutesStudied}m)`
                    : 'Nessuno ancora'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Moduli con studio attivo</div>
                <div className="text-xs sm:text-sm font-bold font-mono tabular-nums text-sky-700 dark:text-sky-400 mt-0.5">
                  {moduleTimeSeries.filter((m) => m.minutesStudied > 0).length} / {moduleTimeSeries.length}
                </div>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleTimeSeries} margin={{ top: 12, right: 12, left: -14, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="shortCode"
                  tick={{ fill: axisTickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                />
                <YAxis
                  allowDecimals={false}
                  tickFormatter={(val) => `${val}m`}
                  tick={{ fill: axisTickColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(14, 165, 233, 0.06)' }}
                  content={<ModuleTimeTooltip />}
                />
                <Bar dataKey="minutesStudied" name="Minuti" radius={[6, 6, 0, 0]} maxBarSize={30}>
                  {moduleTimeSeries.map((entry) => {
                    const fill = entry.completed
                      ? '#059669'
                      : entry.minutesStudied > 0
                        ? '#0284c7'
                        : isDark
                          ? '#334155'
                          : '#cbd5e1';
                    return <Cell key={entry.shortCode} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
                Modulo completato
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-600" />
                In studio
              </span>
            </div>
            <span>{totalModuleMinutes === 0 ? 'I minuti si accumulano leggendo e nei quiz' : 'Passa sul grafico per i dettagli'}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
