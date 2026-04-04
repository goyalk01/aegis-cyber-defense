"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  DashboardLayout,
  MetricsCards,
  NetworkGraph,
  ErrorBoundary,
  RunPipelineButton,
} from "@/components";
import {
  fetchAlerts,
  fetchMetrics,
  fetchGraph,
  fetchFingerprints,
  fetchCommandNode,
  runPipeline,
} from "@/lib/api";
import { Alert, Metrics, GraphData, FingerprintData, CommandNodeResult } from "@/types";
import { 
  Network, 
  Crosshair, 
  Fingerprint, 
  BarChart3, 
  AlertTriangle,
  ArrowRight,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const AUTO_REFRESH_INTERVAL = 30000;

export default function Dashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [fingerprints, setFingerprints] = useState<FingerprintData | null>(null);
  const [commandNode, setCommandNode] = useState<CommandNodeResult | null>(null);
  const [loading, setLoading] = useState(true);
  
  const requestController = useRef<AbortController | null>(null);

  const loadAllData = useCallback(async () => {
    if (requestController.current) {
      requestController.current.abort();
    }
    requestController.current = new AbortController();
    const signal = requestController.current.signal;

    setLoading(true);
    try {
      const [alertsData, metricsData, graphData, fingerprintsData, commandNodeData] = await Promise.all([
        fetchAlerts({ limit: 100 }, signal),
        fetchMetrics(signal),
        fetchGraph(signal),
        fetchFingerprints(signal),
        fetchCommandNode(signal),
      ]);
      setAlerts(alertsData.alerts);
      setMetrics(metricsData);
      setGraph(graphData);
      setFingerprints(fingerprintsData);
      setCommandNode(commandNodeData);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Failed to load dashboard data:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
    return () => requestController.current?.abort();
  }, [loadAllData]);

  useEffect(() => {
    const interval = setInterval(loadAllData, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadAllData]);

  const handleRunPipeline = async () => {
    await runPipeline();
    await loadAllData();
  };

  const commandNodeId = commandNode?.command_node;
  const confidence = commandNode?.confidence_score ? Math.round(commandNode.confidence_score * 100) : 0;
  const attackCount = metrics?.attack_count || 0;
  const totalNodes = graph?.total_nodes || 0;
  const totalFingerprints = fingerprints?.total_fingerprints || 0;

  return (
    <DashboardLayout
      title="Dashboard"
      description="System overview and key metrics"
      actions={<RunPipelineButton onRun={handleRunPipeline} />}
    >
      <div className="space-y-6">
        {/* Command Node Alert Banner */}
        {commandNodeId && (
          <Link 
            href="/attribution"
            className="block p-4 rounded-xl bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-destructive/10 pulse-glow">
                  <Crosshair className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Command Node Detected</p>
                  <p className="text-xl font-bold text-foreground font-mono">{commandNodeId}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-3xl font-bold text-foreground">{confidence}%</p>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>
          </Link>
        )}

        {/* Metrics Cards */}
        <ErrorBoundary>
          <MetricsCards metrics={metrics} loading={loading} error={null} />
        </ErrorBoundary>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickNavCard
            href="/graph"
            icon={<Network className="w-5 h-5" />}
            title="Network Graph"
            value={`${totalNodes} nodes`}
            description="Interactive visualization"
            color="primary"
          />
          <QuickNavCard
            href="/attribution"
            icon={<Crosshair className="w-5 h-5" />}
            title="Attribution"
            value={commandNodeId || "Analyzing..."}
            description="Command node analysis"
            color="destructive"
          />
          <QuickNavCard
            href="/fingerprints"
            icon={<Fingerprint className="w-5 h-5" />}
            title="Fingerprints"
            value={`${totalFingerprints} clusters`}
            description="Pattern analysis"
            color="warning"
          />
          <QuickNavCard
            href="/alerts"
            icon={<AlertTriangle className="w-5 h-5" />}
            title="Alerts"
            value={`${attackCount} attacks`}
            description="Security events"
            color="orange"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graph Preview */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">Network Overview</span>
              </div>
              <Link 
                href="/graph"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Full View <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="h-[400px]">
              <ErrorBoundary>
                <NetworkGraph
                  graph={graph}
                  fingerprints={fingerprints}
                  commandNode={commandNode}
                  loading={loading}
                  error={null}
                  demoPhase="insights"
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">System Status</span>
              </div>
              <div className="space-y-3">
                <StatusItem 
                  label="Detection Engine" 
                  status="active" 
                  value="Real-time"
                />
                <StatusItem 
                  label="Graph Analysis" 
                  status="active" 
                  value={`${totalNodes} nodes`}
                />
                <StatusItem 
                  label="Pattern Matching" 
                  status="active" 
                  value={`${totalFingerprints} patterns`}
                />
                <StatusItem 
                  label="Attribution" 
                  status={commandNodeId ? "alert" : "pending"} 
                  value={commandNodeId ? `${confidence}% confident` : "Analyzing"}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">Threat Distribution</span>
              </div>
              <div className="space-y-2">
                <ThreatBar label="Attack" value={metrics?.attack_count || 0} total={metrics?.total_logs || 1} color="bg-destructive" />
                <ThreatBar label="High Risk" value={metrics?.high_risk_count || 0} total={metrics?.total_logs || 1} color="bg-orange-500" />
                <ThreatBar label="Suspicious" value={metrics?.suspicious_count || 0} total={metrics?.total_logs || 1} color="bg-warning" />
                <ThreatBar label="Clean" value={metrics?.clean_count || 0} total={metrics?.total_logs || 1} color="bg-success" />
              </div>
            </div>

            <Link
              href="/analytics"
              className="block rounded-xl border border-primary/20 bg-primary/5 p-4 hover:bg-primary/10 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">View Analytics</p>
                  <p className="text-sm text-muted-foreground">Advanced charts & metrics</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function QuickNavCard({ 
  href, 
  icon, 
  title, 
  value, 
  description, 
  color 
}: { 
  href: string; 
  icon: React.ReactNode; 
  title: string; 
  value: string; 
  description: string;
  color: "primary" | "destructive" | "warning" | "orange";
}) {
  const colorClasses = {
    primary: "hover:border-primary/50 group-hover:bg-primary/10",
    destructive: "hover:border-destructive/50 group-hover:bg-destructive/10",
    warning: "hover:border-warning/50 group-hover:bg-warning/10",
    orange: "hover:border-orange-500/50 group-hover:bg-orange-500/10",
  };

  const iconColors = {
    primary: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
    orange: "bg-orange-500/10 text-orange-500",
  };

  return (
    <Link
      href={href}
      className={cn(
        "group block p-4 rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg",
        colorClasses[color]
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg", iconColors[color])}>
          {icon}
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground mt-1 font-mono">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </Link>
  );
}

function StatusItem({ label, status, value }: { label: string; status: "active" | "pending" | "alert"; value: string }) {
  const statusColors = {
    active: "bg-success",
    pending: "bg-warning",
    alert: "bg-destructive",
  };

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", statusColors[status])} />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function ThreatBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = Math.round((value / total) * 100);
  
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
