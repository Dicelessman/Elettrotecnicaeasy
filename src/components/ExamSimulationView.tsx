import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { LESSONS, SCOUT_RANKS } from '../data/curriculum';
import { useStudy, type ExamSimulationOutcome } from '../context/StudyContext';
import type { LessonId, QuizQuestion } from '../types/radiolab';
import { triggerGamificationFeedback } from '../utils/feedbackAudio';
import { generateParametricQuestions } from '../utils/parametricQuiz';

interface ExamSimulationViewProps {
  onOpenLesson: (lessonId: LessonId) => void;
  onBackToPath: () => void;
}

interface ExamQuestionItem extends QuizQuestion {
  lessonId: LessonId;
  lessonNumber: number;
  lessonShortTitle: string;
}

const EXAM_DURATION_SECONDS = 30 * 60; // 30 minutes for 30 questions
const EXAM_QUESTION_COUNT = 30;
const PASS_PERCENT = 70;

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generates 30 unique questions across ALL 13 modules:
 * guarantees 2 random questions from each of the 13 modules (26),
 * plus 2 dynamic parametric numeric calculations, plus 2 leftover questions (total 30).
 */
function buildExamDeck(): ExamQuestionItem[] {
  const guaranteed: ExamQuestionItem[] = [];
  const leftovers: ExamQuestionItem[] = [];
  const lessonMetaById = new Map<LessonId, { number: number; shortTitle: string }>();

  for (const lesson of LESSONS) {
    lessonMetaById.set(lesson.id, { number: lesson.number, shortTitle: lesson.shortTitle });
    const shuffled = shuffleArray(lesson.quiz).map<ExamQuestionItem>((q) => ({
      ...q,
      lessonId: lesson.id,
      lessonNumber: lesson.number,
      lessonShortTitle: lesson.shortTitle,
    }));
    guaranteed.push(...shuffled.slice(0, 2));
    leftovers.push(...shuffled.slice(2));
  }

  const parametricQuestions: ExamQuestionItem[] = generateParametricQuestions(2).map((item) => {
    const meta = lessonMetaById.get(item.lessonId) ?? { number: 1, shortTitle: 'Radio' };
    return {
      ...item.question,
      lessonId: item.lessonId,
      lessonNumber: meta.number,
      lessonShortTitle: meta.shortTitle,
    };
  });

  const extraCount = Math.max(0, EXAM_QUESTION_COUNT - guaranteed.length - parametricQuestions.length);
  const combined = [
    ...guaranteed,
    ...parametricQuestions,
    ...shuffleArray(leftovers).slice(0, extraCount),
  ];
  return shuffleArray(combined);
}

