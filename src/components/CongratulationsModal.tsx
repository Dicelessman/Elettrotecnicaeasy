import React, { useEffect } from 'react';
import { ArrowRight, Sparkles, Trophy, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BADGES, SCOUT_RANKS } from '../data/curriculum';
import { WEEKLY_BADGES } from '../utils/weeklyChallenges';
import type { BadgeId, LessonDefinition, WeeklyBadgeId } from '../types/radiolab';
import { BadgeGraphic } from './BadgeGraphic';

interface CongratulationsModalProps {
  open: boolean;
  onClose: () => void;
  lesson: LessonDefinition;
  nextLesson: LessonDefinition | null;
  onOpenNextLesson: () => void;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  xpGained: number;
  newlyUnlockedBadge: BadgeId | null;
  newlyUnlockedWeeklyBadges?: WeeklyBadgeId[];
  weeklyBonusXp?: number;
  previousRankLevel: number;
  newRankLevel: number;
}

export const CongratulationsModal: React.FC<CongratulationsModalProps> = ({
  open,
  onClose,
  lesson,
  nextLesson,
  onOpenNextLesson,
  scorePercent,
  correctCount,
  totalQuestions,
  xpGained,
  newlyUnlockedBadge,
  newlyUnlockedWeeklyBadges = [],
  weeklyBonusXp = 0,
  previousRankLevel,
  newRankLevel,
}) => {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const badgeDef = BADGES.find((b) => b.id === (newlyUnlockedBadge ?? lesson.badgeId)) ?? BADGES[0];
  const unlockedWeeklyDefs = newlyUnlockedWeeklyBadges
    .map((id) => WEEKLY_BADGES.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b));
  const promotedRank =
    newRankLevel > previousRankLevel
      ? SCOUT_RANKS.find((r) => r.level === newRankLevel) ?? null
      : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="congrats-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.05 : 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="congrats-modal-title"
          onClick={onClose}
        >
          <motion.div
            key="congrats-card"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 20 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 12 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.1 }
                : { type: 'spring', stiffness: 360, damping: 28 }
            }
            className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-6 sm:p-8 space-y-5 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi finestra"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: prefersReducedMotion ? 0 : 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center space-y-3"
            >
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <Trophy className="w-4 h-4" />
                <span>Modulo {String(lesson.number).padStart(2, '0')} Superato!</span>
              </div>

              <h2
                id="congrats-modal-title"
                className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight"
              >
                Complimenti! Ottimo lavoro
              </h2>

              <p className="text-sm text-slate-600 dark:text-slate-300">
                Hai completato <strong className="text-slate-900 dark:text-white">{lesson.title}</strong> con{' '}
                <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {correctCount}/{totalQuestions} ({scorePercent}%)
                </span>
                .
              </p>
            </motion.div>

            {/* Graphic Badge Showcase */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, delay: prefersReducedMotion ? 0 : 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-5 flex flex-col sm:flex-row items-center gap-5"
            >
              <motion.div
                initial={prefersReducedMotion ? false : { scale: 0.55, rotate: -14, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.06, rotate: 2 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18, delay: prefersReducedMotion ? 0 : 0.22 }}
                className="shrink-0"
              >
                <BadgeGraphic badgeId={badgeDef.id} unlocked size="lg" />
              </motion.div>
              <div className="text-center sm:text-left space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                  {newlyUnlockedBadge ? 'Nuovo Distintivo Sbloccato' : 'Distintivo del Modulo Confermato'}
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white">{badgeDef.title}</div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {badgeDef.description}
                </p>
              </div>
            </motion.div>

            {/* Exclusive Weekly Challenge Badge(s) if unlocked */}
            {unlockedWeeklyDefs.map((wb, idx) => (
              <motion.div
                key={wb.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.32,
                  delay: prefersReducedMotion ? 0 : 0.24 + idx * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 p-5 flex flex-col sm:flex-row items-center gap-5"
              >
                <motion.div
                  initial={prefersReducedMotion ? false : { scale: 0.5, rotate: 12, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.07, rotate: -2 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 17,
                    delay: prefersReducedMotion ? 0 : 0.32 + idx * 0.08,
                  }}
                  className="shrink-0"
                >
                  <BadgeGraphic badgeId={wb.id} unlocked size="lg" />
                </motion.div>
                <div className="text-center sm:text-left space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Badge Esclusivo · Sfida Settimanale (+{weeklyBonusXp} XP)
                  </div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">{wb.title}</div>
                  <p className="text-xs text-slate-700 dark:text-amber-100 leading-relaxed">
                    {wb.description}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* XP & Rank Up summary */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: prefersReducedMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3.5 text-center"
              >
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Punti Esperienza</div>
                <div className="text-lg font-bold font-mono tabular-nums text-sky-700 dark:text-sky-400 mt-0.5">
                  +{xpGained} XP
                </div>
              </motion.div>
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: prefersReducedMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3.5 text-center"
              >
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Punteggio Quiz</div>
                <div className="text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {scorePercent}%
                </div>
              </motion.div>
            </div>

            {promotedRank && (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 360, damping: 24, delay: prefersReducedMotion ? 0 : 0.35 }}
                className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex items-center gap-3"
              >
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="text-xs text-slate-800 dark:text-amber-100">
                  <strong>Avanzamento di grado!</strong> Sei salito al Livello {promotedRank.level}:{' '}
                  <strong>{promotedRank.title}</strong>.
                </div>
              </motion.div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                Rivedi Spiegazioni
              </button>
              {nextLesson && (
                <button
                  type="button"
                  onClick={onOpenNextLesson}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
                >
                  <span>Prossimo Modulo: {nextLesson.shortTitle}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
