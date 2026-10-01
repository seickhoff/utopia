import { describe, expect, it } from "vitest";
import { Board } from "../src/board/board.js";
import { PixelPoint } from "../src/geometry/pixel-point.js";
import { Square } from "../src/geometry/square.js";
import { Animation } from "../src/sea/animation.js";
import { Body } from "../src/sea/body.js";
import { cornerSpawn } from "../src/sea/corner-spawn.js";
import { Drifter } from "../src/sea/drifter.js";
import { holdOffShore } from "../src/sea/sand-bar.js";
import { SeaSlots } from "../src/sea/sea-slots.js";
import { SPRITE_LOOKS, shapeOf } from "../src/sea/sprite-looks.js";
import { weatherOfFace } from "../src/sea/weather-kind.js";
import { DEFAULT_RULES } from "../src/game/game-rules.js";
import { LoadedDice } from "./support/loaded-dice.js";

const moving = (x: number, y: number, velocity: { x: number; y: number }) => {
  const body = Body.at(new PixelPoint(x, y));
  body.setVelocity(velocity);
  return body;
};

describe("the sand bars", () => {
  it("stop a boat about to sail into land, a pixel back", () => {
    const body = moving(10, 32, { x: 10, y: 0 });

    holdOffShore(body, { board: new Board(), seafarer: "vessel" });

    expect([body.point().x, body.velocity()]).toEqual([9, { x: 0, y: 0 }]);
  });

  it("let a boat slide along the shore", () => {
    const body = moving(10, 40, { x: 0, y: -10 });

    holdOffShore(body, { board: new Board(), seafarer: "vessel" });

    expect(body.velocity()).toEqual({ x: 0, y: -10 });
  });

  it("stop only the axis heading for land", () => {
    const body = moving(10, 40, { x: 7, y: -7 });

    holdOffShore(body, { board: new Board(), seafarer: "vessel" });

    expect(body.velocity()).toEqual({ x: 0, y: -7 });
  });

  it("stop pirates at an anchored PT boat", () => {
    const board = new Board();
    board.anchor(Square.at(9, 10), { side: "left", boat: "ptBoat" });
    const body = moving(80, 80, { x: 3, y: 0 });

    holdOffShore(body, { board, seafarer: "pirate" });

    expect(body.velocity().x).toBe(0);
  });

  it("let a player's boat sail past an anchored PT boat", () => {
    const board = new Board();
    board.anchor(Square.at(9, 10), { side: "left", boat: "ptBoat" });
    const body = moving(80, 80, { x: 3, y: 0 });

    holdOffShore(body, { board, seafarer: "vessel" });

    expect(body.velocity().x).toBe(3);
  });
});

describe("Animation", () => {
  it("steps a picture each time its rate overflows 256", () => {
    const animation = new Animation({ frames: 4, rate: 0xc0 });
    for (let tick = 0; tick < 4; tick += 1) animation.tick();

    expect(animation.frame()).toBe(3);
  });

  it("plays a sinking boat through once in about 43 ticks", () => {
    const animation = new Animation({ frames: 8, rate: 0x30 });
    for (let tick = 0; tick < 43; tick += 1) animation.tick();

    expect(animation.hasPlayedOnce()).toBe(true);
  });
});

describe("sprite looks", () => {
  it("draw a rain cloud double-width from 16 rows", () => {
    const shape = shapeOf(SPRITE_LOOKS.rain, 0);

    expect([shape.rows.length, shape.pixelsPerBit, shape.scanlinesPerRow]).toEqual([16, 2, 1]);
  });

  it("stretch a hurricane four scanlines a row", () => {
    expect(shapeOf(SPRITE_LOOKS.hurricane, 5).scanlinesPerRow).toBe(4);
  });

  it("flatten a pirate ship to one scanline a row", () => {
    expect(shapeOf(SPRITE_LOOKS.pirate, 0).scanlinesPerRow).toBe(1);
  });
});

