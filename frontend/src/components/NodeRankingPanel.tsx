"use client";

import { BarChart3 } from "lucide-react";
import { CommandNodeResult } from "@/types";

interface NodeRankingPanelProps {
  commandNode: CommandNodeResult | null;
  loading: boolean;
}

export function NodeRankingPanel({ commandNode, loading }: NodeRankingPanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
        <div className="h-5 w-36 bg-muted rounded mb-3" />
        <div className="space-y-2">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="h-8 rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const topCandidates = commandNode?.top_candidates || [];
  const candidates = commandNode?.candidates || [];
  const hasTopCandidates = topCandidates.length > 0;
  const topScore = hasTopCandidates
    ? Math.max(...topCandidates.map((c) => c.score), 1)
    : 1;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Top 5 Influence Ranking</h3>
      </div>

      {!hasTopCandidates && candidates.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">No candidates available</div>
      ) : (
        <div className="divide-y divide-border">
          {hasTopCandidates
            ? topCandidates.slice(0, 5).map((candidate, idx) => {
                const percentage = Math.min(99, (candidate.score / topScore) * 100);
                return (
                  <div key={candidate.node} className="p-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      #{idx + 1} {candidate.node}
                    </p>
                    <span className="text-sm font-semibold text-primary">{percentage.toFixed(1)}%</span>
                  </div>
                );
              })
            : candidates.slice(0, 5).map((candidate, idx) => (
                <div key={candidate.node_id} className="p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      #{idx + 1} {candidate.node_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      degree={candidate.out_degree} | fp={candidate.fingerprint_matches} | centrality={candidate.centrality}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary">{candidate.score.toFixed(3)}</span>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
