import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { BroadcastPanel } from "@/components/broadcast/broadcast-panel";
import { isInternalRole } from "@/components/layout/nav-items";

export const Route = createFileRoute("/difusion")({
  head: () => ({ meta: [{ title: "Borradores de difusión" }] }),
  beforeLoad: ({ context, location }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: "/auth/login", search: { redirect: location.href } });
    }
  },
  component: DifusionRoute,
});

function DifusionRoute() {
  const { session } = Route.useRouteContext();
  const role = (session?.user as { role?: string | null } | undefined)?.role;

  if (!isInternalRole(role)) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-xl font-semibold">Acceso restringido</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Los borradores de difusión son una herramienta interna para el equipo de revisión.
        </p>
        <Link to="/mapa" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
          <ArrowLeft className="size-3.5" aria-hidden />
          Volver al mapa público
        </Link>
      </main>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BroadcastPanel />
    </div>
  );
}
