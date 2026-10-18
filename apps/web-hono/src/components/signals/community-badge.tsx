import { Users } from "lucide-react";
import type { SignalSummary } from "@emergency-map/domain/schemas";
import { useSignalSummary } from "@/lib/community-source";
import { COMMUNITY_STATE_COPY } from "@/lib/hazard-labels";
import { formatRelative } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** "Sigue ahí, según vecinos · 3 personas · hace 12 min". Separate from the review badge. */
export function CommunityBadge({
  summary,
  now,
  className,
}: {
  summary: SignalSummary;
  now: Date;
  className?: string;
}) {
  const copy = COMMUNITY_STATE_COPY[summary.state];
  const people =
    summary.state === "possibly_resolved" ? summary.notThere : summary.stillThere + summary.worse;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[13px] font-medium",
        copy.tone,
        className,
      )}
    >
      <Users className="size-3.5" aria-hidden />
      {copy.label}
      {summary.state !== "no_recent_signals" && people > 0 && (
        <span className="font-normal">
          {" "}
          · {people} {people === 1 ? "persona" : "personas"}
        </span>
      )}
      {summary.lastSignalAt && (
        <span className="font-normal"> · {formatRelative(summary.lastSignalAt, now)}</span>
      )}
    </span>
  );
}

/** Same badge, reading the summary for one event from the community source. */
export function EventCommunityBadge({ eventId, now }: { eventId: string; now: Date }) {
  const summary = useSignalSummary(eventId);
  if (!summary || (summary.state === "no_recent_signals" && !summary.lastSignalAt)) return null;
  return <CommunityBadge summary={summary} now={now} />;
}
