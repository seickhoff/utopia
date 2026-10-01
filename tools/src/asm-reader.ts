/** Reads tables and pictures out of the annotated as1600 listing of the Utopia cartridge. */

const LABEL = /^([A-Za-z_.][\w.]*)/;
const DECLE = /^\s+DECLE\s+([^;]*)/;
const GFX_ROW = /^\s+gfx_row\s+"([.#]{8})"/;
const ROWS_PER_PICTURE = 8;

/** The DECLE words listed under a label, as written (`$002A`, `50`, `C_DGR`). */
export function declesAfter(listing: string, label: string): string[] {
  return linesAfter(listing, label)
    .map((line) => DECLE.exec(line)?.[1] ?? "")
    .flatMap((words) => words.split(","))
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
}

/** The 8-row pictures after a section label, each row joined by "/" ("#" is a lit pixel). */
export function picturesAfter(listing: string, section: string): string[] {
  const rows = linesAfter(listing, section).flatMap((line) => GFX_ROW.exec(line)?.[1] ?? []);
  if (rows.length % ROWS_PER_PICTURE !== 0) {
    throw new Error(`${section} does not hold whole pictures (${rows.length} rows)`);
  }
  return picturesFrom(rows);
}

function picturesFrom(rows: readonly string[]): string[] {
  const pictures: string[] = [];
  for (let first = 0; first < rows.length; first += ROWS_PER_PICTURE) {
    pictures.push(rows.slice(first, first + ROWS_PER_PICTURE).join("/"));
  }
  return pictures;
}

/**
 * The lines from a label up to (not including) the next label. The label itself is blanked out of
 * its own line, which may carry the first entry (`PRICES: DECLE 50`).
 */
function linesAfter(listing: string, label: string): string[] {
  const lines = listing.split("\n");
  const start = lines.findIndex((line) => labelOf(line) === label);
  if (start < 0) throw new Error(`The listing has no label ${label}`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => labelOf(line) !== "");
  const own = " " + lines[start].replace(LABEL, "").replace(/^:/, "");
  return [own, ...(end < 0 ? rest : rest.slice(0, end))];
}

function labelOf(line: string): string {
  return LABEL.exec(line)?.[1] ?? "";
}
