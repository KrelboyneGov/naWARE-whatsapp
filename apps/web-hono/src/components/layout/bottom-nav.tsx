import { Link } from "@tanstack/react-router";

import { ACCOUNT_ITEM_SIGNED_IN, ACCOUNT_ITEM_SIGNED_OUT, MOBILE_NAV } from "./nav-items";

/** Mobile bottom navigation: Inicio, Mapa, Reportar, Ayudar, Cuenta. */
export function BottomNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const items = [...MOBILE_NAV, isAuthenticated ? ACCOUNT_ITEM_SIGNED_IN : ACCOUNT_ITEM_SIGNED_OUT];
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={label}>
            <Link
              to={to as "/"}
              activeOptions={{ exact: to === "/" }}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium text-muted-foreground data-[status=active]:text-primary"
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
