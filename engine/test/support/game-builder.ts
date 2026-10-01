import { keyOf, type ItemKind } from "../../src/board/item-kind.js";
import type { Side } from "../../src/board/side.js";
import { DISC_RELEASED, type DiscReading } from "../../src/geometry/disc.js";
import { squareAnchor } from "../../src/geometry/pixel-point.js";
import type { Square } from "../../src/geometry/square.js";
import type { GameEvent, GameEventSink, GameEventType } from "../../src/game/game-event.js";
import type { GameOptions } from "../../src/game/game-options.js";
import { DEFAULT_RULES, type GameRules } from "../../src/game/game-rules.js";
import type { GameSnapshot, IslandSnapshot } from "../../src/game/game-snapshot.js";
import { Game } from "../../src/game/game.js";
import type { KeypadKey } from "../../src/pilots/keypad.js";
import type { Dice } from "../../src/random/dice.js";
import { LoadedDice } from "./loaded-dice.js";

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

export function aGame(): GameBuilder {
  return new GameBuilder();
}

class GameBuilder {
  private options: GameOptions = { rounds: 3, roundSeconds: 30 };
  private rules: GameRules = DEFAULT_RULES;
  private sea: Dice = new LoadedDice();
  private fortune: Dice = new LoadedDice();

  withOptions(options: Partial<GameOptions>): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  withRules(rules: GameRules): this {
    this.rules = rules;
    return this;
  }

  withSea(dice: Dice): this {
    this.sea = dice;
    return this;
  }

  withFortune(dice: Dice): this {
    this.fortune = dice;
    return this;
  }

  ready(): GameUnderTest {
    const events = new RecordingEvents();
    const setup = { options: this.options, rules: this.rules };
    const game = new Game(setup, { sea: this.sea, fortune: this.fortune, events });
    return new GameUnderTest(game, { events, options: this.options, rules: this.rules });
  }

  started(): GameUnderTest {
    return this.ready().start();
  }
}

interface TestContext {
  readonly events: RecordingEvents;
  readonly options: GameOptions;
  readonly rules: GameRules;
}

/** A game driven the way players drive it, with shorthand for the moves tests make most. */
export class GameUnderTest {
  constructor(
    readonly game: Game,
    private readonly context: TestContext,
  ) {}

  get events(): RecordingEvents {
    return this.context.events;
  }

  start(): this {
    this.game.start();
    return this;
  }

  cursorTo(side: Side, square: Square): this {
    this.game.layCursor(side, squareAnchor(square));
    return this;
  }

  press(side: Side, ...keys: KeypadKey[]): this {
    keys.forEach((key) => this.game.pressKey(side, key));
    return this;
  }

  disc(side: Side, reading: DiscReading): this {
    this.game.setDisc(side, reading);
    return this;
  }

  /** Holds the disc in one direction for a while, then lets go. */
  sail(side: Side, course: { direction: number; seconds: number }): this {
    return this.disc(side, course.direction).play(course.seconds).disc(side, DISC_RELEASED);
  }

  buy(side: Side, item: ItemKind, at?: Square): this {
    if (at !== undefined) this.cursorTo(side, at);
    return this.press(side, keyOf(item), "enter");
  }

  play(seconds: number): this {
    this.game.advance(seconds);
    return this;
  }

  playRound(): this {
    return this.play(this.context.options.roundSeconds);
  }

  playYearEnd(): this {
    const timing = this.context.rules.timing;
    return this.play(timing.scoresSeconds + timing.totalsSeconds);
  }

  snapshot(): GameSnapshot {
    return this.game.snapshot();
  }

  island(side: Side): IslandSnapshot {
    return this.snapshot().islands[side];
  }

  occupantAt(square: Square): string {
    const found = this.snapshot().board.squares.find(
      (cell) => cell.row === square.row && cell.col === square.col,
    );
    return found?.occupant ?? "nothing";
  }
}
