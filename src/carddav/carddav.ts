import { DAVAddressBook } from "tsdav";
import { CardDavContact, MatchedContact } from "../types";
import { createDavClient } from "./client";
import { fetchAndParseVCards, getCardDavAddressbooks } from "./fetchContacts";
import { processSingleContactUpdate } from "./updateContacts";
import { consola } from "consola";

/**
 * Fetches contacts from a CardDAV server.
 * @param url - The base URL of the CardDAV server.
 * @param username - The username for authentication with the CardDAV server.
 * @param password - The password for authentication with the CardDAV server.
 * @param pathTemplate - A template string used to construct paths for DAV requests
 * @param desiredAddressbooks - An array of names of the address books from which to fetch contacts. Only contacts from address books matching these identifiers will be returned.
 * @returns A promise that resolves to an array of CardDavContact objects.
 * @throws {Error} If no address books are found or parsing fails.
 */
export async function getCardDavContacts(
  url: string,
  username: string,
  password: string,
  pathTemplate: string,
  desiredAddressbooks: string[]
): Promise<CardDavContact[]> {
  consola.start("Getting contacts from carddav server");
  const client = await createDavClient(url, username, password);
  const allAddressbooks = await getCardDavAddressbooks(
    client,
    url,
    username,
    password,
    pathTemplate
  );

  const relevantAddressbooks = getRelevantAddressbooks(
    allAddressbooks,
    desiredAddressbooks
  );

  const contactsPromises = relevantAddressbooks.map((adressbook) =>
    fetchAndParseVCards(client, adressbook)
  );

  const contactsArrays = await Promise.all(contactsPromises);
  const contacts: CardDavContact[] = contactsArrays.flat();

  consola.success(`Successfully loaded ${contacts.length} contacts.`);
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
  url: string,
  username: string,
  password: string,
  matchings: MatchedContact[],
  thumbnails: { [key: string]: Blob }
): Promise<void> {
  consola.start("Updating contacts to carddav server");

  const client = await createDavClient(url, username, password);
  const updatePromises: Promise<void>[] = [];

  for (const matching of matchings) {
    updatePromises.push(
      processSingleContactUpdate(client, matching, thumbnails)
    );
  }

  await Promise.allSettled(updatePromises);
  consola.success("All contact updates have been completed.");
}

/**
 * Determines the relevant CardDAV address books based on the desired names.
 * If `desiredAddressbooks` is an empty array, all address books will be returned.
 *
 * @param allAddressbooks - An array of all CardDAV address books found on the server.
 * @param desiredAddressbooks - An array of strings representing names (substrings of the URL)
 * to filter the address books by.
 * @returns A filtered or complete list of `DAVAddressBook` objects.
 */
function getRelevantAddressbooks(
  allAddressbooks: DAVAddressBook[],
  desiredAddressbooks: string[]
): DAVAddressBook[] {
  if (desiredAddressbooks.length === 0) {
    consola.info(
      "No specific address books requested; fetching from all available address books."
    );
    return allAddressbooks;
  } else {
    const filtered = allAddressbooks.filter((addressbook) =>
      desiredAddressbooks.some((name) => addressbook.url.includes(name))
    );

    if (filtered.length === 0) {
      consola.warn(
        "No matching address books found based on the provided names."
      );
    } else {
      consola.info(
        `Fetching contacts from ${filtered.length} specified address books.`
      );
    }
    return filtered;
  }
}
