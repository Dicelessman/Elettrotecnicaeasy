export interface SpeechSegment {
  id: string;
  label: string;
  text: string;
}

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

/**
 * Normalizes technical radio, physics, and circuit notation into natural Italian speech.
 */
export function normalizeItalianTechSpeech(raw: string): string {
  return raw
    .replace(/λ\s*\/\s*2/g, 'mezza lambda')
    .replace(/λ\s*\/\s*4/g, 'un quarto di lambda')
    .replace(/λ/g, ' lambda ')
    .replace(/kΩ/g, ' chilo-ohm ')
    .replace(/MΩ/g, ' mega-ohm ')
    .replace(/Ω/g, ' ohm ')
    .replace(/µF|μF/g, ' microfarad ')
    .replace(/\bnF\b/g, ' nanofarad ')
    .replace(/\bpF\b/g, ' picofarad ')
    .replace(/\bmH\b/g, ' millihenry ')
    .replace(/µH|μH/g, ' microhenry ')
    .replace(/\bGHz\b/g, ' gigahertz ')
    .replace(/\bMHz\b/g, ' megahertz ')
    .replace(/\bkHz\b/g, ' chilohertz ')
    .replace(/\bHz\b/g, ' hertz ')
    .replace(/\bd\.d\.p\./gi, 'differenza di potenziale')
    .replace(/\bf\.e\.m\./gi, 'forza elettromotrice')
    .replace(/\bVeff\b/g, 'volt efficaci')
    .replace(/\bVpp\b/g, 'volt picco picco')
    .replace(/\bVp\b/g, 'volt di picco')
    .replace(/\bmW\b/g, 'milliwatt')
    .replace(/\bmA\b/g, 'milliampere')
    .replace(/\bWPM\b/g, 'parole al minuto')
    .replace(/→/g, ', quindi ')
    .replace(/≈/g, ' circa ')
    .replace(/≥/g, ' maggiore o uguale a ')
    .replace(/≤/g, ' minore o uguale a ')
    .replace(/×/g, ' per ')
    .replace(/÷/g, ' diviso ')
    .replace(/±/g, ' più o meno ')
    .replace(/·/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits a segment into sentence chunks <= ~200 chars to avoid Chrome's long-utterance cutoff.
 */
export function splitIntoSpeechChunks(text: string, maxLen = 200): string[] {
  const clean = normalizeItalianTechSpeech(text);
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?;:])\s+/);
  const chunks: string[] = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxLen) {
      chunks.push(trimmed);
      continue;
    }
    const words = trimmed.split(/\s+/);
    let current = '';
    for (const w of words) {
      if (current.length + w.length + 1 > maxLen && current.length > 0) {
        chunks.push(current);
        current = w;
      } else {
        current = current ? `${current} ${w}` : w;
      }
    }
    if (current) chunks.push(current);
  }

  return chunks;
}

export function pickPreferredItalianVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const italian = voices.filter((v) => v.lang.toLowerCase().startsWith('it'));
  if (italian.length > 0) {
    return [...italian].sort((a, b) => {
      // Prefer local / natural Italian voices first
      if (a.localService !== b.localService) return a.localService ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }
  return voices;
}
