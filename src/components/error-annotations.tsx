'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErrorAnnotationProps {
  original: string;
  corrected: string;
  explanation: string;
  type?: 'grammar' | 'spelling' | 'vocabulary' | 'style';
}

export interface ErrorAnnotationsListProps {
  annotations: string;
  className?: string;
}

export interface TextDiffViewProps {
  original: string;
  corrected: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mapping from error type → tailwind border-color class */
const BORDER_COLOR_MAP: Record<NonNullable<ErrorAnnotationProps['type']>, string> = {
  grammar: 'border-l-red-500',
  spelling: 'border-l-orange-500',
  vocabulary: 'border-l-teal-500',
  style: 'border-l-purple-400',
};

/** Mapping from error type → Italian label */
const TYPE_LABEL_MAP: Record<NonNullable<ErrorAnnotationProps['type']>, string> = {
  grammar: 'Grammatica',
  spelling: 'Ortografia',
  vocabulary: 'Vocabolario',
  style: 'Stile',
};

/** Mapping from error type → badge tailwind classes */
const TYPE_BADGE_MAP: Record<NonNullable<ErrorAnnotationProps['type']>, string> = {
  grammar: 'bg-red-100 text-red-700 border-red-200',
  spelling: 'bg-orange-100 text-orange-700 border-orange-200',
  vocabulary: 'bg-teal-100 text-teal-700 border-teal-200',
  style: 'bg-purple-100 text-purple-700 border-purple-200',
};

/**
 * Heuristically guess the error type from the explanation text.
 * Falls back to 'grammar' when nothing matches.
 */
function inferType(explanation: string): NonNullable<ErrorAnnotationProps['type']> {
  const lower = explanation.toLowerCase();

  if (
    lower.includes('ortograf') ||
    lower.includes('spell') ||
    lower.includes('accento') ||
    lower.includes('doppia') ||
    lower.includes('apostrofo')
  ) {
    return 'spelling';
  }
  if (
    lower.includes('vocabol') ||
    lower.includes('lessico') ||
    lower.includes('parola') ||
    lower.includes('sinonim') ||
    lower.includes('termine') ||
    lower.includes('espressione')
  ) {
    return 'vocabulary';
  }
  if (
    lower.includes('stil') ||
    lower.includes('regist') ||
    lower.includes('formal') ||
    lower.includes('ripet') ||
    lower.includes('elegan') ||
    lower.includes('fluid')
  ) {
    return 'style';
  }
  return 'grammar';
}

// ---------------------------------------------------------------------------
// Parsed annotation intermediate type
// ---------------------------------------------------------------------------

interface ParsedAnnotation {
  original: string;
  corrected: string;
  explanation: string;
  type: NonNullable<ErrorAnnotationProps['type']>;
}

/**
 * Parse a raw annotation string that follows the format:
 *   1. "ho andato" → "sono andato": verbo di movimento richiede ausiliare essere.
 *   2. "il libro che ho letto era molto interessante" → nessun errore.
 *
 * Lines containing "nessun errore" are skipped.
 */
function parseAnnotations(raw: string): ParsedAnnotation[] {
  if (!raw?.trim()) return [];

  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  const results: ParsedAnnotation[] = [];

  for (const line of lines) {
    // Must start with a number followed by . or )
    if (!/^\d+[\.\)]/.test(line.trim())) continue;

    // Check for "nessun errore" — skip these lines entirely
    if (line.toLowerCase().includes('nessun errore')) continue;

    // Try to extract quoted original, quoted corrected, and explanation
    // Format: N. "original" → "corrected": explanation
    // Also handle unquoted format: N. original → corrected: explanation

    // Pattern 1: quoted strings with →
    const quotedMatch = line.match(
      /^\d+[\.\)]\s*["\u201C\u201D]([^"\u201C\u201D]+)["\u201C\u201D]\s*→\s*["\u201C\u201D]([^"\u201C\u201D]+)["\u201C\u201D]\s*[:\uff1a]\s*(.+)$/u
    );

    if (quotedMatch) {
      const original = quotedMatch[1].trim();
      const corrected = quotedMatch[2].trim();
      const explanation = quotedMatch[3].trim();
      results.push({
        original,
        corrected,
        explanation,
        type: inferType(explanation),
      });
      continue;
    }

