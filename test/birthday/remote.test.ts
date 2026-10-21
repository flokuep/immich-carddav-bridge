import { afterEach, describe, expect, it, vi } from "vitest";
import { readBirthdayContact, writeBirthdayContact, writeImmichBirthday } from "../../src/birthday/remote";
const options = { immichUrl: "https://immich/api", immichKey: "key", carddavUrl: "https://cloud/dav",
  carddavUsername: "alice", carddavPassword: "secret", carddavPathTemplate: "", carddavAddressbooks: [] };
const data = "BEGIN:VCARD\r\nVERSION:3.0\r\nUID:contact\r\nFN:Alice\r\nNOTE:preserved\r\nEND:VCARD\r\n";
const contact = { uid: "contact", url: "https://cloud/dav/contact.vcf", name: "Alice", data, etag: '"v1"' };
afterEach(() => vi.unstubAllGlobals());
describe("conditional birthday writes", () => {
  it("reads a fresh contact and rejects UID replacement", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(data, { headers: { etag: '"v2"' } }))
      .mockResolvedValueOnce(new Response(data.replace("UID:contact", "UID:replacement")));
    vi.stubGlobal("fetch", fetch);
    expect(await readBirthdayContact(options, contact)).toMatchObject({ etag: '"v2"', data });
    await expect(readBirthdayContact(options, contact)).rejects.toThrow("UID changed");
    expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: "error" });
  });
  it("uses If-Match and preserves unrelated fields", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await writeBirthdayContact(options, contact, "1985-07-23");
    expect(fetch).toHaveBeenCalledWith(contact.url, expect.objectContaining({
      method: "PUT", headers: expect.objectContaining({ "If-Match": '"v1"' }),
      body: data.replace("END:VCARD", "BDAY:1985-07-23\r\nEND:VCARD"),
    }));
  });
  it("does not force retry on a stale ETag", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 412 }));
    vi.stubGlobal("fetch", fetch);
    await expect(writeBirthdayContact(options, contact, "1985-07-23")).rejects.toThrow("412");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("refuses writes without a strong ETag and cross-origin authentication", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(writeBirthdayContact(options, { ...contact, etag: undefined }, "1985-07-23")).rejects.toThrow("strong");
    await expect(writeBirthdayContact(options, { ...contact, etag: 'W/"v1"' }, "1985-07-23")).rejects.toThrow("strong");
    await expect(readBirthdayContact(options, { ...contact, url: "https://other.example/a.vcf" })).rejects.toThrow("different origin");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("sends only birthDate through the real Immich SDK", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ id: "person", birthDate: "1985-07-23" }));
    vi.stubGlobal("fetch", fetch);
    await writeImmichBirthday(options, "person", "1985-07-23");
    const [url, request] = fetch.mock.calls[0];
    expect(url).toBe("https://immich/api/people/person");
    expect(JSON.parse(request.body)).toEqual({ birthDate: "1985-07-23" });
    expect(new Headers(request.headers).get("x-api-key")).toBe("key");
  });
});
