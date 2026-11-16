import type { BadgeDefinition, LessonId, WeeklyBadgeId, WeeklyChallengeId } from '../types/radiolab';

export interface WeeklyChallengeDefinition {
  id: WeeklyChallengeId;
  title: string;
  subtitle: string;
  lessonIds: [LessonId, LessonId, LessonId];
  bonusXp: number;
  badgeId: WeeklyBadgeId;
  badgeTitle: string;
  badgeDescription: string;
}

export const WEEKLY_CHALLENGES: WeeklyChallengeDefinition[] = [
  {
    id: 'weekly-01',
    title: 'Sprint Basi Elettriche',
    subtitle: 'Completa in sequenza i primi 3 moduli prima della fine della settimana.',
    lessonIds: ['lesson-01', 'lesson-02', 'lesson-03'],
    bonusXp: 150,
    badgeId: 'wbadge-01',
    badgeTitle: 'Scintilla Lampo',
    badgeDescription: 'Sfida settimanale: Moduli 01 → 02 → 03 completati entro la scadenza.',
  },
  {
    id: 'weekly-02',
    title: 'Maratona Onde & ROS',
    subtitle: 'Domina condensatori, bobine e protezione ROS in un’unica settimana.',
    lessonIds: ['lesson-04', 'lesson-05', 'lesson-06'],
    bonusXp: 150,
    badgeId: 'wbadge-02',
    badgeTitle: 'Scudo d’Onda',
    badgeDescription: 'Sfida settimanale: Moduli 04 → 05 → 06 completati entro la scadenza.',
  },
  {
    id: 'weekly-03',
    title: 'Sfida Sintonia & Silicio',
    subtitle: 'Porta a termine risonanza, filtri in dB, diodi e transistor in 7 giorni.',
    lessonIds: ['lesson-07', 'lesson-08', 'lesson-09'],
    bonusXp: 150,
    badgeId: 'wbadge-03',
    badgeTitle: 'Prisma di Sintonia',
    badgeDescription: 'Sfida settimanale: Moduli 07 → 08 → 09 completati entro la scadenza.',
  },
  {
    id: 'weekly-04',
    title: 'Sprint Finale d’Esame',
    subtitle: 'Chiudi il cerchio con modulazione, antenne e simulazione d’esame.',
    lessonIds: ['lesson-10', 'lesson-11', 'lesson-12'],
    bonusXp: 150,
    badgeId: 'wbadge-04',
    badgeTitle: 'Stella dell’Etere',
    badgeDescription: 'Sfida settimanale: Moduli 10 → 11 → 12 completati entro la scadenza.',
  },
];

export const WEEKLY_BADGES: BadgeDefinition[] = WEEKLY_CHALLENGES.map((ch) => ({
  id: ch.badgeId,
  title: ch.badgeTitle,
  description: ch.badgeDescription,
  lessonId: ch.lessonIds[2],
}));

/**
 * Returns ISO week key in format YYYY-Www (Monday-Sunday local week).
 */
export function getIsoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Returns local timestamp (ms) of the upcoming Sunday 23:59:59.999.
 */
export function getWeekEndTimestamp(date: Date = new Date()): number {
  const day = date.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const end = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + daysUntilSunday,
    23,
    59,
    59,
    999
  );
  return end.getTime();
}

export function formatWeeklyCountdown(endMs: number, nowMs: number = Date.now()): string {
  const diff = Math.max(0, endMs - nowMs);
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}g ${hours}h rimaste`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m rimaste`;
  }
  return `${Math.max(1, minutes)}m rimaste`;
}

export function getFeaturedChallengeIndex(weekKey: string): number {
  const match = /-W(\d{2})$/.exec(weekKey);
  if (!match) return 0;
  const weekNum = Number(match[1]);
  return Number.isFinite(weekNum) ? (weekNum - 1) % WEEKLY_CHALLENGES.length : 0;
}
