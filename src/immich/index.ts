import { getAllPeople, getPersonThumbnail, init } from "@immich/sdk";
import { ImmichPerson } from "../types";
import consola from "consola";

let isSdkInitialized = false;

/**
 * Fetches all people from the Immich API, handling pagination.
 * Filters out people with empty names and maps them to ImmichPerson format.
 *
 * @param baseUrl - The base URL for the Immich API.
 * @param apiKey - The API key for authentication with Immich.
 * @returns A Promise that resolves to an array of ImmichPerson objects.
 * @throws {Error} If the API call fails or initialization was not done.
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
      currentPeoplePage = await getAllPeople({ withHidden: false });
      consola.info(
        `Fetched Immich people page ${currentPageNumber} with ${currentPeoplePage.people.length}/${currentPeoplePage.total} people.`
      );

      const mappedPeople = currentPeoplePage.people
        .filter((person) => person.name && person.name.trim() !== "")
        .map((person) => ({
          id: person.id,
          name: person.name,
          preview: person.thumbnailPath,
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
 * Pre-requisite: `initializeImmichSdk` must have been called beforehand.
 *
 * @param baseUrl - The base URL for the Immich API.
 * @param apiKey - The API key for authentication with Immich.
 * @param ids - An array of Immich person IDs for which to fetch thumbnails.
 * @returns A Promise that resolves to an object mapping person ID to Blob thumbnail data.
 * If a thumbnail fetch fails for an ID, that ID might be missing from the returned object.
 * @throws {Error} If any parallel API call for a thumbnail fails critically.
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
          thumbnails[id] = await getPersonThumbnail({ id });
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
 * Initializes the Immich SDK. This function should be called once before
 * making any calls to Immich API functions (getAllPeople, getPersonThumbnail, etc.).
 *
 * @param baseUrl - The base URL for the Immich API.
 * @param apiKey - The API key for authentication with Immich.
 * @throws {Error} If baseUrl or apiKey are missing.
 */
export function initializeImmichSdk(baseUrl: string, apiKey: string): void {
  if (!baseUrl) {
    throw new Error("Immich base URL cannot be empty for SDK initialization.");
  }
  if (!apiKey) {
    consola.warn("Immich API Key is not provided. API calls might fail.");
  }

  if (!isSdkInitialized) {
    init({ baseUrl, apiKey });
    isSdkInitialized = true;
    consola.info("Immich SDK initialized successfully.");
  }
}
