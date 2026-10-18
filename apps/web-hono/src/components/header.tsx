import { Link } from "@tanstack/react-router";
import { MessageCircle, Plus } from "lucide-react";
import { Badge, buttonVariants } from "@emergency-map/web-ui";

import UserMenu from "./user-menu";
import { DESKTOP_NAV, REPORT_ITEM } from "./layout/nav-items";
import { cn } from "@/lib/utils";
import { whatsappHolaLink } from "@/lib/whatsapp";
import type { AuthSession } from "@/lib/auth/types";

interface HeaderProps {
  isAuthenticated: boolean;
  userName: AuthSession["user"]["name"];
  userEmail: AuthSession["user"]["email"];
  userRole?: string | null;
  hideOnMobile?: boolean;
}

/**
 * 64px header over the stepped Andean band. On mobile only the logo, WhatsApp and the account menu
 * stay: navigation and Reportar live in BottomNav. `hideOnMobile` drops it on full-screen routes such
 * as /mapa. WhatsApp is the primary action: the product lives there, the web is secondary.
 */
export default function Header({
  isAuthenticated,
  userName,
  userEmail,
  userRole,
  hideOnMobile = false,
}: HeaderProps) {
  return (
    <header className={cn("sticky top-0 z-50 bg-surface-card", hideOnMobile && "max-md:hidden")}>
      <div className="flex h-16 items-center gap-8 px-4 md:px-6">
        <div className="flex items-center gap-2.5">
          <Link
            to="/"
            className="font-heading text-[22px] leading-none font-extrabold text-cacao hover:text-cacao hover:no-underline"
          >
            KlAimate<span className="text-accent-primary">.</span>
          </Link>
          <Badge
            variant="secondary"
            className="hidden h-[22px] rounded-full bg-status-warning-quiet px-2.5 text-xs text-warning sm:inline-flex"
          >
            Demostración
          </Badge>
        </div>
        <nav
          aria-label="Principal"
          className="hidden items-center gap-1 text-[15px] font-medium md:flex"
        >
          {DESKTOP_NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to as "/"}
              activeOptions={{ exact: to === "/" }}
              className="rounded-lg px-3 py-2 text-text-secondary transition-colors hover:bg-surface-quiet hover:text-text-primary hover:no-underline data-[status=active]:bg-accent-primary-quiet data-[status=active]:font-bold data-[status=active]:text-accent-primary"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {whatsappHolaLink && (
            <a
              href={whatsappHolaLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-[36px] items-center gap-1.5 rounded-lg bg-whatsapp px-3.5 text-sm font-bold text-white hover:bg-whatsapp-hover hover:text-white hover:no-underline"
            >
              <MessageCircle className="size-4" aria-hidden />
              WhatsApp
            </a>
          )}
          <Link
            to={REPORT_ITEM.to as "/"}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "hidden h-[36px] gap-1.5 rounded-lg border-border-strong px-3.5 text-sm font-medium hover:no-underline md:inline-flex",
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
      <div className="andean-band" aria-hidden />
    </header>
  );
}
