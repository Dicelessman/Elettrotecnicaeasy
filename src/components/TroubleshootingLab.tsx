import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { triggerGamificationFeedback } from '../utils/feedbackAudio';

interface TestPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  instrument: string;
  reading: string;
  status: 'nominal' | 'warning' | 'fault';
  clue: string;
}

interface FaultScenario {
  id: string;
  title: string;
  symptom: string;
  instrumentMode: string;
  blocks: { label: string; x: number; y: number; w: number; h: number }[];
  testPoints: TestPoint[];
  question: string;
  options: string[];
  correctIndex: number;
  solution: string;
}

const SCENARIOS: FaultScenario[] = [
  {
    id: 'swr-rain',
    title: 'ROS a 4,2:1 sui 40m dopo un temporale',
    symptom:
      'La stazione HF trasmetteva con ROS 1,2:1 ieri, ma oggi dopo la pioggia il trasmettitore riduce potenza e segnala ROS 4,2:1.',
    instrumentMode: 'Rosmetro / Analizzatore d’Antenna (7,1 MHz)',
    blocks: [
      { label: 'Radio TX (50 Ω)', x: 26, y: 76, w: 108, h: 52 },
      { label: 'Cavo RG-213 (20 m)', x: 186, y: 76, w: 132, h: 52 },
      { label: 'Connettore PL-219 / Balun', x: 370, y: 76, w: 152, h: 52 },
    ],
    testPoints: [
      {
        id: 'tp1',
        label: 'TP1 · Uscita TX su carico fittizio 50 Ω',
        x: 152,
        y: 102,
        instrument: 'Rosmetro TX',
        reading: 'SWR 1,05 : 1 · P = 50 W',
        status: 'nominal',
        clue: 'Il trasmettitore eroga 50 W puliti e stabili sul carico fittizio: lo stadio finale è sano.',
      },
      {
        id: 'tp2',
        label: 'TP2 · Continuità DC calza ↔ anima cavo',
        x: 334,
        y: 102,
        instrument: 'Multimetro (Ω)',
        reading: '14 Ω (anomalo!)',
        status: 'fault',
        clue: 'Un cavo coassiale aperto verso un dipolo isolato non deve segnare 14 Ω tra anima e calza: c’è acqua/ossido conduttivo nel connettore!',
      },
      {
        id: 'tp3',
        label: 'TP3 · Bracci dipolo (misura diretta)',
        x: 446,
        y: 162,
        instrument: 'Analizzatore diretto',
        reading: 'Z = 52 Ω · SWR 1,1:1',
        status: 'nominal',
        clue: 'I due bracci del dipolo scollegati dal cavo sono intatti e risuonano bene a 7,1 MHz.',
      },
    ],
    question: 'Qual è la causa reale del ROS alto rilevata con le misure?',
    options: [
      'Infiltrazione d’acqua nel connettore PL-219 / giunzione cavo (corto parziale tra anima e calza)',
      'Lo stadio finale del trasmettitore si è bruciato',
      'I bracci del dipolo si sono allungati con il vento',
    ],
    correctIndex: 0,
    solution:
      'Il carico fittizio su TP1 conferma TX sano; la bassa resistenza DC (14 Ω) su TP2 rivela acqua/ossido dentro il PL-219 che crea una dispersione parallela sul cavo.',
  },
  {
    id: 'psu-zero',
    title: 'Alimentatore lineare 13,8 V eroga 0 V DC',
    symptom:
      'Accendendo l’alimentatore di stazione la spia di rete si accende, ma la radio non riceve i 13,8 V.',
    instrumentMode: 'Multimetro Digitale (AC / DC)',
    blocks: [
      { label: 'Trasformatore 230→15 V AC', x: 26, y: 76, w: 146, h: 52 },
      { label: 'Ponte di Graetz (4 Diodi)', x: 204, y: 76, w: 148, h: 52 },
      { label: 'Condensatore + Uscita DC', x: 384, y: 76, w: 146, h: 52 },
    ],
    testPoints: [
      {
        id: 'tp1',
        label: 'TP1 · Secondario Trasformatore',
        x: 184,
        y: 102,
        instrument: 'Voltmetro AC (~)',
        reading: '15,4 V AC',
        status: 'nominal',
        clue: 'Il trasformatore riceve 230 V ed eroga regolarmente 15,4 V alternati verso il ponte.',
      },
      {
        id: 'tp2',
        label: 'TP2 · Uscita Ponte di Graetz',
        x: 368,
        y: 102,
        instrument: 'Voltmetro DC (=)',
        reading: '0,00 V DC',
        status: 'fault',
        clue: 'Entrano 15,4 V AC ma escono 0 V DC! Uno o più diodi del ponte sono aperti o il ponte è interrotto.',
      },
      {
        id: 'tp3',
        label: 'TP3 · Condensatore elettrolitico',
        x: 458,
        y: 162,
        instrument: 'Ohmmetro (scarico)',
        reading: 'Carica regolare (no corto)',
        status: 'nominal',
        clue: 'Il condensatore di livellamento non è in cortocircuito.',
      },
    ],
    question: 'Dove si trova il guasto lungo la catena di alimentazione?',
    options: [
      'Nel Ponte di Graetz (diodi raddrizzatori aperti o pista interrotta)',
      'Nel trasformatore di rete 230 V (avvolgimento primario bruciato)',
      'Il condensatore di livellamento è in cortocircuito netto',
    ],
    correctIndex: 0,
    solution:
      'TP1 mostra 15,4 V AC presenti in ingresso al ponte, mentre TP2 cade a 0 V DC con condensatore sano (TP3): il guasto risiede nel Ponte di Graetz.',
  },
  {
    id: 'lpf-wrong-cap',
    title: 'Filtro Passa-Basso taglia il segnale utile a 7 MHz!',
    symptom:
      'Hai costruito un filtro LPF per bloccare le armoniche sopra i 10 MHz, ma già a 7 MHz il segnale sparisce (-22 dB).',
    instrumentMode: 'Analizzatore di Rete / Wattmetro RF',
    blocks: [
      { label: 'Generatore RF (7 / 14 MHz)', x: 26, y: 76, w: 146, h: 52 },
      { label: 'Bobina L serie (1 µH)', x: 204, y: 76, w: 136, h: 52 },
      { label: 'Condensatore C a massa', x: 374, y: 76, w: 150, h: 52 },
    ],
    testPoints: [
      {
        id: 'tp1',
        label: 'TP1 · Attenuazione a 1,5 MHz',
        x: 184,
        y: 102,
        instrument: 'Analizzatore RF',
        reading: '−0,4 dB (passa bene)',
        status: 'nominal',
        clue: 'A 1,5 MHz il filtro lascia passare il segnale senza perdite.',
      },
      {
        id: 'tp2',
        label: 'TP2 · Taglio reale a −3 dB',
        x: 356,
        y: 102,
        instrument: 'Frequenza taglio fc',
        reading: 'fc = 3,1 MHz (invece di 10 MHz!)',
        status: 'warning',
        clue: 'La frequenza di taglio reale è circa 3 volte più bassa del previsto: il prodotto L·C è ~10 volte troppo grande!',
      },
      {
        id: 'tp3',
        label: 'TP3 · Lettura codice su C',
        x: 450,
        y: 162,
        instrument: 'Capacimetro',
        reading: '2,2 nF (invece di 220 pF!)',
        status: 'fault',
        clue: 'È stato montato un condensatore da 2,2 nF (2.200 pF) al posto di 220 pF: un errore di scala 10× abbassa fc a 3,1 MHz!',
      },
    ],
    question: 'Perché il filtro attenua la banda dei 40m (7 MHz)?',
    options: [
      'Condensatore C da 2,2 nF invece di 220 pF (errore di scala ×10 che abbassa la frequenza di taglio fc)',
      'La bobina L è troppo piccola',
      'È stato montato un filtro Passa-Alto al contrario',
    ],
    correctIndex: 0,
    solution:
      'Confondere pF e nF è un classico errore di laboratorio: C dieci volte più grande riduce fc di √10 ≈ 3,16 volte, spostando il taglio da 10 MHz a 3,1 MHz.',
  },
  {
    id: 'bjt-bias',
    title: 'Amplificatore BJT NPN bloccato in interdizione',
    symptom:
      'Lo stadio preamplificatore alimentato a +12 V non amplifica alcun segnale audio o RF in uscita.',
    instrumentMode: 'Multimetro DC (riferimento massa GND)',
    blocks: [
      { label: 'Partitore Base (R1 / R2)', x: 26, y: 76, w: 146, h: 52 },
      { label: 'Transistor BJT NPN', x: 206, y: 76, w: 142, h: 52 },
      { label: 'Carico Collettore RC → 12V', x: 382, y: 76, w: 148, h: 52 },
    ],
    testPoints: [
      {
        id: 'tp1',
        label: 'TP1 · Tensione di Base (VB)',
        x: 186,
        y: 102,
        instrument: 'Voltmetro DC',
        reading: '0,00 V (atteso ~1,8 V)',
        status: 'fault',
        clue: 'La Base è a 0 V: senza superare ~0,7 V tra Base ed Emettitore la giunzione BE resta chiusa!',
      },
      {
        id: 'tp2',
        label: 'TP2 · Tensione di Collettore (VC)',
        x: 364,
        y: 102,
        instrument: 'Voltmetro DC',
        reading: '12,0 V (= VCC pieno!)',
        status: 'warning',
        clue: 'Poiché non scorre corrente IC nel resistore di collettore, non c’è caduta su RC e VC resta incollato a +12 V.',
      },
      {
        id: 'tp3',
        label: 'TP3 · Tensione di Emettitore (VE)',
        x: 277,
        y: 162,
        instrument: 'Voltmetro DC',
        reading: '0,00 V',
        status: 'nominal',
        clue: 'Nessuna corrente scorre sull’emettitore perché il transistor è spento (interdetto).',
      },
    ],
    question: 'Quale componente è aperto (interrotto) nello stadio NPN?',
    options: [
      'Il resistore superiore di polarizzazione della Base (R1 verso +12 V)',
      'Il transistor è in cortocircuito tra Collettore ed Emettitore',
      'L’alimentatore da +12 V è spento',
    ],
    correctIndex: 0,
    solution:
      'Se R1 si apre, la Base scende a 0 V (TP1), il BJT va in interdizione (IC = 0) e il Collettore sale alla piena tensione di alimentazione +12 V (TP2).',
  },
];

