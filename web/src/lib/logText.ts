// Textos y agrupación de los eventos de la bitácora.

export const LOG_GROUPS = {
  pedido: { label: "Pedido", kinds: ["ORDER_CREATED"] },
  proceso: { label: "Proceso", kinds: ["STEP_STARTED", "STEP_FINISHED"] },
  observacion: { label: "Observación", kinds: ["NOTE"] },
  entrega: { label: "Entrega", kinds: ["DELIVERED"] },
  archivo: { label: "Archivo", kinds: ["ORDER_ARCHIVED", "ORDER_RESTORED"] },
} as const;

export type LogGroup = keyof typeof LOG_GROUPS;

export function logGroupOf(kind: string): LogGroup {
  for (const [key, g] of Object.entries(LOG_GROUPS)) {
    if ((g.kinds as readonly string[]).includes(kind)) return key as LogGroup;
  }
  return "pedido";
}

export function logText(l: { kind: string; stepName: string | null; detail: string | null }): string {
  switch (l.kind) {
    case "ORDER_CREATED":
      return `Pedido registrado${l.detail ? ` · ${l.detail}` : ""}`;
    case "STEP_STARTED":
      return `${l.stepName}: Pendiente → En proceso`;
    case "STEP_FINISHED":
      return `${l.stepName}: En proceso → Terminado`;
    case "NOTE":
      return `${l.stepName}: observación · ${l.detail}`;
    case "DELIVERED":
      return `Marcado como entregado${l.detail ? ` · ${l.detail}` : ""}`;
    case "ORDER_ARCHIVED":
      return `Pedido archivado · ${l.detail}`;
    case "ORDER_RESTORED":
      return "Pedido restaurado";
    default:
      return l.detail ?? l.kind;
  }
}
