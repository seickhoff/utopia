import type { GameEvent, Side } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { GameSounds } from "../src/sound/game-sounds.js";
import { leadIn } from "../src/sound/lead-in.js";
import { FRAME_SECONDS, ROM_SOUNDS, type SoundName } from "../src/sound/rom-sounds.js";
import { SoundChannel, type Speaker } from "../src/sound/sound-channel.js";
import { soundOf } from "../src/sound/sound-cues.js";

const MINE: Side = "left";
const THEIRS: Side = "right";
const CELL = { row: 3, col: 4 };

/** The events that make sounds, as the engine reports them. */
const happened = {
  razzed: (side: Side): GameEvent => ({ type: "razzed", side, reason: "cannotAfford" }),
  fished: (): GameEvent => ({ type: "goldEarned", side: MINE, source: "fishing", cell: CELL }),
  rainedOnCrop: (): GameEvent => ({ type: "goldEarned", side: MINE, source: "rain", cell: CELL }),
  smitten: (): GameEvent => ({
    type: "itemSmitten",
    side: MINE,
    item: "school",
    cell: CELL,
    cause: "hurricane",
    casualties: 40,
  }),
  rebelsTook: (destroyed: "house" | "nothing"): GameEvent => ({
    type: "rebelsLanded",
    side: MINE,
    cell: CELL,
    destroyed,
    cause: "unrest",
  }),
  wrecked: (): GameEvent => ({
    type: "boatWrecked",
    side: MINE,
    boat: "fishingBoat",
    cell: CELL,
    cause: "pirate",
  }),
  pilotSank: (): GameEvent => ({
    type: "pilotSinking",
    side: MINE,
    boat: "ptBoat",
    cause: "storm",
  }),
  pirateSank: (): GameEvent => ({ type: "pirateSinking", id: 2 }),
  roundStarted: (): GameEvent => ({ type: "roundStarted", round: 2 }),
};

/** A speaker that keeps a list of what it was asked to play, on a clock the test sets. */
class ListeningSpeaker implements Speaker {
  readonly played: SoundName[] = [];
  play(sound: SoundName): void {
    this.played.push(sound);
  }
}

function channelAt(clock: { seconds: number }) {
  const speaker = new ListeningSpeaker();
  const channel = new SoundChannel({ speaker, clock: () => clock.seconds });
  return { speaker, channel };
}

describe("soundOf", () => {
  it("razzes only the player's own refusals", () => {
    const sounds = [MINE, THEIRS].map((side) =>
      soundOf({ event: happened.razzed(side), mine: MINE }),
    );

    expect(sounds).toEqual(["razz", "silence"]);
  });

  it("plings for a fishing boat's gold and plays the rain for a crop's", () => {
    const sounds = [happened.fished(), happened.rainedOnCrop()].map((event) =>
      soundOf({ event, mine: MINE }),
    );

    expect(sounds).toEqual(["fishPling", "rainOnCrop"]);
  });

  it("plays the sinking ship for every boat that goes down", () => {
    const sounds = [happened.wrecked(), happened.pilotSank(), happened.pirateSank()].map((event) =>
      soundOf({ event, mine: MINE }),
    );

    expect(sounds).toEqual(["sinkingShip", "sinkingShip", "sinkingShip"]);
  });

  it("smites when weather or rebels destroy a building, and only then", () => {
    const events = [
      happened.smitten(),
      happened.rebelsTook("house"),
      happened.rebelsTook("nothing"),
    ];

    expect(events.map((event) => soundOf({ event, mine: MINE }))).toEqual([
      "smitten",
      "smitten",
      "silence",
    ]);
  });

  it("keeps quiet for everything else", () => {
    expect(soundOf({ event: happened.roundStarted(), mine: MINE })).toBe("silence");
  });
});

describe("SoundChannel", () => {
  it("lets a more important sound take over the chip", () => {
    const { speaker, channel } = channelAt({ seconds: 0 });

    channel.play("fishPling");
    channel.play("sinkingShip");

    expect(speaker.played).toEqual(["fishPling", "sinkingShip"]);
  });

  it("turns away a less important sound while one plays (EXEC $1A78)", () => {
    const { speaker, channel } = channelAt({ seconds: 0 });

    channel.play("sinkingShip");
    channel.play("fishPling");

    expect(speaker.played).toEqual(["sinkingShip"]);
  });

  it("lets a sound of the same even priority take over (EXEC $1A7C)", () => {
    const { speaker, channel } = channelAt({ seconds: 0 });

    channel.play("smitten");
    channel.play("sinkingShip");

    expect(speaker.played).toEqual(["smitten", "sinkingShip"]);
  });

  it("turns away a sound of the same odd priority (EXEC $1A7D)", () => {
    const { speaker, channel } = channelAt({ seconds: 0 });

    channel.play("rainOnCrop");
    channel.play("rainOnCrop");

    expect(speaker.played).toEqual(["rainOnCrop"]);
  });

  it("frees the chip once a sound has run its frames", () => {
    const clock = { seconds: 0 };
    const { speaker, channel } = channelAt(clock);

    channel.play("sinkingShip");
    clock.seconds = ROM_SOUNDS.sinkingShip.frames * FRAME_SECONDS;
    channel.play("fishPling");

    expect(speaker.played).toEqual(["sinkingShip", "fishPling"]);
  });

  it("always plays the year-end tune, which keeps the chip as it found it", () => {
    const { speaker, channel } = channelAt({ seconds: 0 });

    ["sinkingShip", "roundOver", "fishPling", "smitten"].forEach((sound) =>
      channel.play(sound as SoundName),
    );

    expect(speaker.played).toEqual(["sinkingShip", "roundOver", "smitten"]);
  });
});

describe("GameSounds", () => {
  it("plays what a frame's events call for, in order", () => {
    const { speaker, channel } = channelAt({ seconds: 0 });
    const sounds = new GameSounds(channel);

    sounds.hear([happened.roundStarted(), happened.fished(), happened.wrecked()], MINE);

    expect(speaker.played).toEqual(["fishPling", "sinkingShip"]);
  });
});

describe("leadIn", () => {
  it("measures the silence an encoder puts before the first sound", () => {
    const samples = new Float32Array([0, 0, 0, 0.0004, 0.2, -0.3]);

    expect(leadIn({ samples, sampleRate: 4 })).toBe(1);
  });

  it("finds no lead-in in a sound that starts at once", () => {
    expect(leadIn({ samples: new Float32Array([0.5, 0]), sampleRate: 4 })).toBe(0);
  });
});
