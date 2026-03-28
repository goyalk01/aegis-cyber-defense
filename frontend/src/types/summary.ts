import { Alert } from "./alert";

export interface SummaryMetrics {
  total_logs: number;
  total_alerts: number;
  attack_count: number;
  high_risk_count: number;
  suspicious_count: number;
  clean_count: number;
  attack_percentage: number;
  threat_percentage: number;
  total_nodes: number;
}

export interface CriticalAlerts {
  count: number;
  alerts: Alert[];
}

export interface Summary {
  metrics: SummaryMetrics;
  critical_alerts: CriticalAlerts;
  nodes_under_attack: string[];
}
