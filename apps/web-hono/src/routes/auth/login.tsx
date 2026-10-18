import { createFileRoute, Link, redirect as redirectTo } from "@tanstack/react-router";
import z from "zod";

import SignInForm from "@/components/sign-in-form";
import { AuthCard } from "@/components/layout/auth-card";
import { safeRedirect } from "@/lib/safe-redirect";

export const Route = createFileRoute("/auth/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: Page,
  head: () => ({ meta: [{ title: "Ingresar · Andes Alerta" }] }),
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
      title="Ingresa para reportar o aportar evidencia"
      subtitle="Usa tu cuenta para enviar reportes y aportes. Puedes seguir explorando sin ingresar."
      footer={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link
            to="/auth/signup"
            search={{ redirect }}
            className="font-medium text-primary hover:underline"
          >
            Crear cuenta
          </Link>
        </>
      }
    >
      <SignInForm redirectTo={safeRedirect(redirect)} />
    </AuthCard>
  );
}
