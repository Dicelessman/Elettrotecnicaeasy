import type {
  CircuitBasis,
  DomainAdaptation,
  ExampleDomain,
  LessonId,
} from '../types/radiolab';

export const DOMAIN_OPTIONS: {
  id: ExampleDomain;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: 'scout',
    label: 'Attività Scout e Campo Base',
    shortLabel: 'Scout & Campo',
    description: 'Esempi pratici su tende, uscite di squadriglia, batterie del campo e antenne tra gli alberi.',
  },
  {
    id: 'outdoor',
    label: 'Montagna, Trekking e Vela',
    shortLabel: 'Montagna & Vela',
    description: 'Analogie su sentieri alpini, rifugi, walkie-talkie in cresta, VHF nautico e meteo.',
  },
  {
    id: 'casa',
    label: 'Casa, Fai-da-te e Vita Quotidiana',
    shortLabel: 'Casa & Fai-da-te',
    description: 'Confronti con prese elettriche, tubi di casa, caricabatterie USB, router Wi-Fi e cucina.',
  },
];

export const LESSON_CIRCUIT_BASIS: Record<LessonId, CircuitBasis> = {
  'lesson-01': {
    title: 'Basi di Circuiti: Il Circuito Chiuso Elementare',
    summary:
      'Ogni apparecchio elettrico funziona solo quando c’è un percorso chiuso completo dal polo positivo (+), attraverso interruttore e carico, fino al polo negativo (−). Se il circuito si apre in un punto, il flusso di elettroni si ferma all’istante.',
    diagramId: 'lesson-01',
    symbols: [
      { symbol: '─|ı─', name: 'Batteria DC', role: 'Fornisce la spinta costante (Volt) tra + e −.' },
      { symbol: '─/ ─', name: 'Interruttore', role: 'Apre o chiude il sentiero continuo per gli elettroni.' },
      { symbol: '⊗', name: 'Carico / Utilizzatore', role: 'Trasforma l’energia elettrica in luce, suono o segnale radio.' },
    ],
  },
  'lesson-02': {
    title: 'Basi di Circuiti: Resistenze in Serie/Parallelo e Strumenti',
    summary:
      'Un circuito in serie mette i componenti in fila indiana (la corrente è uguale ovunque); un circuito in parallelo li affianca su rami separati (la tensione è uguale per tutti). Nota dove vanno i misuratori: l’Amperometro si inserisce IN SERIE, il Voltmetro IN PARALLELO!',
    diagramId: 'lesson-02',
    symbols: [
      { symbol: '─/\\/\\─', name: 'Resistore (R)', role: 'Limita la corrente e provoca una caduta di tensione (V = R·I).' },
      { symbol: '(A)', name: 'Amperometro', role: 'Va sempre in serie nel filo per contare gli Ampere che passano.' },
      { symbol: '(V)', name: 'Voltmetro', role: 'Va sempre in parallelo ai due punti tra cui misuri i Volt.' },
    ],
  },
  'lesson-03': {
    title: 'Basi di Circuiti: Anello AC e Punto di Misura',
    summary:
      'Nei circuiti in Corrente Alternata il generatore (~) spinge gli elettroni prima in un verso e poi nell’altro decine o milioni di volte al secondo. L’oscilloscopio si collega in parallelo sul carico per disegnare l’onda nel tempo.',
    diagramId: 'lesson-03',
    symbols: [
      { symbol: '(~)', name: 'Generatore AC', role: 'Produce una tensione sinusoidale che cambia polarità ritmicamente.' },
      { symbol: '▭', name: 'Carico RF (50 Ω)', role: 'Simbolo europeo del resistore che riceve la potenza dell’onda.' },
      { symbol: '⊥', name: 'Sonda Oscilloscopio', role: 'Legge tensione di picco, periodo e forma d’onda senza disturbare il circuito.' },
    ],
  },
  'lesson-04': {
    title: 'Basi di Circuiti: Condensatore di Disaccoppiamento (RC)',
    summary:
      'In quasi tutte le radio convivono 12 V continui (per alimentare i chip) e segnali radio alternati. Mettendo un condensatore in serie tra due blocchi, blocchi la DC (+12 V) ma lasci passare indisturbato il segnale AC verso lo stadio successivo.',
    diagramId: 'lesson-04',
    symbols: [
      { symbol: '─| |─', name: 'Condensatore (C)', role: 'Due piatti isolati: muro per la DC, ponte per le alte frequenze.' },
      { symbol: '⏚', name: 'Massa / Riferimento (GND)', role: 'Il punto a 0 Volt comune dove si chiude il percorso del segnale.' },
      { symbol: 'RC', name: 'Coppia R + C', role: 'Stabilisce anche il tempo di carica e scarica o il taglio di frequenza.' },
    ],
  },
  'lesson-05': {
    title: 'Basi di Circuiti: Bobina d’Arresto (RF Choke) e Filtro Alimentazione',
    summary:
      'L’induttore in serie lungo un cavo fa l’opposto del condensatore: fa passare comodamente la corrente continua della batteria (+12 V) ma oppone una barriera crescente ai disturbi ad alta frequenza, che vengono poi scaricati a massa dal condensatore.',
    diagramId: 'lesson-05',
    symbols: [
      { symbol: '─uuu─', name: 'Induttore / Bobina (L)', role: 'Lascia passare la DC ma frena la RF con reattanza XL = 2πfL.' },
      { symbol: '═══', name: 'Nucleo Ferromagnetico', role: 'Le righe parallele sopra la bobina indicano un nucleo in ferrite o ferro.' },
      { symbol: 'C bypass', name: 'Condensatore verso massa', role: 'Scarica a massa eventuali residui AC lasciando la DC pulitissima.' },
    ],
  },
  'lesson-06': {
    title: 'Basi di Circuiti: Catena Reale TX → Rosmetro → Accordatore → Antenna',
    summary:
      'Una stazione radio completa è un circuito chiuso di impedenza controllata a 50 Ω. Il Rosmetro si collega in serie lungo il cavo coassiale per leggere l’onda diretta e riflessa; l’Accordatore usa bobine e condensatori per trasformare l’impedenza dell’antenna.',
    diagramId: 'lesson-06',
    symbols: [
      { symbol: '50 Ω', name: 'Linea Coassiale', role: 'Cavo schermato con impedenza caratteristica standard di 50 Ω.' },
      { symbol: 'SWR', name: 'Rosmetro in serie', role: 'Misura se l’energia esce davvero verso l’antenna o torna indietro.' },
      { symbol: 'Π / LC', name: 'Accordatore d’Antenna', role: 'Rete di bobina e condensatori regolabili per compensare XL e Xc.' },
    ],
  },
  'lesson-07': {
    title: 'Basi di Circuiti: Trasformatore e Circuito Accordato LC',
    summary:
      'Negli schemi vedrai spesso due bobine affiancate separate da due righe verticali: è un trasformatore, che trasferisce solo AC senza contatto elettrico. A destra vedi invece il classico circuito risonante parallelo ("circuito tappo").',
    diagramId: 'lesson-07',
    symbols: [
      { symbol: '3 || ε', name: 'Trasformatore', role: 'Alza o abbassa la tensione AC secondo il rapporto tra le spire.' },
      { symbol: 'L // C', name: 'Circuito LC Parallelo', role: 'Alla risonanza f₀ presenta massima impedenza e seleziona una frequenza.' },
      { symbol: 'f₀', name: 'Sintonia', role: 'Variando C (freccina sul condensatore) cambi la stazione sintonizzata.' },
    ],
  },
  'lesson-08': {
    title: 'Basi di Circuiti: Celle di Filtro Passa-Basso e Passa-Alto',
    summary:
      'Combinando appena due componenti (L e C) a forma di "L" rovesciata ottieni un filtro! Nel Passa-Basso metti L in serie (frena le alte) e C verso massa; nel Passa-Alto li scambi di posto: C in serie (blocca le basse) e L verso massa.',
    diagramId: 'lesson-08',
    symbols: [
      { symbol: 'L serie + C gnd', name: 'Filtro Passa-Basso', role: 'Elimina le armoniche ad alta frequenza dopo il trasmettitore.' },
      { symbol: 'C serie + L gnd', name: 'Filtro Passa-Alto', role: 'Blocca i ronzii a bassa frequenza facendo passare i segnali radio.' },
      { symbol: '−3 dB', name: 'Punto di taglio fc', role: 'Soglia pratica dove il segnale si dimezza in potenza.' },
    ],
  },
  'lesson-09': {
    title: 'Basi di Circuiti: Ponte di Graetz e Stadio Transistor BJT',
    summary:
      'Ecco due tra gli schemi più famosi di tutta l’elettronica: a sinistra 4 diodi a rombo trasformano l’AC in DC livellata dal condensatore; a destra un transistor NPN usa una piccola corrente sulla Base (B) per pilotarne una grande tra Collettore (C) ed Emettitore (E).',
    diagramId: 'lesson-09',
    symbols: [
      { symbol: '─▷|─', name: 'Diodo', role: 'La punta del triangolo mostra la sola direzione consentita alla corrente.' },
      { symbol: '4 Diodi', name: 'Ponte di Graetz', role: 'Raddrizza entrambe le semionde positive e negative dell’AC.' },
      { symbol: 'B · C · E', name: 'Transistor NPN', role: 'La freccia sull’Emettitore esce verso l’esterno nei transistor NPN.' },
    ],
  },
  'lesson-10': {
    title: 'Basi di Circuiti: Stadi TX e Simboli delle Porte Logiche',
    summary:
      'Un trasmettitore parte da un oscillatore preciso (al quarzo), applica la voce nel modulatore AM/FM, amplifica in Classe B/PA e ripulisce con un filtro Passa-Basso. Nella parte digitale delle radio moderne si usano blocchi logici standard (AND, OR, NOT, XOR).',
    diagramId: 'lesson-10',
    symbols: [
      { symbol: 'XTAL', name: 'Quarzo Piezoelettrico', role: 'Fornisce una frequenza di riferimento stabilissima.' },
      { symbol: '▷', name: 'Amplificatore (PA)', role: 'Il triangolo indica sempre un blocco amplificatore verso l’antenna.' },
      { symbol: 'AND / XOR', name: 'Porte Logiche', role: 'Eseguono regole binarie su 0 e 1 nei microcontrollori e display.' },
    ],
  },
  'lesson-11': {
    title: 'Basi di Circuiti: Dipolo Bilanciato, Cavo Coassiale e Balun',
    summary:
      'Un cavo coassiale è asimmetrico (anima centrale + calza schermata a massa), mentre un dipolo ha due bracci simmetrici uguali. Il Balun (Balanced-to-Unbalanced) nel punto di giunzione evita che la calza del cavo diventi parte dell’antenna falsando il segnale.',
    diagramId: 'lesson-11',
    symbols: [
      { symbol: 'λ/4 + λ/4', name: 'Dipolo Mezza Onda', role: 'Due bracci speculari lunghi circa 72 / MHz ciascuno.' },
      { symbol: '1:1', name: 'Balun', role: 'Adattatore simmetrizzatore al vertice dell’antenna.' },
      { symbol: '50 Ω', name: 'Coassiale', role: 'Trasporta l’energia RF dalla radio al centro del dipolo.' },
    ],
  },
  'lesson-12': {
    title: 'Basi di Circuiti: Prontuario Simboli del Manuale Neri',
    summary:
      'Prima di affrontare il test finale, tieni sott’occhio i 10 simboli fondamentali che compaiono in quasi ogni schema di radiotecnica: sapendoli riconoscere a colpo d’occhio, qualsiasi circuito smette di sembrare complicato.',
    diagramId: 'lesson-12',
    symbols: [
      { symbol: 'R · C · L', name: 'Componenti Passivi', role: 'Resistore (frena tutto), Condensatore (passa AC), Bobina (passa DC).' },
      { symbol: '▷| · BJT', name: 'Semiconduttori', role: 'Diodo, Zener e Transistor controllano direzione e amplificazione.' },
      { symbol: 'GND · ANT', name: 'Riferimento e Uscita', role: 'Massa comune del circuito e terminale radiante verso lo spazio.' },
    ],
  },
  'lesson-13': {
    title: 'Basi di Circuiti: Tasto Telegrafico CW, Oscillatore Sidetone e TX',
    summary:
      'In telegrafia CW (Continuous Wave) il tasto telegrafico è un interruttore di precisione a molla: chiudendolo attivi sia l’oscillatore locale (Sidetone) per ascoltare il tuo ritmo in cuffia, sia la portante radio verso il filtro passa-basso e l’antenna.',
    diagramId: 'lesson-13',
    symbols: [
      { symbol: '─┴─', name: 'Tasto Telegrafico (Key)', role: 'Interruttore rapido azionato a mano per generare punti (·) e linee (−).' },
      { symbol: '🔊 680 Hz', name: 'Oscillatore Sidetone', role: 'Genera la nota audio locale in cuffia per controllare il ritmo di trasmissione.' },
      { symbol: 'CW Filter', name: 'Filtro Stretto (~500 Hz)', role: 'Stringe la banda ricevuta attorno alla nota Morse eliminando quasi tutto il rumore.' },
    ],
  },
};

