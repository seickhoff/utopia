/** A message as it arrives: any JSON object at all, until each field is checked. */
export type Raw = Readonly<Record<string, unknown>>;

/** Special Case: what a codec returns for anything it will not read. */
export const INVALID = "invalid";
export type Invalid = typeof INVALID;

export const isString = (value: unknown): value is string => typeof value === "string";
export const isSide = (value: unknown): value is "left" | "right" =>
  value === "left" || value === "right";
/** A JSON object: not an array, and not the JSON word for nothing (which typeof calls an object). */
export const isObject = (value: unknown): value is Raw =>
  typeof value === "object" && Boolean(value) && !Array.isArray(value);

/** The JSON object in a message no longer than `longest`, or INVALID. */
export function parsed(text: string, longest: number): Raw | Invalid {
  if (text.length > longest) return INVALID;
  try {
    const value: unknown = JSON.parse(text);
    return isObject(value) ? value : INVALID;
  } catch {
    return INVALID;
  }
}

/** A reader for each type of message, chosen only by a type the table really has. */
export function readerFor<R>(readers: Readonly<Record<string, R>>, type: unknown): R | Invalid {
  return typeof type === "string" && Object.hasOwn(readers, type) ? readers[type] : INVALID;
}
