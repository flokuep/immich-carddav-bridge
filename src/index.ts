#!/usr/bin/env node
import { Command } from "commander";
import sync from "./commands/sync";
import { version } from "../package.json";
import multiSync from "./commands/multiSync";

const program = new Command();

program
  .name("immich-carddav-sync")
  .description(
    "Syncs preview pictures of recognized people from immich to pictures of CardDAV contacts."
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
    "-d, --dry-run",
    "Read people and match contacts but without transferring pictures"
  )
  .action((options) => {
    sync(options, options.dryRun);
  });

program
  .command("multi-sync")
  .description("Run synchronisation on multiple configurations")
  .argument("<config-file>")
  .option(
    "-d, --dry-run",
    "Read people and match contacts but without transferring pictures"
  )
  .action((configFile, options) => {
    multiSync(configFile, options.dryRun);
  });

program.parse(process.argv);

function commaSeparatedList(
  value: string | undefined,
  _previous: string[]
): string[] {
  return value ? value.split(",") : [];
}
