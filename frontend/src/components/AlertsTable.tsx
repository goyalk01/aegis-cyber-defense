"use client";

import { useState, useMemo } from "react";
import { Alert } from "@/types";
import { cn, formatTimestamp, getAlertLevelColor, getAlertDotColor } from "@/lib/utils";
import { AlertTriangle, Filter, ChevronDown, List, Search, Clock } from "lucide-react";

interface AlertsTableProps {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
}

const ALERT_LEVELS = ["ALL", "ATTACK", "HIGH_RISK", "SUSPICIOUS", "CLEAN"];
const LIMITS = [10, 25, 50, 100];

export function AlertsTable({ alerts, loading, error }: AlertsTableProps) {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showLimitDropdown, setShowLimitDropdown] = useState(false);
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(10);

  const filteredAlerts = useMemo(() => {
    const safeAlerts = Array.isArray(alerts) ? alerts : [];
    let result = safeAlerts;

    if (filter) {
      result = result.filter((alert) => alert?.alert_level === filter);
    }

    return result.slice(0, limit);
  }, [alerts, filter, limit]);

  const totalAlerts = Array.isArray(alerts) ? alerts.length : 0;

  const handleFilterChange = (level: string) => {
    setFilter(level === "ALL" ? "" : level);
    setShowFilterDropdown(false);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setShowLimitDropdown(false);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <p className="font-semibold">Error Loading Alerts</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <List className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Alert Log</h3>
              <p className="text-xs text-muted-foreground">
                {filteredAlerts.length} of {totalAlerts.toLocaleString()} alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Level Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowFilterDropdown(!showFilterDropdown);
                  setShowLimitDropdown(false);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200",
                  "bg-muted/50 border border-border/50 hover:bg-muted hover:border-primary/30",
                  showFilterDropdown && "border-primary/50 bg-primary/5"
                )}
              >
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{filter || "ALL"}</span>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                  showFilterDropdown && "rotate-180"
                )} />
              </button>
              {showFilterDropdown && (
                <div className="absolute top-full mt-2 right-0 w-44 rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-xl z-20 overflow-hidden animate-scale-in">
                  {ALERT_LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => handleFilterChange(level)}
                      className={cn(
                        "w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2",
                        "hover:bg-muted/50",
                        (filter === level || (!filter && level === "ALL")) && "bg-primary/10 text-primary"
                      )}
                    >
                      {level !== "ALL" && (
                        <span className={cn("w-2 h-2 rounded-full", getAlertDotColor(level))} />
                      )}
                      <span className="font-medium">{level}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Limit Control */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowLimitDropdown(!showLimitDropdown);
                  setShowFilterDropdown(false);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200",
                  "bg-muted/50 border border-border/50 hover:bg-muted hover:border-primary/30",
                  showLimitDropdown && "border-primary/50 bg-primary/5"
                )}
              >
                <span className="font-medium">Show {limit}</span>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                  showLimitDropdown && "rotate-180"
                )} />
              </button>
              {showLimitDropdown && (
                <div className="absolute top-full mt-2 right-0 w-28 rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-xl z-20 overflow-hidden animate-scale-in">
                  {LIMITS.map((l) => (
                    <button
                      key={l}
                      onClick={() => handleLimitChange(l)}
                      className={cn(
                        "w-full px-4 py-2.5 text-left text-sm font-medium transition-colors",
                        "hover:bg-muted/50",
                        limit === l && "bg-primary/10 text-primary"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Node
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Level
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Severity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                Reason
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                Region
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      <div className="h-4 w-20 shimmer rounded-lg" />
                      <div className="h-3 w-24 shimmer rounded-lg" />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-6 w-20 shimmer rounded-full" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-12 shimmer rounded-full" />
                      <div className="h-4 w-6 shimmer rounded-lg" />
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <div className="h-4 w-40 shimmer rounded-lg" />
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <div className="h-4 w-16 shimmer rounded-lg" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-24 shimmer rounded-lg" />
                  </td>
                </tr>
              ))
            ) : filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground font-medium">No alerts found</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    {filter ? `No ${filter} alerts in the current dataset` : "No data available"}
                  </p>
                </td>
              </tr>
            ) : (
              filteredAlerts.map((alert, index) => (
                <tr
                  key={alert.log_id}
                  className={cn(
                    "group transition-colors duration-200",
                    "hover:bg-muted/30",
                    index === 0 && "fade-in"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                        {alert.node_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {alert.node_name}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                        "transition-all duration-200 group-hover:shadow-sm",
                        getAlertLevelColor(alert.alert_level)
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          getAlertDotColor(alert.alert_level),
                          alert.alert_level === "ATTACK" && "animate-pulse"
                        )}
                      />
                      {alert.alert_level}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500 progress-animated",
                            (alert.severity_score ?? 0) >= 80 && "bg-gradient-to-r from-red-500 to-red-400",
                            (alert.severity_score ?? 0) >= 50 && (alert.severity_score ?? 0) < 80 && "bg-gradient-to-r from-orange-500 to-orange-400",
                            (alert.severity_score ?? 0) >= 25 && (alert.severity_score ?? 0) < 50 && "bg-gradient-to-r from-yellow-500 to-yellow-400",
                            (alert.severity_score ?? 0) < 25 && "bg-gradient-to-r from-green-500 to-green-400"
                          )}
                          style={{ width: `${alert.severity_score ?? 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-foreground font-semibold tabular-nums">
                        {alert.severity_score ?? 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <p className="text-sm text-muted-foreground truncate max-w-xs" title={alert.primary_reason || ""}>
                      {alert.primary_reason || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <span className="text-sm text-foreground font-medium">
                      {alert.region}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="font-mono text-xs">
                        {formatTimestamp(alert.timestamp)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
