import { createFileRoute } from "@tanstack/react-router";

import { SourcesPage } from "@/components/sources/sources-page";
import { isInternalRole } from "@/components/layout/nav-items";

export const Route = createFileRoute("/fuentes")({
  head: () => ({ meta: [{ title: "Estado de las fuentes" }] }),
  component: FuentesRoute,
});

function FuentesRoute() {
  const { session } = Route.useRouteContext();
  return (
    <SourcesPage
      canSeeInternal={isInternalRole((session?.user as { role?: string | null } | undefined)?.role)}
    />
  );
}
