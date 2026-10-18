import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { List, Locate, Map as MapIcon, Search } from "lucide-react";
import { Button, Checkbox, Input, Skeleton, buttonVariants } from "@emergency-map/web-ui";
import { NEED_CATEGORIES, type NeedCategory } from "@emergency-map/domain/constants";
import { DemoBadge } from "../event/demo-badge";
import { NEED_CATEGORY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { PointDetail, OrgDetail, PanelShell } from "./detail-panel";
import { isNeedCurrent, isPointListed, useHelpSnapshot } from "./help-data";
import { ListSkeleton, NeedsList } from "./needs-list";
import { PointsList } from "./points-list";

const HelpMap = lazy(() => import("./help-map"));

type Tab = "needs" | "points";
type Panel = { type: "point" | "org"; id: string } | null;

const TYPE_CHIPS = NEED_CATEGORIES.filter((c) => c !== "other");

export function AyudarPage() {
  const { data, isPending, isError, refetch } = useHelpSnapshot();
  const [q, setQ] = useState("");
  const [types, setTypes] = useState<NeedCategory[]>([]);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("needs");
  const [panel, setPanel] = useState<Panel>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const now = data?.now ?? new Date();
  const points = useMemo(() => (data?.points ?? []).filter(isPointListed), [data]);

  const needs = useMemo(() => {
    if (!data) return [];
    const query = q.trim().toLowerCase();
    return data.needs.filter((n) => {
      if (onlyOpen && !isNeedCurrent(n, data.now)) return false;
      if (types.length && !types.includes(n.category)) return false;
      if (!query) return true;
      const point = data.points.find((p) => p.id === n.collectionPointId);
      const haystack = [
        n.destinationTerritory.name,
        n.destinationTerritory.departmentName,
        point?.territory.name,
        point?.territory.departmentName,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [data, q, types, onlyOpen]);

  const toggleType = (c: NeedCategory) =>
    setTypes((t) => (t.includes(c) ? t.filter((x) => x !== c) : [...t, c]));

  const panelPoint = panel?.type === "point" ? points.find((p) => p.id === panel.id) : undefined;
  const panelOrg =
    panel?.type === "org" ? data?.organizations.find((o) => o.id === panel.id) : undefined;
  const panelOrgOfPoint = panelPoint
    ? data?.organizations.find((o) => o.id === panelPoint.organizationId)
    : undefined;
  const panelTitle = panelPoint?.name ?? panelOrg?.name ?? "Detalle";

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col lg:h-[calc(100dvh-4rem)] lg:flex-row">
      <div className="flex border-b lg:hidden" role="group" aria-label="Vista">
        {(["list", "map"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={mobileView === v}
            onClick={() => setMobileView(v)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-2 text-sm",
              mobileView === v ? "border-b-2 border-primary font-medium" : "text-muted-foreground",
            )}
          >
            {v === "list" ? (
              <List className="size-4" aria-hidden />
            ) : (
              <MapIcon className="size-4" aria-hidden />
            )}
            {v === "list" ? "Lista" : "Mapa"}
          </button>
        ))}
      </div>

      <aside
        aria-label="Necesidades y puntos de recepción"
        className={cn(
          "min-h-0 flex-1 flex-col border-[color:var(--border-subtle)] lg:w-[480px] lg:flex-none lg:border-r",
          mobileView === "list" ? "flex" : "hidden lg:flex",
        )}
      >
        <div className="grid gap-3 border-b border-[color:var(--border-subtle)] px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <h1 className="m-0 text-2xl font-semibold tracking-tight">
              Encuentra dónde y cómo ayudar
            </h1>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[color:var(--text-secondary)]"
                aria-hidden
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Localidad atendida o ciudad de recepción"
                aria-label="Localidad atendida o ciudad de recepción"
                className="h-9 pl-8"
              />
            </div>
            <Link
              to={"/cerca" as "/"}
              className={cn(buttonVariants({ variant: "outline" }), "h-9 whitespace-nowrap px-3")}
            >
              <Locate aria-hidden /> Cerca de mí
            </Link>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de necesidad">
            {TYPE_CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={types.includes(c)}
                onClick={() => toggleType(c)}
                className={cn(
                  "h-7 rounded-full border px-3 text-[13px]",
                  types.includes(c)
                    ? "border-[color:var(--accent-primary)] bg-[color:var(--accent-primary-quiet)] font-medium text-[color:var(--text-accent)]"
                    : "border-[color:var(--border-strong)] text-[color:var(--text-secondary)]",
                )}
              >
                {NEED_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={onlyOpen} onCheckedChange={(v) => setOnlyOpen(v === true)} />
            Solo necesidades vigentes
          </label>
        </div>

        <div
          className="flex gap-1 border-b border-[color:var(--border-subtle)] px-5"
          role="tablist"
        >
          {(
            [
              ["needs", "Necesidades", needs.length],
              ["points", "Puntos de donación", points.length],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "-mb-px h-10 border-b-2 px-3 text-sm",
                tab === value
                  ? "border-[color:var(--accent-primary)] font-medium"
                  : "border-transparent text-[color:var(--text-secondary)]",
              )}
            >
              {label}{" "}
              <span className="font-mono text-xs text-[color:var(--text-secondary)]">{count}</span>
            </button>
          ))}
        </div>

        <div
          className="grid flex-1 content-start gap-2.5 overflow-auto px-5 pt-3 pb-5"
          role="tabpanel"
        >
          {data?.source === "demo" && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-secondary)]">
              <DemoBadge /> Datos de demostración: la API no respondió, se muestra el conjunto de
              ejemplo.
            </div>
          )}
          {isPending && <ListSkeleton />}
          {isError && (
            <div className="grid gap-2 rounded-xl border border-dashed p-4 text-sm">
              <p className="m-0 font-medium">No pudimos cargar la información</p>
              <Button
                variant="outline"
                size="sm"
                className="justify-self-start"
                onClick={() => refetch()}
              >
                Reintentar
              </Button>
            </div>
          )}
          {data && tab === "needs" && (
            <NeedsList
              needs={needs}
              now={now}
              organizations={data.organizations}
              points={data.points}
              onOpenPoint={(id) => setPanel({ type: "point", id })}
              onOpenOrg={(id) => setPanel({ type: "org", id })}
            />
          )}
          {data && tab === "points" && (
            <PointsList
              points={points}
              organizations={data.organizations}
              onOpen={(id) => setPanel({ type: "point", id })}
            />
          )}
        </div>
      </aside>

      <section
        aria-label="Mapa de puntos de recepción"
        className={cn(
          "relative min-h-[24rem] flex-1 bg-[color:var(--surface-quiet)]",
          mobileView === "map" ? "block" : "hidden lg:block",
        )}
      >
        {mounted && data ? (
          <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
            <HelpMap
              points={points}
              centroids={data.centroids}
              selectedId={panel?.type === "point" ? panel.id : null}
              onSelect={(id) => setPanel({ type: "point", id })}
            />
          </Suspense>
        ) : (
          <Skeleton className="h-full w-full rounded-none" aria-label="Cargando el mapa" />
        )}
        <div className="absolute top-3 left-3 z-10 grid gap-1 rounded-lg border border-[color:var(--border-subtle)] bg-background px-3 py-2 text-xs shadow-[var(--shadow-sm)]">
          <span className="flex items-center gap-2">
            <span className="size-3.5 rounded bg-help-quiet ring-[1.5px] ring-help" />
            Punto de recepción (dónde se entrega)
          </span>
          <span className="flex items-center gap-2">
            <span className="size-3.5 rounded-full border-[1.5px] border-dashed border-help" />
            Localidad destinataria (a dónde va la ayuda)
          </span>
        </div>
      </section>

      {panel && data && (panelPoint || panelOrg) && (
        <div className="fixed inset-0 z-40 flex flex-col bg-background lg:static lg:z-auto lg:w-[420px] lg:flex-none lg:border-l lg:border-[color:var(--border-subtle)] [&>aside]:flex-1">
          <PanelShell id={panel.id} title={panelTitle} onClose={() => setPanel(null)}>
            {panelPoint && <PointDetail point={panelPoint} org={panelOrgOfPoint} now={now} />}
            {panelOrg && (
              <OrgDetail org={panelOrg} needs={data.needs} points={data.points} now={now} />
            )}
          </PanelShell>
        </div>
      )}
    </div>
  );
}
