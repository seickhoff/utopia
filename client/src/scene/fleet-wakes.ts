import { BufferAttribute, BufferGeometry, DoubleSide, ShaderMaterial } from "three";
import { FLEET_PLAY_GLSL } from "./fleet-play.js";
import { KELVIN_SPREAD, WAKE_LENGTH, type WakePatches } from "./fleets.js";
import { NOISE_GLSL } from "./noise-glsl.js";

/** A boat's patch of wake, carried by the boat's own play, passing on where each point lies from the stern. */
export const WAKE_VERTEX = /* glsl */ `
${FLEET_PLAY_GLSL}
attribute vec2 aWake;
varying vec2 vWake;
varying float vBoat;
void main() {
  vWake = aWake;
  vBoat = aBerth.z;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(played(position), 1.0);
}
`;

/**
 * A boat's wake as it looks from the air: the churning white wash its screws leave straight
 * astern, widening and breaking up as it trails away; the two arms of the V spreading at the
 * Kelvin angle, each a run of short crests slanting out from the track; and faint waves across
 * the track between them. Ripples finer than the screen's pixels fade into their average, so a far
 * wake never shimmers.
 */
export const WAKE_FRAGMENT = /* glsl */ `
uniform float uPlayTime;
varying vec2 vWake;
varying float vBoat;
const float WAKE_LENGTH = ${WAKE_LENGTH.toFixed(4)};
const float KELVIN = ${KELVIN_SPREAD.toFixed(4)};
const float WAKE_OPACITY = 0.8;
${NOISE_GLSL}

/** Ripples at a phase, as crests from 0 to 1, fading to their average where finer than a pixel. */
float ripples(float phase, float sharpness) {
  float crest = smoothstep(sharpness, 1.0, sin(phase) * 0.5 + 0.5);
  float blur = clamp(fwidth(phase) * 0.6, 0.0, 1.0);
  return mix(crest, 0.5 * (1.0 - sharpness), blur);
}

/** The wash the screws churn up straight astern, widening as it goes and fading. */
float wash(vec2 wake) {
  float width = 0.006 + wake.x * 0.07;
  float churn = valueNoise(vec2(wake.x * 45.0 - uPlayTime * 2.5, wake.y * 70.0) + vBoat * 31.0);
  float core = 1.0 - smoothstep(width * 0.35, width, abs(wake.y));
  return core * (0.45 + 0.55 * churn) * (1.0 - smoothstep(0.0, WAKE_LENGTH * 0.75, wake.x));
}

/** The V's two arms, each a band of short crests slanting out from the track. */
float arms(vec2 wake) {
  float off = abs(wake.y) - wake.x * KELVIN;
  float band = 1.0 - smoothstep(0.0, 0.01 + wake.x * 0.05, abs(off + 0.004));
  return band * ripples((wake.x * 0.55 + abs(wake.y)) * 160.0 - uPlayTime * 5.0, 0.35);
}

/** Faint waves across the track, between the arms. */
float transverse(vec2 wake) {
  float within = 1.0 - smoothstep(-0.01, 0.0, abs(wake.y) - wake.x * KELVIN);
  return within * ripples(wake.x * 85.0 - uPlayTime * 3.0 + wake.y * wake.y * 300.0, 0.75) * 0.3;
}

void main() {
  float foam = max(wash(vWake), max(arms(vWake) * 0.75, transverse(vWake)));
  foam *= (1.0 - smoothstep(WAKE_LENGTH * 0.45, WAKE_LENGTH, vWake.x)) * smoothstep(0.0, 0.012, vWake.x);
  if (foam < 0.01) discard;
  gl_FragColor = vec4(vec3(0.96, 0.98, 1.0), foam * WAKE_OPACITY);
  #include <colorspace_fragment>
}
`;

/** A fleet's wake patches as geometry: where each corner is, where it lies from its stern, and its boat. */
export function wakeGeometry(patches: WakePatches): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(patches.positions, 3));
  geometry.setAttribute("aWake", new BufferAttribute(patches.wake, 2));
  geometry.setAttribute("aBerth", new BufferAttribute(patches.berths, 3));
  return geometry;
}

/** The wakes' foam: white, never hiding the water under it, moving with the boats' play. */
export function wakeMaterial(time: { value: number }): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: WAKE_VERTEX,
    fragmentShader: WAKE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { uPlayTime: time },
  });
}
