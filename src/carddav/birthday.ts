import { Birthday, normalizeBirthday } from "../birthday/date";

/** Preserve physical lines and unrelated properties, including folded photos and custom fields. */
function contentLines(data: string) {
  const blocks: { raw: string; logical: string; start: number; end: number }[] = [];
  let offset = 0;
  for (const raw of data.split(/(?<=\n)/)) {
    if (/^[ \t]/.test(raw) && blocks.length) {
      const previous = blocks[blocks.length - 1];
      previous.raw += raw;
      previous.end += raw.length;
      previous.logical = previous.raw.replace(/\r?\n[ \t]/g, "").replace(/\r?\n$/, "");
    } else {
      blocks.push({ raw, logical: raw.replace(/\r?\n$/, ""), start: offset, end: offset + raw.length });
    }
    offset += raw.length;
  }
  return blocks;
}

function birthdayLines(data: string) {
  return contentLines(data).filter((line) => /^(?:[\w-]+\.)?BDAY(?:;|:|$)/i.test(line.logical));
}

export function readCardBirthday(data: string): Birthday {
  const lines = birthdayLines(data);
  if (!lines.length) return { kind: "missing" };
  if (lines.length !== 1) return { kind: "unsupported", reason: "Multiple BDAY properties." };
  const line = lines[0].logical;
  const colon = line.indexOf(":");
  if (colon < 0) return { kind: "unsupported", reason: "Malformed BDAY property." };
  const parameters = line.slice(0, colon);
  if (/;VALUE=(?!"?(?:date|date-and-or-time)"?(?:;|$))/i.test(parameters) ||
      /;X-APPLE-OMIT-YEAR=/i.test(parameters) ||
      /;CALSCALE=(?!"?gregorian"?(?:;|$))/i.test(parameters)) {
    return { kind: "unsupported", reason: "Text, omitted-year or non-Gregorian birthday." };
  }
  return normalizeBirthday(line.slice(colon + 1));
}

/** Only write complete dates; never replace a partial, invalid or ambiguous birthday. */
export function writeCardBirthday(data: string, value: string): string {
  if (normalizeBirthday(value).kind !== "date") throw new Error("Invalid complete birthday.");
  if (readCardBirthday(data).kind === "unsupported") throw new Error("Existing BDAY cannot be safely replaced.");
  const blocks = contentLines(data);
  const versions = blocks.filter((line) => /^VERSION:/i.test(line.logical));
  const ends = blocks.filter((line) => /^END:VCARD$/i.test(line.logical));
  if (versions.length !== 1 || !/^VERSION:[34]\.0$/i.test(versions[0].logical) || ends.length !== 1 ||
      blocks.filter((line) => /^BEGIN:VCARD$/i.test(line.logical)).length !== 1) {
    throw new Error("Expected a single vCard 3.0 or 4.0.");
  }
  const v4 = /^VERSION:4/i.test(versions[0].logical);
  const existing = birthdayLines(data)[0];
  const newline = data.includes("\r\n") ? "\r\n" : "\n";
  const header = existing ? existing.logical.slice(0, existing.logical.indexOf(":")) : "BDAY";
  // Preserve property groups and unrelated parameters, but express the new value as a date.
  const parameters = header.split(";").filter((part) => !/^VALUE=/i.test(part));
  if (v4) parameters.push("VALUE=date");
  const replacement = parameters.join(";") + ":" + (v4 ? value.replace(/-/g, "") : value) + newline;
  return existing
    ? data.slice(0, existing.start) + replacement + data.slice(existing.end)
    : data.slice(0, ends[0].start) + replacement + data.slice(ends[0].start);
}
