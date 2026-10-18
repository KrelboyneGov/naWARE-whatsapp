import { createFileRoute } from "@tanstack/react-router";

import { ReviewQueuePage } from "@/components/review/queue-page";
import { ReviewGate, sessionRole } from "@/components/review/review-gate";

export const Route = createFileRoute("/_authenticated/revision/")({
  head: () => ({ meta: [{ title: "Revisión de reportes" }] }),
  component: RevisionPage,
});

function RevisionPage() {
  const { session } = Route.useRouteContext();
  return (
    <ReviewGate role={sessionRole(session)}>
      <ReviewQueuePage />
    </ReviewGate>
  );
}
