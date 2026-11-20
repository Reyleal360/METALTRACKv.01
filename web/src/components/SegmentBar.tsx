// Barra de avance segmentada: un segmento por proceso del recorrido.
export function SegmentBar({
  statuses,
  late = false,
}: {
  statuses: string[];
  late?: boolean;
}) {
  return (
    <div className="flex min-w-14 flex-1 gap-0.5" aria-hidden="true">
      {statuses.map((status, i) => (
        <i
          key={i}
          className={`block h-1.5 flex-1 rounded-[1px] ${
            status === "DONE"
              ? "bg-steel"
              : status === "IN_PROGRESS"
                ? late
                  ? "bg-late"
                  : "bg-electric"
                : "bg-[#cbd2de]"
          }`}
        />
      ))}
    </div>
  );
}
