import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { EyeOff, FileQuestion, GitMerge, Lock } from "lucide-react";
import { buttonVariants, cn } from "@emergency-map/web-ui";
import type { EventDetailResult } from "./use-event-detail";

type Special = Exclude<EventDetailResult, { status: "ok" }>;

/** Page-level states: withdrawn, merged, restricted, not found. Copy never implies "it did not happen". */
export function SpecialState({ state }: { state: Special }) {
  let icon: ReactNode;
  let title: string;
  let text: string;
  let cta: ReactNode;
  const primary = buttonVariants({ size: "lg" });

  switch (state.status) {
    case "withdrawn":
      icon = <EyeOff className="size-7" aria-hidden />;
      title = "Este reporte fue retirado de la vista pública";
      text =
        "Se retiró tras una decisión de revisión. El contenido retirado no se muestra; el historial se conserva para quienes tienen permiso.";
      cta = (
        <Link to="/eventos" className={primary}>
          Ver eventos recientes
        </Link>
      );
      break;
    case "merged":
      icon = <GitMerge className="size-7" aria-hidden />;
      title = "Este evento se fusionó con otro";
      text = state.mainEventId
        ? `Las evidencias y el historial se conservan en el evento principal ${state.mainEventId}. Este enlace seguirá funcionando como vínculo histórico.`
        : "Las evidencias y el historial se conservan en el evento principal. Este enlace seguirá funcionando como vínculo histórico.";
      cta = state.mainEventId ? (
        <Link to="/eventos/$id" params={{ id: state.mainEventId }} className={primary}>
          Ir al evento principal
        </Link>
      ) : (
        <Link to="/eventos" className={primary}>
          Ver eventos recientes
        </Link>
      );
      break;
    case "restricted":
      icon = <Lock className="size-7" aria-hidden />;
      title = "No tienes permiso para ver este registro";
      text = "Está pendiente de controles y solo es visible para su autor y el equipo de revisión.";
      cta = (
        <Link to="/auth/login" className={primary}>
          Entrar con mi cuenta
        </Link>
      );
      break;
    case "not_found":
      icon = <FileQuestion className="size-7" aria-hidden />;
      title = "No encontramos este evento";
      text =
        "El enlace puede ser incorrecto o el evento aún no está publicado. No significa que no haya ocurrido.";
      cta = (
        <Link to="/mapa" className={primary}>
          Explorar el mapa
        </Link>
      );
      break;
  }

  return (
    <main className="mx-auto grid w-full max-w-xl justify-items-center gap-4 px-4 py-16 text-center md:py-24">
      <span className="text-text-secondary">{icon}</span>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-text-secondary text-pretty">{text}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {cta}
        <Link
          to="/mapa"
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "text-accent-primary")}
        >
          Volver al mapa
        </Link>
      </div>
    </main>
  );
}
