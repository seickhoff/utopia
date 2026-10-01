/** Quieter than this, a sample is the encoder's padding rather than the sound. */
const AUDIBLE = 0.001;

export interface Recording {
  readonly samples: Float32Array;
  readonly sampleRate: number;
}

/**
 * The silence before a recording's first audible sample, in seconds. MP3 encoders pad the start,
 * and playing from past it puts each sound on the moment that calls for it.
 */
export function leadIn(recording: Recording): number {
  const first = recording.samples.findIndex((sample) => Math.abs(sample) > AUDIBLE);
  return Math.max(0, first) / recording.sampleRate;
}
