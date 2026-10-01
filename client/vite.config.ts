import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootPackage = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
/** In development the game server runs beside Vite on 3021; the client reaches it at /ws. */
const SERVER_PROXY = { "/ws": { target: "ws://localhost:3021", ws: true } };

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(rootPackage.version),
  },
  // Pre-bundled up front so the dev panel's lazy import never triggers a mid-session re-optimize.
  optimizeDeps: {
    include: ["lil-gui"],
  },
  build: {
    // three.js alone is ~700 kB of the bundle; that is expected for a 3D game.
    chunkSizeWarningLimit: 1100,
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    proxy: SERVER_PROXY,
  },
  preview: {
    proxy: SERVER_PROXY,
  },
});
