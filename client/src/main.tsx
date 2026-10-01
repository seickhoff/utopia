import type { KeypadKey } from "@utopia/engine";
import { createRoot } from "react-dom/client";
import { BuildMenu } from "./app/build-menu.js";
import type { SideButton } from "./board/controller.js";
import { FrameLoop } from "./app/frame-loop.js";
import { ViewAngle } from "./app/view-angle.js";
import type { Match } from "./app/game-hud.js";
import { GameRunner, type FrameCallbacks } from "./app/game-runner.js";
import { GameStore } from "./app/game-store.js";
import { OnlinePlay } from "./app/online-play.js";
import { soloGame } from "./app/solo-play.js";
import { ViewSwitch, type ModeView } from "./app/view-switch.js";
import { ClassicView } from "./classic/classic-view.js";
import type { Area } from "./classic/pixel-scale.js";
import { titlePicture } from "./classic/title-picture.js";
import { GOLD_READOUTS, readoutsWhileHeld, type Readouts } from "./classic/status-row.js";
import { App, type GameActions } from "./hud/App.js";
import { OFFLINE } from "./hud/game-view.js";
import "./hud/style.css";
import "./hud/phone.css";
import { BuildMenuControls } from "./input/build-menu-controls.js";
import { HandController } from "./input/hand-controller.js";
import { playerControls, type PlayerControls } from "./input/player-controls.js";
import { DIORAMA_POSE } from "./scene/camera-framing.js";
import { DioramaView, type CameraAim } from "./scene/diorama-view.js";
import { paintItemPortraits } from "./scene/item-portraits.js";
import { GameSounds } from "./sound/game-sounds.js";
import { SoundChannel } from "./sound/sound-channel.js";
import { WebAudioSpeaker } from "./sound/web-audio-speaker.js";
import { WebSocketLink } from "./net/web-socket-link.js";
import { GameSetupStore, TOGGLED, isNamed, type GameSetup } from "./settings/game-setup-store.js";
import { BrowserStore } from "./settings/key-value-store.js";

/** The composition root: the one place that builds the client's parts and wires them together. */

/** The game server: VITE_WS_URL when built for the web, or the dev server's /ws proxy. */
const SERVER_URL: string =
  import.meta.env.VITE_WS_URL ??
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;

interface Parts {
  readonly store: GameStore;
  readonly setups: GameSetupStore;
  readonly controller: HandController;
  readonly menu: BuildMenu;
  readonly menuKeys: BuildMenuControls;
  readonly runner: GameRunner;
  readonly views: ViewSwitch;
  readonly speaker: WebAudioSpeaker;
  readonly online: OnlinePlay;
}

/** Where the cartridge's sounds are served from: client/public/sounds/. */
const SOUND_FOLDER = `${import.meta.env.BASE_URL}sounds/`;

const frameLoop = (callbacks: FrameCallbacks) =>
  new FrameLoop({ ...callbacks, devicePixelRatio: window.devicePixelRatio });

/** The game's sounds, played one at a time on the speaker as the console's one chip played them. */
function gameSounds(speaker: WebAudioSpeaker): GameSounds {
  return new GameSounds(new SoundChannel({ speaker, clock: () => performance.now() / 1000 }));
}

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`The page has no #${id}`);
  return found as T;
}

function buildParts(): Parts {
  const store = new GameStore();
  const setups = new GameSetupStore(new BrowserStore(() => window.localStorage));
  let readouts = GOLD_READOUTS;
  const controller = new HandController((held) => (readouts = readoutsWhileHeld(held)));
  const menu = new BuildMenu();
  const menuKeys = new BuildMenuControls(controller, menu);
  const hands = { controller, menu, menuKeys };
  const angle = new ViewAngle({ pitchDegrees: DIORAMA_POSE.pitchDegrees });
  const stage = element<HTMLDivElement>("stage");
  const match = () => runner.match();
  const views = buildViews({ stage, readouts: () => readouts, store, match, angle });
  const speaker = new WebAudioSpeaker(SOUND_FOLDER);
  const input = playerControls({ ...hands, angle, view: views, surface: stage, keys: window });
  const runner = buildRunner({ store, views, input, speaker, menu });
  const online = onlinePlay({ store, runner });
  return { store, setups, ...hands, runner, views, speaker, online };
}

