import { useState, type FormEvent, type ReactElement } from "react";
import type { GameActions } from "./App.js";
import type { OnlineStage, OnlineViewModel } from "./game-view.js";
import { PixelText } from "./PixelText.js";

interface PanelProps {
  readonly online: OnlineViewModel;
  readonly actions: GameActions;
  /** Whether the player has a name yet: hosting and joining wait for one. */
  readonly named: boolean;
}

/** What the title screen shows of online play, at each stage before a game is under way. */
const STAGES: Readonly<Partial<Record<OnlineStage, (props: PanelProps) => ReactElement>>> = {
  connecting: Connecting,
  reconnecting: Connecting,
  waiting: Waiting,
};

/** Playing someone else: host a room and share its code, or join one with a code. */
export function OnlinePanel(props: PanelProps) {
  const Stage = STAGES[props.online.stage] ?? HostOrJoin;
  return (
    <section className="online-panel" aria-label="Play someone online">
      <Stage {...props} />
    </section>
  );
}

function HostOrJoin({ online, actions, named }: PanelProps) {
  return (
    <>
      {online.note !== "" && <p className="online-note">{online.note}</p>}
      <div className="online-actions">
        <button className="key online-host" onClick={actions.hostOnline} disabled={!named}>
          Host a game
        </button>
        <JoinForm room={online.room} onJoin={actions.joinOnline} named={named} />
      </div>
    </>
  );
}

/** A room's four-letter code, typed or brought in by a shared link. */
function JoinForm(props: { room: string; onJoin: (room: string) => void; named: boolean }) {
  const [code, setCode] = useState(props.room);
  const join = (event: FormEvent) => {
    event.preventDefault();
    props.onJoin(code);
  };
  return (
    <form className="online-join" onSubmit={join}>
      <input
        className="code-key"
        aria-label="Room code"
        placeholder="CODE"
        maxLength={4}
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
      />
      <button className="key" type="submit" disabled={code.length !== 4 || !props.named}>
        Join
      </button>
    </form>
  );
}

function Connecting({ actions }: PanelProps) {
  return (
    <div className="online-waiting">
      <p>Connecting to the game server…</p>
      <button className="key small" onClick={actions.leaveGame}>
        Cancel
      </button>
    </div>
  );
}

/** The host's room, waiting for a rival: its code to read out, and a link to send. */
function Waiting({ online, actions }: PanelProps) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(online.link).then(() => setCopied(true));
  };
  return (
    <div className="online-waiting">
      <p>Your game's code</p>
      <PixelText text={online.room} className="online-code" />
      <div className="online-share">
        <code>{online.link}</code>
        <button className="key small" onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <p className="online-hint">The game starts as soon as your rival joins.</p>
      <button className="key small" onClick={actions.leaveGame}>
        Cancel
      </button>
    </div>
  );
}
