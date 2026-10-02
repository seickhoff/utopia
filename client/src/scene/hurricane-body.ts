import {
  Color,
  CylinderGeometry,
  DataTexture,
  FrontSide,
  LinearFilter,
  Mesh,
  RedFormat,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Scene,
} from "three";
import type { WorldPoint } from "../board/rom-space.js";
import { HURRICANE_SPIN } from "./cloud-glsl.js";
import type { CloudLook } from "./cloud-looks.js";
import { hazeUniforms } from "./haze-glsl.js";
import { MAP_SIZE, hurricaneMap } from "./hurricane-map.js";
import {
  FUNNEL_FRAGMENT,
  FUNNEL_VERTEX,
  HURRICANE_FRAGMENT,
  HURRICANE_VERTEX,
} from "./hurricane-shaders.js";

/** How tall a hurricane's body stands over its base, as a share of its radius: far wider than tall. */
const BODY_HEIGHT = 0.31;

/** The drum a hurricane's body fills: as wide as the storm, and as tall as its core towers. */
export function stormVolume(look: Pick<CloudLook, "radius">): { radius: number; height: number } {
  return { radius: look.radius, height: look.radius * BODY_HEIGHT };
}

/** How see-through the funnel from the eye down to the sea is: mostly. */
export const FUNNEL_OPACITY = 0.15;
/** The funnel's width where it leaves the eye, and where it meets the sea, as shares of the hurricane's radius. */
const FUNNEL = { top: 0.075, bottom: 0.022 };

/** How far out from its middle the funnel reaches at a height, from the sea (0) up to the cloud's base (1). */
export function funnelReach(at: { look: Pick<CloudLook, "radius">; up: number }): number {
  const share = FUNNEL.bottom + (FUNNEL.top - FUNNEL.bottom) * Math.pow(at.up, 1.8);
  return at.look.radius * share;
}

/** A hurricane this frame: where it is, how it looks, its own number, the time, and its colours. */
export interface HurricaneShowing {
  readonly centre: WorldPoint;
  readonly look: CloudLook;
  readonly seed: number;
  readonly seconds: number;
  readonly tints: { readonly light: Color; readonly shade: Color };
}

/**
 * A hurricane with a real body: its spiral, the one its shadow takes, mapped once and turned as
 * the storm turns, filling a drum that is walked through ray by ray, so it stands solid from any
 * side; and from its eye a see-through funnel twisting down to the sea, like a tornado's.
 */
export class HurricaneBody {
  private readonly body: Mesh;
  private readonly funnel: Mesh;
  private readonly spiral = spiralTexture();
  private readonly bodyLook = bodyMaterial(this.spiral);
  private readonly funnelLook = funnelMaterial();
  private mappedSeed = Number.NaN;

  constructor(scene: Scene, setting: { look: CloudLook; order: number }) {
    const drum = new CylinderGeometry(1, 1, 1, 48, 1, false).translate(0, 0.5, 0);
    this.body = hidden(scene, { mesh: new Mesh(drum, this.bodyLook), order: setting.order });
    const funnel = new Mesh(new CylinderGeometry(1, 1, 1, 24, 8, true), this.funnelLook);
    this.funnel = hidden(scene, { mesh: funnel, order: setting.order - 0.1 });
    this.funnelLook.uniforms.uReach.value.set(
      funnelReach({ look: setting.look, up: 0 }),
      funnelReach({ look: setting.look, up: 1 }),
    );
  }

  show(showing: HurricaneShowing): void {
    this.mapSpiral(showing.seed);
    const { centre, look, tints } = showing;
    const { radius, height } = stormVolume(look);
    this.body.position.set(centre.x, look.height, centre.z);
    this.body.scale.set(radius, height, radius);
    const body = this.bodyLook.uniforms;
    body.uCentre.value.set(centre.x, look.height, centre.z);
    body.uSize.value.set(radius, height);
    body.uTurn.value = -HURRICANE_SPIN * showing.seconds;
    body.uLight.value = tints.light;
    body.uShade.value = tints.shade;
    this.showFunnel(showing);
    this.body.visible = true;
  }

  hide(): void {
    this.body.visible = false;
    this.funnel.visible = false;
  }

  private showFunnel(showing: HurricaneShowing): void {
    const funnel = this.funnelLook.uniforms;
    funnel.uCentre.value.set(showing.centre.x, showing.look.height, showing.centre.z);
    funnel.uTime.value = showing.seconds;
    funnel.uLight.value = showing.tints.light;
    funnel.uShade.value = showing.tints.shade;
    this.funnel.visible = true;
  }

  /** Maps this storm's spiral, the first time it is seen: each storm has its own. */
  private mapSpiral(seed: number): void {
    if (seed === this.mappedSeed) return;
    this.mappedSeed = seed;
    (this.spiral.image.data as Uint8Array).set(hurricaneMap(seed));
    this.spiral.needsUpdate = true;
  }
}

function hidden(scene: Scene, adding: { mesh: Mesh; order: number }): Mesh {
  adding.mesh.frustumCulled = false;
  adding.mesh.renderOrder = adding.order;
  adding.mesh.visible = false;
  scene.add(adding.mesh);
  return adding.mesh;
}

function spiralTexture(): DataTexture {
  const texture = new DataTexture(
    new Uint8Array(MAP_SIZE * MAP_SIZE),
    MAP_SIZE,
    MAP_SIZE,
    RedFormat,
  );
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function bodyMaterial(spiral: DataTexture): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: HURRICANE_VERTEX,
    fragmentShader: HURRICANE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: FrontSide,
    uniforms: {
      uSpiral: { value: spiral },
      uCentre: { value: new Vector3() },
      uSize: { value: new Vector2() },
      uTurn: { value: 0 },
      uLight: { value: new Color() },
      uShade: { value: new Color() },
      ...hazeUniforms(),
    },
  });
}

function funnelMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: FUNNEL_VERTEX,
    fragmentShader: FUNNEL_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: FrontSide,
    uniforms: {
      uCentre: { value: new Vector3() },
      uReach: { value: new Vector2() },
      uTime: { value: 0 },
      uOpacity: { value: FUNNEL_OPACITY },
      uLight: { value: new Color() },
      uShade: { value: new Color() },
    },
  });
}
