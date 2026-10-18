import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@emergency-map/web-ui";

import UserMenu from "./user-menu";
import { DESKTOP_NAV, REPORT_ITEM } from "./layout/nav-items";
import { cn } from "@/lib/utils";
import type { AuthSession } from "@/lib/auth/types";

interface HeaderProps {
  isAuthenticated: boolean;
  userName: AuthSession["user"]["name"];
  userEmail: AuthSession["user"]["email"];
}

/** 64px header. On mobile only the logo and the Reportar shortcut stay; the rest moves to BottomNav. */
export default function Header({ isAuthenticated, userName, userEmail }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="font-heading text-xl font-extrabold tracking-tight text-foreground"
          >
            Andes Alerta
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {DESKTOP_NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to as "/"}
                activeOptions={{ exact: to === "/" }}
                className="rounded-md px-3 py-2 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-brand-soft data-[status=active]:text-primary"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={REPORT_ITEM.to as "/"}
            className={cn(buttonVariants(), "h-10 px-4 text-sm font-semibold")}
          >
            {REPORT_ITEM.label}
          </Link>
          <div className={isAuthenticated ? "" : "hidden md:block"}>
            <UserMenu userName={userName} userEmail={userEmail} isAuthenticated={isAuthenticated} />
          </div>
        </div>
      </div>
    </header>
  );
}
