import { Link } from "@tanstack/react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
  buttonVariants,
} from "@emergency-map/web-ui";
import { useSignOut } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import type { AuthSession } from "@/lib/auth/types";

interface UserMenuProps {
  userName: AuthSession["user"]["name"];
  userEmail: AuthSession["user"]["email"];
  isAuthenticated: boolean;
}

export default function UserMenu({ userName, userEmail, isAuthenticated }: UserMenuProps) {
  const signOut = useSignOut();

  if (!isAuthenticated) {
    return (
      <Link
        to="/auth/login"
        className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4 text-sm font-medium")}
      >
        Ingresar
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="h-10 max-w-48 px-4 text-sm" />}
      >
        <span className="truncate">{userName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[240px] bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>{userEmail}</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => signOut.mutate()}>
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
