import { createFileRoute } from "@tanstack/react-router";
import { UrgenciesPage } from "@/components/urgencies/urgencies-page";

export const Route = createFileRoute("/urgencias")({
  head: () => ({ meta: [{ title: "Urgencias" }] }),
  component: UrgenciesPage,
});
