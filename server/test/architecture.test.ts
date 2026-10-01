import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = fileURLToPath(new URL("../src", import.meta.url));
const IMPORT_SPECIFIERS = /(?:from\s+|import\s*\(?\s*)["']([^"']+)["']/g;
/**
 * The only modules that know the transport: the composition root, and the adapter that sends a
 * player their messages. The directory, the rooms and the loop see players through ports.
 */
const MAY_USE_WS = ["main.ts", "socket-client.ts"];

function sourceFilesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFilesUnder(path) : [path];
  });
}

describe("server boundary", () => {
  it("keeps ws out of the rooms, the seats and the loop", () => {
    const strays = sourceFilesUnder(SOURCE_ROOT)
      .filter((file) => !MAY_USE_WS.includes(relative(SOURCE_ROOT, file)))
      .filter((file) =>
        [...readFileSync(file, "utf8").matchAll(IMPORT_SPECIFIERS)].some(
          (match) => match[1] === "ws",
        ),
      );

    expect(strays).toEqual([]);
  });
});
