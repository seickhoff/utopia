/** A sprite's place on the playfield, in the cartridge's pixels. */
export interface SpritePlace {
  readonly x: number;
  readonly y: number;
}

/** What the 3D camera comes closer to as it zooms in. */
export interface CameraFocus {
  /** Where that is, with the player's cursor or boat at this place. */
  pointFor(pilot: SpritePlace): SpritePlace;
}
