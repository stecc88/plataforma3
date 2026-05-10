'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import {
  BookOpen,
  Sparkles,
  ClipboardCheck,
  GraduationCap,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  PenLine,
  ChevronRight,
  Menu,
  X,
  Loader2,
  Users,
  TrendingUp,
  BookMarked,
  Star,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/store/app-store';

/* ──────────────────────── Animation variants ──────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

/* ──────────────────────── FadeInUp Component ──────────────────────── */

function FadeInUp({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ──────────────────────── Navigation Bar ──────────────────────── */

function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { setCurrentView } = useAppStore();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Funzionalità', href: '#features' },
    { label: 'Demo', href: '#demo' },
    { label: 'Come funziona', href: '#how-it-works' },
    { label: 'Docenti', href: '#teachers' },
  ];

  const scrollToSection = (href: string) => {
    setMobileMenuOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-lg shadow-lg shadow-amber-900/5 border-b border-amber-100/50'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
              ScribIA
            </span>
          </div>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="px-3.5 py-2 text-sm font-medium text-amber-800/70 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setCurrentView('login')}
              className="text-amber-800 hover:text-amber-900 hover:bg-amber-50"
            >
              Accedi
            </Button>
            <Button
              onClick={() => setCurrentView('register')}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40"
            >
              Registrati
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' as const }}
            className="md:hidden bg-white/95 backdrop-blur-lg border-b border-amber-100 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-3 space-y-2 border-t border-amber-100 mt-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentView('login')}
                  className="w-full border-amber-200 text-amber-800 hover:bg-amber-50"
                >
                  Accedi
                </Button>
                <Button
                  onClick={() => setCurrentView('register')}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg"
                >
                  Registrati
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

/* ──────────────────────── Hero Section ──────────────────────── */

function HeroSection() {
  const { setCurrentView } = useAppStore();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-amber-200/30 via-orange-200/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-orange-200/20 via-amber-100/20 to-transparent rounded-full blur-3xl" />

      {/* Floating decorative icons */}
      <motion.div
        animate={{ y: [-8, 8, -8], rotate: [-5, 5, -5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' as const }}
        className="absolute top-32 left-[10%] hidden lg:block"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-300 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-300/30">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
      </motion.div>
      <motion.div
        animate={{ y: [-8, 8, -8], rotate: [-5, 5, -5] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.8 }}
        className="absolute top-48 right-[15%] hidden lg:block"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center shadow-lg shadow-orange-300/30">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
      </motion.div>
      <motion.div
        animate={{ y: [-8, 8, -8], rotate: [-5, 5, -5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' as const, delay: 1.6 }}
        className="absolute bottom-32 left-[20%] hidden lg:block"
      >
        <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-rose-300 to-rose-400 flex items-center justify-center shadow-lg shadow-rose-300/30">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
      </motion.div>
      <motion.div
        animate={{ y: [-8, 8, -8], rotate: [-5, 5, -5] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' as const, delay: 2.2 }}
        className="absolute top-60 left-[5%] hidden lg:block"
      >
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-300 to-violet-400 flex items-center justify-center shadow-lg shadow-violet-300/30">
          <PenLine className="w-4 h-4 text-white" />
        </div>
      </motion.div>
      <motion.div
        animate={{ y: [-8, 8, -8], rotate: [-5, 5, -5] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' as const, delay: 3 }}
        className="absolute bottom-48 right-[8%] hidden lg:block"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-300 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-300/30">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
      </motion.div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center lg:text-left"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge
                variant="secondary"
                className="mb-6 px-4 py-1.5 bg-amber-100/80 text-amber-700 border-amber-200/50 text-sm font-medium"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Potenziato dall&apos;Intelligenza Artificiale
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight"
            >
              <span className="bg-gradient-to-r from-amber-800 via-amber-700 to-orange-600 bg-clip-text text-transparent">
                Migliora la tua
              </span>
              <br />
              <span className="bg-gradient-to-r from-amber-700 via-orange-600 to-rose-600 bg-clip-text text-transparent">
                scrittura italiana
              </span>
              <br />
              <span className="text-amber-900">con l&apos;IA</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-6 text-lg sm:text-xl text-amber-800/70 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              Correzioni istantanee, autovalutazione guidata e analisi dettagliata per
              perfezionare le tue competenze di scrittura in italiano.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Button
                onClick={() => setCurrentView('register')}
                size="lg"
                className="h-12 px-8 text-base bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 transition-all relative overflow-hidden"
              >
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-200%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' as const }}
                />
                <span className="relative z-10 flex items-center">
                  Inizia gratuitamente
                  <ArrowRight className="w-5 h-5 ml-2" />
                </span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const el = document.querySelector('#demo');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="h-12 px-8 text-base border-amber-200 text-amber-800 hover:bg-amber-50 hover:border-amber-300"
              >
                Vedi la demo
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              custom={4}
              className="mt-8 flex items-center gap-6 justify-center lg:justify-start text-sm text-amber-700/60"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Gratuito</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Senza limiti</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>IA avanzata</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right visual - Floating cards */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="hidden lg:block relative"
          >
            <div className="relative w-full max-w-lg mx-auto">
              {/* Main card */}
              <motion.div variants={scaleIn} custom={0}>
                <Card className="bg-white/80 backdrop-blur-sm border-amber-100/50 shadow-2xl shadow-amber-900/10">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                        <PenLine className="w-4 h-4 text-white" />
                      </div>
                      <CardTitle className="text-base text-amber-900">Correzione IA</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-rose-50/80 rounded-lg border border-rose-100">
                      <p className="text-sm text-rose-700 line-through">Ho andato al parco ieri</p>
                    </div>
                    <div className="flex items-center gap-2 text-amber-600">
                      <ArrowRight className="w-4 h-4" />
                      <span className="text-xs font-medium">Correzione automatica</span>
                    </div>
                    <div className="p-3 bg-emerald-50/80 rounded-lg border border-emerald-100">
                      <p className="text-sm text-emerald-700">Sono andato al parco ieri</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Floating score badge */}
              <motion.div
                variants={scaleIn}
                custom={1}
                className="absolute -top-4 -right-4"
              >
                <Card className="bg-white/90 backdrop-blur-sm border-amber-100/50 shadow-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="text-xs text-amber-600">Punteggio</p>
                      <p className="text-lg font-bold text-amber-900">7.8/10</p>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Floating grammar badge */}
              <motion.div
                variants={scaleIn}
                custom={2}
                className="absolute -bottom-4 -left-4"
              >
                <Card className="bg-white/90 backdrop-blur-sm border-amber-100/50 shadow-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-xs text-amber-600">Grammatica</p>
                      <p className="text-lg font-bold text-emerald-600">+15%</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── Features Section ──────────────────────── */

const features = [
  {
    icon: Sparkles,
    title: 'Correzione IA',
    description:
      "L'intelligenza artificiale corregge automaticamente i tuoi testi, identificando errori grammaticali, sintattici e lessicali con precisione.",
    gradient: 'from-amber-500 to-orange-500',
    bgGlow: 'bg-amber-100/50',
  },
  {
    icon: ClipboardCheck,
    title: 'Autovalutazione',
    description:
      'Valuta autonomamente il tuo lavoro con criteri strutturati. Rifletti sui tuoi punti di forza e sulle aree da migliorare.',
    gradient: 'from-emerald-500 to-teal-500',
    bgGlow: 'bg-emerald-100/50',
  },
  {
    icon: GraduationCap,
    title: 'Dashboard docente',
    description:
      'Gestisci le tue classi, monitora i progressi degli studenti e prepara materiali didattici personalizzati.',
    gradient: 'from-violet-500 to-purple-500',
    bgGlow: 'bg-violet-100/50',
  },
  {
    icon: BarChart3,
    title: 'Analisi dettagliata',
    description:
      'Punteggi dettagliati per grammatica, coerenza, lessico e chiarezza con feedback costruttivi per ogni aspetto.',
    gradient: 'from-rose-500 to-pink-500',
    bgGlow: 'bg-rose-100/50',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-amber-50/30 to-white" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <Badge
            variant="secondary"
            className="mb-4 px-4 py-1.5 bg-amber-100/80 text-amber-700 border-amber-200/50"
          >
            Funzionalità
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-amber-900 mt-4">
            Tutto ciò che ti serve per scrivere meglio
          </h2>
          <p className="mt-4 text-lg text-amber-700/60 max-w-2xl mx-auto">
            Strumenti potenti progettati per studenti e docenti che vogliono eccellere nella scrittura italiana.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, i) => (
            <motion.div key={feature.title} variants={scaleIn} custom={i}>
              <Card className="group h-full bg-white/70 backdrop-blur-sm border-amber-100/50 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-900/5 hover:shadow-amber-200/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg mb-2 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg text-amber-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-amber-700/60 text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────── Interactive Demo Section ──────────────────────── */

const originalText =
  'La primavera è la stagione più bella in Italia. I fiori sbocciano e gli alberi diventano verdi. Ho andato al parco ieri e ho visto molti fiori colorati.';

const correctedText =
  'La primavera è la stagione più bella in Italia. I fiori sbocciano e gli alberi diventano verdi. Sono andato al parco ieri e ho visto molti fiori colorati.';

const errorAnnotation =
  '"ho andato" → "sono andato": il verbo "andare" richiede l\'ausiliare "essere"';

const sampleScores = [
  { label: 'Grammatica', score: 7.0, color: 'bg-amber-500' },
  { label: 'Coerenza', score: 8.0, color: 'bg-emerald-500' },
  { label: 'Lessico', score: 7.5, color: 'bg-violet-500' },
  { label: 'Chiarezza', score: 8.5, color: 'bg-rose-500' },
];

function InteractiveDemo() {
  const [demoState, setDemoState] = useState<'idle' | 'loading' | 'corrected'>('idle');

  const handleDemoCorrection = () => {
    if (demoState !== 'idle') return;
    setDemoState('loading');
    setTimeout(() => {
      setDemoState('corrected');
    }, 2000);
  };

  const resetDemo = () => {
    setDemoState('idle');
  };

  // Split texts to find the difference for highlighting
  const renderOriginalText = () => {
    const errorPart = 'Ho andato';
    const parts = originalText.split(errorPart);
    return (
      <p className="text-base leading-relaxed text-amber-900">
        {parts[0]}
        <span className="bg-rose-100 text-rose-700 px-1 py-0.5 rounded decoration-rose-400 line-through">
          {errorPart}
        </span>
        {parts[1]}
      </p>
    );
  };

  const renderCorrectedText = () => {
    const errorPart = 'Ho andato';
    const correctionPart = 'Sono andato';
    const beforeError = correctedText.split(correctionPart)[0];
    const afterError = correctedText.split(correctionPart)[1];
    return (
      <p className="text-base leading-relaxed text-amber-900">
        {beforeError}
        <span className="bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded font-medium">
          {correctionPart}
        </span>
        {afterError}
      </p>
    );
  };

  return (
    <section id="demo" className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-orange-50/30 to-white" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-amber-100/20 to-orange-100/20 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <Badge
            variant="secondary"
            className="mb-4 px-4 py-1.5 bg-orange-100/80 text-orange-700 border-orange-200/50"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Prova dal vivo
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-amber-900 mt-4">
            Vedi la correzione IA in azione
          </h2>
          <p className="mt-4 text-lg text-amber-700/60 max-w-2xl mx-auto">
            Osserva come l&apos;IA identifica e corregge gli errori grammaticali in un testo italiano.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeUp}
          custom={1}
          className="max-w-4xl mx-auto"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-amber-100/50 shadow-2xl shadow-amber-900/10 overflow-hidden">
            {/* Demo header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-sm font-medium text-amber-800">Editor di testo ScribIA</span>
              </div>
              {demoState === 'corrected' && (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Corretto
                </Badge>
              )}
            </div>

            <CardContent className="p-6 space-y-6">
              <AnimatePresence mode="wait">
                {/* Idle state - show original text */}
                {demoState === 'idle' && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="space-y-6"
                  >
                    <div className="p-5 bg-amber-50/50 rounded-xl border border-amber-100/50">
                      <div className="flex items-center gap-2 mb-3">
                        <PenLine className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-700">Testo originale</span>
                      </div>
                      <p className="text-base leading-relaxed text-amber-900">{originalText}</p>
                    </div>

                    <div className="flex justify-center">
                      <Button
                        onClick={handleDemoCorrection}
                        size="lg"
                        className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all relative overflow-hidden"
                      >
                        <motion.span
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ['-200%', '200%'] }}
                          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' as const }}
                        />
                        <span className="relative z-10 flex items-center">
                          <Sparkles className="w-5 h-5 mr-2" />
                          Prova la correzione IA
                        </span>
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Loading state */}
                {demoState === 'loading' && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 20, scale: 1.02 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="py-12 flex flex-col items-center gap-4"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                      </div>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute inset-0 w-16 h-16 rounded-full bg-amber-200/30"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-amber-900">Correzione in corso...</p>
                      <p className="text-sm text-amber-600/60 mt-1">L&apos;IA sta analizzando il tuo testo</p>
                    </div>
                    <div className="w-64">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2, ease: 'easeInOut' as const }}
                        className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Corrected state */}
                {demoState === 'corrected' && (
                  <motion.div
                    key="corrected"
                    initial={{ opacity: 0, y: 20, scale: 1.02 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="space-y-6"
                  >
                    {/* Original text with error highlighted */}
                    <div className="p-5 bg-rose-50/50 rounded-xl border border-rose-100/50">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        <span className="text-sm font-medium text-rose-700">Errore rilevato</span>
                      </div>
                      {renderOriginalText()}
                    </div>

                    {/* Error annotation */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200/50"
                    >
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Spiegazione</p>
                        <p className="text-sm text-amber-700 mt-1">{errorAnnotation}</p>
                      </div>
                    </motion.div>

                    {/* Corrected text */}
                    <div className="p-5 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-emerald-700">Testo corretto</span>
                        <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs ml-auto">
                          Livello CILS: A2
                        </Badge>
                      </div>
                      {renderCorrectedText()}
                    </div>

                    {/* Scores */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                    >
                      <div className="p-5 bg-white/80 rounded-xl border border-amber-100/50">
                        <div className="flex items-center gap-2 mb-4">
                          <BarChart3 className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-semibold text-amber-800">Punteggi dettagliati</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {sampleScores.map((item, idx) => (
                            <motion.div
                              key={item.label}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.6 + idx * 0.1, duration: 0.4 }}
                              className="space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-amber-700">{item.label}</span>
                                <span className="text-sm font-bold text-amber-900">{item.score.toFixed(1)}</span>
                              </div>
                              <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.score * 10}%` }}
                                  transition={{ delay: 0.8 + idx * 0.1, duration: 0.6, ease: 'easeOut' as const }}
                                  className={`h-full rounded-full ${item.color}`}
                                />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>

                    {/* Reset button */}
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={resetDemo}
                        className="border-amber-200 text-amber-700 hover:bg-amber-50"
                      >
                        Riprova
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────── How It Works Section ──────────────────────── */

const steps = [
  {
    number: '1',
    title: 'Scrivi',
    description: 'Scrivi il tuo testo in italiano direttamente nella piattaforma.',
    icon: PenLine,
    gradient: 'from-violet-500 to-fuchsia-500',
    shadow: 'shadow-violet-500/30',
  },
  {
    number: '2',
    title: 'Correggi',
    description: "Ricevi la correzione istantanea dell'IA con spiegazioni dettagliate.",
    icon: Sparkles,
    gradient: 'from-fuchsia-500 to-pink-500',
    shadow: 'shadow-fuchsia-500/30',
  },
  {
    number: '3',
    title: 'Migliora',
    description: 'Rivedi il feedback e migliora le tue competenze di scrittura.',
    icon: TrendingUp,
    gradient: 'from-pink-500 to-rose-500',
    shadow: 'shadow-pink-500/30',
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-amber-50/30 to-white" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <Badge
            variant="secondary"
            className="mb-4 px-4 py-1.5 bg-amber-100/80 text-amber-700 border-amber-200/50"
          >
            Come funziona
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-amber-900 mt-4">
            Tre semplici passi
          </h2>
          <p className="mt-4 text-lg text-amber-700/60 max-w-2xl mx-auto">
            Migliorare la tua scrittura italiana non è mai stato così semplice.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8 lg:gap-12 relative"
        >
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-violet-200 via-fuchsia-200 to-pink-200" />

          {steps.map((step, i) => (
            <motion.div key={step.title} variants={fadeUp} custom={i} className="relative text-center">
              <div className="relative z-10 flex flex-col items-center">
                {/* Number circle */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
                  className={`w-16 h-16 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white text-2xl font-bold shadow-lg ${step.shadow} mb-6`}
                >
                  {step.number}
                </motion.div>

                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-white border border-amber-100 shadow-lg flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-amber-700" />
                </div>

                <h3 className="text-xl font-bold text-amber-900 mb-2">{step.title}</h3>
                <p className="text-amber-700/60 max-w-xs">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────── For Teachers Section ──────────────────────── */

function TeachersSection() {
  const { setCurrentView } = useAppStore();

  const teacherFeatures = [
    {
      icon: Users,
      title: 'Gestione classi',
      description: 'Organizza studenti in classi e monitora i progressi di ciascuno.',
    },
    {
      icon: TrendingUp,
      title: 'Progressi studenti',
      description: 'Visualizza l\'andamento nel tempo e identifica le aree di miglioramento.',
    },
    {
      icon: BookMarked,
      title: 'Preparazioni lezioni',
      description: 'Crea materiali didattici personalizzati con l\'assistenza dell\'IA.',
    },
  ];

  return (
    <section id="teachers" className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50/50 to-rose-50/30" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-amber-200/20 to-transparent rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge
                variant="secondary"
                className="mb-4 px-4 py-1.5 bg-violet-100/80 text-violet-700 border-violet-200/50"
              >
                <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
                Per i docenti
              </Badge>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl font-bold text-amber-900 mt-4"
            >
              Strumenti pensati per chi insegna
            </motion.h2>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-lg text-amber-700/60 max-w-lg leading-relaxed"
            >
              Gestisci le tue classi, segui i progressi degli studenti e crea materiali didattici
              personalizzati, tutto in un&apos;unica piattaforma.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="mt-8">
              <Button
                onClick={() => setCurrentView('register')}
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all relative overflow-hidden"
              >
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-200%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' as const }}
                />
                <span className="relative z-10 flex items-center">
                  Inizia come docente
                  <ArrowRight className="w-5 h-5 ml-2" />
                </span>
              </Button>
            </motion.div>
          </motion.div>

          {/* Right cards */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="space-y-4"
          >
            {teacherFeatures.map((feature, i) => (
              <motion.div key={feature.title} variants={fadeUp} custom={i}>
                <Card className="bg-white/70 backdrop-blur-sm border-amber-100/50 hover:border-amber-200 hover:shadow-lg transition-all duration-300 group">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-900">{feature.title}</h3>
                      <p className="text-sm text-amber-700/60 mt-1">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── Testimonials Section ──────────────────────── */

const testimonials = [
  {
    name: 'Giulia Rossi',
    school: 'Liceo Scientifico Galileo Galilei',
    quote: 'ScribIA mi ha aiutato a migliorare i miei temi in poche settimane. Le correzioni sono precise e le spiegazioni chiarissime!',
  },
  {
    name: 'Marco Bianchi',
    school: 'Istituto Tecnico Fermi',
    quote: 'Adoro come l\'IA spiega i miei errori invece di correggerli e basta. Ora scrivo con molta più fiducia.',
  },
  {
    name: 'Sara Colombo',
    school: 'Liceo Classico Parini',
    quote: 'Il miglior strumento per preparare l\'esame di italiano. I punteggi dettagliati mi fanno capire esattamente dove migliorare.',
  },
];

function TestimonialsSection() {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-rose-50/30 to-white" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInUp className="text-center mb-16">
          <Badge
            variant="secondary"
            className="mb-4 px-4 py-1.5 bg-rose-100/80 text-rose-700 border-rose-200/50"
          >
            <Heart className="w-3.5 h-3.5 mr-1.5" />
            Dicono di noi
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-amber-900 mt-4">
            Studenti che amano ScribIA
          </h2>
          <p className="mt-4 text-lg text-amber-700/60 max-w-2xl mx-auto">
            Scopri cosa dicono gli studenti che hanno migliorato la loro scrittura con noi.
          </p>
        </FadeInUp>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <FadeInUp key={testimonial.name} className="h-full">
              <Card className="h-full bg-white/70 backdrop-blur-sm border-amber-100/50 hover:border-amber-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {[0, 1, 2, 3, 4].map((starIdx) => (
                      <motion.div
                        key={starIdx}
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          delay: i * 0.2 + starIdx * 0.08,
                          duration: 0.4,
                          type: 'spring',
                          stiffness: 300,
                          damping: 15,
                        }}
                      >
                        <Star className="w-5 h-5 fill-current text-amber-400" />
                      </motion.div>
                    ))}
                  </div>

                  <p className="text-amber-800/80 text-sm leading-relaxed mb-4 italic">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>

                  <div className="border-t border-amber-100 pt-4">
                    <p className="font-semibold text-amber-900 text-sm">{testimonial.name}</p>
                    <p className="text-amber-600/60 text-xs mt-0.5">{testimonial.school}</p>
                  </div>
                </CardContent>
              </Card>
            </FadeInUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── CTA Section ──────────────────────── */

function CTASection() {
  const { setCurrentView } = useAppStore();

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={scaleIn}
          custom={0}
        >
          <Card className="bg-gradient-to-br from-amber-600 via-orange-600 to-rose-600 border-0 shadow-2xl shadow-amber-900/20 overflow-hidden">
            <CardContent className="p-8 sm:p-12 lg:p-16 text-center relative">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                  Pronto a migliorare la tua scrittura?
                </h2>
                <p className="text-lg sm:text-xl text-amber-100/80 max-w-2xl mx-auto mb-8">
                  Unisciti a migliaia di studenti e docenti che utilizzano ScribIA per scrivere meglio in italiano.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => setCurrentView('register')}
                    size="lg"
                    className="h-12 px-8 text-base bg-white text-amber-700 hover:bg-amber-50 shadow-xl transition-all relative overflow-hidden"
                  >
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-100/30 to-transparent"
                      animate={{ x: ['-200%', '200%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' as const }}
                    />
                    <span className="relative z-10 flex items-center">
                      Registrati gratuitamente
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCurrentView('login')}
                    className="h-12 px-8 text-base border-white/30 text-white hover:bg-white/10"
                  >
                    Accedi al tuo account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────── Footer ──────────────────────── */

function Footer() {
  return (
    <footer className="bg-amber-900 text-amber-100/60">
      {/* Gradient top border */}
      <div className="h-0.5 bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-amber-100">ScribIA</span>
          </div>
          <div className="flex items-center gap-4">
            <motion.a
              href="#"
              whileHover={{ scale: 1.2 }}
              className="text-amber-100/60 hover:text-amber-100 transition-colors"
              aria-label="Instagram"
            >
              <Heart className="w-5 h-5" />
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.2 }}
              className="text-amber-100/60 hover:text-amber-100 transition-colors"
              aria-label="GitHub"
            >
              <BookOpen className="w-5 h-5" />
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.2 }}
              className="text-amber-100/60 hover:text-amber-100 transition-colors"
              aria-label="Twitter"
            >
              <BarChart3 className="w-5 h-5" />
            </motion.a>
          </div>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} ScribIA. Tutti i diritti riservati.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ──────────────────────── Main Landing Page ──────────────────────── */

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <InteractiveDemo />
        <HowItWorksSection />
        <TeachersSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
