import { createFileRoute } from "@tanstack/react-router";
import { NearbyPage } from "@/components/nearby/nearby-page";

export const Route = createFileRoute("/cerca")({
  head: () => ({ meta: [{ title: "Cerca de mí" }] }),
  component: NearbyPage,
});
