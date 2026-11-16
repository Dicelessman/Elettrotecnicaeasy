import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { BADGES, LESSONS, SCOUT_RANKS } from '../data/curriculum';
import type {
  BadgeId,
  DailyGoalMinutes,
  DayKey,
  ExampleDomain,
  FcmDeviceToken,
  LeaderboardEntry,
  LessonId,
  LessonNote,
  LessonProgress,
  QuizAttemptKind,
  QuizAttemptRecord,
  RankDefinition,
  SectionKey,
  StudyGroup,
  StudyGroupMember,
  StudyLog,
  ThemeMode,
  UserProfile,
  WeeklyBadgeId,
} from '../types/radiolab';
import {
  getLocalTimezone,
  getOrCreateFcmDeviceId,
  requestFcmDeviceRegistration,
  revokeFcmTokenOnDevice,
  showBrowserOrSwNotification,
  subscribeForegroundFcm,
  type FcmRegistrationResult,
} from '../utils/fcm';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import {
  formatDateKey,
  getClockInTimezone,
  getYesterdayKey,
} from '../utils/reminders';
import { getIsoWeekKey, WEEKLY_BADGES, WEEKLY_CHALLENGES } from '../utils/weeklyChallenges';

const GUEST_STORAGE_KEY = 'radiotecnica_easy_guest_v2';
const LEGACY_GUEST_STORAGE_KEY = 'onde_scout_guest_v1';

const VALID_BADGES = new Set<string>([
  ...BADGES.map((b) => b.id),
  ...WEEKLY_BADGES.map((b) => b.id),
]);
const VALID_DAYS = new Set<string>(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
const VALID_SECTIONS = new Set<string>(['analogy', 'simulator', 'formula', 'quiz']);
const VALID_LESSONS = new Set<string>(LESSONS.map((l) => l.id));

interface GuestSnapshot {
  profile: UserProfile;
  lessonProgress: Record<string, LessonProgress>;
  lessonNotes?: Record<string, LessonNote>;
  studyLogs: Record<string, StudyLog>;
  quizAttempts?: QuizAttemptRecord[];
}

function buildDefaultProfile(uid = 'guest', displayName = 'Radio Studente'): UserProfile {
  const today = formatDateKey();
  const weekKey = getIsoWeekKey();
  return {
    uid,
    displayName: displayName.slice(0, 100) || 'Radio Studente',
    dailyGoalMinutes: 15,
    theme: 'light',
    exampleDomain: 'scout',
    shareInLeaderboard: false,
    focusMode: false,
    soundEffectsEnabled: true,
    hapticFeedbackEnabled: true,
    xp: 0,
    streakCount: 0,
    lastStudyDate: '',
    todayDateKey: today,
    todayMinutesStudied: 0,
    unlockedBadges: [],
    weeklyWeekKey: weekKey,
    weeklyCompletedLessons: [],
    weeklyXpWeekKey: weekKey,
    weeklyXp: 0,
    wrongQuestionIds: [],
    masteredFlashcards: [],
    reminderEnabled: false,
    fcmEnabled: false,
    reminderTime: '19:30',
    reminderTimes: ['19:30'],
    reminderTimezone: getLocalTimezone(),
    reminderDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    reminderMessage: '10 minuti di Radiotecnica easy per tenere allenata la tua stazione!',
  };
}

function sanitizeWeekKey(val: unknown): string {
  return typeof val === 'string' && /^[0-9]{4}-W[0-9]{2}$/.test(val) ? val : '';
}

function sanitizeTime(val: string): string {
  return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(val) ? val : '19:30';
}

function sanitizeReminderTimes(arr: unknown, fallbackTime = '19:30'): string[] {
  const valid = Array.isArray(arr)
    ? Array.from(
        new Set(
          arr.filter(
            (x): x is string =>
              typeof x === 'string' && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(x)
          )
        )
      )
    : [];
  if (valid.length === 0) {
    return [sanitizeTime(fallbackTime)];
  }
  return valid.sort().slice(0, 5);
}

function sanitizeTimezone(val: unknown): string {
  if (typeof val === 'string') {
    const trimmed = val.trim().slice(0, 64);
    if (trimmed.length >= 1) return trimmed;
  }
  return getLocalTimezone();
}

function sanitizeGoal(val: number): DailyGoalMinutes {
  if (val === 5 || val === 15 || val === 30) return val;
  return 15;
}

function sanitizeTheme(val: unknown): ThemeMode {
  return val === 'dark' ? 'dark' : 'light';
}

function sanitizeDomain(val: unknown): ExampleDomain {
  if (val === 'outdoor' || val === 'casa' || val === 'scout') return val;
  return 'scout';
}

function sanitizeBadges(arr: unknown): BadgeId[] {
  if (!Array.isArray(arr)) return [];
  const unique = Array.from(
    new Set(arr.filter((x): x is BadgeId => typeof x === 'string' && VALID_BADGES.has(x)))
  );
  return unique.slice(0, 20);
}

function sanitizeDays(arr: unknown): DayKey[] {
  if (!Array.isArray(arr)) return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const unique = Array.from(
    new Set(arr.filter((x): x is DayKey => typeof x === 'string' && VALID_DAYS.has(x)))
  );
  return unique.slice(0, 7);
}

function sanitizeSections(arr: unknown): SectionKey[] {
  if (!Array.isArray(arr)) return [];
  const unique = Array.from(
    new Set(arr.filter((x): x is SectionKey => typeof x === 'string' && VALID_SECTIONS.has(x)))
  );
  return unique.slice(0, 10);
}

function sanitizeLessonsTouched(arr: unknown): LessonId[] {
  if (!Array.isArray(arr)) return [];
  const unique = Array.from(
    new Set(arr.filter((x): x is LessonId => typeof x === 'string' && VALID_LESSONS.has(x)))
  );
  return unique.slice(0, 13);
}

function sanitizeWrongQuestionIds(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  const unique = Array.from(
    new Set(
      arr.filter(
        (x): x is string =>
          typeof x === 'string' &&
          /^q([1-9]|1[0-3])-[0-9]{1,2}$/.test(x)
      )
    )
  );
  return unique.slice(0, 150);
}

function sanitizeMasteredFlashcards(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  const unique = Array.from(
    new Set(
      arr.filter(
        (x): x is string =>
          typeof x === 'string' &&
          x.length >= 3 &&
          x.length <= 64 &&
          /^[a-zA-Z0-9_-]+$/.test(x)
      )
    )
  );
  return unique.slice(0, 250);
}

function computeNextWeeklyXp(
  cur: UserProfile,
  xpGained: number
): { weeklyXpWeekKey: string; weeklyXp: number } {
  const currentWeekKey = getIsoWeekKey();
  const base = cur.weeklyXpWeekKey === currentWeekKey ? Math.max(0, Math.round(cur.weeklyXp)) : 0;
  return {
    weeklyXpWeekKey: currentWeekKey,
    weeklyXp: Math.min(1000000, base + Math.max(0, Math.round(xpGained))),
  };
}

function getRankForXp(xp: number): { currentRank: RankDefinition; nextRank: RankDefinition | null } {
  let rank = SCOUT_RANKS[0];
  let next: RankDefinition | null = SCOUT_RANKS[1] ?? null;
  for (let i = 0; i < SCOUT_RANKS.length; i += 1) {
    if (xp >= SCOUT_RANKS[i].minXp) {
      rank = SCOUT_RANKS[i];
      next = SCOUT_RANKS[i + 1] ?? null;
    }
  }
  return { currentRank: rank, nextRank: next };
}

function generateInviteCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function buildMemberStatsSnapshot(
  curProfile: UserProfile,
  progressMap: Record<string, LessonProgress>,
  attemptsList: QuizAttemptRecord[]
) {
  const completedLessons = LESSONS.filter((l) => Boolean(progressMap[l.id]?.completed)).map(
    (l) => l.id
  );
  const moduleScores = LESSONS.map((l) => {
    const lp = progressMap[l.id];
    if (!lp || lp.quizAttempts <= 0) return -1;
    return Math.max(0, Math.min(100, Math.round(lp.quizBestScore)));
  });
  const attempted = moduleScores.filter((s) => s >= 0);
  const avgQuizScore =
    attempted.length > 0
      ? Math.round(attempted.reduce((acc, s) => acc + s, 0) / attempted.length)
      : 0;

  const moduleAttemptsCount = LESSONS.reduce(
    (acc, l) => acc + Math.max(0, Math.floor(progressMap[l.id]?.quizAttempts ?? 0)),
    0
  );
  const nonLessonAttemptsCount = attemptsList.filter((a) => a.kind !== 'lesson').length;
  const totalQuizAttempts = Math.max(
    0,
    Math.min(100000, Math.max(attemptsList.length, moduleAttemptsCount + nonLessonAttemptsCount))
  );

  const examAttempts = attemptsList.filter((a) => a.kind === 'exam');
  const examBestScore =
    examAttempts.length > 0
      ? Math.max(...examAttempts.map((a) => Math.max(0, Math.min(100, Math.round(a.scorePercent)))))
      : -1;

  const totalMinutesStudied = Math.max(
    0,
    Math.min(
      100000,
      LESSONS.reduce(
        (acc, l) => acc + Math.max(0, Math.round(progressMap[l.id]?.minutesStudied ?? 0)),
        0
      )
    )
  );

  const xp = Math.max(0, Math.min(1000000, Math.round(curProfile.xp)));
  const rankLevel = Math.max(1, Math.min(5, getRankForXp(xp).currentRank.level));

  return {
    displayName: (curProfile.displayName || 'Radio Studente').trim().slice(0, 100) || 'Radio Studente',
    xp,
    rankLevel,
    streakCount: Math.max(0, Math.min(10000, Math.floor(curProfile.streakCount))),
    completedLessons,
    moduleScores,
    avgQuizScore,
    totalQuizAttempts,
    examBestScore,
    badgesCount: Math.max(0, Math.min(17, curProfile.unlockedBadges.length)),
    totalMinutesStudied,
  };
}

function loadGuestSnapshot(): GuestSnapshot {
  const today = formatDateKey();
  try {
    const raw =
      localStorage.getItem(GUEST_STORAGE_KEY) || localStorage.getItem(LEGACY_GUEST_STORAGE_KEY);
    if (!raw) {
      return {
        profile: buildDefaultProfile('guest', 'Radio Studente'),
        lessonProgress: {},
        studyLogs: {},
      };
    }
    const parsed = JSON.parse(raw) as Partial<GuestSnapshot>;
    const base = buildDefaultProfile('guest', parsed.profile?.displayName || 'Radio Studente');
    const p = parsed.profile;
    const isSameDay = p?.todayDateKey === today;
    const currentWeekKey = getIsoWeekKey();
    const isSameWeek = sanitizeWeekKey(p?.weeklyWeekKey) === currentWeekKey;
    const isSameWeeklyXpWeek = sanitizeWeekKey(p?.weeklyXpWeekKey) === currentWeekKey;
    const profile: UserProfile = {
      ...base,
      dailyGoalMinutes: sanitizeGoal(p?.dailyGoalMinutes ?? 15),
      theme: sanitizeTheme(p?.theme),
      exampleDomain: sanitizeDomain(p?.exampleDomain),
      shareInLeaderboard: Boolean(p?.shareInLeaderboard),
      focusMode: Boolean(p?.focusMode),
      soundEffectsEnabled:
        p?.soundEffectsEnabled !== undefined ? Boolean(p.soundEffectsEnabled) : true,
      hapticFeedbackEnabled:
        p?.hapticFeedbackEnabled !== undefined ? Boolean(p.hapticFeedbackEnabled) : true,
      xp: Math.max(0, Math.min(1000000, Number(p?.xp ?? 0))),
      streakCount: Math.max(0, Math.min(10000, Math.floor(Number(p?.streakCount ?? 0)))),
      lastStudyDate: typeof p?.lastStudyDate === 'string' ? p.lastStudyDate.slice(0, 20) : '',
      todayDateKey: today,
      todayMinutesStudied: isSameDay
        ? Math.max(0, Math.min(1440, Number(p?.todayMinutesStudied ?? 0)))
        : 0,
      unlockedBadges: sanitizeBadges(p?.unlockedBadges),
      weeklyWeekKey: currentWeekKey,
      weeklyCompletedLessons: isSameWeek ? sanitizeLessonsTouched(p?.weeklyCompletedLessons) : [],
      weeklyXpWeekKey: currentWeekKey,
      weeklyXp: isSameWeeklyXpWeek
        ? Math.max(0, Math.min(1000000, Math.round(Number(p?.weeklyXp ?? 0))))
        : 0,
      wrongQuestionIds: sanitizeWrongQuestionIds(p?.wrongQuestionIds),
      masteredFlashcards: sanitizeMasteredFlashcards(p?.masteredFlashcards),
      reminderEnabled: Boolean(p?.reminderEnabled),
      fcmEnabled: Boolean(p?.fcmEnabled),
      reminderTime: sanitizeTime(p?.reminderTime || '19:30'),
      reminderTimes: sanitizeReminderTimes(p?.reminderTimes, p?.reminderTime || '19:30'),
      reminderTimezone: sanitizeTimezone(p?.reminderTimezone),
      reminderDays: sanitizeDays(p?.reminderDays),
      reminderMessage:
        typeof p?.reminderMessage === 'string'
          ? p.reminderMessage.slice(0, 160)
          : base.reminderMessage,
    };
    const normalizedProgress: Record<string, LessonProgress> = {};
    for (const [k, lp] of Object.entries(parsed.lessonProgress ?? {})) {
      if (!lp) continue;
      const secs = sanitizeSections(lp.completedSections);
      normalizedProgress[k] = {
        ...lp,
        completedSections: secs,
        minutesStudied:
          typeof lp.minutesStudied === 'number'
            ? Math.max(0, Math.min(10000, Math.round(lp.minutesStudied)))
            : secs.length * 2 + (lp.completed ? 3 : 0),
      };
    }
    const normalizedAttempts: QuizAttemptRecord[] = Array.isArray(parsed.quizAttempts)
      ? parsed.quizAttempts
          .filter(
            (a): a is QuizAttemptRecord =>
              Boolean(a) &&
              typeof a.attemptId === 'string' &&
              typeof a.scorePercent === 'number' &&
              typeof a.recordedAtMs === 'number'
          )
          .slice(-200)
      : [];
    const normalizedNotes: Record<string, LessonNote> = {};
    for (const [k, note] of Object.entries(parsed.lessonNotes ?? {})) {
      if (!note || !VALID_LESSONS.has(k) || typeof note.content !== 'string') continue;
      const trimmed = note.content.slice(0, 10000);
      if (trimmed.trim().length === 0) continue;
      normalizedNotes[k] = {
        userId: 'guest',
        lessonId: k as LessonId,
        content: trimmed,
        updatedAtMs:
          typeof note.updatedAtMs === 'number' && note.updatedAtMs >= 1700000000000
            ? Math.floor(note.updatedAtMs)
            : Date.now(),
      };
    }
    return {
      profile,
      lessonProgress: normalizedProgress,
      lessonNotes: normalizedNotes,
      studyLogs: parsed.studyLogs ?? {},
      quizAttempts: normalizedAttempts,
    };
  } catch {
    return {
      profile: buildDefaultProfile('guest', 'Radio Studente'),
      lessonProgress: {},
      lessonNotes: {},
      studyLogs: {},
      quizAttempts: [],
    };
  }
}

function saveGuestSnapshot(snapshot: GuestSnapshot): void {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota errors in restricted frames
  }
}

