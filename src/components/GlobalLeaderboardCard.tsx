import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Crown,
  Medal,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import { LESSONS, SCOUT_RANKS } from '../data/curriculum';
import { useStudy } from '../context/StudyContext';
import type { LeaderboardEntry } from '../types/radiolab';
import { getIsoWeekKey } from '../utils/weeklyChallenges';

interface GlobalLeaderboardCardProps {
  onOpenGroups: () => void;
  onOpenProfile: () => void;
}

type LeaderboardScope = 'groups' | 'all';
type LeaderboardPeriod = 'allTime' | 'weekly';

interface RankedEntry extends LeaderboardEntry {
  studyGroupsCount: number;
  effectiveWeeklyXp: number;
}

export const GlobalLeaderboardCard: React.FC<GlobalLeaderboardCardProps> = ({
  onOpenGroups,
  onOpenProfile,
}) => {
  const {
    user,
    profile,
    lessonProgress,
    leaderboardEntries,
    studyGroups,
    studyGroupMembers,
    currentRank,
    signInWithGoogle,
  } = useStudy();

  const [scope, setScope] = useState<LeaderboardScope>('groups');
  const [period, setPeriod] = useState<LeaderboardPeriod>('allTime');
  const currentWeekKey = getIsoWeekKey();
  const totalBadgeSlots = LESSONS.length + 4;

  const completedCount = useMemo(
    () => Object.values(lessonProgress).filter((lp) => lp.completed).length,
    [lessonProgress]
  );

  const { groupRanking, allRanking } = useMemo(() => {
    const groupMap = new Map<string, RankedEntry>();
    const allMap = new Map<string, RankedEntry>();

    // 1. Seed from real /leaderboard documents
    for (const entry of leaderboardEntries) {
      const effectiveWeeklyXp =
        entry.weeklyXpWeekKey === currentWeekKey ? Math.max(0, entry.weeklyXp ?? 0) : 0;
      const normalized: RankedEntry = {
        ...entry,
        studyGroupsCount: Math.max(0, entry.studyGroupsCount ?? 0),
        effectiveWeeklyXp,
      };
      allMap.set(entry.userId, normalized);
      if (normalized.studyGroupsCount > 0) {
        groupMap.set(entry.userId, normalized);
      }
    }

    // 2. Merge live members from user's joined /studyGroups/*/members
    // so newly joined teammates appear immediately even before their /leaderboard sync settles
    const groupIdsByUser = new Map<string, Set<string>>();
    const bestMemberSnapshot = new Map<
      string,
      {
        displayName: string;
        xp: number;
        rankLevel: number;
        completedLessonsCount: number;
        badgesCount: number;
      }
    >();

    for (const [groupId, members] of Object.entries(studyGroupMembers)) {
      for (const m of members) {
        let gSet = groupIdsByUser.get(m.userId);
        if (!gSet) {
          gSet = new Set<string>();
          groupIdsByUser.set(m.userId, gSet);
        }
        gSet.add(groupId);

        const prev = bestMemberSnapshot.get(m.userId);
        if (!prev || m.xp >= prev.xp) {
          bestMemberSnapshot.set(m.userId, {
            displayName: m.displayName,
            xp: m.xp,
            rankLevel: m.rankLevel,
            completedLessonsCount: m.completedLessons.length,
            badgesCount: m.badgesCount,
          });
        }
      }
    }

    for (const [uid, gSet] of groupIdsByUser.entries()) {
      const snap = bestMemberSnapshot.get(uid);
      if (!snap) continue;
      const existing = groupMap.get(uid) ?? allMap.get(uid);
      const merged: RankedEntry = {
        userId: uid,
        nickname: existing && existing.xp > snap.xp ? existing.nickname : snap.displayName,
        xp: existing ? Math.max(existing.xp, snap.xp) : snap.xp,
        rankLevel: existing
          ? Math.max(existing.rankLevel, snap.rankLevel)
          : snap.rankLevel,
        completedLessonsCount: existing
          ? Math.max(existing.completedLessonsCount, snap.completedLessonsCount)
          : snap.completedLessonsCount,
        badgesCount: existing
          ? Math.max(existing.badgesCount, snap.badgesCount)
          : snap.badgesCount,
        studyGroupsCount: Math.max(existing?.studyGroupsCount ?? 0, gSet.size),
        effectiveWeeklyXp: existing?.effectiveWeeklyXp ?? 0,
        isPublic: true,
      };
      groupMap.set(uid, merged);
      allMap.set(uid, merged);
    }

    // 3. Reflect current signed-in user's freshest local XP/progress if in a group or opt-in
    if (user) {
      const myWeeklyXp =
        profile.weeklyXpWeekKey === currentWeekKey ? Math.max(0, Math.round(profile.weeklyXp)) : 0;
      const myLiveEntry: RankedEntry = {
        userId: user.uid,
        nickname: (profile.displayName.trim() || 'Radio Studente').slice(0, 40),
        xp: Math.round(profile.xp),
        rankLevel: currentRank.level,
        completedLessonsCount: completedCount,
        badgesCount: profile.unlockedBadges.length,
        studyGroupsCount: studyGroups.length,
        weeklyXpWeekKey: currentWeekKey,
        weeklyXp: myWeeklyXp,
        effectiveWeeklyXp: myWeeklyXp,
        isPublic: profile.shareInLeaderboard || studyGroups.length > 0,
      };

      if (studyGroups.length > 0) {
        groupMap.set(user.uid, myLiveEntry);
        allMap.set(user.uid, myLiveEntry);
      } else if (profile.shareInLeaderboard) {
        allMap.set(user.uid, myLiveEntry);
      }
    }

    const sortEntries = (list: RankedEntry[]) =>
      list.sort((a, b) => {
        if (period === 'weekly') {
          return (
            b.effectiveWeeklyXp - a.effectiveWeeklyXp ||
            b.xp - a.xp ||
            b.completedLessonsCount - a.completedLessonsCount ||
            a.nickname.localeCompare(b.nickname, 'it')
          );
        }
        return (
          b.xp - a.xp ||
          b.completedLessonsCount - a.completedLessonsCount ||
          b.badgesCount - a.badgesCount ||
          a.nickname.localeCompare(b.nickname, 'it')
        );
      });

    return {
      groupRanking: sortEntries(Array.from(groupMap.values())),
      allRanking: sortEntries(Array.from(allMap.values())),
    };
  }, [
    leaderboardEntries,
    studyGroupMembers,
    user,
    profile.displayName,
    profile.xp,
    profile.weeklyXpWeekKey,
    profile.weeklyXp,
    profile.unlockedBadges.length,
    profile.shareInLeaderboard,
    currentRank.level,
    completedCount,
    studyGroups.length,
    currentWeekKey,
    period,
  ]);

  const activeRanking = scope === 'groups' ? groupRanking : allRanking;
  const topTen = activeRanking.slice(0, 10);
  const getShownXp = (entry: RankedEntry) =>
    period === 'weekly' ? entry.effectiveWeeklyXp : entry.xp;
  const topXp = Math.max(1, topTen[0] ? getShownXp(topTen[0]) : 1);

  const myIndex = user ? activeRanking.findIndex((e) => e.userId === user.uid) : -1;
  const myRankPosition = myIndex >= 0 ? myIndex + 1 : null;
  const myEntry = myIndex >= 0 ? activeRanking[myIndex] : null;
  const tenthXp = topTen.length === 10 ? getShownXp(topTen[9]) : null;
  const xpToTopTen =
    myEntry && myRankPosition && myRankPosition > 10 && tenthXp !== null
      ? Math.max(1, tenthXp - getShownXp(myEntry) + 1)
      : null;

  const hasExtraPublicUsers = allRanking.length > groupRanking.length;

  return (
    <section
      aria-labelledby="global-leaderboard-heading"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <h2
              id="global-leaderboard-heading"
              className="text-lg font-bold text-slate-900 dark:text-slate-50"
            >
              Classifica Globale · Top 10
            </h2>
            <span className="text-xs font-mono tabular-nums font-semibold text-amber-800 dark:text-amber-300">
              · Sistema Gruppi di Studio
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            I 10 studenti con più punti esperienza (XP) tra i partecipanti ai Gruppi di Studio: confronta gradi, moduli completati e scala la classifica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {user && (
            <div
              role="tablist"
              aria-label="Periodo classifica"
              className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={period === 'allTime'}
                onClick={() => setPeriod('allTime')}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  period === 'allTime'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Assoluta
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={period === 'weekly'}
                onClick={() => setPeriod('weekly')}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  period === 'weekly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Settimana ({currentWeekKey})
              </button>
            </div>
          )}

          {user && hasExtraPublicUsers && (
            <div
              role="tablist"
              aria-label="Filtro classifica globale"
              className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={scope === 'groups'}
                onClick={() => setScope('groups')}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  scope === 'groups'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Gruppi ({groupRanking.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={scope === 'all'}
                onClick={() => setScope('all')}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  scope === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Tutti ({allRanking.length})
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenGroups}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Gruppi di Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!user ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Accedi per consultare la Top 10 in tempo reale
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Con il tuo account Google puoi entrare nei Gruppi di Studio, scalare la Classifica Globale per XP accumulati e confrontarti con gli altri scout e studenti senza esporre dati personali.
            </p>
            <div className="text-xs font-mono tabular-nums text-sky-800 dark:text-sky-300 pt-0.5">
              Il tuo punteggio locale attuale: {profile.xp} XP · Liv. {currentRank.level} ({currentRank.title}) · {completedCount}/{LESSONS.length} moduli
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Accedi con Google
          </button>
        </div>
      ) : topTen.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Nessuno studente ancora presente nella classifica dei Gruppi di Studio
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
              Crea un gruppo per la tua squadriglia o classe, oppure unisciti con un codice invito: entrerai subito in Top 10 con i tuoi{' '}
              <span className="font-mono tabular-nums font-semibold">{profile.xp} XP</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenGroups}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Crea o Unisciti a un Gruppo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {topTen.map((entry, idx) => {
            const rankNum = idx + 1;
            const isMe = entry.userId === user.uid;
            const rankDef =
              SCOUT_RANKS.find((r) => r.level === entry.rankLevel) ?? SCOUT_RANKS[0];
            const displayedXp = getShownXp(entry);
            const barWidth = Math.max(6, Math.round((displayedXp / topXp) * 100));

            const podiumStyle =
              rankNum === 1
                ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/50 dark:bg-amber-950/20'
                : rankNum === 2
                  ? 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40'
                  : rankNum === 3
                    ? 'border-orange-200 dark:border-orange-800/70 bg-orange-50/40 dark:bg-orange-950/15'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';

            const highlightMe = isMe ? 'ring-1 ring-sky-500 dark:ring-sky-400' : '';

            return (
              <div
                key={entry.userId}
                className={`rounded-xl border px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${podiumStyle} ${highlightMe}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Rank cell */}
                  <div
                    className={`w-10 h-9 rounded-lg flex items-center justify-center gap-1 shrink-0 font-mono tabular-nums text-xs font-bold border ${
                      rankNum === 1
                        ? 'bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                        : rankNum === 2
                          ? 'bg-slate-200/80 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100'
                          : rankNum === 3
                            ? 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-200'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                    aria-label={`Posizione ${rankNum}`}
                  >
                    {rankNum === 1 ? (
                      <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                    ) : rankNum <= 3 ? (
                      <Medal
                        className={`w-3.5 h-3.5 ${
                          rankNum === 2
                            ? 'text-slate-600 dark:text-slate-300'
                            : 'text-orange-600 dark:text-orange-300'
                        }`}
                      />
                    ) : null}
                    <span>#{rankNum}</span>
                  </div>

                  {/* Identity & rank */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate max-w-[200px] sm:max-w-[260px]">
                        {entry.nickname}
                      </span>
                      {isMe && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                          <UserCheck className="w-3.5 h-3.5" />
                          Tu
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>
                        Liv. {rankDef.level} · {rankDef.title}
                      </span>
                      {entry.studyGroupsCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {entry.studyGroupsCount}{' '}
                            {entry.studyGroupsCount === 1 ? 'gruppo' : 'gruppi'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metrics & XP Bar */}
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-5 pl-13 sm:pl-0 shrink-0">
                  <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    <span
                      className="inline-flex items-center gap-1"
                      title={`Moduli completati su ${LESSONS.length}`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      {entry.completedLessonsCount}/{LESSONS.length}
                    </span>
                    <span
                      className="inline-flex items-center gap-1"
                      title={`Distintivi sbloccati su ${totalBadgeSlots}`}
                    >
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      {entry.badgesCount}/{totalBadgeSlots}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 min-w-[125px] sm:min-w-[155px] justify-end">
                    <div className="hidden md:block w-20 h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          rankNum === 1
                            ? 'bg-amber-500'
                            : isMe
                              ? 'bg-sky-600'
                              : 'bg-sky-500/80 dark:bg-sky-400/80'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold font-mono tabular-nums text-sky-700 dark:text-sky-400 text-right min-w-[76px]">
                      {displayedXp} XP{period === 'weekly' ? ' sett.' : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer status for current signed-in user */}
      {user && topTen.length > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {myEntry && myRankPosition !== null ? (
            myRankPosition <= 10 ? (
              <p className="text-slate-600 dark:text-slate-300">
                Sei al{' '}
                <span className="font-mono tabular-nums font-bold text-sky-700 dark:text-sky-400">
                  #{myRankPosition} posto
                </span>{' '}
                su{' '}
                <span className="font-mono tabular-nums font-semibold">
                  {activeRanking.length}
                </span>{' '}
                {scope === 'groups' ? 'partecipanti ai Gruppi di Studio' : 'studenti in classifica'}{' '}
                con{' '}
                <span className="font-mono tabular-nums font-semibold">
                  {getShownXp(myEntry)} XP{period === 'weekly' ? ' questa settimana' : ''}
                </span>
                .
              </p>
            ) : (
              <p className="text-slate-600 dark:text-slate-300">
                La tua posizione attuale:{' '}
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                  #{myRankPosition}
                </span>{' '}
                ({getShownXp(myEntry)} XP{period === 'weekly' ? ' sett.' : ''})
                {xpToTopTen !== null && (
                  <>
                    {' '}
                    · ti mancano{' '}
                    <span className="font-mono tabular-nums font-semibold text-amber-700 dark:text-amber-300">
                      +{xpToTopTen} XP
                    </span>{' '}
                    per entrare in Top 10!
                  </>
                )}
              </p>
            )
          ) : (
            <p className="text-slate-600 dark:text-slate-300">
              {scope === 'groups'
                ? `Non fai ancora parte di un Gruppo di Studio: creane uno o inserisci un codice invito per competere con i tuoi ${profile.xp} XP.`
                : `Attiva "Partecipa alla classifica" nel tuo Profilo oppure entra in un Gruppo di Studio per comparire con i tuoi ${profile.xp} XP.`}
            </p>
          )}

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenProfile}
              className="font-medium text-slate-600 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-400 cursor-pointer"
            >
              Il tuo Profilo →
            </button>
            {studyGroups.length === 0 && (
              <button
                type="button"
                onClick={onOpenGroups}
                className="font-semibold text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
              >
                Unisciti a un Gruppo →
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
