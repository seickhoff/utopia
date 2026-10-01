import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";
import { romModules, type GeneratedModule } from "./rom-modules.js";

/** `npm run rom`: regenerates engine/src/rom/*.ts from the local copy of the cartridge listing. */
const LISTING = fileURLToPath(new URL("../../docs/reference/utopia.asm", import.meta.url));
const ROM_FOLDER = fileURLToPath(new URL("../../engine/src/rom/", import.meta.url));

async function writeModule(module: GeneratedModule): Promise<void> {
  const path = ROM_FOLDER + module.fileName;
  const options = { ...(await resolveConfig(path)), parser: "typescript" };
  writeFileSync(path, await format(module.source, options));
  console.log(`wrote engine/src/rom/${module.fileName}`);
}

for (const module of romModules(readFileSync(LISTING, "utf8"))) {
  await writeModule(module);
}
