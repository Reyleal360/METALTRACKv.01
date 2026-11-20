import { db } from "@/lib/db";
import { NewOrderForm } from "./NewOrderForm";

export const metadata = { title: "Nuevo pedido · METALTRACK" };
export const dynamic = "force-dynamic";

export default async function NuevoPedidoPage() {
  const [clients, catalog] = await Promise.all([
    db.client.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    db.processType.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Nuevo pedido</h1>
        <p className="mt-0.5 text-[13px] text-muted">Cada pedido corresponde a una única pieza. El número MT se asigna al guardar.</p>
      </div>
      <NewOrderForm clients={clients.map((c) => c.name)} catalog={catalog} />
    </>
  );
}
