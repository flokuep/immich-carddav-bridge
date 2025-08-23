import consola from "consola";
import { CardDavContact, ImmichPerson, MatchedContact } from "../types";

/**
 * Matches Immich persons to CardDAV contacts based on their names.
 * This function assumes exact name matches for pairing.
 * It uses a two-pointer approach on sorted lists for efficient matching.
 *
 * @param immichPeople - An array of Immich person objects.
 * @param cardDavContacts - An array of CardDAV contact objects.
 * @returns An array of `MatchedContact` objects, where each object contains
 * an `immich` person and a `cardDav` contact that have matching names.
 *
 * @remarks
 * Performance: O(N log N + M log M) due to sorting, then O(N + M) for merging.
 * If fuzzy matching or more complex matching rules are needed, this function
 * would require significant modification or a different algorithm.
 */
export default function matchPeopleToContactsByName(
  immichPeople: ImmichPerson[],
  cardDavContacts: CardDavContact[]
): MatchedContact[] {
  consola.start("Matching immich people to carddav contacts by name");
  // Sort both lists by name to enable efficient two-pointer matching
  const sortedImmichPeople = sortItemsByName(immichPeople);
  const sortedCardDavContacts = sortItemsByName(cardDavContacts);

  const matchedPairs: MatchedContact[] = [];
  let immichPointer = 0;
  let cardDavPointer = 0;

  // Iterate through both sorted lists using two pointers
  while (
    immichPointer < sortedImmichPeople.length &&
    cardDavPointer < sortedCardDavContacts.length
  ) {
    const immichName = sortedImmichPeople[immichPointer].name;
    const cardDavName = sortedCardDavContacts[cardDavPointer].name;

    const comparisonResult = compareNames(immichName, cardDavName);

    if (comparisonResult === 0) {
      // Exact match found
      matchedPairs.push({
        immich: sortedImmichPeople[immichPointer],
        cardDav: sortedCardDavContacts[cardDavPointer],
      });
      immichPointer++;
      cardDavPointer++;
    } else if (comparisonResult < 0) {
      // Immich person's name comes before CardDAV contact's name
      // Move to the next Immich person to find a potential match
      immichPointer++;
    } else {
      // CardDAV contact's name comes before Immich person's name
      // Move to the next CardDAV contact to find a potential match
      cardDavPointer++;
    }
  }

  consola.success(
    `Matched ${matchedPairs.length} immich people to carddav contacts.`
  );

  return matchedPairs;
}

/**
 * Sorts an array of objects by their 'name' property alphabetically.
 * This ensures consistent order for the two-pointer matching algorithm.
 * @template T - The type of the objects in the array, which must have a 'name' property.
 * @param items - The array of items to be sorted.
 * @returns A new array containing the sorted items.
 */
function sortItemsByName<T extends { name: string }>(items: T[]): T[] {
  return items.toSorted((a, b) => a.name.localeCompare(b.name));
}

/**
 * Compares the names of an Immich person and a CardDAV contact.
 * This helper centralizes the comparison logic for clarity.
 * @param immichPersonName - The name of the Immich person.
 * @param cardDavContactName - The name of the CardDAV contact.
 * @returns A negative number if Immich name comes before CardDAV name,
 * a positive number if Immich name comes after CardDAV name,
 * or 0 if names are identical.
 */
function compareNames(
  immichPersonName: string,
  cardDavContactName: string
): number {
  return immichPersonName.localeCompare(cardDavContactName);
}
