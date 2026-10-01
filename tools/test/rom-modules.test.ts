import { describe, expect, it } from "vitest";
import { romModules } from "../src/rom-modules.js";

const PICTURE = [
  '        gfx_row "########"    ; PIC',
  ...Array.from({ length: 7 }, () => '        gfx_row "#......#"    ;'),
].join("\n");

const LISTING = `
LFT_ISLE_OFS_TBL:
        DECLE   $002A,  $003D
RGT_ISLE_OFS_TBL:
        DECLE   $0032
LFT_ISLE_PIC_TBL:
        DECLE           $0013,  $0014
RGT_ISLE_PIC_TBL:
        DECLE   $0015
COLORS: DECLE   C_BLK               ; 5906  Fort        Black
        DECLE   C_DGR               ; 5908  Crop        Dark Green
PRICES: DECLE   50                  ; 5910  Fort          50 bars
        DECLE   3                   ; 5912  Crop           3 bars
L_5919:
.GFX_ANIM_5D1A
${PICTURE}
.GFX_LIST_5E4A
${PICTURE}
`;

function sourceOf(fileName: string): string {
  return romModules(LISTING).find((module) => module.fileName === fileName)?.source ?? "";
}

describe("romModules", () => {
  it("turns the island tables into numbers", () => {
    expect(sourceOf("island-tables.ts")).toContain(
      "LEFT_ISLAND_OFFSETS: readonly number[] = [42, 61]",
    );
  });

  it("reads colour symbols as palette indices", () => {
    expect(sourceOf("item-tables.ts")).toContain("ITEM_COLOURS: readonly number[] = [0, 4]");
  });

  it("keeps the prices in keypad order", () => {
    expect(sourceOf("item-tables.ts")).toContain("ITEM_PRICES: readonly number[] = [50, 3]");
  });

  it("writes each picture as one line of rows", () => {
    expect(sourceOf("mob-pictures.ts")).toContain(
      '["########/#......#/#......#/#......#/#......#/#......#/#......#/#......#"]',
    );
  });

  it("marks every module as generated", () => {
    expect(romModules(LISTING).every((module) => module.source.startsWith("// Generated"))).toBe(
      true,
    );
  });
});
