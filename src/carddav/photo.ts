import { createHash } from "node:crypto";
import { imageSize } from "image-size";
import { foldLine } from "../utils";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
// Match grouped vCard properties (for example item1.PHOTO) as well as plain PHOTO fields.
const PHOTO = /^(?:[\w-]+\.)?PHOTO(?:;[^:]*)?:(.*)$/im;
const MARKER = /^X-IMMICH-PHOTO-SHA256:([^\r\n]+)$/im;

export function photoHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Detect presence separately from decoding so unsupported photos remain protected. */
export function hasContactPhoto(data: string): boolean {
  return PHOTO.test(data.replace(/\r?\n[ \t]/g, ""));
}

/** Decode embedded photos only; never fetch arbitrary URLs from contact data. */
export function readContactPhoto(data: string) {
  // A folded vCard property continues after a newline followed by whitespace.
  const unfolded = data.replace(/\r?\n[ \t]/g, "");
  const match = PHOTO.exec(unfolded);
  if (!match) return null;
  if (unfolded.match(new RegExp(PHOTO.source, "gim"))?.length !== 1) {
    throw new Error("Multiple contact photos are ambiguous; select one photo first.");
  }
  let encoded = match[1].trim();
  if (/^data:/i.test(encoded)) {
    const uri = /^data:image\/[\w.+-]+;base64,(.*)$/i.exec(encoded);
    if (!uri) throw new Error("Unsupported contact photo data URI.");
    encoded = uri[1];
  } else if (!/;ENCODING=(?:b|base64)(?:;|:)/i.test(match[0])) {
    throw new Error("Contact photo must be embedded base64; linked photos are not imported.");
  }
  encoded = encoded.replace(/[ \t]/g, "");
  if (!encoded || encoded.length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 === 1) {
    throw new Error("Invalid or oversized contact photo (maximum 10 MiB).");
  }
  // Buffer decoding tolerates malformed input; the round trip rejects silently ignored bytes.
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length > MAX_PHOTO_BYTES || bytes.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) {
    throw new Error("Invalid contact photo base64.");
  }
  // Read format and face-box dimensions from image bytes, not from untrusted vCard labels.
  const dimensions = imageSize(bytes);
  const formats: Record<string, string> = { jpg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };
  const mimeType = formats[dimensions.type ?? ""];
  if (!mimeType || !dimensions.width || !dimensions.height) {
    throw new Error("Contact photo must be a JPEG, PNG, GIF or WebP image.");
  }
  const hash = photoHash(bytes);
  return {
    bytes, hash, mimeType, width: dimensions.width, height: dimensions.height,
    extension: dimensions.type!,
    // Replacing the image invalidates the marker and makes the portrait eligible for import.
    exportedByBridge: MARKER.exec(unfolded)?.[1].trim() === hash,
  };
}

/** Mark exported thumbnails to avoid uploading them back as library assets. */
export function markExportedPhoto(data: string, bytes: Uint8Array): string {
  return data.replace(/^X-IMMICH-PHOTO-SHA256:[^\r\n]*(?:\r?\n)?/gim, "")
    .replace(/^END:VCARD/im, `X-IMMICH-PHOTO-SHA256:${photoHash(bytes)}\r\nEND:VCARD`);
}
