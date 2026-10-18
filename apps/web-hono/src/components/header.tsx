import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Badge, buttonVariants } from "@emergency-map/web-ui";

import UserMenu from "./user-menu";
import { DESKTOP_NAV, REPORT_ITEM } from "./layout/nav-items";
import { cn } from "@/lib/utils";
import type { AuthSession } from "@/lib/auth/types";

interface HeaderProps {
  isAuthenticated: boolean;
  userName: AuthSession["user"]["name"];
  userEmail: AuthSession["user"]["email"];
  userRole?: string | null;
  hideOnMobile?: boolean;
}

/**
 * 64px header. On mobile only the logo and the account menu stay: navigation and Reportar live in
 * BottomNav. `hideOnMobile` drops it on full-screen routes such as /mapa.
 */
export default function Header({
  isAuthenticated,
  userName,
  userEmail,
  userRole,
  hideOnMobile = false,
}: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border-subtle bg-surface-card",
        hideOnMobile && "max-md:hidden",
      )}
    >
      <div className="flex h-16 items-center gap-8 px-4 md:px-6">
        <div className="flex items-center gap-2.5">
          <Link
            to="/"
            className="text-[17px] font-semibold tracking-[-0.02em] text-text-primary hover:text-text-primary hover:no-underline"
          >
            KlAimate<span className="text-accent-primary">.</span>
          </Link>
          <Badge
            variant="secondary"
            className="hidden h-[22px] rounded-full bg-status-neutral-quiet px-2.5 text-xs text-text-secondary sm:inline-flex"
          >
            Demostración
          </Badge>
        </div>
        <nav
          aria-label="Principal"
          className="hidden items-center gap-1 text-sm font-medium md:flex"
        >
          {DESKTOP_NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to as "/"}
              activeOptions={{ exact: to === "/" }}
              className="rounded-lg px-3 py-2 text-text-secondary transition-colors hover:text-text-primary hover:no-underline data-[status=active]:bg-surface-quiet data-[status=active]:text-text-primary"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to={REPORT_ITEM.to as "/"}
            className={cn(
              buttonVariants(),
              "hidden h-[34px] gap-1.5 md:inline-flex rounded-lg px-3.5 text-sm font-medium text-white hover:bg-accent-primary-hover hover:text-white hover:no-underline",
            )}
          >
            <Plus className="size-4" aria-hidden />
            {REPORT_ITEM.label}
          </Link>
          <div className={isAuthenticated ? "" : "hidden md:block"}>
            <UserMenu
              userName={userName}
              userEmail={userEmail}
              userRole={userRole}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
