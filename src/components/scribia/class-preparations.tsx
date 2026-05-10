'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookMarked,
  Plus,
  Loader2,
  Sparkles,
  Clock,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAppStore, type ClassPreparation } from '@/store/app-store';
import { apiFetch } from './api-fetch';
import { toast } from 'sonner';

export function ClassPreparations() {
  const { classPreparations, setClassPreparations } = useAppStore();
  
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewPrep, setPreviewPrep] = useState<ClassPreparation | null>(null);

  useEffect(() => {
    async function loadPreparations() {
      setLoading(true);
      try {
        const data = await apiFetch<ClassPreparation[]>('/api/preparations');
        setClassPreparations(data);
      } catch {
        // Use store data
      } finally {
        setLoading(false);
      }
    }
    loadPreparations();
  }, [setClassPreparations]);

  const handleSave = async () => {
    if (!title.trim() || !topic.trim() || !content.trim()) return;
    setIsSaving(true);

    try {
      const prep = await apiFetch<ClassPreparation>('/api/preparations', {
        method: 'POST',
        body: JSON.stringify({ title, topic, content }),
      });
      setClassPreparations([prep, ...classPreparations]);
      setTitle('');
      setTopic('');
      setContent('');
      setShowForm(false);
      toast.success('Preparazione salvata', { description: 'La preparazione è stata creata con successo.' });
    } catch (err) {
      toast.error('Errore', { description: err instanceof Error ? err.message : 'Errore nel salvataggio' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!topic.trim()) {
      toast.error('Argomento richiesto', { description: 'Inserisci un argomento per generare la preparazione.' });
      return;
    }
    setIsGenerating(true);

    try {
      const result = await apiFetch<{ content: string }>('/api/preparations/generate', {
        method: 'POST',
        body: JSON.stringify({ topic, title: title || topic }),
      });
      setContent(result.content);
      if (!title.trim()) setTitle(topic);
      toast.success('Contenuto generato', { description: 'La preparazione è stata generata con IA.' });
    } catch (err) {
      toast.error('Errore', { description: err instanceof Error ? err.message : 'Errore nella generazione' });
    } finally {
      setIsGenerating(false);
    }
  };

  const sortedPreps = [...classPreparations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-amber-600" />
            Preparazioni lezione
          </h2>
          <p className="text-sm text-amber-600/60">Crea e gestisci le preparazioni per le tue lezioni</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md"
        >
          <Plus className="h-4 w-4" />
          Nuova preparazione
        </Button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-amber-100 bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-amber-900">Titolo</Label>
                    <Input
                      placeholder="Es. Analisi dei promessi sposi"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="border-amber-200 focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-amber-900">Argomento</Label>
                    <Input
                      placeholder="Es. Romanzo storico, Analisi testuale..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="border-amber-200 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-amber-900">Contenuto</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateWithAI}
                      disabled={isGenerating || !topic.trim()}
                      className="border-amber-200 text-amber-700 hover:bg-amber-50"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Genera con IA
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Scrivi o genera il contenuto della preparazione..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="border-amber-200 focus:border-amber-500 min-h-[200px]"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !title.trim() || !topic.trim() || !content.trim()}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Salva preparazione
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="border-amber-200 text-amber-700"
                  >
                    Annulla
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preparations list */}
      {sortedPreps.length === 0 ? (
        <Card className="border-amber-100 bg-white">
          <CardContent className="p-8 text-center text-amber-600/50">
            <BookMarked className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nessuna preparazione ancora. Crea la prima!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPreps.map((prep) => (
            <motion.div
              key={prep.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-amber-100 bg-white hover:shadow-md transition-shadow h-full flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-semibold text-amber-900 line-clamp-2">{prep.title}</CardTitle>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 shrink-0 ml-2">
                      {prep.topic}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    {new Date(prep.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <p className="text-sm text-amber-800/60 line-clamp-3 mb-4">{prep.content}</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                        onClick={() => setPreviewPrep(prep)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Anteprima
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-amber-900">{previewPrep?.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                          {previewPrep?.topic}
                        </Badge>
                        <div className="prose prose-sm max-w-none text-amber-900/80 whitespace-pre-wrap">
                          {previewPrep?.content}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
