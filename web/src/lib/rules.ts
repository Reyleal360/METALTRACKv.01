// Reglas de negocio de METALTRACK (funciones puras, sin base de datos).
// RN-05 / RN-06 / RN-07 / RN-08 / RN-12 / RN-13 / RN-15 del documento de requerimientos.

export type StepStatus = "PENDING" | "IN_PROGRESS" | "DONE";
export type PieceState = "PENDING" | "IN_PROGRESS" | "READY" | "DELIVERED";

export interface StepLike {
  position: number;
  status: string;
}

export type Check = { ok: true } | { ok: false; reason: string };

export const DAY = 86_400_000;

export const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const byPosition = (steps: StepLike[]) =>
  [...steps].sort((a, b) => a.position - b.position);

/** RN-07: terminados ÷ total × 100, todos los procesos pesan igual. */
export function progressPercent(steps: StepLike[]): number {
  if (steps.length === 0) return 0;
  const done = steps.filter((s) => s.status === "DONE").length;
  return Math.round((done / steps.length) * 100);
}

/** Estado de la pieza. "Atrasado" no es un estado, es una alerta (isLate). */
export function pieceState(steps: StepLike[], delivered: boolean): PieceState {
  if (delivered) return "DELIVERED";
  if (steps.length > 0 && steps.every((s) => s.status === "DONE")) return "READY";
  if (steps.some((s) => s.status !== "PENDING")) return "IN_PROGRESS";
  return "PENDING";
}

/** RN-12: la fecha estimada ya pasó y la pieza no está entregada. */
export function isLate(dueDate: Date, delivered: boolean, now = new Date()): boolean {
  return !delivered && startOfDay(dueDate).getTime() < startOfDay(now).getTime();
}

export function lateDays(dueDate: Date, now = new Date()): number {
  return Math.round((startOfDay(now).getTime() - startOfDay(dueDate).getTime()) / DAY);
}

/** RN-06 y RN-13: solo se inicia un proceso pendiente si todos los anteriores están terminados. */
export function checkStart(steps: StepLike[], position: number, delivered: boolean): Check {
  if (delivered) return { ok: false, reason: "La pieza ya fue entregada." };
  const step = steps.find((s) => s.position === position);
  if (!step) return { ok: false, reason: "El proceso no existe." };
  if (step.status !== "PENDING") return { ok: false, reason: "Solo se puede iniciar un proceso pendiente." };
  const blocking = byPosition(steps).find((s) => s.position < position && s.status !== "DONE");
  if (blocking) return { ok: false, reason: "Primero debe terminarse el proceso anterior." };
  return { ok: true };
}

/** RN-05: no se finaliza un proceso que no se haya iniciado. */
export function checkFinish(steps: StepLike[], position: number, delivered: boolean): Check {
  if (delivered) return { ok: false, reason: "La pieza ya fue entregada." };
  const step = steps.find((s) => s.position === position);
  if (!step) return { ok: false, reason: "El proceso no existe." };
  if (step.status !== "IN_PROGRESS") {
    return { ok: false, reason: "No se puede finalizar un proceso que todavía no se ha iniciado." };
  }
  return { ok: true };
}

/** RN-08 y RN-15: se entrega solo con todos los procesos terminados, y una sola vez. */
export function checkDelivery(steps: StepLike[], delivered: boolean): Check {
  if (delivered) return { ok: false, reason: "La pieza ya fue entregada." };
  if (steps.length === 0) return { ok: false, reason: "La pieza no tiene recorrido." };
  const pending = steps.filter((s) => s.status !== "DONE").length;
  if (pending > 0) {
    return { ok: false, reason: `Faltan ${pending} proceso(s) por terminar.` };
  }
  return { ok: true };
}
