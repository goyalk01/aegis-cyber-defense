"use client";

import { Shield, Clock, Activity, Zap } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface NavbarProps {
  lastUpdated?: Date | null;
}

export function Navbar({ lastUpdated }: NavbarProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-destructive to-primary rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
            <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-destructive/20 border border-primary/20">
              <Shield className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              AEGIS
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
              Attribution Engine
            </p>
          </div>
        </div>

        {/* Center Status */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
            <span className="status-dot active" />
            <span className="text-sm font-medium text-success">System Online</span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>Live Monitoring</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" />
              <span>Real-time Analysis</span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Last Updated */}
          {lastUpdated && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground font-mono text-xs">
                {formatTime(lastUpdated)}
              </span>
            </div>
          )}

          {/* Mobile Status */}
          <div className="sm:hidden flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
            <span className="status-dot active" />
            <span className="text-xs font-medium text-success">Online</span>
          </div>

          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
