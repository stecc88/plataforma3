'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';

// ─── Score Radar Chart ────────────────────────────────────────────────────────

interface ScoreRadarProps {
  grammar?: number;
  coherence?: number;
  vocabulary?: number;
  clarity?: number;
}

const radarConfig: ChartConfig = {
  grammar: { label: 'Grammatica', color: 'var(--chart-1)' },
  coherence: { label: 'Coerenza', color: 'var(--chart-2)' },
  vocabulary: { label: 'Vocabolario', color: 'var(--chart-3)' },
  clarity: { label: 'Chiarezza', color: 'var(--chart-4)' },
};

export function ScoreRadarChart({ grammar = 0, coherence = 0, vocabulary = 0, clarity = 0 }: ScoreRadarProps) {
  const data = [
    { metric: 'Grammatica', value: grammar },
    { metric: 'Coerenza', value: coherence },
    { metric: 'Vocabolario', value: vocabulary },
    { metric: 'Chiarezza', value: clarity },
  ];

  return (
    <ChartContainer config={radarConfig} className="mx-auto aspect-square max-h-[300px] w-full">
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="metric" className="text-xs" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Radar
          name="Punteggio"
          dataKey="value"
          stroke="var(--chart-1)"
          fill="var(--chart-1)"
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RadarChart>
    </ChartContainer>
  );
}

// ─── Score Trend Chart ────────────────────────────────────────────────────────

interface TrendDataPoint {
  date: string;
  punteggio: number;
}

const trendConfig: ChartConfig = {
  punteggio: { label: 'Punteggio', color: 'var(--chart-1)' },
};

export function ScoreTrendChart({ data }: { data: TrendDataPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    );
  }

  return (
    <ChartContainer config={trendConfig} className="h-[200px] w-full">
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
        <YAxis domain={[0, 10]} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="punteggio"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          dot={{ r: 4, fill: 'var(--chart-1)' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  );
}

// ─── Class Distribution Chart ─────────────────────────────────────────────────

interface DistributionDataPoint {
  fascia: string;
  studenti: number;
}

const distributionConfig: ChartConfig = {
  studenti: { label: 'Studenti', color: 'var(--chart-1)' },
};

export function ClassDistributionChart({ data }: { data: DistributionDataPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    );
  }

  return (
    <ChartContainer config={distributionConfig} className="h-[200px] w-full">
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="fascia" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="studenti" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

// ─── Performance Comparison Chart ─────────────────────────────────────────────

interface ComparisonDataPoint {
  metrica: string;
  autovalutazione: number;
  ia: number;
}

const comparisonConfig: ChartConfig = {
  autovalutazione: { label: 'Autovalutazione', color: 'var(--chart-4)' },
  ia: { label: 'Valutazione IA', color: 'var(--chart-1)' },
};

export function PerformanceComparisonChart({ data }: { data: ComparisonDataPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    );
  }

  return (
    <ChartContainer config={comparisonConfig} className="h-[200px] w-full">
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="metrica" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
        <YAxis domain={[0, 10]} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="autovalutazione" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="ia" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
