'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  Loader2,
  Sparkles,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Award,
  Target,
  TrendingUp,
  Info,
  BookOpen,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { ErrorAnnotationsList, TextDiffView } from '@/components/error-annotations';
import { AnnotatedTextView } from './annotated-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAppStore, type Essay, type SelfAssessment, type StudyTopic } from '@/store/app-store';
import { apiFetch } from './api-fetch';
import { ScoreRadarChart, PerformanceComparisonChart } from './stats-charts';
import { AnimatedCounter } from './animated-counter';
import { toast } from 'sonner';

// ─── CILS Level colors & labels ─────────────────────────────

const CILS_COLORS: Record<string, string> = {
  A1: 'bg-gray-100 text-gray-700 border-gray-200',
  A2: 'bg-blue-100 text-blue-700 border-blue-200',
  B1: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  B2: 'bg-amber-100 text-amber-700 border-amber-200',
  C1: 'bg-orange-100 text-orange-700 border-orange-200',
  C2: 'bg-rose-100 text-rose-700 border-rose-200',
};

const CILS_DOT_COLORS: Record<string, string> = {
  A1: 'bg-gray-400',
  A2: 'bg-blue-400',
  B1: 'bg-emerald-400',
  B2: 'bg-amber-400',
  C1: 'bg-orange-400',
  C2: 'bg-rose-400',
};

const CILS_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// ─── Error item type from AI response ────────────────────────

interface ErrorItem {
  originalText: string;
  correctedText: string;
  type: string;
  color: string;
  shortReason: string;
  explanation: string;
  grammarRule: string;
  suggestion: string;
}

// ─── Loading Skeleton Component ──────────────────────────────

function CorrectionSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-amber-200/50 skeleton-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-amber-200/50 skeleton-pulse" />
          <div className="h-3 w-1/2 rounded bg-amber-100/50 skeleton-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2 p-3 rounded-lg bg-amber-50">
            <div className="h-6 w-1/2 mx-auto rounded bg-amber-200/50 skeleton-pulse" />
            <div className="h-3 w-2/3 mx-auto rounded bg-amber-100/50 skeleton-pulse" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-amber-200/40 skeleton-pulse" />
        <div className="h-3 w-5/6 rounded bg-amber-100/40 skeleton-pulse" />
        <div className="h-3 w-4/6 rounded bg-amber-200/30 skeleton-pulse" />
      </div>
      <div className="flex justify-center py-3">
        <div className="flex items-center gap-2 text-amber-600/60 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Gemini sta analizzando il testo...</span>
        </div>
      </div>
    </div>
  );
}

// ─── CILS Level Assessment Component ─────────────────────────