function formatTimer(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(clamped / 60)).padStart(2, '0');
  const ss = String(clamped % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export const ExamSimulationView: React.FC<ExamSimulationViewProps> = ({
  onOpenLesson,
  onBackToPath,
}) => {
  const {
    profile,
    recordExamSimulationResult,
    recordQuestionOutcomes,
    setIsTrackingStudy,
  } = useStudy();
  const prefersReducedMotion = useReducedMotion();

  const [deck, setDeck] = useState<ExamQuestionItem[]>(() => buildExamDeck());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flaggedIds, setFlaggedIds] = useState<Record<string, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(EXAM_DURATION_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const [confirmEarlySubmit, setConfirmEarlySubmit] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<ExamSimulationOutcome | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong' | 'correct'>('all');

  const submitLockRef = useRef(false);

  // Track study session while in Exam mode
  useEffect(() => {
    setIsTrackingStudy(true);
    return () => setIsTrackingStudy(false);
  }, [setIsTrackingStudy]);

  const finishExam = useCallback(
    async (wasTimeout = false) => {
      if (submitLockRef.current || finished) return;
      submitLockRef.current = true;
      setSubmitting(true);
      setConfirmEarlySubmit(false);

      const correctCount = deck.filter((q) => answers[q.id] === q.correctIndex).length;
      const elapsedSeconds = Math.max(60, EXAM_DURATION_SECONDS - secondsRemaining);
      const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      const coveredLessons = Array.from(new Set(deck.map((q) => q.lessonId)));
      const wrongIds = deck
        .filter((q) => !q.id.startsWith('param-') && answers[q.id] !== q.correctIndex)
        .map((q) => q.id);
      const correctIds = deck
        .filter((q) => !q.id.startsWith('param-') && answers[q.id] === q.correctIndex)
        .map((q) => q.id);

      try {
        const res = await recordExamSimulationResult(
          correctCount,
          deck.length,
          elapsedMinutes,
          coveredLessons
        );
        await recordQuestionOutcomes(wrongIds, correctIds);
        const promoted = res.newRankLevel > res.previousRankLevel;
        triggerGamificationFeedback(
          res.passed ? (promoted ? 'badgeUnlock' : 'examPass') : 'quizTryAgain',
          {
            soundEffectsEnabled: profile.soundEffectsEnabled,
            hapticFeedbackEnabled: profile.hapticFeedbackEnabled,
          }
        );
        setOutcome(res);
        setTimedOut(wasTimeout);
        setFinished(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } finally {
        setSubmitting(false);
      }
    },
    [
      deck,
      answers,
      secondsRemaining,
      finished,
      recordExamSimulationResult,
      recordQuestionOutcomes,
      profile.soundEffectsEnabled,
      profile.hapticFeedbackEnabled,
    ]
  );

  // Exam countdown timer
  useEffect(() => {
    if (finished || isPaused) return;
    const interval = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [finished, isPaused]);

  // Trigger auto-finish cleanly when countdown reaches 0
  useEffect(() => {
    if (secondsRemaining === 0 && !finished && !submitLockRef.current) {
      void finishExam(true);
    }
  }, [secondsRemaining, finished, finishExam]);

  const startFreshExam = useCallback(() => {
    submitLockRef.current = false;
    setDeck(buildExamDeck());
    setCurrentIndex(0);
    setAnswers({});
    setFlaggedIds({});
    setSecondsRemaining(EXAM_DURATION_SECONDS);
    setIsPaused(false);
    setConfirmEarlySubmit(false);
    setFinished(false);
    setTimedOut(false);
    setOutcome(null);
    setReviewFilter('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const answeredCount = useMemo(
    () => deck.filter((q) => typeof answers[q.id] === 'number').length,
    [deck, answers]
  );
  const unansweredCount = deck.length - answeredCount;
  const correctCount = useMemo(
    () => deck.filter((q) => answers[q.id] === q.correctIndex).length,
    [deck, answers]
  );
  const scorePercent = deck.length > 0 ? Math.round((correctCount / deck.length) * 100) : 0;
  const passed = scorePercent >= PASS_PERCENT;
  const elapsedSeconds = Math.max(0, EXAM_DURATION_SECONDS - secondsRemaining);

  const moduleBreakdown = useMemo(() => {
    return LESSONS.map((lesson) => {
      const questions = deck.filter((q) => q.lessonId === lesson.id);
      const correct = questions.filter((q) => answers[q.id] === q.correctIndex).length;
      return {
        lessonId: lesson.id,
        number: lesson.number,
        shortTitle: lesson.shortTitle,
        total: questions.length,
        correct,
      };
    });
  }, [deck, answers]);

  const filteredReview = useMemo(() => {
    return deck
      .map((q, idx) => ({ ...q, examIndex: idx + 1 }))
      .filter((q) => {
        const isCorrect = answers[q.id] === q.correctIndex;
        if (reviewFilter === 'wrong') return !isCorrect;
        if (reviewFilter === 'correct') return isCorrect;
        return true;
      });
  }, [deck, answers, reviewFilter]);

  const promotedRank =
    outcome && outcome.newRankLevel > outcome.previousRankLevel
      ? SCOUT_RANKS.find((r) => r.level === outcome.newRankLevel) ?? null
      : null;

  const currentQuestion = deck[currentIndex];
  const timerTone =
    secondsRemaining <= 60
      ? 'text-red-700 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40'
      : secondsRemaining <= 300
        ? 'text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40'
        : 'text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';

  if (finished) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToPath}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Torna al Percorso</span>
          </button>

          <button
            type="button"
            onClick={startFreshExam}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Nuova Simulazione (30 domande)</span>
          </button>
        </div>

        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="space-y-1.5">
              <div
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  passed
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {passed ? (
                  <Trophy className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span>
                  {timedOut
                    ? 'Tempo scaduto · Consegna automatica'
                    : passed
                      ? 'Esame Simulato Superato (≥ 70%)'
                      : 'Esame Simulato Completato (Soglia 70%)'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 font-mono tabular-nums">
                Punteggio: {correctCount} / {deck.length} ({scorePercent}%)
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {passed
                  ? `Ottima padronanza trasversale su tutti i ${LESSONS.length} moduli del manuale di radiotecnica.`
                  : 'Servono almeno 21 risposte esatte su 30 (70%). Controlla i moduli più deboli qui sotto e riprova.'}
              </p>
            </div>

            <div
              className={`px-4 py-3 rounded-xl border text-center shrink-0 ${
                passed
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
              }`}
            >
              <div className="text-[11px] font-medium">Esito Prova</div>
              <div className="text-base font-bold mt-0.5">
                {passed ? 'IDONEO' : 'DA RINFORZARE'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3.5">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Risposte Esatte</div>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">
                {correctCount} / {deck.length}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3.5">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Percentuale</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                {scorePercent}%
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3.5">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Tempo Impiegato</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                {formatTimer(elapsedSeconds)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3.5">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">XP Guadagnati</div>
              <div className="text-lg font-bold font-mono tabular-nums text-sky-700 dark:text-sky-400 mt-0.5">
                +{outcome?.xpGained ?? 0} XP
              </div>
            </div>
          </div>

          {promotedRank && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="text-xs text-slate-800 dark:text-amber-100">
                <strong>Avanzamento di grado!</strong> Sei salito al Livello {promotedRank.level}:{' '}
                <strong>{promotedRank.title}</strong>.
              </div>
            </div>
          )}

          {/* Per-module breakdown across all modules */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Rendimento sui {LESSONS.length} Moduli
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {moduleBreakdown.map((m) => {
                const allOk = m.total > 0 && m.correct === m.total;
                const noneOk = m.total > 0 && m.correct === 0;
                return (
                  <button
                    key={m.lessonId}
                    type="button"
                    onClick={() => onOpenLesson(m.lessonId)}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      allOk
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400'
                        : noneOk
                          ? 'bg-red-50/50 dark:bg-red-950/25 border-red-200 dark:border-red-800 hover:border-red-400'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-sky-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-xs font-mono tabular-nums">
                      <span className="text-slate-500 dark:text-slate-400">
                        M{String(m.number).padStart(2, '0')}
                      </span>
                      <span
                        className={`font-semibold ${
                          allOk
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : noneOk
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {m.correct}/{m.total}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                      {m.shortTitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed filterable solution review */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Revisione Completa delle Risposte
              </h2>
              <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                {(
                  [
                    { id: 'all', label: `Tutte (${deck.length})` },
                    { id: 'wrong', label: `Errori (${deck.length - correctCount})` },
                    { id: 'correct', label: `Esatte (${correctCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setReviewFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      reviewFilter === tab.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredReview.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                Nessuna domanda in questo filtro.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredReview.map((q) => {
                  const chosen = answers[q.id];
                  const isOk = chosen === q.correctIndex;
                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 min-w-0">
                          {isOk ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              Domanda {q.examIndex} · Modulo {String(q.lessonNumber).padStart(2, '0')} — {q.lessonShortTitle}
                            </div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                              {q.question}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenLesson(q.lessonId)}
                          className="text-xs font-medium text-sky-700 dark:text-sky-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Ripassa →
                        </button>
                      </div>

                      <div className="text-xs space-y-1 pl-6">
                        {!isOk && (
                          <div className="text-red-700 dark:text-red-400">
                            <strong>Tua risposta:</strong>{' '}
                            {typeof chosen === 'number' ? q.options[chosen] : 'Nessuna risposta data'}
                          </div>
                        )}
                        <div className="text-emerald-700 dark:text-emerald-400">
                          <strong>Risposta corretta:</strong> {q.options[q.correctIndex]}
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                          {q.explanation}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top exam status & timer bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToPath}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Esci</span>
          </button>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Simulazione Esame · 30 Domande dai {LESSONS.length} Moduli</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Risposte date: {answeredCount} / {deck.length} · Soglia idoneità: 70% (21/30)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold tabular-nums ${timerTone}`}
            aria-label="Tempo rimasto"
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Riprendi' : 'Pausa'}</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              if (unansweredCount > 0) {
                setConfirmEarlySubmit(true);
              } else {
                void finishExam(false);
              }
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            {submitting ? 'Calcolo...' : 'Consegna Esame'}
          </button>
        </div>
      </div>

      {confirmEarlySubmit && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-amber-950 dark:text-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Mancano ancora <strong>{unansweredCount}</strong>{' '}
              {unansweredCount === 1 ? 'domanda senza risposta' : 'domande senza risposta'}. Vuoi consegnare comunque?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmEarlySubmit(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              Continua esame
            </button>
            <button
              type="button"
              onClick={() => void finishExam(false)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
            >
              Consegna e calcola punteggio
            </button>
          </div>
        </div>
      )}

      {isPaused ? (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            Simulazione in pausa
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            Il timer è fermo a <strong className="font-mono">{formatTimer(secondsRemaining)}</strong>. Riprendi quando sei pronto a continuare.
          </p>
          <button
            type="button"
            onClick={() => setIsPaused(false)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Riprendi Simulazione</span>
          </button>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Active Question Stage */}
          {currentQuestion && (
            <section className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="font-mono tabular-nums font-semibold text-sky-700 dark:text-sky-400">
                  Domanda {currentIndex + 1} di {deck.length}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setFlaggedIds((prev) => ({
                      ...prev,
                      [currentQuestion.id]: !prev[currentQuestion.id],
                    }))
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                    flaggedIds[currentQuestion.id]
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-800 dark:text-amber-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{flaggedIds[currentQuestion.id] ? 'Segnata' : 'Segna per dopo'}</span>
                </button>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 leading-snug">
                    {currentQuestion.question}
                  </h2>

                  <div className="grid grid-cols-1 gap-2.5">
                    {currentQuestion.options.map((opt, optIdx) => {
                      const isSelected = answers[currentQuestion.id] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optIdx }))
                          }
                          className={`px-4 py-3 text-left text-sm rounded-lg border transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-100 font-medium'
                              : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{opt}</span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Precedente</span>
                </button>

                {currentIndex + 1 < deck.length ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((i) => Math.min(deck.length - 1, i + 1))}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
                  >
                    <span>Prossima</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      if (unansweredCount > 0) {
                        setConfirmEarlySubmit(true);
                      } else {
                        void finishExam(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                  >
                    <span>Consegna Esame</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </section>
          )}

          {/* 30-Question Navigation Palette */}
          <aside className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Mappa delle 30 Domande
              </h2>
              <button
                type="button"
                onClick={startFreshExam}
                className="text-[11px] font-medium text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
              >
                Rimescola 30 domande
              </button>
            </div>

            <div className="grid grid-cols-6 gap-1.5">
              {deck.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = typeof answers[q.id] === 'number';
                const isFlagged = Boolean(flaggedIds[q.id]);

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg border text-xs font-mono font-semibold tabular-nums transition-colors cursor-pointer relative ${
                      isCurrent
                        ? 'border-sky-600 dark:border-sky-400 ring-2 ring-sky-500/30 bg-sky-600 text-white'
                        : isAnswered
                          ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-200'
                          : isFlagged
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-800 dark:text-amber-300'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-400'
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && !isCurrent && (
                      <span
                        aria-label="Segnata"
                        className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>Risposte salvate</span>
                <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                  {answeredCount} / {deck.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Segnate da rivedere</span>
                <span className="font-mono tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                  {Object.values(flaggedIds).filter(Boolean).length}
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
