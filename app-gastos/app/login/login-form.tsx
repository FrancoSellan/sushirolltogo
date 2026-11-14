"use client";
import { useActionState } from "react";
import { login } from "@/lib/actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-6 space-y-3 text-left">
      <input name="password" type="password" className="field" placeholder="Contraseña" autoFocus required />
      {error && <p className="text-sm text-salmon">{error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
