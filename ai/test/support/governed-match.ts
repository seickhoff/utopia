import {
  DEFAULT_RULES,
  FRAMES_PER_SECOND,
  SIDES,
  SeededRandom,
  newGame,
  squareUnder,
  type Cell,
  type DiscReading,
  type Game,
  type GameEvent,
  type GameEventSink,
  type GameEventType,
  type GameOptions,
  type GameSnapshot,
  type KeypadKey,
  type Side,
} from "@utopia/engine";
import type { DifficultyName } from "../../src/difficulty.js";
import { Governor } from "../../src/governor.js";
import type { IslandControls } from "../../src/island-controls.js";
import { RecordingControls } from "./recording-controls.js";

const FRAME_SECONDS = 1 / FRAMES_PER_SECOND;
/** No term of office lasts longer than this, so a game that never ends fails instead of hanging. */
const LONGEST_GAME_SECONDS = 50 * (120 + 10);

export class RecordingEvents implements GameEventSink {
  readonly all: GameEvent[] = [];

  record(event: GameEvent): void {
    this.all.push(event);
  }

  ofType<T extends GameEventType>(type: T): Extract<GameEvent, { type: T }>[] {
    return this.all.filter(
      (event): event is Extract<GameEvent, { type: T }> => event.type === type,
    );
  }
}

/** A key press as the game saw it: where the governor's pilot was, and the disc it held. */
export interface KeyPress {
  readonly key: KeypadKey;
  readonly pilot: Cell;
  readonly held: DiscReading;
}

export function aMatch(): MatchBuilder {
  return new MatchBuilder();
}

class MatchBuilder {
  private seed = 1;
  private options: Partial<GameOptions> = { rounds: 3, roundSeconds: 30 };
  private readonly difficulties: Partial<Record<Side, DifficultyName>> = {};
  private readonly cut = new Set<Side>();
  private framesPerLook = 1;

  withSeed(seed: number): this {
    this.seed = seed;
    return this;
  }

  withOptions(options: Partial<GameOptions>): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  governedBy(side: Side, difficulty: DifficultyName): this {
    this.difficulties[side] = difficulty;
    return this;
  }

  /** The governors look at the game once every so many frames, as a ticking server would. */
  lookingEvery(frames: number): this {
    this.framesPerLook = frames;
    return this;
  }

  /** The governor's commands go nowhere: it can see the game but not touch it. */
  withControlsCut(side: Side): this {
    this.cut.add(side);
    return this;
  }

  begun(): GovernedMatch {
    const events = new RecordingEvents();
    const game = newGame({ options: this.options, seed: this.seed, events });
    game.start();
    const seats = this.seats(game);
    return new GovernedMatch({ game, events, seats, framesPerLook: this.framesPerLook });
  }

  private seats(game: Game): Seat[] {
    return SIDES.flatMap((side, index) => {
      const difficulty = this.difficulties[side];
      if (difficulty === undefined) return [];
      const random = new SeededRandom(this.seed * 100 + index);
      const governor = new Governor({ side, difficulty, random, rules: DEFAULT_RULES });
      const secondsPerLook = this.framesPerLook * FRAME_SECONDS;
      return [new Seat({ side, governor, game, cut: this.cut.has(side), secondsPerLook })];
    });
  }
}

/** One governor at the controller of one side. */
class Seat {
  readonly controls: RecordingControls;
  readonly presses: KeyPress[] = [];

  constructor(
    private readonly place: {
      side: Side;
      governor: Governor;
      game: Game;
      cut: boolean;
      secondsPerLook: number;
    },
  ) {
    this.controls = new RecordingControls(place.cut ? undefined : this.wiredTo(place.game));
  }

  get side(): Side {
    return this.place.side;
  }

  govern(snapshot: GameSnapshot): void {
    const seconds = this.place.secondsPerLook;
    this.place.governor.govern({ snapshot, seconds, controls: this.controls });
  }

  private wiredTo(game: Game): IslandControls {
    const side = this.place.side;
    return {
      setDisc: (reading) => game.setDisc(side, reading),
      pressKey: (key) => {
        const { x, y } = game.snapshot().islands[side].pilot;
        const { row, col } = squareUnder({ x, y });
        this.presses.push({
          key,
          pilot: { row, col },
          held: this.controls.discReadings().at(-1) ?? "released",
        });
        game.pressKey(side, key);
      },
    };
  }
}

/** A game with computer governors at the controls, played a frame at a time. */
export class GovernedMatch {
  private frame = 0;

  constructor(
    private readonly match: {
      game: Game;
      events: RecordingEvents;
      seats: Seat[];
      framesPerLook: number;
    },
  ) {}

  get events(): RecordingEvents {
    return this.match.events;
  }

  play(seconds: number): this {
    for (let frame = 0; frame < Math.round(seconds * FRAMES_PER_SECOND); frame += 1)
      this.playFrame();
    return this;
  }

  playToEnd(): this {
    for (let frame = 0; frame < LONGEST_GAME_SECONDS * FRAMES_PER_SECOND; frame += 1) {
      if (this.snapshot().phase === "over") return this;
      this.playFrame();
    }
    return this;
  }

  snapshot(): GameSnapshot {
    return this.match.game.snapshot();
  }

  controls(side: Side): RecordingControls {
    return this.seatOf(side).controls;
  }

  keyPresses(side: Side): KeyPress[] {
    return this.seatOf(side).presses;
  }

  total(side: Side): number {
    return this.snapshot().islands[side].totalScore;
  }

  private playFrame(): void {
    if (this.frame % this.match.framesPerLook === 0) {
      const snapshot = this.match.game.snapshot();
      this.match.seats.forEach((seat) => seat.govern(snapshot));
    }
    this.frame += 1;
    this.match.game.advance(FRAME_SECONDS);
  }

  private seatOf(side: Side): Seat {
    const seat = this.match.seats.find((candidate) => candidate.side === side);
    if (seat === undefined) throw new Error(`No governor sits on the ${side}`);
    return seat;
  }
}
