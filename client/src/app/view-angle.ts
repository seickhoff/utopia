/** How the player is looking at the 3D islands: how steeply, and how close. */
export interface ViewAngleReading {
  readonly pitchDegrees: number;
  /** 1 shows the whole sea; larger comes closer, following the player's cursor or boat. */
  readonly zoom: number;
}

const FLATTEST = 10;
const STEEPEST = 80;
const WHOLE_SEA = 1;
const CLOSEST = 4;

/** The angle the player has chosen with the mouse wheel and the camera keys, kept within bounds. */
export class ViewAngle {
  private pitchDegrees: number;
  private zoom = WHOLE_SEA;

  constructor(start: { pitchDegrees: number }) {
    this.pitchDegrees = start.pitchDegrees;
  }

  /** Positive tilts toward looking straight down; negative, toward the horizon. */
  tiltBy(degrees: number): void {
    this.pitchDegrees = Math.min(STEEPEST, Math.max(FLATTEST, this.pitchDegrees + degrees));
  }

  /** Above 1 comes closer; below 1 draws back. */
  zoomBy(factor: number): void {
    this.zoom = Math.min(CLOSEST, Math.max(WHOLE_SEA, this.zoom * factor));
  }

  current(): ViewAngleReading {
    return { pitchDegrees: this.pitchDegrees, zoom: this.zoom };
  }
}
