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

interface BarsInput extends ScreenProps {
  readonly shown: Shown;
  readonly toggle: (panel: Panel) => void;
}

/** What the bars hold: each one's buttons, and the group beneath them. */
interface BarSet {
  readonly left: (input: BarsInput) => BarButtonSpec[];
  readonly right: (input: BarsInput) => BarButtonSpec[];
  readonly leftFoot: (props: ScreenProps) => ReactElement;
  readonly rightFoot: (props: ScreenProps) => ReactElement;
}

/** While the term runs: the keypad and the side buttons on the left, the way out on the right. */
const IN_OFFICE: BarSet = {
  left: (input) => [panelButton(input, KEYPAD), ...settingButtons(input)],
  right: viewButtons,
  leftFoot: HoldButtons,
  rightFoot: LeaveFoot,
};

/**
 * Once the term is over the controllers do nothing, as on the console: the keypad and the side
 * buttons go, and the way out gives way to who won and what next.
 */
const OUT_OF_OFFICE: BarSet = {
  left: settingButtons,
  right: viewButtons,
  leftFoot: () => <></>,
  rightFoot: TermOver,
};

/**
 * The classic game as the television showed it, the picture alone, with the controls on the
 * black bars beside it: the keypad, the labels, how to play and the side buttons on the left, the
 * year log, the 3D view and the sound on the right. Each panel opens only when asked for: at
 * year end the screen says SCORES and TOTALS, as the cartridge did, and the log keeps the rest.
 */
export function VintageScreen(props: ScreenProps) {
  return <ClassicFrame {...props} bars={IN_OFFICE} />;
}

/** The classic screen at the end of the term: FINAL SCORE on the picture, the verdict beside it. */
export function VintageFinal(props: ScreenProps) {
  return <ClassicFrame {...props} bars={OUT_OF_OFFICE} />;
}

function ClassicFrame(props: ScreenProps & { readonly bars: BarSet }) {
  const { view, actions, bars } = props;
  const { shown, toggle, close } = usePanels();
  const input = { view, actions, shown, toggle };
  const { leftFoot: LeftFoot, rightFoot: RightFoot } = bars;
  return (
    <>
      <ScreenBar edge="left" buttons={bars.left(input)}>
        <LeftFoot view={view} actions={actions} />
      </ScreenBar>
      <ScreenBar edge="right" buttons={bars.right(input)}>
        <RightFoot view={view} actions={actions} />
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

interface PanelOpener {
  readonly icon: BarIconName;
  readonly label: string;
  readonly panel: Panel;
}

const KEYPAD: PanelOpener = { icon: "keypad", label: "Keypad", panel: "keypad" };
const GUIDE: PanelOpener = { icon: "guide", label: "How to play", panel: "guide" };
const LOG: PanelOpener = { icon: "log", label: "Year log", panel: "log" };

/** A button that opens a panel, pressed while it is open. */
function panelButton(input: BarsInput, opener: PanelOpener): BarButtonSpec {
  const { icon, label, panel } = opener;
  return { icon, label, pressed: input.shown === panel, onPress: () => input.toggle(panel) };
}

function settingButtons(input: BarsInput): BarButtonSpec[] {
  const labelsOn = input.view.setup.labels === "on";
  return [
    { icon: "labels", label: "Labels", pressed: labelsOn, onPress: input.actions.toggleLabels },
    panelButton(input, GUIDE),
  ];
}

function viewButtons(input: BarsInput): BarButtonSpec[] {
  const soundOn = input.view.setup.sound === "on";
  const sound: BarIconName = soundOn ? "soundOn" : "soundOff";
  return [
    panelButton(input, LOG),
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

function LeaveFoot({ actions }: Pick<ScreenProps, "actions">) {
  return (
    <LeaveButton className="bar-button leave" onLeave={actions.leaveGame}>
      <BarIcon name="leave" />
      <span>Leave</span>
    </LeaveButton>
  );
}

/** Who won the term, and what next: another term with the same setup, or the title. */
function TermOver({ view, actions }: ScreenProps) {
  return (
    <div className="end-group" role="group" aria-label="Final score">
      <p className="end-verdict" role="status">
        {view.final.headline}
      </p>
      <button className="bar-button again" onClick={actions.play}>
        <BarIcon name="again" />
        <span>Run again</span>
      </button>
      <button className="bar-button" onClick={actions.backToTitle}>
        <BarIcon name="title" />
        <span>Title</span>
      </button>
    </div>
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
