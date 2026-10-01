interface KeyUse {
  readonly keys: readonly string[];
  readonly does: string;
}

/**
 * The 3D view's keys: the hand controller's, and the camera's own. The side buttons and the
 * labels are left out, as they change only the classic screen.
 */
const KEY_USES: readonly KeyUse[] = [
  { keys: ["Click"], does: "your land to build" },
  { keys: ["Arrows"], does: "move" },
  { keys: ["1–9"], does: "choose" },
  { keys: ["Enter"], does: "build" },
  { keys: ["0"], does: "boat" },
  { keys: ["Esc"], does: "clear" },
  { keys: ["Q", "E"], does: "tilt" },
  { keys: ["+", "−"], does: "or scroll to zoom" },
  { keys: ["V"], does: "classic view" },
  { keys: ["M"], does: "sound" },
];

/** The keys in a line along the bottom of the 3D view, out of the way of the clicks. */
export function KeyStrip() {
  return (
    <p className="key-strip" aria-label="Keys">
      {KEY_USES.map((use) => (
        <span key={use.does}>
          {use.keys.map((key) => (
            <kbd key={key}>{key}</kbd>
          ))}{" "}
          {use.does}
        </span>
      ))}
    </p>
  );
}
