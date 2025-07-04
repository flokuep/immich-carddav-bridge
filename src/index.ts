#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("immich-carddav-sync")
  .description(
    "Syncs preview photos of recognized people from immich to photos of CardDAV contacts."
  )
  .version("0.0.1");

program.parse(process.argv);
