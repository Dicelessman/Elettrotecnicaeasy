import { MORSE_TABLE, NATO_ALPHABET, Q_CODES } from './morse';
import { SMART_GLOSSARY_ENTRIES } from './smartGlossary';
import type { LessonId } from '../types/radiolab';

export type FlashcardDeckCategory = 'all' | 'symbols-prefixes' | 'nato-q' | 'glossary-formulas';

export interface UnifiedFlashcard {
  id: string;
  deck: Exclude<FlashcardDeckCategory, 'all'>;
  kindLabel: string;
  categoryLabel: string;
  frontTitle: string;
  frontSubtitle?: string;
  backMain: string;
  backFormula?: string;
  backTip?: string;
  lessonId?: LessonId;
  lessonNumber?: number;
}

export interface Sm2CardRecord {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueAtMs: number;
}

const SM2_STORAGE_KEY = 'radiotecnica_sm2_v1';

const PREFIX_CARDS: UnifiedFlashcard[] = [
  {
    id: 'pref-pico',
    deck: 'symbols-prefixes',
    kindLabel: 'Prefisso SI',
    categoryLabel: 'Scale & Unità',
    frontTitle: 'p (pico)',
    frontSubtitle: 'Es. 100 pF nei circuiti RF',
    backMain: '10⁻¹² (un milionesimo di milionesimo = 0,000000000001). 1.000 pF = 1 nF.',
    backTip: 'Fondamentale per condensatori di sintonia VHF/UHF.',
    lessonId: 'lesson-04',
    lessonNumber: 4,
  },
  {
    id: 'pref-nano',
    deck: 'symbols-prefixes',
    kindLabel: 'Prefisso SI',
    categoryLabel: 'Scale & Unità',
    frontTitle: 'n (nano)',
    frontSubtitle: 'Es. 100 nF di disaccoppiamento',
    backMain: '10⁻⁹ (un miliardesimo). 1.000 nF = 1 µF; 1 nF = 1.000 pF.',
    backTip: 'Il classico "104" ceramico vale 10 × 10⁴ pF = 100.000 pF = 100 nF.',
    lessonId: 'lesson-04',
    lessonNumber: 4,
  },
  {
    id: 'pref-micro',
    deck: 'symbols-prefixes',
    kindLabel: 'Prefisso SI',
    categoryLabel: 'Scale & Unità',
    frontTitle: 'µ (micro)',
    frontSubtitle: 'Es. µF, µH, µV',
    backMain: '10⁻⁶ (un milionesimo). 1.000 µF = 1 mF; 1.000.000 µF = 1 F.',
    backTip: 'Nei calcoli con XL o XC converti sempre µF o µH in unità base (× 10⁻⁶)!',
    lessonId: 'lesson-01',
    lessonNumber: 1,
  },
  {
    id: 'pref-milli',
    deck: 'symbols-prefixes',
    kindLabel: 'Prefisso SI',
    categoryLabel: 'Scale & Unità',
    frontTitle: 'm (milli)',
    frontSubtitle: 'Es. mA, mW, ms',
    backMain: '10⁻³ (un millesimo = 0,001). 1.000 mA = 1 A.',
    backTip: '30 dBm equivalgono esattamente a 1.000 mW = 1 Watt.',
    lessonId: 'lesson-01',
    lessonNumber: 1,
  },
  {
    id: 'pref-kilo',
    deck: 'symbols-prefixes',
    kindLabel: 'Prefisso SI',
    categoryLabel: 'Scale & Unità',
    frontTitle: 'k (chilo)',
    frontSubtitle: 'Es. kΩ, kHz, kW',
    backMain: '10³ (mille = 1.000). 7.100 kHz = 7,100 MHz.',
    backTip: 'Nota la k minuscola (kHz, kΩ): la K maiuscola indica i gradi Kelvin.',
    lessonId: 'lesson-01',
    lessonNumber: 1,
  },
  {
    id: 'pref-mega',
    deck: 'symbols-prefixes',
    kindLabel: 'Prefisso SI',
    categoryLabel: 'Scale & Unità',
    frontTitle: 'M (Mega)',
    frontSubtitle: 'Es. MHz, MΩ',
    backMain: '10⁶ (un milione = 1.000.000). 1 MHz = 1.000 kHz.',
    backTip: 'Nella formula λ = 300 / f, la frequenza f va sempre espressa in MHz.',
    lessonId: 'lesson-03',
    lessonNumber: 3,
  },
  {
    id: 'pref-giga',
    deck: 'symbols-prefixes',
    kindLabel: 'Prefisso SI',
    categoryLabel: 'Scale & Unità',
    frontTitle: 'G (Giga)',
    frontSubtitle: 'Es. 2,4 GHz Wi-Fi / 1,2 GHz SHF',
    backMain: '10⁹ (un miliardo = 1.000 MHz). 2,4 GHz = 2.400 MHz (λ ≈ 12,5 cm).',
    backTip: 'In gamma SHF le antenne diventano lunghe pochi centimetri.',
    lessonId: 'lesson-03',
    lessonNumber: 3,
  },
];

