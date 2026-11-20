import type { PieceState } from "./rules";

/** Nombre del proceso en el que está la pieza ahora, para mostrar en listas. */
export function currentProcessName(
  steps: { status: string; processType: { name: string } }[],
  state: PieceState,
): string {
  if (state === "DELIVERED") return "—";
  if (state === "READY") return "Entrega";
  const active = steps.find((s) => s.status === "IN_PROGRESS") ?? steps.find((s) => s.status === "PENDING");
  return active?.processType.name ?? "—";
}

/** Arma una URL con los parámetros dados; omite los vacíos. */
export function qs(path: string, params: Record<string, string | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
  const s = u.toString();
  return s ? `${path}?${s}` : path;
}
