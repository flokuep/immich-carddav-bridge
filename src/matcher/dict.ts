import consola from "consola";
import { ImmichPerson, CardDavContact, MatchedContact } from "../types";

export default function matchPeopleToContactsByDict(
  immichPeople: ImmichPerson[],
  cardDavContacts: CardDavContact[],
  dict: { [key: string]: string }
): MatchedContact[] {
  const matchedPairs = Object.entries(dict).map(([immichId, cardDavId]) => {
    const immichPerson = immichPeople.find((entry) => entry.id === immichId);
    if (!immichPerson) {
      consola.warn(
        `Cannot find immich person with id ${immichId} to match CardDav Contact ${cardDavId}`
      );
    }

    const cardDavContact = cardDavContacts.find(
      (entry) => entry.uid === cardDavId
    );
    if (!cardDavContact) {
      consola.warn(
        `Cannot find CardDav Contact ${cardDavId} to match immich person with id ${immichId}`
      );
    }

    return { immich: immichPerson, cardDav: cardDavContact } as MatchedContact;
  });

  return matchedPairs;
}
