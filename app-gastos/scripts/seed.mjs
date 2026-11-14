// Carga inicial de empleados (tomados de la planilla "Gastos - Semana 05-10").
// Uso: node --env-file=.env.local scripts/seed.mjs   (sólo inserta si no hay empleados)
import { createClient } from "@libsql/client";

const db = createClient({ url: process.env.DATABASE_URL ?? "file:data/sushiroll.db", authToken: process.env.DATABASE_AUTH_TOKEN });

const cocina = [
  ["Euge", 6300], ["Ariana", 6300], ["Eze", 6300], ["Analia", 5800], ["Leo", 6300], ["Jeny", 5800],
  ["Celina", 5800], ["Florencia", 6300], ["Fabricio", 6300], ["Agustina", 6300], ["Vero", 6300],
  ["Luz", 5500], ["Gonza", 6300], ["Mabel", 5500], ["More", 5500],
];
const delivery = ["Juan", "Valentin", "Lucas", "Tobias", "Cristian"];
const empaque = ["Tisiana", "Morena", "Pilar", "Abril", "Ficela", "Brenda"];
const fijo = [["Paula", 300000], ["Nico", 450000]];

await db.execute(`CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, role TEXT NOT NULL, rate INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL)`);
const { rows } = await db.execute("SELECT COUNT(*) AS n FROM employees");
if (Number(rows[0].n) > 0) {
  console.log("Ya hay empleados cargados, no hago nada.");
  process.exit(0);
}
const now = new Date().toISOString();
const all = [
  ...cocina.map(([n, r]) => [n, "cocina", r]),
  ...delivery.map((n) => [n, "delivery", 0]),
  ...empaque.map((n) => [n, "empaque", 20000]),
  ...fijo.map(([n, r]) => [n, "fijo", r]),
];
await db.batch(all.map(([name, role, rate]) => ({ sql: "INSERT INTO employees (name, role, rate, active, created_at) VALUES (?, ?, ?, 1, ?)", args: [name, role, rate, now] })), "write");
console.log(`Cargados ${all.length} empleados.`);
