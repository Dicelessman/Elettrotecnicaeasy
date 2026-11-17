import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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

interface LessonAudioBarProps {
  segments: SpeechSegment[];
  activeSegmentId: string | null;
  onActiveSegmentChange: (id: string | null) => void;
  playRequest?: { segmentId: string; nonce: number } | null;
}

const SPEED_OPTIONS = [0.85, 1, 1.15, 1.3] as const;

export const LessonAudioBar: React.FC<LessonAudioBarProps> = ({
  segments,
  activeSegmentId,
  onActiveSegmentChange,
  playRequest,
}) => {
  const supported = isSpeechSynthesisSupported();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [rate, setRate] = useState<number>(1);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [speechError, setSpeechError] = useState<string | null>(null);

  const runTokenRef = useRef(0);
  const currentIdxRef = useRef(0);
  const statusRef = useRef<'idle' | 'playing' | 'paused'>('idle');
  const rateRef = useRef(rate);
  const voiceUriRef = useRef(selectedVoiceURI);
  const voicesRef = useRef<SpeechSynthesisVoice[]>(voices);

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
    if (supported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
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

  const speakFromIndex = useCallback(
    (startIdx: number) => {
      if (!supported || segments.length === 0) return;
      const clampedIdx = Math.max(0, Math.min(segments.length - 1, startIdx));

      runTokenRef.current += 1;
      const myToken = runTokenRef.current;
      setSpeechError(null);

      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }

      const playSegmentAt = (segIdx: number) => {
        if (runTokenRef.current !== myToken) return;
        if (segIdx >= segments.length) {
          setStatus('idle');
          onActiveSegmentChange(null);
          return;
        }

        const seg = segments[segIdx];
        currentIdxRef.current = segIdx;
        onActiveSegmentChange(seg.id);
        setStatus('playing');

        const chunks = splitIntoSpeechChunks(seg.text);
        if (chunks.length === 0) {
          playSegmentAt(segIdx + 1);
          return;
        }

        const chosenVoice =
          voicesRef.current.find((v) => v.voiceURI === voiceUriRef.current) ??
          voicesRef.current[0] ??
          null;

        const playChunkAt = (chunkIdx: number) => {
          if (runTokenRef.current !== myToken) return;
          if (chunkIdx >= chunks.length) {
            playSegmentAt(segIdx + 1);
            return;
          }

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

        playChunkAt(0);
      };

      playSegmentAt(clampedIdx);
    },
    [supported, segments, onActiveSegmentChange]
  );

  const lastHandledNonceRef = useRef<number | null>(null);

  // Trigger playback directly when user clicks an inline "Ascolta" button (e.g. on CircuitDiagram)
  useEffect(() => {
    if (!playRequest || segments.length === 0) return;
    if (lastHandledNonceRef.current === playRequest.nonce) return;
    const idx = segments.findIndex((s) => s.id === playRequest.segmentId);
    if (idx === -1) return;
    lastHandledNonceRef.current = playRequest.nonce;
    speakFromIndex(idx);
  }, [playRequest, segments, speakFromIndex]);

  const handleTogglePlayPause = () => {
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
      try {
        window.speechSynthesis.resume();
        setStatus('playing');
      } catch {
        speakFromIndex(currentIdxRef.current);
      }
      return;
    }

    speakFromIndex(0);
  };

  const handlePrev = () => {
    const target = Math.max(0, currentIdxRef.current - 1);
    speakFromIndex(target);
  };

  const handleNext = () => {
    const target = Math.min(segments.length - 1, currentIdxRef.current + 1);
    speakFromIndex(target);
  };

  const handleRateChange = (nextRate: number) => {
    setRate(nextRate);
    rateRef.current = nextRate;
    if (statusRef.current === 'playing') {
      speakFromIndex(currentIdxRef.current);
    }
  };

  const handleVoiceChange = (uri: string) => {
    setSelectedVoiceURI(uri);
    voiceUriRef.current = uri;
    if (statusRef.current === 'playing') {
      speakFromIndex(currentIdxRef.current);
    }
  };

  if (!supported) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
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

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-700 dark:text-sky-400 shrink-0">
          <Volume2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            {activeSegment
              ? `In ascolto: ${activeSegment.label}`
              : 'Ascolta la lezione (Sintesi vocale)'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
            {activeSegment
              ? `Sezione ${activeIndex + 1} di ${segments.length} · Segui i diagrammi evidenziati`
              : `${segments.length} sezioni audio pronte per questo passo`}
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
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
          disabled={status === 'idle' || activeIndex <= 0}
          aria-label="Sezione audio precedente"
          title="Sezione precedente"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={status === 'idle' || activeIndex >= segments.length - 1}
          aria-label="Sezione audio successiva"
          title="Sezione successiva"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {status !== 'idle' && (
          <button
            type="button"
            onClick={stopPlayback}
            aria-label="Ferma sintesi vocale"
            title="Ferma audio"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        )}

        <div
          className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          role="group"
          aria-label="Velocità lettura vocale"
        >
          {SPEED_OPTIONS.map((sp) => (
            <button
              key={sp}
              type="button"
              onClick={() => handleRateChange(sp)}
              className={`px-2 py-1 text-[11px] font-mono tabular-nums rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                rate === sp
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {sp}×
            </button>
          ))}
        </div>

        {voices.length > 1 && (
          <select
            aria-label="Voce sintesi vocale"
            value={selectedVoiceURI}
            onChange={(e) => handleVoiceChange(e.target.value)}
            className="max-w-[150px] truncate px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer"
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
