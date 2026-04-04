"use client";

import { ThemeToggle } from "./ThemeToggle";
import { Clock, Bell, Search, Settings, X, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, description, actions }: TopBarProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { 
        hour: "2-digit", 
        minute: "2-digit" 
      }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notifications = [
    { id: 1, type: "alert", message: "Command node NODE-037 detected", time: "2m ago" },
    { id: 2, type: "success", message: "Pipeline analysis completed", time: "5m ago" },
    { id: 3, type: "info", message: "727 attack alerts generated", time: "10m ago" },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-sm border-b border-border/50">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left - Page Title */}
        <div className="flex items-center gap-4">
          {title && (
            <div>
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          )}
        </div>

        {/* Center - Actions */}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}

        {/* Right - Utilities */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div ref={searchRef} className="relative">
            <button 
              onClick={() => { setSearchOpen(!searchOpen); setNotificationsOpen(false); setSettingsOpen(false); }}
              className={cn(
                "p-2 rounded-lg transition-colors",
                searchOpen ? "bg-primary/10 text-primary" : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <Search className="w-5 h-5" />
            </button>
            
            {searchOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl p-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search nodes, alerts, fingerprints..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
                    autoFocus
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">Quick Links</p>
                  <div className="mt-2 space-y-1">
                    <a href="/graph" className="block px-2 py-1.5 text-sm text-foreground hover:bg-accent/50 rounded-lg">Network Graph</a>
                    <a href="/attribution" className="block px-2 py-1.5 text-sm text-foreground hover:bg-accent/50 rounded-lg">Attribution Analysis</a>
                    <a href="/alerts" className="block px-2 py-1.5 text-sm text-foreground hover:bg-accent/50 rounded-lg">Security Alerts</a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div ref={notificationsRef} className="relative">
            <button 
              onClick={() => { setNotificationsOpen(!notificationsOpen); setSearchOpen(false); setSettingsOpen(false); }}
              className={cn(
                "p-2 rounded-lg transition-colors relative",
                notificationsOpen ? "bg-primary/10 text-primary" : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </button>
            
            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="font-semibold text-foreground">Notifications</span>
                  <span className="text-xs text-primary font-medium">3 new</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="px-4 py-3 hover:bg-accent/30 border-b border-border/50 last:border-0">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-1.5 rounded-lg",
                          notif.type === "alert" && "bg-destructive/10 text-destructive",
                          notif.type === "success" && "bg-success/10 text-success",
                          notif.type === "info" && "bg-primary/10 text-primary"
                        )}>
                          {notif.type === "alert" && <AlertTriangle className="w-4 h-4" />}
                          {notif.type === "success" && <CheckCircle className="w-4 h-4" />}
                          {notif.type === "info" && <Info className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{notif.message}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{notif.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-border bg-accent/20">
                  <button className="w-full text-sm text-primary hover:underline">View all notifications</button>
                </div>
              </div>
            )}
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/30 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-muted-foreground">{currentTime}</span>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Settings */}
          <div ref={settingsRef} className="relative">
            <button 
              onClick={() => { setSettingsOpen(!settingsOpen); setSearchOpen(false); setNotificationsOpen(false); }}
              className={cn(
                "p-2 rounded-lg transition-colors",
                settingsOpen ? "bg-primary/10 text-primary" : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <Settings className="w-5 h-5" />
            </button>
            
            {settingsOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-border">
                  <span className="font-semibold text-foreground">Settings</span>
                </div>
                <div className="p-2">
                  <button className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent/50 rounded-lg flex items-center justify-between">
                    Auto-refresh
                    <span className="text-xs text-primary">30s</span>
                  </button>
                  <button className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent/50 rounded-lg flex items-center justify-between">
                    Show node labels
                    <span className="text-xs text-success">On</span>
                  </button>
                  <button className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent/50 rounded-lg flex items-center justify-between">
                    Animation speed
                    <span className="text-xs text-muted-foreground">Normal</span>
                  </button>
                </div>
                <div className="px-4 py-2 border-t border-border bg-accent/20">
                  <p className="text-xs text-muted-foreground text-center">AEGIS v1.0 • Build 2026.04</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
