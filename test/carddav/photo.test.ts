import { describe, it, expect } from "vitest";
import { readContactPhoto, hasContactPhoto, markExportedPhoto } from "../../src/carddav/photo";
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=";
const card = (line: string) => `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Alice\r\n${line}\r\nEND:VCARD\r\n`;
describe("contact photos", () => {
  it("reads folded grouped vCard 3 photos and dimensions", () => {
    const photo = readContactPhoto(card("item1.PHOTO;ENCODING=b;TYPE=PNG:" + png.slice(0,40) + "\r\n\t" + png.slice(40)));
    expect(photo).toMatchObject({ width: 1, height: 1, mimeType: "image/png", exportedByBridge: false });
  });
  it("reads vCard 4 data URIs", () => {
    expect(readContactPhoto(card("PHOTO;VALUE=uri:data:image/png;base64," + png))?.mimeType).toBe("image/png");
  });
  it("marks exports and detects later edits", () => {
    const original = card("PHOTO;ENCODING=b:" + png);
    const marked = markExportedPhoto(original, Buffer.from(png, "base64"));
    expect(readContactPhoto(marked)?.exportedByBridge).toBe(true);
    expect(readContactPhoto(marked.replace(/X-IMMICH-PHOTO-SHA256:[^\r]+/, "X-IMMICH-PHOTO-SHA256:old"))?.exportedByBridge).toBe(false);
    expect(markExportedPhoto(marked, Buffer.from(png, "base64")).match(/X-IMMICH-PHOTO-SHA256:/g)).toHaveLength(1);
  });
  it("does not fetch URLs or accept invalid bytes", () => {
    expect(() => readContactPhoto(card("PHOTO;VALUE=uri:https://example.com/portrait.jpg"))).toThrow("embedded");
    expect(() => readContactPhoto(card("PHOTO;ENCODING=b:!!!"))).toThrow("Invalid");
    expect(() => readContactPhoto(card("PHOTO;ENCODING=b:" + "A".repeat(14_000_000)))).toThrow("oversized");
  });
  it("preserves ambiguous photos by rejecting imports", () => {
    expect(() => readContactPhoto(card("PHOTO;ENCODING=b:" + png + "\r\nPHOTO;ENCODING=b:" + png))).toThrow("Multiple");
  });
  it("distinguishes missing photos from unsupported photos", () => {
    expect(readContactPhoto(card(""))).toBeNull();
    expect(hasContactPhoto(card("item1.photo;VALUE=uri:https://example.com/a"))).toBe(true);
  });
});
