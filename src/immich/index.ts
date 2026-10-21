import { getAllPeople, getPersonThumbnail } from "@immich/sdk";
import { ImmichPerson } from "../types";
import consola from "consola";

import { immichRequest } from "./request";

/**
 * Fetches all people from the Immich API, handling pagination.
 * Filters out people with empty names and maps them to ImmichPerson format.
 *
 * @param baseUrl - The base URL for the Immich API.
 * @param apiKey - The API key for authentication with Immich.
 * @returns A Promise that resolves to an array of ImmichPerson objects.
 * @throws {Error} If connection options are missing or a people request fails.
 */
export async function getImmichPeople(
  baseUrl: string,
  apiKey: string
): Promise<ImmichPerson[]> {
  consola.start(
    "Getting people from immich server. Hidden people are not fetched, expect less people processed than total people."
  );
  initializeImmichSdk(baseUrl, apiKey);

  const allImmichPeople: ImmichPerson[] = [];
  let currentPageNumber = 1; // For logging/tracking pages
  let currentPeoplePage: Awaited<ReturnType<typeof getAllPeople>>;

  try {
    do {
      // Scope every page request to this account rather than changing shared SDK defaults.
      currentPeoplePage = await getAllPeople({
        withHidden: false,
        page: currentPageNumber,
      }, immichRequest(baseUrl, apiKey));
      consola.info(
        `Fetched Immich people page ${currentPageNumber} with ${currentPeoplePage.people.length}/${currentPeoplePage.total} people.`
      );

      const mappedPeople = currentPeoplePage.people
        .filter((person) => person.name && person.name.trim() !== "")
        .map((person) => ({
          id: person.id,
          name: person.name,
          preview: person.thumbnailPath,
          birthDate: person.birthDate,
        }));

      allImmichPeople.push(...mappedPeople);
      currentPageNumber++;
    } while (currentPeoplePage.hasNextPage);

    consola.success(
      `Successfully fetched ${allImmichPeople.length} Immich people.`
    );
    return allImmichPeople;
  } catch (error) {
    consola.error("Error fetching Immich people:", error);
    throw new Error(`Failed to fetch Immich people: ${error}`);
  }
}

/**
 * Fetches thumbnails for a given list of Immich person IDs in parallel.
 *
 * Credentials are scoped to each request, including concurrent configurations.
 *
 * @param baseUrl - The base URL for the Immich API.
 * @param apiKey - The API key for authentication with Immich.
 * @param ids - An array of Immich person IDs for which to fetch thumbnails.
 * @returns A Promise that resolves to an object mapping person ID to Blob thumbnail data.
 * If a thumbnail fetch fails for an ID, that ID might be missing from the returned object.
 * @throws {Error} If connection options are missing; individual download errors are logged and skipped.
 */
export async function getPersonImages(
  baseUrl: string,
  apiKey: string,
  ids: string[]
): Promise<{ [key: string]: Blob }> {
  consola.start("Getting people previews from immich server");
  initializeImmichSdk(baseUrl, apiKey);

  const thumbnails: { [key: string]: Blob } = {};
  const fetchPromises: Promise<void>[] = [];
  for (const id of ids) {
    fetchPromises.push(
      (async () => {
        try {
          thumbnails[id] = await getPersonThumbnail({ id }, immichRequest(baseUrl, apiKey));
        } catch (error) {
          consola.error(
            `Error fetching thumbnail for Immich person ID: ${id}:`,
            error
          );
        }
      })()
    );
  }

  await Promise.allSettled(fetchPromises);

  consola.success(
    `Attempted to fetch ${ids.length} thumbnails. Fetched ${
      Object.keys(thumbnails).length
    } successfully.`
  );
  return thumbnails;
}

/**
 * Validate connection options without changing global SDK defaults.
 * The legacy function name is retained; authentication is supplied per request via immichRequest.
 */
export function initializeImmichSdk(baseUrl: string, apiKey: string): void {
  immichRequest(baseUrl, apiKey);
}
