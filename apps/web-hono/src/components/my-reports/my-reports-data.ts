import { useQuery } from "@tanstack/react-query";
import type { PublicationStatus, ReviewStatus } from "@emergency-map/domain/constants";

export type TabKey = "reportes" | "aportes" | "borradores" | "solicitudes";

export interface MyItem {
  id: string;
  kind: string;
  title: string;
  meta: string;
  /** Publication and review are separate, independent dimensions (never merged). */
  publication: PublicationStatus | "linked";
  review: ReviewStatus | "not_applicable";
  eventId: string | null;
  isDemo: boolean;
  message?: { title: string; by: string; body: string; needsReply: boolean };
}

/**
 * No endpoint lists "my reports" yet (`events.list` has no author filter), so this returns the
 * demo records of the design with the same shape the API will have. Swap the queryFn then.
 */
const DEMO_ITEMS: Record<Exclude<TabKey, "borradores">, MyItem[]> = {
  reportes: [
    {
      id: "DEMO-01",
      kind: "Reporte",
      title: "Reporte de humo en una zona de ladera",
      meta: "Enviado 14 oct 2026, 16:12 · Lurigancho-Chosica, Lima",
      publication: "published",
      review: "unverified",
      eventId: "DEMO-01",
      isDemo: true,
      message: {
        title: "Tu reporte fue publicado",
        by: "Equipo de revisión · 17:05",
        body: "Publicado como reporte ciudadano. Esto no comprueba el hecho; si llega evidencia independiente, la revisión lo indicará.",
        needsReply: false,
      },
    },
    {
      id: "REP-DEMO-0101",
      kind: "Reporte",
      title: "Reporte enviado desde el formulario",
      meta: "Enviado 14 oct 2026, 18:30 · Pendiente de asignación",
      publication: "pending_review",
      review: "unverified",
      eventId: null,
      isDemo: true,
    },
  ],
  aportes: [
    {
      id: "AP-DEMO-0042",
      kind: "Aporte a DEMO-01",
      title: "Humo visible desde otro punto del distrito",
      meta: "Enviado 14 oct 2026, 18:25 · Declaración textual",
      publication: "pending_review",
      review: "unverified",
      eventId: "DEMO-01",
      isDemo: true,
    },
    {
      id: "AP-DEMO-0031",
      kind: "Aporte a DEMO-02",
      title: "Foto de la vía con agua acumulada",
      meta: "Enviado 13 oct 2026 · Imagen propia",
      publication: "linked",
      review: "with_contributions",
      eventId: "DEMO-02",
      isDemo: true,
      message: {
        title: "Se vinculó a un evento existente",
        by: "Equipo de revisión · 13 oct, 11:10",
        body: "Tu aporte se agregó a DEMO-02. La revisión lo contó como aporte, no como corroboración.",
        needsReply: false,
      },
    },
  ],
  solicitudes: [
    {
      id: "DEMO-05",
      kind: "Solicitud sobre tu reporte",
      title: "Reporte histórico de deslizamiento en Áncash",
      meta: "Solicitud recibida 23 ago 2026",
      publication: "published",
      review: "with_contributions",
      eventId: "DEMO-05",
      isDemo: true,
      message: {
        title: "Necesitamos una fecha más precisa",
        by: "Equipo de revisión · 23 ago, 11:00",
        body: "Indicaste solo el día. Si recuerdas una franja horaria, respóndenos; la precisión se conservará tal como la declares.",
        needsReply: true,
      },
    },
  ],
};

export function useMyItems() {
  return useQuery({
    queryKey: ["my-reports", "items"],
    queryFn: async () => DEMO_ITEMS,
    staleTime: Infinity,
  });
}
