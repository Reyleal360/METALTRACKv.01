"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

// ready=false: la pantalla todavía no existe en esta versión del código.
const NAV = [
  { group: "PRINCIPAL", label: "Dashboard", href: "/", ready: true },
  { group: "OPERACIÓN", label: "Pedidos", href: "/pedidos", ready: true },
  { group: "", label: "Todas las piezas", href: "/piezas", ready: true },
  { group: "", label: "Seguimiento", href: "/seguimiento", ready: true },
  { group: "", label: "Entregas", href: "/entregas", ready: true },
  { group: "REGISTRO", label: "Bitácora", href: "/bitacora", ready: true },
  { group: "SISTEMA", label: "Catálogo de procesos", href: "/catalogo", ready: true },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col gap-5 bg-navy px-2.5 py-4 text-[#a9b4c9] md:w-54 md:shrink-0">
      <div className="flex items-center gap-2.5 px-1.5">
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M0 0h26l6 6v26H0z" fill="#1F5BFF" />
          <rect x="6" y="9" width="6" height="3" fill="#fff" />
          <rect x="14" y="9" width="6" height="3" fill="#fff" />
          <rect x="22" y="9" width="4" height="3" fill="#fff" opacity=".35" />
          <rect x="6" y="15" width="12" height="3" fill="#fff" />
          <rect x="20" y="15" width="6" height="3" fill="#fff" opacity=".35" />
          <rect x="6" y="21" width="4" height="3" fill="#fff" />
          <rect x="12" y="21" width="14" height="3" fill="#fff" opacity=".35" />
        </svg>
        <div>
          <div className="text-[15px] font-bold tracking-[.1em] text-white">METALTRACK</div>
          <div className="text-[11px] text-[#7c89a2]">Control de taller</div>
        </div>
      </div>

      <nav aria-label="Principal" className="flex flex-row gap-0.5 overflow-x-auto md:flex-col">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <div key={item.href}>
              {item.group && (
                <div className="hidden px-2.5 pb-1 pt-2.5 text-[10px] font-semibold tracking-[.12em] text-[#7c89a2] md:block">
                  {item.group}
                </div>
              )}
              {item.ready ? (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-11 items-center whitespace-nowrap rounded-sm border-l-2 px-2.5 text-[13px] font-medium transition-colors md:h-9 ${
                    active
                      ? "border-[#5b8cff] bg-[#16264a] text-white"
                      : "border-transparent hover:bg-[#13203a] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="flex h-11 items-center justify-between gap-2 whitespace-nowrap rounded-sm border-l-2 border-transparent px-2.5 text-[13px] font-medium text-[#5d6a84] md:h-9"
                >
                  {item.label}
                  <span className="text-[10px] font-semibold uppercase tracking-wider">pronto</span>
                </span>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto hidden flex-col gap-2 border-t border-[#1b2a47] p-2.5 text-xs text-[#7c89a2] md:flex">
        <span>Sesión: {userName}</span>
        <form action={logout}>
          <button
            type="submit"
            className="h-8 w-full rounded-md border border-[#2a3a5c] text-xs text-[#a9b4c9] transition-colors hover:bg-[#13203a] hover:text-white"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
