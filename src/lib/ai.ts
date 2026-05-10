// ─────────────────────────────────────────────────────────────
// ScribIA — AI Service
// ─────────────────────────────────────────────────────────────
// Primary:  Google Gemini 2.0 Flash Lite via @google/genai SDK
//           (requires GEMINI_API_KEY env var)
// Fallback: z-ai-web-dev-sdk (sandbox / development)
// ─────────────────────────────────────────────────────────────

import ZAI from 'z-ai-web-dev-sdk';
import { GoogleGenAI } from '@google/genai';

// ── Determine AI provider ────────────────────────────────────
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const useGemini = !!geminiApiKey && geminiApiKey !== 'AIzaSy...' && geminiApiKey.length > 10;

// Detect if we're running in a production serverless environment (Vercel)
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

let geminiClient: GoogleGenAI | null = null;

async function getGemini(): Promise<GoogleGenAI> {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: geminiApiKey });
  }
  return geminiClient;
}

/**
 * Attempt to get z-ai-web-dev-sdk instance.
 * Returns null if unavailable (e.g., production/Vercel serverless).
 */
async function getZAI(): Promise<Awaited<ReturnType<typeof ZAI.create>> | null> {
  // z-ai-web-dev-sdk is a sandbox/dev-only SDK that doesn't work in
  // production serverless environments like Vercel.
  if (isServerless) {
    console.warn('[ScribIA AI] z-ai-web-dev-sdk skipped in serverless environment');
    return null;
  }
  try {
    const instance = await ZAI.create();
    return instance;
  } catch (err) {
    console.warn('[ScribIA AI] z-ai-web-dev-sdk initialization failed:', err);
    return null;
  }
}

// ── Shared types ─────────────────────────────────────────────

/** A single error annotation with detailed classification */
export interface ErrorItem {
  originalText: string;
  correctedText: string;
  type: string;       // "ortografia" | "grammatica" | "punteggiatura" | "sintassi" | "lessico" | "coerenza"
  color: string;      // hex color code
  shortReason: string;
  explanation: string;
  grammarRule: string;
  suggestion: string;
}

/** CILS level assessment result */
export interface CilsLevelAssessment {
  estimatedLevel: string;          // A1 | A2 | B1 | B2 | C1 | C2
  passesTargetLevel: boolean | null;  // null if no targetLevel was provided
  readiness: string;
  targetLevelProvided?: string | null;
}

/** A study topic recommendation based on errors found */
export interface StudyTopic {
  topic: string;
  description: string;
  priority: 'alta' | 'media' | 'bassa';
  resources: string[];
}

/** Full correction result returned by the AI */
export interface CorrectionResult {
  correctedContent: string;
  score: number;
  grammarScore: number;
  coherenceScore: number;
  vocabularyScore: number;
  clarityScore: number;
  aiFeedback: string;
  errorAnnotations: string;
  errors: ErrorItem[];
  cilsLevelAssessment: CilsLevelAssessment | null;
  studyTopics: StudyTopic[];
}

// ── Valid CILS levels ────────────────────────────────────────
const CILS_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function isValidCilsLevel(level: string): boolean {
  return CILS_LEVELS.includes(level.toUpperCase());
}

