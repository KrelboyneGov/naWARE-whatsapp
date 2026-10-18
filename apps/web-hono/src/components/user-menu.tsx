import { Link } from "@tanstack/react-router";
import { User } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  buttonVariants,
} from "@emergency-map/web-ui";
import { ACCOUNT_LINKS, INTERNAL_LINKS, SIGNED_IN_LINKS, isInternalRole } from "./layout/nav-items";
import { useSignOut } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import type { AuthSession } from "@/lib/auth/types";

interface UserMenuProps {
  userName: AuthSession["user"]["name"];
  userEmail: AuthSession["user"]["email"];
  userRole?: string | null;
  isAuthenticated: boolean;
}

const triggerClass = cn(
  buttonVariants({ variant: "outline" }),
  "size-[34px] rounded-lg border-border-subtle bg-surface-card p-0 text-text-primary hover:bg-surface-hover",
);

export default function UserMenu({
  userName,
  userEmail,
  userRole,
  isAuthenticated,
}: UserMenuProps) {
  const signOut = useSignOut();

  if (!isAuthenticated) {
    return (
      <Link
        to="/auth/login"
        aria-label="Cuenta: ingresar"
        title="Ingresar"
        className={triggerClass}
      >
        <User className="size-4" aria-hidden />
      </Link>
    );
  }

  const links = [
    ...SIGNED_IN_LINKS,
    ...ACCOUNT_LINKS,
    ...(isInternalRole(userRole) ? INTERNAL_LINKS : []),
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Cuenta de ${userName}`}
        title={userName}
        className={triggerClass}
      >
        <User className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[240px] bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{userName || "Mi cuenta"}</DropdownMenuLabel>
          <DropdownMenuItem disabled>{userEmail}</DropdownMenuItem>
          <DropdownMenuSeparator />
          {links.map(({ to, label }) => (
            <DropdownMenuItem key={to} render={<Link to={to as "/"} />}>
              {label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => signOut.mutate()}>
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
