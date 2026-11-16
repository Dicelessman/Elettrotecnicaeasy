import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Brain,
  Calculator,
  CheckCircle2,
  Layers,
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
import { generateParametricQuestions } from '../utils/parametricQuiz';
import { SMART_GLOSSARY_ENTRIES, type SmartGlossaryEntry } from '../utils/smartGlossary';

interface QuickReviewViewProps {
  onOpenLesson: (lessonId: LessonId) => void;
  onBackToPath: () => void;
}

type ReviewMode = 'random' | 'errors' | 'flashcards';
type FlashcardFilter = 'to-learn' | 'all';

interface ReviewQuestionItem extends QuizQuestion {
  lessonId: LessonId;
  lessonNumber: number;
  lessonShortTitle: string;
  isParametric?: boolean;
}

const LESSON_META_MAP = LESSONS.reduce<Record<LessonId, { number: number; shortTitle: string }>>(
  (acc, lesson) => {
    acc[lesson.id] = { number: lesson.number, shortTitle: lesson.shortTitle };
    return acc;
  },
  {} as Record<LessonId, { number: number; shortTitle: string }>
);

function shuffleItems<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildRandomDeck(
  completedLessons: LessonDefinition[],
  includeParametric: boolean,
  count = 5
): ReviewQuestionItem[] {
  if (completedLessons.length === 0) return [];
  const allowedIds = completedLessons.map((l) => l.id);

  const staticPool: ReviewQuestionItem[] = [];
  for (const lesson of completedLessons) {
    for (const q of lesson.quiz) {
      staticPool.push({
        ...q,
        lessonId: lesson.id,
        lessonNumber: lesson.number,
        lessonShortTitle: lesson.shortTitle,
      });
    }
  }

  let parametricItems: ReviewQuestionItem[] = [];
  if (includeParametric) {
    const generated = generateParametricQuestions(2, allowedIds);
    parametricItems = generated.map((item) => {
      const meta = LESSON_META_MAP[item.lessonId] ?? { number: 1, shortTitle: 'Radio' };
      return {
        ...item.question,
        lessonId: item.lessonId,
        lessonNumber: meta.number,
        lessonShortTitle: meta.shortTitle,
        isParametric: true,
      };
    });
  }

  const staticNeeded = Math.max(0, count - parametricItems.length);
  const pickedStatic = shuffleItems(staticPool).slice(0, Math.min(staticNeeded, staticPool.length));
  return shuffleItems([...pickedStatic, ...parametricItems]);
}

function buildErrorsDeck(wrongQuestionIds: string[], limit = 10): ReviewQuestionItem[] {
  if (wrongQuestionIds.length === 0) return [];
  const wrongSet = new Set(wrongQuestionIds);
  const matched: ReviewQuestionItem[] = [];

  for (const lesson of LESSONS) {
    for (const q of lesson.quiz) {
      if (wrongSet.has(q.id)) {
        matched.push({
          ...q,
          lessonId: lesson.id,
          lessonNumber: lesson.number,
          lessonShortTitle: lesson.shortTitle,
        });
      }
    }
  }

  return shuffleItems(matched).slice(0, limit);
}

