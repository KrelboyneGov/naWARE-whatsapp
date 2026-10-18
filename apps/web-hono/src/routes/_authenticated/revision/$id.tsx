import { createFileRoute } from "@tanstack/react-router";

import { ReviewCasePage } from "@/components/review/case-page";
import { ReviewGate, sessionRole } from "@/components/review/review-gate";

export const Route = createFileRoute("/_authenticated/revision/$id")({
  head: () => ({ meta: [{ title: "Caso en revisión" }] }),
  component: RevisionCasoPage,
});

function RevisionCasoPage() {
  const { id } = Route.useParams();
  const { session } = Route.useRouteContext();
  return (
    <ReviewGate role={sessionRole(session)}>
      <ReviewCasePage key={id} eventId={id} />
    </ReviewGate>
  );
}
