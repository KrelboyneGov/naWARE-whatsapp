import { useEffect, useState } from "react";
import { useSavedLocality } from "@/components/dashboard/use-saved-locality";
import { LocalityPicker } from "./locality-picker";
import { LocalityError, LocalityLoading, LocalityView } from "./locality-view";
import { useLocalityOverview, useTerritories } from "./use-locality-overview";

/** /mi-localidad: the district saved on this device, or a picker when none is saved. */
export function LocalityPage() {
  const [saved, save] = useSavedLocality();
  const [hydrated, setHydrated] = useState(false);
  const [picking, setPicking] = useState(false);
  useEffect(() => setHydrated(true), []);

  const territories = useTerritories();
  const overview = useLocalityOverview(saved);
  const knownSaved = territories.data?.territories.some((t) => t.ubigeo === saved) ? saved : null;

  let body: React.ReactNode;
  if (!hydrated || territories.isPending) {
    body = <LocalityLoading />;
  } else if (territories.isError) {
    body = <LocalityError onRetry={() => territories.refetch()} />;
  } else if (picking || !knownSaved) {
    body = (
      <LocalityPicker
        territories={territories.data.territories}
        initialUbigeo={knownSaved}
        onSave={(u) => {
          save(u);
          setPicking(false);
        }}
        onCancel={knownSaved ? () => setPicking(false) : undefined}
      />
    );
  } else if (overview.isError) {
    body = <LocalityError onRetry={() => overview.refetch()} />;
  } else if (overview.isPending) {
    body = <LocalityLoading />;
  } else {
    body = (
      <LocalityView
        overview={overview.data}
        now={territories.data.now}
        onChange={() => setPicking(true)}
      />
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-[1100px] gap-7 px-4 py-8 md:px-10">{body}</main>
  );
}
