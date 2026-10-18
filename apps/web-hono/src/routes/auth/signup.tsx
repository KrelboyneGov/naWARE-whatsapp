import { createFileRoute, Link, redirect as redirectTo } from "@tanstack/react-router";
import z from "zod";

import SignUpForm from "@/components/sign-up-form";
import { AuthCard } from "@/components/layout/auth-card";
import { safeRedirect } from "@/lib/safe-redirect";

export const Route = createFileRoute("/auth/signup")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: Page,
  head: () => ({ meta: [{ title: "Crear cuenta · Andes Alerta" }] }),
  beforeLoad: async (ctx) => {
    if (ctx.context.isAuthenticated) {
      throw redirectTo({ to: safeRedirect(ctx.search.redirect) });
    }
  },
});

function Page() {
  const { redirect } = Route.useSearch();
  return (
    <AuthCard
      title="Crea tu cuenta"
      subtitle="Una cuenta te permite reportar eventos y aportar evidencia. Para explorar el mapa no la necesitas."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link
            to="/auth/login"
            search={{ redirect }}
            className="font-medium text-primary hover:underline"
          >
            Ingresar
          </Link>
        </>
      }
    >
      <SignUpForm redirectTo={safeRedirect(redirect)} />
    </AuthCard>
  );
}
