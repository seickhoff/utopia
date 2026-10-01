import type { SpriteShape } from "../collision/sprite-shape.js";
import { bitRows } from "../rom/bitmap.js";
import { MOB_PICTURES } from "../rom/mob-pictures.js";
import type { AnimationPace } from "./animation.js";

/** How each kind of sprite looks, from its MOB record and ROM table (lines 2924-3066). */
export interface SpriteLook extends AnimationPace {
  readonly firstPicture: number;
  /** 16-row sprites use two pictures a frame. */
  readonly rows: 8 | 16;
  readonly scanlinesPerRow: number;
  readonly pixelsPerBit: 1 | 2;
}

export type LookName =
  | "cursor"
  | "fishingBoat"
  | "ptBoat"
  | "sinkingBoat"
  | "fish"
  | "pirate"
  | "sinkingPirate"
  | "rain"
  | "storm"
  | "hurricane";

const STILL_RATE = 0;
const HULL = { rows: 8, scanlinesPerRow: 2, pixelsPerBit: 1, frames: 1, rate: STILL_RATE } as const;
const SINKING = { firstPicture: 0x03, frames: 8, rate: 0x30 } as const;
const CLOUD = { rows: 16, pixelsPerBit: 2, rate: 0x80 } as const;

export const SPRITE_LOOKS: Readonly<Record<LookName, SpriteLook>> = {
  cursor: { ...HULL, firstPicture: 0x00 },
  fishingBoat: { ...HULL, firstPicture: 0x01 },
  ptBoat: { ...HULL, firstPicture: 0x02 },
  sinkingBoat: { ...HULL, ...SINKING },
  fish: { ...HULL, firstPicture: 0x0b, frames: 4, rate: 0xc0 },
  pirate: { ...HULL, firstPicture: 0x0f, scanlinesPerRow: 1 },
  sinkingPirate: { ...HULL, ...SINKING, scanlinesPerRow: 1 },
  rain: { ...CLOUD, firstPicture: 0x10, frames: 5, scanlinesPerRow: 1 },
  storm: { ...CLOUD, firstPicture: 0x10, frames: 5, scanlinesPerRow: 1 },
  hurricane: { ...CLOUD, firstPicture: 0x1a, frames: 6, scanlinesPerRow: 4 },
};

const PICTURE_ROWS = MOB_PICTURES.map(bitRows);
const ROWS_PER_PICTURE = 8;

/** The shape a sprite has in one frame of its animation. */
export function shapeOf(look: SpriteLook, frame: number): SpriteShape {
  const picturesPerFrame = look.rows / ROWS_PER_PICTURE;
  const first = look.firstPicture + frame * picturesPerFrame;
  const rows = PICTURE_ROWS.slice(first, first + picturesPerFrame).flat();
  return { rows, scanlinesPerRow: look.scanlinesPerRow, pixelsPerBit: look.pixelsPerBit };
}
