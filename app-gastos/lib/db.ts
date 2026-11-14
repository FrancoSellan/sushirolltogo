import "server-only";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    rate INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS weeks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_date TEXT NOT NULL UNIQUE,
    closed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    rate INTEGER NOT NULL DEFAULT 0,
    hours REAL NOT NULL DEFAULT 0,
    days INTEGER NOT NULL DEFAULT 0,
    manual_amount INTEGER NOT NULL DEFAULT 0,
    advance INTEGER NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS entries_week_employee ON entries (week_id, employee_id)`,
  `CREATE TABLE IF NOT EXISTS packing_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    days TEXT NOT NULL,
    double_days TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
];

const globalForDb = globalThis as unknown as { client?: Client; ready?: Promise<void> };

function getClient() {
  if (!globalForDb.client) {
    const url = process.env.DATABASE_URL ?? "file:data/sushiroll.db";
    globalForDb.client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  }
  return globalForDb.client;
}

const database = drizzle(getClient(), { schema });

/** Devuelve la base, creando las tablas la primera vez. */
export async function getDb() {
  if (!globalForDb.ready) {
    globalForDb.ready = getClient()
      .batch(SCHEMA_SQL, "write")
      .then(() => undefined)
      .catch((e) => {
        globalForDb.ready = undefined;
        throw e;
      });
  }
  await globalForDb.ready;
  return database;
}
