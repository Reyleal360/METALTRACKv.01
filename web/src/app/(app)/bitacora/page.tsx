import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDateTime, orderNumber } from "@/lib/format";
import { qs } from "@/lib/derive";
import { LOG_GROUPS, logGroupOf, logText, type LogGroup } from "@/lib/logText";

export const metadata = { title: "Bitácora · METALTRACK" };
export const dynamic = "force-dynamic";

const PER_PAGE = 15;
const f = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const input = "h-10 w-full rounded-md border border-[#c3cbd9] bg-white px-2.5 text-[13px]";

export default async function BitacoraPage(props: PageProps<"/bitacora">) {
  const sp = await props.searchParams;
  const q = f(sp.q).trim();
  const tipo = (f(sp.tipo) in LOG_GROUPS ? f(sp.tipo) : "") as LogGroup | "";
  const pageWanted = Math.max(1, Number(f(sp.page)) || 1);

  const all = await db.logEntry.findMany({
    where: tipo ? { kind: { in: [...LOG_GROUPS[tipo].kinds] } } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      user: { select: { name: true } },
      order: { include: { client: true, piece: { select: { name: true } } } },
    },
  });

  const needle = q.toLowerCase();
  const rows = needle
    ? all.filter((l) =>
        `${orderNumber(l.orderId)} ${l.order.piece?.name ?? ""} ${l.order.client.name} ${logText(l)}`.toLowerCase().includes(needle),
      )
    : all;

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const page = Math.min(pageWanted, pages);
  const visible = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const href = (n: number) => qs("/bitacora", { q: q || undefined, tipo: tipo || undefined, page: n > 1 ? String(n) : undefined });

  return (
    <>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Bitácora</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Historial de cambios de estado, observaciones, entregas y archivados · <span className="font-mono">{all.length}</span> eventos · solo lectura
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-md border border-line bg-white px-3.5 py-3">
        <label className="flex min-w-60 flex-[1_1_280px] flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted">Buscar</span>
          <input name="q" type="search" defaultValue={q} placeholder="Pedido, pieza, cliente o texto" className={input} />
        </label>
        <label className="flex flex-[0_1_200px] flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted">Tipo de evento</span>
          <select name="tipo" defaultValue={tipo} className={input}>
            <option value="">Todos los eventos</option>
            {Object.entries(LOG_GROUPS).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
          </select>
        </label>
        <button type="submit" className="h-10 rounded-md bg-steel px-4 text-[13px] font-semibold text-white hover:bg-navy">Aplicar</button>
        <Link href="/bitacora" className="inline-flex h-10 items-center rounded-md border border-[#c3cbd9] px-3.5 text-[13px] font-semibold hover:bg-[#f3f5f9]">Limpiar</Link>
      </form>

      <section className="overflow-hidden rounded-md border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f6f7fa] text-left text-[11px] font-semibold tracking-wide text-muted">
                <th className="h-[34px] px-3">Fecha y hora</th>
                <th className="px-3">Pedido</th>
                <th className="px-3">Pieza · cliente</th>
                <th className="px-3">Tipo</th>
                <th className="px-3">Detalle</th>
                <th className="px-3">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No hay eventos que coincidan.</td></tr>
              )}
              {visible.map((l) => (
                <tr key={l.id} className="border-t border-[#e4e8ef]">
                  <td className="h-[46px] whitespace-nowrap px-3 font-mono text-xs">{fmtDateTime(l.createdAt)}</td>
                  <td className="px-3 font-mono font-semibold">
                    <Link href={`/seguimiento?pedido=${l.orderId}`} className="hover:text-electric-dark">{orderNumber(l.orderId)}</Link>
                  </td>
                  <td className="px-3">{l.order.piece?.name} <span className="text-muted">· {l.order.client.name}</span></td>
                  <td className="px-3">
                    <span className="inline-block whitespace-nowrap rounded-sm bg-[#e4ebf3] px-2 py-0.5 text-[11px] font-semibold text-steel">
                      {LOG_GROUPS[logGroupOf(l.kind)].label}
                    </span>
                  </td>
                  <td className="px-3">{logText(l)}</td>
                  <td className="px-3 text-muted">{l.user?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e8ef] px-3.5 py-2.5 text-xs text-muted">
          <span className="font-mono">{rows.length ? `${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, rows.length)}` : "0"} de {rows.length}</span>
          <span className="flex flex-wrap gap-1">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={href(n)} className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 font-mono ${n === page ? "border-steel bg-steel text-white" : "border-[#c3cbd9] bg-white hover:bg-[#f3f5f9]"}`}>
                {n}
              </Link>
            ))}
          </span>
        </div>
      </section>
    </>
  );
}