    // Pattern 2: unquoted with → and :
    const unquotedMatch = line.match(
      /^\d+[\.\)]\s*(.+?)\s*→\s*(.+?)\s*[:\uff1a]\s*(.+)$/u
    );

    if (unquotedMatch) {
      const original = unquotedMatch[1].trim();
      const corrected = unquotedMatch[2].trim();
      const explanation = unquotedMatch[3].trim();
      results.push({
        original,
        corrected,
        explanation,
        type: inferType(explanation),
      });
      continue;
    }

    // Pattern 3: just original → corrected (no explanation after colon)
    const simpleMatch = line.match(
      /^\d+[\.\)]\s*["\u201C\u201D]?([^"\u201C\u201D→]+)["\u201C\u201D]?\s*→\s*["\u201C\u201D]?([^"\u201C\u201D]+)["\u201C\u201D]?\s*$/u
    );

    if (simpleMatch) {
      const original = simpleMatch[1].trim();
      const corrected = simpleMatch[2].trim();
      results.push({
        original,
        corrected,
        explanation: '',
        type: inferType(''),
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Simple word-level diff
// ---------------------------------------------------------------------------

interface DiffWord {
  text: string;
  status: 'same' | 'removed' | 'added';
}

/**
 * Very simple word-level diff: split both texts by whitespace, then walk
 * through them using a greedy LCS-inspired approach. Words present in the
 * original but not the corrected are marked "removed"; words present in the
 * corrected but not the original are marked "added"; common words are "same".
 */
function wordDiff(original: string, corrected: string): { left: DiffWord[]; right: DiffWord[] } {
  const origWords = original.split(/(\s+)/);
  const corrWords = corrected.split(/(\s+)/);

  // Build a simple map of word counts for the corrected text
  const corrCount = new Map<string, number>();
  for (const w of corrWords) {
    if (w.trim() === '') continue;
    corrCount.set(w, (corrCount.get(w) ?? 0) + 1);
  }

  // Mark original words
  const left: DiffWord[] = [];
  const usedCorr = new Map<string, number>();

  for (const w of origWords) {
    if (w.trim() === '') {
      left.push({ text: w, status: 'same' });
      continue;
    }
    const available = corrCount.get(w) ?? 0;
    const used = usedCorr.get(w) ?? 0;
    if (used < available) {
      left.push({ text: w, status: 'same' });
      usedCorr.set(w, used + 1);
    } else {
      left.push({ text: w, status: 'removed' });
    }
  }

  // Mark corrected words
  const right: DiffWord[] = [];
  const origCount = new Map<string, number>();
  for (const w of origWords) {
    if (w.trim() === '') continue;
    origCount.set(w, (origCount.get(w) ?? 0) + 1);
  }
  const usedOrig = new Map<string, number>();

  for (const w of corrWords) {
    if (w.trim() === '') {
      right.push({ text: w, status: 'same' });
      continue;
    }
    const available = origCount.get(w) ?? 0;
    const used = usedOrig.get(w) ?? 0;
    if (used < available) {
      right.push({ text: w, status: 'same' });
      usedOrig.set(w, used + 1);
    } else {
      right.push({ text: w, status: 'added' });
    }
  }

  return { left, right };
}

// ---------------------------------------------------------------------------
// Component 1: ErrorAnnotation
// ---------------------------------------------------------------------------

export function ErrorAnnotation({
  original,
  corrected,
  explanation,
  type = 'grammar',
}: ErrorAnnotationProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-l-4 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-amber-50/30',
        BORDER_COLOR_MAP[type],
      )}
    >
      {/* Diff row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Original — red highlight + strikethrough */}
        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-red-800 line-through decoration-red-400 font-medium transition-colors duration-200 hover:bg-red-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
          {original}
        </span>

        {/* Arrow */}
        <ArrowRight className="h-4 w-4 shrink-0 text-amber-500" />

        {/* Corrected — green highlight */}
        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 font-medium transition-colors duration-200 hover:bg-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          {corrected}
        </span>

        {/* Type badge */}
        <Badge
          variant="outline"
          className={cn('ml-auto text-[10px] leading-tight', TYPE_BADGE_MAP[type])}
        >
          {TYPE_LABEL_MAP[type]}
        </Badge>
      </div>

      {/* Explanation */}
      {explanation && (
        <p className="mt-2 text-sm text-amber-800/70 leading-relaxed">{explanation}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component 2: ErrorAnnotationsList
// ---------------------------------------------------------------------------

const VISIBLE_COUNT = 3;

export function ErrorAnnotationsList({ annotations, className }: ErrorAnnotationsListProps) {
  const [expanded, setExpanded] = useState(false);

  const parsed = useMemo(() => parseAnnotations(annotations), [annotations]);

  if (parsed.length === 0) {
    return (
      <Card className={cn('border-amber-100 bg-white', className)}>
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm text-amber-700 font-medium">Nessun errore trovato</p>
          <p className="text-xs text-amber-600/50 mt-1">Ottimo lavoro!</p>
        </CardContent>
      </Card>
    );
  }

  const visibleAnnotations = expanded ? parsed : parsed.slice(0, VISIBLE_COUNT);
  const hasMore = parsed.length > VISIBLE_COUNT;

  return (
    <Card className={cn('border-rose-100 bg-white', className)}>
      <CardContent className="p-6 space-y-4">
        {/* Summary header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-amber-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500" />
            Annotazioni errori
          </h3>
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-700 border-rose-200"
          >
            {parsed.length} {parsed.length === 1 ? 'errore trovato' : 'errori trovati'}
          </Badge>
        </div>

        {/* Type summary pills */}
        <div className="flex flex-wrap gap-2">
          {(() => {
            const typeCounts = new Map<NonNullable<ErrorAnnotationProps['type']>, number>();
            for (const a of parsed) {
              typeCounts.set(a.type, (typeCounts.get(a.type) ?? 0) + 1);
            }
            return Array.from(typeCounts.entries()).map(([t, count]) => (
              <Badge
                key={t}
                variant="outline"
                className={cn('text-[10px]', TYPE_BADGE_MAP[t])}
              >
                {TYPE_LABEL_MAP[t]} ({count})
              </Badge>
            ));
          })()}
        </div>

        {/* Annotation list */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {visibleAnnotations.map((annotation, index) => (
              <motion.div
                key={`${annotation.original}-${index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <ErrorAnnotation
                  original={annotation.original}
                  corrected={annotation.corrected}
                  explanation={annotation.explanation}
                  type={annotation.type}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Expand / Collapse button */}
        {hasMore && (
          <div className="flex justify-center pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((prev) => !prev)}
              className="text-amber-700 hover:bg-amber-50 hover:text-amber-900 gap-1"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Mostra meno
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Mostra tutti ({parsed.length})
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Component 3: TextDiffView
// ---------------------------------------------------------------------------

export function TextDiffView({ original, corrected, className }: TextDiffViewProps) {
  const { left, right } = useMemo(() => wordDiff(original, corrected), [original, corrected]);

  return (
    <div className={cn('grid gap-4 lg:grid-cols-2', className)}>
      {/* Original text panel */}
      <Card className="border-red-100 bg-red-50/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-red-500" />
            <h4 className="text-sm font-semibold text-red-900">Testo originale</h4>
          </div>
          <div className="text-sm leading-relaxed max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {left.map((w, i) => {
              if (w.status === 'removed') {
                return (
                  <span
                    key={i}
                    className="bg-red-200 text-red-900 line-through decoration-red-400 rounded px-0.5"
                  >
                    {w.text}
                  </span>
                );
              }
              return (
                <span key={i} className="text-amber-900/80">
                  {w.text}
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Corrected text panel */}
      <Card className="border-emerald-100 bg-emerald-50/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h4 className="text-sm font-semibold text-emerald-900">Testo corretto</h4>
          </div>
          <div className="text-sm leading-relaxed max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {right.map((w, i) => {
              if (w.status === 'added') {
                return (
                  <span
                    key={i}
                    className="bg-emerald-200 text-emerald-900 rounded px-0.5 font-medium"
                  >
                    {w.text}
                  </span>
                );
              }
              return (
                <span key={i} className="text-emerald-900/80">
                  {w.text}
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
