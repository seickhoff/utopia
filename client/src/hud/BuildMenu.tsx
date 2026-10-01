import { useState, type MouseEvent, type PointerEvent } from "react";
import type { GameActions } from "./App.js";
import { TILE_SIZE, aimedSlot, ringCentre, slotOffset, type Offset } from "./build-ring.js";
import type { BuildChoiceViewModel, BuildMenuViewModel } from "./game-view.js";
import { PixelIcon } from "./PixelIcon.js";

/** The 3D view's menu shows each item as its model; the classic view keeps the cartridge's art. */
export type MenuLook = "modern" | "classic";

interface MenuProps {
  readonly menu: BuildMenuViewModel;
  readonly actions: GameActions;
  readonly look: MenuLook;
  /** A picture of each item's model, by its key; missing where there is none. */
  readonly portraits: Readonly<Record<number, string>>;
}

type Aim = ReturnType<typeof aimedSlot>;

/** Only the main button buys or closes; the other closes the menu as a right click. */
const MAIN_BUTTON = 0;

/**
 * The quick-build menu, a ring of the nine choices round the clicked square, so none is more than
 * a short move away. Head toward a choice and click, or press on the square, drag toward the
 * choice and let go. The middle names what the pointer heads for, and why it cannot be bought if
 * it cannot; a click in the middle or well away from the ring closes the menu. The board behind
 * the ring is blurred, so the choices stand out from it.
 */
export function BuildMenu({ menu, actions, look, portraits }: MenuProps) {
  const choices = [...menu.here, ...menu.elsewhere];
  const centre = ringCentre({ anchor: { x: menu.x, y: menu.y }, page: pageSize() });
  const { aim, handlers } = useRingPointer({ choices, centre, actions });
  return (
    <div className={`build-layer ${look}`} {...handlers}>
      <Ring choices={choices} centre={centre} aim={aim} look={look} portraits={portraits} />
      <RingLabel at={centre} said={typeof aim === "number" ? choices[aim] : idleLabel(menu)} />
    </div>
  );
}

/** What the middle of the ring says: a name in bold, and its terms beneath. */
interface Said {
  readonly name: string;
  readonly terms: string;
}

/** Before the pointer heads anywhere, the middle shows the gold there is to spend. */
function idleLabel(menu: BuildMenuViewModel): Said {
  return { name: `${menu.gold} gold`, terms: "" };
}

function RingLabel({ at, said }: { at: Offset; said: Said }) {
  return (
    <p className="build-label" style={{ left: at.x, top: at.y }} aria-live="polite">
      <strong>{said.name}</strong>
      {said.terms !== "" && <span>{said.terms}</span>}
    </p>
  );
}

function pageSize() {
  return { width: window.innerWidth, height: window.innerHeight };
}

interface RingPointer {
  readonly choices: readonly BuildChoiceViewModel[];
  readonly centre: Offset;
  readonly actions: GameActions;
}

/**
 * The pointer on the ring: which choice it heads for, and what letting go does. The release of
 * the press that opened the menu keeps it open; a later release in the middle closes it.
 */
function useRingPointer({ choices, centre, actions }: RingPointer) {
  const [aim, setAim] = useState<Aim>("hub");
  const [pressedHere, setPressedHere] = useState(false);
  const aimOf = (event: PointerEvent) => aimedFrom({ event, centre, count: choices.length });
  const release = (event: PointerEvent) => {
    if (event.button !== MAIN_BUTTON) return;
    const target = aimOf(event);
    if (typeof target === "number") return buy(choices[target], actions);
    if (target === "beyond" || pressedHere) actions.closeBuildMenu();
  };
  const handlers = {
    onPointerMove: (event: PointerEvent) => setAim(aimOf(event)),
    onPointerDown: (event: PointerEvent) => {
      setPressedHere(true);
      setAim(aimOf(event));
    },
    onPointerUp: release,
    onContextMenu: (event: MouseEvent) => closeFrom(event, actions),
  };
  return { aim, handlers };
}

function aimedFrom(pointer: { event: PointerEvent; centre: Offset; count: number }): Aim {
  const { event, centre, count } = pointer;
  return aimedSlot({ offset: { x: event.clientX - centre.x, y: event.clientY - centre.y }, count });
}

/** A choice that cannot be bought keeps the menu open, so the label can say why. */
function buy(choice: BuildChoiceViewModel, actions: GameActions): void {
  if (choice.ready) actions.buildHere(choice.key);
}

function closeFrom(event: MouseEvent, actions: GameActions): void {
  event.preventDefault();
  actions.closeBuildMenu();
}

interface RingProps {
  readonly choices: readonly BuildChoiceViewModel[];
  readonly centre: Offset;
  readonly aim: Aim;
  readonly look: MenuLook;
  readonly portraits: Readonly<Record<number, string>>;
}

function Ring({ choices, centre, aim, look, portraits }: RingProps) {
  return (
    <div
      className="build-ring"
      role="menu"
      aria-label="Build here"
      style={{ left: centre.x, top: centre.y }}
    >
      <div className="build-backdrop" />
      {choices.map((choice, slot) => (
        <RingTile
          key={choice.key}
          choice={choice}
          place={{ offset: slotOffset({ slot, count: choices.length }), aimed: aim === slot }}
          art={{ look, portrait: portraits[choice.key] }}
        />
      ))}
    </div>
  );
}

interface TileProps {
  readonly choice: BuildChoiceViewModel;
  readonly place: { readonly offset: Offset; readonly aimed: boolean };
  readonly art: { readonly look: MenuLook; readonly portrait: string | undefined };
}

function RingTile({ choice, place, art }: TileProps) {
  const state = [choice.ready ? "" : "unready", place.aimed ? "aimed" : "", choice.where && "away"];
  const half = TILE_SIZE / 2;
  return (
    <div
      className={["build-tile", ...state].filter(Boolean).join(" ")}
      role="menuitem"
      aria-disabled={!choice.ready}
      aria-label={`${choice.name}, ${choice.terms}`}
      style={{ left: place.offset.x - half, top: place.offset.y - half }}
    >
      <ItemPicture choice={choice} art={art} />
      <span className="build-price">{choice.price}</span>
    </div>
  );
}

/** The item as its 3D model in the modern look, or as the cartridge drew it. */
function ItemPicture({ choice, art }: Pick<TileProps, "choice" | "art">) {
  if (art.look === "modern" && art.portrait !== undefined) {
    return <img className="build-icon portrait" src={art.portrait} alt="" draggable={false} />;
  }
  return <PixelIcon picture={choice.picture} colour={choice.colour} className="build-icon" />;
}
