"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Semanas" },
  { href: "/empleados", label: "Empleados" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="flex gap-1">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" || path.startsWith("/semanas") : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${active ? "bg-ink text-white" : "text-ink-soft hover:bg-white"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
