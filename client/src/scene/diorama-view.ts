import type { GameSnapshot, PixelPoint, Side } from "@utopia/engine";
import {
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { CARD_SIZE, worldOfSprite } from "../board/rom-space.js";
import type { GameFrame } from "../session/game-session.js";
import {
  DIORAMA_POSE,
  cameraPosition,
  frameShot,
  type Point3,
  type Shot,
} from "./camera-framing.js";
import { CloudShadows } from "./cloud-shadows.js";
import { FishRenderer } from "./fish-renderer.js";
import { FloorPicker, type ScreenPosition } from "./floor-picker.js";
import { Ground } from "./ground.js";
import { addIslands } from "./island-renderer.js";
import { LandUseMap } from "./land-use.js";
import { SKYLIGHT, SUNLIGHT } from "./lighting.js";
import { MoverRenderer } from "./mover-renderer.js";
import { PointerRenderer } from "./pointer-renderer.js";
import { SeaRenderer } from "./sea-renderer.js";
import { addSky } from "./sky-renderer.js";
import { TownRenderer } from "./town-renderer.js";
import { HAZE, WATER } from "./water-look.js";
import { WeatherRenderer } from "./weather-renderer.js";

export interface Area {
  readonly width: number;
  readonly height: number;
}

/** How the player wants to look at the islands, and whose cursor or boat to follow in close. */
export interface CameraAim {
  readonly pitchDegrees: number;
  /** 1 shows the whole sea; larger comes closer. */
  readonly zoom: number;
  readonly follow: Side;
}

export interface DioramaSetup {
  readonly canvas: HTMLCanvasElement;
  readonly room: () => Area;
  readonly aim: () => CameraAim;
}

/** The camera as it is drawn this frame: easing toward what the player asked for. */
interface CameraState {
  pitchDegrees: number;
  zoom: number;
  x: number;
  z: number;
}

/** How quickly the camera catches up with a new tilt, zoom or target: most of the way in a quarter second. */
const CAMERA_EASE_PER_SECOND = 9;
/** Far enough to see the horizon when the view is tilted right over. */
const FAR_PLANE = 5000;

/**
 * What must always stay in view, however the window is shaped: the sea the boats can reach, the
 * barrier reef round it, and the tops of the tallest buildings along its far side.
 */
const BOARD_CORNERS: readonly Point3[] = [-10.5, 10.5].flatMap((x) => [
  { x, y: 0, z: 6 },
  { x, y: 0.3, z: -6 },
]);
const FRAMING_MARGIN = 0;

interface Renderers {
  readonly shadows: CloudShadows;
  readonly landUse: LandUseMap;
  readonly sea: SeaRenderer;
  readonly town: TownRenderer;
  readonly movers: MoverRenderer;
  readonly weather: WeatherRenderer;
  readonly fish: FishRenderer;
  readonly pointer: PointerRenderer;
}

/**
 * The modern view: the islands as a lit diorama. A humble object that draws the snapshots it is
 * given and holds no rules; about a dozen draw calls a frame.
 */
export class DioramaView {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(DIORAMA_POSE.fovDegrees, 1, 0.5, FAR_PLANE);
  private readonly renderers: Renderers;
  private readonly shown: CameraState = {
    pitchDegrees: DIORAMA_POSE.pitchDegrees,
    zoom: 1,
    x: DIORAMA_POSE.target.x,
    z: DIORAMA_POSE.target.z,
  };
  private whole: { key: string; shot: Shot } = {
    key: "",
    shot: { target: DIORAMA_POSE.target, distance: 1 },
  };
  private lastDrawn = performance.now();
  private readonly picker: FloorPicker;
  /** Where the mouse is on the page while it plays the board. */
  private mouse: ScreenPosition | "away" = "away";

  constructor(private readonly setup: DioramaSetup) {
    this.renderer = new WebGLRenderer({ canvas: setup.canvas, antialias: true });
    this.renderer.setClearColor(new Color(WATER.deep));
    this.scene.background = new Color(WATER.deep);
    this.scene.fog = new Fog(WATER.haze, HAZE.near, HAZE.far);
    this.renderers = furnish(this.scene, setup.canvas);
    this.picker = new FloorPicker({ canvas: setup.canvas, camera: this.camera });
    this.resize();
  }

  draw(frame: GameFrame): void {
    const seconds = performance.now() / 1000;
    const snapshot = frame.current;
    this.aim(snapshot);
    const { shadows, landUse, sea, town, movers, weather, fish } = this.renderers;
    shadows.update({ sprites: snapshot.sprites, seconds });
    landUse.update(snapshot.board);
    sea.update(seconds);
    town.update(snapshot.board);
    movers.update(snapshot);
    weather.update({ sprites: snapshot.sprites, seconds });
    fish.update({ sprites: snapshot.sprites, seconds });
    this.showPointer(snapshot);
    this.renderer.render(this.scene, this.camera);
  }

  /** The mouse is over the board here: the view shows it on the board itself. */
  trackPointer(position: ScreenPosition): void {
    this.mouse = position;
  }

  /** The mouse has left the board, or no longer plays it: the system pointer shows it again. */
  losePointer(): void {
    this.mouse = "away";
    this.renderers.pointer.putAway();
  }

  setPixelRatio(ratio: number): void {
    this.renderer.setPixelRatio(ratio);
    this.resize();
  }

  show(): void {
    this.setup.canvas.hidden = false;
    this.resize();
  }

  hide(): void {
    this.losePointer();
    this.setup.canvas.hidden = true;
  }

  resize(): void {
    const room = this.setup.room();
    this.renderer.setSize(room.width, room.height, false);
    this.camera.aspect = room.width / Math.max(1, room.height);
    this.camera.updateProjectionMatrix();
    const shot = this.wholeSea(this.shown.pitchDegrees);
    this.place({ pitchDegrees: this.shown.pitchDegrees, shot });
  }

  /**
   * Eases the camera toward the player's tilt and zoom. Zoomed out it shows the whole sea; coming
   * closer, it looks more and more at the player's cursor or boat, so it never needs panning.
   */
  private aim(snapshot: GameSnapshot): void {
    const goal = this.setup.aim();
    const ease = this.easing();
    const shown = this.shown;
    shown.pitchDegrees += (goal.pitchDegrees - shown.pitchDegrees) * ease;
    shown.zoom += (goal.zoom - shown.zoom) * ease;
    const whole = this.wholeSea(shown.pitchDegrees);
    const focus = worldOfSprite(snapshot.islands[goal.follow].pilot, CARD_SIZE);
    const closeness = 1 - 1 / shown.zoom;
    shown.x += (whole.target.x + (focus.x - whole.target.x) * closeness - shown.x) * ease;
    shown.z += (whole.target.z + (focus.z - whole.target.z) * closeness - shown.z) * ease;
    const shot = {
      target: { x: shown.x, y: 0, z: shown.z },
      distance: whole.distance / shown.zoom,
    };
    this.place({ pitchDegrees: shown.pitchDegrees, shot });
  }

  /** The shot showing the whole sea at this tilt, worked out again only when tilt or shape changes. */
  private wholeSea(pitchDegrees: number): Shot {
    const key = `${pitchDegrees.toFixed(2)}:${this.camera.aspect.toFixed(4)}`;
    if (key === this.whole.key) return this.whole.shot;
    const pose = { ...DIORAMA_POSE, pitchDegrees };
    const framing = { aspect: this.camera.aspect, corners: BOARD_CORNERS, margin: FRAMING_MARGIN };
    this.whole = { key, shot: frameShot(pose, framing) };
    return this.whole.shot;
  }

  private place(view: { pitchDegrees: number; shot: Shot }): void {
    const { target, distance } = view.shot;
    const pose = { ...DIORAMA_POSE, pitchDegrees: view.pitchDegrees, target };
    const eye = cameraPosition(pose, distance);
    this.camera.position.set(eye.x, eye.y, eye.z);
    this.camera.lookAt(target.x, target.y, target.z);
  }

  /** The share of the way to its goal the camera moves this frame, whatever the frame rate. */
  private easing(): number {
    const now = performance.now();
    const seconds = Math.min(0.1, Math.max(0, (now - this.lastDrawn) / 1000));
    this.lastDrawn = now;
    return 1 - Math.exp(-seconds * CAMERA_EASE_PER_SECOND);
  }

  /** The sprite point under a pointer, where its ray meets the playfield; "outside" off it. */
  romPointAt(position: ScreenPosition): PixelPoint | "outside" {
    return this.picker.romPointAt(position);
  }

  /** The sprite point under a pointer, or at the nearest point on the sea's cards if it is past them. */
  nearestRomPoint(position: ScreenPosition): PixelPoint | "outside" {
    return this.picker.nearestRomPoint(position);
  }

  /** The player's mouse, as their cursor or boat follows it. */
  private showPointer(snapshot: GameSnapshot): void {
    const side = this.setup.aim().follow;
    const { mode } = snapshot.islands[side].pilot;
    this.renderers.pointer.update({ side, mode, spot: this.picker.spotAt(this.mouse) });
  }
}

function furnish(scene: Scene, canvas: HTMLCanvasElement): Renderers {
  const ground = new Ground();
  const shadows = new CloudShadows();
  const landUse = new LandUseMap();
  light(scene);
  addSky(scene);
  addIslands(scene, { ground, shadows, landUse: landUse.texture });
  return {
    shadows,
    landUse,
    sea: new SeaRenderer(scene, { shore: ground.surroundings, shadows }),
    town: new TownRenderer(scene, ground),
    movers: new MoverRenderer(scene, ground),
    weather: new WeatherRenderer(scene, ground),
    fish: new FishRenderer(scene),
    pointer: new PointerRenderer(scene, { ground, canvas }),
  };
}

/** A bright tropical day: sky light from above, and the sun in the south-west. */
function light(scene: Scene): void {
  scene.add(new HemisphereLight(SKYLIGHT.sky, SKYLIGHT.ground, SKYLIGHT.strength));
  const sun = new DirectionalLight(SUNLIGHT.colour, SUNLIGHT.strength);
  sun.position.set(SUNLIGHT.from.x, SUNLIGHT.from.y, SUNLIGHT.from.z);
  scene.add(sun);
}
