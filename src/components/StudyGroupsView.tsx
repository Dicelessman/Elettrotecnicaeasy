import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  LogIn,
  LogOut,
  Plus,
  Share2,
  Trash2,
  Trophy,
  UserMinus,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LESSONS, SCOUT_RANKS } from '../data/curriculum';
import { useStudy } from '../context/StudyContext';
import type { LessonId, StudyGroupMember } from '../types/radiolab';

interface StudyGroupsViewProps {
  onOpenLesson: (lessonId: LessonId) => void;
}

type SortKey = 'modules' | 'avgQuiz' | 'exam' | 'xp';

export const StudyGroupsView: React.FC<StudyGroupsViewProps> = ({ onOpenLesson }) => {
  const {
    user,
    profile,
    lessonProgress,
    quizAttempts,
    studyGroups,
    studyGroupMembers,
    studyGroupsLoading,
    signInWithGoogle,
    createStudyGroup,
    joinStudyGroupByCode,
    leaveStudyGroup,
    deleteStudyGroup,
    removeMemberFromGroup,
  } = useStudy();

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupDescInput, setGroupDescInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<{
    tone: 'ok' | 'err';
    text: string;
  } | null>(null);

  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinFeedback, setJoinFeedback] = useState<{
    tone: 'ok' | 'err';
    text: string;
  } | null>(null);

  const [sortBy, setSortBy] = useState<SortKey>('modules');
  const [copiedType, setCopiedType] = useState<'code' | 'invite' | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    { type: 'delete' } | { type: 'leave' } | { type: 'kick'; userId: string; name: string } | null
  >(null);
  const [busyAction, setBusyAction] = useState(false);

  useEffect(() => {
    if (studyGroups.length === 0) {
      setSelectedGroupId('');
      return;
    }
    if (!studyGroups.some((g) => g.groupId === selectedGroupId)) {
      setSelectedGroupId(studyGroups[0].groupId);
    }
  }, [studyGroups, selectedGroupId]);

  useEffect(() => {
    setConfirmAction(null);
    setCopiedType(null);
  }, [selectedGroupId]);

  const activeGroup = useMemo(
    () => studyGroups.find((g) => g.groupId === selectedGroupId) ?? null,
    [studyGroups, selectedGroupId]
  );

  const rawMembers: StudyGroupMember[] = useMemo(() => {
    if (!activeGroup) return [];
    return studyGroupMembers[activeGroup.groupId] ?? [];
  }, [activeGroup, studyGroupMembers]);

  const sortedMembers = useMemo(() => {
    const copy = [...rawMembers];
    copy.sort((a, b) => {
      if (sortBy === 'avgQuiz') {
        return (
          b.avgQuizScore - a.avgQuizScore ||
          b.completedLessons.length - a.completedLessons.length ||
          b.xp - a.xp
        );
      }
      if (sortBy === 'exam') {
        return (
          b.examBestScore - a.examBestScore ||
          b.avgQuizScore - a.avgQuizScore ||
          b.xp - a.xp
        );
      }
      if (sortBy === 'xp') {
        return b.xp - a.xp || b.completedLessons.length - a.completedLessons.length;
      }
      return (
        b.completedLessons.length - a.completedLessons.length ||
        b.avgQuizScore - a.avgQuizScore ||
        b.xp - a.xp
      );
    });
    return copy;
  }, [rawMembers, sortBy]);

  const groupSummary = useMemo(() => {
    if (rawMembers.length === 0) {
      return {
        avgCompleted: 0,
        avgQuiz: 0,
        totalXp: 0,
        totalAttempts: 0,
      };
    }
    const avgCompleted = Math.round(
      (rawMembers.reduce((acc, m) => acc + m.completedLessons.length, 0) / rawMembers.length) * 10
    ) / 10;
    const withQuizzes = rawMembers.filter((m) => m.totalQuizAttempts > 0);
    const avgQuiz =
      withQuizzes.length > 0
        ? Math.round(withQuizzes.reduce((acc, m) => acc + m.avgQuizScore, 0) / withQuizzes.length)
        : 0;
    const totalXp = rawMembers.reduce((acc, m) => acc + m.xp, 0);
    const totalAttempts = rawMembers.reduce((acc, m) => acc + m.totalQuizAttempts, 0);
    return { avgCompleted, avgQuiz, totalXp, totalAttempts };
  }, [rawMembers]);

  const chartData = useMemo(() => {
    return sortedMembers.map((m) => ({
      name:
        m.displayName.length > 14 ? `${m.displayName.slice(0, 12)}…` : m.displayName,
      fullName: m.displayName,
      completedCount: m.completedLessons.length,
      completamentoPct: Math.round((m.completedLessons.length / LESSONS.length) * 100),
      mediaQuizPct: m.avgQuizScore,
      examBestScore: m.examBestScore,
    }));
  }, [sortedMembers]);

  // Local student summary shown in signed-out state
  const localStats = useMemo(() => {
    const completedCount = LESSONS.filter((l) => lessonProgress[l.id]?.completed).length;
    const attempted = LESSONS.map((l) => lessonProgress[l.id]).filter(
      (p) => p && p.quizAttempts > 0
    );
    const avgQuiz =
      attempted.length > 0
        ? Math.round(
            attempted.reduce((acc, p) => acc + (p?.quizBestScore ?? 0), 0) / attempted.length
          )
        : 0;
    const examAttempts = quizAttempts.filter((a) => a.kind === 'exam');
    const examBest =
      examAttempts.length > 0
        ? Math.max(...examAttempts.map((a) => Math.round(a.scorePercent)))
        : null;
    return { completedCount, avgQuiz, examBest };
  }, [lessonProgress, quizAttempts]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFeedback(null);
    setCreating(true);
    try {
      const res = await createStudyGroup(groupNameInput, groupDescInput);
      if (res.ok && res.group) {
        setGroupNameInput('');
        setGroupDescInput('');
        setSelectedGroupId(res.group.groupId);
        setCreateFeedback({
          tone: 'ok',
          text: `Gruppo "${res.group.name}" creato! Codice invito: ${res.group.inviteCode}`,
        });
      } else {
        setCreateFeedback({
          tone: 'err',
          text: res.error || 'Impossibile creare il gruppo.',
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinFeedback(null);
    setJoining(true);
    try {
      const res = await joinStudyGroupByCode(inviteCodeInput);
      if (res.ok && res.groupId) {
        setInviteCodeInput('');
        setSelectedGroupId(res.groupId);
        setJoinFeedback({
          tone: 'ok',
          text: `Sei entrato nel gruppo "${res.groupName || 'Gruppo di Studio'}"!`,
        });
      } else {
        if (res.groupId) {
          setSelectedGroupId(res.groupId);
        }
        setJoinFeedback({
          tone: 'err',
          text: res.error || 'Impossibile unirsi al gruppo.',
        });
      }
    } finally {
      setJoining(false);
    }
  };

  const handleCopyCode = async (kind: 'code' | 'invite') => {
    if (!activeGroup) return;
    const text =
      kind === 'code'
        ? activeGroup.inviteCode
        : `Unisciti al mio gruppo di studio "${activeGroup.name}" su Radiotecnica easy! Codice invito: ${activeGroup.inviteCode}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(kind);
      window.setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // Clipboard API may be blocked in restricted iframes
    }
  };

  const executeConfirmedAction = async () => {
    if (!activeGroup || !confirmAction) return;
    setBusyAction(true);
    try {
      if (confirmAction.type === 'delete') {
        await deleteStudyGroup(activeGroup.groupId);
      } else if (confirmAction.type === 'leave') {
        await leaveStudyGroup(activeGroup.groupId);
      } else if (confirmAction.type === 'kick') {
        await removeMemberFromGroup(activeGroup.groupId, confirmAction.userId);
      }
      setConfirmAction(null);
    } finally {
      setBusyAction(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-8">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl space-y-2.5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
              <span>Gruppi di Studio</span>
              <span aria-hidden="true">·</span>
              <span>Confronto Moduli e Quiz</span>
              <span aria-hidden="true">·</span>
              <span>Sincronizzazione Cloud</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight text-balance">
              Studia in squadriglia o con i tuoi compagni di corso
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Crea un gruppo privato con codice invito per confrontare in tempo reale l&apos;avanzamento nei {LESSONS.length} moduli, i punteggi dei quiz e la simulazione esame con altri scout o studenti.
            </p>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Accedi con Google per iniziare</span>
            </button>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              I tuoi progressi attuali pronti per il confronto
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Non appena colleghi il tuo account Google, questi dati verranno sincronizzati automaticamente nei gruppi a cui partecipi (nessuna email condivisa).
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">Moduli completati</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {localStats.completedCount} / {LESSONS.length}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">Media Quiz</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {localStats.avgQuiz}%
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">Esame 30 dom.</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {localStats.examBest !== null ? `${localStats.examBest}%` : '—'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">Punti XP</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {profile.xp}
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const isOwner = activeGroup ? activeGroup.ownerId === user.uid : false;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-2">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
          <span>Gruppi di Studio</span>
          <span aria-hidden="true">·</span>
          <span>{LESSONS.length} Moduli &amp; Statistiche Quiz</span>
          <span aria-hidden="true">·</span>
          <span>Profilo: {profile.displayName}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight text-balance">
          Confronta i progressi con amici scout e studenti
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Crea un gruppo per la tua squadriglia o classe oppure inserisci un codice invito. Ogni gruppo condivide solo nickname, stato dei {LESSONS.length} moduli, punteggi quiz, XP e serie (nessun dato email esposto).
        </p>
      </section>

      {/* Create & Join Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Plus className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Crea un Nuovo Gruppo
            </h2>
          </div>

          <form onSubmit={(e) => void handleCreateGroup(e)} className="space-y-3">
            <div>
              <label
                htmlFor="sg-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Nome del gruppo
              </label>
              <input
                id="sg-name"
                type="text"
                required
                minLength={2}
                maxLength={60}
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                placeholder="Es. Squadriglia Aquile · Brevetto Radio"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="sg-desc"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Descrizione (opzionale)
              </label>
              <input
                id="sg-desc"
                type="text"
                maxLength={160}
                value={groupDescInput}
                onChange={(e) => setGroupDescInput(e.target.value)}
                placeholder="Es. Obiettivo esame ministeriale entro giugno"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            {createFeedback && (
              <p
                className={`text-xs font-medium rounded-lg px-3 py-2 border ${
                  createFeedback.tone === 'ok'
                    ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
                    : 'text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800'
                }`}
              >
                {createFeedback.text}
              </p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{creating ? 'Creazione...' : 'Crea Gruppo e Genera Codice'}</span>
            </button>
          </form>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <KeyRound className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Unisciti con Codice Invito
              </h2>
            </div>

            <form onSubmit={(e) => void handleJoinGroup(e)} className="space-y-3">
              <div>
                <label
                  htmlFor="sg-code"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Codice condiviso dal fondatore del gruppo
                </label>
                <input
                  id="sg-code"
                  type="text"
                  required
                  maxLength={10}
                  value={inviteCodeInput}
                  onChange={(e) =>
                    setInviteCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                  }
                  placeholder="Es. R7K4M9"
                  className="w-full px-3 py-2 text-sm font-mono uppercase tracking-widest rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {joinFeedback && (
                <p
                  className={`text-xs font-medium rounded-lg px-3 py-2 border ${
                    joinFeedback.tone === 'ok'
                      ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
                      : 'text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800'
                  }`}
                >
                  {joinFeedback.text}
                </p>
              )}

              <button
                type="submit"
                disabled={joining}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>{joining ? 'Verifica...' : 'Entra nel Gruppo'}</span>
              </button>
            </form>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-2">
            Ogni gruppo ospita fino a 30 partecipanti. I tuoi punteggi si aggiornano automaticamente dopo ogni lezione o quiz.
          </p>
        </section>
      </div>

      {/* Groups List & Selected Group Workspace */}
      {studyGroupsLoading ? (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Caricamento dei tuoi gruppi di studio...
        </section>
      ) : studyGroups.length === 0 ? (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-2">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Non fai ancora parte di nessun gruppo di studio
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Crea il primo gruppo qui sopra e condividi il codice invito di 6 caratteri con la tua squadriglia o i tuoi amici, oppure inserisci il codice che hai ricevuto.
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          {/* Group Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            {studyGroups.map((g) => {
              const active = g.groupId === activeGroup?.groupId;
              return (
                <button
                  key={g.groupId}
                  type="button"
                  onClick={() => setSelectedGroupId(g.groupId)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{g.name}</span>
                  <span className="font-mono tabular-nums text-[11px] opacity-75">
                    {g.memberIds.length}/30
                  </span>
                </button>
              );
            })}
          </div>

          {activeGroup && (
            <>
              {/* Active Group Header + Invite & Management Actions */}
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="space-y-1.5">
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                      <span>{isOwner ? 'Sei il fondatore' : `Fondatore: ${activeGroup.ownerName}`}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {activeGroup.memberIds.length} / 30 membri
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Codice invito:{' '}
                        <strong className="font-mono tracking-wider text-slate-900 dark:text-slate-100">
                          {activeGroup.inviteCode}
                        </strong>
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                      {activeGroup.name}
                    </h2>
                    {activeGroup.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {activeGroup.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleCopyCode('code')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copiedType === 'code' ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedType === 'code' ? 'Codice copiato!' : `Copia ${activeGroup.inviteCode}`}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleCopyCode('invite')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copiedType === 'invite' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedType === 'invite' ? 'Invito copiato!' : 'Copia messaggio invito'}</span>
                    </button>

                    {isOwner ? (
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ type: 'delete' })}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/70 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Elimina gruppo</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ type: 'leave' })}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:hover:bg-red-950/40 dark:hover:text-red-300 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Esci dal gruppo</span>
                      </button>
                    )}
                  </div>
                </div>

                {confirmAction && (
                  <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-medium text-red-900 dark:text-red-200">
                      {confirmAction.type === 'kick'
                        ? `Vuoi rimuovere ${confirmAction.name} dal gruppo?`
                        : confirmAction.type === 'delete'
                          ? `Vuoi eliminare definitivamente il gruppo "${activeGroup.name}" e il relativo codice invito?`
                          : `Vuoi uscire dal gruppo "${activeGroup.name}"? Potrai rientrare solo con il codice invito.`}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => setConfirmAction(null)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        Annulla
                      </button>
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => void executeConfirmedAction()}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                      >
                        {busyAction ? 'Attendere...' : 'Conferma'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Group KPI Summary Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Partecipanti attivi</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                      {rawMembers.length}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Media moduli completati</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                      {groupSummary.avgCompleted} / {LESSONS.length}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Media punteggio quiz</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                      {groupSummary.avgQuiz}%
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">XP totali del gruppo</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                      {groupSummary.totalXp}
                    </p>
                  </div>
                </div>
              </section>

              {/* Comparative Quiz & Rank Leaderboard Table */}
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>Classifica e Statistiche Quiz del Gruppo</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ordina i partecipanti per avanzamento nei moduli, rendimento nei quiz, simulazione d&apos;esame o XP.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                    {[
                      { id: 'modules' as const, label: 'Moduli' },
                      { id: 'avgQuiz' as const, label: 'Media Quiz' },
                      { id: 'exam' as const, label: 'Esame 30 dom.' },
                      { id: 'xp' as const, label: 'XP' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSortBy(opt.id)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          sortBy === opt.id
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                        <th className="py-2.5 pr-3 font-medium">#</th>
                        <th className="py-2.5 px-3 font-medium">Studente</th>
                        <th className="py-2.5 px-3 font-medium">Grado &amp; Serie</th>
                        <th className="py-2.5 px-3 font-medium">Avanzamento</th>
                        <th className="py-2.5 px-3 font-medium text-right">Media Quiz</th>
                        <th className="py-2.5 px-3 font-medium text-right">Tentativi</th>
                        <th className="py-2.5 px-3 font-medium text-right">Esame 30 dom.</th>
                        <th className="py-2.5 pl-3 font-medium text-right">XP / Studio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sortedMembers.map((member, index) => {
                        const isMe = member.userId === user.uid;
                        const rankInfo =
                          SCOUT_RANKS.find((r) => r.level === member.rankLevel) ?? SCOUT_RANKS[0];
                        const pct = Math.round(
                          (member.completedLessons.length / LESSONS.length) * 100
                        );
                        return (
                          <tr
                            key={member.userId}
                            className={isMe ? 'bg-sky-50/60 dark:bg-sky-950/25' : ''}
                          >
                            <td className="py-3 pr-3 font-mono tabular-nums font-bold text-slate-500 dark:text-slate-400">
                              #{index + 1}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                                    {member.displayName}
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {[
                                      isMe ? 'Tu' : null,
                                      member.role === 'owner' ? 'Fondatore' : 'Membro',
                                      `${member.badgesCount} badge`,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </p>
                                </div>
                                {isOwner && !isMe && (
                                  <button
                                    type="button"
                                    title={`Rimuovi ${member.displayName}`}
                                    onClick={() =>
                                      setConfirmAction({
                                        type: 'kick',
                                        userId: member.userId,
                                        name: member.displayName,
                                      })
                                    }
                                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300">
                              <p className="font-medium">{rankInfo.title}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                                Serie {member.streakCount}g
                              </p>
                            </td>
                            <td className="py-3 px-3 min-w-[140px]">
                              <div className="flex items-center justify-between text-xs font-mono tabular-nums mb-1">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {member.completedLessons.length}/{LESSONS.length}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400">{pct}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className="h-full bg-sky-600 dark:bg-sky-500 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                              {member.totalQuizAttempts > 0 ? `${member.avgQuizScore}%` : '—'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                              {member.totalQuizAttempts}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums">
                              {member.examBestScore >= 0 ? (
                                <span
                                  className={`font-semibold ${
                                    member.examBestScore >= 70
                                      ? 'text-emerald-700 dark:text-emerald-400'
                                      : 'text-amber-700 dark:text-amber-400'
                                  }`}
                                >
                                  {member.examBestScore}%
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3 pl-3 text-right font-mono tabular-nums">
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {member.xp} XP
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {member.totalMinutesStudied} min
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 13-Module Comparison Matrix */}
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>Confronto Avanzamento nei {LESSONS.length} Moduli</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ogni cella mostra il completamento e il miglior punteggio nel quiz del singolo modulo. Clicca su M01–M{String(LESSONS.length).padStart(2, '0')} per aprire la lezione.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completato
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-sky-700 dark:text-sky-400 font-medium">Quiz avviato</span>
                    <span aria-hidden="true">·</span>
                    <span>— Non svolto</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <th className="py-2.5 pr-4 font-medium min-w-[150px] sticky left-0 bg-white dark:bg-slate-900">
                          Studente
                        </th>
                        {LESSONS.map((lesson) => (
                          <th key={lesson.id} className="py-2.5 px-1.5 text-center font-mono">
                            <button
                              type="button"
                              onClick={() => onOpenLesson(lesson.id)}
                              title={`Modulo ${String(lesson.number).padStart(2, '0')}: ${lesson.shortTitle}`}
                              className="px-2 py-1 rounded hover:bg-sky-50 dark:hover:bg-sky-950/50 text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-300 font-semibold cursor-pointer"
                            >
                              M{String(lesson.number).padStart(2, '0')}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sortedMembers.map((member) => {
                        const isMe = member.userId === user.uid;
                        const completedSet = new Set(member.completedLessons);
                        return (
                          <tr
                            key={member.userId}
                            className={isMe ? 'bg-sky-50/40 dark:bg-sky-950/20' : ''}
                          >
                            <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-900 truncate max-w-[180px]">
                              {member.displayName}
                              {isMe ? ' (Tu)' : ''}
                            </td>
                            {LESSONS.map((lesson, idx) => {
                              const done = completedSet.has(lesson.id);
                              const score = member.moduleScores[idx] ?? -1;
                              return (
                                <td key={lesson.id} className="py-2 px-1 text-center font-mono tabular-nums">
                                  {done ? (
                                    <span
                                      title={`${member.displayName} · Modulo ${lesson.number}: completato${score >= 0 ? ` (${score}%)` : ''}`}
                                      className="inline-flex items-center justify-center gap-0.5 min-w-[46px] px-1.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]"
                                    >
                                      <Check className="w-3 h-3 shrink-0" />
                                      <span>{score >= 0 ? `${score}%` : 'OK'}</span>
                                    </span>
                                  ) : score >= 0 ? (
                                    <span
                                      title={`${member.displayName} · Modulo ${lesson.number}: quiz ${score}%`}
                                      className="inline-flex items-center justify-center min-w-[46px] px-1.5 py-1 rounded-md bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 font-semibold text-[11px]"
                                    >
                                      {score}%
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center min-w-[46px] py-1 text-slate-400 dark:text-slate-600">
                                      —
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Recharts Group Comparison Chart */}
              {chartData.length > 0 && (
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        <span>Confronto Visivo: Moduli Completati vs Media Quiz</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Percentuale di completamento dei {LESSONS.length} moduli affiancata alla media dei punteggi nei quiz di ogni partecipante.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      <Award className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      {groupSummary.totalAttempts} tentativi quiz totali nel gruppo
                    </span>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 16, left: -10, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          interval={0}
                        />
                        <YAxis
                          domain={[0, 100]}
                          unit="%"
                          tick={{ fontSize: 11, fill: '#64748b' }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '0.5rem',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                          }}
                          formatter={(value, name, item) => {
                            const payload = item?.payload as
                              | {
                                  completedCount?: number;
                                  examBestScore?: number;
                                }
                              | undefined;
                            if (name === 'Completamento Moduli (%)') {
                              return [
                                `${value}% (${payload?.completedCount ?? 0}/${LESSONS.length} moduli)`,
                                'Completamento Moduli',
                              ];
                            }
                            return [`${value}%`, 'Media Quiz'];
                          }}
                          labelFormatter={(_, items) => {
                            const first = items?.[0]?.payload as { fullName?: string } | undefined;
                            return first?.fullName || '';
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar
                          dataKey="completamentoPct"
                          name="Completamento Moduli (%)"
                          fill="#0284c7"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="mediaQuizPct"
                          name="Media Quiz (%)"
                          fill="#059669"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
