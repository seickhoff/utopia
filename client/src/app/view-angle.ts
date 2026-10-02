import type { CameraFocus, SpritePlace } from "../board/camera-focus.js";

/** How the player is looking at the 3D islands: how steeply, from which way, how close, and at what. */
export interface ViewAngleReading {
  readonly pitchDegrees: number;
  /** Which way across the sea: 0 north, as the cartridge's screen looks; it grows turning right, and is never wrapped. */
  readonly headingDegrees: number;
  /** 1 shows the whole sea; larger comes closer to the focus. */
  readonly zoom: number;
  readonly focus: CameraFocus;
}

const FLATTEST = 10;
const STEEPEST = 80;
const WHOLE_SEA = 1;
const CLOSEST = 4;

/** Special Case: in play, the camera comes closer to the player's own cursor or boat. */
const THE_PILOT: CameraFocus = { pointFor: (pilot) => pilot };

/** A point the player looks at, wherever their cursor or boat may be. */
class LookedAt implements CameraFocus {
  constructor(private readonly place: SpritePlace) {}

  pointFor(): SpritePlace {
    return this.place;
  }
}

/** The angle the player has chosen with the mouse wheel and the camera keys, kept within bounds. */
export class ViewAngle {
  private pitchDegrees: number;
  private headingDegrees = 0;
  private zoom = WHOLE_SEA;
  private focus: CameraFocus = THE_PILOT;

  constructor(start: { pitchDegrees: number }) {
    this.pitchDegrees = start.pitchDegrees;
  }

  /** Positive tilts toward looking straight down; negative, toward the horizon. */
  tiltBy(degrees: number): void {
    this.pitchDegrees = Math.min(STEEPEST, Math.max(FLATTEST, this.pitchDegrees + degrees));
  }

  /** Positive turns the view right; negative, left. As far round as the player likes. */
  turnBy(degrees: number): void {
    this.headingDegrees += degrees;
  }

  /** Above 1 comes closer; below 1 draws back. */
  zoomBy(factor: number): void {
    this.zoom = Math.min(CLOSEST, Math.max(WHOLE_SEA, this.zoom * factor));
  }

  /** The camera comes closer to this point rather than the player's cursor or boat. */
  lookAt(place: SpritePlace): void {
    this.focus = new LookedAt(place);
  }

  /** The camera comes closer to the player's cursor or boat again. */
  followPilot(): void {
    this.focus = THE_PILOT;
  }

  current(): ViewAngleReading {
    return {
      pitchDegrees: this.pitchDegrees,
      headingDegrees: this.headingDegrees,
      zoom: this.zoom,
      focus: this.focus,
    };
  }
}
