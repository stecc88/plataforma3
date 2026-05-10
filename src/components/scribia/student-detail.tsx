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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore, type Essay, type TeacherNote } from '@/store/app-store';
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
