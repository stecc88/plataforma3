'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Brain,
  Lightbulb,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/store/app-store';
import { apiFetch } from './api-fetch';
import { toast } from 'sonner';

// ─── Error item type (from AI correction) ──────────────────────

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

// ─── Student response per error ────────────────────────────────

interface ErrorResponse {
  errorIndex: number;
  originalText: string;
  studentProblem: string;      // "Cosa c'è di sbagliato?"
  studentCorrection: string;   // "Come lo correggeresti?"
  matchLevel: 'exact' | 'partial' | 'missed'; // computed after reveal
}

// ─── Reflection per error (Step 3) ─────────────────────────────

interface ErrorReflection {
  errorIndex: number;
  noticedBefore: 'yes' | 'somewhat' | 'no';
  understoodExplanation: 'yes' | 'somewhat' | 'no';
  willRepeatError: 'probably_yes' | 'not_sure' | 'no';
}

// ─── Step types ────────────────────────────────────────────────

type Step = 1 | 2 | 3;

// ─── Match level computation ───────────────────────────────────

function computeMatchLevel(
  studentCorrection: string,
  correctedText: string
): 'exact' | 'partial' | 'missed' {
  if (!studentCorrection.trim()) return 'missed';

  const studentNorm = studentCorrection.trim().toLowerCase().replace(/[.,!?;:'"]/g, '');
  const correctedNorm = correctedText.trim().toLowerCase().replace(/[.,!?;:'"]/g, '');

  // Exact match
  if (studentNorm === correctedNorm) return 'exact';

  // Check if the student's correction contains the key part of the correct answer
  const correctedWords = correctedNorm.split(/\s+/);
  const studentWords = studentNorm.split(/\s+/);

  // If more than half the words match, it's partial
  const matchingWords = studentWords.filter(w => correctedWords.includes(w));
  if (matchingWords.length > 0 && matchingWords.length / Math.max(correctedWords.length, 1) >= 0.4) {
    return 'partial';
  }

  // Check if student identified the core issue even if not the exact correction
  if (studentNorm.length > 2 && correctedNorm.includes(studentNorm)) return 'partial';

  return 'missed';
}

// ─── Match level badge ─────────────────────────────────────────

function MatchBadge({ level }: { level: 'exact' | 'partial' | 'missed' }) {
  switch (level) {
    case 'exact':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Corretto!
        </Badge>
      );
    case 'partial':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Parzialmente corretto
        </Badge>
      );
    case 'missed':
      return (
        <Badge className="bg-rose-100 text-rose-700 border-rose-200">
          <XCircle className="h-3 w-3 mr-1" />
          Non individuato
        </Badge>
      );
  }
}

// ─── Choice button (for Step 3 questions) ──────────────────────

function ChoiceButton({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-all duration-200 ${
            value === opt.value
              ? 'bg-amber-100 border-amber-300 text-amber-800 font-medium shadow-sm'
              : 'bg-white border-amber-200 text-amber-600 hover:bg-amber-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────

export function SelfAssessment() {
  const { currentEssay, setCurrentView, setCurrentEssay } = useAppStore();

  const [step, setStep] = useState<Step>(1);
  const [errorResponses, setErrorResponses] = useState<ErrorResponse[]>([]);
  const [reflections, setReflections] = useState<ErrorReflection[]>([]);
  const [overallReflection, setOverallReflection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedErrors, setRevealedErrors] = useState<Set<number>>(new Set());

  // Parse errors from essay
  const errors: ErrorItem[] = useMemo(() => {
    if (!currentEssay?.errors || !Array.isArray(currentEssay.errors)) return [];
    return currentEssay.errors as ErrorItem[];
  }, [currentEssay]);

  // Initialize responses when errors are available
  useEffect(() => {
    if (errors.length > 0 && errorResponses.length === 0) {
      setErrorResponses(
        errors.map((err, idx) => ({
          errorIndex: idx,
          originalText: err.originalText,
          studentProblem: '',
          studentCorrection: '',
          matchLevel: 'missed' as const,
        }))
      );
      setReflections(
        errors.map((_, idx) => ({
          errorIndex: idx,
          noticedBefore: 'no' as const,
          understoodExplanation: 'somewhat' as const,
          willRepeatError: 'not_sure' as const,
        }))
      );
    }
  }, [errors.length]);

  // Compute match levels when moving to step 2
  const handleGoToStep2 = () => {
    const updated = errorResponses.map((resp, idx) => ({
      ...resp,
      matchLevel: computeMatchLevel(resp.studentCorrection, errors[idx]?.correctedText || ''),
    }));
    setErrorResponses(updated);
    setStep(2);
  };

  // Toggle reveal for individual error in step 2
  const toggleReveal = (idx: number) => {
    setRevealedErrors(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Reveal all in step 2
  const revealAll = () => {
    setRevealedErrors(new Set(errors.map((_, i) => i)));
  };

  // Step progress
  const stepProgress = step === 1 ? 33 : step === 2 ? 66 : 100;
  const answeredCount = errorResponses.filter(r => r.studentProblem.trim() || r.studentCorrection.trim()).length;

  // Submit
  const handleSubmit = async () => {
    if (!currentEssay) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        // Legacy fields (computed from new data)
        clarity: 0,
        coherence: 0,
        grammar: 0,
        vocabulary: 0,
        reflection: JSON.stringify({
          version: 2,
          errorResponses,
          reflections,
          overallReflection,
          summary: {
            total: errors.length,
            exact: errorResponses.filter(r => r.matchLevel === 'exact').length,
            partial: errorResponses.filter(r => r.matchLevel === 'partial').length,
            missed: errorResponses.filter(r => r.matchLevel === 'missed').length,
          },
        }),
      };

      await apiFetch(`/api/essays/${currentEssay.id}/self-assess`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success('Autovalutazione salvata', {
        description: 'La tua autovalutazione riflessiva è stata registrata.',
      });
      // Reload the essay to get the updated self-assessment
      try {
        const updatedEssay = await apiFetch<typeof currentEssay>(`/api/essays/${currentEssay.id}`);
        setCurrentEssay(updatedEssay);
      } catch {
        // ignore
      }
      setCurrentView('essay-detail');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentEssay) {
    return (
      <div className="text-center py-16 text-amber-600/50">
        <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p>Nessun testo selezionato per l&apos;autovalutazione</p>
        <Button
          variant="outline"
          onClick={() => setCurrentView('student-dashboard')}
          className="mt-4 border-amber-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna al cruscotto
        </Button>
      </div>
    );
  }

  if (errors.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setCurrentView('essay-detail')} className="text-amber-700 hover:bg-amber-50">
            <ArrowLeft className="h-4 w-4" />
            Indietro
          </Button>
          <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-amber-600" />
            Autovalutazione
          </h2>
        </div>
        <Card className="border-amber-100 bg-white">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
            <h3 className="text-lg font-semibold text-amber-900 mb-2">Nessun errore da analizzare</h3>
            <p className="text-sm text-amber-600/60 mb-4">
              Il tuo testo non contiene errori rilevanti. Ottimo lavoro!
            </p>
            <Button onClick={() => setCurrentView('essay-detail')} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
              Torna al testo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => setCurrentView('essay-detail')}
          className="text-amber-700 hover:bg-amber-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
            <Brain className="h-5 w-5 text-amber-600" />
            Autovalutazione riflessiva
          </h2>
          <p className="text-sm text-amber-600/60">&quot;{currentEssay.title}&quot;</p>
        </div>
      </div>

      {/* Step indicator */}
      <Card className="border-amber-100 bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-amber-900">Passo {step} di 3</span>
            <span className="text-xs text-amber-600/60">{stepProgress}%</span>
          </div>
          <Progress value={stepProgress} className="h-2 bg-amber-100" />
          <div className="flex justify-between mt-3">
            {[
              { n: 1, label: 'Trova gli errori', icon: EyeOff },
              { n: 2, label: 'Confronta', icon: Eye },
              { n: 3, label: 'Rifletti', icon: Lightbulb },
            ].map((s) => (
              <button
                key={s.n}
                onClick={() => {
                  if (s.n < step) setStep(s.n as Step);
                }}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  s.n === step
                    ? 'text-amber-800 font-semibold'
                    : s.n < step
                    ? 'text-emerald-600 cursor-pointer hover:text-emerald-700'
                    : 'text-amber-400'
                }`}
              >
                <s.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════════════════════════════════
            STEP 1 — Trova gli errori (Before seeing corrections)
            ═══════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <EyeOff className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900">Passo 1: Trova gli errori</h3>
                    <p className="text-sm text-amber-700/70 mt-1">
                      Il testo contiene <strong>{errors.length} errori</strong> segnati. Per ogni errore, prova a capire cosa non va e come lo correggeresti. Non vedere ancora la correzione della IA!
                    </p>
                    <p className="text-xs text-amber-600/50 mt-1">
                      Risposte finora: {answeredCount}/{errors.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {errors.map((err, idx) => (
              <motion.div
                key={`step1-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <Card className="border-amber-100 bg-white">
                  <CardContent className="p-5 space-y-4">
                    {/* Error number + original text */}
                    <div className="flex items-start gap-3">
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm font-bold shrink-0"
                        style={{ backgroundColor: err.color || '#f97316' }}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-amber-600/50 mb-1">
                          Errore {idx + 1} — <span className="capitalize">{err.type}</span>
                        </p>
                        <div className="inline-flex items-center gap-1 rounded bg-red-100 px-3 py-1.5 text-red-800 line-through decoration-red-400 font-medium">
                          {err.originalText}
                        </div>
                      </div>
                    </div>

                    {/* Student input fields */}
                    <div className="space-y-3 pl-11">
                      <div className="space-y-1.5">
                        <Label className="text-amber-900 text-sm">
                          🤔 Cosa c&apos;è di sbagliato qui?
                        </Label>
                        <Textarea
                          placeholder="Es. Manca il verbo ausiliare, l'articolo è sbagliato..."
                          value={errorResponses[idx]?.studentProblem || ''}
                          onChange={(e) => {
                            const updated = [...errorResponses];
                            updated[idx] = { ...updated[idx], studentProblem: e.target.value };
                            setErrorResponses(updated);
                          }}
                          className="border-amber-200 focus:border-amber-500 min-h-[60px] text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-amber-900 text-sm">
                          ✏️ Come lo correggeresti?
                        </Label>
                        <Textarea
                          placeholder="Scrivi la tua versione corretta..."
                          value={errorResponses[idx]?.studentCorrection || ''}
                          onChange={(e) => {
                            const updated = [...errorResponses];
                            updated[idx] = { ...updated[idx], studentCorrection: e.target.value };
                            setErrorResponses(updated);
                          }}
                          className="border-amber-200 focus:border-amber-500 min-h-[60px] text-sm font-mono"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {/* Navigation */}
            <div className="flex justify-end">
              <Button
                onClick={handleGoToStep2}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                size="lg"
              >
                Vedi la correzione IA
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STEP 2 — Confronta con la IA (Reveal corrections)
            ═══════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900">Passo 2: Confronta con la IA</h3>
                    <p className="text-sm text-amber-700/70 mt-1">
                      Ora puoi vedere la correzione della IA. Confrontala con la tua: l&apos;hai trovato? Ti sei avvicinato?
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={revealAll}
                    className="border-amber-200 text-amber-700 hover:bg-amber-50 text-xs shrink-0"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Rivela tutti
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary bar */}
            <div className="flex gap-3">
              <div className="flex-1 text-center p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-lg font-bold text-emerald-700">
                  {errorResponses.filter(r => r.matchLevel === 'exact').length}
                </p>
                <p className="text-[10px] text-emerald-600">Corretti</p>
              </div>
              <div className="flex-1 text-center p-2 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-lg font-bold text-amber-700">
                  {errorResponses.filter(r => r.matchLevel === 'partial').length}
                </p>
                <p className="text-[10px] text-amber-600">Parziali</p>
              </div>
              <div className="flex-1 text-center p-2 rounded-lg bg-rose-50 border border-rose-100">
                <p className="text-lg font-bold text-rose-700">
                  {errorResponses.filter(r => r.matchLevel === 'missed').length}
                </p>
                <p className="text-[10px] text-rose-600">Mancati</p>
              </div>
            </div>

            {errors.map((err, idx) => {
              const isRevealed = revealedErrors.has(idx);
              const resp = errorResponses[idx];
              return (
                <motion.div
                  key={`step2-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                >
                  <Card className={`border-amber-100 bg-white ${isRevealed ? '' : 'border-dashed'}`}>
                    <CardContent className="p-5 space-y-3">
                      {/* Error header */}
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: err.color || '#f97316' }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-red-800 line-through decoration-red-400 font-medium text-sm">
                            {err.originalText}
                          </span>
                          <span className="text-amber-500 mx-1">→</span>
                          {isRevealed ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 font-medium text-sm">
                              {err.correctedText}
                            </span>
                          ) : (
                            <button
                              onClick={() => toggleReveal(idx)}
                              className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-amber-600 text-sm cursor-pointer hover:bg-amber-200 transition-colors"
                            >
                              <Eye className="h-3 w-3" />
                              Clicca per vedere
                            </button>
                          )}
                        </div>
                        {isRevealed && resp && <MatchBadge level={resp.matchLevel} />}
                      </div>

                      {/* Student's answers */}
                      {resp && (resp.studentProblem || resp.studentCorrection) && (
                        <div className="pl-11 space-y-2">
                          {resp.studentCorrection && (
                            <div className="text-sm">
                              <span className="text-amber-700/50">La tua correzione: </span>
                              <span className="font-medium text-amber-800">&quot;{resp.studentCorrection}&quot;</span>
                            </div>
                          )}
                          {resp.studentProblem && (
                            <div className="text-sm">
                              <span className="text-amber-700/50">La tua diagnosi: </span>
                              <span className="text-amber-800">&quot;{resp.studentProblem}&quot;</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* AI explanation (only when revealed) */}
                      {isRevealed && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.3 }}
                          className="pl-11"
                        >
                          <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 space-y-1.5">
                            {err.shortReason && (
                              <p className="text-sm font-medium text-amber-800">{err.shortReason}</p>
                            )}
                            {err.explanation && (
                              <p className="text-xs text-amber-700/70 leading-relaxed">{err.explanation}</p>
                            )}
                            {err.grammarRule && (
                              <p className="text-xs text-amber-600/60 italic">Regola: {err.grammarRule}</p>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* Reveal button at bottom */}
                      {!isRevealed && (
                        <div className="pl-11">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleReveal(idx)}
                            className="border-amber-200 text-amber-700 hover:bg-amber-50"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Rivela la correzione
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna al passo 1
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                Rifletti sui tuoi errori
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STEP 3 — Riflessione (Final reflection)
            ═══════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900">Passo 3: Rifletti</h3>
                    <p className="text-sm text-amber-700/70 mt-1">
                      Ora rispondi con sincerità: riflettere sui tuoi errori è il modo più efficace per non ripeterli.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {errors.map((err, idx) => {
              const refl = reflections[idx];
              if (!refl) return null;
              return (
                <motion.div
                  key={`step3-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                >
                  <Card className="border-amber-100 bg-white">
                    <CardContent className="p-5 space-y-4">
                      {/* Error reminder */}
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: err.color || '#f97316' }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex rounded bg-red-100 px-2 py-0.5 text-red-800 line-through text-sm">
                            {err.originalText}
                          </span>
                          <span className="text-amber-500">→</span>
                          <span className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 text-sm font-medium">
                            {err.correctedText}
                          </span>
                        </div>
                        {errorResponses[idx] && <MatchBadge level={errorResponses[idx].matchLevel} />}
                      </div>

                      {/* Reflective questions */}
                      <div className="space-y-4 pl-11">
                        <div className="space-y-1.5">
                          <Label className="text-amber-900 text-sm">
                            🔍 Avevi notato questo errore prima che te lo segnassero?
                          </Label>
                          <ChoiceButton
                            options={[
                              { value: 'yes', label: 'Sì' },
                              { value: 'somewhat', label: 'Più o meno' },
                              { value: 'no', label: 'No' },
                            ]}
                            value={refl.noticedBefore}
                            onChange={(v) => {
                              const updated = [...reflections];
                              updated[idx] = { ...updated[idx], noticedBefore: v as ErrorReflection['noticedBefore'] };
                              setReflections(updated);
                            }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-amber-900 text-sm">
                            💡 Hai capito la spiegazione della IA?
                          </Label>
                          <ChoiceButton
                            options={[
                              { value: 'yes', label: 'Sì' },
                              { value: 'somewhat', label: 'Più o meno' },
                              { value: 'no', label: 'No' },
                            ]}
                            value={refl.understoodExplanation}
                            onChange={(v) => {
                              const updated = [...reflections];
                              updated[idx] = { ...updated[idx], understoodExplanation: v as ErrorReflection['understoodExplanation'] };
                              setReflections(updated);
                            }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-amber-900 text-sm">
                            🔄 Pensi che farai di nuovo questo errore?
                          </Label>
                          <ChoiceButton
                            options={[
                              { value: 'probably_yes', label: 'Probabilmente sì' },
                              { value: 'not_sure', label: 'Non sicuro' },
                              { value: 'no', label: 'No' },
                            ]}
                            value={refl.willRepeatError}
                            onChange={(v) => {
                              const updated = [...reflections];
                              updated[idx] = { ...updated[idx], willRepeatError: v as ErrorReflection['willRepeatError'] };
                              setReflections(updated);
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {/* Overall reflection */}
            <Card className="border-amber-100 bg-white">
              <CardContent className="p-5 space-y-3">
                <Label className="text-amber-900 font-medium">
                  📝 Riflessione finale (opzionale)
                </Label>
                <p className="text-xs text-amber-600/60">
                  Qual è la cosa più importante che hai imparato da questa correzione? Cosa farai diversamente la prossima volta?
                </p>
                <Textarea
                  placeholder="Es. Ho capito che confondo il congiuntivo con l'indicativo nei verbi irregolari..."
                  value={overallReflection}
                  onChange={(e) => setOverallReflection(e.target.value)}
                  className="border-amber-200 focus:border-amber-500 min-h-[100px] text-sm"
                />
              </CardContent>
            </Card>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna al passo 2
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                size="lg"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Salva autovalutazione
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
