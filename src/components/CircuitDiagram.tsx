import React from 'react';
import type { LessonId } from '../types/radiolab';

interface CircuitDiagramProps {
  diagramId: LessonId;
}

export const CircuitDiagram: React.FC<CircuitDiagramProps> = ({ diagramId }) => {
  return (
    <svg
      viewBox="0 0 560 220"
      className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
      role="img"
      aria-label={`Schema elettrico base per ${diagramId}`}
    >
      <defs>
        <pattern id={`cgrid-${diagramId}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="0.8"
          />
        </pattern>
      </defs>
      <rect width="560" height="220" fill={`url(#cgrid-${diagramId})`} />

      {diagramId === 'lesson-01' && (
        <g stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round">
          {/* Closed DC loop */}
          <path d="M 100 70 V 45 H 245" />
          <path d="M 305 45 H 440 V 88" />
          <path d="M 440 132 V 175 H 100 V 130" />
          {/* Battery symbol */}
          <line x1="78" y1="88" x2="122" y2="88" stroke="#0284c7" strokeWidth="3.5" />
          <line x1="88" y1="102" x2="112" y2="102" stroke="#0284c7" strokeWidth="2" />
          <line x1="78" y1="116" x2="122" y2="116" stroke="#0284c7" strokeWidth="3.5" />
          <line x1="88" y1="130" x2="112" y2="130" stroke="#0284c7" strokeWidth="2" />
          <text x="64" y="84" stroke="none" fill="#0284c7" className="text-xs font-mono font-bold">+</text>
          <text x="64" y="138" stroke="none" fill="currentColor" className="text-xs font-mono font-bold">−</text>
          {/* Switch */}
          <circle cx="245" cy="45" r="3.5" fill="currentColor" />
          <circle cx="305" cy="45" r="3.5" fill="currentColor" />
          <line x1="248" y1="44" x2="298" y2="26" stroke="#059669" strokeWidth="2.5" />
          <text x="275" y="18" textAnchor="middle" stroke="none" fill="#059669" className="text-[11px] font-medium">
            Interruttore
          </text>
          {/* Lamp / Load */}
          <circle cx="440" cy="110" r="22" fill="#fef3c7" fillOpacity="0.2" stroke="#d97706" />
          <path d="M 426 96 L 454 124 M 454 96 L 426 124" stroke="#d97706" />
          <text x="398" y="114" textAnchor="end" stroke="none" fill="currentColor" className="text-[11px]">
            Carico (Radio / Lampada)
          </text>
          <text x="142" y="114" stroke="none" fill="#0284c7" className="text-[11px] font-medium">
            Generatore 12 V
          </text>
        </g>
      )}

      {diagramId === 'lesson-02' && (
        <g stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
          {/* Left: Series resistors */}
          <text x="145" y="24" textAnchor="middle" stroke="none" fill="#0284c7" className="text-xs font-semibold">
            Collegamento in SERIE (R = R1 + R2)
          </text>
          <path d="M 50 75 H 78 L 84 65 L 94 85 L 104 65 L 114 85 L 120 75 H 158 L 164 65 L 174 85 L 184 65 L 194 85 L 200 75 H 240 V 170 H 50 Z" />
          <circle cx="50" cy="122" r="14" fill="none" stroke="#059669" />
          <text x="50" y="126" textAnchor="middle" stroke="none" fill="#059669" className="text-xs font-mono font-bold">A</text>
          <text x="98" y="54" textAnchor="middle" stroke="none" fill="currentColor" className="text-[11px] font-mono">R1</text>
          <text x="178" y="54" textAnchor="middle" stroke="none" fill="currentColor" className="text-[11px] font-mono">R2</text>
          <text x="145" y="192" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px]">
            Amperometro (A) sempre in serie · stessa corrente
          </text>

          {/* Divider */}
          <line x1="280" y1="16" x2="280" y2="204" strokeOpacity="0.2" strokeDasharray="4 4" />

          {/* Right: Parallel resistors + Voltmeter */}
          <text x="420" y="24" textAnchor="middle" stroke="none" fill="#d97706" className="text-xs font-semibold">
            Collegamento in PARALLELO
          </text>
          <path d="M 325 65 H 475 M 325 160 H 475" />
          <path d="M 325 65 V 160" />
          <path d="M 375 65 V 90 L 366 96 L 384 106 L 366 116 L 384 126 L 375 132 V 160" />
          <path d="M 445 65 V 90 L 436 96 L 454 106 L 436 116 L 454 126 L 445 132 V 160" />
          <circle cx="505" cy="112" r="14" fill="none" stroke="#0284c7" />
          <path d="M 475 65 H 505 V 98 M 475 160 H 505 V 126" stroke="#0284c7" />
          <text x="505" y="116" textAnchor="middle" stroke="none" fill="#0284c7" className="text-xs font-mono font-bold">V</text>
          <text x="358" y="115" textAnchor="end" stroke="none" fill="currentColor" className="text-[11px] font-mono">R1</text>
          <text x="428" y="115" textAnchor="end" stroke="none" fill="currentColor" className="text-[11px] font-mono">R2</text>
          <text x="420" y="192" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px]">
            Voltmetro (V) in parallelo · stessa tensione
          </text>
        </g>
      )}

      {diagramId === 'lesson-03' && (
        <g stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round">
          {/* AC Generator + Resistive load + Probe */}
          <path d="M 120 78 V 45 H 360 V 78" />
          <path d="M 360 142 V 175 H 120 V 134" />
          <circle cx="120" cy="106" r="28" stroke="#0284c7" />
          <path d="M 106 106 Q 113 94, 120 106 T 134 106" stroke="#0284c7" strokeWidth="2.5" />
          <text x="120" y="152" textAnchor="middle" stroke="none" fill="#0284c7" className="text-[11px] font-semibold">
            Generatore AC (~)
          </text>
          {/* Load Resistor */}
          <rect x="346" y="78" width="28" height="64" rx="2" stroke="#d97706" />
          <text x="390" y="114" stroke="none" fill="#d97706" className="text-[11px] font-mono font-semibold">
            Carico R (50 Ω)
          </text>
          {/* Oscilloscope probe */}
          <path d="M 360 45 H 455 V 80" stroke="#059669" strokeDasharray="4 3" />
          <rect x="425" y="80" width="90" height="54" rx="6" stroke="#059669" />
          <path d="M 436 107 Q 446 92, 456 107 T 476 107 T 496 107" stroke="#059669" />
          <text x="470" y="150" textAnchor="middle" stroke="none" fill="#059669" className="text-[10px]">
            Sonda Oscilloscopio
          </text>
        </g>
      )}

      {diagramId === 'lesson-04' && (
        <g stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round">
          {/* Coupling capacitor blocking DC, passing AC */}
          <text x="280" y="26" textAnchor="middle" stroke="none" fill="#0284c7" className="text-xs font-semibold">
            Condensatore di disaccoppiamento: blocca DC (+12 V), lascia passare segnale RF
          </text>
          <path d="M 70 110 H 235" stroke="#d97706" />
          <line x1="235" y1="80" x2="235" y2="140" stroke="#0284c7" strokeWidth="3.5" />
          <line x1="255" y1="80" x2="255" y2="140" stroke="#0284c7" strokeWidth="3.5" />
          <path d="M 255 110 H 455" stroke="#059669" />
          {/* Resistor to ground */}
          <path d="M 375 110 V 130 L 367 136 L 383 144 L 367 152 L 383 160 L 375 166 V 184" />
          <line x1="358" y1="184" x2="392" y2="184" />
          <line x1="364" y1="190" x2="386" y2="190" />
          <line x1="370" y1="196" x2="380" y2="196" />
          <text x="140" y="96" textAnchor="middle" stroke="none" fill="#d97706" className="text-[11px] font-mono">
            DC 12 V + Segnale AC
          </text>
          <text x="245" y="66" textAnchor="middle" stroke="none" fill="#0284c7" className="text-xs font-mono font-bold">
            C
          </text>
          <text x="410" y="96" stroke="none" fill="#059669" className="text-[11px] font-mono">
            Solo AC pulita!
          </text>
          <text x="394" y="152" stroke="none" fill="currentColor" className="text-[11px] font-mono">
            R verso massa
          </text>
        </g>
      )}

      {diagramId === 'lesson-05' && (
        <g stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round">
          <text x="280" y="26" textAnchor="middle" stroke="none" fill="#d97706" className="text-xs font-semibold">
            Impedenza RF (Choke): passa alimentazione DC 12 V, blocca disturbi RF
          </text>
          <path d="M 80 115 H 185" stroke="#059669" />
          {/* Inductor coils */}
          <path
            d="M 185 115 A 12 12 0 0 1 209 115 A 12 12 0 0 1 233 115 A 12 12 0 0 1 257 115 A 12 12 0 0 1 281 115"
            stroke="#d97706"
            strokeWidth="2.6"
          />
          <line x1="188" y1="94" x2="278" y2="94" stroke="#64748b" strokeWidth="2.2" />
          <path d="M 281 115 H 460" stroke="#0284c7" />
          {/* Bypass capacitor to ground */}
          <path d="M 380 115 V 140" />
          <line x1="362" y1="140" x2="398" y2="140" stroke="#0284c7" strokeWidth="3" />
          <line x1="362" y1="152" x2="398" y2="152" stroke="#0284c7" strokeWidth="3" />
          <path d="M 380 152 V 178" />
          <line x1="364" y1="178" x2="396" y2="178" />
          <line x1="370" y1="184" x2="390" y2="184" />

          <text x="233" y="80" textAnchor="middle" stroke="none" fill="#d97706" className="text-xs font-mono font-bold">
            L (Bobina su nucleo)
          </text>
          <text x="125" y="100" textAnchor="middle" stroke="none" fill="#059669" className="text-[11px]">
            +12 V DC + RF
          </text>
          <text x="455" y="100" textAnchor="end" stroke="none" fill="#0284c7" className="text-[11px]">
            Solo +12 V DC puliti
          </text>
        </g>
      )}

      {diagramId === 'lesson-06' && (
        <g stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
          <text x="280" y="24" textAnchor="middle" stroke="none" fill="#0284c7" className="text-xs font-semibold">
            Catena Reale Stazione Radio: TX (50 Ω) → Rosmetro → Accordatore → Antenna
          </text>
          <rect x="30" y="72" width="100" height="64" rx="8" stroke="#0284c7" />
          <text x="80" y="102" textAnchor="middle" stroke="none" fill="currentColor" className="text-xs font-semibold">Radio TX</text>
          <text x="80" y="120" textAnchor="middle" stroke="none" fill="#0284c7" className="text-[10px] font-mono">50 Ω</text>

          <line x1="130" y1="104" x2="170" y2="104" strokeWidth="3" />
          <rect x="170" y="72" width="105" height="64" rx="8" stroke="#d97706" />
          <text x="222" y="102" textAnchor="middle" stroke="none" fill="currentColor" className="text-xs font-semibold">Rosmetro</text>
          <text x="222" y="120" textAnchor="middle" stroke="none" fill="#d97706" className="text-[10px] font-mono">Legge ROS</text>

          <line x1="275" y1="104" x2="315" y2="104" strokeWidth="3" />
          <rect x="315" y="72" width="110" height="64" rx="8" stroke="#059669" />
          <text x="370" y="100" textAnchor="middle" stroke="none" fill="currentColor" className="text-xs font-semibold">Accordatore</text>
          <text x="370" y="118" textAnchor="middle" stroke="none" fill="#059669" className="text-[10px] font-mono">Rete LC a Π</text>

          <line x1="425" y1="104" x2="480" y2="104" strokeWidth="3" />
          <line x1="480" y1="104" x2="480" y2="54" stroke="#059669" strokeWidth="2.5" />
          <line x1="480" y1="54" x2="462" y2="38" stroke="#059669" strokeWidth="2.5" />
          <line x1="480" y1="54" x2="498" y2="38" stroke="#059669" strokeWidth="2.5" />
          <text x="480" y="156" textAnchor="middle" stroke="none" fill="currentColor" className="text-xs font-semibold">Antenna</text>
        </g>
      )}

      {diagramId === 'lesson-07' && (
        <g stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
          <text x="145" y="24" textAnchor="middle" stroke="none" fill="#0284c7" className="text-xs font-semibold">
            Trasformatore (Isolamento Galvanico)
          </text>
          {/* Primary & secondary coils */}
          <path d="M 55 60 H 110 V 74 A 8 8 0 0 1 110 90 A 8 8 0 0 1 110 106 A 8 8 0 0 1 110 122 A 8 8 0 0 1 110 138 V 156 H 55" stroke="#0284c7" />
          <line x1="136" y1="62" x2="136" y2="154" strokeWidth="2.5" />
          <line x1="144" y1="62" x2="144" y2="154" strokeWidth="2.5" />
          <path d="M 225 60 H 170 V 78 A 8 8 0 0 0 170 94 A 8 8 0 0 0 170 110 A 8 8 0 0 0 170 126 V 156 H 225" stroke="#059669" />
          <text x="140" y="182" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px]">
            Solo AC · nessun filo collega primario e secondario
          </text>

          <line x1="275" y1="16" x2="275" y2="204" strokeOpacity="0.2" strokeDasharray="4 4" />

          <text x="420" y="24" textAnchor="middle" stroke="none" fill="#d97706" className="text-xs font-semibold">
            Circuito Risonante LC Parallelo ("Tappo")
          </text>
          <path d="M 320 65 H 510 M 320 155 H 510" />
          {/* L branch */}
          <path d="M 370 65 V 86 A 9 9 0 0 1 370 104 A 9 9 0 0 1 370 122 A 9 9 0 0 1 370 140 V 155" stroke="#d97706" />
          {/* C branch */}
          <path d="M 455 65 V 104 M 455 116 V 155" stroke="#0284c7" />
          <line x1="436" y1="104" x2="474" y2="104" stroke="#0284c7" strokeWidth="3" />
          <line x1="436" y1="116" x2="474" y2="116" stroke="#0284c7" strokeWidth="3" />
          <text x="352" y="114" textAnchor="end" stroke="none" fill="#d97706" className="text-xs font-mono font-bold">L</text>
          <text x="484" y="114" stroke="none" fill="#0284c7" className="text-xs font-mono font-bold">C</text>
          <text x="420" y="182" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px]">
            Alla risonanza f₀ blocca f₀ verso massa (Z massima)
          </text>
        </g>
      )}

      {diagramId === 'lesson-08' && (
        <g stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
          <text x="145" y="24" textAnchor="middle" stroke="none" fill="#059669" className="text-xs font-semibold">
            Cella Filtro Passa-Basso (a L)
          </text>
          <path d="M 45 95 H 95 A 10 10 0 0 1 115 95 A 10 10 0 0 1 135 95 A 10 10 0 0 1 155 95 H 235" stroke="#d97706" />
          <path d="M 190 95 V 125 M 190 137 V 172" stroke="#0284c7" />
          <line x1="172" y1="125" x2="208" y2="125" stroke="#0284c7" strokeWidth="3" />
          <line x1="172" y1="137" x2="208" y2="137" stroke="#0284c7" strokeWidth="3" />
          <line x1="175" y1="172" x2="205" y2="172" />
          <text x="125" y="72" textAnchor="middle" stroke="none" fill="#d97706" className="text-[11px] font-mono">L in serie</text>
          <text x="214" y="135" stroke="none" fill="#0284c7" className="text-[11px] font-mono">C</text>
          <text x="140" y="196" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px]">
            Alte freq. frenate da L e scaricate da C
          </text>

          <line x1="280" y1="16" x2="280" y2="204" strokeOpacity="0.2" strokeDasharray="4 4" />

          <text x="420" y="24" textAnchor="middle" stroke="none" fill="#0284c7" className="text-xs font-semibold">
            Cella Filtro Passa-Alto (a L)
          </text>
          <path d="M 320 95 H 378 M 390 95 H 510" stroke="#0284c7" />
          <line x1="378" y1="76" x2="378" y2="114" stroke="#0284c7" strokeWidth="3" />
          <line x1="390" y1="76" x2="390" y2="114" stroke="#0284c7" strokeWidth="3" />
          <path d="M 445 95 V 112 A 8 8 0 0 1 445 128 A 8 8 0 0 1 445 144 A 8 8 0 0 1 445 160 V 172" stroke="#d97706" />
          <line x1="430" y1="172" x2="460" y2="172" />
          <text x="384" y="66" textAnchor="middle" stroke="none" fill="#0284c7" className="text-[11px] font-mono">C in serie</text>
          <text x="462" y="138" stroke="none" fill="#d97706" className="text-[11px] font-mono">L</text>
          <text x="420" y="196" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px]">
            C blocca basse freq., L le chiude a massa
          </text>
        </g>
      )}

      {diagramId === 'lesson-09' && (
        <g stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <text x="155" y="24" textAnchor="middle" stroke="none" fill="#0284c7" className="text-xs font-semibold">
            Ponte di Graetz (4 Diodi + Condensatore)
          </text>
          {/* Diamond bridge */}
          <polygon points="145,52 205,112 145,172 85,112" stroke="#0284c7" />
          <circle cx="85" cy="112" r="3" fill="currentColor" />
          <circle cx="205" cy="112" r="3" fill="currentColor" />
          <path d="M 34 112 H 85 M 205 112 H 240 V 188 H 45" strokeOpacity="0.5" strokeDasharray="3 3" />
          <path d="M 145 52 H 265 M 145 172 H 265" stroke="#059669" />
          {/* Smoothing C */}
          <path d="M 248 52 V 104 M 248 118 V 172" stroke="#d97706" />
          <line x1="234" y1="104" x2="262" y2="104" stroke="#d97706" strokeWidth="3" />
          <line x1="234" y1="118" x2="262" y2="118" stroke="#d97706" strokeWidth="3" />
          <text x="272" y="56" stroke="none" fill="#059669" className="text-xs font-mono font-bold">+DC</text>
          <text x="272" y="176" stroke="none" fill="currentColor" className="text-xs font-mono font-bold">−DC</text>

          <line x1="312" y1="16" x2="312" y2="204" strokeOpacity="0.2" strokeDasharray="4 4" />

          <text x="435" y="24" textAnchor="middle" stroke="none" fill="#059669" className="text-xs font-semibold">
            Stadio Transistor BJT NPN
          </text>
          <circle cx="440" cy="112" r="30" />
          <line x1="428" y1="94" x2="428" y2="130" strokeWidth="3.5" />
          <line x1="355" y1="112" x2="428" y2="112" stroke="#d97706" />
          <line x1="428" y1="102" x2="454" y2="82" />
          <line x1="454" y1="82" x2="454" y2="46" stroke="#0284c7" />
          <line x1="428" y1="122" x2="454" y2="142" />
          <line x1="454" y1="142" x2="454" y2="178" stroke="#059669" />
          <text x="362" y="102" stroke="none" fill="#d97706" className="text-xs font-mono font-bold">Base (B)</text>
          <text x="466" y="64" stroke="none" fill="#0284c7" className="text-xs font-mono font-bold">Collettore (C)</text>
          <text x="466" y="168" stroke="none" fill="#059669" className="text-xs font-mono font-bold">Emettitore (E)</text>
        </g>
      )}

      {diagramId === 'lesson-10' && (
        <g stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <text x="280" y="24" textAnchor="middle" stroke="none" fill="#0284c7" className="text-xs font-semibold">
            Schema Trasmettitore AM/FM + Simboli Porte Logiche
          </text>
          <rect x="30" y="54" width="110" height="44" rx="6" stroke="#d97706" />
          <text x="85" y="80" textAnchor="middle" stroke="none" fill="currentColor" className="text-xs font-semibold">Oscillatore Quarzo</text>
          <line x1="140" y1="76" x2="178" y2="76" />
          <rect x="178" y="54" width="110" height="44" rx="6" stroke="#0284c7" />
          <text x="233" y="80" textAnchor="middle" stroke="none" fill="currentColor" className="text-xs font-semibold">Modulatore AM/FM</text>
          <line x1="288" y1="76" x2="326" y2="76" />
          <polygon points="326,52 384,76 326,100" stroke="#059669" />
          <text x="348" y="80" textAnchor="middle" stroke="none" fill="#059669" className="text-[10px] font-semibold">PA</text>
          <line x1="384" y1="76" x2="430" y2="76" />
          <rect x="430" y="54" width="95" height="44" rx="6" stroke="#059669" />
          <text x="477" y="80" textAnchor="middle" stroke="none" fill="currentColor" className="text-xs font-semibold">Filtro PB → Ant</text>

          {/* Logic gate symbols row */}
          <g transform="translate(0, 118)">
            <path d="M 60 22 H 84 A 18 18 0 0 1 84 58 H 60 Z" stroke="#0284c7" />
            <text x="80" y="76" textAnchor="middle" stroke="none" fill="currentColor" className="text-[11px] font-mono">AND</text>

            <path d="M 200 22 Q 214 40, 200 58 Q 232 56, 246 40 Q 232 24, 200 22 Z" stroke="#059669" />
            <text x="224" y="76" textAnchor="middle" stroke="none" fill="currentColor" className="text-[11px] font-mono">OR</text>

            <polygon points="340,22 376,40 340,58" stroke="#d97706" />
            <circle cx="381" cy="40" r="4" stroke="#d97706" />
            <text x="360" y="76" textAnchor="middle" stroke="none" fill="currentColor" className="text-[11px] font-mono">NOT</text>

            <path d="M 462 22 Q 474 40, 462 58 M 470 22 Q 484 40, 470 58 Q 502 56, 516 40 Q 502 24, 470 22 Z" stroke="#4f46e5" />
            <text x="492" y="76" textAnchor="middle" stroke="none" fill="currentColor" className="text-[11px] font-mono">XOR</text>
          </g>
        </g>
      )}

      {diagramId === 'lesson-11' && (
        <g stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round">
          <text x="280" y="24" textAnchor="middle" stroke="none" fill="#059669" className="text-xs font-semibold">
            Alimentazione Dipolo con Cavo Coassiale 50 Ω e Balun 1:1
          </text>
          {/* Dipole arms */}
          <line x1="70" y1="70" x2="245" y2="70" stroke="#0284c7" strokeWidth="4" />
          <line x1="315" y1="70" x2="490" y2="70" stroke="#0284c7" strokeWidth="4" />
          <text x="155" y="54" textAnchor="middle" stroke="none" fill="#0284c7" className="text-xs font-mono">Braccio λ/4</text>
          <text x="405" y="54" textAnchor="middle" stroke="none" fill="#0284c7" className="text-xs font-mono">Braccio λ/4</text>

          {/* Balun box */}
          <rect x="245" y="54" width="70" height="44" rx="6" stroke="#d97706" />
          <text x="280" y="80" textAnchor="middle" stroke="none" fill="#d97706" className="text-xs font-mono font-bold">Balun</text>

          {/* Coax down */}
          <rect x="272" y="98" width="16" height="72" stroke="#64748b" />
          <line x1="280" y1="98" x2="280" y2="170" stroke="#059669" />
          <text x="302" y="138" stroke="none" fill="currentColor" className="text-[11px] font-mono">
            Cavo coassiale 50 Ω (anima + calza)
          </text>
          <text x="280" y="196" textAnchor="middle" stroke="none" fill="currentColor" className="text-[11px]">
            Il Balun evita che la calza del cavo irradi segnale disturbato
          </text>
        </g>
      )}

      {diagramId === 'lesson-12' && (
        <g stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <text x="280" y="24" textAnchor="middle" stroke="none" fill="#0284c7" className="text-xs font-semibold">
            Tavola Simboli Circuiti Elettrici (Manuale Neri — Riepilogo Esame)
          </text>
          {/* Row 1 */}
          <line x1="60" y1="62" x2="90" y2="62" strokeWidth="3" />
          <line x1="68" y1="72" x2="82" y2="72" />
          <text x="75" y="96" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px] font-mono">Batteria DC</text>

          <path d="M 155 67 H 168 L 173 57 L 181 77 L 189 57 L 197 77 L 202 67 H 215" stroke="#d97706" />
          <text x="185" y="96" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px] font-mono">Resistore (R)</text>

          <path d="M 272 67 H 294 M 304 67 H 326" stroke="#0284c7" />
          <line x1="294" y1="52" x2="294" y2="82" stroke="#0284c7" strokeWidth="3" />
          <line x1="304" y1="52" x2="304" y2="82" stroke="#0284c7" strokeWidth="3" />
          <text x="299" y="96" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px] font-mono">Condensatore (C)</text>

          <path d="M 380 67 H 390 A 7 7 0 0 1 404 67 A 7 7 0 0 1 418 67 A 7 7 0 0 1 432 67 H 442" stroke="#d97706" />
          <text x="411" y="96" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px] font-mono">Induttore (L)</text>

          <line x1="500" y1="48" x2="500" y2="72" />
          <line x1="484" y1="72" x2="516" y2="72" />
          <line x1="490" y1="78" x2="510" y2="78" />
          <line x1="496" y1="84" x2="504" y2="84" />
          <text x="500" y="96" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px] font-mono">Massa (GND)</text>

          {/* Row 2 */}
          <g transform="translate(0, 82)">
            <circle cx="75" cy="66" r="14" stroke="#0284c7" />
            <path d="M 67 66 Q 71 58, 75 66 T 83 66" stroke="#0284c7" />
            <text x="75" y="98" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px] font-mono">Generatore AC</text>

            <polygon points="170,54 192,66 170,78" stroke="#059669" />
            <line x1="192" y1="53" x2="192" y2="79" stroke="#059669" strokeWidth="3" />
            <text x="181" y="98" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px] font-mono">Diodo</text>

            <polygon points="282,54 304,66 282,78" stroke="#d97706" />
            <path d="M 299 52 H 304 V 80 H 309" stroke="#d97706" strokeWidth="2.5" />
            <text x="296" y="98" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px] font-mono">Zener</text>

            <circle cx="411" cy="66" r="16" />
            <line x1="404" y1="56" x2="404" y2="76" strokeWidth="3" />
            <line x1="386" y1="66" x2="404" y2="66" />
            <line x1="404" y1="60" x2="418" y2="50" />
            <line x1="404" y1="72" x2="418" y2="82" />
            <text x="411" y="98" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px] font-mono">Transistor BJT</text>

            <line x1="500" y1="80" x2="500" y2="50" stroke="#059669" />
            <line x1="500" y1="58" x2="488" y2="46" stroke="#059669" />
            <line x1="500" y1="58" x2="512" y2="46" stroke="#059669" />
            <text x="500" y="98" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px] font-mono">Antenna</text>
          </g>
        </g>
      )}

      {diagramId === 'lesson-13' && (
        <g stroke="currentColor" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <text x="280" y="24" textAnchor="middle" stroke="none" fill="#4f46e5" className="text-xs font-semibold">
            Catena CW (Onda Continua): Tasto → Oscillatore 700 Hz → Filtro Stretto → TX
          </text>

          {/* Telegraph key */}
          <rect x="28" y="88" width="96" height="44" rx="6" stroke="#4f46e5" />
          <line x1="48" y1="112" x2="88" y2="100" stroke="#4f46e5" strokeWidth="3" />
          <circle cx="94" cy="112" r="3" fill="#4f46e5" stroke="none" />
          <text x="76" y="148" textAnchor="middle" stroke="none" fill="currentColor" className="text-[11px] font-semibold">
            Tasto CW (Key)
          </text>

          <line x1="124" y1="110" x2="162" y2="110" />

          {/* Sidetone & Keying control */}
          <rect x="162" y="78" width="112" height="64" rx="8" stroke="#0284c7" />
          <text x="218" y="102" textAnchor="middle" stroke="none" fill="currentColor" className="text-xs font-semibold">
            Oscillatore Nota
          </text>
          <text x="218" y="120" textAnchor="middle" stroke="none" fill="#0284c7" className="text-[10px] font-mono">
            Sidetone 600–800 Hz
          </text>
          {/* Audio speaker tap */}
          <path d="M 218 142 V 168" stroke="#059669" strokeDasharray="3 3" />
          <text x="218" y="186" textAnchor="middle" stroke="none" fill="#059669" className="text-[10px] font-mono">
            Monitor Cuffia
          </text>

          <line x1="274" y1="110" x2="312" y2="110" />

          {/* Narrow CW filter */}
          <rect x="312" y="78" width="108" height="64" rx="8" stroke="#d97706" />
          <text x="366" y="102" textAnchor="middle" stroke="none" fill="currentColor" className="text-xs font-semibold">
            Filtro CW Stretto
          </text>
          <text x="366" y="120" textAnchor="middle" stroke="none" fill="#d97706" className="text-[10px] font-mono">
            Banda 300–500 Hz
          </text>

          <line x1="420" y1="110" x2="462" y2="110" />

          {/* TX + Antenna */}
          <polygon points="462,84 504,110 462,136" stroke="#059669" />
          <text x="478" y="114" textAnchor="middle" stroke="none" fill="#059669" className="text-[10px] font-bold">
            PA
          </text>
          <line x1="504" y1="110" x2="530" y2="110" stroke="#059669" />
          <line x1="530" y1="110" x2="530" y2="62" stroke="#059669" strokeWidth="2.5" />
          <line x1="530" y1="74" x2="516" y2="60" stroke="#059669" />
          <line x1="530" y1="74" x2="544" y2="60" stroke="#059669" />
          <text x="524" y="156" textAnchor="middle" stroke="none" fill="currentColor" className="text-[10px] font-mono">
            Portante ON/OFF
          </text>
        </g>
      )}
    </svg>
  );
};
