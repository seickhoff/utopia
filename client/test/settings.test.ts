import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETUP,
  GameSetupStore,
  isNamed,
  sanitizeSetup,
} from "../src/settings/game-setup-store.js";
import { BrowserStore, MemoryStore } from "../src/settings/key-value-store.js";

describe("GameSetupStore", () => {
  it("starts from the manual's advice and a computer rival", () => {
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
      view: "diorama",
      sound: "on",
      labels: "on",
      name: "",
    });
  });

  it("replaces an unknown opponent", () => {
    const setup = sanitizeSetup({ opponent: "grandmaster" as never });

    expect(setup.opponent).toBe("normal");
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

describe("BrowserStore", () => {
  it("keeps choices in memory when the browser refuses storage", () => {
    const store = new BrowserStore(() => {
      throw new Error("storage disabled");
    });

    store.write("key", "value");

    expect(store.read("key")).toBe("value");
  });
});
