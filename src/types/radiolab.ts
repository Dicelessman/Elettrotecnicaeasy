export type LessonId =
  | 'lesson-01'
  | 'lesson-02'
  | 'lesson-03'
  | 'lesson-04'
  | 'lesson-05'
  | 'lesson-06'
  | 'lesson-07'
  | 'lesson-08'
  | 'lesson-09'
  | 'lesson-10'
  | 'lesson-11'
  | 'lesson-12'
  | 'lesson-13';

export type SectionKey = 'analogy' | 'simulator' | 'formula' | 'quiz';

export type DailyGoalMinutes = 5 | 15 | 30;

export type ThemeMode = 'light' | 'dark';

export type ExampleDomain = 'scout' | 'outdoor' | 'casa';

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type ModuleBadgeId =
  | 'badge-01'
  | 'badge-02'
  | 'badge-03'
  | 'badge-04'
  | 'badge-05'
  | 'badge-06'
  | 'badge-07'
  | 'badge-08'
  | 'badge-09'
  | 'badge-10'
  | 'badge-11'
  | 'badge-12'
  | 'badge-13';

export type WeeklyBadgeId = 'wbadge-01' | 'wbadge-02' | 'wbadge-03' | 'wbadge-04';

export type BadgeId = ModuleBadgeId | WeeklyBadgeId;

export type WeeklyChallengeId = 'weekly-01' | 'weekly-02' | 'weekly-03' | 'weekly-04';

export type AppView =
  | 'path'
  | 'review'
  | 'exam'
  | 'lesson'
  | 'lab'
  | 'utilities'
  | 'glossary'
  | 'groups'
  | 'profile';

export type SimulatorId =
  | 'atoms-flow'
  | 'ohm-batteries'
  | 'ac-oscilloscope'
  | 'capacitor-power'
  | 'inductor-magnet'
  | 'swr-impedance'
  | 'rlc-resonance'
  | 'filters-db'
  | 'diode-transistor'
  | 'modulation-logic'
  | 'antenna-field'
  | 'pre-exam-calc'
  | 'morse-cw';

export interface ConceptBlock {
  title: string;
  body: string;
  tip?: string;
}

export interface CircuitSymbolNote {
  symbol: string;
  name: string;
  role: string;
}

export interface CircuitBasis {
  title: string;
  summary: string;
  diagramId: LessonId;
  symbols: CircuitSymbolNote[];
}

export interface DomainAdaptation {
  hook: string;
  analogyTitle: string;
  analogySteps: string[];
  formulaExample: string;
}

export interface FormulaVariable {
  symbol: string;
  name: string;
  unit: string;
  meaning: string;
}

export interface FormulaBreakdown {
  expression: string;
  title: string;
  plainReading: string;
  variables: FormulaVariable[];
  scoutExample: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonDefinition {
  id: LessonId;
  number: number;
  stage: 1 | 2 | 3 | 4;
  stageLabel: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  estimatedMinutes: number;
  sourceRef: string;
  scoutHook: string;
  analogyTitle: string;
  analogySteps: string[];
  domainVariants: Record<ExampleDomain, DomainAdaptation>;
  circuitBasis: CircuitBasis;
  concepts: ConceptBlock[];
  simulatorId: SimulatorId;
  simulatorTitle: string;
  simulatorChallenge: string;
  formula: FormulaBreakdown;
  quiz: QuizQuestion[];
  badgeId: BadgeId;
}

export interface BadgeDefinition {
  id: BadgeId;
  title: string;
  description: string;
  lessonId: LessonId;
}

export interface RankDefinition {
  level: number;
  title: string;
  minXp: number;
  description: string;
}

export interface GlossaryItem {
  id: string;
  term: string;
  category: 'Basi' | 'AC e Onde' | 'Componenti' | 'Circuiti e Filtri' | 'Radio e Antenne';
  formula?: string;
  plainMeaning: string;
  examTip: string;
  relatedLessonId: LessonId;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  dailyGoalMinutes: DailyGoalMinutes;
  theme: ThemeMode;
  exampleDomain: ExampleDomain;
  shareInLeaderboard: boolean;
  focusMode: boolean;
  soundEffectsEnabled: boolean;
  hapticFeedbackEnabled: boolean;
  xp: number;
  streakCount: number;
  lastStudyDate: string;
  todayDateKey: string;
  todayMinutesStudied: number;
  unlockedBadges: BadgeId[];
  weeklyWeekKey: string;
  weeklyCompletedLessons: LessonId[];
  weeklyXpWeekKey: string;
  weeklyXp: number;
  wrongQuestionIds: string[];
  masteredFlashcards: string[];
  reminderEnabled: boolean;
  fcmEnabled: boolean;
  reminderTime: string;
  reminderTimes: string[];
  reminderTimezone: string;
  reminderDays: DayKey[];
  reminderMessage: string;
}

export interface FcmDeviceToken {
  userId: string;
  deviceId: string;
  token: string;
  deviceLabel: string;
  timezone: string;
  reminderEnabled: boolean;
  reminderTimes: string[];
  reminderDays: DayKey[];
  reminderMessage: string;
  updatedAtMs: number;
}

export interface LessonProgress {
  userId: string;
  lessonId: LessonId;
  completedSections: SectionKey[];
  quizBestScore: number;
  quizAttempts: number;
  xpEarned: number;
  completed: boolean;
  minutesStudied: number;
}

export interface LessonNote {
  userId: string;
  lessonId: LessonId;
  content: string;
  updatedAtMs: number;
}

export type QuizAttemptKind = 'lesson' | 'review' | 'exam';

export interface QuizAttemptRecord {
  userId: string;
  attemptId: string;
  kind: QuizAttemptKind;
  lessonId: LessonId | 'all';
  label: string;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  recordedAtMs: number;
}

export interface StudyLog {
  userId: string;
  dateKey: string;
  minutesStudied: number;
  lessonsTouched: LessonId[];
}

export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  xp: number;
  rankLevel: number;
  completedLessonsCount: number;
  badgesCount: number;
  studyGroupsCount?: number;
  weeklyXpWeekKey?: string;
  weeklyXp?: number;
  isPublic: boolean;
}

export type StudyGroupRole = 'owner' | 'member';

export interface StudyGroup {
  groupId: string;
  name: string;
  description: string;
  inviteCode: string;
  ownerId: string;
  ownerName: string;
  memberIds: string[];
  createdAtMs: number;
}

export interface StudyGroupMember {
  userId: string;
  groupId: string;
  displayName: string;
  role: StudyGroupRole;
  xp: number;
  rankLevel: number;
  streakCount: number;
  completedLessons: LessonId[];
  moduleScores: number[];
  avgQuizScore: number;
  totalQuizAttempts: number;
  examBestScore: number;
  badgesCount: number;
  totalMinutesStudied: number;
  joinedAtMs: number;
}
