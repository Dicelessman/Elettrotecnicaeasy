import type { DayKey } from '../types/radiolab';

export const DAY_LABELS: { key: DayKey; short: string; full: string; icsCode: string }[] = [
  { key: 'mon', short: 'Lun', full: 'Lunedì', icsCode: 'MO' },
  { key: 'tue', short: 'Mar', full: 'Martedì', icsCode: 'TU' },
  { key: 'wed', short: 'Mer', full: 'Mercoledì', icsCode: 'WE' },
  { key: 'thu', short: 'Gio', full: 'Giovedì', icsCode: 'TH' },
  { key: 'fri', short: 'Ven', full: 'Venerdì', icsCode: 'FR' },
  { key: 'sat', short: 'Sab', full: 'Sabato', icsCode: 'SA' },
  { key: 'sun', short: 'Dom', full: 'Domenica', icsCode: 'SU' },
];

export function formatDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayKey(date: Date = new Date()): string {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - 1);
  return formatDateKey(copy);
}

export function getCurrentDayKey(date: Date = new Date()): DayKey {
  const map: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[date.getDay()];
}

export function getLastSevenDateKeys(date: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(date);
    d.setDate(d.getDate() - i);
    keys.push(formatDateKey(d));
  }
  return keys;
}

export function formatShortItalianDate(dateKey: string): string {
  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;
  return `${parts[2]}/${parts[1]}`;
}

export function getClockInTimezone(
  timezone: string,
  date: Date = new Date()
): { dateKey: string; dayKey: DayKey; hm: string } {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hourRaw = getPart('hour');
    const hour = hourRaw === '24' ? '00' : hourRaw.padStart(2, '0');
    const minute = getPart('minute').padStart(2, '0');
    const weekday = getPart('weekday').toLowerCase();
    const dayMap: Record<string, DayKey> = {
      mon: 'mon',
      tue: 'tue',
      wed: 'wed',
      thu: 'thu',
      fri: 'fri',
      sat: 'sat',
      sun: 'sun',
    };
    const dayKey = dayMap[weekday.slice(0, 3)] ?? getCurrentDayKey(date);
    if (/^\d{4}$/.test(year) && /^\d{2}$/.test(month) && /^\d{2}$/.test(day)) {
      return {
        dateKey: `${year}-${month}-${day}`,
        dayKey,
        hm: `${hour}:${minute}`,
      };
    }
  } catch {
    // Fallback to local clock if timezone identifier is invalid on browser
  }
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return {
    dateKey: formatDateKey(date),
    dayKey: getCurrentDayKey(date),
    hm: `${hh}:${mm}`,
  };
}

function escapeIcsText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function downloadDailyReminderIcs(options: {
  time: string;
  times?: string[];
  days: DayKey[];
  goalMinutes: number;
  message: string;
}): void {
  const rawTimes = options.times && options.times.length > 0 ? options.times : [options.time];
  const uniqueTimes = Array.from(new Set(rawTimes)).slice(0, 5);

  const toIcsLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}${m}${day}T${hh}${mm}00`;
  };

  const toIcsUtcStamp = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    return `${y}${m}${day}T${hh}${mm}${ss}Z`;
  };

  const selectedCodes =
    options.days.length > 0
      ? options.days
          .map((day) => DAY_LABELS.find((item) => item.key === day)?.icsCode)
          .filter((code): code is string => Boolean(code))
      : ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

  const rrule =
    selectedCodes.length === 7
      ? 'RRULE:FREQ=DAILY'
      : `RRULE:FREQ=WEEKLY;BYDAY=${selectedCodes.join(',')}`;

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const description = `${options.message || 'Sessione breve di radiotecnica.'}\nObiettivo: ${options.goalMinutes} minuti.\nApri Radiotecnica easy: ${appUrl}`;

  const events: string[] = [];
  uniqueTimes.forEach((t, idx) => {
    const [hourStr, minStr] = t.split(':');
    const hours = Number(hourStr);
    const minutes = Number(minStr);
    const start = new Date();
    start.setHours(Number.isFinite(hours) ? hours : 19, Number.isFinite(minutes) ? minutes : 30, 0, 0);
    if (start.getTime() < Date.now()) {
      start.setDate(start.getDate() + 1);
    }
    const end = new Date(start.getTime() + options.goalMinutes * 60 * 1000);

    events.push(
      'BEGIN:VEVENT',
      `UID:radiotecnica-easy-reminder-${Date.now()}-${idx}@radiotecnicaeasy.app`,
      `DTSTAMP:${toIcsUtcStamp(new Date())}`,
      `DTSTART:${toIcsLocal(start)}`,
      `DTEND:${toIcsLocal(end)}`,
      rrule,
      `SUMMARY:${escapeIcsText(`Radiotecnica easy · ${options.goalMinutes} min di studio`)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT5M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcsText('Tra 5 minuti tocca alla tua pillola di radiotecnica!')}`,
      'END:VALARM',
      'END:VEVENT'
    );
  });

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Radiotecnica easy//Studio Quotidiano//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ];

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'promemoria-radiotecnica-easy.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

