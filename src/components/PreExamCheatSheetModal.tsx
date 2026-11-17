import React from 'react';
import { Printer, X } from 'lucide-react';
import { LESSONS } from '../data/curriculum';
import { Q_CODES } from '../utils/morse';

interface PreExamCheatSheetModalProps {
  open: boolean;
  onClose: () => void;
}

const KEY_PREFIXES = [
  { sym: 'p', name: 'pico', factor: '10⁻¹²', example: '100 pF (condensatore RF)' },
  { sym: 'n', name: 'nano', factor: '10⁻⁹', example: '100 nF (disaccoppiamento)' },
  { sym: 'µ', name: 'micro', factor: '10⁻⁶', example: '47 µH / 10 µF' },
  { sym: 'm', name: 'milli', factor: '10⁻³', example: '500 mA = 0,5 A · 1 mW = 0 dBm' },
  { sym: 'k', name: 'chilo', factor: '10³', example: '7.100 kHz = 7,1 MHz' },
  { sym: 'M', name: 'Mega', factor: '10⁶', example: '145 MHz (banda 2 metri)' },
  { sym: 'G', name: 'Giga', factor: '10⁹', example: '2,4 GHz = 2.400 MHz' },
];

const DB_REFERENCE = [
  { db: '+3 dB', power: '× 2 (doppia)', voltage: '× 1,41' },
  { db: '+6 dB', power: '× 4', voltage: '× 2 (doppia)' },
  { db: '+10 dB', power: '× 10', voltage: '× 3,16' },
  { db: '+20 dB', power: '× 100', voltage: '× 10' },
  { db: '−3 dB', power: '÷ 2 (metà · taglio fc)', voltage: '× 0,707' },
  { db: '−6 dB', power: '÷ 4', voltage: '÷ 2 (metà)' },
];

const EXAM_BANDS = [
  { band: '80 m HF', range: '3,50 – 3,80 MHz', note: 'Regionale / NVIS notturno' },
  { band: '40 m HF', range: '7,00 – 7,20 MHz', note: 'Europa / Nazionale · λ ≈ 40 m' },
  { band: '20 m HF', range: '14,00 – 14,35 MHz', note: 'DX diurno intercontinentale' },
  { band: '15 m / 10 m HF', range: '21,00 / 28,00 MHz', note: 'DX solare · patente intera' },
  { band: '6 m / 2 m VHF', range: '50 / 144 – 146 MHz', note: 'Ripetitori locali, FM, APRS' },
  { band: '70 cm UHF', range: '430 – 440 MHz', note: 'Ponti urbani e portatili' },
];

export const PreExamCheatSheetModal: React.FC<PreExamCheatSheetModalProps> = ({
  open,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:static print:inset-auto print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-label="Scheda Lampo Pre-Esame stampabile"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl print:max-h-none print:border-0 print:shadow-none print:bg-white print:text-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50">
              Scheda Lampo Pre-Esame (Formule, Prefissi, dB e Bande)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Riepilogo compatto di 1–2 pagine pronto da stampare o salvare in PDF per il ripasso finale.
            </p>
          </div>
          <div className="flex items-center gap-2">
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
              aria-label="Chiudi scheda pre-esame"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs print:overflow-visible print:p-2">
          <div className="hidden print:block border-b border-slate-300 pb-2">
            <h1 className="text-lg font-bold text-slate-900">
              Radiotecnica easy — Scheda Lampo Pre-Esame
            </h1>
            <p className="text-[11px] text-slate-600">
              Riepilogo formule dei {LESSONS.length} moduli, prefissi SI, decibel, bande IARU e codici operativi.
            </p>
          </div>

          {/* 13 Formulas Grid */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
              1. Le {LESSONS.length} Formule Fondamentali
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {LESSONS.map((l) => (
                <div
                  key={l.id}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
                >
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    M{String(l.number).padStart(2, '0')} · {l.shortTitle}
                  </div>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {l.formula.expression}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                    {l.formula.plainReading}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SI Prefixes */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                2. Prefissi SI &amp; Scale di Conversione
              </h3>
              <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    <th className="p-1.5 text-left border-b border-slate-200 dark:border-slate-700">Pref.</th>
                    <th className="p-1.5 text-left border-b border-slate-200 dark:border-slate-700">Fattore</th>
                    <th className="p-1.5 text-left border-b border-slate-200 dark:border-slate-700">Esempio pratico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {KEY_PREFIXES.map((p) => (
                    <tr key={p.sym}>
                      <td className="p-1.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {p.sym} ({p.name})
                      </td>
                      <td className="p-1.5 font-mono text-sky-700 dark:text-sky-400">{p.factor}</td>
                      <td className="p-1.5 text-slate-600 dark:text-slate-300">{p.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* dB Reference */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                3. Scala Decibel (Potenza vs Tensione)
              </h3>
              <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    <th className="p-1.5 text-left border-b border-slate-200 dark:border-slate-700">dB</th>
                    <th className="p-1.5 text-left border-b border-slate-200 dark:border-slate-700">Potenza (10 log)</th>
                    <th className="p-1.5 text-left border-b border-slate-200 dark:border-slate-700">Tensione (20 log)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {DB_REFERENCE.map((row) => (
                    <tr key={row.db}>
                      <td className="p-1.5 font-mono font-bold text-slate-900 dark:text-slate-100">{row.db}</td>
                      <td className="p-1.5 font-mono text-emerald-700 dark:text-emerald-400">{row.power}</td>
                      <td className="p-1.5 font-mono text-slate-600 dark:text-slate-300">{row.voltage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Radio Bands */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                4. Principali Bande Radioamatoriali (IARU R1)
              </h3>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                {EXAM_BANDS.map((b) => (
                  <div key={b.band} className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{b.band}</span>
                    <span className="font-mono text-sky-700 dark:text-sky-400">{b.range}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-right">{b.note}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Q-Codes */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                5. Codici Q Essenziali
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {Q_CODES.slice(0, 8).map((q) => (
                  <div
                    key={q.code}
                    className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 text-[11px]"
                  >
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-400 mr-1.5">
                      {q.code}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">{q.statementMeaning}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
