import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import z from "zod";
import { Button, Checkbox, Input } from "@emergency-map/web-ui";
import { CONSENT_LABEL } from "@emergency-map/domain/schemas";
import { FieldShell } from "@/components/layout/auth-card";
import { authClient } from "@/lib/auth/auth-client";
import { client } from "@/lib/orpc-client";
import { env } from "@/env/client";

const whatsappDigits = (env.VITE_WHATSAPP_BUSINESS_NUMBER ?? "").replace(/\D/g, "");
const whatsappLink = whatsappDigits
  ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent("Hola")}`
  : null;

/** `redirectTo` stays available after the account exists; the success panel explains the Hola step. */
export default function SignUpForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const [formError, setFormError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      districtName: "",
      consent: false,
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
            try {
              await client.onboarding.register({
                phone: value.phone,
                districtName: value.districtName,
                point,
                consentAccepted: true,
                adultConfirmed: true,
              });
              setRegistered(true);
            } catch (error) {
              const message = error instanceof Error ? error.message : "";
              setFormError(
                message ||
                  "La cuenta se creó, pero no pudimos guardar el número. Revisa el teléfono y el consentimiento e inténtalo de nuevo.",
              );
            }
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
        phone: z.string().trim().min(8, "Ingresa tu número de WhatsApp"),
        districtName: z.string().trim().min(2, "Indica el distrito de tu hogar"),
        consent: z
          .boolean()
          .refine((value) => value, { message: "Sin ese consentimiento no hay registro" }),
      }),
    },
  });

  if (registered) {
    return (
      <div className="space-y-4 text-sm">
        <p>
          Cuenta lista. El número queda pendiente hasta que escribas <strong>Hola</strong> desde ese
          WhatsApp. Ese mensaje abre la ventana de 24 horas y no necesita una plantilla aprobada.
        </p>
        {whatsappLink ? (
          <a href={whatsappLink} className="font-medium text-primary hover:underline">
            Escribir Hola por WhatsApp
          </a>
        ) : (
          <p>El enlace de WhatsApp aparece cuando el despliegue define el número del negocio.</p>
        )}
        <p>
          <a href={redirectTo} className="font-medium text-primary hover:underline">
            Entrar a la aplicación
          </a>
        </p>
      </div>
    );
  }

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

      <form.Field name="phone">
        {(field) => (
          <FieldShell
            id={field.name}
            label="WhatsApp (con código de país o 9 dígitos de Perú)"
            errors={field.state.meta.errors}
          >
            <Input
              id={field.name}
              name={field.name}
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              className="h-11 text-base"
              aria-invalid={field.state.meta.errors.length > 0}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="districtName">
        {(field) => (
          <FieldShell id={field.name} label="Distrito de tu hogar" errors={field.state.meta.errors}>
            <Input
              id={field.name}
              name={field.name}
              autoComplete="address-level2"
              className="h-11 text-base"
              aria-invalid={field.state.meta.errors.length > 0}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </FieldShell>
        )}
      </form.Field>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={locating}
        onClick={() => {
          if (!navigator.geolocation) {
            setFormError("Este navegador no comparte la ubicación. Escribe el distrito.");
            return;
          }
          setLocating(true);
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setPoint({ lat: position.coords.latitude, lng: position.coords.longitude });
              setLocating(false);
            },
            () => {
              setPoint(null);
              setLocating(false);
              setFormError("No pudimos leer la ubicación. Escribe el distrito a mano.");
            },
          );
        }}
      >
        {locating
          ? "Buscando ubicación..."
          : point
            ? "Ubicación lista para resolver el distrito"
            : "Usar mi ubicación"}
      </Button>

      <form.Field name="consent">
        {(field) => (
          <div className="space-y-1.5">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked === true)}
                className="mt-0.5"
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <span>
                {CONSENT_LABEL}{" "}
                <Link to="/privacidad" className="font-medium text-primary hover:underline">
                  Política de privacidad
                </Link>
                .
              </span>
            </label>
            {field.state.meta.errors.map((error) => (
              <p key={error?.message} role="alert" className="text-[13px] font-medium text-error">
                {error?.message}
              </p>
            ))}
          </div>
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
