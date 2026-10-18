import { ORPCError } from "@orpc/server";
import type { DomainError } from "@emergency-map/domain/types";

type Outcome<T> = { data: T; error: null } | { data: null; error: DomainError };

/** The one place where a DomainError becomes an HTTP-facing oRPC error. */
export function domainErrorToOrpc(error: DomainError): ORPCError<string, unknown> {
  switch (error.kind) {
    case "not_found":
      return new ORPCError("NOT_FOUND", {
        message: `${error.entity} not found`,
        data: { entity: error.entity, id: error.id },
      });
    case "forbidden":
      return new ORPCError("FORBIDDEN", { message: error.reason });
    case "unauthenticated":
      return new ORPCError("UNAUTHORIZED", { message: "Authentication required" });
    case "validation":
      return new ORPCError("BAD_REQUEST", {
        message: error.message,
        data: { field: error.field },
      });
    case "stale_version":
      return new ORPCError("CONFLICT", {
        message: "The record changed since you loaded it",
        data: { currentSeq: error.currentSeq, attemptedSeq: error.attemptedSeq },
      });
    case "conflict":
      return new ORPCError("CONFLICT", { message: error.message, data: {} });
    case "invalid_transition":
      return new ORPCError("BAD_REQUEST", {
        message: `Cannot move from ${error.from} to ${error.to}`,
        data: { from: error.from, to: error.to },
      });
    case "dependency_failed":
      return new ORPCError("SERVICE_UNAVAILABLE", {
        message: `${error.dependency} is unavailable: ${error.message}`,
        data: { dependency: error.dependency },
      });
  }
}

/** Returns the data of a successful Result or throws the mapped ORPCError. */
export function unwrapResult<T>(result: Outcome<T>): T {
  if (result.error) throw domainErrorToOrpc(result.error);
  return result.data as T;
}

/** Wraps a successful Result in the `{ data, error }` response envelope. */
export function toEnvelope<T>(result: Outcome<T>): { data: T; error: null } {
  return { data: unwrapResult(result), error: null };
}
