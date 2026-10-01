import { sanitizeGameOptions } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import {
  GAME_PRESETS,
  PRESET_OPTIONS,
  gameMinutes,
  presetOf,
} from "../src/settings/game-presets.js";
import {
  DEFAULT_SETUP,
  GameSetupStore,
  VIEW_MODES,
  isNamed,
  sanitizeSetup,
} from "../src/settings/game-setup-store.js";
import { BrowserStore, MemoryStore } from "../src/settings/key-value-store.js";

describe("GameSetupStore", () => {
  it("starts from the default setup when nothing was stored", () => {
    expect(new GameSetupStore(new MemoryStore()).load()).toEqual(DEFAULT_SETUP);
  });

  it("remembers the last game's setup", () => {
    const store = new GameSetupStore(new MemoryStore());

    store.save({
      rounds: 7,
      roundSeconds: 90,
      opponent: "hard",
      view: "classic",
      sound: "off",
      labels: "off",
      name: "Ada",
    });

    expect(store.load()).toEqual({
      rounds: 7,
      roundSeconds: 90,
      opponent: "hard",
      view: "classic",
      sound: "off",
      labels: "off",
      name: "Ada",
    });
  });

  it("ignores a stored setup that is not an object", () => {
    const memory = new MemoryStore();
    memory.write("utopia.setup", "null");

    expect(new GameSetupStore(memory).load()).toEqual(DEFAULT_SETUP);
  });

  it("ignores a stored setup it cannot read", () => {
    const memory = new MemoryStore();
    memory.write("utopia.setup", "{nonsense");

    expect(new GameSetupStore(memory).load()).toEqual(DEFAULT_SETUP);
  });
});

describe("sanitizeSetup", () => {
  it("keeps the options within the cartridge's limits", () => {
    expect(sanitizeSetup({ rounds: 80, roundSeconds: 5, opponent: "easy" })).toEqual({
      rounds: 50,
      roundSeconds: 30,
      opponent: "easy",
      view: "classic",
      sound: "on",
      labels: "on",
      name: "",
    });
  });

  it("fills a term that was never stored from the classic preset", () => {
    const setup = sanitizeSetup({ roundSeconds: 60 });

    expect([setup.rounds, setup.roundSeconds]).toEqual([PRESET_OPTIONS.classic.rounds, 60]);
  });

  it("replaces an unknown opponent", () => {
    const setup = sanitizeSetup({ opponent: "grandmaster" as never });

    expect(setup.opponent).toBe("normal");
  });

  it("shows the classic screen unless the diorama was chosen", () => {
    const setup = sanitizeSetup({ view: "hologram" as never });

    expect(setup.view).toBe("classic");
  });

  it("offers the classic screen first, then the diorama", () => {
    expect(VIEW_MODES).toEqual(["classic", "diorama"]);
  });

  it("names the screen's numbers unless the labels were turned off", () => {
    const setup = sanitizeSetup({ labels: "maybe" as never });

    expect(setup.labels).toBe("on");
  });

  it("keeps no more of a name than the island's label can print", () => {
    const setup = sanitizeSetup({ name: "Bartholomew the Great" });

    expect(setup.name).toBe("Bartholom");
  });

  it("needs a name before a game can start", () => {
    const names = ["", "   ", "Ada"].map((name) => isNamed({ ...DEFAULT_SETUP, name }));

    expect(names).toEqual([false, false, true]);
  });

  it("forgets a name that is not text", () => {
    expect(sanitizeSetup({ name: 42 as never }).name).toBe("");
  });

  it("turns the sound on unless it was turned off", () => {
    const setup = sanitizeSetup({ sound: "loud" as never });

    expect(setup.sound).toBe("on");
  });
});

describe("the game presets", () => {
  const presetOptions = () => GAME_PRESETS.map((preset) => PRESET_OPTIONS[preset]);

  it("offers five lengths of game, from a quick match to a long session", () => {
    expect(presetOptions()).toEqual([
      { rounds: 20, roundSeconds: 30 },
      { rounds: 20, roundSeconds: 45 },
      { rounds: 30, roundSeconds: 30 },
      { rounds: 30, roundSeconds: 45 },
      { rounds: 40, roundSeconds: 45 },
    ]);
  });

  it("keeps every preset within the cartridge's limits", () => {
    expect(presetOptions().map(sanitizeGameOptions)).toEqual(presetOptions());
  });

  it("knows each preset by its term and its year", () => {
    expect(presetOptions().map(presetOf)).toEqual(GAME_PRESETS);
  });

  it("starts a new player on the classic preset", () => {
    expect(presetOf(DEFAULT_SETUP)).toBe("classic");
  });

  it("calls a term and a year set by hand custom", () => {
    expect(presetOf({ rounds: 20, roundSeconds: 60 })).toBe("custom");
  });

  it("times a game as every year's seconds end to end", () => {
    expect(presetOptions().map(gameMinutes)).toEqual([10, 15, 15, 22.5, 30]);
  });
});

describe("BrowserStore", () => {
  it("keeps choices in memory when the browser refuses storage", () => {
    const store = new BrowserStore(() => {
      throw new Error("storage disabled");
    });

    store.write("key", "value");

    expect(store.read("key")).toBe("value");
  });
});
