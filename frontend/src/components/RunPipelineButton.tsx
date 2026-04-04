"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Play, Loader2, Check, AlertTriangle, Sparkles } from "lucide-react";

interface RunPipelineButtonProps {
  onRun: () => Promise<void>;
}

type Status = "idle" | "running" | "success" | "error";

export function RunPipelineButton({ onRun }: RunPipelineButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleClick = async () => {
    if (status === "running") return;

    setStatus("running");
    setErrorMessage("");

    try {
      await onRun();
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Pipeline failed");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const getButtonContent = () => {
    switch (status) {
      case "running":
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Analyzing...</span>
          </>
        );
      case "success":
        return (
          <>
            <Check className="w-5 h-5" />
            <span>Complete!</span>
          </>
        );
      case "error":
        return (
          <>
            <AlertTriangle className="w-5 h-5" />
            <span>Failed</span>
          </>
        );
      default:
        return (
          <>
            <Play className="w-5 h-5" />
            <span>Run Analysis</span>
            <Sparkles className="w-4 h-4 opacity-70" />
          </>
        );
    }
  };

  return (
    <div className="relative group">
      {/* Glow effect */}
      {status === "idle" && (
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-emerald-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
      )}
      
      <button
        onClick={handleClick}
        disabled={status === "running"}
        className={cn(
          "relative flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300",
          "shadow-lg",
          status === "idle" && [
            "bg-gradient-to-r from-primary to-emerald-600 text-white",
            "hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5",
            "active:scale-95"
          ],
          status === "running" && [
            "bg-primary/80 text-white cursor-wait",
            "shadow-lg shadow-primary/20"
          ],
          status === "success" && [
            "bg-gradient-to-r from-green-500 to-emerald-600 text-white",
            "shadow-lg shadow-green-500/25"
          ],
          status === "error" && [
            "bg-gradient-to-r from-red-500 to-rose-600 text-white",
            "shadow-lg shadow-red-500/25"
          ]
        )}
      >
        {getButtonContent()}
      </button>
      
      {status === "error" && errorMessage && (
        <p className="absolute top-full mt-2 left-0 right-0 text-xs text-red-500 text-center whitespace-nowrap">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
