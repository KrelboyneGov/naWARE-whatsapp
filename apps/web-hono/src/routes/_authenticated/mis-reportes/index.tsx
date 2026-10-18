import { createFileRoute } from "@tanstack/react-router";

import { MyReportsPage } from "@/components/my-reports/my-reports-page";

export const Route = createFileRoute("/_authenticated/mis-reportes/")({
  head: () => ({ meta: [{ title: "Mis reportes" }] }),
  component: MyReportsPage,
});
