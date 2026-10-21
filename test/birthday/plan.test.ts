import { describe, it, expect } from "vitest";
import { normalizeBirthday } from "../../src/birthday/date";
import { planBirthday } from "../../src/birthday/plan";
const date = (value: string | null) => normalizeBirthday(value);
describe("calendar-only birthdays", () => {
  it.each(["2000-02-29", "20000229", "1985-07-23"])("accepts %s without timezone conversion", (value) => {
    expect(date(value)).toMatchObject({ kind: "date" });
  });
  it.each(["1900-02-29", "2001-02-29", "2000-13-01", "2000-01-32", "0000-01-01", "9999-01-01",
    "--0723", "--07-23", "July 23", "2000-01-01T00:00:00Z", "2000-0101", "200001-01"])("preserves unsupported %s", (value) => {
    expect(date(value).kind).toBe("unsupported");
  });
  it("distinguishes unavailable fields from explicit absence", () => {
    expect(normalizeBirthday(undefined).kind).toBe("unsupported");
    expect(date(null).kind).toBe("missing");
  });
});
describe("three-way reconciliation", () => {
  const a = "1980-01-01", b = "1981-01-01", c = "1982-01-01";
  it.each([
    [null, null, undefined, "equal"],
    [a, a, undefined, "equal"],
    [a, null, undefined, "write-immich"],
    [null, a, undefined, "write-carddav"],
    [a, b, undefined, "conflict"],
    [b, a, a, "write-immich"],
    [a, b, a, "write-carddav"],
    [b, c, a, "conflict"],
    [b, b, a, "equal"],
    [null, a, a, "conflict"],
    [a, null, a, "conflict"],
    [null, null, a, "equal"],
    [a, null, null, "write-immich"],
    [null, a, null, "write-carddav"],
  ] as const)("plans %s / %s against %s as %s", (card, immich, baseline, kind) => {
    expect(planBirthday(date(card), date(immich), baseline, "bidirectional").kind).toBe(kind);
  });
  it("keeps yearless birthdays intact", () => {
    expect(planBirthday(date("--0723"), date(a), undefined, "bidirectional").kind).toBe("skip");
  });
  it("supports a one-way import without overwriting independent Immich edits", () => {
    expect(planBirthday(date(a), date(null), undefined, "carddav-to-immich").kind).toBe("write-immich");
    expect(planBirthday(date(null), date(a), undefined, "carddav-to-immich").kind).toBe("skip");
    expect(planBirthday(date(a), date(b), a, "carddav-to-immich").kind).toBe("conflict");
  });
});
