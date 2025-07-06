import { DAVClient } from "tsdav";
import consola from "consola";

/**
 * Creates and logs into a DAVClient instance.
 * @returns A promise that resolves to an initialized DAVClient.
 */
export async function createDavClient(
  serverUrl: string,
  username: string,
  password: string
): Promise<DAVClient> {
  const client = new DAVClient({
    serverUrl,
    credentials: {
      username,
      password,
    },
  });
  try {
    await client.login();
    consola.info("DAVClient successfully logged in.");
    return client;
  } catch (error) {
    consola.error("Error during DAVClient login:", error);
    throw new Error(`Failed to log in to DAVClient: ${error}`);
  }
}
