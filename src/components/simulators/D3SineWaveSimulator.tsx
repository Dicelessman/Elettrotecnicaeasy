import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { LessonId } from '../../types/radiolab';
import { ReadoutCell, SimulatorShell } from './SimulatorShell';

interface D3SineWaveSimulatorProps {
  lessonContext?: LessonId;
  onChallengeComplete?: () => void;
}

interface WavePoint {
  tMs: number;
  voltage: number;
  shiftedVoltage: number;
}

const CONTEXT_CONFIG: Partial<
  Record<
    LessonId,
    {
      subtitle: string;
      defaultFreq: number;
      defaultAmp: number;
      defaultPhase: number;
    }
  >
> = {
  'lesson-03': {
    subtitle: 'Osserva come ampiezza (Vp) e frequenza (f) modellano la corrente alternata nel tempo.',
    defaultFreq: 100,
    defaultAmp: 12,
    defaultPhase: 0,
  },
  'lesson-04': {
    subtitle: 'Varia frequenza e ampiezza del segnale alternato che attraversa un condensatore.',
    defaultFreq: 150,
    defaultAmp: 14,
    defaultPhase: 90,
  },
  'lesson-07': {
    subtitle: 'Visualizza il segnale sinusoidale prima e dopo la trasformazione o sintonia RLC.',
    defaultFreq: 120,
    defaultAmp: 15,
    defaultPhase: 0,
  },
  'lesson-08': {
    subtitle: 'Esplora la forma d’onda del segnale elettrico prima di applicare filtri passa-basso o passa-alto.',
    defaultFreq: 200,
    defaultAmp: 10,
    defaultPhase: 0,
  },
  'lesson-09': {
    subtitle: 'Analizza l’onda sinusoidale AC in ingresso prima del raddrizzamento a diodi o amplificazione.',
    defaultFreq: 50,
    defaultAmp: 16,
    defaultPhase: 0,
  },
  'lesson-10': {
    subtitle: 'Sperimenta frequenza e ampiezza di un segnale vocale/portante sinusoidale puro.',
    defaultFreq: 250,
    defaultAmp: 12,
    defaultPhase: 0,
  },
};

const PRESETS = [
  { label: '50 Hz · Rete (1 ciclo)', freqHz: 50, ampV: 12 },
  { label: '100 Hz · Basso', freqHz: 100, ampV: 18 },
  { label: '250 Hz · Medio', freqHz: 250, ampV: 10 },
  { label: '400 Hz · Acuto', freqHz: 400, ampV: 20 },
];

const WINDOW_MS = 20; // 20 ms oscilloscope timebase: 50 Hz = 1 full cycle
const MAX_VOLT_AXIS = 25;

