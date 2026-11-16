import { LESSONS, PRE_EXAM_GLOSSARY } from '../data/curriculum';
import type { LessonId } from '../types/radiolab';
import { splitTextWithGlossary } from './glossaryHighlight';

export type SmartGlossaryKind = 'glossary' | 'concept' | 'symbol' | 'variable';

export interface SmartGlossaryEntry {
  id: string;
  term: string;
  kind: SmartGlossaryKind;
  kindLabel: string;
  primaryLessonId: LessonId;
  lessonNumber: number;
  lessonShortTitle: string;
  mentionedInLessons: LessonId[];
  category: string;
  formula?: string;
  symbol?: string;
  unit?: string;
  definition: string;
  examTip?: string;
  searchableText: string;
}

const LESSON_TEXT_CORPUS: Record<LessonId, string> = LESSONS.reduce(
  (acc, lesson) => {
    const parts: string[] = [
      lesson.title,
      lesson.subtitle,
      lesson.scoutHook,
      lesson.analogyTitle,
      ...lesson.analogySteps,
      lesson.circuitBasis.title,
      lesson.circuitBasis.summary,
      ...lesson.circuitBasis.symbols.flatMap((s) => [s.name, s.role]),
      ...lesson.concepts.flatMap((c) => [c.title, c.body, c.tip ?? '']),
      lesson.formula.title,
      lesson.formula.plainReading,
      ...lesson.formula.variables.flatMap((v) => [v.name, v.meaning]),
      ...lesson.quiz.flatMap((q) => [q.question, q.explanation]),
    ];
    acc[lesson.id] = parts.join(' ').toLowerCase();
    return acc;
  },
  {} as Record<LessonId, string>
);

function findMentionedLessons(
  primaryLessonId: LessonId,
  glossaryId?: string,
  searchAliases: string[] = []
): LessonId[] {
  const found = new Set<LessonId>([primaryLessonId]);

  for (const lesson of LESSONS) {
    const corpus = LESSON_TEXT_CORPUS[lesson.id];
    if (glossaryId) {
      const segments = splitTextWithGlossary(corpus);
      if (segments.some((s) => s.type === 'keyword' && s.item?.id === glossaryId)) {
        found.add(lesson.id);
        continue;
      }
    }
    for (const alias of searchAliases) {
      const clean = alias.trim().toLowerCase();
      if (clean.length >= 4 && corpus.includes(clean)) {
        found.add(lesson.id);
        break;
      }
    }
  }

  return LESSONS.map((l) => l.id).filter((id) => found.has(id));
}

function normalizeTermKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-zàèéìòù0-9]+/gi, ' ')
    .trim();
}

