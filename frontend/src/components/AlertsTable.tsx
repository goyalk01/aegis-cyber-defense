"use client";

import { useState, useMemo } from "react";
import { Alert } from "@/types";
import { cn, formatTimestamp, getAlertLevelColor, getAlertDotColor } from "@/lib/utils";
import { AlertTriangle, Filter, ChevronDown, List } from "lucide-react";

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
  const [limit, setLimit] = useState(50);

  // Filter alerts locally
  const filteredAlerts = useMemo(() => {
    let result = alerts;

    // Apply level filter
    if (filter) {
      result = result.filter((alert) => alert.alert_level === filter);
    }

    // Apply limit
    return result.slice(0, limit);
  }, [alerts, filter, limit]);

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
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertTriangle className="w-5 h-5" />
          <p className="font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <List className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Alert Log</h3>
          <span className="text-sm text-muted-foreground">
            ({filteredAlerts.length} of {alerts.length})
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Level Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setShowFilterDropdown(!showFilterDropdown);
                setShowLimitDropdown(false);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border text-sm hover:bg-accent transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>{filter || "ALL"}</span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                showFilterDropdown && "rotate-180"
              )} />
            </button>
            {showFilterDropdown && (
              <div className="absolute top-full mt-1 right-0 w-40 rounded-lg border border-border bg-card shadow-lg z-10 overflow-hidden">
                {ALERT_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => handleFilterChange(level)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2",
                      (filter === level || (!filter && level === "ALL")) &&
                        "bg-accent"
                    )}
                  >
                    {level !== "ALL" && (
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        getAlertDotColor(level)
                      )} />
                    )}
                    {level}
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border text-sm hover:bg-accent transition-colors"
            >
              <span>Show {limit}</span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                showLimitDropdown && "rotate-180"
              )} />
            </button>
            {showLimitDropdown && (
              <div className="absolute top-full mt-1 right-0 w-28 rounded-lg border border-border bg-card shadow-lg z-10 overflow-hidden">
                {LIMITS.map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLimitChange(l)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                      limit === l && "bg-accent"
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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Node
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Level
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Severity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                Reason
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                Region
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      <div className="h-4 w-20 bg-muted rounded" />
                      <div className="h-3 w-24 bg-muted rounded" />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-6 w-20 bg-muted rounded-full" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-12 bg-muted rounded-full" />
                      <div className="h-4 w-6 bg-muted rounded" />
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <div className="h-4 w-40 bg-muted rounded" />
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <div className="h-4 w-16 bg-muted rounded" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-24 bg-muted rounded" />
                  </td>
                </tr>
              ))
            ) : filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No data available</p>
                </td>
              </tr>
            ) : (
              filteredAlerts.map((alert, index) => (
                <tr
                  key={alert.log_id}
                  className={cn(
                    "hover:bg-muted/30 transition-colors",
                    index === 0 && "animate-in fade-in duration-300"
                  )}
                >
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-foreground text-sm">
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
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                        getAlertLevelColor(alert.alert_level)
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          getAlertDotColor(alert.alert_level)
                        )}
                      />
                      {alert.alert_level}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            alert.severity_score >= 80
                              ? "bg-red-500"
                              : alert.severity_score >= 50
                              ? "bg-orange-500"
                              : alert.severity_score >= 25
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          )}
                          style={{ width: `${alert.severity_score}%` }}
                        />
                      </div>
                      <span className="text-sm text-foreground font-medium">
                        {alert.severity_score}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <p className="text-sm text-muted-foreground truncate max-w-xs" title={alert.primary_reason || ""}>
                      {alert.primary_reason || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <span className="text-sm text-foreground">
                      {alert.region}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-muted-foreground">
                      {formatTimestamp(alert.timestamp)}
                    </span>
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
