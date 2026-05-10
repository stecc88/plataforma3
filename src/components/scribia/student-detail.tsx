'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Clock,
  TrendingUp,
  Award,
  StickyNote,
  Loader2,
  CheckCircle2,
  Lightbulb,
  Target,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Flame,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore, type Essay, type TeacherNote, type StudyTopic } from '@/store/app-store';
import { apiFetch } from './api-fetch';
import { AnimatedCounter } from './animated-counter';
import { ScoreTrendChart, ScoreRadarChart } from './stats-charts';
import { toast } from 'sonner';

// ─── CILS Level badge colors ────────────────────────────────
const CILS_COLORS: Record<string, string> = {
  A1: 'bg-gray-100 text-gray-700 border-gray-200',
  A2: 'bg-blue-100 text-blue-700 border-blue-200',
  B1: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  B2: 'bg-amber-100 text-amber-700 border-amber-200',
  C1: 'bg-orange-100 text-orange-700 border-orange-200',
  C2: 'bg-rose-100 text-rose-700 border-rose-200',
};

export function StudentDetail() {
  const { essays, students, selectedStudentId, setCurrentEssay, setCurrentView, teacherNotes, setTeacherNotes } = useAppStore();

  // Find the selected student by ID
  const student = students.find(s => s.id === selectedStudentId) || students[0];
  const studentEssays = useMemo(
    () => essays
      .filter((e) => e.studentId === student?.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [essays, student]
  );

  const correctedEssays = useMemo(
    () => studentEssays.filter((e) => e.status === 'CORRECTED' && e.score != null),
    [studentEssays]
  );

  const avgScore = useMemo(
    () => correctedEssays.length ? correctedEssays.reduce((s, e) => s + (e.score ?? 0), 0) / correctedEssays.length : 0,
    [correctedEssays]
  );
  const bestScore = useMemo(
    () => correctedEssays.length ? Math.max(...correctedEssays.map((e) => e.score ?? 0)) : 0,
    [correctedEssays]
  );
  const avgGrammar = useMemo(() => correctedEssays.length ? correctedEssays.reduce((s, e) => s + (e.grammarScore ?? 0), 0) / correctedEssays.length : 0, [correctedEssays]);
  const avgCoherence = useMemo(() => correctedEssays.length ? correctedEssays.reduce((s, e) => s + (e.coherenceScore ?? 0), 0) / correctedEssays.length : 0, [correctedEssays]);
  const avgVocabulary = useMemo(() => correctedEssays.length ? correctedEssays.reduce((s, e) => s + (e.vocabularyScore ?? 0), 0) / correctedEssays.length : 0, [correctedEssays]);
  const avgClarity = useMemo(() => correctedEssays.length ? correctedEssays.reduce((s, e) => s + (e.clarityScore ?? 0), 0) / correctedEssays.length : 0, [correctedEssays]);

  const trendData = useMemo(
    () => correctedEssays
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((e) => ({
        date: new Date(e.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
        punteggio: e.score!,
      })),
    [correctedEssays]
  );

  // ─── Improvement suggestions computations ────────────────
  const skillScores = useMemo(() => {
    if (correctedEssays.length === 0) return null;
    return [
      { name: 'Grammatica', key: 'grammar', score: avgGrammar, color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200' },
      { name: 'Coerenza', key: 'coherence', score: avgCoherence, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
      { name: 'Vocabolario', key: 'vocabulary', score: avgVocabulary, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
      { name: 'Chiarezza', key: 'clarity', score: avgClarity, color: 'text-violet-600', bg: 'bg-violet-100', border: 'border-violet-200' },
    ].sort((a, b) => a.score - b.score);
  }, [correctedEssays, avgGrammar, avgCoherence, avgVocabulary, avgClarity]);

  const errorTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const typeLabels: Record<string, string> = {
      ortografia: 'Ortografia',
      grammatica: 'Grammatica',
      punteggiatura: 'Punteggiatura',
      sintassi: 'Sintassi',
      lessico: 'Lessico',
      coerenza: 'Coerenza',
    };
    for (const essay of correctedEssays) {
      if (Array.isArray(essay.errors)) {
        for (const err of essay.errors) {
          const rawType = typeof err === 'object' && err !== null && 'type' in err ? String((err as Record<string, unknown>).type) : 'sconosciuto';
          const label = typeLabels[rawType] || rawType;
          counts[label] = (counts[label] || 0) + 1;
        }
      }
    }
    return counts;
  }, [correctedEssays]);

  const mostCommonErrorType = useMemo(() => {
    const entries = Object.entries(errorTypeCounts);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0];
  }, [errorTypeCounts]);

  const totalErrors = useMemo(() => {
    return Object.values(errorTypeCounts).reduce((sum, c) => sum + c, 0);
  }, [errorTypeCounts]);

  const estimatedCilsLevel = useMemo(() => {
    if (correctedEssays.length === 0) return null;
    // Use the most recent CILS assessment if available
    const sortedByDate = [...correctedEssays].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    for (const essay of sortedByDate) {
      if (essay.cilsLevelAssessment?.estimatedLevel) {
        return essay.cilsLevelAssessment.estimatedLevel;
      }
    }
    // Estimate from average score
    if (avgScore >= 9) return 'C2';
    if (avgScore >= 8) return 'C1';
    if (avgScore >= 7) return 'B2';
    if (avgScore >= 6) return 'B1';
    if (avgScore >= 4) return 'A2';
    return 'A1';
  }, [correctedEssays, avgScore]);

  const targetCilsLevel = useMemo(() => {
    if (!estimatedCilsLevel) return null;
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const currentIdx = levels.indexOf(estimatedCilsLevel);
    if (currentIdx < levels.length - 1) {
      return levels[currentIdx + 1];
    }
    return 'C2';
  }, [estimatedCilsLevel]);

  const improvementSuggestions = useMemo(() => {
    if (!skillScores || correctedEssays.length === 0) return [];
    const suggestions: { icon: React.ReactNode; text: string }[] = [];
    const weakest = skillScores[0];
    const secondWeakest = skillScores[1];

    // Suggestion based on weakest skill
    const skillSuggestions: Record<string, string> = {
      grammar: 'Concentrarsi sulla grammatica: rivedere le regole di concordanza, i tempi verbali e l\'uso degli ausiliari essere/avere. Esercizi mirati sono consigliati.',
      coherence: 'Lavorare sulla coerenza: utilizzare connettivi logici (inoltre, tuttavia, di conseguenza, nonostante) per collegare meglio le idee tra paragrafi.',
      vocabulary: 'Ampliare il vocabolario: leggere testi autentici in italiano e annotare parole nuove. Usare sinonimi per evitare ripetizioni nello scritto.',
      clarity: 'Migliorare la chiarezza: strutturare frasi più brevi e dirette. Evitare subordinate annidate e preferire un soggetto esplicito.',
    };
    suggestions.push({
      icon: <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />,
      text: skillSuggestions[weakest.key] || 'Continuare a esercitarsi regolarmente.',
    });

    // Suggestion based on second weakest skill (if notably weak)
    if (secondWeakest.score < 7) {
      const secondSuggestions: Record<string, string> = {
        grammar: 'Anche la grammatica necessita attenzione: dedicare 10 minuti al giorno a esercizi di completamento e trasformazione di frasi.',
        coherence: 'La coerenza può migliorare: pianificare un breve schema prima di scrivere, con le idee principali in ordine logico.',
        vocabulary: 'Il lessico è un\'area da rafforzare: creare schede con parole nuove e usarle nei prossimi testi.',
        clarity: 'La chiarezza può migliorare: dopo aver scritto, rileggere ad alta voce per verificare che ogni frase sia comprensibile.',
      };
      suggestions.push({
        icon: <BookOpen className="h-4 w-4 text-amber-500 shrink-0" />,
        text: secondSuggestions[secondWeakest.key] || 'Continuare a esercitarsi.',
      });
    }

    // Suggestion based on most common error type
    if (mostCommonErrorType) {
      const errorSuggestions: Record<string, string> = {
        Ortografia: 'Gli errori di ortografia sono i più frequenti: prestare attenzione agli accenti obbligatori (è, più, può, perché) e al raddoppiamento (gn, gl, sc).',
        Grammatica: 'Gli errori grammaticali sono predominanti: rivedere la concordanza soggetto-verbo, l\'uso degli articoli e la concordanza genere/numero.',
        Punteggiatura: 'La punteggiatura è un punto debole: ricordare che le virgole separano le proposizioni coordinate e il punto e virgola collega frasi correlate.',
        Sintassi: 'La struttura sintattica richiede lavoro: provare a semplificare le frasi troppo lunghe e a variare l\'ordine degli elementi.',
        Lessico: 'Gli errori lessicali sono frequenti: verificare sempre il significato delle parole nei dizionari monolingue italiani.',
        Coerenza: 'I problemi di coerenza sono ricorrenti: assicurarsi che ogni paragrafo sviluppi un\'idea principale collegata alla tesi.',
      };
      const suggestion = errorSuggestions[mostCommonErrorType[0]];
      if (suggestion) {
        suggestions.push({
          icon: <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0" />,
          text: suggestion,
        });
      }
    }

    // Suggestion about score trend
    if (correctedEssays.length >= 3) {
      const sortedByDate = [...correctedEssays].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const recent3 = sortedByDate.slice(-3);
      const olderEssays = sortedByDate.slice(0, -3);
      if (olderEssays.length > 0) {
        const recentAvg = recent3.reduce((s, e) => s + (e.score ?? 0), 0) / recent3.length;
        const olderAvg = olderEssays.reduce((s, e) => s + (e.score ?? 0), 0) / olderEssays.length;
        if (recentAvg > olderAvg) {
          suggestions.push({
            icon: <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />,
            text: 'Ottimo trend! I punteggi dello studente stanno migliorando. Continuare con costanza e proporre testi più lunghi e articolati.',
          });
        } else if (recentAvg < olderAvg) {
          suggestions.push({
            icon: <TrendingUp className="h-4 w-4 text-rose-500 shrink-0" />,
            text: 'I punteggi recenti sono in calo: incoraggiare lo studente a scrivere con più calma, pianificando prima il contenuto.',
          });
        }
      }
    }

    // CILS target suggestion
    if (targetCilsLevel && estimatedCilsLevel && targetCilsLevel !== estimatedCilsLevel) {
      suggestions.push({
        icon: <Target className="h-4 w-4 text-violet-500 shrink-0" />,
        text: `L'obiettivo dello studente dovrebbe essere il livello ${targetCilsLevel} CILS. Concentrarsi sulle aree deboli e praticare con esercizi specifici per quel livello.`,
      });
    }

    // Cap at 5 suggestions
    return suggestions.slice(0, 5);
  }, [skillScores, correctedEssays, mostCommonErrorType, targetCilsLevel, estimatedCilsLevel]);

  const aggregateStudyTopics = useMemo(() => {
    const topicMap: Record<string, { topic: string; description: string; priority: string; count: number; resources: string[] }> = {};
    for (const essay of correctedEssays) {
      if (Array.isArray(essay.studyTopics)) {
        for (const st of essay.studyTopics) {
          const studyTopic = st as StudyTopic;
          const key = studyTopic.topic;
          if (!topicMap[key]) {
            topicMap[key] = { topic: studyTopic.topic, description: studyTopic.description, priority: studyTopic.priority, count: 1, resources: [...studyTopic.resources] };
          } else {
            topicMap[key].count++;
            // Merge unique resources
            for (const res of studyTopic.resources) {
              if (!topicMap[key].resources.includes(res)) {
                topicMap[key].resources.push(res);
              }
            }
            // Keep highest priority
            const priorityOrder: Record<string, number> = { alta: 3, media: 2, bassa: 1 };
            if ((priorityOrder[studyTopic.priority] ?? 0) > (priorityOrder[topicMap[key].priority] ?? 0)) {
              topicMap[key].priority = studyTopic.priority;
            }
          }
        }
      }
    }
    return Object.values(topicMap).sort((a, b) => b.count - a.count);
  }, [correctedEssays]);

  // Teacher notes
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const studentNotes = useMemo(
    () => teacherNotes.filter((n) => n.studentId === student?.id),
    [teacherNotes, student]
  );

  const handleAddNote = async () => {
    if (!noteText.trim() || !student) return;
    setIsSavingNote(true);
    try {
      const response = await apiFetch<{ note: TeacherNote }>('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ studentId: student.id, content: noteText.trim() }),
      });
      const note = response.note;
      setTeacherNotes([note, ...teacherNotes]);
      setNoteText('');
      toast.success('Nota salvata');
    } catch (err) {
      toast.error('Errore', { description: err instanceof Error ? err.message : 'Impossibile salvare la nota' });
    } finally {
      setIsSavingNote(false);
    }
  };

  if (!student) {
    return (
      <div className="text-center py-16 text-amber-600/50">
        <p>Nessuno studente selezionato</p>
        <Button
          variant="outline"
          onClick={() => setCurrentView('teacher-dashboard')}
          className="mt-4 border-amber-200 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna al cruscotto
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => setCurrentView('teacher-dashboard')}
          className="text-amber-700 hover:bg-amber-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Button>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-amber-200">
            <AvatarFallback className="bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 font-bold">
              {student.name?.charAt(0)?.toUpperCase() || 'S'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold text-amber-900">{student.name}</h2>
            <p className="text-sm text-amber-600/60">{student.email}</p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-amber-100 bg-white transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-900">
                    <AnimatedCounter value={studentEssays.length} duration={600} decimals={0} />
                  </p>
                  <p className="text-xs text-amber-600/60">Testi totali</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="border-amber-100 bg-white transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-900">
                    {correctedEssays.length > 0 ? <AnimatedCounter value={avgScore} duration={800} /> : '—'}
                  </p>
                  <p className="text-xs text-amber-600/60">Punteggio medio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <Card className="border-amber-100 bg-white transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100">
                  <Award className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-900">
                    {correctedEssays.length > 0 ? <AnimatedCounter value={bestScore} duration={800} /> : '—'}
                  </p>
                  <p className="text-xs text-amber-600/60">Miglior punteggio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <Card className="border-amber-100 bg-white transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-100">
                  <CheckCircle2 className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-900">
                    <AnimatedCounter value={correctedEssays.length} duration={600} decimals={0} />
                  </p>
                  <p className="text-xs text-amber-600/60">Testi corretti</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-amber-100 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900">Evoluzione punteggi</CardTitle>
            <CardDescription>Progressione dello studente</CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreTrendChart data={trendData} />
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900">Profilo di competenza</CardTitle>
            <CardDescription>Media delle abilità</CardDescription>
          </CardHeader>
          <CardContent>
            {correctedEssays.length > 0 ? (
              <ScoreRadarChart
                grammar={avgGrammar}
                coherence={avgCoherence}
                vocabulary={avgVocabulary}
                clarity={avgClarity}
              />
            ) : (
              <div className="flex items-center justify-center h-[200px] text-amber-600/50 text-sm">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Suggerimenti di miglioramento ──────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-amber-100 bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Suggerimenti di miglioramento
            </CardTitle>
            <CardDescription>Analisi personalizzata basata sui testi dello studente</CardDescription>
          </CardHeader>
          <CardContent>
            {correctedEssays.length === 0 ? (
              <div className="text-center py-8 text-amber-600/50">
                <Lightbulb className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nessun testo corretto ancora. I suggerimenti appariranno dopo la prima correzione.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Weakest skill area */}
                {skillScores && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                      Area più debole
                    </h4>
                    <div className="grid gap-2">
                      {skillScores.map((skill, idx) => (
                        <div key={skill.key} className="flex items-center gap-3">
                          <span className={`text-xs font-medium w-20 ${idx === 0 ? 'text-orange-700' : 'text-amber-700/70'}`}>
                            {skill.name}
                          </span>
                          <div className="flex-1">
                            <Progress
                              value={skill.score * 10}
                              className={`h-2 ${idx === 0 ? '[&>[data-slot=progress-indicator]]:bg-orange-400' : '[&>[data-slot=progress-indicator]]:bg-amber-300'}`}
                            />
                          </div>
                          <span className={`text-xs font-bold w-8 text-right ${idx === 0 ? 'text-orange-600' : 'text-amber-600/60'}`}>
                            {skill.score.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {skillScores[0].name}
                      </Badge>
                      <span className="text-xs text-amber-600/70">è l&apos;area che richiede più attenzione</span>
                    </div>
                  </div>
                )}

                {/* Most common error type */}
                {mostCommonErrorType && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-yellow-500" />
                      Errore più frequente
                    </h4>
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-rose-100 text-rose-700 border-rose-200">
                          {mostCommonErrorType[0]}
                        </Badge>
                        <span className="text-xs text-amber-700">
                          {mostCommonErrorType[1]} {mostCommonErrorType[1] === 1 ? 'errore' : 'errori'} su {totalErrors} totali
                        </span>
                      </div>
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {Object.entries(errorTypeCounts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([type, count]) => {
                            const pct = totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0;
                            return (
                              <div
                                key={type}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-amber-200 text-[10px]"
                              >
                                <span className="font-medium text-amber-800">{type}</span>
                                <span className="text-amber-500">{pct}%</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}

                {/* CILS level target */}
                {estimatedCilsLevel && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-violet-500" />
                      Obiettivo CILS
                    </h4>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-violet-50 to-amber-50 border border-violet-100">
                      <Badge className={CILS_COLORS[estimatedCilsLevel] || CILS_COLORS.A2}>
                        <Award className="h-3 w-3 mr-1" />
                        {estimatedCilsLevel}
                      </Badge>
                      <Flame className="h-4 w-4 text-amber-400" />
                      <Badge className={CILS_COLORS[targetCilsLevel || estimatedCilsLevel] || CILS_COLORS.A2}>
                        <Target className="h-3 w-3 mr-1" />
                        {targetCilsLevel || estimatedCilsLevel}
                      </Badge>
                      <span className="text-xs text-amber-600/70 ml-1">
                        {targetCilsLevel && targetCilsLevel !== estimatedCilsLevel
                          ? `Prossimo obiettivo: livello ${targetCilsLevel}`
                          : 'Livello massimo raggiunto!'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Practical suggestions */}
                {improvementSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Suggerimenti pratici
                    </h4>
                    <div className="space-y-2">
                      {improvementSuggestions.map((suggestion, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * idx }}
                          className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50/80 border border-amber-100 hover:bg-amber-50 transition-colors"
                        >
                          <div className="mt-0.5">{suggestion.icon}</div>
                          <p className="text-xs text-amber-800 leading-relaxed">{suggestion.text}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aggregate study topics */}
                {aggregateStudyTopics.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-teal-500" />
                      Argomenti di studio consolidati
                    </h4>
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {aggregateStudyTopics.map((topic, idx) => (
                        <motion.div
                          key={topic.topic}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 * idx }}
                          className="p-3 rounded-lg bg-white border border-amber-100 hover:border-amber-200 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-amber-900">{topic.topic}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {topic.count > 1 && (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">
                                  {topic.count} testi
                                </Badge>
                              )}
                              <Badge
                                className={
                                  topic.priority === 'alta'
                                    ? 'bg-rose-100 text-rose-700 border-rose-200 text-[10px] px-1.5 py-0'
                                    : topic.priority === 'media'
                                    ? 'bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0'
                                    : 'bg-gray-100 text-gray-600 border-gray-200 text-[10px] px-1.5 py-0'
                                }
                              >
                                {topic.priority === 'alta' ? 'Alta' : topic.priority === 'media' ? 'Media' : 'Bassa'}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-[11px] text-amber-700/80 mt-1 leading-relaxed">{topic.description}</p>
                          {topic.resources.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <ExternalLink className="h-3 w-3 text-amber-500/60 shrink-0" />
                              {topic.resources.slice(0, 3).map((res, rIdx) => (
                                <span
                                  key={rIdx}
                                  className="text-[10px] text-amber-600/70 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100"
                                >
                                  {res}
                                </span>
                              ))}
                              {topic.resources.length > 3 && (
                                <span className="text-[10px] text-amber-500/50">+{topic.resources.length - 3} altri</span>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Essay list */}
      <Card className="border-amber-100 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-amber-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-500" />
            Testi dello studente
          </CardTitle>
          <CardDescription>{studentEssays.length} testo{studentEssays.length !== 1 ? 'i' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          {studentEssays.length === 0 ? (
            <div className="text-center py-8 text-amber-600/50">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nessun testo ancora</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {studentEssays.map((essay) => (
                <button
                  key={essay.id}
                  onClick={() => {
                    setCurrentEssay(essay);
                    setCurrentView('essay-detail');
                  }}
                  className="flex items-center gap-3 w-full p-3 rounded-lg border border-amber-100 hover:bg-amber-50 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 text-left group active:scale-[0.99]"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-100 group-hover:bg-amber-200 transition-colors shrink-0">
                    <FileText className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-900 truncate">{essay.title}</p>
                    <p className="text-xs text-amber-600/50 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(essay.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {essay.cilsLevelAssessment && (
                      <Badge className={CILS_COLORS[essay.cilsLevelAssessment.estimatedLevel] || CILS_COLORS.A2}>
                        <Award className="h-3 w-3 mr-0.5" />
                        {essay.cilsLevelAssessment.estimatedLevel}
                      </Badge>
                    )}
                    {essay.score != null && (
                      <span className="text-sm font-semibold text-amber-700">{essay.score.toFixed(1)}</span>
                    )}
                    <Badge
                      variant={essay.status === 'CORRECTED' ? 'default' : 'secondary'}
                      className={
                        essay.status === 'CORRECTED'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-amber-100 text-amber-700 border-amber-200'
                      }
                    >
                      {essay.status === 'CORRECTED' ? 'Corretto' : 'Inviato'}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teacher notes */}
      <Card className="border-amber-100 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-amber-900 flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-amber-500" />
            Note sullo studente
          </CardTitle>
          <CardDescription>{studentNotes.length} nota{studentNotes.length !== 1 ? 'e' : ''}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Aggiungi una nota su questo studente..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="border-amber-200 focus:border-amber-500 min-h-[80px] transition-colors duration-300"
            />
          </div>
          <Button
            onClick={handleAddNote}
            disabled={isSavingNote || !noteText.trim()}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white btn-shimmer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSavingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <StickyNote className="h-4 w-4" />}
            Salva nota
          </Button>

          {studentNotes.length > 0 && (
            <div className="space-y-2 pt-2">
              {studentNotes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-amber-50 border border-amber-100"
                >
                  <p className="text-sm text-amber-800 leading-relaxed">{note.content}</p>
                  <p className="text-[10px] text-amber-500/60 mt-2">
                    {new Date(note.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
