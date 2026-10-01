import { randomBytes, randomInt } from "node:crypto";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { Directory } from "./directory.js";
import { attachSocket } from "./socket-client.js";

/** The composition root: rooms over WebSockets at /ws, and a plain page for health checks. */

/**
 * Railway says which port to listen on. Locally the client's dev server expects 3021, clear of
 * the other projects on this machine (anti-aircraft-gunner has 3001, back-test 3010).
 */
const PORT = Number(process.env.PORT ?? 3021);
/** The rooms run at the cartridge's 20 Hz tick. */
const TICK_MS = 50;
/** No message a player sends comes near this; anything longer is refused by ws itself. */
const LARGEST_MESSAGE_BYTES = 4096;
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

function roomCode(): string {
  return Array.from({ length: 4 }, () => CODE_LETTERS[randomInt(CODE_LETTERS.length)]).join("");
}

const directory = new Directory({
  roomCode,
  seatToken: () => randomBytes(12).toString("hex"),
  seed: () => randomInt(2 ** 31),
});

const server = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/plain" });
  response.end("Utopia server\n");
});
const sockets = new WebSocketServer({
  server,
  path: "/ws",
  perMessageDeflate: true,
  maxPayload: LARGEST_MESSAGE_BYTES,
});
sockets.on("connection", (socket) => attachSocket(socket, directory));

let lastTick = performance.now();
setInterval(() => {
  const now = performance.now();
  directory.tick((now - lastTick) / 1000);
  lastTick = now;
}, TICK_MS);

server.listen(PORT, () => console.log(`Utopia server listening on ${PORT}`));

/** A redeploy stops the old server: its sockets close, and browsers reconnect to the new one. */
process.on("SIGTERM", () => {
  sockets.close();
  server.close(() => process.exit(0));
});
