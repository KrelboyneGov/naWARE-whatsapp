import { Link } from "@tanstack/react-router";
import { HandHeart } from "lucide-react";

import type { DashboardSnapshot, DashboardView } from "./use-dashboard-data";

/**
 * Teaser of open needs and reception points. Help in teal never means "safe zone"; the copy says
 * so explicitly. Counts follow the same scope as the rest of the dashboard.
 */
export function HelpTeaser({
  view,
}: {
  view: DashboardView;
  /** Kept for API compatibility with earlier callers; counts now come from `view`. */
  snapshot?: DashboardSnapshot;
}) {
  const needs = view.openNeeds.length;
  const points = view.collectionPointCount;
  return (
    <Link
      to={"/ayudar" as "/"}
      className="grid gap-1 rounded-xl border border-help bg-help-quiet p-4 text-foreground hover:no-underline"
    >
      <span className="flex items-center gap-2 text-[15px] font-semibold text-help">
        <HandHeart className="size-4" aria-hidden />
        Encuentra dónde y cómo ayudar
      </span>
      <span className="text-[13px] text-[var(--text-secondary)]">
        {needs} {needs === 1 ? "necesidad abierta" : "necesidades abiertas"} y {points}{" "}
        {points === 1 ? "punto de recepción" : "puntos de recepción"} de ejemplo. Nada aquí indica
        zona segura.
      </span>
    </Link>
  );
}
