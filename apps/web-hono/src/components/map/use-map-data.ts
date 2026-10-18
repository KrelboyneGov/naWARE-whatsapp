import { useQuery } from "@tanstack/react-query";
import {
  DEMO_COLLECTION_POINTS,
  DEMO_EVENTS,
  DEMO_NOTICES,
  DEMO_NOW,
  DEMO_TERRITORIES,
} from "@emergency-map/domain/demo";

/**
 * Map data source. The demo dataset is the queryFn today; swap the body for an API call later
 * and the filtering in `lib/map-filters.ts` keeps working on the same shapes.
 */
export function useMapData() {
  return useQuery({
    queryKey: ["map-data", "demo"],
    queryFn: async () => ({
      now: DEMO_NOW,
      events: DEMO_EVENTS,
      notices: DEMO_NOTICES,
      collectionPoints: DEMO_COLLECTION_POINTS,
      territories: DEMO_TERRITORIES,
    }),
    staleTime: Infinity,
  });
}
