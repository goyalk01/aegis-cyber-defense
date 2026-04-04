"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { DashboardLayout, FingerprintPanel, ErrorBoundary } from "@/components";
import { fetchFingerprints } from "@/lib/api";
import { FingerprintData, FingerprintCluster } from "@/types";
import { RefreshCw, Fingerprint, Users, Clock, Globe, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FingerprintsPage() {
  const [fingerprints, setFingerprints] = useState<FingerprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "high" | "medium" | "low">("all");
  
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
      const data = await fetchFingerprints(signal);
      setFingerprints(data);
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

  const clusters = fingerprints?.fingerprints || [];
  
  const filteredClusters = clusters.filter((c) => {
    if (filterType === "all") return true;
    if (filterType === "high") return c.confidence >= 0.8;
    if (filterType === "medium") return c.confidence >= 0.5 && c.confidence < 0.8;
    return c.confidence < 0.5;
  });

  const stats = {
    total: clusters.length,
    highConfidence: clusters.filter((c) => c.confidence >= 0.8).length,
    mediumConfidence: clusters.filter((c) => c.confidence >= 0.5 && c.confidence < 0.8).length,
    lowConfidence: clusters.filter((c) => c.confidence < 0.5).length,
  };

  return (
    <DashboardLayout
      title="Fingerprint Analysis"
      description="Behavioral pattern clusters and metadata signatures"
      actions={
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="px-3 py-1.5 rounded-lg border border-border text-sm"
          >
            <option value="all">All Clusters</option>
            <option value="high">High Confidence</option>
            <option value="medium">Medium Confidence</option>
            <option value="low">Low Confidence</option>
          </select>
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
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Clusters"
            value={stats.total}
            icon={<Layers className="w-5 h-5" />}
            color="primary"
          />
          <StatCard
            title="High Confidence"
            value={stats.highConfidence}
            icon={<Fingerprint className="w-5 h-5" />}
            color="destructive"
          />
          <StatCard
            title="Medium Confidence"
            value={stats.mediumConfidence}
            icon={<Users className="w-5 h-5" />}
            color="warning"
          />
          <StatCard
            title="Low Confidence"
            value={stats.lowConfidence}
            icon={<Clock className="w-5 h-5" />}
            color="success"
          />
        </div>

        {/* Clusters Grid */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-accent/20">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Pattern Clusters</h2>
              <span className="text-sm text-muted-foreground">
                {filteredClusters.length} clusters
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 shimmer rounded-lg" />
              ))}
            </div>
          ) : filteredClusters.length === 0 ? (
            <div className="p-8 text-center">
              <Fingerprint className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground font-medium">No fingerprint clusters found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Run the pipeline to analyze patterns</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredClusters.map((cluster) => (
                <ClusterRow
                  key={cluster.fingerprint_id}
                  cluster={cluster}
                  expanded={expandedCluster === cluster.fingerprint_id}
                  onToggle={() => 
                    setExpandedCluster(
                      expandedCluster === cluster.fingerprint_id ? null : cluster.fingerprint_id
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Original Panel for Reference */}
        <ErrorBoundary>
          <FingerprintPanel fingerprints={fingerprints} loading={loading} error={error} />
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon, color }: { 
  title: string; 
  value: number; 
  icon: React.ReactNode; 
  color: "primary" | "destructive" | "warning" | "success";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}

function ClusterRow({ cluster, expanded, onToggle }: { 
  cluster: FingerprintCluster; 
  expanded: boolean;
  onToggle: () => void;
}) {
  const confidencePercent = Math.round(cluster.confidence * 100);
  const confidenceColor = 
    cluster.confidence >= 0.8 ? "text-destructive" :
    cluster.confidence >= 0.5 ? "text-warning" : "text-success";

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <div>
            <p className="font-mono text-sm text-foreground">{cluster.fingerprint_id}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cluster.occurrences} occurrences • {cluster.nodes.length} nodes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className={cn("text-lg font-bold", confidenceColor)}>{confidencePercent}%</p>
            <p className="text-xs text-muted-foreground">Confidence</p>
          </div>
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full",
                cluster.confidence >= 0.8 ? "bg-destructive" :
                cluster.confidence >= 0.5 ? "bg-warning" : "bg-success"
              )}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 bg-accent/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-card border border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">User Agent</p>
              <p className="text-sm font-mono text-foreground truncate">{cluster.user_agent}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Interval Bucket</p>
              <p className="text-sm text-foreground">{cluster.interval_bucket}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Headers</p>
              <p className="text-sm text-foreground">{cluster.headers.length} unique headers</p>
            </div>
            <div className="md:col-span-3">
              <p className="text-xs text-muted-foreground mb-2">Affected Nodes</p>
              <div className="flex flex-wrap gap-1">
                {cluster.nodes.slice(0, 10).map((node) => (
                  <span key={node} className="px-2 py-0.5 rounded bg-accent text-xs font-mono">
                    {node}
                  </span>
                ))}
                {cluster.nodes.length > 10 && (
                  <span className="px-2 py-0.5 rounded bg-muted text-xs text-muted-foreground">
                    +{cluster.nodes.length - 10} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
