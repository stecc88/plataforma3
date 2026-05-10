'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  TrendingUp,
  BookMarked,
  StickyNote,
  Clock,
  Loader2,
  GraduationCap,
  Award,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppStore, type Essay } from '@/store/app-store';
import { apiFetch } from './api-fetch';
import { ClassDistributionChart } from './stats-charts';

interface EssaysResponse {
  essays: Essay[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface TeacherStats {
  totalStudents?: number;
  essaysToReview?: number;
  averageClassScore?: number | null;
  totalPreparations?: number;
  averageScore?: number | null;
}

interface StudentWithStats {
  id: string;
  name: string;
  email: string;
  institution?: string | null;
  avatar?: string | null;
  joinedAt: string | null;
  stats: {
    totalEssays: number;
    correctedEssays: number;
    submittedEssays: number;
    averageScore: number | null;
    lastEssayDate: string | null;
    lastCilsLevel: string | null;
    selfAssessmentCount: number;
  };
}

// ─── CILS Level badge colors ────────────────────────────────
const CILS_COLORS: Record<string, string> = {
  A1: 'bg-gray-100 text-gray-700 border-gray-200',
  A2: 'bg-blue-100 text-blue-700 border-blue-200',
  B1: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  B2: 'bg-amber-100 text-amber-700 border-amber-200',
  C1: 'bg-orange-100 text-orange-700 border-orange-200',
  C2: 'bg-rose-100 text-rose-700 border-rose-200',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function TeacherDashboard() {
  const { user, essays, setEssays, setCurrentView, setCurrentEssay } = useAppStore();
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [enrichedStudents, setEnrichedStudents] = useState<StudentWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [essaysData, statsData, studentsData] = await Promise.all([
          apiFetch<EssaysResponse>('/api/essays'),
          apiFetch<TeacherStats>('/api/stats'),
          apiFetch<{ students: StudentWithStats[] }>('/api/teacher/students'),
        ]);
        setEssays(essaysData.essays);
        setStats(statsData);
        setEnrichedStudents(studentsData.students || []);
      } catch {
        // Use store data as fallback
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [setEssays]);

  const submittedEssays = essays
    .filter((e) => e.status === 'SUBMITTED')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const correctedEssays = essays.filter((e) => e.status === 'CORRECTED' && e.score != null);

  // Distribution data
  const distributionData = [
    { fascia: '1-3', studenti: correctedEssays.filter((e) => (e.score ?? 0) <= 3).length },
    { fascia: '4-5', studenti: correctedEssays.filter((e) => (e.score ?? 0) > 3 && (e.score ?? 0) <= 5).length },
    { fascia: '6-7', studenti: correctedEssays.filter((e) => (e.score ?? 0) > 5 && (e.score ?? 0) <= 7).length },
    { fascia: '8-10', studenti: correctedEssays.filter((e) => (e.score ?? 0) > 7).length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold text-amber-900">
          Buongiorno, {user?.name?.split(' ')[0] || 'Docente'}! 👋
        </h2>
        <p className="text-amber-700/60 mt-1">Ecco un riepilogo della tua classe.</p>
      </motion.div>

      {/* Stats cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-amber-100 bg-white transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900">{stats?.totalStudents ?? enrichedStudents.length}</p>
                <p className="text-xs text-amber-600/60">Studenti</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-white transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100">
                <FileText className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900">{stats?.essaysToReview ?? submittedEssays.length}</p>
                <p className="text-xs text-amber-600/60">Da correggere</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-white transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900">
                  {(stats?.averageClassScore ?? stats?.averageScore)?.toFixed(1) ?? '—'}
                </p>
                <p className="text-xs text-amber-600/60">Media classe</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-white transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-100">
                <BookMarked className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900">{stats?.totalPreparations ?? 0}</p>
                <p className="text-xs text-amber-600/60">Preparazioni</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
        <Button
          onClick={() => setCurrentView('class-preparations')}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md btn-shimmer btn-pulse-shadow transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <BookMarked className="h-4 w-4" />
          Preparazione lezione
        </Button>
        <Button
          variant="outline"
          onClick={() => setCurrentView('teacher-notes')}
          className="border-amber-200 text-amber-700 hover:bg-amber-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <StickyNote className="h-4 w-4" />
          Note studente
        </Button>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Students list — now with stats from /api/teacher/students */}
        <motion.div variants={itemVariants}>
          <Card className="border-amber-100 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-amber-600" />
                Studenti iscritti
              </CardTitle>
              <CardDescription>{enrichedStudents.length} studenti nella tua classe</CardDescription>
            </CardHeader>
            <CardContent>
              {enrichedStudents.length === 0 ? (
                <div className="text-center py-8 text-amber-600/50">
                  <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nessuno studente iscritto ancora.</p>
                  <p className="text-xs mt-1">Condividi il tuo codice docente!</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {enrichedStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => {
                        setCurrentView('student-detail');
                      }}
                      className="flex items-center gap-3 w-full p-3 rounded-lg border border-amber-100 hover:bg-amber-50 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 text-left group active:scale-[0.99]"
                    >
                      <Avatar className="h-8 w-8 border border-amber-200">
                        <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                          {student.name?.charAt(0)?.toUpperCase() || 'S'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-900 truncate">{student.name}</p>
                        <p className="text-xs text-amber-600/50">
                          {student.stats.totalEssays} testo{student.stats.totalEssays !== 1 ? 'i' : ''}
                          {student.stats.lastEssayDate && ` · Ultimo: ${new Date(student.stats.lastEssayDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {student.stats.lastCilsLevel && (
                          <Badge className={`${CILS_COLORS[student.stats.lastCilsLevel] || CILS_COLORS.A2} text-[10px] px-1.5 py-0`}>
                            <Award className="h-3 w-3 mr-0.5" />
                            {student.stats.lastCilsLevel}
                          </Badge>
                        )}
                        {student.stats.averageScore != null && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0">
                            <BarChart3 className="h-3 w-3 mr-0.5" />
                            {student.stats.averageScore.toFixed(1)}
                          </Badge>
                        )}
                        {student.stats.submittedEssays > 0 && (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0">
                            {student.stats.submittedEssays}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent submissions */}
        <motion.div variants={itemVariants}>
          <Card className="border-amber-100 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-amber-900">Testi da correggere</CardTitle>
              <CardDescription>Ultimi elaborati inviati</CardDescription>
            </CardHeader>
            <CardContent>
              {submittedEssays.length === 0 ? (
                <div className="text-center py-8 text-amber-600/50">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nessun testo da correggere.</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {submittedEssays.slice(0, 8).map((essay) => (
                    <button
                      key={essay.id}
                      onClick={() => {
                        setCurrentEssay(essay);
                        setCurrentView('essay-detail');
                      }}
                      className="flex items-center gap-3 w-full p-3 rounded-lg border border-amber-100 hover:bg-amber-50 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 text-left group active:scale-[0.99]"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-orange-100 group-hover:bg-orange-200 transition-colors shrink-0">
                        <FileText className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-900 truncate">{essay.title}</p>
                        <p className="text-xs text-amber-600/50 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {essay.studentName} · {new Date(essay.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {essay.cilsLevelAssessment && (
                          <Badge className={CILS_COLORS[essay.cilsLevelAssessment.estimatedLevel] || CILS_COLORS.A2}>
                            <Award className="h-3 w-3 mr-0.5" />
                            {essay.cilsLevelAssessment.estimatedLevel}
                          </Badge>
                        )}
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 shrink-0">
                          Da correggere
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div variants={itemVariants}>
        <Card className="border-amber-100 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900">Distribuzione punteggi</CardTitle>
            <CardDescription>Distribuzione dei punteggi nella classe</CardDescription>
          </CardHeader>
          <CardContent>
            <ClassDistributionChart data={distributionData} />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
