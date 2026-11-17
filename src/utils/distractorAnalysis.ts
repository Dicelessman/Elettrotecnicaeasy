import type { QuizQuestion } from '../types/radiolab';

/**
 * Generates a concise diagnostic hint explaining why a selected wrong option
 * is a typical exam trap, contrasting it with the correct answer.
 */
export function getDistractorTrapNote(
  question: QuizQuestion,
  chosenIndex: number | undefined
): string | null {
  if (typeof chosenIndex !== 'number' || chosenIndex === question.correctIndex) {
    return null;
  }

  const chosenText = (question.options[chosenIndex] ?? '').trim();
  const correctText = (question.options[question.correctIndex] ?? '').trim();
  const qLower = question.question.toLowerCase();
  const cLower = chosenText.toLowerCase();
  const okLower = correctText.toLowerCase();

  // 1. Series vs Parallel confusion
  if (
    (cLower.includes('serie') && okLower.includes('parallelo')) ||
    (cLower.includes('parallelo') && okLower.includes('serie'))
  ) {
    return 'Trappola classica serie/parallelo: verifica sempre se nel circuito la grandezza condivisa è la corrente (serie) oppure la tensione (parallelo).';
  }

  // 2. Unit scale mismatch (kHz vs MHz, mA vs A, uF vs nF vs pF, mW vs W)
  const hasScalePair =
    (cLower.includes('khz') && okLower.includes('mhz')) ||
    (cLower.includes('mhz') && okLower.includes('khz')) ||
    (cLower.includes('ma') && okLower.includes(' a')) ||
    (cLower.includes('µf') && okLower.includes('pf')) ||
    (cLower.includes('nf') && okLower.includes('µf')) ||
    (cLower.includes('mw') && okLower.includes(' w'));
  if (hasScalePair) {
    return `Errore tipico di scala/prefisso SI: hai scelto "${chosenText}" invece di "${correctText}". Ricorda i fattori ×1.000 tra milli, unità, kilo e Mega.`;
  }

  // 3. Numerical factor-of-10 / factor-of-2 / inverted formula traps
  const chosenNum = Number.parseFloat(chosenText.replace(',', '.').replace(/[^0-9.-]/g, ''));
  const correctNum = Number.parseFloat(correctText.replace(',', '.').replace(/[^0-9.-]/g, ''));
  if (!Number.isNaN(chosenNum) && !Number.isNaN(correctNum) && chosenNum !== 0 && correctNum !== 0) {
    const ratio = chosenNum / correctNum;
    if (Math.abs(ratio - 2) < 0.08 || Math.abs(ratio - 0.5) < 0.04) {
      return `Attenzione al fattore 2: in antenne (λ/2 vs λ/4), banda FM o raddoppio dB (+3 dB) è facile confondere metà e doppio tra "${chosenText}" e "${correctText}".`;
    }
    if (Math.abs(ratio - 10) < 0.5 || Math.abs(ratio - 0.1) < 0.02 || Math.abs(ratio - 1000) < 50) {
      return `Controlla le potenze di 10 nella conversione delle unità prima di applicare la formula ("${chosenText}" vs "${correctText}").`;
    }
  }

  // 4. dB sign / power vs voltage trap
  if (qLower.includes('db') || cLower.includes('db') || okLower.includes('db')) {
    return 'Trappola sui decibel: +3 dB raddoppia la POTENZA (×2), mentre per raddoppiare la TENSIONE servono +6 dB; il segno meno indica attenuazione.';
  }

  // 5. Inverted SWR / impedance / reactance behavior
  if (qLower.includes('ros') || qLower.includes('swr')) {
    return 'Ricorda sul ROS: il valore ideale è 1:1 (massima potenza irradiata, zero riflessa); più si sale sopra 2:1, maggiore è il disadattamento.';
  }

  // 6. Fallback contextual contrast
  return `Attenzione al distrattore "${chosenText}": confronta con la risposta esatta ("${correctText}") verificando grandezza richiesta e direzione fisica del fenomeno.`;
}
