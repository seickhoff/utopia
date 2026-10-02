import { isWeather, type GameEvent, type SpriteSnapshot, type WeatherKind } from "@utopia/engine";
import { Color, CylinderGeometry, DoubleSide, Mesh, ShaderMaterial, type Scene } from "three";
import { CARD_SIZE, worldOfSprite, type WorldPoint } from "../board/rom-space.js";
import { CLOUD_LOOKS, lightningAt, type CloudLook, type Lightning } from "./cloud-looks.js";
import { CloudPuffs } from "./cloud-puffs.js";
import { HurricaneBody } from "./hurricane-body.js";
import { landAt, type GroundReading } from "./ground-fit.js";
import { LightningStrikes } from "./lightning-strikes.js";
import { PointPool } from "./particles.js";
import { pseudoRandom } from "./random.js";
import type { Vec3 } from "./shapes.js";
import { spriteSeed } from "./sprite-seed.js";
import { RAIN_FRAGMENT, RAIN_VERTEX } from "./weather-shaders.js";

const MAX_CLOUDS = 2;
/** Room for the biggest heap's puffs, cloud by cloud. */
const PUFFS_PER_CLOUD = 128;
const SPLASHES_PER_CLOUD = 24;
/** Splashes a second at each splash's place. */
const SPLASH_RATE = 2.5;
/** The rain curtain's width against its cloud's. */
const CURTAIN_WIDTH = 0.5;
/** See-through things are drawn in this order after the sea: rain first, its cloud on top. */
const DRAW_ORDER = { curtain: 1, cloud: 2 };

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

/** A cloud's rain: the curtain it falls in. */
/** A cloud's place in the sky: the curtain its rain falls in, and the body it has if it is a hurricane. */
interface CloudSlot {
  readonly curtain: Mesh;
  readonly curtainLook: ShaderMaterial;
  readonly hurricane: HurricaneBody;
}

/** A cloud this frame, and where its body is drawn: the puffs of a heap, or its slot's hurricane. */
interface Body {
  readonly weather: Weather;
  readonly slot: CloudSlot;
  readonly puffs: CloudPuffs;
  /** Where the camera is. */
  readonly eye: Vec3;
}

/** How each kind of cloud gets its body: rain clouds and storms heaped of puffs, a hurricane a spiral in slices. */
const BODIES: Readonly<Record<WeatherKind, (body: Body) => void>> = {
  rain: heapUp,
  storm: heapUp,
  hurricane: spiralUp,
};

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
 * judges a cloud by one point near its corner). Each has body: a rain cloud or a storm heaped up
 * of puffs, a hurricane a great turning spiral stacked in slices round its eye. Rain falls in a
 * curtain of streaks and splashes where it lands; a storm's lightning lights it from within, and
 * strikes down onto whatever it destroys.
 */
export class WeatherRenderer {
  private readonly slots: readonly CloudSlot[];
  private readonly splashes: PointPool;
  private readonly puffs: CloudPuffs;
  private readonly strikes: LightningStrikes;

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
    const puffs = new CloudPuffs(scene, {
      capacity: MAX_CLOUDS * PUFFS_PER_CLOUD,
      order: DRAW_ORDER.cloud,
    });
    this.puffs = puffs;
    this.strikes = new LightningStrikes(scene, ground);
  }

  update(weather: {
    sprites: readonly SpriteSnapshot[];
    seconds: number;
    events: readonly GameEvent[];
    /** Where the camera is, for the clouds' puffs to be drawn far to near from it. */
    eye: Vec3;
  }): void {
    const clouds = weather.sprites.filter((sprite) => isWeather(sprite.kind));
    const storms = clouds
      .filter((cloud) => cloud.kind === "storm")
      .map((cloud) => worldOfSprite(cloud, CARD_SIZE));
    this.strikes.hear({ events: weather.events, storms, seconds: weather.seconds });
    this.splashes.begin();
    this.puffs.begin();
    this.slots.forEach((slot, index) =>
      this.show({ slot, cloud: clouds[index], seconds: weather.seconds, eye: weather.eye }),
    );
    this.splashes.finish();
    this.puffs.finish();
    this.strikes.draw(weather.seconds);
  }

  private show(showing: {
    slot: CloudSlot;
    cloud?: SpriteSnapshot;
    seconds: number;
    eye: Vec3;
  }): void {
    const { slot, cloud, seconds, eye } = showing;
    slot.curtain.visible = false;
    slot.hurricane.hide();
    if (cloud === undefined || !isWeather(cloud.kind)) return;
    const weather = this.weatherOf({ cloud, kind: cloud.kind, seconds });
    BODIES[cloud.kind]({ weather, slot, puffs: this.puffs, eye });
    if (weather.look.rain === "dry") return;
    pourRain(slot, weather);
    this.splash(weather);
  }

  /** A cloud this frame, lit by its own flashes and by any strike it is sending down. */
  private weatherOf(sighting: {
    cloud: SpriteSnapshot;
    kind: WeatherKind;
    seconds: number;
  }): Weather {
    const { cloud, kind, seconds } = sighting;
    const look = CLOUD_LOOKS[kind];
    const seed = spriteSeed(cloud.id);
    const centre = worldOfSprite(cloud, CARD_SIZE);
    const flashes = lightningAt({ seconds, seed, look });
    const struck = this.strikes.glowNear({ centre, radius: look.radius, seconds });
    const lightning = { ...flashes, brightness: Math.max(flashes.brightness, struck) };
    return { kind, look, centre, seed, seconds, lightning };
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

/** A heaped cloud's puffs over its square, lit by the sun and by its lightning. */
function heapUp(cloud: Body): void {
  const { weather } = cloud;
  const { look, centre } = weather;
  cloud.puffs.heap({
    eye: cloud.eye,
    cloud: { radius: look.radius, tiers: look.heap, seed: weather.seed },
    base: { x: centre.x, y: look.height, z: centre.z },
    seconds: weather.seconds,
    tints: TINTS[weather.kind],
    flash: weather.lightning.brightness,
  });
}

/** A hurricane's spiral, sliced up into its body over its square. */
function spiralUp({ weather, slot }: Body): void {
  const { centre, look, seed, seconds } = weather;
  slot.hurricane.show({ centre, look, seed, seconds, tints: TINTS[weather.kind] });
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

function cloudSlot(scene: Scene): CloudSlot {
  const curtainLook = curtainMaterial();
  const curtain = new CylinderGeometry(1, 1.1, 1, 28, 1, true);
  return {
    curtain: added(scene, { mesh: new Mesh(curtain, curtainLook), order: DRAW_ORDER.curtain }),
    curtainLook,
    hurricane: new HurricaneBody(scene, { look: CLOUD_LOOKS.hurricane, order: DRAW_ORDER.cloud }),
  };
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
