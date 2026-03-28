"use client";

import { Alert } from "@/types";
import { AlertTriangle, Clock } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

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
  // Group by node_id and take latest alert's response_time_ms
  const getChartData = (): ChartData[] => {
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
        node_id: alert.node_id,
        response_time_ms: alert.source_data.response_time_ms,
        alert_level: alert.alert_level,
      }))
      .filter((d) => d.response_time_ms > 0)
      .sort((a, b) => b.response_time_ms - a.response_time_ms);
  };

  const getBarColor = (responseTime: number): string => {
    if (responseTime >= 3000) return "#ef4444";
    if (responseTime >= 1500) return "#f97316";
    if (responseTime >= 800) return "#eab308";
    return "#22c55e";
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertTriangle className="w-5 h-5" />
          <p className="font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const data = loading ? [] : getChartData();

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Response Time Analysis</h3>
        <p className="text-sm text-muted-foreground">
          Latency per node (ms) — higher values indicate potential issues
        </p>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center">
            <Clock className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No response time data available</p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  type="category"
                  dataKey="node_id"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={{ stroke: "var(--border)" }}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--foreground)",
                  }}
                  formatter={(value: number) => [`${value} ms`, "Response Time"]}
                  labelFormatter={(label) => `Node: ${label}`}
                />
                <Bar dataKey="response_time_ms" radius={[0, 4, 4, 0]}>
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

      {data.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/20">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="text-muted-foreground">Thresholds:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500" />
              <span>&gt;= 3000ms (Critical)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-orange-500" />
              <span>&gt;= 1500ms (High)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-yellow-500" />
              <span>&gt;= 800ms (Elevated)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-green-500" />
              <span>&lt; 800ms (Normal)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
