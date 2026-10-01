import { isWeather, type SpriteSnapshot, type WeatherKind } from "@utopia/engine";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
  Vector4,
  type Scene,
} from "three";
import { CARD_SIZE, worldOfSprite, type WorldPoint } from "../board/rom-space.js";
import { CLOUD_LOOKS, lightningAt, type CloudLook, type Lightning } from "./cloud-looks.js";
import { landAt, type GroundReading } from "./ground-fit.js";
import { hazeUniforms } from "./haze-glsl.js";
import { SUNLIGHT } from "./lighting.js";
import { PointPool } from "./particles.js";
import type { Vec3 } from "./shapes.js";
import { spriteSeed } from "./sprite-seed.js";
import { CLOUD_FRAGMENT, CLOUD_VERTEX, RAIN_FRAGMENT, RAIN_VERTEX } from "./weather-shaders.js";

const MAX_CLOUDS = 2;
const SPLASHES_PER_CLOUD = 24;
/** Splashes a second at each splash's place. */
const SPLASH_RATE = 2.5;
const BOLT_POINTS = 8;
/** The rain curtain's width against its cloud's. */
const CURTAIN_WIDTH = 0.5;
/** See-through things are drawn in this order after the sea: rain first, its cloud on top. */
const DRAW_ORDER = { curtain: 1, cloud: 2 };
/** Toward the sun, in a cloud's own terms: x to the east, y to the north, z up. */
const SUNWARD = new Vector3(SUNLIGHT.from.x, -SUNLIGHT.from.z, SUNLIGHT.from.y).normalize();

interface Tints {
  readonly light: Color;
  readonly shade: Color;
  readonly rain: Color;
}

const TINTS: Readonly<Record<WeatherKind, Tints>> = {
  rain: tintsOf(CLOUD_LOOKS.rain),
  storm: tintsOf(CLOUD_LOOKS.storm),
  hurricane: tintsOf(CLOUD_LOOKS.hurricane),
};

interface CloudSlot {
  readonly cloud: Mesh;
  readonly curtain: Mesh;
  readonly cloudLook: ShaderMaterial;
  readonly curtainLook: ShaderMaterial;
}

/** One cloud this frame: what it is, where, and whether lightning lights it. */
interface Weather {
  readonly kind: WeatherKind;
  readonly look: CloudLook;
  readonly centre: WorldPoint;
  readonly seed: number;
  readonly seconds: number;
  readonly lightning: Lightning;
}

/**
 * Rain clouds, storms and hurricanes, each over the square its damage falls on (the cartridge
 * judges a cloud by one point near its corner). A cloud is a disc drawn by a shader; rain falls
 * from it in a curtain of streaks and splashes where it lands; a storm's lightning strikes.
 */
export class WeatherRenderer {
  private readonly slots: readonly CloudSlot[];
  private readonly splashes: PointPool;
  private readonly bolts: Bolts;

  constructor(
    scene: Scene,
    private readonly ground: GroundReading,
  ) {
    this.slots = Array.from({ length: MAX_CLOUDS }, () => cloudSlot(scene));
    this.splashes = new PointPool(scene, {
      capacity: MAX_CLOUDS * SPLASHES_PER_CLOUD,
      size: 0.16,
      glowing: true,
    });
    this.bolts = new Bolts(scene);
  }

  update(weather: { sprites: readonly SpriteSnapshot[]; seconds: number }): void {
    const clouds = weather.sprites.filter((sprite) => isWeather(sprite.kind));
    this.splashes.begin();
    this.bolts.begin();
    this.slots.forEach((slot, index) =>
      this.show({ slot, cloud: clouds[index], seconds: weather.seconds }),
    );
    this.splashes.finish();
    this.bolts.finish();
  }

  private show(showing: { slot: CloudSlot; cloud?: SpriteSnapshot; seconds: number }): void {
    const { slot, cloud, seconds } = showing;
    slot.cloud.visible = false;
    slot.curtain.visible = false;
    if (cloud === undefined || !isWeather(cloud.kind)) return;
    const look = CLOUD_LOOKS[cloud.kind];
    const seed = spriteSeed(cloud.id);
    const centre = worldOfSprite(cloud, CARD_SIZE);
    const lightning = lightningAt({ seconds, seed, look });
    const weather: Weather = { kind: cloud.kind, look, centre, seed, seconds, lightning };
    floatCloud(slot, weather);
    if (look.rain === "dry") return;
    pourRain(slot, weather);
    this.splash(weather);
    this.bolts.strike(weather);
  }

  /** Drops landing round the foot of the curtain, each flaring and fading at its own moment. */
  private splash(weather: Weather): void {
    const reach = weather.look.radius * CURTAIN_WIDTH;
    for (let index = 0; index < SPLASHES_PER_CLOUD; index += 1) {
      const cycle = weather.seconds * SPLASH_RATE + index * 0.618;
      const which = Math.floor(cycle) * 97 + index + weather.seed * 1000;
      const angle = pseudoRandom(which) * Math.PI * 2;
      const distance = reach * Math.sqrt(pseudoRandom(which + 0.5));
      const x = weather.centre.x + Math.cos(angle) * distance;
      const z = weather.centre.z + Math.sin(angle) * distance;
      const fade = 1 - (cycle - Math.floor(cycle));
      const y = landAt(this.ground, { x, z }) + 0.02;
      this.splashes.add({ x, y, z, colour: [fade * 0.8, fade * 0.86, fade] });
    }
  }
}

