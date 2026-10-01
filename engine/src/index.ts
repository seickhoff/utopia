export { SeededRandom, type RandomSource } from "./random/random-source.js";
export { FairDice, type Dice } from "./random/dice.js";
export { CARD_PIXELS, GRID_COLUMNS, GRID_ROWS, STATUS_ROW, Square } from "./geometry/square.js";
export { PixelPoint, squareAnchor, squareUnder } from "./geometry/pixel-point.js";
export {
  DISC_DIRECTIONS,
  DISC_RELEASED,
  STILL,
  discVelocity,
  steadyDiscFacing,
  steerToward,
  type DiscDirection,
  type DiscReading,
  type Velocity,
  type Way,
} from "./geometry/disc.js";
export { NOBODY, SIDES, opponentOf, type Holder, type Side } from "./board/side.js";
export {
  ITEM_KINDS,
  cardOf,
  colourOf,
  isBoat,
  itemOnKey,
  keyOf,
  priceOf,
  type BoatKind,
  type BuildingKind,
  type ItemKind,
} from "./board/item-kind.js";
export { HARBOURS, ISLANDS, ISLAND_SIZE, type IslandSquare } from "./board/island-map.js";
export type { Occupant, SquareContent, Terrain } from "./board/square-content.js";
export { ItemCounts, type ItemTally } from "./economy/item-counts.js";
export {
  projectRound,
  type EconomyRules,
  type RoundInputs,
  type RoundProjection,
} from "./economy/round-projection.js";
export type { RoundIncome } from "./economy/round-income.js";
export type { PopulationChange } from "./economy/population.js";
export type { RoundScore } from "./economy/round-score.js";
export type { RebelMovement } from "./rebels/rebel-movement.js";
export type { IslandStanding } from "./island/island.js";
export {
  BOAT_KEY,
  NO_SELECTION,
  type KeypadKey,
  type RazzReason,
  type Selection,
} from "./pilots/keypad.js";
export { PILOT_BOUNDS } from "./pilots/pilot.js";
export type { Aboard, PilotModeName, PilotSpeeds } from "./pilots/pilot-mode.js";
export { cellOf, squareOf, type Cell } from "./game/cell.js";
export {
  DEFAULT_GAME_OPTIONS,
  GAME_OPTION_LIMITS,
  sanitizeGameOptions,
  type GameOptions,
  type OptionLimit,
} from "./game/game-options.js";
export { DEFAULT_RULES, type GameRules, type YearEndTiming } from "./game/game-rules.js";
export type {
  GameEvent,
  GameEventSink,
  GameEventType,
  RebelChange,
  RoundReport,
  WreckCause,
} from "./game/game-event.js";
export type {
  BoardSnapshot,
  GameSnapshot,
  IslandSnapshot,
  PilotSnapshot,
  SpriteLookSnapshot,
  SpriteSnapshot,
  SquareSnapshot,
} from "./game/game-snapshot.js";
export { BLANK_CARD, NO_WRECK, backtabCard, type Wreck } from "./board/backtab.js";
export { MOB_PICTURES } from "./rom/mob-pictures.js";
export { CARD_PICTURES } from "./rom/card-pictures.js";
export { COLOURS, PALETTE } from "./rom/palette.js";
export {
  FISHING_BOAT_CARD,
  PT_BOAT_CARD,
  SINKING_CARD_BASE,
  SOLID_LAND_CARD,
  bitRows,
} from "./rom/bitmap.js";
export { SPRITE_LOOKS, shapeOf, type LookName, type SpriteLook } from "./sea/sprite-looks.js";
export {
  SCANLINES_PER_PIXEL,
  scanlineMask,
  scanlinesOf,
  type Footprint,
  type SpriteShape,
} from "./collision/sprite-shape.js";
export type { DrifterKind } from "./sea/drifter.js";
export { SeaChart, type Passage, type Waters } from "./sea/sea-chart.js";
export { Navigator, type Voyage } from "./sea/navigator.js";
export { steerAlong, steerWithin, type Leg, type Spot } from "./sea/course.js";
export { watersOf } from "./game/waters.js";
export { isWeather, type WeatherKind } from "./sea/weather-kind.js";
export type { SeaRules } from "./game/game-rules.js";
export type { GamePhase } from "./game/stage.js";
export { FRAMES_PER_SECOND, FRAMES_PER_TICK } from "./game/frame-step.js";
export { TICKS_PER_SECOND } from "./game/round-clock.js";
export { PILOT_STARTS } from "./game/world.js";
export { Game, type GameDependencies, type GameSetup } from "./game/game.js";
export { newGame, type GameLaunch } from "./match/game-setup.js";
