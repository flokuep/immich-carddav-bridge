import { BaseOptions, CardDavContact, MatchedContact } from "../types";
import { createDavClient } from "./client";
import {
  fetchAndParseVCards,
  getPrimaryCardDavAddressBook,
} from "./fetchContacts";
import { processSingleContactUpdate } from "./updateContacts";

/**
 * Fetches contacts from a CardDAV server.
 * @param options - Base options for DAVClient creation.
 * @returns A promise that resolves to an array of CardDavContact objects.
 * @throws {Error} If no address books are found or parsing fails.
 */
export async function getCardDavContacts(
  options: BaseOptions
): Promise<CardDavContact[]> {
  const client = await createDavClient(options);
  const targetAddressBook = await getPrimaryCardDavAddressBook(client, options);
  const contacts = await fetchAndParseVCards(client, targetAddressBook);

  console.log(`Successfully loaded ${contacts.length} contacts.`);
  return contacts;
}

/**
 * Updates contacts on a CardDAV server with new thumbnail images.
 * @param options - Base options for DAVClient creation.
 * @param matchings - An array of objects linking Immich persons to CardDav contacts.
 * @param thumbnails - An object mapping Immich IDs to Blob thumbnails.
 * @returns A promise that resolves when all updates have been attempted (successfully or with errors).
 */
export async function updateContacts(
  options: BaseOptions,
  matchings: MatchedContact[],
  thumbnails: { [key: string]: Blob }
): Promise<void> {
  const client = await createDavClient(options);
  const updatePromises: Promise<void>[] = [];

  for (const matching of matchings) {
    updatePromises.push(
      processSingleContactUpdate(client, matching, thumbnails)
    );
  }

  await Promise.allSettled(updatePromises);
  console.log("All contact updates have been completed.");
}
