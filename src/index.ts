#!/usr/bin/env node
import { Command } from "commander";
import sync from "./commands/sync";
import { version } from "../package.json";
import multiSync from "./commands/multiSync";

const program = new Command();

program
  .name("immich-carddav-sync")
  .description(
    "Syncs contact portraits and optionally reconciles birthdays between CardDAV and Immich."
  )
  .version(version);

program
  .command("sync")
  .description("Run synchronisation")
  .requiredOption(
    "--immich-url [url]",
    "Immich server URL",
    process.env.IMMICH_URL
  )
  .requiredOption(
    "--immich-key [key]",
    "Immich API key",
    process.env.IMMICH_KEY
  )
  .requiredOption(
    "--carddav-url [url]",
    "CardDAV server URL",
    process.env.CARDDAV_URL
  )
  .requiredOption(
    "--carddav-path-template [pathTemplate]",
    "CardDAV path template",
    process.env.CARDDAV_PATH_TEMPLATE
  )
  .requiredOption(
    "--carddav-username [username]",
    "CardDAV username",
    process.env.CARDDAV_USERNAME
  )
  .requiredOption(
    "--carddav-password [password]",
    "Password or token of CardDAV user",
    process.env.CARDDAV_PASSWORD
  )
  .requiredOption(
    "--carddav-addressbooks [addressbooks]",
    "Comma-seperated list of addressbooks, empty for all",
    commaSeparatedList,
    commaSeparatedList(process.env.CARDDAV_ADDRESSBOOKS, [])
  )
  .option(
    "--matching-contacts-file <matchingContactsFile>",
    "JSON-File for manual matching of contacts and people"
  )
  .option("--birthday-sync <mode>", "Birthday mode: off, bidirectional, carddav-to-immich")
  .option("--birthday-state-file <path>", "Persistent birthday checkpoint file")
  .option("--skip-photos", "Synchronize birthdays without reading or writing portraits")
  .option(
    "-d, --dry-run",
    "Read and plan photo and birthday synchronization without writing changes"
  )
  .action((options) => {
    // Return the promise so Commander can await synchronization failures.
    return sync(options, options.dryRun);
  });

program
  .command("multi-sync")
  .description("Run synchronisation on multiple configurations")
  .argument("<config-file>")
  .option("--birthday-sync <mode>", "Birthday mode: off, bidirectional, carddav-to-immich")
  .option("--birthday-state-file <path>", "Persistent birthday checkpoint file")
  .option("--skip-photos", "Synchronize birthdays without reading or writing portraits")
  .option(
    "-d, --dry-run",
    "Read and plan photo and birthday synchronization without writing changes"
  )
  .action((configFile, options) => {
    return multiSync(configFile, options.dryRun, {
      birthdaySync: options.birthdaySync, birthdayStateFile: options.birthdayStateFile, skipPhotos: options.skipPhotos,
    });
  });

// Await async actions and expose failures to cron and Docker through the process exit code.
program.parseAsync(process.argv).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

function commaSeparatedList(
  value: string | undefined,
  _previous: string[]
): string[] {
  return value ? value.split(",") : [];
}
