import { getAllPeople, init } from "@immich/sdk";

const API_KEY = process.env.IMMICH_API_KEY; //

export default async function getImmichPeople(apiKey: string, baseUrl: string) {
  init({ baseUrl, apiKey });

  const people = await getAllPeople({ withHidden: false });

  console.log({ people });
}
