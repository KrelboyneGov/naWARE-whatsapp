/** Case- and accent-insensitive keywords. The whole message, or its first word, must match. */

const OPT_OUT = new Set(["baja", "stop", "parar", "cancelar"]);

export type InboundKeyword = "opt_out" | "opt_in";

export function foldText(input: string): string {
  return input.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export function classifyInboundKeyword(input: string): InboundKeyword | null {
  const folded = foldText(input)
    .replace(/[.!?,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (folded === "") return null;
  const first = folded.split(" ")[0] ?? "";
  if (OPT_OUT.has(folded) || OPT_OUT.has(first)) return "opt_out";
  if (folded === "alta" || first === "alta") return "opt_in";
  return null;
}
