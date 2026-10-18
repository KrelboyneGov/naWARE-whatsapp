import { z } from "zod";
import { paginationMetaSchema } from "@emergency-map/domain/schemas";

const errorSchema = z.object({ message: z.string() });

/** `{ data, error }` envelope shared by every route. */
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema.nullable(),
    error: errorSchema.nullable(),
  });

export const paginatedApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema.nullable(),
    error: errorSchema.nullable(),
    meta: z.object({ pagination: paginationMetaSchema }).optional(),
  });

/** Query strings carry arrays as "a,b,c". Empty string means an empty list. */
const splitCsv = (value: unknown) => {
  if (typeof value === "string") {
    return value === "" ? [] : value.split(",").map((part) => part.trim());
  }
  return value;
};

export const csvArray = <T extends z.ZodType>(item: T) => z.preprocess(splitCsv, z.array(item));

/** "west,south,east,north" -> [number, number, number, number]. */
export const csvNumbers = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => {
    const parts = splitCsv(value);
    return Array.isArray(parts) ? parts.map((part) => (part === "" ? part : Number(part))) : parts;
  }, schema);

/** Query strings carry booleans as "true" / "false". */
export const queryBoolean = z.preprocess(
  (value) => (value === "true" ? true : value === "false" ? false : value),
  z.boolean(),
);
