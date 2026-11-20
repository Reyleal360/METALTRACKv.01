import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getSession } from "./session";

/** Usuario de la sesión actual, o redirige a /login. Úsalo en cada página protegida. */
export const requireUser = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, name: true, active: true },
  });
  if (!user || !user.active) redirect("/login");
  return user;
});
