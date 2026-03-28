"use client";

import { useState } from "react";
import { Alert } from "@/types";
import { cn, getAlertDotColor, getAlertLevelColor, formatTimestamp } from "@/lib/utils";
import { Server, AlertTriangle } from "lucide-react";

interface CityMapProps {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
}

interface NodeStatus {
  node_id: string;
  node_name: string;
  region: string;
  alert_level: string;
  severity_score: number;
  primary_reason: string | null;
  timestamp: string;
}

export function CityMap({ alerts, loading, error }: CityMapProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Group alerts by node_id and take ONLY latest alert per node
  const getLatestAlertPerNode = (): NodeStatus[] => {
    const nodeMap = new Map<string, Alert>();

    // Sort by timestamp descending to get latest first
    const sortedAlerts = [...alerts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Take only the first (latest) alert per node
    for (const alert of sortedAlerts) {
      if (!nodeMap.has(alert.node_id)) {
        nodeMap.set(alert.node_id, alert);
      }
    }

    return Array.from(nodeMap.values()).map((alert) => ({
      node_id: alert.node_id,
      node_name: alert.node_name,
      region: alert.region,
      alert_level: alert.alert_level,
      severity_score: alert.severity_score,
      primary_reason: alert.primary_reason,
      timestamp: alert.timestamp,
    }));
  };

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

  const nodes = loading ? [] : getLatestAlertPerNode();

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Node Status Map</h3>
          <p className="text-sm text-muted-foreground">
            Latest status per infrastructure node
          </p>
        </div>
        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Attack</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>High Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span>Suspicious</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span>Clean</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-lg border border-border bg-muted/30 animate-pulse"
              >
                <div className="h-4 w-16 bg-muted rounded mb-2" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : nodes.length === 0 ? (
          <div className="text-center py-12">
            <Server className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {nodes.map((node) => (
              <div
                key={node.node_id}
                className={cn(
                  "relative p-4 rounded-lg border transition-all hover:shadow-lg cursor-default",
                  getAlertLevelColor(node.alert_level)
                )}
                onMouseEnter={() => setHoveredNode(node.node_id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      getAlertDotColor(node.alert_level),
                      node.alert_level === "ATTACK" && "animate-pulse"
                    )}
                  />
                  <span className="font-semibold text-sm truncate">
                    {node.node_id}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {node.node_name}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-medium">{node.alert_level}</span>
                  <span className="text-xs text-muted-foreground">
                    {node.region}
                  </span>
                </div>

                {/* Tooltip */}
                {hoveredNode === node.node_id && (
                  <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg bg-popover border border-border shadow-xl">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Node:</span>
                        <span className="font-medium">{node.node_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={cn(
                          "font-medium",
                          node.alert_level === "ATTACK" && "text-red-500",
                          node.alert_level === "HIGH_RISK" && "text-orange-500",
                          node.alert_level === "SUSPICIOUS" && "text-yellow-500",
                          node.alert_level === "CLEAN" && "text-green-500"
                        )}>
                          {node.alert_level}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Severity:</span>
                        <span className="font-medium">{node.severity_score}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time:</span>
                        <span className="font-medium">{formatTimestamp(node.timestamp)}</span>
                      </div>
                      {node.primary_reason && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {node.primary_reason}
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Tooltip arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-popover" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Legend */}
      {nodes.length > 0 && (
        <div className="sm:hidden p-4 border-t border-border bg-muted/20">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="text-muted-foreground">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Attack</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>High Risk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span>Suspicious</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span>Clean</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
