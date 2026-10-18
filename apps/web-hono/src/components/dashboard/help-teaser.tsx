import { Link } from "@tanstack/react-router";
import { HandHeart } from "lucide-react";
import { buttonVariants } from "@emergency-map/web-ui";

import type { DashboardSnapshot, DashboardView } from "./use-dashboard-data";
import { DemoBadge } from "../event/demo-badge";
import { EmptyState } from "../event/empty-state";
import { NEED_CATEGORY_LABELS, formatDateTime } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Teaser of open needs. Help in teal never means "safe zone". */
export function HelpTeaser({
  view,
  snapshot,
}: {
  view: DashboardView;
  snapshot: DashboardSnapshot;
}) {
  const orgName = (id: string) => snapshot.organizations.find((o) => o.id === id)?.name ?? "";
  return (
    <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="ayudar">
      <h2 id="ayudar" className="flex items-center gap-2 font-heading text-xl font-bold">
        <HandHeart className="size-5 text-help" aria-hidden />
        Ayudar
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Necesidades abiertas publicadas por organizaciones. Revisa vigencia y horario antes de
        llevar algo.
      </p>
      {view.openNeeds.length === 0 ? (
        <EmptyState
          className="mt-3"
          description="No hay necesidades abiertas en las fuentes conectadas para este ámbito."
        />
      ) : (
        <ul className="mt-3 space-y-2">
          {view.openNeeds.map((need) => (
            <li key={need.id} className="rounded-lg border border-border p-3">
              <p className="text-sm font-semibold">{need.title}</p>
              <p className="text-[13px] text-muted-foreground">
                {NEED_CATEGORY_LABELS[need.category]} · para {need.destinationTerritory.name} ·{" "}
                {orgName(need.organizationId)}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {need.deadline
                  ? `Vigente hasta ${formatDateTime(need.deadline)}`
                  : "Sin fecha límite declarada"}
              </p>
              {need.isDemo && <DemoBadge className="mt-2" />}
            </li>
          ))}
        </ul>
      )}
      <Link
        to={"/ayudar" as "/"}
        className={cn(buttonVariants({ variant: "outline" }), "mt-4 h-10 px-4 text-sm")}
      >
        Ver cómo ayudar
      </Link>
    </section>
  );
}
