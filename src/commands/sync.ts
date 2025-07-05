import consola from "consola";
import { updateContacts, getCardDavContacts } from "../carddav/carddav";
import { getImmichPeople, getPersonImages } from "../immich";
import matchPeopleToContacts from "../matcher";
import { BaseOptions } from "../types";

export default async function sync(options: BaseOptions) {
  try {
    const immichPeople = await getImmichPeople(options);
    const cardDavContacts = await getCardDavContacts(options);
    const matchings = matchPeopleToContacts(immichPeople, cardDavContacts);
    const thumbnails = await getPersonImages(
      options,
      matchings.map((entry) => entry.immich.id)
    );
    updateContacts(options, matchings, thumbnails);
  } catch (error) {
    consola.log(error);
  }
}