const Q_AND_NATO_CARDS: UnifiedFlashcard[] = [
  ...Q_CODES.map<UnifiedFlashcard>((q) => ({
    id: `qcode-${q.code.toLowerCase()}`,
    deck: 'nato-q',
    kindLabel: 'Codice Q',
    categoryLabel: 'Traffico Radio',
    frontTitle: q.code,
    frontSubtitle: `Affermativo / Domanda (${q.code}?)`,
    backMain: `${q.statementMeaning} · Domanda (${q.code}?): ${q.questionMeaning}`,
    backTip: q.scoutExample,
    lessonId: 'lesson-13',
    lessonNumber: 13,
  })),
  ...NATO_ALPHABET.map<UnifiedFlashcard>((n) => ({
    id: `nato-${n.letter.toLowerCase()}`,
    deck: 'nato-q',
    kindLabel: 'Alfabeto NATO',
    categoryLabel: 'Spelling Fonia',
    frontTitle: `Lettera "${n.letter}"`,
    frontSubtitle: 'Qual è la parola ICAO / NATO?',
    backMain: `${n.word} (pronuncia: ${n.pronunciation})`,
    backTip: `In Morse: ${MORSE_TABLE.find((m) => m.char === n.letter)?.code ?? ''}`,
    lessonId: 'lesson-13',
    lessonNumber: 13,
  })),
];

const GLOSSARY_CARDS: UnifiedFlashcard[] = SMART_GLOSSARY_ENTRIES.map((entry) => ({
  id: entry.id,
  deck: entry.kind === 'symbol' ? 'symbols-prefixes' : 'glossary-formulas',
  kindLabel: entry.kindLabel,
  categoryLabel: entry.category,
  frontTitle: entry.term,
  frontSubtitle: entry.symbol
    ? `Simbolo: ${entry.symbol}${entry.unit ? ` (${entry.unit})` : ''}`
    : undefined,
  backMain: entry.definition,
  backFormula: entry.formula,
  backTip: entry.examTip,
  lessonId: entry.primaryLessonId,
  lessonNumber: entry.lessonNumber,
}));

export const UNIFIED_FLASHCARDS: UnifiedFlashcard[] = [
  ...PREFIX_CARDS,
  ...GLOSSARY_CARDS,
  ...Q_AND_NATO_CARDS,
];

export function loadSm2Map(): Record<string, Sm2CardRecord> {
  try {
    const raw = localStorage.getItem(SM2_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Sm2CardRecord>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSm2Map(map: Record<string, Sm2CardRecord>): void {
  try {
    localStorage.setItem(SM2_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * SM-2 quality rating:
 * 0 = Da ripetere (subito)
 * 1 = Difficile (1 giorno)
 * 2 = Buono (3 -> 6 giorni)
 * 3 = Facile (7+ giorni, consolidata)
 */
export function computeNextSm2Record(
  prev: Sm2CardRecord | undefined,
  quality: 0 | 1 | 2 | 3,
  nowMs = Date.now()
): { record: Sm2CardRecord; label: string; markMastered: boolean } {
  const ease = prev?.easeFactor ?? 2.5;
  const reps = prev?.repetitions ?? 0;

  if (quality === 0) {
    return {
      record: {
        repetitions: 0,
        intervalDays: 0,
        easeFactor: Math.max(1.3, ease - 0.2),
        dueAtMs: nowMs + 60 * 1000,
      },
      label: 'Subito (1 min)',
      markMastered: false,
    };
  }

  let nextReps = reps + 1;
  let intervalDays = 1;
  let nextEase = ease;

  if (quality === 1) {
    intervalDays = Math.max(1, Math.round((prev?.intervalDays || 1) * 1.2));
    nextEase = Math.max(1.3, ease - 0.14);
  } else if (quality === 2) {
    if (reps === 0) intervalDays = 1;
    else if (reps === 1) intervalDays = 3;
    else intervalDays = Math.round((prev?.intervalDays || 3) * ease);
  } else {
    if (reps === 0) intervalDays = 4;
    else intervalDays = Math.max(7, Math.round((prev?.intervalDays || 4) * (ease + 0.15)));
    nextEase = Math.min(2.8, ease + 0.1);
    nextReps = Math.max(2, nextReps);
  }

  return {
    record: {
      repetitions: nextReps,
      intervalDays,
      easeFactor: nextEase,
      dueAtMs: nowMs + intervalDays * 24 * 60 * 60 * 1000,
    },
    label: intervalDays === 1 ? 'Tra 1 giorno' : `Tra ${intervalDays} giorni`,
    markMastered: quality === 3 || intervalDays >= 6,
  };
}
