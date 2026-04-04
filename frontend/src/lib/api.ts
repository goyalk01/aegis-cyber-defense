import {
  Alert,
  AlertsResponse,
  Metrics,
  Summary,
  GraphData,
  GraphNode,
  GraphLink,
  FingerprintData,
  FingerprintCluster,
  CommandNodeResult,
  CommandNodeCandidate,
} from "@/types";
import { validateAlertLevel, safeNumber, safePercentage, safePositiveInt } from "./utils";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : undefined);

interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
  timestamp: string;
  version: string;
  request_id: string;
  processing_time_ms: number;
  message?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  if (!BASE_URL) {
    console.error("[API] NEXT_PUBLIC_API_URL is not defined");
    throw new Error("NEXT_PUBLIC_API_URL is not defined");
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  let json: ApiResponse<T> | null = null;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`[API] ${endpoint} returned non-JSON response (HTTP ${res.status})`);
  }

  // Debug logging to trace contract shape in browser devtools.
  console.log(`[API] RESPONSE ${endpoint}:`, json);

  if (!res.ok) {
    throw new Error(json.message || `[API] ${endpoint} failed with HTTP ${res.status}`);
  }

  if (json.status === "error") {
    console.error(`[API] Error on ${endpoint}:`, json.message);
    throw new Error(json.message || "API request failed");
  }

  return json.data;
}

// ── Data Sanitizers ───────────────────────────────────────────────────────────

function sanitizeAlert(alert: Record<string, unknown>): Alert {
  const sourceData = (alert.source_data || {}) as Record<string, unknown>;
  return {
    log_id: String(alert.log_id || ""),
    node_id: String(alert.node_id || ""),
    node_name: String(alert.node_name || "Unknown"),
    region: String(alert.region || "Unknown"),
    timestamp: String(alert.timestamp || ""),
    ingestion_time: String(alert.ingestion_time || ""),
    alert_level: validateAlertLevel(alert.alert_level),
    severity_score: safePercentage(alert.severity_score, 0),
    confidence_score: safePercentage(alert.confidence_score, 0),
    is_anomaly: Boolean(alert.is_anomaly),
    primary_reason: alert.primary_reason ? String(alert.primary_reason) : null,
    reasons: Array.isArray(alert.reasons) ? alert.reasons.map(String) : [],
    rule_ids: Array.isArray(alert.rule_ids) ? alert.rule_ids.map(String) : [],
    source_data: {
      reported_status: String(sourceData.reported_status || ""),
      http_status: safeNumber(sourceData.http_status, -1),
      response_time_ms: safeNumber(sourceData.response_time_ms, -1),
      hardware_id_b64: sourceData.hardware_id_b64 ? String(sourceData.hardware_id_b64) : null,
      hardware_id_valid: Boolean(sourceData.hardware_id_valid),
      hardware_id_decoded: sourceData.hardware_id_decoded ? String(sourceData.hardware_id_decoded) : null,
      schema_version: safePositiveInt(sourceData.schema_version, 1),
      schema_known: Boolean(sourceData.schema_known ?? true),
    },
    parse_warnings: Array.isArray(alert.parse_warnings) ? alert.parse_warnings.map(String) : [],
  };
}

function sanitizeMetrics(data: Record<string, unknown>): Metrics {
  return {
    total_logs: safePositiveInt(data.total_logs, 0),
    total_alerts: safePositiveInt(data.total_alerts, 0),
    attack_count: safePositiveInt(data.attack_count, 0),
    high_risk_count: safePositiveInt(data.high_risk_count, 0),
    suspicious_count: safePositiveInt(data.suspicious_count, 0),
    clean_count: safePositiveInt(data.clean_count, 0),
    attack_percentage: safePercentage(data.attack_percentage, 0),
    high_risk_percentage: safePercentage(data.high_risk_percentage, 0),
    suspicious_percentage: safePercentage(data.suspicious_percentage, 0),
    threat_percentage: safePercentage(data.threat_percentage, 0),
    total_nodes: safePositiveInt(data.total_nodes, 0),
    invalid_hw_count: safePositiveInt(data.invalid_hw_count, 0),
    avg_response_time_ms: safeNumber(data.avg_response_time_ms, 0),
    nodes_under_attack: Array.isArray(data.nodes_under_attack)
      ? data.nodes_under_attack.map(String)
      : [],
    schema_versions_seen: Array.isArray(data.schema_versions_seen)
      ? data.schema_versions_seen.map((v) => safePositiveInt(v, 0))
      : [],
    ml_detection_count: safePositiveInt(data.ml_detection_count, 0),
  };
}

