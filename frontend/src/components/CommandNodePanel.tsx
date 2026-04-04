"use client";

import { AlertTriangle, Crosshair, ShieldAlert } from "lucide-react";
import { CommandNodeResult } from "@/types";

interface CommandNodePanelProps {
  commandNode: CommandNodeResult | null;
  loading: boolean;
  error: string | null;
}

export function CommandNodePanel({ commandNode, loading, error }: CommandNodePanelProps) {
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

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
        <div className="h-6 w-40 bg-muted rounded mb-4" />
        <div className="h-20 bg-muted rounded mb-3" />
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded" />
          <div className="h-3 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!commandNode || !commandNode.command_node) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Crosshair className="w-5 h-5 text-red-500" />
        <h3 className="text-lg font-semibold text-foreground">Command Node Attribution</h3>
      </div>

      <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-background/80">
        <p className="text-sm text-muted-foreground">Likely command node</p>
        <p className="text-2xl font-bold text-red-500 tracking-wide">{commandNode.command_node}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Confidence: {(commandNode.confidence_score * 100).toFixed(0)}%
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground mb-2">Attribution Reasons</p>
        {commandNode.reasons.length > 0 ? (
          <ul className="space-y-2">
            {commandNode.reasons.map((reason) => (
              <li
                key={reason}
                className="text-sm text-muted-foreground rounded-md bg-background/80 px-3 py-2 border border-border"
              >
                {`\u2714 ${reason}`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No data available</p>
        )}

        <p className="text-xs text-muted-foreground mt-3">
          Low-frequency and benign patterns are filtered to reduce false positives.
        </p>

        {commandNode.top_candidates && commandNode.top_candidates.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-foreground mb-2">Why This Node Over Others</p>
            <div className="space-y-1">
              {commandNode.top_candidates.slice(0, 3).map((candidate) => {
                const top = commandNode.top_candidates && commandNode.top_candidates.length > 0
                  ? commandNode.top_candidates[0].score
                  : 1;
                const pct = Math.min(99, (candidate.score / (top || 1)) * 100);
                return (
                  <div key={candidate.node} className="text-xs text-muted-foreground">
                    {candidate.node} - {pct.toFixed(1)}%
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
