import {
  CircleUserRound,
  HandHeart,
  House,
  List,
  Map,
  PlusCircle,
  Siren,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@emergency-map/domain/constants";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Desktop primary navigation (design doc 02). "Reportar" is the CTA, rendered apart. */
export const DESKTOP_NAV: NavItem[] = [
  { to: "/", label: "Inicio", icon: House },
  { to: "/urgencias", label: "Urgencias", icon: Siren },
  { to: "/mapa", label: "Mapa", icon: Map },
  { to: "/eventos", label: "Eventos", icon: List },
  { to: "/ayudar", label: "Ayudar", icon: HandHeart },
];

export const REPORT_ITEM: NavItem = { to: "/reportar", label: "Reportar", icon: PlusCircle };

/** Mobile bottom navigation. The last entry depends on the session, see BottomNav. */
export const MOBILE_NAV: NavItem[] = [
  { to: "/", label: "Inicio", icon: House },
  { to: "/mapa", label: "Mapa", icon: Map },
  REPORT_ITEM,
  { to: "/urgencias", label: "Urgencias", icon: Siren },
];

export const ACCOUNT_ITEM_SIGNED_OUT: NavItem = {
  to: "/auth/login",
  label: "Cuenta",
  icon: CircleUserRound,
};
export const ACCOUNT_ITEM_SIGNED_IN: NavItem = {
  to: "/mis-reportes",
  label: "Cuenta",
  icon: CircleUserRound,
};

/**
 * Routes reachable outside the primary nav, grouped for the account menu.
 * Public secondary pages are listed for signed-in and signed-out users alike;
 * internal pages only for reviewer/admin roles.
 */
export const ACCOUNT_LINKS: Array<{ to: string; label: string }> = [
  { to: "/ayudar", label: "Ayudar" },
  { to: "/mi-localidad", label: "Mi localidad" },
  { to: "/cerca", label: "Cerca de mí" },
  { to: "/fuentes", label: "Fuentes" },
];

export const SIGNED_IN_LINKS: Array<{ to: string; label: string }> = [
  { to: "/mis-reportes", label: "Mis reportes" },
  { to: "/organizacion", label: "Mi organización" },
];

/** Internal tooling (/revision, /revision/$id, /difusion). Shown only for these roles. */
export const INTERNAL_ROLES: readonly UserRole[] = ["moderator", "admin"];
export const INTERNAL_LINKS: Array<{ to: string; label: string }> = [
  { to: "/revision", label: "Revisión" },
  { to: "/difusion", label: "Difusión" },
];

export function isInternalRole(role: string | null | undefined): boolean {
  return !!role && (INTERNAL_ROLES as readonly string[]).includes(role);
}
