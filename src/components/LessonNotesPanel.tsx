import React, { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Check,
  ChevronDown,
  ChevronUp,
  Cloud,
  Code,
  Columns2,
  Download,
  Eye,
  Heading2,
  Italic,
  List,
  ListChecks,
  NotebookPen,
  PenLine,
  Quote,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import type { LessonDefinition } from '../types/radiolab';
import { MarkdownRenderer } from './MarkdownRenderer';

interface LessonNotesPanelProps {
  lesson: LessonDefinition;
  isOpen: boolean;
  onToggleOpen: () => void;
  panelRef?: React.RefObject<HTMLDivElement | null>;
}

type EditorMode = 'write' | 'preview' | 'split';

const MAX_NOTE_LENGTH = 10000;

export const LessonNotesPanel: React.FC<LessonNotesPanelProps> = ({
  lesson,
  isOpen,
  onToggleOpen,
  panelRef,
}) => {
  const { user, lessonNotes, saveLessonNote, deleteLessonNote, signInWithGoogle } = useStudy();
  const savedNote = lessonNotes[lesson.id];
  const savedContent = savedNote?.content ?? '';

  const [draft, setDraft] = useState(savedContent);
  const [mode, setMode] = useState<EditorMode>('split');
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const saveStateRef = useRef(saveState);
  saveStateRef.current = saveState;
  const lessonIdRef = useRef(lesson.id);
  lessonIdRef.current = lesson.id;

  // Sync draft when switching lesson and flush pending unsaved edits for the previous lesson
  useEffect(() => {
    const currentId = lesson.id;
    setDraft(savedContent);
    setSaveState('idle');
    setErrorMsg(null);
    setConfirmDelete(false);

    return () => {
      if (saveStateRef.current === 'dirty') {
        void saveLessonNote(currentId, draftRef.current);
      }
    };
  }, [lesson.id]);

  useEffect(() => {
    if (saveState === 'idle' || saveState === 'saved') {
      setDraft(savedContent);
    }
  }, [savedContent, saveState]);

  const performSave = async (contentToSave: string) => {
    const trimmedCheck = contentToSave.trim();
    if (trimmedCheck.length === 0 && !savedNote) {
      setSaveState('idle');
      return;
    }
    setSaveState('saving');
    setErrorMsg(null);
    try {
      await saveLessonNote(lesson.id, contentToSave);
      setSaveState('saved');
    } catch (err) {
      setSaveState('error');
      setErrorMsg(
        err instanceof Error ? err.message : 'Impossibile salvare gli appunti al momento.'
      );
    }
  };

  // Debounced auto-save after 1.2s of inactivity when dirty
  useEffect(() => {
    if (saveState !== 'dirty') return;
    const timer = window.setTimeout(() => {
      void performSave(draftRef.current);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [draft, saveState, lesson.id]);

  const handleDraftChange = (nextVal: string) => {
    const capped = nextVal.slice(0, MAX_NOTE_LENGTH);
    setDraft(capped);
    setConfirmDelete(false);
    setErrorMsg(null);
    setSaveState(capped === savedContent ? 'idle' : 'dirty');
  };

  const applySnippet = (before: string, after = '', placeholder = '') => {
    const el = textareaRef.current;
    if (!el) {
      handleDraftChange(`${draft}${draft ? '\n' : ''}${before}${placeholder}${after}`);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const selected = draft.slice(start, end) || placeholder;
    const next = `${draft.slice(0, start)}${before}${selected}${after}${draft.slice(end)}`;
    handleDraftChange(next);
    window.requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + selected.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const handleInsertTemplate = () => {
    const template = [
      `# Appunti — Modulo ${String(lesson.number).padStart(2, '0')}: ${lesson.shortTitle}`,
      '',
      '## Concetti chiave',
      '- ',
      '',
      '## Formula da ricordare',
      `\`${lesson.formula.expression}\` — ${lesson.formula.title}`,
      '',
      '## Punti da ripassare per l’esame',
      '- [ ] ',
    ].join('\n');
    handleDraftChange(draft.trim() ? `${draft.trim()}\n\n${template}` : template);
    if (mode === 'preview') setMode('split');
  };

  const handleDeleteNote = async () => {
    setSaveState('saving');
    setErrorMsg(null);
    try {
      await deleteLessonNote(lesson.id);
      setDraft('');
      setConfirmDelete(false);
      setSaveState('idle');
    } catch (err) {
      setSaveState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Errore durante l’eliminazione.');
    }
  };

  const handleDownloadMarkdown = () => {
    const content = draft.trim()
      ? draft
      : `# Appunti Modulo ${String(lesson.number).padStart(2, '0')} — ${lesson.title}\n`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appunti-${lesson.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formattedUpdatedAt = savedNote?.updatedAtMs
    ? new Date(savedNote.updatedAtMs).toLocaleString('it-IT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const statusText = (() => {
    if (saveState === 'saving') return 'Salvataggio in corso...';
    if (saveState === 'dirty') return 'Modifiche non ancora salvate';
    if (saveState === 'error') return 'Errore di salvataggio';
    if (savedNote) {
      return user
        ? `Salvato su Firebase${formattedUpdatedAt ? ` · ${formattedUpdatedAt}` : ''}`
        : `Salvato in locale${formattedUpdatedAt ? ` · ${formattedUpdatedAt}` : ''}`;
    }
    return user ? 'Pronto per scrivere (sincronizzazione Firebase)' : 'Pronto per scrivere (salvataggio locale)';
  })();

  return (
    <section
      ref={panelRef}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Header bar */}
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex items-center gap-3 text-left cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center shrink-0">
            <NotebookPen className="w-4 h-4 text-sky-700 dark:text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
                Appunti Personali (Markdown)
              </h2>
              {savedNote && (
                <span className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-medium">
                  · {savedNote.content.length} car.
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{statusText}</p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {!isOpen && savedNote && (
            <button
              type="button"
              onClick={onToggleOpen}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap"
            >
              Apri appunti
            </button>
          )}
          <button
            type="button"
            onClick={onToggleOpen}
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Comprimi appunti personali' : 'Espandi appunti personali'}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-5 space-y-4">
          {/* Cloud reminder when guest */}
          {!user && (
            <div className="px-4 py-3 rounded-lg bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Cloud className="w-4 h-4 text-sky-700 dark:text-sky-400 shrink-0" />
                <span>
                  Gli appunti sono salvati su questo browser. Accedi con Google per salvarli nel tuo profilo Firebase su tutti i dispositivi.
                </span>
              </div>
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="px-3 py-1.5 font-semibold rounded-md bg-sky-600 text-white hover:bg-sky-700 cursor-pointer whitespace-nowrap"
              >
                Accedi con Google
              </button>
            </div>
          )}

          {/* Mode tabs & formatting toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => applySnippet('## ', '', 'Titolo sezione')}
                title="Titolo"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applySnippet('**', '**', 'testo in grassetto')}
                title="Grassetto"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applySnippet('*', '*', 'testo in corsivo')}
                title="Corsivo"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applySnippet('- ', '', 'Punto elenco')}
                title="Elenco puntato"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applySnippet('- [ ] ', '', 'Da ripassare')}
                title="Checklist"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <ListChecks className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applySnippet('`', '`', lesson.formula.expression)}
                title="Codice / Formula"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applySnippet('> ', '', 'Nota importante')}
                title="Citazione"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleInsertTemplate}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap ml-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Traccia appunti</span>
              </button>
            </div>

            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setMode('write')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  mode === 'write'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>Scrivi</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('split')}
                className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  mode === 'split'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Diviso</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  mode === 'preview'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Anteprima</span>
              </button>
            </div>
          </div>

          {/* Editor and/or Preview grid */}
          <div
            className={`grid gap-4 ${
              mode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {(mode === 'write' || mode === 'split') && (
              <div className="space-y-1.5">
                <label
                  htmlFor={`lesson-note-${lesson.id}`}
                  className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between"
                >
                  <span>Editor Markdown</span>
                  <span className="font-mono tabular-nums">
                    {draft.length} / {MAX_NOTE_LENGTH}
                  </span>
                </label>
                <textarea
                  id={`lesson-note-${lesson.id}`}
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  rows={9}
                  maxLength={MAX_NOTE_LENGTH}
                  placeholder={`Scrivi qui i tuoi appunti su "${lesson.shortTitle}" in Markdown (es. ## Concetti, **grassetto**, - elenco, \`formula\`)...`}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 px-3.5 py-3 text-sm font-mono leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-y min-h-[210px]"
                />
              </div>
            )}

            {(mode === 'preview' || mode === 'split') && (
              <div className={`space-y-1.5 ${mode === 'split' ? 'hidden lg:block' : 'block'}`}>
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span>Anteprima formattata</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Markdown sicuro
                  </span>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-950/40 px-4 py-3.5 min-h-[210px] max-h-[380px] overflow-y-auto">
                  {draft.trim() ? (
                    <MarkdownRenderer markdown={draft} />
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Scrivi nell’editor o clicca "Traccia appunti" per iniziare a prendere note su questo modulo.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <p className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadMarkdown}
                disabled={!draft.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Esporta .md</span>
              </button>

              {(savedNote || draft.trim().length > 0) && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Elimina nota</span>
                </button>
              )}

              {confirmDelete && (
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleDeleteNote()}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer whitespace-nowrap"
                  >
                    Conferma eliminazione
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                  >
                    Annulla
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={saveState === 'saving' || (saveState !== 'dirty' && draft === savedContent)}
              onClick={() => void performSave(draft)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                saveState === 'saved' && draft === savedContent
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                  : saveState === 'dirty' || draft !== savedContent
                    ? 'bg-sky-600 text-white hover:bg-sky-700 cursor-pointer'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-default'
              }`}
            >
              {saveState === 'saved' && draft === savedContent ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{user ? 'Salvato su Firebase' : 'Salvato in locale'}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {saveState === 'saving'
                      ? 'Salvataggio...'
                      : user
                        ? 'Salva su Firebase'
                        : 'Salva in locale'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
