"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createOrder } from "../actions";

type Process = { id: number; name: string };

const input = "h-10 w-full rounded-md border border-[#c3cbd9] bg-white px-2.5 text-[13px]";
const label = "text-[11px] font-semibold text-muted";
const panelHead = "flex h-10 items-center justify-between border-b border-[#e4e8ef] px-3.5 text-[11px] font-bold uppercase tracking-[.08em] text-steel";

export function NewOrderForm({ clients, catalog }: { clients: string[]; catalog: Process[] }) {
  const [state, action, pending] = useActionState(createOrder, undefined);
  const v = state?.values ?? {};
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Recorrido en construcción (ids de proceso, en orden). Si el servidor devolvió un error, se conserva.
  const [route, setRoute] = useState<number[]>([]);
  const [syncedFrom, setSyncedFrom] = useState<typeof state>(undefined);
  if (state && state !== syncedFrom) {
    setSyncedFrom(state);
    setRoute(state.route.map(Number).filter((n) => catalog.some((c) => c.id === n)));
  }

  const name = (id: number) => catalog.find((c) => c.id === id)?.name ?? "";
  const move = (i: number, to: number) =>
    setRoute((r) => {
      if (to < 0 || to >= r.length) return r;
      const next = [...r];
      const [x] = next.splice(i, 1);
      next.splice(to, 0, x);
      return next;
    });

  return (
    <form action={action} className="flex flex-col gap-4" key={state ? "err" : "new"}>
      {state?.error && (
        <div role="alert" className="rounded-md border border-[#fbd5d1] bg-[#fef3f2] px-3.5 py-2.5 text-[13px] font-medium text-[#b42318]">
          {state.error}
        </div>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_480px] flex-col gap-4">
          <section className="rounded-md border border-line bg-white">
            <h2 className={panelHead}>1 · Cliente y fechas</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-3.5 gap-y-3 p-3.5">
              <label className="flex flex-col gap-1">
                <span className={label}>Cliente <span className="text-late">*</span></span>
                <input name="client" list="clientes" required autoComplete="off" defaultValue={v.client} placeholder="Elige uno o escribe uno nuevo" className={input} />
                <datalist id="clientes">{clients.map((c) => <option key={c} value={c} />)}</datalist>
                <span className="text-[11px] text-muted">Si no existe, se registra como cliente nuevo.</span>
              </label>
              <label className="flex flex-col gap-1">
                <span className={label}>Fecha de ingreso <span className="text-late">*</span></span>
                <input name="entryDate" type="date" required defaultValue={v.entryDate || todayStr} className={`${input} font-mono`} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={label}>Entrega estimada <span className="text-late">*</span></span>
                <input name="dueDate" type="date" required defaultValue={v.dueDate} className={`${input} font-mono`} />
              </label>
            </div>
          </section>

          <section className="rounded-md border border-line bg-white">
            <h2 className={panelHead}>2 · Pieza</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-3.5 gap-y-3 p-3.5">
              <label className="col-span-full flex flex-col gap-1">
                <span className={label}>Nombre de la pieza <span className="text-late">*</span></span>
                <input name="pieceName" required maxLength={120} defaultValue={v.pieceName} className={input} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={label}>Material <span className="text-late">*</span></span>
                <input name="material" required maxLength={80} defaultValue={v.material} className={input} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={label}>Medidas</span>
                <input name="measures" maxLength={80} defaultValue={v.measures} placeholder="Largo × ancho × alto" className={`${input} font-mono`} />
              </label>
              <label className="col-span-full flex flex-col gap-1">
                <span className={label}>Descripción</span>
                <textarea name="description" rows={2} maxLength={500} defaultValue={v.description} placeholder="Descripción técnica de la pieza" className={`${input} h-auto py-2`} />
              </label>
              <label className="col-span-full flex flex-col gap-1">
                <span className={label}>Observaciones</span>
                <textarea name="notes" rows={2} maxLength={500} defaultValue={v.notes} placeholder="Notas adicionales" className={`${input} h-auto py-2`} />
              </label>
            </div>
          </section>
        </div>

        <section className="min-w-0 flex-[2_1_340px] rounded-md border border-line bg-white">
          <h2 className={panelHead}>
            3 · Recorrido de procesos
            <span className="font-mono font-medium tracking-normal text-muted">{route.length} {route.length === 1 ? "paso" : "pasos"}</span>
          </h2>
          <div className="flex flex-col gap-3.5 p-3.5">
            <div>
              <div className={`${label} mb-1.5`}>CATÁLOGO · clic para añadir al recorrido</div>
              <div className="flex flex-wrap gap-1.5">
                {catalog.length === 0 && <span className="text-[13px] text-muted">El catálogo está vacío. Añade procesos en «Catálogo de procesos».</span>}
                {catalog.map((c) => {
                  const used = route.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={used}
                      onClick={() => setRoute((r) => [...r, c.id])}
                      className="flex h-10 items-center gap-2 rounded-md border border-[#c3cbd9] bg-white px-2.5 text-[13px] font-medium transition-colors hover:border-electric hover:bg-[#f3f6fc] disabled:cursor-default disabled:border-[#e4e8ef] disabled:bg-[#f1f3f7] disabled:text-[#7c89a2]"
                    >
                      {used ? "✓" : "+"} {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className={`${label} mb-1.5`}>ORDEN DEL RECORRIDO · usa las flechas</div>
              <ol className="rounded-md border border-line">
                {route.length === 0 && (
                  <li className="px-3.5 py-4 text-center text-[13px] text-muted">Añade procesos desde el catálogo para armar el recorrido.</li>
                )}
                {route.map((id, i) => (
                  <li key={id} className={`grid grid-cols-[28px_1fr_auto] items-center gap-2 py-0.5 pl-2.5 pr-1.5 ${i ? "border-t border-[#e4e8ef]" : ""}`}>
                    <input type="hidden" name="route" value={id} />
                    <span className="font-mono text-xs font-semibold text-electric-dark">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-[13px] font-medium">{name(id)}</span>
                    <span className="flex">
                      {[
                        { t: "Subir", d: "m6 15 6-6 6 6", on: () => move(i, i - 1), off: i === 0 },
                        { t: "Bajar", d: "m6 9 6 6 6-6", on: () => move(i, i + 1), off: i === route.length - 1 },
                        { t: "Quitar", d: "M6 6l12 12M18 6 6 18", on: () => setRoute((r) => r.filter((x) => x !== id)), off: false },
                      ].map((b) => (
                        <button key={b.t} type="button" onClick={b.on} disabled={b.off} aria-label={`${b.t} ${name(id)}`} className="flex size-10 items-center justify-center rounded-sm text-muted hover:bg-[#e4e8ef] hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={b.d} /></svg>
                        </button>
                      ))}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex gap-0.5" aria-hidden="true">
              {(route.length ? route : [0]).map((_, i) => (
                <i key={i} className={`block h-1.5 flex-1 ${route.length ? "bg-[#cbd2de]" : "bg-[#e4e8ef]"}`} />
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-line bg-white px-4 py-3">
        <span className="text-xs text-muted"><span className="text-late">*</span> Campos obligatorios</span>
        <div className="flex gap-2">
          <Link href="/pedidos" className="inline-flex h-10 items-center rounded-md border border-[#c3cbd9] px-3.5 text-[13px] font-semibold hover:bg-[#f3f5f9]">
            Cancelar
          </Link>
          <button type="submit" disabled={pending || route.length === 0} className="h-10 rounded-md bg-electric px-4 text-[13px] font-semibold text-white hover:bg-electric-dark disabled:cursor-not-allowed disabled:bg-[#f1f3f7] disabled:text-[#7c89a2]">
            {pending ? "Guardando…" : "Guardar pedido"}
          </button>
        </div>
      </div>
    </form>
  );
}
