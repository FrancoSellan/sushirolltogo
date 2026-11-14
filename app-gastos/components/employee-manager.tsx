"use client";
import { useState, useTransition } from "react";
import type { Employee, Role } from "@/lib/schema";
import { RATE_LABELS, ROLE_LABELS, ROLE_ORDER, money } from "@/lib/calc";
import { deleteEmployee, saveEmployee, setEmployeeActive } from "@/lib/actions";

function EmployeeForm({ initial, onDone }: { initial?: Employee; onDone?: () => void }) {
  const [role, setRole] = useState<Role>(initial?.role ?? "cocina");
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) =>
        start(async () => {
          await saveEmployee(fd);
          onDone?.();
        })
      }
      className="grid gap-3 sm:grid-cols-[1fr_180px_180px_auto] sm:items-end"
    >
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-soft">Nombre</span>
        <input name="name" defaultValue={initial?.name} className="field" required placeholder="Ej: Euge" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-soft">Rol</span>
        <select name="role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="field">
          {ROLE_ORDER.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-soft">{RATE_LABELS[role]}</span>
        {role === "delivery" ? (
          <input className="field" disabled value="Se carga a mano cada semana" readOnly />
        ) : (
          <input name="rate" type="number" inputMode="numeric" min={0} defaultValue={initial?.rate || ""} className="field" required placeholder="$" />
        )}
      </label>
      <div className="flex gap-2">
        <button className="btn-primary" disabled={pending}>{initial ? "Guardar" : "Agregar"}</button>
        {onDone && initial && (
          <button type="button" className="btn-ghost" onClick={onDone}>Cancelar</button>
        )}
      </div>
    </form>
  );
}

function rateText(e: Employee) {
  switch (e.role) {
    case "cocina": return `${money(e.rate)} / hora`;
    case "empaque": return `${money(e.rate)} / día`;
    case "fijo": return `${money(e.rate)} / semana`;
    case "delivery": return "Monto manual";
  }
}

function EmployeeRow({ e }: { e: Employee }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  if (editing) {
    return (
      <li className="bg-paper/60 px-4 py-4">
        <EmployeeForm initial={e} onDone={() => setEditing(false)} />
      </li>
    );
  }
  return (
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${e.active ? "" : "opacity-55"}`}>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">
          {e.name} {!e.active && <span className="ml-1 text-xs font-normal text-ink-soft">(inactivo)</span>}
        </div>
        <div className="text-sm text-ink-soft tabular-nums">{rateText(e)}</div>
      </div>
      <div className="flex gap-1.5">
        <button className="btn-ghost px-3 py-1.5" onClick={() => setEditing(true)}>Editar</button>
        <button
          className="btn-ghost px-3 py-1.5"
          disabled={pending}
          onClick={() => start(() => setEmployeeActive(e.id, !e.active))}
        >
          {e.active ? "Desactivar" : "Activar"}
        </button>
        <button
          className="btn-ghost px-3 py-1.5 text-salmon"
          disabled={pending}
          onClick={() => {
            if (confirm(`¿Eliminar a ${e.name}? Las semanas cerradas conservan su sueldo. Si sólo dejó de trabajar, mejor desactivalo.`))
              start(() => deleteEmployee(e.id));
          }}
        >
          Eliminar
        </button>
      </div>
    </li>
  );
}

export function EmployeeManager({ employees }: { employees: Employee[] }) {
  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Agregar empleado</h2>
        <EmployeeForm key={employees.length} />
        <p className="mt-3 text-xs text-ink-soft">
          Si alguien trabaja en dos roles, crealo dos veces con el mismo nombre (uno por rol).
          Los cambios de sueldo se aplican a la semana abierta; las semanas cerradas no se modifican.
        </p>
      </section>

      {ROLE_ORDER.map((role) => {
        const list = employees
          .filter((e) => e.role === role)
          .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
        return (
          <section key={role}>
            <h3 className="mb-2 flex items-baseline gap-2 font-bold">
              {ROLE_LABELS[role]} <span className="text-sm font-normal text-ink-soft">{list.filter((e) => e.active).length} activos</span>
            </h3>
            {list.length === 0 ? (
              <div className="card px-4 py-5 text-sm text-ink-soft">Sin empleados.</div>
            ) : (
              <ul className="card divide-y divide-line overflow-hidden">
                {list.map((e) => <EmployeeRow key={e.id} e={e} />)}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
