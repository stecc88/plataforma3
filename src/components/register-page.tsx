'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Eye, EyeOff, Loader2, ArrowLeft, User, GraduationCap, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store/app-store';
import { apiFetch } from '@/components/scribia/api-fetch';
import { toast } from 'sonner';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    status: string;
    teacherCode?: string;
    institution?: string;
  };
  token: string;
  enrollment?: {
    teacherId: string;
    teacherName: string;
  } | null;
}

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [institution, setInstitution] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const { setUser, setCurrentView } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await apiFetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          institution: institution || undefined,
          teacherCode: role === 'STUDENT' && teacherCode.trim() ? teacherCode.trim() : undefined,
        }),
      });
      setUser(data.user, data.token);

      // Show enrollment success toast
      if (data.enrollment) {
        toast.success('Iscrizione completata', {
          description: `Ti sei iscritto alla classe del docente ${data.enrollment.teacherName}`,
        });
      }

      // PENDING teacher — show approval pending screen instead of dashboard
      if (data.user.status === 'PENDING') {
        setCurrentView('pending-approval');
        return;
      }

      const roleValue = data.user.role;
      setCurrentView(
        roleValue === 'ADMIN'
          ? 'admin-dashboard'
          : roleValue === 'TEACHER'
            ? 'teacher-dashboard'
            : 'student-dashboard'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <motion.div
          className="flex items-center justify-center gap-3 mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <img src="/logo-scribia.png" alt="ScribIA" className="w-12 h-12 rounded-xl shadow-lg" />
          <div>
            <h1 className="text-2xl font-bold text-amber-900">ScribIA</h1>
            <p className="text-xs text-amber-700 -mt-0.5">Assistente di scrittura italiana</p>
          </div>
        </motion.div>

        <Card className="border-amber-200/50 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-amber-900">Registrati</CardTitle>
            <CardDescription>Crea un nuovo account per iniziare</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-amber-900">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                  <Input
                    id="name"
                    placeholder="Il tuo nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 border-amber-200 focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="reg-email" className="text-amber-900">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="la.tua@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-amber-200 focus:border-amber-500"
                  required
                />
              </div>

              {/* Ruolo */}
              <div className="space-y-2">
                <Label className="text-amber-900">Ruolo</Label>
                <Select value={role} onValueChange={(v) => setRole(v as 'STUDENT' | 'TEACHER')}>
                  <SelectTrigger className="w-full border-amber-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        <span>Studente</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="TEACHER">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>Docente</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Istituzione */}
              <div className="space-y-2">
                <Label htmlFor="institution" className="text-amber-900">Istituzione (opzionale)</Label>
                <Input
                  id="institution"
                  placeholder="Es. Liceo Scientifico Galilei"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="border-amber-200 focus:border-amber-500"
                />
              </div>

              {/* Codice Docente — solo per studenti */}
              {role === 'STUDENT' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  <Label htmlFor="teacherCode" className="text-amber-900">Codice docente (opzionale)</Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                    <Input
                      id="teacherCode"
                      placeholder="Es. SBCTQ7"
                      value={teacherCode}
                      onChange={(e) => setTeacherCode(e.target.value.toUpperCase())}
                      className="pl-9 border-amber-200 focus:border-amber-500 font-mono uppercase tracking-wider"
                      maxLength={6}
                    />
                  </div>
                  <p className="text-xs text-amber-600/60">Inserisci il codice del tuo docente per iscriverti alla sua classe</p>
                </motion.div>
              )}

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-amber-900">Password</Label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="La tua password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 border-amber-200 focus:border-amber-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

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

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registrazione in corso...
                  </>
                ) : (
                  'Registrati'
                )}
              </Button>
            </form>

            {/* Toggle mode */}
            <div className="mt-6 text-center text-sm text-amber-700">
              Hai già un account?{' '}
              <button
                onClick={() => setCurrentView('login')}
                className="font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2"
              >
                Accedi
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <button
            onClick={() => setCurrentView('landing')}
            className="text-sm text-amber-600/60 hover:text-amber-700 transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Torna alla homepage
          </button>
        </div>
      </motion.div>
    </div>
  );
}
