"use client";
import { useMemo, useState, useTransition } from "react";
import type { Entry, Role, Week } from "@/lib/schema";
import { ROLE_LABELS, ROLE_ORDER, gross, money, toPay, weekLabel } from "@/lib/calc";
import { deleteWeek, setWeekClosed, updateEntry, type EntryPatch } from "@/lib/actions";

export type SubmissionInfo = { days: string[]; doubleDays: string[]; email: string; at: string; count: number };

type NumField = "rate" | "hours" | "days" | "manualAmount" | "advance";

function parseNum(s: string): number {
  const n = Number(s.replace(/\$/g, "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function NumInput({
  label, value, onCommit, disabled, decimal, suffix,
}: {
  label: string; value: number; onCommit: (n: number) => void; disabled?: boolean; decimal?: boolean; suffix?: string;
}) {
  const [text, setText] = useState(value ? String(value).replace(".", decimal ? "," : ".") : "");
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-soft">{label}</span>
      <div className="relative">
        <input
          className="field py-1.5 pr-8 tabular-nums"
          inputMode={decimal ? "decimal" : "numeric"}
          value={text}
          disabled={disabled}
          placeholder="0"
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={() => {
            const n = parseNum(text);
            if (n !== value) onCommit(n);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        {suffix && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-soft">{suffix}</span>}
      </div>
    </label>
  );
}

const SHORT: Record<string, string> = { Lunes: "Lu", Martes: "Ma", "Miércoles": "Mi", Jueves: "Ju", Viernes: "Vi", "Sábado": "Sá", Domingo: "Do" };

function Row({
  e, closed, sub, onChange,
}: {
  e: Entry; closed: boolean; sub?: SubmissionInfo; onChange: (patch: EntryPatch) => void;
}) {
  const [showNote, setShowNote] = useState(!!e.note);
  const num = (f: NumField, n: number) => onChange({ [f]: n });

  let fields: React.ReactNode;
  switch (e.role) {
    case "cocina":
      fields = (
        <>
          <NumInput key={`h${e.hours}`} label="Horas" value={e.hours} decimal disabled={closed} onCommit={(n) => num("hours", n)} suffix="hs" />
          <NumInput key={`r${e.rate}`} label="$ / hora" value={e.rate} disabled={closed} onCommit={(n) => num("rate", n)} />
        </>
      );
      break;
    case "empaque":
      fields = (
        <>
          <NumInput key={`d${e.days}`} label="Días" value={e.days} disabled={closed} onCommit={(n) => num("days", n)} />
          <NumInput key={`r${e.rate}`} label="$ / día" value={e.rate} disabled={closed} onCommit={(n) => num("rate", n)} />
        </>
      );
      break;
    case "fijo":
      fields = <NumInput key={`r${e.rate}`} label="Sueldo semanal" value={e.rate} disabled={closed} onCommit={(n) => num("rate", n)} />;
      break;
    case "delivery":
      fields = <NumInput key={`m${e.manualAmount}`} label="Sueldo" value={e.manualAmount} disabled={closed} onCommit={(n) => num("manualAmount", n)} />;
      break;
  }

  const pay = toPay(e);
  return (
    <li className="px-4 py-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(110px,1fr)_110px_110px_110px_120px] sm:items-end">
        <div className="col-span-2 flex items-center gap-2 self-center sm:col-span-1">
          <span className="font-semibold">{e.name}</span>
          <button
            type="button"
            className={`text-xs ${e.note ? "text-salmon" : "text-ink-soft"} hover:underline`}
            onClick={() => setShowNote((v) => !v)}
          >
            {e.note ? "nota" : "+ nota"}
          </button>
        </div>
        {fields}
        {(e.role === "fijo" || e.role === "delivery") && <div className="hidden sm:block" />}
        <NumInput key={`a${e.advance}`} label="Adelanto" value={e.advance} disabled={closed} onCommit={(n) => num("advance", n)} suffix="−" />
        <div className="text-right sm:pb-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-ink-soft sm:hidden">A pagar</div>
          <div className={`text-lg font-bold tabular-nums ${pay < 0 ? "text-salmon" : ""}`}>{money(pay)}</div>
          {e.advance !== 0 && <div className="text-xs text-ink-soft tabular-nums">{money(gross(e))} − {money(e.advance)}</div>}
        </div>
      </div>
      {e.role === "empaque" && (
        <div className="mt-2 text-xs text-ink-soft">
          {sub ? (
            <>
              Formulario: {sub.days.map((d) => SHORT[d] ?? d).join(", ")}
              {sub.doubleDays.length > 0 && <> · doble: {sub.doubleDays.map((d) => SHORT[d] ?? d).join(", ")}</>}
              {" "}= <b className="text-ink">{sub.days.length + sub.doubleDays.length} días</b>
              {sub.count > 1 && <> · envió {sub.count} veces, vale el último</>}
            </>
          ) : (
            "Todavía no completó el formulario."
          )}
        </div>
      )}
      {showNote && (
        <input
          className="field mt-2 py-1.5 text-sm"
          placeholder='Nota (ej: "47 + 4 faltantes")'
          defaultValue={e.note}
          disabled={closed}
          onBlur={(ev) => ev.target.value !== e.note && onChange({ note: ev.target.value })}
        />
      )}
    </li>
  );
}

export function WeekEditor({
  week, entries: initial, submissions,
}: {
  week: Week; entries: Entry[]; submissions: Record<number, SubmissionInfo>;
}) {
  const [rows, setRows] = useState(initial);
  const [saving, setSaving] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const closed = week.closed;

  const byRole = useMemo(() => {
    const m = new Map<Role, Entry[]>();
    for (const r of ROLE_ORDER) m.set(r, []);
    for (const e of rows) m.get(e.role)?.push(e);
    return m;
  }, [rows]);

  const total = rows.reduce((s, e) => s + toPay(e), 0);

  async function patch(id: number, p: EntryPatch) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
    setSaving((n) => n + 1);
    try {
      await updateEntry(id, p);
      setError(null);
    } catch {
      setError("No se pudo guardar. Revisá la conexión y volvé a intentar.");
    } finally {
      setSaving((n) => n - 1);
    }
  }

  return (
    <div className="pb-24">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{weekLabel(week.startDate)}</h1>
          <p className="text-sm text-ink-soft">
            {closed ? "Semana cerrada: no se puede editar." : saving > 0 ? "Guardando…" : "Los cambios se guardan solos."}
          </p>
        </div>
        <a href={`/semanas/${week.id}/pdf`} className="btn-accent" target="_blank" rel="noreferrer">Descargar PDF</a>
        <button className="btn-ghost" disabled={pending || saving > 0} onClick={() => start(() => setWeekClosed(week.id, !closed))}>
          {closed ? "Reabrir" : "Cerrar semana"}
        </button>
        <button
          className="btn-ghost text-salmon"
          disabled={pending}
          onClick={() => confirm("¿Eliminar esta semana y todo lo cargado?") && start(() => deleteWeek(week.id))}
        >
          Eliminar
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-salmon-soft px-4 py-2 text-sm text-salmon">{error}</div>}

      <div className="space-y-6">
        {ROLE_ORDER.map((role) => {
          const list = byRole.get(role) ?? [];
          if (list.length === 0) return null;
          const sub = list.reduce((s, e) => s + toPay(e), 0);
          return (
            <section key={role}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-bold">{ROLE_LABELS[role]}</h2>
                <span className="text-sm text-ink-soft">
                  Subtotal <b className="tabular-nums text-ink">{money(sub)}</b>
                </span>
              </div>
              <ul className="card divide-y divide-line">
                {list.map((e) => (
                  <Row key={e.id} e={e} closed={closed} sub={submissions[e.employeeId]} onChange={(p) => patch(e.id, p)} />
                ))}
              </ul>
            </section>
          );
        })}
        {rows.length === 0 && (
          <div className="card p-8 text-center text-ink-soft">Esta semana no tiene empleados. Agregalos en Empleados.</div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-ink-soft">Total a pagar</span>
          <span className="text-2xl font-bold tabular-nums">{money(total)}</span>
        </div>
      </div>
    </div>
  );
}