export const TroubleshootingLab: React.FC = () => {
  const { profile } = useStudy();
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [probedIds, setProbedIds] = useState<string[]>([]);
  const [activeTpId, setActiveTpId] = useState<string | null>(null);
  const [chosenOpt, setChosenOpt] = useState<number | null>(null);

  const scenario = SCENARIOS[scenarioIdx] ?? SCENARIOS[0];
  const activeTp = scenario.testPoints.find((t) => t.id === activeTpId) ?? null;

  const selectScenario = (idx: number) => {
    setScenarioIdx(idx);
    setProbedIds([]);
    setActiveTpId(null);
    setChosenOpt(null);
  };

  const handleProbe = (tpId: string) => {
    setActiveTpId(tpId);
    setProbedIds((prev) => (prev.includes(tpId) ? prev : [...prev, tpId]));
  };

  const handleDiagnose = (optIdx: number) => {
    if (chosenOpt !== null) return;
    setChosenOpt(optIdx);
    triggerGamificationFeedback(optIdx === scenario.correctIndex ? 'quizPass' : 'stepWrong', {
      soundEffectsEnabled: profile.soundEffectsEnabled,
      hapticFeedbackEnabled: profile.hapticFeedbackEnabled,
    });
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50">
              Banco Diagnosi PRO · Trova il Guasto
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tocca i punti di test (<span className="font-mono">TP1, TP2, TP3</span>) sullo schema per leggere gli strumenti virtuali e individuare il componente guasto.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => selectScenario(scenarioIdx)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Ripristina misure</span>
        </button>
      </div>

      {/* Scenario switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {SCENARIOS.map((sc, idx) => {
          const active = idx === scenarioIdx;
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => selectScenario(idx)}
              className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                active
                  ? 'bg-sky-600 border-sky-600 text-white'
                  : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400'
              }`}
            >
              <div
                className={`font-mono text-[10px] ${
                  active ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Caso #{idx + 1}
              </div>
              <div className="text-xs font-semibold line-clamp-2 mt-0.5">{sc.title}</div>
            </button>
          );
        })}
      </div>

      {/* Symptom & interactive schematic */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-3">
          <div className="p-3.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-slate-800 dark:text-amber-100 leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Sintomo segnalato:</strong> {scenario.symptom}
            </div>
          </div>

          <svg
            viewBox="0 0 560 205"
            className="w-full h-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
            role="img"
            aria-label={`Schema diagnosi ${scenario.title}`}
          >
            <text
              x="280"
              y="24"
              textAnchor="middle"
              className="text-[11px] font-mono font-semibold fill-sky-700 dark:fill-sky-400"
            >
              Strumento attivo: {scenario.instrumentMode}
            </text>

            {/* Signal lines connecting blocks */}
            <line
              x1="150"
              y1="102"
              x2="420"
              y2="102"
              stroke="currentColor"
              strokeOpacity="0.35"
              strokeWidth="2.5"
            />
            <line
              x1="448"
              y1="128"
              x2="448"
              y2="162"
              stroke="currentColor"
              strokeOpacity="0.35"
              strokeWidth="2"
              strokeDasharray="4 3"
            />

            {scenario.blocks.map((blk) => (
              <g key={blk.label}>
                <rect
                  x={blk.x}
                  y={blk.y}
                  width={blk.w}
                  height={blk.h}
                  rx="8"
                  className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700"
                  strokeWidth="2"
                />
                <text
                  x={blk.x + blk.w / 2}
                  y={blk.y + blk.h / 2 + 4}
                  textAnchor="middle"
                  className="text-[11px] font-semibold fill-slate-800 dark:fill-slate-100"
                >
                  {blk.label}
                </text>
              </g>
            ))}

            {scenario.testPoints.map((tp, idx) => {
              const isSelected = activeTpId === tp.id;
              const isProbed = probedIds.includes(tp.id);
              const fill = !isProbed
                ? '#0284c7'
                : tp.status === 'fault'
                  ? '#dc2626'
                  : tp.status === 'warning'
                    ? '#d97706'
                    : '#059669';
              return (
                <g
                  key={tp.id}
                  onClick={() => handleProbe(tp.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleProbe(tp.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Misura ${tp.label}`}
                  className="cursor-pointer"
                >
                  <circle
                    cx={tp.x}
                    cy={tp.y}
                    r={isSelected ? 17 : 14}
                    fill={fill}
                    stroke={isSelected ? '#ffffff' : fill}
                    strokeWidth={isSelected ? 3 : 1}
                    opacity={isSelected ? 1 : 0.9}
                  />
                  <text
                    x={tp.x}
                    y={tp.y + 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    className="text-[10px] font-mono font-bold pointer-events-none"
                  >
                    TP{idx + 1}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Direct TP buttons for accessibility */}
          <div className="flex flex-wrap gap-2">
            {scenario.testPoints.map((tp, idx) => (
              <button
                key={tp.id}
                type="button"
                onClick={() => handleProbe(tp.id)}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors cursor-pointer ${
                  activeTpId === tp.id
                    ? 'bg-sky-600 border-sky-600 text-white font-semibold'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400'
                }`}
              >
                Sonda TP{idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Instrument readout + fault diagnosis */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950 text-slate-100 p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                {activeTp ? activeTp.instrument : 'Multimetro / Rosmetro in attesa'}
              </span>
              <span>Sonde lette: {probedIds.length}/{scenario.testPoints.length}</span>
            </div>

            {activeTp ? (
              <>
                <div className="text-xs text-slate-300 font-medium">{activeTp.label}</div>
                <div
                  className={`text-xl font-mono font-bold tabular-nums ${
                    activeTp.status === 'fault'
                      ? 'text-red-400'
                      : activeTp.status === 'warning'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                  }`}
                >
                  {activeTp.reading}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pt-1 border-t border-slate-800">
                  {activeTp.clue}
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-400 py-3">
                Seleziona un punto di test TP1, TP2 o TP3 sullo schema per applicare i puntali dello strumento.
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {scenario.question}
            </div>
            <div className="space-y-2">
              {scenario.options.map((opt, idx) => {
                const isSelected = chosenOpt === idx;
                const isOk = idx === scenario.correctIndex;
                let cls =
                  'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-sky-400';
                if (chosenOpt !== null) {
                  if (isOk) {
                    cls =
                      'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 text-emerald-900 dark:text-emerald-200 font-semibold';
                  } else if (isSelected && !isOk) {
                    cls =
                      'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-900 dark:text-red-200';
                  } else {
                    cls =
                      'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400';
                  }
                }

                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={chosenOpt !== null}
                    onClick={() => handleDiagnose(idx)}
                    className={`w-full px-3 py-2.5 text-left text-xs rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                      chosenOpt !== null ? 'cursor-default' : 'cursor-pointer'
                    } ${cls}`}
                  >
                    <span>{opt}</span>
                    {chosenOpt !== null && isOk && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    {chosenOpt !== null && isSelected && !isOk && (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {chosenOpt !== null && (
              <p className="text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 leading-relaxed">
                <strong>Diagnosi tecnica:</strong> {scenario.solution}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
