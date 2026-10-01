import { encode } from "@utopia/protocol";
import type { WebSocket } from "ws";
import { Connection } from "./connection.js";
import type { Directory } from "./directory.js";

/** A silent connection is checked this often, and dropped if it has not answered since the last. */
const HEARTBEAT_MS = 15_000;

/** The adapter between one WebSocket and its connection: the only code here that knows ws. */
export function attachSocket(socket: WebSocket, directory: Directory): void {
  const link = {
    send: (message: Parameters<typeof encode>[0]) => sendIfOpen(socket, encode(message)),
  };
  const connection = new Connection({ directory, link });
  socket.on("message", (data) => connection.receive(data.toString()));
  socket.on("close", () => connection.drop());
  keepAlive(socket);
}

function sendIfOpen(socket: WebSocket, text: string): void {
  if (socket.readyState === socket.OPEN) socket.send(text);
}

/** A browser that vanished without closing its socket is found out, and its seat held for it. */
function keepAlive(socket: WebSocket): void {
  let answered = true;
  socket.on("pong", () => (answered = true));
  const beat = setInterval(() => {
    if (!answered) return socket.terminate();
    answered = false;
    socket.ping();
  }, HEARTBEAT_MS);
  socket.on("close", () => clearInterval(beat));
}
