import { newGame, type Side } from "@utopia/engine";
import { NO_BOARD_SENT, toWire, type ClientMessage, type ServerMessage } from "@utopia/protocol";
import { describe, expect, it } from "vitest";
import { GameStore } from "../src/app/game-store.js";
import type { Match } from "../src/app/game-hud.js";
import {
  OnlinePlay,
  type LinkListener,
  type PlayStage,
  type ServerLink,
} from "../src/app/online-play.js";
import type { GameSession } from "../src/session/game-session.js";
import { MemoryStore } from "../src/settings/key-value-store.js";

/** The connection to the server, played by the test: it opens, drops and delivers on cue. */
class FakeLink implements ServerLink {
  readonly sent: ClientMessage[] = [];
  opened = 0;
  closed = 0;

  constructor(readonly listener: LinkListener) {}

  open(): void {
    this.opened += 1;
  }

  send(message: ClientMessage): void {
    this.sent.push(message);
  }

  close(): void {
    this.closed += 1;
  }

  connects(): void {
    this.listener.state("open");
  }

  drops(): void {
    this.listener.state("lost");
  }

  delivers(...messages: ServerMessage[]): void {
    messages.forEach((message) => this.listener.message(message));
  }
}

class FakeStage implements PlayStage {
  played: { session: GameSession; match: Match }[] = [];
  renamed: Readonly<Record<Side, string>>[] = [];
  titles = 0;

  play(session: GameSession, match: Match): void {
    this.played.push({ session, match });
  }

  rename(names: Readonly<Record<Side, string>>): void {
    this.renamed.push(names);
  }

  showTitle(): void {
    this.titles += 1;
  }
}

function anOnlinePlay(seats = new MemoryStore()) {
  const store = new GameStore();
  const stage = new FakeStage();
  const links: FakeLink[] = [];
  const online = new OnlinePlay({
    store,
    stage,
    link: (listener) => {
      const link = new FakeLink(listener);
      links.push(link);
      return link;
    },
    seats,
    shareUrl: (room) => `https://utopia.example/?room=${room}`,
    clock: () => 0,
  });
  return { online, store, stage, link: () => links[links.length - 1], seats };
}

const OPTIONS = { rounds: 3, roundSeconds: 60 };
const SEAT = "seat000000000042";
const NAMES = { left: "ADA", right: "GRACE" };

function aFrame(): ServerMessage {
  const game = newGame({ options: {}, seed: 2, events: { record: () => {} } });
  game.start();
  return { type: "frame", snapshot: toWire(game.snapshot(), NO_BOARD_SENT), events: [] };
}

/** A guest seated on the right island of a game under way. */
function aGameUnderWay() {
  const play = anOnlinePlay();
  play.online.join({ name: "grace", room: "QZXK" });
  play.link().connects();
  play
    .link()
    .delivers(
      { type: "seated", room: "QZXK", side: "right", seat: SEAT },
      { type: "started", names: NAMES },
      aFrame(),
    );
  return play;
}

describe("OnlinePlay", () => {
  it("asks the server for a room once connected, the name written as it will print", () => {
    const { online, link } = anOnlinePlay();

    online.host({ name: "ada", options: OPTIONS });
    link().connects();

    expect(link().sent).toEqual([{ type: "host", name: "ADA", options: OPTIONS }]);
  });

  it("shows the room's code and a link to share while waiting for a rival", () => {
    const { online, link, store } = anOnlinePlay();
    online.host({ name: "ada", options: OPTIONS });
    link().connects();

    link().delivers(
      { type: "seated", room: "QZXK", side: "left", seat: SEAT },
      { type: "waiting", room: "QZXK", host: "ADA" },
    );

    expect(store.getView().online).toMatchObject({
      stage: "waiting",
      room: "QZXK",
      link: "https://utopia.example/?room=QZXK",
    });
  });

  it("starts the game on the first frame, on the island the server gave, named as it said", () => {
    const { stage } = aGameUnderWay();

    const [{ session, match }] = stage.played;
    expect([session.side, match.mine, match.names]).toEqual(["right", "right", NAMES]);
  });

  it("shows whom the game waits for while it is paused", () => {
    const { link, store } = aGameUnderWay();

    link().delivers({ type: "paused", absent: "left" });

    expect(store.getView().online).toMatchObject({ stage: "paused", note: "ADA" });
  });

  it("asks what to do when the rival leaves, and passes the choice on", () => {
    const { online, link, store } = aGameUnderWay();

    link().delivers({ type: "rivalLeft", side: "left" });
    online.carryOn("computer");

    expect([store.getView().online.stage, link().sent.at(-1)]).toEqual([
      "rivalLeft",
      { type: "carryOn", choice: "computer" },
    ]);
  });

  it("renames the rival when the computer takes over their island", () => {
    const { link, stage } = aGameUnderWay();

    link().delivers({ type: "started", names: { left: "COMPUTER", right: "GRACE" } });

    expect(stage.renamed).toEqual([{ left: "COMPUTER", right: "GRACE" }]);
  });

  it("rejoins its seat when a lost connection comes back", () => {
    const { link, store } = aGameUnderWay();

    link().drops();
    const waiting = store.getView().online.stage;
    link().connects();

    expect([waiting, link().sent.at(-1)]).toEqual([
      "reconnecting",
      { type: "rejoin", room: "QZXK", seat: SEAT },
    ]);
  });

  it("remembers its seat, so a reloaded page can rejoin it", () => {
    const { seats } = aGameUnderWay();
    const reloaded = anOnlinePlay(seats);

    reloaded.online.resume();
    reloaded.link().connects();

    expect(reloaded.link().sent).toEqual([{ type: "rejoin", room: "QZXK", seat: SEAT }]);
  });

  it("goes back to the title when the room is closed", () => {
    const { link, stage, store } = aGameUnderWay();

    link().delivers({ type: "closed" });

    expect([stage.titles, store.getView().online.stage]).toEqual([1, "offline"]);
  });

  it("says why the server would not seat it", () => {
    const { online, link, store } = anOnlinePlay();
    online.join({ name: "grace", room: "NOPE" });
    link().connects();

    link().delivers({ type: "refused", reason: "noSuchRoom" });

    expect(store.getView().online).toMatchObject({
      stage: "refused",
      note: "No game has that code.",
    });
  });

  it("leaving tells the server, hangs up and goes back to the title", () => {
    const { online, link, stage } = aGameUnderWay();

    online.leave();

    expect([link().sent.at(-1), link().closed, stage.titles]).toEqual([{ type: "leave" }, 1, 1]);
  });
});