function sanitizeSummary(data: Record<string, unknown>): Summary {
  const metrics = (data.metrics || {}) as Record<string, unknown>;
  const criticalAlerts = (data.critical_alerts || {}) as Record<string, unknown>;
  const alertsList = Array.isArray(criticalAlerts.alerts) ? criticalAlerts.alerts : [];

  return {
    metrics: {
      total_logs: safePositiveInt(metrics.total_logs, 0),
      total_alerts: safePositiveInt(metrics.total_alerts, 0),
      attack_count: safePositiveInt(metrics.attack_count, 0),
      high_risk_count: safePositiveInt(metrics.high_risk_count, 0),
      suspicious_count: safePositiveInt(metrics.suspicious_count, 0),
      clean_count: safePositiveInt(metrics.clean_count, 0),
      attack_percentage: safePercentage(metrics.attack_percentage, 0),
      threat_percentage: safePercentage(metrics.threat_percentage, 0),
      total_nodes: safePositiveInt(metrics.total_nodes, 0),
    },
    critical_alerts: {
      count: safePositiveInt(criticalAlerts.count, 0),
      alerts: alertsList.map((a) => sanitizeAlert(a as Record<string, unknown>)),
    },
    nodes_under_attack: Array.isArray(data.nodes_under_attack)
      ? data.nodes_under_attack.map(String)
      : [],
  };
}

// ── API Functions ─────────────────────────────────────────────────────────────

export interface FetchAlertsParams {
  level?: string;
  region?: string;
  node_id?: string;
  limit?: number;
}

export async function fetchAlerts(
  params?: FetchAlertsParams,
  signal?: AbortSignal
): Promise<AlertsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.level) searchParams.set("level", params.level);
  if (params?.region) searchParams.set("region", params.region);
  if (params?.node_id) searchParams.set("node_id", params.node_id);
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const query = searchParams.toString();
  const endpoint = `/alerts${query ? `?${query}` : ""}`;

  const data = await fetchApi<{ total: number; limit: number; alerts: unknown[] }>(endpoint, { signal });

  return {
    total: safePositiveInt(data.total, 0),
    limit: safePositiveInt(data.limit, 50),
    alerts: Array.isArray(data.alerts)
      ? data.alerts.map((a) => sanitizeAlert(a as Record<string, unknown>))
      : [],
  };
}

export async function fetchMetrics(signal?: AbortSignal): Promise<Metrics> {
  const data = await fetchApi<Record<string, unknown>>("/metrics", { signal });
  return sanitizeMetrics(data);
}

export async function fetchSummary(signal?: AbortSignal): Promise<Summary> {
  const data = await fetchApi<Record<string, unknown>>("/summary", { signal });
  return sanitizeSummary(data);
}

export interface PipelineResult {
  message: string;
  alerts_generated: number;
  logs_processed: number;
  attack_count: number;
  high_risk_count: number;
  suspicious_count: number;
  clean_count: number;
  attack_percentage: number;
}

export async function runPipeline(): Promise<PipelineResult> {
  const data = await fetchApi<Record<string, unknown>>("/run-pipeline", {
    method: "POST",
  });

  return {
    message: String(data.message || "Pipeline completed"),
    alerts_generated: safePositiveInt(data.alerts_generated, 0),
    logs_processed: safePositiveInt(data.logs_processed, 0),
    attack_count: safePositiveInt(data.attack_count, 0),
    high_risk_count: safePositiveInt(data.high_risk_count, 0),
    suspicious_count: safePositiveInt(data.suspicious_count, 0),
    clean_count: safePositiveInt(data.clean_count, 0),
    attack_percentage: safePercentage(data.attack_percentage, 0),
  };
}

export async function checkHealth(): Promise<{ service: string }> {
  return fetchApi<{ service: string }>("/health");
}

function sanitizeGraphNode(node: Record<string, unknown>): GraphNode {
  const level = validateAlertLevel(node.node_type);
  return {
    id: String(node.id || node.node_id || ""),
    node_id: String(node.node_id || node.id || ""),
    out_degree: safePositiveInt(node.out_degree, 0),
    centrality: safeNumber(node.centrality, 0),
    severity_score: safePercentage(node.severity_score, 0),
    node_type: level,
    fingerprint_id: node.fingerprint_id ? String(node.fingerprint_id) : null,
  };
}

function sanitizeGraphLink(link: Record<string, unknown>): GraphLink {
  return {
    source: String(link.source || ""),
    target: String(link.target || ""),
    count: safePositiveInt(link.count, 1),
    weight: safePositiveInt(link.weight, safePositiveInt(link.count, 1)),
    interval: safeNumber(link.interval, -1),
    user_agent: String(link.user_agent || "UNKNOWN-UA"),
    headers: Array.isArray(link.headers) ? link.headers.map(String) : [],
    avg_response_time_ms: safeNumber(link.avg_response_time_ms, 0),
  };
}

