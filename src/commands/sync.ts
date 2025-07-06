import consola from "consola";
import { updateContacts, getCardDavContacts } from "../carddav/carddav";
import { getImmichPeople, getPersonImages } from "../immich";
import matchPeopleToContacts from "../matcher";
import { BaseOptions } from "../types";

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
    const matchedEntries = matchPeopleToContacts(immichPeople, cardDavContacts);
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
