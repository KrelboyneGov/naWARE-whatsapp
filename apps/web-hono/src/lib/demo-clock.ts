import { DEMO_NOW } from "@emergency-map/domain/demo";
import { APP_TIME_ZONE } from "@emergency-map/domain/constants";

/**
 * The prototype runs on a frozen clock so relative times in the demo data never drift.
 * Use `DEMO_NOW` wherever "now" is needed with demo data.
 */
export { DEMO_NOW };

const clockFormat = new Intl.DateTimeFormat("es-PE", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "sáb, 17 oct, 10:00" in Lima time. */
export function formatDemoClock(): string {
  return clockFormat.format(DEMO_NOW);
}
