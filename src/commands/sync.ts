import { updateContacts, getCardDavContacts } from "../carddav/carddav";
import { getImmichPeople, getPersonImage } from "../immich";
import matchPeopleToContacts from "../matcher";
import { BaseOptions } from "../types";

export default async function sync(options: BaseOptions) {
  try {
    const immichPeople = await getImmichPeople(
      options.immichUrl,
      options.immichKey
    );
    const cardDavContacts = await getCardDavContacts(options);
    const matchings = matchPeopleToContacts(immichPeople, cardDavContacts);
    const thumbnails = await getPersonImage(
      options.immichUrl,
      options.immichKey,
      matchings.map((entry) => entry.immich.id)
    );
    updateContacts(options, matchings, thumbnails);
  } catch (error) {
    console.log(error);
  }
}
