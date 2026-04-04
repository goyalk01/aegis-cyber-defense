"use client";

import { AlertTriangle, Crosshair, ShieldAlert, Target, TrendingUp, Fingerprint, Network } from "lucide-react";
import { CommandNodeResult } from "@/types";
import { cn } from "@/lib/utils";

interface CommandNodePanelProps {
  commandNode: CommandNodeResult | null;
  loading: boolean;
  error: string | null;
}

const REASON_ICONS: Record<string, React.ReactNode> = {
  "High centrality": <Network className="w-3.5 h-3.5" />,
  "Moderate centrality": <Network className="w-3.5 h-3.5" />,
  "Repeated fingerprint": <Fingerprint className="w-3.5 h-3.5" />,
  "Multiple fingerprint matches": <Fingerprint className="w-3.5 h-3.5" />,
  "Consistent intervals": <TrendingUp className="w-3.5 h-3.5" />,
  "Highly consistent timing": <TrendingUp className="w-3.5 h-3.5" />,
  "High outgoing connections": <Target className="w-3.5 h-3.5" />,
  "Significant connection count": <Target className="w-3.5 h-3.5" />,
  "Elevated network activity": <Target className="w-3.5 h-3.5" />,
};

const REASON_EXPLANATIONS: Record<string, string> = {
  "High centrality": "This node acts as a central hub in the network topology, routing traffic to many other nodes.",
  "Moderate centrality": "This node has significant influence in the network topology, connecting multiple clusters.",
  "Repeated fingerprint": "Identical metadata signatures detected across multiple requests, indicating automated behavior.",
  "Multiple fingerprint matches": "Several matching behavioral patterns detected, suggesting coordinated activity.",
  "Consistent intervals": "Request timing shows suspicious regularity, suggesting programmatic coordination.",
  "Highly consistent timing": "Request intervals are nearly identical, strong indicator of automated orchestration.",
  "High outgoing connections": "Unusually high number of outbound connections to other infrastructure nodes.",
  "Significant connection count": "Notable number of outbound connections suggesting command distribution.",
  "Elevated network activity": "Above-average network activity patterns compared to baseline behavior.",
};

export function CommandNodePanel({ commandNode, loading, error }: CommandNodePanelProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <p className="font-semibold">Error Loading Attribution</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="h-6 w-48 shimmer rounded-lg" />
        </div>
        <div className="p-4 space-y-4">
          <div className="h-24 shimmer rounded-xl" />
          <div className="space-y-2">
            <div className="h-4 shimmer rounded-lg" />
            <div className="h-4 w-3/4 shimmer rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!commandNode || !commandNode.command_node) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground font-medium">No command node detected</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Analyzing network patterns...</p>
      </div>
    );
  }

  const confidencePercent = Math.round(commandNode.confidence_score * 100);
  const topCandidate = commandNode.candidates?.[0];

  return (
    <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/5 via-card/80 to-red-500/10 backdrop-blur-sm overflow-hidden relative">
      {/* Multiple pulsing glow effects */}
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-red-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-red-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Header */}
      <div className="p-4 border-b border-red-500/20 bg-gradient-to-r from-red-500/10 to-transparent relative">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500/20 pulse-glow">
            <Crosshair className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Command Node Attribution</h3>
            <p className="text-xs text-muted-foreground">Primary threat source identified</p>
          </div>
        </div>
      </div>
      
      <div className="p-5 relative">

        {/* Main Command Node Display */}
        <div className="mb-5 p-5 rounded-xl border border-red-500/30 bg-background/80 shadow-xl shadow-red-500/10">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2 font-medium">Identified Command Node</p>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-red-500 tracking-wide font-mono">{commandNode.command_node}</span>
              <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-500 text-xs font-semibold animate-pulse">
                THREAT
              </span>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground tabular-nums">{confidencePercent}%</p>
              <p className="text-xs text-muted-foreground">Confidence</p>
            </div>
          </div>
          
          {/* Confidence bar */}
          <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-600 via-red-500 to-rose-400 rounded-full transition-all duration-700 progress-animated"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>

        {/* Why This Node Section */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-red-500" />
            Why This Node?
          </p>
          <div className="space-y-2">
            {commandNode.reasons.length > 0 ? (
              commandNode.reasons.map((reason) => (
                <div
                  key={reason}
                  className="rounded-lg bg-background/80 px-3 py-2.5 border border-border hover:border-red-500/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-red-500">{REASON_ICONS[reason] || <Target className="w-3.5 h-3.5" />}</span>
                    <span className="text-sm font-medium text-foreground">{reason}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-5">
                    {REASON_EXPLANATIONS[reason] || "Behavioral pattern detected matching command node characteristics."}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Analysis based on network topology and behavior patterns.</p>
            )}
          </div>
        </div>

        {/* Top Candidates Comparison */}
        {commandNode.top_candidates && commandNode.top_candidates.length > 1 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Top Candidate Comparison
            </p>
            <div className="space-y-2">
              {commandNode.top_candidates.slice(0, 3).map((candidate, idx) => {
                const topScore = commandNode.top_candidates?.[0]?.score || 1;
                const pct = Math.min(99, (candidate.score / topScore) * 100);
                const isWinner = idx === 0;
                
                return (
                  <div key={candidate.node} className="flex items-center gap-3">
                    <span className={cn(
                      "w-6 text-xs font-bold",
                      isWinner ? "text-red-500" : "text-muted-foreground"
                    )}>
                      #{idx + 1}
                    </span>
                    <span className={cn(
                      "w-20 text-sm font-mono truncate",
                      isWinner ? "text-foreground font-semibold" : "text-muted-foreground"
                    )}>
                      {candidate.node}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isWinner ? "bg-red-500" : idx === 1 ? "bg-orange-400" : "bg-yellow-400"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={cn(
                      "w-12 text-right text-sm font-medium",
                      isWinner ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Candidate Details */}
        {topCandidate && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Attribution Metrics
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-background/60 border border-border/50">
                <p className="text-lg font-bold text-foreground">{topCandidate.out_degree}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Connections</p>
              </div>
              <div className="p-2 rounded-lg bg-background/60 border border-border/50">
                <p className="text-lg font-bold text-foreground">{topCandidate.fingerprint_matches}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Fingerprints</p>
              </div>
              <div className="p-2 rounded-lg bg-background/60 border border-border/50">
                <p className="text-lg font-bold text-foreground">{(topCandidate.centrality * 100).toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground uppercase">Centrality</p>
              </div>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-4 text-center">
          Low-frequency and benign patterns are filtered to reduce false positives.
        </p>
      </div>
    </div>
  );
}