// ── Extended system instruction for correction + CILS ────────
const SYSTEM_PROMPT_CORRECTION = `Sei un docente esperto di italiano e un esaminatore ufficiale CILS.

### COMPITO 1: CORREZIONE DETTAGLIATA (obbligatoria)
Devi correggere il testo seguente, rispettando ESATTAMENTE questi requisiti:
- originalText: copia parola per parola l'errore così come appare nel testo originale.
- correctedText: la versione corretta.
- type: uno tra "ortografia", "grammatica", "punteggiatura", "sintassi", "lessico", "coerenza".
- color: usa i colori esatti #ef4444 (ortografia), #f97316 (grammatica), #3b82f6 (punteggiatura), #a855f7 (sintassi), #eab308 (lessico), #14b8a6 (coerenza).
- shortReason: breve spiegazione in italiano (max 10 parole).
- explanation: spiegazione dettagliata.
- grammarRule: regola grammaticale generale.
- suggestion: consiglio pratico per evitare l'errore.

Restituisci anche i punteggi: grammarScore (0-10), coherenceScore (0-10), vocabularyScore (0-10), clarityScore (0-10), score (media ponderata).

### COMPITO 2: VALUTAZIONE DEL LIVELLO CILS (obbligatorio se targetLevel è fornito, altrimenti solo stimato)
Utilizza i descrittori ufficiali CILS (A1, A2, B1, B2, C1, C2) per determinare:
- estimatedLevel: il livello che il testo dimostra (sulla base di grammatica, lessico, coerenza, efficacia).
- passesTargetLevel: se è stato fornito targetLevel, indica true/false (supera quel livello?).
- readiness: breve testo che spiega perché il testo corrisponde a quel livello e cosa manca per il livello successivo (max 50 parole).

Se targetLevel NON è fornito, passa passesTargetLevel a null e concentrati su estimatedLevel.

### COMPITO 3: TEMI DI STUDIO CONSIGLIATI (obbligatorio)
Sulla base degli errori trovati nel testo, genera una lista di temi di studio (studyTopics) che lo studente dovrebbe approfondire. Per ogni tema:
- topic: nome del tema grammaticale o lessicale (es. "Ausiliari essere e avere", "Congiuntivo", "Connettivi testuali").
- description: breve spiegazione del tema e perché è importante per lo studente (2-3 frasi in italiano).
- priority: "alta" se l'errore è grave o frequente, "media" se moderato, "bassa" se minore.
- resources: lista di 2-3 risorse consigliate per studiare il tema (libri, esercizi online, capitoli di grammatica).

Genera almeno 1 tema di studio per ogni tipo di errore trovato, fino a un massimo di 5 temi. Se non ci sono errori, suggerisci 1-2 temi per migliorare ulteriormente.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo extra prima o dopo.

### STRUTTURA DELLA RISPOSTA JSON (DEVE INCLUDEERE TUTTI I CAMPI)
{
  "correctedContent": "il testo corretto con tutte le correzioni applicate",
  "grammarScore": 8.0,
  "coherenceScore": 9.0,
  "vocabularyScore": 7.5,
  "clarityScore": 8.5,
  "score": 8.2,
  "aiFeedback": "Feedback dettagliato in italiano sulla qualità del testo, punti di forza e aree di miglioramento",
  "errorAnnotations": "Lista annotata degli errori trovati con spiegazioni",
  "errors": [
    {
      "originalText": "ho andato",
      "correctedText": "sono andato",
      "type": "grammatica",
      "color": "#f97316",
      "shortReason": "Ausiliare errato",
      "explanation": "Il verbo 'andare' è un verbo di movimento e richiede l'ausiliare 'essere' anziché 'avere'.",
      "grammarRule": "I verbi di movimento come andare, venire, uscire, tornare richiedono l'ausiliare essere.",
      "suggestion": "Ricorda: quando usi verbi che indicano movimento, usa sempre 'sono' non 'ho'."
    }
  ],
  "cilsLevelAssessment": {
    "estimatedLevel": "B1",
    "passesTargetLevel": true,
    "readiness": "Il testo mostra un solido B1 con buona coerenza e lessico adeguato. Per raggiungere B2, ampliare il vocabolario e usare strutture sintattiche più complesse.",
    "targetLevelProvided": "B1"
  },
  "studyTopics": [
    {
      "topic": "Ausiliari essere e avere",
      "description": "I verbi di movimento e alcuni verbi riflessivi richiedono l'ausiliare essere anziché avere. È fondamentale conoscere la lista dei verbi che usano essere.",
      "priority": "alta",
      "resources": ["Grammatica italiana - Capitolo ausiliari", "Esercizi online su essere/avere", "Alma Edizioni - Verbi italiani"]
    },
    {
      "topic": "Accenti obbligatori",
      "description": "Alcune parole in italiano richiedono l'accento grafico obbligatorio (più, può, però, cioè, è). La mancanza dell'accento costituisce un errore ortografico.",
      "priority": "media",
      "resources": ["Regole di ortografia italiana", "Esercizi sugli accenti"]
    }
  ]
}`;

