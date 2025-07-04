#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("immich-carddav-sync")
  .description(
    "Syncs preview pictures of recognized people from immich to pictures of CardDAV contacts."
  )
  .version("0.0.1");

program
  .command("sync")
  .description("Run synchronisation")
  .option(
    "-d, --dry-run",
    "Read people and match contacts but without transferring pictures"
  );

program.parse(process.argv);
