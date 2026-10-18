import type { CommunityState, HazardType } from "@emergency-map/domain/constants";
import {
  CircleAlert,
  Construction,
  Droplets,
  Flame,
  Mountain,
  Pickaxe,
  TreeDeciduous,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** The words people use. Order is the order of the quick-report grid. */
export const HAZARD_LABELS: Record<HazardType, string> = {
  debris_flow: "Huaico",
  river_overflow: "Desborde de río",
  rockfall: "Derrumbe",
  urban_flooding: "Aniego",
  fire: "Incendio",
  road_blocked: "Vía bloqueada",
  fallen_tree: "Árbol caído",
  power_line_down: "Poste o cable caído",
  other: "Otro peligro",
};

export const HAZARD_ICONS: Record<HazardType, LucideIcon> = {
  debris_flow: Mountain,
  river_overflow: Waves,
  rockfall: Pickaxe,
  urban_flooding: Droplets,
  fire: Flame,
  road_blocked: Construction,
  fallen_tree: TreeDeciduous,
  power_line_down: Zap,
  other: CircleAlert,
};

/** Tile tint per hazard, so the grid reads at a glance like Waze. */
export const HAZARD_TINT: Record<HazardType, string> = {
  debris_flow: "bg-amber-100 text-amber-800",
  river_overflow: "bg-sky-100 text-sky-800",
  rockfall: "bg-stone-200 text-stone-800",
  urban_flooding: "bg-cyan-100 text-cyan-800",
  fire: "bg-red-100 text-red-700",
  road_blocked: "bg-orange-100 text-orange-800",
  fallen_tree: "bg-emerald-100 text-emerald-800",
  power_line_down: "bg-yellow-100 text-yellow-800",
  other: "bg-slate-100 text-slate-700",
};

/** What neighbours say now. Never phrased as verified: that is the review badge's job. */
export const COMMUNITY_STATE_COPY: Record<CommunityState, { label: string; tone: string }> = {
  confirmed_by_neighbours: {
    label: "Sigue ahí, según vecinos",
    tone: "bg-amber-50 text-amber-800 border-amber-200",
  },
  getting_worse: {
    label: "Empeorando, según vecinos",
    tone: "bg-red-50 text-red-700 border-red-200",
  },
  possibly_resolved: {
    label: "Posiblemente resuelto",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  mixed: { label: "Respuestas mixtas", tone: "bg-slate-50 text-slate-700 border-slate-200" },
  no_recent_signals: {
    label: "Sin confirmaciones recientes",
    tone: "bg-slate-50 text-slate-600 border-slate-200",
  },
};
