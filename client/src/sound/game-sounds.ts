import type { GameEvent, Side } from "@utopia/engine";
import type { SoundChannel } from "./sound-channel.js";
import { soundOf } from "./sound-cues.js";

/** A game's sounds: each frame's events, heard from the player's island, played on the one chip. */
export class GameSounds {
  constructor(private readonly channel: SoundChannel) {}

  hear(events: readonly GameEvent[], mine: Side): void {
    for (const event of events) {
      const cue = soundOf({ event, mine });
      if (cue !== "silence") this.channel.play(cue);
    }
  }
}
