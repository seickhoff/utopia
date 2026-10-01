/** A number from 0 to 1 that tells one sprite's look from another's, fixed for its whole life. */
export function spriteSeed(id: number): number {
  const mixed = Math.sin(id * 12.9898 + 4.1) * 43758.5453;
  return mixed - Math.floor(mixed);
}