export const QuickReviewView: React.FC<QuickReviewViewProps> = ({
  onOpenLesson,
  onBackToPath,
}) => {
  const {
    profile,
    lessonProgress,
    recordQuickReviewResult,
    recordQuestionOutcomes,
    toggleFlashcardMastered,
    setIsTrackingStudy,
  } = useStudy();
  const prefersReducedMotion = useReducedMotion();

  const [mode, setMode] = useState<ReviewMode>('random');
  const [includeParametric, setIncludeParametric] = useState(true);

  const completedLessons = useMemo(
    () => LESSONS.filter((l) => lessonProgress[l.id]?.completed),
    [lessonProgress]
  );

  // Quiz deck state (shared for 'random' and 'errors')
  const [deck, setDeck] = useState<ReviewQuestionItem[]>(() =>
    buildRandomDeck(completedLessons, true, 5)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const [outcome, setOutcome] = useState<QuickReviewOutcome | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Flashcards state
  const [flashcardFilter, setFlashcardFilter] = useState<FlashcardFilter>('to-learn');
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Track active study time while inside Quick Review
  useEffect(() => {
    setIsTrackingStudy(true);
    return () => setIsTrackingStudy(false);
  }, [setIsTrackingStudy]);

  // Populate random deck automatically if completedLessons hydrate after auth loads
  useEffect(() => {
    if (mode === 'random' && deck.length === 0 && completedLessons.length > 0 && !finished) {
      setDeck(buildRandomDeck(completedLessons, includeParametric, 5));
      setCurrentIndex(0);
      setAnswers({});
    }
  }, [mode, completedLessons, deck.length, finished, includeParametric]);

  const startFreshRandom = useCallback(
    (withParametric = includeParametric) => {
      setDeck(buildRandomDeck(completedLessons, withParametric, 5));
      setCurrentIndex(0);
      setAnswers({});
      setFinished(false);
      setOutcome(null);
    },
    [completedLessons, includeParametric]
  );

  const startErrorsTraining = useCallback(() => {
    setDeck(buildErrorsDeck(profile.wrongQuestionIds, 10));
    setCurrentIndex(0);
    setAnswers({});
    setFinished(false);
    setOutcome(null);
  }, [profile.wrongQuestionIds]);

  const handleSwitchMode = (nextMode: ReviewMode) => {
    setMode(nextMode);
    setFinished(false);
    setOutcome(null);
    setCurrentIndex(0);
    setAnswers({});
    if (nextMode === 'random') {
      setDeck(buildRandomDeck(completedLessons, includeParametric, 5));
    } else if (nextMode === 'errors') {
      setDeck(buildErrorsDeck(profile.wrongQuestionIds, 10));
    } else {
      setFlashcardIndex(0);
      setIsFlipped(false);
    }
  };

  const masteredSet = useMemo(
    () => new Set(profile.masteredFlashcards),
    [profile.masteredFlashcards]
  );

  const flashcardDeck: SmartGlossaryEntry[] = useMemo(() => {
    if (flashcardFilter === 'to-learn') {
      return SMART_GLOSSARY_ENTRIES.filter((entry) => !masteredSet.has(entry.id));
    }
    return SMART_GLOSSARY_ENTRIES;
  }, [flashcardFilter, masteredSet]);

  useEffect(() => {
    if (flashcardIndex >= flashcardDeck.length && flashcardDeck.length > 0) {
      setFlashcardIndex(0);
      setIsFlipped(false);
    }
  }, [flashcardDeck.length, flashcardIndex]);

  const totalPoolQuestions = completedLessons.reduce((acc, l) => acc + l.quiz.length, 0);
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
    const wrongIds = deck
      .filter((q) => !q.id.startsWith('param-') && answers[q.id] !== q.correctIndex)
      .map((q) => q.id);
    const correctIds = deck
      .filter((q) => !q.id.startsWith('param-') && answers[q.id] === q.correctIndex)
      .map((q) => q.id);

    setSubmitting(true);
    try {
      const label = mode === 'errors' ? 'Allenamento Errori' : undefined;
      const res = await recordQuickReviewResult(correctCount, touchedIds, deck.length, label);
      await recordQuestionOutcomes(wrongIds, correctIds);
      const promoted = res.newRankLevel > res.previousRankLevel;
      triggerGamificationFeedback(
        promoted
          ? 'badgeUnlock'
          : correctCount >= Math.ceil(deck.length * 0.6)
            ? 'quizPass'
            : 'quizTryAgain',
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

  const activeFlashcard = flashcardDeck[flashcardIndex] ?? null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Top navigation & mode switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToPath}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Torna al Percorso</span>
        </button>

        {mode === 'random' && completedLessons.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums">
              Bacino: {totalPoolQuestions} dom. ({completedLessons.length}{' '}
              {completedLessons.length === 1 ? 'modulo' : 'moduli'})
            </span>
            <button
              type="button"
              onClick={() => startFreshRandom()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Nuove 5 domande</span>
            </button>
          </div>
        )}

        {mode === 'errors' && profile.wrongQuestionIds.length > 0 && (
          <button
            type="button"
            onClick={startErrorsTraining}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Rimescola Errori</span>
          </button>
        )}
      </div>

      {/* 3-Tab Mode Switcher */}
      <div
        role="tablist"
        aria-label="Modalità di ripasso"
        className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'random'}
          onClick={() => handleSwitchMode('random')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            mode === 'random'
              ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Brain className="w-4 h-4 shrink-0" />
          <span>Ripasso Veloce (5)</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mode === 'errors'}
          onClick={() => handleSwitchMode('errors')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            mode === 'errors'
              ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Allenamento Errori ({profile.wrongQuestionIds.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mode === 'flashcards'}
          onClick={() => handleSwitchMode('flashcards')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            mode === 'flashcards'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>
            Flashcard ({profile.masteredFlashcards.length}/{SMART_GLOSSARY_ENTRIES.length})
          </span>
        </button>
      </div>

      {/* MODE 3: GLOSSARY FLASHCARDS */}
      {mode === 'flashcards' ? (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                Flashcard del Glossario Intelligente
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Clicca sulla scheda per girarla e verifica se ricordi significato, formula e consiglio d&apos;esame.
              </p>
            </div>

            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setFlashcardFilter('to-learn');
                  setFlashcardIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1.5 rounded-md font-medium cursor-pointer ${
                  flashcardFilter === 'to-learn'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Da ripassare ({SMART_GLOSSARY_ENTRIES.length - profile.masteredFlashcards.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFlashcardFilter('all');
                  setFlashcardIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1.5 rounded-md font-medium cursor-pointer ${
                  flashcardFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Tutte ({SMART_GLOSSARY_ENTRIES.length})
              </button>
            </div>
          </div>

          {!activeFlashcard ? (
            <div className="py-10 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Hai segnato tutte le flashcard come imparate!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                Ottimo lavoro! Puoi passare al filtro &ldquo;Tutte&rdquo; per un ripasso generale quando vuoi.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFlashcardFilter('all');
                  setFlashcardIndex(0);
                  setIsFlipped(false);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
              >
                Mostra tutte le {SMART_GLOSSARY_ENTRIES.length} flashcard
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                <span>
                  Modulo {String(activeFlashcard.lessonNumber).padStart(2, '0')} ·{' '}
                  {activeFlashcard.lessonShortTitle}
                </span>
                <span>
                  Scheda {flashcardIndex + 1} / {flashcardDeck.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsFlipped((f) => !f)}
                className={`w-full min-h-[220px] rounded-xl border p-6 sm:p-8 text-left transition-colors cursor-pointer flex flex-col justify-between gap-4 ${
                  isFlipped
                    ? 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-sky-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-sky-700 dark:text-sky-400">
                    {activeFlashcard.kindLabel} · {activeFlashcard.category}
                  </span>
                  <span>{isFlipped ? 'Retro · Definizione' : 'Fronte · Clicca per girare'}</span>
                </div>

                {!isFlipped ? (
                  <div className="py-4 text-center space-y-2">
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
                      {activeFlashcard.term}
                    </div>
                    {activeFlashcard.symbol && (
                      <div className="font-mono text-sm text-sky-700 dark:text-sky-400">
                        Simbolo: {activeFlashcard.symbol}
                        {activeFlashcard.unit ? ` (${activeFlashcard.unit})` : ''}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
                      Prova a spiegarlo ad alta voce, poi tocca la scheda per verificare.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-base font-bold text-slate-900 dark:text-slate-50">
                      {activeFlashcard.term}
                      {activeFlashcard.formula && (
                        <span className="ml-2 font-mono text-xs px-2 py-0.5 rounded bg-slate-900 text-white">
                          {activeFlashcard.formula}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {activeFlashcard.definition}
                    </p>
                    {activeFlashcard.examTip && (
                      <p className="text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                        <strong>Esame:</strong> {activeFlashcard.examTip}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>
                    {masteredSet.has(activeFlashcard.id)
                      ? 'Stato: Già imparata'
                      : 'Stato: Da consolidare'}
                  </span>
                  <span>Tocca la scheda per ruotare ↻</span>
                </div>
              </button>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={flashcardDeck.length <= 1}
                    onClick={() => {
                      setIsFlipped(false);
                      setFlashcardIndex((i) => (i - 1 + flashcardDeck.length) % flashcardDeck.length);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-40"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Precedente</span>
                  </button>
                  <button
                    type="button"
                    disabled={flashcardDeck.length <= 1}
                    onClick={() => {
                      setIsFlipped(false);
                      setFlashcardIndex((i) => (i + 1) % flashcardDeck.length);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-40"
                  >
                    <span>Prossima</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenLesson(activeFlashcard.primaryLessonId)}
                    className="px-3 py-2 text-xs font-medium text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    Apri Modulo {String(activeFlashcard.lessonNumber).padStart(2, '0')} →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void toggleFlashcardMastered(activeFlashcard.id);
                      setIsFlipped(false);
                    }}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                      masteredSet.has(activeFlashcard.id)
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {masteredSet.has(activeFlashcard.id)
                        ? 'Imparata (annulla)'
                        : 'Segna come imparata'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      ) : mode === 'random' && completedLessons.length === 0 ? (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center mx-auto">
            <Brain className="w-6 h-6 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
              Ripasso Veloce · 5 Domande
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mx-auto">
              Questa modalità estrae a caso 5 domande solo dai moduli che hai già completato, così puoi tenere allenata la memoria in 2 minuti al giorno. Nel frattempo puoi già allenarti con le Flashcard del Glossario qui sopra!
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Completa il quiz finale (≥ 70%) di almeno 1 modulo per sbloccare il Ripasso Veloce.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onOpenLesson(LESSONS[0].id)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
            >
              <span>Inizia Modulo 01: {LESSONS[0].shortTitle}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      ) : mode === 'errors' && deck.length === 0 && !finished ? (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              Nessun errore in coda da ripassare!
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
              Ogni volta che sbagli una domanda nei quiz di fine lezione, nel Ripasso Veloce o nella Simulazione d&apos;Esame, viene salvata automaticamente qui per allenarla finché non la rispondi correttamente.
            </p>
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => handleSwitchMode('random')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
            >
              <span>Passa al Ripasso Veloce</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      ) : !finished && currentQuestion ? (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
          {/* Parametric toggle bar for random mode */}
          {mode === 'random' && (
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
              <label className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeParametric}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setIncludeParametric(next);
                    startFreshRandom(next);
                  }}
                  className="w-4 h-4 accent-sky-600 cursor-pointer"
                />
                <Calculator className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Includi calcoli numerici dinamici (valori casuali)</span>
              </label>
              {currentQuestion.isParametric && (
                <span className="font-mono text-[11px] font-semibold text-sky-700 dark:text-sky-400">
                  Calcolo generato al volo
                </span>
              )}
            </div>
          )}

          {/* Header + Progress bar */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-sky-700 dark:text-sky-400">
                {mode === 'errors' ? 'Allenamento Errori' : 'Ripasso Veloce'} · Modulo{' '}
                {String(currentQuestion.lessonNumber).padStart(2, '0')} —{' '}
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
              <span>
                {mode === 'errors'
                  ? 'Sessione Allenamento Errori Completata'
                  : 'Allenamento di Memoria Completato'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Risultato {mode === 'errors' ? 'Recupero Errori' : 'Ripasso Veloce'}: {correctCount}/
              {deck.length} ({scorePercent}%)
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {mode === 'errors'
                ? 'Le risposte corrette di questa sessione sono state rimosse dalla tua lista degli errori.'
                : scorePercent >= 80
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
              Riepilogo delle {deck.length} domande
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
              onClick={mode === 'errors' ? startErrorsTraining : () => startFreshRandom()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {mode === 'errors' ? 'Ripeti sugli errori rimasti' : 'Nuovo Ripasso da 5 Domande'}
              </span>
            </button>
          </div>
        </motion.section>
      )}
    </div>
  );
};
