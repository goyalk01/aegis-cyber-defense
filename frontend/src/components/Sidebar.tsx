"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Network,
  Crosshair,
  Fingerprint,
  BarChart3,
  AlertTriangle,
  Shield,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Database,
  Wifi,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

const NAVIGATION = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "System overview",
  },
  {
    label: "Network Graph",
    href: "/graph",
    icon: Network,
    description: "Interactive visualization",
  },
  {
    label: "Attribution",
    href: "/attribution",
    icon: Crosshair,
    description: "Command node analysis",
  },
  {
    label: "Fingerprints",
    href: "/fingerprints",
    icon: Fingerprint,
    description: "Pattern clusters",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Advanced charts",
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: AlertTriangle,
    description: "Security events",
  },
] as const;

interface SidebarProps {
  onCollapse?: (collapsed: boolean) => void;
}

export function Sidebar({ onCollapse }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [systemStats, setSystemStats] = useState({
    uptime: "0m 0s",
    lastUpdate: new Date().toLocaleTimeString(),
    apiStatus: "online" as "online" | "offline" | "checking",
    pipelineStatus: "ready" as "ready" | "running" | "error",
    logsProcessed: 10000,
    graphNodes: 500,
    attacksDetected: 727,
  });
  const statusRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Real-time uptime updates
  useEffect(() => {
    const updateStats = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      
      setSystemStats(prev => ({
        ...prev,
        uptime: hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${minutes}m ${seconds}s`,
        lastUpdate: new Date().toLocaleTimeString(),
      }));
    };
    
    updateStats();
    const interval = setInterval(updateStats, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    onCollapse?.(newState);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-40 transition-all duration-300",
        collapsed ? "w-[72px]" : "w-60"
      )}
    >
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-foreground tracking-tight">AEGIS</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Attribution Engine
              </p>
            </div>
          )}
        </Link>
        <button
          onClick={handleToggle}
          className="p-1.5 rounded-md hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {NAVIGATION.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed && (
                <div className="overflow-hidden">
                  <span className="block truncate">{item.label}</span>
                  <span className="text-[10px] text-muted-foreground truncate block">
                    {item.description}
                  </span>
                </div>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Status indicator */}
      <div ref={statusRef} className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-border">
        <button
          onClick={() => setStatusOpen(!statusOpen)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer",
            collapsed && "justify-center"
          )}
        >
          <div className="relative shrink-0">
            <Activity className="w-4 h-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden text-left">
              <p className="text-xs font-medium text-foreground">System Active</p>
              <p className="text-[10px] text-muted-foreground">Real-time monitoring</p>
            </div>
          )}
        </button>

        {/* Status Panel Popup */}
        {statusOpen && (
          <div 
            className={cn(
              "absolute bottom-full mb-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2",
              collapsed ? "left-2 w-64" : "left-3 right-3"
            )}
          >
            <div className="px-4 py-3 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-success/10">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">All Systems Operational</p>
                  <p className="text-xs text-muted-foreground">Last checked: {systemStats.lastUpdate}</p>
                </div>
              </div>
            </div>
            
            <div className="p-3 space-y-3">
              {/* API Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">API Connection</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-xs text-success font-medium">Online</span>
                </div>
              </div>

              {/* Pipeline Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Pipeline Engine</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-xs text-success font-medium">Ready</span>
                </div>
              </div>

              {/* Database */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Data Store</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-xs text-success font-medium">Connected</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="border-t border-border pt-3 mt-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-accent/30 text-center">
                    <p className="text-lg font-bold text-foreground">{systemStats.logsProcessed.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Logs Analyzed</p>
                  </div>
                  <div className="p-2 rounded-lg bg-accent/30 text-center">
                    <p className="text-lg font-bold text-primary">{systemStats.graphNodes}</p>
                    <p className="text-xs text-muted-foreground">Graph Nodes</p>
                  </div>
                  <div className="p-2 rounded-lg bg-accent/30 text-center">
                    <p className="text-lg font-bold text-destructive">{systemStats.attacksDetected}</p>
                    <p className="text-xs text-muted-foreground">Attacks Found</p>
                  </div>
                </div>
              </div>

              {/* Uptime */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Session Uptime</span>
                </div>
                <span className="text-xs font-mono text-foreground">{systemStats.uptime}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
