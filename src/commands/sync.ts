import consola from "consola";
import { updateContacts, getCardDavContacts } from "../carddav/carddav";
import { getImmichPeople, getPersonImages } from "../immich";
import matchPeopleToContactsByName from "../matcher/name";
import { BaseOptions, CardDavContact, ImmichPerson } from "../types";
import matchPeopleToContactsByDict from "../matcher/dict";
import { readFile } from "../utils";

/**
 * Synchronizes pictures of Immich people with CardDAV contact images.
 * @param options - Base options for the synchronization process.
 * @param dryRun - If true, the synchronization will only simulate changes without applying them. Defaults to false.
 */
export default async function sync(
  options: BaseOptions,
  dryRun: boolean = false
) {
  try {
    const [immichPeople, cardDavContacts] = await Promise.all([
      getImmichPeople(options.immichUrl, options.immichKey),
      getCardDavContacts(
        options.carddavUrl,
        options.carddavUsername,
        options.carddavPassword,
        options.carddavPathTemplate,
        options.carddavAddressbooks
      ),
    ]);
    const matchedEntries = await matchEntries(
      immichPeople,
      cardDavContacts,
      options.matchingContactsFile
    );
    if (dryRun) {
      consola.warn("Dry run enabled. No changes will be applied.");
      return;
    }

    const immichPersonIds = matchedEntries.map((entry) => entry.immich.id);
    const personThumbnails = await getPersonImages(
      options.immichUrl,
      options.immichKey,
      immichPersonIds
    );

    await updateContacts(
      options.carddavUrl,
      options.carddavUsername,
      options.carddavPassword,
      matchedEntries,
      personThumbnails
    );
    consola.success("Synchronization completed successfully!");
  } catch (error) {
    consola.error("Synchronization failed:", error);
  }
}

async function matchEntries(
  immichPeople: ImmichPerson[],
  cardDavContacts: CardDavContact[],
  matchingContactsFile?: string
) {
  if (matchingContactsFile) {
    const dict = parseMatchingContactsFile(
      await readFile(matchingContactsFile)
    );
    return matchPeopleToContactsByDict(immichPeople, cardDavContacts, dict);
  } else {
    return matchPeopleToContactsByName(immichPeople, cardDavContacts);
  }
}

function parseMatchingContactsFile(fileContent: string): {
  [key: string]: string;
} {
  const matchingContacts: { [key: string]: string } = JSON.parse(fileContent);

  if (matchingContacts instanceof Object && !Array.isArray(matchingContacts)) {
    consola.error(
      "Matching contacts file must contain a JSON object of key/value strings."
    );
    throw new Error("Invalid matching contacts file format.");
  }

  return matchingContacts;
}
