import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Cloud,
  Flame,
  Sparkles,
  Timer,
  Trophy,
  Users,
} from 'lucide-react';
import { LESSONS } from '../data/curriculum';
import { DOMAIN_OPTIONS } from '../data/domainContent';
import { useStudy } from '../context/StudyContext';
import type { DailyGoalMinutes, LessonId } from '../types/radiolab';
import {
  formatWeeklyCountdown,
  getFeaturedChallengeIndex,
  getIsoWeekKey,
  getWeekEndTimestamp,
  WEEKLY_CHALLENGES,
} from '../utils/weeklyChallenges';
import { BadgeGraphic } from './BadgeGraphic';
import { GlobalLeaderboardCard } from './GlobalLeaderboardCard';
import { PWAInstallButton } from './PWAInstallButton';

interface DashboardOverviewProps {
  onOpenLesson: (lessonId: LessonId) => void;
  onOpenQuickReview: () => void;
  onOpenExamSimulation: () => void;
  onOpenGroups: () => void;
  onOpenProfile: () => void;
}

const STAGES: { stage: 1 | 2 | 3 | 4; title: string; subtitle: string }[] = [
  {
    stage: 1,
    title: '01. Basi Elettriche',
    subtitle: 'Elettroni, circuiti base, tensione, batterie e prime onde radio',
  },
  {
    stage: 2,
    title: '02. Onde e Componenti Reattivi',
    subtitle: 'Condensatori, bobine, impedenza e protezione ROS della radio',
  },
  {
    stage: 3,
    title: '03. Circuiti, Filtri e Semiconduttori',
    subtitle: 'Risonanza della sintonia, decibel, diodi e transistor',
  },
  {
    stage: 4,
    title: '04. Modulazione, Antenne ed Esame',
    subtitle: 'Voce su AM/FM, taglio dei dipoli e prova finale da 10 domande',
  },
];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onOpenLesson,
  onOpenQuickReview,
  onOpenExamSimulation,
  onOpenGroups,
  onOpenProfile,
}) => {
  const {
    user,
    authError,
    profile,
    lessonProgress,
    lessonNotes,
    studyGroups,
    currentRank,
    nextRank,
    updateDailyGoal,
    signInWithGoogle,
  } = useStudy();

  const completedLessonsList = LESSONS.filter((l) => lessonProgress[l.id]?.completed);
  const completedCount = completedLessonsList.length;
  const reviewPoolSize = completedLessonsList.reduce((acc, l) => acc + l.quiz.length, 0);
  const nextLesson =
    LESSONS.find((l) => !lessonProgress[l.id]?.completed) ?? LESSONS[LESSONS.length - 1];
  const goalProgressPct = Math.min(
    100,
    Math.round((profile.todayMinutesStudied / Math.max(1, profile.dailyGoalMinutes)) * 100)
  );
  const activeDomain =
    DOMAIN_OPTIONS.find((d) => d.id === profile.exampleDomain) ?? DOMAIN_OPTIONS[0];
  const activeHook = nextLesson.domainVariants[profile.exampleDomain].hook;

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const currentWeekKey = getIsoWeekKey(new Date(nowMs));
  const weekEndMs = getWeekEndTimestamp(new Date(nowMs));
  const weeklyCountdown = formatWeeklyCountdown(weekEndMs, nowMs);
  const featuredChallengeIdx = getFeaturedChallengeIndex(currentWeekKey);
  const activeWeeklyLessons =
    profile.weeklyWeekKey === currentWeekKey ? profile.weeklyCompletedLessons : [];

  return (
    <div className="space-y-8">
      {/* Hero / Resume focal card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="max-w-2xl space-y-2.5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
            <span>Radiotecnica easy</span>
            <span aria-hidden="true">·</span>
            <span>12 Moduli Pratici</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onOpenProfile}
              className="text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
            >
              Ambito: {activeDomain.shortLabel}
            </button>
            <span aria-hidden="true">·</span>
            <span>{user ? 'Sincronizzato sul cloud' : 'Modalità anteprima locale'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            {completedCount === 0
              ? 'Parti da zero e padroneggia la radio in pochi minuti al giorno'
              : completedCount === LESSONS.length
                ? 'Hai completato tutti i 12 moduli del manuale!'
                : `Prossima tappa: Modulo ${String(nextLesson.number).padStart(2, '0')} — ${nextLesson.shortTitle}`}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {activeHook}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onOpenLesson(nextLesson.id)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>
              {lessonProgress[nextLesson.id]?.completedSections?.length
                ? 'Continua il modulo'
                : `Inizia Modulo ${String(nextLesson.number).padStart(2, '0')}`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400 text-center lg:text-right font-mono tabular-nums">
            Durata stimata: ~{nextLesson.estimatedMinutes} min
          </span>
          <PWAInstallButton variant="subtle" />
        </div>
      </section>

      {/* Cloud prompt banner when not signed in */}
      {!user && (
        <section className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Cloud className="w-5 h-5 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Sincronizza i tuoi progressi tra computer e telefono
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Puoi studiare subito qui sotto. Quando accedi con Google, XP, serie quotidiana, quiz, tema e ambito esempi si salvano sul tuo profilo multiutente.
              </p>
              {authError && (
                <p className="text-xs text-red-700 dark:text-red-400 font-medium mt-1">
                  {authError}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Collega account Google
          </button>
        </section>
      )}

      {/* 4-column KPI strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Daily Goal 5-30 min */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Obiettivo Oggi
            </span>
            <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
              {profile.todayMinutesStudied} / {profile.dailyGoalMinutes} min
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-sky-600 rounded-full transition-all"
                style={{ width: `${goalProgressPct}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1 pt-1">
            {([5, 15, 30] as DailyGoalMinutes[]).map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => void updateDailyGoal(min)}
                className={`flex-1 py-1 text-[11px] font-mono font-medium rounded border cursor-pointer transition-colors ${
                  profile.dailyGoalMinutes === min
                    ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 text-sky-900 dark:text-sky-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {min}m
              </button>
            ))}
          </div>
        </div>

        {/* KPI 2: Streak & Reminder */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Serie Quotidiana
            </span>
            <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
              {profile.streakCount} {profile.streakCount === 1 ? 'giorno' : 'giorni'}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {profile.reminderEnabled
                ? `Promemoria alle ${profile.reminderTime}`
                : 'Promemoria non ancora impostato'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenProfile}
            className="text-left text-xs font-medium text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
          >
            {profile.reminderEnabled ? 'Gestisci in Profilo →' : 'Imposta in Profilo →'}
          </button>
        </div>

        {/* KPI 3: Rank & XP */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Grado Radio
            </span>
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-50">
              Liv. {currentRank.level} · {currentRank.title}
            </div>
            <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 mt-1">
              {profile.xp} XP {nextRank ? `· Prossimo a ${nextRank.minXp} XP` : '· Grado massimo'}
            </p>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{currentRank.description}</div>
        </div>

        {/* KPI 4: Modules & Badges */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Moduli e Distintivi
            </span>
            <Award className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
              {completedCount} / {LESSONS.length} moduli
            </div>
            <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 mt-1">
              {profile.unlockedBadges.length} / 16 distintivi ({profile.unlockedBadges.filter((b) => b.startsWith('wbadge-')).length}/4 settimanali)
            </p>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all"
              style={{ width: `${Math.round((completedCount / LESSONS.length) * 100)}%` }}
            />
          </div>
        </div>
      </section>

      {/* Modalità di Allenamento: Ripasso Veloce & Simulazione Esame */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ripasso Veloce (5-Question Memory Trainer) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Ripasso Veloce · 5 Domande Casuali
              </h2>
              <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {completedCount > 0
                  ? `${reviewPoolSize} domande disponibili da ${completedCount} ${completedCount === 1 ? 'modulo completato' : 'moduli completati'}`
                  : 'Si sblocca dopo il primo modulo completato'}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-0.5">
                {completedCount > 0
                  ? 'Tieni allenata la memoria in 2 minuti con 5 domande estratte a caso dagli argomenti già superati.'
                  : 'Supera il quiz finale del primo modulo per iniziare i tuoi ripassi lampo da 5 domande casuali.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={completedCount > 0 ? onOpenQuickReview : () => onOpenLesson(nextLesson.id)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{completedCount > 0 ? 'Avvia Ripasso (5 domande)' : 'Completa Modulo 01'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Simulazione Esame (30-Question Timed Full Mock Exam) */}
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/70 rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Simulazione Esame · 30 Domande
              </h2>
              <div className="text-xs font-mono tabular-nums text-amber-800 dark:text-amber-300">
                Timer 30:00 · Soglia 70% (21/30) · Tutti i 12 moduli
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-0.5">
                Metti alla prova la tua preparazione globale con un esame completo estratto casualmente da tutto il programma, con punteggio finale e pagella per modulo.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onOpenExamSimulation}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Avvia Simulazione Esame</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Gruppi di Studio: Confronto tra scout e studenti */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Gruppi di Studio · Confronta Moduli e Quiz
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {studyGroups.length > 0
                ? `Partecipi a ${studyGroups.length} ${studyGroups.length === 1 ? 'gruppo attivo' : 'gruppi attivi'}. Confronta l’avanzamento nei 12 moduli e le statistiche quiz con i tuoi amici.`
                : 'Crea un gruppo con codice invito per la tua squadriglia o classe e confronta i 12 moduli e i punteggi quiz in tempo reale.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenGroups}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>{studyGroups.length > 0 ? 'Apri Gruppi di Studio' : 'Crea o Unisciti'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>

      {/* Classifica Globale · Top 10 Gruppi di Studio */}
      <GlobalLeaderboardCard onOpenGroups={onOpenGroups} onOpenProfile={onOpenProfile} />

      {/* Sfide settimanali (Weekly Timed Challenges) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>Sfide Settimanali</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Completa una sequenza di 3 moduli superando i rispettivi quiz (≥ 70%) prima di domenica sera per ottenere +150 XP bonus e un badge esclusivo.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold tabular-nums text-amber-800 dark:text-amber-300 shrink-0">
            <Timer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{currentWeekKey} · {weeklyCountdown}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {WEEKLY_CHALLENGES.map((ch, idx) => {
            const isFeatured = idx === featuredChallengeIdx;
            const badgeUnlocked = profile.unlockedBadges.includes(ch.badgeId);
            const doneLessonsInWeek = ch.lessonIds.filter((lid) =>
              activeWeeklyLessons.includes(lid)
            );
            const progressCount = doneLessonsInWeek.length;
            const progressPct = Math.round((progressCount / ch.lessonIds.length) * 100);
            const nextStepLessonId =
              ch.lessonIds.find((lid) => !activeWeeklyLessons.includes(lid)) ?? ch.lessonIds[0];
            const nextStepLesson = LESSONS.find((l) => l.id === nextStepLessonId) ?? LESSONS[0];

            return (
              <div
                key={ch.id}
                className={`rounded-xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                  badgeUnlocked
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-700'
                    : isFeatured
                      ? 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-400 dark:border-sky-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {isFeatured ? 'Sfida della settimana' : 'Sfida a tempo'} · +{ch.bonusXp} XP
                    </span>
                    {badgeUnlocked ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Badge esclusivo ottenuto
                      </span>
                    ) : (
                      <span className="font-mono tabular-nums font-semibold text-sky-700 dark:text-sky-400">
                        {progressCount}/3 questa settimana
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-3.5">
                    <BadgeGraphic badgeId={ch.badgeId} unlocked={badgeUnlocked} size="md" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                        {ch.title}
                      </h3>
                      <div className="text-xs font-medium text-amber-800 dark:text-amber-300">
                        Badge esclusivo: {ch.badgeTitle}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {ch.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Interactive 3-step sequence */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {ch.lessonIds.map((lid, stepIdx) => {
                      const lessonMeta = LESSONS.find((l) => l.id === lid);
                      const doneThisWeek = activeWeeklyLessons.includes(lid);
                      const isNextStep = !badgeUnlocked && lid === nextStepLessonId;
                      return (
                        <button
                          key={lid}
                          type="button"
                          onClick={() => onOpenLesson(lid)}
                          className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                            doneThisWeek
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                              : isNextStep
                                ? 'bg-white dark:bg-slate-800 border-sky-500 dark:border-sky-400 text-slate-900 dark:text-white'
                                : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-400'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 text-[11px] font-mono tabular-nums">
                            <span>
                              {stepIdx + 1}. M{String(lessonMeta?.number ?? stepIdx + 1).padStart(2, '0')}
                            </span>
                            {doneThisWeek && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                          </div>
                          <div className="text-xs font-semibold truncate mt-0.5">
                            {lessonMeta?.shortTitle}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex-1">
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          badgeUnlocked ? 'bg-emerald-600' : 'bg-sky-600'
                        }`}
                        style={{ width: `${badgeUnlocked ? 100 : progressPct}%` }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenLesson(nextStepLessonId)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      badgeUnlocked
                        ? 'bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
                        : 'bg-sky-600 text-white hover:bg-sky-700'
                    }`}
                  >
                    <span>
                      {badgeUnlocked
                        ? 'Ripassa sequenza'
                        : progressCount > 0
                          ? `Continua: M${String(nextStepLesson.number).padStart(2, '0')}`
                          : `Avvia: M${String(nextStepLesson.number).padStart(2, '0')}`}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4 Stages of the 12-Module Curriculum */}
      <div className="space-y-8">
        {STAGES.map((stageInfo) => {
          const stageLessons = LESSONS.filter((l) => l.stage === stageInfo.stage);
          return (
            <section key={stageInfo.stage} className="space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  {stageInfo.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  {stageInfo.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stageLessons.map((lesson) => {
                  const prog = lessonProgress[lesson.id];
                  const hasNote = Boolean(lessonNotes[lesson.id]?.content.trim());
                  const done = Boolean(prog?.completed);
                  const sectionsDone = prog?.completedSections?.length ?? 0;

                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => onOpenLesson(lesson.id)}
                      className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-sky-500 dark:hover:border-sky-400 transition-colors flex flex-col justify-between gap-4 cursor-pointer group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono tabular-nums">
                            Modulo {String(lesson.number).padStart(2, '0')} · ~{lesson.estimatedMinutes} min
                          </span>
                          {done ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Completato
                            </span>
                          ) : sectionsDone > 0 ? (
                            <span className="text-sky-700 dark:text-sky-400 font-medium font-mono tabular-nums">
                              {sectionsDone}/4 tappe
                            </span>
                          ) : (
                            <span>Da iniziare</span>
                          )}
                        </div>

                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
                          {lesson.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                          {lesson.subtitle}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          {lesson.sourceRef}
                          {hasNote ? ' · Appunti' : ''}
                        </span>
                        <span className="font-medium text-sky-700 dark:text-sky-400 inline-flex items-center gap-1">
                          Apri <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
