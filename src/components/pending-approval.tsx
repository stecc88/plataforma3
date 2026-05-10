'use client';

import { motion } from 'framer-motion';
import { Clock, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppStore } from '@/store/app-store';

export function PendingApproval() {
  const { user, logout } = useAppStore();

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
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100"
            >
              <Clock className="h-8 w-8 text-amber-600" />
            </motion.div>
            <CardTitle className="text-xl text-amber-900">Registrazione in attesa</CardTitle>
            <CardDescription className="text-amber-700">
              Il tuo account docente è in fase di approvazione
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3"
            >
              <p className="text-sm text-amber-800">
                Ciao <span className="font-semibold">{user?.name}</span>,
              </p>
              <p className="text-sm text-amber-700">
                La tua richiesta di registrazione come docente è stata inviata con successo.
                Un amministratore deve approvare il tuo account prima che tu possa accedere alla piattaforma.
              </p>
              {user?.institution && (
                <p className="text-xs text-amber-600/70">
                  Istituzione: {user.institution}
                </p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4"
            >
              <p className="text-sm text-blue-700">
                Riceverai un&apos;email di conferma quando il tuo account sarà attivato.
                Il processo di approvazione richiede generalmente 24-48 ore.
              </p>
            </motion.div>

            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={logout}
                variant="outline"
                className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Esci e torna più tardi
              </Button>

              <button
                onClick={logout}
                className="text-sm text-amber-600/60 hover:text-amber-700 transition-colors inline-flex items-center justify-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Torna alla homepage
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
