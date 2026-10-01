import { describe, expect, it } from "vitest";
import { declesAfter, picturesAfter } from "../src/asm-reader.js";

const LISTING = `
TABLE_A:
        DECLE   $002A,  $003D   ; 512F   002A 003D
        DECLE   $0051           ; 5133   0051
TABLE_B:
        DECLE   50                  ; 5910  Fort          50 bars
        DECLE   C_DGR               ; 5908  Crop        Dark Green
L_5919:
        MVII    #$0335, R1          ; 5919  MOB #3 for player 1

.PICTURES
        gfx_row "########"    ; 5D1A  MOB PIC #00
        gfx_row "#......#"    ;
        gfx_row "#......#"    ;
        gfx_row "#......#"    ;
        gfx_row "#......#"    ; 5D1E
        gfx_row "#......#"    ;
        gfx_row "#......#"    ;
        gfx_row "########"    ;

        gfx_row "........"    ; 5D22  MOB PIC #01
        gfx_row ".....#.."    ;
        gfx_row "#....#.."    ;
        gfx_row ".#.###.."    ;
        gfx_row "########"    ; 5D26
        gfx_row ".######."    ;
        gfx_row "........"    ;
        gfx_row "........"    ;
.MORE
        gfx_row "########"    ; 5E4A  CART PIC #00
`;

describe("declesAfter", () => {
  it("reads the hex values listed under a label, up to the next label", () => {
    expect(declesAfter(LISTING, "TABLE_A")).toEqual(["$002A", "$003D", "$0051"]);
  });

  it("keeps decimal numbers and symbols as written", () => {
    expect(declesAfter(LISTING, "TABLE_B")).toEqual(["50", "C_DGR"]);
  });

  it("refuses a label the listing does not have", () => {
    expect(() => declesAfter(LISTING, "NOWHERE")).toThrow(/NOWHERE/);
  });
});

describe("picturesAfter", () => {
  it("groups the gfx rows after a section into 8-row pictures", () => {
    expect(picturesAfter(LISTING, ".PICTURES")).toEqual([
      "########/#......#/#......#/#......#/#......#/#......#/#......#/########",
      "......../.....#../#....#../.#.###../########/.######./......../........",
    ]);
  });

  it("refuses rows that do not make whole pictures", () => {
    expect(() => picturesAfter(LISTING, ".MORE")).toThrow(/whole pictures/);
  });
});
