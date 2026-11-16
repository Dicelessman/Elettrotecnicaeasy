import React from 'react';
import { BookMarked, Download, Printer, X } from 'lucide-react';
import { LESSONS, PRE_EXAM_GLOSSARY } from '../data/curriculum';
import type { LessonNote, UserProfile } from '../types/radiolab';
import { Q_CODES } from '../utils/morse';
import { downloadStudyNotebookMarkdown } from '../utils/studyNotebookExport';
import { MarkdownRenderer } from './MarkdownRenderer';

interface PrintableNotebookModalProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  lessonNotes: Record<string, LessonNote>;
}

export const PrintableNotebookModal: React.FC<PrintableNotebookModalProps> = ({
  open,
  onClose,
  profile,
  lessonNotes,
}) => {
  if (!open) return null;

  const lessonsWithNotes = LESSONS.filter(
    (l) => lessonNotes[l.id] && lessonNotes[l.id].content.trim().length > 0
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:static print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="printable-notebook-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl print:max-h-none print:border-0 print:shadow-none print:rounded-none">
        {/* Toolbar (hidden on print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 print:hidden">
          <div className="flex items-center gap-2.5">
            <BookMarked className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <div>
              <h2
                id="printable-notebook-title"
                className="text-base font-bold text-slate-900 dark:text-slate-50"
              >
                Quaderno Appunti &amp; Formulario Stampabile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lessonsWithNotes.length} {lessonsWithNotes.length === 1 ? 'modulo annotato' : 'moduli annotati'} + formulario completo dei {LESSONS.length} moduli
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadStudyNotebookMarkdown(profile, lessonNotes)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Scarica .md</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Stampa / Salva PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi anteprima"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="printable-notebook-sheet flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 text-slate-900 dark:text-slate-100 print:overflow-visible print:p-0 print:text-slate-900">
          {/* Header block */}
          <div className="border-b-2 border-slate-200 dark:border-slate-700 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2 print:border-slate-400">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-sky-700 dark:text-sky-400 print:text-slate-600">
                Radiotecnica easy · Quaderno di Ripasso
              </p>
              <h1 className="text-2xl font-bold mt-0.5">
                {profile.displayName || 'Radio Studente'}
              </h1>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums print:text-slate-700">
              {new Date().toLocaleDateString('it-IT')} · {profile.xp} XP · {lessonsWithNotes.length}/{LESSONS.length} note
            </div>
          </div>

          {/* Section 1: Personal Notes */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold border-b border-slate-200 dark:border-slate-800 pb-1.5 print:border-slate-300">
              1. Appunti Personali per Modulo
            </h2>
            {lessonsWithNotes.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                Non hai ancora scritto note personali nelle lezioni. Apri qualsiasi modulo e usa la scheda &ldquo;Note personali (Markdown)&rdquo; per raccogliere qui i tuoi schemi.
              </p>
            ) : (
              <div className="space-y-4">
                {lessonsWithNotes.map((lesson) => (
                  <article
                    key={lesson.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-2 break-inside-avoid print:bg-white print:border-slate-300"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                      <span>Modulo {String(lesson.number).padStart(2, '0')} · {lesson.stageLabel}</span>
                      <span>
                        Aggiornato il {new Date(lessonNotes[lesson.id].updatedAtMs).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">
                      {lesson.title}
                    </h3>
                    <div className="pt-1">
                      <MarkdownRenderer markdown={lessonNotes[lesson.id].content} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Pocket Formula Sheet */}
          <section className="space-y-4 break-inside-avoid">
            <h2 className="text-lg font-bold border-b border-slate-200 dark:border-slate-800 pb-1.5 print:border-slate-300">
              2. Formulario Tascabile dei {LESSONS.length} Moduli
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2">
              {LESSONS.map((lesson) => (
                <div
                  key={lesson.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-1 break-inside-avoid print:border-slate-300"
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 print:text-slate-900">
                    M{String(lesson.number).padStart(2, '0')} · {lesson.shortTitle}
                  </div>
                  <div className="text-xs font-mono font-bold text-sky-700 dark:text-sky-400 print:text-slate-900">
                    {lesson.formula.expression}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug print:text-slate-700">
                    {lesson.formula.plainReading}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Key Exam Reminders & Q-Codes */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold border-b border-slate-200 dark:border-slate-800 pb-1.5 print:border-slate-300">
              3. Promemoria Esame e Codici Q Principali
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {PRE_EXAM_GLOSSARY.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 break-inside-avoid print:border-slate-300"
                >
                  <span className="font-bold">{item.term}:</span>{' '}
                  <span className="text-slate-600 dark:text-slate-300 print:text-slate-700">
                    {item.examTip}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs pt-1">
              {Q_CODES.map((q) => (
                <div
                  key={q.code}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 break-inside-avoid print:border-slate-300"
                >
                  <div className="font-mono font-bold text-sky-700 dark:text-sky-400 print:text-slate-900">
                    {q.code}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 print:text-slate-700">
                    {q.statementMeaning}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
