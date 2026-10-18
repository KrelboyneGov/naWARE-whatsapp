import { useQuery } from "@tanstack/react-query";
import { DEMO_EVENTS } from "@emergency-map/domain/demo";
import type { PublicEvent } from "@emergency-map/domain/schemas";

import { buildShareText, type Draft, type Network } from "./draft-logic";

/**
 * Drafts are derived from the public events. There is no drafts endpoint yet (`events.share`
 * returns the public summary for one event), so the demo dataset feeds this list. To exercise
 * the stale-draft state, DEMO-02 is treated as drafted while it was still "unverified".
 */
async function fetchDrafts(): Promise<Draft[]> {
  const networks: Network[] = ["X", "Instagram", "X"];
  const picks: PublicEvent[] = ["DEMO-02", "DEMO-01", "DEMO-07"]
    .map((id) => DEMO_EVENTS.find((e) => e.id === id))
    .filter((e): e is PublicEvent => !!e);
  return picks.map((event, i) => {
    const generatedReviewStatus = event.id === "DEMO-02" ? "unverified" : event.reviewStatus;
    return {
      id: `DIF-0${i + 1}`,
      event,
      generatedVersion: event.versionSeq,
      generatedReviewStatus,
      network: networks[i] ?? "X",
      text: buildShareText(event, generatedReviewStatus),
    };
  });
}

export function useDrafts() {
  return useQuery({ queryKey: ["broadcast", "drafts"], queryFn: fetchDrafts, staleTime: Infinity });
}
