import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button, Skeleton } from "@emergency-map/web-ui";
import { LogOut, Reply } from "lucide-react";

import { DemoBadge } from "../event/demo-badge";
import { ReviewBadge } from "../event/review-badge";
import { StatusChip, type ChipTone } from "../sources/status-chip";
import { useMyItems, type MyItem, type TabKey } from "./my-reports-data";
import { DEMO_TERRITORIES } from "@emergency-map/domain/demo";
import { useSavedLocality } from "../dashboard/use-saved-locality";
import { clearDraft, isDraftEmpty, loadDraft, type ReportDraft } from "@/lib/report-draft";
import { PUBLICATION_LABELS } from "@/lib/labels";
import { useSession, useSignOut } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "reportes", label: "Reportes" },
  { key: "aportes", label: "Aportes" },
  { key: "borradores", label: "Borradores" },
  { key: "solicitudes", label: "Solicitudes de revisión" },
];

const pubTone = (p: MyItem["publication"]): ChipTone =>
  p === "published" || p === "linked" ? "positive" : "neutral";
const pubLabel = (p: MyItem["publication"]) =>
  p === "linked" ? "Vinculado a un evento existente" : PUBLICATION_LABELS[p];

function ItemCard({
  item,
  replied,
  onReply,
}: {
  item: MyItem;
  replied: boolean;
  onReply: () => void;
}) {
  const msg = item.message;
  return (
    <article className="grid gap-3 rounded-xl border border-border-subtle p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <span className="font-mono text-xs text-text-secondary">
            {item.id} · {item.kind}
          </span>
          <span className="text-base font-medium">{item.title}</span>
          <span className="text-[13px] text-text-secondary">{item.meta}</span>
        </div>
        {item.eventId ? (
          <a
            href={`/eventos/${item.eventId}`}
            className="whitespace-nowrap text-[13px] font-medium"
          >
            Ver ficha pública
          </a>
        ) : (
          <span className="whitespace-nowrap text-[13px] text-text-secondary">
            Aún sin ficha pública
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-text-secondary">Publicación:</span>
          <StatusChip tone={pubTone(item.publication)}>{pubLabel(item.publication)}</StatusChip>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-text-secondary">Corroboración:</span>
          {item.review === "not_applicable" ? (
            <StatusChip>No aplica</StatusChip>
          ) : (
            <ReviewBadge status={item.review} />
          )}
        </span>
        {item.isDemo && <DemoBadge />}
      </div>
      {msg && (
        <div
          className={cn(
            "grid gap-2 rounded-lg p-3 text-sm",
            msg.needsReply && !replied ? "bg-warning-bg" : "bg-surface-secondary",
          )}
        >
          <span>
            <strong className="font-medium">{msg.title}</strong> · {msg.by}
          </span>
          <span className="text-text-secondary">{msg.body}</span>
          {msg.needsReply && !replied && (
            <div>
              <Button size="sm" variant="outline" onClick={onReply}>
                <Reply className="size-3.5" aria-hidden />
                Responder con información
              </Button>
            </div>
          )}
          {replied && (
            <span role="status" className="text-primary">
              Respuesta enviada (simulada). El equipo de revisión la verá junto al caso.
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function LocalDraftCard({ draft, onDiscard }: { draft: ReportDraft; onDiscard: () => void }) {
  return (
    <article className="grid gap-3 rounded-xl border border-border-subtle p-4 shadow-xs">
      <div className="grid gap-1">
        <span className="font-mono text-xs text-text-secondary">Borrador local · Borrador</span>
        <span className="text-base font-medium">{draft.title || "Borrador sin título"}</span>
        <span className="text-[13px] text-text-secondary">Paso {draft.step} de 4</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-text-secondary">Publicación:</span>
        <StatusChip>Borrador</StatusChip>
        <span className="text-text-secondary">Corroboración:</span>
        <StatusChip>No aplica</StatusChip>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/reportar"
          className="inline-flex h-8 items-center rounded-lg border border-border-strong px-3 text-[13px] font-medium text-text-primary"
        >
          Continuar borrador
        </Link>
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          Descartar
        </Button>
        <span className="text-xs text-text-secondary">
          Guardado solo en este dispositivo; las imágenes locales no se conservan.
        </span>
      </div>
    </article>
  );
}

export function MyReportsPage() {
  const { session } = useSession();
  const signOut = useSignOut();
  const { data, isPending, isError, refetch } = useMyItems();
  const [tab, setTab] = useState<TabKey>("reportes");
  const [replied, setReplied] = useState<Record<string, boolean>>({});
  const [savedUbigeo] = useSavedLocality();
  const locality = DEMO_TERRITORIES.find((t) => t.ubigeo === savedUbigeo);
  const [follow, setFollow] = useState(false);
  const [localDraft, setLocalDraft] = useState<ReportDraft | null>(null);

  useEffect(() => {
    const d = loadDraft();
    setLocalDraft(d && !isDraftEmpty(d) ? d : null);
  }, []);

  const items = tab === "borradores" ? [] : (data?.[tab] ?? []);
  const counts: Record<TabKey, number> = {
    reportes: data?.reportes.length ?? 0,
    aportes: data?.aportes.length ?? 0,
    borradores: localDraft ? 1 : 0,
    solicitudes: data?.solicitudes.length ?? 0,
  };
  const empty = tab === "borradores" ? !localDraft : !!data && items.length === 0;
  const alias = session?.user.name;

  return (
    <div className="mx-auto grid w-full max-w-[1100px] gap-8 px-4 py-8 sm:px-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
      <main className="grid min-w-0 content-start gap-5">
        <div className="grid gap-1">
          <h1 className="m-0 text-[28px] font-semibold tracking-tight">Mis aportes</h1>
          <p className="m-0 text-sm text-text-secondary">
            {alias ? `Alias público: ${alias} · ` : ""}Estado de publicación y corroboración se
            muestran por separado.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Categorías"
          className="flex flex-wrap gap-1 border-b border-border-subtle"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
                tab === t.key
                  ? "border-primary text-text-primary"
                  : "border-transparent text-text-secondary",
              )}
            >
              {t.label} <span className="text-text-tertiary">{counts[t.key]}</span>
            </button>
          ))}
        </div>

        {isPending && tab !== "borradores" && (
          <Skeleton className="h-40 rounded-xl" aria-busy="true" />
        )}
        {isError && (
          <div role="alert" className="rounded-xl border border-border-subtle p-4 text-sm">
            No pudimos cargar tus aportes.{" "}
            <button type="button" className="font-medium text-primary" onClick={() => refetch()}>
              Reintentar
            </button>
          </div>
        )}
        {empty && (
          <div className="rounded-xl border border-dashed border-border p-6 text-sm">
            <p className="m-0 font-medium">Nada por aquí todavía</p>
            <p className="m-0 mt-1 text-text-secondary">
              Cuando envíes algo en esta categoría aparecerá con su estado y seguimiento.
            </p>
          </div>
        )}
        {tab === "borradores" && localDraft && (
          <LocalDraftCard
            draft={localDraft}
            onDiscard={() => {
              clearDraft();
              setLocalDraft(null);
            }}
          />
        )}
        {items.map((it) => (
          <ItemCard
            key={it.id}
            item={it}
            replied={!!replied[it.id]}
            onReply={() => setReplied((r) => ({ ...r, [it.id]: true }))}
          />
        ))}
      </main>

      <aside className="grid content-start gap-4">
        <div className="grid gap-3 rounded-xl border border-border-subtle p-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
            Preferencias
          </span>
          <div className="grid gap-1 text-sm">
            <span className="text-text-secondary">Localidad guardada</span>
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {locality ? locality.name : "Sin localidad guardada"}
              </span>
              <Link to="/mi-localidad" className="text-[13px]">
                {locality ? "Cambiar" : "Elegir"}
              </Link>
            </div>
            <span className="text-xs text-text-secondary">
              Se guarda en este dispositivo; con cuenta se sincroniza.
            </span>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={follow}
              onChange={(e) => setFollow(e.target.checked)}
              className="mt-1"
            />
            <span className="grid">
              <span className="font-medium">Seguir DEMO-01</span>
              <span className="text-xs text-text-secondary">
                Solo lo guarda en tu cuenta. No envía notificaciones push ni correos.
              </span>
            </span>
          </label>
          <div className="grid gap-1 text-[13px] text-text-secondary">
            <span className="font-medium text-text-primary">Uso de datos</span>
            <span>
              Tu alias aparece junto a tus aportes públicos. Correo y ubicación no se publican.
            </span>
          </div>
          <Button variant="outline" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
            <LogOut className="size-4" aria-hidden />
            Cerrar sesión
          </Button>
        </div>
        <div className="grid gap-1.5 rounded-xl border border-border-subtle p-4 text-[13px] text-text-secondary">
          <span className="font-medium text-text-primary">Qué significa cada estado</span>
          <span>
            <strong className="font-medium">Publicación</strong> dice si tu aporte es visible.{" "}
            <strong className="font-medium">Corroboración</strong> dice qué revisó el equipo. Son
            independientes: algo publicado puede seguir sin corroborar.
          </span>
        </div>
      </aside>
    </div>
  );
}
