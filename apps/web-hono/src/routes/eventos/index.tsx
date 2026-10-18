import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "@/components/history/history-page";
import { historySearchSchema, type HistorySearch } from "@/components/history/history-filters";

export const Route = createFileRoute("/eventos/")({
  validateSearch: (search: Record<string, unknown>): HistorySearch =>
    historySearchSchema.parse(search),
  head: () => ({ meta: [{ title: "Eventos y actualizaciones" }] }),
  component: EventosPage,
});

function EventosPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const patch = useCallback(
    (p: Partial<HistorySearch>) =>
      navigate({ search: (prev) => ({ ...prev, ...p }), replace: true, resetScroll: false }),
    [navigate],
  );
  return <HistoryPage search={search} onPatch={patch} />;
}
