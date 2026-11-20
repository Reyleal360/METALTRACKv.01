"use client";

import { useRouter } from "next/navigation";

export function PiecePicker({
  options,
  current,
}: {
  options: { id: number; label: string }[];
  current: number;
}) {
  const router = useRouter();
  return (
    <label className="flex min-w-60 flex-col gap-1">
      <span className="text-[11px] font-semibold text-muted">Pieza en seguimiento</span>
      <select
        value={current}
        onChange={(e) => router.push(`/seguimiento?pedido=${e.target.value}`)}
        className="h-10 rounded-md border border-[#c3cbd9] bg-white px-2.5 font-mono text-[13px]"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
