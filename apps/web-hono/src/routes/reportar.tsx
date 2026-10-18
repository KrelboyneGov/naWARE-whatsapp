import { createFileRoute } from "@tanstack/react-router";
import { ReportForm } from "@/components/report/report-form";

export const Route = createFileRoute("/reportar")({
  head: () => ({ meta: [{ title: "Reportar un evento" }] }),
  component: ReportarPage,
});

function ReportarPage() {
  const { isAuthenticated } = Route.useRouteContext();
  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pt-5 md:px-10 md:py-8">
      <ReportForm isAuthenticated={isAuthenticated} />
    </main>
  );
}
