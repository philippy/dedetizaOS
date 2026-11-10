import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

// Valor em centavos para preencher um campo de texto no formato que parseBRLToCents entende.
// 123456 -> "1.234,56". Evita "1234.56", que seria lido como 123456 reais.
export function centsToInput(cents: number): string {
  return ((cents || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function monthRangeISO(isoDate: string, delta = 0): [string, string] {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  const a = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1, 12));
  const b = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta + 1, 0, 12));
  return [a.toISOString().slice(0, 10), b.toISOString().slice(0, 10)];
}

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// "2026-11-09" -> "segunda, 09 nov 2026"
export function formatDiaExtenso(isoDate: string): string {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  return `${DIAS_SEMANA[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, "0")} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function parseBRLToCents(val: string | number): number {
  if (typeof val === "number") return Math.round(val * 100);
  let s = String(val).replace(/[R$\s\u00a0]/g, "");
  if (s.includes(",")) {
    // Formato brasileiro: 1.234,56
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (!/\.\d{1,2}$/.test(s)) {
    // Sem vírgula e sem 1-2 casas depois do ponto: o ponto é separador de milhar (1.280)
    s = s.replace(/\./g, "");
  }
  // Senão é decimal com ponto (1234.56)
  const num = parseFloat(s);
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

// Soma meses a uma data ISO. Se o dia não existe no mês de destino, usa o último dia dele
// (31/08 + 6 meses = 28/02, e não 03/03).
export function addMonthsISO(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map((x) => parseInt(x, 10));
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const ultimoDia = new Date(Date.UTC(ny, nm + 1, 0, 12)).getUTCDate();
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(Math.min(d, ultimoDia)).padStart(2, "0")}`;
}

// Dias entre duas datas ISO (b - a). Positivo quando b é depois de a.
export function diffDaysISO(a: string, b: string): number {
  const da = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const db = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((db - da) / 86400000);
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
