'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Save, Send, Loader2, PenLine, Type, Hash, FileText, Target, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAppStore, type Essay } from '@/store/app-store';
import { apiFetch } from './api-fetch';
import { toast } from 'sonner';

// ─── CILS Level colors ───────────────────────────────────────
const CILS_COLORS: Record<string, string> = {
  A1: 'bg-gray-100 text-gray-700 border-gray-200',
  A2: 'bg-blue-100 text-blue-700 border-blue-200',
  B1: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  B2: 'bg-amber-100 text-amber-700 border-amber-200',
  C1: 'bg-orange-100 text-orange-700 border-orange-200',
  C2: 'bg-rose-100 text-rose-700 border-rose-200',
};

const CILS_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function EssayEditor() {
  const { currentEssay, user, setCurrentView, setCurrentEssay, essays, setEssays } = useAppStore();
  

  const [title, setTitle] = useState(currentEssay?.title || '');
  const [topic, setTopic] = useState(currentEssay?.topic || '');
  const [content, setContent] = useState(currentEssay?.content || '');
  const [targetLevel, setTargetLevel] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  const charCount = content.length;

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setError('Il titolo è obbligatorio');
      return;
    }
    if (!content.trim()) {
      setError('Il contenuto è obbligatorio');
      return;
    }
    setError(null);
    setIsSaving(true);

    try {
      const essay = await apiFetch<Essay>('/api/essays', {
        method: 'POST',
        body: JSON.stringify({ title, topic: topic || undefined, content }),
      });
      setCurrentEssay(essay);
      setEssays([essay, ...essays.filter(e => e.id !== essay.id)]);
      toast.success('Bozza salvata', { description: 'Il testo è stato salvato con successo.' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForCorrection = async () => {
    if (!title.trim()) {
      setError('Il titolo è obbligatorio');
      return;
    }
    if (!content.trim()) {
      setError('Il contenuto è obbligatorio');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      // Save the essay first
      const essay = await apiFetch<Essay>('/api/essays', {
        method: 'POST',
        body: JSON.stringify({ title, topic: topic || undefined, content }),
      });

      // Now submit for AI correction (with optional targetLevel)
      const correctionBody: Record<string, unknown> = {};
      if (targetLevel) {
        correctionBody.targetLevel = targetLevel;
      }
      const corrected = await apiFetch<Essay>(`/api/essays/${essay.id}/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correctionBody),
      });

      setCurrentEssay(corrected);
      setEssays([corrected, ...essays.filter(e => e.id !== corrected.id)]);
      setCurrentView('essay-detail');
      toast.success('Correzione completata', {
        description: corrected.cilsLevelAssessment
          ? `Livello stimato: ${corrected.cilsLevelAssessment.estimatedLevel}`
          : 'La correzione IA è pronta.',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell\'invio');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
          <PenLine className="h-5 w-5 text-amber-600" />
          Nuovo testo
        </h2>
        <p className="text-sm text-amber-600/60 mt-1">
          Scrivi il tuo elaborato e invialo per la correzione IA
        </p>
      </div>

      <Card className="border-amber-100 bg-white">
        <CardContent className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-amber-900 flex items-center gap-2">
              <Type className="h-4 w-4 text-amber-500" />
              Titolo
            </Label>
            <Input
              id="title"
              placeholder="Inserisci il titolo del tuo testo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-amber-200 focus:border-amber-500 text-lg"
              maxLength={200}
            />
          </div>

          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic" className="text-amber-900 flex items-center gap-2">
              <Hash className="h-4 w-4 text-amber-500" />
              Argomento (opzionale)
            </Label>
            <Input
              id="topic"
              placeholder="Es. Descrizione, Narrativa, Argomentativo..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="border-amber-200 focus:border-amber-500"
              maxLength={100}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-amber-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              Contenuto
            </Label>
            <Textarea
              id="content"
              placeholder="Scrivi il tuo elaborato qui..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="border-amber-200 focus:border-amber-500 min-h-[300px] text-base leading-relaxed resize-y"
            />
            <div className="flex items-center justify-between text-xs text-amber-600/50">
              <span>{wordCount} parole</span>
              <span>{charCount} caratteri</span>
            </div>
          </div>

          {/* CILS Target Level */}
          <div className="space-y-2">
            <Label className="text-amber-900 flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-500" />
              Obiettivo CILS (opzionale)
            </Label>
            <p className="text-xs text-amber-600/50">
              Seleziona il livello che vuoi raggiungere. L&apos;IA valuterà se il tuo testo lo supera.
            </p>
            <div className="flex gap-2 flex-wrap">
              {CILS_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setTargetLevel(targetLevel === level ? '' : level)}
                  className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] border ${
                    targetLevel === level
                      ? CILS_COLORS[level] + ' ring-2 ring-violet-400 ring-offset-1 scale-105'
                      : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100 hover:border-gray-200'
                  }`}
                >
                  <Award className="h-3 w-3 inline-block mr-1" />
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleSaveDraft}
              disabled={isSaving || isSubmitting}
              variant="outline"
              className="border-amber-200 text-amber-700 hover:bg-amber-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salva bozza
            </Button>
            <Button
              onClick={handleSubmitForCorrection}
              disabled={isSaving || isSubmitting}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md btn-shimmer btn-pulse-shadow transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Invia per correzione{targetLevel ? ` (obiettivo ${targetLevel})` : ''}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
