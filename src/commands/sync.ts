import consola from "consola";
import { updateContacts, getCardDavContacts } from "../carddav/carddav";
import { getImmichPeople, getPersonImages } from "../immich";
import { importContactPhoto } from "../immich/importContactPhoto";
import { hasContactPhoto, readContactPhoto } from "../carddav/photo";
import matchPeopleToContactsByName from "../matcher/name";
import { BaseOptions, CardDavContact, ImmichPerson, MatchedContact } from "../types";
import matchPeopleToContactsByDict from "../matcher/dict";
import { readFile } from "../utils";
import { birthdayMode, syncBirthdays } from "../birthday/sync";

/**
 * Existing CardDAV portraits take priority; contacts without photos receive Immich thumbnails.
 * Unchanged bridge exports are excluded from re-import to prevent a synchronization loop.
 * Dry runs validate the plan without downloading thumbnails or writing to either server.
 * Optional birthday reconciliation runs independently after portrait writes have settled.
 * @throws If photo processing fails, birthdays conflict, or birthday state cannot be safely updated.
 */
export default async function sync(options: BaseOptions, dryRun = false) {
  birthdayMode(options); // Reject invalid modes before any photo writes.
  const [people, contacts] = await Promise.all([
    getImmichPeople(options.immichUrl, options.immichKey),
    getCardDavContacts(options.carddavUrl, options.carddavUsername, options.carddavPassword,
      options.carddavPathTemplate, options.carddavAddressbooks),
  ]);
  const matches = await matchEntries(people, contacts, options.matchingContactsFile);
  // Birthday-only runs do not download, import or export any portrait.
  if (options.skipPhotos ?? (process.env.SKIP_PHOTOS === "true")) {
    const failures = await syncBirthdays(options, matches, dryRun);
    if (failures && !dryRun) throw new Error(`Birthday synchronization completed with ${failures} conflict(s)/error(s).`);
    return;
  }
  // Decide one direction per contact before writing, so imports never overwrite their source.
  const imports: MatchedContact[] = [];
  const exports: MatchedContact[] = [];
  let failed = 0;
  for (const match of matches) {
    if (!hasContactPhoto(match.cardDav.data)) {
      exports.push(match);
      consola.info(`${match.immich.name}: Immich → CardDAV (missing contact photo).`);
      continue;
    }
    try {
      const photo = readContactPhoto(match.cardDav.data);
      // The marker only applies while the current photo still matches the exported bytes.
      if (photo && !photo.exportedByBridge) {
        imports.push(match);
        consola.info(`${match.immich.name}: CardDAV → Immich (existing contact photo).`);
      }
    } catch (error) {
      // Unsupported or invalid photos must not fall back to being overwritten with thumbnails.
      failed++;
      consola.error(`${match.immich.name}: Contact photo preserved; import unavailable:`, error);
    }
  }
  if (dryRun) {
    await syncBirthdays(options, matches, true);
    consola.info(`Dry run: ${imports.length} imports, ${exports.length} exports, ${failed} invalid photos. No changes applied.`);
    return;
  }
  // Thumbnails also recognize images exported by old bridge versions without provenance.
  const thumbnails = await getPersonImages(options.immichUrl, options.immichKey,
    [...new Set([...imports, ...exports].map((entry) => entry.immich.id))]);
  // Serialize writes within a configuration to avoid concurrent duplicate face creation.
  for (const match of imports) {
    try {
      const result = await importContactPhoto(options.immichUrl, options.immichKey, match, thumbnails[match.immich.id]);
      consola.info(`${match.immich.name}: Contact photo ${result}.`);
    } catch (error) {
      failed++;
      consola.error(`${match.immich.name}: Immich import failed; contact photo preserved. Retry on the next run:`, error);
    }
  }
  if (exports.length) {
    try {
      await updateContacts(options.carddavUrl, options.carddavUsername, options.carddavPassword, exports, thumbnails);
    } catch (error) {
      failed++;
      consola.error("Contact photo exports failed:", error);
    }
    failed += exports.filter((entry) => !thumbnails[entry.immich.id]).length;
  }
  // Birthday writes use fresh vCards after every photo operation has settled.
  const birthdayFailures = await syncBirthdays(options, matches);
  if (birthdayFailures) throw new Error(`Synchronization completed with ${birthdayFailures} birthday conflict(s)/error(s) and ${failed} photo error(s).`);
  // Report partial failures after allowing the remaining imports and exports to proceed.
  if (failed) throw new Error(`Synchronization completed with ${failed} photo error(s).`);
  consola.success("Synchronization completed successfully!");
}

/** Resolve complete, one-to-one matches before allowing writes to either server. */
async function matchEntries(people: ImmichPerson[], contacts: CardDavContact[], file?: string) {
  // Exclude adjacent duplicates using the same comparison rules as the name matcher.
  const uniqueNames = <T extends { name: string }>(items: T[]): T[] => {
    const sorted = items.toSorted((a, b) => a.name.localeCompare(b.name));
    return sorted.filter((item, index) =>
      (!sorted[index - 1] || item.name.localeCompare(sorted[index - 1].name) !== 0) &&
      (!sorted[index + 1] || item.name.localeCompare(sorted[index + 1].name) !== 0));
  };
  const uniquePeople = file ? people : uniqueNames(people);
  const uniqueContacts = file ? contacts : uniqueNames(contacts);
  if (!file && (uniquePeople.length !== people.length || uniqueContacts.length !== contacts.length)) {
    consola.warn("Ambiguous names skipped; use explicit contact mappings.");
  }
  const candidates = file
    ? matchPeopleToContactsByDict(people, contacts, parseMatchingContactsFile(await readFile(file)))
    : matchPeopleToContactsByName(uniquePeople, uniqueContacts);
  const counts = (values: (string | undefined)[]) => {
    const result = new Map<string | undefined, number>();
    for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
    return result;
  };
  // The dictionary matcher can return missing endpoints or reused targets.
  // Check UID uniqueness across all fetched address books before accepting manual mappings.
  const personCounts = counts(candidates.map((match) => match.immich?.id));
  const contactCounts = counts(candidates.map((match) => match.cardDav?.url));
  const uidCounts = counts(contacts.map((contact) => contact.uid));
  return candidates.filter((match) => {
    const valid = match.immich && match.cardDav &&
      personCounts.get(match.immich.id) === 1 && contactCounts.get(match.cardDav.url) === 1 &&
      (!file || uidCounts.get(match.cardDav.uid) === 1);
    if (!valid) consola.warn("Incomplete or ambiguous contact mapping skipped.");
    return valid;
  });
}

/** Validate external JSON before using it as an Immich-ID-to-CardDAV-UID mapping. */
function parseMatchingContactsFile(content: string): Record<string, string> {
  const value: unknown = JSON.parse(content);
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      !Object.entries(value).every(([key, entry]) => key.length > 0 && typeof entry === "string" && entry.length > 0)) {
    throw new Error("Matching contacts file must contain an object of non-empty ID strings.");
  }
  return value as Record<string, string>;
}
