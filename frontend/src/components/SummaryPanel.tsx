"use client";

import { Summary } from "@/types";
import { cn, getAlertLevelColor, getAlertDotColor, formatTimestamp } from "@/lib/utils";
import { AlertTriangle, Shield, Target, Server, TrendingUp, Activity, Zap } from "lucide-react";

interface SummaryPanelProps {
  summary: Summary | null;
  loading: boolean;
  error: string | null;
}

export function SummaryPanel({ summary, loading, error }: SummaryPanelProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <p className="font-semibold">Error Loading Summary</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <div className="h-6 w-32 shimmer rounded-lg" />
          </div>
          <div className="p-4 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3 rounded-xl bg-muted/30">
                <div className="h-4 w-24 shimmer rounded-lg mb-2" />
                <div className="h-3 w-full shimmer rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4">
          <div className="h-6 w-40 shimmer rounded-lg mb-3" />
          <div className="h-24 shimmer rounded-xl" />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 text-center">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground font-medium">No summary available</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Waiting for data...</p>
      </div>
    );
  }

  const attackCount = summary.metrics?.attack_count ?? 0;
  const highRiskCount = summary.metrics?.high_risk_count ?? 0;
  const suspiciousCount = summary.metrics?.suspicious_count ?? 0;
  const cleanCount = summary.metrics?.clean_count ?? 0;
  const attackPercentage = summary.metrics?.attack_percentage ?? 0;
  const totalNodes = summary.metrics?.total_nodes ?? 0;
  const criticalCount = summary.critical_alerts?.count ?? 0;
  const criticalAlertsList = summary.critical_alerts?.alerts ?? [];
  const nodesUnderAttack = summary.nodes_under_attack ?? [];
  const totalAlerts = attackCount + highRiskCount + suspiciousCount + cleanCount;

  return (
    <div className="space-y-4 sticky top-20">
      {/* Critical Alerts */}
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-gradient-to-r from-red-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Target className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Critical Alerts</h3>
            </div>
            <span className={cn(
              "px-3 py-1 rounded-full text-sm font-semibold",
              criticalCount > 0 
                ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                : "bg-green-500/10 text-green-500 border border-green-500/20"
            )}>
              {criticalCount} active
            </span>
          </div>
        </div>

        <div className="divide-y divide-border/30 max-h-80 overflow-y-auto">
          {criticalAlertsList.length === 0 ? (
            <div className="p-6 text-center">
              <Shield className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="text-green-600 font-medium">All Clear</p>
              <p className="text-sm text-muted-foreground mt-1">No critical alerts</p>
            </div>
          ) : (
            criticalAlertsList.slice(0, 5).map((alert, idx) => (
              <div
                key={alert.log_id}
                className="p-4 hover:bg-muted/30 transition-colors duration-200 fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          getAlertDotColor(alert.alert_level),
                          alert.alert_level === "ATTACK" && "animate-pulse"
                        )}
                      />
                      <span className="font-semibold text-foreground text-sm">
                        {alert.node_id}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-semibold shrink-0",
                          getAlertLevelColor(alert.alert_level)
                        )}
                      >
                        {alert.alert_level}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {alert.primary_reason}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {alert.severity_score}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {formatTimestamp(alert.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Nodes Under Attack */}
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-gradient-to-r from-orange-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Server className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="font-semibold text-foreground">Nodes Under Attack</h3>
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              {nodesUnderAttack.length} nodes
            </span>
          </div>
        </div>

        <div className="p-4">
          {nodesUnderAttack.length === 0 ? (
            <div className="text-center py-4">
              <Shield className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-600 font-medium text-sm">All Secure</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {nodesUnderAttack.slice(0, 12).map((node) => (
                <span
                  key={node}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold font-mono hover:bg-red-500/20 transition-colors"
                >
                  {node}
                </span>
              ))}
              {nodesUnderAttack.length > 12 && (
                <span className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
                  +{nodesUnderAttack.length - 12} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Threat Distribution */}
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Threat Distribution
          </h3>
        </div>

        {totalAlerts > 0 ? (
          <>
            <div className="flex h-3 rounded-full overflow-hidden bg-muted/50 mb-4">
              {attackCount > 0 && (
                <div
                  className="bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
                  style={{ width: `${(attackCount / totalAlerts) * 100}%` }}
                />
              )}
              {highRiskCount > 0 && (
                <div
                  className="bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
                  style={{ width: `${(highRiskCount / totalAlerts) * 100}%` }}
                />
              )}
              {suspiciousCount > 0 && (
                <div
                  className="bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-500"
                  style={{ width: `${(suspiciousCount / totalAlerts) * 100}%` }}
                />
              )}
              {cleanCount > 0 && (
                <div
                  className="bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                  style={{ width: `${(cleanCount / totalAlerts) * 100}%` }}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-red-500 to-red-400" />
                <span className="text-muted-foreground">Attack:</span>
                <span className="font-semibold text-foreground ml-auto">{attackCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-400" />
                <span className="text-muted-foreground">High Risk:</span>
                <span className="font-semibold text-foreground ml-auto">{highRiskCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400" />
                <span className="text-muted-foreground">Suspicious:</span>
                <span className="font-semibold text-foreground ml-auto">{suspiciousCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-green-500 to-green-400" />
                <span className="text-muted-foreground">Clean:</span>
                <span className="font-semibold text-foreground ml-auto">{cleanCount.toLocaleString()}</span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-4">
            No data available
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-sm p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-xl bg-background/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-4 h-4 text-destructive" />
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {attackPercentage.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Attack Rate</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-background/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {totalNodes.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Total Nodes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
