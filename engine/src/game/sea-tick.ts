import { SIDES } from "../board/side.js";
import { PixelPoint } from "../geometry/pixel-point.js";
import { cornerSpawn } from "../sea/corner-spawn.js";
import type { Drifter } from "../sea/drifter.js";
import { weatherOfFace } from "../sea/weather-kind.js";
import type { World } from "./world.js";

/** The rand(4) that picks which way a nudge goes. */
const NUDGE_DIRECTIONS = 4;

interface Arrival {
  readonly group: "fish" | "pirates";
  readonly kind: "fish" | "pirate";
  readonly sides: number;
}

/**
 * The first half of the timer task: weather may form, fish and pirates may appear, every drifter
 * may change course, and all boats keep off the shore.
 */
export function stirTheSea(world: World): void {
  const { sea } = world.rules;
  formWeather(world);
  nudge(world, world.sea.inGroup("weather"));
  arrive(world, { group: "fish", kind: "fish", sides: sea.fishSides });
  arrive(world, { group: "pirates", kind: "pirate", sides: sea.pirateSides });
  nudge(world, [...world.sea.inGroup("pirates"), ...world.sea.inGroup("fish")]);
  steerClear(world);
}

function formWeather(world: World): void {
  const { weather, weatherStart, weatherHeading } = world.rules.sea;
  const dice = world.dice.sea;
  if (dice.roll(weather.formationSides) !== 0 || !world.sea.hasRoomFor("weather")) return;
  const kind = weatherOfFace(dice.roll(weather.kindSides), weather);
  const at = new PixelPoint(weatherStart.x, weatherStart.y);
  world.sea.launch("weather", { kind, at, velocity: weatherHeading });
  world.events.record({ type: "weatherFormed", kind });
}

function arrive(world: World, arrival: Arrival): void {
  if (world.dice.sea.roll(arrival.sides) !== 0 || !world.sea.hasRoomFor(arrival.group)) return;
  const spawn = cornerSpawn(world.dice.sea, world.rules.sea.corners);
  world.sea.launch(arrival.group, { kind: arrival.kind, ...spawn });
}

function nudge(world: World, drifters: readonly Drifter[]): void {
  for (const drifter of drifters) {
    if (world.dice.sea.roll(world.rules.sea.nudgeSides) !== 0) continue;
    drifter.nudge(world.dice.sea.roll(NUDGE_DIRECTIONS));
  }
}

function steerClear(world: World): void {
  const board = world.board;
  SIDES.forEach((side) => world.pilots[side].steerClear(board));
  world.sea
    .inGroup("pirates")
    .forEach((pirate) => pirate.steerClear({ board, seafarer: "pirate" }));
  world.sea.inGroup("fish").forEach((fish) => fish.steerClear({ board, seafarer: "vessel" }));
}
