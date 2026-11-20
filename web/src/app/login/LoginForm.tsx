"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">Usuario</span>
        <input
          name="username"
          type="text"
          autoComplete="username"
          autoFocus
          required
          className="h-10 rounded-md border border-[#c3cbd9] px-3 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">Contraseña</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-10 rounded-md border border-[#c3cbd9] px-3 text-sm"
        />
      </label>
      {state?.error && (
        <p role="alert" className="rounded-md border border-[#fbd5d1] bg-[#fef3f2] px-3 py-2 text-sm font-medium text-[#b42318]">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-md bg-electric text-sm font-semibold text-white transition-colors hover:bg-electric-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
