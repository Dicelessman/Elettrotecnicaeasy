import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Cpu,
  Filter,
  FlaskConical,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { LESSONS } from '../data/curriculum';
import type { LessonId } from '../types/radiolab';
import {
  SMART_GLOSSARY_ENTRIES,
  type SmartGlossaryEntry,
  type SmartGlossaryKind,
} from '../utils/smartGlossary';

interface PreExamGlossaryViewProps {
  onOpenLesson: (lessonId: LessonId) => void;
}

type KindFilter = 'all' | SmartGlossaryKind;
type ModuleFilter = 'all' | LessonId;
type SortMode = 'by-module' | 'alpha';

const KIND_TABS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'Tutti i termini' },
  { id: 'glossary', label: 'Glossario Esame' },
  { id: 'concept', label: 'Concetti Lezioni' },
  { id: 'symbol', label: 'Simboli Circuitali' },
  { id: 'variable', label: 'Grandezze e Unità' },
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function getEntryKindBadgeStyle(kind: SmartGlossaryKind): string {
  switch (kind) {
    case 'glossary':
      return 'text-sky-700 dark:text-sky-400';
    case 'concept':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'symbol':
      return 'text-amber-700 dark:text-amber-400';
    case 'variable':
      return 'text-violet-700 dark:text-violet-400';
  }
}

