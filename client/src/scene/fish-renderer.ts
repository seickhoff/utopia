import type { SpriteSnapshot } from "@utopia/engine";
import { BufferAttribute, BufferGeometry, Color, Mesh, ShaderMaterial, type Scene } from "three";
import { CARD_SIZE, worldOfSprite } from "../board/rom-space.js";
import { FISH_FRAGMENT, FISH_VERTEX } from "./fish-shader.js";
import { spriteSeed } from "./sprite-seed.js";

const MAX_SCHOOLS = 2;
const CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];
/** How far a school spreads from its middle: a little more than its square, to be seen. */
const SCHOOL_RADIUS = 0.85;
/** Drawn after the sea and before the rain and clouds, which pass over it. */
const UNDER_THE_WEATHER = 0.5;
/** A school drifts rather than races: its fish swim and flash at a sixth of the clock. */
const FISH_PACE = 0.16;

/**
 * Schools of fish: both drawn by one mesh of two quads and one shader, each placed by rewriting
 * four corners' worth of a small attribute every frame.
 */
export class FishRenderer {
  private readonly schools = new Float32Array(MAX_SCHOOLS * CORNERS.length * 4);
  private readonly geometry = schoolQuads(this.schools);
  private readonly material = schoolMaterial();

  constructor(scene: Scene) {
    const mesh = new Mesh(this.geometry, this.material);
    mesh.frustumCulled = false;
    mesh.renderOrder = UNDER_THE_WEATHER;
    scene.add(mesh);
  }

  update(sea: { sprites: readonly SpriteSnapshot[]; seconds: number }): void {
    this.material.uniforms.uTime.value = sea.seconds * FISH_PACE;
    const fish = sea.sprites.filter((sprite) => sprite.kind === "fish");
    for (let slot = 0; slot < MAX_SCHOOLS; slot += 1) this.place({ slot, fish: fish[slot] });
    this.geometry.attributes.aSchool.needsUpdate = true;
  }

  private place(school: { slot: number; fish?: SpriteSnapshot }): void {
    const { slot, fish } = school;
    const centre = fish === undefined ? { x: 0, z: 0 } : worldOfSprite(fish, CARD_SIZE);
    const seed = fish === undefined ? 0 : spriteSeed(fish.id);
    const shown = fish === undefined ? 0 : 1;
    for (let corner = 0; corner < CORNERS.length; corner += 1) {
      this.schools.set([centre.x, centre.z, seed, shown], (slot * CORNERS.length + corner) * 4);
    }
  }
}

function schoolQuads(schools: Float32Array): BufferGeometry {
  const geometry = new BufferGeometry();
  const corners = Array.from({ length: MAX_SCHOOLS }, () => CORNERS.flat()).flat();
  const indices = Array.from({ length: MAX_SCHOOLS }, (_, slot) =>
    [0, 1, 2, 0, 2, 3].map((corner) => slot * CORNERS.length + corner),
  ).flat();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(schools.length * 0.75), 3),
  );
  geometry.setAttribute("aCorner", new BufferAttribute(Float32Array.from(corners), 2));
  geometry.setAttribute("aSchool", new BufferAttribute(schools, 4));
  geometry.setIndex(indices);
  return geometry;
}

function schoolMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: FISH_VERTEX,
    fragmentShader: FISH_FRAGMENT,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: SCHOOL_RADIUS },
      uBacks: { value: new Color("#15303c") },
      uSilver: { value: new Color("#e4f5f7") },
      uWater: { value: new Color("#3f8fa0") },
    },
  });
}
