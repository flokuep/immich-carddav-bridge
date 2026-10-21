import { describe, it, expect } from "vitest";
import { readCardBirthday, writeCardBirthday } from "../../src/carddav/birthday";
const card = (line = "", version = "3.0") =>
  `BEGIN:VCARD\r\nVERSION:${version}\r\nUID:contact\r\nFN:Alice\r\n${line ? line + "\r\n" : ""}NOTE:Keep me\r\nPHOTO;ENCODING=b:abcd\r\n efgh\r\nX-CUSTOM:yes\r\nEND:VCARD\r\n`;
describe("vCard birthdays", () => {
  it.each(["BDAY:19850723", "item1.bday;VALUE=date:1985-07-23", "BDAY;VALUE=\r\n date:19850723"])("reads %s", (line) => {
    expect(readCardBirthday(card(line))).toEqual({ kind: "date", value: "1985-07-23" });
  });
  it.each(["BDAY:--0723", "BDAY;VALUE=text:19850723", "BDAY;X-APPLE-OMIT-YEAR=1604:16040723",
    "BDAY;CALSCALE=hebrew:19850723", "BDAY:19800101\r\nBDAY:19810101", "BDAY:invalid"])("preserves %s", (line) => {
    expect(readCardBirthday(card(line)).kind).toBe("unsupported");
    expect(() => writeCardBirthday(card(line), "1985-07-23")).toThrow();
  });
  it("patches only the BDAY property and keeps all other bytes", () => {
    const before = card("item1.BDAY;VALUE=date;CALSCALE=gregorian:19800101");
    expect(writeCardBirthday(before, "1985-07-23")).toBe(before.replace(
      "item1.BDAY;VALUE=date;CALSCALE=gregorian:19800101", "item1.BDAY;CALSCALE=gregorian:1985-07-23"));
  });
  it("inserts version-appropriate dates and handles LF cards", () => {
    expect(writeCardBirthday(card("", "4.0"), "1985-07-23")).toContain("BDAY;VALUE=date:19850723\r\nEND:VCARD");
    expect(writeCardBirthday(card().replace(/\r/g, ""), "1985-07-23")).toContain("BDAY:1985-07-23\nEND:VCARD");
  });
  it("removes old continuation lines only for the edited property", () => {
    const result = writeCardBirthday(card("BDAY:1985\r\n 0723"), "1986-07-23");
    expect(result).not.toContain(" 0723");
    expect(result).toContain("PHOTO;ENCODING=b:abcd\r\n efgh");
  });
});
