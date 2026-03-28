import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Strict Enum Validation ────────────────────────────────────────────────────

const VALID_ALERT_LEVELS = ["ATTACK", "HIGH_RISK", "SUSPICIOUS", "CLEAN"] as const;
export type AlertLevel = (typeof VALID_ALERT_LEVELS)[number];

export function validateAlertLevel(level: unknown): AlertLevel {
  if (typeof level === "string" && VALID_ALERT_LEVELS.includes(level as AlertLevel)) {
    return level as AlertLevel;
  }
  return "CLEAN"; // Safe fallback
}

export function isValidAlertLevel(level: unknown): level is AlertLevel {
  return typeof level === "string" && VALID_ALERT_LEVELS.includes(level as AlertLevel);
}

// ── Numeric Safety Guard ──────────────────────────────────────────────────────

export function safeNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export function safePercentage(value: unknown, fallback: number = 0): number {
  const num = safeNumber(value, fallback);
  return Math.max(0, Math.min(100, num));
}

export function safePositiveInt(value: unknown, fallback: number = 0): number {
  const num = safeNumber(value, fallback);
  return Math.max(0, Math.floor(num));
}

// ── Timestamp Formatting ──────────────────────────────────────────────────────

export function formatTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) return "—";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// ── Alert Level Styling ───────────────────────────────────────────────────────

export function getAlertLevelColor(level: string | null | undefined): string {
  const validLevel = validateAlertLevel(level);
  switch (validLevel) {
    case "ATTACK":
      return "text-red-500 bg-red-500/10 border-red-500/20";
    case "HIGH_RISK":
      return "text-orange-500 bg-orange-500/10 border-orange-500/20";
    case "SUSPICIOUS":
      return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    case "CLEAN":
      return "text-green-500 bg-green-500/10 border-green-500/20";
  }
}

export function getAlertDotColor(level: string | null | undefined): string {
  const validLevel = validateAlertLevel(level);
  switch (validLevel) {
    case "ATTACK":
      return "bg-red-500";
    case "HIGH_RISK":
      return "bg-orange-500";
    case "SUSPICIOUS":
      return "bg-yellow-500";
    case "CLEAN":
      return "bg-green-500";
  }
}
