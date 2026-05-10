'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  X,
  BookOpen,
  Lightbulb,
  ChevronRight,
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────

export interface ErrorAnnotation {
  originalText: string;
  correctedText: string;
  type: string;
  color: string;
  shortReason: string;
  explanation: string;
  grammarRule: string;
  suggestion: string;
}

// ─── Text Segmentation ────────────────────────────────────────

interface TextSegment {
  text: string;
  isError: boolean;
  errorIndex: number; // index into errors[], -1 if not an error
}

/**
 * Split text into segments, finding each error.originalText with
 * offset tracking so that duplicate phrases are matched sequentially.
 */
function segmentText(text: string, errors: ErrorAnnotation[]): TextSegment[] {
  if (!errors.length) return [{ text, isError: false, errorIndex: -1 }];

  // Build match positions: for each error, find its next occurrence
  const matchPositions: { start: number; end: number; errorIdx: number }[] = [];
  const searchOffset: Record<number, number> = {};

  for (let ei = 0; ei < errors.length; ei++) {
    const needle = errors[ei].originalText;
    if (!needle) continue;
    const offset = searchOffset[ei] ?? 0;
    const idx = text.indexOf(needle, offset);
    if (idx !== -1) {
      matchPositions.push({ start: idx, end: idx + needle.length, errorIdx: ei });
      // Next search for same error starts after this match
      searchOffset[ei] = idx + needle.length;
    }
  }

  // Sort by start position
  matchPositions.sort((a, b) => a.start - b.start);

  // Remove overlapping matches (keep earlier ones)
  const filtered: typeof matchPositions = [];
  let lastEnd = 0;
  for (const mp of matchPositions) {
    if (mp.start >= lastEnd) {
      filtered.push(mp);
      lastEnd = mp.end;
    }
  }

  if (!filtered.length) return [{ text, isError: false, errorIndex: -1 }];

  // Build segments
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const mp of filtered) {
    // Plain text before this match
    if (mp.start > cursor) {
      segments.push({ text: text.slice(cursor, mp.start), isError: false, errorIndex: -1 });
    }
    // Error match
    segments.push({ text: text.slice(mp.start, mp.end), isError: true, errorIndex: mp.errorIdx });
    cursor = mp.end;
  }

  // Trailing plain text
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isError: false, errorIndex: -1 });
  }

  return segments;
}

// ─── Error Legend ──────────────────────────────────────────────

export function ErrorLegend({ errors }: { errors: ErrorAnnotation[] }) {
  // Count by type
  const typeMap = useMemo(() => {
    const map = new Map<string, { count: number; color: string }>();
    for (const e of errors) {
      const existing = map.get(e.type);
      if (existing) {
        existing.count++;
      } else {
        map.set(e.type, { count: 1, color: e.color });
      }
    }
    return map;
  }, [errors]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {Array.from(typeMap.entries()).map(([type, { count, color }]) => (
        <div key={type} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs text-amber-800/70 capitalize">{type}</span>
          <span className="text-[10px] text-amber-600/50">({count})</span>
        </div>
      ))}
    </div>
  );
}

// ─── Error Detail Panel ───────────────────────────────────────