export const D3SineWaveSimulator: React.FC<D3SineWaveSimulatorProps> = ({
  lessonContext = 'lesson-03',
  onChallengeComplete,
}) => {
  const cfg = CONTEXT_CONFIG[lessonContext] ?? CONTEXT_CONFIG['lesson-03']!;

  const [amplitudeV, setAmplitudeV] = useState<number>(cfg.defaultAmp);
  const [frequencyHz, setFrequencyHz] = useState<number>(cfg.defaultFreq);
  const [phaseShiftDeg, setPhaseShiftDeg] = useState<number>(cfg.defaultPhase);
  const [dcOffsetV, setDcOffsetV] = useState<number>(0);
  const [showRms, setShowRms] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animPhaseRad, setAnimPhaseRad] = useState<number>(0);
  const [hoverPoint, setHoverPoint] = useState<{ tMs: number; voltage: number } | null>(null);

  const [explored, setExplored] = useState<{ amp: boolean; freq: boolean }>({
    amp: false,
    freq: false,
  });
  const [challengeDone, setChallengeDone] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Sync defaults if user switches between signal lessons
  useEffect(() => {
    const nextCfg = CONTEXT_CONFIG[lessonContext] ?? CONTEXT_CONFIG['lesson-03']!;
    setAmplitudeV(nextCfg.defaultAmp);
    setFrequencyHz(nextCfg.defaultFreq);
    setPhaseShiftDeg(nextCfg.defaultPhase);
    setDcOffsetV(0);
  }, [lessonContext]);

  useEffect(() => {
    if (explored.amp && explored.freq && !challengeDone) {
      setChallengeDone(true);
      onChallengeComplete?.();
    }
  }, [explored, challengeDone, onChallengeComplete]);

  useEffect(() => {
    if (!isPlaying) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    let lastTime = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      // Scale visual drift smoothly so higher frequencies also feel livelier without aliasing
      const speedRadPerSec = 1.6 + (frequencyHz / 400) * 3.2;
      setAnimPhaseRad((prev) => (prev + dt * speedRadPerSec) % (Math.PI * 2));
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, frequencyHz]);

  const samples = useMemo<WavePoint[]>(() => {
    const count = 240;
    const shiftRad = (phaseShiftDeg * Math.PI) / 180;
    const pts: WavePoint[] = [];
    for (let i = 0; i <= count; i += 1) {
      const tMs = (i / count) * WINDOW_MS;
      const tSec = tMs / 1000;
      const baseAngle = 2 * Math.PI * frequencyHz * tSec - animPhaseRad;
      pts.push({
        tMs,
        voltage: dcOffsetV + amplitudeV * Math.sin(baseAngle),
        shiftedVoltage: dcOffsetV + amplitudeV * Math.sin(baseAngle + shiftRad),
      });
    }
    return pts;
  }, [amplitudeV, frequencyHz, phaseShiftDeg, dcOffsetV, animPhaseRad]);

  const periodMs = 1000 / Math.max(1, frequencyHz);
  const cyclesInWindow = WINDOW_MS / periodMs;
  const vEff = amplitudeV / Math.SQRT2;
  const vpp = amplitudeV * 2;

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = 640;
    const height = 270;
    const margin = { top: 28, right: 20, bottom: 36, left: 48 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([0, WINDOW_MS]).range([0, innerWidth]);
    const yScale = d3
      .scaleLinear()
      .domain([-MAX_VOLT_AXIS, MAX_VOLT_AXIS])
      .range([innerHeight, 0]);

    // Graticule grid via D3 axes
    const xGrid = d3
      .axisBottom(xScale)
      .ticks(10)
      .tickSize(-innerHeight)
      .tickFormat(() => '');
    const yGrid = d3
      .axisLeft(yScale)
      .ticks(8)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xGrid)
      .call((sel) => sel.select('.domain').remove())
      .call((sel) =>
        sel
          .selectAll('line')
          .attr('stroke', 'currentColor')
          .attr('stroke-opacity', 0.09)
          .attr('stroke-dasharray', '2,2')
      );

    g.append('g')
      .call(yGrid)
      .call((sel) => sel.select('.domain').remove())
      .call((sel) =>
        sel
          .selectAll('line')
          .attr('stroke', 'currentColor')
          .attr('stroke-opacity', 0.09)
          .attr('stroke-dasharray', '2,2')
      );

    // 0 V baseline
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.35)
      .attr('stroke-width', 1.2);

    // Subtle shaded area under main sine wave around 0V (or dcOffsetV)
    const zeroClamped = Math.max(-MAX_VOLT_AXIS, Math.min(MAX_VOLT_AXIS, dcOffsetV));
    const areaGen = d3
      .area<WavePoint>()
      .x((d) => xScale(d.tMs))
      .y0(yScale(zeroClamped))
      .y1((d) => yScale(Math.max(-MAX_VOLT_AXIS, Math.min(MAX_VOLT_AXIS, d.voltage))))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(samples)
      .attr('d', areaGen)
      .attr('fill', '#0284c7')
      .attr('fill-opacity', 0.12);

    // Optional RMS (Veff) horizontal reference line
    if (showRms) {
      const rmsYVal = Math.min(MAX_VOLT_AXIS, dcOffsetV + vEff);
      const rmsY = yScale(rmsYVal);
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', rmsY)
        .attr('y2', rmsY)
        .attr('stroke', '#059669')
        .attr('stroke-width', 1.3)
        .attr('stroke-dasharray', '5,4');

      g.append('text')
        .attr('x', innerWidth - 4)
        .attr('y', Math.max(12, rmsY - 5))
        .attr('text-anchor', 'end')
        .attr('fill', '#059669')
        .style('font-family', 'IBM Plex Mono, monospace')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .text(`Veff = ${(dcOffsetV + vEff).toFixed(1)} V`);
    }

    // Peak amplitude reference guide (+Vp)
    const peakYVal = Math.min(MAX_VOLT_AXIS, dcOffsetV + amplitudeV);
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(peakYVal))
      .attr('y2', yScale(peakYVal))
      .attr('stroke', '#0284c7')
      .attr('stroke-opacity', 0.35)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Optional comparison wave shifted by phaseShiftDeg
    if (phaseShiftDeg !== 0) {
      const shiftedLineGen = d3
        .line<WavePoint>()
        .x((d) => xScale(d.tMs))
        .y((d) => yScale(Math.max(-MAX_VOLT_AXIS, Math.min(MAX_VOLT_AXIS, d.shiftedVoltage))))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(samples)
        .attr('d', shiftedLineGen)
        .attr('fill', 'none')
        .attr('stroke', '#d97706')
        .attr('stroke-width', 1.8)
        .attr('stroke-dasharray', '6,4');
    }

    // Primary D3 sine wave path
    const lineGen = d3
      .line<WavePoint>()
      .x((d) => xScale(d.tMs))
      .y((d) => yScale(Math.max(-MAX_VOLT_AXIS, Math.min(MAX_VOLT_AXIS, d.voltage))))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(samples)
      .attr('d', lineGen)
      .attr('fill', 'none')
      .attr('stroke', '#0284c7')
      .attr('stroke-width', 2.6);

    // Period T bracket marker on top when <= window
    if (periodMs <= WINDOW_MS) {
      const tEndX = xScale(periodMs);
      g.append('line')
        .attr('x1', 0)
        .attr('x2', tEndX)
        .attr('y1', -12)
        .attr('y2', -12)
        .attr('stroke', '#0284c7')
        .attr('stroke-width', 1.5);
      g.append('line')
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('y1', -16)
        .attr('y2', -8)
        .attr('stroke', '#0284c7')
        .attr('stroke-width', 1.5);
      g.append('line')
        .attr('x1', tEndX)
        .attr('x2', tEndX)
        .attr('y1', -16)
        .attr('y2', -8)
        .attr('stroke', '#0284c7')
        .attr('stroke-width', 1.5);
      g.append('text')
        .attr('x', Math.max(36, tEndX / 2))
        .attr('y', -17)
        .attr('text-anchor', 'middle')
        .attr('fill', '#0284c7')
        .style('font-family', 'IBM Plex Mono, monospace')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .text(`T = ${periodMs.toFixed(1)} ms`);
    }

    // D3 X and Y Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(5)
      .tickFormat((d) => `${Number(d)} ms`);
    const yAxis = d3
      .axisLeft(yScale)
      .tickValues([-20, -10, 0, 10, 20])
      .tickFormat((d) => `${Number(d)} V`);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((sel) => sel.select('.domain').attr('stroke', 'currentColor').attr('stroke-opacity', 0.35))
      .call((sel) => sel.selectAll('line').attr('stroke', 'currentColor').attr('stroke-opacity', 0.35))
      .call((sel) =>
        sel
          .selectAll('text')
          .attr('fill', 'currentColor')
          .attr('opacity', 0.75)
          .style('font-family', 'IBM Plex Mono, monospace')
          .style('font-size', '10px')
      );

    g.append('g')
      .call(yAxis)
      .call((sel) => sel.select('.domain').attr('stroke', 'currentColor').attr('stroke-opacity', 0.35))
      .call((sel) => sel.selectAll('line').attr('stroke', 'currentColor').attr('stroke-opacity', 0.35))
      .call((sel) =>
        sel
          .selectAll('text')
          .attr('fill', 'currentColor')
          .attr('opacity', 0.75)
          .style('font-family', 'IBM Plex Mono, monospace')
          .style('font-size', '10px')
      );

    // Interactive D3 Hover Crosshair (via bisect + overlay rect)
    if (hoverPoint) {
      const hx = xScale(hoverPoint.tMs);
      const clampedV = Math.max(-MAX_VOLT_AXIS, Math.min(MAX_VOLT_AXIS, hoverPoint.voltage));
      const hy = yScale(clampedV);

      g.append('line')
        .attr('x1', hx)
        .attr('x2', hx)
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', 'currentColor')
        .attr('stroke-opacity', 0.35)
        .attr('stroke-dasharray', '3,3');

      g.append('circle')
        .attr('cx', hx)
        .attr('cy', hy)
        .attr('r', 5)
        .attr('fill', '#0284c7')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2);

      const labelText = `t = ${hoverPoint.tMs.toFixed(1)} ms · ${hoverPoint.voltage >= 0 ? '+' : ''}${hoverPoint.voltage.toFixed(1)} V`;
      const anchorRight = hx > innerWidth * 0.65;
      const tx = anchorRight ? hx - 10 : hx + 10;
      const ty = Math.max(16, Math.min(innerHeight - 10, hy - 10));

      g.append('text')
        .attr('x', tx)
        .attr('y', ty)
        .attr('text-anchor', anchorRight ? 'end' : 'start')
        .attr('fill', 'currentColor')
        .style('font-family', 'IBM Plex Mono, monospace')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .text(labelText);
    }

    const bisect = d3.bisector<WavePoint, number>((d) => d.tMs).left;

    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove touchmove', (event: MouseEvent | TouchEvent) => {
        const [px] = d3.pointer(event);
        const tTarget = Math.max(0, Math.min(WINDOW_MS, xScale.invert(px)));
        const idx = Math.min(samples.length - 1, Math.max(0, bisect(samples, tTarget)));
        const pt = samples[idx];
        if (pt) {
          setHoverPoint({ tMs: pt.tMs, voltage: pt.voltage });
        }
      })
      .on('mouseleave', () => setHoverPoint(null));
  }, [samples, amplitudeV, frequencyHz, phaseShiftDeg, dcOffsetV, showRms, periodMs, vEff, hoverPoint]);

  return (
    <SimulatorShell
      title="Generatore e Oscilloscopio Onda Sinusoidale (D3.js)"
      challengeText="Modifica sia lo slider dell’Ampiezza che quello della Frequenza per osservare altezza e periodo dell’onda"
      challengeDone={challengeDone}
      isPlaying={isPlaying}
      onTogglePlay={() => setIsPlaying((p) => !p)}
      onReset={() => {
        setAmplitudeV(cfg.defaultAmp);
        setFrequencyHz(cfg.defaultFreq);
        setPhaseShiftDeg(cfg.defaultPhase);
        setDcOffsetV(0);
        setShowRms(true);
        setIsPlaying(true);
      }}
      stage={
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span>{cfg.subtitle}</span>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Passa il cursore sull’onda per leggere V(t)
            </span>
          </div>
          <svg
            ref={svgRef}
            viewBox="0 0 640 270"
            className="w-full h-64 sm:h-72 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 select-none"
            role="img"
            aria-label="Oscilloscopio interattivo D3.js dell'onda sinusoidale"
          />
        </div>
      }
      readouts={
        <>
          <ReadoutCell
            label="Ampiezza (Vp / Vpp)"
            value={`${amplitudeV.toFixed(1)} V / ${vpp.toFixed(0)} V`}
            sublabel="Altezza cresta"
            tone="azure"
          />
          <ReadoutCell
            label="Valore Efficace (Veff)"
            value={`${vEff.toFixed(1)} V`}
            sublabel="0,707 × Vp"
            tone="emerald"
          />
          <ReadoutCell
            label="Frequenza (f)"
            value={`${frequencyHz} Hz`}
            sublabel={`${cyclesInWindow.toFixed(1)} cicli in 20 ms`}
            tone="azure"
          />
          <ReadoutCell
            label="Periodo (T = 1/f)"
            value={`${periodMs.toFixed(2)} ms`}
            sublabel="Durata 1 ciclo completo"
          />
        </>
      }
      controls={
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Segnali pronti
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((p) => {
                const active = frequencyHz === p.freqHz && amplitudeV === p.ampV;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setFrequencyHz(p.freqHz);
                      setAmplitudeV(p.ampV);
                      setExplored({ amp: true, freq: true });
                    }}
                    className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg border cursor-pointer transition-colors text-left ${
                      active
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="d3-amp">Ampiezza di Picco (Vp)</label>
              <span className="font-mono tabular-nums text-sky-700 dark:text-sky-400 font-semibold">
                {amplitudeV.toFixed(1)} V
              </span>
            </div>
            <input
              id="d3-amp"
              type="range"
              min={1}
              max={24}
              step={0.5}
              value={amplitudeV}
              onChange={(e) => {
                setAmplitudeV(Number(e.target.value));
                setExplored((prev) => ({ ...prev, amp: true }));
              }}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="d3-freq">Frequenza (f)</label>
              <span className="font-mono tabular-nums text-sky-700 dark:text-sky-400 font-semibold">
                {frequencyHz} Hz
              </span>
            </div>
            <input
              id="d3-freq"
              type="range"
              min={25}
              max={450}
              step={5}
              value={frequencyHz}
              onChange={(e) => {
                setFrequencyHz(Number(e.target.value));
                setExplored((prev) => ({ ...prev, freq: true }));
              }}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="d3-phase">Onda di confronto sfasata (φ)</label>
              <span className="font-mono tabular-nums text-amber-700 dark:text-amber-400">
                {phaseShiftDeg}°
              </span>
            </div>
            <input
              id="d3-phase"
              type="range"
              min={0}
              max={180}
              step={15}
              value={phaseShiftDeg}
              onChange={(e) => setPhaseShiftDeg(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="d3-dc">Offset DC (componente continua)</label>
              <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {dcOffsetV > 0 ? `+${dcOffsetV} V` : `${dcOffsetV} V`}
              </span>
            </div>
            <input
              id="d3-dc"
              type="range"
              min={-8}
              max={8}
              step={1}
              value={dcOffsetV}
              onChange={(e) => setDcOffsetV(Number(e.target.value))}
              className="w-full accent-slate-600 cursor-pointer"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={showRms}
              onChange={(e) => setShowRms(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 cursor-pointer"
            />
            <span>Mostra linea Valore Efficace (Veff)</span>
          </label>
        </div>
      }
    />
  );
};
