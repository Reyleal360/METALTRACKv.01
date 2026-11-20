import { db } from "@/lib/db";
import { Flash, first } from "@/components/Flash";
import { addProcess, renameProcess, toggleProcess } from "./actions";

export const metadata = { title: "Catálogo de procesos · METALTRACK" };
export const dynamic = "force-dynamic";

export default async function CatalogoPage(props: PageProps<"/catalogo">) {
  const sp = await props.searchParams;
  const processes = await db.processType.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { steps: true } } },
  });

  return (
    <>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Catálogo de procesos</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Procesos que se pueden elegir al armar el recorrido de un pedido nuevo. Desactivar un proceso no afecta a los pedidos existentes.
        </p>
      </div>

      <Flash ok={first(sp.ok)} error={first(sp.error)} />

      <div className="flex flex-wrap items-start gap-4">
        <section className="min-w-0 flex-[3_1_520px] overflow-hidden rounded-md border border-line bg-white">
          <h2 className="flex h-10 items-center justify-between border-b border-[#e4e8ef] px-3.5 text-[11px] font-bold uppercase tracking-[.08em] text-steel">
            Procesos <span className="font-mono font-medium tracking-normal text-muted">{processes.length}</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f6f7fa] text-left text-[11px] font-semibold tracking-wide text-muted">
                  <th className="h-[34px] px-3">Proceso</th>
                  <th className="px-3">Estado</th>
                  <th className="px-3">Usado en</th>
                  <th className="px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((p) => (
                  <tr key={p.id} className="border-t border-[#e4e8ef]">
                    <td className="h-[52px] px-3">
                      <form action={renameProcess} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          name="name"
                          defaultValue={p.name}
                          aria-label={`Nombre del proceso ${p.name}`}
                          className="h-9 w-44 rounded-md border border-transparent px-2 font-semibold hover:border-[#c3cbd9]"
                        />
                        <button type="submit" className="h-8 rounded-md border border-[#c3cbd9] px-2.5 text-xs font-semibold hover:bg-[#f3f5f9]">
                          Guardar
                        </button>
                      </form>
                    </td>
                    <td className="px-3">
                      <span className="inline-flex items-center gap-1.5">
                        <i className={`inline-block size-2 rounded-full ${p.active ? "bg-ok" : "bg-[#7a869c]"}`} />
                        {p.active ? "Disponible" : "Desactivado"}
                      </span>
                    </td>
                    <td className="px-3 font-mono">{p._count.steps} {p._count.steps === 1 ? "paso" : "pasos"}</td>
                    <td className="px-3 text-right">
                      <form action={toggleProcess}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="h-8 rounded-md border border-[#c3cbd9] px-2.5 text-xs font-semibold hover:bg-[#f3f5f9]">
                          {p.active ? "Desactivar" : "Activar"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="min-w-0 flex-[1_1_280px] rounded-md border border-line bg-white">
          <h2 className="flex h-10 items-center border-b border-[#e4e8ef] px-3.5 text-[11px] font-bold uppercase tracking-[.08em] text-steel">
            Añadir proceso
          </h2>
          <form action={addProcess} className="flex flex-col gap-3 p-3.5">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted">
                Nombre del proceso <span className="text-late">*</span>
              </span>
              <input name="name" required maxLength={40} placeholder="Ej.: Taladrado" autoComplete="off" className="h-10 rounded-md border border-[#c3cbd9] px-2.5 text-[13px]" />
            </label>
            <button type="submit" className="h-10 rounded-md bg-electric text-[13px] font-semibold text-white hover:bg-electric-dark">
              Añadir al catálogo
            </button>
          </form>
        </aside>
      </div>
    </>
  );
}
