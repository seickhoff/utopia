import { FRAME_SECONDS, ROM_SOUNDS, type SoundName } from "./rom-sounds.js";

/** Port: what makes a sound heard. A new sound cuts off the one before, as on the one chip. */
export interface Speaker {
  play(sound: SoundName): void;
}

export interface ChannelSetup {
  readonly speaker: Speaker;
  /** Seconds, from any fixed start. */
  readonly clock: () => number;
}

/** What the chip is doing: playing a sound of this priority until this time, or nothing. */
interface Hold {
  readonly priority: number;
  readonly until: number;
}

/** Special Case: a quiet chip, which any sound may have. */
const QUIET: Hold = { priority: 0, until: -Infinity };

/** The console's single sound chip: one sound at a time, taken by the EXEC's priority rule. */
export class SoundChannel {
  private hold: Hold = QUIET;

  constructor(private readonly setup: ChannelSetup) {}

  /** Plays a sound if the chip will take it from the one playing; otherwise it goes unheard. */
  play(sound: SoundName): void {
    const now = this.setup.clock();
    const held = now < this.hold.until ? this.hold.priority : QUIET.priority;
    const { claim, frames } = ROM_SOUNDS[sound];
    if (!claim.admits(held)) return;
    this.hold = { priority: claim.holds(held), until: now + frames * FRAME_SECONDS };
    this.setup.speaker.play(sound);
  }
}
