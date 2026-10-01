import { SIDES, type GameSnapshot, type SpriteLookSnapshot } from "@utopia/engine";

/** Further than this between frames, a sprite has jumped (a boat respawned), not moved. */
const LONGEST_GLIDE_PIXELS = 24;

export interface Blend {
  readonly from: GameSnapshot;
  readonly to: GameSnapshot;
  /** 0 shows `from`, 1 shows `to`. */
  readonly share: number;
}

/**
 * The newer snapshot, with every sprite and cursor part of the way there from where it was: the
 * server's twenty frames a second shown at the screen's own rate. Positions stay whole pixels.
 */
export function blendSnapshots(blend: Blend): GameSnapshot {
  const { from, to } = blend;
  if (blend.share >= 1) return to;
  const islands = Object.fromEntries(
    SIDES.map((side) => {
      const island = to.islands[side];
      return [
        side,
        {
          ...island,
          pilot: glide(from.islands[side].pilot, { to: island.pilot, share: blend.share }),
        },
      ];
    }),
  ) as GameSnapshot["islands"];
  const sprites = to.sprites.map((sprite) => {
    const before = from.sprites.find((earlier) => earlier.id === sprite.id);
    return before === undefined ? sprite : glide(before, { to: sprite, share: blend.share });
  });
  return { ...to, islands, sprites };
}

function glide<S extends SpriteLookSnapshot>(
  from: SpriteLookSnapshot,
  toward: { to: S; share: number },
): S {
  const { to, share } = toward;
  const jumped =
    Math.abs(to.x - from.x) > LONGEST_GLIDE_PIXELS ||
    Math.abs(to.y - from.y) > LONGEST_GLIDE_PIXELS;
  if (jumped) return to;
  return {
    ...to,
    x: Math.round(from.x + (to.x - from.x) * share),
    y: Math.round(from.y + (to.y - from.y) * share),
  };
}
