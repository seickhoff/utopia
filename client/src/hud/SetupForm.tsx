import { GAME_OPTION_LIMITS, type OptionLimit } from "@utopia/engine";
import type { ReactNode } from "react";
import {
  GAME_PRESETS,
  PRESET_OPTIONS,
  gameMinutes,
  presetOf,
  type GamePreset,
  type GamePresetChoice,
} from "../settings/game-presets.js";
import {
  OPPONENT_CHOICES,
  VIEW_MODES,
  isNamed,
  type GameSetup,
  type OpponentChoice,
  type ViewMode,
} from "../settings/game-setup-store.js";

const OPPONENT_LABELS: Readonly<Record<OpponentChoice, string>> = {
  none: "No rival",
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

const VIEW_LABELS: Readonly<Record<ViewMode, string>> = {
  classic: "Classic screen",
  diorama: "3D diorama",
};

/** What each preset's key says: a word, since five keys share one row. */
const PRESET_KEYS: Readonly<Record<GamePreset, string>> = {
  quick: "Quick",
  classic: "Classic",
  fast: "Fast",
  full: "Full",
  long: "Long",
};

/** What the chosen preset is called in full, above its row of keys. */
const PRESET_NAMES: Readonly<Record<GamePresetChoice, string>> = {
  quick: "Quick match",
  classic: "Classic-feeling match",
  fast: "Fast but substantial",
  full: "Best full game",
  long: "Long session",
  custom: "Custom",
};

const TURN_STEP_SECONDS = 5;
/** As many letters as the classic screen prints over an island. */
const NAME_LENGTH = 9;

interface SetupFormProps {
  readonly setup: GameSetup;
  readonly onChange: (change: Partial<GameSetup>) => void;
}

/** The term set up before it is taken: who governs, for how long, and how it is shown. */
export function SetupForm({ setup, onChange }: SetupFormProps) {
  return (
    <form className="setup" onSubmit={(event) => event.preventDefault()}>
      <NameField setup={setup} onChange={onChange} />
      <PresetChoices setup={setup} onChange={onChange} />
      <div className="setup-pair">
        <TermField setup={setup} onChange={onChange} />
        <TurnField setup={setup} onChange={onChange} />
      </div>
      <RivalChoices setup={setup} onChange={onChange} />
      <ViewChoices setup={setup} onChange={onChange} />
    </form>
  );
}

/** Ready-made lengths of game: each sets the term and the year at once, as the sliders beneath. */
function PresetChoices({ setup, onChange }: SetupFormProps) {
  const chosen = presetOf(setup);
  return (
    <Choices
      legend="Length of game"
      shown={PRESET_NAMES[chosen]}
      className="preset-choices"
      options={GAME_PRESETS.map(presetOption)}
      chosen={chosen}
      onChoose={(preset) => onChange(PRESET_OPTIONS[preset])}
    />
  );
}

function presetOption(preset: GamePreset): ChoiceOption<GamePreset> {
  const options = PRESET_OPTIONS[preset];
  const label = (
    <>
      {PRESET_KEYS[preset]}
      <small>{gameMinutes(options)} min</small>
    </>
  );
  const title = `${PRESET_NAMES[preset]}: ${options.rounds} years of ${options.roundSeconds} s`;
  return { value: preset, label, title };
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

interface ChoiceOption<T extends string> {
  readonly value: T;
  readonly label: ReactNode;
  readonly title?: string;
}

interface ChoicesProps<T extends string> {
  readonly legend: string;
  /** What the legend says is chosen, beside it. */
  readonly shown?: string;
  readonly className: string;
  readonly options: readonly ChoiceOption<T>[];
  /** The option held down: a value that is none of the options holds none down. */
  readonly chosen: string;
  readonly onChoose: (value: T) => void;
}

/** A row of keys, one of which is pressed: like the overlay's, but only one stays down. */
function Choices<T extends string>(props: ChoicesProps<T>) {
  const { legend, shown, className, options } = props;
  return (
    <fieldset className={`choices ${className}`}>
      <legend className="field-label">
        {legend} <strong>{shown}</strong>
      </legend>
      <div className="choice-keys">
        {options.map((option) => (
          <ChoiceKey key={option.value} option={option} choices={props} />
        ))}
      </div>
    </fieldset>
  );
}

interface ChoiceKeyProps<T extends string> {
  readonly option: ChoiceOption<T>;
  readonly choices: ChoicesProps<T>;
}

/** One key of the row, down while its option is the one chosen. */
function ChoiceKey<T extends string>({ option, choices }: ChoiceKeyProps<T>) {
  const chosen = option.value === choices.chosen;
  return (
    <label className={chosen ? "chosen" : ""} title={option.title}>
      <input
        type="radio"
        name={choices.legend}
        checked={chosen}
        onChange={() => choices.onChoose(option.value)}
      />
      {option.label}
    </label>
  );
}
