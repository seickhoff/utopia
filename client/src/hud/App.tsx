import type { KeypadKey } from "@utopia/engine";
import { useSyncExternalStore, type ReactElement } from "react";
import type { SideButton } from "../board/controller.js";
import type { GameSetup } from "../settings/game-setup-store.js";
import { FinalScreen } from "./FinalScreen.js";
import type { GameView, GameViewSource, Screen } from "./game-view.js";
import { PlayingScreen } from "./PlayingScreen.js";
import { TitleScreen } from "./TitleScreen.js";

/** What the player can do from the HUD, carried out by the composition root. */
export interface GameActions {
  /** Starts a game in the browser, against the computer or no one. */
  play(): void;
  /** Opens a room on the server, for a rival to join with its code. */
  hostOnline(): void;
  joinOnline(room: string): void;
  /** After a rival has gone: the computer takes their island, or both go back to the lobby. */
  carryOn(choice: "computer" | "lobby"): void;
  /** Leaves the game under way, online or not, for the title screen. */
  leaveGame(): void;
  changeSetup(change: Partial<GameSetup>): void;
  backToTitle(): void;
  pressKey(key: KeypadKey): void;
  /** Buys an item from the quick-build menu. */
  buildHere(key: number): void;
  closeBuildMenu(): void;
  toggleView(): void;
  toggleSound(): void;
  /** Names the classic screen's numbers in its border, or takes the names away. */
  toggleLabels(): void;
  holdSideButton(button: SideButton): void;
  releaseSideButton(button: SideButton): void;
}

export interface ScreenProps {
  readonly view: GameView;
  readonly actions: GameActions;
}

const SCREENS: Readonly<Record<Screen, (props: ScreenProps) => ReactElement>> = {
  title: TitleScreen,
  playing: PlayingScreen,
  final: FinalScreen,
};

export function App(props: { readonly store: GameViewSource; readonly actions: GameActions }) {
  const view = useSyncExternalStore(props.store.subscribe, props.store.getView);
  const ShownScreen = SCREENS[view.screen];
  return <ShownScreen view={view} actions={props.actions} />;
}
