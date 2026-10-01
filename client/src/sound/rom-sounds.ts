/** The cartridge's six sounds, each rendered once from its own sound data (see CREDITS.md). */
export type SoundName =
  "razz" | "fishPling" | "rainOnCrop" | "sinkingShip" | "smitten" | "roundOver";

/** The EXEC steps its sounds once a frame: an NTSC frame is 14,934 cycles of the 894,886 Hz CPU. */
export const FRAME_SECONDS = 14_934 / 894_886;

/**
 * How a sound gets the console's one sound chip. Effects queue on priority: one must beat the
 * sound playing, or match it with an even priority (EXEC $1A76-$1A7F); the chip then holds the new
 * one's priority. The piano tune takes the chip outright and leaves the priority as it was.
 */
export interface ChipClaim {
  admits(held: number): boolean;
  /** The priority the chip holds while this sound plays. */
  holds(held: number): number;
}

class Effect implements ChipClaim {
  constructor(private readonly priority: number) {}

  admits(held: number): boolean {
    return this.priority > held || (this.priority === held && this.priority % 2 === 0);
  }

  holds(): number {
    return this.priority;
  }
}

const TUNE: ChipClaim = { admits: () => true, holds: (held) => held };

/** The priorities the cartridge and the EXEC give their sounds. */
const RAZZ_PRIORITY = 0x80; // EXEC $1BBB
const FISH_PLING_PRIORITY = 0x7f; // $5FD8
const RAIN_ON_CROP_PRIORITY = 0x81; // $5F9B
const SINKING_SHIP_PRIORITY = 0x82; // $5FAC
const SMITTEN_PRIORITY = 0x82; // $5FBA

export interface RomSound {
  /** The recording, in public/sounds/. */
  readonly file: string;
  readonly claim: ChipClaim;
  /** How many frames the EXEC holds the chip for it, silent tail and all. */
  readonly frames: number;
}

export const ROM_SOUNDS: Readonly<Record<SoundName, RomSound>> = {
  razz: { file: "razz.mp3", claim: new Effect(RAZZ_PRIORITY), frames: 33 },
  fishPling: { file: "fish-pling.mp3", claim: new Effect(FISH_PLING_PRIORITY), frames: 48 },
  rainOnCrop: { file: "rain-on-crop.mp3", claim: new Effect(RAIN_ON_CROP_PRIORITY), frames: 257 },
  sinkingShip: {
    file: "sinking-ship.mp3",
    claim: new Effect(SINKING_SHIP_PRIORITY),
    frames: 257,
  },
  smitten: { file: "smitten.mp3", claim: new Effect(SMITTEN_PRIORITY), frames: 257 },
  roundOver: { file: "round-over.mp3", claim: TUNE, frames: 315 },
};

export const SOUND_NAMES = Object.keys(ROM_SOUNDS) as readonly SoundName[];
