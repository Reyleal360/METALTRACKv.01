"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";

export type LoginState = { error?: string } | undefined;

const schema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

// Freno simple contra adivinar contraseñas: 5 fallos seguidos bloquean 10 minutos.
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;
const fails = new Map<string, { n: number; until: number }>();

// Hash falso para tardar lo mismo cuando el usuario no existe.
const DUMMY_HASH = bcrypt.hashSync("sin-usuario", 12);

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Escribe tu usuario y tu contraseña." };

  const { username, password } = parsed.data;
  const key = username.toLowerCase();
  const state = fails.get(key);
  if (state && state.n >= MAX_FAILS && state.until > Date.now()) {
    return { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
  }

  const user = await db.user.findUnique({ where: { username: key } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.active || !valid) {
    const n = (state && state.until > Date.now() ? state.n : 0) + 1;
    fails.set(key, { n, until: Date.now() + LOCK_MS });
    return { error: "Usuario o contraseña incorrectos." };
  }

  fails.delete(key);
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
