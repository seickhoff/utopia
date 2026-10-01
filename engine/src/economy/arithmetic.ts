/**
 * Utopia's sums run through the Intellivision EXEC's divide routines, and their rounding shapes
 * every score. Both are sign-correct and answer 0 when asked to divide by 0.
 */

/** X_DIVR: the quotient rounded to the nearest whole number, halves away from zero. */
export function roundedQuotient(dividend: number, divisor: number): number {
  if (divisor === 0) return 0;
  const magnitude = Math.floor(
    (2 * Math.abs(dividend) + Math.abs(divisor)) / (2 * Math.abs(divisor)),
  );
  return Math.sign(dividend) * Math.sign(divisor) * magnitude || 0;
}

/** X_DIV: the quotient with its remainder dropped (rounded toward zero). */
export function truncatedQuotient(dividend: number, divisor: number): number {
  if (divisor === 0) return 0;
  return Math.trunc(dividend / divisor) || 0;
}
