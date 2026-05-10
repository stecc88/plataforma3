'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StickyNote,
  Plus,
  Loader2,
  Filter,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppStore, type TeacherNote } from '@/store/app-store';
import { apiFetch } from './api-fetch';
import { toast } from 'sonner';

export function TeacherNotes() {
  const { teacherNotes, setTeacherNotes, students } = useAppStore();
  
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [filterStudentId, setFilterStudentId] = useState<string>('all');

  useEffect(() => {
    async function loadNotes() {
      setLoading(true);
      try {
        const data = await apiFetch<{ notes: TeacherNote[] }>('/api/notes');
        setTeacherNotes(data.notes);
      } catch {
        // Use store data
      } finally {
        setLoading(false);
      }
    }
    loadNotes();
  }, [setTeacherNotes]);

  const handleAddNote = async () => {
    if (!selectedStudentId || !noteContent.trim()) return;
    setIsSaving(true);

    try {
      const response = await apiFetch<{ note: TeacherNote }>('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ studentId: selectedStudentId, content: noteContent }),
      });
      const note = response.note;
      setTeacherNotes([note, ...teacherNotes]);
      setNoteContent('');
      setSelectedStudentId('');
      setShowForm(false);
      toast.success('Nota aggiunta', { description: 'La nota è stata salvata con successo.' });
    } catch (err) {
      toast.error('Errore', { description: err instanceof Error ? err.message : 'Errore nel salvataggio' });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredNotes = filterStudentId === 'all'
    ? teacherNotes
    : teacherNotes.filter(n => n.studentId === filterStudentId);

  const sortedNotes = [...filteredNotes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const uniqueStudents = Array.from(
    new Map(teacherNotes.map(n => [n.studentId, { id: n.studentId, name: n.studentName || 'Studente' }])).values()
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
            <StickyNote className="h-5 w-5 text-amber-600" />
            Note studenti
          </h2>
          <p className="text-sm text-amber-600/60">Gestisci le note per i tuoi studenti</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md"
        >
          <Plus className="h-4 w-4" />
          Nuova nota
        </Button>
      </div>

      {/* Add note form */}
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
                <div className="space-y-2">
                  <Label className="text-amber-900">Studente</Label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger className="w-full border-amber-200">
                      <SelectValue placeholder="Seleziona uno studente" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name || s.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-amber-900">Contenuto della nota</Label>
                  <Textarea
                    placeholder="Scrivi la nota per lo studente..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="border-amber-200 focus:border-amber-500 min-h-[100px]"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleAddNote}
                    disabled={isSaving || !selectedStudentId || !noteContent.trim()}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Salva nota
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

      {/* Filter */}
      {uniqueStudents.length > 1 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-amber-600" />
          <Select value={filterStudentId} onValueChange={setFilterStudentId}>
            <SelectTrigger className="w-48 border-amber-200 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli studenti</SelectItem>
              {uniqueStudents.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Notes list */}
      {sortedNotes.length === 0 ? (
        <Card className="border-amber-100 bg-white">
          <CardContent className="p-8 text-center text-amber-600/50">
            <StickyNote className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nessuna nota ancora. Aggiungi la prima!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-[600px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {sortedNotes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-amber-100 bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 border border-amber-200 shrink-0">
                      <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                        {note.studentName?.charAt(0)?.toUpperCase() || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-amber-900">{note.studentName || 'Studente'}</p>
                        <span className="text-xs text-amber-600/40 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(note.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-amber-800/70 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
