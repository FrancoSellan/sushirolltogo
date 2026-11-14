"use client";
import { useActionState, useState } from "react";
import { submitPacking } from "@/lib/actions";
import { DAYS } from "@/lib/calc";

function Question({ n, title, required, hint, children }: { n: number; title: React.ReactNode; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="card mt-4 p-6">
      <legend className="sr-only">{typeof title === "string" ? title : `Pregunta ${n}`}</legend>
      <div className="font-medium">
        {n}. {title} {required && <span className="text-salmon">*</span>}
      </div>
      {hint && <p className="mt-1 text-sm italic text-ink-soft">{hint}</p>}
      <div className="mt-4">{children}</div>
    </fieldset>
  );
}

function DayChecks({ name }: { name: string }) {
  return (
    <div className="grid gap-1">
      {DAYS.map((d) => (
        <label key={d} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-paper">
          <input type="checkbox" name={name} value={d} className="size-5 accent-salmon" />
          <span>{d}</span>
        </label>
      ))}
    </div>
  );
}

export function PackingForm({ people }: { people: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(submitPacking, null);
  const [clientError, setClientError] = useState<string | null>(null);

  if (state?.ok) {
    return (
      <div className="card mt-4 p-6">
        <h2 className="text-lg font-semibold">¡Listo! Se registró tu respuesta.</h2>
        <p className="mt-1 text-sm text-ink-soft">Si te equivocaste, podés enviarlo de nuevo: vale el último envío.</p>
        <button className="mt-4 text-sm font-semibold text-salmon underline" onClick={() => location.reload()}>
          Enviar otra respuesta
        </button>
      </div>
    );
  }

  return (
    <form
      action={action}
      onSubmit={(e) => {
        // Validar antes de enviar, así no se borra lo marcado.
        const days = new FormData(e.currentTarget).getAll("days");
        if (days.length === 0) {
          e.preventDefault();
          setClientError("Marcá al menos un día trabajado.");
        } else setClientError(null);
      }}
    >
      <Question n={1} title="Correo electrónico" required>
        <input name="email" type="email" autoComplete="email" required className="field" placeholder="Tu correo" />
      </Question>

      <Question n={2} title="Nombre" required hint="Marca solo un óvalo.">
        <div className="grid gap-1">
          {people.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-paper">
              <input type="radio" name="employeeId" value={p.id} required className="size-5 accent-salmon" />
              <span>{p.name}</span>
            </label>
          ))}
          {people.length === 0 && <p className="text-sm text-ink-soft">No hay empaquetadores cargados.</p>}
        </div>
      </Question>

      <Question n={3} title="Días que se trabajó en la semana" required hint="Selecciona todas las opciones que correspondan.">
        <DayChecks name="days" />
      </Question>

      <Question
        n={4}
        title={
          <>
            Días que se trabajó doble
            <br />
            <span className="font-normal">(en caso de no haber trabajado doble ningun día, omitir esta pregunta).</span>
          </>
        }
        hint="Selecciona todas las opciones que correspondan."
      >
        <DayChecks name="doubleDays" />
      </Question>

      {(clientError || state?.error) && (
        <p className="mt-4 rounded-lg bg-salmon-soft px-4 py-3 text-sm text-salmon">{clientError ?? state?.error}</p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <button className="btn-accent px-6" disabled={pending}>{pending ? "Enviando…" : "Enviar"}</button>
        <button type="reset" className="text-sm text-ink-soft hover:text-ink">Borrar formulario</button>
      </div>
    </form>
  );
}
