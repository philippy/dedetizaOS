import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents || 0) / 100);
}

export function parseBRLToCents(val: string | number): number {
  if (typeof val === "number") return Math.round(val * 100);
  const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

export function todaySP(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

export function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDateBR(isoDate?: string | null): string {
  if (!isoDate) return "—";
  const clean = isoDate.slice(0, 10);
  const [y, m, d] = clean.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

export function formatDateTimeBR(isoDateTime?: string | null): string {
  if (!isoDateTime) return "—";
  const datePart = formatDateBR(isoDateTime.slice(0, 10));
  const timePart = isoDateTime.slice(11, 16) || "08:00";
  return `${datePart} · ${timePart}`;
}
