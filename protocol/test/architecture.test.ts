import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = fileURLToPath(new URL("../src", import.meta.url));
const IMPORT_SPECIFIERS = /(?:from\s+|import\s*\(?\s*)["']([^"']+)["']/g;
const ALLOWED = ["@utopia/engine", "@utopia/ai"];

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

function isAllowed(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../") || ALLOWED.includes(specifier);
}

describe("protocol package boundary", () => {
  it("imports only its own modules, the engine and the ai: no ws, DOM, node or client code", () => {
    const outsiders = sourceFilesUnder(SOURCE_ROOT).flatMap((file) =>
      importsOf(file)
        .filter((specifier) => !isAllowed(specifier))
        .map((specifier) => `${relative(SOURCE_ROOT, file)} imports "${specifier}"`),
    );

    expect(outsiders).toEqual([]);
  });
});
