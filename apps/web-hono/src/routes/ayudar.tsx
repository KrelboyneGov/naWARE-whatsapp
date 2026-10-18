import { createFileRoute } from "@tanstack/react-router";
import { AyudarPage } from "@/components/help/ayudar-page";

export const Route = createFileRoute("/ayudar")({
  head: () => ({ meta: [{ title: "Ayudar" }] }),
  component: AyudarPage,
});
