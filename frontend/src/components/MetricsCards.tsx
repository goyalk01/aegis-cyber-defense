"use client";

import { Metrics } from "@/types";
import { cn } from "@/lib/utils";
import {
  FileText,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  Activity,
  Server,
} from "lucide-react";

interface MetricsCardsProps {
  metrics: Metrics | null;
  loading: boolean;
  error: string | null;
}

interface CardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: "default" | "danger" | "warning" | "success";
}

function Card({ title, value, subtitle, icon, variant = "default" }: CardProps) {
  const variantClasses = {
    default: "border-border",
    danger: "border-red-500/30 bg-red-500/5",
    warning: "border-orange-500/30 bg-orange-500/5",
    success: "border-green-500/30 bg-green-500/5",
  };

  const iconClasses = {
    default: "text-primary bg-primary/10",
    danger: "text-red-500 bg-red-500/10",
    warning: "text-orange-500 bg-orange-500/10",
    success: "text-green-500 bg-green-500/10",
  };

  return (
    <div
      className={cn(
        "p-5 rounded-xl border bg-card shadow-sm transition-all hover:shadow-md",
        variantClasses[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1 text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-lg", iconClasses[variant])}>{icon}</div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-xl border border-border bg-card animate-pulse"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-8 w-16 bg-muted rounded" />
            </div>
            <div className="h-12 w-12 bg-muted rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MetricsCards({ metrics, loading, error }: MetricsCardsProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/5 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-500 font-medium">{error}</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 rounded-xl border border-border bg-card text-center">
        <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">No metrics available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <Card
        title="Total Logs"
        value={metrics.total_logs}
        subtitle="Processed entries"
        icon={<FileText className="w-5 h-5" />}
      />
      <Card
        title="Attacks"
        value={metrics.attack_count}
        subtitle={`${metrics.attack_percentage.toFixed(1)}% of total`}
        icon={<ShieldAlert className="w-5 h-5" />}
        variant="danger"
      />
      <Card
        title="High Risk"
        value={metrics.high_risk_count}
        subtitle="Elevated threats"
        icon={<AlertTriangle className="w-5 h-5" />}
        variant="warning"
      />
      <Card
        title="Suspicious"
        value={metrics.suspicious_count}
        subtitle="Under monitoring"
        icon={<Activity className="w-5 h-5" />}
      />
      <Card
        title="Clean"
        value={metrics.clean_count}
        subtitle="Normal operations"
        icon={<Server className="w-5 h-5" />}
        variant="success"
      />
      <Card
        title="Threat Rate"
        value={`${metrics.threat_percentage.toFixed(1)}%`}
        subtitle="Attack + High Risk"
        icon={<TrendingUp className="w-5 h-5" />}
        variant={metrics.threat_percentage > 30 ? "danger" : "default"}
      />
    </div>
  );
}