function floatCloud(slot: CloudSlot, weather: Weather): void {
  const { look, centre } = weather;
  slot.cloud.visible = true;
  slot.cloud.position.set(centre.x, look.height, centre.z);
  slot.cloud.scale.set(look.radius, 1, look.radius);
  const { uniforms } = slot.cloudLook;
  uniforms.uShape.value.set(weather.seed, look.spiral, weather.seconds, 0);
  uniforms.uLight.value = TINTS[weather.kind].light;
  uniforms.uShade.value = TINTS[weather.kind].shade;
  uniforms.uFlash.value = weather.lightning.brightness;
}

function pourRain(slot: CloudSlot, weather: Weather): void {
  const { look, centre } = weather;
  if (look.rain === "dry") return;
  const width = look.radius * CURTAIN_WIDTH;
  slot.curtain.visible = true;
  slot.curtain.position.set(centre.x, look.height / 2, centre.z);
  slot.curtain.scale.set(width, look.height, width);
  const { uniforms } = slot.curtainLook;
  uniforms.uTime.value = weather.seconds;
  uniforms.uSpeed.value = look.rain.speed;
  uniforms.uOpacity.value = look.rain.opacity;
  uniforms.uVeil.value = look.rain.veil;
  uniforms.uFlash.value = weather.lightning.brightness;
  uniforms.uColour.value = TINTS[weather.kind].rain;
}

/** Lightning: a jagged line from a storm cloud to the ground, for the moment of a flash. */
class Bolts {
  private readonly points = new Float32Array(MAX_CLOUDS * (BOLT_POINTS - 1) * 6);
  private readonly geometry = new BufferGeometry();
  private segments = 0;

  constructor(scene: Scene) {
    this.geometry.setAttribute("position", new BufferAttribute(this.points, 3));
    const bolts = new LineSegments(this.geometry, new LineBasicMaterial({ color: "#f6f8ff" }));
    bolts.frustumCulled = false;
    scene.add(bolts);
  }

  begin(): void {
    this.segments = 0;
  }

  strike(weather: Weather): void {
    if (weather.lightning.brightness === 0) return;
    const path = boltPath(weather);
    path.slice(1).forEach((to, index) => {
      const from = path[index];
      this.points.set([from.x, from.y, from.z, to.x, to.y, to.z], this.segments * 6);
      this.segments += 1;
    });
  }

  finish(): void {
    this.geometry.setDrawRange(0, this.segments * 2);
    this.geometry.attributes.position.needsUpdate = true;
  }
}

/** From the cloud's base down to a point near its middle, zigzagging; new for every flash. */
function boltPath(weather: Weather): Vec3[] {
  const { centre, look } = weather;
  const seed = weather.lightning.flash * 31 + weather.seed * 1000;
  const reach = look.radius * CURTAIN_WIDTH;
  const landing = {
    x: centre.x + (pseudoRandom(seed) - 0.5) * reach,
    z: centre.z + (pseudoRandom(seed + 0.3) - 0.5) * reach,
  };
  return Array.from({ length: BOLT_POINTS }, (_, index) => {
    const along = index / (BOLT_POINTS - 1);
    const jitter = index === 0 || index === BOLT_POINTS - 1 ? 0 : 0.28;
    return {
      x: centre.x + (landing.x - centre.x) * along + (pseudoRandom(seed + index) - 0.5) * jitter,
      y: (look.height - 0.1) * (1 - along),
      z: centre.z + (landing.z - centre.z) * along + (pseudoRandom(seed - index) - 0.5) * jitter,
    };
  });
}

function cloudSlot(scene: Scene): CloudSlot {
  const cloudLook = cloudMaterial();
  const curtainLook = curtainMaterial();
  const disc = new PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const curtain = new CylinderGeometry(1, 1.1, 1, 28, 1, true);
  return {
    cloud: added(scene, { mesh: new Mesh(disc, cloudLook), order: DRAW_ORDER.cloud }),
    curtain: added(scene, { mesh: new Mesh(curtain, curtainLook), order: DRAW_ORDER.curtain }),
    cloudLook,
    curtainLook,
  };
}

function cloudMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: CLOUD_VERTEX,
    fragmentShader: CLOUD_FRAGMENT,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uShape: { value: new Vector4() },
      uLight: { value: new Color() },
      uShade: { value: new Color() },
      uFlash: { value: 0 },
      uSun: { value: SUNWARD },
      ...hazeUniforms(),
    },
  });
}

function curtainMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: RAIN_VERTEX,
    fragmentShader: RAIN_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: 1 },
      uOpacity: { value: 1 },
      uFlash: { value: 0 },
      uVeil: { value: 0 },
      uColour: { value: new Color() },
    },
  });
}

function added(scene: Scene, placing: { mesh: Mesh; order: number }): Mesh {
  placing.mesh.renderOrder = placing.order;
  placing.mesh.visible = false;
  scene.add(placing.mesh);
  return placing.mesh;
}

function tintsOf(look: CloudLook): Tints {
  const rain = look.rain === "dry" ? look.light : look.rain.colour;
  return { light: new Color(look.light), shade: new Color(look.shade), rain: new Color(rain) };
}

function pseudoRandom(value: number): number {
  const mixed = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return mixed - Math.floor(mixed);
}
