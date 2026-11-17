import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Cpu,
  Eye,
  EyeOff,
  HelpCircle,
  Lightbulb,
  NotebookPen,
  Sliders,
  Volume2,
  XCircle,
} from 'lucide-react';
import { BADGES, LESSONS } from '../data/curriculum';
import { DOMAIN_OPTIONS } from '../data/domainContent';
import { useStudy } from '../context/StudyContext';
import type { BadgeId, LessonId, SectionKey, WeeklyBadgeId } from '../types/radiolab';
import { triggerGamificationFeedback } from '../utils/feedbackAudio';
import type { SpeechSegment } from '../utils/speechSynthesis';
import { BadgeGraphic } from './BadgeGraphic';
import { CircuitDiagram } from './CircuitDiagram';
import { CongratulationsModal } from './CongratulationsModal';
import { GlossaryPopoverProvider, GlossaryText } from './GlossaryText';
import { LessonAudioBar } from './LessonAudioBar';
import { LessonNotesPanel } from './LessonNotesPanel';
import { D3SineWaveSimulator } from './simulators/D3SineWaveSimulator';
import { SimulatorRouter } from './simulators/SimulatorRouter';

const SIGNAL_LESSONS_WITH_D3: LessonId[] = [
  'lesson-03',
  'lesson-04',
  'lesson-07',
  'lesson-08',
  'lesson-09',
  'lesson-10',
];

interface LessonViewProps {
  lessonId: LessonId;
  onSelectLesson: (id: LessonId) => void;
  onBackToPath: () => void;
}

const STEPS: { key: SectionKey; label: string }[] = [
  { key: 'analogy', label: '1. L’Idea' },
  { key: 'simulator', label: '2. Laboratorio' },
  { key: 'formula', label: '3. La Formula' },
  { key: 'quiz', label: '4. Quiz Finale' },
];

