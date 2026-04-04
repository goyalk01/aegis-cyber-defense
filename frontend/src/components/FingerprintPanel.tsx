"use client";

import { AlertTriangle, Fingerprint, Layers } from "lucide-react";
import { FingerprintData } from "@/types";

interface FingerprintPanelProps {
  fingerprints: FingerprintData | null;
  loading: boolean;
  error: string | null;
}

export function FingerprintPanel({ fingerprints, loading, error }: FingerprintPanelProps) {
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
        <div className="h-6 w-44 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-16 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!fingerprints || fingerprints.fingerprints.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Fingerprint className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Fingerprint Clusters</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {fingerprints.total_fingerprints} clusters
        </span>
      </div>

      <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
        {fingerprints.fingerprints.slice(0, 12).map((fp) => (
          <div key={fp.fingerprint_id} className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="font-medium text-foreground">{fp.fingerprint_id}</p>
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                {(fp.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-2">
              UA: {fp.user_agent} | Interval: {fp.interval_bucket}
            </p>

            <p className="text-sm text-muted-foreground mb-2">
              Nodes involved: {fp.nodes.join(", ") || "No data available"}
            </p>

            <p className="text-xs text-muted-foreground">
              Occurrences: {fp.occurrences}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
