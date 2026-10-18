import { useForm } from "@tanstack/react-form";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import z from "zod";
import { Button, Input } from "@emergency-map/web-ui";
import { FieldShell } from "@/components/layout/auth-card";
import { authClient } from "@/lib/auth/auth-client";

/** `redirectTo` is a same-site path validated by the route; defaults to "/". */
export default function SignUpForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
        },
        {
          onSuccess: async () => {
            await router.invalidate();
            router.history.push(redirectTo);
          },
          onError: (error) => {
            setFormError(
              error.error.status === 422 || error.error.status === 400
                ? "No pudimos crear la cuenta. Revisa los datos o prueba con otro correo."
                : "No pudimos crear la cuenta. Inténtalo de nuevo.",
            );
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        name: z.string().trim().min(2, "Ingresa tu nombre (mínimo 2 caracteres)"),
        email: z.email("Ingresa un correo electrónico válido"),
        password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
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
      <form.Field name="name">
        {(field) => (
          <FieldShell id={field.name} label="Nombre" errors={field.state.meta.errors}>
            <Input
              id={field.name}
              name={field.name}
              autoComplete="name"
              className="h-11 text-base"
              aria-invalid={field.state.meta.errors.length > 0}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </FieldShell>
        )}
      </form.Field>

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
              autoComplete="new-password"
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
            {state.isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
