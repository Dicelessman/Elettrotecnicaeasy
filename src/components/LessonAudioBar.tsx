import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  isSpeechSynthesisSupported,
  pickPreferredItalianVoices,
  splitIntoSpeechChunks,
  type SpeechSegment,
} from '../utils/speechSynthesis';

export interface CustomSpeakRequest {
  title: string;
  text: string;
  nonce: number;
}

interface LessonAudioBarProps {
  segments: SpeechSegment[];
  activeSegmentId: string | null;
  onActiveSegmentChange: (id: string | null) => void;
  playRequest?: { segmentId: string; nonce: number } | null;
  customSpeakRequest?: CustomSpeakRequest | null;
  onAutoAdvanceStep?: () => void;
  hasNextStep?: boolean;
  sticky?: boolean;
}

const SPEED_OPTIONS = [0.85, 1, 1.15, 1.3, 1.5] as const;

export const LessonAudioBar: React.FC<LessonAudioBarProps> = ({
  segments,
  activeSegmentId,
  onActiveSegmentChange,
  playRequest,
  customSpeakRequest,
  onAutoAdvanceStep,
  hasNextStep = false,
  sticky = true,
}) => {
  const supported = isSpeechSynthesisSupported();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [rate, setRate] = useState<number>(1);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [speechError, setSpeechError] = useState<string | null>(null);

  const runTokenRef = useRef(0);
  const currentIdxRef = useRef(0);
  const currentChunkIdxRef = useRef(0);
  const dirtyWhilePausedRef = useRef(false);
  const statusRef = useRef<'idle' | 'playing' | 'paused'>('idle');
  const rateRef = useRef(rate);
  const voiceUriRef = useRef(selectedVoiceURI);
  const voicesRef = useRef<SpeechSynthesisVoice[]>(voices);
  const autoAdvanceRef = useRef(autoAdvance);
  const onAutoAdvanceRef = useRef(onAutoAdvanceStep);
  const hasNextStepRef = useRef(hasNextStep);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    voiceUriRef.current = selectedVoiceURI;
  }, [selectedVoiceURI]);

  useEffect(() => {
    voicesRef.current = voices;
  }, [voices]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);

  useEffect(() => {
    onAutoAdvanceRef.current = onAutoAdvanceStep;
  }, [onAutoAdvanceStep]);

  useEffect(() => {
    hasNextStepRef.current = hasNextStep;
  }, [hasNextStep]);

  // Load available SpeechSynthesis voices (handles async voiceschanged event)
  useEffect(() => {
    if (!supported) return;
    const syncVoices = () => {
      const raw = window.speechSynthesis.getVoices();
      const sorted = pickPreferredItalianVoices(raw);
      setVoices(sorted);
      setSelectedVoiceURI((prev) => {
        if (prev && sorted.some((v) => v.voiceURI === prev)) return prev;
        return sorted[0]?.voiceURI ?? '';
      });
    };

    syncVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', syncVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', syncVoices);
    };
  }, [supported]);

  const stopPlayback = useCallback(() => {
    runTokenRef.current += 1;
    currentChunkIdxRef.current = 0;
    dirtyWhilePausedRef.current = false;
    if (supported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
    setCustomTitle(null);
    setStatus('idle');
    onActiveSegmentChange(null);
  }, [supported, onActiveSegmentChange]);

  // Cancel speech cleanly when segments change (e.g. changing step or lesson) or on unmount
  useEffect(() => {
    stopPlayback();
    currentIdxRef.current = 0;
  }, [segments, stopPlayback]);

  useEffect(() => {
    return () => {
      runTokenRef.current += 1;
      if (isSpeechSynthesisSupported()) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  const speakCustomText = useCallback(
    (title: string, text: string) => {
      if (!supported) return;
      runTokenRef.current += 1;
      const myToken = runTokenRef.current;
      dirtyWhilePausedRef.current = false;
      setSpeechError(null);
      setCustomTitle(title);
      onActiveSegmentChange(null);

      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }

      const chunks = splitIntoSpeechChunks(text);
      if (chunks.length === 0) {
        setCustomTitle(null);
        setStatus('idle');
        return;
      }

      const chosenVoice =
        voicesRef.current.find((v) => v.voiceURI === voiceUriRef.current) ??
        voicesRef.current[0] ??
        null;

      setStatus('playing');
      const playChunk = (idx: number) => {
        if (runTokenRef.current !== myToken) return;
        if (idx >= chunks.length) {
          setCustomTitle(null);
          setStatus('idle');
          return;
        }
        const utter = new SpeechSynthesisUtterance(chunks[idx]);
        utter.lang = chosenVoice?.lang || 'it-IT';
        if (chosenVoice) utter.voice = chosenVoice;
        utter.rate = rateRef.current;
        utter.pitch = 1;
        utter.onend = () => {
          if (runTokenRef.current !== myToken) return;
          playChunk(idx + 1);
        };
        utter.onerror = (ev) => {
          if (runTokenRef.current !== myToken) return;
          if (ev.error === 'canceled' || ev.error === 'interrupted') return;
          setSpeechError('Sintesi vocale non disponibile su questo dispositivo.');
          setCustomTitle(null);
          setStatus('idle');
        };
        window.speechSynthesis.speak(utter);
      };
      playChunk(0);
    },
    [supported, onActiveSegmentChange]
  );

  const speakFromIndex = useCallback(
    (startSegIdx: number, startChunkIdx = 0) => {
      if (!supported || segments.length === 0) return;
      const clampedIdx = Math.max(0, Math.min(segments.length - 1, startSegIdx));

      runTokenRef.current += 1;
      const myToken = runTokenRef.current;
      dirtyWhilePausedRef.current = false;
      setCustomTitle(null);
      setSpeechError(null);

      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }

      const playSegmentAt = (segIdx: number, initialChunkIdx: number) => {
        if (runTokenRef.current !== myToken) return;
        if (segIdx >= segments.length) {
          currentChunkIdxRef.current = 0;
          setStatus('idle');
          onActiveSegmentChange(null);
          if (autoAdvanceRef.current && hasNextStepRef.current && onAutoAdvanceRef.current) {
            onAutoAdvanceRef.current();
          }
          return;
        }

        const seg = segments[segIdx];
        currentIdxRef.current = segIdx;
        onActiveSegmentChange(seg.id);
        setStatus('playing');

        const chunks = splitIntoSpeechChunks(seg.text);
        if (chunks.length === 0) {
          playSegmentAt(segIdx + 1, 0);
          return;
        }

        const chosenVoice =
          voicesRef.current.find((v) => v.voiceURI === voiceUriRef.current) ??
          voicesRef.current[0] ??
          null;

        const playChunkAt = (chunkIdx: number) => {
          if (runTokenRef.current !== myToken) return;
          if (chunkIdx >= chunks.length) {
            currentChunkIdxRef.current = 0;
            playSegmentAt(segIdx + 1, 0);
            return;
          }

          currentChunkIdxRef.current = chunkIdx;
          const utter = new SpeechSynthesisUtterance(chunks[chunkIdx]);
          utter.lang = chosenVoice?.lang || 'it-IT';
          if (chosenVoice) utter.voice = chosenVoice;
          utter.rate = rateRef.current;
          utter.pitch = 1;

          utter.onend = () => {
            if (runTokenRef.current !== myToken) return;
            playChunkAt(chunkIdx + 1);
          };

          utter.onerror = (ev) => {
            if (runTokenRef.current !== myToken) return;
            if (ev.error === 'canceled' || ev.error === 'interrupted') return;
            setSpeechError('Sintesi vocale non disponibile su questo dispositivo.');
            setStatus('idle');
            onActiveSegmentChange(null);
          };

          window.speechSynthesis.speak(utter);
        };

        playChunkAt(Math.max(0, Math.min(chunks.length - 1, initialChunkIdx)));
      };

      playSegmentAt(clampedIdx, startChunkIdx);
    },
    [supported, segments, onActiveSegmentChange]
  );

  const lastHandledNonceRef = useRef<number | null>(null);
  const lastHandledCustomNonceRef = useRef<number | null>(null);

  // Trigger playback directly when user clicks an inline "Ascolta" button
  useEffect(() => {
    if (!playRequest || segments.length === 0) return;
    if (lastHandledNonceRef.current === playRequest.nonce) return;
    const idx = segments.findIndex((s) => s.id === playRequest.segmentId);
    if (idx === -1) return;
    lastHandledNonceRef.current = playRequest.nonce;
    speakFromIndex(idx, 0);
  }, [playRequest, segments, speakFromIndex]);

  // Trigger custom speak request (e.g. clicking a symbol inside CircuitDiagram)
  useEffect(() => {
    if (!customSpeakRequest) return;
    if (lastHandledCustomNonceRef.current === customSpeakRequest.nonce) return;
    lastHandledCustomNonceRef.current = customSpeakRequest.nonce;
    speakCustomText(customSpeakRequest.title, customSpeakRequest.text);
  }, [customSpeakRequest, speakCustomText]);

  const handleTogglePlayPause = useCallback(() => {
    if (!supported || segments.length === 0) return;

    if (status === 'playing') {
      try {
        window.speechSynthesis.pause();
        setStatus('paused');
      } catch {
        stopPlayback();
      }
      return;
    }

    if (status === 'paused') {
      if (!dirtyWhilePausedRef.current && window.speechSynthesis.paused) {
        try {
          window.speechSynthesis.resume();
          setStatus('playing');
          return;
        } catch {
          // Fall through to clean chunk resume
        }
      }
      speakFromIndex(currentIdxRef.current, currentChunkIdxRef.current);
      return;
    }

    speakFromIndex(0, 0);
  }, [supported, segments.length, status, stopPlayback, speakFromIndex]);

  const handlePrev = useCallback(() => {
    const target = Math.max(0, currentIdxRef.current - 1);
    speakFromIndex(target, 0);
  }, [speakFromIndex]);

  const handleNext = useCallback(() => {
    const target = Math.min(segments.length - 1, currentIdxRef.current + 1);
    speakFromIndex(target, 0);
  }, [segments.length, speakFromIndex]);

  // Keyboard shortcuts: Space (Play/Pause), Alt+ArrowLeft (Prev), Alt+ArrowRight (Next), Escape (Stop)
  useEffect(() => {
    if (!supported || segments.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        // Do not hijack Spacebar when activating a button, link, or interactive SVG hotspot
        if (
          tag === 'BUTTON' ||
          tag === 'A' ||
          target?.getAttribute('role') === 'button'
        ) {
          return;
        }
        e.preventDefault();
        handleTogglePlayPause();
        return;
      }

      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
        return;
      }

      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
        return;
      }

      if (e.key === 'Escape' && statusRef.current !== 'idle') {
        e.preventDefault();
        stopPlayback();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [supported, segments.length, handleTogglePlayPause, handlePrev, handleNext, stopPlayback]);

  const handleRateChange = (nextRate: number) => {
    setRate(nextRate);
    rateRef.current = nextRate;
    if (statusRef.current === 'playing' && !customTitle) {
      speakFromIndex(currentIdxRef.current, currentChunkIdxRef.current);
    } else if (statusRef.current === 'paused') {
      dirtyWhilePausedRef.current = true;
    }
  };

  const handleVoiceChange = (uri: string) => {
    setSelectedVoiceURI(uri);
    voiceUriRef.current = uri;
    if (statusRef.current === 'playing' && !customTitle) {
      speakFromIndex(currentIdxRef.current, currentChunkIdxRef.current);
    } else if (statusRef.current === 'paused') {
      dirtyWhilePausedRef.current = true;
    }
  };

  const wrapperPosition = sticky ? 'sticky bottom-3 z-20' : '';

  if (!supported) {
    return (
      <div
        className={`${wrapperPosition} rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2.5 shadow-md flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400`}
      >
        <VolumeX className="w-4 h-4 shrink-0" />
        <span>Sintesi vocale non supportata in questo browser.</span>
      </div>
    );
  }

  if (segments.length === 0) return null;

  const activeIndex = activeSegmentId
    ? Math.max(
        0,
        segments.findIndex((s) => s.id === activeSegmentId)
      )
    : currentIdxRef.current;
  const activeSegment = activeSegmentId
    ? segments.find((s) => s.id === activeSegmentId) ?? null
    : null;
  const isPlayingOrPaused = status !== 'idle';

  return (
    <div
      role="region"
      aria-label="Controlli audio della lezione"
      className={`${wrapperPosition} rounded-xl border transition-colors backdrop-blur-md px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3 ${
        isPlayingOrPaused
          ? 'border-sky-300 dark:border-sky-700 bg-white/95 dark:bg-slate-900/95'
          : 'border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
            status === 'playing'
              ? 'bg-sky-600 border-sky-600 text-white'
              : status === 'paused'
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                : 'bg-sky-50 dark:bg-sky-950/70 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400'
          }`}
        >
          <Volume2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            {customTitle
              ? `Componente: ${customTitle}`
              : activeSegment
                ? status === 'paused'
                  ? `In pausa: ${activeSegment.label}`
                  : `In ascolto: ${activeSegment.label}`
                : 'Lettura vocale della lezione'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate flex items-center gap-2">
            <span>
              {activeSegment
                ? `Sezione ${activeIndex + 1} di ${segments.length} · ${rate}×`
                : `${segments.length} sezioni · ${rate}×`}
            </span>
            <span className="hidden xl:inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
              <Keyboard className="w-3 h-3" />
              Spazio · Alt+←/→ · Esc
            </span>
          </div>
          {speechError && (
            <div className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">{speechError}</div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleTogglePlayPause}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-600 ${
            status === 'playing'
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-sky-600 hover:bg-sky-700 text-white'
          }`}
        >
          {status === 'playing' ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>Pausa</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>{status === 'paused' ? 'Riprendi' : 'Ascolta'}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handlePrev}
          disabled={!isPlayingOrPaused || activeIndex <= 0}
          aria-label="Sezione audio precedente"
          title="Sezione precedente (Alt + ←)"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!isPlayingOrPaused || activeIndex >= segments.length - 1}
          aria-label="Sezione audio successiva"
          title="Sezione successiva (Alt + →)"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {isPlayingOrPaused && (
          <button
            type="button"
            onClick={stopPlayback}
            aria-label="Ferma sintesi vocale"
            title="Ferma audio (Esc)"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        )}

        <div
          className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80"
          role="group"
          aria-label="Velocità lettura vocale"
        >
          {SPEED_OPTIONS.map((sp) => (
            <button
              key={sp}
              type="button"
              aria-pressed={rate === sp}
              onClick={() => handleRateChange(sp)}
              className={`px-2 py-1 text-[11px] font-mono tabular-nums rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                rate === sp
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900'
              }`}
            >
              {sp}×
            </button>
          ))}
        </div>

        {onAutoAdvanceStep && (
          <button
            type="button"
            aria-pressed={autoAdvance}
            onClick={() => setAutoAdvance((v) => !v)}
            title="Passa automaticamente allo step successivo al termine dell'ascolto"
            className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              autoAdvance
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Auto-avanza: {autoAdvance ? 'ON' : 'OFF'}
          </button>
        )}

        {voices.length > 1 && (
          <select
            aria-label="Voce sintesi vocale"
            value={selectedVoiceURI}
            onChange={(e) => handleVoiceChange(e.target.value)}
            className="max-w-[140px] truncate px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name.replace(/Google\s+/i, '').replace(/Microsoft\s+/i, '')}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};
