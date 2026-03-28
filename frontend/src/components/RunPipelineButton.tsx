"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Play, Loader2, Check, AlertTriangle } from "lucide-react";

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
            <span>Running Pipeline...</span>
          </>
        );
      case "success":
        return (
          <>
            <Check className="w-5 h-5" />
            <span>Pipeline Complete</span>
          </>
        );
      case "error":
        return (
          <>
            <AlertTriangle className="w-5 h-5" />
            <span>Pipeline Failed</span>
          </>
        );
      default:
        return (
          <>
            <Play className="w-5 h-5" />
            <span>Run Pipeline</span>
          </>
        );
    }
  };

  const getButtonClasses = () => {
    const base =
      "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all shadow-sm";

    switch (status) {
      case "running":
        return cn(base, "bg-primary/80 text-primary-foreground cursor-wait");
      case "success":
        return cn(base, "bg-green-500 text-white");
      case "error":
        return cn(base, "bg-red-500 text-white");
      default:
        return cn(
          base,
          "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
        );
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={status === "running"}
        className={getButtonClasses()}
      >
        {getButtonContent()}
      </button>
      {status === "error" && errorMessage && (
        <p className="mt-2 text-sm text-red-500">{errorMessage}</p>
      )}
    </div>
  );
}
