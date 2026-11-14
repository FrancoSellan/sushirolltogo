import { sqliteTable, integer, text, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const ROLES = ["cocina", "delivery", "empaque", "fijo"] as const;
export type Role = (typeof ROLES)[number];

export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").$type<Role>().notNull(),
  // cocina: $ por hora · empaque: $ por día · fijo: $ por semana · delivery: no se usa
  rate: integer("rate").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const weeks = sqliteTable("weeks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startDate: text("start_date").notNull().unique(), // lunes, YYYY-MM-DD
  closed: integer("closed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const entries = sqliteTable(
  "entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    weekId: integer("week_id").notNull(),
    employeeId: integer("employee_id").notNull(),
    // copias del empleado al momento de la semana (historial)
    name: text("name").notNull(),
    role: text("role").$type<Role>().notNull(),
    rate: integer("rate").notNull().default(0),
    hours: real("hours").notNull().default(0),
    days: integer("days").notNull().default(0),
    manualAmount: integer("manual_amount").notNull().default(0),
    advance: integer("advance").notNull().default(0),
    note: text("note").notNull().default(""),
  },
  (t) => [uniqueIndex("entries_week_employee").on(t.weekId, t.employeeId)],
);

export const packingSubmissions = sqliteTable("packing_submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  weekId: integer("week_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  email: text("email").notNull(),
  days: text("days").notNull(), // JSON: ["Lunes", ...]
  doubleDays: text("double_days").notNull(), // JSON
  createdAt: text("created_at").notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type Week = typeof weeks.$inferSelect;
export type Entry = typeof entries.$inferSelect;
