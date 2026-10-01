import {
  BOAT_KEY,
  DISC_RELEASED,
  NO_SELECTION,
  itemOnKey,
  keyOf,
  type DiscReading,
  type GameSnapshot,
  type ItemKind,
  type KeypadKey,
  type PixelPoint,
  type Selection,
} from "@utopia/engine";
import type { GameSession } from "../session/game-session.js";
import { discFromArrows } from "./key-disc.js";
import type { SideButton } from "../board/controller.js";
import type { Arrow, ControllerHands } from "./key-map.js";

type SessionControls = Pick<GameSession, "side" | "setDisc" | "pressKey" | "layCursor" | "frame">;

interface Belief {
  readonly selection: Selection;
  /** The snapshot the belief was formed against; a newer one knows better. */
  readonly asOf: GameSnapshot;
}

/**
 * An Intellivision hand controller played from the keyboard. Arrows held together make the disc,
 * sent only when it changes, as the EXEC reports disc events. Choosing a second item switches to
 * it (by clearing the first) rather than earning the original's RAZZ.
 */
export class HandController implements ControllerHands {
  private session: SessionControls | "unplugged" = "unplugged";
  private readonly arrows = new Set<Arrow>();
  private readonly buttons = new Set<SideButton>();
  private disc: DiscReading = DISC_RELEASED;
  private belief: Belief | "none" = "none";

  constructor(private readonly onSideButtons: (held: ReadonlySet<SideButton>) => void) {}

  plugInto(session: SessionControls): void {
    this.session = session;
    this.belief = "none";
  }

  unplug(): void {
    this.letGo();
    this.session = "unplugged";
  }

  pressKeypad(key: KeypadKey): void {
    if (typeof key === "number" && key !== BOAT_KEY) return this.choose(itemOnKey(key));
    this.send(key);
    if (key !== BOAT_KEY) this.believe(NO_SELECTION);
  }

  quickBuy(key: number): void {
    this.choose(itemOnKey(key));
    this.pressKeypad("enter");
  }

  /** A disc reading from something steering for the player (the mouse); held arrows win. */
  steer(reading: DiscReading): void {
    if (this.arrows.size > 0 || reading === this.disc) return;
    this.disc = reading;
    if (this.session !== "unplugged") this.session.setDisc(reading);
  }

  /** Puts the cursor straight onto a point, as the mouse does square by square. */
  layCursor(point: PixelPoint): void {
    if (this.session !== "unplugged") this.session.layCursor(point);
  }

  hasArrowsHeld(): boolean {
    return this.arrows.size > 0;
  }

  /** Which way the disc is held, by the arrows or by whatever steers for the player. */
  heading(): DiscReading {
    return this.disc;
  }

  holdArrow(arrow: Arrow): void {
    this.arrows.add(arrow);
    this.sendDisc();
  }

  releaseArrow(arrow: Arrow): void {
    this.arrows.delete(arrow);
    this.sendDisc();
  }

  holdSideButton(button: SideButton): void {
    this.buttons.add(button);
    this.onSideButtons(new Set(this.buttons));
  }

  releaseSideButton(button: SideButton): void {
    this.buttons.delete(button);
    this.onSideButtons(new Set(this.buttons));
  }

  /** Everything let go at once, as when the window loses focus. */
  letGo(): void {
    this.arrows.clear();
    this.buttons.clear();
    this.sendDisc();
    this.onSideButtons(new Set());
  }

  private choose(item: ItemKind): void {
    const chosen = this.selection();
    if (chosen === item) return;
    if (chosen !== NO_SELECTION) this.send("clear");
    this.send(keyOf(item));
    this.believe(item);
  }

  /** The item chosen and not yet bought, as far as this controller knows. */
  selection(): Selection {
    if (this.session === "unplugged") return NO_SELECTION;
    const current = this.session.frame().current;
    if (this.belief !== "none" && this.belief.asOf === current) return this.belief.selection;
    return current.islands[this.session.side].selection;
  }

  private believe(selection: Selection): void {
    if (this.session === "unplugged") return;
    this.belief = { selection, asOf: this.session.frame().current };
  }

  private send(key: KeypadKey): void {
    if (this.session !== "unplugged") this.session.pressKey(key);
  }

  private sendDisc(): void {
    const disc = discFromArrows(this.arrows);
    if (disc === this.disc) return;
    this.disc = disc;
    if (this.session !== "unplugged") this.session.setDisc(disc);
  }
}