export const PreExamGlossaryView: React.FC<PreExamGlossaryViewProps> = ({ onOpenLesson }) => {
  const [queryText, setQueryText] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('by-module');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Quick "/" keyboard shortcut to focus search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const moduleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const lesson of LESSONS) {
      counts[lesson.id] = SMART_GLOSSARY_ENTRIES.filter(
        (entry) =>
          entry.primaryLessonId === lesson.id || entry.mentionedInLessons.includes(lesson.id)
      ).length;
    }
    return counts;
  }, []);

  const kindCounts = useMemo(() => {
    const base =
      moduleFilter === 'all'
        ? SMART_GLOSSARY_ENTRIES
        : SMART_GLOSSARY_ENTRIES.filter(
            (e) => e.primaryLessonId === moduleFilter || e.mentionedInLessons.includes(moduleFilter)
          );
    return {
      all: base.length,
      glossary: base.filter((e) => e.kind === 'glossary').length,
      concept: base.filter((e) => e.kind === 'concept').length,
      symbol: base.filter((e) => e.kind === 'symbol').length,
      variable: base.filter((e) => e.kind === 'variable').length,
    };
  }, [moduleFilter]);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    const list = SMART_GLOSSARY_ENTRIES.filter((entry) => {
      if (kindFilter !== 'all' && entry.kind !== kindFilter) return false;
      if (
        moduleFilter !== 'all' &&
        entry.primaryLessonId !== moduleFilter &&
        !entry.mentionedInLessons.includes(moduleFilter)
      ) {
        return false;
      }
      if (activeLetter && sortMode === 'alpha') {
        const first = entry.term.trim().charAt(0).toUpperCase();
        if (first !== activeLetter) return false;
      }
      if (!q) return true;
      return entry.searchableText.includes(q);
    });

    if (sortMode === 'alpha') {
      return [...list].sort((a, b) => a.term.localeCompare(b.term, 'it'));
    }

    // By module: when filtering a specific module, put natively defined entries first, then cross-referenced
    return [...list].sort((a, b) => {
      if (moduleFilter !== 'all') {
        const aNative = a.primaryLessonId === moduleFilter ? 0 : 1;
        const bNative = b.primaryLessonId === moduleFilter ? 0 : 1;
        if (aNative !== bNative) return aNative - bNative;
      }
      if (a.lessonNumber !== b.lessonNumber) return a.lessonNumber - b.lessonNumber;
      const kindOrder: Record<SmartGlossaryKind, number> = {
        glossary: 0,
        concept: 1,
        symbol: 2,
        variable: 3,
      };
      return kindOrder[a.kind] - kindOrder[b.kind];
    });
  }, [queryText, kindFilter, moduleFilter, sortMode, activeLetter]);

  const groupedByModule = useMemo(() => {
    if (sortMode !== 'by-module' || moduleFilter !== 'all') return null;
    return LESSONS.map((lesson) => ({
      lesson,
      items: filtered.filter((entry) => entry.primaryLessonId === lesson.id),
    })).filter((g) => g.items.length > 0);
  }, [filtered, sortMode, moduleFilter]);

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const entry of SMART_GLOSSARY_ENTRIES) {
      if (kindFilter !== 'all' && entry.kind !== kindFilter) continue;
      if (
        moduleFilter !== 'all' &&
        entry.primaryLessonId !== moduleFilter &&
        !entry.mentionedInLessons.includes(moduleFilter)
      ) {
        continue;
      }
      const ch = entry.term.trim().charAt(0).toUpperCase();
      if (ALPHABET.includes(ch)) set.add(ch);
    }
    return set;
  }, [kindFilter, moduleFilter]);

  const selectedLessonMeta =
    moduleFilter === 'all' ? null : LESSONS.find((l) => l.id === moduleFilter) ?? null;

  const renderEntryCard = (entry: SmartGlossaryEntry) => {
    const isCrossRefOnly =
      moduleFilter !== 'all' && entry.primaryLessonId !== moduleFilter;
    const extraModules = entry.mentionedInLessons.filter((id) => id !== entry.primaryLessonId);

    return (
      <article
        key={entry.id}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
      >
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`font-semibold ${getEntryKindBadgeStyle(entry.kind)}`}>
                {entry.kindLabel}
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                ·
              </span>
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
                {isCrossRefOnly
                  ? `Definito in M${String(entry.lessonNumber).padStart(2, '0')} · Richiamato qui`
                  : `Modulo ${String(entry.lessonNumber).padStart(2, '0')} · ${entry.lessonShortTitle}`}
              </span>
            </div>

            {(entry.formula || entry.symbol || entry.unit) && (
              <span className="font-mono text-[11px] font-semibold text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800 px-2 py-0.5 rounded max-w-full truncate">
                {entry.formula ?? entry.unit ?? entry.symbol}
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 leading-snug">
            {entry.term}
          </h3>

          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {entry.definition}
          </p>

          {entry.unit && entry.formula && (
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Unità di misura: <strong className="text-slate-700 dark:text-slate-200">{entry.unit}</strong>
            </div>
          )}

          {entry.examTip && (
            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 rounded-lg p-2.5 leading-relaxed">
              <strong className="text-slate-900 dark:text-slate-100">Nota tecnica:</strong>{' '}
              {entry.examTip}
            </p>
          )}
        </div>

        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            {extraModules.length > 0 && (
              <>
                <span>Richiamato in:</span>
                {extraModules.slice(0, 4).map((lid) => {
                  const mNum = LESSONS.find((l) => l.id === lid)?.number ?? 1;
                  return (
                    <button
                      key={lid}
                      type="button"
                      onClick={() => setModuleFilter(lid)}
                      className="font-mono font-semibold text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-400 underline decoration-dotted cursor-pointer"
                    >
                      M{String(mNum).padStart(2, '0')}
                    </button>
                  );
                })}
                {extraModules.length > 4 && <span>+{extraModules.length - 4}</span>}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenLesson(entry.primaryLessonId)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline cursor-pointer ml-auto"
          >
            <span>Apri Modulo {String(entry.lessonNumber).padStart(2, '0')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6">
      {/* Smart Glossary Header & Controls */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Estrazione automatica dai 12 moduli</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
              Glossario Intelligente e Scheda Esame
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
              Raccoglie e organizza automaticamente tutti i termini tecnici, concetti chiave, simboli circuitali e grandezze estratte dalle 12 lezioni, con collegamenti incrociati tra moduli.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 shrink-0 text-center">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Termini totali</div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {SMART_GLOSSARY_ENTRIES.length}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Visualizzati</div>
              <div className="text-base font-bold font-mono tabular-nums text-sky-700 dark:text-sky-400">
                {filtered.length}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Moduli</div>
              <div className="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                12
              </div>
            </div>
          </div>
        </div>

        {/* Search + Sort Mode */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="search"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Ricerca rapida per termine, simbolo, formula o modulo (premi / per cercare)..."
              className="w-full pl-9 pr-9 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-sky-600"
            />
            {queryText && (
              <button
                type="button"
                onClick={() => setQueryText('')}
                aria-label="Svuota ricerca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400">Ordina:</span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setSortMode('by-module');
                  setActiveLetter(null);
                }}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  sortMode === 'by-module'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Per Modulo
              </button>
              <button
                type="button"
                onClick={() => setSortMode('alpha')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  sortMode === 'alpha'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Alfabetico (A–Z)
              </button>
            </div>
          </div>
        </div>

        {/* Kind Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
            <Filter className="w-3.5 h-3.5" />
            Tipo:
          </span>
          {KIND_TABS.map((tab) => {
            const count = kindCounts[tab.id];
            const active = kindFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setKindFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {tab.id === 'concept' && <BookOpen className="w-3.5 h-3.5" />}
                {tab.id === 'symbol' && <Cpu className="w-3.5 h-3.5" />}
                {tab.id === 'variable' && <FlaskConical className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    active ? 'text-sky-100' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Module Filter Strip (M01..M12) */}
        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              Filtra per Modulo (include termini definiti e richiamati nel modulo):
            </span>
            {moduleFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setModuleFilter('all')}
                className="text-sky-700 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
              >
                Mostra tutti i 12 moduli
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setModuleFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                moduleFilter === 'all'
                  ? 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              Tutti ({SMART_GLOSSARY_ENTRIES.length})
            </button>
            {LESSONS.map((lesson) => {
              const active = moduleFilter === lesson.id;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => setModuleFilter(lesson.id)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer font-mono tabular-nums ${
                    active
                      ? 'bg-sky-600 border-sky-600 text-white font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-400'
                  }`}
                  title={`Modulo ${lesson.number}: ${lesson.title}`}
                >
                  M{String(lesson.number).padStart(2, '0')} · {lesson.shortTitle}{' '}
                  <span className={active ? 'text-sky-100' : 'text-slate-400'}>
                    ({moduleCounts[lesson.id] ?? 0})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Alphabetical quick-jump bar when in A-Z mode */}
        {sortMode === 'alpha' && (
          <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveLetter(null)}
              className={`px-2 py-1 text-[11px] font-mono rounded cursor-pointer ${
                activeLetter === null
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Tutte
            </button>
            {ALPHABET.map((letter) => {
              const hasItems = availableLetters.has(letter);
              const active = activeLetter === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!hasItems}
                  onClick={() => setActiveLetter(active ? null : letter)}
                  className={`w-7 h-7 text-[11px] font-mono rounded flex items-center justify-center transition-colors ${
                    active
                      ? 'bg-sky-600 text-white font-bold cursor-pointer'
                      : hasItems
                        ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                        : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Active module context banner if a specific module is selected */}
      {selectedLessonMeta && (
        <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200">
            <strong className="font-mono">
              Modulo {String(selectedLessonMeta.number).padStart(2, '0')}
            </strong>{' '}
            — {selectedLessonMeta.title} ({filtered.length}{' '}
            {filtered.length === 1 ? 'termine pertinente' : 'termini pertinenti'})
          </div>
          <button
            type="button"
            onClick={() => onOpenLesson(selectedLessonMeta.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
          >
            <span>Vai alla lezione completa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Nessun termine trovato con i filtri attuali
            {queryText ? ` per "${queryText}"` : ''}.
          </p>
          <button
            type="button"
            onClick={() => {
              setQueryText('');
              setKindFilter('all');
              setModuleFilter('all');
              setActiveLetter(null);
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          >
            Ripristina tutti i filtri
          </button>
        </div>
      ) : groupedByModule ? (
        <div className="space-y-8">
          {groupedByModule.map(({ lesson, items }) => (
            <section key={lesson.id} className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50">
                    <span className="font-mono text-sky-700 dark:text-sky-400 mr-2">
                      M{String(lesson.number).padStart(2, '0')}
                    </span>
                    {lesson.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lesson.stageLabel} · {items.length}{' '}
                    {items.length === 1 ? 'voce estratta' : 'voci estratte'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenLesson(lesson.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  <span>Studia modulo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((entry) => renderEntryCard(entry))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((entry) => renderEntryCard(entry))}
        </div>
      )}
    </div>
  );
};
