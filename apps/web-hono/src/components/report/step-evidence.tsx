import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RefreshCw, Trash2, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Button, Input, Label } from "@emergency-map/web-ui";
import {
  EVIDENCE_ALLOWED_MIME_TYPES,
  EVIDENCE_MAX_FILES,
  EVIDENCE_MAX_FILE_BYTES,
} from "@emergency-map/domain/constants";

export interface EvidenceItem {
  id: string;
  file: File;
  previewUrl: string;
  description: string;
  isOwn: boolean;
}

const ALLOWED = EVIDENCE_ALLOWED_MIME_TYPES as readonly string[];
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

/** Returns a specific rejection message, or null when the file is acceptable. */
export function rejectionFor(file: File, existing: EvidenceItem[]): string | null {
  if (!ALLOWED.includes(file.type)) {
    return `«${file.name}»: formato no admitido. Usa imágenes JPEG, PNG o WebP.`;
  }
  if (file.size > EVIDENCE_MAX_FILE_BYTES) {
    return `«${file.name}» pesa ${mb(file.size)}; el máximo es ${mb(EVIDENCE_MAX_FILE_BYTES)}.`;
  }
  if (file.size === 0) return `«${file.name}» está vacío o no se pudo leer.`;
  if (existing.some((i) => fileKey(i.file) === fileKey(file))) {
    return `«${file.name}» ya está en la lista.`;
  }
  return null;
}

export function StepEvidence({
  items,
  onItems,
}: {
  items: EvidenceItem[];
  onItems: (updater: (prev: EvidenceItem[]) => EvidenceItem[]) => void;
}) {
  const [messages, setMessages] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const replaceId = useRef<string | null>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const addFiles = (files: FileList | File[]) => {
    const rejected: string[] = [];
    const accepted: EvidenceItem[] = [];
    let slots = EVIDENCE_MAX_FILES - items.length;
    for (const file of Array.from(files)) {
      const reason = rejectionFor(file, [...items, ...accepted]);
      if (reason) {
        rejected.push(reason);
        continue;
      }
      if (slots <= 0) {
        rejected.push(`«${file.name}» no se agregó: el máximo es ${EVIDENCE_MAX_FILES} fotos.`);
        continue;
      }
      slots -= 1;
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        description: "",
        isOwn: false,
      });
    }
    // One failed file never clears the others: accepted ones are appended regardless.
    if (accepted.length) onItems((prev) => [...prev, ...accepted]);
    setMessages(rejected);
  };

  const replaceFile = (id: string, file: File) => {
    const others = items.filter((i) => i.id !== id);
    const reason = rejectionFor(file, others);
    if (reason) {
      setMessages([reason]);
      return;
    }
    setMessages([]);
    onItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        URL.revokeObjectURL(i.previewUrl);
        return { ...i, file, previewUrl: URL.createObjectURL(file) };
      }),
    );
  };

  const remove = (id: string) =>
    onItems((prev) => {
      const gone = prev.find((i) => i.id === id);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return prev.filter((i) => i.id !== id);
    });

  const patch = (id: string, p: Partial<EvidenceItem>) =>
    onItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const full = items.length >= EVIDENCE_MAX_FILES;

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <AlertTitle>Demostración: no se sube nada</AlertTitle>
        <AlertDescription>
          Las fotos solo se previsualizan en tu navegador. No se envían a ningún servidor y no se
          guardan en el borrador: si cierras la página tendrás que elegirlas de nuevo.
        </AlertDescription>
      </Alert>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!full) addFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-start gap-3 rounded-md border-2 border-dashed p-4 ${dragging ? "border-primary bg-primary/5" : ""}`}
      >
        <p className="text-sm">
          Hasta {EVIDENCE_MAX_FILES} imágenes JPEG, PNG o WebP de {mb(EVIDENCE_MAX_FILE_BYTES)} cada
          una. También puedes arrastrarlas aquí. Estos límites son de diseño y pueden cambiar.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => pickRef.current?.click()} disabled={full}>
            <ImagePlus aria-hidden /> Elegir fotos
          </Button>
          {mounted && "mediaDevices" in navigator && (
            <Button variant="outline" onClick={() => cameraRef.current?.click()} disabled={full}>
              <Camera aria-hidden /> Tomar foto
            </Button>
          )}
        </div>
        <input
          ref={pickRef}
          type="file"
          accept={ALLOWED.join(",")}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Elegir fotos"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-label="Tomar foto con la cámara"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={replaceRef}
          type="file"
          accept={ALLOWED.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label="Reemplazar foto"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && replaceId.current) replaceFile(replaceId.current, f);
            e.target.value = "";
          }}
        />
      </div>

      {messages.length > 0 && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>No pudimos agregar algunas fotos</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {messages.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="mt-1">Las demás fotos se conservaron.</p>
            <Button variant="ghost" size="xs" onClick={() => setMessages([])}>
              <X aria-hidden /> Cerrar aviso
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Puedes enviar el reporte sin fotos. Sin ellas, es posible que pidamos más información. Una
          foto no prueba por sí sola que algo ocurrió.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((it, idx) => (
            <li key={it.id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.previewUrl}
                alt={it.description || `Vista previa de ${it.file.name}`}
                className="size-24 shrink-0 rounded object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="truncate text-sm font-medium">
                  {it.file.name}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    ({mb(it.file.size)}) · lista solo como previsualización local
                  </span>
                </p>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`desc-${it.id}`}>Descripción breve de la foto {idx + 1}</Label>
                  <Input
                    id={`desc-${it.id}`}
                    value={it.description}
                    maxLength={200}
                    onChange={(e) => patch(it.id, { description: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={it.isOwn}
                    onChange={(e) => patch(it.id, { isOwn: e.target.checked })}
                  />
                  La imagen es mía
                </label>
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      replaceId.current = it.id;
                      replaceRef.current?.click();
                    }}
                  >
                    <RefreshCw aria-hidden /> Reemplazar
                  </Button>
                  <Button size="xs" variant="outline" onClick={() => remove(it.id)}>
                    <Trash2 aria-hidden /> Quitar
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted-foreground text-xs">
        Antes de agregar una foto, revisa que no muestre rostros, placas ni datos personales que no
        quieras publicar. Puedes quitarla o reemplazarla. Las imágenes sensibles pueden quedar
        pendientes de revisión. Marcar «La imagen es mía» indica derechos de uso, no demuestra
        autenticidad.
      </p>
    </div>
  );
}
