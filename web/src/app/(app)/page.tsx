import { db } from "@/lib/db";
import { fmtDate, orderNumber } from "@/lib/format";
import { isLate, lateDays, pieceState, progressPercent } from "@/lib/rules";
import { SegmentBar } from "@/components/SegmentBar";

export const metadata = { title: "Dashboard · METALTRACK" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Pedidos no archivados, con su pieza, recorrido y entrega.
  const orders = await db.order.findMany({
    where: { archivedAt: null },
    include: {
      client: true,
      piece: {
        include: {
          delivery: true,
          steps: { orderBy: { position: "asc" } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  const rows = orders
    .filter((o) => o.piece)
    .map((o) => {
      const piece = o.piece!;
      const delivered = !!piece.delivery;
      return {
        id: o.id,
        pieceName: piece.name,
        client: o.client.name,
        dueDate: o.dueDate,
        delivered,
        late: isLate(o.dueDate, delivered, now),
        state: pieceState(piece.steps, delivered),
        percent: progressPercent(piece.steps),
        statuses: piece.steps.map((s) => s.status),
        inProgress: piece.steps.filter((s) => s.status === "IN_PROGRESS").length,
      };
    });

  const active = rows.filter((r) => !r.delivered);
  const lateRows = active.filter((r) => r.late);
  const activeProcesses = active.reduce((n, r) => n + r.inProgress, 0);
  const upcoming = active.slice(0, 6); // ya vienen ordenados por fecha estimada

  const indicators = [
    { label: "Pedidos activos", value: active.length, tone: "text-ink", top: "border-t-steel" },
    { label: "Piezas atrasadas", value: lateRows.length, tone: "text-late", top: "border-t-late" },
    { label: "Procesos activos", value: activeProcesses, tone: "text-ink", top: "border-t-electric" },
    { label: "Listas para entregar", value: active.filter((r) => r.state === "READY").length, tone: "text-ok", top: "border-t-ok" },
  ];

  return (
    <>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Resumen del taller</h1>
        <p className="mt-0.5 text-[13px] text-muted">Qué requiere atención hoy</p>
      </div>

      {lateRows.length > 0 ? (
        <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-[#fbd5d1] border-l-4 border-l-late bg-[#fef3f2] px-4 py-3 text-[13px] font-semibold text-[#b42318]">
          <span className="font-mono">{lateRows.length}</span> pedido(s) atrasado(s) respecto a la fecha estimada de entrega
        </div>
      ) : (
        <div role="status" className="rounded-md border border-[#bfe3d9] bg-[#eaf6f2] px-4 py-3 text-[13px] font-medium text-[#0b6b58]">
          Ningún pedido atrasado.
        </div>
      )}

      <section aria-label="Indicadores" className="grid grid-cols-2 rounded-md border border-line bg-white lg:grid-cols-4">
        {indicators.map((i) => (
          <div key={i.label} className={`flex flex-col gap-1.5 border-t-[3px] ${i.top} border-r border-r-[#e4e8ef] p-4 last:border-r-0`}>
            <div className="text-xs font-medium text-muted">{i.label}</div>
            <div className={`font-mono text-[28px] font-semibold leading-none ${i.tone}`}>{i.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-md border border-line bg-white">
        <h2 className="flex h-10 items-center border-b border-[#e4e8ef] px-3.5 text-[11px] font-bold uppercase tracking-[.08em] text-steel">
          Próximas entregas
        </h2>
        {upcoming.length === 0 ? (
          <p className="px-4 py-7 text-center text-[13px] text-muted">
            Todavía no hay pedidos activos. Cuando registres el primero aparecerá aquí.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f6f7fa] text-left text-[11px] font-semibold tracking-wide text-muted">
                  <th className="h-[34px] px-3">Pedido</th>
                  <th className="px-3">Pieza · cliente</th>
                  <th className="px-3">Entrega est.</th>
                  <th className="min-w-40 px-3">Avance</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((r) => (
                  <tr key={r.id} className="border-t border-[#e4e8ef]">
                    <td className="h-[46px] px-3 font-mono font-semibold">{orderNumber(r.id)}</td>
                    <td className="px-3">
                      <span className="font-semibold">{r.pieceName}</span>{" "}
                      <span className="text-muted">· {r.client}</span>
                    </td>
                    <td className={`px-3 font-mono text-xs ${r.late ? "font-semibold text-late" : ""}`}>
                      {fmtDate(r.dueDate)}
                      {r.late && ` · −${lateDays(r.dueDate, now)} d`}
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-2">
                        <SegmentBar statuses={r.statuses} late={r.late} />
                        <span className="w-10 text-right font-mono text-xs font-semibold">{r.percent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
