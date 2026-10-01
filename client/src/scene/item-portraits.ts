import { ITEM_KINDS, isBoat, keyOf, type ItemKind } from "@utopia/engine";
import {
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshLambertMaterial,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { districtOf, isDeveloped } from "./districts/districts.js";
import { trianglesGeometry } from "./geometry.js";
import { fleetUnderWay, fleetWakes } from "./fleets.js";
import { SKYLIGHT, SUNLIGHT } from "./lighting.js";
import { box, gableRoof, merge, placed, rgb, type Triangles } from "./shapes.js";
import { SIDE_STYLES } from "./town-layout.js";

const PORTRAIT_PIXELS = 192;
const TILE_DEPTH = 0.07;
/** The tile's ground: a thin skin of lawn, paving, earth or sea over its darker sides. */
const TILE_TOP = 0.012;
/** Each item is shown in the player's own colour. */
const STYLE = SIDE_STYLES.left;

/** The ground each item stands on in its portrait: its lawn, paving or earth, or the sea. */
const TILE_COLOURS: Readonly<Record<ItemKind, string>> = {
  fort: "#a48d68",
  factory: "#a9a7a0",
  crop: "#7f6446",
  school: "#6f9a4c",
  hospital: "#6f9a4c",
  house: "#6f9a4c",
  rebel: "#a48d68",
  ptBoat: "#3fa9b8",
  fishingBoat: "#3fa9b8",
};
const TILE_SIDES = rgb("#5b4a36");
const LEAF = rgb("#567f3a");

/**
 * A portrait of every item, drawn once as a small isometric diorama (the item on its own tile of
 * ground), as a picture the quick-build menu can show. Keyed by the item's key on the keypad.
 */
export function paintItemPortraits(): Readonly<Record<number, string>> {
  const canvas = document.createElement("canvas");
  canvas.width = PORTRAIT_PIXELS;
  canvas.height = PORTRAIT_PIXELS;
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(new Color(0x000000), 0);
  const camera = portraitCamera();
  const portraits = ITEM_KINDS.map((kind) => {
    renderer.render(portraitScene(kind), camera);
    return [keyOf(kind), canvas.toDataURL("image/png")] as const;
  });
  renderer.dispose();
  renderer.forceContextLoss();
  return Object.fromEntries(portraits);
}

/** An item on its tile of ground, as its portrait shows it: square one unit, top at 0. */
export function portraitModel(kind: ItemKind): Triangles {
  return merge([tile(kind), itemOn(kind)]);
}

function itemOn(kind: ItemKind): Triangles {
  if (isBoat(kind)) {
    return placed(merge([fleetUnderWay(kind, STYLE), fleetWakes(kind)]), {
      offset: { x: 0, y: 0, z: 0 },
      turn: -0.5,
    });
  }
  if (!isDeveloped(kind)) return field();
  const district = districtOf(kind, STYLE);
  return merge([...district.decals, ...district.structures]);
}

function tile(kind: ItemKind): Triangles {
  return merge([
    box({
      base: { x: 0, y: -TILE_DEPTH, z: 0 },
      size: { x: 1, y: TILE_DEPTH - TILE_TOP, z: 1 },
      colour: TILE_SIDES,
    }),
    box({
      base: { x: 0, y: -TILE_TOP, z: 0 },
      size: { x: 1, y: TILE_TOP, z: 1 },
      colour: rgb(TILE_COLOURS[kind]),
    }),
  ]);
}

/** A field in rows, for the crops the terrain otherwise paints straight onto the land. */
function field(): Triangles {
  const rows = [-0.3, -0.1, 0.1, 0.3].map((z) =>
    gableRoof({ base: { x: 0, y: 0, z }, size: { x: 0.86, y: 0.07, z: 0.15 }, colour: LEAF }),
  );
  return merge(rows);
}

function portraitScene(kind: ItemKind): Scene {
  const scene = new Scene();
  scene.add(new HemisphereLight(SKYLIGHT.sky, SKYLIGHT.ground, SKYLIGHT.strength));
  const sun = new DirectionalLight(SUNLIGHT.colour, SUNLIGHT.strength);
  sun.position.set(SUNLIGHT.from.x, SUNLIGHT.from.y, SUNLIGHT.from.z);
  scene.add(sun);
  const material = new MeshLambertMaterial({ vertexColors: true });
  scene.add(new Mesh(trianglesGeometry(portraitModel(kind)), material));
  return scene;
}

/** Looking down at the tile's corner from the south-east, as isometric art does. */
function portraitCamera(): OrthographicCamera {
  const camera = new OrthographicCamera(-0.78, 0.78, 0.86, -0.7, 0.1, 10);
  camera.position.set(1.8, 1.7, 1.8);
  camera.lookAt(0, 0.08, 0);
  return camera;
}
