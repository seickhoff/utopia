import type { ReactElement } from "react";
import type { ViewMode } from "../settings/game-setup-store.js";
import type { ScreenProps } from "./App.js";
import { IslandPanel, ViewToggles } from "./PlayingScreen.js";
import { VintageFinal } from "./VintageScreen.js";

const LAYOUTS: Readonly<Record<ViewMode, (props: ScreenProps) => ReactElement>> = {
  diorama: ModernFinal,
  classic: VintageFinal,
};

/**
 * The end of the term: the islands as they were left, with who won and what next in the margins,
 * never over the picture.
 */
export function FinalScreen(props: ScreenProps) {
  const Layout = LAYOUTS[props.view.setup.view];
  return (
    <div className="final">
      <Layout view={props.view} actions={props.actions} />
    </div>
  );
}

/** The 3D view's end: both islands' figures stay along the top, the verdict in the clock's place. */
function ModernFinal({ view, actions }: ScreenProps) {
  const [left, right] = view.hud.panels;
  return (
    <header className="top-bar">
      {left && <IslandPanel panel={left} mine={view.hud.mine === "left"} />}
      <div className="clock verdict">
        <span className="year">Final score</span>
        <strong className="headline">{view.final.headline}</strong>
        <div className="toggles">
          <button className="view-toggle again" onClick={actions.play}>
            Run again
          </button>
          <button className="view-toggle" onClick={actions.backToTitle}>
            Title
          </button>
          <ViewToggles setup={view.setup} actions={actions} />
        </div>
      </div>
      {right && <IslandPanel panel={right} mine={view.hud.mine === "right"} />}
    </header>
  );
}
