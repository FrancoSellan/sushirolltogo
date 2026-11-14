import Link from "next/link";
import { desc } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { entries, weeks } from "@/lib/schema";
import { addDays, mondayOf, money, toPay, weekLabel } from "@/lib/calc";
import { createWeek } from "@/lib/actions";
import { CopyLink } from "@/components/copy-link";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const db = await getDb();
  const allWeeks = await db.select().from(weeks).orderBy(desc(weeks.startDate));
  const allEntries = await db.select().from(entries);

  const totals = new Map<number, number>();
  for (const e of allEntries) totals.set(e.weekId, (totals.get(e.weekId) ?? 0) + toPay(e));

  const suggested = allWeeks[0] ? addDays(allWeeks[0].startDate, 7) : mondayOf();
  const openWeek = allWeeks.find((w) => !w.closed);

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const formUrl = `${proto}://${h.get("host")}/empaque`;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">Nueva semana</h2>
          <p className="mt-1 text-sm text-ink-soft">Elegí el lunes en que empieza. Se cargan todos los empleados activos.</p>
          <form action={createWeek} className="mt-4 flex gap-2">
            <input type="date" name="startDate" defaultValue={suggested} className="field" required />
            <button className="btn-accent shrink-0">Crear</button>
          </form>
          {error === "lunes" && <p className="mt-2 text-sm text-salmon">La fecha tiene que ser un lunes.</p>}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Formulario de empaque</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Siempre el mismo link. Lo que marquen se carga en la semana abierta
            {openWeek ? (
              <>
                : <b className="text-ink">{weekLabel(openWeek.startDate)}</b>.
              </>
            ) : (
              <> (ahora no hay ninguna abierta).</>
            )}
          </p>
          <CopyLink url={formUrl} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Semanas</h2>
        {allWeeks.length === 0 ? (
          <div className="card p-8 text-center text-ink-soft">
            Todavía no hay semanas. Primero cargá los empleados en{" "}
            <Link href="/empleados" className="font-semibold text-ink underline">Empleados</Link> y después creá la primera semana.
          </div>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {allWeeks.map((w) => (
              <li key={w.id}>
                <Link href={`/semanas/${w.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-paper">
                  <div className="flex-1">
                    <div className="font-semibold">{weekLabel(w.startDate)}</div>
                    <div className="text-xs text-ink-soft">{w.startDate.slice(0, 4)}</div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${w.closed ? "bg-paper text-ink-soft" : "bg-salmon-soft text-salmon"}`}
                  >
                    {w.closed ? "Cerrada" : "Abierta"}
                  </span>
                  <span className="w-32 text-right font-semibold tabular-nums">{money(totals.get(w.id) ?? 0)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
