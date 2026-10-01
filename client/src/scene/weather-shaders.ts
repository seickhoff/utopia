import { CLOUD_SHAPE_GLSL } from "./cloud-glsl.js";
import { HAZE_GLSL } from "./haze-glsl.js";
import { NOISE_GLSL } from "./noise-glsl.js";

/** A cloud's disc: passes each point's place on the disc, -1 to 1 each way, north up. */
export const CLOUD_VERTEX = /* glsl */ `
varying vec2 vDisc;
varying vec3 vWorld;
void main() {
  vDisc = uv * 2.0 - 1.0;
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * A cloud from above, as a satellite sees one: its shape from CLOUD_SHAPE_GLSL, its lumps lit as
 * heaps (their tops found from the cloud's depth), grey in the hollows and thin at the rim, lit up
 * from within when lightning flashes.
 */
export const CLOUD_FRAGMENT = /* glsl */ `
uniform vec4 uShape;
uniform vec3 uLight;
uniform vec3 uShade;
uniform float uFlash;
uniform vec3 uSun;
varying vec2 vDisc;
varying vec3 vWorld;
/** Clouds are a little see-through, so what lies beneath them never quite disappears. */
const float CLOUD_OPACITY = 0.8;
${NOISE_GLSL}
${HAZE_GLSL}
${CLOUD_SHAPE_GLSL}

void main() {
  float density = cloudDensity(vDisc, uShape);
  if (density < 0.01) discard;
  float depth = cloudDepth(vDisc, uShape);
  vec2 slope = vec2(
    cloudDepth(vDisc + vec2(0.02, 0.0), uShape) - depth,
    cloudDepth(vDisc + vec2(0.0, 0.02), uShape) - depth
  ) / 0.02;
  vec3 normal = normalize(vec3(-slope * 0.3, 1.0));
  float sun = clamp(0.3 + 0.8 * dot(normal, uSun), 0.0, 1.0);
  float lit = sun * (0.7 + 0.3 * smoothstep(0.0, 0.35, depth));
  vec3 colour = mix(uShade, uLight, lit) + uFlash * vec3(0.75, 0.8, 1.0) * density;
  gl_FragColor = vec4(mix(colour, uHazeColour, hazeAt(vWorld)), density * CLOUD_OPACITY);
  #include <colorspace_fragment>
}
`;

/** A curtain of rain round a cylinder: u runs round it, v from the sea (0) up to the cloud (1). */
export const RAIN_VERTEX = /* glsl */ `
varying vec2 vCurtain;
void main() {
  vCurtain = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Streaks falling down the curtain, each lane at its own pace, through a grey veil of falling
 * water, fading out at the top and the sea.
 */
export const RAIN_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uOpacity;
uniform float uFlash;
uniform float uVeil;
uniform vec3 uColour;
varying vec2 vCurtain;

float rainHash(float lane) {
  return fract(sin(lane * 91.345) * 47453.5453);
}

void main() {
  float lanes = vCurtain.x * 110.0;
  float lane = floor(lanes);
  float pace = rainHash(lane);
  float fall = fract(vCurtain.y * 2.5 + uTime * uSpeed * (0.8 + 0.4 * pace) + pace * 7.0);
  float streak = smoothstep(0.0, 0.06, fall) * (1.0 - smoothstep(0.3, 0.45, fall));
  float thin = smoothstep(0.35, 0.0, abs(fract(lanes) - 0.5));
  float ends = smoothstep(0.0, 0.12, vCurtain.y) * (1.0 - smoothstep(0.82, 1.0, vCurtain.y));
  float mist = uVeil * (0.6 + 0.4 * (1.0 - vCurtain.y));
  float alpha = max(streak * thin * step(0.3, pace) * uOpacity, mist) * ends;
  if (alpha < 0.01) discard;
  vec3 colour = mix(uColour * 0.55, uColour, streak * thin);
  gl_FragColor = vec4(colour + uFlash * 0.5, alpha);
  #include <colorspace_fragment>
}
`;
