import { MOB_PICTURES, type KeypadKey } from "@utopia/engine";
import { SIDE_BUTTON_LABELS, type SideButton } from "../board/controller.js";
import type { GameActions } from "./App.js";
import type { HudViewModel, PaletteItemViewModel } from "./game-view.js";
import { PixelIcon } from "./PixelIcon.js";

const CURSOR_PICTURE = MOB_PICTURES[0];
const CURSOR_COLOUR = "#fffcff";

interface OverlayProps {
  readonly hud: HudViewModel;
  readonly actions: GameActions;
}

/** The cartridge's keypad overlay, brought to life: click it, or use the keys it names. */
export function KeypadOverlay({ hud, actions }: OverlayProps) {
  return (
    <aside className="overlay" aria-label="Keypad">
      <header className="overlay-title">UTOPIA</header>
      <p className="razz" aria-live="polite">
        {hud.message}
      </p>
      <div className="overlay-body">
        <SideButtons buttons={["total", "census"]} edge="left" actions={actions} />
        <Keypad hud={hud} onKey={actions.pressKey} />
        <SideButtons buttons={["total", "round"]} edge="right" actions={actions} />
      </div>
      <footer className="overlay-direction">▼ DIRECTION ▼</footer>
    </aside>
  );
}

function Keypad(props: { hud: HudViewModel; onKey: (key: KeypadKey) => void }) {
  const { hud, onKey } = props;
  return (
    <div className="keypad">
      {hud.palette.map((item) => (
        <ItemKey key={item.key} item={item} onKey={onKey} />
      ))}
      <WordKey label="CLEAR" hint="Backspace" onPress={() => onKey("clear")} />
      <CursorKey onPress={() => onKey(0)} />
      <WordKey label="ENTER" hint="Return or Enter" onPress={() => onKey("enter")} />
    </div>
  );
}

function WordKey(props: { label: string; hint: string; onPress: () => void }) {
  return (
    <button className="word-key" onClick={props.onPress} title={props.hint}>
      {props.label}
    </button>
  );
}

/** Key 0, marked on the overlay with the cursor's square: takes out or anchors a boat. */
function CursorKey(props: { onPress: () => void }) {
  return (
    <button
      className="cursor-key"
      onClick={props.onPress}
      title="0 or Space: take out or anchor a boat"
    >
      <PixelIcon picture={CURSOR_PICTURE} colour={CURSOR_COLOUR} className="cursor-icon" />
      <span className="digit">0</span>
    </button>
  );
}

function ItemKey(props: { item: PaletteItemViewModel; onKey: (key: KeypadKey) => void }) {
  const { item } = props;
  const classes = [
    "item-key",
    item.selected ? "selected" : "",
    item.affordable ? "" : "unaffordable",
  ];
  return (
    <button
      className={classes.join(" ").trim()}
      onClick={() => props.onKey(item.key)}
      title={`${item.name}: ${item.price} gold (key ${item.key}; Shift+${item.key} buys at once)`}
    >
      <PixelIcon picture={item.picture} colour={item.colour} className="item-icon" />
      <span className="digit">{item.key}</span>
      <span className="price">{item.price}</span>
    </button>
  );
}

interface SideButtonsProps {
  readonly buttons: readonly SideButton[];
  readonly edge: "left" | "right";
  readonly actions: GameActions;
}

/** The hand controller's side buttons, as the overlay labels them: hold one to show its readout. */
function SideButtons({ buttons, edge, actions }: SideButtonsProps) {
  return (
    <div className={`side-buttons ${edge}`}>
      {buttons.map((button, index) => (
        <button
          key={`${button}-${index}`}
          className="side-button"
          onPointerDown={() => actions.holdSideButton(button)}
          onPointerUp={() => actions.releaseSideButton(button)}
          onPointerLeave={() => actions.releaseSideButton(button)}
        >
          {SIDE_BUTTON_LABELS[button]}
        </button>
      ))}
    </div>
  );
}
