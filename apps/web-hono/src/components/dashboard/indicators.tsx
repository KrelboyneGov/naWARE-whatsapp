import { Link } from "@tanstack/react-router";

import { DASHBOARD_PERIOD_LABEL, type DashboardView } from "./use-dashboard-data";

interface IndicatorProps {
  to: string;
  value: number;
  label: string;
  note: string;
  coverage: string;
}

function Indicator({ to, value, label, note, coverage }: IndicatorProps) {
  return (
    <Link
      to={to as "/"}
      className="grid content-start gap-1 rounded-xl border border-[var(--border-subtle)] bg-card px-[18px] py-4 text-foreground shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--border-strong)]"
    >
      <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
      <span className="tabular font-mono text-[28px] font-medium">{value}</span>
      <span className="text-xs text-[var(--text-tertiary)]">{note}</span>
      <span className="text-xs text-[var(--text-secondary)]">{coverage}</span>
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
        note={`${scopeLabel} · ${DASHBOARD_PERIOD_LABEL} · fuentes conectadas`}
        coverage="Solo reportes de demostración; no es un conteo completo del país."
      />
      <Indicator
        to="/mapa"
        value={view.activeNotices.length}
        label="Avisos oficiales vigentes"
        note={`${scopeLabel} · vigencia declarada por la fuente`}
        coverage={`${sourceText}. Sin aviso no significa sin riesgo.`}
      />
      <Indicator
        to="/ayudar"
        value={view.openNeeds.length}
        label="Necesidades abiertas"
        note={`${scopeLabel} · según actualización de las organizaciones`}
        coverage="Solo organizaciones de demostración."
      />
    </section>
  );
}
