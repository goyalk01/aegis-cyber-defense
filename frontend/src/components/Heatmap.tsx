"use client";

import { Alert } from "@/types";
import { AlertTriangle, Clock, TrendingUp, Zap } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

interface HeatmapProps {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
}

interface ChartData {
  node_id: string;
  response_time_ms: number;
  alert_level: string;
}

export function Heatmap({ alerts, loading, error }: HeatmapProps) {
  const getChartData = (): ChartData[] => {
    if (!Array.isArray(alerts) || alerts.length === 0) {
      return [];
    }

    const nodeMap = new Map<string, Alert>();

    const sortedAlerts = [...alerts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    for (const alert of sortedAlerts) {
      if (!nodeMap.has(alert.node_id)) {
        nodeMap.set(alert.node_id, alert);
      }
    }

    return Array.from(nodeMap.values())
      .map((alert) => ({
        node_id: alert.node_id ?? "Unknown",
        response_time_ms: alert.source_data?.response_time_ms ?? 0,
        alert_level: alert.alert_level ?? "CLEAN",
      }))
      .filter((d) => d.response_time_ms > 0)
      .sort((a, b) => b.response_time_ms - a.response_time_ms)
      .slice(0, 10);
  };

  const getBarColor = (responseTime: number): string => {
    if (responseTime >= 3000) return "url(#gradientCritical)";
    if (responseTime >= 1500) return "url(#gradientHigh)";
    if (responseTime >= 800) return "url(#gradientElevated)";
    return "url(#gradientNormal)";
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <p className="font-semibold">Error Loading Chart</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const data = loading ? [] : getChartData();

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Response Time Analysis</h3>
              <p className="text-xs text-muted-foreground">Latency per node — higher values indicate potential issues</p>
            </div>
          </div>
          {data.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-sm text-muted-foreground">
              <Zap className="w-4 h-4" />
              <span>{data.length} nodes</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        {loading ? (
          <div className="h-72 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center">
            <Clock className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground font-medium">No response time data</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Data will appear when available</p>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="gradientCritical" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f87171" />
                  </linearGradient>
                  <linearGradient id="gradientHigh" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#fb923c" />
                  </linearGradient>
                  <linearGradient id="gradientElevated" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#facc15" />
                  </linearGradient>
                  <linearGradient id="gradientNormal" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#4ade80" />
                  </linearGradient>
                </defs>
                <XAxis
                  type="number"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--border)", strokeOpacity: 0.5 }}
                  tickLine={{ stroke: "var(--border)", strokeOpacity: 0.5 }}
                  tickFormatter={(value) => `${value}ms`}
                />
                <YAxis
                  type="category"
                  dataKey="node_id"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "monospace" }}
                  axisLine={{ stroke: "var(--border)", strokeOpacity: 0.5 }}
                  tickLine={{ stroke: "var(--border)", strokeOpacity: 0.5 }}
                  width={65}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    color: "var(--foreground)",
                    boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.2)",
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()} ms`, "Response Time"]}
                  labelFormatter={(label) => `Node: ${label}`}
                  cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }}
                />
                <Bar dataKey="response_time_ms" radius={[0, 6, 6, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(entry.response_time_ms)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Legend */}
      {data.length > 0 && (
        <div className="p-4 border-t border-border/50 bg-muted/10">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-4 h-2 rounded-full bg-gradient-to-r from-red-500 to-red-400" />
              <span className="text-muted-foreground">&gt;= 3000ms (Critical)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-400" />
              <span className="text-muted-foreground">&gt;= 1500ms (High)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-2 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400" />
              <span className="text-muted-foreground">&gt;= 800ms (Elevated)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-2 rounded-full bg-gradient-to-r from-green-500 to-green-400" />
              <span className="text-muted-foreground">&lt; 800ms (Normal)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
