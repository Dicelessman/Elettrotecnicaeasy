import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { LESSONS, SCOUT_RANKS } from '../data/curriculum';
import { useStudy, type QuickReviewOutcome } from '../context/StudyContext';
import type { LessonDefinition, LessonId, QuizQuestion } from '../types/radiolab';
import { triggerGamificationFeedback } from '../utils/feedbackAudio';

interface QuickReviewViewProps {
  onOpenLesson: (lessonId: LessonId) => void;
  onBackToPath: () => void;
}

interface ReviewQuestionItem extends QuizQuestion {
  lessonId: LessonId;
  lessonNumber: number;
  lessonShortTitle: string;
}

function buildRandomDeck(completedLessons: LessonDefinition[], count = 5): ReviewQuestionItem[] {
  const pool: ReviewQuestionItem[] = [];
  for (const lesson of completedLessons) {
    for (const q of lesson.quiz) {
      pool.push({
        ...q,
        lessonId: lesson.id,
        lessonNumber: lesson.number,
        lessonShortTitle: lesson.shortTitle,
      });
    }
  }
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export const QuickReviewView: React.FC<QuickReviewViewProps> = ({
  onOpenLesson,
  onBackToPath,
}) => {
  const { profile, lessonProgress, recordQuickReviewResult, setIsTrackingStudy } = useStudy();
  const prefersReducedMotion = useReducedMotion();

  const completedLessons = useMemo(
    () => LESSONS.filter((l) => lessonProgress[l.id]?.completed),
    [lessonProgress]
  );

  const [deck, setDeck] = useState<ReviewQuestionItem[]>(() => buildRandomDeck(completedLessons, 5));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const [outcome, setOutcome] = useState<QuickReviewOutcome | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Track active study time while inside Quick Review
  useEffect(() => {
    setIsTrackingStudy(true);
    return () => setIsTrackingStudy(false);
  }, [setIsTrackingStudy]);

  // Populate deck automatically if completedLessons hydrate after auth loads
  useEffect(() => {
    if (deck.length === 0 && completedLessons.length > 0 && !finished) {
      setDeck(buildRandomDeck(completedLessons, 5));
      setCurrentIndex(0);
      setAnswers({});
    }
  }, [completedLessons, deck.length, finished]);

  const startFreshReview = useCallback(() => {
    setDeck(buildRandomDeck(completedLessons, 5));
    setCurrentIndex(0);
    setAnswers({});
    setFinished(false);
    setOutcome(null);
  }, [completedLessons]);

  const totalPoolQuestions = completedLessons.reduce((acc, l) => acc + l.quiz.length, 0);

  if (completedLessons.length === 0) {
    const firstLesson = LESSONS[0];
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={onBackToPath}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Torna al Percorso</span>
        </button>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 max-w-2xl mx-auto text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center mx-auto">
            <Brain className="w-6 h-6 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
              Ripasso Veloce · 5 Domande
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Questa modalità estrae a caso 5 domande solo dai moduli che hai già completato, così puoi tenere allenata la memoria in 2 minuti al giorno.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Completa il quiz finale (≥ 70%) di almeno 1 modulo per sbloccare il Ripasso Veloce.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onOpenLesson(firstLesson.id)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
            >
              <span>Inizia Modulo 01: {firstLesson.shortTitle}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>
    );
  }

  const currentQuestion = deck[currentIndex];
  const chosenIndex = currentQuestion ? answers[currentQuestion.id] : undefined;
  const hasAnsweredCurrent = typeof chosenIndex === 'number';

  const handleSelectOption = (optIdx: number) => {
    if (!currentQuestion || hasAnsweredCurrent) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optIdx }));
    triggerGamificationFeedback(
      optIdx === currentQuestion.correctIndex ? 'stepCorrect' : 'stepWrong',
      {
        soundEffectsEnabled: profile.soundEffectsEnabled,
        hapticFeedbackEnabled: profile.hapticFeedbackEnabled,
      }
    );
  };

  const handleNextOrFinish = async () => {
    if (currentIndex + 1 < deck.length) {
      setCurrentIndex((i) => i + 1);
      return;
    }
    const correctCount = deck.filter((q) => answers[q.id] === q.correctIndex).length;
    const touchedIds = Array.from(new Set(deck.map((q) => q.lessonId)));
    setSubmitting(true);
    try {
      const res = await recordQuickReviewResult(correctCount, touchedIds);
      const promoted = res.newRankLevel > res.previousRankLevel;
      triggerGamificationFeedback(
        promoted ? 'badgeUnlock' : correctCount >= 3 ? 'quizPass' : 'quizTryAgain',
        {
          soundEffectsEnabled: profile.soundEffectsEnabled,
          hapticFeedbackEnabled: profile.hapticFeedbackEnabled,
        }
      );
      setOutcome(res);
      setFinished(true);
    } finally {
      setSubmitting(false);
    }
  };

  const correctCount = deck.filter((q) => answers[q.id] === q.correctIndex).length;
  const scorePercent = deck.length > 0 ? Math.round((correctCount / deck.length) * 100) : 0;
  const promotedRank =
    outcome && outcome.newRankLevel > outcome.previousRankLevel
      ? SCOUT_RANKS.find((r) => r.level === outcome.newRankLevel) ?? null
      : null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Top navigation & context */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToPath}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Torna al Percorso</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono tabular-nums">
            Bacino: {totalPoolQuestions} domande ({completedLessons.length}{' '}
            {completedLessons.length === 1 ? 'modulo' : 'moduli'})
          </span>
          <button
            type="button"
            onClick={startFreshReview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Nuove 5 domande</span>
          </button>
        </div>
      </div>

      {!finished && currentQuestion ? (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
          {/* Header + Progress bar */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-sky-700 dark:text-sky-400">
                Ripasso Veloce · Modulo {String(currentQuestion.lessonNumber).padStart(2, '0')} —{' '}
                {currentQuestion.lessonShortTitle}
              </span>
              <span className="font-mono tabular-nums font-semibold">
                Domanda {currentIndex + 1} / {deck.length}
              </span>
            </div>

            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-600 rounded-full transition-all"
                style={{ width: `${Math.round(((currentIndex + 1) / deck.length) * 100)}%` }}
              />
            </div>
          </div>

          {/* Animated question transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: prefersReducedMotion ? 0.05 : 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 leading-snug">
                {currentQuestion.question}
              </h1>

              <div className="grid grid-cols-1 gap-2.5">
                {currentQuestion.options.map((opt, optIdx) => {
                  const isSelected = chosenIndex === optIdx;
                  const isCorrect = optIdx === currentQuestion.correctIndex;
                  let style =
                    'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-sky-500 hover:bg-sky-50/40 dark:hover:bg-slate-800';
                  if (hasAnsweredCurrent) {
                    if (isCorrect) {
                      style =
                        'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200 font-medium';
                    } else if (isSelected && !isCorrect) {
                      style =
                        'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-900 dark:text-red-200';
                    } else {
                      style =
                        'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={hasAnsweredCurrent}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`px-4 py-3 text-left text-sm rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                        hasAnsweredCurrent ? 'cursor-default' : 'cursor-pointer'
                      } ${style}`}
                    >
                      <span>{opt}</span>
                      {hasAnsweredCurrent && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      {hasAnsweredCurrent && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {hasAnsweredCurrent && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div
                    className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed ${
                      chosenIndex === currentQuestion.correctIndex
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-emerald-100'
                        : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-slate-800 dark:text-amber-100'
                    }`}
                  >
                    <strong>
                      {chosenIndex === currentQuestion.correctIndex
                        ? 'Risposta esatta! '
                        : 'Da ripassare: '}
                    </strong>
                    {currentQuestion.explanation}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenLesson(currentQuestion.lessonId)}
                      className="text-xs font-medium text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      Apri Modulo {String(currentQuestion.lessonNumber).padStart(2, '0')} →
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleNextOrFinish()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer disabled:opacity-60"
                    >
                      <span>
                        {currentIndex + 1 < deck.length
                          ? 'Prossima domanda'
                          : submitting
                            ? 'Salvataggio...'
                            : 'Completa Ripasso'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      ) : (
        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6"
        >
          <div className="flex flex-col items-center text-center space-y-2.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Trophy className="w-4 h-4" />
              <span>Allenamento di Memoria Completato</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Risultato Ripasso Veloce: {correctCount}/{deck.length} ({scorePercent}%)
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {correctCount >= 4
                ? 'Memoria ben salda sui concetti già studiati!'
                : 'Ottimo esercizio: ripassare le domande sbagliate fissa i concetti a lungo termine.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3.5 text-center">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Risposte Esatte</div>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">
                {correctCount} / {deck.length}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3.5 text-center">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">XP Ottenuti</div>
              <div className="text-lg font-bold font-mono tabular-nums text-sky-700 dark:text-sky-400 mt-0.5">
                +{outcome?.xpGained ?? 0} XP
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3.5 text-center">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Studio Registrato</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                +2 min
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

          {/* Review breakdown */}
          <div className="space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Riepilogo delle 5 domande
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {deck.map((q) => {
                const ok = answers[q.id] === q.correctIndex;
                return (
                  <div
                    key={q.id}
                    className="p-3.5 bg-white dark:bg-slate-900 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {q.question}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Modulo {String(q.lessonNumber).padStart(2, '0')} · {q.lessonShortTitle}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenLesson(q.lessonId)}
                      className="text-xs font-medium text-sky-700 dark:text-sky-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Rivedi →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onBackToPath}
              className="px-4 py-2.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              Torna al Percorso
            </button>
            <button
              type="button"
              onClick={startFreshReview}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Nuovo Ripasso da 5 Domande</span>
            </button>
          </div>
        </motion.section>
      )}
    </div>
  );
};
