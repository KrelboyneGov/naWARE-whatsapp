import { useQuery } from "@tanstack/react-query";
import { DEMO_SOURCES } from "@emergency-map/domain/demo";
import type { DataSource } from "@emergency-map/domain/schemas";

import { client } from "@/lib/orpc-client";

export interface SourcesResult {
  sources: DataSource[];
  /** True when the API could not be reached and the demo dataset is shown instead. */
  fromDemoFallback: boolean;
}

const toDate = (v: Date | string | null): Date | null => (v ? new Date(v) : null);

/** `sources.list` through the API; on failure the demo sources are shown and labelled as such. */
async function fetchSources(): Promise<SourcesResult> {
  try {
    const res = await client.sources.list({});
    if (res.error || !res.data) throw new Error(res.error?.message ?? "empty response");
    return {
      fromDemoFallback: false,
      sources: res.data.map((s) => ({
        ...s,
        lastPublishedAt: toDate(s.lastPublishedAt),
        lastSuccessfulFetchAt: toDate(s.lastSuccessfulFetchAt),
      })),
    };
  } catch {
    return { sources: DEMO_SOURCES, fromDemoFallback: true };
  }
}

export function useSources() {
  return useQuery({ queryKey: ["sources", "list"], queryFn: fetchSources, staleTime: 60_000 });
}
