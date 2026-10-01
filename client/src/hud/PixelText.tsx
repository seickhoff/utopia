import { glyphRows } from "../art/pixel-font.js";
import { PixelIcon } from "./PixelIcon.js";

const LETTER_PIXELS = 8;
const LIT = "#";
const DARK = ".";

/** Words in the cartridge's own 8 x 8 letters, crisp at any size, in the colour around them. */
export function PixelText(props: { text: string; className?: string }) {
  return (
    <span className={props.className} role="img" aria-label={props.text}>
      <PixelIcon picture={pictureOf(props.text)} colour="currentColor" className="pixel-text" />
    </span>
  );
}

function pictureOf(text: string): string {
  const letters = [...text].map(glyphRows);
  return Array.from({ length: LETTER_PIXELS }, (_, row) =>
    letters.map((rows) => bitsOf(rows[row])).join(""),
  ).join("/");
}

function bitsOf(bits: number): string {
  return Array.from({ length: LETTER_PIXELS }, (_, col) =>
    bits & (0x80 >> col) ? LIT : DARK,
  ).join("");
}
