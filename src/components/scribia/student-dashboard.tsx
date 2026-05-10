'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  TrendingUp,
  CheckCircle2,
  PenLine,
  ClipboardCheck,
  Clock,
  Loader2,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore, type Essay } from '@/store/app-store';
import { apiFetch } from './api-fetch';
import { ScoreTrendChart } from './stats-charts';
import { AnimatedCounter } from './animated-counter';

interface EssaysResponse {
  essays: Essay[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Stats {
  totalEssays?: number;
  averageScore?: number | null;
  correctedEssays?: number;
  trend?: number | null;
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Animated Stat Card ──────────────────────────────────────

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  isDecimal = false,
  isTrend = false,
  delay = 0,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: number | string;
  label: string;
  isDecimal?: boolean;
  isTrend?: boolean;
  delay?: number;
}) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const displayValue = typeof value === 'string' ? value : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className="border-amber-100 bg-white transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconBg} transition-transform duration-300`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-900">
                {displayValue ?? (
                  <AnimatedCounter
                    value={numericValue}
                    duration={800}
                    decimals={isDecimal ? 1 : 0}
                  />
                )}
              </p>
              <p className="text-xs text-amber-600/60">{label}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function StudentDashboard() {
  const { user, essays, setEssays, setCurrentView, setCurrentEssay } = useAppStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [essaysData, statsResponse] = await Promise.all([
          apiFetch<EssaysResponse>('/api/essays'),
          apiFetch<{ stats: Stats }>('/api/stats'),
        ]);
        setEssays(essaysData.essays);
        setStats(statsResponse.stats);
      } catch {
        // Use store data as fallback
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [setEssays]);

  const recentEssays = [...essays].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const trendData = essays
    .filter((e) => e.status === 'CORRECTED' && e.score != null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((e) => ({
      date: new Date(e.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
      punteggio: e.score!,
    }));

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
          {user?.role === 'TEACHER' ? 'Testi degli studenti' : `Ciao, ${user?.name?.split(' ')[0] || 'Studente'}! 👋`}
        </h2>
        <p className="text-amber-700/60 mt-1">
          {user?.role === 'TEACHER' 
            ? 'Elenco dei testi scritti dai tuoi studenti' 
            : 'Ecco un riepilogo dei tuoi progressi nella scrittura.'}
        </p>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          value={stats?.totalEssays ?? essays.length}
          label="Testi totali"
          delay={0}
        />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          value={stats?.averageScore ?? 0}
          label="Punteggio medio"
          isDecimal
          delay={0.08}
        />
        <StatCard
          icon={CheckCircle2}
          iconBg="bg-teal-100"
          iconColor="text-teal-600"
          value={stats?.correctedEssays ?? essays.filter(e => e.status === 'CORRECTED').length}
          label="Testi corretti"
          delay={0.16}
        />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          value={stats?.trend != null ? (stats.trend > 0 ? '+' : '') + stats.trend.toFixed(1) : '—'}
          label="Tendenza"
          delay={0.24}
        />
      </div>

      {/* Quick actions - only for students */}
      {user?.role === 'STUDENT' && (
        <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
          <Button
            onClick={() => setCurrentView('essay-editor')}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md btn-shimmer btn-pulse-shadow transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <PenLine className="h-4 w-4" />
            Scrivi nuovo testo
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const lastCorrected = [...essays]
                .filter(e => e.status === 'CORRECTED')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
              if (lastCorrected) {
                setCurrentEssay(lastCorrected);
                setCurrentView('essay-detail');
              }
            }}
            className="border-amber-200 text-amber-700 hover:bg-amber-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            disabled={!essays.some(e => e.status === 'CORRECTED')}
          >
            <ClipboardCheck className="h-4 w-4" />
            Vai all&apos;autovalutazione
          </Button>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent essays */}
        <motion.div variants={itemVariants}>
          <Card className="border-amber-100 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-amber-900">Testi recenti</CardTitle>
              <CardDescription>I tuoi ultimi elaborati</CardDescription>
            </CardHeader>
            <CardContent>
              {recentEssays.length === 0 ? (
                <div className="text-center py-8 text-amber-600/50">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nessun testo ancora. Inizia a scrivere!</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {recentEssays.map((essay, idx) => (
                    <motion.button
                      key={essay.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06, duration: 0.3 }}
                      onClick={() => {
                        setCurrentEssay(essay);
                        setCurrentView('essay-detail');
                      }}
                      className="flex items-center gap-3 w-full p-3 rounded-lg border border-amber-100 hover:bg-amber-50 hover:shadow-sm transition-all duration-300 hover:-translate-y-0.5 text-left group active:scale-[0.99]"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-100 group-hover:bg-amber-200 transition-all duration-300 shrink-0">
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
                    </motion.button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Chart */}
        <motion.div variants={itemVariants}>
          <Card className="border-amber-100 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-amber-900">Andamento punteggi</CardTitle>
              <CardDescription>Progressione nel tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreTrendChart data={trendData} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
