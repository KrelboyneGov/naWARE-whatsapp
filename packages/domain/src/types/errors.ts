/**
 * Domain errors as a tagged union (ADR 0006). Use cases return Result<T, DomainError>;
 * each consumer maps `kind` to its transport in one bridge.
 */
export type DomainError =
  | { kind: "not_found"; entity: string; id: string }
  | { kind: "forbidden"; reason: string }
  | { kind: "unauthenticated" }
  | { kind: "validation"; field: string; message: string }
  | { kind: "stale_version"; currentSeq: number; attemptedSeq: number }
  | { kind: "invalid_transition"; from: string; to: string }
  | { kind: "conflict"; message: string }
  | { kind: "dependency_failed"; dependency: string; message: string };

export const ok = <T>(data: T) => ({ data, error: null }) as const;
export const err = <E extends DomainError>(error: E) => ({ data: null, error }) as const;
