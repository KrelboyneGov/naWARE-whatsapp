import type { NeedStatus } from "@emergency-map/domain/constants";
import type { CollectionPoint } from "@emergency-map/domain/schemas";
import { cn } from "@/lib/utils";
import { NEED_STATUS_LABELS } from "@/lib/labels";

const dateFormat = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "14 oct 2026", Lima time. */
export function fmtDate(d: Date | null | undefined): string {
  return d ? dateFormat.format(d) : "sin fecha";
}

const NEED_TONES: Record<NeedStatus, string> = {
  open: "bg-status-positive-quiet text-status-positive",
  paused: "bg-status-warning-quiet text-status-warning",
  covered: "bg-status-neutral-quiet text-status-neutral",
  expired: "bg-status-neutral-quiet text-status-neutral",
};

export function NeedStatusBadge({ status }: { status: NeedStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        NEED_TONES[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {NEED_STATUS_LABELS[status]}
    </span>
  );
}

export function PointStatusBadge({ status }: { status: CollectionPoint["status"] }) {
  const label = status === "active" ? "Operativo según la organización" : "Cerrado temporalmente";
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-status-neutral-quiet px-2 py-0.5 text-xs font-medium text-status-neutral">
      {label}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-[color:var(--text-secondary)]">{label}</dt>
      <dd className="m-0 min-w-0 break-words">{children}</dd>
    </>
  );
}
