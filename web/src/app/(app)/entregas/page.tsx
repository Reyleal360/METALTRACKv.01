import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate, fmtDateTime, orderNumber } from "@/lib/format";
import { pieceState } from "@/lib/rules";
import { toDateTimeInput } from "@/lib/labels";
import { qs } from "@/lib/derive";
import { Flash, first } from "@/components/Flash";
import { SegmentBar } from "@/components/SegmentBar";
import { registerDelivery } from "./actions";

export const metadata = { title: "Entregas · METALTRACK" };
export const dynamic = "force-dynamic";

const panelHead = "flex h-10 items-center justify-between border-b border-[#e4e8ef] px-3.5 text-[11px] font-bold uppercase tracking-[.08em] text-steel";
const field = "h-10 w-full rounded-md border border-[#c3cbd9] bg-white px-2.5 text-[13px] read-only:bg-[#f6f7fa]";

export default async function EntregasPage(props: PageProps<"/entregas">) {
  const sp = await props.searchParams;
  const vista = first(sp.vista) === "entregadas" ? "entregadas" : first(sp.vista) === "todas" ? "todas" : "por";

  const orders = await db.order.findMany({
    where: { archivedAt: null, piece: { isNot: null } },
    include: {
      client: true,
      piece: { include: { delivery: true, steps: { orderBy: { position: "asc" } } } },
    },
  });
  const ready = orders
    .filter((o) => pieceState(o.piece!.steps, !!o.piece!.delivery) === "READY")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const done = orders
    .filter((o) => o.piece!.delivery)
    .sort((a, b) => b.piece!.delivery!.deliveredAt.getTime() - a.piece!.delivery!.deliveredAt.getTime());

  const list = vista === "por" ? ready : vista === "entregadas" ? done : [...ready, ...done];
  const selected = ready.find((o) => o.id === Number(first(sp.pedido))) ?? ready[0] ?? null;

  const chip = (key: string, label: string, n: number) => (
    <Link
      key={key}
      href={qs("/entregas", { vista: key === "por" ? undefined : key })}
      className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-[13px] font-medium ${
        vista === key ? "border-steel bg-steel text-white" : "border-[#c3cbd9] bg-white hover:bg-[#f3f5f9]"
      }`}
    >
      {label}<span className="font-mono text-xs opacity-75">{n}</span>
    </Link>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Entregas</h1>
          <p className="mt-0.5 text-[13px] text-muted">Solo se entregan piezas con todos sus procesos terminados</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chip("por", "Por entregar", ready.length)}
          {chip("entregadas", "Entregadas", done.length)}
          {chip("todas", "Todas", ready.length + done.length)}
        </div>
      </div>

      <Flash ok={first(sp.ok)} error={first(sp.error)} />

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_620px] flex-col gap-4">
          <section className="overflow-hidden rounded-md border border-line bg-white">
            <h2 className={panelHead}>
              {vista === "entregadas" ? "Piezas entregadas" : "Piezas por entregar"}
              <span className="font-mono font-medium tracking-normal text-muted">{list.length}</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#f6f7fa] text-left text-[11px] font-semibold tracking-wide text-muted">
                    <th className="h-[34px] px-3">Pedido</th>
                    <th className="px-3">Pieza · cliente</th>
                    <th className="min-w-36 px-3">Procesos</th>
                    <th className="px-3">Entrega est.</th>
                    <th className="px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-7 text-center text-muted">No hay piezas en esta lista.</td></tr>
                  )}
                  {list.map((o) => {
                    const p = o.piece!;
                    const isSel = selected?.id === o.id && !p.delivery;
                    return (
                      <tr key={o.id} className={`border-t border-[#e4e8ef] ${isSel ? "bg-[#eef3ff] shadow-[inset_3px_0_0_#1f5bff]" : ""}`}>
                        <td className="h-[52px] px-3 font-mono font-semibold">{orderNumber(o.id)}</td>
                        <td className="px-3">
                          <div className="font-semibold leading-tight">{p.name}</div>
                          <div className="text-xs text-muted">{o.client.name}</div>
                        </td>
                        <td className="px-3">
                          <div className="flex items-center gap-2">
                            <SegmentBar statuses={p.steps.map((s) => s.status)} />
                            <span className="w-9 font-mono text-xs text-muted">{p.steps.length}/{p.steps.length}</span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#0b6b58]">Todos los procesos terminados</div>
                        </td>
                        <td className="px-3 font-mono text-xs">{fmtDate(o.dueDate)}</td>
                        <td className="px-3 text-right">
                          {p.delivery ? (
                            <span className="text-xs text-muted">Entregada {fmtDate(p.delivery.deliveredAt)}</span>
                          ) : (
                            <Link href={qs("/entregas", { vista: vista === "por" ? undefined : vista, pedido: String(o.id) })} className="inline-flex h-8 items-center rounded-md bg-electric px-2.5 text-xs font-semibold text-white hover:bg-electric-dark">
                              Registrar entrega
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-md border border-line bg-white">
            <h2 className={panelHead}>
              Historial de entregas <span className="font-mono font-medium tracking-normal text-muted">{done.length}</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#f6f7fa] text-left text-[11px] font-semibold tracking-wide text-muted">
                    <th className="h-[34px] px-3">Fecha y hora</th>
                    <th className="px-3">Pedido</th>
                    <th className="px-3">Pieza · cliente</th>
                    <th className="px-3">Registró</th>
                    <th className="px-3">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {done.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-7 text-center text-muted">Aún no hay entregas registradas.</td></tr>
                  )}
                  {done.slice(0, 15).map((o) => (
                    <tr key={o.id} className="border-t border-[#e4e8ef]">
                      <td className="h-[46px] px-3 font-mono text-xs">{fmtDateTime(o.piece!.delivery!.deliveredAt)}</td>
                      <td className="px-3 font-mono font-semibold">{orderNumber(o.id)}</td>
                      <td className="px-3"><span className="font-semibold">{o.piece!.name}</span> <span className="text-muted">· {o.client.name}</span></td>
                      <td className="px-3 text-muted">{o.piece!.delivery!.registeredBy}</td>
                      <td className="px-3 text-muted">{o.piece!.delivery!.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="min-w-0 flex-[1_1_320px] rounded-md border border-line bg-white">
          <h2 className={panelHead}>
            Registrar entrega
            {selected && <span className="font-mono tracking-normal">{orderNumber(selected.id)}</span>}
          </h2>
          {!selected ? (
            <p className="px-4 py-7 text-center text-[13px] text-muted">
              No hay piezas listas para entregar. Cuando una pieza termine todos sus procesos aparecerá aquí.
            </p>
          ) : (
            <form action={registerDelivery} className="flex flex-col gap-3 p-3.5">
              <input type="hidden" name="orderId" value={selected.id} />
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-muted">Número de pedido</span>
                  <input readOnly value={orderNumber(selected.id)} className={`${field} font-mono`} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-muted">Fecha y hora</span>
                  <input name="deliveredAt" type="datetime-local" required defaultValue={toDateTimeInput(new Date())} className={`${field} font-mono`} />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-muted">Cliente</span>
                <input readOnly value={selected.client.name} className={field} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-muted">Pieza</span>
                <input readOnly value={selected.piece!.name} className={field} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-muted">Observaciones</span>
                <textarea name="note" rows={3} maxLength={300} placeholder="Notas de la entrega" className="rounded-md border border-[#c3cbd9] px-2.5 py-2 text-[13px]" />
              </label>
              <div className="rounded-md border border-[#bfe3d9] bg-[#eaf6f2] px-2.5 py-2 text-xs text-[#0b6b58]">
                ✓ {selected.piece!.steps.length} de {selected.piece!.steps.length} procesos terminados
              </div>
              <button type="submit" className="h-10 rounded-md bg-electric text-[13px] font-semibold text-white hover:bg-electric-dark">
                Confirmar entrega
              </button>
              <p className="text-[11px] text-muted">Una pieza entregada se cierra y no puede registrarse otra vez. El historial se conserva.</p>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}