// ── Build correction prompt with optional targetLevel ────────
function buildCorrectionPrompt(title: string, content: string, topic?: string, targetLevel?: string): string {
  const targetSection = targetLevel
    ? `\nIl candidato dichiara di voler testare il livello ${targetLevel}. Valuta se lo supera.`
    : '\nNessun livello target fornito. Stima solamente il livello del testo.';

  return `Correggi e valuta il seguente testo scritto da uno studente.

TITOLO: ${title}
${topic ? `ARGOMENTO: ${topic}` : ''}
${targetSection}

TESTO DA CORREGGERE E VALUTARE:
"""
${content}
"""

Rispondi ESCLUSIVAMENTE in formato JSON con la struttura specificata nelle istruzioni. Nessun testo prima o dopo il JSON.`;
}

// ── Parse AI response into CorrectionResult ──────────────────
function parseCorrectionResponse(response: string, originalContent: string, targetLevel?: string): CorrectionResult {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Parse errors array
      const errors: ErrorItem[] = Array.isArray(parsed.errors)
        ? parsed.errors.map((e: Record<string, unknown>) => ({
            originalText: String(e.originalText || ''),
            correctedText: String(e.correctedText || ''),
            type: String(e.type || 'grammatica'),
            color: String(e.color || '#f97316'),
            shortReason: String(e.shortReason || ''),
            explanation: String(e.explanation || ''),
            grammarRule: String(e.grammarRule || ''),
            suggestion: String(e.suggestion || ''),
          }))
        : [];

      // Parse CILS level assessment
      let cilsLevelAssessment: CilsLevelAssessment | null = null;
      if (parsed.cilsLevelAssessment && typeof parsed.cilsLevelAssessment === 'object') {
        const cils = parsed.cilsLevelAssessment as Record<string, unknown>;
        const estimated = String(cils.estimatedLevel || 'A2').toUpperCase();
        cilsLevelAssessment = {
          estimatedLevel: CILS_LEVELS.includes(estimated) ? estimated : 'A2',
          passesTargetLevel: cils.passesTargetLevel === null ? null : Boolean(cils.passesTargetLevel),
          readiness: String(cils.readiness || ''),
          targetLevelProvided: targetLevel || null,
        };
      } else {
        // Even without cilsLevelAssessment in response, provide a default
        cilsLevelAssessment = {
          estimatedLevel: 'A2',
          passesTargetLevel: targetLevel ? false : null,
          readiness: 'Valutazione del livello non disponibile.',
          targetLevelProvided: targetLevel || null,
        };
      }

      // Parse study topics
      const studyTopics: StudyTopic[] = Array.isArray(parsed.studyTopics)
        ? parsed.studyTopics
          .filter((t: unknown) => t && typeof t === 'object')
          .map((t: Record<string, unknown>) => ({
            topic: String(t.topic || 'Argomento non specificato'),
            description: String(t.description || ''),
            priority: (['alta', 'media', 'bassa'].includes(String(t.priority)) ? String(t.priority) : 'media') as 'alta' | 'media' | 'bassa',
            resources: Array.isArray(t.resources) ? t.resources.map((r: unknown) => String(r)) : [],
          }))
        : [];

      return {
        correctedContent: parsed.correctedContent || originalContent,
        score: Math.min(10, Math.max(1, Number(parsed.score) || 5)),
        grammarScore: Math.min(10, Math.max(1, Number(parsed.grammarScore) || 5)),
        coherenceScore: Math.min(10, Math.max(1, Number(parsed.coherenceScore) || 5)),
        vocabularyScore: Math.min(10, Math.max(1, Number(parsed.vocabularyScore) || 5)),
        clarityScore: Math.min(10, Math.max(1, Number(parsed.clarityScore) || 5)),
        aiFeedback: parsed.aiFeedback || '',
        errorAnnotations: parsed.errorAnnotations || '',
        errors,
        cilsLevelAssessment,
        studyTopics,
      };
    }
  } catch (e) {
    console.error('[ScribIA AI] Failed to parse AI response as JSON:', e);
  }

  // Default study topics fallback based on generic grammar areas
  const defaultStudyTopics: StudyTopic[] = [
    {
      topic: 'Grammatica italiana di base',
      description: 'Rivedi le regole fondamentali della grammatica italiana, inclusi ausiliari, concordanze e strutture verbali.',
      priority: 'media',
      resources: ['Grammatica italiana per stranieri', 'Esercizi interattivi online'],
    },
  ];

  // Fallback
  return {
    correctedContent: originalContent,
    score: 5,
    grammarScore: 5,
    coherenceScore: 5,
    vocabularyScore: 5,
    clarityScore: 5,
    aiFeedback: response || 'Impossibile generare il feedback.',
    errorAnnotations: '',
    errors: [],
    cilsLevelAssessment: {
      estimatedLevel: 'A2',
      passesTargetLevel: targetLevel ? false : null,
      readiness: 'Valutazione del livello non disponibile.',
      targetLevelProvided: targetLevel || null,
    },
    studyTopics: defaultStudyTopics,
  };
}

