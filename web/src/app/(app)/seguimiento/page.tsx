import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate, fmtDateTime, fmtDuration, orderNumber } from "@/lib/format";
import { checkStart, isLate, lateDays, pieceState, progressPercent } from "@/lib/rules";
import { PIECE_STATE } from "@/lib/labels";
import { logText } from "@/lib/logText";
import { Flash, first } from "@/components/Flash";
import { SegmentBar } from "@/components/SegmentBar";
import { PiecePicker } from "./PiecePicker";
import { addNote, finishStep, startStep } from "./actions";

export const metadata = { title: "Seguimiento · METALTRACK" };
export const dynamic = "force-dynamic";

const btn = "h-8 rounded-md border border-[#c3cbd9] bg-white px-2.5 text-xs font-semibold hover:bg-[#f3f5f9] disabled:cursor-not-allowed disabled:border-[#e4e8ef] disabled:bg-[#f1f3f7] disabled:text-[#7c89a2]";

export default async function SeguimientoPage(props: PageProps<"/seguimiento">) {
  const sp = await props.searchParams;
  const now = new Date();

  const orders = await db.order.findMany({
    where: { archivedAt: null, piece: { isNot: null } },
    include: {
      client: true,
      piece: { include: { delivery: true, steps: { orderBy: { position: "asc" }, include: { processType: true } } } },
    },
    orderBy: { id: "desc" },
  });

  if (orders.length === 0) {
    return (
      <>
        <h1 className="text-[22px] font-bold tracking-tight">Seguimiento</h1>
        <p className="rounded-md border border-line bg-white px-4 py-8 text-center text-[13px] text-muted">
          Aún no hay pedidos. Crea el primero desde <Link href="/pedidos/nuevo" className="font-semibold text-electric-dark">Pedidos</Link>.
        </p>
      </>
    );
  }

  const wanted = Number(first(sp.pedido));
  const order =
    orders.find((o) => o.id === wanted) ??
    orders
      .filter((o) => o.piece!.steps.some((s) => s.status === "IN_PROGRESS") && !o.piece!.delivery)
      .sort((a, b) => Number(isLate(b.dueDate, false, now)) - Number(isLate(a.dueDate, false, now)) || a.dueDate.getTime() - b.dueDate.getTime())[0] ??
    orders[0];
  const piece = order.piece!;
  const steps = piece.steps;
  const delivered = !!piece.delivery;
  const state = pieceState(steps, delivered);
  const late = isLate(order.dueDate, delivered, now);
  const current = steps.find((s) => s.status === "IN_PROGRESS");
  const logs = await db.logEntry.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  const dueNote = late ? `atrasada ${lateDays(order.dueDate, now)} d` : delivered ? "entregada" : "";
  const facts: [string, string, boolean][] = [
    ["CLIENTE", order.client.name, false],
    ["MATERIAL", piece.material, false],
    ["MEDIDAS", piece.measures ?? "—", true],
    ["INGRESO", fmtDate(order.entryDate), true],
    ["ENTREGA ESTIMADA", `${fmtDate(order.dueDate)}${dueNote ? ` · ${dueNote}` : ""}`, true],
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2.5">
            <span className="font-mono text-[13px] font-semibold text-muted">{orderNumber(order.id)}</span>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
              <i className={`inline-block size-2 rounded-full ${PIECE_STATE[state].dot}`} />
              {PIECE_STATE[state].label}
            </span>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight">{piece.name}</h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <PiecePicker
            current={order.id}
            options={orders.map((o) => ({ id: o.id, label: `${orderNumber(o.id)} · ${o.piece!.name}${o.piece!.delivery ? " (entregada)" : ""}` }))}
          />
          <Link href={`/bitacora?q=${orderNumber(order.id)}`} className="inline-flex h-10 items-center rounded-md border border-[#c3cbd9] bg-white px-3.5 text-[13px] font-semibold hover:bg-[#f3f5f9]">
            Ver bitácora completa
          </Link>
        </div>
      </div>

      <Flash ok={first(sp.ok)} error={first(sp.error)} />

      <section className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] rounded-md border border-line bg-white">
        {facts.map(([k, v, mono]) => (
          <div key={k} className="flex flex-col gap-1 border-r border-[#e4e8ef] px-4 py-3">
            <span className="text-[11px] font-semibold tracking-[.03em] text-muted">{k}</span>
            <span className={`text-sm font-semibold ${mono ? "font-mono" : ""} ${k === "ENTREGA ESTIMADA" && late ? "text-late" : ""}`}>{v}</span>
          </div>
        ))}
        <div className="flex flex-col gap-1.5 px-4 py-3">
          <span className="text-[11px] font-semibold tracking-[.03em] text-muted">AVANCE</span>
          <span className="font-mono text-sm font-semibold">
            {progressPercent(steps)}% · {steps.filter((s) => s.status === "DONE").length}/{steps.length}
          </span>
          <SegmentBar statuses={steps.map((s) => s.status)} late={late} />
        </div>
      </section>

      {delivered ? (
        <div className="rounded-md border border-line bg-[#eef1f6] px-3.5 py-3 text-[13px] font-medium text-[#3a465c]">
          Pieza entregada el {fmtDateTime(piece.delivery!.deliveredAt)}. El seguimiento queda cerrado.
        </div>
      ) : state === "READY" ? (
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-[#bfe3d9] bg-[#eaf6f2] px-3.5 py-3 text-[13px] font-semibold text-[#0b6b58]">
          Todos los procesos terminados: la pieza está lista para entregar.
          <Link href={`/entregas?pedido=${order.id}`} className="inline-flex h-8 items-center rounded-md bg-electric px-3 text-xs font-semibold text-white hover:bg-electric-dark">
            Ir a Entregas
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-4">
        <section className="min-w-0 flex-[3_1_520px] rounded-md border border-line bg-white">
          <h2 className="flex h-10 items-center border-b border-[#e4e8ef] px-3.5 text-[11px] font-bold uppercase tracking-[.08em] text-steel">
            Recorrido de procesos
          </h2>
          <ol className="flex flex-col px-4 pb-1 pt-4">
            {steps.map((s, i) => {
              const isCur = s.status === "IN_PROGRESS";
              const can = checkStart(steps, s.position, delivered);
              const stepLogs = logs.filter((l) => l.stepName === s.processType.name && ["STEP_STARTED", "STEP_FINISHED", "NOTE"].includes(l.kind));
              const label = s.status === "DONE" ? "Terminado" : isCur ? "En proceso" : "Pendiente";
              const dotBg = s.status === "DONE" ? "bg-steel" : isCur ? "bg-electric" : "bg-[#7a869c]";
              return (
                <li key={s.id} className="grid grid-cols-[30px_1fr] gap-3.5">
                  <div className="flex flex-col items-center">
                    <span className={`flex size-[30px] flex-none items-center justify-center rounded-full border-2 font-mono text-xs font-semibold ${
                      s.status === "DONE" ? "border-steel bg-steel text-white" : isCur ? "border-electric bg-electric text-white" : "border-[#cbd2de] bg-white text-muted"
                    }`}>
                      {s.status === "DONE" ? "✓" : i + 1}
                    </span>
                    <span className={`my-1 min-h-3.5 w-0.5 flex-1 ${i === steps.length - 1 ? "bg-transparent" : s.status === "DONE" ? "bg-steel" : "bg-[#cbd2de]"}`} />
                  </div>
                  <div className="min-w-0 pb-5">
                    <div className={`rounded-md border px-3 py-2.5 ${isCur ? "border-electric bg-[#eef3ff]" : "border-[#e4e8ef] bg-white"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-base font-bold">{s.processType.name}</span>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isCur ? "text-electric-dark" : ""}`}>
                            <i className={`inline-block size-2 rounded-full ${dotBg}`} />
                            {label}
                          </span>
                          {isCur && <span className="text-[10px] font-bold tracking-widest text-electric-dark">ACTUAL</span>}
                        </div>
                        <span className={`font-mono text-xs font-semibold ${isCur ? "text-electric-dark" : "text-muted"}`}>
                          {isCur ? `Lleva ${fmtDuration(now.getTime() - s.startedAt!.getTime())}` : s.status === "DONE" ? `Duración ${fmtDuration(s.finishedAt!.getTime() - s.startedAt!.getTime())}` : "Sin iniciar"}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-4 gap-y-1.5">
                        {[["INICIO", s.startedAt], ["FIN", s.finishedAt]].map(([k, d]) => (
                          <div key={k as string}>
                            <div className="text-[10px] font-semibold tracking-wider text-muted">{k as string}</div>
                            <div className="font-mono text-xs">{d ? fmtDateTime(d as Date) : "—"}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {s.status === "PENDING" && (
                          <form action={startStep}>
                            <input type="hidden" name="orderId" value={order.id} />
                            <input type="hidden" name="position" value={s.position} />
                            <button type="submit" className={btn} disabled={!can.ok}>Iniciar</button>
                          </form>
                        )}
                        {isCur && (
                          <form action={finishStep}>
                            <input type="hidden" name="orderId" value={order.id} />
                            <input type="hidden" name="position" value={s.position} />
                            <button type="submit" className="h-8 rounded-md bg-electric px-2.5 text-xs font-semibold text-white hover:bg-electric-dark">Finalizar</button>
                          </form>
                        )}
                        <details className="ml-auto">
                          <summary className={`${btn} inline-flex cursor-pointer list-none items-center`}>Historial ({stepLogs.length})</summary>
                          <div className="mt-2 flex flex-col gap-1 border-t border-[#e4e8ef] pt-2">
                            {stepLogs.length === 0 && <span className="text-xs text-muted">Sin movimientos todavía.</span>}
                            {stepLogs.map((l) => (
                              <div key={l.id} className="grid grid-cols-[110px_1fr] gap-2.5 text-xs">
                                <span className="font-mono text-muted">{fmtDateTime(l.createdAt)}</span>
                                <span>{logText(l).replace(`${s.processType.name}: `, "")}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                      {s.status === "PENDING" && !delivered && !can.ok && (
                        <p className="mt-1.5 text-[11px] text-muted">Se podrá iniciar cuando terminen los procesos anteriores.</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="flex min-w-0 flex-[2_1_320px] flex-col gap-4">
          <section className="rounded-md border border-line bg-white">
            <h2 className="flex h-10 items-center justify-between border-b border-[#e4e8ef] px-3.5 text-[11px] font-bold uppercase tracking-[.08em] text-steel">
              Proceso actual
              <span className="text-xs font-semibold normal-case tracking-normal text-electric-dark">{current ? current.processType.name : "Sin proceso en curso"}</span>
            </h2>
            <div className="flex flex-col gap-3 p-3.5">
              <div>
                <div className="text-[10px] font-semibold tracking-wider text-muted">TIEMPO EN ESTE PROCESO</div>
                <div className="mt-0.5 font-mono text-2xl font-semibold">{current ? fmtDuration(now.getTime() - current.startedAt!.getTime()) : "—"}</div>
                <div className="font-mono text-xs text-muted">{current ? `desde ${fmtDateTime(current.startedAt!)}` : "Inicia un proceso para registrar tiempo"}</div>
              </div>
              <form action={addNote} className="flex flex-col gap-2">
                <input type="hidden" name="orderId" value={order.id} />
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-muted">Observación</span>
                  <textarea name="note" rows={3} maxLength={500} required disabled={!current} placeholder="Novedades del proceso en curso" className="rounded-md border border-[#c3cbd9] px-2.5 py-2 text-[13px] disabled:bg-[#f6f7fa]" />
                </label>
                <div className="flex justify-end">
                  <button type="submit" disabled={!current} className="h-9 rounded-md border border-[#c3cbd9] bg-white px-3.5 text-[13px] font-semibold hover:bg-[#f3f5f9] disabled:cursor-not-allowed disabled:bg-[#f1f3f7] disabled:text-[#7c89a2]">
                    Guardar observación
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section className="rounded-md border border-line bg-white">
            <h2 className="flex h-10 items-center justify-between border-b border-[#e4e8ef] px-3.5 text-[11px] font-bold uppercase tracking-[.08em] text-steel">
              Bitácora de la pieza <span className="font-mono font-medium tracking-normal text-muted">{logs.length}</span>
            </h2>
            {logs.slice(0, 6).map((l) => (
              <div key={l.id} className="grid grid-cols-[92px_1fr] gap-2.5 border-t border-[#e4e8ef] px-3.5 py-2 text-[13px] first:border-t-0">
                <span className="font-mono text-[11px] leading-normal text-muted">{fmtDate(l.createdAt)}<br />{fmtDateTime(l.createdAt).slice(11)}</span>
                <span>{logText(l)}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
