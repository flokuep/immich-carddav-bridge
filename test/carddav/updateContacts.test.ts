import { describe, it, expect, vi } from "vitest";
import { processSingleContactUpdate } from "../../src/carddav/updateContacts";
import { readContactPhoto } from "../../src/carddav/photo";
import { DAVClient } from "tsdav";
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=";
describe("contact photo exports", () => {
  const match = { immich: { id: "a", name: "Alice", preview: "" },
    cardDav: { uid: "a", name: "Alice", url: "url", etag: "etag",
      data: "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Alice\r\nBDAY:20000101\r\nEND:VCARD\r\n" } };
  it("preserves other properties and ETag and marks exported bytes", async () => {
    const updateVCard = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await processSingleContactUpdate({ updateVCard } as unknown as DAVClient, match,
      { a: new Blob([Buffer.from(png, "base64")], { type: "image/png" }) });
    const card = updateVCard.mock.calls[0][0].vCard;
    expect(card.etag).toBe("etag");
    expect(card.data).toContain("BDAY:20000101");
    expect(readContactPhoto(card.data)?.exportedByBridge).toBe(true);
  });
  it("never overwrites an existing grouped photo", async () => {
    const updateVCard = vi.fn();
    await processSingleContactUpdate({ updateVCard } as unknown as DAVClient,
      { ...match, cardDav: { ...match.cardDav, data: match.cardDav.data.replace("END:VCARD", "item1.PHOTO;ENCODING=b:" + png + "\r\nEND:VCARD") } },
      { a: new Blob(["unused"]) });
    expect(updateVCard).not.toHaveBeenCalled();
  });
  it("propagates HTTP errors", async () => {
    const updateVCard = vi.fn().mockResolvedValue(new Response(null, { status: 412 }));
    await expect(processSingleContactUpdate({ updateVCard } as unknown as DAVClient, match,
      { a: new Blob([Buffer.from(png, "base64")], { type: "image/png" }) })).rejects.toThrow("412");
  });
});
