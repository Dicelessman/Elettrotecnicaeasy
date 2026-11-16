import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  GitFork,
  Headphones,
  Play,
  Radio,
  RotateCcw,
  Square,
  Volume2,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import {
  CHAR_TO_MORSE,
  formatMorseDisplay,
  getDotDurationMs,
  KOCH_LETTERS,
  MORSE_TABLE,
  MORSE_TO_CHAR,
  playMorseAudio,
  startKeyerTone,
  stopMorsePlayback,
} from '../../utils/morse';
import { ReadoutCell, SimulatorShell } from './SimulatorShell';

interface Lesson13MorseSimProps {
  onChallengeComplete?: () => void;
}

type TeachingMethodTab = 'phonic' | 'tree' | 'koch-keyer';

const TREE_ROWS: { depth: number; nodes: { label: string; path: string }[] }[] = [
  {
    depth: 1,
    nodes: [
      { label: 'E (·)', path: '.' },
      { label: 'T (−)', path: '-' },
    ],
  },
  {
    depth: 2,
    nodes: [
      { label: 'I (··)', path: '..' },
      { label: 'A (·−)', path: '.-' },
      { label: 'N (−·)', path: '-.' },
      { label: 'M (−−)', path: '--' },
    ],
  },
  {
    depth: 3,
    nodes: [
      { label: 'S (···)', path: '...' },
      { label: 'U (··−)', path: '..-' },
      { label: 'R (·−·)', path: '.-.' },
      { label: 'W (·−−)', path: '.--' },
      { label: 'D (−··)', path: '-..' },
      { label: 'K (−·−)', path: '-.-' },
      { label: 'G (−−·)', path: '--.' },
      { label: 'O (−−−)', path: '---' },
    ],
  },
];

