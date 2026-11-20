"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { orderNumber } from "@/lib/format";
import { parseDateInput } from "@/lib/labels";

export type NewOrderState =
  | { error: string; values: Record<string, string>; route: string[] }
  | undefined;

const text = (max: number) => z.string().trim().max(max);

const schema = z.object({
  client: text(80).min(1, "Escribe el nombre del cliente."),
  entryDate: z.string(),
  dueDate: z.string(),
  pieceName: text(120).min(1, "Escribe el nombre de la pieza."),
  material: text(80).min(1, "Escribe el material."),
  measures: text(80),
  description: text(500),
  notes: text(500),
});

export async function createOrder(_prev: NewOrderState, formData: FormData): Promise<NewOrderState> {
  const user = await requireUser();

  const values: Record<string, string> = {};
  for (const k of ["client", "entryDate", "dueDate", "pieceName", "material", "measures", "description", "notes"]) {
    values[k] = String(formData.get(k) ?? "");
  }
  const route = formData.getAll("route").map(String);
  const fail = (error: string): NewOrderState => ({ error, values, route });

  const parsed = schema.safeParse(values);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;

  const entry = parseDateInput(d.entryDate);
  const due = parseDateInput(d.dueDate);
  if (!entry) return fail("Indica la fecha de ingreso.");
  if (!due) return fail("Indica la fecha estimada de entrega."); // RN-11
  if (due < entry) return fail("La entrega estimada no puede ser anterior a la fecha de ingreso.");

  // Recorrido: al menos un proceso, sin repetir, solo del catálogo activo (RF-04).
  const ids = route.map(Number);
  if (ids.length === 0 || ids.some((n) => !Number.isInteger(n))) {
    return fail("Añade al menos un proceso al recorrido.");
  }
  if (new Set(ids).size !== ids.length) return fail("Un proceso no puede repetirse en el recorrido.");
  const found = await db.processType.findMany({ where: { id: { in: ids }, active: true }, select: { id: true } });
  if (found.length !== ids.length) return fail("Hay procesos del recorrido que ya no están disponibles. Revísalo.");

  const clients = await db.client.findMany();
  const existing = clients.find((c) => c.name.toLowerCase() === d.client.toLowerCase());

  const order = await db.$transaction(async (tx) => {
    const client = existing ?? (await tx.client.create({ data: { name: d.client } }));
    const created = await tx.order.create({
      data: {
        clientId: client.id,
        entryDate: entry,
        dueDate: due,
        piece: {
          create: {
            name: d.pieceName,
            material: d.material,
            measures: d.measures || null,
            description: d.description || null,
            notes: d.notes || null,
            steps: { create: ids.map((processTypeId, i) => ({ processTypeId, position: i + 1 })) },
          },
        },
      },
    });
    await tx.logEntry.create({
      data: {
        kind: "ORDER_CREATED",
        orderId: created.id,
        userId: user.id,
        detail: `${d.pieceName} · ${client.name} · ${ids.length} proceso(s)`,
      },
    });
    return created;
  });

  redirect(`/pedidos?ok=${encodeURIComponent(`Pedido ${orderNumber(order.id)} creado con ${ids.length} procesos.`)}`);
}

const back = (kind: "ok" | "error", text: string): never =>
  redirect(`/pedidos?${kind}=${encodeURIComponent(text)}`);

// Decisión P7: los pedidos no se borran; se archivan y queda registro de quién y por qué.
export async function archiveOrder(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("orderId"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!Number.isInteger(id)) back("error", "Pedido no válido.");
  if (reason.length < 3) back("error", "Escribe el motivo del archivado.");
  if (reason.length > 300) back("error", "El motivo es demasiado largo (máximo 300).");

  const order = await db.order.findUnique({ where: { id } });
  if (!order) back("error", "Pedido no encontrado.");
  if (order!.archivedAt) back("error", "Ese pedido ya está archivado.");

  await db.$transaction([
    db.order.update({
      where: { id },
      data: { archivedAt: new Date(), archivedBy: user.name, archiveReason: reason },
    }),
    db.logEntry.create({
      data: { kind: "ORDER_ARCHIVED", orderId: id, userId: user.id, detail: reason },
    }),
  ]);
  back("ok", `Pedido ${orderNumber(id)} archivado. Sigue disponible en «Ver archivados».`);
}

export async function restoreOrder(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("orderId"));
  if (!Number.isInteger(id)) back("error", "Pedido no válido.");
  const order = await db.order.findUnique({ where: { id } });
  if (!order || !order.archivedAt) back("error", "Ese pedido no está archivado.");

  await db.$transaction([
    db.order.update({
      where: { id },
      data: { archivedAt: null, archivedBy: null, archiveReason: null },
    }),
    db.logEntry.create({
      data: { kind: "ORDER_RESTORED", orderId: id, userId: user.id, detail: "Pedido restaurado" },
    }),
  ]);
  back("ok", `Pedido ${orderNumber(id)} restaurado.`);
}