export const LessonView: React.FC<LessonViewProps> = ({
  lessonId,
  onSelectLesson,
  onBackToPath,
}) => {
  const {
    profile,
    lessonProgress,
    lessonNotes,
    markSectionCompleted,
    recordQuizResult,
    recordQuestionOutcomes,
    touchLessonStudy,
    updateUserPreferences,
    setIsTrackingStudy,
    setActiveStudyLesson,
    activeSessionSeconds,
  } = useStudy();

  const lesson = LESSONS.find((l) => l.id === lessonId) ?? LESSONS[0];
  const lessonIdx = LESSONS.findIndex((l) => l.id === lesson.id);
  const nextLesson = LESSONS[lessonIdx + 1] ?? null;

  const domainMeta =
    DOMAIN_OPTIONS.find((d) => d.id === profile.exampleDomain) ?? DOMAIN_OPTIONS[0];
  const domainData = lesson.domainVariants[profile.exampleDomain];

  const [step, setStep] = useState<SectionKey>('analogy');
  const [simMode, setSimMode] = useState<'module' | 'd3-wave'>('module');
  const [notesOpen, setNotesOpen] = useState(false);
  const notesPanelRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeSpeechSegmentId, setActiveSpeechSegmentId] = useState<string | null>(null);
  const [speechPlayRequest, setSpeechPlayRequest] = useState<{
    segmentId: string;
    nonce: number;
  } | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [quizSummary, setQuizSummary] = useState<{
    score: number;
    correctCount: number;
    xpGained: number;
    badge: BadgeId | null;
    weeklyBadges: WeeklyBadgeId[];
    weeklyBonusXp: number;
    previousRankLevel: number;
    newRankLevel: number;
  } | null>(null);

  const prog = lessonProgress[lesson.id];
  const hasSavedNote = Boolean(lessonNotes[lesson.id]?.content.trim());
  const completedSections = prog?.completedSections ?? [];

  // Activate study timer while learner is inside a lesson
  useEffect(() => {
    setIsTrackingStudy(true);
    setActiveStudyLesson(lesson.id);
    void touchLessonStudy(lesson.id, 0);
    return () => {
      setIsTrackingStudy(false);
      setActiveStudyLesson(null);
    };
  }, [lesson.id, setIsTrackingStudy, setActiveStudyLesson, touchLessonStudy]);

  // Reset local quiz & speech state when switching lesson
  useEffect(() => {
    setStep('analogy');
    setSimMode('module');
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizSummary(null);
    setShowCongratsModal(false);
    setActiveSpeechSegmentId(null);
    setSpeechPlayRequest(null);
  }, [lesson.id]);

  // Clear active audio highlight when switching step
  useEffect(() => {
    setActiveSpeechSegmentId(null);
    setSpeechPlayRequest(null);
  }, [step]);

  // Scroll smoothly to the highlighted section/diagram while listening
  useEffect(() => {
    if (!activeSpeechSegmentId) return;
    const el = sectionRefs.current[activeSpeechSegmentId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeSpeechSegmentId]);

  const speechSegments = useMemo<SpeechSegment[]>(() => {
    if (step === 'analogy') {
      const hookText = [
        `Perché ti serve, ambito ${domainMeta.label}: ${domainData.hook}`,
        `Analogia intuitiva, ${domainData.analogyTitle}.`,
        ...domainData.analogySteps.map((line, i) => `Passo ${i + 1}: ${line}`),
      ].join(' ');

      const circuitText = [
        `${lesson.circuitBasis.title}. ${lesson.circuitBasis.summary}.`,
        'Simboli nello schema:',
        ...lesson.circuitBasis.symbols.map(
          (sym) => `${sym.name}, simbolo ${sym.symbol}: ${sym.role}`
        ),
      ].join(' ');

      const conceptSegments: SpeechSegment[] = lesson.concepts.map((c, idx) => ({
        id: `concept-${idx}`,
        label: c.title,
        text: c.tip
          ? `${c.title}. ${c.body}. Suggerimento pratico: ${c.tip}`
          : `${c.title}. ${c.body}`,
      }));

      return [
        { id: 'hook-analogy', label: 'Idea e Analogia', text: hookText },
        { id: 'circuit', label: 'Schema Elettrico e Simboli', text: circuitText },
        ...conceptSegments,
      ];
    }

    if (step === 'simulator') {
      return [
        {
          id: 'sim-guide',
          label: lesson.simulatorTitle,
          text: `Laboratorio interattivo: ${lesson.simulatorTitle}. Obiettivo della prova: ${lesson.simulatorChallenge}`,
        },
      ];
    }

    if (step === 'formula') {
      const formulaMainText = [
        `La formula da ricordare: ${lesson.formula.title}.`,
        lesson.formula.plainReading,
        'Variabili principali:',
        ...lesson.formula.variables.map((v) => `${v.name}, in ${v.unit}: ${v.meaning}`),
      ].join(' ');

      return [
        { id: 'formula-main', label: 'La Formula e le Variabili', text: formulaMainText },
        {
          id: 'formula-example',
          label: `Esempio (${domainMeta.shortLabel})`,
          text: `Esempio pratico, ambito ${domainMeta.shortLabel}: ${domainData.formulaExample}`,
        },
      ];
    }

    return lesson.quiz.map((q, qIdx) => ({
      id: `quiz-${q.id}`,
      label: `Domanda ${qIdx + 1}`,
      text: `Domanda ${qIdx + 1}: ${q.question}. Opzioni: ${q.options
        .map((opt, optIdx) => `${String.fromCharCode(65 + optIdx)}: ${opt}`)
        .join('. ')}`,
    }));
  }, [lesson, step, domainData, domainMeta.label, domainMeta.shortLabel]);

  const requestPlaySegment = (segmentId: string) => {
    setSpeechPlayRequest({ segmentId, nonce: Date.now() });
  };

  const goNextStep = async (current: SectionKey, target: SectionKey) => {
    await markSectionCompleted(lesson.id, current);
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitQuiz = async () => {
    const total = lesson.quiz.length;
    const correctCount = lesson.quiz.filter(
      (q) => quizAnswers[q.id] === q.correctIndex
    ).length;
    const score = Math.round((correctCount / total) * 100);
    setQuizSubmitted(true);
    const wrongIds = lesson.quiz
      .filter((q) => quizAnswers[q.id] !== q.correctIndex)
      .map((q) => q.id);
    const correctIds = lesson.quiz
      .filter((q) => quizAnswers[q.id] === q.correctIndex)
      .map((q) => q.id);
    const res = await recordQuizResult(lesson.id, score, correctCount, total);
    void recordQuestionOutcomes(wrongIds, correctIds);
    const hasBadgeOrPromotion =
      Boolean(res.newlyUnlockedBadge) ||
      res.newlyUnlockedWeeklyBadges.length > 0 ||
      res.newRankLevel > res.previousRankLevel;

    triggerGamificationFeedback(
      score >= 70 ? (hasBadgeOrPromotion ? 'badgeUnlock' : 'quizPass') : 'quizTryAgain',
      {
        soundEffectsEnabled: profile.soundEffectsEnabled,
        hapticFeedbackEnabled: profile.hapticFeedbackEnabled,
      }
    );

    setQuizSummary({
      score,
      correctCount,
      xpGained: res.xpGained,
      badge: res.newlyUnlockedBadge,
      weeklyBadges: res.newlyUnlockedWeeklyBadges,
      weeklyBonusXp: res.weeklyBonusXp,
      previousRankLevel: res.previousRankLevel,
      newRankLevel: res.newRankLevel,
    });
    if (score >= 70) {
      setShowCongratsModal(true);
    }
  };

  const handleRetryQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizSummary(null);
    setShowCongratsModal(false);
  };

  const allAnswered = lesson.quiz.every((q) => typeof quizAnswers[q.id] === 'number');
  const unlockedBadgeDef = quizSummary?.badge
    ? BADGES.find((b) => b.id === quizSummary.badge)
    : null;

  return (
    <GlossaryPopoverProvider currentLessonId={lesson.id} onOpenLesson={onSelectLesson}>
    <div className="space-y-6">
      {/* Top breadcrumb & timer bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToPath}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Torna al Percorso</span>
        </button>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            Sessione attiva: {Math.floor(activeSessionSeconds / 60)}:
            {String(activeSessionSeconds % 60).padStart(2, '0')}
          </span>
          <span aria-hidden="true">·</span>
          <span>Modulo {String(lesson.number).padStart(2, '0')} / {LESSONS.length}</span>
          <button
            type="button"
            onClick={() => {
              setNotesOpen(true);
              window.requestAnimationFrame(() => {
                notesPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              });
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-sans font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              hasSavedNote
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <NotebookPen className="w-3.5 h-3.5" />
            <span>{hasSavedNote ? 'Appunti salvati' : 'Appunti'}</span>
          </button>
          <button
            type="button"
            onClick={() => void updateUserPreferences({ focusMode: !profile.focusMode })}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-sans font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              profile.focusMode
                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-800 dark:text-sky-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {profile.focusMode ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Esci da Concentrazione</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Modalità Concentrazione</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lesson title & 4-step segmented navigator */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="space-y-1.5">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
            <span>{lesson.stageLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{lesson.sourceRef}</span>
            <span aria-hidden="true">·</span>
            <span>~{lesson.estimatedMinutes} min</span>
            <span aria-hidden="true">·</span>
            <span className="text-sky-700 dark:text-sky-400 font-medium">
              Ambito: {domainMeta.shortLabel}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
            {String(lesson.number).padStart(2, '0')}. {lesson.title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{lesson.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {STEPS.map((s) => {
            const active = step === s.key;
            const done = completedSections.includes(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setStep(s.key)}
                className={`px-3 py-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : done
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/70'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {done && !active && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
        <LessonAudioBar
          segments={speechSegments}
          activeSegmentId={activeSpeechSegmentId}
          onActiveSegmentChange={setActiveSpeechSegmentId}
          playRequest={speechPlayRequest}
        />

        {(step === 'analogy' || step === 'formula') && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Suggerimento: clicca sui termini tecnici sottolineati per aprire la definizione rapida dal glossario.
          </p>
        )}
      </div>

      {/* Step 1: Analogy, Circuit Basics Graphic & Concepts */}
      {step === 'analogy' && (
        <div className="space-y-6">
          <div
            ref={(el) => {
              sectionRefs.current['hook-analogy'] = el;
            }}
            className={`bg-white dark:bg-slate-900 border rounded-xl p-6 space-y-4 transition-shadow ${
              activeSpeechSegmentId === 'hook-analogy'
                ? 'border-sky-400 dark:border-sky-500 ring-2 ring-sky-500/60'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Perché ti serve ({domainMeta.label})
                  </h2>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
                    <GlossaryText text={domainData.hook} />
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => requestPlaySegment('hook-analogy')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeSpeechSegmentId === 'hook-analogy'
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{activeSpeechSegmentId === 'hook-analogy' ? 'In ascolto' : 'Ascolta'}</span>
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Analogia intuitiva: {domainData.analogyTitle}
              </h3>
              <ol className="space-y-2.5 max-w-3xl">
                {domainData.analogySteps.map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                  >
                    <span className="w-5 h-5 rounded-full bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-mono font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>
                      <GlossaryText text={line} />
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Electrical Circuit Basics Card + SVG Schematic */}
          <div
            ref={(el) => {
              sectionRefs.current['circuit'] = el;
            }}
            className={`bg-white dark:bg-slate-900 border rounded-xl p-6 space-y-4 transition-shadow ${
              activeSpeechSegmentId === 'circuit'
                ? 'border-sky-400 dark:border-sky-500 ring-2 ring-sky-500/60'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Cpu className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {lesson.circuitBasis.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                    <GlossaryText text={lesson.circuitBasis.summary} />
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => requestPlaySegment('circuit')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeSpeechSegmentId === 'circuit'
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>
                  {activeSpeechSegmentId === 'circuit' ? 'In ascolto' : 'Ascolta schema'}
                </span>
              </button>
            </div>

            <CircuitDiagram diagramId={lesson.circuitBasis.diagramId} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {lesson.circuitBasis.symbols.map((sym) => (
                <div
                  key={sym.name}
                  className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {sym.name}
                    </span>
                    <span className="font-mono text-xs font-semibold text-sky-700 dark:text-sky-400">
                      {sym.symbol}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <GlossaryText text={sym.role} />
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {lesson.concepts.map((c, idx) => {
              const segId = `concept-${idx}`;
              const isReading = activeSpeechSegmentId === segId;
              return (
                <div
                  key={c.title}
                  ref={(el) => {
                    sectionRefs.current[segId] = el;
                  }}
                  className={`bg-white dark:bg-slate-900 border rounded-xl p-5 space-y-2 transition-shadow ${
                    isReading
                      ? 'border-sky-400 dark:border-sky-500 ring-2 ring-sky-500/60'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {c.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => requestPlaySegment(segId)}
                      aria-label={`Ascolta ${c.title}`}
                      title={`Ascolta: ${c.title}`}
                      className={`p-1.5 rounded-md border transition-colors shrink-0 cursor-pointer ${
                        isReading
                          ? 'bg-sky-600 border-sky-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-300'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <GlossaryText text={c.body} />
                  </p>
                  {c.tip && (
                    <p className="text-xs text-sky-800 dark:text-sky-200 bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-800 rounded-lg p-2.5 leading-relaxed">
                      <GlossaryText text={c.tip} />
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void goNextStep('analogy', 'simulator')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer"
            >
              <span>Prova nel Laboratorio Animato (+25 XP)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Interactive Simulator */}
      {step === 'simulator' && (
        <div className="space-y-6">
          {SIGNAL_LESSONS_WITH_D3.includes(lesson.id) && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-slate-100">Strumenti sui Segnali Elettrici:</strong>{' '}
                passa liberamente tra il banco del modulo e il generatore D3.js dell’onda sinusoidale.
              </div>
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
                  {lesson.id === 'lesson-03' ? 'Oscilloscopio RF & Vettore' : 'Laboratorio del Modulo'}
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

          {simMode === 'd3-wave' && SIGNAL_LESSONS_WITH_D3.includes(lesson.id) ? (
            <D3SineWaveSimulator
              lessonContext={lesson.id}
              onChallengeComplete={() => void markSectionCompleted(lesson.id, 'simulator')}
            />
          ) : (
            <SimulatorRouter
              simulatorId={lesson.simulatorId}
              onChallengeComplete={() => void markSectionCompleted(lesson.id, 'simulator')}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep('analogy')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Torna all’Idea</span>
            </button>
            <button
              type="button"
              onClick={() => void goNextStep('simulator', 'formula')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer"
            >
              <span>Vai alla Formula Senza Paura (+25 XP)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Formula Breakdown */}
      {step === 'formula' && (
        <div className="space-y-6">
          <div
            ref={(el) => {
              sectionRefs.current['formula-main'] = el;
            }}
            className={`bg-white dark:bg-slate-900 border rounded-xl p-6 space-y-5 transition-shadow ${
              activeSpeechSegmentId === 'formula-main'
                ? 'border-sky-400 dark:border-sky-500 ring-2 ring-sky-500/60'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  La Formula da Ricordare
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mt-0.5">
                  {lesson.formula.title}
                </h2>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white font-mono text-base sm:text-lg font-semibold tabular-nums">
                  {lesson.formula.expression}
                </div>
                <button
                  type="button"
                  onClick={() => requestPlaySegment('formula-main')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeSpeechSegmentId === 'formula-main'
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{activeSpeechSegmentId === 'formula-main' ? 'In ascolto' : 'Ascolta'}</span>
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
              <GlossaryText text={lesson.formula.plainReading} />
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lesson.formula.variables.map((v) => (
                <div
                  key={v.symbol}
                  className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-sky-700 dark:text-sky-400">
                      {v.symbol}
                    </span>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {v.unit}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {v.name}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    <GlossaryText text={v.meaning} />
                  </div>
                </div>
              ))}
            </div>

            <div
              ref={(el) => {
                sectionRefs.current['formula-example'] = el;
              }}
              className={`p-4 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border text-sm text-slate-800 dark:text-emerald-100 leading-relaxed flex items-start justify-between gap-3 transition-shadow ${
                activeSpeechSegmentId === 'formula-example'
                  ? 'border-sky-400 dark:border-sky-500 ring-2 ring-sky-500/60'
                  : 'border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <div>
                <strong className="text-emerald-900 dark:text-emerald-300">
                  Esempio pratico ({domainMeta.shortLabel}):{' '}
                </strong>
                <GlossaryText text={domainData.formulaExample} />
              </div>
              <button
                type="button"
                onClick={() => requestPlaySegment('formula-example')}
                aria-label="Ascolta esempio pratico"
                title="Ascolta esempio pratico"
                className={`p-1.5 rounded-md border transition-colors shrink-0 cursor-pointer ${
                  activeSpeechSegmentId === 'formula-example'
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'bg-white/80 dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep('simulator')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Torna al Laboratorio</span>
            </button>
            <button
              type="button"
              onClick={() => void goNextStep('formula', 'quiz')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer"
            >
              <span>Inizia il Quiz Finale (10 domande) (+25 XP)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: 10-Question Quiz */}
      {step === 'quiz' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  <span>Quiz di Verifica ({lesson.quiz.length} domande)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Supera almeno il 70% (7 risposte corrette su 10) per completare il modulo e conquistare il distintivo grafico.
                </p>
              </div>
              {prog?.quizBestScore ? (
                <span className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                  Miglior risultato: {prog.quizBestScore}%
                </span>
              ) : null}
            </div>

            <div className="space-y-6">
              {lesson.quiz.map((q, qIdx) => {
                const chosen = quizAnswers[q.id];
                const segId = `quiz-${q.id}`;
                const isReadingQuestion = activeSpeechSegmentId === segId;
                return (
                  <div
                    key={q.id}
                    ref={(el) => {
                      sectionRefs.current[segId] = el;
                    }}
                    className={`space-y-2.5 pb-5 border-b border-slate-100 dark:border-slate-800 last:border-b-0 last:pb-0 rounded-lg transition-shadow ${
                      isReadingQuestion ? 'p-3 -mx-3 ring-2 ring-sky-500/60 bg-sky-50/30 dark:bg-sky-950/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {qIdx + 1}. {q.question}
                      </p>
                      <button
                        type="button"
                        onClick={() => requestPlaySegment(segId)}
                        aria-label={`Ascolta domanda ${qIdx + 1}`}
                        title={`Ascolta domanda ${qIdx + 1}`}
                        className={`p-1.5 rounded-md border transition-colors shrink-0 cursor-pointer ${
                          isReadingQuestion
                            ? 'bg-sky-600 border-sky-600 text-white'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-300'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = chosen === optIdx;
                        const isCorrect = optIdx === q.correctIndex;
                        let style =
                          'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800';
                        if (!quizSubmitted && isSelected) {
                          style =
                            'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200 font-medium';
                        } else if (quizSubmitted) {
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
                            disabled={quizSubmitted}
                            onClick={() =>
                              setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                            }
                            className={`px-4 py-2.5 text-left text-xs sm:text-sm rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                              quizSubmitted ? 'cursor-default' : 'cursor-pointer'
                            } ${style}`}
                          >
                            <span>{opt}</span>
                            {quizSubmitted && isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                            {quizSubmitted && isSelected && !isCorrect && (
                              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {quizSubmitted && (
                      <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-3 leading-relaxed">
                        <strong>Spiegazione:</strong> <GlossaryText text={q.explanation} />
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Result summary or submit CTA */}
            {quizSummary ? (
              <div
                className={`p-5 rounded-xl border space-y-3 ${
                  quizSummary.score >= 70
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                    : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-50 font-mono tabular-nums">
                      Punteggio: {quizSummary.correctCount}/{lesson.quiz.length} ({quizSummary.score}%) · +{quizSummary.xpGained} XP
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                      {quizSummary.score >= 70
                        ? 'Modulo completato con successo!'
                        : 'Serve almeno il 70% per completare il modulo: rileggi le spiegazioni e riprova.'}
                    </p>
                  </div>

                  {unlockedBadgeDef && (
                    <div className="inline-flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      <BadgeGraphic badgeId={unlockedBadgeDef.id} unlocked size="sm" />
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          Nuovo Distintivo
                        </div>
                        <div>{unlockedBadgeDef.title}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {quizSummary.score >= 70 && (
                    <button
                      type="button"
                      onClick={() => setShowCongratsModal(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Mostra Distintivo</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRetryQuiz}
                    className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Riprova il Quiz
                  </button>
                  {nextLesson && quizSummary.score >= 70 && (
                    <button
                      type="button"
                      onClick={() => onSelectLesson(nextLesson.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
                    >
                      <span>Prossimo Modulo: {nextLesson.shortTitle}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  Risposte date: {Object.keys(quizAnswers).length} / {lesson.quiz.length}
                </span>
                <button
                  type="button"
                  disabled={!allAnswered}
                  onClick={() => void handleSubmitQuiz()}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                    allAnswered
                      ? 'bg-sky-600 text-white hover:bg-sky-700 cursor-pointer'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Verifica Risposte
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Personal Markdown Notes Section (available across every step of the lesson) */}
      <LessonNotesPanel
        lesson={lesson}
        isOpen={notesOpen}
        onToggleOpen={() => setNotesOpen((v) => !v)}
        panelRef={notesPanelRef}
      />

      {/* Celebratory Modal on passing lesson quiz (>= 70%) */}
      {quizSummary && (
        <CongratulationsModal
          open={showCongratsModal}
          onClose={() => setShowCongratsModal(false)}
          lesson={lesson}
          nextLesson={nextLesson}
          onOpenNextLesson={() => {
            setShowCongratsModal(false);
            if (nextLesson) onSelectLesson(nextLesson.id);
          }}
          scorePercent={quizSummary.score}
          correctCount={quizSummary.correctCount}
          totalQuestions={lesson.quiz.length}
          xpGained={quizSummary.xpGained}
          newlyUnlockedBadge={quizSummary.badge}
          newlyUnlockedWeeklyBadges={quizSummary.weeklyBadges}
          weeklyBonusXp={quizSummary.weeklyBonusXp}
          previousRankLevel={quizSummary.previousRankLevel}
          newRankLevel={quizSummary.newRankLevel}
        />
      )}
    </div>
    </GlossaryPopoverProvider>
  );
};
