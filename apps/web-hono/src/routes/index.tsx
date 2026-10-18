import { createFileRoute } from "@tanstack/react-router";

import { Dashboard } from "@/components/dashboard/dashboard";
import { dashboardQueryOptions } from "@/components/dashboard/use-dashboard-data";

export const Route = createFileRoute("/")({
  // Prefetch so the first server render already contains the list.
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQueryOptions),
  component: Dashboard,
});
