import {
  Color,
  DataTexture,
  LinearFilter,
  Mesh,
  PlaneGeometry,
  RedFormat,
  ShaderMaterial,
  Vector4,
  type Scene,
} from "three";
import { shadowUniforms, type ShadowSpots } from "./cloud-shadows.js";
import type { Field } from "./distance-field.js";
import { SEA_MARGIN } from "./ground.js";
import { hazeUniforms } from "./haze-glsl.js";
import { lightUniforms } from "./light-uniforms.js";
import { reefUniforms } from "./reef-glsl.js";
import { SEA_FRAGMENT, SEA_VERTEX } from "./sea-shader.js";
import { WATER } from "./water-look.js";

/** How far each way from the shore, in pixels, the shore texture measures: enough for the surf. */
const SHORE_REACH = 16;
/** Wide enough to run on to the horizon, however far over the view is tilted. */
const SEA_SIZE = 6000;
/** The sea is drawn before anything else see-through, so clouds and glints lie on top of it. */
const BENEATH_THE_REST = -1;

export interface SeaSetting {
  /** How far each point round the board is from the shore, in pixels, with SEA_MARGIN of sea. */
  readonly shore: Field;
  readonly shadows: ShadowSpots;
}

/** The sea's surface: one large see-through plane over the sea floor, and one shader. */
export class SeaRenderer {
  private readonly material: ShaderMaterial;

  constructor(scene: Scene, setting: SeaSetting) {
    this.material = surfaceMaterial(setting);
    const plane = new PlaneGeometry(SEA_SIZE, SEA_SIZE);
    plane.rotateX(-Math.PI / 2);
    const sea = new Mesh(plane, this.material);
    sea.renderOrder = BENEATH_THE_REST;
    scene.add(sea);
  }

  update(seconds: number): void {
    this.material.uniforms.uTime.value = seconds;
  }
}

function surfaceMaterial(setting: SeaSetting): ShaderMaterial {
  const { shore } = setting;
  return new ShaderMaterial({
    vertexShader: SEA_VERTEX,
    fragmentShader: SEA_FRAGMENT,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uShore: { value: shoreTexture(shore) },
      uShoreMap: { value: new Vector4(SEA_MARGIN, shore.width, shore.height, SHORE_REACH) },
      uTime: { value: 0 },
      ...waterColours(),
      ...lightUniforms(),
      ...reefUniforms(),
      ...hazeUniforms(),
      ...shadowUniforms(setting.shadows),
    },
  });
}

function waterColours() {
  const colour = (hex: string) => ({ value: new Color(hex) });
  return {
    uSky: colour(WATER.sky),
    uSurf: colour(WATER.surf),
    uDeep: colour(WATER.deep),
  };
}

/** The shore distance, -SHORE_REACH at sea to +SHORE_REACH inland, as bytes 0 to 255. */
function shoreTexture(field: Field): DataTexture {
  const bytes = Uint8Array.from(field.values, (distance) => {
    const clamped = Math.min(SHORE_REACH, Math.max(-SHORE_REACH, distance));
    return Math.round(((clamped + SHORE_REACH) / (2 * SHORE_REACH)) * 255);
  });
  const texture = new DataTexture(bytes, field.width, field.height, RedFormat);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
