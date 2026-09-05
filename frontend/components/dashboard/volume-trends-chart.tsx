"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Calendar, Loader2, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";

import type { AnalyticsTrends, DailyVolumePoint, TrendRange } from "@/types/analytics";
import { getAnalyticsTrendsAction } from "@/actions/analytics-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface VolumeTrendsChartProps {
  initialData: AnalyticsTrends;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length || !label) {
    return null;
  }

  let formattedDate = label;
  try {
    formattedDate = format(parseISO(label), "EEE, MMM d, yyyy");
  } catch {
    // Keep raw label if parsing fails
  }

  const point: DailyVolumePoint = payload[0]?.payload;

  return (
    <div className="rounded-xl border border-border/80 bg-popover/95 p-3.5 shadow-xl backdrop-blur-md min-w-[200px] text-xs">
      <p className="font-semibold text-foreground mb-2 pb-1 border-b border-border/60">
        {formattedDate}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            Total Chats:
          </span>
          <span className="font-bold text-foreground">{point?.total_conversations ?? 0}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            AI Resolved:
          </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {point?.ai_resolved ?? 0}
          </span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            Escalated:
          </span>
          <span className="font-bold text-amber-600 dark:text-amber-400">
            {point?.escalated ?? 0}
          </span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/40">
          <span>Total Messages:</span>
          <span className="font-semibold text-foreground">{point?.total_messages ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

export function VolumeTrendsChart({ initialData }: VolumeTrendsChartProps) {
  const [range, setRange] = React.useState<TrendRange>(
    (initialData.range_days as TrendRange) || 7
  );
  const [data, setData] = React.useState<DailyVolumePoint[]>(initialData.points || []);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleRangeChange = async (newRange: TrendRange) => {
    if (newRange === range || isLoading) return;
    setRange(newRange);
    setIsLoading(true);

    try {
      const res = await getAnalyticsTrendsAction(newRange);
      if (res.success && res.data) {
        setData(res.data.points);
      }
    } catch (err) {
      console.error("Failed to load range data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalRangeChats = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.total_conversations, 0),
    [data]
  );

  const totalAiResolved = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.ai_resolved, 0),
    [data]
  );

  const rangeDeflectionRate = React.useMemo(() => {
    if (totalRangeChats === 0) return 100;
    return Math.round((totalAiResolved / totalRangeChats) * 100);
  }, [totalRangeChats, totalAiResolved]);

  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="font-heading text-lg font-semibold text-foreground">
              Conversation Volume & Deflection
            </CardTitle>
            {totalRangeChats > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                <Sparkles className="size-3" />
                {rangeDeflectionRate}% AI Deflected
              </span>
            )}
          </div>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Daily chat volume comparing automated AI resolutions against human escalations.
          </CardDescription>
        </div>

        {/* Range Switcher Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-border/80 bg-muted/40 p-1">
          {([7, 14, 30] as TrendRange[]).map((r) => (
            <Button
              key={r}
              variant={range === r ? "default" : "ghost"}
              size="sm"
              onClick={() => handleRangeChange(r)}
              disabled={isLoading}
              className={`h-7 px-2.5 text-xs font-medium rounded-md transition-all ${
                range === r
                  ? "bg-background text-foreground shadow-xs hover:bg-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isLoading && range === r ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : null}
              {r}D
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[280px] w-full min-w-0 pt-2">
          {!isMounted ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
              <Loader2 className="size-4 animate-spin mr-2" />
              Loading chart...
            </div>
          ) : data.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <Calendar className="size-8 stroke-1 mb-2 opacity-50" />
              <p className="text-sm font-medium">No activity recorded for this period.</p>
              <p className="text-xs">Once visitors start chatting, trends will populate here.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="aiResolvedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="escalatedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                  opacity={0.4}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => {
                    try {
                      return format(parseISO(val), range > 14 ? "d" : "MMM d");
                    } catch {
                      return val;
                    }
                  }}
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dx={-5}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground font-medium mr-2">
                      {value === "ai_resolved"
                        ? "AI Resolved"
                        : value === "escalated"
                        ? "Escalated"
                        : "Total"}
                    </span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="ai_resolved"
                  name="ai_resolved"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#aiResolvedGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="escalated"
                  name="escalated"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#escalatedGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
