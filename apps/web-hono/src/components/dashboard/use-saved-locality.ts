import { useCallback, useEffect, useState } from "react";

export const LOCALITY_STORAGE_KEY = "andes-alerta:locality";

/** Stored ubigeo of the visitor's chosen district, or null. No account needed; storage may fail. */
export function useSavedLocality() {
  const [ubigeo, setUbigeo] = useState<string | null>(null);

  useEffect(() => {
    try {
      setUbigeo(localStorage.getItem(LOCALITY_STORAGE_KEY));
    } catch {
      /* storage blocked: stay on "Todo Perú" */
    }
  }, []);

  const save = useCallback((value: string | null) => {
    setUbigeo(value);
    try {
      if (value) localStorage.setItem(LOCALITY_STORAGE_KEY, value);
      else localStorage.removeItem(LOCALITY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return [ubigeo, save] as const;
}
