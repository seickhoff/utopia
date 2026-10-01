import type { ReactElement } from "react";
import type { SoundSetting, ViewMode } from "../settings/game-setup-store.js";
import type { ScreenProps } from "./App.js";
import { BuildMenu } from "./BuildMenu.js";
import { KeyStrip } from "./KeyStrip.js";
import { LeaveButton } from "./LeaveButton.js";
import { OnlineNotice } from "./OnlineNotice.js";
import type { ClockViewModel, PanelViewModel } from "./game-view.js";
import { VintageScreen } from "./VintageScreen.js";
import { YearEndPanel } from "./YearEndPanel.js";

/** Each view's way of framing the game: the 3D view's top bar, or the classic screen's bars. */
const LAYOUTS: Readonly<Record<ViewMode, (props: ScreenProps) => ReactElement>> = {
  diorama: ModernFrame,
  classic: VintageScreen,
};

export function PlayingScreen(props: ScreenProps) {
  const { view, actions } = props;
  const Layout = LAYOUTS[view.setup.view];
  return (
    <div className="playing">
      <Layout view={view} actions={actions} />
      {view.buildMenu.open && <QuickBuild view={view} actions={actions} />}
      {view.hud.message !== "" && <BoardNotice message={view.hud.message} />}
      <OnlineNotice online={view.online} actions={actions} />
    </div>
  );
}

/**
 * The 3D view: both islands' figures and the clock along the top, the year's report beside, and
 * the keys along the bottom.
 */
function ModernFrame({ view, actions }: ScreenProps) {
  const [left, right] = view.hud.panels;
  return (
    <>
      <header className="top-bar">
        {left && <IslandPanel panel={left} mine={view.hud.mine === "left"} />}
        <Clock clock={view.hud.clock} setup={view.setup} actions={actions} />
        {right && <IslandPanel panel={right} mine={view.hud.mine === "right"} />}
      </header>
      <YearEndPanel yearEnd={view.yearEnd} />
      <KeyStrip />
    </>
  );
}

/** The quick-build menu, in the modern look with 3D models in the 3D view. */
function QuickBuild({ view, actions }: ScreenProps) {
  const look = view.setup.view === "diorama" ? "modern" : "classic";
  return (
    <BuildMenu menu={view.buildMenu} actions={actions} look={look} portraits={view.portraits} />
  );
}

/** The cartridge's RAZZ, told on the board, fading after a moment. */
function BoardNotice(props: { message: string }) {
  return (
    <p className="board-notice" key={props.message} role="status">
      {props.message}
    </p>
  );
}

export function IslandPanel(props: { panel: PanelViewModel; mine: boolean }) {
  const { panel } = props;
  return (
    <section className={`island-panel side-${panel.side}${props.mine ? " mine" : ""}`}>
      <h2>{panel.title}</h2>
      <dl>
        <Stat label="Gold" value={panel.gold} />
        <Stat label="People" value={panel.population} />
        <Stat label="Score" value={panel.total} />
        <Stat label="Last year" value={panel.lastRound} />
      </dl>
    </section>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <div className="stat">
      <dt>{props.label}</dt>
      <dd>{props.value}</dd>
    </div>
  );
}

const OTHER_VIEW: Readonly<Record<ViewMode, string>> = {
  diorama: "Classic view (V)",
  classic: "3D view (V)",
};

const SOUND_TOGGLE: Readonly<Record<SoundSetting, string>> = {
  on: "Sound off (M)",
  off: "Sound on (M)",
};

interface ToggleProps {
  readonly setup: { readonly view: ViewMode; readonly sound: SoundSetting };
  readonly actions: { toggleView(): void; toggleSound(): void };
}

interface ClockProps extends ToggleProps {
  readonly clock: ClockViewModel;
  readonly actions: ToggleProps["actions"] & { leaveGame(): void };
}

function Clock({ clock, setup, actions }: ClockProps) {
  return (
    <div className={`clock${clock.urgent ? " urgent" : ""}`}>
      <span className="year">{clock.year}</span>
      <span className="time">{clock.time}</span>
      <div className="toggles">
        <ViewToggles setup={setup} actions={actions} />
        <LeaveButton className="view-toggle" onLeave={actions.leaveGame}>
          Leave
        </LeaveButton>
      </div>
    </div>
  );
}

/** The other view, and the sound on or off. */
export function ViewToggles({ setup, actions }: ToggleProps) {
  return (
    <>
      <button className="view-toggle" onClick={actions.toggleView}>
        {OTHER_VIEW[setup.view]}
      </button>
      <button className="view-toggle" onClick={actions.toggleSound}>
        {SOUND_TOGGLE[setup.sound]}
      </button>
    </>
  );
}
