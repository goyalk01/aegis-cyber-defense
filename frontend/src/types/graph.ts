export type GraphNodeType = "ATTACK" | "HIGH_RISK" | "SUSPICIOUS" | "CLEAN" | "COMMAND_NODE";

export interface GraphNode {
  id: string;
  node_id: string;
  out_degree: number;
  centrality: number;
  severity_score: number;
  node_type: GraphNodeType;
  fingerprint_id?: string | null;
}

export interface GraphLink {
  source: string;
  target: string;
  count: number;
  weight?: number;
  interval: number;
  user_agent: string;
  headers: string[];
  avg_response_time_ms: number;
}

export interface GraphData {
  generated_at: string;
  total_nodes: number;
  total_edges: number;
  graph_summary?: {
    total_nodes: number;
    total_edges: number;
  };
  graph: Record<string, string[]>;
  edge_data: GraphLink[];
  centrality: Record<string, number>;
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface FingerprintCluster {
  fingerprint_id: string;
  fingerprint_key: string;
  occurrences: number;
  nodes: string[];
  headers: string[];
  user_agent: string;
  interval_bucket: string;
  confidence: number;
}

export interface FingerprintData {
  generated_at: string;
  total_fingerprints: number;
  fingerprints: FingerprintCluster[];
  node_fingerprint_counts: Record<string, number>;
}

export interface CommandNodeCandidate {
  node_id: string;
  score: number;
  out_degree: number;
  fingerprint_matches: number;
  centrality: number;
  reasons: string[];
}

export interface CommandNodeResult {
  generated_at: string;
  command_node: string | null;
  confidence_score: number;
  reasons: string[];
  candidates: CommandNodeCandidate[];
  top_candidates?: Array<{ node: string; score: number }>;
}
