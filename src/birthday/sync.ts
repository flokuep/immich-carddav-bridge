import { resolve } from "node:path";
import consola from "consola";
import { BaseOptions, MatchedContact } from "../types";
import { BirthdayMode, planBirthday } from "./plan";
import { normalizeBirthday } from "./date";
import { readCardBirthday } from "../carddav/birthday";
import { birthdayKey, lockBirthdayState, readBirthdayState, saveBirthdayState } from "./state";
import { readBirthdayContact, readImmichBirthday, writeBirthdayContact, writeImmichBirthday } from "./remote";

export function birthdayMode(options: BaseOptions): BirthdayMode {
  const mode = options.birthdaySync ?? process.env.BIRTHDAY_SYNC ?? "off";
  if (!["off", "bidirectional", "carddav-to-immich"].includes(mode)) throw new Error("Invalid birthdaySync mode.");
  return mode as BirthdayMode;
}

/** Reconcile birthdays separately from portraits; state is advanced only after confirmed convergence. */
export async function syncBirthdays(options: BaseOptions, matches: MatchedContact[], dryRun = false): Promise<number> {
  const mode = birthdayMode(options);
  if (mode === "off") return 0;
  const configured = options.birthdayStateFile ?? process.env.BIRTHDAY_STATE_FILE ?? ".bridge-state/birthdays.json";
  if (typeof configured !== "string" || !configured.trim()) throw new Error("A birthday state file is required.");
  const file = resolve(configured);
  // Dry runs never create a directory, lock or checkpoint.
  const unlock = dryRun ? undefined : await lockBirthdayState(file);
  try {
    const state = await readBirthdayState(file);
    let failed = 0;
    let checkpointFailed = false;
    const checkpoint = async (key: string, value: string | null) => {
      state.entries[key] = value;
      try { await saveBirthdayState(file, state); }
      catch (error) { checkpointFailed = true; throw error; }
    };
    for (const match of matches) {
      try {
        if (!match.cardDav.uid) {
          consola.warn(`${match.immich.name}: Birthday skipped because the contact has no stable UID.`);
          continue;
        }
        const [contact, immichValue] = await Promise.all([
          readBirthdayContact(options, match.cardDav), readImmichBirthday(options, match.immich.id),
        ]);
        const card = readCardBirthday(contact.data), immich = normalizeBirthday(immichValue);
        const key = birthdayKey(options, match);
        const plan = planBirthday(card, immich, state.entries[key], mode);
        if (plan.kind === "skip" || plan.kind === "conflict") {
          consola.warn(`${match.immich.name}: Birthday ${plan.kind}: ${plan.reason}`);
          if (plan.kind === "conflict") failed++;
          continue;
        }
        consola.info(`${match.immich.name}: Birthday ${plan.kind}${dryRun ? " (dry run)" : ""}.`);
        if (dryRun) continue;
        if (plan.kind === "equal") {
          if (state.entries[key] !== plan.value) {
            await checkpoint(key, plan.value);
          }
          continue;
        }

        // Refresh both sides immediately before writing; unrelated photo changes are preserved.
        const [latestContact, latestImmich] = await Promise.all([
          readBirthdayContact(options, contact), readImmichBirthday(options, match.immich.id),
        ]);
        if (JSON.stringify(readCardBirthday(latestContact.data)) !== JSON.stringify(card) ||
            JSON.stringify(normalizeBirthday(latestImmich)) !== JSON.stringify(immich)) {
          throw new Error("Birthday changed during synchronization; retry after resolving concurrent edits.");
        }
        if (plan.kind === "write-immich") {
          // Immich has no conditional birthday write: this narrows but cannot eliminate the race window.
          await writeImmichBirthday(options, match.immich.id, plan.value);
        } else {
          await writeBirthdayContact(options, latestContact, plan.value);
        }
        const [confirmedContact, confirmedImmich] = await Promise.all([
          readBirthdayContact(options, latestContact), readImmichBirthday(options, match.immich.id),
        ]);
        const confirmed = planBirthday(readCardBirthday(confirmedContact.data), normalizeBirthday(confirmedImmich), undefined, mode);
        if (confirmed.kind !== "equal" || confirmed.value !== plan.value) {
          throw new Error("Birthday write was not confirmed on both sides; baseline preserved.");
        }
        await checkpoint(key, plan.value);
      } catch (error) {
        failed++;
        consola.error(`${match.immich.name}: Birthday synchronization failed:`, error);
        // Stop immediately if checkpointing failed; do not perform further remote mutations.
        if (checkpointFailed) throw error;
      }
    }
    return failed;
  } finally { await unlock?.(); }
}
