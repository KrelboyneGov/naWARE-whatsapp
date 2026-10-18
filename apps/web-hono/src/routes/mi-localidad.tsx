import { createFileRoute } from "@tanstack/react-router";
import { LocalityPage } from "@/components/locality/locality-page";

export const Route = createFileRoute("/mi-localidad")({
  head: () => ({ meta: [{ title: "Mi localidad" }] }),
  component: LocalityPage,
});
