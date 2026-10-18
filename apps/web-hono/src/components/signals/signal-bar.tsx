import { ThumbsDown, ThumbsUp, TrendingUp } from "lucide-react";
import type { SignalKind } from "@emergency-map/domain/constants";
import { Button, cn } from "@emergency-map/web-ui";
import {
  useMySignal,
  useReporter,
  useSignalSummary,
  useSubmitSignal,
} from "@/lib/community-source";
import { CommunityBadge } from "./community-badge";

const OPTIONS: { kind: SignalKind; label: string; icon: typeof ThumbsUp }[] = [
  { kind: "still_there", label: "Sigue ahí", icon: ThumbsUp },
  { kind: "worse", label: "Está peor", icon: TrendingUp },
  { kind: "not_there", label: "Ya no está", icon: ThumbsDown },
];

/**
 * Waze-style "¿Sigue ahí?". One tap; tapping again changes your answer. What neighbours say moves
 * only the community badge, never the review status, and never closes the event.
 */
export function SignalBar({ eventId, now }: { eventId: string; now: Date }) {
  const summary = useSignalSummary(eventId);
  const mine = useMySignal(eventId);
  const me = useReporter();
  const submit = useSubmitSignal();

  return (
    <section
      aria-labelledby={`signal-${eventId}`}
      className="grid gap-3 rounded-xl border border-[var(--border-subtle)] bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`signal-${eventId}`} className="text-base font-semibold">
          ¿Sigue ahí?
        </h2>
        {summary && <CommunityBadge summary={summary} now={now} />}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map(({ kind, label, icon: Icon }) => (
          <Button
            key={kind}
            variant={mine === kind ? "default" : "outline"}
            className={cn("h-14 flex-col gap-1 text-[13px]")}
            aria-pressed={mine === kind}
            disabled={submit.isPending}
            onClick={() => submit.mutate({ eventId, kind })}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Button>
        ))}
      </div>
      <p className="text-[13px] text-[var(--text-secondary)]">
        {mine
          ? "Gracias. Puedes cambiar tu respuesta si la situación cambia."
          : "Si estás cerca, confirma lo que ves ahora."}{" "}
        {me.isAnonymous &&
          "Respondes sin cuenta: tu respuesta cuenta, pero no verifica el reporte."}{" "}
        Lo que dicen los vecinos no reemplaza la revisión.
      </p>
    </section>
  );
}
