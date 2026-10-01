/** What a control does: the keys or fingers that work it, and what they do. */
interface ControlUse {
  readonly controls: readonly string[];
  readonly does: string;
}

/**
 * The 3D view's keys: the hand controller's, and the camera's own. The side buttons and the
 * labels are left out, as they change only the classic screen.
 */
const KEY_USES: readonly ControlUse[] = [
  { controls: ["Click"], does: "your land to build" },
  { controls: ["Arrows"], does: "move" },
  { controls: ["1–9"], does: "choose" },
  { controls: ["Enter"], does: "build" },
  { controls: ["0"], does: "boat" },
  { controls: ["Backspace"], does: "clear" },
  { controls: ["Esc"], does: "pause" },
  { controls: ["Q", "E"], does: "tilt" },
  { controls: ["+", "−"], does: "or scroll to zoom" },
  { controls: ["V"], does: "classic view" },
  { controls: ["M"], does: "sound" },
];

/** The same, on a touch screen: what a finger does on the board, and what two do. */
const TOUCH_USES: readonly ControlUse[] = [
  { controls: ["Tap"], does: "your land to build" },
  { controls: ["Tap"], does: "your boat, then the sea, to sail" },
  { controls: ["Drag"], does: "to steer" },
  { controls: ["Pinch"], does: "to zoom" },
  { controls: ["Two fingers"], does: "up or down to tilt" },
];

/**
 * The controls in a line along the bottom of the 3D view, out of the way of the clicks: the keys,
 * or on a touch screen the fingers. The stylesheet shows the one that suits the screen.
 */
export function ControlStrip() {
  return (
    <>
      <UseLine className="control-strip keys" label="Keys" uses={KEY_USES} />
      <UseLine className="control-strip touch" label="Touch" uses={TOUCH_USES} />
    </>
  );
}

function UseLine(props: { className: string; label: string; uses: readonly ControlUse[] }) {
  return (
    <p className={props.className} aria-label={props.label}>
      {props.uses.map((use) => (
        <span key={use.does}>
          {use.controls.map((control) => (
            <kbd key={control}>{control}</kbd>
          ))}{" "}
          {use.does}
        </span>
      ))}
    </p>
  );
}
