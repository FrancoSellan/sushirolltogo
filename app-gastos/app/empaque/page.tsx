import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { employees, weeks } from "@/lib/schema";
import { weekLabel } from "@/lib/calc";
import { PackingForm } from "./packing-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Empaque Sushi roll" };

export default async function EmpaquePage() {
  const db = await getDb();
  const people = await db
    .select({ id: employees.id, name: employees.name })
    .from(employees)
    .where(and(eq(employees.role, "empaque"), eq(employees.active, true)))
    .orderBy(asc(employees.name));
  const [week] = await db.select().from(weeks).where(eq(weeks.closed, false)).orderBy(desc(weeks.startDate)).limit(1);

  return (
    <main className="mx-auto max-w-xl px-4 py-6 sm:py-10">
      <div className="card overflow-hidden">
        <div className="h-2 bg-salmon" />
        <div className="p-6">
          <h1 className="text-3xl font-bold italic tracking-tight">Empaque Sushi roll</h1>
          <p className="mt-2 text-sm italic text-ink-soft">
            Este formulario es para que las personas con el rol de &quot;Empaquetador/a&quot; de Sushi roll to go marquen los
            días que fueron a trabajar con la finalidad de que cada uno/a pueda cobrar el monto adecuado de la semana.
          </p>
          {week && <p className="mt-3 text-sm font-semibold">{weekLabel(week.startDate)}</p>}
          <p className="mt-3 border-t border-line pt-3 text-xs text-salmon">* Indica que la pregunta es obligatoria</p>
        </div>
      </div>
      {week ? (
        <PackingForm people={people} />
      ) : (
        <div className="card mt-4 p-6 text-center text-ink-soft">No hay una semana abierta en este momento. Avisale al encargado.</div>
      )}
    </main>
  );
}
