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
  Zap,
  Brain,
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
  variant?: "default" | "danger" | "warning" | "success" | "info";
  delay?: number;
}

function Card({ title, value, subtitle, icon, variant = "default", delay = 0 }: CardProps) {
  const variantStyles = {
    default: {
      border: "border-border/50 hover:border-primary/50",
      glow: "",
      iconBg: "bg-primary/10 text-primary",
      gradient: "from-primary/5 to-transparent",
    },
    danger: {
      border: "border-red-500/30 hover:border-red-500/50",
      glow: "hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]",
      iconBg: "bg-red-500/10 text-red-500",
      gradient: "from-red-500/10 to-transparent",
    },
    warning: {
      border: "border-orange-500/30 hover:border-orange-500/50",
      glow: "hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]",
      iconBg: "bg-orange-500/10 text-orange-500",
      gradient: "from-orange-500/10 to-transparent",
    },
    success: {
      border: "border-green-500/30 hover:border-green-500/50",
      glow: "hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]",
      iconBg: "bg-green-500/10 text-green-500",
      gradient: "from-green-500/10 to-transparent",
    },
    info: {
      border: "border-blue-500/30 hover:border-blue-500/50",
      glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
      iconBg: "bg-blue-500/10 text-blue-500",
      gradient: "from-blue-500/10 to-transparent",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "relative p-5 rounded-2xl border bg-card/80 backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-xl",
        "group overflow-hidden",
        styles.border,
        styles.glow
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Gradient overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        styles.gradient
      )} />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium tracking-wide">
            {title}
          </p>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl transition-transform duration-300 group-hover:scale-110",
          styles.iconBg
        )}>
          {icon}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        variant === "danger" && "bg-gradient-to-r from-red-500 to-red-400",
        variant === "warning" && "bg-gradient-to-r from-orange-500 to-orange-400",
        variant === "success" && "bg-gradient-to-r from-green-500 to-green-400",
        variant === "info" && "bg-gradient-to-r from-blue-500 to-blue-400",
        variant === "default" && "bg-gradient-to-r from-primary to-primary/70"
      )} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="h-4 w-20 shimmer rounded-lg" />
              <div className="h-8 w-16 shimmer rounded-lg" />
              <div className="h-3 w-24 shimmer rounded-lg" />
            </div>
            <div className="h-12 w-12 shimmer rounded-xl" />
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
      <div className="p-6 rounded-2xl border border-red-500/30 bg-red-500/5 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-red-500">
          <AlertTriangle className="w-6 h-6" />
          <div>
            <p className="font-semibold">Error Loading Metrics</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm text-center">
        <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground font-medium">No metrics available</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Waiting for data...</p>
      </div>
    );
  }

  const totalLogs = metrics.total_logs ?? 0;
  const attackCount = metrics.attack_count ?? 0;
  const attackPercentage = metrics.attack_percentage ?? 0;
  const highRiskCount = metrics.high_risk_count ?? 0;
  const suspiciousCount = metrics.suspicious_count ?? 0;
  const cleanCount = metrics.clean_count ?? 0;
  const threatPercentage = metrics.threat_percentage ?? 0;
  const mlDetectionCount = metrics.ml_detection_count ?? 0;
  const mlPercentage = totalLogs > 0 ? ((mlDetectionCount / totalLogs) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 stagger-children">
      <Card
        title="Total Logs"
        value={totalLogs}
        subtitle="Processed entries"
        icon={<FileText className="w-5 h-5" />}
        delay={0}
      />
      <Card
        title="Attacks"
        value={attackCount}
        subtitle={`${attackPercentage.toFixed(1)}% of total`}
        icon={<ShieldAlert className="w-5 h-5" />}
        variant="danger"
        delay={50}
      />
      <Card
        title="High Risk"
        value={highRiskCount}
        subtitle="Elevated threats"
        icon={<AlertTriangle className="w-5 h-5" />}
        variant="warning"
        delay={100}
      />
      <Card
        title="Suspicious"
        value={suspiciousCount}
        subtitle="Under monitoring"
        icon={<Activity className="w-5 h-5" />}
        variant="info"
        delay={150}
      />
      <Card
        title="Clean"
        value={cleanCount}
        subtitle="Normal operations"
        icon={<Server className="w-5 h-5" />}
        variant="success"
        delay={200}
      />
      <Card
        title="ML Detections"
        value={mlDetectionCount}
        subtitle={`${mlPercentage}% AI-flagged`}
        icon={<Brain className="w-5 h-5" />}
        variant={mlDetectionCount > 0 ? "info" : "default"}
        delay={250}
      />
      <Card
        title="Threat Rate"
        value={`${threatPercentage.toFixed(1)}%`}
        subtitle="Attack + High Risk"
        icon={<TrendingUp className="w-5 h-5" />}
        variant={threatPercentage > 30 ? "danger" : threatPercentage > 10 ? "warning" : "default"}
        delay={300}
      />
    </div>
  );
}
