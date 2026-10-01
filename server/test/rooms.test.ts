import { COMPUTER_NAME, type ClientMessage, type ServerMessage } from "@utopia/protocol";
import { describe, expect, it } from "vitest";
import { Connection } from "../src/connection.js";
import { Directory } from "../src/directory.js";

/** A player's browser, as the server sees it: it keeps what it is sent. */
class Browser {
  readonly received: ServerMessage[] = [];
  readonly connection: Connection;

  constructor(directory: Directory) {
    this.connection = new Connection({ directory, link: { send: (m) => this.received.push(m) } });
  }

  say(message: ClientMessage): void {
    this.connection.receive(JSON.stringify(message));
  }

  last<T extends ServerMessage["type"]>(type: T): Extract<ServerMessage, { type: T }> {
    const found = this.received.filter((message) => message.type === type);
    return found[found.length - 1] as Extract<ServerMessage, { type: T }>;
  }

  types(): string[] {
    return this.received.map((message) => message.type);
  }
}

let counter = 0;
const aDirectory = () =>
  new Directory({
    roomCode: () => ["QZXK", "MOWB", "TRAP"][counter++ % 3],
    seatToken: () => `seat${String(counter++).padStart(12, "0")}`,
    seed: () => 11,
  });

/** A host and a guest, seated in a game that has begun. */
function aGameUnderWay() {
  const directory = aDirectory();
  const host = new Browser(directory);
  host.say({ type: "host", name: "ada", options: { rounds: 3, roundSeconds: 60 } });
  const guest = new Browser(directory);
  guest.say({ type: "join", room: host.last("seated").room, name: "grace" });
  return { directory, host, guest };
}

const secondsLeft = (browser: Browser) => browser.last("frame").snapshot.secondsLeft;

/** Time passing as the server's loop passes it: a tick every twentieth of a second. */
function play(directory: Directory, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) directory.tick(0.05);
}

describe("hosting", () => {
  it("seats the host on the left island, waiting for a rival", () => {
    const directory = aDirectory();
    const host = new Browser(directory);

    host.say({ type: "host", name: "ada", options: { rounds: 3, roundSeconds: 60 } });

    expect([host.last("seated").side, host.last("waiting").host]).toEqual(["left", "ADA"]);
  });

  it("closes a room whose host leaves before anyone joins", () => {
    const directory = aDirectory();
    const host = new Browser(directory);
    host.say({ type: "host", name: "ada", options: { rounds: 3, roundSeconds: 60 } });
    const room = host.last("seated").room;

    host.say({ type: "leave" });
    const latecomer = new Browser(directory);
    latecomer.say({ type: "join", room, name: "grace" });

    expect(latecomer.last("refused").reason).toBe("noSuchRoom");
  });
});

describe("joining", () => {
  it("seats the guest on the right island and starts the game for both", () => {
    const { host, guest } = aGameUnderWay();

    expect([guest.last("seated").side, host.last("started").names]).toEqual([
      "right",
      { left: "ADA", right: "GRACE" },
    ]);
  });

  it("refuses a room that does not exist", () => {
    const guest = new Browser(aDirectory());

    guest.say({ type: "join", room: "NOPE", name: "grace" });

    expect(guest.last("refused").reason).toBe("noSuchRoom");
  });

  it("refuses a third governor: there are two islands", () => {
    const { directory, host } = aGameUnderWay();
    const third = new Browser(directory);

    third.say({ type: "join", room: host.last("seated").room, name: "alan" });

    expect(third.last("refused").reason).toBe("roomFull");
  });
});

describe("playing", () => {
  it("plays the game on as time passes, sending both players its frames", () => {
    const { directory, host, guest } = aGameUnderWay();

    directory.tick(0.05);
    const before = secondsLeft(host);
    play(directory, 2);

    expect([secondsLeft(host) < before, secondsLeft(guest)]).toEqual([true, secondsLeft(host)]);
  });

  it("puts each governor's keys to their own island", () => {
    const { directory, host, guest } = aGameUnderWay();

    guest.say({ type: "key", key: 9 });
    guest.say({ type: "key", key: "enter" });
    directory.tick(0.05);

    const bought = host.last("frame").events.find((event) => event.type === "itemBought");
    expect(bought).toMatchObject({ side: "right", item: "fishingBoat" });
  });

  it("sends the board only when it has changed", () => {
    const { directory, host } = aGameUnderWay();

    directory.tick(0.05);
    directory.tick(0.05);

    expect(host.last("frame").snapshot.board).toBe("unchanged");
  });
});

describe("a dropped connection", () => {
  it("pauses the game for the one still there", () => {
    const { directory, host, guest } = aGameUnderWay();
    directory.tick(0.05);
    const before = secondsLeft(host);

    guest.connection.drop();
    play(directory, 5);

    expect([host.last("paused").absent, secondsLeft(host)]).toEqual(["right", before]);
  });

  it("resumes once the governor rejoins, sending them the whole board again", () => {
    const { directory, host, guest } = aGameUnderWay();
    const { room, seat } = guest.last("seated");
    guest.connection.drop();

    const back = new Browser(directory);
    back.say({ type: "rejoin", room, seat });
    directory.tick(0.05);

    expect([host.types().includes("resumed"), typeof back.last("frame").snapshot.board]).toEqual([
      true,
      "object",
    ]);
  });

  it("refuses a seat that is not the room's", () => {
    const { directory, host } = aGameUnderWay();
    const stranger = new Browser(directory);

    stranger.say({ type: "rejoin", room: host.last("seated").room, seat: "notarealseat0000" });

    expect(stranger.last("refused").reason).toBe("seatGone");
  });
});

describe("a governor who leaves", () => {
  it("tells the one left behind, who has the game held while they choose", () => {
    const { directory, host, guest } = aGameUnderWay();
    directory.tick(0.05);
    const before = secondsLeft(host);

    guest.say({ type: "leave" });
    play(directory, 5);

    expect([host.last("rivalLeft").side, secondsLeft(host)]).toEqual(["right", before]);
  });

  it("can be replaced by the computer, and the game goes on", () => {
    const { directory, host, guest } = aGameUnderWay();
    guest.say({ type: "leave" });

    host.say({ type: "carryOn", choice: "computer" });
    directory.tick(0.05);
    const before = secondsLeft(host);
    play(directory, 2);

    expect([host.last("started").names.right, secondsLeft(host) < before]).toEqual([
      COMPUTER_NAME,
      true,
    ]);
  });

  it("can send the one left behind back to the lobby, closing the room", () => {
    const { directory, host, guest } = aGameUnderWay();
    const room = host.last("seated").room;
    guest.say({ type: "leave" });

    host.say({ type: "carryOn", choice: "lobby" });
    const latecomer = new Browser(directory);
    latecomer.say({ type: "join", room, name: "alan" });

    expect([host.types().includes("closed"), latecomer.last("refused").reason]).toEqual([
      true,
      "noSuchRoom",
    ]);
  });
});
