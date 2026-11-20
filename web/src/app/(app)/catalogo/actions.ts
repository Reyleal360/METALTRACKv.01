"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const nameSchema = z.string().trim().min(2, "El nombre debe tener al menos 2 letras.").max(40, "El nombre es demasiado largo (máximo 40).");

const back = (kind: "ok" | "error", text: string): never =>
  redirect(`/catalogo?${kind}=${encodeURIComponent(text)}`);

async function nameTaken(name: string, exceptId?: number) {
  const all = await db.processType.findMany({ select: { id: true, name: true } });
  return all.some((p) => p.id !== exceptId && p.name.toLowerCase() === name.toLowerCase());
}

export async function addProcess(formData: FormData) {
  await requireUser();
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) back("error", parsed.error.issues[0].message);
  const name = parsed.data!;
  if (await nameTaken(name)) back("error", `«${name}» ya existe en el catálogo.`);
  await db.processType.create({ data: { name } });
  back("ok", `Proceso «${name}» añadido al catálogo.`);
}

export async function renameProcess(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!Number.isInteger(id)) back("error", "Proceso no válido.");
  if (!parsed.success) back("error", parsed.error.issues[0].message);
  const name = parsed.data!;
  if (await nameTaken(name, id)) back("error", `«${name}» ya existe en el catálogo.`);
  await db.processType.update({ where: { id }, data: { name } });
  back("ok", `Proceso renombrado a «${name}».`);
}

// RN-17: un proceso con uso histórico se desactiva, nunca se elimina.
export async function toggleProcess(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) back("error", "Proceso no válido.");
  const p = await db.processType.findUnique({ where: { id } });
  if (!p) back("error", "Proceso no encontrado.");
  const updated = await db.processType.update({ where: { id }, data: { active: !p!.active } });
  back("ok", `«${updated.name}» ${updated.active ? "activado" : "desactivado"}. Los pedidos existentes no cambian.`);
}
