import type { ReactElement } from "react";
import type { GameActions } from "./App.js";
import type { OnlineStage, OnlineViewModel } from "./game-view.js";

interface NoticeProps {
  readonly online: OnlineViewModel;
  readonly actions: GameActions;
}

/** Over the game, while it is held: a lost connection, a rival away, or a rival gone. */
const NOTICES: Readonly<Partial<Record<OnlineStage, (props: NoticeProps) => ReactElement>>> = {
  reconnecting: Reconnecting,
  paused: RivalAway,
  rivalLeft: RivalGone,
};

export function OnlineNotice(props: NoticeProps) {
  const Notice = NOTICES[props.online.stage];
  if (Notice === undefined) return <></>;
  return (
    <div className="online-notice" role="alertdialog">
      <Notice {...props} />
    </div>
  );
}

function Reconnecting() {
  return (
    <>
      <h2>Connection lost</h2>
      <p>Reconnecting… The game waits for you.</p>
    </>
  );
}

function RivalAway({ online, actions }: NoticeProps) {
  return (
    <>
      <h2>Waiting for {online.note}</h2>
      <p>Their connection dropped. The game is held until they come back.</p>
      <Choices actions={actions} />
    </>
  );
}

function RivalGone({ online, actions }: NoticeProps) {
  return (
    <>
      <h2>{online.note} has left</h2>
      <p>Let the computer govern their island, or go back to the lobby.</p>
      <Choices actions={actions} />
    </>
  );
}

function Choices({ actions }: Pick<NoticeProps, "actions">) {
  return (
    <div className="online-choices">
      <button onClick={() => actions.carryOn("computer")}>Computer takes over</button>
      <button onClick={() => actions.carryOn("lobby")}>Back to the lobby</button>
    </div>
  );
}
