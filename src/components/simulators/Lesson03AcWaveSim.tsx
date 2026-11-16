import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ReadoutCell, SimulatorShell } from './SimulatorShell';

interface Props {
  onChallengeComplete?: () => void;
}

interface AcPoint {
  xNorm: number;
  v: number;
  vShifted: number;
}

const PRESETS = [
  { label: '50 Hz (Rete casa)', freqMhz: 0.00005, vp: 325 },
  { label: '7,05 MHz (Banda 40m)', freqMhz: 7.05, vp: 140 },
  { label: '145 MHz (VHF 2m)', freqMhz: 145, vp: 80 },
];

export const Lesson03AcWaveSim: React.FC<Props> = ({ onChallengeComplete }) => {
  const [freqMhz, setFreqMhz] = useState<number>(7.05);
  const [vp, setVp] = useState<number>(180);
  const [phaseShiftDeg, setPhaseShiftDeg] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [angle, setAngle] = useState(0.7);
  const [hoverPoint, setHoverPoint] = useState<{ xNorm: number; v: number } | null>(null);
  const [challengeDone, setChallengeDone] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (Math.abs(freqMhz - 7.05) < 0.25 && !challengeDone) {
      setChallengeDone(true);
      onChallengeComplete?.();
    }
  }, [freqMhz, challengeDone, onChallengeComplete]);

  useEffect(() => {
    if (!isPlaying) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const angularSpeed = freqMhz < 0.01 ? 1.8 : 1.8 + Math.log10(Math.max(1, freqMhz)) * 0.9;
      setAngle((prev) => (prev + dt * angularSpeed) % (Math.PI * 2));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, freqMhz]);

  const vEff = vp / Math.SQRT2;
  const vpp = vp * 2;
  const wavelengthM = 300 / Math.max(0.00001, freqMhz);
  const periodLabel =
    freqMhz < 0.001
      ? `${(1000 / (freqMhz * 1e6)).toFixed(1)} ms`
      : freqMhz < 10
        ? `${(1000 / freqMhz).toFixed(0)} ns`
        : `${(1000 / freqMhz).toFixed(2)} ns`;

  // Map frequency smoothly to visual cycles so the frequency slider visibly compresses/stretches the wave
  const visualCycles =
    freqMhz < 0.01
      ? 1.0
      : 1.2 + (Math.log10(Math.max(1, freqMhz)) / Math.log10(150)) * 4.3;

  const waveData = useMemo<AcPoint[]>(() => {
    const shiftRad = (phaseShiftDeg * Math.PI) / 180;
    const pts: AcPoint[] = [];
    const total = 200;
    for (let i = 0; i <= total; i += 1) {
      const t = i / total;
      const theta = angle + t * Math.PI * 2 * visualCycles;
      pts.push({
        xNorm: t,
        v: vp * Math.sin(theta),
        vShifted: vp * Math.sin(theta + shiftRad),
      });
    }
    return pts;
  }, [angle, vp, phaseShiftDeg, visualCycles]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = 620;
    const height = 250;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    // Left Zone: Rotating Phasor Circle
    const cx = 86;
    const cy = 128;
    const maxRadius = 62;
    const radius = Math.max(8, (vp / 325) * maxRadius);
    const px = cx + radius * Math.cos(angle);
    const py = cy - radius * Math.sin(angle);

    // Right Zone: D3 Calibrated Oscilloscope
    const waveLeft = 204;
    const waveRight = width - 18;
    const waveTop = 34;
    const waveBottom = height - 34;

    const xScale = d3.scaleLinear().domain([0, 1]).range([waveLeft, waveRight]);
    const yScale = d3.scaleLinear().domain([-350, 350]).range([waveBottom, waveTop]);

    const waveStartValY = yScale(vp * Math.sin(angle));

    // Grid inside oscilloscope via D3
    const oscGroup = svg.append('g');
    const xTicks = d3.ticks(0, 1, 6);
    const yTicks = [-300, -150, 0, 150, 300];

    oscGroup
      .selectAll('.x-grid')
      .data(xTicks)
      .enter()
      .append('line')
      .attr('x1', (d) => xScale(d))
      .attr('x2', (d) => xScale(d))
      .attr('y1', waveTop)
      .attr('y2', waveBottom)
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.09)
      .attr('stroke-dasharray', '2,2');

    oscGroup
      .selectAll('.y-grid')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', waveLeft)
      .attr('x2', waveRight)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', (d) => (d === 0 ? 0.35 : 0.09))
      .attr('stroke-dasharray', (d) => (d === 0 ? null : '2,2'));

    // Rotating vector geometry
    svg
      .append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.25)
      .attr('stroke-width', 1.5);

    svg
      .append('line')
      .attr('x1', cx)
      .attr('y1', cy)
      .attr('x2', px)
      .attr('y2', py)
      .attr('stroke', '#0284c7')
      .attr('stroke-width', 2.5);

    svg
      .append('circle')
      .attr('cx', px)
      .attr('cy', py)
      .attr('r', 4.5)
      .attr('fill', '#0284c7');

    // Sync projection line from phasor tip to oscilloscope origin
    svg
      .append('line')
      .attr('x1', px)
      .attr('y1', py)
      .attr('x2', waveLeft)
      .attr('y2', waveStartValY)
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.35)
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-width', 1.1);

    // D3 Area fill
    const areaGen = d3
      .area<AcPoint>()
      .x((d) => xScale(d.xNorm))
      .y0(yScale(0))
      .y1((d) => yScale(d.v))
      .curve(d3.curveMonotoneX);

    svg
      .append('path')
      .datum(waveData)
      .attr('d', areaGen)
      .attr('fill', '#0284c7')
      .attr('fill-opacity', 0.12);

    // Veff (RMS) dashed line
    const yRms = yScale(vEff);
    svg
      .append('line')
      .attr('x1', waveLeft)
      .attr('x2', waveRight)
      .attr('y1', yRms)
      .attr('y2', yRms)
      .attr('stroke', '#059669')
      .attr('stroke-dasharray', '4,4')
      .attr('stroke-width', 1.3);

    svg
      .append('text')
      .attr('x', waveRight - 4)
      .attr('y', yRms - 5)
      .attr('text-anchor', 'end')
      .attr('fill', '#059669')
      .style('font-family', 'IBM Plex Mono, monospace')
      .style('font-size', '10px')
      .style('font-weight', '600')
      .text(`Veff (${vEff.toFixed(0)} V)`);

    // Shifted comparison curve
    if (phaseShiftDeg !== 0) {
      const shiftedLine = d3
        .line<AcPoint>()
        .x((d) => xScale(d.xNorm))
        .y((d) => yScale(d.vShifted))
        .curve(d3.curveMonotoneX);

      svg
        .append('path')
        .datum(waveData)
        .attr('d', shiftedLine)
        .attr('fill', 'none')
        .attr('stroke', '#d97706')
        .attr('stroke-width', 1.8)
        .attr('stroke-dasharray', '5,3');
    }

    // Main D3 sine curve
    const mainLine = d3
      .line<AcPoint>()
      .x((d) => xScale(d.xNorm))
      .y((d) => yScale(d.v))
      .curve(d3.curveMonotoneX);

    svg
      .append('path')
      .datum(waveData)
      .attr('d', mainLine)
      .attr('fill', 'none')
      .attr('stroke', '#0284c7')
      .attr('stroke-width', 2.6);

    // D3 Y & X Axes for oscilloscope
    const yAxis = d3
      .axisLeft(yScale)
      .tickValues([-300, -150, 0, 150, 300])
      .tickFormat((d) => `${Number(d)}V`);

    svg
      .append('g')
      .attr('transform', `translate(${waveLeft},0)`)
      .call(yAxis)
      .call((sel) => sel.select('.domain').attr('stroke', 'currentColor').attr('stroke-opacity', 0.35))
      .call((sel) => sel.selectAll('line').attr('stroke', 'currentColor').attr('stroke-opacity', 0.35))
      .call((sel) =>
        sel
          .selectAll('text')
          .attr('fill', 'currentColor')
          .attr('opacity', 0.72)
          .style('font-family', 'IBM Plex Mono, monospace')
          .style('font-size', '9.5px')
      );

    const xAxis = d3
      .axisBottom(xScale)
      .ticks(4)
      .tickFormat((d) => {
        const val = Number(d);
        if (val === 0) return '0';
        const totalCyclesLabel = (val * visualCycles).toFixed(1);
        return `${totalCyclesLabel} T`;
      });

    svg
      .append('g')
      .attr('transform', `translate(0,${waveBottom})`)
      .call(xAxis)
      .call((sel) => sel.select('.domain').attr('stroke', 'currentColor').attr('stroke-opacity', 0.35))
      .call((sel) => sel.selectAll('line').attr('stroke', 'currentColor').attr('stroke-opacity', 0.35))
      .call((sel) =>
        sel
          .selectAll('text')
          .attr('fill', 'currentColor')
          .attr('opacity', 0.72)
          .style('font-family', 'IBM Plex Mono, monospace')
          .style('font-size', '9.5px')
      );

    // Titles
    svg
      .append('text')
      .attr('x', cx)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', 'currentColor')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .text('Vettore Rotante');

    svg
      .append('text')
      .attr('x', (waveLeft + waveRight) / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', 'currentColor')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .text(
        `Oscilloscopio D3 · ${freqMhz < 0.01 ? '50 Hz' : `${freqMhz.toFixed(2)} MHz`} (${visualCycles.toFixed(1)} cicli)`
      );

    // Hover crosshair
    if (hoverPoint) {
      const hx = xScale(hoverPoint.xNorm);
      const hy = yScale(hoverPoint.v);

      svg
        .append('line')
        .attr('x1', hx)
        .attr('x2', hx)
        .attr('y1', waveTop)
        .attr('y2', waveBottom)
        .attr('stroke', 'currentColor')
        .attr('stroke-opacity', 0.35)
        .attr('stroke-dasharray', '3,3');

      svg
        .append('circle')
        .attr('cx', hx)
        .attr('cy', hy)
        .attr('r', 4.5)
        .attr('fill', '#0284c7')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.8);

      const anchorEnd = hx > waveLeft + (waveRight - waveLeft) * 0.68;
      svg
        .append('text')
        .attr('x', anchorEnd ? hx - 8 : hx + 8)
        .attr('y', Math.max(waveTop + 14, hy - 8))
        .attr('text-anchor', anchorEnd ? 'end' : 'start')
        .attr('fill', 'currentColor')
        .style('font-family', 'IBM Plex Mono, monospace')
        .style('font-size', '10.5px')
        .style('font-weight', '600')
        .text(`${hoverPoint.v >= 0 ? '+' : ''}${hoverPoint.v.toFixed(0)} V`);
    }

    const bisect = d3.bisector<AcPoint, number>((d) => d.xNorm).left;

    svg
      .append('rect')
      .attr('x', waveLeft)
      .attr('y', waveTop)
      .attr('width', waveRight - waveLeft)
      .attr('height', waveBottom - waveTop)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove touchmove', (event: MouseEvent | TouchEvent) => {
        const [pxCoord] = d3.pointer(event);
        const xNorm = Math.max(0, Math.min(1, xScale.invert(pxCoord)));
        const idx = Math.min(waveData.length - 1, Math.max(0, bisect(waveData, xNorm)));
        const pt = waveData[idx];
        if (pt) setHoverPoint({ xNorm: pt.xNorm, v: pt.v });
      })
      .on('mouseleave', () => setHoverPoint(null));
  }, [waveData, vp, angle, vEff, phaseShiftDeg, freqMhz, visualCycles, hoverPoint]);

  return (
    <SimulatorShell
      title="Oscilloscopio D3.js AC, Cerchio Rotante e Lunghezza d’Onda"
      challengeText="Seleziona o imposta la banda dei 40 metri (7,05 MHz) e regola ampiezza e frequenza per osservare l’onda sinusoidale"
      challengeDone={challengeDone}
      isPlaying={isPlaying}
      onTogglePlay={() => setIsPlaying((p) => !p)}
      onReset={() => {
        setFreqMhz(7.05);
        setVp(180);
        setPhaseShiftDeg(0);
        setIsPlaying(true);
      }}
      stage={
        <svg
          ref={svgRef}
          viewBox="0 0 620 250"
          className="w-full h-60 sm:h-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 select-none"
          role="img"
          aria-label="Cerchio rotante collegato all'oscilloscopio D3.js dell'onda sinusoidale AC"
        />
      }
      readouts={
        <>
          <ReadoutCell label="Picco / Picco-Picco" value={`${vp} V / ${vpp} V`} tone="azure" />
          <ReadoutCell label="Valore Efficace (Veff)" value={`${vEff.toFixed(1)} V`} sublabel="Vp × 0,707" tone="emerald" />
          <ReadoutCell label="Periodo T" value={periodLabel} sublabel="Durata 1 ciclo" />
          <ReadoutCell
            label="Lunghezza d’onda λ"
            value={wavelengthM > 1000 ? `${(wavelengthM / 1000).toFixed(0)} km` : `${wavelengthM.toFixed(2)} m`}
            sublabel="λ = 300 / f(MHz)"
            tone="azure"
          />
        </>
      }
      controls={
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Bande pronte
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setFreqMhz(p.freqMhz);
                    setVp(p.vp);
                  }}
                  className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg border cursor-pointer transition-colors ${
                    Math.abs(freqMhz - p.freqMhz) < 0.01
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-900 dark:text-sky-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l3-freq">Frequenza segnale (MHz)</label>
              <span className="font-mono tabular-nums text-sky-700 dark:text-sky-400">
                {freqMhz < 0.01 ? '50 Hz' : `${freqMhz.toFixed(2)} MHz`}
              </span>
            </div>
            <input
              id="l3-freq"
              type="range"
              min={1}
              max={150}
              step={0.05}
              value={Math.max(1, freqMhz)}
              onChange={(e) => setFreqMhz(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l3-vp">Ampiezza di Picco (Vp)</label>
              <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">{vp} V</span>
            </div>
            <input
              id="l3-vp"
              type="range"
              min={40}
              max={325}
              step={5}
              value={vp}
              onChange={(e) => setVp(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              <label htmlFor="l3-phase">Confronta onda sfasata</label>
              <span className="font-mono tabular-nums text-amber-700 dark:text-amber-400">
                {phaseShiftDeg}°
              </span>
            </div>
            <input
              id="l3-phase"
              type="range"
              min={0}
              max={180}
              step={30}
              value={phaseShiftDeg}
              onChange={(e) => setPhaseShiftDeg(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>
        </div>
      }
    />
  );
};
