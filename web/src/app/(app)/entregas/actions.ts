"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { orderNumber } from "@/lib/format";
import { parseDateTimeInput } from "@/lib/labels";
import { checkDelivery } from "@/lib/rules";

const to = (kind: "ok" | "error", text: string, orderId?: number): never =>
  redirect(`/entregas?${orderId ? `pedido=${orderId}&` : ""}${kind}=${encodeURIComponent(text)}`);

// RN-08, RN-09, RN-15: se entrega solo con todos los procesos terminados, una sola vez, y queda registrada.
export async function registerDelivery(formData: FormData) {
  const user = await requireUser();
  const orderId = Number(formData.get("orderId"));
  const note = String(formData.get("note") ?? "").trim();
  const when = parseDateTimeInput(String(formData.get("deliveredAt") ?? ""));

  if (!Number.isInteger(orderId)) to("error", "Pedido no válido.");
  if (!when) to("error", "Indica una fecha y hora válidas.", orderId);
  if (note.length > 300) to("error", "Las observaciones son demasiado largas (máximo 300).", orderId);

  const error = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { piece: { include: { delivery: true, steps: true } } },
    });
    if (!order?.piece) return "Pedido no encontrado.";
    if (order.archivedAt) return "El pedido está archivado.";
    const check = checkDelivery(order.piece.steps, !!order.piece.delivery);
    if (!check.ok) return check.reason;
    if (when! < order.entryDate) return "La entrega no puede ser anterior a la fecha de ingreso.";
    if (when!.getTime() > Date.now() + 5 * 60_000) return "La fecha de entrega no puede estar en el futuro.";

    await tx.delivery.create({
      data: { pieceId: order.piece.id, deliveredAt: when!, note: note || null, registeredBy: user.name },
    });
    await tx.logEntry.create({
      data: { kind: "DELIVERED", orderId, userId: user.id, detail: note || null },
    });
    return null;
  });

  if (error) to("error", error, orderId);
  to("ok", `Entrega de ${orderNumber(orderId)} registrada. La pieza queda cerrada.`);
}
