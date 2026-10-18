import { useForm } from "@tanstack/react-form";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import z from "zod";
import { Button, Input } from "@emergency-map/web-ui";
import { FieldShell } from "@/components/layout/auth-card";
import { authClient } from "@/lib/auth/auth-client";

/** `redirectTo` is a same-site path validated by the route; defaults to "/". */
export default function SignInForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: async () => {
            await router.invalidate();
            router.history.push(redirectTo);
          },
          onError: (error) => {
            setFormError(
              error.error.status === 401
                ? "Correo o contraseña incorrectos."
                : "No pudimos iniciar sesión. Inténtalo de nuevo.",
            );
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Ingresa un correo electrónico válido"),
        password: z.string().min(1, "Ingresa tu contraseña"),
      }),
    },
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field name="email">
        {(field) => (
          <FieldShell id={field.name} label="Correo electrónico" errors={field.state.meta.errors}>
            <Input
              id={field.name}
              name={field.name}
              type="email"
              autoComplete="email"
              className="h-11 text-base"
              aria-invalid={field.state.meta.errors.length > 0}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <FieldShell id={field.name} label="Contraseña" errors={field.state.meta.errors}>
            <Input
              id={field.name}
              name={field.name}
              type="password"
              autoComplete="current-password"
              className="h-11 text-base"
              aria-invalid={field.state.meta.errors.length > 0}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </FieldShell>
        )}
      </form.Field>

      {formError && (
        <p
          role="alert"
          className="rounded-lg border border-error/30 bg-error-bg px-3 py-2 text-sm font-medium text-error"
        >
          {formError}
        </p>
      )}

      <form.Subscribe>
        {(state) => (
          <Button
            type="submit"
            className="h-11 w-full text-base font-semibold"
            disabled={!state.canSubmit || state.isSubmitting}
          >
            {state.isSubmitting ? "Ingresando..." : "Ingresar"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
