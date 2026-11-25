import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export {
  formatCompactCurrency,
  formatCurrency,
  formatPhone,
  normalizePhone,
  phoneMatchKey,
  relativeTime,
  stageLabel,
  DEAL_STAGES,
} from "@nexus/shared";

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", withTime ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function textColorForName(name: string): string {
  const palette = ["#4f46e5", "#0f766e", "#b45309", "#7c3aed", "#be123c", "#0369a1"];
  const sum = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[sum % palette.length] ?? "#4f46e5";
}
