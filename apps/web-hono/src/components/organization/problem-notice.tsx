import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@emergency-map/web-ui";
import { cn } from "@/lib/utils";
import type { WriteProblem } from "./write-errors";

/** Permission / sign-in / generic state for a failed or blocked write. */
export function ProblemNotice({
  problem,
  className,
}: {
  problem: WriteProblem;
  className?: string;
}) {
  const base = "rounded-lg bg-status-warning-quiet px-3 py-2.5 text-[13px] text-status-warning";
  if (problem.kind === "signin") {
    return (
      <div role="alert" className={cn(base, "grid gap-2", className)}>
        <span>Inicia sesión para crear o editar registros de una organización.</span>
        <Link
          to="/auth/login"
          search={{ redirect: "/organizacion" }}
          className={cn(buttonVariants({ size: "sm" }), "justify-self-start")}
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }
  if (problem.kind === "forbidden") {
    return (
      <div role="alert" className={cn(base, className)}>
        Tu cuenta no es miembro de esta organización, así que no puede crear ni editar sus
        registros. Solo puedes editar tus propios registros.
      </div>
    );
  }
  return (
    <div role="alert" className={cn(base, className)}>
      {problem.message}
    </div>
  );
}
