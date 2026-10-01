import { Color, Vector3 } from "three";
import { SKYLIGHT, SUNLIGHT } from "./lighting.js";

/**
 * The sun and sky as shader uniforms, scaled as three.js lights its Lambert models (the light
 * divided by pi), so shaded surfaces and the models on them look to share one sun.
 */
export function lightUniforms() {
  const { from } = SUNLIGHT;
  const light = (hex: string, strength: number) => ({
    value: new Color(hex).multiplyScalar(strength / Math.PI),
  });
  return {
    uSunDirection: { value: new Vector3(from.x, from.y, from.z).normalize() },
    uSunColour: light(SUNLIGHT.colour, SUNLIGHT.strength),
    uSkyColour: light(SKYLIGHT.sky, SKYLIGHT.strength),
    uGroundColour: light(SKYLIGHT.ground, SKYLIGHT.strength),
  };
}
