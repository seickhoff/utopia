import { DEFAULT_RULES } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { Agenda } from "../src/agenda.js";
import { PLAYING_STRENGTHS, type DifficultyName } from "../src/difficulty.js";
import type { IslandView } from "../src/island-view.js";
import { aPosition } from "./support/position.js";

/** A whim high enough that no governor blunders. */
const STEADY = 0.99;

function anAgenda(difficulty: DifficultyName = "normal"): Agenda {
  return new Agenda({ strength: PLAYING_STRENGTHS[difficulty], rules: DEFAULT_RULES });
}

function choiceOf(agenda: Agenda, view: IslandView): string {
  agenda.watch(view);
  return agenda.chooseIntent({ view, whim: STEADY }).key;
}

const opening = () => aPosition().inRound(1, { rounds: 10 });

describe("the agenda", () => {
  it("buys a fishing boat before anything else while it has none", () => {
    expect(choiceOf(anAgenda(), opening().view("left"))).toBe("buy fishingBoat");
  });

  it("builds once it has its fishing boat", () => {
    const view = opening().withBoat("left", "fishingBoat").view("left");

    expect(choiceOf(anAgenda(), view)).toMatch(/^build /);
  });

  it("comes ashore when there is something worth building", () => {
    const priceOfBoatAndCrops = 45;
    const view = opening().withGold(priceOfBoatAndCrops).sailing("left").view("left");

    expect(choiceOf(anAgenda(), view)).toMatch(/^anchor at /);
  });

  it("stays out fishing while there is nothing to buy", () => {
    const view = opening().withGold(25).sailing("left").view("left");

    expect(choiceOf(anAgenda(), view)).toBe("fish");
  });

  it("answers a rebel band landed on its island before building", () => {
    const agenda = anAgenda();
    const calm = opening().withGold(200).withBoat("left", "fishingBoat");
    agenda.watch(calm.view("left"));

    const provoked = calm.withRebelsLandedBy("right").view("left");

    expect(choiceOf(agenda, provoked)).toBe("plant rebel");
  });

  it("does not try again an order the game refused this round", () => {
    const agenda = anAgenda();
    const view = opening().view("left");
    agenda.watch(view);
    const refused = agenda.chooseIntent({ view, whim: STEADY });

    agenda.judge({ intent: refused, view });

    expect(choiceOf(agenda, view)).not.toBe(refused.key);
  });

  it("tries a refused order again in a later round", () => {
    const agenda = anAgenda();
    const view = opening().view("left");
    agenda.watch(view);
    const refused = agenda.chooseIntent({ view, whim: STEADY });
    agenda.judge({ intent: refused, view });

    expect(choiceOf(agenda, opening().inRound(2, { rounds: 10 }).view("left"))).toBe(refused.key);
  });

  it("idles when there is nothing it can do", () => {
    const view = opening().withGold(25).withBoat("left", "fishingBoat").view("left");

    expect(choiceOf(anAgenda("easy"), view)).toBe("idle");
  });
});
