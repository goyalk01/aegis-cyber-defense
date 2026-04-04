"use client";

import { AlertTriangle, Fingerprint, Layers, Users, Clock, Globe, ChevronRight } from "lucide-react";
import { FingerprintData } from "@/types";
import { cn } from "@/lib/utils";

interface FingerprintPanelProps {
  fingerprints: FingerprintData | null;
  loading: boolean;
  error: string | null;
}

const CONFIDENCE_COLORS = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20",
};

function getConfidenceLevel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

export function FingerprintPanel({ fingerprints, loading, error }: FingerprintPanelProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <p className="font-semibold">Error Loading Fingerprints</p>
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
          <div className="h-6 w-44 shimmer rounded-lg" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-muted/30">
              <div className="flex items-start justify-between mb-3">
                <div className="h-5 w-32 shimmer rounded-lg" />
                <div className="h-6 w-16 shimmer rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full shimmer rounded-lg" />
                <div className="h-3 w-3/4 shimmer rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!fingerprints || fingerprints.fingerprints.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 text-center">
        <Fingerprint className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground font-medium">No fingerprints detected</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Behavioral patterns will appear here</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Behavioral Fingerprints</h3>
              <p className="text-xs text-muted-foreground">Detected pattern clusters</p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-sm font-medium text-primary">
              {fingerprints.total_fingerprints.toLocaleString()} clusters
            </span>
          </div>
        </div>
      </div>

      {/* Fingerprint List */}
      <div className="max-h-[500px] overflow-y-auto">
        <div className="p-4 space-y-3">
          {fingerprints.fingerprints.slice(0, 8).map((fp, idx) => {
            const confidenceLevel = getConfidenceLevel(fp.confidence);
            
            return (
              <div
                key={fp.fingerprint_id}
                className={cn(
                  "group p-4 rounded-xl border transition-all duration-300",
                  "bg-gradient-to-r from-muted/30 to-transparent",
                  "hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30",
                  "border-border/50"
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Fingerprint className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {fp.fingerprint_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fp.occurrences} occurrences
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border",
                    CONFIDENCE_COLORS[confidenceLevel]
                  )}>
                    {(fp.confidence * 100).toFixed(0)}% match
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="w-3.5 h-3.5" />
                    <span className="truncate" title={fp.user_agent}>
                      {fp.user_agent.length > 25 ? fp.user_agent.substring(0, 25) + '...' : fp.user_agent}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{fp.interval_bucket}</span>
                  </div>
                </div>

                {/* Nodes involved */}
                <div className="flex items-start gap-2">
                  <Users className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex flex-wrap gap-1.5">
                    {fp.nodes.slice(0, 5).map((node) => (
                      <span
                        key={node}
                        className="px-2 py-0.5 rounded-md bg-muted/50 text-xs text-muted-foreground font-mono"
                      >
                        {node}
                      </span>
                    ))}
                    {fp.nodes.length > 5 && (
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-xs text-primary font-medium">
                        +{fp.nodes.length - 5} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Hover indicator */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-4 h-4 text-primary" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Stats */}
      {fingerprints.fingerprints.length > 8 && (
        <div className="p-3 border-t border-border/50 bg-muted/20">
          <p className="text-xs text-muted-foreground text-center">
            Showing 8 of {fingerprints.total_fingerprints.toLocaleString()} fingerprint clusters
          </p>
        </div>
      )}
    </div>
  );
}
