import {
  CONFIRMED_MIN_STILL_THERE,
  POSSIBLY_RESOLVED_MIN_NOT_THERE,
  SIGNAL_WINDOW_HOURS,
  type CommunityState,
} from "../constants";
import type { EventSignal, SignalSummary } from "../schemas/signal";

/** Keeps only the latest signal of each person: changing your mind replaces your answer. */
export function latestSignalPerReporter(signals: readonly EventSignal[]): EventSignal[] {
  const byKey = new Map<string, EventSignal>();
  for (const s of signals) {
    const prev = byKey.get(s.reporterKey);
    if (!prev || s.createdAt > prev.createdAt) byKey.set(s.reporterKey, s);
  }
  return [...byKey.values()];
}

/**
 * Turns signals into what the card says. Only signals inside SIGNAL_WINDOW_HOURS count, so old
 * answers fade instead of closing the event: with no recent signals the state is
 * "no_recent_signals", never "resolved".
 */
export function summarizeSignals(signals: readonly EventSignal[], now: Date): SignalSummary {
  const latest = latestSignalPerReporter(signals);
  const cutoff = now.getTime() - SIGNAL_WINDOW_HOURS * 3_600_000;
  const recent = latest.filter((s) => s.createdAt.getTime() >= cutoff);

  const stillThere = recent.filter((s) => s.kind === "still_there").length;
  const worse = recent.filter((s) => s.kind === "worse").length;
  const notThere = recent.filter((s) => s.kind === "not_there").length;
  const present = stillThere + worse;
  const lastSignalAt = latest.reduce<Date | null>(
    (acc, s) => (!acc || s.createdAt > acc ? s.createdAt : acc),
    null,
  );

  let state: CommunityState;
  if (recent.length === 0) state = "no_recent_signals";
  else if (notThere >= POSSIBLY_RESOLVED_MIN_NOT_THERE && notThere > present) {
    state = "possibly_resolved";
  } else if (worse > 0 && present >= CONFIRMED_MIN_STILL_THERE && worse >= notThere) {
    state = "getting_worse";
  } else if (present >= CONFIRMED_MIN_STILL_THERE && present > notThere) {
    state = "confirmed_by_neighbours";
  } else state = "mixed";

  return { stillThere, notThere, worse, lastSignalAt, state };
}
