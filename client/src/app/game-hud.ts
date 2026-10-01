import type { GameEvent, Side } from "@utopia/engine";
import { presentBuildMenu } from "../hud/build-menu-presenter.js";
import { NO_YEAR_END } from "../hud/game-view.js";
import { presentHud, type LastRazz } from "../hud/hud-presenter.js";
import { presentYearEnd, type RoundEnded } from "../hud/year-end-presenter.js";
import { YearLog } from "../hud/year-log.js";
import { presentYearLog } from "../hud/year-log-presenter.js";
import type { GameFrame } from "../session/game-session.js";
import type { BuildMenu } from "./build-menu.js";
import type { GameStore } from "./game-store.js";

/** Who is playing a game, and whom against. */
export interface Match {
  readonly mine: Side;
  readonly names: Readonly<Record<Side, string>>;
  /** Whether anyone governs the other island. */
  readonly rivalled: boolean;
}

export interface HudSetup {
  readonly store: GameStore;
  readonly match: Match;
  readonly menu: BuildMenu;
}

/** One game's HUD, frame by frame, passed to the view only when it changes. */
export class GameHud {
  private lastRazz: LastRazz = "none";
  private lastReport: RoundEnded | "none" = "none";
  private readonly log = new YearLog();
  /** Presented again only when a year ends, so the frames between cost nothing. */
  private yearLog = presentYearLog([]);
  private match: Match;

  constructor(private readonly setup: HudSetup) {
    this.match = setup.match;
  }

  rename(names: Readonly<Record<Side, string>>): void {
    this.match = { ...this.match, names };
  }

  present(frame: GameFrame): void {
    frame.events.forEach((event) => this.remember(event));
    const snapshot = frame.current;
    const { mine, names } = this.match;
    const hud = presentHud({ snapshot, mine, names, lastRazz: this.lastRazz });
    const yearEnd =
      this.lastReport === "none"
        ? NO_YEAR_END
        : presentYearEnd({ snapshot, report: this.lastReport });
    const buildMenu = presentBuildMenu({ snapshot, mine, offer: this.setup.menu.offered() });
    if (!buildMenu.open) this.setup.menu.dismiss();
    this.setup.store.update({ hud, yearEnd, yearLog: this.yearLog, buildMenu });
  }

  private remember(event: GameEvent): void {
    this.log.record(event);
    if (event.type === "roundEnded") this.closeYear(event);
    const { mine } = this.match;
    if (event.type === "razzed" && event.side === mine) this.lastRazz = event.reason;
    if (event.type === "itemBought" && event.side === mine) this.lastRazz = "none";
  }

  private closeYear(report: RoundEnded): void {
    this.lastReport = report;
    this.yearLog = presentYearLog(this.log.years());
  }
}
