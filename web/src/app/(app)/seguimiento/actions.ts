"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { checkFinish, checkStart } from "@/lib/rules";

type Result = { error: string } | { ok: string };

const to = (orderId: number | null, r: Result): never => {
  const kind = "error" in r ? "error" : "ok";
  const text = "error" in r ? r.error : r.ok;
  const id = orderId ? `pedido=${orderId}&` : "";
  return redirect(`/seguimiento?${id}${kind}=${encodeURIComponent(text)}`);
};

const loadOrder = (tx: Prisma.TransactionClient, orderId: number) =>
  tx.order.findUnique({
    where: { id: orderId },
    include: {
      piece: {
        include: {
          delivery: true,
          steps: { orderBy: { position: "asc" }, include: { processType: true } },
        },
      },
    },
  });

function ids(formData: FormData) {
  const orderId = Number(formData.get("orderId"));
  const position = Number(formData.get("position"));
  if (!Number.isInteger(orderId)) return to(null, { error: "Pedido no válido." });
  return { orderId, position };
}

// RN-06 y RN-13: solo se inicia un proceso si los anteriores están terminados.
export async function startStep(formData: FormData) {
  const user = await requireUser();
  const { orderId, position } = ids(formData);

  const result: Result = await db.$transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    if (!order?.piece) return { error: "Pedido no encontrado." };
    if (order.archivedAt) return { error: "El pedido está archivado: restáuralo para seguir trabajando." };
    const check = checkStart(order.piece.steps, position, !!order.piece.delivery);
    if (!check.ok) return { error: check.reason };
    const step = order.piece.steps.find((s) => s.position === position)!;
    await tx.routeStep.update({
      where: { id: step.id },
      data: { status: "IN_PROGRESS", startedAt: new Date(), finishedAt: null },
    });
    await tx.logEntry.create({
      data: { kind: "STEP_STARTED", orderId, userId: user.id, stepName: step.processType.name },
    });
    return { ok: `${step.processType.name} iniciado.` };
  });
  to(orderId, result);
}

// RN-05: no se finaliza un proceso que no se haya iniciado.
export async function finishStep(formData: FormData) {
  const user = await requireUser();
  const { orderId, position } = ids(formData);

  const result: Result = await db.$transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    if (!order?.piece) return { error: "Pedido no encontrado." };
    if (order.archivedAt) return { error: "El pedido está archivado: restáuralo para seguir trabajando." };
    const check = checkFinish(order.piece.steps, position, !!order.piece.delivery);
    if (!check.ok) return { error: check.reason };
    const step = order.piece.steps.find((s) => s.position === position)!;
    await tx.routeStep.update({
      where: { id: step.id },
      data: { status: "DONE", finishedAt: new Date() },
    });
    await tx.logEntry.create({
      data: { kind: "STEP_FINISHED", orderId, userId: user.id, stepName: step.processType.name },
    });
    const allDone = order.piece.steps.every((s) => s.id === step.id || s.status === "DONE");
    return {
      ok: allDone
        ? `${step.processType.name} finalizado. Todos los procesos terminados: la pieza está lista para entregar.`
        : `${step.processType.name} finalizado.`,
    };
  });
  to(orderId, result);
}

// RF-09: observaciones durante la ejecución, asociadas al proceso en curso.
export async function addNote(formData: FormData) {
  const user = await requireUser();
  const orderId = Number(formData.get("orderId"));
  const text = String(formData.get("note") ?? "").trim();
  if (!Number.isInteger(orderId)) to(null, { error: "Pedido no válido." });
  if (text.length < 3) to(orderId, { error: "Escribe la observación antes de guardar." });
  if (text.length > 500) to(orderId, { error: "La observación es demasiado larga (máximo 500)." });

  const result: Result = await db.$transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    if (!order?.piece) return { error: "Pedido no encontrado." };
    if (order.archivedAt) return { error: "El pedido está archivado." };
    if (order.piece.delivery) return { error: "La pieza ya fue entregada: no admite más cambios." };
    const step = order.piece.steps.find((s) => s.status === "IN_PROGRESS");
    if (!step) return { error: "No hay un proceso en curso para registrar la observación." };
    await tx.logEntry.create({
      data: { kind: "NOTE", orderId, userId: user.id, stepName: step.processType.name, detail: text },
    });
    return { ok: "Observación guardada." };
  });
  to(orderId, result);
}
