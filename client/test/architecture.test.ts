import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = fileURLToPath(new URL("../src", import.meta.url));
const FOLDER_IMPORT = /from\s+["']\.\.\/([a-z-]+)\//g;
const PACKAGE_IMPORT = /from\s+["']([^."'][^"']*)["']/g;

/**
 * Which of the client's folders each may import from: the pure readings and art at the centre,
 * the views, sound and input around them, and the app that runs games using them all. Anything not
 * listed is off limits, so no cycle can form. main.tsx, the composition root, may use anything.
 */
const MAY_IMPORT: Readonly<Record<string, readonly string[]>> = {
  art: [],
  board: [],
  session: [],
  settings: [],
  classic: ["art", "board", "session"],
  scene: ["art", "board", "session"],
  sound: ["settings"],
  hud: ["art", "board", "settings"],
  app: ["board", "hud", "session", "settings"],
  input: ["app", "board", "session", "settings"],
  net: ["app"],
};

/** The frameworks, and the folders allowed to know them: humble views stay humble. */
const PACKAGE_HOMES: Readonly<Record<string, readonly string[]>> = {
  react: ["hud"],
  "react-dom/client": [],
  three: ["scene"],
  "@utopia/ai": ["session", "dev"],
  "@utopia/protocol": ["session", "app", "net"],
};

function sourceFilesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFilesUnder(path) : [path];
  });
}

function importsIn(file: string, pattern: RegExp): string[] {
  return [...readFileSync(file, "utf8").matchAll(pattern)].map((match) => match[1]);
}

describe("client folders", () => {
  it("import only the folders they may, so dependencies point one way", () => {
    const strays = sourceFilesUnder(SOURCE_ROOT).flatMap((file) => {
      const [folder, ...rest] = relative(SOURCE_ROOT, file).split("/");
      if (rest.length === 0) return [];
      const allowed = MAY_IMPORT[folder] ?? [];
      return importsIn(file, FOLDER_IMPORT)
        .filter((imported) => imported !== folder && !allowed.includes(imported))
        .map((imported) => `${folder}/${rest.join("/")} imports ${imported}/`);
    });

    expect(strays).toEqual([]);
  });

  it("names every folder there is", () => {
    const folders = readdirSync(SOURCE_ROOT).filter((entry) =>
      statSync(join(SOURCE_ROOT, entry)).isDirectory(),
    );

    expect(folders.sort()).toEqual(Object.keys(MAY_IMPORT).sort());
  });

  it("keeps each framework in its own folder", () => {
    const strays = sourceFilesUnder(SOURCE_ROOT).flatMap((file) => {
      const [folder, ...rest] = relative(SOURCE_ROOT, file).split("/");
      if (rest.length === 0) return [];
      return importsIn(file, PACKAGE_IMPORT)
        .filter(
          (imported) => imported in PACKAGE_HOMES && !PACKAGE_HOMES[imported].includes(folder),
        )
        .map((imported) => `${folder}/${rest.join("/")} imports ${imported}`);
    });

    expect(strays).toEqual([]);
  });
});
