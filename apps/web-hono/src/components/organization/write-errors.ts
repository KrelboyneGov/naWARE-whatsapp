/** How a failed write must be explained to the actor. */
export type WriteProblem =
  | { kind: "signin" }
  | { kind: "forbidden" }
  | { kind: "other"; message: string };

/** Maps an oRPC/HTTP failure to the permission state the screen must show. */
export function classifyWriteError(error: unknown): WriteProblem {
  const e = error as { code?: string; status?: number; message?: string } | null;
  if (e?.code === "UNAUTHORIZED" || e?.status === 401) return { kind: "signin" };
  if (e?.code === "FORBIDDEN" || e?.status === 403) return { kind: "forbidden" };
  return {
    kind: "other",
    message: e?.message || "No pudimos guardar el cambio. Inténtalo de nuevo.",
  };
}
