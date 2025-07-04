import { getAllPeople, init } from "@immich/sdk";
import { ImmichPerson } from "./utils";

const API_KEY = process.env.IMMICH_API_KEY; //

export default async function getImmichPeople(baseUrl: string, apiKey: string) {
  console.log(baseUrl);
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

  console.log({ immichPeople });
}
