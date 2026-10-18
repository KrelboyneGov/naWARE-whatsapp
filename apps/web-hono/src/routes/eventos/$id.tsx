import { createFileRoute } from "@tanstack/react-router";
import { EventDetailPage } from "@/components/event-detail/event-detail-page";

export const Route = createFileRoute("/eventos/$id")({
  head: () => ({ meta: [{ title: "Detalle de evento" }] }),
  component: EventoPage,
});

function EventoPage() {
  const { id } = Route.useParams();
  const { isAuthenticated } = Route.useRouteContext();
  return <EventDetailPage id={id} isAuthenticated={isAuthenticated} />;
}