function clearGuestStorage(): void {
  try {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    localStorage.removeItem(LEGACY_GUEST_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export interface QuizOutcome {
  xpGained: number;
  newlyUnlockedBadge: BadgeId | null;
  newlyUnlockedWeeklyBadges: WeeklyBadgeId[];
  weeklyBonusXp: number;
  previousRankLevel: number;
  newRankLevel: number;
}

export interface QuickReviewOutcome {
  xpGained: number;
  previousRankLevel: number;
  newRankLevel: number;
}

export interface ExamSimulationOutcome {
  xpGained: number;
  passed: boolean;
  previousRankLevel: number;
  newRankLevel: number;
}

export interface UserPreferencesPatch {
  dailyGoalMinutes?: DailyGoalMinutes;
  theme?: ThemeMode;
  exampleDomain?: ExampleDomain;
  shareInLeaderboard?: boolean;
  focusMode?: boolean;
  soundEffectsEnabled?: boolean;
  hapticFeedbackEnabled?: boolean;
  displayName?: string;
}

export interface StudyContextValue {
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  profile: UserProfile;
  lessonProgress: Record<string, LessonProgress>;
  lessonNotes: Record<string, LessonNote>;
  studyLogs: Record<string, StudyLog>;
  quizAttempts: QuizAttemptRecord[];
  fcmDevices: FcmDeviceToken[];
  leaderboardEntries: LeaderboardEntry[];
  studyGroups: StudyGroup[];
  studyGroupMembers: Record<string, StudyGroupMember[]>;
  studyGroupsLoading: boolean;
  currentRank: RankDefinition;
  nextRank: RankDefinition | null;
  activeSessionSeconds: number;
  isTrackingStudy: boolean;
  setIsTrackingStudy: (active: boolean) => void;
  setActiveStudyLesson: (lessonId: LessonId | null) => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  updateDailyGoal: (minutes: DailyGoalMinutes) => Promise<void>;
  updateUserPreferences: (patch: UserPreferencesPatch) => Promise<void>;
  updateReminderSettings: (settings: {
    reminderEnabled: boolean;
    fcmEnabled?: boolean;
    reminderTime?: string;
    reminderTimes?: string[];
    reminderTimezone?: string;
    reminderDays: DayKey[];
    reminderMessage: string;
  }) => Promise<void>;
  registerFcmDevice: () => Promise<FcmRegistrationResult>;
  removeFcmDevice: (deviceId: string) => Promise<void>;
  createStudyGroup: (
    name: string,
    description: string
  ) => Promise<{ ok: boolean; group?: StudyGroup; error?: string }>;
  joinStudyGroupByCode: (
    inviteCode: string
  ) => Promise<{ ok: boolean; groupId?: string; groupName?: string; error?: string }>;
  leaveStudyGroup: (groupId: string) => Promise<void>;
  deleteStudyGroup: (groupId: string) => Promise<void>;
  removeMemberFromGroup: (groupId: string, targetUserId: string) => Promise<void>;
  markSectionCompleted: (lessonId: LessonId, section: SectionKey) => Promise<void>;
  saveLessonNote: (lessonId: LessonId, content: string) => Promise<void>;
  deleteLessonNote: (lessonId: LessonId) => Promise<void>;
  recordQuizResult: (
    lessonId: LessonId,
    scorePercent: number,
    correctCount?: number,
    totalQuestions?: number
  ) => Promise<QuizOutcome>;
  recordQuickReviewResult: (
    correctCount: number,
    reviewedLessonIds: LessonId[],
    totalQuestions?: number,
    customLabel?: string
  ) => Promise<QuickReviewOutcome>;
  recordExamSimulationResult: (
    correctCount: number,
    totalQuestions: number,
    elapsedMinutes: number,
    coveredLessonIds: LessonId[]
  ) => Promise<ExamSimulationOutcome>;
  recordQuestionOutcomes: (wrongIds: string[], correctIds: string[]) => Promise<void>;
  toggleFlashcardMastered: (flashcardId: string) => Promise<void>;
  touchLessonStudy: (lessonId: LessonId, bonusMinutes?: number) => Promise<void>;
  notificationBanner: string | null;
  dismissNotificationBanner: () => void;
}

const StudyContext = createContext<StudyContextValue | null>(null);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialGuest = useMemo(() => loadGuestSnapshot(), []);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  const [profile, setProfile] = useState<UserProfile>(initialGuest.profile);
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>(
    initialGuest.lessonProgress
  );
  const [lessonNotes, setLessonNotes] = useState<Record<string, LessonNote>>(
    initialGuest.lessonNotes ?? {}
  );
  const [studyLogs, setStudyLogs] = useState<Record<string, StudyLog>>(initialGuest.studyLogs);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptRecord[]>(
    initialGuest.quizAttempts ?? []
  );
  const [fcmDevices, setFcmDevices] = useState<FcmDeviceToken[]>([]);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [studyGroupMembers, setStudyGroupMembers] = useState<Record<string, StudyGroupMember[]>>({});
  const [studyGroupsLoading, setStudyGroupsLoading] = useState(false);

  const [isTrackingStudy, setIsTrackingStudy] = useState(false);
  const [activeSessionSeconds, setActiveSessionSeconds] = useState(0);
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);

  const profileRef = useRef(profile);
  profileRef.current = profile;
  const lessonProgressRef = useRef(lessonProgress);
  lessonProgressRef.current = lessonProgress;
  const lessonNotesRef = useRef(lessonNotes);
  lessonNotesRef.current = lessonNotes;
  const quizAttemptsRef = useRef(quizAttempts);
  quizAttemptsRef.current = quizAttempts;
  const fcmDevicesRef = useRef(fcmDevices);
  fcmDevicesRef.current = fcmDevices;
  const leaderboardEntriesRef = useRef(leaderboardEntries);
  leaderboardEntriesRef.current = leaderboardEntries;
  const studyGroupsRef = useRef(studyGroups);
  studyGroupsRef.current = studyGroups;
  const studyGroupMembersRef = useRef(studyGroupMembers);
  studyGroupMembersRef.current = studyGroupMembers;
  const studyLogsRef = useRef(studyLogs);
  studyLogsRef.current = studyLogs;
  const activeStudyLessonRef = useRef<LessonId | null>(null);
  const lastLbSyncKeyRef = useRef<string | null>(null);

  const setActiveStudyLesson = useCallback((lessonId: LessonId | null) => {
    activeStudyLessonRef.current = lessonId;
  }, []);

  const lastInteractionAtRef = useRef<number>(Date.now());
  const pendingMinuteSecondsRef = useRef<number>(0);

  // Sync HTML .dark class with theme preference
  useEffect(() => {
    document.documentElement.classList.toggle('dark', profile.theme === 'dark');
  }, [profile.theme]);

  // Sync guest snapshot to localStorage only while signed out
  useEffect(() => {
    if (!user && !authLoading) {
      saveGuestSnapshot({ profile, lessonProgress, lessonNotes, studyLogs, quizAttempts });
    }
  }, [user, authLoading, profile, lessonProgress, lessonNotes, studyLogs, quizAttempts]);

  // Helper to sync or remove opt-in / study-group public leaderboard entry
  const syncLeaderboardDoc = useCallback(
    async (
      uid: string,
      opts: {
        share: boolean;
        displayName: string;
        xp: number;
        weeklyXpWeekKey?: string;
        weeklyXp?: number;
        badgesCount: number;
        completedLessonsCount: number;
        studyGroupsCount?: number;
      }
    ) => {
      const lbRef = doc(db, 'leaderboard', uid);
      const groupsCount = Math.max(
        0,
        Math.min(100, Math.floor(opts.studyGroupsCount ?? studyGroupsRef.current.length))
      );
      const shouldShare = opts.share || groupsCount > 0;
      const currentWeekKey = getIsoWeekKey();
      const wkKey = opts.weeklyXpWeekKey || currentWeekKey;
      const wkXp =
        wkKey === currentWeekKey
          ? Math.max(0, Math.min(1000000, Math.round(opts.weeklyXp ?? 0)))
          : 0;
      try {
        if (!shouldShare) {
          const existingSnap = await getDoc(lbRef);
          if (existingSnap.exists()) {
            await deleteDoc(lbRef);
          }
          lastLbSyncKeyRef.current = 'deleted';
          return;
        }
        const rank = getRankForXp(opts.xp).currentRank;
        const payload = {
          userId: uid,
          nickname: (opts.displayName.trim() || 'Radio Studente').slice(0, 40),
          xp: Math.max(0, Math.min(1000000, Math.round(opts.xp))),
          weeklyXpWeekKey: currentWeekKey,
          weeklyXp: wkXp,
          rankLevel: Math.max(1, Math.min(5, Math.floor(rank.level))),
          completedLessonsCount: Math.max(0, Math.min(13, Math.floor(opts.completedLessonsCount))),
          badgesCount: Math.max(0, Math.min(17, Math.floor(opts.badgesCount))),
          studyGroupsCount: groupsCount,
          isPublic: true,
          updatedAt: serverTimestamp(),
        };
        const syncKey = JSON.stringify({
          n: payload.nickname,
          x: payload.xp,
          wk: payload.weeklyXpWeekKey,
          wx: payload.weeklyXp,
          r: payload.rankLevel,
          c: payload.completedLessonsCount,
          b: payload.badgesCount,
          g: payload.studyGroupsCount,
        });
        const existingSnap = await getDoc(lbRef);
        if (existingSnap.exists()) {
          await updateDoc(lbRef, {
            nickname: payload.nickname,
            xp: payload.xp,
            weeklyXpWeekKey: payload.weeklyXpWeekKey,
            weeklyXp: payload.weeklyXp,
            rankLevel: payload.rankLevel,
            completedLessonsCount: payload.completedLessonsCount,
            badgesCount: payload.badgesCount,
            studyGroupsCount: payload.studyGroupsCount,
            isPublic: true,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(lbRef, payload);
        }
        lastLbSyncKeyRef.current = syncKey;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `leaderboard/${uid}`);
      }
    },
    []
  );

  // Listen to Firebase Auth state & bootstrap/migrate user profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthError(null);

      if (!firebaseUser) {
        setProfileReady(false);
        setLeaderboardEntries([]);
        lastLbSyncKeyRef.current = null;
        setStudyGroups([]);
        setStudyGroupMembers({});
        setStudyGroupsLoading(false);
        const guest = loadGuestSnapshot();
        setProfile(guest.profile);
        setLessonProgress(guest.lessonProgress);
        setLessonNotes(guest.lessonNotes ?? {});
        setStudyLogs(guest.studyLogs);
        setQuizAttempts(guest.quizAttempts ?? []);
        setAuthLoading(false);
        return;
      }

      const uid = firebaseUser.uid;
      const today = formatDateKey();
      const userDocRef = doc(db, 'users', uid);

      try {
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          const guest = loadGuestSnapshot();
          const initialName = (
            firebaseUser.displayName ||
            guest.profile.displayName ||
            'Radio Studente'
          ).slice(0, 100);
          const currentWeekKey = getIsoWeekKey();
          const newProfile = {
            uid,
            displayName: initialName,
            dailyGoalMinutes: sanitizeGoal(guest.profile.dailyGoalMinutes),
            theme: sanitizeTheme(guest.profile.theme),
            exampleDomain: sanitizeDomain(guest.profile.exampleDomain),
            shareInLeaderboard: Boolean(guest.profile.shareInLeaderboard),
            focusMode: Boolean(guest.profile.focusMode),
            soundEffectsEnabled: Boolean(guest.profile.soundEffectsEnabled),
            hapticFeedbackEnabled: Boolean(guest.profile.hapticFeedbackEnabled),
            xp: Math.max(0, Math.min(1000000, Math.round(guest.profile.xp))),
            streakCount: Math.max(0, Math.min(10000, Math.floor(guest.profile.streakCount))),
            lastStudyDate: guest.profile.lastStudyDate || '',
            todayDateKey: today,
            todayMinutesStudied:
              guest.profile.todayDateKey === today
                ? Math.max(0, Math.min(1440, Math.round(guest.profile.todayMinutesStudied)))
                : 0,
            unlockedBadges: sanitizeBadges(guest.profile.unlockedBadges),
            weeklyWeekKey: currentWeekKey,
            weeklyCompletedLessons:
              guest.profile.weeklyWeekKey === currentWeekKey
                ? sanitizeLessonsTouched(guest.profile.weeklyCompletedLessons)
                : [],
            weeklyXpWeekKey: currentWeekKey,
            weeklyXp:
              guest.profile.weeklyXpWeekKey === currentWeekKey
                ? Math.max(0, Math.min(1000000, Math.round(guest.profile.weeklyXp)))
                : 0,
            wrongQuestionIds: sanitizeWrongQuestionIds(guest.profile.wrongQuestionIds),
            masteredFlashcards: sanitizeMasteredFlashcards(guest.profile.masteredFlashcards),
            reminderEnabled: guest.profile.reminderEnabled,
            fcmEnabled: guest.profile.fcmEnabled,
            reminderTime: sanitizeTime(guest.profile.reminderTime),
            reminderTimes: sanitizeReminderTimes(
              guest.profile.reminderTimes,
              guest.profile.reminderTime
            ),
            reminderTimezone: sanitizeTimezone(guest.profile.reminderTimezone),
            reminderDays: sanitizeDays(guest.profile.reminderDays),
            reminderMessage: (
              guest.profile.reminderMessage || buildDefaultProfile().reminderMessage
            ).slice(0, 160),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userDocRef, newProfile);

          // Migrate guest lesson progress for brand-new cloud accounts
          const guestLessons = Object.values(guest.lessonProgress);
          for (const lp of guestLessons) {
            if (!VALID_LESSONS.has(lp.lessonId)) continue;
            const lpPath = `users/${uid}/lessonProgress/${lp.lessonId}`;
            try {
              await setDoc(doc(db, 'users', uid, 'lessonProgress', lp.lessonId), {
                userId: uid,
                lessonId: lp.lessonId,
                completedSections: sanitizeSections(lp.completedSections),
                quizBestScore: Math.max(0, Math.min(100, Math.round(lp.quizBestScore))),
                quizAttempts: Math.max(0, Math.min(10000, Math.floor(lp.quizAttempts))),
                xpEarned: Math.max(0, Math.min(5000, Math.round(lp.xpEarned))),
                completed: Boolean(lp.completed),
                minutesStudied: Math.max(0, Math.min(10000, Math.round(lp.minutesStudied ?? 0))),
                updatedAt: serverTimestamp(),
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, lpPath);
            }
          }
          // Migrate guest quiz attempt history
          for (const att of guest.quizAttempts ?? []) {
            const cleanAttId = att.attemptId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
            if (!cleanAttId) continue;
            try {
              await setDoc(doc(db, 'users', uid, 'quizAttempts', cleanAttId), {
                userId: uid,
                attemptId: cleanAttId,
                kind: att.kind,
                lessonId: att.lessonId,
                label: att.label.slice(0, 60) || 'Quiz',
                scorePercent: Math.max(0, Math.min(100, Math.round(att.scorePercent))),
                correctCount: Math.max(0, Math.min(30, Math.floor(att.correctCount))),
                totalQuestions: Math.max(1, Math.min(30, Math.floor(att.totalQuestions))),
                recordedAtMs: Math.max(1700000000000, Math.floor(att.recordedAtMs)),
                createdAt: serverTimestamp(),
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${uid}/quizAttempts/${cleanAttId}`);
            }
          }
          // Migrate guest lesson notes for brand-new cloud accounts
          for (const note of Object.values(guest.lessonNotes ?? {})) {
            if (!VALID_LESSONS.has(note.lessonId)) continue;
            const cleanContent = note.content.slice(0, 10000);
            if (cleanContent.trim().length === 0) continue;
            const lnPath = `users/${uid}/lessonNotes/${note.lessonId}`;
            try {
              await setDoc(doc(db, 'users', uid, 'lessonNotes', note.lessonId), {
                userId: uid,
                lessonId: note.lessonId,
                content: cleanContent,
                updatedAtMs: Math.max(1700000000000, Math.floor(note.updatedAtMs || Date.now())),
                updatedAt: serverTimestamp(),
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, lnPath);
            }
          }
          clearGuestStorage();
        } else {
          // Existing multi-user cloud account: wipe local guest snapshot so accounts never mix
          clearGuestStorage();
          const data = snap.data();
          if (
            data.theme === undefined ||
            data.exampleDomain === undefined ||
            data.shareInLeaderboard === undefined ||
            data.focusMode === undefined ||
            data.soundEffectsEnabled === undefined ||
            data.hapticFeedbackEnabled === undefined ||
            data.weeklyWeekKey === undefined ||
            data.weeklyCompletedLessons === undefined ||
            data.weeklyXpWeekKey === undefined ||
            data.weeklyXp === undefined ||
            data.wrongQuestionIds === undefined ||
            data.masteredFlashcards === undefined ||
            data.fcmEnabled === undefined ||
            data.reminderTimes === undefined ||
            data.reminderTimezone === undefined
          ) {
            const fallbackTime = sanitizeTime(String(data.reminderTime || '19:30'));
            const currentWeekKey = getIsoWeekKey();
            const isSameWkXp = sanitizeWeekKey(data.weeklyXpWeekKey) === currentWeekKey;
            await updateDoc(userDocRef, {
              theme: sanitizeTheme(data.theme),
              exampleDomain: sanitizeDomain(data.exampleDomain),
              shareInLeaderboard: Boolean(data.shareInLeaderboard),
              focusMode: Boolean(data.focusMode),
              soundEffectsEnabled:
                data.soundEffectsEnabled !== undefined ? Boolean(data.soundEffectsEnabled) : true,
              hapticFeedbackEnabled:
                data.hapticFeedbackEnabled !== undefined
                  ? Boolean(data.hapticFeedbackEnabled)
                  : true,
              weeklyWeekKey: sanitizeWeekKey(data.weeklyWeekKey) || currentWeekKey,
              weeklyCompletedLessons: sanitizeLessonsTouched(data.weeklyCompletedLessons),
              weeklyXpWeekKey: currentWeekKey,
              weeklyXp: isSameWkXp
                ? Math.max(0, Math.min(1000000, Math.round(Number(data.weeklyXp ?? 0))))
                : 0,
              wrongQuestionIds: sanitizeWrongQuestionIds(data.wrongQuestionIds),
              masteredFlashcards: sanitizeMasteredFlashcards(data.masteredFlashcards),
              fcmEnabled: Boolean(data.fcmEnabled),
              reminderTimes: sanitizeReminderTimes(data.reminderTimes, fallbackTime),
              reminderTimezone: sanitizeTimezone(data.reminderTimezone),
              updatedAt: serverTimestamp(),
            });
          }
        }
        setProfileReady(true);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Attach Firestore real-time listeners once authenticated and profile exists
  useEffect(() => {
    if (!user || !profileReady) return;
    const uid = user.uid;
    const today = formatDateKey();

    const unsubUser = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const sameDay = data.todayDateKey === today;
        const currentWeekKey = getIsoWeekKey();
        const sameWeek = sanitizeWeekKey(data.weeklyWeekKey) === currentWeekKey;
        const sameWeeklyXpWeek = sanitizeWeekKey(data.weeklyXpWeekKey) === currentWeekKey;
        setProfile({
          uid: String(data.uid || uid),
          displayName: String(data.displayName || 'Radio Studente'),
          dailyGoalMinutes: sanitizeGoal(Number(data.dailyGoalMinutes ?? 15)),
          theme: sanitizeTheme(data.theme),
          exampleDomain: sanitizeDomain(data.exampleDomain),
          shareInLeaderboard: Boolean(data.shareInLeaderboard),
          focusMode: Boolean(data.focusMode),
          soundEffectsEnabled:
            data.soundEffectsEnabled !== undefined ? Boolean(data.soundEffectsEnabled) : true,
          hapticFeedbackEnabled:
            data.hapticFeedbackEnabled !== undefined ? Boolean(data.hapticFeedbackEnabled) : true,
          xp: Number(data.xp ?? 0),
          streakCount: Number(data.streakCount ?? 0),
          lastStudyDate: String(data.lastStudyDate || ''),
          todayDateKey: sameDay ? String(data.todayDateKey) : today,
          todayMinutesStudied: sameDay ? Number(data.todayMinutesStudied ?? 0) : 0,
          unlockedBadges: sanitizeBadges(data.unlockedBadges),
          weeklyWeekKey: currentWeekKey,
          weeklyCompletedLessons: sameWeek ? sanitizeLessonsTouched(data.weeklyCompletedLessons) : [],
          weeklyXpWeekKey: currentWeekKey,
          weeklyXp: sameWeeklyXpWeek
            ? Math.max(0, Math.min(1000000, Math.round(Number(data.weeklyXp ?? 0))))
            : 0,
          wrongQuestionIds: sanitizeWrongQuestionIds(data.wrongQuestionIds),
          masteredFlashcards: sanitizeMasteredFlashcards(data.masteredFlashcards),
          reminderEnabled: Boolean(data.reminderEnabled),
          fcmEnabled: Boolean(data.fcmEnabled),
          reminderTime: sanitizeTime(String(data.reminderTime || '19:30')),
          reminderTimes: sanitizeReminderTimes(
            data.reminderTimes,
            String(data.reminderTime || '19:30')
          ),
          reminderTimezone: sanitizeTimezone(data.reminderTimezone),
          reminderDays: sanitizeDays(data.reminderDays),
          reminderMessage: String(data.reminderMessage || ''),
        });
      },
      (error) => handleFirestoreError(error, OperationType.GET, `users/${uid}`)
    );

    const progressQuery = query(
      collection(db, 'users', uid, 'lessonProgress'),
      where('userId', '==', uid)
    );
    const unsubProgress = onSnapshot(
      progressQuery,
      (snapshot) => {
        const next: Record<string, LessonProgress> = {};
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const lid = String(d.lessonId) as LessonId;
          if (!VALID_LESSONS.has(lid)) return;
          next[lid] = {
            userId: uid,
            lessonId: lid,
            completedSections: sanitizeSections(d.completedSections),
            quizBestScore: Number(d.quizBestScore ?? 0),
            quizAttempts: Number(d.quizAttempts ?? 0),
            xpEarned: Number(d.xpEarned ?? 0),
            completed: Boolean(d.completed),
            minutesStudied:
              typeof d.minutesStudied === 'number'
                ? Math.max(0, Math.min(10000, Math.round(d.minutesStudied)))
                : sanitizeSections(d.completedSections).length * 2 + (d.completed ? 3 : 0),
          };
        });
        setLessonProgress(next);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${uid}/lessonProgress`)
    );

    const notesQuery = query(
      collection(db, 'users', uid, 'lessonNotes'),
      where('userId', '==', uid)
    );
    const unsubNotes = onSnapshot(
      notesQuery,
      (snapshot) => {
        const next: Record<string, LessonNote> = {};
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const lid = String(d.lessonId) as LessonId;
          if (!VALID_LESSONS.has(lid) || typeof d.content !== 'string') return;
          next[lid] = {
            userId: uid,
            lessonId: lid,
            content: d.content,
            updatedAtMs: Number(d.updatedAtMs ?? Date.now()),
          };
        });
        setLessonNotes(next);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${uid}/lessonNotes`)
    );

    const logsQuery = query(
      collection(db, 'users', uid, 'studyLogs'),
      where('userId', '==', uid)
    );
    const unsubLogs = onSnapshot(
      logsQuery,
      (snapshot) => {
        const next: Record<string, StudyLog> = {};
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const dateKey = String(d.dateKey);
          next[dateKey] = {
            userId: uid,
            dateKey,
            minutesStudied: Number(d.minutesStudied ?? 0),
            lessonsTouched: sanitizeLessonsTouched(d.lessonsTouched),
          };
        });
        setStudyLogs(next);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${uid}/studyLogs`)
    );

    const attemptsQuery = query(
      collection(db, 'users', uid, 'quizAttempts'),
      where('userId', '==', uid)
    );
    const unsubAttempts = onSnapshot(
      attemptsQuery,
      (snapshot) => {
        const items: QuizAttemptRecord[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const kind: QuizAttemptKind =
            d.kind === 'exam' || d.kind === 'review' ? d.kind : 'lesson';
          items.push({
            userId: uid,
            attemptId: String(d.attemptId || docSnap.id),
            kind,
            lessonId: String(d.lessonId || 'all') as LessonId | 'all',
            label: String(d.label || 'Quiz'),
            scorePercent: Number(d.scorePercent ?? 0),
            correctCount: Number(d.correctCount ?? 0),
            totalQuestions: Number(d.totalQuestions ?? 10),
            recordedAtMs: Number(d.recordedAtMs ?? Date.now()),
          });
        });
        items.sort((a, b) => a.recordedAtMs - b.recordedAtMs);
        setQuizAttempts(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${uid}/quizAttempts`)
    );

    // Public multi-user leaderboard listener (filters match firestore.rules exactly)
    const lbQuery = query(
      collection(db, 'leaderboard'),
      where('isPublic', '==', true),
      where('xp', '>=', 0)
    );
    const unsubLeaderboard = onSnapshot(
      lbQuery,
      (snapshot) => {
        const entries: LeaderboardEntry[] = [];
        const currentWeekKey = getIsoWeekKey();
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const wkKey = sanitizeWeekKey(d.weeklyXpWeekKey);
          const wkXp =
            wkKey === currentWeekKey && typeof d.weeklyXp === 'number'
              ? Math.max(0, Math.min(1000000, Math.round(d.weeklyXp)))
              : 0;
          entries.push({
            userId: String(d.userId || docSnap.id),
            nickname: String(d.nickname || 'Radio Studente'),
            xp: Number(d.xp ?? 0),
            weeklyXpWeekKey: wkKey || currentWeekKey,
            weeklyXp: wkXp,
            rankLevel: Number(d.rankLevel ?? 1),
            completedLessonsCount: Number(d.completedLessonsCount ?? 0),
            badgesCount: Number(d.badgesCount ?? 0),
            studyGroupsCount:
              typeof d.studyGroupsCount === 'number'
                ? Math.max(0, Math.min(100, Math.floor(d.studyGroupsCount)))
                : 0,
            isPublic: Boolean(d.isPublic),
          });
        });
        entries.sort((a, b) => b.xp - a.xp);
        setLeaderboardEntries(entries);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'leaderboard')
    );

    const fcmTokensQuery = query(
      collection(db, 'users', uid, 'fcmTokens'),
      where('userId', '==', uid)
    );
    const unsubFcmTokens = onSnapshot(
      fcmTokensQuery,
      (snapshot) => {
        const list: FcmDeviceToken[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (typeof d.token !== 'string' || d.token.length < 20) return;
          list.push({
            userId: uid,
            deviceId: String(d.deviceId || docSnap.id),
            token: d.token,
            deviceLabel: String(d.deviceLabel || 'Dispositivo Web'),
            timezone: sanitizeTimezone(d.timezone),
            reminderEnabled: Boolean(d.reminderEnabled),
            reminderTimes: sanitizeReminderTimes(d.reminderTimes, '19:30'),
            reminderDays: sanitizeDays(d.reminderDays),
            reminderMessage: String(d.reminderMessage || ''),
            updatedAtMs: Number(d.updatedAtMs ?? Date.now()),
          });
        });
        list.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
        setFcmDevices(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${uid}/fcmTokens`)
    );

    setStudyGroupsLoading(true);
    const groupsQuery = query(
      collection(db, 'studyGroups'),
      where('memberIds', 'array-contains', uid)
    );
    const unsubStudyGroups = onSnapshot(
      groupsQuery,
      (snapshot) => {
        const list: StudyGroup[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const rawMembers = Array.isArray(d.memberIds)
            ? d.memberIds.filter((id): id is string => typeof id === 'string')
            : [];
          list.push({
            groupId: String(d.groupId || docSnap.id),
            name: String(d.name || 'Gruppo di Studio'),
            description: String(d.description || ''),
            inviteCode: String(d.inviteCode || ''),
            ownerId: String(d.ownerId || ''),
            ownerName: String(d.ownerName || 'Fondatore'),
            memberIds: rawMembers,
            createdAtMs:
              d.createdAt && typeof d.createdAt.toMillis === 'function'
                ? d.createdAt.toMillis()
                : Date.now(),
          });
        });
        list.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setStudyGroups(list);
        setStudyGroupsLoading(false);
      },
      (error) => {
        setStudyGroupsLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'studyGroups');
      }
    );

    return () => {
      unsubUser();
      unsubProgress();
      unsubNotes();
      unsubLogs();
      unsubAttempts();
      unsubFcmTokens();
      unsubLeaderboard();
      unsubStudyGroups();
    };
  }, [user, profileReady]);

  // Listen to each group member snapshot via single-document get listeners (no list query needed)
  useEffect(() => {
    if (!user || !profileReady || studyGroups.length === 0) {
      setStudyGroupMembers({});
      return;
    }

    const activeGroupIds = new Set(studyGroups.map((g) => g.groupId));
    setStudyGroupMembers((prev) => {
      const pruned: Record<string, StudyGroupMember[]> = {};
      for (const gid of Object.keys(prev)) {
        if (activeGroupIds.has(gid)) {
          pruned[gid] = prev[gid];
        }
      }
      return pruned;
    });

    const unsubs: (() => void)[] = [];

    for (const group of studyGroups) {
      const validIds = new Set(group.memberIds);
      setStudyGroupMembers((prev) => ({
        ...prev,
        [group.groupId]: (prev[group.groupId] ?? []).filter((m) => validIds.has(m.userId)),
      }));

      for (const memberId of group.memberIds) {
        const memberPath = `studyGroups/${group.groupId}/members/${memberId}`;
        const unsub = onSnapshot(
          doc(db, 'studyGroups', group.groupId, 'members', memberId),
          (snap) => {
            if (!snap.exists()) {
              setStudyGroupMembers((prev) => ({
                ...prev,
                [group.groupId]: (prev[group.groupId] ?? []).filter((m) => m.userId !== memberId),
              }));
              return;
            }
            const d = snap.data();
            const rawScores = Array.isArray(d.moduleScores) ? d.moduleScores : [];
            const moduleScores = LESSONS.map((_, idx) => {
              const v = Number(rawScores[idx]);
              return Number.isFinite(v) ? Math.max(-1, Math.min(100, Math.round(v))) : -1;
            });
            const memberObj: StudyGroupMember = {
              userId: String(d.userId || memberId),
              groupId: String(d.groupId || group.groupId),
              displayName: String(d.displayName || 'Radio Studente'),
              role: d.role === 'owner' ? 'owner' : 'member',
              xp: Number(d.xp ?? 0),
              rankLevel: Number(d.rankLevel ?? 1),
              streakCount: Number(d.streakCount ?? 0),
              completedLessons: sanitizeLessonsTouched(d.completedLessons),
              moduleScores,
              avgQuizScore: Number(d.avgQuizScore ?? 0),
              totalQuizAttempts: Number(d.totalQuizAttempts ?? 0),
              examBestScore: Number(d.examBestScore ?? -1),
              badgesCount: Number(d.badgesCount ?? 0),
              totalMinutesStudied: Number(d.totalMinutesStudied ?? 0),
              joinedAtMs: Number(d.joinedAtMs ?? Date.now()),
            };
            setStudyGroupMembers((prev) => {
              const others = (prev[group.groupId] ?? []).filter((m) => m.userId !== memberId);
              const next = [...others, memberObj].sort(
                (a, b) =>
                  b.completedLessons.length - a.completedLessons.length ||
                  b.avgQuizScore - a.avgQuizScore ||
                  b.xp - a.xp
              );
              return { ...prev, [group.groupId]: next };
            });
          },
          (error) => {
            const msg = error instanceof Error ? error.message.toLowerCase() : '';
            if (msg.includes('permission')) {
              return;
            }
            handleFirestoreError(error, OperationType.GET, memberPath);
          }
        );
        unsubs.push(unsub);
      }
    }

    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, [user, profileReady, studyGroups]);

  // Automatically sync current user's study & quiz stats into all joined study groups
  useEffect(() => {
    if (!user || !profileReady || studyGroups.length === 0) return;
    const uid = user.uid;
    const stats = buildMemberStatsSnapshot(profile, lessonProgress, quizAttempts);
    const localFingerprint = JSON.stringify(stats);

    const timer = window.setTimeout(() => {
      void (async () => {
        for (const group of studyGroupsRef.current) {
          const existingRemote = (studyGroupMembersRef.current[group.groupId] ?? []).find(
            (m) => m.userId === uid
          );
          if (existingRemote) {
            const remoteFingerprint = JSON.stringify({
              displayName: existingRemote.displayName,
              xp: existingRemote.xp,
              rankLevel: existingRemote.rankLevel,
              streakCount: existingRemote.streakCount,
              completedLessons: existingRemote.completedLessons,
              moduleScores: existingRemote.moduleScores,
              avgQuizScore: existingRemote.avgQuizScore,
              totalQuizAttempts: existingRemote.totalQuizAttempts,
              examBestScore: existingRemote.examBestScore,
              badgesCount: existingRemote.badgesCount,
              totalMinutesStudied: existingRemote.totalMinutesStudied,
            });
            if (remoteFingerprint === localFingerprint) continue;
          }

          const memberRef = doc(db, 'studyGroups', group.groupId, 'members', uid);
          const memberPath = `studyGroups/${group.groupId}/members/${uid}`;
          try {
            if (existingRemote) {
              await updateDoc(memberRef, {
                ...stats,
                updatedAt: serverTimestamp(),
              });
            } else {
              const existingSnap = await getDoc(memberRef);
              if (existingSnap.exists()) {
                await updateDoc(memberRef, {
                  ...stats,
                  updatedAt: serverTimestamp(),
                });
              } else {
                await setDoc(memberRef, {
                  userId: uid,
                  groupId: group.groupId,
                  role: group.ownerId === uid ? 'owner' : 'member',
                  joinedAtMs: Date.now(),
                  ...stats,
                  updatedAt: serverTimestamp(),
                });
              }
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, memberPath);
          }
        }
      })();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [user, profileReady, profile, lessonProgress, quizAttempts, studyGroups]);

  // Automatically sync current user's public leaderboard entry when participating in Study Groups or opt-in ranking
  useEffect(() => {
    if (!user || !profileReady || studyGroupsLoading) return;
    const uid = user.uid;
    const groupsCount = Math.max(0, Math.min(100, studyGroups.length));
    const shouldShare = profile.shareInLeaderboard || groupsCount > 0;
    const completedCount = Object.values(lessonProgress).filter((lp) => lp.completed).length;
    const nickname = (profile.displayName.trim() || 'Radio Studente').slice(0, 40);
    const xp = Math.max(0, Math.min(1000000, Math.round(profile.xp)));
    const currentWeekKey = getIsoWeekKey();
    const wkXp =
      profile.weeklyXpWeekKey === currentWeekKey
        ? Math.max(0, Math.min(1000000, Math.round(profile.weeklyXp)))
        : 0;
    const rankLevel = Math.max(1, Math.min(5, Math.floor(getRankForXp(xp).currentRank.level)));
    const badgesCount = Math.max(0, Math.min(17, Math.floor(profile.unlockedBadges.length)));

    const desiredKey = shouldShare
      ? JSON.stringify({
          n: nickname,
          x: xp,
          wk: currentWeekKey,
          wx: wkXp,
          r: rankLevel,
          c: completedCount,
          b: badgesCount,
          g: groupsCount,
        })
      : 'deleted';

    const existingRemote = leaderboardEntriesRef.current.find((e) => e.userId === uid);
    if (shouldShare && existingRemote) {
      const remoteKey = JSON.stringify({
        n: existingRemote.nickname,
        x: Math.round(existingRemote.xp),
        wk: existingRemote.weeklyXpWeekKey || '',
        wx: Math.round(existingRemote.weeklyXp ?? 0),
        r: Math.floor(existingRemote.rankLevel),
        c: Math.floor(existingRemote.completedLessonsCount),
        b: Math.floor(existingRemote.badgesCount),
        g: Math.floor(existingRemote.studyGroupsCount ?? 0),
      });
      if (remoteKey === desiredKey) {
        lastLbSyncKeyRef.current = desiredKey;
        return;
      }
    } else if (!shouldShare && !existingRemote && lastLbSyncKeyRef.current === 'deleted') {
      return;
    }

    if (lastLbSyncKeyRef.current === desiredKey) return;

    const timer = window.setTimeout(() => {
      void syncLeaderboardDoc(uid, {
        share: profile.shareInLeaderboard,
        displayName: nickname,
        xp,
        weeklyXpWeekKey: currentWeekKey,
        weeklyXp: wkXp,
        badgesCount,
        completedLessonsCount: completedCount,
        studyGroupsCount: groupsCount,
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [
    user,
    profileReady,
    studyGroupsLoading,
    studyGroups.length,
    profile.shareInLeaderboard,
    profile.displayName,
    profile.xp,
    profile.weeklyXpWeekKey,
    profile.weeklyXp,
    profile.unlockedBadges.length,
    lessonProgress,
    syncLeaderboardDoc,
  ]);

  // Track interaction events so idle users don't falsely accumulate study time
  useEffect(() => {
    const bump = () => {
      lastInteractionAtRef.current = Date.now();
    };
    window.addEventListener('pointerdown', bump);
    window.addEventListener('keydown', bump);
    return () => {
      window.removeEventListener('pointerdown', bump);
      window.removeEventListener('keydown', bump);
    };
  }, []);

  const commitStudyMinutes = useCallback(
    async (minutesDelta: number, lessonId?: LessonId) => {
      if (minutesDelta <= 0) return;
      const today = formatDateKey();
      const yesterday = getYesterdayKey();
      const current = profileRef.current;

      const baseTodayMinutes = current.todayDateKey === today ? current.todayMinutesStudied : 0;
      const nextTodayMinutes = Math.min(1440, Math.round(baseTodayMinutes + minutesDelta));

      let nextStreak = current.streakCount;
      let nextLastStudy = current.lastStudyDate;
      if (nextTodayMinutes >= 1) {
        if (current.lastStudyDate === today) {
          nextStreak = Math.max(1, current.streakCount);
        } else if (current.lastStudyDate === yesterday) {
          nextStreak = current.streakCount + 1;
          nextLastStudy = today;
        } else {
          nextStreak = 1;
          nextLastStudy = today;
        }
      }

      if (!user || !profileReady) {
        setProfile((prev) => ({
          ...prev,
          todayDateKey: today,
          todayMinutesStudied: nextTodayMinutes,
          streakCount: nextStreak,
          lastStudyDate: nextLastStudy,
        }));
        setStudyLogs((prev) => {
          const existingLog = prev[today];
          const touched = lessonId
            ? sanitizeLessonsTouched([...(existingLog?.lessonsTouched ?? []), lessonId])
            : existingLog?.lessonsTouched ?? [];
          return {
            ...prev,
            [today]: {
              userId: 'guest',
              dateKey: today,
              minutesStudied: Math.min(1440, Math.round((existingLog?.minutesStudied ?? 0) + minutesDelta)),
              lessonsTouched: touched,
            },
          };
        });
        if (lessonId) {
          setLessonProgress((prev) => {
            const ex = prev[lessonId];
            return {
              ...prev,
              [lessonId]: {
                userId: 'guest',
                lessonId,
                completedSections: ex?.completedSections ?? [],
                quizBestScore: ex?.quizBestScore ?? 0,
                quizAttempts: ex?.quizAttempts ?? 0,
                xpEarned: ex?.xpEarned ?? 0,
                completed: Boolean(ex?.completed),
                minutesStudied: Math.min(10000, Math.round((ex?.minutesStudied ?? 0) + minutesDelta)),
              },
            };
          });
        }
        return;
      }

      const uid = user.uid;
      const userPath = `users/${uid}`;
      try {
        await updateDoc(doc(db, 'users', uid), {
          xp: Math.max(0, Math.min(1000000, Math.round(current.xp))),
          streakCount: Math.max(0, Math.min(10000, Math.floor(nextStreak))),
          lastStudyDate: nextLastStudy.slice(0, 20),
          todayDateKey: today,
          todayMinutesStudied: nextTodayMinutes,
          unlockedBadges: sanitizeBadges(current.unlockedBadges),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, userPath);
      }

      const logPath = `users/${uid}/studyLogs/${today}`;
      const existingLog = studyLogsRef.current[today];
      const touched = lessonId
        ? sanitizeLessonsTouched([...(existingLog?.lessonsTouched ?? []), lessonId])
        : existingLog?.lessonsTouched ?? [];
      const nextMinutes = Math.min(1440, Math.round((existingLog?.minutesStudied ?? 0) + minutesDelta));

      try {
        if (existingLog) {
          await updateDoc(doc(db, 'users', uid, 'studyLogs', today), {
            minutesStudied: nextMinutes,
            lessonsTouched: touched,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'users', uid, 'studyLogs', today), {
            userId: uid,
            dateKey: today,
            minutesStudied: nextMinutes,
            lessonsTouched: touched,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, logPath);
      }

      if (lessonId) {
        const existingLp = lessonProgressRef.current[lessonId];
        const nextLpMinutes = Math.min(
          10000,
          Math.round((existingLp?.minutesStudied ?? 0) + minutesDelta)
        );
        try {
          if (existingLp) {
            await updateDoc(doc(db, 'users', uid, 'lessonProgress', lessonId), {
              completedSections: sanitizeSections(existingLp.completedSections),
              quizBestScore: Math.round(existingLp.quizBestScore),
              quizAttempts: Math.floor(existingLp.quizAttempts),
              xpEarned: Math.round(existingLp.xpEarned),
              completed: Boolean(existingLp.completed),
              minutesStudied: nextLpMinutes,
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(doc(db, 'users', uid, 'lessonProgress', lessonId), {
              userId: uid,
              lessonId,
              completedSections: [],
              quizBestScore: 0,
              quizAttempts: 0,
              xpEarned: 0,
              completed: false,
              minutesStudied: nextLpMinutes,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}/lessonProgress/${lessonId}`);
        }
      }
    },
    [user, profileReady]
  );

  // Active study second counter (flushes every 60s of active engagement)
  useEffect(() => {
    if (!isTrackingStudy) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (Date.now() - lastInteractionAtRef.current > 2 * 60 * 1000) return;

      setActiveSessionSeconds((s) => s + 1);
      pendingMinuteSecondsRef.current += 1;
      if (pendingMinuteSecondsRef.current >= 60) {
        pendingMinuteSecondsRef.current = 0;
        void commitStudyMinutes(1, activeStudyLessonRef.current ?? undefined);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isTrackingStudy, commitStudyMinutes]);

  // Listen to foreground FCM messages while app is open
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let active = true;
    void subscribeForegroundFcm((payload) => {
      const title =
        payload.notification?.title ||
        payload.data?.title ||
        'Radiotecnica easy · Promemoria di studio';
      const body =
        payload.notification?.body ||
        payload.data?.body ||
        profileRef.current.reminderMessage ||
        `È il momento dei tuoi ${profileRef.current.dailyGoalMinutes} minuti di radiotecnica!`;
      setNotificationBanner(body);
      void showBrowserOrSwNotification(title, body);
    }).then((fn) => {
      if (active) {
        unsub = fn;
      } else if (fn) {
        fn();
      }
    });
    return () => {
      active = false;
      if (unsub) unsub();
    };
  }, []);

  // Multi-schedule reminder checker when app is open (respects custom reminderTimes & timezone)
  useEffect(() => {
    const checkReminder = () => {
      const current = profileRef.current;
      if (!current.reminderEnabled) return;
      const clock = getClockInTimezone(current.reminderTimezone || getLocalTimezone());
      if (!current.reminderDays.includes(clock.dayKey)) return;

      const times = sanitizeReminderTimes(current.reminderTimes, current.reminderTime);
      if (!times.includes(clock.hm)) return;

      const sentKey = `radiotecnica_easy_notified_${clock.dateKey}_${clock.hm}`;
      if (localStorage.getItem(sentKey)) return;
      localStorage.setItem(sentKey, '1');

      const body =
        current.reminderMessage ||
        `È ora della tua sessione da ${current.dailyGoalMinutes} minuti su Radiotecnica easy!`;
      setNotificationBanner(body);
      void showBrowserOrSwNotification('Radiotecnica easy · Promemoria di studio', body);
    };

    const interval = window.setInterval(checkReminder, 20000);
    return () => window.clearInterval(interval);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.includes('popup-closed-by-user')
            ? 'Accesso annullato prima del completamento.'
            : `Accesso non riuscito: ${error.message}`
          : 'Errore durante l’accesso con Google.';
      setAuthError(message);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    clearGuestStorage();
    setLessonProgress({});
    setLessonNotes({});
    setStudyLogs({});
    setQuizAttempts([]);
    setFcmDevices([]);
    setLeaderboardEntries([]);
    setProfile(buildDefaultProfile('guest', 'Radio Studente'));
    await signOut(auth);
  }, []);

  const updateUserPreferences = useCallback(
    async (patch: UserPreferencesPatch) => {
      const cleanPatch: Record<string, unknown> = {};
      if (patch.dailyGoalMinutes !== undefined) {
        cleanPatch.dailyGoalMinutes = sanitizeGoal(patch.dailyGoalMinutes);
      }
      if (patch.theme !== undefined) {
        cleanPatch.theme = sanitizeTheme(patch.theme);
      }
      if (patch.exampleDomain !== undefined) {
        cleanPatch.exampleDomain = sanitizeDomain(patch.exampleDomain);
      }
      if (patch.shareInLeaderboard !== undefined) {
        cleanPatch.shareInLeaderboard = Boolean(patch.shareInLeaderboard);
      }
      if (patch.focusMode !== undefined) {
        cleanPatch.focusMode = Boolean(patch.focusMode);
      }
      if (patch.soundEffectsEnabled !== undefined) {
        cleanPatch.soundEffectsEnabled = Boolean(patch.soundEffectsEnabled);
      }
      if (patch.hapticFeedbackEnabled !== undefined) {
        cleanPatch.hapticFeedbackEnabled = Boolean(patch.hapticFeedbackEnabled);
      }
      if (patch.displayName !== undefined) {
        const trimmed = patch.displayName.trim().slice(0, 100);
        if (trimmed.length >= 1) {
          cleanPatch.displayName = trimmed;
        }
      }

      if (Object.keys(cleanPatch).length === 0) return;

      if (!user || !profileReady) {
        setProfile((prev) => ({ ...prev, ...(cleanPatch as Partial<UserProfile>) }));
        return;
      }

      const uid = user.uid;
      try {
        await updateDoc(doc(db, 'users', uid), {
          ...cleanPatch,
          updatedAt: serverTimestamp(),
        });

        const cur = profileRef.current;
        const nextShare =
          patch.shareInLeaderboard !== undefined
            ? Boolean(patch.shareInLeaderboard)
            : cur.shareInLeaderboard;
        const nextName =
          typeof cleanPatch.displayName === 'string' ? cleanPatch.displayName : cur.displayName;
        if (
          patch.shareInLeaderboard !== undefined ||
          ((nextShare || studyGroupsRef.current.length > 0) && cleanPatch.displayName !== undefined)
        ) {
          const completedCount = Object.values(lessonProgressRef.current).filter(
            (lp) => lp.completed
          ).length;
          const nextWk = computeNextWeeklyXp(cur, 0);
          await syncLeaderboardDoc(uid, {
            share: nextShare,
            displayName: nextName,
            xp: cur.xp,
            weeklyXpWeekKey: nextWk.weeklyXpWeekKey,
            weeklyXp: nextWk.weeklyXp,
            badgesCount: cur.unlockedBadges.length,
            completedLessonsCount: completedCount,
            studyGroupsCount: studyGroupsRef.current.length,
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      }
    },
    [user, profileReady, syncLeaderboardDoc]
  );

  const updateDailyGoal = useCallback(
    async (minutes: DailyGoalMinutes) => {
      await updateUserPreferences({ dailyGoalMinutes: minutes });
    },
    [updateUserPreferences]
  );

  const updateReminderSettings = useCallback(
    async (settings: {
      reminderEnabled: boolean;
      fcmEnabled?: boolean;
      reminderTime?: string;
      reminderTimes?: string[];
      reminderTimezone?: string;
      reminderDays: DayKey[];
      reminderMessage: string;
    }) => {
      const cleanTimes = sanitizeReminderTimes(
        settings.reminderTimes,
        settings.reminderTime ?? profileRef.current.reminderTime
      );
      const cleanTimezone = sanitizeTimezone(
        settings.reminderTimezone ?? profileRef.current.reminderTimezone
      );
      const clean = {
        reminderEnabled: Boolean(settings.reminderEnabled),
        fcmEnabled:
          settings.fcmEnabled !== undefined
            ? Boolean(settings.fcmEnabled)
            : profileRef.current.fcmEnabled,
        reminderTime: cleanTimes[0],
        reminderTimes: cleanTimes,
        reminderTimezone: cleanTimezone,
        reminderDays: sanitizeDays(settings.reminderDays),
        reminderMessage: settings.reminderMessage.trim().slice(0, 160),
      };
      if (!user || !profileReady) {
        setProfile((prev) => ({ ...prev, ...clean }));
        return;
      }
      const uid = user.uid;
      try {
        await updateDoc(doc(db, 'users', uid), {
          ...clean,
          updatedAt: serverTimestamp(),
        });
        // Keep all registered FCM device token schedules synchronized with the profile schedule
        const nowMs = Date.now();
        for (const device of fcmDevicesRef.current) {
          const tokenPath = `users/${uid}/fcmTokens/${device.deviceId}`;
          try {
            await updateDoc(doc(db, 'users', uid, 'fcmTokens', device.deviceId), {
              token: device.token,
              deviceLabel: device.deviceLabel,
              timezone: cleanTimezone,
              reminderEnabled: clean.reminderEnabled && clean.fcmEnabled,
              reminderTimes: clean.reminderTimes,
              reminderDays: clean.reminderDays,
              reminderMessage: clean.reminderMessage,
              updatedAtMs: nowMs,
              updatedAt: serverTimestamp(),
            });
          } catch (tokenErr) {
            handleFirestoreError(tokenErr, OperationType.UPDATE, tokenPath);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      }
    },
    [user, profileReady]
  );

  const registerFcmDevice = useCallback(async (): Promise<FcmRegistrationResult> => {
    const result = await requestFcmDeviceRegistration();
    const cur = profileRef.current;

    if (result.status === 'granted' && result.token) {
      if (user && profileReady) {
        const uid = user.uid;
        const tokenRef = doc(db, 'users', uid, 'fcmTokens', result.deviceId);
        const tokenPath = `users/${uid}/fcmTokens/${result.deviceId}`;
        const nowMs = Date.now();
        const times = sanitizeReminderTimes(cur.reminderTimes, cur.reminderTime);
        try {
          const existingSnap = await getDoc(tokenRef);
          if (existingSnap.exists()) {
            await updateDoc(tokenRef, {
              token: result.token,
              deviceLabel: result.deviceLabel,
              timezone: cur.reminderTimezone || result.timezone,
              reminderEnabled: true,
              reminderTimes: times,
              reminderDays: sanitizeDays(cur.reminderDays),
              reminderMessage: cur.reminderMessage.slice(0, 160),
              updatedAtMs: nowMs,
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(tokenRef, {
              userId: uid,
              deviceId: result.deviceId,
              token: result.token,
              deviceLabel: result.deviceLabel,
              timezone: cur.reminderTimezone || result.timezone,
              reminderEnabled: true,
              reminderTimes: times,
              reminderDays: sanitizeDays(cur.reminderDays),
              reminderMessage: cur.reminderMessage.slice(0, 160),
              updatedAtMs: nowMs,
              updatedAt: serverTimestamp(),
            });
          }
          await updateDoc(doc(db, 'users', uid), {
            reminderEnabled: true,
            fcmEnabled: true,
            reminderTime: times[0],
            reminderTimes: times,
            reminderTimezone: cur.reminderTimezone || result.timezone,
            reminderDays: sanitizeDays(cur.reminderDays),
            reminderMessage: cur.reminderMessage.slice(0, 160),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, tokenPath);
        }
      } else {
        setProfile((prev) => ({ ...prev, reminderEnabled: true, fcmEnabled: true }));
      }
    } else if (result.status === 'permission-only') {
      if (user && profileReady) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            reminderEnabled: true,
            fcmEnabled: cur.fcmEnabled,
            reminderTime: cur.reminderTime,
            reminderTimes: sanitizeReminderTimes(cur.reminderTimes, cur.reminderTime),
            reminderTimezone: cur.reminderTimezone || result.timezone,
            reminderDays: sanitizeDays(cur.reminderDays),
            reminderMessage: cur.reminderMessage.slice(0, 160),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        }
      } else {
        setProfile((prev) => ({ ...prev, reminderEnabled: true }));
      }
    }

    return result;
  }, [user, profileReady]);

  const removeFcmDevice = useCallback(
    async (deviceId: string) => {
      if (deviceId === getOrCreateFcmDeviceId()) {
        await revokeFcmTokenOnDevice();
      }
      if (!user || !profileReady) return;
      const uid = user.uid;
      const tokenPath = `users/${uid}/fcmTokens/${deviceId}`;
      try {
        await deleteDoc(doc(db, 'users', uid, 'fcmTokens', deviceId));
        const remaining = fcmDevicesRef.current.filter((d) => d.deviceId !== deviceId);
        if (remaining.length === 0) {
          await updateDoc(doc(db, 'users', uid), {
            reminderEnabled: profileRef.current.reminderEnabled,
            fcmEnabled: false,
            reminderTime: profileRef.current.reminderTime,
            reminderTimes: sanitizeReminderTimes(
              profileRef.current.reminderTimes,
              profileRef.current.reminderTime
            ),
            reminderTimezone: sanitizeTimezone(profileRef.current.reminderTimezone),
            reminderDays: sanitizeDays(profileRef.current.reminderDays),
            reminderMessage: profileRef.current.reminderMessage.slice(0, 160),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, tokenPath);
      }
    },
    [user, profileReady]
  );

  const createStudyGroup = useCallback(
    async (
      rawName: string,
      rawDescription: string
    ): Promise<{ ok: boolean; group?: StudyGroup; error?: string }> => {
      if (!user || !profileReady) {
        return {
          ok: false,
          error: 'Accedi con Google per creare un gruppo di studio sincronizzato.',
        };
      }
      const name = rawName.trim().slice(0, 60);
      const description = rawDescription.trim().slice(0, 160);
      if (name.length < 2) {
        return { ok: false, error: 'Inserisci un nome di almeno 2 caratteri per il gruppo.' };
      }

      const uid = user.uid;
      const groupId = `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

      // Pick a collision-free invite code
      let inviteCode = generateInviteCode(6);
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const existingInvite = await getDoc(doc(db, 'studyGroupInvites', inviteCode));
          if (!existingInvite.exists()) break;
        } catch {
          break;
        }
        inviteCode = generateInviteCode(6);
      }

      const stats = buildMemberStatsSnapshot(
        profileRef.current,
        lessonProgressRef.current,
        quizAttemptsRef.current
      );
      const nowMs = Date.now();
      const batch = writeBatch(db);

      batch.set(doc(db, 'studyGroups', groupId), {
        groupId,
        name,
        description,
        inviteCode,
        ownerId: uid,
        ownerName: stats.displayName,
        memberIds: [uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'studyGroupInvites', inviteCode), {
        inviteCode,
        groupId,
        groupName: name,
        ownerId: uid,
        createdAt: serverTimestamp(),
      });

      batch.set(doc(db, 'studyGroups', groupId, 'members', uid), {
        userId: uid,
        groupId,
        role: 'owner',
        joinedAtMs: nowMs,
        ...stats,
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
        return {
          ok: true,
          group: {
            groupId,
            name,
            description,
            inviteCode,
            ownerId: uid,
            ownerName: stats.displayName,
            memberIds: [uid],
            createdAtMs: nowMs,
          },
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `studyGroups/${groupId}`);
        return { ok: false, error: 'Impossibile creare il gruppo di studio.' };
      }
    },
    [user, profileReady]
  );

  const joinStudyGroupByCode = useCallback(
    async (
      rawCode: string
    ): Promise<{ ok: boolean; groupId?: string; groupName?: string; error?: string }> => {
      if (!user || !profileReady) {
        return {
          ok: false,
          error: 'Accedi con Google per unirti a un gruppo di studio.',
        };
      }
      const code = rawCode
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      if (!/^[A-Z0-9]{6,10}$/.test(code)) {
        return {
          ok: false,
          error: 'Il codice invito deve contenere da 6 a 10 caratteri alfanumerici.',
        };
      }

      const uid = user.uid;
      let inviteSnap;
      try {
        inviteSnap = await getDoc(doc(db, 'studyGroupInvites', code));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `studyGroupInvites/${code}`);
        return { ok: false, error: 'Errore durante la verifica del codice invito.' };
      }

      if (!inviteSnap.exists()) {
        return {
          ok: false,
          error: 'Codice invito non trovato. Verifica le lettere con chi te lo ha inviato.',
        };
      }

      const inviteData = inviteSnap.data();
      const groupId = String(inviteData.groupId || '');
      const groupName = String(inviteData.groupName || 'Gruppo di Studio');

      if (!groupId) {
        return { ok: false, error: 'Invito non valido.' };
      }

      if (studyGroupsRef.current.some((g) => g.groupId === groupId)) {
        return {
          ok: false,
          groupId,
          groupName,
          error: `Fai già parte del gruppo "${groupName}".`,
        };
      }

      const stats = buildMemberStatsSnapshot(
        profileRef.current,
        lessonProgressRef.current,
        quizAttemptsRef.current
      );
      const batch = writeBatch(db);
      batch.update(doc(db, 'studyGroups', groupId), {
        memberIds: arrayUnion(uid),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'studyGroups', groupId, 'members', uid), {
        userId: uid,
        groupId,
        role: 'member',
        joinedAtMs: Date.now(),
        ...stats,
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
        return { ok: true, groupId, groupName };
      } catch (err) {
        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        if (msg.includes('permission')) {
          return {
            ok: false,
            error:
              'Impossibile unirsi al gruppo: potrebbe aver raggiunto il limite massimo di 30 partecipanti.',
          };
        }
        handleFirestoreError(err, OperationType.WRITE, `studyGroups/${groupId}`);
        return { ok: false, error: 'Errore durante l’ingresso nel gruppo.' };
      }
    },
    [user, profileReady]
  );

  const leaveStudyGroup = useCallback(
    async (groupId: string) => {
      if (!user || !profileReady) return;
      const uid = user.uid;
      const group = studyGroupsRef.current.find((g) => g.groupId === groupId);
      if (!group || group.ownerId === uid) return;

      const batch = writeBatch(db);
      batch.update(doc(db, 'studyGroups', groupId), {
        memberIds: arrayRemove(uid),
        updatedAt: serverTimestamp(),
      });
      batch.delete(doc(db, 'studyGroups', groupId, 'members', uid));

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `studyGroups/${groupId}`);
      }
    },
    [user, profileReady]
  );

  const removeMemberFromGroup = useCallback(
    async (groupId: string, targetUserId: string) => {
      if (!user || !profileReady) return;
      const uid = user.uid;
      const group = studyGroupsRef.current.find((g) => g.groupId === groupId);
      if (!group || group.ownerId !== uid || targetUserId === uid) return;

      const batch = writeBatch(db);
      batch.update(doc(db, 'studyGroups', groupId), {
        memberIds: arrayRemove(targetUserId),
        updatedAt: serverTimestamp(),
      });
      batch.delete(doc(db, 'studyGroups', groupId, 'members', targetUserId));

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `studyGroups/${groupId}`);
      }
    },
    [user, profileReady]
  );

  const deleteStudyGroup = useCallback(
    async (groupId: string) => {
      if (!user || !profileReady) return;
      const uid = user.uid;
      const group = studyGroupsRef.current.find((g) => g.groupId === groupId);
      if (!group || group.ownerId !== uid) return;

      const batch = writeBatch(db);
      for (const memberId of group.memberIds) {
        batch.delete(doc(db, 'studyGroups', groupId, 'members', memberId));
      }
      if (group.inviteCode) {
        batch.delete(doc(db, 'studyGroupInvites', group.inviteCode));
      }
      batch.delete(doc(db, 'studyGroups', groupId));

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `studyGroups/${groupId}`);
      }
    },
    [user, profileReady]
  );

  const touchLessonStudy = useCallback(
    async (lessonId: LessonId, bonusMinutes = 0) => {
      if (bonusMinutes > 0) {
        await commitStudyMinutes(bonusMinutes, lessonId);
        return;
      }
      const today = formatDateKey();
      const existingLog = studyLogsRef.current[today];
      const touched = sanitizeLessonsTouched([...(existingLog?.lessonsTouched ?? []), lessonId]);
      if (!user || !profileReady) {
        setStudyLogs((prev) => ({
          ...prev,
          [today]: {
            userId: 'guest',
            dateKey: today,
            minutesStudied: existingLog?.minutesStudied ?? 0,
            lessonsTouched: touched,
          },
        }));
        return;
      }
      const uid = user.uid;
      try {
        if (existingLog) {
          await updateDoc(doc(db, 'users', uid, 'studyLogs', today), {
            minutesStudied: Math.min(1440, Math.round(existingLog.minutesStudied)),
            lessonsTouched: touched,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'users', uid, 'studyLogs', today), {
            userId: uid,
            dateKey: today,
            minutesStudied: 0,
            lessonsTouched: touched,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/studyLogs/${today}`);
      }
    },
    [user, profileReady, commitStudyMinutes]
  );

  const markSectionCompleted = useCallback(
    async (lessonId: LessonId, section: SectionKey) => {
      const existing = lessonProgressRef.current[lessonId];
      if (existing?.completedSections.includes(section)) {
        return;
      }
      const nextSections = sanitizeSections([...(existing?.completedSections ?? []), section]);
      const xpBonus = 25;
      const nextXpEarned = Math.min(5000, (existing?.xpEarned ?? 0) + xpBonus);
      const isCompleted = Boolean(existing?.completed) || nextSections.length === 4;

      const today = formatDateKey();
      const yesterday = getYesterdayKey();
      const curProfile = profileRef.current;
      const nextTotalXp = Math.min(1000000, Math.round(curProfile.xp + xpBonus));
      const nextWk = computeNextWeeklyXp(curProfile, xpBonus);
      const baseTodayMin = curProfile.todayDateKey === today ? curProfile.todayMinutesStudied : 0;
      const nextTodayMin = Math.min(1440, Math.max(baseTodayMin + 1, 1));
      let nextStreak = curProfile.streakCount;
      let nextLastStudy = curProfile.lastStudyDate;
      if (curProfile.lastStudyDate === today) {
        nextStreak = Math.max(1, curProfile.streakCount);
      } else if (curProfile.lastStudyDate === yesterday) {
        nextStreak = curProfile.streakCount + 1;
        nextLastStudy = today;
      } else {
        nextStreak = 1;
        nextLastStudy = today;
      }

      const nextModuleMinutes = Math.min(10000, Math.round((existing?.minutesStudied ?? 0) + 1));

      if (!user || !profileReady) {
        setLessonProgress((prev) => ({
          ...prev,
          [lessonId]: {
            userId: 'guest',
            lessonId,
            completedSections: nextSections,
            quizBestScore: existing?.quizBestScore ?? 0,
            quizAttempts: existing?.quizAttempts ?? 0,
            xpEarned: nextXpEarned,
            completed: isCompleted,
            minutesStudied: nextModuleMinutes,
          },
        }));
        setProfile((prev) => ({
          ...prev,
          xp: nextTotalXp,
          weeklyXpWeekKey: nextWk.weeklyXpWeekKey,
          weeklyXp: nextWk.weeklyXp,
          todayDateKey: today,
          todayMinutesStudied: nextTodayMin,
          streakCount: nextStreak,
          lastStudyDate: nextLastStudy,
        }));
        return;
      }

      const uid = user.uid;
      try {
        if (existing) {
          await updateDoc(doc(db, 'users', uid, 'lessonProgress', lessonId), {
            completedSections: nextSections,
            quizBestScore: Math.round(existing.quizBestScore),
            quizAttempts: Math.floor(existing.quizAttempts),
            xpEarned: Math.round(nextXpEarned),
            completed: isCompleted,
            minutesStudied: nextModuleMinutes,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'users', uid, 'lessonProgress', lessonId), {
            userId: uid,
            lessonId,
            completedSections: nextSections,
            quizBestScore: 0,
            quizAttempts: 0,
            xpEarned: Math.round(nextXpEarned),
            completed: isCompleted,
            minutesStudied: nextModuleMinutes,
            updatedAt: serverTimestamp(),
          });
        }

        await updateDoc(doc(db, 'users', uid), {
          xp: nextTotalXp,
          weeklyXpWeekKey: nextWk.weeklyXpWeekKey,
          weeklyXp: nextWk.weeklyXp,
          streakCount: Math.floor(nextStreak),
          lastStudyDate: nextLastStudy,
          todayDateKey: today,
          todayMinutesStudied: nextTodayMin,
          unlockedBadges: sanitizeBadges(curProfile.unlockedBadges),
          updatedAt: serverTimestamp(),
        });

        if (curProfile.shareInLeaderboard || studyGroupsRef.current.length > 0) {
          const completedMap = {
            ...lessonProgressRef.current,
            [lessonId]: { ...(existing ?? {}), completed: isCompleted },
          };
          const completedCount = Object.values(completedMap).filter((lp) => lp.completed).length;
          await syncLeaderboardDoc(uid, {
            share: curProfile.shareInLeaderboard,
            displayName: curProfile.displayName,
            xp: nextTotalXp,
            weeklyXpWeekKey: nextWk.weeklyXpWeekKey,
            weeklyXp: nextWk.weeklyXp,
            badgesCount: curProfile.unlockedBadges.length,
            completedLessonsCount: completedCount,
            studyGroupsCount: studyGroupsRef.current.length,
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/lessonProgress/${lessonId}`);
      }
    },
    [user, profileReady, syncLeaderboardDoc]
  );

  const deleteLessonNote = useCallback(
    async (lessonId: LessonId) => {
      if (!VALID_LESSONS.has(lessonId)) return;
      if (!user || !profileReady) {
        setLessonNotes((prev) => {
          const next = { ...prev };
          delete next[lessonId];
          return next;
        });
        return;
      }
      const uid = user.uid;
      const notePath = `users/${uid}/lessonNotes/${lessonId}`;
      try {
        await deleteDoc(doc(db, 'users', uid, 'lessonNotes', lessonId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, notePath);
      }
    },
    [user, profileReady]
  );

  const saveLessonNote = useCallback(
    async (lessonId: LessonId, rawContent: string) => {
      if (!VALID_LESSONS.has(lessonId)) return;
      const content = rawContent.slice(0, 10000);
      if (content.trim().length === 0) {
        await deleteLessonNote(lessonId);
        return;
      }
      const updatedAtMs = Date.now();
      if (!user || !profileReady) {
        setLessonNotes((prev) => ({
          ...prev,
          [lessonId]: {
            userId: 'guest',
            lessonId,
            content,
            updatedAtMs,
          },
        }));
        return;
      }
      const uid = user.uid;
      const notePath = `users/${uid}/lessonNotes/${lessonId}`;
      const noteRef = doc(db, 'users', uid, 'lessonNotes', lessonId);
      try {
        const existingSnap = await getDoc(noteRef);
        if (existingSnap.exists()) {
          await updateDoc(noteRef, {
            content,
            updatedAtMs,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(noteRef, {
            userId: uid,
            lessonId,
            content,
            updatedAtMs,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, notePath);
      }
    },
    [user, profileReady, deleteLessonNote]
  );

  const recordQuizResult = useCallback(
    async (
      lessonId: LessonId,
      scorePercent: number,
      correctCountArg?: number,
      totalQuestionsArg?: number
    ): Promise<QuizOutcome> => {
      const clampedScore = Math.max(0, Math.min(100, Math.round(scorePercent)));
      const lessonDef = LESSONS.find((l) => l.id === lessonId);
      const totalQuestions = Math.max(
        1,
        Math.min(30, Math.floor(totalQuestionsArg ?? lessonDef?.quiz.length ?? 10))
      );
      const correctCount = Math.max(
        0,
        Math.min(
          totalQuestions,
          Math.floor(correctCountArg ?? Math.round((clampedScore / 100) * totalQuestions))
        )
      );
      const existing = lessonProgressRef.current[lessonId];
      const curProfile = profileRef.current;

      const previousRankLevel = getRankForXp(curProfile.xp).currentRank.level;

      const passed = clampedScore >= 70;
      const nextSections = passed
        ? sanitizeSections([...(existing?.completedSections ?? []), 'quiz'])
        : sanitizeSections(existing?.completedSections ?? []);
      const prevBest = existing?.quizBestScore ?? 0;
      const nextBest = Math.max(prevBest, clampedScore);
      const nextAttempts = Math.min(10000, (existing?.quizAttempts ?? 0) + 1);

      let xpGained = 20;
      if (passed && prevBest < 70) {
        xpGained += 80;
      } else if (clampedScore > prevBest) {
        xpGained += 25;
      }

      let newlyUnlockedBadge: BadgeId | null = null;
      let nextBadges = sanitizeBadges(curProfile.unlockedBadges);
      if (passed && lessonDef && !nextBadges.includes(lessonDef.badgeId)) {
        newlyUnlockedBadge = lessonDef.badgeId;
        nextBadges = sanitizeBadges([...nextBadges, lessonDef.badgeId]);
        xpGained += 40;
      }

      const currentWeekKey = getIsoWeekKey();
      const baseWeeklyLessons =
        curProfile.weeklyWeekKey === currentWeekKey ? curProfile.weeklyCompletedLessons : [];
      const nextWeeklyLessons = passed
        ? sanitizeLessonsTouched([...baseWeeklyLessons, lessonId])
        : sanitizeLessonsTouched(baseWeeklyLessons);

      const newlyUnlockedWeeklyBadges: WeeklyBadgeId[] = [];
      let weeklyBonusXp = 0;
      if (passed) {
        for (const ch of WEEKLY_CHALLENGES) {
          const allDoneThisWeek = ch.lessonIds.every((id) => nextWeeklyLessons.includes(id));
          if (allDoneThisWeek && !nextBadges.includes(ch.badgeId)) {
            newlyUnlockedWeeklyBadges.push(ch.badgeId);
            nextBadges = sanitizeBadges([...nextBadges, ch.badgeId]);
            weeklyBonusXp += ch.bonusXp;
            xpGained += ch.bonusXp;
          }
        }
      }

      const nextTotalXp = Math.min(1000000, Math.round(curProfile.xp + xpGained));
      const nextWk = computeNextWeeklyXp(curProfile, xpGained);
      const newRankLevel = getRankForXp(nextTotalXp).currentRank.level;

      const nextXpEarned = Math.min(5000, (existing?.xpEarned ?? 0) + xpGained);
      const isCompleted = Boolean(existing?.completed) || passed;
      const nextModuleMinutes = Math.min(10000, Math.round((existing?.minutesStudied ?? 0) + 2));

      const today = formatDateKey();
      const yesterday = getYesterdayKey();
      const baseTodayMin = curProfile.todayDateKey === today ? curProfile.todayMinutesStudied : 0;
      const nextTodayMin = Math.min(1440, baseTodayMin + 2);
      let nextStreak = curProfile.streakCount;
      let nextLastStudy = curProfile.lastStudyDate;
      if (curProfile.lastStudyDate === today) {
        nextStreak = Math.max(1, curProfile.streakCount);
      } else if (curProfile.lastStudyDate === yesterday) {
        nextStreak = curProfile.streakCount + 1;
        nextLastStudy = today;
      } else {
        nextStreak = 1;
        nextLastStudy = today;
      }

      const nowMs = Date.now();
      const attemptId = `lesson_${nowMs}_${Math.random().toString(36).slice(2, 7)}`;
      const attemptLabel = lessonDef
        ? `M${String(lessonDef.number).padStart(2, '0')} · ${lessonDef.shortTitle}`.slice(0, 60)
        : lessonId;

      if (!user || !profileReady) {
        setLessonProgress((prev) => ({
          ...prev,
          [lessonId]: {
            userId: 'guest',
            lessonId,
            completedSections: nextSections,
            quizBestScore: nextBest,
            quizAttempts: nextAttempts,
            xpEarned: nextXpEarned,
            completed: isCompleted,
            minutesStudied: nextModuleMinutes,
          },
        }));
        setQuizAttempts((prev) => [
          ...prev.slice(-199),
          {
            userId: 'guest',
            attemptId,
            kind: 'lesson',
            lessonId,
            label: attemptLabel,
            scorePercent: clampedScore,
            correctCount,
            totalQuestions,
            recordedAtMs: nowMs,
          },
        ]);
        setProfile((prev) => ({
          ...prev,
          xp: nextTotalXp,
          unlockedBadges: nextBadges,
          weeklyWeekKey: currentWeekKey,
          weeklyCompletedLessons: nextWeeklyLessons,
          weeklyXpWeekKey: nextWk.weeklyXpWeekKey,
          weeklyXp: nextWk.weeklyXp,
          todayDateKey: today,
          todayMinutesStudied: nextTodayMin,
          streakCount: nextStreak,
          lastStudyDate: nextLastStudy,
        }));
        setStudyLogs((prev) => {
          const existingLog = prev[today];
          return {
            ...prev,
            [today]: {
              userId: 'guest',
              dateKey: today,
              minutesStudied: Math.min(1440, (existingLog?.minutesStudied ?? 0) + 2),
              lessonsTouched: sanitizeLessonsTouched([...(existingLog?.lessonsTouched ?? []), lessonId]),
            },
          };
        });
        return {
          xpGained,
          newlyUnlockedBadge,
          newlyUnlockedWeeklyBadges,
          weeklyBonusXp,
          previousRankLevel,
          newRankLevel,
        };
      }

      const uid = user.uid;
      try {
        if (existing) {
          await updateDoc(doc(db, 'users', uid, 'lessonProgress', lessonId), {
            completedSections: nextSections,
            quizBestScore: nextBest,
            quizAttempts: Math.floor(nextAttempts),
            xpEarned: Math.round(nextXpEarned),
            completed: isCompleted,
            minutesStudied: nextModuleMinutes,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'users', uid, 'lessonProgress', lessonId), {
            userId: uid,
            lessonId,
            completedSections: nextSections,
            quizBestScore: nextBest,
            quizAttempts: Math.floor(nextAttempts),
            xpEarned: Math.round(nextXpEarned),
            completed: isCompleted,
            minutesStudied: nextModuleMinutes,
            updatedAt: serverTimestamp(),
          });
        }

        await setDoc(doc(db, 'users', uid, 'quizAttempts', attemptId), {
          userId: uid,
          attemptId,
          kind: 'lesson',
          lessonId,
          label: attemptLabel,
          scorePercent: clampedScore,
          correctCount,
          totalQuestions,
          recordedAtMs: nowMs,
          createdAt: serverTimestamp(),
        });

        await updateDoc(doc(db, 'users', uid), {
          xp: nextTotalXp,
          unlockedBadges: nextBadges,
          weeklyWeekKey: currentWeekKey,
          weeklyCompletedLessons: nextWeeklyLessons,
          weeklyXpWeekKey: nextWk.weeklyXpWeekKey,
          weeklyXp: nextWk.weeklyXp,
          streakCount: Math.floor(nextStreak),
          lastStudyDate: nextLastStudy,
          todayDateKey: today,
          todayMinutesStudied: nextTodayMin,
          updatedAt: serverTimestamp(),
        });

        const existingLog = studyLogsRef.current[today];
        const touched = sanitizeLessonsTouched([...(existingLog?.lessonsTouched ?? []), lessonId]);
        const nextMinutes = Math.min(1440, Math.round((existingLog?.minutesStudied ?? 0) + 2));
        if (existingLog) {
          await updateDoc(doc(db, 'users', uid, 'studyLogs', today), {
            minutesStudied: nextMinutes,
            lessonsTouched: touched,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'users', uid, 'studyLogs', today), {
            userId: uid,
            dateKey: today,
            minutesStudied: nextMinutes,
            lessonsTouched: touched,
            updatedAt: serverTimestamp(),
          });
        }

        if (curProfile.shareInLeaderboard || studyGroupsRef.current.length > 0) {
          const completedMap = {
            ...lessonProgressRef.current,
            [lessonId]: { ...(existing ?? {}), completed: isCompleted },
          };
          const completedCount = Object.values(completedMap).filter((lp) => lp.completed).length;
          await syncLeaderboardDoc(uid, {
            share: curProfile.shareInLeaderboard,
            displayName: curProfile.displayName,
            xp: nextTotalXp,
            weeklyXpWeekKey: nextWk.weeklyXpWeekKey,
            weeklyXp: nextWk.weeklyXp,
            badgesCount: nextBadges.length,
            completedLessonsCount: completedCount,
            studyGroupsCount: studyGroupsRef.current.length,
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/lessonProgress/${lessonId}`);
      }

      return {
        xpGained,
        newlyUnlockedBadge,
        newlyUnlockedWeeklyBadges,
        weeklyBonusXp,
        previousRankLevel,
        newRankLevel,
      };
    },
    [user, profileReady, syncLeaderboardDoc]
  );

  const recordQuickReviewResult = useCallback(
    async (
      correctCount: number,
      reviewedLessonIds: LessonId[],
      totalQuestionsArg = 5,
      customLabel?: string
    ): Promise<QuickReviewOutcome> => {
      const clampedTotal = Math.max(1, Math.min(30, Math.floor(totalQuestionsArg)));
      const clampedCorrect = Math.max(0, Math.min(clampedTotal, Math.floor(correctCount)));
      const xpGained = 10 + clampedCorrect * 5;
      const curProfile = profileRef.current;
      const previousRankLevel = getRankForXp(curProfile.xp).currentRank.level;
      const nextTotalXp = Math.min(1000000, Math.round(curProfile.xp + xpGained));
      const nextWk = computeNextWeeklyXp(curProfile, xpGained);
      const newRankLevel = getRankForXp(nextTotalXp).currentRank.level;

      const currentWeekKey = getIsoWeekKey();
      const baseWeeklyLessons =
        curProfile.weeklyWeekKey === currentWeekKey ? curProfile.weeklyCompletedLessons : [];
      const nextWeeklyLessons = sanitizeLessonsTouched(baseWeeklyLessons);

      const today = formatDateKey();
      const yesterday = getYesterdayKey();
      const baseTodayMin = curProfile.todayDateKey === today ? curProfile.todayMinutesStudied : 0;
      const nextTodayMin = Math.min(1440, baseTodayMin + 2);
      let nextStreak = curProfile.streakCount;
      let nextLastStudy = curProfile.lastStudyDate;
      if (curProfile.lastStudyDate === today) {
        nextStreak = Math.max(1, curProfile.streakCount);
      } else if (curProfile.lastStudyDate === yesterday) {
        nextStreak = curProfile.streakCount + 1;
        nextLastStudy = today;
      } else {
        nextStreak = 1;
        nextLastStudy = today;
      }

      const nowMs = Date.now();
      const attemptId = `review_${nowMs}_${Math.random().toString(36).slice(2, 7)}`;
      const reviewScorePct = Math.round((clampedCorrect / clampedTotal) * 100);
      const label = (customLabel || `Ripasso Veloce (${clampedTotal} dom.)`).slice(0, 60);

      if (!user || !profileReady) {
        setQuizAttempts((prev) => [
          ...prev.slice(-199),
          {
            userId: 'guest',
            attemptId,
            kind: 'review',
            lessonId: 'all',
            label,
            scorePercent: reviewScorePct,
            correctCount: clampedCorrect,
            totalQuestions: clampedTotal,
            recordedAtMs: nowMs,
          },
        ]);
        setProfile((prev) => ({
          ...prev,
          xp: nextTotalXp,
          weeklyXpWeekKey: nextWk.weeklyXpWeekKey,
          weeklyXp: nextWk.weeklyXp,
          todayDateKey: today,
          todayMinutesStudied: nextTodayMin,
          streakCount: nextStreak,
          lastStudyDate: nextLastStudy,
        }));
        setStudyLogs((prev) => {
          const existingLog = prev[today];
          return {
            ...prev,
            [today]: {
              userId: 'guest',
              dateKey: today,
              minutesStudied: Math.min(1440, (existingLog?.minutesStudied ?? 0) + 2),
              lessonsTouched: sanitizeLessonsTouched([
                ...(existingLog?.lessonsTouched ?? []),
                ...reviewedLessonIds,
              ]),
            },
          };
        });
        return { xpGained, previousRankLevel, newRankLevel };
      }

      const uid = user.uid;
      try {
        await setDoc(doc(db, 'users', uid, 'quizAttempts', attemptId), {
          userId: uid,
          attemptId,
          kind: 'review',
          lessonId: 'all',
          label,
          scorePercent: reviewScorePct,
          correctCount: clampedCorrect,
          totalQuestions: clampedTotal,
          recordedAtMs: nowMs,
          createdAt: serverTimestamp(),
        });

        await updateDoc(doc(db, 'users', uid), {
          xp: nextTotalXp,
          unlockedBadges: sanitizeBadges(curProfile.unlockedBadges),
          weeklyWeekKey: currentWeekKey,
          weeklyCompletedLessons: nextWeeklyLessons,
          weeklyXpWeekKey: nextWk.weeklyXpWeekKey,
          weeklyXp: nextWk.weeklyXp,
          streakCount: Math.floor(nextStreak),
          lastStudyDate: nextLastStudy,
          todayDateKey: today,
          todayMinutesStudied: nextTodayMin,
          updatedAt: serverTimestamp(),
        });

        const existingLog = studyLogsRef.current[today];
        const touched = sanitizeLessonsTouched([
          ...(existingLog?.lessonsTouched ?? []),
          ...reviewedLessonIds,
        ]);
        const nextMinutes = Math.min(1440, Math.round((existingLog?.minutesStudied ?? 0) + 2));
        if (existingLog) {
          await updateDoc(doc(db, 'users', uid, 'studyLogs', today), {
            minutesStudied: nextMinutes,
            lessonsTouched: touched,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'users', uid, 'studyLogs', today), {
            userId: uid,
            dateKey: today,
            minutesStudied: nextMinutes,
            lessonsTouched: touched,
            updatedAt: serverTimestamp(),
          });
        }

        if (curProfile.shareInLeaderboard || studyGroupsRef.current.length > 0) {
          const completedCount = Object.values(lessonProgressRef.current).filter(
            (lp) => lp.completed
          ).length;
          await syncLeaderboardDoc(uid, {
            share: curProfile.shareInLeaderboard,
            displayName: curProfile.displayName,
            xp: nextTotalXp,
            weeklyXpWeekKey: nextWk.weeklyXpWeekKey,
            weeklyXp: nextWk.weeklyXp,
            badgesCount: curProfile.unlockedBadges.length,
            completedLessonsCount: completedCount,
            studyGroupsCount: studyGroupsRef.current.length,
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      }

      return { xpGained, previousRankLevel, newRankLevel };
    },
    [user, profileReady, syncLeaderboardDoc]
  );

  const recordExamSimulationResult = useCallback(
    async (
      correctCount: number,
      totalQuestions: number,
      elapsedMinutes: number,
      coveredLessonIds: LessonId[]
    ): Promise<ExamSimulationOutcome> => {
      const clampedTotal = Math.max(1, Math.min(30, Math.floor(totalQuestions)));
      const clampedCorrect = Math.max(0, Math.min(clampedTotal, Math.floor(correctCount)));
      const scorePercent = Math.round((clampedCorrect / clampedTotal) * 100);
      const passed = scorePercent >= 70;
      const xpGained = 25 + clampedCorrect * 5 + (passed ? 60 : 0);
      const minutesToAdd = Math.max(1, Math.min(45, Math.round(elapsedMinutes)));

      const curProfile = profileRef.current;
      const previousRankLevel = getRankForXp(curProfile.xp).currentRank.level;
      const nextTotalXp = Math.min(1000000, Math.round(curProfile.xp + xpGained));
      const nextWk = computeNextWeeklyXp(curProfile, xpGained);
      const newRankLevel = getRankForXp(nextTotalXp).currentRank.level;

      const currentWeekKey = getIsoWeekKey();
      const baseWeeklyLessons =
        curProfile.weeklyWeekKey === currentWeekKey ? curProfile.weeklyCompletedLessons : [];
      const nextWeeklyLessons = sanitizeLessonsTouched(baseWeeklyLessons);

      const today = formatDateKey();
      const yesterday = getYesterdayKey();
      const baseTodayMin = curProfile.todayDateKey === today ? curProfile.todayMinutesStudied : 0;
      const nextTodayMin = Math.min(1440, baseTodayMin + minutesToAdd);
      let nextStreak = curProfile.streakCount;
      let nextLastStudy = curProfile.lastStudyDate;
      if (curProfile.lastStudyDate === today) {
        nextStreak = Math.max(1, curProfile.streakCount);
      } else if (curProfile.lastStudyDate === yesterday) {
        nextStreak = curProfile.streakCount + 1;
        nextLastStudy = today;
      } else {
        nextStreak = 1;
        nextLastStudy = today;
      }

      const nowMs = Date.now();
      const attemptId = `exam_${nowMs}_${Math.random().toString(36).slice(2, 7)}`;

      if (!user || !profileReady) {
        setQuizAttempts((prev) => [
          ...prev.slice(-199),
          {
            userId: 'guest',
            attemptId,
            kind: 'exam',
            lessonId: 'all',
            label: `Simulazione Esame (${clampedTotal} dom.)`,
            scorePercent,
            correctCount: clampedCorrect,
            totalQuestions: clampedTotal,
            recordedAtMs: nowMs,
          },
        ]);
        setProfile((prev) => ({
          ...prev,
          xp: nextTotalXp,
          weeklyXpWeekKey: nextWk.weeklyXpWeekKey,
          weeklyXp: nextWk.weeklyXp,
          todayDateKey: today,
          todayMinutesStudied: nextTodayMin,
          streakCount: nextStreak,
          lastStudyDate: nextLastStudy,
        }));
        setStudyLogs((prev) => {
          const existingLog = prev[today];
          return {
            ...prev,
            [today]: {
              userId: 'guest',
              dateKey: today,
              minutesStudied: Math.min(1440, (existingLog?.minutesStudied ?? 0) + minutesToAdd),
              lessonsTouched: sanitizeLessonsTouched([
                ...(existingLog?.lessonsTouched ?? []),
                ...coveredLessonIds,
              ]),
            },
          };
        });
        return { xpGained, passed, previousRankLevel, newRankLevel };
      }

      const uid = user.uid;
      try {
        await setDoc(doc(db, 'users', uid, 'quizAttempts', attemptId), {
          userId: uid,
          attemptId,
          kind: 'exam',
          lessonId: 'all',
          label: `Simulazione Esame (${clampedTotal} dom.)`,
          scorePercent,
          correctCount: clampedCorrect,
          totalQuestions: clampedTotal,
          recordedAtMs: nowMs,
          createdAt: serverTimestamp(),
        });

        await updateDoc(doc(db, 'users', uid), {
          xp: nextTotalXp,
          unlockedBadges: sanitizeBadges(curProfile.unlockedBadges),
          weeklyWeekKey: currentWeekKey,
          weeklyCompletedLessons: nextWeeklyLessons,
          weeklyXpWeekKey: nextWk.weeklyXpWeekKey,
          weeklyXp: nextWk.weeklyXp,
          streakCount: Math.floor(nextStreak),
          lastStudyDate: nextLastStudy,
          todayDateKey: today,
          todayMinutesStudied: nextTodayMin,
          updatedAt: serverTimestamp(),
        });

        const existingLog = studyLogsRef.current[today];
        const touched = sanitizeLessonsTouched([
          ...(existingLog?.lessonsTouched ?? []),
          ...coveredLessonIds,
        ]);
        const nextMinutes = Math.min(
          1440,
          Math.round((existingLog?.minutesStudied ?? 0) + minutesToAdd)
        );
        if (existingLog) {
          await updateDoc(doc(db, 'users', uid, 'studyLogs', today), {
            minutesStudied: nextMinutes,
            lessonsTouched: touched,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'users', uid, 'studyLogs', today), {
            userId: uid,
            dateKey: today,
            minutesStudied: nextMinutes,
            lessonsTouched: touched,
            updatedAt: serverTimestamp(),
          });
        }

        if (curProfile.shareInLeaderboard || studyGroupsRef.current.length > 0) {
          const completedCount = Object.values(lessonProgressRef.current).filter(
            (lp) => lp.completed
          ).length;
          await syncLeaderboardDoc(uid, {
            share: curProfile.shareInLeaderboard,
            displayName: curProfile.displayName,
            xp: nextTotalXp,
            weeklyXpWeekKey: nextWk.weeklyXpWeekKey,
            weeklyXp: nextWk.weeklyXp,
            badgesCount: curProfile.unlockedBadges.length,
            completedLessonsCount: completedCount,
            studyGroupsCount: studyGroupsRef.current.length,
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      }

      return { xpGained, passed, previousRankLevel, newRankLevel };
    },
    [user, profileReady, syncLeaderboardDoc]
  );

  const recordQuestionOutcomes = useCallback(
    async (wrongIds: string[], correctIds: string[]) => {
      const cleanWrong = sanitizeWrongQuestionIds(wrongIds);
      const cleanCorrect = new Set(sanitizeWrongQuestionIds(correctIds));
      const curList = sanitizeWrongQuestionIds(profileRef.current.wrongQuestionIds);
      const nextSet = new Set(curList.filter((id) => !cleanCorrect.has(id)));
      for (const id of cleanWrong) {
        if (!cleanCorrect.has(id)) {
          nextSet.add(id);
        }
      }
      const nextList = Array.from(nextSet).slice(0, 150);
      if (nextList.length === curList.length && nextList.every((v, i) => v === curList[i])) {
        return;
      }
      if (!user || !profileReady) {
        setProfile((prev) => ({ ...prev, wrongQuestionIds: nextList }));
        return;
      }
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          wrongQuestionIds: nextList,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    },
    [user, profileReady]
  );

  const toggleFlashcardMastered = useCallback(
    async (flashcardId: string) => {
      const cleanId = sanitizeMasteredFlashcards([flashcardId])[0];
      if (!cleanId) return;
      const curList = sanitizeMasteredFlashcards(profileRef.current.masteredFlashcards);
      const nextList = curList.includes(cleanId)
        ? curList.filter((id) => id !== cleanId)
        : sanitizeMasteredFlashcards([...curList, cleanId]);

      if (!user || !profileReady) {
        setProfile((prev) => ({ ...prev, masteredFlashcards: nextList }));
        return;
      }
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          masteredFlashcards: nextList,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    },
    [user, profileReady]
  );

  const { currentRank, nextRank } = useMemo(() => getRankForXp(profile.xp), [profile.xp]);

  const value: StudyContextValue = {
    user,
    authLoading,
    authError,
    profile,
    lessonProgress,
    lessonNotes,
    studyLogs,
    quizAttempts,
    fcmDevices,
    leaderboardEntries,
    studyGroups,
    studyGroupMembers,
    studyGroupsLoading,
    currentRank,
    nextRank,
    activeSessionSeconds,
    isTrackingStudy,
    setIsTrackingStudy,
    setActiveStudyLesson,
    signInWithGoogle,
    signOutUser,
    updateDailyGoal,
    updateUserPreferences,
    updateReminderSettings,
    registerFcmDevice,
    removeFcmDevice,
    createStudyGroup,
    joinStudyGroupByCode,
    leaveStudyGroup,
    deleteStudyGroup,
    removeMemberFromGroup,
    markSectionCompleted,
    saveLessonNote,
    deleteLessonNote,
    recordQuizResult,
    recordQuickReviewResult,
    recordExamSimulationResult,
    recordQuestionOutcomes,
    toggleFlashcardMastered,
    touchLessonStudy,
    notificationBanner,
    dismissNotificationBanner: () => setNotificationBanner(null),
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
};

export function useStudy(): StudyContextValue {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used inside StudyProvider');
  return ctx;
}
