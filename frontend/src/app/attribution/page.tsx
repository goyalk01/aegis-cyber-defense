"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { DashboardLayout, CommandNodePanel, NodeRankingPanel, ErrorBoundary } from "@/components";
import { fetchCommandNode, fetchGraph } from "@/lib/api";
import { CommandNodeResult, GraphData } from "@/types";
import { RefreshCw, Crosshair, Target, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function AttributionPage() {
  const [commandNode, setCommandNode] = useState<CommandNodeResult | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
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
      const [commandNodeData, graphData] = await Promise.all([
        fetchCommandNode(signal),
        fetchGraph(signal),
      ]);
      setCommandNode(commandNodeData);
      setGraph(graphData);
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
  const candidates = commandNode?.candidates || [];
  const topCandidate = candidates[0];

  return (
    <DashboardLayout
      title="Attribution Analysis"
      description="Command node identification and threat attribution"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/graph"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
          >
            View in Graph
          </Link>
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
      <div className="space-y-6">
        {/* Hero Section - Command Node */}
        {commandNodeId && (
          <div className="rounded-xl bg-gradient-to-br from-destructive/10 via-card to-destructive/5 border border-destructive/20 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-destructive/10 rounded-full blur-3xl" />
            
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-4 rounded-xl bg-destructive/10 pulse-glow">
                  <Crosshair className="w-8 h-8 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">
                    Primary Threat Source
                  </p>
                  <h2 className="text-3xl font-bold text-foreground font-mono tracking-wide">
                    {commandNodeId}
                  </h2>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-destructive/20 text-destructive text-xs font-semibold">
                      COMMAND NODE
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Identified at {commandNode?.generated_at || "—"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-4xl font-bold text-foreground">{confidence}%</p>
                  <p className="text-sm text-muted-foreground">Confidence</p>
                </div>
                <div className="h-16 w-px bg-border" />
                <div className="text-center">
                  <p className="text-4xl font-bold text-foreground">{candidates.length}</p>
                  <p className="text-sm text-muted-foreground">Candidates</p>
                </div>
                <div className="h-16 w-px bg-border" />
                <div className="text-center">
                  <p className="text-4xl font-bold text-foreground">{topCandidate?.out_degree || 0}</p>
                  <p className="text-sm text-muted-foreground">Connections</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ErrorBoundary>
            <CommandNodePanel commandNode={commandNode} loading={loading} error={error} />
          </ErrorBoundary>
          <ErrorBoundary>
            <NodeRankingPanel commandNode={commandNode} loading={loading} />
          </ErrorBoundary>
        </div>

        {/* Attribution Reasoning */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Attribution Reasoning
          </h3>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 shimmer rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(commandNode?.reasons || []).map((reason, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-accent/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="font-medium text-foreground text-sm">{reason}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getReasonDescription(reason)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Why Not Others */}
        {candidates.length > 1 && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Why Not Other Candidates?
            </h3>
            
            <div className="space-y-3">
              {candidates.slice(1, 4).map((candidate, idx) => {
                const topScore = candidates[0]?.score || 1;
                const pct = Math.round((candidate.score / topScore) * 100);
                const gap = 100 - pct;
                
                return (
                  <div key={candidate.node_id} className="p-4 rounded-lg bg-accent/20 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">#{idx + 2}</span>
                        <span className="font-mono text-foreground">{candidate.node_id}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{pct}% relative score</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-muted-foreground/50 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {gap}% lower score: {getRejectionReason(candidate, candidates[0])}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function getReasonDescription(reason: string): string {
  const descriptions: Record<string, string> = {
    "High out-degree centrality": "Connects to more targets than any other node.",
    "Repeated fingerprint cluster": "Multiple requests share identical behavioral patterns.",
    "Consistent timing pattern": "Request intervals match automated bot behavior.",
    "Primary attack initiator": "Origin of most attack chains in the graph.",
    "Maximum influence score": "Highest overall threat attribution score.",
  };
  return descriptions[reason] || "Behavioral analysis indicates command node characteristics.";
}

function getRejectionReason(
  candidate: { out_degree: number; fingerprint_matches: number; centrality: number },
  winner: { out_degree: number; fingerprint_matches: number; centrality: number }
): string {
  const reasons: string[] = [];
  if (candidate.out_degree < winner.out_degree) reasons.push("fewer connections");
  if (candidate.fingerprint_matches < winner.fingerprint_matches) reasons.push("fewer fingerprint matches");
  if (candidate.centrality < winner.centrality) reasons.push("lower centrality");
  return reasons.join(", ") || "lower overall score";
}
