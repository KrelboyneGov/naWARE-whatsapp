import { foldText } from "./opt-out";

/**
 * The day a person asks about, resolved in Lima time. "hoy", "mañana", "pasado mañana",
 * a weekday ("el sábado" = the next one, today included), "fin de semana" (next Saturday),
 * "25 de octubre", "25/10" or an ISO date. Anything unrecognised is today.
 */
export interface TargetDate {
  /** YYYY-MM-DD in America/Lima. */
  iso: string;
  /** Human label for replies, e.g. "el sábado 24 de octubre". */
  label: string;
  /** 0 for today. Negative when the person asks about a past day. */
  daysAhead: number;
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const WEEKDAY_LABELS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Today's calendar date in Lima as a UTC-midnight Date, so day arithmetic is exact. */
export function limaToday(now: Date): Date {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(now);
  return new Date(`${iso}T00:00:00Z`);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function toTarget(today: Date, day: Date): TargetDate {
  const daysAhead = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  const weekday = WEEKDAY_LABELS[day.getUTCDay()] ?? "";
  const dateText = `${day.getUTCDate()} de ${MONTHS[day.getUTCMonth()] ?? ""}`;
  const label =
    daysAhead === 0
      ? `hoy ${weekday} ${dateText}`
      : daysAhead === 1
        ? `mañana ${weekday} ${dateText}`
        : `el ${weekday} ${dateText}`;
  return { iso: day.toISOString().slice(0, 10), label, daysAhead };
}

export function resolveTargetDate(text: string, now: Date): TargetDate {
  const folded = foldText(text);
  const today = limaToday(now);

  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(folded);
  if (iso) return toTarget(today, new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`));

  const monthName = new RegExp(`\\b(\\d{1,2}) de (${MONTHS.join("|")})\\b`).exec(folded);
  const slash = /\b(\d{1,2})\/(\d{1,2})\b/.exec(folded);
  if (monthName || slash) {
    const day = Number(monthName ? monthName[1] : slash![1]);
    const month = monthName ? MONTHS.indexOf(monthName[2]!) : Number(slash![2]) - 1;
    if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
      let candidate = new Date(Date.UTC(today.getUTCFullYear(), month, day));
      // A date already well past this year means next year ("5 de enero" asked in October).
      if (candidate.getTime() < addDays(today, -30).getTime()) {
        candidate = new Date(Date.UTC(today.getUTCFullYear() + 1, month, day));
      }
      return toTarget(today, candidate);
    }
  }

  if (/pasado manana/.test(folded)) return toTarget(today, addDays(today, 2));
  if (
    /\bmanana\b/.test(folded) &&
    !/\bde la manana\b|\bpor la manana\b|\besta manana\b/.test(folded)
  ) {
    return toTarget(today, addDays(today, 1));
  }

  const weekend = /fin de semana|finde/.test(folded);
  const weekdayIndex = weekend
    ? 6
    : WEEKDAYS.findIndex((day) => new RegExp(`\\b${day}\\b`).test(folded));
  if (weekdayIndex >= 0) {
    const ahead = (weekdayIndex - today.getUTCDay() + 7) % 7;
    const nextWeek = /proximo|siguiente|que viene/.test(folded) && ahead === 0 ? 7 : 0;
    return toTarget(today, addDays(today, ahead + nextWeek));
  }

  return toTarget(today, today);
}

/** True when the text names a day ("hoy", "mañana", a weekday, a date), so it is not a follow-up. */
export function hasDateExpression(text: string): boolean {
  const folded = foldText(text);
  if (/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\b/.test(folded)) return true;
  if (new RegExp(`\\b\\d{1,2} de (${MONTHS.join("|")})\\b`).test(folded)) return true;
  if (/\bhoy\b|pasado manana|fin de semana|finde/.test(folded)) return true;
  if (
    /\bmanana\b/.test(folded) &&
    !/\bde la manana\b|\bpor la manana\b|\besta manana\b/.test(folded)
  ) {
    return true;
  }
  return WEEKDAYS.some((day) => new RegExp(`\\b${day}\\b`).test(folded));
}

/**
 * A weekday that is today ("¿y el domingo?" asked on Sunday) right after talking about a later
 * day means next week's, not today.
 */
export function resolveFollowUpDate(
  text: string,
  now: Date,
  previous: TargetDate | null,
): TargetDate {
  const target = resolveTargetDate(text, now);
  const folded = foldText(text);
  const namesWeekday = WEEKDAYS.some((day) => new RegExp(`\\b${day}\\b`).test(folded));
  if (namesWeekday && target.daysAhead === 0 && previous && previous.daysAhead > 0) {
    const today = limaToday(now);
    return toTarget(today, addDays(today, 7));
  }
  return target;
}
