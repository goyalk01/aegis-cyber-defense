"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { DashboardLayout, NetworkGraph, ErrorBoundary } from "@/components";
import { fetchGraph, fetchFingerprints, fetchCommandNode } from "@/lib/api";
import { GraphData, FingerprintData, CommandNodeResult } from "@/types";
import { RefreshCw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GraphPage() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [fingerprints, setFingerprints] = useState<FingerprintData | null>(null);
  const [commandNode, setCommandNode] = useState<CommandNodeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
      const [graphData, fingerprintsData, commandNodeData] = await Promise.all([
        fetchGraph(signal),
        fetchFingerprints(signal),
        fetchCommandNode(signal),
      ]);
      setGraph(graphData);
      setFingerprints(fingerprintsData);
      setCommandNode(commandNodeData);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => requestController.current?.abort();
  }, [loadData]);

  const commandNodeId = commandNode?.command_node;
  const confidence = commandNode?.confidence_score
    ? Math.round(commandNode.confidence_score * 100)
    : 0;

  return (
    <DashboardLayout
      title="Network Graph"
      description="Interactive attack infrastructure visualization"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50 hover:bg-accent text-sm font-medium transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Command Node Indicator */}
        {commandNodeId && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/5 border border-destructive/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10 pulse-glow">
                <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Command Node Detected</p>
                <p className="text-lg font-bold text-destructive font-mono">{commandNodeId}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{confidence}%</p>
              <p className="text-xs text-muted-foreground">Confidence</p>
            </div>
          </div>
        )}

        {/* Graph Container - Full Width and Prominent */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Graph Controls */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-accent/20">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-foreground">Attack Infrastructure</h2>
              {graph && (
                <span className="text-sm text-muted-foreground">
                  {graph.total_nodes} nodes • {graph.total_edges} connections
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-accent transition-colors" title="Zoom In">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg hover:bg-accent transition-colors" title="Zoom Out">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg hover:bg-accent transition-colors" title="Fullscreen">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Graph - Large and Centered */}
          <div className="h-[calc(100vh-280px)] min-h-[500px]">
            <ErrorBoundary>
              <NetworkGraph
                graph={graph}
                fingerprints={fingerprints}
                commandNode={commandNode}
                loading={loading}
                error={error}
                demoPhase="insights"
              />
            </ErrorBoundary>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 p-3 rounded-lg bg-accent/20 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Clean</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">Suspicious</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-muted-foreground">High Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-muted-foreground">Attack / Command</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
