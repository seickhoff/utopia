/** As many letters as the classic screen's border prints over one island, with a gap between. */
export const NAME_LENGTH = 9;
/** The computer's name: King Utopus, who founded the island in Thomas More's Utopia (1516). */
export const COMPUTER_NAME = "UTOPUS";
const UNNAMED = "GOVERNOR";

/** A governor's name as the cartridge's letters print it: capitals, digits and single spaces. */
export function governorName(raw: string): string {
  const printable = raw
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const kept = printable.slice(0, NAME_LENGTH).trim();
  return kept === "" ? UNNAMED : kept;
}
