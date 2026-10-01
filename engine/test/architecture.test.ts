import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = fileURLToPath(new URL("../src", import.meta.url));
const IMPORT_SPECIFIERS = /(?:from\s+|import\s*\(?\s*)["']([^"']+)["']/g;

/** The entities: Utopia's rules and data, known to the game and the match but knowing neither. */
const ENTITY_FOLDERS = [
  "board",
  "collision",
  "economy",
  "events",
  "geometry",
  "island",
  "pilots",
  "random",
  "rebels",
  "rom",
  "sea",
];
/** The use cases, which orchestrate the entities through a game. */
const USE_CASE_FOLDERS = ["game", "match"];
const USE_CASE_IMPORT = /^\.\.\/(game|match)\//;

function sourceFilesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFilesUnder(path) : [path];
  });
}

function importsOf(file: string): string[] {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(IMPORT_SPECIFIERS)].map((match) => match[1]);
}

function isOwnModule(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

function folderOf(file: string): string {
  return relative(SOURCE_ROOT, file).split("/")[0];
}

function importsFrom(folders: readonly string[], forbidden: (specifier: string) => boolean) {
  return sourceFilesUnder(SOURCE_ROOT)
    .filter((file) => folders.includes(folderOf(file)))
    .flatMap((file) =>
      importsOf(file)
        .filter(forbidden)
        .map((specifier) => `${relative(SOURCE_ROOT, file)} imports "${specifier}"`),
    );
}

describe("engine package boundary", () => {
  it("imports only its own modules: no frameworks, DOM, three, react, ws or node", () => {
    const everyFolder = [...ENTITY_FOLDERS, ...USE_CASE_FOLDERS, "index.ts"];

    expect(importsFrom(everyFolder, (specifier) => !isOwnModule(specifier))).toEqual([]);
  });

  it("keeps the entities free of the game and the match that use them", () => {
    expect(importsFrom(ENTITY_FOLDERS, (specifier) => USE_CASE_IMPORT.test(specifier))).toEqual([]);
  });

  it("keeps the ROM data free of everything", () => {
    expect(importsFrom(["rom"], (specifier) => !specifier.startsWith("./"))).toEqual([]);
  });

  it("names every folder as an entity or a use case", () => {
    const folders = readdirSync(SOURCE_ROOT).filter((entry) =>
      statSync(join(SOURCE_ROOT, entry)).isDirectory(),
    );

    expect(
      folders.filter((folder) => ![...ENTITY_FOLDERS, ...USE_CASE_FOLDERS].includes(folder)),
    ).toEqual([]);
  });
});
