import { GAME_OPTION_LIMITS, type OptionLimit } from "@utopia/engine";
import {
  OPPONENT_CHOICES,
  VIEW_MODES,
  isNamed,
  type GameSetup,
  type OpponentChoice,
  type ViewMode,
} from "../settings/game-setup-store.js";
import type { ScreenProps } from "./App.js";
import { OnlinePanel } from "./OnlinePanel.js";
import { PixelText } from "./PixelText.js";

const OPPONENT_LABELS: Readonly<Record<OpponentChoice, string>> = {
  none: "No rival",
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

const VIEW_LABELS: Readonly<Record<ViewMode, string>> = {
  diorama: "3D diorama",
  classic: "Classic screen",
};

const TURN_STEP_SECONDS = 5;
/** As many letters as the classic screen prints over an island. */
const NAME_LENGTH = 9;

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

interface SetupFormProps {
  readonly setup: GameSetup;
  readonly onChange: (change: Partial<GameSetup>) => void;
}

function SetupForm({ setup, onChange }: SetupFormProps) {
  return (
    <form className="setup" onSubmit={(event) => event.preventDefault()}>
      <NameField setup={setup} onChange={onChange} />
      <div className="setup-pair">
        <TermField setup={setup} onChange={onChange} />
        <TurnField setup={setup} onChange={onChange} />
      </div>
      <RivalChoices setup={setup} onChange={onChange} />
      <ViewChoices setup={setup} onChange={onChange} />
    </form>
  );
}

function RivalChoices({ setup, onChange }: SetupFormProps) {
  return (
    <Choices
      legend="The other island"
      className="rival-choices"
      options={OPPONENT_CHOICES.map((value) => ({ value, label: OPPONENT_LABELS[value] }))}
      chosen={setup.opponent}
      onChoose={(opponent) => onChange({ opponent })}
    />
  );
}

function ViewChoices({ setup, onChange }: SetupFormProps) {
  return (
    <Choices
      legend="View"
      className="view-choices"
      options={VIEW_MODES.map((value) => ({ value, label: VIEW_LABELS[value] }))}
      chosen={setup.view}
      onChoose={(view) => onChange({ view })}
    />
  );
}

/** The governor's name, printed over their island: every game needs one before it starts. */
function NameField({ setup, onChange }: SetupFormProps) {
  const named = isNamed(setup);
  return (
    <label className={`field name-field${named ? "" : " unnamed"}`}>
      <span className="field-label">Your name</span>
      <input
        value={setup.name}
        maxLength={NAME_LENGTH}
        placeholder="YOUR NAME"
        autoComplete="nickname"
        required
        aria-invalid={!named}
        onChange={(event) => onChange({ name: printable(event.target.value) })}
      />
      {!named && <span className="name-needed">Type your name to take office.</span>}
    </label>
  );
}

function printable(typed: string): string {
  return typed.toUpperCase().replace(/[^A-Z0-9 ]/g, "");
}

function TermField({ setup, onChange }: SetupFormProps) {
  return (
    <RangeField
      label="Term of office"
      shown={`${setup.rounds} years`}
      limit={GAME_OPTION_LIMITS.rounds}
      step={1}
      value={setup.rounds}
      onChange={(value) => onChange({ rounds: value })}
    />
  );
}

function TurnField({ setup, onChange }: SetupFormProps) {
  return (
    <RangeField
      label="Each year"
      shown={`${setup.roundSeconds} s`}
      limit={GAME_OPTION_LIMITS.roundSeconds}
      step={TURN_STEP_SECONDS}
      value={setup.roundSeconds}
      onChange={(value) => onChange({ roundSeconds: value })}
    />
  );
}

interface RangeFieldProps {
  readonly label: string;
  readonly shown: string;
  readonly limit: OptionLimit;
  readonly step: number;
  readonly value: number;
  readonly onChange: (value: number) => void;
}

function RangeField({ label, shown, limit, step, value, onChange }: RangeFieldProps) {
  return (
    <label className="field">
      <span className="field-label">
        {label} <strong>{shown}</strong>
      </span>
      <input
        type="range"
        min={limit.min}
        max={limit.max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

interface ChoicesProps<T extends string> {
  readonly legend: string;
  readonly className: string;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly chosen: T;
  readonly onChoose: (value: T) => void;
}

/** A row of keys, one of which is pressed: like the overlay's, but only one stays down. */
function Choices<T extends string>(props: ChoicesProps<T>) {
  const { legend, className, options, chosen, onChoose } = props;
  return (
    <fieldset className={`choices ${className}`}>
      <legend className="field-label">{legend}</legend>
      <div className="choice-keys">
        {options.map((option) => (
          <label key={option.value} className={option.value === chosen ? "chosen" : ""}>
            <input
              type="radio"
              name={legend}
              checked={option.value === chosen}
              onChange={() => onChoose(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TitleFooter() {
  return (
    <footer className="title-footer">
      <p className="credit">A tribute to Don Daglow's Utopia for the Intellivision, 1981</p>
    </footer>
  );
}
