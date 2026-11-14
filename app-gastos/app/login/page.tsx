import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <Image src="/logo.png" alt="SushiRoll" width={96} height={96} className="mx-auto" priority />
        <h1 className="mt-4 text-xl font-bold">Sueldos SushiRoll</h1>
        <p className="mt-1 text-sm text-ink-soft">Ingresá tu contraseña</p>
        <LoginForm />
      </div>
    </main>
  );
}