/** The parts the runner shares with the rest of the page, and the controls it plugs into games. */
interface RunnerParts extends Pick<Parts, "store" | "views" | "speaker" | "menu"> {
  readonly input: PlayerControls;
}

function buildRunner(parts: RunnerParts): GameRunner {
  const { store, views, input, speaker, menu } = parts;
  return new GameRunner({
    store,
    view: views,
    input,
    audio: gameSounds(speaker),
    frames: frameLoop,
    menu,
  });
}

/** Games on the server, through a WebSocket that remembers its seat for the tab's life. */
function onlinePlay(parts: { store: GameStore; runner: GameRunner }): OnlinePlay {
  return new OnlinePlay({
    ...parts,
    stage: parts.runner,
    link: (listener) => new WebSocketLink({ url: SERVER_URL, listener }),
    seats: new BrowserStore(() => window.sessionStorage),
    shareUrl: (room) => `${window.location.origin}${window.location.pathname}?room=${room}`,
    clock: () => performance.now(),
  });
}

interface ViewParts {
  readonly stage: HTMLElement;
  readonly readouts: () => Readouts;
  /** Where the player's choice of labels for the classic screen is kept. */
  readonly store: GameStore;
  /** Who plays the game on now: whose island the camera follows, and the names it shows. */
  readonly match: () => Match;
  readonly angle: ViewAngle;
}

/** Both ways of seeing the islands; if the browser cannot draw 3D, the classic screen serves for both. */
function buildViews(parts: ViewParts): ViewSwitch {
  const room = () => ({ width: parts.stage.clientWidth, height: parts.stage.clientHeight });
  const { readouts, store, match, angle } = parts;
  const labels = () => store.getView().setup.labels;
  const names = () => match().names;
  const classic = new ClassicView({ canvas: element("classic"), room, readouts, labels, names });
  const aim = (): CameraAim => ({ ...angle.current(), follow: match().mine });
  return new ViewSwitch({ classic, diorama: dioramaOr(classic, { room, aim }) });
}

function dioramaOr(
  classic: ModeView,
  sizing: { room: () => Area; aim: () => CameraAim },
): ModeView {
  try {
    return new DioramaView({ canvas: element("scene"), ...sizing });
  } catch {
    element("scene").hidden = true;
    return classic;
  }
}

/** Starts a game in the browser, or one on the server, as the player has set it up. */
function begin(parts: Parts): GameSetup {
  parts.speaker.prepare();
  return parts.store.getView().setup;
}

function playSolo(parts: Parts): void {
  if (!isNamed(parts.store.getView().setup)) return;
  const { session, match } = soloGame({ setup: begin(parts), seed: Date.now() >>> 0 });
  parts.runner.play(session, match);
}

function actionsFor(parts: Parts): GameActions {
  return { ...playActions(parts), ...onlineActions(parts), ...settingActions(parts) };
}

/** Playing a game: starting one, the keypad and build menu, and leaving. */
function playActions(parts: Parts) {
  const { controller } = parts;
  return {
    play: () => playSolo(parts),
    leaveGame: () => parts.online.leave(),
    togglePause: () => parts.runner.togglePause(),
    backToTitle: () => parts.online.leave(),
    pressKey: (key: KeypadKey) => controller.pressKeypad(key),
    buildHere: (key: number) => parts.menuKeys.buy(key),
    closeBuildMenu: () => parts.menu.dismiss(),
    holdSideButton: (button: SideButton) => controller.holdSideButton(button),
    releaseSideButton: (button: SideButton) => controller.releaseSideButton(button),
  };
}

function onlineActions(parts: Parts) {
  return {
    hostOnline: () => {
      if (!isNamed(parts.store.getView().setup)) return;
      const setup = begin(parts);
      parts.online.host({ name: setup.name, options: setup });
    },
    joinOnline: (room: string) => {
      if (isNamed(parts.store.getView().setup))
        parts.online.join({ name: begin(parts).name, room });
    },
    carryOn: (choice: "computer" | "lobby") => parts.online.carryOn(choice),
  };
}