// ── Correct essay via Gemini ─────────────────────────────────
async function correctEssayGemini(title: string, content: string, topic?: string, targetLevel?: string): Promise<CorrectionResult> {
  const ai = await getGemini();
  const prompt = buildCorrectionPrompt(title, content, topic, targetLevel);

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-lite',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT_CORRECTION,
      temperature: 1.0,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });

  const text = response.text || '';
  return parseCorrectionResponse(text, content, targetLevel);
}

// ── Correct essay via z-ai-web-dev-sdk ───────────────────────
async function correctEssayZAI(title: string, content: string, topic?: string, targetLevel?: string): Promise<CorrectionResult> {
  const zai = await getZAI();
  if (!zai) {
    throw new Error('z-ai-web-dev-sdk not available. Set GEMINI_API_KEY for production.');
  }
  const prompt = buildCorrectionPrompt(title, content, topic, targetLevel);

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_CORRECTION },
      { role: 'user', content: prompt }
    ],
    thinking: { type: 'disabled' }
  });

  const response = completion.choices[0]?.message?.content || '';
  return parseCorrectionResponse(response, content, targetLevel);
}

// ── Simulated correction for demo/fallback mode ─────────────
function correctEssaySimulated(
  title: string,
  content: string,
  topic?: string,
  targetLevel?: string
): CorrectionResult {

  // Simple error detection heuristics for Italian
  const errors: ErrorItem[] = [];
  const corrections: [string, string][] = [];

  // Common Italian errors patterns
  const patterns: [RegExp, string, string, string][] = [
    [/\bho andato\b/g, 'sono andato', 'grammatica', '#f97316'],
    [/\bho venuto\b/g, 'sono venuto', 'grammatica', '#f97316'],
    [/\bho uscito\b/g, 'sono uscito', 'grammatica', '#f97316'],
    [/\bho tornato\b/g, 'sono tornato', 'grammatica', '#f97316'],
    [/\bho arrivato\b/g, 'sono arrivato', 'grammatica', '#f97316'],
    [/\bho partito\b/g, 'sono partito', 'grammatica', '#f97316'],
    [/\bho andata\b/g, 'sono andata', 'grammatica', '#f97316'],
    [/\bperché\s+che\b/gi, 'perché', 'grammatica', '#f97316'],
    [/\bpiu\b/g, 'più', 'ortografia', '#ef4444'],
    [/\bpuo\b/g, 'può', 'ortografia', '#ef4444'],
    [/\bquesto\s+le\b/gi, 'queste le', 'grammatica', '#f97316'],
    [/\bun\s+università\b/gi, "un'università", 'grammatica', '#f97316'],
    [/\b lo gli\b/gi, ' gli', 'grammatica', '#f97316'],
  ];

  let correctedContent = content;
  for (const [pattern, replacement, type, color] of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        const typeLabels: Record<string, string> = {
          grammatica: 'Errore grammaticale',
          ortografia: 'Errore ortografico',
          punteggiatura: 'Errore di punteggiatura',
          sintassi: 'Errore sintattico',
          lessico: 'Errore lessicale',
          coerenza: 'Problema di coerenza',
        };
        const rules: Record<string, string> = {
          grammatica: 'I verbi di movimento richiedono l\'ausiliare "essere" anziché "avere".',
          ortografia: 'Le parole con accento devono essere scritte correttamente.',
          punteggiatura: 'La punteggiatura corretta è essenziale per la chiarezza del testo.',
          sintassi: 'La struttura della frase deve rispettare l\'ordine italiano SVO.',
          lessico: 'Scegli il vocabolo più appropriato al contesto.',
          coerenza: 'Assicurati che le idee siano collegate logicamente.',
        };
        const suggestions: Record<string, string> = {
          grammatica: 'Ricorda: i verbi di movimento (andare, venire, uscire, tornare, arrivare, partire) usano "sono".',
          ortografia: 'Fai attenzione agli accenti obbligatori in italiano: più, può, però, cioè, è.',
          punteggiatura: 'Rileggi ad alta voce per verificare le pause naturali.',
          sintassi: 'Riscrivi la frase in modo più semplice e diretto.',
          lessico: 'Usa un dizionario dei sinonimi per trovare la parola giusta.',
          coerenza: 'Usa connettivi come "inoltre", "tuttavia", "di conseguenza" per collegare le idee.',
        };
        errors.push({
          originalText: match.trim(),
          correctedText: replacement,
          type,
          color,
          shortReason: typeLabels[type] || 'Errore',
          explanation: `"${match.trim()}" dovrebbe essere "${replacement}".`,
          grammarRule: rules[type] || '',
          suggestion: suggestions[type] || '',
        });
        corrections.push([match, replacement]);
      }
      correctedContent = correctedContent.replace(pattern, replacement);
    }
  }

  // Estimate scores based on content length and errors
  const wordCount = content.trim().split(/\s+/).length;
  const errorRate = errors.length / Math.max(wordCount / 20, 1); // errors per ~20 words

  const grammarScore = Math.min(10, Math.max(1, Math.round((9 - errorRate * 2) * 10) / 10));
  const coherenceScore = Math.min(10, Math.max(1, Math.round((8.5 - errorRate) * 10) / 10));
  const vocabularyScore = Math.min(10, Math.max(1, Math.round((7.5 + Math.min(wordCount / 100, 1.5) - errorRate) * 10) / 10));
  const clarityScore = Math.min(10, Math.max(1, Math.round((8 - errorRate * 0.5) * 10) / 10));
  const score = Math.round(((grammarScore + coherenceScore + vocabularyScore + clarityScore) / 4) * 10) / 10;

  // Estimate CILS level based on scores and content complexity
  let estimatedLevel = 'A2';
  if (score >= 9) estimatedLevel = 'C2';
  else if (score >= 8) estimatedLevel = 'C1';
  else if (score >= 7) estimatedLevel = 'B2';
  else if (score >= 6) estimatedLevel = 'B1';
  else if (score >= 4) estimatedLevel = 'A2';
  else estimatedLevel = 'A1';

  // If longer text with complex sentences, bump up
  if (wordCount > 150 && estimatedLevel === 'A2') estimatedLevel = 'B1';
  if (wordCount > 250 && estimatedLevel === 'B1') estimatedLevel = 'B2';

  const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const estimatedIdx = levelOrder.indexOf(estimatedLevel);
  const targetIdx = targetLevel ? levelOrder.indexOf(targetLevel) : -1;
  const passesTargetLevel = targetLevel ? estimatedIdx >= targetIdx : null;

  const readinessTexts: Record<string, string> = {
    A1: 'Il testo dimostra competenze di base. Per progredire, ampliare il vocabolario e praticare frasi più articolate.',
    A2: 'Il testo mostra un livello A2 solido con frasi semplici ma generalmente corrette. Per raggiungere B1, ampliare il vocabolario e usare strutture sintattiche più variate.',
    B1: 'Buona padronanza delle strutture intermedie. Per raggiungere B2, variare il lessico e introdurre subordinate più complesse.',
    B2: 'Testo ben strutturato con buon lessico. Per C1, perfezionare l\'uso dei connettivi e delle sfumature stilistiche.',
    C1: 'Eccellente padronanza linguistica. Per C2, affinare la precisione stilistica e l\'originalità espressiva.',
    C2: 'Padronanza pressoché nativa della lingua italiana. Mantenere la pratica con testi complessi e specialistici.',
  };

  const feedbackParts: string[] = [];
  if (errors.length > 0) {
    feedbackParts.push(`Sono stati trovati ${errors.length} ${errors.length === 1 ? 'errore' : 'errori'} nel testo.`);
    feedbackParts.push(errors.length <= 3
      ? 'Gli errori sono pochi e il testo è generalmente ben scritto.'
      : 'Ci sono diversi errori su cui lavorare.'
    );
  } else {
    feedbackParts.push('Nessun errore significativo trovato nel testo.');
  }
  feedbackParts.push(`Il livello stimato è ${estimatedLevel}.`);
  if (targetLevel) {
    feedbackParts.push(passesTargetLevel
      ? `Il testo supera il livello target ${targetLevel}.`
      : `Il testo non raggiunge ancora il livello ${targetLevel}. Serve più pratica.`
    );
  }

  // Generate study topics from detected error types
  const errorTypes = new Set(errors.map(e => e.type));
  const studyTopics: StudyTopic[] = [];

  const topicMap: Record<string, StudyTopic> = {
    grammatica: {
      topic: 'Ausiliari essere e avere',
      description: 'I verbi di movimento (andare, venire, uscire, tornare, arrivare, partire) e i verbi riflessivi richiedono l\'ausiliare "essere" anziché "avere". Questo è uno degli errori più comuni per chi studia l\'italiano.',
      priority: 'alta',
      resources: ['Grammatica italiana - Capitolo ausiliari', 'Esercizi online su essere/avere', 'Alma Edizioni - Verbi italiani'],
    },
    ortografia: {
      topic: 'Accenti e ortografia',
      description: 'Molte parole in italiano richiedono l\'accento grafico obbligatorio (più, può, però, cioè, è). La mancanza dell\'accento costituisce un errore ortografico che può cambiare il significato della parola.',
      priority: 'alta',
      resources: ['Regole di ortografia italiana', 'Esercizi sugli accenti obbligatori', 'Zanichelli - Ortografia italiana'],
    },
    punteggiatura: {
      topic: 'Punteggiatura',
      description: 'La punteggiatura corretta è essenziale per la chiarezza del testo. Rileggi ad alta voce per verificare le pause naturali e usare virgole, punti e punto e virgola in modo appropriato.',
      priority: 'media',
      resources: ['Regole di punteggiatura italiana', 'Esercizi interattivi sulla punteggiatura'],
    },
    sintassi: {
      topic: 'Strutture sintattiche',
      description: 'La struttura della frase italiana segue l\'ordine Soggetto-Verbo-Oggetto. Le frasi subordinate e le costruzioni complesse richiedono attenzione alla concordanza e al posizionamento dei pronomi.',
      priority: 'alta',
      resources: ['Sintassi italiana - Frasi complesse', 'Esercizi sulle subordinate', 'Grammatica avanzata - Schena editore'],
    },
    lessico: {
      topic: 'Lessico e registro linguistico',
      description: 'Scegliere il vocabolo più appropriato al contesto e al registro (formale/informale) migliora la qualità del testo. Un dizionario dei sinonimi è uno strumento prezioso.',
      priority: 'media',
      resources: ['Dizionario dei sinonimi e contrari', 'Lessico italiano per stranieri', 'Esercizi sul registro linguistico'],
    },
    coerenza: {
      topic: 'Coerenza e coesione testuale',
      description: 'Un testo coerente usa connettivi appropriati (inoltre, tuttavia, di conseguenza) per collegare le idee. La progressione logica dei concetti rende la scrittura più efficace e leggibile.',
      priority: 'media',
      resources: ['Coesione e coerenza testuale', 'Esercizi sui connettivi', 'Scrittura argomentativa - Guida pratica'],
    },
  };

  for (const type of errorTypes) {
    if (topicMap[type]) {
      studyTopics.push(topicMap[type]);
    }
  }

  // If no errors found, suggest general improvement topics
  if (studyTopics.length === 0) {
    studyTopics.push({
      topic: 'Ampliamento del lessico',
      description: 'Il testo non presenta errori significativi. Per migliorare ulteriormente, amplia il vocabolario con sinonimi, espressioni idiomatiche e un registro più vario.',
      priority: 'bassa',
      resources: ['Dizionario dei sinonimi e contrari', 'Lettura di testi autentici italiani'],
    });
  }

  return {
    correctedContent,
    score,
    grammarScore,
    coherenceScore,
    vocabularyScore,
    clarityScore,
    aiFeedback: feedbackParts.join(' '),
    errorAnnotations: errors.length > 0
      ? errors.map((e, i) => `${i + 1}. "${e.originalText}" → "${e.correctedText}": ${e.shortReason}.`)
          .join(' ')
      : 'Nessun errore trovato.',
    errors,
    cilsLevelAssessment: {
      estimatedLevel,
      passesTargetLevel,
      readiness: readinessTexts[estimatedLevel] || readinessTexts.A2,
      targetLevelProvided: targetLevel || null,
    },
    studyTopics,
  };
}