describe("weather kinds", () => {
  const kind = (face: number) => weatherOfFace(face, DEFAULT_RULES.sea.weather);

  it("form a hurricane on a 0 in 12, a storm on 1-3, and rain otherwise", () => {
    expect([0, 1, 3, 4, 11].map(kind)).toEqual(["hurricane", "storm", "storm", "rain", "rain"]);
  });
});

describe("corner spawns", () => {
  it("put a drifter near a corner, heading across", () => {
    const dice = new LoadedDice().next(8, 5).next(2, 1).next(2, 0);

    const spawn = cornerSpawn(dice, DEFAULT_RULES.sea.corners);

    expect(spawn).toEqual({ at: { x: 0, y: 13 }, velocity: { x: 3, y: 0 } });
  });

  it("bring drifters in from the bottom right heading west", () => {
    const dice = new LoadedDice().next(8, 0).next(2, 0).next(2, 1);

    expect(cornerSpawn(dice, DEFAULT_RULES.sea.corners)).toEqual({
      at: { x: 167, y: 80 },
      velocity: { x: -3, y: 0 },
    });
  });
});

describe("drifting speeds", () => {
  const EAST = 3;
  const SOUTH = 1;
  const nudged = (kind: "fish" | "pirate" | "rain", times: number) => {
    const drifter = new Drifter(1, { kind, at: new PixelPoint(80, 40), velocity: { x: 3, y: 0 } });
    for (let nudge = 0; nudge < times; nudge += 1) drifter.nudge(nudge % 2 === 0 ? EAST : SOUTH);
    const { x, y } = drifter.velocity();
    return Math.hypot(x, y);
  };

  it("never lets a school of fish outrun the boats (a fix: the cartridge's walk had no limit)", () => {
    expect(nudged("fish", 60)).toBeLessThanOrEqual(7);
  });

  it("never lets a pirate outrun a PT boat", () => {
    expect(nudged("pirate", 60)).toBeLessThanOrEqual(8);
  });

  it("leaves the weather drifting as the cartridge had it", () => {
    expect(nudged("rain", 20)).toBeCloseTo(Math.hypot(13, 10), 5);
  });
});

describe("Drifter", () => {
  const fish = () =>
    new Drifter(1, { kind: "fish", at: new PixelPoint(160, 40), velocity: { x: -3, y: 0 } });

  it("faces the way it heads once it steers", () => {
    const school = fish();

    school.steerClear({ board: new Board(), seafarer: "vessel" });

    expect(school.isMirrored()).toBe(true);
  });

  it("is gone once off the screen", () => {
    const school = new Drifter(1, {
      kind: "fish",
      at: new PixelPoint(168, 40),
      velocity: { x: 3, y: 0 },
    });

    expect(school.isGone()).toBe(true);
  });

  it("stands still and then is gone after sinking", () => {
    const pirate = new Drifter(2, {
      kind: "pirate",
      at: new PixelPoint(80, 40),
      velocity: { x: 3, y: 0 },
    });
    pirate.sink();
    for (let tick = 0; tick < 43; tick += 1) pirate.tick();

    expect(pirate.isGone()).toBe(true);
  });
});

describe("SeaSlots", () => {
  const launch = { kind: "rain", at: new PixelPoint(27, 0), velocity: { x: 4, y: 5 } } as const;

  it("hold two of each kind of drifter", () => {
    const slots = new SeaSlots();
    slots.launch("weather", launch);
    slots.launch("weather", launch);

    expect(slots.hasRoomFor("weather")).toBe(false);
  });

  it("number weather from slot 0 and fish from slot 6", () => {
    const slots = new SeaSlots();
    slots.launch("fish", { ...launch, kind: "fish" });
    slots.launch("weather", launch);

    expect(slots.all().map((drifter) => slots.slotOf(drifter))).toEqual([0, 6]);
  });
});
