const pad = (n: number) => String(n).padStart(2, "0");

/** Número visible del pedido: MT-0001 */
export const orderNumber = (id: number) => `MT-${String(id).padStart(4, "0")}`;

export const fmtDate = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

export const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const fmtDateTime = (d: Date) => `${fmtDate(d)} ${fmtTime(d)}`;

/** Duración legible: "2 d 3 h", "5 h 10 min", "40 min". */
export function fmtDuration(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mi = m % 60;
  return d ? `${d} d ${h} h` : h ? `${h} h ${mi} min` : `${mi} min`;
}