function settingActions(parts: Parts) {
  return {
    changeSetup: (change: Partial<GameSetup>) => keepSetting(parts, () => change),
    toggleView: () => keepSetting(parts, (setup) => ({ view: TOGGLED.view[setup.view] })),
    toggleSound: () => keepSetting(parts, (setup) => ({ sound: TOGGLED.sound[setup.sound] })),
    toggleLabels: () => keepSetting(parts, (setup) => ({ labels: TOGGLED.labels[setup.labels] })),
  };
}

/** Changes a setting, on the title or during a game, and keeps it for the next visit. */
function keepSetting(parts: Parts, change: (setup: GameSetup) => Partial<GameSetup>): void {
  const setup = parts.store.getView().setup;
  parts.store.update({ setup: { ...setup, ...change(setup) } });
  parts.setups.save(parts.store.getView().setup);
}

/** Keys that work on every screen, except while a name or a code is being typed. */
const SHORTCUTS: Readonly<Record<string, (actions: GameActions) => void>> = {
  KeyV: (actions) => actions.toggleView(),
  KeyM: (actions) => actions.toggleSound(),
  KeyL: (actions) => actions.toggleLabels(),
  Escape: (actions) => actions.togglePause(),
};

/** The page follows the store: which screen shows, and which view draws the islands. */
function followTheStore(parts: Parts): void {
  let shownView = parts.store.getView().setup.view;
  parts.views.use(shownView);
  parts.speaker.follow(parts.store.getView().setup.sound);
  parts.store.subscribe(() => {
    const view = parts.store.getView();
    parts.speaker.follow(view.setup.sound);
    document.body.dataset.screen = view.screen;
    document.body.dataset.view = view.setup.view;
    if (view.setup.view !== shownView) parts.views.use((shownView = view.setup.view));
    parts.runner.refresh();
  });
}

/** A touch screen taller than it is wide: a phone held upright, where Utopia is not played. */
const UPRIGHT = "(pointer: coarse) and (orientation: portrait)";
type Hold = "upright" | "sideways";

const HOLDS: Readonly<Record<Hold, (runner: GameRunner) => void>> = {
  upright: (runner) => runner.lookAway(),
  sideways: (runner) => runner.lookBack(),
};

/** The page follows how the phone is held: upright, the board is put away and play waits. */
function followTheHold(parts: Parts): void {
  const upright = window.matchMedia(UPRIGHT);
  const follow = () => {
    const hold: Hold = upright.matches ? "upright" : "sideways";
    document.body.dataset.hold = hold;
    HOLDS[hold](parts.runner);
  };
  follow();
  upright.addEventListener("change", follow);
}

/** The HUD's pictures, each left out where the browser cannot draw it. */
function pictures() {
  return { portraits: drawnOr(paintItemPortraits, {}), titlePicture: drawnOr(titlePicture, "") };
}

function drawnOr<T>(draw: () => T, none: T): T {
  try {
    return draw();
  } catch {
    return none;
  }
}

/** A shared link names its room: the join field starts filled in. A reloaded game rejoins. */
function joinFromTheAddress(parts: Parts): void {
  const room = new URLSearchParams(window.location.search).get("room") ?? "";
  parts.store.update({ online: { ...OFFLINE, room: room.toUpperCase().slice(0, 4) } });
  parts.online.resume();
}

function boot(): void {
  const parts = buildParts();
  parts.store.update({ setup: parts.setups.load(), ...pictures() });
  followTheStore(parts);
  followTheHold(parts);
  joinFromTheAddress(parts);
  const actions = actionsFor(parts);
  window.addEventListener("resize", () => parts.runner.refresh());
  window.addEventListener("keydown", (event) => {
    const typing = event.target instanceof HTMLInputElement;
    if (!event.repeat && !typing) SHORTCUTS[event.code]?.(actions);
  });
  createRoot(element("root")).render(<App store={parts.store} actions={actions} />);
}

boot();
