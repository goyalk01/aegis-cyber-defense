"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Navbar,
  MetricsCards,
  AlertsTable,
  CityMap,
  Heatmap,
  SummaryPanel,
  RunPipelineButton,
  NetworkGraph,
  CommandNodePanel,
  FingerprintPanel,
  NodeRankingPanel,
} from "@/components";
import {
  fetchAlerts,
  fetchMetrics,
  fetchSummary,
  fetchGraph,
  fetchFingerprints,
  fetchCommandNode,
  runPipeline,
} from "@/lib/api";
import { Alert, Metrics, Summary, GraphData, FingerprintData, CommandNodeResult } from "@/types";

const AUTO_REFRESH_INTERVAL = 15000; // 15 seconds
const DEMO_PHASE_TIMINGS = {
  suspicious: 500,
  command: 1100,
  insights: 1800,
} as const;

export default function Dashboard() {
  // Last updated timestamp
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Alerts state
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  // Metrics state
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Summary state
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Attribution state
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState<string | null>(null);

  const [fingerprints, setFingerprints] = useState<FingerprintData | null>(null);
  const [fingerprintsLoading, setFingerprintsLoading] = useState(true);
  const [fingerprintsError, setFingerprintsError] = useState<string | null>(null);

  const [commandNode, setCommandNode] = useState<CommandNodeResult | null>(null);
  const [commandNodeLoading, setCommandNodeLoading] = useState(true);
  const [commandNodeError, setCommandNodeError] = useState<string | null>(null);
  const [demoPhase, setDemoPhase] = useState<"graph" | "suspicious" | "command" | "insights">("graph");

  // Prevent duplicate fetches
  const isFetching = useRef(false);
  const requestController = useRef<AbortController | null>(null);

  // Fetch alerts (no filter - filter locally)
  const loadAlerts = useCallback(async (signal?: AbortSignal) => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const data = await fetchAlerts({ limit: 100 }, signal);
      setAlerts(data.alerts);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setAlertsError(error instanceof Error ? error.message : "Failed to load alerts");
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  // Fetch metrics
  const loadMetrics = useCallback(async (signal?: AbortSignal) => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const data = await fetchMetrics(signal);
      setMetrics(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMetricsError(error instanceof Error ? error.message : "Failed to load metrics");
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Fetch summary
  const loadSummary = useCallback(async (signal?: AbortSignal) => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await fetchSummary(signal);
      setSummary(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSummaryError(error instanceof Error ? error.message : "Failed to load summary");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadGraph = useCallback(async (signal?: AbortSignal) => {
    setGraphLoading(true);
    setGraphError(null);
    try {
      const data = await fetchGraph(signal);
      setGraph(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setGraphError(error instanceof Error ? error.message : "Failed to load graph");
    } finally {
      setGraphLoading(false);
    }
  }, []);

  const loadFingerprints = useCallback(async (signal?: AbortSignal) => {
    setFingerprintsLoading(true);
    setFingerprintsError(null);
    try {
      const data = await fetchFingerprints(signal);
      setFingerprints(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFingerprintsError(error instanceof Error ? error.message : "Failed to load fingerprints");
    } finally {
      setFingerprintsLoading(false);
    }
  }, []);

  const loadCommandNode = useCallback(async (signal?: AbortSignal) => {
    setCommandNodeLoading(true);
    setCommandNodeError(null);
    try {
      const data = await fetchCommandNode(signal);
      setCommandNode(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setCommandNodeError(error instanceof Error ? error.message : "Failed to load command node");
    } finally {
      setCommandNodeLoading(false);
    }
  }, []);

  // Load all data
  const loadAllData = useCallback(async () => {
    if (requestController.current) {
      requestController.current.abort();
    }

    const controller = new AbortController();
    requestController.current = controller;

    if (isFetching.current) return;
    isFetching.current = true;
    try {
      await Promise.all([
        loadAlerts(controller.signal),
        loadMetrics(controller.signal),
        loadSummary(controller.signal),
        loadGraph(controller.signal),
        loadFingerprints(controller.signal),
        loadCommandNode(controller.signal),
      ]);

      // Sequential reveal for demo storytelling.
      setDemoPhase("graph");
      setTimeout(() => setDemoPhase("suspicious"), DEMO_PHASE_TIMINGS.suspicious);
      setTimeout(() => setDemoPhase("command"), DEMO_PHASE_TIMINGS.command);
      setTimeout(() => setDemoPhase("insights"), DEMO_PHASE_TIMINGS.insights);

      setLastUpdated(new Date());
    } finally {
      isFetching.current = false;
    }
  }, [loadAlerts, loadMetrics, loadSummary, loadGraph, loadFingerprints, loadCommandNode]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    return () => {
      if (requestController.current) {
        requestController.current.abort();
      }
    };
  }, []);

  // Auto refresh
  useEffect(() => {
    const interval = setInterval(() => {
      loadAllData();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [loadAllData]);

  // Run pipeline handler
  const handleRunPipeline = async () => {
    await runPipeline();
    await loadAllData();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar lastUpdated={lastUpdated} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Security Dashboard
            </h1>
            <p className="text-muted-foreground">
              Real-time threat detection and infrastructure monitoring
            </p>
          </div>
          <RunPipelineButton onRun={handleRunPipeline} />
        </div>

        {/* Metrics Cards */}
        <section>
          <MetricsCards
            metrics={metrics}
            loading={metricsLoading}
            error={metricsError}
          />
        </section>

        {/* Attribution Flow */}
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-2">Live Attribution Flow</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`px-2 py-1 rounded ${demoPhase === "graph" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              1. Graph builds
            </span>
            <span className={`px-2 py-1 rounded ${demoPhase === "suspicious" ? "bg-yellow-500/20 text-yellow-700" : "bg-muted text-muted-foreground"}`}>
              2. Patterns detected
            </span>
            <span className={`px-2 py-1 rounded ${demoPhase === "command" ? "bg-red-500/20 text-red-600" : "bg-muted text-muted-foreground"}`}>
              3. Command node highlighted
            </span>
            <span className={`px-2 py-1 rounded ${demoPhase === "insights" ? "bg-green-500/20 text-green-700" : "bg-muted text-muted-foreground"}`}>
              4. Confidence explained
            </span>
          </div>
        </section>

        {/* Attribution Row */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <NetworkGraph
              graph={graph}
              fingerprints={fingerprints}
              commandNode={commandNode}
              loading={graphLoading}
              error={graphError}
              demoPhase={demoPhase}
            />
          </div>
          <div className="space-y-6">
            <CommandNodePanel
              commandNode={commandNode}
              loading={commandNodeLoading}
              error={commandNodeError}
            />
            <NodeRankingPanel commandNode={commandNode} loading={commandNodeLoading} />
            <FingerprintPanel
              fingerprints={fingerprints}
              loading={fingerprintsLoading}
              error={fingerprintsError}
            />
          </div>
        </section>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Alerts Table */}
          <div className="lg:col-span-2 space-y-6">
            {/* Node Status Map */}
            <CityMap
              alerts={alerts}
              loading={alertsLoading}
              error={alertsError}
            />

            <AlertsTable
              alerts={alerts}
              loading={alertsLoading}
              error={alertsError}
            />

            {/* Response Time Chart */}
            <Heatmap
              alerts={alerts}
              loading={alertsLoading}
              error={alertsError}
            />
          </div>

          {/* Right Column - Summary Panel */}
          <div>
            <SummaryPanel
              summary={summary}
              loading={summaryLoading}
              error={summaryError}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-6 pb-4 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
            <p>AEGIS Cyber-Infrastructure Defense System v1.0</p>
            <p>Auto-refresh: {AUTO_REFRESH_INTERVAL / 1000}s</p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            AI tools were used for assistance in debugging and structuring. All core system
            logic and validation were designed and verified by the team.
          </p>
        </footer>
      </main>
    </div>
  );
}
