// Datos de prueba realistas para probar la app: clientes, pedidos en todos los estados,
// entregas, observaciones y un pedido archivado. Las fechas son relativas a HOY.
// Uso: npm run db:demo   (solo si no hay pedidos; para empezar de cero borra prisma/metaltrack.db)
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const DAY = 86_400_000;
const HOUR = 3_600_000;

const CLIENTS = [
  "Metalúrgica Andina S.A.",
  "Industrias Cóndor",
  "Agroequipos del Valle",
  "Constructora Montealto",
  "Transportes Pacífico",
];
const MATERIALS = ["Acero SAE 1045", "Acero inoxidable 304", "Bronce SAE 65", "Aluminio 6061", "Acero A36"];
const MEASURES = ["120 × 80 × 40 mm", "Ø 60 × 300 mm", "Ø 100 × 25 mm", "200 × 150 × 12 mm", "Ø 45 × 180 mm", "90 × 90 × 60 mm"];
const C4 = ["Corte", "Torneado", "Fresado", "Inspección"];

// [pieza, cliente, ingreso hace N días, entrega +/- N días desde hoy, recorrido, terminados, ¿uno en proceso?, entregado hace N días | null]
type Row = [string, number, number, number, string[], number, boolean, number | null];
const ROWS: Row[] = [
  ["Brida DN100", 1, 44, -24, ["Corte", "Torneado", "Inspección"], 3, false, 24],
  ["Buje de bronce", 0, 42, -26, ["Corte", "Torneado", "Rectificado", "Inspección"], 4, false, 27],
  ["Eje de transmisión", 4, 38, -20, ["Corte", "Torneado", "Fresado", "Rectificado", "Inspección"], 5, false, 21],
  ["Placa base", 2, 36, -16, ["Corte", "Soldadura", "Inspección"], 3, false, 17],
  ["Pasador guía", 3, 33, -14, ["Corte", "Torneado", "Inspección"], 3, false, 14],
  ["Soporte de rodamiento", 0, 30, -10, ["Corte", "Fresado", "Soldadura", "Inspección"], 4, false, 11],
  ["Husillo trapecial", 1, 27, -8, ["Corte", "Torneado", "Rectificado", "Inspección"], 4, false, 9],
  ["Perno especial M20", 4, 24, -7, ["Corte", "Torneado", "Inspección"], 3, false, 8],
  ["Manguito de acople", 2, 16, 3, C4, 4, false, null],
  ["Polea de aluminio", 0, 15, 5, ["Corte", "Fresado", "Rectificado", "Inspección"], 4, false, null],
  ["Carcasa de bomba", 3, 14, 6, ["Corte", "Fresado", "Soldadura", "Inspección"], 4, false, null],
  ["Engranaje recto Z24", 4, 13, 8, ["Corte", "Torneado", "Fresado", "Rectificado", "Inspección"], 5, false, null],
  ["Chaveta DIN 6885", 1, 12, 9, ["Corte", "Fresado", "Inspección"], 3, false, null],
  ["Eje escalonado", 0, 20, -3, C4, 2, true, null],
  ["Soporte de motor", 3, 17, -2, ["Corte", "Soldadura", "Inspección"], 1, true, null],
  ["Rodillo guía", 2, 15, -1, ["Corte", "Torneado", "Rectificado", "Fresado", "Inspección"], 4, true, null],
  ["Flange ciega", 1, 9, 10, C4, 2, true, null],
  ["Tapa de reductor", 4, 8, 12, ["Corte", "Fresado", "Rectificado", "Inspección"], 1, true, null],
  ["Mordaza de sujeción", 0, 7, 14, ["Corte", "Soldadura", "Fresado", "Inspección"], 2, true, null],
  ["Cilindro hidráulico", 2, 6, 15, ["Corte", "Torneado", "Rectificado", "Inspección"], 1, true, null],
  ["Anillo de ajuste", 3, 5, 16, ["Corte", "Torneado", "Inspección"], 1, true, null],
  ["Tornillo sin fin", 1, 4, 19, ["Corte", "Torneado", "Fresado", "Rectificado", "Inspección"], 0, true, null],
  ["Cuña de fijación", 4, 1, 22, ["Corte", "Fresado", "Inspección"], 0, false, null],
  ["Ménsula reforzada", 0, 0, 24, ["Corte", "Soldadura", "Inspección"], 0, false, null],
];

const NOTES = ["Se detectó rebaba en el borde, se corrige antes de pasar al siguiente proceso.", "Material con dureza mayor a la esperada; se reduce el avance de la herramienta.", "Falta confirmar tolerancia con el cliente.", "Pieza en espera de herramienta de repuesto."];

