import type { ReactElement } from "react";

/** The pictures on the classic screen's side bars, drawn in the bar's ink. */
export type BarIconName =
  "keypad" | "labels" | "guide" | "log" | "cube" | "soundOn" | "soundOff" | "leave";

const KEYS = [4, 10, 16].flatMap((x) => [4, 10, 16].map((y) => ({ x, y })));

const PATHS: Readonly<Record<BarIconName, () => ReactElement>> = {
  keypad: () => (
    <>
      {KEYS.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x - 2} y={y - 2} width="5" height="5" rx="1" />
      ))}
    </>
  ),
  labels: () => (
    <>
      <path d="M3 12V4h8l10 10-8 8L3 12z" />
      <circle cx="7.5" cy="8" r="1.5" />
    </>
  ),
  guide: () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6v.6" />
      <circle cx="12" cy="17" r="0.6" />
    </>
  ),
  log: () => <path d="M8 6h12M8 12h12M8 18h12M4 6h.5M4 12h.5M4 18h.5" />,
  cube: () => <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 0v18M4 7.5l8 4.5 8-4.5" />,
  soundOn: () => <path d="M4 9h4l5-4v14l-5-4H4V9zm12 0a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11" />,
  soundOff: () => <path d="M4 9h4l5-4v14l-5-4H4V9zm12.5 1l5 5m0-5l-5 5" />,
  leave: () => <path d="M14 4H6v16h8M10 12h10m-3-3l3 3-3 3" />,
};

export function BarIcon({ name }: { name: BarIconName }) {
  const Paths = PATHS[name];
  return (
    <svg
      className="bar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <Paths />
    </svg>
  );
}
