export const SEMAPHORE_LEVELS = [
  "sin_informacion",
  "verde",
  "amarillo",
  "naranja",
  "rojo",
] as const;

export type SemaphoreLevel = (typeof SEMAPHORE_LEVELS)[number];

const RANK: Record<SemaphoreLevel, number> = {
  sin_informacion: 0,
  verde: 1,
  amarillo: 2,
  naranja: 3,
  rojo: 4,
};

export function semaphoreRank(level: string | null | undefined): number {
  const normalized = normalizeSemaphoreLevel(level);
  return RANK[normalized];
}

export function normalizeSemaphoreLevel(level: string | null | undefined): SemaphoreLevel {
  const folded = (level ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (folded.includes("rojo") || folded.includes("red")) return "rojo";
  if (folded.includes("naranja") || folded.includes("orange")) return "naranja";
  if (folded.includes("amarillo") || folded.includes("yellow")) return "amarillo";
  if (folded.includes("verde") || folded.includes("green")) return "verde";
  return "sin_informacion";
}

/** A follow-up is due when the issuer's own level goes up, or a new notice appears at amarillo or above. */
export function semaphoreChanged(input: {
  previousLevel: string | null;
  previousNoticeId: string | null;
  nextLevel: string;
  nextNoticeId: string | null;
}): boolean {
  const rose = semaphoreRank(input.nextLevel) > semaphoreRank(input.previousLevel);
  const newNotice =
    input.nextNoticeId !== null &&
    input.nextNoticeId !== input.previousNoticeId &&
    semaphoreRank(input.nextLevel) >= semaphoreRank("amarillo");
  return rose || newNotice;
}
