import Link from "next/link";
import Image from "next/image";
import { logout } from "@/lib/actions";
import { NavLinks } from "@/components/nav-links";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="SushiRoll" width={36} height={36} className="rounded-full" />
            <span className="hidden font-bold tracking-tight sm:inline">SushiRoll · Sueldos</span>
          </Link>
          <NavLinks />
          <form action={logout} className="ml-auto">
            <button className="text-sm text-ink-soft hover:text-ink">Salir</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
