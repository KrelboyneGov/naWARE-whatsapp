import { createFileRoute } from "@tanstack/react-router";
import { ReportForm } from "@/components/report/report-form";

export const Route = createFileRoute("/reportar")({
  head: () => ({ meta: [{ title: "Reportar un evento" }] }),
  component: ReportarPage,
});

function ReportarPage() {
  const { isAuthenticated } = Route.useRouteContext();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Cuéntanos qué está pasando</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Comparte lo que observaste y dónde ocurrió. Tu aporte pasará por controles antes de
        publicarse.
      </p>
      <p className="text-muted-foreground mt-1 text-xs">
        No te acerques a una zona peligrosa para obtener evidencia.
      </p>
      <div className="mt-6">
        <ReportForm isAuthenticated={isAuthenticated} />
      </div>
    </main>
  );
}
