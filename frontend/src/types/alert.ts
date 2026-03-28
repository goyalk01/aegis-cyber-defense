export interface Alert {
  log_id: string;
  node_id: string;
  node_name: string;
  region: string;
  timestamp: string;
  ingestion_time: string;
  alert_level: "ATTACK" | "HIGH_RISK" | "SUSPICIOUS" | "CLEAN";
  severity_score: number;
  confidence_score: number;
  is_anomaly: boolean;
  primary_reason: string | null;
  reasons: string[];
  rule_ids: string[];
  source_data: {
    reported_status: string;
    http_status: number;
    response_time_ms: number;
    hardware_id_b64: string | null;
    hardware_id_valid: boolean;
    hardware_id_decoded: string | null;
    schema_version: number;
    schema_known: boolean;
  };
  parse_warnings: string[];
}

export interface AlertsResponse {
  total: number;
  limit: number;
  alerts: Alert[];
}
