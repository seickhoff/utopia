/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** The game server's WebSocket, such as wss://utopia-server.up.railway.app/ws. */
  readonly VITE_WS_URL?: string;
}
