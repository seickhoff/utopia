import { DISC_RELEASED, type DiscReading, type GameEvent } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { HandController } from "../src/input/hand-controller.js";
import type { SideButton } from "../src/board/controller.js";
import { commandForKey } from "../src/input/key-map.js";
import { NO_OPPONENT } from "../src/session/local-game-session.js";
import { localGameSession } from "../src/session/local-game.js";

function aController() {
  const session = localGameSession({
    options: { rounds: 3, roundSeconds: 30 },
    side: "left",
    seed: 4,
    opponent: () => NO_OPPONENT,
  });
  const discs: DiscReading[] = [];
  const buttons: string[][] = [];
  const controller = new HandController((held: ReadonlySet<SideButton>) => buttons.push([...held]));
  controller.plugInto({
    side: session.side,
    frame: () => session.frame(),
    pressKey: (key) => session.pressKey(key),
    layCursor: (point) => session.layCursor(point),
    setDisc: (disc) => {
      discs.push(disc);
      session.setDisc(disc);
    },
  });
  const press = (code: string, shiftKey = false) =>
    commandForKey({ code, shiftKey }).press(controller);
  const release = (code: string) => commandForKey({ code, shiftKey: false }).release(controller);
  const snapshot = () => {
    session.advanceTo(0);
    return session.frame();
  };
  return { controller, discs, buttons, press, release, snapshot };
}

const typesOf = (events: readonly GameEvent[]) => events.map((event) => event.type);

describe("HandController", () => {
  it("chooses the item a digit stands for", () => {
    const { press, snapshot } = aController();

    press("Digit6");

    expect(snapshot().current.islands.left.selection).toBe("house");
  });

  it("switches to another item without a RAZZ", () => {
    const { press, snapshot } = aController();
    snapshot();

    press("Digit4");
    press("Digit6");

    const frame = snapshot();
    expect([frame.current.islands.left.selection, typesOf(frame.events)]).toEqual([
      "house",
      ["itemSelected", "selectionCancelled", "itemSelected"],
    ]);
  });

  it("buys at once with Shift and a digit", () => {
    const { press, snapshot } = aController();

    press("Digit9", true);

    expect(snapshot().current.islands.left.counts.fishingBoat).toBe(1);
  });

  it("sends the disc when the arrows held change it", () => {
    const { press, discs } = aController();

    press("ArrowUp");
    press("ArrowRight");

    expect(discs).toEqual([0, 2]);
  });

  it("sends nothing when the disc stays the same", () => {
    const { press, discs } = aController();
    press("ArrowUp");

    press("KeyW");

    expect(discs).toEqual([0]);
  });

  it("lets go of the disc when the last arrow is released", () => {
    const { press, release, discs } = aController();
    press("ArrowLeft");

    release("ArrowLeft");

    expect(discs).toEqual([12, DISC_RELEASED]);
  });

  it("tells which side buttons are held", () => {
    const { press, release, buttons } = aController();

    press("KeyC");
    release("KeyC");

    expect(buttons).toEqual([["census"], []]);
  });

  it("lets go of everything at once", () => {
    const { controller, press, discs } = aController();
    press("ArrowDown");

    controller.letGo();

    expect(discs).toEqual([8, DISC_RELEASED]);
  });

  it("controls nothing once unplugged", () => {
    const { controller, press, snapshot } = aController();
    controller.unplug();

    press("Digit1");

    expect(snapshot().current.islands.left.selection).toBe("none");
  });
});
