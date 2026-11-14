"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "./db";
import { employees, entries, packingSubmissions, weeks, ROLES, type Role } from "./schema";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "./auth";
import { requireAuth } from "./session";
import { DAYS, isMonday } from "./calc";

const now = () => new Date().toISOString();

function toInt(v: FormDataEntryValue | null | undefined): number {
  const n = Math.round(Number(String(v ?? "").replace(/[.$\s]/g, "").replace(",", ".")));
  return Number.isFinite(n) ? n : 0;
}

/* ───────────── Login ───────────── */

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const given = Buffer.from(String(formData.get("password") ?? ""));
  const expected = Buffer.from(process.env.APP_PASSWORD ?? "");
  const ok = expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
  if (!ok) return "Contraseña incorrecta";
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  redirect("/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

/* ───────────── Empleados ───────────── */

async function openWeekIds() {
  const db = await getDb();
  const rows = await db.select({ id: weeks.id }).from(weeks).where(eq(weeks.closed, false));
  return rows.map((r) => r.id);
}

export async function saveEmployee(formData: FormData) {
  await requireAuth();
  const db = await getDb();
  const id = toInt(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role")) as Role;
  const rate = role === "delivery" ? 0 : toInt(formData.get("rate"));
  if (!name || !ROLES.includes(role)) return;

  const open = await openWeekIds();

  if (id) {
    await db.update(employees).set({ name, role, rate }).where(eq(employees.id, id));
    // Las semanas abiertas reflejan el cambio; las cerradas quedan como estaban.
    if (open.length) {
      await db
        .update(entries)
        .set({ name, role, rate })
        .where(and(eq(entries.employeeId, id), inArray(entries.weekId, open)));
    }
  } else {
    const [emp] = await db
      .insert(employees)
      .values({ name, role, rate, active: true, createdAt: now() })
      .returning();
    for (const weekId of open) {
      await db
        .insert(entries)
        .values({ weekId, employeeId: emp.id, name, role, rate })
        .onConflictDoNothing();
    }
  }
  revalidatePath("/", "layout");
}

export async function setEmployeeActive(id: number, active: boolean) {
  await requireAuth();
  const db = await getDb();
  const [emp] = await db.update(employees).set({ active }).where(eq(employees.id, id)).returning();
  const open = await openWeekIds();
  if (emp && open.length) {
    if (active) {
      for (const weekId of open) {
        await db
          .insert(entries)
          .values({ weekId, employeeId: emp.id, name: emp.name, role: emp.role, rate: emp.rate })
          .onConflictDoNothing();
      }
    } else {
      // Al desactivar, sale de las semanas abiertas sólo si no tenía nada cargado.
      const rows = await db
        .select()
        .from(entries)
        .where(and(eq(entries.employeeId, id), inArray(entries.weekId, open)));
      for (const r of rows) {
        if (!r.hours && !r.days && !r.manualAmount && !r.advance && !r.note) {
          await db.delete(entries).where(eq(entries.id, r.id));
        }
      }
    }
  }
  revalidatePath("/", "layout");
}

export async function deleteEmployee(id: number) {
  await requireAuth();
  const db = await getDb();
  const open = await openWeekIds();
  if (open.length) {
    await db.delete(entries).where(and(eq(entries.employeeId, id), inArray(entries.weekId, open)));
  }
  await db.delete(employees).where(eq(employees.id, id));
  revalidatePath("/", "layout");
}

/* ───────────── Semanas ───────────── */

export async function createWeek(formData: FormData) {
  await requireAuth();
  const db = await getDb();
  const startDate = String(formData.get("startDate") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !isMonday(startDate)) {
    redirect("/?error=lunes");
  }
  const [existing] = await db.select().from(weeks).where(eq(weeks.startDate, startDate));
  if (existing) redirect(`/semanas/${existing.id}`);

  const [week] = await db.insert(weeks).values({ startDate, closed: false, createdAt: now() }).returning();
  const active = await db.select().from(employees).where(eq(employees.active, true));
  if (active.length) {
    await db.insert(entries).values(
      active.map((e) => ({ weekId: week.id, employeeId: e.id, name: e.name, role: e.role, rate: e.rate })),
    );
  }
  revalidatePath("/");
  redirect(`/semanas/${week.id}`);
}

export async function setWeekClosed(weekId: number, closed: boolean) {
  await requireAuth();
  const db = await getDb();
  await db.update(weeks).set({ closed }).where(eq(weeks.id, weekId));
  if (!closed) {
    // Al reabrir, sumar empleados activos que falten (con sus valores actuales).
    const active = await db.select().from(employees).where(eq(employees.active, true));
    for (const e of active) {
      await db
        .insert(entries)
        .values({ weekId, employeeId: e.id, name: e.name, role: e.role, rate: e.rate })
        .onConflictDoNothing();
    }
  }
  revalidatePath("/", "layout");
}

export async function deleteWeek(weekId: number) {
  await requireAuth();
  const db = await getDb();
  await db.delete(entries).where(eq(entries.weekId, weekId));
  await db.delete(packingSubmissions).where(eq(packingSubmissions.weekId, weekId));
  await db.delete(weeks).where(eq(weeks.id, weekId));
  revalidatePath("/");
  redirect("/");
}

export type EntryPatch = {
  rate?: number;
  hours?: number;
  days?: number;
  manualAmount?: number;
  advance?: number;
  note?: string;
};

export async function updateEntry(entryId: number, patch: EntryPatch) {
  await requireAuth();
  const db = await getDb();
  const clean: EntryPatch = {};
  if (patch.rate !== undefined) clean.rate = Math.max(0, Math.round(patch.rate) || 0);
  if (patch.hours !== undefined) clean.hours = Math.max(0, Number(patch.hours) || 0);
  if (patch.days !== undefined) clean.days = Math.max(0, Math.round(patch.days) || 0);
  if (patch.manualAmount !== undefined) clean.manualAmount = Math.round(patch.manualAmount) || 0;
  if (patch.advance !== undefined) clean.advance = Math.round(patch.advance) || 0;
  if (patch.note !== undefined) clean.note = String(patch.note).slice(0, 500);
  if (Object.keys(clean).length === 0) return;

  const [row] = await db
    .select({ closed: weeks.closed })
    .from(entries)
    .innerJoin(weeks, eq(entries.weekId, weeks.id))
    .where(eq(entries.id, entryId));
  if (!row || row.closed) return; // semana cerrada: no se edita
  await db.update(entries).set(clean).where(eq(entries.id, entryId));
}

export async function removeEntry(entryId: number, weekId: number) {
  await requireAuth();
  const db = await getDb();
  await db.delete(entries).where(eq(entries.id, entryId));
  revalidatePath(`/semanas/${weekId}`);
}

/* ───────────── Formulario de empaque (público) ───────────── */

export type PackingState = { ok: boolean; error?: string } | null;

export async function submitPacking(_prev: PackingState, formData: FormData): Promise<PackingState> {
  const db = await getDb();
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const employeeId = toInt(formData.get("employeeId"));
  const valid = new Set<string>(DAYS);
  const days = formData.getAll("days").map(String).filter((d) => valid.has(d));
  const doubleDays = formData.getAll("doubleDays").map(String).filter((d) => valid.has(d));

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Ingresá un correo electrónico válido." };
  if (!employeeId) return { ok: false, error: "Elegí tu nombre." };
  if (days.length === 0) return { ok: false, error: "Marcá al menos un día trabajado." };

  const [emp] = await db
    .select()
    .from(employees)
    .where(and(eq(employees.id, employeeId), eq(employees.role, "empaque"), eq(employees.active, true)));
  if (!emp) return { ok: false, error: "Nombre no válido." };

  const [week] = await db.select().from(weeks).where(eq(weeks.closed, false)).orderBy(desc(weeks.startDate)).limit(1);
  if (!week) return { ok: false, error: "No hay una semana abierta en este momento. Avisale al encargado." };

  await db.insert(packingSubmissions).values({
    weekId: week.id,
    employeeId,
    email,
    days: JSON.stringify(days),
    doubleDays: JSON.stringify(doubleDays),
    createdAt: now(),
  });

  // Cada día doble cuenta como un día más. Vale el último envío.
  const total = days.length + doubleDays.length;
  await db
    .insert(entries)
    .values({ weekId: week.id, employeeId, name: emp.name, role: emp.role, rate: emp.rate, days: total })
    .onConflictDoUpdate({ target: [entries.weekId, entries.employeeId], set: { days: total } });

  revalidatePath(`/semanas/${week.id}`);
  return { ok: true };
}
