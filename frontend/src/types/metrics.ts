export interface Metrics {
  total_logs: number;
  total_alerts: number;
  attack_count: number;
  high_risk_count: number;
  suspicious_count: number;
  clean_count: number;
  attack_percentage: number;
  high_risk_percentage: number;
  threat_percentage: number;
  total_nodes: number;
  invalid_hw_count: number;
  avg_response_time_ms: number;
  nodes_under_attack: string[];
  schema_versions_seen: number[];
}
