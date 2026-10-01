import type { SoundSetting } from "../settings/game-setup-store.js";
import { leadIn } from "./lead-in.js";
import { ROM_SOUNDS, SOUND_NAMES, type SoundName } from "./rom-sounds.js";
import type { Speaker } from "./sound-channel.js";

const LEVELS: Readonly<Record<SoundSetting, number>> = { on: 1, off: 0 };

/** Where the recordings are served from, and how loud to play them. */
interface OutputSetup {
  readonly folder: string;
  readonly level: number;
}

/** The sound coming out of the browser, before and after the player has let it start. */
interface Output {
  /** This output, made ready to play: browsers start audio only after a click or a key. */
  ready(setup: OutputSetup): Output;
  play(sound: SoundName): void;
  setLevel(level: number): void;
}

/** Special Case: no audio yet, or none to be had. Everything asked of it goes unheard. */
const UNHEARD: Output = {
  ready: (setup) => {
    try {
      return new LiveOutput(setup);
    } catch {
      return UNHEARD;
    }
  },
  play: () => {},
  setLevel: () => {},
};

/** A recording decoded for playing, and how far into it its sound begins. */
interface Take {
  readonly buffer: AudioBuffer;
  readonly offset: number;
}

const NOTHING_PLAYING = { stop: () => {} };

/** Web Audio, playing one recording at a time through a volume control. */
class LiveOutput implements Output {
  private readonly context = new AudioContext();
  private readonly volume = this.context.createGain();
  private readonly takes = new Map<SoundName, Take>();
  private playing: { stop(): void } = NOTHING_PLAYING;

  constructor(setup: OutputSetup) {
    this.volume.gain.value = setup.level;
    this.volume.connect(this.context.destination);
    SOUND_NAMES.forEach((sound) => void this.load({ sound, folder: setup.folder }));
  }

  ready(): Output {
    void this.context.resume();
    return this;
  }

  play(sound: SoundName): void {
    const take = this.takes.get(sound);
    if (take === undefined) return;
    this.playing.stop();
    const source = this.context.createBufferSource();
    source.buffer = take.buffer;
    source.connect(this.volume);
    source.start(0, take.offset);
    this.playing = source;
  }

  setLevel(level: number): void {
    this.volume.gain.value = level;
  }

  private async load(recording: { sound: SoundName; folder: string }): Promise<void> {
    const { sound, folder } = recording;
    try {
      const response = await fetch(folder + ROM_SOUNDS[sound].file);
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
      const samples = buffer.getChannelData(0);
      this.takes.set(sound, { buffer, offset: leadIn({ samples, sampleRate: buffer.sampleRate }) });
    } catch (error) {
      console.warn(`The ${sound} sound could not be loaded`, error);
    }
  }
}

/** The cartridge's sounds, played in the browser: the one place that knows Web Audio. */
export class WebAudioSpeaker implements Speaker {
  private output: Output = UNHEARD;
  private level = LEVELS.on;

  /** `folder` is the URL the recordings are served under, ending in a slash. */
  constructor(private readonly folder: string) {}

  /** Starts the audio and loads the recordings. Call it from a click or a key press. */
  prepare(): void {
    this.output = this.output.ready({ folder: this.folder, level: this.level });
  }

  play(sound: SoundName): void {
    this.output.play(sound);
  }

  follow(setting: SoundSetting): void {
    this.level = LEVELS[setting];
    this.output.setLevel(this.level);
  }
}
