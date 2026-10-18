import {
  CircleUserRound,
  HandHeart,
  House,
  List,
  Map,
  PlusCircle,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Desktop primary navigation (design doc 02). "Reportar" is the CTA, rendered apart. */
export const DESKTOP_NAV: NavItem[] = [
  { to: "/", label: "Inicio", icon: House },
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
  { to: "/ayudar", label: "Ayudar", icon: HandHeart },
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
