import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { birthdayKey, readBirthdayState, saveBirthdayState, lockBirthdayState } from "../../src/birthday/state";
import { BaseOptions } from "../../src/types";
let folder: string, file: string;
beforeEach(async () => { folder = await mkdtemp(join(tmpdir(), "birthday-state-")); file = join(folder, "state.json"); });
afterEach(async () => { await rm(folder, { recursive: true, force: true }); });
describe("birthday checkpoints", () => {
  it("reads absent files without creating state", async () => {
    expect(await readBirthdayState(file)).toEqual({ version: 1, entries: {} });
    expect(await readdir(folder)).toEqual([]);
  });
  it("persists and atomically replaces a baseline", async () => {
    const key = "a".repeat(64);
    await saveBirthdayState(file, { version: 1, entries: { [key]: null } });
    await saveBirthdayState(file, { version: 1, entries: { [key]: "1985-07-23" } });
    expect((await readBirthdayState(file)).entries[key]).toBe("1985-07-23");
    expect(await readdir(folder)).toEqual(["state.json"]);
  });
  it.each(["", "{", '{"version":2,"entries":{}}', '{"version":1,"entries":[]}',
    '{"version":1,"entries":{"bad":"1985-07-23"}}'])("rejects corrupt or unknown state %s", async (text) => {
    await writeFile(file, text);
    await expect(readBirthdayState(file)).rejects.toThrow();
  });
  it("rejects simultaneous locks and releases normally", async () => {
    const release = await lockBirthdayState(file);
    await expect(lockBirthdayState(file)).rejects.toThrow();
    const lock = JSON.parse(await readFile(file + ".lock", "utf8"));
    expect(lock.pid).toBe(process.pid);
    await release();
    await (await lockBirthdayState(file))();
    expect(await readdir(folder)).toEqual([]);
  });
  it("scopes keys without storing passwords", () => {
    const options = { immichUrl: "https://immich/api", immichKey: "secret",
      carddavUrl: "https://cloud", carddavUsername: "alice" } as BaseOptions;
    const match = { immich: { id: "person", name: "Alice", preview: "" },
      cardDav: { uid: "uid", url: "https://cloud/a.vcf", name: "Alice", data: "" } };
    const key = birthdayKey(options, match);
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(birthdayKey({ ...options, immichKey: "different-account" }, match)).not.toBe(key);
    expect(birthdayKey(options, { ...match, cardDav: { ...match.cardDav, url: "https://cloud/book2/a.vcf" } })).not.toBe(key);
  });
});
