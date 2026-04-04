"use client";

import { BarChart3, Trophy, Medal, Award } from "lucide-react";
import { CommandNodeResult } from "@/types";
import { cn } from "@/lib/utils";

interface NodeRankingPanelProps {
  commandNode: CommandNodeResult | null;
  loading: boolean;
}

const RANK_ICONS = [
  <Trophy key="1" className="w-4 h-4 text-yellow-500" />,
  <Medal key="2" className="w-4 h-4 text-slate-400" />,
  <Award key="3" className="w-4 h-4 text-amber-600" />,
];

const RANK_COLORS = [
  "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
  "from-slate-400/20 to-slate-400/5 border-slate-400/30",
  "from-amber-600/20 to-amber-600/5 border-amber-600/30",
];

const BAR_COLORS = [
  "bg-gradient-to-r from-red-500 to-red-400",
  "bg-gradient-to-r from-orange-500 to-orange-400",
  "bg-gradient-to-r from-yellow-500 to-yellow-400",
  "bg-gradient-to-r from-blue-500 to-blue-400",
  "bg-gradient-to-r from-slate-500 to-slate-400",
];

export function NodeRankingPanel({ commandNode, loading }: NodeRankingPanelProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="h-5 w-44 shimmer rounded-lg" />
        </div>
        <div className="p-3 space-y-2">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="h-14 shimmer rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const candidates = commandNode?.candidates || [];
  const topScore = candidates.length > 0
    ? Math.max(...candidates.map((c) => c.score), 1)
    : 1;

  const displayCandidates = candidates.slice(0, 5).map((c, idx) => ({
    node_id: c.node_id,
    score: c.score,
    percentage: Math.min(100, (c.score / topScore) * 100),
    rank: idx + 1,
    out_degree: c.out_degree,
    fingerprint_matches: c.fingerprint_matches,
    centrality: c.centrality,
  }));

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Influence Ranking</h3>
            <p className="text-xs text-muted-foreground">Top 5 candidates by score</p>
          </div>
        </div>
      </div>

      {displayCandidates.length === 0 ? (
        <div className="p-8 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground font-medium">No candidates found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Waiting for analysis...</p>
        </div>
      ) : (
        <div className="p-3 space-y-2">
          {displayCandidates.map((candidate, idx) => {
            const isWinner = idx === 0;
            const percentage = candidate.percentage;
            
            return (
              <div 
                key={candidate.node_id} 
                className={cn(
                  "p-3 rounded-xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-lg",
                  idx < 3 
                    ? `bg-gradient-to-r ${RANK_COLORS[idx]}` 
                    : "bg-muted/20 border-border/50 hover:bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    {idx < 3 ? RANK_ICONS[idx] : (
                      <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground bg-muted/50 rounded-md">
                        #{idx + 1}
                      </span>
                    )}
                    <span className={cn(
                      "font-mono text-sm",
                      isWinner ? "font-bold text-foreground" : "text-muted-foreground"
                    )}>
                      {candidate.node_id}
                    </span>
                    {isWinner && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-500 rounded-md uppercase tracking-wider">
                        Threat
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-sm font-bold tabular-nums",
                    isWinner ? "text-red-500" : idx === 1 ? "text-orange-500" : idx === 2 ? "text-yellow-600" : "text-muted-foreground"
                  )}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                
                {/* Score bar */}
                <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-700 progress-animated",
                      BAR_COLORS[idx] || BAR_COLORS[4]
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Show additional details for top 3 */}
                {idx < 3 && (
                  <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground font-medium">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Conn: {candidate.out_degree}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      FP: {candidate.fingerprint_matches}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      C: {((candidate.centrality || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      
      <div className="px-4 py-3 border-t border-border/30 bg-gradient-to-r from-muted/10 to-transparent">
        <p className="text-[10px] text-muted-foreground text-center font-medium">
          Ranking based on topology • fingerprint frequency • network centrality
        </p>
      </div>
    </div>
  );
}
