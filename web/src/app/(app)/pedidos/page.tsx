import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate, fmtDateTime, orderNumber } from "@/lib/format";
import { isLate, lateDays, pieceState, progressPercent } from "@/lib/rules";
import { PIECE_STATE } from "@/lib/labels";
import { Flash, first } from "@/components/Flash";
import { SegmentBar } from "@/components/SegmentBar";
import { archiveOrder, restoreOrder } from "./actions";

export const metadata = { title: "Pedidos · METALTRACK" };
export const dynamic = "force-dynamic";

export default async function PedidosPage(props: PageProps<"/pedidos">) {
  const sp = await props.searchParams;
  const showArchived = first(sp.archivados) === "1";

  const orders = await db.order.findMany({
    where: showArchived ? { archivedAt: { not: null } } : { archivedAt: null },
    include: {
      client: true,
      piece: { include: { delivery: true, steps: { orderBy: { position: "asc" } } } },
    },
    orderBy: showArchived ? { archivedAt: "desc" } : { id: "desc" },
  });
  const now = new Date();

  const tab = (active: boolean) =>
    `inline-flex h-8 items-center rounded-md border px-3 text-[13px] font-medium ${
      active ? "border-steel bg-steel text-white" : "border-[#c3cbd9] bg-white hover:bg-[#f3f5f9]"
    }`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Pedidos</h1>
          <p className="mt-0.5 text-[13px] text-muted">Cada pedido corresponde a una única pieza</p>
        </div>
        <Link href="/pedidos/nuevo" className="inline-flex h-9 items-center gap-2 rounded-md bg-electric px-3.5 text-[13px] font-semibold text-white hover:bg-electric-dark">
          + Nuevo pedido
        </Link>
      </div>

      <Flash ok={first(sp.ok)} error={first(sp.error)} />

      <div className="flex gap-1.5">
        <Link href="/pedidos" className={tab(!showArchived)}>Activos</Link>
        <Link href="/pedidos?archivados=1" className={tab(showArchived)}>Ver archivados</Link>
      </div>

      <section className="overflow-hidden rounded-md border border-line bg-white">
        {orders.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">
            {showArchived ? "No hay pedidos archivados." : "Todavía no hay pedidos. Crea el primero con «Nuevo pedido»."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f6f7fa] text-left text-[11px] font-semibold tracking-wide text-muted">
                  <th className="h-[34px] px-3">Pedido</th>
                  <th className="px-3">Pieza · cliente</th>
                  <th className="px-3">Ingreso</th>
                  <th className="px-3">Entrega est.</th>
                  <th className="px-3">Estado</th>
                  <th className="min-w-40 px-3">Avance</th>
                  <th className="px-3 text-right">{showArchived ? "Archivado" : "Acción"}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const steps = o.piece?.steps ?? [];
                  const delivered = !!o.piece?.delivery;
                  const state = PIECE_STATE[pieceState(steps, delivered)];
                  const late = isLate(o.dueDate, delivered, now);
                  return (
                    <tr key={o.id} className="border-t border-[#e4e8ef] align-middle">
                      <td className="h-[52px] px-3 font-mono font-semibold">{orderNumber(o.id)}</td>
                      <td className="px-3">
                        <div className="font-semibold leading-tight">{o.piece?.name}</div>
                        <div className="text-xs text-muted">{o.client.name}</div>
                      </td>
                      <td className="px-3 font-mono text-xs">{fmtDate(o.entryDate)}</td>
                      <td className={`px-3 font-mono text-xs ${late ? "font-semibold text-late" : ""}`}>
                        {fmtDate(o.dueDate)}
                        {late && ` · −${lateDays(o.dueDate, now)} d`}
                      </td>
                      <td className="px-3">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <i className={`inline-block size-2 rounded-full ${state.dot}`} />
                          {state.label}
                        </span>
                      </td>
                      <td className="px-3">
                        <div className="flex items-center gap-2">
                          <SegmentBar statuses={steps.map((s) => s.status)} late={late} />
                          <span className="w-10 text-right font-mono text-xs font-semibold">{progressPercent(steps)}%</span>
                        </div>
                      </td>
                      <td className="px-3 text-right">
                        {showArchived ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-muted">
                              {o.archivedAt && fmtDateTime(o.archivedAt)} · {o.archivedBy}
                            </span>
                            <span className="max-w-56 text-xs italic text-muted">«{o.archiveReason}»</span>
                            <form action={restoreOrder}>
                              <input type="hidden" name="orderId" value={o.id} />
                              <button type="submit" className="h-8 rounded-md border border-[#c3cbd9] px-2.5 text-xs font-semibold hover:bg-[#f3f5f9]">
                                Restaurar
                              </button>
                            </form>
                          </div>
                        ) : (
                          <details className="inline-block text-left">
                            <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-md border border-[#c3cbd9] px-2.5 text-xs font-semibold hover:bg-[#f3f5f9]">
                              Archivar
                            </summary>
                            <form action={archiveOrder} className="mt-2 flex w-64 flex-col gap-2 rounded-md border border-line bg-[#f6f7fa] p-3">
                              <input type="hidden" name="orderId" value={o.id} />
                              <label className="flex flex-col gap-1">
                                <span className="text-[11px] font-semibold text-muted">Motivo del archivado</span>
                                <input name="reason" required minLength={3} maxLength={300} placeholder="Ej.: cancelado por el cliente" className="h-9 rounded-md border border-[#c3cbd9] px-2 text-[13px]" />
                              </label>
                              <p className="text-[11px] text-muted">No se borra: queda en «Ver archivados» y en la bitácora.</p>
                              <button type="submit" className="h-9 rounded-md bg-steel text-xs font-semibold text-white hover:bg-navy">
                                Confirmar archivado
                              </button>
                            </form>
                          </details>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