function buildSmartGlossary(): SmartGlossaryEntry[] {
  const entries: SmartGlossaryEntry[] = [];
  const lessonById = new Map(LESSONS.map((l) => [l.id, l]));
  const seenKeys = new Set<string>();

  // 1. Core Pre-Exam Glossary terms
  for (const item of PRE_EXAM_GLOSSARY) {
    const lesson = lessonById.get(item.relatedLessonId) ?? LESSONS[0];
    const mentionedInLessons = findMentionedLessons(item.relatedLessonId, item.id, [item.term]);
    const searchableText = [
      item.term,
      item.category,
      item.formula ?? '',
      item.plainMeaning,
      item.examTip,
      lesson.shortTitle,
      `modulo ${lesson.number}`,
    ]
      .join(' ')
      .toLowerCase();

    seenKeys.add(`glossary:${normalizeTermKey(item.term)}`);
    entries.push({
      id: `sg-${item.id}`,
      term: item.term,
      kind: 'glossary',
      kindLabel: 'Voce Glossario Esame',
      primaryLessonId: lesson.id,
      lessonNumber: lesson.number,
      lessonShortTitle: lesson.shortTitle,
      mentionedInLessons,
      category: item.category,
      formula: item.formula,
      definition: item.plainMeaning,
      examTip: item.examTip,
      searchableText,
    });
  }

  // 2. Automatically extracted lesson concepts, circuit symbols & formula variables
  for (const lesson of LESSONS) {
    // 2a. Concepts extracted from each lesson
    lesson.concepts.forEach((concept, idx) => {
      const cleanKey = `concept:${normalizeTermKey(concept.title)}`;
      if (seenKeys.has(cleanKey)) return;
      seenKeys.add(cleanKey);

      const mentionedInLessons = findMentionedLessons(lesson.id, undefined, [
        concept.title.split(':')[0] ?? '',
      ]);
      const searchableText = [
        concept.title,
        concept.body,
        concept.tip ?? '',
        lesson.shortTitle,
        lesson.stageLabel,
        `modulo ${lesson.number}`,
      ]
        .join(' ')
        .toLowerCase();

      entries.push({
        id: `sg-${lesson.id}-c${idx + 1}`,
        term: concept.title,
        kind: 'concept',
        kindLabel: 'Concetto Chiave',
        primaryLessonId: lesson.id,
        lessonNumber: lesson.number,
        lessonShortTitle: lesson.shortTitle,
        mentionedInLessons,
        category: lesson.stageLabel,
        definition: concept.body,
        examTip: concept.tip,
        searchableText,
      });
    });

    // 2b. Circuit diagram symbols extracted from each lesson
    lesson.circuitBasis.symbols.forEach((sym, idx) => {
      const cleanKey = `symbol:${normalizeTermKey(sym.name)}`;
      if (seenKeys.has(cleanKey)) return;
      seenKeys.add(cleanKey);

      const baseTerm = sym.name.replace(/\([^)]*\)/g, '').trim();
      const mentionedInLessons = findMentionedLessons(lesson.id, undefined, [baseTerm]);
      const searchableText = [
        sym.name,
        sym.symbol,
        sym.role,
        lesson.shortTitle,
        lesson.circuitBasis.title,
        `modulo ${lesson.number}`,
      ]
        .join(' ')
        .toLowerCase();

      entries.push({
        id: `sg-${lesson.id}-s${idx + 1}`,
        term: sym.name,
        kind: 'symbol',
        kindLabel: 'Simbolo Circuitale',
        primaryLessonId: lesson.id,
        lessonNumber: lesson.number,
        lessonShortTitle: lesson.shortTitle,
        mentionedInLessons,
        category: 'Circuiti e Schemi',
        symbol: sym.symbol,
        definition: sym.role,
        searchableText,
      });
    });

    // 2c. Physical variables & formulas extracted from each lesson
    lesson.formula.variables.forEach((v, idx) => {
      const cleanKey = `var:${normalizeTermKey(v.name)}`;
      if (seenKeys.has(cleanKey)) return;
      seenKeys.add(cleanKey);

      const mentionedInLessons = findMentionedLessons(lesson.id, undefined, [
        v.name.replace(/\([^)]*\)/g, ''),
      ]);
      const searchableText = [
        v.name,
        v.symbol,
        v.unit,
        v.meaning,
        lesson.formula.expression,
        lesson.shortTitle,
        `modulo ${lesson.number}`,
      ]
        .join(' ')
        .toLowerCase();

      entries.push({
        id: `sg-${lesson.id}-v${idx + 1}`,
        term: `${v.name} (${v.symbol})`,
        kind: 'variable',
        kindLabel: 'Grandezza e Formula',
        primaryLessonId: lesson.id,
        lessonNumber: lesson.number,
        lessonShortTitle: lesson.shortTitle,
        mentionedInLessons,
        category: 'Formule e Unità',
        formula: lesson.formula.expression,
        symbol: v.symbol,
        unit: v.unit,
        definition: v.meaning,
        searchableText,
      });
    });
  }

  return entries;
}

export const SMART_GLOSSARY_ENTRIES: SmartGlossaryEntry[] = buildSmartGlossary();
