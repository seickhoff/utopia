import type { SpriteSnapshot } from "@utopia/engine";
import {
  BufferAttribute,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Vector4,
  type Scene,
} from "three";
import { CARD_SIZE, worldOfSprite } from "../board/rom-space.js";
import { FISH_PER_SCHOOL, fishModel, schoolsOfFish } from "./fish-school.js";
import { FISH_FRAGMENT, FISH_VERTEX } from "./fish-shader.js";
import { spriteSeed } from "./sprite-seed.js";

const MAX_SCHOOLS = 2;
/** How far a school spreads from its middle: a little more than its square, to be seen. */
const SCHOOL_RADIUS = 0.85;
/** How long a fish just under the surface is, big enough to make out as a fish; deeper ones look smaller. */
const FISH_LENGTH = 0.165;
/** Drawn after the sea and before the rain and clouds, which pass over it. */
const UNDER_THE_WEATHER = 0.5;
/** A school drifts rather than races: its fish swim and flash at a sixth of the clock. */
const FISH_PACE = 0.16;

/**
 * Schools of fish, every fish of both schools drawn in one call: each a small fish of its own,
 * moved in the shader by the time and its school's place, so nothing is written each frame but
 * those few numbers.
 */
export class FishRenderer {
  private readonly material = schoolMaterial();
  private readonly schools: readonly Vector4[];

  constructor(scene: Scene) {
    this.schools = this.material.uniforms.uSchools.value;
    const mesh = new Mesh(fishGeometry(), this.material);
    mesh.frustumCulled = false;
    mesh.renderOrder = UNDER_THE_WEATHER;
    scene.add(mesh);
  }

  update(sea: { sprites: readonly SpriteSnapshot[]; seconds: number }): void {
    this.material.uniforms.uTime.value = sea.seconds * FISH_PACE;
    const fish = sea.sprites.filter((sprite) => sprite.kind === "fish");
    this.schools.forEach((school, slot) => place({ school, fish: fish[slot] }));
  }
}

/** A school over its sprite's square, or shrunk to nothing where there is no school to show. */
function place(placing: { school: Vector4; fish?: SpriteSnapshot }): void {
  const { school, fish } = placing;
  if (fish === undefined) {
    school.set(0, 0, 0, 0);
    return;
  }
  const centre = worldOfSprite(fish, CARD_SIZE);
  school.set(centre.x, centre.z, spriteSeed(fish.id), 1);
}

function fishGeometry(): InstancedBufferGeometry {
  const model = fishModel();
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(Float32Array.from(model.positions), 3));
  geometry.setAttribute("aShine", new BufferAttribute(Float32Array.from(model.shine), 1));
  geometry.setAttribute("aFish", new InstancedBufferAttribute(schoolsOfFish(MAX_SCHOOLS), 4));
  geometry.instanceCount = MAX_SCHOOLS * FISH_PER_SCHOOL;
  return geometry;
}

function schoolMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: FISH_VERTEX,
    fragmentShader: FISH_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uSchools: { value: Array.from({ length: MAX_SCHOOLS }, () => new Vector4()) },
      uTime: { value: 0 },
      uRadius: { value: SCHOOL_RADIUS },
      uLength: { value: FISH_LENGTH },
      uBacks: { value: new Color("#0a1820") },
      uSilver: { value: new Color("#e4f5f7") },
      uWater: { value: new Color("#3f8fa0") },
    },
  });
}