function CilsLevelCard({ assessment }: {
  assessment: {
    estimatedLevel: string;
    passesTargetLevel: boolean | null;
    readiness: string;
    targetLevelProvided?: string | null;
  } | null;
}) {
  const [expanded, setExpanded] = useState(true);

  if (!assessment) return null;

  const levelIdx = CILS_LEVELS.indexOf(assessment.estimatedLevel);
  const hasTarget = assessment.targetLevelProvided != null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="border-violet-100 bg-gradient-to-br from-violet-50/50 to-amber-50/30">
        <CardHeader className="pb-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full"
          >
            <CardTitle className="text-base text-violet-900 flex items-center gap-2">
              <Award className="h-4 w-4 text-violet-500" />
              Valutazione Livello CILS
            </CardTitle>
            <motion.div
              animate={{ rotate: expanded ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronUp className="h-4 w-4 text-violet-600" />
            </motion.div>
          </button>
        </CardHeader>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <CardContent className="space-y-4">
                {/* Level indicator bar */}
                <div className="flex items-center gap-2">
                  {CILS_LEVELS.map((level, idx) => (
                    <motion.div
                      key={level}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + idx * 0.06, duration: 0.3 }}
                      className={`flex-1 rounded-md py-2 text-center text-sm font-bold transition-all duration-300 ${
                        idx <= levelIdx
                          ? CILS_COLORS[level]
                          : 'bg-gray-50 text-gray-300 border-gray-100'
                      } ${idx === levelIdx ? 'ring-2 ring-violet-400 ring-offset-1 scale-105 shadow-md' : ''}`}
                    >
                      {level}
                    </motion.div>
                  ))}
                </div>

                {/* Estimated level badge + target pass/fail */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-violet-700/70">Livello stimato:</span>
                    <Badge className={CILS_COLORS[assessment.estimatedLevel] || CILS_COLORS.A2}>
                      {assessment.estimatedLevel}
                    </Badge>
                  </div>

                  {hasTarget && assessment.passesTargetLevel !== null && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-sm text-violet-700/70">
                        Obiettivo {assessment.targetLevelProvided}:
                      </span>
                      {assessment.passesTargetLevel ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Superato
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-700 border-rose-200">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Non superato
                        </Badge>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Readiness text */}
                {assessment.readiness && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-start gap-2 p-3 rounded-lg bg-white/70 border border-violet-100"
                  >
                    <Info className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-violet-800/80 leading-relaxed">{assessment.readiness}</p>
                  </motion.div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── Structured Errors Component ─────────────────────────────

function StructuredErrorsList({ errors }: { errors: ErrorItem[] }) {
  const [expanded, setExpanded] = useState(true);
  const [visibleCount, setVisibleCount] = useState(3);

  if (!errors || errors.length === 0) return null;

  // Count by type
  const typeCounts = new Map<string, number>();
  for (const e of errors) {
    typeCounts.set(e.type, (typeCounts.get(e.type) || 0) + 1);
  }

  const visibleErrors = errors.slice(0, visibleCount);
  const hasMore = errors.length > visibleCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card className="border-rose-100 bg-white">
        <CardHeader className="pb-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full"
          >
            <CardTitle className="text-base text-amber-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              Errori dettagliati
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 ml-2">
                {errors.length} {errors.length === 1 ? 'errore' : 'errori'}
              </Badge>
            </CardTitle>
            <motion.div
              animate={{ rotate: expanded ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronUp className="h-4 w-4 text-amber-600" />
            </motion.div>
          </button>
        </CardHeader>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <CardContent className="space-y-3">
                {/* Type summary */}
                <div className="flex flex-wrap gap-2">
                  {Array.from(typeCounts.entries()).map(([type, count]) => (
                    <Badge
                      key={type}
                      variant="outline"
                      className="text-[10px] capitalize"
                      style={{ borderColor: errors.find(e => e.type === type)?.color || '#f97316', color: errors.find(e => e.type === type)?.color || '#f97316' }}
                    >
                      {type} ({count})
                    </Badge>
                  ))}
                </div>

                {/* Error cards */}
                <div className="space-y-3">
                  {visibleErrors.map((err, idx) => (
                    <motion.div
                      key={`${err.originalText}-${idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.08, duration: 0.3 }}
                      className="rounded-lg border border-l-4 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-amber-50/30"
                      style={{ borderLeftColor: err.color || '#f97316' }}
                    >
                      {/* Diff row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-red-800 line-through decoration-red-400 font-medium text-sm transition-colors duration-200 hover:bg-red-200">
                          {err.originalText}
                        </span>
                        <span className="text-amber-500">→</span>
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 font-medium text-sm transition-colors duration-200 hover:bg-emerald-200">
                          {err.correctedText}
                        </span>
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px] capitalize"
                          style={{ borderColor: err.color, color: err.color }}
                        >
                          {err.type}
                        </Badge>
                      </div>

                      {/* Short reason */}
                      {err.shortReason && (
                        <p className="text-sm font-medium text-amber-800 mb-1">{err.shortReason}</p>
                      )}

                      {/* Explanation */}
                      {err.explanation && (
                        <p className="text-sm text-amber-700/70 leading-relaxed">{err.explanation}</p>
                      )}

                      {/* Grammar rule + suggestion */}
                      <div className="mt-2 grid sm:grid-cols-2 gap-2">
                        {err.grammarRule && (
                          <div className="text-xs p-2 rounded bg-amber-50 text-amber-700/70 transition-colors duration-200 hover:bg-amber-100">
                            <span className="font-medium text-amber-800">Regola:</span> {err.grammarRule}
                          </div>
                        )}
                        {err.suggestion && (
                          <div className="text-xs p-2 rounded bg-emerald-50 text-emerald-700/70 transition-colors duration-200 hover:bg-emerald-100">
                            <span className="font-medium text-emerald-800">Consiglio:</span> {err.suggestion}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Show more */}
                {hasMore && (
                  <div className="flex justify-center pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisibleCount(prev => prev + 5)}
                      className="text-amber-700 hover:bg-amber-50 hover:text-amber-900 gap-1 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <ChevronDown className="h-4 w-4" />
                      Mostra altri ({errors.length - visibleCount} rimasti)
                    </Button>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── Animated Score Bar ──────────────────────────────────────

function AnimatedScoreBar({ label, value, color, delay = 0 }: {
  label: string;
  value: number;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="text-amber-800">{label}</span>
        <span className="font-semibold text-amber-700">
          <AnimatedCounter value={value} duration={1000} delay={delay * 1000} />/10
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-amber-100 overflow-hidden">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: value / 10 }}
          transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: 'left' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </motion.div>
  );
}

// ─── Reflective Assessment View ────────────────────────────────

interface ReflectiveAssessmentProps {
  assessment: SelfAssessment;
  essayErrors?: ErrorItem[];
}

function ReflectiveAssessmentView({ assessment, essayErrors }: ReflectiveAssessmentProps) {
  // Try to parse the new reflective format from reflection field
  let reflectiveData: {
    version?: number;
    errorResponses?: {
      errorIndex: number;
      originalText: string;
      studentProblem: string;
      studentCorrection: string;
      matchLevel: 'exact' | 'partial' | 'missed';
    }[];
    reflections?: {
      errorIndex: number;
      noticedBefore: 'yes' | 'somewhat' | 'no';
      understoodExplanation: 'yes' | 'somewhat' | 'no';
      willRepeatError: 'probably_yes' | 'not_sure' | 'no';
    }[];
    overallReflection?: string;
    summary?: {
      total: number;
      exact: number;
      partial: number;
      missed: number;
    };
  } | null = null;

  try {
    if (assessment.reflection) {
      reflectiveData = JSON.parse(assessment.reflection);
    }
  } catch {
    // Not JSON - legacy text reflection
  }

  // If new reflective format
  if (reflectiveData?.version === 2 && reflectiveData.summary) {
    const { summary, errorResponses = [], reflections = [], overallReflection } = reflectiveData;

    const matchBadge = (level: 'exact' | 'partial' | 'missed') => {
      switch (level) {
        case 'exact':
          return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Corretto</Badge>;
        case 'partial':
          return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><AlertCircle className="h-3 w-3 mr-1" />Parziale</Badge>;
        case 'missed':
          return <Badge className="bg-rose-100 text-rose-700 border-rose-200"><XCircle className="h-3 w-3 mr-1" />Mancato</Badge>;
      }
    };

    const choiceLabel = (val: string) => {
      const labels: Record<string, string> = {
        'yes': 'Sì', 'somewhat': 'Più o meno', 'no': 'No',
        'probably_yes': 'Probabilmente sì', 'not_sure': 'Non sicuro',
      };
      return labels[val] || val;
    };

    return (
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="flex gap-3">
          <div className="flex-1 text-center p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <p className="text-2xl font-bold text-emerald-700">{summary.exact}</p>
            <p className="text-xs text-emerald-600">Errori corretti da solo</p>
          </div>
          <div className="flex-1 text-center p-3 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-2xl font-bold text-amber-700">{summary.partial}</p>
            <p className="text-xs text-amber-600">Parzialmente corretti</p>
          </div>
          <div className="flex-1 text-center p-3 rounded-lg bg-rose-50 border border-rose-100">
            <p className="text-2xl font-bold text-rose-700">{summary.missed}</p>
            <p className="text-xs text-rose-600">Non individuati</p>
          </div>
        </div>

        {/* Awareness percentage */}
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-amber-800">Consapevolezza degli errori</span>
            <span className="text-sm font-bold text-amber-700">
              {summary.total > 0 ? Math.round(((summary.exact + summary.partial * 0.5) / summary.total) * 100) : 0}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-amber-200 overflow-hidden">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: summary.total > 0 ? (summary.exact + summary.partial * 0.5) / summary.total : 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
              style={{ transformOrigin: 'left' }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-400"
            />
          </div>
        </div>

        {/* Error-by-error detail */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-800">Dettaglio per errore</p>
          {errorResponses.map((resp, idx) => {
            const refl = reflections[idx];
            const errItem = essayErrors?.[resp.errorIndex];
            return (
              <div key={idx} className="p-3 rounded-lg border border-amber-100 bg-amber-50/30 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {errItem ? (
                    <>
                      <span className="text-sm line-through text-red-700 bg-red-50 px-1.5 rounded">{errItem.originalText}</span>
                      <span className="text-amber-400">→</span>
                      <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-1.5 rounded">{errItem.correctedText}</span>
                    </>
                  ) : (
                    <span className="text-sm text-amber-700">{resp.originalText}</span>
                  )}
                  {matchBadge(resp.matchLevel)}
                </div>
                {resp.studentCorrection && (
                  <p className="text-xs text-amber-700/70 pl-1">
                    <span className="font-medium">La tua correzione:</span> &quot;{resp.studentCorrection}&quot;
                  </p>
                )}
                {refl && (
                  <div className="flex flex-wrap gap-2 text-xs pl-1">
                    <span className="text-amber-600/60">
                      Notato prima: <strong className="text-amber-800">{choiceLabel(refl.noticedBefore)}</strong>
                    </span>
                    <span className="text-amber-600/60">
                      Capito: <strong className="text-amber-800">{choiceLabel(refl.understoodExplanation)}</strong>
                    </span>
                    <span className="text-amber-600/60">
                      Ripeterà: <strong className="text-amber-800">{choiceLabel(refl.willRepeatError)}</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall reflection */}
        {overallReflection && (
          <div>
            <p className="text-sm font-medium text-amber-800 mb-1">Riflessione finale</p>
            <p className="text-sm text-amber-700/70 whitespace-pre-wrap bg-amber-50 p-3 rounded-lg border border-amber-100">{overallReflection}</p>
          </div>
        )}
      </div>
    );
  }

  // Legacy format fallback (old slider-based assessment)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Chiarezza', value: assessment.clarity },
          { label: 'Coerenza', value: assessment.coherence },
          { label: 'Grammatica', value: assessment.grammar },
          { label: 'Vocabolario', value: assessment.vocabulary },
        ].map((item) => (
          <div key={item.label} className="text-center p-3 rounded-lg bg-amber-50">
            <p className="text-2xl font-bold text-amber-700">{item.value}</p>
            <p className="text-xs text-amber-600/60">{item.label}</p>
          </div>
        ))}
      </div>
      {assessment.reflection && !reflectiveData && (
        <div>
          <p className="text-sm font-medium text-amber-800 mb-1">Riflessione</p>
          <p className="text-sm text-amber-700/70 whitespace-pre-wrap">{assessment.reflection}</p>
        </div>
      )}
    </div>
  );
}

// ─── Study Topics Card Component ──────────────────────────────

function StudyTopicsCard({ topics }: { topics: StudyTopic[] }) {
  const [expanded, setExpanded] = useState(true);

  const priorityConfig: Record<string, { badge: string; icon: typeof Flame; label: string }> = {
    alta: { badge: 'bg-rose-100 text-rose-700 border-rose-200', icon: Flame, label: 'Alta priorità' },
    media: { badge: 'bg-amber-100 text-amber-700 border-amber-200', icon: TrendingUp, label: 'Media priorità' },
    bassa: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: 'Bassa priorità' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.55 }}
    >
      <Card className="border-teal-100 bg-gradient-to-br from-teal-50/30 to-amber-50/20">
        <CardHeader className="pb-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full"
          >
            <CardTitle className="text-base text-amber-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-teal-500" />
              Temi di studio consigliati
              <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 ml-2">
                {topics.length} {topics.length === 1 ? 'tema' : 'temi'}
              </Badge>
            </CardTitle>
            <motion.div
              animate={{ rotate: expanded ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronUp className="h-4 w-4 text-amber-600" />
            </motion.div>
          </button>
        </CardHeader>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <CardContent className="space-y-3">
                <p className="text-sm text-amber-700/60">
                  Sulla base degli errori trovati, ti consigliamo di approfondire questi argomenti:
                </p>
                <div className="space-y-3">
                  {topics.map((topic, idx) => {
                    const config = priorityConfig[topic.priority] || priorityConfig.media;
                    const PriorityIcon = config.icon;
                    return (
                      <motion.div
                        key={`${topic.topic}-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1, duration: 0.3 }}
                        className="rounded-lg border border-teal-100 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-teal-50/20"
                      >
                        <div className="flex flex-wrap items-start gap-2 mb-2">
                          <h4 className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                            {topic.topic}
                          </h4>
                          <Badge className={`text-[10px] ${config.badge}`}>
                            <PriorityIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        {topic.description && (
                          <p className="text-sm text-amber-700/70 leading-relaxed mb-3">
                            {topic.description}
                          </p>
                        )}
                        {topic.resources.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {topic.resources.map((resource, rIdx) => (
                              <span
                                key={rIdx}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 border border-teal-100 transition-colors duration-200 hover:bg-teal-100"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {resource}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── Main Essay Detail Component ─────────────────────────────

export function EssayDetail() {
  const { currentEssay, setCurrentView, setCurrentEssay, setEssays, essays, user } = useAppStore();
  
  const [essay, setEssay] = useState<Essay | null>(currentEssay);
  const [assessment, setAssessment] = useState<SelfAssessment | null>(null);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [loading, setLoading] = useState(!currentEssay?.correctedContent);
  const [feedbackExpanded, setFeedbackExpanded] = useState(true);
  const [targetLevel, setTargetLevel] = useState<string>('');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!currentEssay) return;

    async function loadDetail() {
      try {
        const data = await apiFetch<{ essay: Essay }>(`/api/essays/${currentEssay!.id}`);
        const essayData = data.essay;
        setEssay(essayData);
        setCurrentEssay(essayData);
        // Load self-assessment if available
        if (essayData.selfAssessments && essayData.selfAssessments.length > 0) {
          setAssessment(essayData.selfAssessments[0]);
        }
      } catch {
        // Use current essay data
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [currentEssay?.id]);

  // Show results with a slight delay for animation
  useEffect(() => {
    if (essay?.correctedContent && !loading) {
      const t = setTimeout(() => setShowResults(true), 100);
      return () => clearTimeout(t);
    }
    setShowResults(false);
  }, [essay?.correctedContent, loading]);

  const handleCorrectWithAI = async () => {
    if (!essay) return;
    setIsCorrecting(true);
    setShowResults(false);
    try {
      const body: Record<string, unknown> = {};
      if (targetLevel) {
        body.targetLevel = targetLevel;
      }

      const correctionResponse = await apiFetch<{ essay: Essay }>(`/api/essays/${essay.id}/correct`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const corrected = correctionResponse.essay;
      setEssay(corrected);
      setCurrentEssay(corrected);
      // Update essay in list
      setEssays(essays.map(e => e.id === corrected.id ? corrected : e));
      toast.success('Correzione completata', {
        description: corrected.cilsLevelAssessment
          ? `Livello stimato: ${corrected.cilsLevelAssessment.estimatedLevel}`
          : 'La correzione IA è pronta.',
      });
    } catch (err) {
      toast.error('Errore', { description: err instanceof Error ? err.message : 'Errore nella correzione' });
    } finally {
      setIsCorrecting(false);
    }
  };

  if (!essay) {
    return (
      <div className="text-center py-16 text-amber-600/50">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p>Nessun testo selezionato</p>
        <Button
          variant="outline"
          onClick={() => setCurrentView('student-dashboard')}
          className="mt-4 border-amber-200 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna al cruscotto
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const hasCorrection = !!essay.correctedContent;
  const hasScores = essay.grammarScore != null;
  const hasStructuredErrors = essay.errors && Array.isArray(essay.errors) && essay.errors.length > 0;
  const hasCilsAssessment = !!essay.cilsLevelAssessment;

  const scoreItems = hasScores
    ? [
        { label: 'Grammatica', value: essay.grammarScore!, color: 'bg-amber-500' },
        { label: 'Coerenza', value: essay.coherenceScore!, color: 'bg-emerald-500' },
        { label: 'Vocabolario', value: essay.vocabularyScore!, color: 'bg-teal-500' },
        { label: 'Chiarezza', value: essay.clarityScore!, color: 'bg-orange-500' },
      ]
    : [];

  const comparisonData = hasScores && assessment
    ? [
        { metrica: 'Grammatica', autovalutazione: assessment.grammar, ia: essay.grammarScore! },
        { metrica: 'Coerenza', autovalutazione: assessment.coherence, ia: essay.coherenceScore! },
        { metrica: 'Vocabolario', autovalutazione: assessment.vocabulary, ia: essay.vocabularyScore! },
        { metrica: 'Chiarezza', autovalutazione: assessment.clarity, ia: essay.clarityScore! },
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => setCurrentView(useAppStore.getState().user?.role === 'TEACHER' ? 'teacher-dashboard' : 'student-dashboard')}
          className="text-amber-700 hover:bg-amber-50 w-fit transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-amber-900">{essay.title}</h2>
          {essay.topic && <p className="text-sm text-amber-600/60">Argomento: {essay.topic}</p>}
        </div>
        <div className="flex items-center gap-2">
          {/* CILS level quick badge */}
          {hasCilsAssessment && essay.cilsLevelAssessment && (
            <Badge className={CILS_COLORS[essay.cilsLevelAssessment.estimatedLevel] || CILS_COLORS.A2}>
              <Award className="h-3 w-3 mr-1" />
              {essay.cilsLevelAssessment.estimatedLevel}
            </Badge>
          )}
          <Badge
            variant={essay.status === 'CORRECTED' ? 'default' : 'secondary'}
            className={
              essay.status === 'CORRECTED'
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : 'bg-amber-100 text-amber-700 border-amber-200'
            }
          >
            {essay.status === 'CORRECTED' ? (
              <><CheckCircle2 className="h-3 w-3" /> Corretto</>
            ) : (
              <><Clock className="h-3 w-3" /> In attesa</>
            )}
          </Badge>
          {essay.studentName && (
            <span className="text-sm text-amber-600/60">di {essay.studentName}</span>
          )}
        </div>
      </div>

      {/* Not corrected yet - show correct button with CILS target selector */}
      {!hasCorrection && !isCorrecting && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-10 w-10 text-orange-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-orange-900 mb-2">Testo non ancora corretto</h3>
            <p className="text-sm text-orange-700/70 mb-4">
              Invia il testo per la correzione automatica IA per ricevere un&apos;analisi dettagliata e la valutazione del livello CILS.
            </p>

            {/* Target level selector */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Target className="h-4 w-4 text-violet-500" />
              <span className="text-sm text-violet-700">Obiettivo CILS (opzionale):</span>
              <div className="flex gap-1">
                {CILS_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => setTargetLevel(targetLevel === level ? '' : level)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] ${
                      targetLevel === level
                        ? CILS_COLORS[level] + ' ring-2 ring-violet-400 ring-offset-1'
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleCorrectWithAI}
              disabled={isCorrecting}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white btn-shimmer btn-pulse-shadow transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              Correggi con IA{targetLevel ? ` (obiettivo ${targetLevel})` : ''}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton while correcting */}
      <AnimatePresence>
        {isCorrecting && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-amber-200 bg-white">
              <CorrectionSkeleton />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score section */}
      {hasScores && showResults && !isCorrecting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid lg:grid-cols-3 gap-4"
        >
          {/* Overall score */}
          <Card className="border-amber-100 bg-white lg:row-span-2">
            <CardContent className="p-6 flex flex-col items-center justify-center">
              <p className="text-sm font-medium text-amber-600/60 mb-2">Punteggio complessivo</p>
              <div className="relative w-28 h-28">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--amber-100, #fef3c7)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke="var(--amber-500, #f59e0b)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(essay.score ?? 0) / 10 * 264} 264`}
                    className="ring-animate"
                    style={{ strokeDashoffset: 0 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <AnimatedCounter
                    value={essay.score ?? 0}
                    duration={1200}
                    className="text-3xl font-bold text-amber-700"
                  />
                </div>
              </div>
              <p className="text-xs text-amber-600/50 mt-2">su 10</p>
            </CardContent>
          </Card>

          {/* Score bars */}
          <Card className="border-amber-100 bg-white lg:col-span-2">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-amber-900">Dettaglio punteggi</h3>
              {scoreItems.map((item, idx) => (
                <AnimatedScoreBar
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  color={item.color}
                  delay={0.2 + idx * 0.15}
                />
              ))}
            </CardContent>
          </Card>

          {/* Radar chart */}
          <Card className="border-amber-100 bg-white lg:col-span-2">
            <CardContent className="p-6">
              <h3 className="font-semibold text-amber-900 mb-4">Profilo di competenza</h3>
              <ScoreRadarChart
                grammar={essay.grammarScore ?? 0}
                coherence={essay.coherenceScore ?? 0}
                vocabulary={essay.vocabularyScore ?? 0}
                clarity={essay.clarityScore ?? 0}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* CILS Level Assessment */}
      {hasCilsAssessment && showResults && !isCorrecting && essay.cilsLevelAssessment && <CilsLevelCard assessment={essay.cilsLevelAssessment} />}

      {/* Interactive annotated text (primary view with structured errors) */}
      {hasStructuredErrors && showResults && !isCorrecting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <AnnotatedTextView text={essay.content} errors={essay.errors! as ErrorItem[]} />
        </motion.div>
      )}

      {/* Side by side comparison (fallback when no structured errors) */}
      {hasCorrection && !hasStructuredErrors && showResults && !isCorrecting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <TextDiffView original={essay.content} corrected={essay.correctedContent!} />
        </motion.div>
      )}

      {/* AI Feedback */}
      {essay.aiFeedback && showResults && !isCorrecting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="border-amber-100 bg-white">
            <CardHeader className="pb-2">
              <button
                onClick={() => setFeedbackExpanded(!feedbackExpanded)}
                className="flex items-center justify-between w-full"
              >
                <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Feedback IA
                </CardTitle>
                <motion.div
                  animate={{ rotate: feedbackExpanded ? 0 : 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronUp className="h-4 w-4 text-amber-600" />
                </motion.div>
              </button>
            </CardHeader>
            <AnimatePresence initial={false}>
              {feedbackExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <CardContent>
                    <div className="prose prose-sm max-w-none text-amber-900/80 whitespace-pre-wrap leading-relaxed">
                      {essay.aiFeedback}
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      )}

      {/* Error annotations (legacy text format) */}
      {essay.errorAnnotations && !hasStructuredErrors && showResults && !isCorrecting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <ErrorAnnotationsList annotations={essay.errorAnnotations} />
        </motion.div>
      )}

      {/* Study Topics */}
      {essay.studyTopics && essay.studyTopics.length > 0 && showResults && !isCorrecting && (
        <StudyTopicsCard topics={essay.studyTopics} />
      )}

      {/* Self assessment section */}
      {showResults && !isCorrecting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Card className="border-amber-100 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-amber-500" />
                  Autovalutazione
                </h3>
                {!assessment && (
                  <Button
                    onClick={() => setCurrentView('self-assessment')}
                    variant="outline"
                    size="sm"
                    className="border-amber-200 text-amber-700 hover:bg-amber-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Compila autovalutazione
                  </Button>
                )}
              </div>
              {assessment ? (
                <ReflectiveAssessmentView assessment={assessment} essayErrors={essay.errors as ErrorItem[] | undefined} />
              ) : (
                <p className="text-sm text-amber-600/50">
                  Non hai ancora compilato un&apos;autovalutazione per questo testo.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Correct with AI button (if not corrected) */}
      {!hasCorrection && !isCorrecting && (
        <div className="flex flex-col items-center gap-3">
          <Button
            onClick={handleCorrectWithAI}
            disabled={isCorrecting}
            size="lg"
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white btn-shimmer btn-pulse-shadow shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="h-5 w-5" />
            Correggi con IA{targetLevel ? ` (obiettivo ${targetLevel})` : ''}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
