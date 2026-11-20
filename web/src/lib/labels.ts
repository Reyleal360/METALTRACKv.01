import type { PieceState } from "./rules";

export const PIECE_STATE: Record<PieceState, { label: string; dot: string }> = {
  PENDING: { label: "Pendiente", dot: "bg-[#7a869c]" },
  IN_PROGRESS: { label: "En proceso", dot: "bg-electric" },
  READY: { label: "Lista p/ entregar", dot: "bg-ok" },
  DELIVERED: { label: "Entregada", dot: "bg-muted" },
};

/** Parsea "YYYY-MM-DD" (campo date) como fecha local. Devuelve null si no es válida. */
export function parseDateInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

/** Parsea "YYYY-MM-DDTHH:mm" (campo datetime-local) como fecha y hora local. */
export function parseDateTimeInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

export const toDateTimeInput = (d: Date) =>
  `${toDateInput(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
