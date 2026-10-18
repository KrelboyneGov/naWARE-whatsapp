import type { ReactNode } from "react";

/** Centered card shell shared by login and signup. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-10 md:py-16">
      <div className="rounded-2xl border border-border-subtle bg-card p-6 md:p-8">
        <h1 className="font-heading text-[26px] font-semibold leading-tight">{title}</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <div className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      </div>
      <p className="mt-4 text-center text-[13px] text-muted-foreground">
        Explorar el mapa no requiere una cuenta.
      </p>
    </div>
  );
}

/** Label + input slot + error list, so errors sit right next to the field. */
export function FieldShell({
  id,
  label,
  errors,
  children,
}: {
  id: string;
  label: string;
  errors: Array<{ message?: string } | undefined>;
  children: ReactNode;
}) {
  const messages = errors.map((e) => e?.message).filter(Boolean) as string[];
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {messages.map((m) => (
        <p key={m} id={`${id}-error`} role="alert" className="text-[13px] font-medium text-error">
          {m}
        </p>
      ))}
    </div>
  );
}
