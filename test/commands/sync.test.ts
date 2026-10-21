import { birthdayMode, syncBirthdays } from "../../src/birthday/sync";
import { beforeEach, describe, it, expect, vi } from "vitest";
import sync from "../../src/commands/sync";
import { getCardDavContacts, updateContacts } from "../../src/carddav/carddav";
import { getImmichPeople, getPersonImages } from "../../src/immich";
import { importContactPhoto } from "../../src/immich/importContactPhoto";
import { readFile } from "../../src/utils";
vi.mock("../../src/carddav/carddav", () => ({ getCardDavContacts: vi.fn(), updateContacts: vi.fn() }));
vi.mock("../../src/immich", () => ({ getImmichPeople: vi.fn(), getPersonImages: vi.fn() }));
vi.mock("../../src/immich/importContactPhoto", () => ({ importContactPhoto: vi.fn() }));
vi.mock("../../src/birthday/sync", () => ({ birthdayMode: vi.fn(), syncBirthdays: vi.fn().mockResolvedValue(0) }));
vi.mock("../../src/utils", () => ({ readFile: vi.fn() }));
const options = { immichUrl: "https://immich/api", immichKey: "key", carddavUrl: "https://cloud",
  carddavUsername: "user", carddavPassword: "password", carddavPathTemplate: "", carddavAddressbooks: [] };
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=";
const person = (id: string, name: string) => ({ id, name, preview: "" });
const contact = (uid: string, name: string, photo = false) => ({ uid, name, url: uid, data:
  `BEGIN:VCARD\r\nFN:${name}\r\n${photo ? "PHOTO;ENCODING=b:" + png + "\r\n" : ""}END:VCARD\r\n` });
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(syncBirthdays).mockResolvedValue(0);
  vi.mocked(getImmichPeople).mockResolvedValue([person("a", "Alice"), person("b", "Bob")]);
  vi.mocked(getCardDavContacts).mockResolvedValue([contact("a", "Alice", true), contact("b", "Bob")]);
  vi.mocked(getPersonImages).mockResolvedValue({ a: new Blob(["a"]), b: new Blob(["b"]) });
});
describe("photo synchronization", () => {
  it("routes existing photos to Immich and missing photos to CardDAV", async () => {
    await sync(options);
    expect(importContactPhoto).toHaveBeenCalledWith(options.immichUrl, "key", expect.objectContaining({ immich: expect.objectContaining({ id: "a" }) }), expect.any(Blob));
    expect(updateContacts).toHaveBeenCalledWith(options.carddavUrl, "user", "password",
      [expect.objectContaining({ immich: expect.objectContaining({ id: "b" }) })], expect.anything());
  });
  it("dry run never downloads thumbnails or writes", async () => {
    await sync(options, true);
    expect(getPersonImages).not.toHaveBeenCalled();
    expect(importContactPhoto).not.toHaveBeenCalled();
    expect(updateContacts).not.toHaveBeenCalled();
  });
  it("preserves malformed contact photos and reports partial failures", async () => {
    vi.mocked(getCardDavContacts).mockResolvedValue([{
      ...contact("a", "Alice"), data: "BEGIN:VCARD\r\nPHOTO;ENCODING=b:!!!\r\nEND:VCARD",
    }]);
    await expect(sync(options)).rejects.toThrow("photo error");
    expect(updateContacts).not.toHaveBeenCalled();
    expect(importContactPhoto).not.toHaveBeenCalled();
  });
  it("skips ambiguous names", async () => {
    vi.mocked(getCardDavContacts).mockResolvedValue([contact("1", "Alice", true), contact("2", "Alice", true)]);
    await sync(options);
    expect(importContactPhoto).not.toHaveBeenCalled();
    expect(updateContacts).not.toHaveBeenCalled();
  });
  it("accepts valid manual mappings and skips missing IDs", async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ a: "a", missing: "b" }));
    await sync({ ...options, matchingContactsFile: "matches.json" });
    expect(importContactPhoto).toHaveBeenCalledTimes(1);
    expect(updateContacts).not.toHaveBeenCalled();
  });
  it("reports failed imports while still exporting other contacts", async () => {
    vi.mocked(importContactPhoto).mockRejectedValue(new Error("403"));
    await expect(sync(options)).rejects.toThrow("1 photo error");
    expect(updateContacts).toHaveBeenCalled();
  });
it("supports birthday-only runs and reports birthday failures", async () => {
  vi.mocked(syncBirthdays).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
  await sync({ ...options, birthdaySync: "bidirectional", skipPhotos: true });
  expect(getPersonImages).not.toHaveBeenCalled();
  expect(updateContacts).not.toHaveBeenCalled();
  expect(importContactPhoto).not.toHaveBeenCalled();
  await expect(sync({ ...options, birthdaySync: "bidirectional", skipPhotos: true })).rejects.toThrow(/birthday/i);
});
it("still runs birthday synchronization after a photo export failure", async () => {
  vi.mocked(updateContacts).mockRejectedValueOnce(new Error("412"));
  await expect(sync({ ...options, birthdaySync: "bidirectional" })).rejects.toThrow("photo error");
  expect(syncBirthdays).toHaveBeenCalledWith(expect.objectContaining({ birthdaySync: "bidirectional" }), expect.any(Array));
});

});
