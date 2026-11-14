import type { Role } from "./schema";

export const ROLE_LABELS: Record<Role, string> = {
  cocina: "Cocina",
  delivery: "Delivery",
  empaque: "Empaque",
  fijo: "Encargado / Cajero",
};

export const RATE_LABELS: Record<Role, string> = {
  cocina: "Sueldo por hora",
  delivery: "—",
  empaque: "Sueldo por día",
  fijo: "Sueldo semanal",
};

export const ROLE_ORDER: Role[] = ["cocina", "delivery", "empaque", "fijo"];

export type EntryLike = {
  role: Role;
  rate: number;
  hours: number;
  days: number;
  manualAmount: number;
  advance: number;
};

/** Sueldo bruto antes de adelantos. */
export function gross(e: EntryLike): number {
  switch (e.role) {
    case "cocina":
      return Math.round(e.hours * e.rate);
    case "empaque":
      return e.days * e.rate;
    case "fijo":
      return e.rate;
    case "delivery":
      return e.manualAmount;
  }
}

/** Sueldo a pagar = bruto − adelantos. */
export function toPay(e: EntryLike): number {
  return gross(e) - e.advance;
}

export function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

export const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

/** "2026-11-09" -> "09/11" */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekLabel(startIso: string): string {
  return `Semana ${shortDate(startIso)} al ${shortDate(addDays(startIso, 6))}`;
}

/** Lunes de la semana que contiene la fecha (zona Argentina). */
export function mondayOf(date: Date = new Date()): string {
  const ar = new Date(date.toLocaleString("en-US", { timeZone: "America/Argentina/Cordoba" }));
  const iso = `${ar.getFullYear()}-${String(ar.getMonth() + 1).padStart(2, "0")}-${String(ar.getDate()).padStart(2, "0")}`;
  const dow = (ar.getDay() + 6) % 7; // lunes = 0
  return addDays(iso, -dow);
}

export function isMonday(iso: string): boolean {
  return new Date(iso + "T12:00:00Z").getUTCDay() === 1;
}
