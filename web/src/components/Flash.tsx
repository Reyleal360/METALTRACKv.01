// Mensaje de resultado que llega por la URL (?ok=... / ?error=...).
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) {
    return (
      <div role="alert" className="rounded-md border border-[#fbd5d1] bg-[#fef3f2] px-3.5 py-2.5 text-[13px] font-medium text-[#b42318]">
        {error}
      </div>
    );
  }
  if (ok) {
    return (
      <div role="status" className="rounded-md border border-[#bfe3d9] bg-[#eaf6f2] px-3.5 py-2.5 text-[13px] font-medium text-[#0b6b58]">
        {ok}
      </div>
    );
  }
  return null;
}

/** Toma un valor de searchParams que puede ser texto, lista o nada. */
export const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
