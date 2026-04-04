"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { AlertTriangle, Network, Info } from "lucide-react";
import { CommandNodeResult, FingerprintData, GraphData } from "@/types";

// Safely load ForceGraph2D only on the client side to avoid SSR and ref errors
let ForceGraph2D: any = null;
if (typeof window !== "undefined") {
  ForceGraph2D = require("react-force-graph-2d").default;
}

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

// Glow colors for command node effect
const COMMAND_GLOW_COLORS = [
  "rgba(244, 63, 94, 0.4)",
  "rgba(244, 63, 94, 0.25)",
  "rgba(244, 63, 94, 0.1)",
];

export function NetworkGraph({
  graph,
  fingerprints,
  commandNode,
  loading,
  error,
  demoPhase = "graph",
}: NetworkGraphProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const animationFrame = useRef<number>(0);
  const graphRef = useRef<{ zoomToFit: (ms?: number, padding?: number) => void; centerAt: (x?: number, y?: number, ms?: number) => void } | null>(null);

  // Mark component as mounted to safely render the graph
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Animation loop for pulsing effects
  useEffect(() => {
    if (!isMounted) return;
    let frameId: number;
    const animate = () => {
      animationFrame.current = (animationFrame.current + 1) % 360;
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isMounted]);

  // Center and zoom the graph after it loads
  useEffect(() => {
    if (isMounted && graph && graphRef.current) {
      const timer = setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(400, 50);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [graph, isMounted]);

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
        out_degree: n.out_degree,
        centrality: n.centrality,
      };
    });

    const links = graph.links.map((l) => ({
      source: l.source,
      target: l.target,
      count: l.count,
      weight: l.weight || l.count,
    }));

    return { nodes, links };
  }, [graph, fingerprintByNode, commandNode, demoPhase]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <p className="font-semibold">Error Loading Graph</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !isMounted) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
          <div className="h-6 w-48 shimmer rounded-lg" />
        </div>
        <div className="h-[500px] flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
          <div className="text-center">
            <div className="relative inline-flex">
              <div className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <Network className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm text-muted-foreground mt-4">Building network graph...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!graph || graphData.nodes.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 text-center">
        <Network className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground font-medium">No graph data available</p>
        <p className="text-xs text-muted-foreground mt-1">Run the pipeline to generate network data</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Network className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Attribution Network Graph</h3>
              <p className="text-xs text-muted-foreground">
                Drag nodes, zoom to inspect clusters, hover for details
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground font-medium">
              <span className="text-foreground font-semibold">{graph.total_nodes.toLocaleString()}</span> nodes
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground font-medium">
              <span className="text-foreground font-semibold">{graph.total_edges.toLocaleString()}</span> edges
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip info */}
      {hoveredNode && (
        <div className="absolute top-24 left-6 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-2xl max-w-xs pointer-events-none">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">{hoveredNode}</span>
          </div>
          <div className="text-xs space-y-2">
            {graphData.nodes.find(n => n.node_id === hoveredNode) && (() => {
              const node = graphData.nodes.find(n => n.node_id === hoveredNode);
              return (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Severity</span>
                    <span className="font-semibold text-foreground">{node?.severity_score}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fingerprint</span>
                    <span className="font-mono text-foreground">{node?.fingerprint_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requests</span>
                    <span className="font-semibold text-foreground">{node?.request_count}</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div className="h-[500px] bg-gradient-to-b from-background via-background to-muted/20 relative">
        {ForceGraph2D && (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            cooldownTicks={100}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            warmupTicks={50}
            onEngineStop={() => {
              // Auto zoom to fit after graph stabilizes
              if (graphRef.current) {
                graphRef.current.zoomToFit(400, 60);
              }
            }}
            linkColor={(linkObj: Record<string, unknown>) => {
              const src = String(linkObj.source && typeof linkObj.source === "object" ? (linkObj.source as Record<string, unknown>).id : linkObj.source || "");
              const tgt = String(linkObj.target && typeof linkObj.target === "object" ? (linkObj.target as Record<string, unknown>).id : linkObj.target || "");
              
              if (demoPhase !== "graph" && commandNode?.command_node) {
                if (src === commandNode.command_node) return "rgba(244, 63, 94, 0.8)";
                if (tgt === commandNode.command_node) return "rgba(244, 63, 94, 0.5)";
              }
              return "rgba(100, 116, 139, 0.25)";
            }}
            linkWidth={(linkObj: Record<string, unknown>) => {
              const w = Number(linkObj.weight || linkObj.count || 1);
              const src = String(linkObj.source && typeof linkObj.source === "object" ? (linkObj.source as Record<string, unknown>).id : linkObj.source || "");
              
              if (commandNode?.command_node && src === commandNode.command_node) {
                return Math.max(2, Math.min(8, 1 + w / 2));
              }
              return Math.max(0.5, Math.min(4, 0.4 + w / 5));
            }}
            linkDirectionalParticles={(linkObj: Record<string, unknown>) => {
              const src = String(linkObj.source && typeof linkObj.source === "object" ? (linkObj.source as Record<string, unknown>).id : linkObj.source || "");
              const w = Number(linkObj.weight || linkObj.count || 1);
              
              if (commandNode?.command_node && src === commandNode.command_node) {
                return Math.max(2, Math.min(6, Math.floor(w / 2)));
              }
              return Math.max(0, Math.min(3, Math.floor(w / 4)));
            }}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleSpeed={0.006}
            linkDirectionalParticleColor={() => "rgba(244, 63, 94, 0.8)"}
            nodeRelSize={6}
            nodeCanvasObject={(nodeObj: Record<string, unknown>, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const nodeId = String(nodeObj.node_id || nodeObj.id || "");
              const nodeType = String(nodeObj.node_type || "CLEAN");
              const severity = Number(nodeObj.severity_score || 0);
              const x = Number(nodeObj.x);
              const y = Number(nodeObj.y);

              const color = NODE_COLORS[nodeType] || NODE_COLORS.CLEAN;
              const radius = 3 + Math.min(6, severity / 20);
              const time = Date.now() / 200;
              const pulse = 1 + (Math.sin(time) + 1) * 0.15;

              if (nodeType === "COMMAND_NODE") {
                COMMAND_GLOW_COLORS.forEach((glowColor, idx) => {
                  ctx.beginPath();
                  ctx.arc(x, y, (radius + 8 + idx * 6) * pulse, 0, 2 * Math.PI, false);
                  ctx.fillStyle = glowColor;
                  ctx.fill();
                });
                
                ctx.beginPath();
                ctx.arc(x, y, (radius + 4) * pulse, 0, 2 * Math.PI, false);
                ctx.fillStyle = "rgba(244, 63, 94, 0.35)";
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(x, y, radius + 1, 0, 2 * Math.PI, false);
                ctx.fillStyle = "#f43f5e";
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2;
                ctx.stroke();
              } else {
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
                ctx.fillStyle = color;
                ctx.fill();
                
                if (nodeType !== "CLEAN") {
                  ctx.strokeStyle = "rgba(255,255,255,0.3)";
                  ctx.lineWidth = 1;
                  ctx.stroke();
                }
              }

              const fontSize = Math.max(8, 11 / globalScale);
              ctx.font = `${fontSize}px sans-serif`;
              ctx.fillStyle = nodeType === "COMMAND_NODE" ? "#ffffff" : "#94a3b8";
              ctx.textAlign = "center";
              ctx.fillText(nodeId, x, y - radius - 4);
            }}
            nodeLabel={(nodeObj: Record<string, unknown>) => {
              const nodeId = String(nodeObj.node_id || nodeObj.id || "");
              const nodeType = String(nodeObj.node_type || "CLEAN");
              const severity = Number(nodeObj.severity_score || 0);
              const fp = String(nodeObj.fingerprint_id || "N/A");
              const requests = Number(nodeObj.request_count || 0);
              
              return `<div style="background:#1e293b;padding:8px 12px;border-radius:8px;border:1px solid #334155;font-size:12px;min-width:140px;">
                <div style="font-weight:600;color:#f8fafc;margin-bottom:4px;">${nodeId}</div>
                <div style="color:#94a3b8;font-size:11px;">
                  <div>Type: <span style="color:${NODE_COLORS[nodeType] || '#22c55e'}">${nodeType}</span></div>
                  <div>Severity: ${severity}</div>
                  <div>Fingerprint: ${fp}</div>
                  <div>Requests: ${requests}</div>
                </div>
              </div>`;
            }}
            onNodeHover={(node: Record<string, unknown> | null) => {
              setHoveredNode(node ? String(node.node_id || node.id || "") : null);
            }}
          />
        )}
      </div>

      <div className="border-t border-border p-3 flex flex-wrap items-center gap-3 text-xs bg-muted/20">
        <span className="text-muted-foreground font-medium">Legend:</span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 text-green-600">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Clean
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-500/10 text-yellow-700">
          <span className="w-2 h-2 rounded-full bg-yellow-500" /> Suspicious
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-orange-500/10 text-orange-700">
          <span className="w-2 h-2 rounded-full bg-orange-500" /> High Risk
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 text-red-600">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Attack
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-pink-500/10 text-pink-600 border border-pink-500/30">
          <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" /> Command Node
        </span>
      </div>
    </div>
  );
}