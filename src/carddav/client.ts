import { DAVClient } from "tsdav";
import { BaseOptions } from "../types";

/**
 * Creates and logs into a DAVClient instance.
 * @returns A promise that resolves to an initialized DAVClient.
 */
export async function createDavClient(
  options: BaseOptions
): Promise<DAVClient> {
  const client = new DAVClient({
    serverUrl: options.carddavUrl,
    credentials: {
      username: options.carddavUsername,
      password: options.carddavPassword,
    },
  });
  try {
    await client.login();
    console.log("DAVClient successfully logged in.");
    return client;
  } catch (error) {
    console.error("Error during DAVClient login:", error);
    throw new Error(`Failed to log in to DAVClient: ${error}`);
  }
}
