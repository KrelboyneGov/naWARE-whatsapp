import type { DomainError, Result } from "@emergency-map/domain/types";

export type UseCaseResult<T> = Result<T, DomainError>;

export const notFound = (entity: string, id: string) =>
  ({ data: null, error: { kind: "not_found", entity, id } }) as const;

export const forbidden = (reason: string) =>
  ({ data: null, error: { kind: "forbidden", reason } }) as const;

export const validation = (field: string, message: string) =>
  ({ data: null, error: { kind: "validation", field, message } }) as const;

export const staleVersion = (currentSeq: number, attemptedSeq: number) =>
  ({ data: null, error: { kind: "stale_version", currentSeq, attemptedSeq } }) as const;

export const invalidTransition = (from: string, to: string) =>
  ({ data: null, error: { kind: "invalid_transition", from, to } }) as const;

export const conflict = (message: string) =>
  ({ data: null, error: { kind: "conflict", message } }) as const;

export const unauthenticated = () => ({ data: null, error: { kind: "unauthenticated" } }) as const;
