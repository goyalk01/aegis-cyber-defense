"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function DashboardLayout({ children, title, description, actions }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapse={setSidebarCollapsed} />
      
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "ml-[72px]" : "ml-60"
        )}
      >
        <TopBar title={title} description={description} actions={actions} />
        
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
