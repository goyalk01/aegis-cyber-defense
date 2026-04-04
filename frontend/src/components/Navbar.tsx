"use client";

import { Shield, Clock } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface NavbarProps {
  lastUpdated?: Date | null;
}

export function Navbar({ lastUpdated }: NavbarProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AEGIS</h1>
            <p className="text-xs text-muted-foreground">Cyber Defense System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Last Updated */}
          {lastUpdated && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Updated: {formatTime(lastUpdated)}
              </span>
            </div>
          )}

          {/* System Status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">System Active</span>
          </div>

          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
