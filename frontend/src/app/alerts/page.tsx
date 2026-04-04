"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { DashboardLayout, AlertsTable, ErrorBoundary, RunPipelineButton } from "@/components";
import { fetchAlerts, fetchMetrics, runPipeline } from "@/lib/api";
import { Alert, Metrics } from "@/types";
import { RefreshCw, AlertTriangle, Filter, Search, Download, ChevronLeft, ChevronRight, Clock, Database } from "lucide-react";
import { cn } from "@/lib/utils";

const ALERT_LEVELS = ["ALL", "ATTACK", "HIGH_RISK", "SUSPICIOUS", "CLEAN"] as const;
const PAGE_SIZE = 50;
const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataGeneratedAt, setDataGeneratedAt] = useState<string | null>(null);
  
  const [selectedLevel, setSelectedLevel] = useState<typeof ALERT_LEVELS[number]>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  
  const requestController = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    if (requestController.current) {
      requestController.current.abort();
    }
    requestController.current = new AbortController();
    const signal = requestController.current.signal;

    setLoading(true);
    setError(null);

    try {
      const [alertsData, metricsData] = await Promise.all([
        fetchAlerts(
          { limit: 500, level: selectedLevel !== "ALL" ? selectedLevel : undefined },
          signal
        ),
        fetchMetrics(signal)
      ]);
      setAlerts(alertsData.alerts);
      setMetrics(metricsData);
      setLastUpdated(new Date());
      setDataGeneratedAt(alertsData.last_generated);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedLevel]);

  // Initial load
  useEffect(() => {
    loadData();
    return () => requestController.current?.abort();
  }, [loadData]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  // Filter alerts based on search (level is now handled by API)
  useEffect(() => {
    let filtered = alerts;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a) =>
        a.node_id.toLowerCase().includes(query) ||
        a.node_name.toLowerCase().includes(query) ||
        a.region.toLowerCase().includes(query) ||
        a.log_id.toLowerCase().includes(query)
      );
    }

    setFilteredAlerts(filtered);
    setCurrentPage(1);
  }, [alerts, searchQuery]);

  const totalPages = Math.ceil(filteredAlerts.length / PAGE_SIZE);
  const paginatedAlerts = filteredAlerts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const alertCounts = {
    all: metrics?.total_alerts || 0,
    attack: metrics?.attack_count || 0,
    highRisk: metrics?.high_risk_count || 0,
    suspicious: metrics?.suspicious_count || 0,
    clean: metrics?.clean_count || 0,
  };

  const handleRunPipeline = useCallback(async () => {
    await runPipeline();
    await loadData();
  }, [loadData]);

  return (
    <DashboardLayout
      title="Security Alerts"
      description="Real-time security events and anomaly detection"
      actions={
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end text-xs text-muted-foreground">
            {dataGeneratedAt && (
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                Data: {new Date(dataGeneratedAt).toLocaleString()}
              </span>
            )}
            {lastUpdated && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Fetched: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50 hover:bg-accent text-sm font-medium transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
          <RunPipelineButton onRun={handleRunPipeline} />
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <AlertStatCard
            label="Total Alerts"
            count={alertCounts.all}
            active={selectedLevel === "ALL"}
            onClick={() => setSelectedLevel("ALL")}
          />
          <AlertStatCard
            label="Attack"
            count={alertCounts.attack}
            color="destructive"
            active={selectedLevel === "ATTACK"}
            onClick={() => setSelectedLevel("ATTACK")}
          />
          <AlertStatCard
            label="High Risk"
            count={alertCounts.highRisk}
            color="orange"
            active={selectedLevel === "HIGH_RISK"}
            onClick={() => setSelectedLevel("HIGH_RISK")}
          />
          <AlertStatCard
            label="Suspicious"
            count={alertCounts.suspicious}
            color="warning"
            active={selectedLevel === "SUSPICIOUS"}
            onClick={() => setSelectedLevel("SUSPICIOUS")}
          />
          <AlertStatCard
            label="Clean"
            count={alertCounts.clean}
            color="success"
            active={selectedLevel === "CLEAN"}
            onClick={() => setSelectedLevel("CLEAN")}
          />
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by node ID, name, region, or log ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-accent/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as typeof selectedLevel)}
              className="px-3 py-2 rounded-lg bg-accent/30 border border-border text-sm"
            >
              {ALERT_LEVELS.map((level) => (
                <option key={level} value={level}>{level.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Alerts Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-accent/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span className="font-semibold text-foreground">Alert Log</span>
              <span className="text-sm text-muted-foreground">
                ({filteredAlerts.length} results)
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Page {currentPage} of {totalPages || 1}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 shimmer rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
              <p className="text-destructive font-medium">Failed to load alerts</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          ) : paginatedAlerts.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground font-medium">No alerts found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {searchQuery ? "Try adjusting your search" : "Run the pipeline to generate alerts"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-accent/30 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Log ID</th>
                    <th className="px-4 py-3 text-left font-medium">Node</th>
                    <th className="px-4 py-3 text-left font-medium">Region</th>
                    <th className="px-4 py-3 text-left font-medium">Level</th>
                    <th className="px-4 py-3 text-left font-medium">Severity</th>
                    <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                    <th className="px-4 py-3 text-left font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedAlerts.map((alert) => (
                    <AlertRow key={alert.log_id} alert={alert} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent/50 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                  if (page > totalPages) return null;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                        currentPage === page
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent/50 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function AlertStatCard({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color?: "destructive" | "orange" | "warning" | "success";
  active?: boolean;
  onClick?: () => void;
}) {
  const colorClasses = {
    destructive: "border-destructive/30 bg-destructive/5",
    orange: "border-orange-500/30 bg-orange-500/5",
    warning: "border-warning/30 bg-warning/5",
    success: "border-success/30 bg-success/5",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border bg-card text-left transition-all",
        active && "ring-2 ring-primary",
        color ? colorClasses[color] : "border-border hover:border-primary/50"
      )}
    >
      <p className="text-2xl font-bold text-foreground">{count.toLocaleString()}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </button>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const levelColors: Record<string, string> = {
    ATTACK: "bg-destructive/10 text-destructive border-destructive/30",
    HIGH_RISK: "bg-orange-500/10 text-orange-500 border-orange-500/30",
    SUSPICIOUS: "bg-warning/10 text-warning border-warning/30",
    CLEAN: "bg-success/10 text-success border-success/30",
  };

  return (
    <tr className="hover:bg-accent/20 transition-colors">
      <td className="px-4 py-3 font-mono text-xs">{alert.log_id}</td>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-foreground">{alert.node_id}</p>
          <p className="text-xs text-muted-foreground">{alert.node_name}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{alert.region}</td>
      <td className="px-4 py-3">
        <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", levelColors[alert.alert_level])}>
          {alert.alert_level}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                alert.severity_score >= 80 ? "bg-destructive" :
                alert.severity_score >= 50 ? "bg-warning" : "bg-success"
              )}
              style={{ width: `${alert.severity_score}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{alert.severity_score}%</span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
        {new Date(alert.timestamp).toLocaleString()}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
        {alert.primary_reason || "—"}
      </td>
    </tr>
  );
}
