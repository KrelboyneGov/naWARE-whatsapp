import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { buttonVariants } from "@emergency-map/web-ui";

import { isInternalRole } from "@/components/layout/nav-items";

export function NoAccess({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <Lock className="size-5 text-muted-foreground" aria-hidden />
        <h1 className="mt-3 font-heading text-xl font-semibold">Panel interno de revisión</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {signedIn
            ? "Tu cuenta no tiene rol de moderación. Esta sección es solo para moderadores y administradores."
            : "Inicia sesión con una cuenta de moderación para entrar."}
        </p>
        <Link to="/" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

/** Role check for the UI only; the API enforces the real permission on every call. */
export function ReviewGate({ role, children }: { role: string | null; children: ReactNode }) {
  if (!isInternalRole(role)) return <NoAccess signedIn />;
  return <>{children}</>;
}

export function sessionRole(session: unknown): string | null {
  return (session as { user?: { role?: string | null } } | null)?.user?.role ?? null;
}