export function ErrorDetailPanel({
  error,
  onClose,
}: {
  error: ErrorAnnotation | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, x: 20, maxHeight: 0 }}
          animate={{ opacity: 1, x: 0, maxHeight: 600 }}
          exit={{ opacity: 0, x: 20, maxHeight: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <Card
            className="border-l-4 bg-white shadow-md"
            style={{ borderLeftColor: error.color }}
          >
            <CardContent className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <Badge
                  className="text-xs capitalize"
                  style={{
                    backgroundColor: error.color + '18',
                    color: error.color,
                    borderColor: error.color + '40',
                  }}
                >
                  {error.type}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-7 w-7 shrink-0 text-amber-600 hover:bg-amber-50 hover:text-amber-900 transition-all duration-300 hover:scale-[1.1] active:scale-[0.9]"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick correction */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2.5 py-1 text-red-800 line-through decoration-red-400 font-medium text-sm">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                  {error.originalText}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2.5 py-1 text-emerald-800 font-medium text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  {error.correctedText}
                </span>
              </div>

              {/* Short reason */}
              {error.shortReason && (
                <div>
                  <p className="text-sm font-semibold text-amber-900">{error.shortReason}</p>
                </div>
              )}

              {/* Explanation */}
              {error.explanation && (
                <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-100">
                  <p className="text-sm text-amber-800/80 leading-relaxed">{error.explanation}</p>
                </div>
              )}

              {/* Grammar rule + Suggestion */}
              <div className="grid sm:grid-cols-2 gap-2">
                {error.grammarRule && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-violet-50 border border-violet-100"
                  >
                    <BookOpen className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider">Regola grammaticale</p>
                      <p className="text-xs text-violet-800/80 mt-0.5 leading-relaxed">{error.grammarRule}</p>
                    </div>
                  </motion.div>
                )}
                {error.suggestion && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100"
                  >
                    <Lightbulb className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Consiglio</p>
                      <p className="text-xs text-emerald-800/80 mt-0.5 leading-relaxed">{error.suggestion}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Annotated Text ───────────────────────────────────────────

export function AnnotatedText({
  text,
  errors,
  onSelectError,
  selectedErrorIndex,
}: {
  text: string;
  errors: ErrorAnnotation[];
  onSelectError: (index: number) => void;
  selectedErrorIndex: number | null;
}) {
  const segments = useMemo(() => segmentText(text, errors), [text, errors]);

  return (
    <div className="text-base leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (!seg.isError) {
          return <span key={i}>{seg.text}</span>;
        }

        const err = errors[seg.errorIndex];
        const isSelected = selectedErrorIndex === seg.errorIndex;

        return (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <span
                onClick={() => onSelectError(seg.errorIndex)}
                className={cn(
                  'cursor-pointer rounded-sm px-0.5 transition-all duration-200',
                  'underline decoration-2 underline-offset-2',
                )}
                style={{
                  textDecorationColor: err.color,
                  backgroundColor: isSelected
                    ? err.color + '30'
                    : err.color + '18',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = err.color + '30';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = err.color + '18';
                  }
                }}
              >
                {seg.text}
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={8}
              className="bg-white border border-amber-200 shadow-lg rounded-lg p-3 max-w-xs text-amber-900"
            >
              <div className="space-y-2">
                {/* Type badge */}
                <Badge
                  className="text-[10px] capitalize"
                  style={{
                    backgroundColor: err.color + '18',
                    color: err.color,
                    borderColor: err.color + '40',
                  }}
                >
                  {err.type}
                </Badge>

                {/* Correction preview */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-red-700 line-through decoration-red-400 font-medium">{err.originalText}</span>
                  <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                  <span className="text-emerald-700 font-medium">{err.correctedText}</span>
                </div>

                {/* Short reason */}
                {err.shortReason && (
                  <p className="text-xs text-amber-800/70">{err.shortReason}</p>
                )}

                {/* Click prompt */}
                <div className="flex items-center gap-1 text-[10px] text-violet-600 font-medium pt-0.5">
                  <span>Clicca per i dettagli completi</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ─── Combined: Annotated Text View ────────────────────────────
// A ready-to-use composition of AnnotatedText + ErrorLegend + ErrorDetailPanel

export function AnnotatedTextView({
  text,
  errors,
}: {
  text: string;
  errors: ErrorAnnotation[];
}) {
  const [selectedErrorIndex, setSelectedErrorIndex] = useState<number | null>(null);

  const handleSelectError = useCallback((index: number) => {
    setSelectedErrorIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedErrorIndex(null);
  }, []);

  const selectedError = selectedErrorIndex != null ? errors[selectedErrorIndex] : null;

  return (
    <Card className="border-amber-100 bg-white">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-amber-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500" />
            Testo annotato
          </h3>
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
            {errors.length} {errors.length === 1 ? 'errore' : 'errori'}
          </Badge>
        </div>

        {/* Error type legend */}
        <ErrorLegend errors={errors} />

        {/* Annotated text */}
        <div className="p-4 rounded-lg bg-amber-50/40 border border-amber-100 max-h-[500px] overflow-y-auto custom-scrollbar">
          <AnnotatedText
            text={text}
            errors={errors}
            onSelectError={handleSelectError}
            selectedErrorIndex={selectedErrorIndex}
          />
        </div>

        {/* Error detail panel */}
        <ErrorDetailPanel error={selectedError} onClose={handleCloseDetail} />
      </CardContent>
    </Card>
  );
}
