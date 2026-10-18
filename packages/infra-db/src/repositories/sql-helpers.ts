import { sql, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import type { TerritoryRef } from "@emergency-map/domain/schemas";

/** Escapes LIKE wildcards in user input. */
export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Case- and accent-insensitive form of a text expression, for Spanish place names. */
export const fold = (expr: SQL | AnyColumn): SQL =>
  sql`translate(lower(${expr}), 'áéíóúüñ', 'aeiouun')`;

export const foldValue = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[áéíóúü]/g, (c) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u" })[c] ?? c)
    .replace(/ñ/g, "n");

/** `text[]` literal built from bound parameters. */
export const textArray = (values: readonly string[]): SQL =>
  sql`ARRAY[${sql.join(
    values.map((v) => sql`${v}`),
    sql`, `,
  )}]::text[]`;

/** True when a jsonb array of TerritoryRef contains an entry whose ubigeo is a prefix of `ubigeo`. */
export const coversUbigeo = (column: AnyColumn, ubigeo: string): SQL =>
  sql`EXISTS (SELECT 1 FROM jsonb_array_elements(${column}) AS c WHERE ${ubigeo}::text LIKE (c->>'ubigeo') || '%')`;

export type { TerritoryRef };
