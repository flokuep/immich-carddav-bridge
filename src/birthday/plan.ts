import { Birthday } from "./date";

export type BirthdayMode = "off" | "bidirectional" | "carddav-to-immich";
export type BirthdayPlan =
  | { kind: "equal"; value: string | null }
  | { kind: "write-immich"; value: string }
  | { kind: "write-carddav"; value: string }
  | { kind: "skip"; reason: string }
  | { kind: "conflict"; reason: string };

/** Compare both values against the last confirmed common value, not whole-record timestamps. */
export function planBirthday(card: Birthday, immich: Birthday, baseline: string | null | undefined, mode: BirthdayMode): BirthdayPlan {
  if (mode === "off") return { kind: "skip", reason: "Birthday sync disabled." };
  if (card.kind === "unsupported" || immich.kind === "unsupported") {
    return { kind: "skip", reason: card.kind === "unsupported" ? card.reason : immich.kind === "unsupported" ? immich.reason : "" };
  }
  const c = card.kind === "date" ? card.value : null;
  const i = immich.kind === "date" ? immich.value : null;
  if (c === i) return { kind: "equal", value: c };
  if (baseline === undefined) {
    if (c && !i) return { kind: "write-immich", value: c };
    if (i && !c) return mode === "bidirectional"
      ? { kind: "write-carddav", value: i }
      : { kind: "skip", reason: "No CardDAV birthday to import." };
    return { kind: "conflict", reason: "Different birthdays on first run." };
  }
  // A missing value after a previous sync is a deletion, not an invitation to refill it.
  if (baseline !== null && (c === null || i === null)) return { kind: "conflict", reason: "Deletion requires manual resolution; neither side was changed." };
  if (c && c !== baseline && i === baseline) return { kind: "write-immich", value: c };
  if (i && i !== baseline && c === baseline && mode === "bidirectional") return { kind: "write-carddav", value: i };
  return { kind: "conflict", reason: "Both sides changed, or Immich changed in one-way mode." };
}
