import { useEffect, useState } from "react";

/** Tailwind's `md` breakpoint: below it the app uses the mobile layout. */
export const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * Tracks a CSS media query. Returns `fallback` during SSR and the first client render so the
 * markup hydrates identically; prefer CSS breakpoints and use this only for behaviour.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const [matches, setMatches] = useState(fallback);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
