import type { IOfficialNoticesFeed } from "@emergency-map/domain/repositories";

/**
 * Current SENAMHI weather notices, read from the public HTML list at
 * https://www.senamhi.gob.pe/?p=aviso-meteorologico. There is no verified API, so
 * this parser is a fragile fallback (matrix D-06): when the markup changes it returns
 * `available: false` instead of guessing. Each notice keeps SENAMHI's own level.
 */

export const SENAMHI_NOTICES_URL = "https://www.senamhi.gob.pe/?p=aviso-meteorologico";
const SENAMHI_ORIGIN = "https://www.senamhi.gob.pe/";

export type SenamhiLevel = "amarillo" | "naranja" | "rojo";

export interface SenamhiNotice {
  number: string;
  title: string;
  /** The issuer's own level, lower case. */
  level: SenamhiLevel;
  issuedOn: string;
  validFrom: string;
  validTo: string;
  url: string;
}

export type SenamhiNoticesResult =
  | { available: true; fetchedAt: string; notices: SenamhiNotice[] }
  | { available: false; fetchedAt: string; reason: string };

const LEVEL_RANK: Record<SenamhiLevel, number> = { amarillo: 1, naranja: 2, rojo: 3 };

function cellText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&([aeiou])acute;/gi, (_, vowel: string) =>
      vowel === vowel.toUpperCase()
        ? ({ A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú" } as Record<string, string>)[vowel]!
        : ({ a: "á", e: "é", i: "í", o: "ó", u: "ú" } as Record<string, string>)[vowel]!,
    )
    .replace(/&ntilde;/g, "ñ")
    .replace(/&Ntilde;/g, "Ñ")
    .replace(/\s+/g, " ")
    .trim();
}

function toLevel(raw: string): SenamhiLevel | null {
  const folded = raw.toLowerCase();
  if (folded.includes("rojo")) return "rojo";
  if (folded.includes("naranja")) return "naranja";
  if (folded.includes("amarillo")) return "amarillo";
  return null;
}

/** Parses the rows SENAMHI marks as `class="vigente"`. Rows that do not fit are skipped. */
export function parseSenamhiNotices(html: string): SenamhiNotice[] {
  const notices: SenamhiNotice[] = [];
  for (const row of html.split(/<tr\b[^>]*>/i)) {
    if (!/class="vigente"/i.test(row)) continue;
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1] ?? "");
    if (cells.length < 7) continue;
    const href = /href="([^"]+)"/i.exec(cells[0] ?? "")?.[1];
    const number = /(\d+)/.exec(cellText(cells[1] ?? ""))?.[1];
    const level = toLevel(cellText(cells[6] ?? ""));
    const title = cellText(cells[0] ?? "");
    if (!href || !number || !level || !title) continue;
    notices.push({
      number,
      title,
      level,
      issuedOn: cellText(cells[2] ?? ""),
      validFrom: cellText(cells[3] ?? ""),
      validTo: cellText(cells[4] ?? ""),
      url: new URL(href.replace(/&amp;/g, "&"), SENAMHI_ORIGIN).toString(),
    });
  }
  return notices;
}

/** Rain notices only (matrix D-04: rain is the hazard that triggers alerts). */
export function isRainNotice(notice: SenamhiNotice): boolean {
  return /precipitaci|lluvia/i.test(notice.title);
}

/** Highest SENAMHI level first; ties keep the newest notice number first. */
export function sortByLevel(notices: SenamhiNotice[]): SenamhiNotice[] {
  return [...notices].sort(
    (left, right) =>
      LEVEL_RANK[right.level] - LEVEL_RANK[left.level] ||
      Number(right.number) - Number(left.number),
  );
}

export function createSenamhiNoticesSource(
  fetchImpl: typeof fetch = fetch,
): IOfficialNoticesFeed & { listCurrent(): Promise<SenamhiNoticesResult> } {
  return {
    async listCurrent(): Promise<SenamhiNoticesResult> {
      const fetchedAt = new Date().toISOString();
      try {
        const response = await fetchImpl(SENAMHI_NOTICES_URL);
        if (!response.ok) {
          return { available: false, fetchedAt, reason: `SENAMHI respondió ${response.status}.` };
        }
        const notices = parseSenamhiNotices(await response.text());
        if (notices.length === 0) {
          return {
            available: false,
            fetchedAt,
            reason: "No se encontraron avisos vigentes en la página de SENAMHI.",
          };
        }
        return { available: true, fetchedAt, notices };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { available: false, fetchedAt, reason: `SENAMHI no respondió: ${message}` };
      }
    },
  };
}
