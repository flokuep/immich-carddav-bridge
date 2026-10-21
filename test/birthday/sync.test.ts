import * as storage from "../../src/birthday/state";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { birthdayMode, syncBirthdays } from "../../src/birthday/sync";
import { birthdayKey, readBirthdayState, saveBirthdayState } from "../../src/birthday/state";
import * as remote from "../../src/birthday/remote";
import { BaseOptions } from "../../src/types";
vi.mock("../../src/birthday/remote", () => ({
  readBirthdayContact: vi.fn(), readImmichBirthday: vi.fn(),
  writeBirthdayContact: vi.fn(), writeImmichBirthday: vi.fn(),
}));
let directory: string, options: BaseOptions;
let c: string | null, i: string | null;
const match = { immich: { id: "person", name: "Alice", preview: "" },
  cardDav: { uid: "contact", url: "https://cloud/dav/contact.vcf", name: "Alice", data: "", etag: '"v1"' } };
function card(value: string | null) {
  return "BEGIN:VCARD\r\nVERSION:3.0\r\nUID:contact\r\nFN:Alice\r\n" +
    (value ? "BDAY:" + value + "\r\n" : "") + "PHOTO;ENCODING=b:preserve\r\nEND:VCARD\r\n";
}
beforeEach(async () => {
  vi.resetAllMocks();
  directory = await mkdtemp(join(tmpdir(), "birthday-sync-"));
  options = { immichUrl: "https://immich/api", immichKey: "key", carddavUrl: "https://cloud/dav",
    carddavUsername: "user", carddavPassword: "pass", carddavAddressbooks: [], carddavPathTemplate: "",
    birthdaySync: "bidirectional", birthdayStateFile: join(directory, "state.json") };
  c = "1985-07-23"; i = null;
  vi.mocked(remote.readBirthdayContact).mockImplementation(async () => ({ ...match.cardDav, data: card(c) }));
  vi.mocked(remote.readImmichBirthday).mockImplementation(async () => i);
  vi.mocked(remote.writeImmichBirthday).mockImplementation(async (_options, _id, value) => { i = value; });
  vi.mocked(remote.writeBirthdayContact).mockImplementation(async (_options, _contact, value) => { c = value; });
});
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
describe("persistent birthday reconciliation", () => {
  it("imports, checkpoints, restarts without writes and propagates changes in both directions", async () => {
    expect(await syncBirthdays(options, [match])).toBe(0);
    expect(i).toBe(c);
    expect((await readBirthdayState(options.birthdayStateFile!)).entries[birthdayKey(options, match)]).toBe(c);
    expect(await syncBirthdays(options, [match])).toBe(0);
    expect(remote.writeImmichBirthday).toHaveBeenCalledTimes(1);
    i = "1986-07-23";
    expect(await syncBirthdays(options, [match])).toBe(0);
    expect(c).toBe(i);
    c = "1987-07-23";
    expect(await syncBirthdays(options, [match])).toBe(0);
    expect(i).toBe(c);
  });
  it("fills an initially missing CardDAV birthday", async () => {
    c = null; i = "1985-07-23";
    expect(await syncBirthdays(options, [match])).toBe(0);
    expect(remote.writeBirthdayContact).toHaveBeenCalledTimes(1);
  });
  it("does not overwrite first-run conflicts, yearless dates or later deletions", async () => {
    i = "1980-01-01";
    expect(await syncBirthdays(options, [match])).toBe(1);
    c = "--0723";
    expect(await syncBirthdays(options, [match])).toBe(0);
    c = i = "1980-01-01";
    await syncBirthdays(options, [match]);
    c = null;
    expect(await syncBirthdays(options, [match])).toBe(1);
    expect(remote.writeBirthdayContact).not.toHaveBeenCalled();
    expect(remote.writeImmichBirthday).not.toHaveBeenCalled();
  });
  it("reports simultaneous edits and preserves the previous baseline", async () => {
    i = c; await syncBirthdays(options, [match]);
    c = "1981-01-01"; i = "1982-01-01";
    expect(await syncBirthdays(options, [match])).toBe(1);
    expect((await readBirthdayState(options.birthdayStateFile!)).entries[birthdayKey(options, match)]).toBe("1985-07-23");
  });
  it("dry run does not create directories, locks, checkpoints or remote updates", async () => {
    options.birthdayStateFile = join(directory, "missing", "state.json");
    expect(await syncBirthdays(options, [match], true)).toBe(0);
    await expect(access(join(directory, "missing"))).rejects.toThrow();
    expect(remote.writeImmichBirthday).not.toHaveBeenCalled();
    expect(remote.writeBirthdayContact).not.toHaveBeenCalled();
  });
  it("rejects corrupted state before reading or writing remote values", async () => {
    await writeFile(options.birthdayStateFile!, "{broken");
    await expect(syncBirthdays(options, [match])).rejects.toThrow();
    expect(remote.readBirthdayContact).not.toHaveBeenCalled();
  });
  it("detects edits between planning and writing", async () => {
    vi.mocked(remote.readImmichBirthday).mockResolvedValueOnce(null).mockResolvedValue("1980-01-01");
    expect(await syncBirthdays(options, [match])).toBe(1);
    expect(remote.writeImmichBirthday).not.toHaveBeenCalled();
  });
  it("keeps the baseline on HTTP errors and unconfirmed writes", async () => {
    const key = birthdayKey(options, match);
    await saveBirthdayState(options.birthdayStateFile!, { version: 1, entries: { [key]: null } });
    vi.mocked(remote.writeImmichBirthday).mockRejectedValueOnce(new Error("403"));
    expect(await syncBirthdays(options, [match])).toBe(1);
    expect((await readBirthdayState(options.birthdayStateFile!)).entries[key]).toBeNull();
    vi.mocked(remote.writeImmichBirthday).mockResolvedValue(undefined);
    expect(await syncBirthdays(options, [match])).toBe(1);
    expect((await readBirthdayState(options.birthdayStateFile!)).entries[key]).toBeNull();
  });
  it("does nothing while disabled and rejects invalid modes", async () => {
    expect(await syncBirthdays({ ...options, birthdaySync: "off" }, [match])).toBe(0);
    await expect(syncBirthdays({ ...options, birthdaySync: "invalid" as never }, [match])).rejects.toThrow("mode");
    expect(remote.readBirthdayContact).not.toHaveBeenCalled();
  });
it("aborts further writes after checkpoint failure and releases the lock", async () => {
  const write = vi.spyOn(storage, "saveBirthdayState").mockRejectedValueOnce(new Error("disk full"));
  const other = { ...match, immich: { ...match.immich, id: "other" }, cardDav: { ...match.cardDav, uid: "other" } };
  try {
    await expect(syncBirthdays(options, [match, other])).rejects.toThrow("disk full");
    expect(remote.writeImmichBirthday).toHaveBeenCalledTimes(1);
    await expect(access(options.birthdayStateFile! + ".lock")).rejects.toThrow();
  } finally { write.mockRestore(); }
});
it("uses the most recent vCard after an unrelated photo edit", async () => {
  c = null; i = "1985-07-23";
  const original = { ...match.cardDav, data: card(null), etag: '"old"' };
  const latest = { ...match.cardDav, data: card(null).replace("preserve", "new-photo"), etag: '"new"' };
  vi.mocked(remote.readBirthdayContact).mockResolvedValueOnce(original).mockResolvedValueOnce(latest)
    .mockImplementation(async () => ({ ...latest, data: card(c).replace("preserve", "new-photo") }));
  expect(await syncBirthdays(options, [match])).toBe(0);
  expect(remote.writeBirthdayContact).toHaveBeenCalledWith(options, latest, "1985-07-23");
});
it("does not read or write while another run holds the checkpoint lock", async () => {
  const release = await storage.lockBirthdayState(options.birthdayStateFile!);
  try {
    await expect(syncBirthdays(options, [match])).rejects.toThrow();
    expect(remote.readBirthdayContact).not.toHaveBeenCalled();
  } finally { await release(); }
});

});

it("accepts the CardDAV mode from configuration or environment", () => {
  expect(birthdayMode({ ...options, birthdaySync: "carddav-to-immich" })).toBe("carddav-to-immich");
  vi.stubEnv("BIRTHDAY_SYNC", "carddav-to-immich");
  try {
    expect(birthdayMode({ ...options, birthdaySync: undefined })).toBe("carddav-to-immich");
    expect(birthdayMode({ ...options, birthdaySync: "off" })).toBe("off");
  } finally { vi.unstubAllEnvs(); }
});
