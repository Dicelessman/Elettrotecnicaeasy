import { LESSONS, PRE_EXAM_GLOSSARY } from '../data/curriculum';
import type { LessonNote, UserProfile } from '../types/radiolab';
import { Q_CODES } from './morse';

export function buildStudyNotebookMarkdown(
  profile: UserProfile,
  lessonNotes: Record<string, LessonNote>
): string {
  const today = new Date().toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lines: string[] = [
    `# Quaderno di Studio & Formulario — Radiotecnica easy`,
    ``,
    `- **Studente:** ${profile.displayName || 'Radio Studente'}`,
    `- **Data esportazione:** ${today}`,
    `- **Punteggio XP:** ${profile.xp} XP (Serie: ${profile.streakCount} giorni)`,
    ``,
    `---`,
    ``,
    `## 1. I Miei Appunti per Modulo`,
    ``,
  ];

  let noteCount = 0;
  for (const lesson of LESSONS) {
    const note = lessonNotes[lesson.id];
    if (!note || note.content.trim().length === 0) continue;
    noteCount += 1;
    lines.push(`### Modulo ${String(lesson.number).padStart(2, '0')} · ${lesson.title}`);
    lines.push(``);
    lines.push(note.content.trim());
    lines.push(``);
  }

  if (noteCount === 0) {
    lines.push(
      `_Nessuna nota personale salvata finora. Puoi aggiungere appunti in formato Markdown all'interno di ciascuna lezione._`
    );
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`## 2. Formulario Tascabile Pre-Esame (${LESSONS.length} Moduli)`);
  lines.push(``);

  for (const lesson of LESSONS) {
    lines.push(
      `- **M${String(lesson.number).padStart(2, '0')} (${lesson.shortTitle}):** \`${lesson.formula.expression}\` — ${lesson.formula.plainReading}`
    );
  }

  lines.push(``);
  lines.push(`## 3. Concetti Chiave dal Glossario`);
  lines.push(``);
  for (const g of PRE_EXAM_GLOSSARY) {
    const formulaPart = g.formula ? ` [\`${g.formula}\`]` : '';
    lines.push(`- **${g.term}**${formulaPart}: ${g.plainMeaning} _(Esame: ${g.examTip})_`);
  }

  lines.push(``);
  lines.push(`## 4. Codici Q Essenziali (CW & Fonia)`);
  lines.push(``);
  for (const q of Q_CODES) {
    lines.push(`- **${q.code}**: ${q.statementMeaning} — _Domanda:_ ${q.questionMeaning}`);
  }

  lines.push(``);
  return lines.join('\n');
}

export function downloadStudyNotebookMarkdown(
  profile: UserProfile,
  lessonNotes: Record<string, LessonNote>
): void {
  const markdown = buildStudyNotebookMarkdown(profile, lessonNotes);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateTag = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `radiotecnica-easy-quaderno-${dateTag}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
