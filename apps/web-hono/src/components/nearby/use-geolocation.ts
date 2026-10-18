import { useCallback, useState } from "react";
import { PERU_BOUNDS } from "@emergency-map/domain/constants";
import type { GeoPoint } from "@emergency-map/domain/schemas";

export type GpsProblem = "denied" | "unavailable" | "outside" | "stale" | "timeout";

export const GPS_PROBLEM_COPY: Record<GpsProblem, { title: string; text: string }> = {
  denied: {
    title: "Permiso denegado",
    text: "Puedes elegir un punto en el mapa; el producto funciona sin GPS.",
  },
  unavailable: {
    title: "Ubicación no disponible",
    text: "Tu dispositivo no pudo darnos una lectura. Elige un punto en el mapa.",
  },
  outside: {
    title: "Tu ubicación está fuera del Perú",
    text: "El piloto cubre solo el Perú. Elige una localidad peruana; no te moveremos automáticamente.",
  },
  stale: {
    title: "Ubicación antigua",
    text: "La última lectura tiene más de 30 minutos. Puedes usarla igual o elegir un punto.",
  },
  timeout: {
    title: "Tiempo de espera agotado",
    text: "No obtuvimos una lectura. Prueba de nuevo o elige un punto manualmente.",
  },
};

const STALE_MS = 30 * 60_000;

export interface GpsReading {
  point: GeoPoint;
  accuracyM: number;
  at: Date;
}

const insidePeru = (p: GeoPoint) =>
  p.lng >= PERU_BOUNDS[0] &&
  p.lat >= PERU_BOUNDS[1] &&
  p.lng <= PERU_BOUNDS[2] &&
  p.lat <= PERU_BOUNDS[3];

/**
 * One-shot browser geolocation. Nothing is requested until `request()` is called from a user
 * action; the reading is kept in memory only (never stored, never put in a URL).
 */
export function useGeolocation(onReading: (r: GpsReading) => void) {
  const [problem, setProblem] = useState<GpsProblem | null>(null);
  const [staleReading, setStaleReading] = useState<GpsReading | null>(null);
  const [pending, setPending] = useState(false);

  const request = useCallback(() => {
    setProblem(null);
    setStaleReading(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setProblem("unavailable");
      return;
    }
    setPending(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPending(false);
        const reading: GpsReading = {
          point: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracyM: pos.coords.accuracy,
          at: new Date(pos.timestamp),
        };
        if (!insidePeru(reading.point)) return setProblem("outside");
        if (Date.now() - pos.timestamp > STALE_MS) {
          setStaleReading(reading);
          return setProblem("stale");
        }
        onReading(reading);
      },
      (err) => {
        setPending(false);
        setProblem(
          err.code === err.PERMISSION_DENIED
            ? "denied"
            : err.code === err.TIMEOUT
              ? "timeout"
              : "unavailable",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 0 },
    );
  }, [onReading]);

  return {
    problem,
    pending,
    staleReading,
    request,
    clear: () => {
      setProblem(null);
      setStaleReading(null);
    },
  };
}
