# Utopia

A faithful, modernized browser remake of **Utopia**, Don Daglow's 1981 game for the Mattel Intellivision: two islands, two governors, and a term of office to keep your people fed, housed, employed and happy before the rebels rise.

The rules follow the cartridge's own code, decoded from an annotated disassembly. Only outright bugs are fixed, and each fix has a test.

## Playing

- **Solo**, against the computer at three strengths, or with no rival, as in the original one-player game.
- **Online**, against a friend: host a game, then share its four-letter code or link. The server runs the game, a dropped connection pauses it until the player is back, and if a rival leaves, the computer can take over their island.
- **Two views**: a 3D diorama, or the classic Intellivision screen with its keypad overlay, labels and year-by-year log (press **V** to switch).
- Mouse or keyboard: click your land for the build ring, or use **1–9**, **Enter**, the arrows, **0** for boats and **Esc** to clear.

## Running locally

Needs Node 22 (see `.nvmrc`).

```sh
npm install
npm run dev
```

The client is at http://localhost:3000 and reaches the game server (port 3021) through `/ws`. Open a second window to play yourself online.

Before calling a change done: `npm test`, `npm run typecheck`, `npm run format:check` and `npm run build`.

## Deploying

The client is a static site for **Vercel**; the game server is a Node service for **Railway**.

### Game server on Railway

1. New project, then **Deploy from GitHub repo** and choose this repository. `railway.json` sets the build, the start command and the health check; Railway supplies the port.
2. Under **Settings → Networking**, generate a public domain, such as `utopia-server.up.railway.app`.

### Client on Vercel

1. **Add New → Project** and import this repository. `vercel.json` sets the build and output folder.
2. Under **Settings → Environment Variables**, add `VITE_WS_URL` with the value `wss://<your Railway domain>/ws`, for Production and Preview.
3. Redeploy, so the build picks the variable up.

## Layout

| Folder      | What it holds                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `engine/`   | The game itself: the board, islands, sea, weather and the cartridge's sums. Imports nothing else. |
| `ai/`       | The computer governor, which plays through the same hand controller a person does.                |
| `protocol/` | The messages between browser and server, and a decoder that checks everything it reads.           |
| `server/`   | Node and WebSockets: rooms that run each online game.                                             |
| `client/`   | The browser: the 3D and classic views, the HUD, input, sound and online play.                     |
| `tools/`    | Development tools, and the test that enforces the code's clean-code rules.                        |

The cartridge's disassembly, the console's BIOS and the manuals used to make this are not part of the repository.

## Credits

See [CREDITS.md](CREDITS.md).
