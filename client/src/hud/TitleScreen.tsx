import { isNamed } from "../settings/game-setup-store.js";
import type { ScreenProps } from "./App.js";
import { OnlinePanel } from "./OnlinePanel.js";
import { PixelText } from "./PixelText.js";
import { SetupForm } from "./SetupForm.js";

/**
 * The title: the governor's office, made as the cartridge's keypad overlay with the game's name
 * across its top, laid over the cartridge's own screen. There a term is set up and taken, alone,
 * against the computer, or against someone online. It all fits one screen.
 */
export function TitleScreen({ view, actions }: ScreenProps) {
  const named = isNamed(view.setup);
  return (
    <main className="title-screen">
      <TitleBackdrop picture={view.titlePicture} />
      <Tagline />
      <section className="office" aria-label="Take office">
        <OverlayHead />
        <SetupForm setup={view.setup} onChange={actions.changeSetup} />
        <button className="key take-office" onClick={actions.play} disabled={!named}>
          Take office
        </button>
        <p className="office-or">
          <span>or play someone online</span>
        </p>
        <OnlinePanel online={view.online} actions={actions} named={named} />
      </section>
      <TitleFooter />
    </main>
  );
}

function Tagline() {
  return (
    <p className="tagline">
      Govern your island. Feed, house and employ your people and keep them happy, or rebels will
      rise in paradise.
    </p>
  );
}

/** A moment of play as the television showed it, large and dimmed behind the overlay. */
function TitleBackdrop({ picture }: { picture: string }) {
  if (picture === "") return <></>;
  return (
    <figure className="tv title-backdrop">
      <img src={picture} alt="A moment of play on the Intellivision: the two islands at sea" />
    </figure>
  );
}

/** The top of the overlay, where the cartridge's own overlay printed the game's name. */
function OverlayHead() {
  return (
    <header className="overlay-head">
      <h1 className="logo">
        <PixelText text="UTOPIA" />
      </h1>
      <p className="office-title">The governor's office</p>
    </header>
  );
}

function TitleFooter() {
  return (
    <footer className="title-footer">
      <p className="credit">A tribute to Don Daglow's Utopia for the Intellivision, 1981</p>
    </footer>
  );
}
