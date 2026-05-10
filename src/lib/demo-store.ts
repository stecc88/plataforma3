/**
 * Shared in-memory demo store for when Supabase is not configured.
 * All API routes import from this module to provide a consistent demo experience.
 */

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  status: string;
  teacher_code?: string;
  institution?: string;
  avatar?: string;
  password_hash?: string;
  created_at: string;
}

export interface DemoEssay {
  id: string;
  student_id: string;
  title: string;
  content: string;
  topic?: string;
  corrected_content?: string;
  score?: number;
  grammar_score?: number;
  coherence_score?: number;
  vocabulary_score?: number;
  clarity_score?: number;
  ai_feedback?: string;
  error_annotations?: string;
  errors?: string;  // JSON string of ErrorItem[]
  cils_level_assessment?: string;  // JSON string of CilsLevelAssessment
  study_topics?: string;  // JSON string of StudyTopic[]
  status: 'SUBMITTED' | 'CORRECTED';
  created_at: string;
  updated_at: string;
}

export interface DemoSelfAssessment {
  id: string;
  essay_id: string;
  student_id: string;
  clarity: number;
  coherence: number;
  grammar: number;
  vocabulary: number;
  overall_self_score?: number;
  reflection?: string;
  created_at: string;
}

export interface DemoTeacherNote {
  id: string;
  teacher_id: string;
  student_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DemoClassPreparation {
  id: string;
  teacher_id: string;
  title: string;
  topic: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DemoEnrollment {
  id: string;
  teacher_id: string;
  student_id: string;
  joined_at: string;
}

// ─── In-memory stores ────────────────────────────────────────────────
export const demoStore = {
  users: [] as DemoUser[],
  essays: [] as DemoEssay[],
  selfAssessments: [] as DemoSelfAssessment[],
  teacherNotes: [] as DemoTeacherNote[],
  classPreparations: [] as DemoClassPreparation[],
  enrollments: [] as DemoEnrollment[],
};

// ─── Helper: check if we should use demo mode ───────────────────────
export function isDemoMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return !url || !key || url === 'https://placeholder.supabase.co' || url === 'https://your-project.supabase.co';
}

export function isSupabaseAnonAvailable(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return !!(url && anonKey && url !== 'https://placeholder.supabase.co' && url !== 'https://your-project.supabase.co');
}

// ─── Helper: generate a unique 6-char teacher code ──────────────────
export function generateTeacherCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoid ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure uniqueness in demo store
  let attempts = 0;
  while (demoStore.users.some((u) => u.teacher_code === code) && attempts < 100) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    attempts++;
  }
  return code;
}

// ─── Seed demo data on first import ──────────────────────────────────
let seeded = false;

