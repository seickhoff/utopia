import { useState, type ReactElement, type ReactNode } from "react";
import { SIDE_BUTTON_LABELS, type SideButton } from "../board/controller.js";
import type { ScreenProps } from "./App.js";
import { BarIcon, type BarIconName } from "./BarIcons.js";
import type { GameView, YearLogEntry } from "./game-view.js";
import { Guide } from "./Guide.js";
import { KeypadOverlay } from "./KeypadOverlay.js";
import { LeaveButton } from "./LeaveButton.js";
import { ReportTable } from "./YearEndPanel.js";

/** What the side bars open, one at a time, beside the screen. */
type Panel = "keypad" | "guide" | "log";
type Shown = Panel | "none";

interface BarButtonSpec {
  readonly icon: BarIconName;
  readonly label: string;
  readonly pressed: boolean;
  readonly onPress: () => void;
}

/**
 * The classic game as the television showed it, the picture alone, with the controls on the
 * black bars beside it: the keypad, the labels, how to play and the side buttons on the left, the
 * year log, the 3D view and the sound on the right. Each panel opens only when asked for: at
 * year end the screen says SCORES and TOTALS, as the cartridge did, and the log keeps the rest.
 */
export function VintageScreen({ view, actions }: ScreenProps) {
  const { shown, toggle, close } = usePanels();
  const bars = barsFor({ view, actions, shown, toggle });
  return (
    <>
      <ScreenBar edge="left" buttons={bars.left}>
        <HoldButtons actions={actions} />
      </ScreenBar>
      <ScreenBar edge="right" buttons={bars.right}>
        <LeaveButton className="bar-button leave" onLeave={actions.leaveGame}>
          <BarIcon name="leave" />
          <span>Leave</span>
        </LeaveButton>
      </ScreenBar>
      {shown !== "none" && (
        <SidePanel panel={shown} onClose={close}>
          {PANEL_BODIES[shown]({ view, actions })}
        </SidePanel>
      )}
    </>
  );
}

/** Which panel shows, if any: the one the player last opened. */
function usePanels() {
  const [shown, choose] = useState<Shown>("none");
  const close = () => choose("none");
  const toggle = (panel: Panel) => choose(shown === panel ? "none" : panel);
  return { shown, toggle, close };
}

interface BarsInput extends ScreenProps {
  readonly shown: Shown;
  readonly toggle: (panel: Panel) => void;
}

function barsFor(input: BarsInput) {
  return { left: leftBar(input), right: rightBar(input) };
}

/** A button that opens a panel, pressed while it is open. */
function panelButton(input: BarsInput, spec: { icon: BarIconName; label: string; panel: Panel }) {
  const { icon, label, panel } = spec;
  return { icon, label, pressed: input.shown === panel, onPress: () => input.toggle(panel) };
}

function leftBar(input: BarsInput): BarButtonSpec[] {
  const labelsOn = input.view.setup.labels === "on";
  return [
    panelButton(input, { icon: "keypad", label: "Keypad", panel: "keypad" }),
    { icon: "labels", label: "Labels", pressed: labelsOn, onPress: input.actions.toggleLabels },
    panelButton(input, { icon: "guide", label: "How to play", panel: "guide" }),
  ];
}

function rightBar(input: BarsInput): BarButtonSpec[] {
  const soundOn = input.view.setup.sound === "on";
  const sound: BarIconName = soundOn ? "soundOn" : "soundOff";
  return [
    panelButton(input, { icon: "log", label: "Year log", panel: "log" }),
    { icon: "cube", label: "3D view", pressed: false, onPress: input.actions.toggleView },
    { icon: sound, label: "Sound", pressed: soundOn, onPress: input.actions.toggleSound },
  ];
}

interface ScreenBarProps {
  readonly edge: "left" | "right";
  readonly buttons: readonly BarButtonSpec[];
  readonly children?: ReactNode;
}

function ScreenBar(props: ScreenBarProps) {
  return (
    <nav className={`screen-bar ${props.edge}`} aria-label={`${props.edge} bar`}>
      {props.buttons.map((button) => (
        <button
          key={button.label}
          className={`bar-button${button.pressed ? " pressed" : ""}`}
          aria-pressed={button.pressed}
          onClick={button.onPress}
        >
          <BarIcon name={button.icon} />
          <span>{button.label}</span>
        </button>
      ))}
      {props.children}
    </nav>
  );
}

const HELD_BUTTONS: readonly SideButton[] = ["total", "census", "round"];

/**
 * The hand controller's side buttons: hold one and both corners of the status bar show that
 * figure, the border naming it, until it is let go.
 */
function HoldButtons({ actions }: Pick<ScreenProps, "actions">) {
  return (
    <div className="hold-group" role="group" aria-label="Hold to show">
      <span className="hold-title">Hold to show</span>
      {HELD_BUTTONS.map((button) => (
        <button
          key={button}
          className="hold-button"
          onPointerDown={() => actions.holdSideButton(button)}
          onPointerUp={() => actions.releaseSideButton(button)}
          onPointerLeave={() => actions.releaseSideButton(button)}
          onPointerCancel={() => actions.releaseSideButton(button)}
          onContextMenu={(event) => event.preventDefault()}
        >
          {SIDE_BUTTON_LABELS[button]}
        </button>
      ))}
    </div>
  );
}

const PANEL_TITLES: Readonly<Record<Panel, string>> = {
  keypad: "Keypad",
  guide: "How to play",
  log: "Year by year",
};
const PANEL_EDGES: Readonly<Record<Panel, "left" | "right">> = {
  keypad: "left",
  guide: "left",
  log: "right",
};

function SidePanel(props: { panel: Panel; onClose: () => void; children: ReactElement }) {
  const { panel } = props;
  return (
    <aside
      className={`screen-panel ${panel} ${PANEL_EDGES[panel]}`}
      aria-label={PANEL_TITLES[panel]}
    >
      <header className="screen-panel-head">
        <h2>{PANEL_TITLES[panel]}</h2>
        <button className="screen-panel-close" onClick={props.onClose} aria-label="Close">
          ×
        </button>
      </header>
      {props.children}
    </aside>
  );
}

const PANEL_BODIES: Readonly<Record<Panel, (props: ScreenProps) => ReactElement>> = {
  keypad: ({ view, actions }) => <KeypadOverlay hud={view.hud} actions={actions} />,
  guide: () => <Guide />,
  log: ({ view }) => <YearLog view={view} />,
};

function YearLog({ view }: { view: GameView }) {
  const [left, right] = view.hud.panels;
  if (view.yearLog.entries.length === 0) {
    return <p className="log-empty">Each year's report will appear here as the year ends.</p>;
  }
  return (
    <div className="year-log">
      <p className="log-sides">
        <span className="side-left">{left?.title}</span>
        <span className="side-right">{right?.title}</span>
      </p>
      {view.yearLog.entries.map((entry) => (
        <LogYear key={entry.title} entry={entry} />
      ))}
    </div>
  );
}

function LogYear({ entry }: { entry: YearLogEntry }) {
  return (
    <section className="log-year">
      <h3>{entry.title}</h3>
      <ReportTable lines={entry.lines} />
    </section>
  );
}
