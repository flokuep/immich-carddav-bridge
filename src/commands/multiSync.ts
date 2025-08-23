import consola from "consola";
import sync from "./sync";
import { BaseOptions } from "../types";
import { readFile } from "../utils";

/**
 * Runs synchronization on multiple configurations defined in a JSON file.
 * This function reads a configuration file, parses it, and then
 * applies a synchronization process for each configuration.
 *
 * @param configFile - The path to the JSON configuration file.
 * @param dryRun - If true, the synchronization will only simulate changes without applying them. Defaults to false.
 * @returns {Promise<void>} A promise that resolves when all synchronizations are complete.
 */
export default async function multiSync(
  configFile: string,
  dryRun: boolean = false
): Promise<void> {
  let configurations = await readConfigurations(configFile);

  if (configurations.length === 0) {
    consola.warn(`No configurations found in '${configFile}' to synchronize.`);
    return;
  }

  await Promise.all(
    configurations.map((options: BaseOptions) => {
      consola.start(`Start synchronization for ${optionsToString(options)}`);
      executeSingleSync(options, dryRun);
    })
  );
}

/**
 * Reads and parses the configuration file.
 * @param filePath - The path to the JSON configuration file.
 * @returns {BaseOptions[]} An array of parsed configurations.
 * @throws {Error} If the file cannot be read, parsed, or is invalid.
 */
async function readConfigurations(filePath: string): Promise<BaseOptions[]> {
  try {
    return parseConfigurations(await readFile(filePath));
  } catch (error: any) {
    handleError(error, filePath);
    throw error;
  }
}

/**
 * Executes a single synchronization operation and handles its outcome.
 * @param options - The BaseOptions for the synchronization.
 * @param dryRun - If true, the synchronization will only simulate changes.
 */
async function executeSingleSync(
  options: BaseOptions,
  dryRun: boolean
): Promise<void> {
  try {
    await sync(options, dryRun);
    consola.success(
      `Synchronization completed for ${optionsToString(options)}.`
    );
  } catch (error: any) {
    consola.error(
      `Error during synchronization for ${optionsToString(options)}:`,
      error.message
    );
  }
}

function parseConfigurations(fileContent: string): BaseOptions[] {
  const configurations: BaseOptions[] = JSON.parse(fileContent);

  if (!Array.isArray(configurations)) {
    consola.error(
      "Configuration file must contain a JSON array of configurations."
    );
    throw new Error("Invalid configuration file format.");
  }

  return configurations;
}

function handleError(error: any, filePath: string) {
  if (error.code === "ENOENT") {
    consola.error(`Configuration file not found at '${filePath}'.`);
  } else if (error instanceof SyntaxError) {
    consola.error(
      `Invalid JSON format in configuration file '${filePath}':`,
      error.message
    );
  } else {
    consola.error(
      `Failed to read or parse configuration file '${filePath}':`,
      error.message
    );
  }
}

function optionsToString(options: BaseOptions): string {
  return `${options.immichUrl} to ${options.carddavUsername}@${options.carddavUrl}`;
}
