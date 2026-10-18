import { createFileRoute } from "@tanstack/react-router";
import { OrganizationWorkspace } from "@/components/organization/organization-workspace";

export const Route = createFileRoute("/organizacion")({
  head: () => ({ meta: [{ title: "Mi organización" }] }),
  component: OrganizacionPage,
});

function OrganizacionPage() {
  const { isAuthenticated } = Route.useRouteContext();
  return <OrganizationWorkspace isAuthenticated={isAuthenticated} />;
}
