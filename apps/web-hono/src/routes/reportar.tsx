import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { QuickReportPanel } from "@/components/quick-report/quick-report-sheet";
import { ReportForm } from "@/components/report/report-form";

const searchSchema = z.object({ modo: z.enum(["rapido", "completo"]).optional().catch(undefined) });

export const Route = createFileRoute("/reportar")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  head: () => ({ meta: [{ title: "Reportar un evento" }] }),
  component: ReportarPage,
});

/** Quick two-tap report by default; the full form (date, evidence, duplicates) stays one tap away. */
function ReportarPage() {
  const { isAuthenticated } = Route.useRouteContext();
  const { modo } = Route.useSearch();
  if (modo === "completo") {
    return (
      <main className="mx-auto w-full max-w-[1100px] px-4 pt-5 md:px-10 md:py-8">
        <Link to="/reportar" search={{}} className="mb-3 inline-block text-sm text-primary">
          ← Volver al reporte rápido
        </Link>
        <ReportForm isAuthenticated={isAuthenticated} />
      </main>
    );
  }
  return (
    <main className="mx-auto grid w-full max-w-[560px] gap-1 pt-5 md:py-8">
      <h1 className="px-5 font-heading text-2xl font-semibold tracking-tight">
        ¿Qué está pasando?
      </h1>
      <p className="px-5 text-sm text-[var(--text-secondary)]">
        Toca lo que ves y envía. Puedes agregar detalles o fotos después.
      </p>
      <QuickReportPanel />
    </main>
  );
}
