#!/usr/bin/env node
import { Command, Option } from "commander";
import sync from "./commands/sync";
import { version } from "../package.json";

const program = new Command();

program
  .name("immich-carddav-sync")
  .description(
    "Syncs preview pictures of recognized people from immich to pictures of CardDAV contacts."
  )
  .version(version)
  .addOption(
    new Option("--immich-url [url]", "Immich server URL").env(
      "IMMICH_SERVER_URL"
    )
  )
  .addOption(
    new Option("--immich-key [key]", "Immich API key").env("IMMICH_API_KEY")
  )
  .addOption(
    new Option("--carddav-url [url]", "CardDAV server URL").env(
      "CARDDAV_INSTANCE_URL"
    )
  )
  .addOption(
    new Option("--carddav-username [key]", "CardDAV user name").env(
      "CARDDAV_USER_NAME"
    )
  );

program
  .command("sync")
  .description("Run synchronisation")
  .option(
    "-d, --dry-run",
    "Read people and match contacts but without transferring pictures"
  )
  .action((options) => {
    sync(program.opts());
  });

program.parse(process.argv);