export const LESSON_DOMAIN_VARIANTS: Record<
  LessonId,
  Record<ExampleDomain, DomainAdaptation>
> = {
  'lesson-01': {
    scout: {
      hook: 'Prima di accendere il ricetrasmettitore in uscita o collegarlo alla batteria del campo base, devi distinguere la "spinta" della batteria (Volt) dal "flusso" che entra nella radio (Ampere).',
      analogyTitle: 'Il sentiero in discesa e la fila di Scout',
      analogySteps: [
        'Immagina gli elettroni come Scout lungo un sentiero. Nel rame (conduttore) il sentiero è largo e libero; nella plastica (isolante) ci sono rovi impenetrabili che bloccano il passaggio.',
        'La Tensione (Volt) è la pendenza della montagna: più è ripida, più spinge gli elettroni a scendere. Non chiamarla mai "voltaggio": in italiano si dice tensione o differenza di potenziale (d.d.p.)!',
        'La Corrente (Ampere) è quanti ragazzi passano davanti a una tenda ogni secondo (1 A = 1 Coulomb/s). La Resistenza (Ohm, Ω) sono i sassi che rallentano la marcia.',
      ],
      formulaExample: 'Se nel cavo del campo base passano 10 Coulomb in 2 secondi, sta scorrendo una corrente di 5 Ampere (5 A).',
    },
    outdoor: {
      hook: 'In cresta o in barca vuoi sapere quanta carica entra nel tuo VHF portatile o nel GPS senza scaricare di colpo le batterie di emergenza.',
      analogyTitle: 'Un torrente alpino lungo le rocce',
      analogySteps: [
        'Gli elettroni sono come gocce d’acqua: nel rame trovano un canale liscio e scendono subito; nella guaina gommata dell’antenna trovano una diga di roccia (isolante).',
        'La Tensione (Volt) è il dislivello della cascata tra monte e valle: più c’è dislivello, più forte è la spinta (d.d.p., mai "voltaggio"!).',
        'La Corrente (Ampere) è la portata d’acqua in litri al secondo; la Resistenza (Ohm, Ω) sono i massi nel letto del torrente che frenano il flusso.',
      ],
      formulaExample: 'Se verso la radio nautica passano 10 Coulomb in 2 secondi durante la chiamata, scorrono 5 Ampere (5 A).',
    },
    casa: {
      hook: 'Quando leggi "5 V · 2 A" sul caricabatterie del telefono o cambi una presa a casa, stai già usando Volt e Ampere ogni giorno.',
      analogyTitle: 'L’acqua del rubinetto di casa',
      analogySteps: [
        'Nel tubo di rame del bagno (conduttore) l’acqua scorre libera; attorno al tubo c’è il rivestimento isolante che non fa uscire gocce.',
        'La Tensione (Volt) è la pressione nell’acquedotto prima che tu apra il rubinetto (si chiama tensione o d.d.p., mai "voltaggio"!).',
        'La Corrente (Ampere) è quanta acqua esce davvero al secondo dal rubinetto aperto; la Resistenza (Ohm, Ω) è il calcare o la valvola stretta che frena il getto.',
      ],
      formulaExample: 'Se nel cavetto USB del telefono passano 4 Coulomb ogni 2 secondi, sta caricando a 2 Ampere (2 A).',
    },
  },
  'lesson-02': {
    scout: {
      hook: 'Hai due batterie da 12 V al campo base: collegarle in serie dà 24 V (rischio di bruciare una radio da 12 V!), collegarle in parallelo mantiene 12 V sicuri raddoppiando l’autonomia!',
      analogyTitle: 'Due borracce in fila oppure affiancate',
      analogySteps: [
        'Due batterie in SERIE (+ di una sul − dell’altra) sommano le spinte: 12 V + 12 V = 24 V, ma l’autonomia (Ah) resta quella di una sola.',
        'Due batterie in PARALLELO (+ con + e − con −) tengono fermi i 12 V sicuri, ma raddoppiano la riserva d’acqua: 200 Ah + 200 Ah = 400 Ah!',
        'Per la Legge di Ohm (V = R × I), con fili troppo sottili e lunghi verso la tenda cresce la resistenza e il filo scalda per effetto Joule (P = V × I).',
      ],
      formulaExample: 'Una radio Scout alimentata a 12 V che assorbe 2 A in trasmissione consuma P = 12 × 2 = 24 Watt.',
    },
    outdoor: {
      hook: 'In rifugio o su una barca a vela spesso abbini più batterie di servizio: sbagliare tra serie e parallelo può guastare l’apparato VHF o lasciarti senza riserva notturna.',
      analogyTitle: 'Due serbatoi sul ponte della barca',
      analogySteps: [
        'Mettere due serbatoi uno sopra l’altro (SERIE) raddoppia la pressione di uscita (24 V), utile solo se gli strumenti sono fatti per 24 V!',
        'Affiancarli allo stesso livello (PARALLELO) mantiene 12 V costanti ma raddoppia le ore di navigazione prima di dover ricaricare.',
        'Cavi troppo sottili dal gavone alla consolle hanno alta resistenza (R = ρ·l/S) e sprecano energia della batteria in calore inutile.',
      ],
      formulaExample: 'Un VHF nautico a 12 V che assorbe 4 A in chiamata assorbe P = 12 × 4 = 48 Watt dalla batteria di bordo.',
    },
    casa: {
      hook: 'Perché una stufetta da 2.000 W chiede un cavo grosso mentre una lampadina LED usa un filo sottile? È tutto spiegato da Legge di Ohm ed effetto Joule!',
      analogyTitle: 'Le pile del telecomando e i tubi stretti',
      analogySteps: [
        'Nel telecomando metti due pile da 1,5 V una dietro l’altra (SERIE) per ottenere 3 V; nei grandi pacchi batteria si usa il PARALLELO per farli durare il doppio.',
        'Legge di Ohm (V = R × I): a parità di spinta (230 V di casa), un apparecchio con poca resistenza fa passare tantissima corrente.',
        'Un cavo della prolunga troppo sottile e arrotolato oppone troppa resistenza e si scalda pericolosamente (P = R·I²).',
      ],
      formulaExample: 'Una lampada o piccolo alimentatore a 12 V che assorbe 1,5 A consuma P = 12 × 1,5 = 18 Watt.',
    },
  },
  'lesson-03': {
    scout: {
      hook: 'Le radio non trasmettono corrente fissa come una pila: lanciano onde che vibrano milioni di volte al secondo! La frequenza ti dice subito quanto deve essere lunga l’antenna tra due alberi.',
      analogyTitle: 'La ruota di bicicletta e la corda al campo',
      analogySteps: [
        'Una pila dà Corrente Continua (DC): sempre in un verso. Le onde radio sono Corrente Alternata (AC): invertono il verso disegnando un’onda sinuosa come la quota del pedale su una ruota che gira.',
        'Quanti giri fa la ruota in 1 secondo è la Frequenza (Hz); il tempo di un giro è il Periodo (T = 1/f).',
        'Mentre l’onda corre alla velocità della luce (300.000 km/s), la distanza fra due creste è λ = 300 / f(MHz). Ecco perché i 7 MHz si chiamano "banda 40 metri"!',
      ],
      formulaExample: 'Sui 145 MHz dei walkie-talkie VHF da campo, λ = 300 / 145 ≈ 2,07 metri ("banda dei 2 metri").',
    },
    outdoor: {
      hook: 'Sui sentieri usi spesso PMR/VHF a onde corte e compatte (~2 metri o 70 cm), mentre per i bollettini meteo a lunga distanza si usano bande HF da decine di metri!',
      analogyTitle: 'Le onde del mare sotto la prua',
      analogySteps: [
        'La distanza tra due creste consecutive delle onde marine è proprio la Lunghezza d’onda (λ): onde oceaniche lunghe, increspature corte!',
        'Quante creste passano sotto lo scafo ogni secondo è la Frequenza (Hz); tra una cresta e la successiva passa il Periodo T.',
        'Poiché la forza dell’onda cambia continuamente, si usa il Valore Efficace (Veff = 0,707·Vp) per misurare la sua energia reale.',
      ],
      formulaExample: 'Sul canale marino o montano intorno a 156 MHz, λ = 300 / 156 ≈ 1,92 metri: basta un’antennina da ~48 cm!',
    },
    casa: {
      hook: 'La presa di casa segna "230 V 50 Hz", mentre il router Wi-Fi lavora a "2,4 GHz" (2.400 MHz): sono entrambe correnti alternate, cambia solo quanto vibrano in fretta!',
      analogyTitle: 'Un’altalena e il ritmo musicale',
      analogySteps: [
        'La presa di casa cambia verso 50 volte al secondo (50 Hz): i suoi picchi arrivano a ±325 V, ma la forza media termica (Valore Efficace Veff) equivale a 230 V DC.',
        'Il Wi-Fi di casa vibra 2.400 milioni di volte al secondo (2,4 GHz): per questo la sua lunghezza d’onda λ è minuscola (appena 12,5 cm!).',
        'Se due onde uguali arrivano sfasate di 180°, una spinge su mentre l’altra tira giù: si annullano, proprio come le zone morte del Wi-Fi dietro a un muro!',
      ],
      formulaExample: 'A 2.400 MHz (Wi-Fi di casa), λ = 300 / 2.400 = 0,125 metri (12,5 cm): ecco perché l’antennina del router è così corta!',
    },
  },
  'lesson-04': {
    scout: {
      hook: 'Dentro la radio i condensatori separano i 12 V continui della batteria dal segnale radio e aiutano a sintonizzare. E il boccale di birra spiega al volo perché non tutta la potenza in AC lavora davvero!',
      analogyTitle: 'La membrana elastica e il boccale di birra',
      analogySteps: [
        'Due piastre separate da un isolante (dielettrico): la corrente continua DC carica le piastre e si blocca; l’alternata AC spinge avanti e indietro facendo flettere la membrana di continuo!',
        'Più sale la frequenza o la capacità (Farad), minore è il freno del condensatore (Reattanza Capacitiva Xc).',
        'Potenza in AC come un boccale di birra: la birra è la Potenza Attiva (Watt utili), la schiuma è la Reattiva (VAR inutilizzati), l’intero boccale è l’Apparente (VA).',
      ],
      formulaExample: 'Un condensatore da 100 pF in HF a 14 MHz lascia passare il segnale con Xc ≈ 114 Ω, mentre blocca al 100% la DC a 0 Hz!',
    },
    outdoor: {
      hook: 'Nei pannelli solari da rifugio o nei filtri dei ricetrasmettitori portatili i condensatori ripuliscono la tensione e separano le bande VHF dalle interferenze.',
      analogyTitle: 'Un polmone elastico su una conduttura e il boccale',
      analogySteps: [
        'Un polmone con membrana elastica chiude il passaggio a un getto fisso (DC), ma trasmette ogni vibrazione avanti e indietro (AC/onde radio).',
        'Quando colleghi due condensatori in PARALLELO unisci i serbatoi: le capacità si sommano (al contrario delle resistenze!).',
        'Nel boccale di birra del rifugio: più è alto lo sfasamento tra tensione e corrente, più aumenta la "schiuma" (VAR) che riempie i cavi senza produrre lavoro.',
      ],
      formulaExample: 'Due condensatori da 47 pF affiancati in parallelo dentro un filtro d’antenna sommano le aree dando 94 pF.',
    },
    casa: {
      hook: 'Ogni alimentatore del PC o lampada LED usa condensatori per filtrare i disturbi della rete elettrica di casa e separare l’audio dagli altoparlanti.',
      analogyTitle: 'Il tamburo elastico e il boccale al pub',
      analogySteps: [
        'Spingendo fisso contro la pelle di un tamburo (DC) l’aria non passa oltre; battendo veloce (AC) la vibrazione attraversa subito il tamburo verso l’altra stanza!',
        'Un condensatore fa passare bene le note acute e le frequenze radio (alta f → bassa Xc) bloccando la corrente continua.',
        'Sulla bolletta elettrica si paga la potenza attiva (birra = Watt), mentre troppi motori induttivi creano "schiuma" reattiva (VAR) nei cavi!',
      ],
      formulaExample: 'Nei crossover delle casse di casa un condensatore lascia passare gli acuti verso il tweeter e ferma i bassi.',
    },
  },
  'lesson-05': {
    scout: {
      hook: 'Le bobine di carico sulle antenne portatili, i trasformatori dell’alimentatore e i filtri del campo base usano tutti un induttore: filo arrotolato che sfrutta il magnetismo!',
      analogyTitle: 'Il volano pesante che frena gli strappi',
      analogySteps: [
        'Un filo percorso da corrente crea un campo magnetico; arrotolato a spirale (solenoide) concentra la forza come una calamita elettrica.',
        'Per la legge di Lenz, la bobina si oppone ai cambiamenti bruschi come una ruota pesante (volano): lenta a partire, lenta a fermarsi.',
        'Quindi fa l’esatto opposto del condensatore: lascia passare la continua DC (è un filo intero!) ma frena sempre più le alte frequenze (XL = 2πfL).',
      ],
      formulaExample: 'Una bobina d’arresto RF fa passare tutti i 12 V DC della batteria del campo (XL = 0) ma blocca i disturbi a 14 MHz!',
    },
    outdoor: {
      hook: 'Molti stili corti da zaino hanno alla base una bobina nascosta: serve a compensare elettricamente la lunghezza mancante dell’antenna senza renderla lunga 5 metri!',
      analogyTitle: 'L’inerzia di uno zaino pesante in salita',
      analogySteps: [
        'Spingere uno zaino pesante sempre allo stesso passo regolare (DC) è fattibile; provare a scuoterlo avanti e indietro 100 volte al secondo (alta frequenza) richiede uno sforzo enorme!',
        'La bobina oppone poca resistenza al passo costante (DC), ma frena moltissimo le oscillazioni rapide (XL cresce con f).',
        'Inserire un nucleo di ferrite nella spirale moltiplica il campo magnetico e quindi l’induttanza L (Henry).',
      ],
      formulaExample: 'Un piccolo nucleo di ferrite sul cavo del microfono o GPS frena i disturbi ad alta frequenza lasciando intatti segnali lenti e alimentazione.',
    },
    casa: {
      hook: 'Hai mai visto quel cilindretto nero vicino alla spina del cavo del laptop o del monitor? È un nucleo di ferrite attorno al cavo: un piccolo induttore che blocca le interferenze!',
      analogyTitle: 'Un mulinello pesante dentro il tubo',
      analogySteps: [
        'Se l’acqua scorre dritta sempre nello stesso verso (DC), il mulinello gira liscio senza frenare. Se prova a invertire direzione mille volte al secondo (AC veloce), la pala pesante frena tutto!',
        'La bobina è quindi trasparente alla DC ma diventa un muro per l’alta frequenza (XL = 2πfL).',
        'A differenza del condensatore dove anticipa la corrente, nella bobina arriva prima la spinta (tensione) e dopo la corrente: V anticipa I di 90°.',
      ],
      formulaExample: 'Negli alimentatori di casa un’induttanza di filtro smorza i picchi veloci e mantiene liscia la corrente.',
    },
  },
  'lesson-06': {
    scout: {
      hook: 'Monti l’antenna tra due alberi, premi il PTT ma il rosmetro segna ROS 3.5! Qui impari cosa succede davvero tra cavi, impedenza a 50 Ω e perché un ROS alto rischia di cuocere la radio.',
      analogyTitle: 'Incroci di sentieri (Kirchhoff) e l’eco nel tubo',
      analogySteps: [
        'Kirchhoff è semplice logica: a ogni bivio tutti i ragazzi che arrivano devono poi proseguire (nodi), e facendo un giro ad anello salite e discese si azzerano (maglie).',
        'In AC resistenza R e reattanze (XL − Xc) formano l’Impedenza Z col teorema di Pitagora. Le radio lavorano a 50 Ω standard!',
        'Se la radio (50 Ω) trova un’antenna diversa (es. 150 Ω), parte dell’energia rimbalza indietro come un’eco creando onde stazionarie (ROS). Vicino a 1:1 esce tutta!',
      ],
      formulaExample: 'Con 10 W e ROS 1.5 torna indietro solo il 4% (0,4 W). A ROS 3.0 torna il 25% (2,5 W) che scalda lo stadio finale!',
    },
    outdoor: {
      hook: 'In vetta o in barca un cavo schiacciato dallo sportello o un’antenna piegata vicino alle rocce fanno salire subito il ROS, riducendo la portata e scaldando il portatile.',
      analogyTitle: 'Un sentiero che si stringe di colpo e crea ressa',
      analogySteps: [
        'Se un sentiero largo 50 passi si restringe bruscamente in un passaggio da 15 passi, metà del gruppo urta l’imbuto e rimbalza indietro!',
        'Quella "ressa" che torna verso il punto di partenza sono le onde stazionarie (ROS / SWR).',
        'Un accordatore LC adatta i due tratti così da far passare fluida tutta la potenza verso lo spazio aperto.',
      ],
      formulaExample: 'Se R antenna = 50 Ω e elimini le reattanze (XL = Xc), l’impedenza vista è esattamente 50 Ω e il ROS scende a 1,0 : 1!',
    },
    casa: {
      hook: 'Quando attacchi le casse dello stereo o il cavo TV di casa vedi sempre scritte come "8 Ω" o "75 Ω": è l’impedenza, fondamentale per non perdere segnale e non sovraccaricare l’amplificatore.',
      analogyTitle: 'Due tubi d’acqua collegati male',
      analogySteps: [
        'Agli incroci dell’impianto di casa (Kirchhoff) tutta l’acqua che entra in un raccordo a T esce dai due rami senza sparire.',
        'Collegare un tubo largo (50 Ω) a un beccuccio quasi tappato (200 Ω) fa rimbalzare colpi d’ariete indietro verso la pompa!',
        'Il ROS misura proprio quell’onda di ritorno: sotto 1,5:1 il sistema scorre fluido; sopra 2,5:1 rischi guasti.',
      ],
      formulaExample: 'Con una radio moderna a 50 Ω, se il cavo o il carico presentano 30 Ω di resistenza e 40 Ω di reattanza, Z = √(30² + 40²) = 50 Ω.',
    },
  },
  'lesson-07': {
    scout: {
      hook: 'Come fa il ricevitore al campo base a isolare la voce della tua squadriglia ignorando decine di altre trasmissioni vicine? Merito della Risonanza RLC!',
      analogyTitle: 'Il cambio della bici e l’altalena al campo',
      analogySteps: [
        'Il trasformatore usa due bobine senza contatto elettrico (isolamento galvanico!): cambia la tensione AC in base al numero di spire, come i rapporti della bici.',
        'Un circuito con bobina L e condensatore C possiede una frequenza naturale f₀ in cui XL = Xc: è la Risonanza!',
        'Come spingere un’altalena al suo ritmo esatto: piccole spinte al momento giusto producono oscillazioni enormi solo su quella frequenza (Fattore di Merito Q).',
      ],
      formulaExample: 'Con una bobina da 5 μH e un condensatore da 100 pF, il circuito entra in risonanza proprio a f₀ ≈ 7,11 MHz (banda 40m)!',
    },
    outdoor: {
      hook: 'Nel cuore di ogni VHF marino o alpino ci sono circuiti accordati che selezionano con precisione il canale voluto evitando che un ripetitore vicino accechi la tua ricezione.',
      analogyTitle: 'Il diapason musicale e i rapporti del cambio',
      analogySteps: [
        'Due diapason accordati sulla stessa nota vibrano insieme appena uno emette suono, ignorando tutte le altre note: è la risonanza selettiva!',
        'Più il Fattore Q è alto, più la "campana" di sintonia è stretta e taglia via i segnali interferenti vicini.',
        'Il trasformatore invece isola in sicurezza l’alta tensione alternata di rete dai circuiti a bassa tensione dell’alimentatore.',
      ],
      formulaExample: 'Un circuito sintonizzato a 10 MHz con banda stretta di 500 kHz ha selettività Q = 10 / 0,5 = 20.',
    },
    casa: {
      hook: 'Dall’alimentatore del campanello (trasformatore 230 V → 12 V) alla manopola della vecchia radio FM in cucina, trasformatori e risonanza sono ovunque intorno a te.',
      analogyTitle: 'Il bicchiere di cristallo che vibra a una sola nota',
      analogySteps: [
        'Il trasformatore funziona SOLO in corrente alternata: riduce i 230 V della presa di casa a 12 V o 24 V sicuri tenendoti isolato elettricamente dalla rete.',
        'La risonanza succede quando colpisci la frequenza naturale di un oggetto (come il bicchiere che vibra solo su una nota specifica).',
        'Girando la manopola di sintonia della radio vari il condensatore C per spostare f₀ fino a centrare la tua emittente preferita.',
      ],
      formulaExample: 'Un trasformatore di casa con rapporto 20:1 porta i 230 V AC della presa a 11,5 V AC sicuri prima del raddrizzamento.',
    },
  },
  'lesson-08': {
    scout: {
      hook: 'Le schede tecniche delle radio e delle antenne usano sempre i Decibel (+3 dB, +6 dB) e i trasmettitori montano filtri Passa-Basso per non creare interferenze intorno al campo.',
      analogyTitle: 'Setacci da cucina e scala dell’udito',
      analogySteps: [
        'Un filtro LC è un setaccio per frequenze: il Passa-Basso lascia passare solo le basse frequenze bloccando le armoniche alte; il Passa-Alto fa il contrario; il Notch taglia un singolo fischio.',
        'Il Decibel (dB) comprime grandi rapporti in numeri piccoli: +3 dB = raddoppi la potenza; +10 dB = potenza ×10; −3 dB = metà potenza (punto di taglio fc)!',
        'I semiconduttori (Silicio, Germanio) stanno a metà tra rame e plastica: drogati con atomi N o P diventano la base di tutta l’elettronica.',
      ],
      formulaExample: 'Passare da una radio portatile da 5 W a una base da 50 W equivale esattamente a +10 dB!',
    },
    outdoor: {
      hook: 'Saper leggere cosa vuol dire "+3 dB di guadagno d’antenna" ti fa capire subito se conviene spendere soldi in una batteria enorme o in un’antenna migliore sul sentiero!',
      analogyTitle: 'Le maglie di una rete e la scala logaritmica',
      analogySteps: [
        'Un filtro passa-banda è come una rete da pesca a doppia soglia: fa passare solo i pesci della taglia giusta (la banda radio voluta), fermando sia disturbi troppo lenti che troppo veloci.',
        'Nei decibel di potenza, +3 dB significa raddoppiare il segnale: un’antenna con +3 dBd ti dà lo stesso risultato di raddoppiare i Watt risparmiando batteria!',
        'Il Germanio richiede meno energia del Silicio per condurre, caratteristica preziosa per segnali debolissimi.',
      ],
      formulaExample: 'Un guadagno d’antenna di +6 dB moltiplica il segnale equivalente per 4 (come passare da 2 W a 8 W!).',
    },
    casa: {
      hook: 'Anche il volume dello stereo di casa e gli equalizzatori (Bassi, Medi, Alti) funzionano esattamente con i filtri di frequenza e la scala in Decibel!',
      analogyTitle: 'L’equalizzatore musicale e il colino',
      analogySteps: [
        'Nel tuo impianto audio il filtro Passa-Basso manda solo i toni gravi al subwoofer, mentre il Passa-Alto manda solo gli acuti ai tweeter.',
        'Il nostro orecchio non sente in modo lineare: per percepire un suono "doppio" serve davvero moltiplicare la potenza, motivo per cui usiamo i Decibel (dB).',
        'Il Silicio dei microchip di casa viene "drogato" con pochissimi atomi speciali per decidere con precisione quando deve lasciar passare corrente.',
      ],
      formulaExample: 'Un filtro passa-basso impostato a 10 MHz dimezza (−3 dB) il segnale a 10 MHz e abbatte fortemente i disturbi a 30 MHz.',
    },
  },
  'lesson-09': {
    scout: {
      hook: 'Come fa l’alimentatore del campo base a trasformare i 230 V alternati del generatore nei 13,8 V continui per la radio? E come può un diodo salvarti se inverti i morsetti della batteria?',
      analogyTitle: 'Valvola di non ritorno e rubinetto servoassistito',
      analogySteps: [
        'Il diodo è una valvola a senso unico: dall’Anodo al Catodo fa passare corrente (appena superi ~0,7 V nel Silicio o ~0,2 V nel Germanio); al contrario sbarra la strada!',
        'Con 4 diodi a rombo (Ponte di Graetz) raddrizzi entrambe le metà della sinusoide AC; un condensatore finale livella tutto in DC.',
        'Il Transistor BJT (NPN o PNP) è un rubinetto: una minuscola corrente nella Base (Ib) comanda una corrente 100 volte maggiore tra Collettore ed Emettitore (Ic = hfe · Ib)!',
      ],
      formulaExample: 'Con un transistor hfe = 100, basta inviare appena 2 mA sulla Base per far scorrere 200 mA su un relè o spia del campo!',
    },
    outdoor: {
      hook: 'Un piccolo diodo su un pannello solare portatile impedisce alla batteria di scaricarsi di notte attraverso il pannello stesso!',
      analogyTitle: 'La valvola antiriflusso della pompa ad acqua',
      analogySteps: [
        'Come la valvola sulla pompa dell’acqua lascia salire il getto ma gli impedisce di tornare giù, il diodo lascia passare la corrente in una sola direzione.',
        'Lo Zener è invece una valvola di sfioro tarata: se la tensione prova a superare un limite sicuro, scarica l’eccesso proteggendo gli strumenti delicati.',
        'Il transistor permette ai segnali minuscoli captati dall’antenna di pilotare un altoparlante potente.',
      ],
      formulaExample: 'Un diodo al Germanio (soglia 0,2 V) riesce a rivelare anche un debolissimo segnale radio senza batterie ausiliarie.',
    },
    casa: {
      hook: 'Dentro ogni caricabatterie da muro che trasforma l’AC di casa nei 5 V DC del telefono c’è un trasformatore, un Ponte di Graetz a 4 diodi e un condensatore livellatore!',
      analogyTitle: 'Il tornello unidirezionale della metro e lo sterzo assistito',
      analogySteps: [
        'Il diodo funziona come il tornello di uscita della metropolitana: passi senza problemi in un verso, ma è bloccato se provi a entrare contromano.',
        'Unendo 4 diodi (Ponte di Graetz) + un condensatore trasformi l’oscillazione avanti/indietro della presa di casa in tensione continua stabile.',
        'Il transistor fa da "servosterzo elettronico": con la forza di un dito (Base) muovi le ruote pesanti (Collettore-Emettitore).',
      ],
      formulaExample: 'Se l’alimentatore di casa usa un ponte di Graetz sui 50 Hz di rete, l’ondulazione raddoppia a 100 Hz risultando molto più facile da lisciare!',
    },
  },
  'lesson-10': {
    scout: {
      hook: 'Perché i walkie-talkie al campo usano la FM (silenziosa e pulita) mentre sulle lunghe distanze HF si usa la SSB o AM? E cosa capita se parli troppo vicino al microfono andando in sovramodulazione?',
      analogyTitle: 'Caricare la voce su un treno espresso',
      analogySteps: [
        'Un’onda radio pura (portante) è solo un fischio muto. Per spedire parole devi modificarla (modularla) al ritmo della voce!',
        'In AM vari l’ALTEZZA dell’onda: se urli troppo l’indice supera il 100% (Sovramodulazione) e distorci creando interferenze sui canali vicini!',
        'In FM l’altezza resta sempre uguale, cambia invece la FREQUENZA con cui vibra l’onda: i fulmini e i ronzii elettrici (che disturbano l’altezza) quasi non toccano la FM!',
      ],
      formulaExample: 'Con portante da 10 V e audio da 8 V hai m = 80% (voce pulita). Se l’audio sale a 13 V vai al 130%: voce gracchiante!',
    },
    outdoor: {
      hook: 'Su un sentiero esposto o durante un temporale, la FM mantiene il segnale comprensibile grazie al limitatore d’ampiezza, mentre i circuiti digitali gestiscono squelch e canali.',
      analogyTitle: 'Inviare messaggi con una torcia: luminosità vs lampeggio',
      analogySteps: [
        'Immagina la AM come cambiare la luminosità della torcia (la nebbia la disturba subito!), e la FM come tenere la luce sempre al massimo variando la velocità del ritmo.',
        'Nella SSB (banda laterale unica) tagli portante e metà del segnale risparmiando tantissima batteria nelle comunicazioni a lungo raggio.',
        'Le porte logiche (AND, OR, NOT, XOR) decidono su 0 e 1 quando accendere lo squelch o mostrare la frequenza sul display.',
      ],
      formulaExample: 'In una porta logica XOR, l’uscita diventa 1 solo quando i due ingressi di controllo sono diversi tra loro (A ≠ B).',
    },
    casa: {
      hook: 'La radio AM e FM in automobile, i telecomandi di casa e i microprocessori dentro ogni elettrodomestico usano esattamente queste due idee: modulazione d’onda e logica binaria (0/1).',
      analogyTitle: 'Alzare la voce vs cambiare ritmo musicale',
      analogySteps: [
        'In AM il messaggio sta nel volume istantaneo della portante; se saturi oltre il 100% la voce "gracchia" proprio come un microfono distorto.',
        'In FM il volume della portante è sempre fisso al 100% e cambia l’altezza della nota (frequenza), motivo per cui la radio FM in auto suona cristallina!',
        'Gli stadi audio in Classe B a due transistor (push-pull) scaldano molto meno rispetto alla Classe A quando ascolti musica.',
      ],
      formulaExample: 'Con portante a 1.000 kHz modulata da un tono audio a 1 kHz, in AM nascono le due bande laterali a 999 kHz e 1.001 kHz.',
    },
  },
  'lesson-11': {
    scout: {
      hook: 'La lezione regina per il campo Scout! Spesso non serve più potenza: basta tagliare un dipolo alla lunghezza giusta (72/MHz), montarlo a V-invertita su un palo e tenere la radio dritta!',
      analogyTitle: 'Aprire le braccia per lanciare e il fascio della torcia',
      analogySteps: [
        'Due fili paralleli vicini si annullano a vicenda; aprendo i due rami a 90° l’onda scappa nello spazio: ecco il Dipolo λ/2!',
        'Teso piatto misura ~75 Ω; appeso a un palo centrale con i bracci che scendono a 120° (V-Invertita!) scende proprio a 50 Ω perfetti per la radio!',
        'Polarizzazione: se il campo base ha un’antenna verticale e tu tieni il portatile orizzontale (90°), perdi quasi tutto il segnale!',
      ],
      formulaExample: 'Per i 7,1 MHz (banda 40m): ogni braccio misura 72 / 7,1 ≈ 10,14 m. Sui 145 MHz basta uno stilo Ground Plane da 49,6 cm!',
    },
    outdoor: {
      hook: 'Sia in montagna col portatile VHF che in barca con l’antenna di testa d’albero, sapere come funziona la polarizzazione e la Ground Plane λ/4 raddoppia la tua portata reale.',
      analogyTitle: 'La lampadina nuda vs il riflettore della torcia frontale',
      analogySteps: [
        'Un’antenna verticale (Ground Plane) sparge il segnale tutto intorno a 360° come una lanterna da tenda; una Yagi concentra tutto in una sola direzione come una torcia potente.',
        'Nella Ground Plane i radiali inclinati a 45° fanno da "specchio di terra" portando l’impedenza esattamente a 50 Ω.',
        'Tenere l’antennina del portatile verticale parallela a quella del rifugio o della barca evita perdite enormi da polarizzazione incrociata.',
      ],
      formulaExample: 'Uno stilo verticale Ground Plane λ/4 sui 145 MHz misura esattamente L = 7200 / 145 ≈ 49,6 cm con radiali a 45°.',
    },
    casa: {
      hook: 'Hai mai ruotato le antennine del router Wi-Fi di casa o guardato l’antenna TV sul tetto (una Yagi-Uda!)? Stai osservando esattamente i principi di polarizzazione e direttività.',
      analogyTitle: 'La fessura nella recinzione e l’antenna TV sul tetto',
      analogySteps: [
        'La classica antenna TV sul tetto con tante barrette in fila è una Yagi-Uda: la barra lunga dietro riflette il segnale, le corte davanti lo concentrano verso il ripetitore!',
        'Polarizzazione: se l’onda viaggia verticale, passa liscia attraverso una fessura verticale ma sbatte contro una fessura orizzontale!',
        'Ecco perché anche con 0 dBd (dipolo) contro +6 dBd (Yagi) puoi migliorare la ricezione senza cambiare potenza.',
      ],
      formulaExample: 'A 433 MHz (telecomandi cancello e sensori di casa), un quarto d’onda misura appena 7200 / 433 ≈ 16,6 cm!',
    },
  },
  'lesson-12': {
    scout: {
      hook: 'Hai completato il sentiero dagli elettroni fino alle antenne da campo! Qui raccogli i cinque attrezzi d’oro dello zaino radio e affronti la prova finale da 10 domande.',
      analogyTitle: 'Controllare bussola e zaino prima della partenza',
      analogySteps: [
        'Prima dell’uscita controlli sempre gli essenziali nello zaino. In radiotecnica hai 5 leggi rapide che risolvono il 90% dei problemi pratici.',
        '1) V = R·I e P = V·I; 2) λ = 300/f(MHz); 3) Condensatore (blocca DC) vs Bobina (frena alte f).',
        '4) Risonanza f₀ e ROS vicino a 1:1 a 50 Ω; 5) Dipolo 72/MHz per braccio, polarizzazione coerente e dB (+3 dB = ×2 W).',
      ],
      formulaExample: 'Al campo sui 7,1 MHz: λ ≈ 42,2 m, dipolo a V-invertita da ~10,1 m/lato (50 Ω), e con ROS 1.2 trasmetti al massimo!',
    },
    outdoor: {
      hook: 'Prima di partire per una traversata o un’uscita in mare, questo riepilogo ti assicura che tu sappia dimensionare batterie, proteggere la radio dal ROS e tagliare un’antenna di fortuna.',
      analogyTitle: 'Il briefing meteo e attrezzatura al rifugio',
      analogySteps: [
        'Ricorda il controllo sicurezza: batterie in parallelo per più ore a 12 V, cavi spessi per non perdere Volt per strada.',
        'Verifica sempre che l’antenna sia verticale se il ponte è verticale e che il ROS sia sotto 1,5–2,0 prima di lunghe chiamate.',
        'Tieni a mente le 5 formule chiave qui sotto e consulta la Scheda Esame quando ti serve un ripasso lampo.',
      ],
      formulaExample: 'In emergenza sui 145 MHz basta uno spezzone di filo lungo 7200 / 145 ≈ 49,6 cm per improvvisare un’antenna risonante λ/4!',
    },
    casa: {
      hook: 'Dall’alimentatore da banco fino alla comprensione di qualsiasi schema elettronico di casa: qui riassumi tutto il programma con un quiz finale da 10 domande.',
      analogyTitle: 'La cassetta degli attrezzi completa',
      analogySteps: [
        'Ora sai leggere i simboli sugli alimentatori (Volt, Ampere, Watt, 50 Hz AC vs DC), riconoscere i componenti (R, C, L, Diodi, Transistor) e capire i Decibel.',
        'Attento alle trappole classiche: si dice tensione (mai "voltaggio"), i condensatori in parallelo si sommano, il trasformatore va solo in AC.',
        'Metti alla prova tutte le competenze nel cruscotto interattivo e supera l’esame finale da 10 domande!',
      ],
      formulaExample: 'Un apparecchio a 12 V da 24 W assorbe 2 A (I = P/V) con resistenza equivalente di 6 Ω (R = V/I).',
    },
  },
  'lesson-13': {
    scout: {
      hook: 'Al campo Scout il Morse non è solo storia di Baden-Powell: una radio CW da 5 W (QRP) con una semplice antenna a filo può superare ostacoli e raggiungere centinaia di chilometri quando la voce non passa!',
      analogyTitle: 'Fischietto, torcia notturna e tamburo di squadriglia',
      analogySteps: [
        'Imparare il Morse contando "un punto e una linea" è lento: impara invece la melodia di ogni lettera (Metodo Fonico: A = di-DAH, K = DAH-di-DAH) come un ritmo di fischietto.',
        'Con il Metodo Koch e Farnsworth ascolti subito i suoni veloci (18 WPM) ma con pause generose tra una lettera e l’altra, allenando l’orecchio d’istinto.',
        'Con l’Albero Dicotomico (sinistra punto, destra linea) e il tasto tattile fissi ogni carattere sia con la vista che con la mano!',
      ],
      formulaExample: 'A 15 WPM secondo la parola standard PARIS, ogni punto dura esattamente 1200 / 15 = 80 ms, e ogni linea dura 240 ms.',
    },
    outdoor: {
      hook: 'In cresta con nebbia fitta o vento forte, il segnale visivo della torcia (··· −−− ···) o una nota CW stretta in radio resta comprensibile anche con pochissima batteria e interferenze.',
      analogyTitle: 'Segnali luminosi sul sentiero e boe nel buio',
      analogySteps: [
        'Le lettere più frequenti usano i suoni più brevi (E = 1 punto, T = 1 linea): per questo il Morse è il codice più efficiente mai inventato per emergenze e QRP.',
        'La regola ritmica 1:3:7 (punto 1, linea 3, pausa lettera 3, pausa parola 7) vale sia per la radio, sia per una torcia frontale, sia per il fischietto alpino.',
        'La nota CW occupa appena ~150–500 Hz rispetto ai 3.000 Hz della voce SSB: passa attraverso tempeste statiche (QRN) dove il microfono si perde.',
      ],
      formulaExample: 'Un segnale di soccorso SOS (···−−−···) continuo equivale a 9 impulsi con pause interne di 1 unità e dura meno di 2 secondi a 15 WPM.',
    },
    casa: {
      hook: 'Ogni telecomando, fibra ottica o collegamento digitale ragiona a impulsi brevi e lunghi proprio come il Morse (0/1 temporizzati). Qui impari il Codice Morse con tre tecniche scientifiche moderne!',
      analogyTitle: 'La batteria musicale invece dell’alfabeto visivo',
      analogySteps: [
        'Non leggere mai i punti come pallini su carta: ascoltali come un ritmo musicale ("di-DAH" = lettera A) usando il metodo fonico-ritmico.',
        'Il metodo Koch ti fa partire da sole 2 lettere (K e M) a velocità reale, mentre la spaziatura Farnsworth ti lascia respiro tra un carattere e il successivo.',
        'In più puoi esplorare l’albero binario visivo (sinistra punto, destra linea) e allenare la memoria motoria col tasto virtuale!',
      ],
      formulaExample: 'Con ritmo 20 WPM ("PARIS"), la durata di riferimento di un punto è T_dit = 1200 / 20 = 60 ms.',
    },
  },
};
