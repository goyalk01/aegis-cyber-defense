"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { AlertTriangle, Network } from "lucide-react";
import { CommandNodeResult, FingerprintData, GraphData } from "@/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as unknown as React.ComponentType<Record<string, unknown>>;

interface NetworkGraphProps {
  graph: GraphData | null;
  fingerprints: FingerprintData | null;
  commandNode: CommandNodeResult | null;
  loading: boolean;
  error: string | null;
  demoPhase?: "graph" | "suspicious" | "command" | "insights";
}

const NODE_COLORS: Record<string, string> = {
  CLEAN: "#22c55e",
  SUSPICIOUS: "#eab308",
  HIGH_RISK: "#f97316",
  ATTACK: "#ef4444",
  COMMAND_NODE: "#f43f5e",
};

export function NetworkGraph({
  graph,
  fingerprints,
  commandNode,
  loading,
  error,
  demoPhase = "graph",
}: NetworkGraphProps) {
  const fingerprintByNode = useMemo(() => {
    const index: Record<string, string> = {};
    if (!fingerprints) return index;

    for (const fp of fingerprints.fingerprints) {
      for (const nodeId of fp.nodes) {
        if (!index[nodeId]) {
          index[nodeId] = fp.fingerprint_id;
        }
      }
    }
    return index;
  }, [fingerprints]);

  const graphData = useMemo(() => {
    if (!graph) return { nodes: [], links: [] };

    const command = commandNode?.command_node;

    const requestCountByNode: Record<string, number> = {};
    for (const link of graph.links) {
      requestCountByNode[link.source] = (requestCountByNode[link.source] || 0) + (link.count || 0);
    }

    const nodes = graph.nodes.map((n) => {
      const isCommand = command && n.node_id === command;
      const shouldMuteSuspicious = demoPhase === "graph";
      const stageType = isCommand
        ? "COMMAND_NODE"
        : shouldMuteSuspicious && n.node_type !== "CLEAN"
          ? "CLEAN"
          : n.node_type;
      return {
        id: n.node_id,
        node_id: n.node_id,
        severity_score: n.severity_score,
        node_type: stageType,
        fingerprint_id: fingerprintByNode[n.node_id] || "N/A",
        request_count: requestCountByNode[n.node_id] || 0,
      };
    });

    const links = graph.links.map((l) => ({
      source: l.source,
      target: l.target,
      count: l.count,
      weight: l.weight || l.count,
    }));

    return { nodes, links };
  }, [graph, fingerprintByNode, commandNode]);

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

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="h-[420px] rounded-lg bg-muted" />
      </div>
    );
  }

  if (!graph || graphData.nodes.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Network className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Attribution Network Graph</h3>
          <p className="text-xs text-muted-foreground">
            Drag nodes, zoom to inspect clusters, hover for fingerprints
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Nodes: {graph.total_nodes} | Edges: {graph.total_edges}
        </div>
      </div>

      <div className="h-[460px] bg-gradient-to-b from-background to-muted/30">
        <ForceGraph2D
          graphData={graphData}
          cooldownTicks={120}
          linkColor={(linkObj: Record<string, unknown>) => {
            const src = String(linkObj.source && typeof linkObj.source === "object" ? (linkObj.source as Record<string, unknown>).id : linkObj.source || "");
            if (demoPhase !== "graph" && commandNode?.command_node && src === commandNode.command_node) {
              return "rgba(244, 63, 94, 0.65)";
            }
            return "rgba(100, 116, 139, 0.35)";
          }}
          linkWidth={(linkObj: Record<string, unknown>) => {
            const w = Number(linkObj.weight || linkObj.count || 1);
            return Math.max(0.8, Math.min(6, 0.6 + w / 4));
          }}
          linkDirectionalParticles={(linkObj: Record<string, unknown>) => {
            const w = Number(linkObj.weight || linkObj.count || 1);
            return Math.max(0, Math.min(5, Math.floor(w / 3)));
          }}
          linkDirectionalParticleWidth={1.8}
          linkDirectionalParticleSpeed={0.005}
          nodeRelSize={6}
          nodeCanvasObject={(nodeObj: Record<string, unknown>, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const nodeId = String(nodeObj.node_id || nodeObj.id || "");
            const nodeType = String(nodeObj.node_type || "CLEAN");
            const severity = Number(nodeObj.severity_score || 0);

            const color = NODE_COLORS[nodeType] || NODE_COLORS.CLEAN;
            const radius = 3 + Math.min(6, severity / 20);
            const pulse = 1 + (Math.sin(Date.now() / 220) + 1) * 0.2;

            if (nodeType === "COMMAND_NODE") {
              ctx.beginPath();
              ctx.arc(Number(nodeObj.x), Number(nodeObj.y), (radius + 5) * pulse, 0, 2 * Math.PI, false);
              ctx.fillStyle = "rgba(244, 63, 94, 0.18)";
              ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(Number(nodeObj.x), Number(nodeObj.y), radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.fill();

            const fontSize = Math.max(8, 11 / globalScale);
            ctx.font = `${fontSize}px sans-serif`;
            ctx.fillStyle = "#0f172a";
            ctx.textAlign = "center";
            ctx.fillText(nodeId, Number(nodeObj.x), Number(nodeObj.y) - radius - 4);
          }}
          nodeLabel={(nodeObj: Record<string, unknown>) => {
            return `Node: ${String(nodeObj.node_id || nodeObj.id || "")}<br/>Severity: ${String(nodeObj.severity_score || 0)}<br/>Fingerprint: ${String(nodeObj.fingerprint_id || "N/A")}<br/>Request Count: ${String(nodeObj.request_count || 0)}`;
          }}
        />
      </div>

      <div className="border-t border-border p-3 flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded bg-green-500/10 text-green-600">Clean</span>
        <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-700">Suspicious</span>
        <span className="px-2 py-1 rounded bg-orange-500/10 text-orange-700">High Risk</span>
        <span className="px-2 py-1 rounded bg-red-500/10 text-red-600">Attack</span>
        <span className="px-2 py-1 rounded bg-pink-500/10 text-pink-600">Command Node</span>
      </div>
    </div>
  );
}
