#!/usr/bin/env node
import { Command } from "commander";
import sync from "./commands/sync";
import { version } from "../package.json";

const program = new Command();

program
  .name("immich-carddav-sync")
  .description(
    "Syncs preview pictures of recognized people from immich to pictures of CardDAV contacts."
  )
  .version(version)
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
    "--carddav-path [path]",
    "CardDAV addressbook path",
    process.env.CARDDAV_PATH
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
  );

program
  .command("sync")
  .description("Run synchronisation")
  .option(
    "-d, --dry-run",
    "Read people and match contacts but without transferring pictures"
  )
  .action((options) => {
    sync(program.opts(), options.dryRun);
  });

program.parse(process.argv);
