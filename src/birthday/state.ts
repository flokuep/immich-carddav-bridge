import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { BaseOptions, MatchedContact } from "../types";
import { normalizeBirthday } from "./date";

export interface BirthdayState { version: 1; entries: Record<string, string | null> }
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

/** Credentials never appear in state; key rotation intentionally starts a fresh account scope. */
export function birthdayKey(options: BaseOptions, match: MatchedContact): string {
  return digest(JSON.stringify([
    options.immichUrl.replace(/\/$/, ""), digest(options.immichKey),
    options.carddavUrl.replace(/\/$/, ""), options.carddavUsername,
    match.immich.id, match.cardDav.url, match.cardDav.uid,
  ]));
}

export async function readBirthdayState(file: string): Promise<BirthdayState> {
  let text: string;
  try { text = await readFile(file, "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, entries: {} };
    throw error;
  }
  const state = JSON.parse(text);
  if (!state || state.version !== 1 || !state.entries || typeof state.entries !== "object" ||
      Array.isArray(state.entries) || !Object.entries(state.entries).every(([key, value]) =>
        /^[a-f0-9]{64}$/.test(key) && (value === null ||
          (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && normalizeBirthday(value).kind === "date")))) {
    throw new Error("Invalid birthday state; restore the state file instead of silently resetting it.");
  }
  return state;
}

/** Exclusive lock covers reading, remote updates and checkpointing; never steal a stale lock. */
export async function lockBirthdayState(file: string): Promise<() => Promise<void>> {
  await mkdir(dirname(resolve(file)), { recursive: true });
  const lock = await open(file + ".lock", "wx", 0o600);
  try { await lock.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })); }
  catch (error) { await lock.close(); await unlink(file + ".lock"); throw error; }
  return async () => { await lock.close(); await unlink(file + ".lock"); };
}

/** Atomic replace leaves the previous valid checkpoint intact if writing the new file fails. */
export async function saveBirthdayState(file: string, state: BirthdayState): Promise<void> {
  const temporary = file + "." + randomUUID() + ".tmp";
  try {
    const handle = await open(temporary, "wx", 0o600);
    try { await handle.writeFile(JSON.stringify(state, null, 2) + "\n"); await handle.sync(); }
    finally { await handle.close(); }
    await rename(temporary, file);
  } finally {
    await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
  }
}