async function main() {
  if ((await db.order.count()) > 0) {
    console.log("Ya hay pedidos en la base de datos: no se agregan datos de prueba.");
    return;
  }
  const user = await db.user.findFirst({ orderBy: { id: "asc" } });
  if (!user) throw new Error("Ejecuta primero: npm run db:seed");

  const catalog = new Map((await db.processType.findMany()).map((p) => [p.name, p.id]));
  const need = [...new Set(ROWS.flatMap((r) => r[4]))].filter((n) => !catalog.has(n));
  if (need.length) throw new Error(`Faltan procesos en el catálogo: ${need.join(", ")}`);

  const clientIds: number[] = [];
  for (const name of CLIENTS) {
    const c = await db.client.upsert({ where: { name }, update: {}, create: { name } });
    clientIds.push(c.id);
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const T = startOfToday.getTime();
  const now = Date.now();
  let noteIdx = 0;
  const createdIds: number[] = [];

  for (let i = 0; i < ROWS.length; i++) {
    const [name, clientIdx, entryAgo, dueOffset, route, done, inProgress, deliveredAgo] = ROWS[i];
    const entry = T - entryAgo * DAY;
    const base = entry + 8 * HOUR;

    const steps = route.map((proc, pos) => {
      const startedAt = Math.min(base + pos * 30 * HOUR, now - 2 * HOUR);
      const isDone = pos < done;
      const isCur = pos === done && inProgress;
      return {
        processTypeId: catalog.get(proc)!,
        position: pos + 1,
        status: isDone ? "DONE" : isCur ? "IN_PROGRESS" : "PENDING",
        startedAt: isDone || isCur ? new Date(startedAt) : null,
        finishedAt: isDone ? new Date(Math.min(startedAt + 22 * HOUR, now - HOUR)) : null,
      };
    });

    const order = await db.order.create({
      data: {
        clientId: clientIds[clientIdx],
        entryDate: new Date(entry),
        dueDate: new Date(T + dueOffset * DAY),
        createdAt: new Date(entry + 7 * HOUR),
        piece: {
          create: {
            name,
            material: MATERIALS[(i + 1) % MATERIALS.length],
            measures: MEASURES[(i + 1) % MEASURES.length],
            steps: { create: steps },
          },
        },
      },
      include: { piece: true },
    });
    createdIds.push(order.id);

    const logs: { createdAt: Date; kind: string; stepName?: string; detail?: string }[] = [
      { createdAt: new Date(entry + 7 * HOUR), kind: "ORDER_CREATED", detail: `${name} · ${CLIENTS[clientIdx]} · ${route.length} proceso(s)` },
    ];
    steps.forEach((s, pos) => {
      if (s.startedAt) logs.push({ createdAt: s.startedAt, kind: "STEP_STARTED", stepName: route[pos] });
      if (s.finishedAt) logs.push({ createdAt: s.finishedAt, kind: "STEP_FINISHED", stepName: route[pos] });
    });
    if (inProgress && steps[done]?.startedAt && i % 2 === 0) {
      logs.push({
        createdAt: new Date(steps[done].startedAt!.getTime() + 2 * HOUR),
        kind: "NOTE",
        stepName: route[done],
        detail: NOTES[noteIdx++ % NOTES.length],
      });
    }
    if (deliveredAgo !== null) {
      const at = new Date(T - deliveredAgo * DAY + 10 * HOUR);
      const note = i % 3 === 0 ? "Retira el cliente" : i % 2 === 0 ? "Sin novedades" : null;
      await db.delivery.create({ data: { pieceId: order.piece!.id, deliveredAt: at, note, registeredBy: user.name } });
      logs.push({ createdAt: at, kind: "DELIVERED", detail: note ?? undefined });
    }

    await db.logEntry.createMany({
      data: logs.map((l) => ({ orderId: order.id, userId: user.id, kind: l.kind, createdAt: l.createdAt, stepName: l.stepName ?? null, detail: l.detail ?? null })),
    });
  }

  // Un pedido archivado, con su motivo (decisión P7).
  const archivedOrder = await db.order.create({
    data: {
      clientId: clientIds[2],
      entryDate: new Date(T - 30 * DAY),
      dueDate: new Date(T - 5 * DAY),
      createdAt: new Date(T - 30 * DAY + 7 * HOUR),
      archivedAt: new Date(T - 12 * DAY + 9 * HOUR),
      archivedBy: user.name,
      archiveReason: "Cancelado por el cliente antes de iniciar",
      piece: {
        create: {
          name: "Soporte angular",
          material: "Acero A36",
          measures: "150 × 100 × 8 mm",
          steps: { create: ["Corte", "Soldadura", "Inspección"].map((p, i) => ({ processTypeId: catalog.get(p)!, position: i + 1 })) },
        },
      },
    },
  });
  await db.logEntry.createMany({
    data: [
      { orderId: archivedOrder.id, userId: user.id, kind: "ORDER_CREATED", createdAt: new Date(T - 30 * DAY + 7 * HOUR), detail: `Soporte angular · ${CLIENTS[2]} · 3 proceso(s)` },
      { orderId: archivedOrder.id, userId: user.id, kind: "ORDER_ARCHIVED", createdAt: new Date(T - 12 * DAY + 9 * HOUR), detail: "Cancelado por el cliente antes de iniciar" },
    ],
  });

  console.log(`Datos de prueba creados: ${CLIENTS.length} clientes, ${ROWS.length} pedidos y 1 archivado.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
