import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate, fmtDuration, orderNumber } from "@/lib/format";
import { isLate, lateDays, pieceState, progressPercent, type PieceState } from "@/lib/rules";
import { PIECE_STATE, parseDateInput } from "@/lib/labels";
import { currentProcessName, qs } from "@/lib/derive";
import { SegmentBar } from "@/components/SegmentBar";

export const metadata = { title: "Todas las piezas · METALTRACK" };
export const dynamic = "force-dynamic";

const PER_PAGE = 10;
const CHIPS = [
  ["todas", "Todas"],
  ["PENDING", "Pendientes"],
  ["IN_PROGRESS", "En proceso"],
  ["atrasadas", "Atrasadas"],
  ["READY", "Listas"],
  ["DELIVERED", "Entregadas"],
] as const;
const SORTS: Record<string, string> = {
  "ingreso-desc": "Ingreso · más reciente",
  "ingreso-asc": "Ingreso · más antiguo",
  "entrega-asc": "Entrega · más próxima",
  "entrega-desc": "Entrega · más lejana",
  "avance-desc": "Mayor avance",
};

const f = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const input = "h-9 w-full rounded-md border border-[#c3cbd9] bg-white px-2.5 text-[13px]";

export default async function PiezasPage(props: PageProps<"/piezas">) {
  const sp = await props.searchParams;
  const p = {
    q: f(sp.q).trim(),
    estado: f(sp.estado) || "todas",
    cliente: f(sp.cliente),
    proceso: f(sp.proceso),
    orden: SORTS[f(sp.orden)] ? f(sp.orden) : "ingreso-desc",
    desde: f(sp.desde),
    hasta: f(sp.hasta),
    page: Math.max(1, Number(f(sp.page)) || 1),
    sel: f(sp.sel),
  };
  const now = new Date();

  const [orders, clients, catalog] = await Promise.all([
    db.order.findMany({
      where: { archivedAt: null, piece: { isNot: null } },
      include: {
        client: true,
        piece: { include: { delivery: true, steps: { orderBy: { position: "asc" }, include: { processType: true } } } },
      },
    }),
    db.client.findMany({ orderBy: { name: "asc" } }),
    db.processType.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows = orders.map((o) => {
    const piece = o.piece!;
    const delivered = !!piece.delivery;
    const state = pieceState(piece.steps, delivered);
    return {
      o,
      piece,
      state,
      late: isLate(o.dueDate, delivered, now),
      percent: progressPercent(piece.steps),
      proc: currentProcessName(piece.steps, state),
    };
  });

  const count = (fn: (r: (typeof rows)[number]) => boolean) => rows.filter(fn).length;
  const counts: Record<string, number> = {
    todas: rows.length,
    atrasadas: count((r) => r.late),
    ...Object.fromEntries((["PENDING", "IN_PROGRESS", "READY", "DELIVERED"] as PieceState[]).map((s) => [s, count((r) => r.state === s)])),
  };

  const from = parseDateInput(p.desde);
  const to = parseDateInput(p.hasta);
  const q = p.q.toLowerCase();
  const filtered = rows
    .filter((r) => {
      if (p.estado === "atrasadas" ? !r.late : p.estado !== "todas" && r.state !== p.estado) return false;
      if (p.cliente && r.o.client.name !== p.cliente) return false;
      if (p.proceso && r.proc !== p.proceso) return false;
      if (from && r.o.entryDate < from) return false;
      if (to && r.o.entryDate > to) return false;
      if (q && !`${orderNumber(r.o.id)} ${r.piece.name} ${r.o.client.name}`.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      switch (p.orden) {
        case "ingreso-asc": return a.o.entryDate.getTime() - b.o.entryDate.getTime() || a.o.id - b.o.id;
        case "entrega-asc": return a.o.dueDate.getTime() - b.o.dueDate.getTime();
        case "entrega-desc": return b.o.dueDate.getTime() - a.o.dueDate.getTime();
        case "avance-desc": return b.percent - a.percent;
        default: return b.o.entryDate.getTime() - a.o.entryDate.getTime() || b.o.id - a.o.id;
      }
    });

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(p.page, pages);
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sel = filtered.find((r) => String(r.o.id) === p.sel) ?? visible[0] ?? null;

  // Parámetros actuales, para armar enlaces que conservan los filtros.
  const base = {
    q: p.q || undefined,
    estado: p.estado === "todas" ? undefined : p.estado,
    cliente: p.cliente || undefined,
    proceso: p.proceso || undefined,
    orden: p.orden === "ingreso-desc" ? undefined : p.orden,
    desde: p.desde || undefined,
    hasta: p.hasta || undefined,
  };
  const href = (extra: Record<string, string | undefined>) => qs("/piezas", { ...base, ...extra });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Todas las piezas</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            Centro operativo · <span className="font-mono">{rows.length}</span> piezas activas
          </p>
        </div>
        <Link href="/pedidos/nuevo" className="inline-flex h-9 items-center gap-2 rounded-md bg-electric px-3.5 text-[13px] font-semibold text-white hover:bg-electric-dark">
          + Nuevo pedido
        </Link>
      </div>

      <section className="flex flex-col gap-3 rounded-md border border-line bg-white px-3.5 py-3">
        <div className="flex flex-wrap gap-1.5">
          {CHIPS.map(([key, label]) => (
            <Link
              key={key}
              href={href({ estado: key === "todas" ? undefined : key, page: undefined, sel: undefined })}
              className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-[13px] font-medium ${
                p.estado === key ? "border-steel bg-steel text-white" : "border-[#c3cbd9] bg-white hover:bg-[#f3f5f9]"
              }`}
            >
              {label}<span className="font-mono text-xs opacity-75">{counts[key]}</span>
            </Link>
          ))}
        </div>
        <form method="get" className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] items-end gap-2.5">
          {base.estado && <input type="hidden" name="estado" value={base.estado} />}
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted">Buscar</span>
            <input name="q" type="search" defaultValue={p.q} placeholder="N.º de pedido, pieza o cliente" className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted">Cliente</span>
            <select name="cliente" defaultValue={p.cliente} className={input}>
              <option value="">Todos</option>
              {clients.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted">Proceso actual</span>
            <select name="proceso" defaultValue={p.proceso} className={input}>
              <option value="">Todos</option>
              {catalog.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="Entrega">Entrega (lista)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted">Ordenar por</span>
            <select name="orden" defaultValue={p.orden} className={input}>
              {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted">Ingreso desde</span>
            <input name="desde" type="date" defaultValue={p.desde} className={`${input} font-mono`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted">Ingreso hasta</span>
            <input name="hasta" type="date" defaultValue={p.hasta} className={`${input} font-mono`} />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="h-9 flex-1 rounded-md bg-steel text-[13px] font-semibold text-white hover:bg-navy">Aplicar</button>
            <Link href="/piezas" className="inline-flex h-9 items-center rounded-md border border-[#c3cbd9] px-3 text-[13px] font-semibold hover:bg-[#f3f5f9]">Limpiar</Link>
          </div>
        </form>
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <section className="min-w-0 flex-[3_1_640px] overflow-hidden rounded-md border border-line bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f6f7fa] text-left text-[11px] font-semibold tracking-wide text-muted">
                  <th className="h-[34px] px-3">Pedido</th>
                  <th className="px-3">Pieza · cliente</th>
                  <th className="px-3">Ingreso</th>
                  <th className="px-3">Proceso actual</th>
                  <th className="px-3">Estado</th>
                  <th className="min-w-44 px-3">Avance</th>
                  <th className="px-3">Entrega est.</th>
                  <th className="w-11 px-3" />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Ninguna pieza coincide con los filtros.</td></tr>
                )}
                {visible.map((r) => {
                  const on = sel?.o.id === r.o.id;
                  return (
                    <tr key={r.o.id} className={`border-t border-[#e4e8ef] ${on ? "bg-[#eef3ff] shadow-[inset_3px_0_0_#1f5bff]" : r.late ? "shadow-[inset_3px_0_0_#c0291b]" : ""}`}>
                      <td className="h-[52px] px-3 font-mono font-semibold">
                        <Link href={href({ sel: String(r.o.id), page: page > 1 ? String(page) : undefined })} className="hover:text-electric-dark">{orderNumber(r.o.id)}</Link>
                      </td>
                      <td className="px-3">
                        <div className="font-semibold leading-tight">{r.piece.name}</div>
                        <div className="text-xs text-muted">{r.o.client.name}</div>
                      </td>
                      <td className="px-3 font-mono text-xs">{fmtDate(r.o.entryDate)}</td>
                      <td className="px-3">{r.proc}</td>
                      <td className="px-3">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <i className={`inline-block size-2 rounded-full ${PIECE_STATE[r.state].dot}`} />
                          {PIECE_STATE[r.state].label}
                        </span>
                      </td>
                      <td className="px-3">
                        <div className="flex items-center gap-2">
                          <SegmentBar statuses={r.piece.steps.map((s) => s.status)} late={r.late} />
                          <span className="w-16 text-right font-mono text-xs"><b>{r.percent}%</b> <span className="text-muted">{r.piece.steps.filter((s) => s.status === "DONE").length}/{r.piece.steps.length}</span></span>
                        </div>
                      </td>
                      <td className={`whitespace-nowrap px-3 font-mono text-xs ${r.late ? "font-semibold text-late" : ""}`}>
                        {fmtDate(r.o.dueDate)}{r.late && ` · −${lateDays(r.o.dueDate, now)} d`}
                      </td>
                      <td className="px-3">
                        <Link href={`/seguimiento?pedido=${r.o.id}`} aria-label={`Abrir seguimiento de ${orderNumber(r.o.id)}`} title="Abrir seguimiento" className="flex size-8 items-center justify-center rounded-md text-electric-dark hover:bg-[#eef3ff]">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e8ef] px-3.5 py-2.5 text-xs text-muted">
            <span className="font-mono">{filtered.length ? `${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, filtered.length)}` : "0"} de {filtered.length}</span>
            <span className="flex flex-wrap gap-1">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={href({ page: n > 1 ? String(n) : undefined })} className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 font-mono ${n === page ? "border-steel bg-steel text-white" : "border-[#c3cbd9] bg-white hover:bg-[#f3f5f9]"}`}>
                  {n}
                </Link>
              ))}
            </span>
          </div>
        </section>

        <aside className="min-w-0 flex-[1_1_300px] rounded-md border border-line bg-white">
          <h2 className="flex h-10 items-center justify-between border-b border-[#e4e8ef] px-3.5 text-[11px] font-bold uppercase tracking-[.08em] text-steel">
            Vista previa {sel && <span className="font-mono tracking-normal">{orderNumber(sel.o.id)}</span>}
          </h2>
          {!sel ? (
            <p className="px-4 py-7 text-center text-[13px] text-muted">Selecciona una pieza para ver su vista previa.</p>
          ) : (
            <div className="flex flex-col gap-3.5 p-3.5">
              <div>
                <div className="text-base font-bold">{sel.piece.name}</div>
                <div className="text-[13px] text-muted">{sel.o.client.name}</div>
              </div>
              <dl className="grid grid-cols-[92px_1fr] gap-x-2.5 gap-y-2 text-[13px]">
                <dt className="text-muted">Material</dt><dd>{sel.piece.material}</dd>
                <dt className="text-muted">Medidas</dt><dd className="font-mono text-xs">{sel.piece.measures ?? "—"}</dd>
                <dt className="text-muted">Ingreso</dt><dd className="font-mono text-xs">{fmtDate(sel.o.entryDate)}</dd>
                <dt className="text-muted">Entrega est.</dt><dd className="font-mono text-xs">{fmtDate(sel.o.dueDate)}</dd>
              </dl>
              <div className="border-t border-[#e4e8ef] pt-3">
                <div className="mb-2 text-[11px] font-semibold tracking-wider text-muted">RECORRIDO</div>
                {sel.piece.steps.map((s, i) => (
                  <div key={s.id} className={`grid min-h-[34px] grid-cols-[22px_1fr_auto] items-center gap-2 text-[13px] ${s.status === "IN_PROGRESS" ? "font-semibold text-ink" : "text-muted"}`}>
                    <span className={`flex size-5 items-center justify-center rounded-sm font-mono text-[11px] ${s.status === "DONE" ? "bg-steel text-white" : s.status === "IN_PROGRESS" ? "bg-electric text-white" : "bg-[#e4e8ef] text-muted"}`}>{i + 1}</span>
                    <span>{s.processType.name}</span>
                    <span className="text-xs font-medium">
                      {s.status === "DONE" ? "Terminado" : s.status === "IN_PROGRESS" ? `En proceso · ${fmtDuration(now.getTime() - s.startedAt!.getTime())}` : "Pendiente"}
                    </span>
                  </div>
                ))}
              </div>
              <Link href={`/seguimiento?pedido=${sel.o.id}`} className="inline-flex h-10 items-center justify-center rounded-md bg-electric text-[13px] font-semibold text-white hover:bg-electric-dark">
                Abrir seguimiento
              </Link>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
