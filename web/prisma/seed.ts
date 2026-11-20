// Datos mínimos para arrancar: el usuario administrador y el catálogo de procesos.
// Se puede ejecutar varias veces sin duplicar nada.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const username = (process.env.ADMIN_USERNAME ?? "admin").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("Define ADMIN_PASSWORD (mínimo 8 caracteres) en .env antes de ejecutar el seed.");
  }

  const existing = await db.user.findUnique({ where: { username } });
  if (!existing) {
    await db.user.create({
      data: {
        username,
        name: "Encargado de taller",
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
    console.log(`Usuario creado: ${username}`);
  } else {
    console.log(`El usuario ${username} ya existe: no se modifica.`);
  }

  for (const name of ["Corte", "Torneado", "Soldadura", "Fresado", "Rectificado", "Inspección"]) {
    await db.processType.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log("Catálogo de procesos listo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
