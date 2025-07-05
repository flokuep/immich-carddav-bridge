import { getAllPeople, getPersonThumbnail, init } from "@immich/sdk";
import { ImmichPerson } from "./types";

const API_KEY = process.env.IMMICH_API_KEY; //

export async function getImmichPeople(baseUrl: string, apiKey: string) {
  init({ baseUrl, apiKey });

  const immichPeople = [] as ImmichPerson[];
  let currentPeoplePage;
  do {
    currentPeoplePage = await getAllPeople({ withHidden: false });
    currentPeoplePage.people
      .filter((person) => person.name.trim() !== "")
      .forEach((person) => {
        immichPeople.push({
          id: person.id,
          name: person.name,
          preview: person.thumbnailPath,
        });
      });
  } while (currentPeoplePage.hasNextPage);

  return immichPeople;
}

export async function getPersonImage(
  baseUrl: string,
  apiKey: string,
  ids: string[]
) {
  init({ baseUrl, apiKey });

  const thumbnails = {} as { [key: string]: Blob };

  await Promise.all(
    ids.map(async (id) => {
      const blob = await getPersonThumbnail({ id });
      thumbnails[id] = blob;
    })
  );

  return thumbnails;
}
