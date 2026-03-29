"use client";

import { useMemo, useState, WheelEvent, useRef } from "react";
import { Alert } from "@/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Activity, ShieldAlert, XCircle, CheckCircle2 } from "lucide-react";

interface CityMapProps {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
}

interface MapNode {
  node_id: string;
  ip: string;
  statusCode: number;
  x: number;
  y: number;
}

type FilterType = 'ALL' | '2XX' | '4XX' | '5XX';

// Deterministic hashing for layout and mock IPs
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateMockIP(nodeId: string): string {
  const h = hashString(nodeId);
  return `10.${(h % 255)}.${(h % 25) + 100}.${h % 255}`;
}

// Map severity to strict HTTP Status Codes for forensic analysis
function getStatusCode(severity: number): number {
  if (severity < 30) return 200; // OK
  if (severity < 60) return 401; // Unauthorized
  if (severity < 80) return 403; // Forbidden
  return 500;                    // Internal Server Error
}

function getStatusColor(code: number) {
  if (code === 200) return { bg: "bg-slate-700", border: "border-slate-600", text: "text-slate-400" };
  if (code === 401) return { bg: "bg-yellow-500", border: "border-yellow-400", text: "text-yellow-500" };
  if (code === 403) return { bg: "bg-orange-500", border: "border-orange-400", text: "text-orange-500" };
  return { bg: "bg-red-500", border: "border-red-400", text: "text-red-500" }; // 500
}

export function CityMap({ alerts, loading, error }: CityMapProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // 1. Process Nodes
  const mapNodes: MapNode[] = useMemo(() => {
    if (!Array.isArray(alerts) || alerts.length === 0) return [];

    const nodeMap = new Map<string, Alert>();
    const sortedAlerts = [...alerts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    for (const alert of sortedAlerts) {
      if (!nodeMap.has(alert.node_id)) nodeMap.set(alert.node_id, alert);
    }

    return Array.from(nodeMap.values()).map((alert) => {
      const hash = hashString(alert.node_id);
      return {
        node_id: alert.node_id,
        ip: generateMockIP(alert.node_id),
        statusCode: getStatusCode(alert.severity_score ?? 0),
        // Spread organically across 10% to 90% of the canvas
        x: 10 + (hash % 80),
        y: 10 + ((hash >> 2) % 80),
      };
    });
  }, [alerts]);

  // 2. Generate minimal web links
  const mapLinks = useMemo(() => {
    const links: [MapNode, MapNode][] = [];
    mapNodes.forEach((node, i) => {
      // Connect to 2 nearest neighbors to form a clean web
      const neighbors = [...mapNodes]
        .filter(n => n.node_id !== node.node_id)
        .sort((a, b) => {
          const distA = Math.hypot(a.x - node.x, a.y - node.y);
          const distB = Math.hypot(b.x - node.x, b.y - node.y);
          return distA - distB;
        })
        .slice(0, 2);

      neighbors.forEach(target => links.push([node, target]));
    });
    return links;
  }, [mapNodes]);

  // Viewport interactions
  const handleWheelZoom = (e: WheelEvent) => {
    setZoom(prev => Math.max(0.5, Math.min(3, prev - e.deltaY * 0.002)));
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  // Filter Logic
  const isNodeVisible = (code: number) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === '2XX' && code === 200) return true;
    if (activeFilter === '4XX' && (code === 401 || code === 403)) return true;
    if (activeFilter === '5XX' && code >= 500) return true;
    return false;
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-card p-6 text-red-500 font-mono text-sm">
        <AlertTriangle className="w-5 h-5 mb-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-2xl">

      {/* Top Filter Bar */}
      <div className="p-3 border-b border-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-mono font-bold text-foreground tracking-widest uppercase">
            Forensic Topology
          </h3>
        </div>

        {/* Status Code Filters */}
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md border border-border">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={cn("px-3 py-1 text-[10px] font-mono rounded transition-colors", activeFilter === 'ALL' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            ALL
          </button>
          <div className="w-px h-3 bg-border" />
          <button
            onClick={() => setActiveFilter('2XX')}
            className={cn("px-2 py-1 flex items-center gap-1.5 text-[10px] font-mono rounded transition-colors", activeFilter === '2XX' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <CheckCircle2 className="w-3 h-3" /> 2xx
          </button>
          <button
            onClick={() => setActiveFilter('4XX')}
            className={cn("px-2 py-1 flex items-center gap-1.5 text-[10px] font-mono rounded transition-colors", activeFilter === '4XX' ? "bg-orange-950/50 text-orange-400" : "text-orange-700/50 hover:text-orange-500/80")}
          >
            <ShieldAlert className="w-3 h-3" /> 4xx
          </button>
          <button
            onClick={() => setActiveFilter('5XX')}
            className={cn("px-2 py-1 flex items-center gap-1.5 text-[10px] font-mono rounded transition-colors", activeFilter === '5XX' ? "bg-red-950/50 text-red-400" : "text-red-700/50 hover:text-red-500/80")}
          >
            <XCircle className="w-3 h-3" /> 5xx
          </button>
        </div>
      </div>

      {/* Map Area */}
      <div className="relative h-[400px]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse flex items-center gap-2 font-mono text-xs text-muted-foreground tracking-widest">
              SCANNING NETWORK...
            </div>
          </div>
        ) : (
          <div
            className="absolute inset-0 overflow-hidden cursor-move"
            onWheel={handleWheelZoom}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Minimal Grid */}
            <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

            <div
              className="absolute w-full h-full origin-center transition-transform duration-75 ease-linear"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
              {/* Thin Connecting Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                {mapLinks.map(([from, to], index) => {
                  const isVisible = isNodeVisible(from.statusCode) || isNodeVisible(to.statusCode);
                  return (
                    <line
                      key={`link-${index}`}
                      x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`}
                      className="transition-opacity duration-300"
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth="1.5"
                      opacity={isVisible ? 1 : 0.1}
                    />
                  );
                })}
              </svg>

              {/* Nodes */}
              {mapNodes.map((node) => {
                const colors = getStatusColor(node.statusCode);
                const isHovered = hoveredNode === node.node_id;
                const isVisible = isNodeVisible(node.statusCode);

                return (
                  <div
                    key={node.node_id}
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group",
                      isVisible ? "opacity-100 z-10" : "opacity-10 z-0 grayscale"
                    )}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    onMouseEnter={() => setHoveredNode(node.node_id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Node Dot */}
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full border cursor-pointer transition-transform duration-200",
                      colors.bg, colors.border,
                      isHovered && "scale-150 ring-4 ring-black/50"
                    )} />

                    {/* Forensic Tooltip */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-2 bg-card border border-border rounded shadow-2xl z-50 pointer-events-none min-w-[140px]">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-mono text-xs font-bold text-foreground">{node.node_id}</span>
                          <span className={cn("font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted border", colors.border, colors.text)}>
                            {node.statusCode}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">IP: {node.ip}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}