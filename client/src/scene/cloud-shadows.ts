import { isWeather, type SpriteSnapshot } from "@utopia/engine";
import { Vector4 } from "three";
import { CARD_SIZE, worldOfSprite } from "../board/rom-space.js";
import { CLOUD_SHAPE_GLSL } from "./cloud-glsl.js";
import { CLOUD_LOOKS } from "./cloud-looks.js";
import { spriteSeed } from "./sprite-seed.js";
import { SUNLIGHT } from "./lighting.js";

const MAX_CLOUDS = 2;
/** How far a shadow falls from beneath its cloud, per unit of the cloud's height: away from the sun. */
const SHADOW_DRIFT = {
  x: -SUNLIGHT.from.x / SUNLIGHT.from.y,
  z: -SUNLIGHT.from.z / SUNLIGHT.from.y,
};

/**
 * The shader code that darkens a surface under the clouds' shadows: each shadow is its cloud's
 * own shape, laid on the ground where the sun throws it. It needs NOISE_GLSL included before it.
 */
export const CLOUD_SHADE_GLSL = /* glsl */ `
${CLOUD_SHAPE_GLSL}
uniform vec4 uClouds[${MAX_CLOUDS}];
uniform vec4 uCloudShapes[${MAX_CLOUDS}];

float cloudShade(vec2 place) {
  float shade = 0.0;
  for (int i = 0; i < ${MAX_CLOUDS}; i++) {
    vec4 cloud = uClouds[i];
    if (cloud.w <= 0.0) continue;
    vec2 disc = vec2(place.x - cloud.x, cloud.y - place.y) / cloud.z;
    shade = max(shade, cloud.w * cloudDensity(disc, uCloudShapes[i]));
  }
  return shade;
}
`;

/** What a material needs to draw the clouds' shadows. */
export interface ShadowSpots {
  /** Each shadow's centre on the ground (x, z), its radius and its strength. */
  readonly spots: readonly Vector4[];
  /** Each shadow's shape, as its cloud's: (seed, spiral, time, unused). */
  readonly shapes: readonly Vector4[];
}

/** The uniforms CLOUD_SHADE_GLSL reads. */
export function shadowUniforms(shadows: ShadowSpots) {
  return { uClouds: { value: shadows.spots }, uCloudShapes: { value: shadows.shapes } };
}

/** Where the clouds' shadows fall this frame, shared by every surface they darken. */
export class CloudShadows implements ShadowSpots {
  readonly spots: readonly Vector4[] = Array.from({ length: MAX_CLOUDS }, () => new Vector4());
  readonly shapes: readonly Vector4[] = Array.from({ length: MAX_CLOUDS }, () => new Vector4());

  update(weather: { sprites: readonly SpriteSnapshot[]; seconds: number }): void {
    const clouds = weather.sprites.filter((sprite) => isWeather(sprite.kind));
    this.spots.forEach((spot, index) => {
      const cloud = clouds[index];
      if (cloud === undefined) return void spot.set(0, 0, 1, 0);
      fallBeneath({ spot, shape: this.shapes[index], cloud, seconds: weather.seconds });
    });
  }
}

interface Shadowing {
  readonly spot: Vector4;
  readonly shape: Vector4;
  readonly cloud: SpriteSnapshot;
  readonly seconds: number;
}

function fallBeneath(shadowing: Shadowing): void {
  const { cloud } = shadowing;
  if (!isWeather(cloud.kind)) return;
  const look = CLOUD_LOOKS[cloud.kind];
  const centre = worldOfSprite(cloud, CARD_SIZE);
  const x = centre.x + look.height * SHADOW_DRIFT.x;
  const z = centre.z + look.height * SHADOW_DRIFT.z;
  shadowing.spot.set(x, z, look.radius, look.shadow);
  shadowing.shape.set(spriteSeed(cloud.id), look.spiral, shadowing.seconds, 0);
}
