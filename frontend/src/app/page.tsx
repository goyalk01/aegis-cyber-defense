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
} from "@/components";
import { fetchAlerts, fetchMetrics, fetchSummary, runPipeline } from "@/lib/api";
import { Alert, Metrics, Summary } from "@/types";

const AUTO_REFRESH_INTERVAL = 15000; // 15 seconds

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

  // Prevent duplicate fetches
  const isFetching = useRef(false);

  // Fetch alerts (no filter - filter locally)
  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const data = await fetchAlerts({ limit: 100 });
      setAlerts(data.alerts);
    } catch (error) {
      setAlertsError(error instanceof Error ? error.message : "Failed to load alerts");
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  // Fetch metrics
  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const data = await fetchMetrics();
      setMetrics(data);
    } catch (error) {
      setMetricsError(error instanceof Error ? error.message : "Failed to load metrics");
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Fetch summary
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await fetchSummary();
      setSummary(data);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Failed to load summary");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Load all data
  const loadAllData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      await Promise.all([loadAlerts(), loadMetrics(), loadSummary()]);
      setLastUpdated(new Date());
    } finally {
      isFetching.current = false;
    }
  }, [loadAlerts, loadMetrics, loadSummary]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

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

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Alerts Table */}
          <div className="lg:col-span-2 space-y-6">
            <AlertsTable
              alerts={alerts}
              loading={alertsLoading}
              error={alertsError}
            />

            {/* Node Status Map */}
            <CityMap
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
        </footer>
      </main>
    </div>
  );
}
