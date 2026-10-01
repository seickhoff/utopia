import { PixelText } from "./PixelText.js";

/**
 * Utopia is played with the phone on its side. Held upright, everything waits behind this until
 * the phone is turned: the stylesheet shows it while the page says the phone is upright.
 */
export function TurnNotice() {
  return (
    <div className="turn-notice">
      <PixelText text="UTOPIA" className="turn-logo" />
      <div className="turn-phone" aria-hidden="true" />
      <p>Turn your phone sideways to play.</p>
    </div>
  );
}
