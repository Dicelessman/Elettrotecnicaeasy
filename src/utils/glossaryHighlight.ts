import { PRE_EXAM_GLOSSARY } from '../data/curriculum';
import type { GlossaryItem } from '../types/radiolab';

export interface GlossarySegment {
  type: 'text' | 'keyword';
  value: string;
  item?: GlossaryItem;
}

const KEYWORD_MAP: { glossaryId: string; keywords: string[] }[] = [
  {
    glossaryId: 'g-atomo',
    keywords: ['atomo', 'atomi', 'elettroni', 'elettrone', 'protoni', 'protone', 'neutroni', 'ione', 'ioni'],
  },
  {
    glossaryId: 'g-tensione',
    keywords: [
      'differenza di potenziale',
      'tensione elettrica',
      'tensione',
      'd.d.p.',
      'f.e.m.',
      'volt',
    ],
  },
  {
    glossaryId: 'g-corrente',
    keywords: ['corrente elettrica', 'corrente continua', 'amperometro', 'coulomb', 'ampere', 'corrente'],
  },
  {
    glossaryId: 'g-ohm',
    keywords: ['legge di ohm', 'resistenze', 'resistenza', 'resistore', 'resistori', 'ohm'],
  },
  {
    glossaryId: 'g-potenza',
    keywords: ['effetto joule', 'potenza attiva', 'potenza reattiva', 'potenza apparente', 'potenza', 'watt'],
  },
  {
    glossaryId: 'g-ac',
    keywords: [
      'valore efficace',
      'corrente alternata',
      'valore di picco',
      'frequenza',
      'periodo',
      'sinusoide',
      'sinusoidale',
      'veff',
      'hertz',
      'rms',
    ],
  },
  {
    glossaryId: 'g-lambda',
    keywords: ["lunghezza d'onda", 'lunghezza d’onda', 'onde elettromagnetiche', 'onda radio'],
  },
  {
    glossaryId: 'g-condensatore',
    keywords: [
      'reattanza capacitiva',
      'condensatori',
      'condensatore',
      'dielettrico',
      'armature',
      'capacità',
      'farad',
      'xc',
    ],
  },
  {
    glossaryId: 'g-induttore',
    keywords: [
      'reattanza induttiva',
      'legge di lenz',
      'autoinduzione',
      'campo magnetico',
      'induttanza',
      'induttori',
      'induttore',
      'bobine',
      'bobina',
      'henry',
      'xl',
    ],
  },
  {
    glossaryId: 'g-impedenza',
    keywords: ['leggi di kirchhoff', 'legge di kirchhoff', 'kirchhoff', 'impedenza', 'reattanza'],
  },
  {
    glossaryId: 'g-ros',
    keywords: ['onde stazionarie', 'adattamento di impedenza', 'ros', 'swr'],
  },
  {
    glossaryId: 'g-risonanza',
    keywords: [
      'frequenza di risonanza',
      'formula di thomson',
      'circuito risonante',
      'circuiti risonanti',
      'trasformatori',
      'trasformatore',
      'fattore q',
      'selettività',
      'risonanza',
      'circuito tappo',
    ],
  },
  {
    glossaryId: 'g-filtri-db',
    keywords: [
      'passa-basso',
      'passa-alto',
      'passa-banda',
      'banda passante',
      'decibel',
      'filtri',
      'filtro',
      'notch',
      'db',
    ],
  },
  {
    glossaryId: 'g-diodo-transistor',
    keywords: [
      'ponte di graetz',
      'diodo zener',
      'semiconduttori',
      'semiconduttore',
      'raddrizzatore',
      'raddrizzatori',
      'transistor',
      'silicio',
      'germanio',
      'diodi',
      'diodo',
      'bjt',
      'zener',
    ],
  },
  {
    glossaryId: 'g-am-fm',
    keywords: [
      'sovramodulazione',
      'bande laterali',
      'porte logiche',
      'porta logica',
      'modulazione',
      'portante',
      'ssb',
      'am',
      'fm',
    ],
  },
  {
    glossaryId: 'g-antenne',
    keywords: [
      'v-invertita',
      'ground plane',
      'polarizzazione',
      'yagi-uda',
      'antenne',
      'antenna',
      'dipolo',
      'yagi',
    ],
  },
];

const glossaryById = new Map<string, GlossaryItem>(
  PRE_EXAM_GLOSSARY.map((item) => [item.id, item])
);

const termToGlossary = new Map<string, GlossaryItem>();
const allPatterns: string[] = [];

for (const entry of KEYWORD_MAP) {
  const item = glossaryById.get(entry.glossaryId);
  if (!item) continue;
  for (const kw of entry.keywords) {
    const normalizedKey = kw.toLowerCase().replace(/’/g, "'");
    if (!termToGlossary.has(normalizedKey)) {
      termToGlossary.set(normalizedKey, item);
      allPatterns.push(kw);
    }
  }
}

// Longest-first ordering prevents short words from shadowing full compound phrases
const sortedPatterns = [...allPatterns].sort((a, b) => b.length - a.length);

function escapeAndNormalizePattern(raw: string): string {
  const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(/['’]/g, "['’]");
}

const COMBINED_REGEX = new RegExp(
  `(?<![\\p{L}\\p{N}_])(${sortedPatterns.map(escapeAndNormalizePattern).join('|')})(?![\\p{L}\\p{N}_])`,
  'giu'
);

export function splitTextWithGlossary(text: string): GlossarySegment[] {
  if (!text) return [];
  const segments: GlossarySegment[] = [];
  let lastIndex = 0;

  COMBINED_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = COMBINED_REGEX.exec(text)) !== null) {
    const matchedValue = match[0];
    const start = match.index;

    if (start > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, start) });
    }

    const normalized = matchedValue.toLowerCase().replace(/’/g, "'");
    const item = termToGlossary.get(normalized);

    if (item) {
      segments.push({ type: 'keyword', value: matchedValue, item });
    } else {
      segments.push({ type: 'text', value: matchedValue });
    }

    lastIndex = start + matchedValue.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}
