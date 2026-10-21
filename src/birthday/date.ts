export type Birthday =
  | { kind: "date"; value: string }
  | { kind: "missing" }
  | { kind: "unsupported"; reason: string };

/** Calendar dates are compared as strings, never converted through a local timezone. */
export function normalizeBirthday(value: unknown, today = new Date().toISOString().slice(0, 10)): Birthday {
  if (value === null || value === "") return { kind: "missing" };
  if (typeof value !== "string") return { kind: "unsupported", reason: "Birthday unavailable or not a string." };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) ?? /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (!match) return { kind: "unsupported", reason: "Birthday is partial, textual or not a full date." };
  const [, y, m, d] = match;
  const year = Number(y), month = Number(m), day = Number(d);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const normalized = `${y}-${m}-${d}`;
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] || normalized > today) {
    return { kind: "unsupported", reason: "Birthday is invalid or in the future." };
  }
  return { kind: "date", value: normalized };
}