export function seedDemoData() {
  if (seeded) return;
  seeded = true;

  const now = new Date().toISOString();

  // ─── Admin ──────────────────────────────────────────────────
  const adminId = 'admin-001';
  demoStore.users.push({
    id: adminId,
    email: 'admin@scribia.com',
    name: 'Amministratore',
    role: 'ADMIN',
    status: 'ACTIVE',
    password_hash: '$2a$12$placeholderhashfordemo', // replaced on seed
    created_at: now,
  });

  // ─── Teacher (approved, ACTIVE) ─────────────────────────────
  const teacherId = 'teacher-001';
  demoStore.users.push({
    id: teacherId,
    email: 'prof@scribia.com',
    name: 'Prof. Rossi',
    role: 'TEACHER',
    status: 'ACTIVE',
    teacher_code: 'PROF-2025',
    institution: 'Liceo Linguistico Milano',
    password_hash: '$2a$12$placeholderhashfordemo',
    created_at: now,
  });

  // ─── Student 1 — Luca Verdi ─────────────────────────────────
  const student1Id = 'student-001';
  demoStore.users.push({
    id: student1Id,
    email: 'luca@scribia.com',
    name: 'Luca Verdi',
    role: 'STUDENT',
    status: 'ACTIVE',
    institution: 'Liceo Linguistico Milano',
    password_hash: '$2a$12$placeholderhashfordemo',
    created_at: now,
  });

  // ─── Student 2 — Giulia Bianchi ─────────────────────────────
  const student2Id = 'student-002';
  demoStore.users.push({
    id: student2Id,
    email: 'giulia@scribia.com',
    name: 'Giulia Bianchi',
    role: 'STUDENT',
    status: 'ACTIVE',
    institution: 'Liceo Linguistico Milano',
    password_hash: '$2a$12$placeholderhashfordemo',
    created_at: now,
  });

  // ─── Enrollments ────────────────────────────────────────────
  demoStore.enrollments.push({
    id: 'enrollment-001',
    teacher_id: teacherId,
    student_id: student1Id,
    joined_at: now,
  });
  demoStore.enrollments.push({
    id: 'enrollment-002',
    teacher_id: teacherId,
    student_id: student2Id,
    joined_at: now,
  });

  // ─── Luca's essays ──────────────────────────────────────────

  // Essay 1 — A2 level (corrected)
  demoStore.essays.push({
    id: 'essay-001',
    student_id: student1Id,
    title: 'La primavera in Italia',
    content:
      'La primavera è la stagione più bella in Italia. I fiori sbocciano e gli alberi diventano verdi. Mi piace molto andare al parco durante la primavera perché il tempo è bello e caldo. Ho andato al parco ieri e ho visto molti fiori colorati. La primavera mi fa felice perché posso giocare fuori con i miei amici.',
    topic: 'Descrivi la tua stagione preferita',
    corrected_content:
      'La primavera è la stagione più bella in Italia. I fiori sbocciano e gli alberi diventano verdi. Mi piace molto andare al parco durante la primavera perché il tempo è bello e caldo. Sono andato al parco ieri e ho visto molti fiori colorati. La primavera mi fa felice perché posso giocare fuori con i miei amici.',
    score: 7.5,
    grammar_score: 7.0,
    coherence_score: 8.0,
    vocabulary_score: 7.0,
    clarity_score: 8.0,
    ai_feedback:
      'Buon uso del vocabolario di base e struttura coerente. Attenzione all\'ausiliare: "ho andato" dovrebbe essere "sono andato" perché il verbo "andare" richiede l\'ausiliare essere. Nel complesso, un testo chiaro e ben organizzato.',
    error_annotations:
      '1. "ho andato" → "sono andato": il verbo "andare" è un verbo di movimento e richiede l\'ausiliare "essere".',
    errors: JSON.stringify([
      {
        originalText: 'ho andato',
        correctedText: 'sono andato',
        type: 'grammatica',
        color: '#f97316',
        shortReason: 'Ausiliare errato',
        explanation: 'Il verbo "andare" è un verbo di movimento e richiede l\'ausiliare "essere" anziché "avere".',
        grammarRule: 'I verbi di movimento come andare, venire, uscire, tornare richiedono l\'ausiliare essere.',
        suggestion: 'Ricorda: quando usi verbi che indicano movimento, usa sempre "sono" non "ho".'
      }
    ]),
    cils_level_assessment: JSON.stringify({
      estimatedLevel: 'A2',
      passesTargetLevel: null,
      readiness: 'Il testo dimostra un livello A2 solido con frasi semplici ma corrette. Per raggiungere B1, ampliare il vocabolario e usare strutture sintattiche più variate.',
      targetLevelProvided: null
    }),
    study_topics: JSON.stringify([
      {
        topic: 'Ausiliari essere e avere',
        description: 'I verbi di movimento (andare, venire, uscire, tornare) richiedono l\'ausiliare "essere" anziché "avere". Questo è uno degli errori più comuni per chi studia l\'italiano.',
        priority: 'alta',
        resources: ['Grammatica italiana - Capitolo ausiliari', 'Esercizi online su essere/avere']
      }
    ]),
    status: 'CORRECTED',
    created_at: now,
    updated_at: now,
  });

  // Essay 2 — B1 level (corrected)
  demoStore.essays.push({
    id: 'essay-002',
    student_id: student1Id,
    title: 'Il cibo italiano: tradizione e innovazione',
    content:
      'Il cibo italiano è conosciuto in tutto il mondo per la sua qualità e varietà. Ogni regione ha le sue specialità: la pizza napoletana, la pasta alla carbonara romana, il risotto alla milanese. Queste tradizioni culinarie sono passate di generazione in generazione e rappresentano un patrimonio culturale prezioso. Tuttavia, negli ultimi anni, molti chef italiani stanno sperimentando con ingredienti internazionali e tecniche moderne, creando piatti innovativi che rispettano le radici tradizionali ma si aprono a nuove influenze. Secondo me, questa combinazione di tradizione e innovazione è quello che rende la cucina italiana sempre viva e interessante. Non dobbiamo dimenticare le nostre radici, ma possiamo anche abbracciare il nuovo.',
    topic: 'Tradizione e innovazione nella cucina italiana',
    corrected_content:
      'Il cibo italiano è conosciuto in tutto il mondo per la sua qualità e varietà. Ogni regione ha le sue specialità: la pizza napoletana, la pasta alla carbonara romana, il risotto alla milanese. Queste tradizioni culinarie sono passate di generazione in generazione e rappresentano un patrimonio culturale prezioso. Tuttavia, negli ultimi anni, molti chef italiani stanno sperimentando con ingredienti internazionali e tecniche moderne, creando piatti innovativi che rispettano le radici tradizionali ma si aprono a nuove influenze. Secondo me, questa combinazione di tradizione e innovazione è quello che rende la cucina italiana sempre viva e interessante. Non dobbiamo dimenticare le nostre radici, ma possiamo anche abbracciare il nuovo.',
    score: 8.2,
    grammar_score: 8.5,
    coherence_score: 8.5,
    vocabulary_score: 8.0,
    clarity_score: 7.8,
    ai_feedback:
      'Testo ben strutturato con un ottimo uso dei connettivi ("tuttavia", "secondo me") e un lessico vario e appropriato. La struttura argomentativa è chiara: introduzione, sviluppo e conclusione. Piccolo dettaglio: "quello che" potrebbe essere semplificato in "ciò che" per un registro più formale. Nel complesso, un ottimo elaborato di livello intermedio-superiore.',
    error_annotations:
      '1. "quello che" → "ciò che": registro più formale e appropriato al contesto argomentativo.',
    errors: JSON.stringify([
      {
        originalText: 'quello che',
        correctedText: 'ciò che',
        type: 'lessico',
        color: '#eab308',
        shortReason: 'Registro informale',
        explanation: 'In un testo argomentativo formale, "ciò che" è preferibile a "quello che" per mantenere un registro più elevato.',
        grammarRule: 'Nei testi formali, preferire pronomi dimostrativivi come "ciò" invece di "quello".',
        suggestion: 'Quando scrivi un saggio argomentativo, usa "ciò che", "tale", "suddetto" per un registro più formale.'
      }
    ]),
    cils_level_assessment: JSON.stringify({
      estimatedLevel: 'B1',
      passesTargetLevel: true,
      readiness: 'Il testo dimostra un solido B1 con buona coerenza, lessico adeguato e uso di connettivi. Per raggiungere B2, variare ulteriormente il lessico e introdurre subordinate più complesse.',
      targetLevelProvided: 'B1'
    }),
    study_topics: JSON.stringify([
      {
        topic: 'Lessico e registro linguistico',
        description: 'Scegliere il vocabolo più appropriato al contesto e al registro (formale/informale) migliora la qualità del testo. Un dizionario dei sinonimi è uno strumento prezioso.',
        priority: 'media',
        resources: ['Dizionario dei sinonimi e contrari', 'Lessico italiano per stranieri', 'Esercizi sul registro linguistico']
      }
    ]),
    status: 'CORRECTED',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  });

  // Essay 3 — B2 level (corrected)
  demoStore.essays.push({
    id: 'essay-003',
    student_id: student1Id,
    title: 'L\'impatto della tecnologia sulla lingua italiana',
    content:
      'La diffusione capillare della tecnologia digitale ha innescato un dibattito acceso sull\'impatto che tale fenomeno sta avendo sulla lingua italiana. Da un lato, i puristi sostengono che l\'invasione di anglismi e abbreviazioni tipiche dei messaggi istantanei stia erodendo la ricchezza e la precisione del nostro patrimonio linguistico. Dall\'altro, i sostenitori dell\'evoluzione linguistica argomentano che ogni lingua viva si trasforma inevitabilmente nel tempo e che l\'arrivo di nuovi termini arricchisce piuttosto che impoverire il vocabolario. A mio avviso, la questione non dovrebbe essere affrontata in termini di conservazione versus innovazione, bensì attraverso una riflessione più profonda sulla competenza linguistica degli italiani. Il vero rischio non è l\'introduzione di parole straniere, ma la perdita della capacità di esprimere concetti complessi in modo articolato e preciso. È pertanto essenziale che la scuola incentivi tanto la padronanza dei registri formali quanto la comprensione dei linguaggi contemporanei, affinché i giovani possano navigare con disinvoltura tra diversi stili comunicativi senza rinunciare alla profondità del pensiero.',
    topic: 'Tecnologia e lingua italiana',
    corrected_content:
      'La diffusione capillare della tecnologia digitale ha innescato un dibattito acceso sull\'impatto che tale fenomeno sta avendo sulla lingua italiana. Da un lato, i puristi sostengono che l\'invasione di anglismi e abbreviazioni tipiche dei messaggi istantanei stia erodendo la ricchezza e la precisione del nostro patrimonio linguistico. Dall\'altro, i sostenitori dell\'evoluzione linguistica argomentano che ogni lingua viva si trasforma inevitabilmente nel tempo e che l\'arrivo di nuovi termini arricchisce piuttosto che impoverire il vocabolario. A mio avviso, la questione non dovrebbe essere affrontata in termini di conservazione versus innovazione, bensì attraverso una riflessione più profonda sulla competenza linguistica degli italiani. Il vero rischio non è l\'introduzione di parole straniere, ma la perdita della capacità di esprimere concetti complessi in modo articolato e preciso. È pertanto essenziale che la scuola incentivi tanto la padronanza dei registri formali quanto la comprensione dei linguaggi contemporanei, affinché i giovani possano navigare con disinvoltura tra diversi stili comunicativi senza rinunciare alla profondità del pensiero.',
    score: 9.0,
    grammar_score: 9.5,
    coherence_score: 9.0,
    vocabulary_score: 9.0,
    clarity_score: 8.5,
    ai_feedback:
      'Eccellente elaborato! Il testo presenta una struttura argomentativa sofisticata con tesi, antitesi e sintesi personale. L\'uso dei connettivi testuali ("da un lato", "dall\'altro", "a mio avviso", "bensì", "pertanto") è impeccabile. Il lessico è ricco e preciso ("diffusione capillare", "erodendo", "disinvoltura"). Unico appunto: "arricchisce piuttosto che impoverire" potrebbe essere più elegante con "arricchisce anziché impoverire". Nel complesso, un testo di livello avanzato.',
    error_annotations:
      '1. "piuttosto che impoverire" → "anziché impoverire": costrutto più elegante e preciso in contesto formale.',
    errors: JSON.stringify([
      {
        originalText: 'piuttosto che',
        correctedText: 'anziché',
        type: 'lessico',
        color: '#eab308',
        shortReason: 'Scelta lessicale',
        explanation: '"Anziché" è più preciso ed elegante di "piuttosto che" nel contesto di un\'opposizione formale tra due concetti.',
        grammarRule: 'In contesti formali argomentativi, "anziché" esprime opposizione con maggiore precisione di "piuttosto che".',
        suggestion: 'Nei saggi formali, preferisci "anziché" o "invece di" per esprimere opposizione in modo più elegante.'
      }
    ]),
    cils_level_assessment: JSON.stringify({
      estimatedLevel: 'B2',
      passesTargetLevel: true,
      readiness: 'Testo di livello B2 avanzato con struttura argomentativa complessa, lessico ricco e padronanza dei connettivi. Per raggiungere C1, affinare ulteriormente le sfumature stilistiche e variare le strutture sintattiche.',
      targetLevelProvided: 'B2'
    }),
    study_topics: JSON.stringify([
      {
        topic: 'Scelta lessicale e precisione',
        description: 'Nei testi formali argomentativi, la scelta lessicale deve essere precisa ed elegante. "Anziché" esprime opposizione con maggiore precisione di "piuttosto che".',
        priority: 'bassa',
        resources: ['Grammatica avanzata - Scelta lessicale', 'Esercizi sul registro formale']
      },
      {
        topic: 'Connettivi testuali avanzati',
        description: 'Padroneggiare i connettivi testuali avanzati (tuttavia, nondimeno, pertanto, invero) permette di costruire testi argomentativi più sofisticati.',
        priority: 'media',
        resources: ['Connettivi testuali - Guida completa', 'Scrittura argomentativa avanzata']
      }
    ]),
    status: 'CORRECTED',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
  });

  // Essay 4 — Submitted (uncorrected), for correction flow demo
  demoStore.essays.push({
    id: 'essay-004',
    student_id: student1Id,
    title: 'Il mio viaggio a Roma',
    content:
      'La settimana scorsa ho andato a Roma con la mia famiglia. Abbiamo visitato il Colosseo e ho visto molti monumenti antichi. Mi piace molto la città perché è molto bella e interessante. La sera abbiamo mangiato in un ristorante tipico e ho provato la carbonara per la prima volta. Era buonissimo! Il giorno dopo abbiamo visitato il Vaticano e ho ammirato la Cappella Sistina. È stata un\'esperienza indimenticabile e spero di tornare presto.',
    topic: 'Descrivi un viaggio memorabile',
    status: 'SUBMITTED',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  });

  // ─── Giulia's essays ────────────────────────────────────────

  // Essay 5 — A2 level (corrected)
  demoStore.essays.push({
    id: 'essay-005',
    student_id: student2Id,
    title: 'La mia famiglia',
    content:
      'La mia famiglia è composta da quattro persone: mio padre, mia madre, mio fratello e io. Mio padre fa l\'ingegnere e mia madre è insegnante. Mio fratello si chiama Marco e ha dieci anni. Nel weekend andiamo spesso al cinema o al parco insieme. La domenica mia nonna viene a pranzo da noi e prepara la pasta fatta in casa. Io aiuto in cucina e sto imparando a fare i ravioli.',
    topic: 'Descrivi la tua famiglia',
    corrected_content:
      'La mia famiglia è composta da quattro persone: mio padre, mia madre, mio fratello e io. Mio padre fa l\'ingegnere e mia madre è insegnante. Mio fratello si chiama Marco e ha dieci anni. Nel weekend andiamo spesso al cinema o al parco insieme. La domenica mia nonna viene a pranzo da noi e prepara la pasta fatta in casa. Io aiuto in cucina e sto imparando a fare i ravioli.',
    score: 8.0,
    grammar_score: 8.5,
    coherence_score: 8.0,
    vocabulary_score: 7.5,
    clarity_score: 8.0,
    ai_feedback:
      'Testo semplice ma ben strutturato. Le frasi sono brevi e chiare, con un buon uso del lessico familiare. Per migliorare, prova a usare connettivi più variati ("inoltre", "mentre", "nonostante") e a costruire frasi più articolate.',
    error_annotations: 'Nessun errore significativo trovato.',
    errors: JSON.stringify([]),
    cils_level_assessment: JSON.stringify({
      estimatedLevel: 'A2',
      passesTargetLevel: null,
      readiness: 'Buon livello A2 con frasi corrette e vocabolario adeguato al contesto familiare. Per B1, ampliare il lessico e usare strutture più complesse.',
      targetLevelProvided: null
    }),
    study_topics: JSON.stringify([
      {
        topic: 'Ampliamento del lessico',
        description: 'Il testo non presenta errori significativi. Per migliorare ulteriormente, amplia il vocabolario con sinonimi, espressioni idiomatiche e un registro più vario.',
        priority: 'bassa',
        resources: ['Dizionario dei sinonimi e contrari', 'Lettura di testi autentici italiani']
      }
    ]),
    status: 'CORRECTED',
    created_at: new Date(Date.now() - 43200000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString(),
  });

  // Essay 6 — B1 level (submitted, uncorrected)
  demoStore.essays.push({
    id: 'essay-006',
    student_id: student2Id,
    title: 'Il mio paese ideale',
    content:
      'Se potessi creare un paese ideale, sarebbe un posto dove tutti le persone sono uguali e rispettano l\'ambiente. Ci sarebbero parchi verdi ovunque e le città sarebbero pulite. L\'istruzione sarebbe gratuita per tutti e non ci sarebbe la povertà. Le persone potrebbero esprimere liberamente le proprie opinioni senza paura. Purtroppo, questo è solo un sogno, ma credo che possiamo avvicinarci a questo ideale se lavoriamo insieme.',
    topic: 'Descrivi il tuo paese ideale',
    status: 'SUBMITTED',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  });

  // ─── Teacher notes ──────────────────────────────────────────
  demoStore.teacherNotes.push({
    id: 'note-001',
    teacher_id: teacherId,
    student_id: student1Id,
    content: 'Luca sta facendo grandi progressi nella scrittura. Da incoraggiare nell\'uso di un vocabolario più vario e nell\'articolazione di frasi complesse.',
    created_at: now,
    updated_at: now,
  });
  demoStore.teacherNotes.push({
    id: 'note-002',
    teacher_id: teacherId,
    student_id: student2Id,
    content: 'Giulia mostra un buon controllo della grammatica di base. Consigliata la pratica con testi argomentativi per sviluppare il registro formale.',
    created_at: now,
    updated_at: now,
  });
}

// Auto-seed on import
seedDemoData();
