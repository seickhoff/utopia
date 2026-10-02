/** A number from 0 to 1 for any number, always the same for the same one: shapes that vary but never change. */
export function pseudoRandom(value: number): number {
  const mixed = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return mixed - Math.floor(mixed);
}
