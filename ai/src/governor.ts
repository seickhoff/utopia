import {
  Navigator,
  type GameRules,
  type GameSnapshot,
  type RandomSource,
  type Side,
} from "@utopia/engine";
import { Agenda } from "./agenda.js";
import { PLAYING_STRENGTHS, type DifficultyName } from "./difficulty.js";
import { Errand } from "./errand.js";
import { Hand } from "./hand.js";
import { IDLE, type Intent } from "./intent.js";
import type { IslandControls } from "./island-controls.js";
import { IslandView } from "./island-view.js";
import { Pace } from "./pace.js";

export interface GovernorSetup {
  readonly side: Side;
  readonly difficulty: DifficultyName;
  /** Every chance the governor takes comes from here, so a seeded game plays out the same. */
  readonly random: RandomSource;
  readonly rules: GameRules;
}

/** A look at the game: the latest snapshot, the seconds since the last look, and the controller. */
export interface GovernorTurn {
  readonly snapshot: GameSnapshot;
  readonly seconds: number;
  readonly controls: IslandControls;
}

/**
 * The computer governor. It plays one side with nothing but the hand controller a person holds,
 * the disc and the keypad, at a person's pace: its cursor travels the screen like anyone's.
 */
export class Governor {
  private readonly agenda: Agenda;
  private readonly pace: Pace;
  private readonly hand = new Hand();
  private readonly navigator = new Navigator();
  private intent: Intent = IDLE;
  private errand = Errand.none();

  constructor(private readonly setup: GovernorSetup) {
    const strength = PLAYING_STRENGTHS[setup.difficulty];
    this.agenda = new Agenda({ strength, rules: setup.rules });
    this.pace = new Pace({ ...strength, random: setup.random });
  }

  govern(turn: GovernorTurn): void {
    this.hand.grasp(turn.controls);
    const { side, rules } = this.setup;
    const view = new IslandView({ snapshot: turn.snapshot, side, speeds: rules.pilots });
    this.agenda.watch(view);
    if (!view.isPlaying()) return this.standBy();
    if (this.errand.isOver()) this.takeUpNextIntent(view);
    this.errand.carryOn({
      view,
      hand: this.hand,
      navigator: this.navigator,
      seconds: turn.seconds,
    });
  }

  /** The keypad is dead outside a turn, so the governor lets go and starts afresh next turn. */
  private standBy(): void {
    this.hand.letGo();
    this.intent = IDLE;
    this.errand = Errand.none();
  }

  private takeUpNextIntent(view: IslandView): void {
    this.agenda.judge({ intent: this.intent, view });
    this.intent = this.agenda.chooseIntent({ view, whim: this.setup.random.next() });
    this.errand = new Errand(this.intent.stepsAt(this.pace));
  }
}
