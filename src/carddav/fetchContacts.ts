import { DAVAddressBook, DAVClient, DAVObject } from "tsdav";
import { CardDavContact } from "../types";
import { parseVCards } from "vcard4-ts";
import consola from "consola";

/**
 * Fetches the primary CardDAV address book for the given options.
 * @param client - The initialized DAVClient.
 * @param options - Base options for address book URL.
 * @returns A promise that resolves to the primary DAVAddressBook.
 * @throws {Error} If no address books are found.
 */
export async function getCardDavAddressbooks(
  client: DAVClient,
  url: string,
  username: string,
  password: string,
  pathTemplate: string
): Promise<DAVAddressBook[]> {
  const addressBooks = await client.fetchAddressBooks({
    account: {
      accountType: "carddav",
      serverUrl: url,
      credentials: {
        username: username,
        password: password,
      },
      rootUrl: url + pathTemplate.replaceAll("$CARDDAV_USERNAME", username),
      homeUrl: url + pathTemplate.replaceAll("$CARDDAV_USERNAME", username),
    },
  });

  if (!addressBooks || addressBooks.length === 0) {
    throw new Error("No CardDAV address books found.");
  }

  return addressBooks;
}

/**
 * Fetches and parses all vCards from a given DAVAddressBook.
 * @param client - The initialized DAVClient.
 * @param addressBook - The DAVAddressBook to fetch vCards from.
 * @returns A promise that resolves to an array of CardDavContact objects.
 * @throws {Error} If fetching or parsing vCards fails.
 */
export async function fetchAndParseVCards(
  client: DAVClient,
  addressBook: DAVAddressBook
): Promise<CardDavContact[]> {
  const fetchedContacts: CardDavContact[] = [];
  try {
    const davObjects = await client.fetchVCards({ addressBook });

    for (const davObject of davObjects) {
      const contact = processDavObjectToCardDavContact(davObject);
      if (contact) {
        fetchedContacts.push(contact);
      }
    }
  } catch (error) {
    consola.error("Error fetching or parsing vCards:", error);
    throw new Error(`Failed to fetch or parse vCards: ${error}`);
  }
  return fetchedContacts;
}

/**
 * Processes a single DAVObject containing vCard data.
 * Extracts a CardDavContact if a valid vCard with an FN field is found.
 * @param davObject - The DAVObject to process.
 * @returns A CardDavContact object if successful, otherwise null.
 */
function processDavObjectToCardDavContact(
  davObject: DAVObject
): CardDavContact | null {
  if (!davObject.data) {
    consola.warn(
      `DAVObject at URL ${davObject.url} contains no data. Skipping.`
    );
    return null;
  }

  const parsedVCards = parseVCards(davObject.data).vCards;

  if (!parsedVCards || parsedVCards.length === 0) {
    consola.warn(
      `No valid vCards found in DAVObject from ${davObject.url}. Skipping.`
    );
    return null;
  }

  const primaryVCard = parsedVCards[0];
  const uid = primaryVCard.UID ? primaryVCard.UID.value : "";
  const contactName = primaryVCard.FN?.[0]?.value;

  if (contactName) {
    return {
      uid: uid,
      url: davObject.url,
      etag: davObject.etag,
      data: davObject.data,
      name: contactName,
    };
  } else {
    consola.warn(
      `vCard from ${davObject.url} has no FN (Full Name) field. Skipping.`
    );
    return null;
  }
}
