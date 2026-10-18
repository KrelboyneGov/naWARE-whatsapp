import { createFileRoute } from "@tanstack/react-router";
import { ReportForm } from "@/components/report/report-form";

export const Route = createFileRoute("/reportar")({
  head: () => ({ meta: [{ title: "Reportar un evento" }] }),
  component: ReportarPage,
});

function ReportarPage() {
  const { isAuthenticated } = Route.useRouteContext();
  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-8 md:px-10">
      <ReportForm isAuthenticated={isAuthenticated} />
    </main>
  );
}