function sanitizeFingerprintCluster(item: Record<string, unknown>): FingerprintCluster {
  return {
    fingerprint_id: String(item.fingerprint_id || ""),
    fingerprint_key: String(item.fingerprint_key || ""),
    occurrences: safePositiveInt(item.occurrences, 0),
    nodes: Array.isArray(item.nodes) ? item.nodes.map(String) : [],
    headers: Array.isArray(item.headers) ? item.headers.map(String) : [],
    user_agent: String(item.user_agent || "UNKNOWN-UA"),
    interval_bucket: String(item.interval_bucket || "unknown"),
    confidence: safePercentage(item.confidence, 0),
  };
}

function sanitizeCommandNodeCandidate(item: Record<string, unknown>): CommandNodeCandidate {
  return {
    node_id: String(item.node_id || ""),
    score: safeNumber(item.score, 0),
    out_degree: safePositiveInt(item.out_degree, 0),
    fingerprint_matches: safePositiveInt(item.fingerprint_matches, 0),
    centrality: safeNumber(item.centrality, 0),
    reasons: Array.isArray(item.reasons) ? item.reasons.map(String) : [],
  };
}

export async function fetchGraph(signal?: AbortSignal): Promise<GraphData> {
  const data = await fetchApi<Record<string, unknown>>("/graph", { signal });
  const nodes = Array.isArray(data.nodes)
    ? data.nodes.map((n) => sanitizeGraphNode(n as Record<string, unknown>))
    : [];
  const links = Array.isArray(data.links)
    ? data.links.map((l) => sanitizeGraphLink(l as Record<string, unknown>))
    : [];
  const edgeData = Array.isArray(data.edge_data)
    ? data.edge_data.map((l) => sanitizeGraphLink(l as Record<string, unknown>))
    : links;

  const graph = (data.graph || {}) as Record<string, unknown>;
  const centrality = (data.centrality || {}) as Record<string, unknown>;
  const graphSummary = (data.graph_summary || {}) as Record<string, unknown>;

  return {
    generated_at: String(data.generated_at || ""),
    total_nodes: safePositiveInt(data.total_nodes, nodes.length),
    total_edges: safePositiveInt(data.total_edges, links.length),
    graph_summary: {
      total_nodes: safePositiveInt(graphSummary.total_nodes, safePositiveInt(data.total_nodes, nodes.length)),
      total_edges: safePositiveInt(graphSummary.total_edges, safePositiveInt(data.total_edges, links.length)),
    },
    graph: Object.fromEntries(
      Object.entries(graph).map(([key, value]) => [
        String(key),
        Array.isArray(value) ? value.map(String) : [],
      ])
    ),
    edge_data: edgeData,
    centrality: Object.fromEntries(
      Object.entries(centrality).map(([key, value]) => [String(key), safeNumber(value, 0)])
    ),
    nodes,
    links,
  };
}

export async function fetchFingerprints(signal?: AbortSignal): Promise<FingerprintData> {
  const data = await fetchApi<Record<string, unknown>>("/fingerprints", { signal });
  const fps = Array.isArray(data.fingerprints)
    ? data.fingerprints.map((f) => sanitizeFingerprintCluster(f as Record<string, unknown>))
    : [];

  const counts = (data.node_fingerprint_counts || {}) as Record<string, unknown>;

  return {
    generated_at: String(data.generated_at || ""),
    total_fingerprints: safePositiveInt(data.total_fingerprints, fps.length),
    fingerprints: fps,
    node_fingerprint_counts: Object.fromEntries(
      Object.entries(counts).map(([key, value]) => [String(key), safePositiveInt(value, 0)])
    ),
  };
}

export async function fetchCommandNode(signal?: AbortSignal): Promise<CommandNodeResult> {
  const data = await fetchApi<Record<string, unknown>>("/command-node", { signal });
  return {
    generated_at: String(data.generated_at || ""),
    command_node: data.command_node ? String(data.command_node) : null,
    confidence_score: safePercentage(data.confidence_score, 0),
    reasons: Array.isArray(data.reasons) ? data.reasons.map(String) : [],
    candidates: Array.isArray(data.candidates)
      ? data.candidates.map((c) => sanitizeCommandNodeCandidate(c as Record<string, unknown>))
      : [],
    top_candidates: Array.isArray(data.top_candidates)
      ? data.top_candidates.map((t) => ({
          node: String((t as Record<string, unknown>).node || ""),
          score: safeNumber((t as Record<string, unknown>).score, 0),
        }))
      : [],
  };
}