// ── Main correction entry point ──────────────────────────────
export async function correctEssay(
  title: string,
  content: string,
  topic?: string,
  targetLevel?: string
): Promise<CorrectionResult> {
  // Validate targetLevel if provided
  const validatedTarget = targetLevel && isValidCilsLevel(targetLevel) ? targetLevel.toUpperCase() : undefined;

  if (useGemini) {
    try {
      return await correctEssayGemini(title, content, topic, validatedTarget);
    } catch (err) {
      console.warn('[ScribIA AI] Gemini failed, falling back to z-ai:', err);
    }
  }

  try {
    return await correctEssayZAI(title, content, topic, validatedTarget);
  } catch (err) {
    console.warn('[ScribIA AI] z-ai failed, falling back to simulated:', err);
  }

  // Final fallback: simulated correction
  return correctEssaySimulated(title, content, topic, validatedTarget);
}

// ── Shared prompt for class preparation ──────────────────────
function buildPreparationPrompt(topic: string, level: string): string {
  return `Genera una preparazione di lezione di italiano per studenti di livello ${level} sull'argomento: "${topic}".

Includi:
1. Obiettivi della lezione
2. Attività didattiche (almeno 3)
3. Esercizi pratici
4. Spunti di discussione
5. Risorse consigliate

Scrivi in italiano in formato markdown.`;
}

