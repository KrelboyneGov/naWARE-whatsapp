import { Link } from "@tanstack/react-router";

import { DASHBOARD_PERIOD_LABEL, type DashboardView } from "./use-dashboard-data";

interface IndicatorProps {
  to: string;
  value: number;
  label: string;
  period: string;
  coverage: string;
}

function Indicator({ to, value, label, period, coverage }: IndicatorProps) {
  return (
    <Link
      to={to as "/"}
      className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
    >
      <p className="tabular font-heading text-3xl font-bold leading-none">{value}</p>
      <p className="mt-2 text-sm font-medium">{label}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{period}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{coverage}</p>
    </Link>
  );
}

/** Three modest indicators, all derived from the same filtered arrays as the list and map. */
export function Indicators({ view, scopeLabel }: { view: DashboardView; scopeLabel: string }) {
  const sourceText =
    view.noticeSourceCount === 1
      ? "1 fuente conectada (simulada)"
      : `${view.noticeSourceCount} fuentes conectadas (simuladas)`;
  return (
    <section aria-label="Indicadores" className="grid gap-3 sm:grid-cols-3">
      <Indicator
        to="/eventos"
        value={view.events.length}
        label="Eventos publicados"
        period={`${scopeLabel} · ${DASHBOARD_PERIOD_LABEL}`}
        coverage="Solo reportes de demostración; no es un conteo completo del país."
      />
      <Indicator
        to="/mapa"
        value={view.activeNotices.length}
        label="Avisos oficiales vigentes"
        period={`${scopeLabel} · vigentes ahora`}
        coverage={`${sourceText}. Sin aviso no significa sin riesgo.`}
      />
      <Indicator
        to="/ayudar"
        value={view.openNeeds.length}
        label="Necesidades abiertas"
        period={`${scopeLabel} · abiertas ahora`}
        coverage="Solo organizaciones de demostración."
      />
    </section>
  );
}
