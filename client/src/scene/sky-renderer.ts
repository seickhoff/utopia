import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, type Scene } from "three";
import { lightUniforms } from "./light-uniforms.js";
import { SKY_COLOURS } from "./lighting.js";
import { NOISE_GLSL } from "./noise-glsl.js";
import { WATER } from "./water-look.js";

const SKY_RADIUS = 2000;
/** Drawn before everything, behind everything. */
const BEHIND_ALL = -10;

const SKY_VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;

/**
 * A tropical sky: thick pale haze at the horizon (where it meets the far sea's own haze) thinning
 * fast into sky blue and deepening overhead, a soft glow toward the sun, and a band of distant
 * cumulus low over the horizon, flattened by distance as real clouds are.
 */
const SKY_FRAGMENT = /* glsl */ `
uniform vec3 uHaze;
uniform vec3 uDeepSea;
uniform vec3 uSkyBlue;
uniform vec3 uZenith;
uniform vec3 uSunDirection;
uniform vec3 uSunColour;
varying vec3 vDirection;
${NOISE_GLSL}

vec3 skyColour(vec3 look) {
  float up = max(look.y, 0.0);
  vec3 sky = mix(uSkyBlue, uZenith, smoothstep(0.0, 1.0, up));
  sky = mix(uHaze, sky, 1.0 - exp(-up * 3.5));
  float toSun = max(dot(look, uSunDirection), 0.0);
  return sky + uSunColour * (pow(toSun, 6.0) * 0.35 + pow(toSun, 400.0) * 3.0);
}

/** Clouds on a layer high above, seen ever flatter and closer together toward the horizon. */
float distantClouds(vec3 look) {
  if (look.y <= 0.0) return 0.0;
  vec2 onLayer = look.xz / (look.y + 0.06);
  float heaps = fbm(onLayer * 0.7 + 4.0);
  float band = smoothstep(0.0, 0.025, look.y) * (1.0 - smoothstep(0.1, 0.3, look.y));
  return smoothstep(0.52, 0.78, heaps) * band;
}

void main() {
  vec3 look = normalize(vDirection);
  vec3 colour = skyColour(look);
  float cloud = distantClouds(look);
  vec3 cloudColour = mix(uHaze * 0.92, vec3(1.0), smoothstep(0.0, 0.15, look.y));
  colour = mix(colour, cloudColour, cloud * 0.85);
  gl_FragColor = vec4(look.y < 0.0 ? uDeepSea : colour, 1.0);
  #include <colorspace_fragment>
}
`;

/** The sky, seen only when the view is tilted far enough over to show the horizon. */
export function addSky(scene: Scene): void {
  const colour = (hex: string) => ({ value: new Color(hex) });
  const material = new ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: BackSide,
    depthWrite: false,
    uniforms: {
      uHaze: colour(WATER.haze),
      uDeepSea: colour(WATER.ocean),
      uSkyBlue: colour(SKY_COLOURS.blue),
      uZenith: colour(SKY_COLOURS.zenith),
      ...lightUniforms(),
    },
  });
  const sky = new Mesh(new SphereGeometry(SKY_RADIUS, 48, 24), material);
  sky.renderOrder = BEHIND_ALL;
  sky.frustumCulled = false;
  scene.add(sky);
}
