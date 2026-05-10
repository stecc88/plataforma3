'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  User as UserIcon,
  Mail,
  GraduationCap,
  Building2,
  Copy,
  Check,
  Link2,
  Loader2,
  Users,
  FileText,
  TrendingUp,
  Award,
  Trophy,
  Clock,
  QrCode,
  Lightbulb,
  Target,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAppStore, type Enrollment, type Essay } from '@/store/app-store';
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

const ESSAYS_PER_PAGE = 5;

export function ProfileSection() {
  const { user, essays, enrollments, setEnrollments, students, setCurrentEssay, setCurrentView, setSelectedStudentId } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [essayPage, setEssayPage] = useState(1);
  const [detailEssay, setDetailEssay] = useState<Essay | null>(null);
  const [systemStatus, setSystemStatus] = useState<{ database: string; aiProvider: string } | null>(null);

  // Load system status
  useEffect(() => {
    async function loadStatus() {
      try {
        const data = await apiFetch<{ status: { database: string; aiProvider: string } }>('/api/status');
        setSystemStatus(data.status);
      } catch {
        // Keep null — will show fallback
      }
    }
    loadStatus();
  }, []);

  // Load enrollments on mount
  useEffect(() => {
    async function loadEnrollments() {
      try {
        const data = await apiFetch<{ enrollments: Enrollment[] }>('/api/enrollments');
        setEnrollments(data.enrollments);
      } catch {
        // Use store data
      }
    }
    loadEnrollments();
  }, [setEnrollments]);

  // Student stats
  const correctedEssays = useMemo(
    () => essays.filter((e) => e.status === 'CORRECTED' && e.score != null),
    [essays]
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
      grammar: 'Concentrati sulla grammatica: rivedi le regole di concordanza, i tempi verbali e l\'uso degli ausiliari essere/avere. Esercitati con frasi mirate.',
      coherence: 'Lavora sulla coerenza: usa connettivi logici (inoltre, tuttavia, di conseguenza, nonostante) per collegare meglio le idee tra paragrafi.',
      vocabulary: 'Amplia il vocabolario: leggi testi autentici in italiano e annota parole nuove. Usa sinonimi per evitare ripetizioni nello scritto.',
      clarity: 'Migliora la chiarezza: struttura frasi più brevi e dirette. Evita subordinate annidate e preferisci un soggetto esplicito.',
    };
    suggestions.push({
      icon: <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />,
      text: skillSuggestions[weakest.key] || 'Continua a esercitarti regolarmente.',
    });

    // Suggestion based on second weakest skill (if notably weak)
    if (secondWeakest.score < 7) {
      const secondSuggestions: Record<string, string> = {
        grammar: 'Anche la grammatica necessita attenzione: dedica 10 minuti al giorno a esercizi di completamento e trasformazione di frasi.',
        coherence: 'La coerenza può migliorare: pianifica un breve schema prima di scrivere, con le idee principali in ordine logico.',
        vocabulary: 'Il lessico è un\'area da rafforzare: crea schede con parole nuove e usale nei prossimi testi.',
        clarity: 'La chiarezza può migliorare: dopo aver scritto, rileggi ad alta voce per verificare che ogni frase sia comprensibile.',
      };
      suggestions.push({
        icon: <BookOpen className="h-4 w-4 text-amber-500 shrink-0" />,
        text: secondSuggestions[secondWeakest.key] || 'Continua a esercitarti.',
      });
    }

    // Suggestion based on most common error type
    if (mostCommonErrorType) {
      const errorSuggestions: Record<string, string> = {
        Ortografia: 'Gli errori di ortografia sono i più frequenti: presta attenzione agli accenti obbligatori (è, più, può, perché) e al raddoppiamento (gn, gl, sc).',
        Grammatica: 'Gli errori grammaticali sono predominanti: rivedi la concordanza soggetto-verbo, l\'uso degli articoli e la concordanza genere/numero.',
        Punteggiatura: 'La punteggiatura è un punto debole: ricorda che le virgole separano le proposizioni coordinate e il punto e virgola collega frasi correlate.',
        Sintassi: 'La struttura sintattica richiede lavoro: prova a semplificare le frasi troppo lunghe e a variare l\'ordine degli elementi.',
        Lessico: 'Gli errori lessicali sono frequenti: verifica sempre il significato delle parole nei dizionari monolingue italiani.',
        Coerenza: 'I problemi di coerenza sono ricorrenti: assicurati che ogni paragrafo sviluppi un\'idea principale collegata alla tesi.',
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
      const recent3 = correctedEssays.slice(-3);
      const olderScores = correctedEssays.slice(0, -3);
      if (olderScores.length > 0) {
        const recentAvg = recent3.reduce((s, e) => s + (e.score ?? 0), 0) / recent3.length;
        const olderAvg = olderScores.reduce((s, e) => s + (e.score ?? 0), 0) / olderScores.length;
        if (recentAvg > olderAvg) {
          suggestions.push({
            icon: <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />,
            text: 'Ottimo trend! I tuoi punteggi stanno migliorando. Continua con costanza e prova a scrivere testi più lunghi e articolati.',
          });
        } else if (recentAvg < olderAvg) {
          suggestions.push({
            icon: <TrendingUp className="h-4 w-4 text-rose-500 shrink-0" />,
            text: 'I punteggi recenti sono in calo: non scoraggiarti. Prova a scrivere con più calma, pianificando prima il contenuto.',
          });
        }
      }
    }

    // CILS target suggestion
    if (targetCilsLevel && estimatedCilsLevel && targetCilsLevel !== estimatedCilsLevel) {
      suggestions.push({
        icon: <Target className="h-4 w-4 text-violet-500 shrink-0" />,
        text: `Il tuo obiettivo dovrebbe essere il livello ${targetCilsLevel} CILS. Concentrati sulle aree deboli e pratica con esercizi specifici per quel livello.`,
      });
    }

    // Cap at 5 suggestions
    return suggestions.slice(0, 5);
  }, [skillScores, correctedEssays, mostCommonErrorType, targetCilsLevel, estimatedCilsLevel]);

  const trendData = useMemo(
    () => correctedEssays
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((e) => ({
        date: new Date(e.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
        punteggio: e.score!,
      })),
    [correctedEssays]
  );

  // Essay history with pagination
  const sortedEssays = useMemo(
    () => [...essays].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [essays]
  );
  const totalPages = Math.ceil(sortedEssays.length / ESSAYS_PER_PAGE);
  const paginatedEssays = sortedEssays.slice((essayPage - 1) * ESSAYS_PER_PAGE, essayPage * ESSAYS_PER_PAGE);

  const handleCopyCode = async () => {
    if (!user?.teacherCode) return;
    try {
      await navigator.clipboard.writeText(user.teacherCode);
      setCopied(true);
      toast.success('Codice copiato', { description: 'Il codice docente è stato copiato negli appunti.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Errore', { description: 'Impossibile copiare il codice' });
    }
  };

  const handleJoinTeacher = async () => {
    if (!joinCode.trim()) return;
    setIsJoining(true);
    try {
      const response = await apiFetch<{ enrollment: Enrollment }>('/api/enrollments', {
        method: 'POST',
        body: JSON.stringify({ teacherCode: joinCode.trim() }),
      });
      setEnrollments([...enrollments, response.enrollment]);
      setJoinCode('');
      toast.success('Iscrizione completata', { description: 'Ti sei iscritto alla classe del docente.' });
    } catch (err) {
      toast.error('Errore', { description: err instanceof Error ? err.message : 'Codice non valido' });
    } finally {
      setIsJoining(false);
    }
  };

  const isStudent = user?.role === 'STUDENT';
  const isTeacher = user?.role === 'TEACHER';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
        <UserIcon className="h-5 w-5 text-amber-600" />
        Profilo
      </h2>

      {/* User info card */}
      <Card className="border-amber-100 bg-white">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-amber-200">
              <AvatarFallback className="bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 text-xl font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-amber-900">{user?.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    className={
                      isTeacher
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : isStudent
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-rose-100 text-rose-700 border-rose-200'
                    }
                  >
                    <GraduationCap className="h-3 w-3" />
                    {isTeacher ? 'Docente' : isStudent ? 'Studente' : 'Admin'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-amber-800">
                  <Mail className="h-4 w-4 text-amber-500" />
                  {user?.email}
                </div>
                {user?.institution && (
                  <div className="flex items-center gap-2 text-sm text-amber-800">
                    <Building2 className="h-4 w-4 text-amber-500" />
                    {user.institution}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── STUDENT: Stats + Charts ────────────────────────── */}
      {isStudent && (
        <>
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
                        <AnimatedCounter value={essays.length} duration={600} decimals={0} />
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
                      <Trophy className="h-5 w-5 text-orange-600" />
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
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-100">
                      <Award className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-900">
                        {correctedEssays.length > 0 ? <AnimatedCounter value={correctedEssays.length} duration={600} decimals={0} /> : '—'}
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
                <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Evoluzione punteggi
                </CardTitle>
                <CardDescription>Progressione nel tempo</CardDescription>
              </CardHeader>
              <CardContent>
                <ScoreTrendChart data={trendData} />
              </CardContent>
            </Card>

            <Card className="border-amber-100 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                  <Award className="h-4 w-4 text-violet-500" />
                  Profilo di competenza
                </CardTitle>
                <CardDescription>Media delle tue abilità</CardDescription>
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
                    Correggi il primo testo per vedere il grafico
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
                <CardDescription>Analisi personalizzata basata sui tuoi testi</CardDescription>
              </CardHeader>
              <CardContent>
                {correctedEssays.length === 0 ? (
                  <div className="text-center py-8 text-amber-600/50">
                    <Lightbulb className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Correggi almeno un testo per ricevere suggerimenti personalizzati.</p>
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
                          <ArrowRight className="h-4 w-4 text-amber-400" />
                          <Badge className={CILS_COLORS[targetCilsLevel || estimatedCilsLevel] || CILS_COLORS.A2}>
                            <Target className="h-3 w-3 mr-1" />
                            {targetCilsLevel || estimatedCilsLevel}
                          </Badge>
                          <span className="text-xs text-amber-600/70 ml-1">
                            {targetCilsLevel && targetCilsLevel !== estimatedCilsLevel
                              ? `Prossimo obiettivo: livello ${targetCilsLevel}`
                              : 'Hai raggiunto il livello massimo!'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actionable suggestions */}
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
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Essay history with pagination */}
          <Card className="border-amber-100 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Cronologia testi
              </CardTitle>
              <CardDescription>{essays.length} testo{essays.length !== 1 ? 'i' : ''} scritti</CardDescription>
            </CardHeader>
            <CardContent>
              {essays.length === 0 ? (
                <div className="text-center py-8 text-amber-600/50">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nessun testo ancora. Inizia a scrivere!</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {paginatedEssays.map((essay) => (
                      <Dialog key={essay.id}>
                        <DialogTrigger asChild>
                          <button
                            onClick={() => setDetailEssay(essay)}
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
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle className="text-amber-900">{detailEssay?.title}</DialogTitle>
                          </DialogHeader>
                          {detailEssay && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                {detailEssay.cilsLevelAssessment && (
                                  <Badge className={CILS_COLORS[detailEssay.cilsLevelAssessment.estimatedLevel] || CILS_COLORS.A2}>
                                    <Award className="h-3 w-3 mr-1" />
                                    {detailEssay.cilsLevelAssessment.estimatedLevel}
                                  </Badge>
                                )}
                                {detailEssay.score != null && (
                                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                                    Punteggio: {detailEssay.score.toFixed(1)}/10
                                  </Badge>
                                )}
                                <Badge
                                  variant={detailEssay.status === 'CORRECTED' ? 'default' : 'secondary'}
                                  className={
                                    detailEssay.status === 'CORRECTED'
                                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-100 text-amber-700 border-amber-200'
                                  }
                                >
                                  {detailEssay.status === 'CORRECTED' ? 'Corretto' : 'Inviato'}
                                </Badge>
                              </div>
                              {detailEssay.topic && (
                                <p className="text-sm text-amber-600/70">Argomento: {detailEssay.topic}</p>
                              )}
                              <div className="text-sm text-amber-800/70 leading-relaxed max-h-48 overflow-y-auto custom-scrollbar bg-amber-50/50 p-3 rounded-lg">
                                {detailEssay.content.slice(0, 500)}{detailEssay.content.length > 500 ? '...' : ''}
                              </div>
                              <Button
                                onClick={() => {
                                  setCurrentEssay(detailEssay);
                                  setCurrentView('essay-detail');
                                }}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white btn-shimmer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                              >
                                <FileText className="h-4 w-4" />
                                Vedi dettaglio completo
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={essayPage <= 1}
                        onClick={() => setEssayPage((p) => p - 1)}
                        className="border-amber-200 text-amber-700 hover:bg-amber-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      >
                          Precedente
                      </Button>
                      <span className="text-xs text-amber-600/60">
                        {essayPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={essayPage >= totalPages}
                        onClick={() => setEssayPage((p) => p + 1)}
                        className="border-amber-200 text-amber-700 hover:bg-amber-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Successivo
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* System status card */}
      <Card className="border-amber-100 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-amber-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-500" />
            Stato del sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50">
              <div className={`w-2.5 h-2.5 rounded-full ${systemStatus?.database?.includes('Supabase') ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <div>
                <p className="text-xs font-medium text-amber-900">Database</p>
                <p className="text-xs text-amber-600/60">{systemStatus?.database || 'Demo (in memoria)'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50">
              <div className={`w-2.5 h-2.5 rounded-full ${systemStatus?.aiProvider?.includes('Gemini') ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <div>
                <p className="text-xs font-medium text-amber-900">IA</p>
                <p className="text-xs text-amber-600/60">{systemStatus?.aiProvider || 'z-ai (sandbox)'}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-amber-500/50 mt-2">
            Configura Supabase e Gemini API Key per la versione di produzione
          </p>
        </CardContent>
      </Card>

      {/* ─── TEACHER: Enrollment code + QR ───────────────────── */}
      {isTeacher && user.teacherCode && (
        <Card className="border-amber-100 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900 flex items-center gap-2">
              <QrCode className="h-4 w-4 text-amber-500" />
              Codice di iscrizione
            </CardTitle>
            <CardDescription>Condividi questo codice con i tuoi studenti per iscriversi alla tua classe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 font-mono text-lg font-bold text-amber-800 tracking-wider text-center">
                {user.teacherCode}
              </div>
              <Button
                onClick={handleCopyCode}
                variant="outline"
                className="border-amber-200 text-amber-700 hover:bg-amber-50 shrink-0 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiato!' : 'Copia'}
              </Button>
            </div>
            {/* QR-like visual */}
            <div className="mt-4 flex justify-center">
              <div className="p-4 bg-white border-2 border-dashed border-amber-200 rounded-xl">
                <div className="w-32 h-32 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg flex items-center justify-center border border-amber-100">
                  <div className="text-center">
                    <QrCode className="h-12 w-12 text-amber-400 mx-auto mb-1" />
                    <p className="text-[10px] font-mono text-amber-600/70">{user.teacherCode}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teacher: Students list */}
      {isTeacher && (
        <Card className="border-amber-100 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              Studenti iscritti
            </CardTitle>
            <CardDescription>{enrollments.length || students.length} studenti nella tua classe</CardDescription>
          </CardHeader>
          <CardContent>
            {enrollments.length === 0 && students.length === 0 ? (
              <div className="text-center py-6 text-amber-600/50">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nessuno studente iscritto ancora.</p>
                <p className="text-xs mt-1">Condividi il tuo codice docente!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => {
                      setSelectedStudentId(student.id);
                      setCurrentView('student-detail');
                    }}
                    className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-amber-50 transition-all duration-300 hover:shadow-sm text-left group active:scale-[0.99]"
                  >
                    <Avatar className="h-8 w-8 border border-amber-200">
                      <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                        {student.name?.charAt(0)?.toUpperCase() || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-amber-900 truncate">{student.name}</p>
                      <p className="text-xs text-amber-600/50 truncate">{student.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Student: Enrollment management */}
      {isStudent && (
        <Card className="border-amber-100 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-amber-500" />
              Iscrizione docente
            </CardTitle>
            <CardDescription>Inserisci il codice del tuo docente per iscriverti alla classe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Inserisci il codice docente"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="border-amber-200 focus:border-amber-500 font-mono transition-colors duration-300"
              />
              <Button
                onClick={handleJoinTeacher}
                disabled={isJoining || !joinCode.trim()}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shrink-0 btn-shimmer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Iscriviti
              </Button>
            </div>

            {enrollments.length > 0 && (
              <>
                <Separator className="bg-amber-100" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-800">Docenti seguiti</p>
                  {enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50">
                      <Avatar className="h-8 w-8 border border-amber-200">
                        <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                          {enrollment.teacherName?.charAt(0)?.toUpperCase() || 'D'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-900 truncate">{enrollment.teacherName || 'Docente'}</p>
                        <p className="text-xs text-amber-600/50">
                          Iscritto il {new Date(enrollment.joinedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