const SYSTEM_PROMPT_PREPARATION = 'Sei un esperto docente di lingua italiana specializzato nella pianificazione didattica. Genera preparazioni di lezione dettagliate e pratiche.';

// ── Generate class preparation via Gemini ────────────────────
async function generateClassPreparationGemini(topic: string, level: string): Promise<string> {
  const ai = await getGemini();
  const prompt = buildPreparationPrompt(topic, level);

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-lite',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT_PREPARATION,
      temperature: 1.0,
      maxOutputTokens: 4096,
    },
  });

  return response.text || 'Impossibile generare la preparazione.';
}

// ── Generate class preparation via z-ai-web-dev-sdk ──────────
async function generateClassPreparationZAI(topic: string, level: string): Promise<string> {
  const zai = await getZAI();
  if (!zai) {
    throw new Error('z-ai-web-dev-sdk not available. Set GEMINI_API_KEY for production.');
  }
  const prompt = buildPreparationPrompt(topic, level);

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_PREPARATION },
      { role: 'user', content: prompt }
    ],
    thinking: { type: 'disabled' }
  });

  return completion.choices[0]?.message?.content || 'Impossibile generare la preparazione.';
}

// ── Simulated class preparation for demo/fallback ───────────
function generateClassPreparationSimulated(topic: string, level: string): string {
  return `# Preparazione Lezione: ${topic}
**Livello:** ${level}

## 1. Obiettivi della lezione
- Comprendere e utilizzare il vocabolario relativo a "${topic}"
- Praticare le strutture grammaticali appropriate al livello ${level}
- Sviluppare competenze di comprensione e produzione scritta

## 2. Attività didattiche

### Attività 1: Brainstorming (15 min)
Gli studenti lavorano in piccoli gruppi per raccogliere parole e espressioni legate a "${topic}". Ogni gruppo presenta la propria lista alla classe.

### Attività 2: Lettura guidata (20 min)
Distribuire un testo autentico su "${topic}". Gli studenti leggono e identificano parole chiave, strutture grammaticali e connettivi.

### Attività 3: Discussione in coppia (15 min)
Gli studenti discutono in coppia del tema, usando il vocabolario e le strutture apprese.

## 3. Esercizi pratici
1. **Completamento di frasi** con vocaboli legati al tema
2. **Riscrittura** di un breve testo usando sinonimi e strutture alternative
3. **Produzione scritta** di un paragrafo su "${topic}" (80-120 parole)

## 4. Spunti di discussione
- Qual è l'importanza di "${topic}" nella vita quotidiana?
- Come cambia la percezione di "${topic}" a seconda del contesto culturale?
- Quali sono le sfide e le opportunità legate a questo argomento?

## 5. Risorse consigliate
- Testi autentici da giornali e riviste italiane
- Video educativi su "${topic}"
- Esercizi interattivi online

---
*Preparazione generata automaticamente da ScribIA*`;
}

// ── Main preparation entry point ─────────────────────────────
export async function generateClassPreparation(
  topic: string,
  level: string = 'intermedio'
): Promise<string> {
  if (useGemini) {
    try {
      return await generateClassPreparationGemini(topic, level);
    } catch (err) {
      console.warn('[ScribIA AI] Gemini failed, falling back to z-ai:', err);
    }
  }

  try {
    return await generateClassPreparationZAI(topic, level);
  } catch (err) {
    console.warn('[ScribIA AI] z-ai failed, falling back to simulated:', err);
  }

  // Final fallback: simulated preparation
  return generateClassPreparationSimulated(topic, level);
}

// ── Utility: get current AI provider name ────────────────────
export function getAIProviderName(): string {
  if (useGemini) return 'Google Gemini 2.0 Flash Lite';
  if (isServerless) return 'Simulated (no API key)';
  return 'z-ai-web-dev-sdk (sandbox)';
}