export const Lesson13MorseSim: React.FC<Lesson13MorseSimProps> = ({ onChallengeComplete }) => {
  const { profile } = useStudy();
  const [activeTab, setActiveTab] = useState<TeachingMethodTab>('phonic');

  // Method 1: Phonic & Farnsworth Sound Explorer
  const [selectedChar, setSelectedChar] = useState('K');
  const [wpm, setWpm] = useState(16);
  const [farnsworth, setFarnsworth] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLampOn, setActiveLampOn] = useState(false);

  // Method 2: Dichotomous Visual Tree
  const [treePath, setTreePath] = useState('');

  // Method 3: Koch Progressive + Tactile Keyer
  const [kochCount, setKochCount] = useState(4); // K, M, R, S
  const [targetChar, setTargetChar] = useState('K');
  const [keyedSymbols, setKeyedSymbols] = useState('');
  const [decodedHistory, setDecodedHistory] = useState<string>('');
  const [kochScore, setKochScore] = useState(0);
  const [isKeyDown, setIsKeyDown] = useState(false);

  const keyDownAtRef = useRef<number | null>(null);
  const stopToneRef = useRef<(() => void) | null>(null);
  const commitTimerRef = useRef<number | null>(null);
  const challengeDoneRef = useRef(false);

  useEffect(() => {
    return () => {
      stopMorsePlayback();
      stopToneRef.current?.();
      if (commitTimerRef.current) window.clearTimeout(commitTimerRef.current);
    };
  }, []);

  const selectedEntry = useMemo(
    () => MORSE_TABLE.find((m) => m.char === selectedChar) ?? MORSE_TABLE[0],
    [selectedChar]
  );

  const dotMs = getDotDurationMs(wpm);
  const dashThresholdMs = Math.max(130, Math.round(dotMs * 2));

  const playSnippet = useCallback(
    (text: string) => {
      setIsPlaying(true);
      playMorseAudio(text, {
        wpm,
        farnsworth,
        freqHz: 680,
        onStep: (seg) => {
          setActiveLampOn(Boolean(seg?.on));
        },
        onDone: () => {
          setIsPlaying(false);
          setActiveLampOn(false);
        },
      });
    },
    [wpm, farnsworth]
  );

  const handleStopAudio = () => {
    stopMorsePlayback();
    setIsPlaying(false);
    setActiveLampOn(false);
  };

  // Tree navigation
  const treeDecodedChar = MORSE_TO_CHAR[treePath] ?? null;

  const appendTreeStep = (sym: '.' | '-') => {
    if (treePath.length >= 4) return;
    const next = `${treePath}${sym}`;
    setTreePath(next);
    const ch = MORSE_TO_CHAR[next];
    if (ch) {
      playSnippet(ch);
    }
  };

  // Koch pool
  const kochPool = useMemo(() => KOCH_LETTERS.slice(0, kochCount), [kochCount]);

  const pickNextTarget = useCallback(
    (exclude?: string) => {
      const candidates = kochPool.filter((m) => m.char !== exclude);
      const list = candidates.length > 0 ? candidates : kochPool;
      const picked = list[Math.floor(Math.random() * list.length)];
      setTargetChar(picked.char);
    },
    [kochPool]
  );

  // Keyer press / release handlers
  const handleKeyPressStart = useCallback(() => {
    if (isKeyDown) return;
    if (commitTimerRef.current) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    setIsKeyDown(true);
    setActiveLampOn(true);
    keyDownAtRef.current = performance.now();
    stopToneRef.current = startKeyerTone(680);
    if (profile.hapticFeedbackEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignore
      }
    }
  }, [isKeyDown, profile.hapticFeedbackEnabled]);

  const handleKeyPressEnd = useCallback(() => {
    if (!isKeyDown) return;
    setIsKeyDown(false);
    setActiveLampOn(false);
    stopToneRef.current?.();
    stopToneRef.current = null;

    const started = keyDownAtRef.current ?? performance.now();
    const heldMs = performance.now() - started;
    keyDownAtRef.current = null;

    const sym: '.' | '-' = heldMs >= dashThresholdMs ? '-' : '.';
    setKeyedSymbols((prev) => {
      const nextCode = prev.length >= 6 ? sym : `${prev}${sym}`;
      if (commitTimerRef.current) window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = window.setTimeout(() => {
        const decoded = MORSE_TO_CHAR[nextCode] ?? '?';
        setDecodedHistory((h) => `${h}${decoded}`.slice(-18));
        if (decoded === targetChar) {
          setKochScore((s) => {
            const nextScore = s + 1;
            if (nextScore >= 3 && !challengeDoneRef.current) {
              challengeDoneRef.current = true;
              onChallengeComplete?.();
            }
            return nextScore;
          });
          pickNextTarget(decoded);
        }
        setKeyedSymbols('');
      }, Math.max(420, dotMs * 4));
      return nextCode;
    });
  }, [isKeyDown, dashThresholdMs, dotMs, targetChar, pickNextTarget, onChallengeComplete]);

  // Keyboard Spacebar binding when inside Koch & Keyer tab
  useEffect(() => {
    if (activeTab !== 'koch-keyer') return;
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        handleKeyPressStart();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        handleKeyPressEnd();
      }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [activeTab, handleKeyPressStart, handleKeyPressEnd]);

  const methodTabs: { id: TeachingMethodTab; label: string; icon: React.ReactNode }[] = [
    { id: 'phonic', label: '1. Fonico & Farnsworth', icon: <Headphones className="w-3.5 h-3.5" /> },
    { id: 'tree', label: '2. Albero Dicotomico', icon: <GitFork className="w-3.5 h-3.5" /> },
    { id: 'koch-keyer', label: '3. Koch & Tasto Tattile', icon: <Radio className="w-3.5 h-3.5" /> },
  ];

  const handleReset = () => {
    handleStopAudio();
    setTreePath('');
    setKeyedSymbols('');
    setDecodedHistory('');
    setKochScore(0);
    challengeDoneRef.current = false;
  };

  const stageNode = (
    <div className="space-y-4">
      {/* Method Selector Tabs + Visual TX Lamp */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1.5">
          {methodTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  active
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="inline-flex items-center gap-2 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
          <span
            className={`w-3 h-3 rounded-full border transition-all ${
              activeLampOn
                ? 'bg-amber-400 border-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.9)]'
                : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
            }`}
          />
          <span>{activeLampOn ? 'PORTANTE ON' : 'ASCOLTO'}</span>
        </div>
      </div>

      {/* TAB 1: PHONIC + FARNSWORTH SOUND */}
      {activeTab === 'phonic' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-3xl font-bold font-mono text-slate-900 dark:text-white shrink-0">
                {selectedEntry.char}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="text-xl font-bold font-mono tracking-widest text-sky-700 dark:text-sky-400">
                  {formatMorseDisplay(selectedEntry.code)}
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Suono: {selectedEntry.rhythm}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mnemonica: {selectedEntry.mnemonic}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => playSnippet(selectedEntry.char)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Ascolta &ldquo;{selectedEntry.char}&rdquo;</span>
              </button>
              <button
                type="button"
                onClick={() => (isPlaying ? handleStopAudio() : playSnippet('CQ CQ SOS 73'))}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Stop' : 'Demo: CQ SOS 73'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5">
            {MORSE_TABLE.slice(0, 26).map((item) => {
              const active = item.char === selectedChar;
              return (
                <button
                  key={item.char}
                  type="button"
                  onClick={() => {
                    setSelectedChar(item.char);
                    playSnippet(item.char);
                  }}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-colors cursor-pointer ${
                    active
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-sky-400'
                  }`}
                >
                  <div className="text-xs font-bold">{item.char}</div>
                  <div
                    className={`text-[9px] font-mono ${
                      active ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {formatMorseDisplay(item.code)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: DICHOTOMOUS TREE */}
      {activeTab === 'tree' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Regola dell’Albero: Sinistra = Punto (·) · Destra = Linea (−)
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-200">
                  Percorso: {treePath ? formatMorseDisplay(treePath) : 'Radice (Start)'}
                </span>
                <span className="text-lg font-bold font-mono text-sky-700 dark:text-sky-400">
                  → {treeDecodedChar ?? '—'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={treePath.length >= 4}
                onClick={() => appendTreeStep('.')}
                className="px-3.5 py-2 text-xs font-bold font-mono rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 cursor-pointer"
              >
                ← Punto (·)
              </button>
              <button
                type="button"
                disabled={treePath.length >= 4}
                onClick={() => appendTreeStep('-')}
                className="px-3.5 py-2 text-xs font-bold font-mono rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 cursor-pointer"
              >
                Linea (−) →
              </button>
              <button
                type="button"
                onClick={() => setTreePath('')}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Radice</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5 overflow-x-auto pb-1">
            {TREE_ROWS.map((row) => (
              <div
                key={row.depth}
                className="grid gap-1.5 min-w-[460px]"
                style={{ gridTemplateColumns: `repeat(${row.nodes.length}, minmax(0, 1fr))` }}
              >
                {row.nodes.map((node) => {
                  const isCurrent = treePath === node.path;
                  const isAncestor = treePath.startsWith(node.path) && treePath !== node.path;
                  return (
                    <button
                      key={node.path}
                      type="button"
                      onClick={() => {
                        setTreePath(node.path);
                        const ch = MORSE_TO_CHAR[node.path];
                        if (ch) playSnippet(ch);
                      }}
                      className={`py-2 px-1.5 rounded-lg border text-center text-xs font-mono transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-sky-600 border-sky-600 text-white font-bold'
                          : isAncestor
                            ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-200 font-semibold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-400'
                      }`}
                    >
                      {node.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: KOCH + TACTILE KEYER */}
      {activeTab === 'koch-keyer' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Trasmetti la lettera bersaglio ({kochCount} caratteri Koch):
              </div>
              <div className="flex items-baseline gap-2.5 mt-0.5">
                <span className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
                  {targetChar}
                </span>
                <span className="text-lg font-mono font-bold text-sky-700 dark:text-sky-400">
                  {formatMorseDisplay(CHAR_TO_MORSE[targetChar] ?? '')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => playSnippet(targetChar)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-900 text-sky-800 dark:text-sky-300 hover:bg-sky-50 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Riascolta</span>
              </button>
              <button
                type="button"
                onClick={() => pickNextTarget(targetChar)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                <span>Cambia</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Tasto Telegrafico (clicca/tieni o premi Spazio)</span>
              <span className="font-mono font-bold text-sky-700 dark:text-sky-400">
                {keyedSymbols ? formatMorseDisplay(keyedSymbols) : 'Pronto'}
              </span>
            </div>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleKeyPressStart();
              }}
              onPointerUp={() => handleKeyPressEnd()}
              onPointerLeave={() => {
                if (isKeyDown) handleKeyPressEnd();
              }}
              onPointerCancel={() => {
                if (isKeyDown) handleKeyPressEnd();
              }}
              className={`w-full py-6 rounded-xl border-2 font-bold text-sm select-none touch-none transition-all cursor-pointer ${
                isKeyDown
                  ? 'bg-amber-500 border-amber-600 text-white scale-[0.98]'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 hover:border-sky-500'
              }`}
            >
              {isKeyDown ? 'TRASMISSIONE IN CORSO (CW ON)' : 'TIENI PREMUTO PER TRASMETTERE (· / −)'}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                Decodificato: <strong className="text-slate-900 dark:text-white">{decodedHistory || '—'}</strong>
              </span>
              <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {kochScore >= 3 && <CheckCircle2 className="w-3.5 h-3.5" />}
                Centri: {kochScore}/3
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const controlsNode = (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="block space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Velocità caratteri (PARIS)</span>
            <span className="font-mono tabular-nums font-bold text-sky-700 dark:text-sky-400">{wpm} WPM</span>
          </div>
          <input
            type="range"
            min={8}
            max={25}
            value={wpm}
            onChange={(e) => setWpm(Number(e.target.value))}
            className="w-full accent-sky-600 cursor-pointer"
          />
        </label>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={farnsworth}
            onChange={(e) => setFarnsworth(e.target.checked)}
            className="w-4 h-4 accent-sky-600 cursor-pointer"
          />
          <span>Spaziatura Farnsworth (pause estese)</span>
        </label>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Set progressivo metodo Koch
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[2, 4, 6, 10].map((cnt) => (
            <button
              key={cnt}
              type="button"
              onClick={() => {
                setKochCount(cnt);
                setTargetChar(KOCH_LETTERS[0].char);
              }}
              className={`py-1.5 text-xs font-mono rounded-lg border cursor-pointer ${
                kochCount === cnt
                  ? 'bg-sky-600 border-sky-600 text-white font-bold'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {cnt}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Lettere attive: <span className="font-mono font-semibold">{kochPool.map((k) => k.char).join(', ')}</span>
        </p>
      </div>

      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
        <div className="font-semibold text-slate-800 dark:text-slate-100">Soglie Tasto &amp; Ritmo</div>
        <div>Tocco breve (&lt; {dashThresholdMs} ms) = Punto (·)</div>
        <div>Tocco lungo (&ge; {dashThresholdMs} ms) = Linea (−)</div>
        <div>Vai alla scheda <strong>3. Koch &amp; Tasto Tattile</strong> e centra 3 lettere per completare la sfida.</div>
      </div>
    </div>
  );

  const readoutsNode = (
    <>
      <ReadoutCell label="Velocità CW" value={`${wpm} WPM`} sublabel={farnsworth ? 'Farnsworth ON' : 'Standard'} tone="azure" />
      <ReadoutCell label="Durata Punto (dit)" value={`${dotMs} ms`} sublabel="1200 / WPM" />
      <ReadoutCell label="Durata Linea (dah)" value={`${dotMs * 3} ms`} sublabel="3 × dit" tone="amber" />
      <ReadoutCell
        label="Sfida Tasto Koch"
        value={`${kochScore} / 3`}
        sublabel={kochScore >= 3 ? 'Completata' : 'In corso'}
        tone={kochScore >= 3 ? 'emerald' : 'neutral'}
      />
    </>
  );

  return (
    <SimulatorShell
      title="Laboratorio Multi-Metodo Codice Morse (CW)"
      challengeText="Esplora i 3 metodi (Fonico, Albero, Koch) e trasmetti 3 lettere bersaglio corrette con il tasto telegrafico."
      challengeDone={kochScore >= 3}
      onReset={handleReset}
      stage={stageNode}
      controls={controlsNode}
      readouts={readoutsNode}
    />
  );
};
