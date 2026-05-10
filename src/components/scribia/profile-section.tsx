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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  const { user, essays, enrollments, setEnrollments, students, setCurrentEssay, setCurrentView } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [essayPage, setEssayPage] = useState(1);
  const [detailEssay, setDetailEssay] = useState<Essay | null>(null);

  // Load enrollments on mount
  useEffect(() => {
    async function loadEnrollments() {
      try {
        const data = await apiFetch<Enrollment[]>('/api/enrollments');
        setEnrollments(data);
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
      const enrollment = await apiFetch<Enrollment>('/api/enrollments', {
        method: 'POST',
        body: JSON.stringify({ teacherCode: joinCode.trim() }),
      });
      setEnrollments([...enrollments, enrollment]);
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
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div>
                <p className="text-xs font-medium text-amber-900">Database</p>
                <p className="text-xs text-amber-600/60">Demo (in memoria)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div>
                <p className="text-xs font-medium text-amber-900">IA</p>
                <p className="text-xs text-amber-600/60">z-ai (sandbox)</p>
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
                      setCurrentEssay(null);
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
